import {
  effectiveWhatsappMode,
  enrollmentQrSchema,
  enrollmentScopeSchema,
  managedConnectionMatches,
  managedEvolutionSchema,
  managedInstanceName,
  provisionerConfiguration,
} from '../evolution-enrollment.policy';
const workspace = 'b9c2e7ad-67ed-42be-b687-1a410e60b5ba';
describe('managed enrollment boundaries', () => {
  it('defaults disabled and only accepts a fixed HTTPS origin', () => {
    expect(
      provisionerConfiguration({
        enabled: false,
        baseUrl: undefined,
        apiKey: undefined,
      }),
    ).toBeNull();
    for (const baseUrl of [
      'http://private.test',
      'https://user:pass@private.test',
      'https://private.test/path',
      'https://private.test?x=1',
      'https://private.test#x',
    ])
      expect(() =>
        provisionerConfiguration({
          enabled: true,
          baseUrl,
          apiKey: 'x'.repeat(64),
        }),
      ).toThrow();
    expect(
      provisionerConfiguration({
        enabled: true,
        baseUrl: 'https://private.test:8443/',
        apiKey: 'x'.repeat(64),
      }),
    ).toMatchObject({
      hostname: 'private.test',
      baseUrl: 'https://private.test:8443',
    });
  });
  it('derives one instance per workspace and cannot substitute another origin or workspace', () => {
    const settings = {
      baseUrl: 'https://private.test',
      instanceName: managedInstanceName(workspace),
    };
    expect(
      managedConnectionMatches(workspace, settings, settings.baseUrl),
    ).toBe(true);
    expect(
      managedConnectionMatches(
        'a9c2e7ad-67ed-42be-b687-1a410e60b5ba',
        settings,
        settings.baseUrl,
      ),
    ).toBe(false);
    expect(
      managedConnectionMatches(workspace, settings, 'https://other.test'),
    ).toBe(false);
  });
  it('rejects forged scopes, arbitrary instance/secrets and malformed private phone inputs', () => {
    for (const value of [
      { expectedRevision: 0, workspaceId: workspace },
      { expectedRevision: 0, instanceName: 'x' },
      { expectedRevision: 0, apiKey: 'x' },
      { expectedRevision: -1 },
    ])
      expect(enrollmentScopeSchema.safeParse(value).success).toBe(false);
    for (const phoneNumber of [
      '+33 612345678',
      '+1234567\n',
      '001234567',
      'https://test',
    ])
      expect(
        enrollmentQrSchema.safeParse({ expectedRevision: 0, phoneNumber })
          .success,
      ).toBe(false);
    expect(
      enrollmentQrSchema.safeParse({
        expectedRevision: 1,
        phoneNumber: '+33612345678',
      }).success,
    ).toBe(true);
  });
  it('requires a persisted integer cutoff before ingress-active phases', () => {
    const value = { version: 1, operationId: workspace, phase: 'ACTIVE' };
    expect(managedEvolutionSchema.safeParse(value).success).toBe(false);
    expect(
      managedEvolutionSchema.safeParse({ ...value, cutoffSeconds: 1800000000 })
        .success,
    ).toBe(true);
    expect(
      managedEvolutionSchema.safeParse({
        ...value,
        cutoffSeconds: 1800000000.5,
      }).success,
    ).toBe(false);
  });
  it.each([
    ['AUTO', 'INHERIT', 'AUTO'],
    ['ASSISTED', 'AUTO', 'ASSISTED'],
    ['AUTO', 'OFF', 'OFF'],
    ['OFF', 'AUTO', 'OFF'],
    [undefined, undefined, 'ASSISTED'],
    ['INVALID', 'AUTO', 'OFF'],
    ['toString', 'AUTO', 'OFF'],
    ['AUTO', '__proto__', 'OFF'],
  ])(
    'reports actual restricted channel policy %s/%s',
    (parent, channel, expected) =>
      expect(effectiveWhatsappMode(parent, channel)).toBe(expected),
  );
});
