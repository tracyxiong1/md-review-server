import { mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from './app.js';

describe('review API', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'md-review-api-'));
    await writeFile(join(tempDir, 'guide.v1.md'), '# Guide\n\nA long paragraph for review.\n');
  });

  afterEach(async () => {
    vi.restoreAllMocks();
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

  it('returns analytics configuration in the session', async () => {
    const app = createApp({
      baseDir: tempDir,
      port: 3030,
      host: '127.0.0.1',
      reviewDir: '.reviews',
      readonly: false,
      analytics: {
        enabled: true,
        provider: 'umami',
        scriptUrl: 'https://cloud.umami.is/script.js',
        websiteId: 'website-id',
        sanitizedPath: '/review',
      },
    });

    const response = await app.request('/api/session');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      analytics: {
        enabled: true,
        provider: 'umami',
        scriptUrl: 'https://cloud.umami.is/script.js',
        websiteId: 'website-id',
        sanitizedPath: '/review',
      },
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

  it('serves local images relative to a nested markdown file', async () => {
    await mkdir(join(tempDir, 'docs'));
    await mkdir(join(tempDir, 'images'));
    await writeFile(join(tempDir, 'docs', 'guide.md'), '# Nested guide\n');
    await writeFile(join(tempDir, 'images', 'diagram.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]));

    const app = createApp({ baseDir: tempDir });
    const response = await app.request(
      '/api/assets?file=docs%2Fguide.md&path=..%2Fimages%2Fdiagram.png',
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(
      new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
    );
  });

  it('rejects local image paths outside the review root', async () => {
    const app = createApp({ baseDir: tempDir });
    const response = await app.request('/api/assets?file=guide.v1.md&path=..%2Foutside.png');

    expect(response.status).toBe(403);
  });

  it('rejects non-image files from the local image endpoint', async () => {
    const app = createApp({ baseDir: tempDir });
    const response = await app.request('/api/assets?file=guide.v1.md&path=guide.v1.md');

    expect(response.status).toBe(415);
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

    const replyResponse = await app.request('/api/comments/c001', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file: 'guide.v1.md',
        reply: {
          author: 'codex',
          body: '请确认这是提问还是修改请求。',
        },
      }),
    });
    await expect(replyResponse.json()).resolves.toMatchObject({
      id: 'c001',
      replies: [
        {
          id: 'r001',
          author: 'codex',
          body: '请确认这是提问还是修改请求。',
        },
      ],
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

  it('initializes and syncs document lifecycle analytics after the first comment', async () => {
    const app = createApp({
      baseDir: tempDir,
      reviewDir: '.reviews',
      readonly: false,
      analytics: {
        enabled: true,
        provider: 'umami',
        scriptUrl: 'https://cloud.umami.is/script.js',
        websiteId: 'website-id',
        sanitizedPath: '/review',
      },
    });

    const createResponse = await app.request('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file: 'guide.v1.md',
        startLine: 1,
        endLine: 1,
        selectedText: 'Guide',
        comment: 'Start the review lifecycle',
      }),
    });
    expect(createResponse.status).toBe(201);

    const syncResponse = await app.request('/api/document-analytics/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: 'guide.v1.md' }),
    });
    expect(syncResponse.status).toBe(200);
    const { events } = await syncResponse.json();
    expect(events.map((event) => event.name)).toEqual([
      'document_initialized',
      'document_opened',
      'review_round_started',
    ]);
    expect(events[0].data).toEqual({
      document_id: expect.any(String),
    });
    expect(JSON.stringify(events)).not.toContain('guide.v1.md');

    const ackResponse = await app.request('/api/document-analytics/ack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file: 'guide.v1.md',
        eventIds: events.map((event) => event.id),
      }),
    });
    expect(ackResponse.status).toBe(204);

    const emptySyncResponse = await app.request('/api/document-analytics/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: 'guide.v1.md' }),
    });
    await expect(emptySyncResponse.json()).resolves.toEqual({ events: [] });

    const lifecycle = JSON.parse(
      await readFile(join(tempDir, '.reviews', 'guide.md.document.json'), 'utf-8'),
    );
    expect(lifecycle.document).toMatchObject({
      id: expect.any(String),
      key: 'guide.md',
      revisionSeq: 0,
      roundSeq: 1,
    });
    expect(lifecycle.analytics.pendingEvents).toEqual([]);
  });

  it('does not create lifecycle analytics state when analytics is disabled', async () => {
    const app = createApp({
      baseDir: tempDir,
      reviewDir: '.reviews',
      readonly: false,
      analytics: { enabled: false },
    });

    const createResponse = await app.request('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file: 'guide.v1.md',
        startLine: 1,
        endLine: 1,
        selectedText: 'Guide',
        comment: 'No lifecycle analytics',
      }),
    });
    expect(createResponse.status).toBe(201);

    const syncResponse = await app.request('/api/document-analytics/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: 'guide.v1.md' }),
    });
    await expect(syncResponse.json()).resolves.toEqual({ events: [] });
    await expect(
      readFile(join(tempDir, '.reviews', 'guide.md.document.json'), 'utf-8'),
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('keeps comment creation successful when lifecycle analytics cannot be recorded', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const app = createApp({
      baseDir: tempDir,
      reviewDir: '.reviews',
      readonly: false,
      analytics: { enabled: true },
    });

    const createResponse = await app.request('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file: 'missing.md',
        startLine: 1,
        endLine: 1,
        selectedText: 'Missing',
        comment: 'Analytics must not break comments',
      }),
    });

    expect(createResponse.status).toBe(201);
    expect(warn).toHaveBeenCalledWith(
      'Failed to record document lifecycle analytics:',
      expect.objectContaining({ code: 'ENOENT' }),
    );
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
