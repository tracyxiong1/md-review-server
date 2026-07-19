import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DocumentLifecycleStore } from './document-lifecycle-store.js';

describe('DocumentLifecycleStore', () => {
  let tempDir;
  let now;
  let store;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'md-review-lifecycle-'));
    now = Date.parse('2026-07-19T12:00:00.000Z');
    store = new DocumentLifecycleStore({
      rootDir: tempDir,
      reviewDir: '.reviews',
      now: () => new Date(now),
    });
    await writeFile(join(tempDir, 'guide.v1.md'), '# Guide\n\nFirst version.\n');
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('does not create lifecycle state for preview-only documents', async () => {
    await expect(store.sync('guide.v1.md')).resolves.toEqual([]);
    await expect(readFile(store.getDocumentFilePath('guide.v1.md'), 'utf-8')).rejects.toMatchObject(
      {
        code: 'ENOENT',
      },
    );
  });

  it('keeps one document id across versioned files and queues lifecycle events once', async () => {
    const initialized = await store.recordReview('guide.v1.md');

    expect(initialized).toEqual([
      expect.objectContaining({
        name: 'document_initialized',
        data: { document_id: expect.any(String) },
      }),
      expect.objectContaining({
        name: 'document_opened',
        data: { document_id: expect.any(String), open_seq: 1 },
      }),
      expect.objectContaining({
        name: 'review_round_started',
        data: { document_id: expect.any(String), revision_seq: 0, round_seq: 1 },
      }),
    ]);

    const documentId = initialized[0].data.document_id;
    await store.ack(
      'guide.v1.md',
      initialized.map((event) => event.id),
    );
    await expect(store.recordReview('guide.v1.md')).resolves.toEqual([]);

    await writeFile(join(tempDir, 'guide.v2.md'), '# Guide\n\nSecond version.\n');
    const revised = await store.sync('guide.v2.md');
    expect(revised).toEqual([
      expect.objectContaining({
        name: 'document_revised',
        data: { document_id: documentId, revision_seq: 1, round_seq: 1 },
      }),
    ]);

    await store.ack(
      'guide.v2.md',
      revised.map((event) => event.id),
    );
    const nextRound = await store.recordReview('guide.v2.md');
    expect(nextRound).toEqual([
      expect.objectContaining({
        name: 'review_round_started',
        data: { document_id: documentId, revision_seq: 1, round_seq: 2 },
      }),
    ]);

    const persisted = JSON.parse(await readFile(store.getDocumentFilePath('guide.v2.md'), 'utf-8'));
    expect(persisted.document).toMatchObject({
      id: documentId,
      key: 'guide.md',
      currentFile: 'guide.v2.md',
      openSeq: 1,
      revisionSeq: 1,
      roundSeq: 2,
    });
  });

  it('counts another effective open only after thirty minutes', async () => {
    const initialized = await store.recordReview('guide.v1.md');
    await store.ack(
      'guide.v1.md',
      initialized.map((event) => event.id),
    );

    now += 29 * 60 * 1000;
    await expect(store.sync('guide.v1.md')).resolves.toEqual([]);

    now += 2 * 60 * 1000;
    await expect(store.sync('guide.v1.md')).resolves.toEqual([
      expect.objectContaining({
        name: 'document_opened',
        data: {
          document_id: initialized[0].data.document_id,
          open_seq: 2,
        },
      }),
    ]);
  });

  it('does not count reopening a previously seen version as another revision', async () => {
    const initialized = await store.recordReview('guide.v1.md');
    await store.ack(
      'guide.v1.md',
      initialized.map((event) => event.id),
    );

    await writeFile(join(tempDir, 'guide.v2.md'), '# Guide\n\nSecond version.\n');
    const revised = await store.sync('guide.v2.md');
    await store.ack(
      'guide.v2.md',
      revised.map((event) => event.id),
    );

    await expect(store.sync('guide.v1.md')).resolves.toEqual([]);

    const persisted = JSON.parse(await readFile(store.getDocumentFilePath('guide.v1.md'), 'utf-8'));
    expect(persisted.document).toMatchObject({
      revisionSeq: 1,
      currentRevisionSeq: 0,
    });
  });

  it('generates a different document id for another document', async () => {
    await writeFile(join(tempDir, 'notes.md'), '# Notes\n');

    const guideEvents = await store.recordReview('guide.v1.md');
    const notesEvents = await store.recordReview('notes.md');

    expect(guideEvents[0].data.document_id).not.toBe(notesEvents[0].data.document_id);
    expect(store.getDocumentFilePath('guide.v1.md')).not.toBe(
      store.getDocumentFilePath('notes.md'),
    );
  });

  it('keeps unacknowledged events pending for retry', async () => {
    const initialized = await store.recordReview('guide.v1.md');

    await expect(store.sync('guide.v1.md')).resolves.toEqual(initialized);
  });

  it('rejects paths outside the review root on every platform', async () => {
    await expect(store.recordReview('../outside.md')).rejects.toThrow('Invalid document file');
    await expect(store.recordReview('C:\\private\\outside.md')).rejects.toThrow(
      'Invalid document file',
    );
  });
});
