import { useEffect } from 'react';

interface AnalyticsConfig {
  enabled: boolean;
  provider?: 'umami';
  scriptUrl?: string;
  websiteId?: string;
  sanitizedPath?: string;
}

interface ReviewSession {
  analytics?: AnalyticsConfig;
}

type UmamiPayload = Record<string, unknown>;

declare global {
  interface Window {
    umami?: {
      getSession?: () => unknown;
    };
    __mdReviewUmamiBeforeSend?: (type: string, payload: UmamiPayload) => UmamiPayload | false;
  }
}

const SCRIPT_ID = 'md-review-umami-script';
const BEFORE_SEND_HANDLER = '__mdReviewUmamiBeforeSend';
const FALLBACK_DELAY_MS = 3000;

function getFallbackEndpoint(scriptUrl: string) {
  try {
    const url = new URL(scriptUrl);
    if (url.hostname === 'cloud.umami.is') {
      return 'https://gateway.umami.is/api/send';
    }
    return `${url.origin}/api/send`;
  } catch {
    return 'https://gateway.umami.is/api/send';
  }
}

function getScreenSize() {
  return `${window.screen.width}x${window.screen.height}`;
}

function readCache(cacheKey: string) {
  try {
    return window.localStorage?.getItem(cacheKey) || undefined;
  } catch {
    return undefined;
  }
}

function writeCache(cacheKey: string, cache: string) {
  try {
    window.localStorage?.setItem(cacheKey, cache);
  } catch {
    // Cache is optional; reporting still works without localStorage.
  }
}

async function sendFallbackPageview(
  config: Required<Pick<AnalyticsConfig, 'scriptUrl' | 'websiteId'>> &
    Pick<AnalyticsConfig, 'sanitizedPath'>,
) {
  const sanitizedPath = config.sanitizedPath || '/review';
  const cacheKey = `md-review:umami-cache:${config.websiteId}`;
  const cache = readCache(cacheKey);
  const payload = window.__mdReviewUmamiBeforeSend?.('event', {
    website: config.websiteId,
    screen: getScreenSize(),
    language: window.navigator.language,
    title: document.title,
    hostname: window.location.hostname,
    url: window.location.href,
    referrer: document.referrer,
  });

  if (!payload) return;

  try {
    const response = await fetch(getFallbackEndpoint(config.scriptUrl), {
      method: 'POST',
      keepalive: true,
      credentials: 'omit',
      headers: {
        'Content-Type': 'application/json',
        'x-umami-website-id': config.websiteId,
        'x-umami-hostname': String(payload.hostname || 'md-review-server'),
        ...(cache ? { 'x-umami-cache': cache } : {}),
      },
      body: JSON.stringify({ type: 'event', payload: { ...payload, url: sanitizedPath } }),
    });
    const result = (await response.json()) as { cache?: string; disabled?: boolean };
    if (result.cache) {
      writeCache(cacheKey, result.cache);
    }
  } catch {
    // Analytics should never affect the review UI.
  }
}

function installUmami(
  config: Required<Pick<AnalyticsConfig, 'scriptUrl' | 'websiteId'>> &
    Pick<AnalyticsConfig, 'sanitizedPath'>,
) {
  const sanitizedPath = config.sanitizedPath || '/review';

  window.__mdReviewUmamiBeforeSend = (_type, payload) => ({
    ...payload,
    hostname: 'md-review-server',
    referrer: '',
    title: 'Markdown Review',
    url: sanitizedPath,
  });

  const existingScript = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (existingScript) {
    if (
      existingScript.src === config.scriptUrl &&
      existingScript.dataset.websiteId === config.websiteId
    ) {
      return;
    }
    existingScript.remove();
  }

  const script = document.createElement('script');
  script.id = SCRIPT_ID;
  script.defer = true;
  script.src = config.scriptUrl;
  script.dataset.websiteId = config.websiteId;
  script.dataset.beforeSend = BEFORE_SEND_HANDLER;
  document.head.appendChild(script);

  window.setTimeout(() => {
    if (!window.umami) {
      void sendFallbackPageview(config);
    }
  }, FALLBACK_DELAY_MS);
}

export function useAnalytics() {
  useEffect(() => {
    let cancelled = false;

    const loadAnalytics = async () => {
      try {
        const response = await fetch('/api/session');
        if (!response.ok) return;

        const session = (await response.json()) as ReviewSession;
        const analytics = session.analytics;
        if (
          cancelled ||
          !analytics?.enabled ||
          analytics.provider !== 'umami' ||
          !analytics.scriptUrl ||
          !analytics.websiteId
        ) {
          return;
        }

        installUmami({
          scriptUrl: analytics.scriptUrl,
          websiteId: analytics.websiteId,
          sanitizedPath: analytics.sanitizedPath,
        });
      } catch {
        // Analytics should never affect the review UI.
      }
    };

    loadAnalytics();

    return () => {
      cancelled = true;
    };
  }, []);
}
