import { mkdir, readFile, readdir, rename, writeFile } from 'fs/promises';
import { dirname, extname, isAbsolute, join, resolve } from 'path';

const VALID_STATUSES = new Set(['open', 'resolved', 'partially_resolved', 'unresolved', 'ignored']);
const VALID_REPLY_AUTHORS = new Set(['user', 'codex']);

function normalizeReviewFile(file) {
  if (!file || typeof file !== 'string') {
    throw new Error('Comment file is required');
  }

  const normalized = file.replaceAll('\\', '/');
  if (normalized.startsWith('/') || normalized.split('/').includes('..')) {
    throw new Error(`Invalid comment file: ${file}`);
  }

  return normalized;
}

function reviewFilenameFor(file) {
  const normalized = normalizeReviewFile(file);
  const ext = extname(normalized);
  const withoutExt = ext ? normalized.slice(0, -ext.length) : normalized;
  return `${withoutExt.replaceAll('/', '__').replace(/[^A-Za-z0-9._-]/g, '_')}.review.json`;
}

function extractDocumentVersion(file) {
  const filename = file.split('/').pop() || '';
  const match = filename.match(/(?:^|[._-])(v\d+)(?=[._-]|$)/);
  return match?.[1];
}

function nowIso() {
  return new Date().toISOString();
}

function initialReviewDocument(file) {
  const now = nowIso();
  return {
    schemaVersion: 1,
    document: file,
    createdAt: now,
    updatedAt: now,
    comments: [],
  };
}

function nextCommentId(comments) {
  const max = comments.reduce((currentMax, comment) => {
    const match = /^c(\d+)$/.exec(comment.id || '');
    return match ? Math.max(currentMax, Number(match[1])) : currentMax;
  }, 0);
  return `c${String(max + 1).padStart(3, '0')}`;
}

function nextReplyId(replies) {
  const max = replies.reduce((currentMax, reply) => {
    const match = /^r(\d+)$/.exec(reply.id || '');
    return match ? Math.max(currentMax, Number(match[1])) : currentMax;
  }, 0);
  return `r${String(max + 1).padStart(3, '0')}`;
}

function normalizeReply(reply, timestamp, fallbackId) {
  if (!reply || typeof reply !== 'object') {
    throw new Error('Comment reply is required');
  }

  const author = reply.author || 'user';
  if (!VALID_REPLY_AUTHORS.has(author)) {
    throw new Error(`Invalid comment reply author: ${author}`);
  }

  if (typeof reply.body !== 'string' || !reply.body.trim()) {
    throw new Error('Comment reply body is required');
  }

  return {
    id: typeof reply.id === 'string' && reply.id ? reply.id : fallbackId,
    author,
    body: reply.body.trim(),
    createdAt: typeof reply.createdAt === 'string' && reply.createdAt ? reply.createdAt : timestamp,
  };
}

function normalizeReplies(replies, timestamp) {
  if (!Array.isArray(replies)) {
    throw new Error('Comment replies must be an array');
  }

  return replies.map((reply, index) =>
    normalizeReply(reply, timestamp, `r${String(index + 1).padStart(3, '0')}`),
  );
}

function applyPatch(comment, patch, timestamp) {
  const next = { ...comment };
  const fields = [
    'comment',
    'status',
    'targetFile',
    'targetStartLine',
    'targetEndLine',
    'targetSelectedText',
    'resolution',
    'consumedBy',
    'startLine',
    'endLine',
    'startOffset',
    'endOffset',
    'selectedText',
    'beforeText',
    'afterText',
  ];

  for (const field of fields) {
    if (patch[field] !== undefined) {
      next[field] = patch[field];
    }
  }

  if (patch.replies !== undefined) {
    next.replies = normalizeReplies(patch.replies, timestamp);
  }

  if (patch.reply !== undefined) {
    const replies = Array.isArray(next.replies) ? next.replies : [];
    next.replies = [...replies, normalizeReply(patch.reply, timestamp, nextReplyId(replies))];
  }

  if (patch.status !== undefined) {
    if (!VALID_STATUSES.has(patch.status)) {
      throw new Error(`Invalid comment status: ${patch.status}`);
    }
    if (patch.status !== 'open' && patch.status !== comment.status) {
      next.consumedAt = timestamp;
    }
  }

  next.updatedAt = timestamp;
  return next;
}

export class FileCommentStore {
  constructor({ rootDir, reviewDir = '.reviews' }) {
    this.rootDir = resolve(rootDir);
    this.reviewDir = isAbsolute(reviewDir) ? reviewDir : resolve(this.rootDir, reviewDir);
  }

  async ensureReviewDir() {
    await mkdir(this.reviewDir, { recursive: true });
  }

  getReviewFilePath(file) {
    return join(this.reviewDir, reviewFilenameFor(file));
  }

  async listComments(filter = {}) {
    if (filter.file) {
      const review = await this.readReviewFile(filter.file);
      return this.applyFilter(review.comments, filter);
    }

    const reviews = await this.readAllReviewFiles();
    return this.applyFilter(
      reviews.flatMap((review) => review.comments),
      filter,
    );
  }

  async createComment(input) {
    const file = normalizeReviewFile(input.file);
    const review = await this.readReviewFile(file);
    const timestamp = nowIso();
    const comment = {
      id: nextCommentId(review.comments),
      file,
      documentVersion: extractDocumentVersion(file),
      startLine: input.startLine,
      endLine: input.endLine,
      startOffset: input.startOffset,
      endOffset: input.endOffset,
      selectedText: input.selectedText,
      beforeText: input.beforeText,
      afterText: input.afterText,
      comment: input.comment,
      status: 'open',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    review.comments.push(comment);
    await this.writeReviewFile(file, review, timestamp);
    return comment;
  }

  async updateComment(id, patch) {
    const { file, review } = await this.findReviewForComment(id, patch.file);
    const timestamp = nowIso();
    const index = review.comments.findIndex((comment) => comment.id === id);
    if (index === -1) {
      throw new Error(`Comment not found: ${id}`);
    }

    review.comments[index] = applyPatch(review.comments[index], patch, timestamp);
    await this.writeReviewFile(file, review, timestamp);
    return review.comments[index];
  }

  async batchUpdateComments(updates) {
    const updated = [];
    for (const update of updates) {
      updated.push(await this.updateComment(update.id, update));
    }
    return updated;
  }

  async deleteComment(id, options = {}) {
    const { file, review } = await this.findReviewForComment(id, options.file);
    const nextComments = review.comments.filter((comment) => comment.id !== id);
    if (nextComments.length === review.comments.length) {
      throw new Error(`Comment not found: ${id}`);
    }

    review.comments = nextComments;
    await this.writeReviewFile(file, review, nowIso());
  }

  applyFilter(comments, filter) {
    return comments.filter((comment) => {
      if (filter.status && comment.status !== filter.status) {
        return false;
      }
      if (filter.targetFile && comment.targetFile !== filter.targetFile) {
        return false;
      }
      return true;
    });
  }

  async readReviewFile(file) {
    const normalized = normalizeReviewFile(file);
    const reviewFile = this.getReviewFilePath(normalized);

    try {
      const parsed = JSON.parse(await readFile(reviewFile, 'utf-8'));
      return {
        ...parsed,
        document: parsed.document || normalized,
        comments: Array.isArray(parsed.comments) ? parsed.comments : [],
      };
    } catch (err) {
      if (err?.code === 'ENOENT') {
        return initialReviewDocument(normalized);
      }
      if (err instanceof SyntaxError) {
        throw new Error(`Invalid review file JSON: ${reviewFile}`);
      }
      throw err;
    }
  }

  async readAllReviewFiles() {
    await this.ensureReviewDir();
    const entries = await readdir(this.reviewDir, { withFileTypes: true });
    const reviews = [];

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.review.json')) {
        continue;
      }

      const reviewFile = join(this.reviewDir, entry.name);
      try {
        const parsed = JSON.parse(await readFile(reviewFile, 'utf-8'));
        reviews.push({
          ...parsed,
          comments: Array.isArray(parsed.comments) ? parsed.comments : [],
        });
      } catch (err) {
        if (err instanceof SyntaxError) {
          throw new Error(`Invalid review file JSON: ${reviewFile}`);
        }
        throw err;
      }
    }

    return reviews;
  }

  async writeReviewFile(file, review, timestamp) {
    await this.ensureReviewDir();
    const reviewFile = this.getReviewFilePath(file);
    const nextReview = {
      schemaVersion: review.schemaVersion || 1,
      document: review.document || file,
      createdAt: review.createdAt || timestamp,
      updatedAt: timestamp,
      comments: review.comments,
    };
    const tempFile = `${reviewFile}.${process.pid}.${Date.now()}.tmp`;

    await mkdir(dirname(reviewFile), { recursive: true });
    await writeFile(tempFile, `${JSON.stringify(nextReview, null, 2)}\n`, 'utf-8');
    await rename(tempFile, reviewFile);
  }

  async findReviewForComment(id, file) {
    if (file) {
      const normalized = normalizeReviewFile(file);
      return { file: normalized, review: await this.readReviewFile(normalized) };
    }

    const reviews = await this.readAllReviewFiles();
    const matches = reviews.filter((review) =>
      review.comments.some((comment) => comment.id === id),
    );
    if (matches.length === 0) {
      throw new Error(`Comment not found: ${id}`);
    }
    if (matches.length > 1) {
      throw new Error(`Ambiguous comment id without file: ${id}`);
    }

    return { file: normalizeReviewFile(matches[0].document), review: matches[0] };
  }
}
