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
    expect(readHermesConnectionSecretPolicy('WHATSAPP_EVOLUTION')).toEqual({
      kind: 'own-secret',
    });
    expect(hasHermesOwnSecretField({ kind: 'own-secret' })).toBe(true);
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
      ),
    ).toEqual({ imapFolder: 'required' });
  });

  it('asks a connection with its own secret for a name and a service address', () => {
    expect(
      validateHermesConnectionForm(
        { kind: 'own-secret' },
        HERMES_CONNECTION_FORM_EMPTY_VALUES,
      ),
    ).toEqual({ label: 'required', endpoint: 'required' });
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
