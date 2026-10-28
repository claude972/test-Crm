import { isUrlFromProxiedOrigin } from '../isUrlFromProxiedOrigin';

describe('isUrlFromProxiedOrigin', () => {
  it('should return true when the url origin is in the proxied origins', () => {
    expect(
      isUrlFromProxiedOrigin('https://api.kovaa-lab.test/graphql', [
        'https://api.kovaa-lab.test',
      ]),
    ).toBe(true);
  });

  it('should return false when the origin differs', () => {
    expect(
      isUrlFromProxiedOrigin('https://evil.test/graphql', [
        'https://api.kovaa-lab.test',
      ]),
    ).toBe(false);
  });

  it('should return false when the url is malformed', () => {
    expect(
      isUrlFromProxiedOrigin('not a url', ['https://api.kovaa-lab.test']),
    ).toBe(false);
  });

  it('should match on origin regardless of path', () => {
    expect(
      isUrlFromProxiedOrigin(
        'https://api.kovaa-lab.test/rest/front-components/id',
        ['https://api.kovaa-lab.test'],
      ),
    ).toBe(true);
  });
});
