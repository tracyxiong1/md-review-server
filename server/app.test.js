import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from './app.js';

describe('review API', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'md-review-api-'));
    await writeFile(join(tempDir, 'guide.v1.md'), '# Guide\n\nA long paragraph for review.\n');
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('returns session configuration for directory mode', async () => {
    const app = createApp({
      baseDir: tempDir,
      port: 3030,
      host: '127.0.0.1',
      reviewDir: '.reviews',
      activeFile: 'guide.v1.md',
      readonly: false,
    });

    const response = await app.request('/api/session');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      mode: 'directory',
      port: 3030,
      host: '127.0.0.1',
      activeFile: 'guide.v1.md',
      reviewDir: join(tempDir, '.reviews'),
      readonly: false,
    });
  });

  it('selects the latest versioned sibling of the active file in directory mode', async () => {
    await writeFile(join(tempDir, 'guide.md'), '# Guide original\n');
    await writeFile(join(tempDir, 'guide.v2.md'), '# Guide v2\n');

    const versionedApp = createApp({
      baseDir: tempDir,
      port: 3030,
      host: '127.0.0.1',
      reviewDir: '.reviews',
      activeFile: 'guide.v1.md',
      readonly: false,
    });

    const versionedResponse = await versionedApp.request('/api/files');

    expect(versionedResponse.status).toBe(200);
    await expect(versionedResponse.json()).resolves.toMatchObject({
      selectedFile: 'guide.v2.md',
    });

    const unversionedApp = createApp({
      baseDir: tempDir,
      port: 3030,
      host: '127.0.0.1',
      reviewDir: '.reviews',
      activeFile: 'guide.md',
      readonly: false,
    });

    const unversionedResponse = await unversionedApp.request('/api/files');

    expect(unversionedResponse.status).toBe(200);
    await expect(unversionedResponse.json()).resolves.toMatchObject({
      selectedFile: 'guide.v2.md',
    });
  });

  it('creates, lists, patches, batch patches, and deletes comments', async () => {
    const app = createApp({
      baseDir: tempDir,
      port: 3030,
      host: '127.0.0.1',
      reviewDir: '.reviews',
      readonly: false,
    });

    const createResponse = await app.request('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file: 'guide.v1.md',
        startLine: 3,
        endLine: 3,
        startOffset: 2,
        endOffset: 16,
        selectedText: 'long paragraph',
        beforeText: 'A ',
        afterText: ' for review.',
        comment: 'Clarify the paragraph',
      }),
    });
    expect(createResponse.status).toBe(201);
    const created = await createResponse.json();
    expect(created).toMatchObject({ id: 'c001', status: 'open' });

    const openResponse = await app.request('/api/comments?file=guide.v1.md&status=open');
    await expect(openResponse.json()).resolves.toHaveLength(1);

    const editResponse = await app.request('/api/comments/c001', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: 'guide.v1.md', comment: 'Edited comment' }),
    });
    await expect(editResponse.json()).resolves.toMatchObject({
      id: 'c001',
      comment: 'Edited comment',
    });

    const batchResponse = await app.request('/api/comments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        updates: [
          {
            id: 'c001',
            file: 'guide.v1.md',
            status: 'resolved',
            targetFile: 'guide.v2.md',
            targetStartLine: 4,
            targetEndLine: 4,
            targetSelectedText: 'Updated paragraph',
            resolution: 'Updated in the next version',
          },
        ],
      }),
    });
    await expect(batchResponse.json()).resolves.toMatchObject([
      {
        id: 'c001',
        status: 'resolved',
        targetFile: 'guide.v2.md',
        targetStartLine: 4,
        targetEndLine: 4,
        targetSelectedText: 'Updated paragraph',
      },
    ]);

    const targetResponse = await app.request('/api/comments?targetFile=guide.v2.md');
    await expect(targetResponse.json()).resolves.toMatchObject([
      {
        id: 'c001',
        file: 'guide.v1.md',
        status: 'resolved',
        targetFile: 'guide.v2.md',
        targetStartLine: 4,
      },
    ]);

    const deleteResponse = await app.request('/api/comments/c001?file=guide.v1.md', {
      method: 'DELETE',
    });
    expect(deleteResponse.status).toBe(204);
    const allResponse = await app.request('/api/comments?file=guide.v1.md');
    await expect(allResponse.json()).resolves.toEqual([]);

    const sidecar = JSON.parse(
      await readFile(join(tempDir, '.reviews', 'guide.v1.review.json'), 'utf-8'),
    );
    expect(sidecar.comments).toEqual([]);
  });

  it('rejects write requests in readonly mode', async () => {
    const app = createApp({
      baseDir: tempDir,
      port: 3030,
      host: '127.0.0.1',
      reviewDir: '.reviews',
      readonly: true,
    });

    const response = await app.request('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file: 'guide.v1.md',
        startLine: 1,
        endLine: 1,
        selectedText: 'Guide',
        comment: 'Readonly should reject this',
      }),
    });

    expect(response.status).toBe(403);
  });
});
