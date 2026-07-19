import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ANALYTICS_READY_EVENT } from './useAnalytics';
import { syncDocumentAnalytics, useDocumentAnalytics } from './useDocumentAnalytics';

const DOCUMENT_ID = '11111111-1111-4111-8111-111111111111';

function jsonResponse(body: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

describe('document analytics', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete window.__mdReviewTrackEvent;
  });

  it('sends only whitelisted event data and acknowledges successful events', async () => {
    const trackEvent = vi.fn().mockResolvedValue(true);
    window.__mdReviewTrackEvent = trackEvent;
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      if (String(input) === '/api/document-analytics/sync') {
        return jsonResponse({
          events: [
            {
              id: 'event-1',
              name: 'document_revised',
              data: {
                document_id: DOCUMENT_ID,
                revision_seq: 2,
                round_seq: 1,
                file: 'private-plan.v2.md',
              },
              createdAt: '2026-07-19T00:00:00.000Z',
            },
          ],
        });
      }

      return Promise.resolve(new Response(null, { status: 204 }));
    });

    await syncDocumentAnalytics('private-plan.v2.md');

    expect(trackEvent).toHaveBeenCalledWith('document_revised', {
      document_id: DOCUMENT_ID,
      revision_seq: 2,
      round_seq: 1,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/document-analytics/ack',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          file: 'private-plan.v2.md',
          eventIds: ['event-1'],
        }),
      }),
    );
  });

  it('keeps failed events pending by acknowledging only successful sends', async () => {
    window.__mdReviewTrackEvent = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      if (String(input) === '/api/document-analytics/sync') {
        return jsonResponse({
          events: [
            {
              id: 'event-1',
              name: 'document_initialized',
              data: { document_id: DOCUMENT_ID },
            },
            {
              id: 'event-2',
              name: 'document_opened',
              data: { document_id: DOCUMENT_ID, open_seq: 1 },
            },
          ],
        });
      }

      return Promise.resolve(new Response(null, { status: 204 }));
    });

    await syncDocumentAnalytics('guide.md');

    const ackCall = fetchMock.mock.calls.find(
      ([input]) => String(input) === '/api/document-analytics/ack',
    );
    expect(ackCall?.[1]?.body).toBe(
      JSON.stringify({
        file: 'guide.md',
        eventIds: ['event-1'],
      }),
    );
  });

  it('does not upload or acknowledge an invalid document id', async () => {
    window.__mdReviewTrackEvent = vi.fn().mockResolvedValue(true);
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      if (String(input) === '/api/document-analytics/sync') {
        return jsonResponse({
          events: [
            {
              id: 'event-1',
              name: 'document_initialized',
              data: { document_id: '/Users/alice/private-plan.md' },
            },
          ],
        });
      }

      return Promise.resolve(new Response(null, { status: 204 }));
    });

    await syncDocumentAnalytics('private-plan.md');

    expect(window.__mdReviewTrackEvent).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('waits for analytics readiness before syncing an opened document', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      if (String(input) === '/api/document-analytics/sync') {
        return jsonResponse({ events: [] });
      }
      return Promise.resolve(new Response(null, { status: 204 }));
    });

    renderHook(() => useDocumentAnalytics('guide.md', '# Guide'));
    expect(fetchMock).not.toHaveBeenCalled();

    window.__mdReviewTrackEvent = vi.fn().mockResolvedValue(true);
    act(() => {
      window.dispatchEvent(new Event(ANALYTICS_READY_EVENT));
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/document-analytics/sync',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });
});
