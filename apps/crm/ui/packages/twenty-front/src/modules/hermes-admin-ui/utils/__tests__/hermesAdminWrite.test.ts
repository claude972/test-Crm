import { type HermesAdminContextValidity } from '@/hermes-admin-ui/types/HermesAdminContext';
import {
  HERMES_CONNECTION_FORM_EMPTY_VALUES,
  type HermesConnectionFormSubject,
} from '@/hermes-admin-ui/types/HermesConnectionForm';
import {
  canWriteInHermesAdminContext,
  hasHermesOwnSecretField,
  isHermesAdminContextCurrent,
  isHermesSessionReplaced,
  readHermesConnectionSecretPolicy,
  readHermesConnectionWriteGate,
  readHermesNativeAccountAddress,
  shouldDiscardHermesResult,
  checkHermesSecretEntry,
  validateHermesConnectionForm,
} from '@/hermes-admin-ui/utils/hermesAdminWrite';

const current: HermesAdminContextValidity = { kind: 'current' };

const switched: HermesAdminContextValidity = {
  kind: 'stale',
  reason: 'company-switched',
  message: null,
};

const sessionReplaced: HermesAdminContextValidity = {
  kind: 'stale',
  reason: 'session-replaced',
  message: 'SESSION_REPLACED',
};

const editSubject = (revision: string | null): HermesConnectionFormSubject => ({
  mode: 'edit',
  kind: 'WHATSAPP_EVOLUTION',
  unknownKind: null,
  connectionId: 'conn-1',
  state: 'CONFIGURED_UNVERIFIED',
  hasStoredSecret: true,
  revision,
});

describe('hermes admin context', () => {
  it('drops what belongs to the previous company instead of showing it', () => {
    expect(shouldDiscardHermesResult(switched)).toBe(true);
    expect(shouldDiscardHermesResult(sessionReplaced)).toBe(true);
    expect(shouldDiscardHermesResult(current)).toBe(false);
  });

  it('does not treat a stale context as a licence to write', () => {
    expect(canWriteInHermesAdminContext(current)).toBe(true);
    expect(canWriteInHermesAdminContext(switched)).toBe(false);
    expect(canWriteInHermesAdminContext(sessionReplaced)).toBe(false);
  });

  it('tells the named session refusal apart from an ordinary switch', () => {
    expect(isHermesSessionReplaced(sessionReplaced)).toBe(true);
    expect(isHermesSessionReplaced(switched)).toBe(false);
    expect(isHermesSessionReplaced(current)).toBe(false);
    expect(isHermesAdminContextCurrent(current)).toBe(true);
  });
});

describe('readHermesConnectionSecretPolicy', () => {
  it('offers no mailbox credential field, because e-mail has no store of ours', () => {
    expect(readHermesConnectionSecretPolicy('EMAIL_IMAP')).toEqual({
      kind: 'native-account',
    });
    expect(readHermesConnectionSecretPolicy('EMAIL_SMTP')).toEqual({
      kind: 'native-account',
    });
    expect(hasHermesOwnSecretField({ kind: 'native-account' })).toBe(false);
  });

  it('offers a secret field for the kinds that do keep one of their own', () => {
    // WhatsApp keeps TWO distinct secrets, named as the server names them.
    expect(readHermesConnectionSecretPolicy('WHATSAPP_EVOLUTION')).toEqual({
      kind: 'own-secret',
      fields: ['apiKey', 'webhookSecret'],
    });
    expect(readHermesConnectionSecretPolicy('MCP')).toEqual({
      kind: 'own-secret',
      fields: ['token'],
    });
    expect(readHermesConnectionSecretPolicy('SIGNED_INTAKE')).toEqual({
      kind: 'own-secret',
      fields: ['secret'],
    });
    // Sources inside the one collection record, not records of their own.
    expect(readHermesConnectionSecretPolicy('FORMS')).toEqual({
      kind: 'unknown',
    });
    expect(readHermesConnectionSecretPolicy('APPOINTMENTS')).toEqual({
      kind: 'unknown',
    });
    expect(
      hasHermesOwnSecretField({ kind: 'own-secret', fields: ['token'] }),
    ).toBe(true);
  });

  it('offers nothing for a kind it does not recognise', () => {
    expect(readHermesConnectionSecretPolicy(null)).toEqual({ kind: 'unknown' });
    expect(hasHermesOwnSecretField({ kind: 'unknown' })).toBe(false);
  });
});

describe('readHermesConnectionWriteGate', () => {
  it('sends nothing when the connection was read without its revision', () => {
    expect(readHermesConnectionWriteGate(editSubject(null), current)).toEqual({
      kind: 'not-sent',
      reason: 'missing-revision',
    });
    expect(readHermesConnectionWriteGate(editSubject('  '), current)).toEqual({
      kind: 'not-sent',
      reason: 'missing-revision',
    });
  });

  it('sends nothing when the displayed company is no longer the active one', () => {
    expect(readHermesConnectionWriteGate(editSubject('r7'), switched)).toEqual({
      kind: 'not-sent',
      reason: 'stale-context',
    });
  });

  it('echoes the revision back exactly as it was read', () => {
    expect(readHermesConnectionWriteGate(editSubject('r7'), current)).toEqual({
      kind: 'sendable',
      expectedRevision: 'r7',
    });
  });

  it('asks for no revision on a create, which has nothing to be stale against', () => {
    expect(
      readHermesConnectionWriteGate(
        { mode: 'create', kind: 'MCP' },
        current,
      ),
    ).toEqual({ kind: 'sendable', expectedRevision: null });
  });

  it('still refuses a create in a stale context', () => {
    expect(
      readHermesConnectionWriteGate(
        { mode: 'create', kind: 'MCP' },
        sessionReplaced,
      ),
    ).toEqual({ kind: 'not-sent', reason: 'stale-context' });
  });
});

describe('validateHermesConnectionForm', () => {
  it('asks an e-mail link for the account and the IMAP folder, nothing else', () => {
    expect(
      validateHermesConnectionForm(
        { kind: 'native-account' },
        HERMES_CONNECTION_FORM_EMPTY_VALUES,
        'EMAIL_IMAP',
      ),
    ).toEqual({ nativeAccountId: 'required', imapFolder: 'required' });
  });

  it('accepts an e-mail link without a name or a service address', () => {
    expect(
      validateHermesConnectionForm(
        { kind: 'native-account' },
        {
          ...HERMES_CONNECTION_FORM_EMPTY_VALUES,
          nativeAccountId: 'acc-1',
          imapFolder: 'INBOX',
        },
        'EMAIL_IMAP',
      ),
    ).toEqual({});
  });

  it('does not accept whitespace as an IMAP folder', () => {
    expect(
      validateHermesConnectionForm(
        { kind: 'native-account' },
        {
          ...HERMES_CONNECTION_FORM_EMPTY_VALUES,
          nativeAccountId: 'acc-1',
          imapFolder: '   ',
        },
        'EMAIL_IMAP',
      ),
    ).toEqual({ imapFolder: 'required' });
  });

  it('asks a connection with its own secret for a name and a service address', () => {
    expect(
      validateHermesConnectionForm(
        { kind: 'own-secret', fields: ['token'] },
        HERMES_CONNECTION_FORM_EMPTY_VALUES,
        'MCP',
      ),
    ).toEqual({ label: 'required', endpoint: 'required' });
  });

  it('asks a signed collection for its sources and its rate, not for an address', () => {
    // It is an endpoint others call: it has nothing to dial and no name of
    // its own, only an ingress policy.
    expect(
      validateHermesConnectionForm(
        { kind: 'own-secret', fields: ['secret'] },
        HERMES_CONNECTION_FORM_EMPTY_VALUES,
        'SIGNED_INTAKE',
      ),
    ).toEqual({
      allowedSources: 'required',
      maxRequestsPerMinute: 'required',
    });
  });

  it('accepts a signed collection with at least one source and a rate in range', () => {
    expect(
      validateHermesConnectionForm(
        { kind: 'own-secret', fields: ['secret'] },
        {
          ...HERMES_CONNECTION_FORM_EMPTY_VALUES,
          allowedSources: ['FORMS'],
          maxRequestsPerMinute: '30',
        },
        'SIGNED_INTAKE',
      ),
    ).toEqual({});
  });

  it('refuses a rate outside one to sixty, and a non-integer one', () => {
    for (const rate of ['0', '61', '', '  ', '12.5', 'abc', '-1']) {
      expect(
        validateHermesConnectionForm(
          { kind: 'own-secret', fields: ['secret'] },
          {
            ...HERMES_CONNECTION_FORM_EMPTY_VALUES,
            allowedSources: ['SCRAPING'],
            maxRequestsPerMinute: rate,
          },
          'SIGNED_INTAKE',
        ),
      ).toEqual({ maxRequestsPerMinute: 'required' });
    }
  });
});

describe('checkHermesSecretEntry', () => {
  it('treats every field left empty as keeping the stored set', () => {
    expect(checkHermesSecretEntry(['apiKey', 'webhookSecret'], {})).toEqual({
      kind: 'unchanged',
    });
  });

  it('refuses one secret of two, because sending it would erase the other', () => {
    // Supplying the secret object replaces the COMPLETE set.
    expect(
      checkHermesSecretEntry(['apiKey', 'webhookSecret'], { apiKey: 'k' }),
    ).toEqual({ kind: 'partial', missing: ['webhookSecret'] });
    expect(
      checkHermesSecretEntry(['apiKey', 'webhookSecret'], {
        webhookSecret: 'w',
      }),
    ).toEqual({ kind: 'partial', missing: ['apiKey'] });
  });

  it('accepts both secrets together', () => {
    expect(
      checkHermesSecretEntry(['apiKey', 'webhookSecret'], {
        apiKey: 'k',
        webhookSecret: 'w',
      }),
    ).toEqual({ kind: 'complete' });
  });

  it('does not treat a secret made of spaces as empty', () => {
    // A secret is never trimmed: spaces can be part of it.
    expect(checkHermesSecretEntry(['token'], { token: '  ' })).toEqual({
      kind: 'complete',
    });
  });
});

describe('readHermesNativeAccountAddress', () => {
  const accounts = [
    { id: 'acc-1', address: 'contact@atelier-fontaine.fr', label: null },
    { id: 'acc-2', address: null, label: 'Compte sans adresse' },
  ];

  it('reads the address the server attached, never derives one', () => {
    expect(readHermesNativeAccountAddress(accounts, 'acc-1')).toBe(
      'contact@atelier-fontaine.fr',
    );
  });

  it('reports no address rather than inventing one', () => {
    expect(readHermesNativeAccountAddress(accounts, 'acc-2')).toBeNull();
    expect(readHermesNativeAccountAddress(accounts, 'ghost')).toBeNull();
    expect(readHermesNativeAccountAddress([], '')).toBeNull();
  });
});
