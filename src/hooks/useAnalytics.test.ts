import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAnalytics } from './useAnalytics';

function jsonResponse(body: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

describe('useAnalytics', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.head.innerHTML = '';
    delete window.__mdReviewUmamiBeforeSend;
    delete window.umami;
    window.localStorage.clear();
  });

  it('injects Umami with a payload sanitizer from the session config', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      if (String(input) === '/api/session') {
        return jsonResponse({
          analytics: {
            enabled: true,
            provider: 'umami',
            scriptUrl: 'https://cloud.umami.is/script.js',
            websiteId: 'website-id',
            sanitizedPath: '/review',
          },
        });
      }

      return Promise.resolve(new Response('Not found', { status: 404 }));
    });

    renderHook(() => useAnalytics());

    await waitFor(() => {
      expect(document.querySelector('#md-review-umami-script')).toBeInTheDocument();
    });

    const script = document.querySelector<HTMLScriptElement>('#md-review-umami-script');
    expect(script?.src).toBe('https://cloud.umami.is/script.js');
    expect(script?.dataset.websiteId).toBe('website-id');
    expect(script?.dataset.beforeSend).toBe('__mdReviewUmamiBeforeSend');

    const sanitized = window.__mdReviewUmamiBeforeSend?.('pageview', {
      url: '/?file=private-plan.md',
      referrer: 'http://127.0.0.1:3030/?file=secret.md',
      title: 'private-plan.md',
      hostname: '127.0.0.1',
    });

    expect(sanitized).toMatchObject({
      url: '/review',
      referrer: '',
      title: 'Markdown Review',
      hostname: 'md-review-server',
    });
  });

  it('does not inject analytics when disabled', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ analytics: { enabled: false } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    renderHook(() => useAnalytics());

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/session');
    });

    expect(document.querySelector('#md-review-umami-script')).not.toBeInTheDocument();
  });

  it('falls back to direct Umami pageview when the script does not load', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      if (String(input) === '/api/session') {
        return jsonResponse({
          analytics: {
            enabled: true,
            provider: 'umami',
            scriptUrl: 'https://cloud.umami.is/script.js',
            websiteId: 'website-id',
            sanitizedPath: '/review',
          },
        });
      }

      return jsonResponse({ cache: 'cache-token' });
    });

    renderHook(() => useAnalytics());

    await waitFor(() => {
      expect(document.querySelector('#md-review-umami-script')).toBeInTheDocument();
    });

    await new Promise((resolve) => window.setTimeout(resolve, 3100));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        'https://gateway.umami.is/api/send',
        expect.objectContaining({
          body: expect.stringContaining('"url":"/review"'),
          headers: expect.objectContaining({
            'x-umami-hostname': 'md-review-server',
            'x-umami-website-id': 'website-id',
          }),
          method: 'POST',
        }),
      );
    });
    expect(window.localStorage.getItem('md-review:umami-cache:website-id')).toBe('cache-token');
  }, 10000);
});
