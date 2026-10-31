import {
  clearHermesMailboxRuntimeDraftIdentities,
  hermesMailboxRuntimeDraftIdentityKey,
  putHermesMailboxRuntimeDraftIdentity,
  readHermesMailboxRuntimeDraftIdentities,
  writeHermesMailboxRuntimeDraftIdentities,
  HERMES_MAILBOX_RUNTIME_DRAFT_IDENTITY_PREFIX,
  type HermesMailboxRuntimeDraftScope,
} from '@/hermes-mailbox-runtime/utils/hermesMailboxRuntimeDraftIdentities';

const SCOPE: HermesMailboxRuntimeDraftScope = {
  userId: 'user-a',
  workspaceId: 'workspace-a',
  connectedAccountId: 'account-1',
  connectionRevision: '7',
};

const SAVED = {
  draftId: 'draft-1',
  draftRevision: 'a'.repeat(64),
  conversationId: 'conversation-1',
  folder: 'Drafts',
  uid: '21',
  uidValidity: '3421553009',
  savedAt: null,
};

const prefixedKeys = () =>
  Object.keys(window.localStorage).filter((key) =>
    key.startsWith(HERMES_MAILBOX_RUNTIME_DRAFT_IDENTITY_PREFIX),
  );

const store = (scope: HermesMailboxRuntimeDraftScope, draft = SAVED) =>
  writeHermesMailboxRuntimeDraftIdentities(
    scope,
    putHermesMailboxRuntimeDraftIdentity([], draft),
  );

beforeEach(() => {
  window.localStorage.clear();
});

describe('the draft identity store', () => {
  it('names the person, the company, the account and the binding in its key', () => {
    const key = hermesMailboxRuntimeDraftIdentityKey(SCOPE);

    expect(key.startsWith(HERMES_MAILBOX_RUNTIME_DRAFT_IDENTITY_PREFIX)).toBe(
      true,
    );
    expect(key).toContain('user-a');
    expect(key).toContain('workspace-a');
    expect(key).toContain('account-1');
    expect(key).toContain('7');
  });

  it('keeps the identity and no content: no recipient, subject or body', () => {
    store(SCOPE, {
      ...SAVED,
      // Fields a caller might hand over one day. None of them is an identity,
      // so none of them may be written.
      ...({ to: ['marie@client.test'], subject: 'Devis', text: 'Bonjour' } as never),
    });

    const raw = window.localStorage.getItem(
      hermesMailboxRuntimeDraftIdentityKey(SCOPE),
    );

    expect(raw).not.toBeNull();
    expect(raw).not.toContain('marie@client.test');
    expect(raw).not.toContain('Devis');
    expect(raw).not.toContain('Bonjour');
    expect(readHermesMailboxRuntimeDraftIdentities(SCOPE)).toEqual([SAVED]);
  });

  it('answers nothing for another person, another company or another account', () => {
    store(SCOPE);

    expect(
      readHermesMailboxRuntimeDraftIdentities({ ...SCOPE, userId: 'user-b' }),
    ).toEqual([]);
    expect(
      readHermesMailboxRuntimeDraftIdentities({
        ...SCOPE,
        workspaceId: 'workspace-b',
      }),
    ).toEqual([]);
    expect(
      readHermesMailboxRuntimeDraftIdentities({
        ...SCOPE,
        connectedAccountId: 'account-2',
      }),
    ).toEqual([]);
    // The one that was issued it still reads it.
    expect(readHermesMailboxRuntimeDraftIdentities(SCOPE)).toEqual([SAVED]);
  });

  it('drops what a previous binding of the same account wrote, once the new one writes', () => {
    store(SCOPE);

    const rotated = { ...SCOPE, connectionRevision: '8' };

    // Not offered under the new binding: the identity belongs to the old one.
    expect(readHermesMailboxRuntimeDraftIdentities(rotated)).toEqual([]);

    store(rotated, { ...SAVED, draftId: 'draft-2' });

    // And the superseded key is gone rather than left sitting on the device.
    expect(prefixedKeys()).toEqual([
      hermesMailboxRuntimeDraftIdentityKey(rotated),
    ]);
  });

  it('removes every scope and every layout on the session purge', () => {
    store(SCOPE);
    store({ ...SCOPE, userId: 'user-b', workspaceId: 'workspace-b' });
    // A key written by an earlier version of this module.
    window.localStorage.setItem(
      HERMES_MAILBOX_RUNTIME_DRAFT_IDENTITY_PREFIX + 'v1',
      '[{"draftId":"old"}]',
    );
    window.localStorage.setItem('unrelatedState', 'kept');

    expect(prefixedKeys()).toHaveLength(3);

    clearHermesMailboxRuntimeDraftIdentities();

    expect(prefixedKeys()).toEqual([]);
    expect(readHermesMailboxRuntimeDraftIdentities(SCOPE)).toEqual([]);
    // It sweeps its own keys and nobody else's.
    expect(window.localStorage.getItem('unrelatedState')).toBe('kept');
  });

  it('reads nothing rather than throwing on a payload it cannot use', () => {
    window.localStorage.setItem(
      hermesMailboxRuntimeDraftIdentityKey(SCOPE),
      '{"not":"an array"}',
    );

    expect(readHermesMailboxRuntimeDraftIdentities(SCOPE)).toEqual([]);

    window.localStorage.setItem(
      hermesMailboxRuntimeDraftIdentityKey(SCOPE),
      '[{"draftId":"draft-1"}]',
    );

    // A record that cannot address a native message is unusable, so it is
    // dropped instead of being completed with a guess.
    expect(readHermesMailboxRuntimeDraftIdentities(SCOPE)).toEqual([]);
  });
});
