import { isValidKovaaLabCRMSubdomain } from '@/utils/validation/isValidTwentySubdomain';

describe('isValidKovaaLabCRMSubdomain', () => {
  describe('valid subdomains', () => {
    it('should accept standard alphanumeric subdomains', () => {
      expect(isValidKovaaLabCRMSubdomain('abc')).toBe(true);
      expect(isValidKovaaLabCRMSubdomain('test123')).toBe(true);
      expect(isValidKovaaLabCRMSubdomain('company1')).toBe(true);
      expect(isValidKovaaLabCRMSubdomain('workspace2024')).toBe(true);
    });

    it('should accept subdomains with hyphens in the middle', () => {
      expect(isValidKovaaLabCRMSubdomain('my-company')).toBe(true);
      expect(isValidKovaaLabCRMSubdomain('test-workspace')).toBe(true);
      expect(isValidKovaaLabCRMSubdomain('multi-word-subdomain')).toBe(true);
      expect(isValidKovaaLabCRMSubdomain('a-b-c-d-e')).toBe(true);
    });

    it('should accept minimum length subdomains (1 character)', () => {
      expect(isValidKovaaLabCRMSubdomain('a')).toBe(true);
      expect(isValidKovaaLabCRMSubdomain('1')).toBe(true);
      expect(isValidKovaaLabCRMSubdomain('ab')).toBe(true);
      expect(isValidKovaaLabCRMSubdomain('a-b')).toBe(true);
    });

    it('should accept maximum length subdomains (30 characters)', () => {
      const exactly30 = 'a' + 'b'.repeat(28) + 'c';

      expect(exactly30.length).toBe(30);
      expect(isValidKovaaLabCRMSubdomain(exactly30)).toBe(true);
    });

    it('should accept numeric-only subdomains', () => {
      expect(isValidKovaaLabCRMSubdomain('123')).toBe(true);
      expect(isValidKovaaLabCRMSubdomain('456789')).toBe(true);
      expect(isValidKovaaLabCRMSubdomain('1-2-3')).toBe(true);
    });
  });

  describe('invalid subdomains', () => {
    it('should reject empty strings', () => {
      expect(isValidKovaaLabCRMSubdomain('')).toBe(false);
    });

    it('should reject subdomains longer than 30 characters', () => {
      const tooLong = 'a'.repeat(31);

      expect(isValidKovaaLabCRMSubdomain(tooLong)).toBe(false);
    });

    it('should reject subdomains starting with a hyphen', () => {
      expect(isValidKovaaLabCRMSubdomain('-test')).toBe(false);
      expect(isValidKovaaLabCRMSubdomain('-abc')).toBe(false);
    });

    it('should reject subdomains ending with a hyphen', () => {
      expect(isValidKovaaLabCRMSubdomain('test-')).toBe(false);
      expect(isValidKovaaLabCRMSubdomain('abc-')).toBe(false);
    });

    it('should reject subdomains with uppercase letters', () => {
      expect(isValidKovaaLabCRMSubdomain('Test')).toBe(false);
      expect(isValidKovaaLabCRMSubdomain('MyCompany')).toBe(false);
      expect(isValidKovaaLabCRMSubdomain('WORKSPACE')).toBe(false);
    });

    it('should reject subdomains with special characters', () => {
      expect(isValidKovaaLabCRMSubdomain('test@company')).toBe(false);
      expect(isValidKovaaLabCRMSubdomain('my_workspace')).toBe(false);
      expect(isValidKovaaLabCRMSubdomain('test.company')).toBe(false);
      expect(isValidKovaaLabCRMSubdomain('workspace#1')).toBe(false);
    });

    it('should reject subdomains with spaces', () => {
      expect(isValidKovaaLabCRMSubdomain('test company')).toBe(false);
      expect(isValidKovaaLabCRMSubdomain(' test')).toBe(false);
      expect(isValidKovaaLabCRMSubdomain('test ')).toBe(false);
    });

    it('should reject subdomains starting with "api-"', () => {
      expect(isValidKovaaLabCRMSubdomain('api-test')).toBe(false);
      expect(isValidKovaaLabCRMSubdomain('api-company')).toBe(false);
      expect(isValidKovaaLabCRMSubdomain('api-123')).toBe(false);
    });

    it('should accept subdomains containing "api" not as prefix', () => {
      expect(isValidKovaaLabCRMSubdomain('myapi')).toBe(true);
      expect(isValidKovaaLabCRMSubdomain('rapid')).toBe(true);
    });

    it('should reject subdomains with only hyphens', () => {
      expect(isValidKovaaLabCRMSubdomain('---')).toBe(false);
      expect(isValidKovaaLabCRMSubdomain('----')).toBe(false);
    });

    it('should reject whitespace-only strings', () => {
      expect(isValidKovaaLabCRMSubdomain('   ')).toBe(false);
      expect(isValidKovaaLabCRMSubdomain('\t')).toBe(false);
      expect(isValidKovaaLabCRMSubdomain('\n')).toBe(false);
    });

    it('should reject unicode characters', () => {
      expect(isValidKovaaLabCRMSubdomain('café')).toBe(false);
      expect(isValidKovaaLabCRMSubdomain('tëst')).toBe(false);
    });
  });
});
