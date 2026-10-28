import { normalizeDomain } from '@/utils/url/normalizeDomain';

describe('normalizeDomain', () => {
  it.each([
    'kovaa-lab.com',
    'KOVAALAB.com',
    'www.kovaa-lab.com',
    'https://kovaa-lab.com',
    'https://www.kovaa-lab.com/',
    'http://www.KovaaLab CRM.com/careers?utm=1#team',
    '  https://kovaa-lab.com  ',
    'kovaa-lab.com.',
    'kovaa-lab.com:8080',
    'https://user:secret@www.kovaa-lab.com',
    'ftp://kovaa-lab.com',
  ])('should reduce %s to the bare domain', (rawDomain) => {
    expect(normalizeDomain(rawDomain)).toBe('kovaa-lab.com');
  });

  it('should keep subdomains other than www', () => {
    expect(normalizeDomain('https://blog.kovaa-lab.com')).toBe('blog.kovaa-lab.com');
  });

  it('should fold an internationalized domain onto its punycode spelling', () => {
    expect(normalizeDomain('münchen.de')).toBe('xn--mnchen-3ya.de');
    expect(normalizeDomain('https://München.de')).toBe('xn--mnchen-3ya.de');
    expect(normalizeDomain('xn--mnchen-3ya.de')).toBe('xn--mnchen-3ya.de');
  });

  it('should read a backslash as a path separator, like a browser does', () => {
    expect(normalizeDomain('kovaa-lab.com\\@evil.com')).toBe('kovaa-lab.com');
    expect(normalizeDomain('https://kovaa-lab.com\\evil.com/x')).toBe(
      'kovaa-lab.com',
    );
  });

  it('should drop every user info segment', () => {
    expect(normalizeDomain('https://a@b@kovaa-lab.com')).toBe('kovaa-lab.com');
  });

  it('should strip every repeated www label and trailing dot in one pass', () => {
    expect(normalizeDomain('www.www.kovaa-lab.com')).toBe('kovaa-lab.com');
    expect(normalizeDomain('kovaa-lab.com..')).toBe('kovaa-lab.com');
  });

  it.each([
    'kovaa-lab.com',
    'https://www.kovaa-lab.com/careers?x=1',
    'www.www.kovaa-lab.com',
    'kovaa-lab.com..',
    'münchen.de',
    'not a domain',
    '',
  ])('should already be normalized after one pass for %s', (rawDomain) => {
    const normalized = normalizeDomain(rawDomain);

    expect(normalizeDomain(normalized)).toBe(normalized);
  });

  it('should return an empty string for an empty value', () => {
    expect(normalizeDomain('')).toBe('');
  });

  it('should hand back something unparseable rather than throwing', () => {
    expect(normalizeDomain('not a domain')).toBe('not a domain');
  });
});
