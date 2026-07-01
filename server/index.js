// server/index.js
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { readFile } from 'fs/promises';
import { dirname, relative, resolve } from 'path';
import { fileURLToPath } from 'url';
import { watch } from 'chokidar';
import { createApp, isMarkdownFile } from './app.js';
import { resolveAnalyticsConfig } from './analytics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageRoot = resolve(__dirname, '..');
const distDir = resolve(packageRoot, 'dist');

function validatePort(value) {
  const port = parseInt(value, 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid port: ${value}`);
  }
  return port;
}

async function startServer(app, port, host, maxRetries = 10) {
  for (let i = 0; i < maxRetries; i++) {
    const tryPort = port + i;
    try {
      await new Promise((resolveServer, reject) => {
        const server = serve({
          fetch: app.fetch,
          port: tryPort,
          hostname: host,
        });
        server.once('listening', () => resolveServer(server));
        server.once('error', reject);
      });
      return tryPort;
    } catch (err) {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${tryPort} is in use, trying ${tryPort + 1}...`);
        continue;
      }
      throw err;
    }
  }
  throw new Error(`Could not find an available port after ${maxRetries} attempts`);
}

const PORT = validatePort(process.env.API_PORT || 3030);
const HOST = process.env.API_HOST || '127.0.0.1';
const MARKDOWN_FILE_PATH = process.env.MARKDOWN_FILE_PATH;
const BASE_DIR = process.env.BASE_DIR || process.cwd();
const REVIEW_DIR = process.env.REVIEW_DIR || '.reviews';
const ACTIVE_FILE = process.env.ACTIVE_FILE || null;
const READONLY = process.env.READONLY === 'true';

if (HOST === '0.0.0.0') {
  console.warn('Warning: md-review-server is listening on 0.0.0.0 without authentication.');
}

const app = new Hono();
const serverOptions = {
  markdownFilePath: MARKDOWN_FILE_PATH,
  baseDir: BASE_DIR,
  reviewDir: REVIEW_DIR,
  activeFile: ACTIVE_FILE,
  readonly: READONLY,
  port: PORT,
  host: HOST,
  analytics: resolveAnalyticsConfig({ env: process.env }),
};
const apiApp = createApp(serverOptions);

const sseClients = new Set();

app.get('/api/watch', (c) => {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode('data: {"type":"connected"}\n\n'));

      const client = { controller, encoder };
      sseClients.add(client);

      c.req.raw.signal.addEventListener('abort', () => {
        sseClients.delete(client);
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
});

app.route('/', apiApp);
app.use('/*', serveStatic({ root: relative(process.cwd(), distDir) || '.' }));

app.get('*', async (c) => {
  try {
    const indexPath = resolve(distDir, 'index.html');
    const html = await readFile(indexPath, 'utf-8');
    return c.html(html);
  } catch {
    return c.text('Not found', 404);
  }
});

const SERVER_READY_MESSAGE = 'md-review server started';

const watchTarget = MARKDOWN_FILE_PATH || BASE_DIR;
const watchBase = MARKDOWN_FILE_PATH ? dirname(MARKDOWN_FILE_PATH) : BASE_DIR;
const watcher = watch(watchTarget, {
  ignored: MARKDOWN_FILE_PATH ? undefined : /(^|[/\\])\..|(node_modules|dist)/,
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 100,
    pollInterval: 100,
  },
});

function broadcastWatchEvent(type, path) {
  if (!isMarkdownFile(path)) {
    return;
  }

  const relativePath = relative(watchBase, path);
  console.log(`File ${type === 'file-added' ? 'added' : 'changed'}: ${relativePath}`);

  const message = JSON.stringify({
    type,
    path: relativePath,
  });

  sseClients.forEach((client) => {
    try {
      client.controller.enqueue(client.encoder.encode(`data: ${message}\n\n`));
    } catch {
      sseClients.delete(client);
    }
  });
}

watcher.on('change', (path) => broadcastWatchEvent('file-changed', path));
watcher.on('add', (path) => broadcastWatchEvent('file-added', path));

startServer(app, PORT, HOST)
  .then((actualPort) => {
    serverOptions.port = actualPort;
    console.log(`API Server running on http://${HOST}:${actualPort}`);
    console.log(`Watching for file changes in: ${watchTarget}`);
    console.log(SERVER_READY_MESSAGE);
  })
  .catch((err) => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  });
