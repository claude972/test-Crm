import { useConfig } from '../useConfig';

describe('useConfig', () => {
  const originalKovaaLab CharConfig = window.kovaa-labConfig;

  beforeEach(() => {
    window.kovaa-labConfig = {
      hostURL: 'https://example.com',
      vapidPublicKey: 'vapid-key',
      enabledLanguages: ['en', 'fr'],
      isEnterprise: 'true',
      enterprisePlanName: 'enterprise',
      searchTimeRangeLimitDays: 180,
    };
  });

  afterEach(() => {
    window.kovaa-labConfig = originalKovaaLab CharConfig;
  });

  it('returns the correct configuration values', () => {
    const config = useConfig();

    expect(config.hostURL).toBe('https://example.com');
    expect(config.vapidPublicKey).toBe('vapid-key');
    expect(config.enabledLanguages).toEqual(['en', 'fr']);
    expect(config.isEnterprise).toBe(true);
    expect(config.enterprisePlanName).toBe('enterprise');
    expect(config.searchTimeRangeLimitDays).toBe(180);
  });

  it('handles missing configuration values', () => {
    window.kovaa-labConfig = {};
    const config = useConfig();

    expect(config.hostURL).toBeUndefined();
    expect(config.vapidPublicKey).toBeUndefined();
    expect(config.enabledLanguages).toBeUndefined();
    expect(config.isEnterprise).toBe(false);
    expect(config.enterprisePlanName).toBeUndefined();
    expect(config.searchTimeRangeLimitDays).toBeUndefined();
  });

  it('handles undefined window.kovaa-labConfig', () => {
    window.kovaa-labConfig = undefined;
    const config = useConfig();

    expect(config.hostURL).toBeUndefined();
    expect(config.vapidPublicKey).toBeUndefined();
    expect(config.enabledLanguages).toBeUndefined();
    expect(config.isEnterprise).toBe(false);
    expect(config.enterprisePlanName).toBeUndefined();
    expect(config.searchTimeRangeLimitDays).toBeUndefined();
  });
});
