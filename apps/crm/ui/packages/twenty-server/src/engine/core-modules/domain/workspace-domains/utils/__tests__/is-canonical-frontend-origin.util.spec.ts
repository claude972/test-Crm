import { isCanonicalFrontendOrigin } from 'src/engine/core-modules/domain/workspace-domains/utils/is-canonical-frontend-origin.util';

describe('canonical workspace frontend origin boundary', () => {
  const frontend = 'https://crm.example.test/app';
  it.each(['https://crm.example.test', 'https://CRM.EXAMPLE.TEST'])(
    'accepts the configured frontend origin %s',
    (origin) => {
      expect(isCanonicalFrontendOrigin(origin, frontend)).toBe(true);
    },
  );
  it.each([
    undefined,
    '',
    'null',
    'https://evil.test',
    'https://crm.example.test.evil.test',
    'https://evil.test@crm.example.test',
    'https://crm.example.test@evil.test',
    'https://crm.example.test/path',
    'https://crm.example.test?x=1',
    'https://crm.example.test#x',
    'http://crm.example.test',
    'https://crm.example.test:444',
    'data:text/html,crm',
    'file:///crm',
    ' https://crm.example.test',
  ])('rejects untrusted or non-origin value %s', (origin) => {
    expect(isCanonicalFrontendOrigin(origin, frontend)).toBe(false);
  });
  it('fails closed for invalid configuration', () => {
    expect(
      isCanonicalFrontendOrigin('https://crm.example.test', 'invalid'),
    ).toBe(false);
  });
});
