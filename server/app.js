import { Hono } from 'hono';
import { readFile, readdir, realpath } from 'fs/promises';
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from 'path';
import { FileCommentStore } from './comment-store.js';

const VERSIONED_MARKDOWN_RE = /^(?<stem>.+?)(?:\.v(?<version>\d+))?(?<ext>\.md|\.markdown|\.mdx)$/;
const IMAGE_CONTENT_TYPES = new Map([
  ['.avif', 'image/avif'],
  ['.bmp', 'image/bmp'],
  ['.gif', 'image/gif'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
]);

export function isMarkdownFile(filename) {
  return filename.endsWith('.md') || filename.endsWith('.markdown') || filename.endsWith('.mdx');
}

export async function scanMarkdownFiles(dir, baseDir = dir) {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const relativePath = relative(baseDir, fullPath);

    const skipPatterns = ['node_modules', 'dist'];
    if (skipPatterns.includes(entry.name)) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...(await scanMarkdownFiles(fullPath, baseDir)));
    } else if (entry.isFile() && isMarkdownFile(entry.name)) {
      files.push({
        name: entry.name,
        path: relativePath,
        dir: relative(baseDir, dir) || '.',
      });
    }
  }

  return files;
}

function parseMarkdownVersion(filePath) {
  const fileName = basename(filePath);
  const match = fileName.match(VERSIONED_MARKDOWN_RE);
  if (!match?.groups) {
    return null;
  }

  return {
    dir: dirname(filePath),
    stem: match.groups.stem,
    ext: match.groups.ext,
    version: Number(match.groups.version || 0),
  };
}

function resolveSelectedFile(files, activeFile) {
  if (!activeFile) {
    return null;
  }

  const active = parseMarkdownVersion(activeFile);
  if (!active) {
    return activeFile;
  }

  let selectedFile = activeFile;
  let selectedVersion = active.version;

  for (const file of files) {
    const candidate = parseMarkdownVersion(file.path);
    if (
      candidate &&
      candidate.dir === active.dir &&
      candidate.stem === active.stem &&
      candidate.ext === active.ext &&
      candidate.version > selectedVersion
    ) {
      selectedFile = file.path;
      selectedVersion = candidate.version;
    }
  }

  return selectedFile;
}

function jsonError(c, message, status = 500) {
  return c.json({ error: message }, status);
}

async function readJson(c) {
  try {
    return await c.req.json();
  } catch {
    throw new Error('Invalid JSON body');
  }
}

function requireWritable(c, readonly) {
  if (readonly) {
    return jsonError(c, 'Review server is readonly', 403);
  }
  return null;
}

function isPathWithin(rootPath, candidatePath) {
  const relativePath = relative(rootPath, candidatePath);
  return (
    relativePath === '' ||
    (relativePath !== '..' && !relativePath.startsWith(`..${sep}`) && !isAbsolute(relativePath))
  );
}

function decodeLocalAssetPath(assetPath) {
  const pathname = assetPath.split(/[?#]/, 1)[0];
  try {
    return decodeURIComponent(pathname);
  } catch {
    return null;
  }
}

export function createApp(options = {}) {
  const app = new Hono();
  const markdownFilePath = options.markdownFilePath;
  const baseDir = resolve(options.baseDir || process.cwd());
  const rootDir = markdownFilePath ? dirname(markdownFilePath) : baseDir;
  const readonly = Boolean(options.readonly);
  const store = new FileCommentStore({
    rootDir,
    reviewDir: options.reviewDir || '.reviews',
  });

  app.get('/api/session', (c) =>
    c.json({
      root: rootDir,
      mode: markdownFilePath ? 'file' : 'directory',
      port: options.port,
      host: options.host,
      activeFile: options.activeFile || (markdownFilePath ? basename(markdownFilePath) : null),
      reviewDir: store.reviewDir,
      readonly,
      analytics: options.analytics || { enabled: false },
    }),
  );

  app.get('/api/health', (c) => c.json({ status: 'ok' }));

  app.get('/api/files', async (c) => {
    if (markdownFilePath) {
      const name = basename(markdownFilePath);
      return c.json({
        files: [{ name, path: name, dir: '.' }],
        baseDir: dirname(markdownFilePath),
        selectedFile: name,
      });
    }

    try {
      const files = await scanMarkdownFiles(baseDir);
      return c.json({
        files,
        baseDir,
        selectedFile: resolveSelectedFile(files, options.activeFile),
      });
    } catch (err) {
      console.error('Error scanning markdown files:', err.message);
      return jsonError(c, 'Failed to scan markdown files');
    }
  });

  app.get('/api/markdown', async (c) => {
    if (!markdownFilePath) {
      return jsonError(c, 'Markdown file path not specified');
    }

    try {
      const data = await readFile(markdownFilePath, 'utf-8');
      const filename = basename(markdownFilePath);
      return c.json({ content: data, filename, path: filename });
    } catch (err) {
      console.error('Error reading markdown:', err.message);
      return jsonError(c, 'Failed to read markdown file');
    }
  });

  app.get('/api/markdown/:path{.+}', async (c) => {
    const requestedPath = c.req.param('path');

    try {
      const fullPath = resolve(rootDir, requestedPath);
      if (!fullPath.startsWith(resolve(rootDir))) {
        return jsonError(c, 'Invalid file path', 403);
      }

      const data = await readFile(fullPath, 'utf-8');
      const filename = basename(fullPath);
      return c.json({ content: data, filename, path: requestedPath });
    } catch (err) {
      console.error('Error reading markdown:', err.message);
      return jsonError(c, 'Failed to read markdown file');
    }
  });

  app.get('/api/assets', async (c) => {
    const markdownPath = c.req.query('file');
    const assetPath = c.req.query('path');
    const decodedAssetPath = assetPath ? decodeLocalAssetPath(assetPath) : null;

    if (!markdownPath || !decodedAssetPath || !isMarkdownFile(markdownPath)) {
      return jsonError(c, 'Invalid local image request', 400);
    }

    const markdownFile = resolve(rootDir, markdownPath);
    const requestedAsset = resolve(dirname(markdownFile), decodedAssetPath);

    if (!isPathWithin(rootDir, markdownFile) || !isPathWithin(rootDir, requestedAsset)) {
      return jsonError(c, 'Invalid local image path', 403);
    }

    try {
      const [realRoot, realAsset] = await Promise.all([
        realpath(rootDir),
        realpath(requestedAsset),
      ]);
      if (!isPathWithin(realRoot, realAsset)) {
        return jsonError(c, 'Invalid local image path', 403);
      }

      const contentType = IMAGE_CONTENT_TYPES.get(extname(realAsset).toLowerCase());
      if (!contentType) {
        return jsonError(c, 'Unsupported local image type', 415);
      }

      const data = await readFile(realAsset);
      return c.body(data, 200, {
        'Cache-Control': 'no-cache',
        'Content-Type': contentType,
        'X-Content-Type-Options': 'nosniff',
      });
    } catch (err) {
      if (err?.code === 'ENOENT' || err?.code === 'ENOTDIR') {
        return jsonError(c, 'Local image not found', 404);
      }
      console.error('Error reading local image:', err.message);
      return jsonError(c, 'Failed to read local image');
    }
  });

  app.get('/api/comments', async (c) => {
    try {
      const comments = await store.listComments({
        file: c.req.query('file') || undefined,
        status: c.req.query('status') || undefined,
        targetFile: c.req.query('targetFile') || undefined,
      });
      return c.json(comments);
    } catch (err) {
      return jsonError(c, err.message, 400);
    }
  });

  app.post('/api/comments', async (c) => {
    const readonlyResponse = requireWritable(c, readonly);
    if (readonlyResponse) return readonlyResponse;

    try {
      return c.json(await store.createComment(await readJson(c)), 201);
    } catch (err) {
      return jsonError(c, err.message, 400);
    }
  });

  app.patch('/api/comments', async (c) => {
    const readonlyResponse = requireWritable(c, readonly);
    if (readonlyResponse) return readonlyResponse;

    try {
      const input = await readJson(c);
      return c.json(await store.batchUpdateComments(input.updates || []));
    } catch (err) {
      return jsonError(c, err.message, 400);
    }
  });

  app.patch('/api/comments/:id', async (c) => {
    const readonlyResponse = requireWritable(c, readonly);
    if (readonlyResponse) return readonlyResponse;

    try {
      return c.json(await store.updateComment(c.req.param('id'), await readJson(c)));
    } catch (err) {
      return jsonError(c, err.message, /not found/i.test(err.message) ? 404 : 400);
    }
  });

  app.delete('/api/comments/:id', async (c) => {
    const readonlyResponse = requireWritable(c, readonly);
    if (readonlyResponse) return readonlyResponse;

    try {
      await store.deleteComment(c.req.param('id'), { file: c.req.query('file') || undefined });
      return new Response(null, { status: 204 });
    } catch (err) {
      return jsonError(c, err.message, /not found/i.test(err.message) ? 404 : 400);
    }
  });

  return app;
}
