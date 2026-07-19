import { createHash, randomUUID } from 'crypto';
import { mkdir, readFile, rename, writeFile } from 'fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'path';

const VERSIONED_MARKDOWN_RE = /^(?<stem>.+?)(?:\.v\d+)?(?<ext>\.md|\.markdown|\.mdx)$/;
const OPEN_WINDOW_MS = 30 * 60 * 1000;

function normalizeDocumentFile(file) {
  if (!file || typeof file !== 'string') {
    throw new Error('Document file is required');
  }

  const normalized = file.replaceAll('\\', '/');
  if (
    normalized.startsWith('/') ||
    /^[a-z]:\//i.test(normalized) ||
    isAbsolute(normalized) ||
    normalized.split('/').includes('..')
  ) {
    throw new Error(`Invalid document file: ${file}`);
  }

  return normalized;
}

function documentKeyFor(file) {
  const normalized = normalizeDocumentFile(file);
  const parts = normalized.split('/');
  const filename = parts.pop() || '';
  const match = filename.match(VERSIONED_MARKDOWN_RE);
  const canonicalFilename = match?.groups ? `${match.groups.stem}${match.groups.ext}` : filename;

  return [...parts, canonicalFilename].filter(Boolean).join('/');
}

function documentFilenameFor(file) {
  const key = documentKeyFor(file);
  return `${key}.document.json`;
}

function digestContent(content) {
  return createHash('sha256').update(content).digest('hex');
}

function queueEvent(state, name, data, timestamp) {
  state.analytics.pendingEvents.push({
    id: randomUUID(),
    name,
    data,
    createdAt: timestamp,
  });
}

export class DocumentLifecycleStore {
  constructor({ rootDir, reviewDir = '.reviews', now = () => new Date() }) {
    this.rootDir = resolve(rootDir);
    this.reviewDir = isAbsolute(reviewDir) ? reviewDir : resolve(this.rootDir, reviewDir);
    this.now = now;
    this.locks = new Map();
  }

  getDocumentFilePath(file) {
    return join(this.reviewDir, documentFilenameFor(file));
  }

  async recordReview(file) {
    return this.withDocumentLock(file, async () => {
      const normalized = normalizeDocumentFile(file);
      const content = await this.readDocumentContent(normalized);
      const timestamp = this.now().toISOString();
      let state = await this.readDocumentFile(normalized);

      if (!state) {
        const documentId = randomUUID();
        const contentDigest = digestContent(content);
        state = {
          schemaVersion: 1,
          document: {
            id: documentId,
            key: documentKeyFor(normalized),
            currentFile: normalized,
            firstSeenAt: timestamp,
            lastSeenAt: timestamp,
            lastOpenedAt: timestamp,
            lastContentDigest: contentDigest,
            openSeq: 1,
            revisionSeq: 0,
            currentRevisionSeq: 0,
            revisions: [{ sequence: 0, digest: contentDigest }],
            roundSeq: 1,
            reviewedRevisionSeqs: [0],
          },
          analytics: {
            pendingEvents: [],
          },
        };
        queueEvent(state, 'document_initialized', { document_id: documentId }, timestamp);
        queueEvent(state, 'document_opened', { document_id: documentId, open_seq: 1 }, timestamp);
        queueEvent(
          state,
          'review_round_started',
          {
            document_id: documentId,
            revision_seq: 0,
            round_seq: 1,
          },
          timestamp,
        );
        await this.writeDocumentFile(normalized, state);
        return state.analytics.pendingEvents;
      }

      let changed = this.recordRevision(state, normalized, content, timestamp);
      changed = this.recordOpen(state, timestamp) || changed;
      const currentRevisionSeq = state.document.currentRevisionSeq ?? state.document.revisionSeq;
      const reviewedRevisionSeqs = new Set(
        state.document.reviewedRevisionSeqs ||
          (state.document.lastReviewRevisionSeq === undefined
            ? []
            : [state.document.lastReviewRevisionSeq]),
      );
      if (!reviewedRevisionSeqs.has(currentRevisionSeq)) {
        state.document.roundSeq += 1;
        reviewedRevisionSeqs.add(currentRevisionSeq);
        state.document.reviewedRevisionSeqs = [...reviewedRevisionSeqs].sort(
          (left, right) => left - right,
        );
        state.document.lastSeenAt = timestamp;
        queueEvent(
          state,
          'review_round_started',
          {
            document_id: state.document.id,
            revision_seq: currentRevisionSeq,
            round_seq: state.document.roundSeq,
          },
          timestamp,
        );
        changed = true;
      }

      if (changed) {
        await this.writeDocumentFile(normalized, state);
      }
      return state.analytics.pendingEvents;
    });
  }

  async sync(file) {
    return this.withDocumentLock(file, async () => {
      const normalized = normalizeDocumentFile(file);
      const state = await this.readDocumentFile(normalized);
      if (!state) {
        return [];
      }

      const timestamp = this.now().toISOString();
      const content = await this.readDocumentContent(normalized);
      let changed = this.recordRevision(state, normalized, content, timestamp);
      changed = this.recordOpen(state, timestamp) || changed;

      if (changed) {
        await this.writeDocumentFile(normalized, state);
      }
      return state.analytics.pendingEvents;
    });
  }

  async ack(file, eventIds) {
    const acknowledgedIds = new Set(Array.isArray(eventIds) ? eventIds : []);
    if (acknowledgedIds.size === 0) {
      return;
    }

    await this.withDocumentLock(file, async () => {
      const normalized = normalizeDocumentFile(file);
      const state = await this.readDocumentFile(normalized);
      if (!state) {
        return;
      }

      const pendingEvents = state.analytics.pendingEvents.filter(
        (event) => !acknowledgedIds.has(event.id),
      );
      if (pendingEvents.length === state.analytics.pendingEvents.length) {
        return;
      }

      state.analytics.pendingEvents = pendingEvents;
      await this.writeDocumentFile(normalized, state);
    });
  }

  recordRevision(state, file, content, timestamp) {
    const nextDigest = digestContent(content);
    if (state.document.lastContentDigest === nextDigest) {
      return false;
    }

    const revisions = Array.isArray(state.document.revisions)
      ? state.document.revisions
      : [{ sequence: state.document.revisionSeq, digest: state.document.lastContentDigest }];
    const knownRevision = revisions.find((revision) => revision.digest === nextDigest);

    state.document.currentFile = file;
    state.document.lastContentDigest = nextDigest;
    state.document.lastSeenAt = timestamp;
    state.document.revisions = revisions;

    if (knownRevision) {
      state.document.currentRevisionSeq = knownRevision.sequence;
      return true;
    }

    state.document.revisionSeq += 1;
    state.document.currentRevisionSeq = state.document.revisionSeq;
    state.document.revisions.push({
      sequence: state.document.currentRevisionSeq,
      digest: nextDigest,
    });
    queueEvent(
      state,
      'document_revised',
      {
        document_id: state.document.id,
        revision_seq: state.document.currentRevisionSeq,
        round_seq: state.document.roundSeq,
      },
      timestamp,
    );
    return true;
  }

  recordOpen(state, timestamp) {
    const previousOpenedAt = Date.parse(state.document.lastOpenedAt);
    const nextOpenedAt = Date.parse(timestamp);
    if (Number.isFinite(previousOpenedAt) && nextOpenedAt - previousOpenedAt < OPEN_WINDOW_MS) {
      return false;
    }

    state.document.lastOpenedAt = timestamp;
    state.document.lastSeenAt = timestamp;
    state.document.openSeq += 1;
    queueEvent(
      state,
      'document_opened',
      {
        document_id: state.document.id,
        open_seq: state.document.openSeq,
      },
      timestamp,
    );
    return true;
  }

  async readDocumentContent(file) {
    const normalizedFile = normalizeDocumentFile(file);
    const resolvedFile = resolve(this.rootDir, normalizedFile);
    const relativeFile = relative(this.rootDir, resolvedFile);

    if (relativeFile === '..' || relativeFile.startsWith(`..${sep}`) || isAbsolute(relativeFile)) {
      throw new Error(`Invalid document file: ${file}`);
    }

    return readFile(resolvedFile, 'utf-8');
  }

  async readDocumentFile(file) {
    const documentFile = this.getDocumentFilePath(file);
    try {
      const parsed = JSON.parse(await readFile(documentFile, 'utf-8'));
      return {
        ...parsed,
        analytics: {
          ...parsed.analytics,
          pendingEvents: Array.isArray(parsed.analytics?.pendingEvents)
            ? parsed.analytics.pendingEvents
            : [],
        },
      };
    } catch (err) {
      if (err?.code === 'ENOENT') {
        return null;
      }
      if (err instanceof SyntaxError) {
        throw new Error(`Invalid document lifecycle JSON: ${documentFile}`);
      }
      throw err;
    }
  }

  async writeDocumentFile(file, state) {
    await mkdir(this.reviewDir, { recursive: true });
    const documentFile = this.getDocumentFilePath(file);
    const tempFile = `${documentFile}.${process.pid}.${Date.now()}.tmp`;

    await mkdir(dirname(documentFile), { recursive: true });
    await writeFile(tempFile, `${JSON.stringify(state, null, 2)}\n`, 'utf-8');
    await rename(tempFile, documentFile);
  }

  async withDocumentLock(file, operation) {
    const documentFile = this.getDocumentFilePath(file);
    const previous = this.locks.get(documentFile) || Promise.resolve();
    let release;
    const gate = new Promise((resolveGate) => {
      release = resolveGate;
    });
    const current = previous.then(() => gate);
    this.locks.set(documentFile, current);

    await previous;
    try {
      return await operation();
    } finally {
      release();
      if (this.locks.get(documentFile) === current) {
        this.locks.delete(documentFile);
      }
    }
  }
}
