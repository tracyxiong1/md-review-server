import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FileCommentStore } from './comment-store.js';

describe('FileCommentStore', () => {
  let tempDir;
  let store;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'md-review-server-'));
    store = new FileCommentStore({
      rootDir: tempDir,
      reviewDir: '.reviews',
    });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('creates a review file and assigns sequential ids', async () => {
    const first = await store.createComment({
      file: 'docs/example.v2.md',
      startLine: 3,
      endLine: 3,
      startOffset: 4,
      endOffset: 14,
      selectedText: 'selected text',
      beforeText: 'before',
      afterText: 'after',
      comment: 'Clarify this sentence',
    });
    const second = await store.createComment({
      file: 'docs/example.v2.md',
      startLine: 4,
      endLine: 4,
      selectedText: 'another text',
      comment: 'Add one more detail',
    });

    expect(first).toMatchObject({
      id: 'c001',
      file: 'docs/example.v2.md',
      documentVersion: 'v2',
      status: 'open',
    });
    expect(second.id).toBe('c002');

    const reviewFile = join(tempDir, '.reviews', 'docs__example.v2.review.json');
    const reviewJson = JSON.parse(await readFile(reviewFile, 'utf-8'));
    expect(reviewJson.document).toBe('docs/example.v2.md');
    expect(reviewJson.comments).toHaveLength(2);
  });

  it('filters comments by status', async () => {
    const open = await store.createComment({
      file: 'guide.md',
      startLine: 1,
      endLine: 1,
      selectedText: 'open',
      comment: 'Open comment',
    });
    const resolved = await store.createComment({
      file: 'guide.md',
      startLine: 2,
      endLine: 2,
      selectedText: 'resolved',
      comment: 'Resolved comment',
    });
    await store.updateComment(resolved.id, { file: 'guide.md', status: 'resolved' });

    await expect(store.listComments({ file: 'guide.md', status: 'open' })).resolves.toMatchObject([
      { id: open.id },
    ]);
  });

  it('updates comments in batches and records consumedAt for status changes', async () => {
    const first = await store.createComment({
      file: 'guide.md',
      startLine: 1,
      endLine: 1,
      selectedText: 'first',
      comment: 'First comment',
    });
    const second = await store.createComment({
      file: 'guide.md',
      startLine: 2,
      endLine: 2,
      selectedText: 'second',
      comment: 'Second comment',
    });

    const updated = await store.batchUpdateComments([
      {
        id: first.id,
        file: 'guide.md',
        status: 'resolved',
        targetFile: 'guide.v2.md',
        resolution: 'Handled',
        consumedBy: 'codex',
      },
      {
        id: second.id,
        file: 'guide.md',
        status: 'unresolved',
        targetFile: 'guide.v2.md',
        resolution: 'Ambiguous target',
      },
    ]);

    expect(updated).toHaveLength(2);
    expect(updated[0]).toMatchObject({
      id: first.id,
      status: 'resolved',
      targetFile: 'guide.v2.md',
      consumedBy: 'codex',
    });
    expect(updated[0].consumedAt).toEqual(expect.any(String));
    expect(updated[1]).toMatchObject({
      id: second.id,
      status: 'unresolved',
      resolution: 'Ambiguous target',
    });
  });

  it('stores target line anchors and filters comments by target file', async () => {
    const comment = await store.createComment({
      file: 'guide.v3.md',
      startLine: 10,
      endLine: 10,
      selectedText: 'old wording',
      comment: 'Rewrite this sentence',
    });

    await store.updateComment(comment.id, {
      file: 'guide.v3.md',
      status: 'resolved',
      targetFile: 'guide.v4.md',
      targetStartLine: 12,
      targetEndLine: 14,
      targetSelectedText: 'new wording',
      resolution: 'Rewrote the paragraph in v4.',
    });

    await expect(store.listComments({ targetFile: 'guide.v4.md' })).resolves.toMatchObject([
      {
        id: comment.id,
        file: 'guide.v3.md',
        status: 'resolved',
        targetFile: 'guide.v4.md',
        targetStartLine: 12,
        targetEndLine: 14,
        targetSelectedText: 'new wording',
        resolution: 'Rewrote the paragraph in v4.',
      },
    ]);
    await expect(store.listComments({ targetFile: 'guide.v5.md' })).resolves.toEqual([]);
  });

  it('edits and deletes comments', async () => {
    const comment = await store.createComment({
      file: 'guide.md',
      startLine: 1,
      endLine: 1,
      selectedText: 'text',
      comment: 'Original',
    });

    await expect(
      store.updateComment(comment.id, { file: 'guide.md', comment: 'Edited' }),
    ).resolves.toMatchObject({ id: comment.id, comment: 'Edited' });

    await store.deleteComment(comment.id, { file: 'guide.md' });
    await expect(store.listComments({ file: 'guide.md' })).resolves.toEqual([]);
  });

  it('reports invalid review JSON without overwriting it', async () => {
    const reviewDir = join(tempDir, '.reviews');
    await writeFile(join(tempDir, 'placeholder'), '');
    await store.ensureReviewDir();
    const reviewFile = join(reviewDir, 'guide.review.json');
    await writeFile(reviewFile, '{invalid-json', 'utf-8');

    await expect(store.listComments({ file: 'guide.md' })).rejects.toThrow(
      /Invalid review file JSON/,
    );
    await expect(readFile(reviewFile, 'utf-8')).resolves.toBe('{invalid-json');
  });
});
