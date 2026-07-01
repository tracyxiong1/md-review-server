export const DEFAULT_ANALYTICS = {
  enabled: true,
  provider: 'umami',
  scriptUrl: 'https://cloud.umami.is/script.js',
  websiteId: 'ec0cd0fc-7e93-41b5-8599-726aad26e852',
  sanitizedPath: '/review',
};

const DISABLED_VALUES = new Set(['0', 'false', 'off', 'no']);

function isDisabled(value) {
  return typeof value === 'string' && DISABLED_VALUES.has(value.trim().toLowerCase());
}

export function resolveAnalyticsConfig({ env = process.env, args = {} } = {}) {
  if (args.analytics === false || isDisabled(env.MD_REVIEW_ANALYTICS)) {
    return { enabled: false };
  }

  const scriptUrl =
    args['analytics-url'] || env.MD_REVIEW_ANALYTICS_URL || DEFAULT_ANALYTICS.scriptUrl;
  const websiteId =
    args['analytics-id'] || env.MD_REVIEW_ANALYTICS_ID || DEFAULT_ANALYTICS.websiteId;
  const sanitizedPath =
    args['analytics-path'] || env.MD_REVIEW_ANALYTICS_PATH || DEFAULT_ANALYTICS.sanitizedPath;

  if (!scriptUrl || !websiteId) {
    return { enabled: false };
  }

  return {
    enabled: true,
    provider: 'umami',
    scriptUrl,
    websiteId,
    sanitizedPath,
  };
}
