import { isValidDomain } from '@/utils/url/isValidDomain';

describe('isValidDomain', () => {
  it.each([
    'kovaa-lab.com',
    'https://www.kovaa-lab.com/careers?x=1',
    'blog.kovaa-lab.com',
    'kovaa-lab.co.uk',
    'münchen.de',
    'kovaa-lab.com.',
    'kovaa-lab.com:8080',
  ])('should accept %s', (rawDomain) => {
    expect(isValidDomain(rawDomain)).toBe(true);
  });

  it.each([
    'not a domain',
    'kovaa-lab',
    'javascript:alert(1)',
    '<script>',
    'localhost',
    '192.168.1.1',
    '',
  ])('should reject %s', (rawDomain) => {
    expect(isValidDomain(rawDomain)).toBe(false);
  });

  it('should judge a backslash host the way a browser reads it', () => {
    expect(isValidDomain('kovaa-lab.com\\@evil.com')).toBe(true);
    expect(isValidDomain('kovaa-lab.com\\@not a domain')).toBe(true);
  });
});
