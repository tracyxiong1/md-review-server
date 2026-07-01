import { describe, expect, it } from 'vitest';
import { DEFAULT_ANALYTICS, resolveAnalyticsConfig } from './analytics.js';

describe('analytics config', () => {
  it('enables the default Umami analytics configuration', () => {
    expect(resolveAnalyticsConfig({ env: {} })).toEqual({
      ...DEFAULT_ANALYTICS,
      enabled: true,
    });
  });

  it('can be disabled through environment or CLI flags', () => {
    expect(resolveAnalyticsConfig({ env: { MD_REVIEW_ANALYTICS: '0' } })).toEqual({
      enabled: false,
    });
    expect(resolveAnalyticsConfig({ env: {}, args: { analytics: false } })).toEqual({
      enabled: false,
    });
  });

  it('allows overriding Umami script, website id, and sanitized path', () => {
    expect(
      resolveAnalyticsConfig({
        env: {
          MD_REVIEW_ANALYTICS_URL: 'https://analytics.example.com/script.js',
          MD_REVIEW_ANALYTICS_ID: 'custom-id',
          MD_REVIEW_ANALYTICS_PATH: '/custom-review',
        },
      }),
    ).toEqual({
      enabled: true,
      provider: 'umami',
      scriptUrl: 'https://analytics.example.com/script.js',
      websiteId: 'custom-id',
      sanitizedPath: '/custom-review',
    });
  });
});
