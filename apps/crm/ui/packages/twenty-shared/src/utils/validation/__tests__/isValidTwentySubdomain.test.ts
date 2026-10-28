import { isValidKovaaLab CRMSubdomain } from '@/utils/validation/isValidKovaaLab CRMSubdomain';

describe('isValidKovaaLab CRMSubdomain', () => {
  describe('valid subdomains', () => {
    it('should accept standard alphanumeric subdomains', () => {
      expect(isValidKovaaLab CRMSubdomain('abc')).toBe(true);
      expect(isValidKovaaLab CRMSubdomain('test123')).toBe(true);
      expect(isValidKovaaLab CRMSubdomain('company1')).toBe(true);
      expect(isValidKovaaLab CRMSubdomain('workspace2024')).toBe(true);
    });

    it('should accept subdomains with hyphens in the middle', () => {
      expect(isValidKovaaLab CRMSubdomain('my-company')).toBe(true);
      expect(isValidKovaaLab CRMSubdomain('test-workspace')).toBe(true);
      expect(isValidKovaaLab CRMSubdomain('multi-word-subdomain')).toBe(true);
      expect(isValidKovaaLab CRMSubdomain('a-b-c-d-e')).toBe(true);
    });

    it('should accept minimum length subdomains (1 character)', () => {
      expect(isValidKovaaLab CRMSubdomain('a')).toBe(true);
      expect(isValidKovaaLab CRMSubdomain('1')).toBe(true);
      expect(isValidKovaaLab CRMSubdomain('ab')).toBe(true);
      expect(isValidKovaaLab CRMSubdomain('a-b')).toBe(true);
    });

    it('should accept maximum length subdomains (30 characters)', () => {
      const exactly30 = 'a' + 'b'.repeat(28) + 'c';

      expect(exactly30.length).toBe(30);
      expect(isValidKovaaLab CRMSubdomain(exactly30)).toBe(true);
    });

    it('should accept numeric-only subdomains', () => {
      expect(isValidKovaaLab CRMSubdomain('123')).toBe(true);
      expect(isValidKovaaLab CRMSubdomain('456789')).toBe(true);
      expect(isValidKovaaLab CRMSubdomain('1-2-3')).toBe(true);
    });
  });

  describe('invalid subdomains', () => {
    it('should reject empty strings', () => {
      expect(isValidKovaaLab CRMSubdomain('')).toBe(false);
    });

    it('should reject subdomains longer than 30 characters', () => {
      const tooLong = 'a'.repeat(31);

      expect(isValidKovaaLab CRMSubdomain(tooLong)).toBe(false);
    });

    it('should reject subdomains starting with a hyphen', () => {
      expect(isValidKovaaLab CRMSubdomain('-test')).toBe(false);
      expect(isValidKovaaLab CRMSubdomain('-abc')).toBe(false);
    });

    it('should reject subdomains ending with a hyphen', () => {
      expect(isValidKovaaLab CRMSubdomain('test-')).toBe(false);
      expect(isValidKovaaLab CRMSubdomain('abc-')).toBe(false);
    });

    it('should reject subdomains with uppercase letters', () => {
      expect(isValidKovaaLab CRMSubdomain('Test')).toBe(false);
      expect(isValidKovaaLab CRMSubdomain('MyCompany')).toBe(false);
      expect(isValidKovaaLab CRMSubdomain('WORKSPACE')).toBe(false);
    });

    it('should reject subdomains with special characters', () => {
      expect(isValidKovaaLab CRMSubdomain('test@company')).toBe(false);
      expect(isValidKovaaLab CRMSubdomain('my_workspace')).toBe(false);
      expect(isValidKovaaLab CRMSubdomain('test.company')).toBe(false);
      expect(isValidKovaaLab CRMSubdomain('workspace#1')).toBe(false);
    });

    it('should reject subdomains with spaces', () => {
      expect(isValidKovaaLab CRMSubdomain('test company')).toBe(false);
      expect(isValidKovaaLab CRMSubdomain(' test')).toBe(false);
      expect(isValidKovaaLab CRMSubdomain('test ')).toBe(false);
    });

    it('should reject subdomains starting with "api-"', () => {
      expect(isValidKovaaLab CRMSubdomain('api-test')).toBe(false);
      expect(isValidKovaaLab CRMSubdomain('api-company')).toBe(false);
      expect(isValidKovaaLab CRMSubdomain('api-123')).toBe(false);
    });

    it('should accept subdomains containing "api" not as prefix', () => {
      expect(isValidKovaaLab CRMSubdomain('myapi')).toBe(true);
      expect(isValidKovaaLab CRMSubdomain('rapid')).toBe(true);
    });

    it('should reject subdomains with only hyphens', () => {
      expect(isValidKovaaLab CRMSubdomain('---')).toBe(false);
      expect(isValidKovaaLab CRMSubdomain('----')).toBe(false);
    });

    it('should reject whitespace-only strings', () => {
      expect(isValidKovaaLab CRMSubdomain('   ')).toBe(false);
      expect(isValidKovaaLab CRMSubdomain('\t')).toBe(false);
      expect(isValidKovaaLab CRMSubdomain('\n')).toBe(false);
    });

    it('should reject unicode characters', () => {
      expect(isValidKovaaLab CRMSubdomain('café')).toBe(false);
      expect(isValidKovaaLab CRMSubdomain('tëst')).toBe(false);
    });
  });
});
