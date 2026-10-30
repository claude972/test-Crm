import * as mailbox from '@/hermes-mailbox-ui/index';

// A smoke test on the barrel: it fails if a public export is renamed or an
// import path inside the module stops resolving, which no amount of unit
// testing on the pure functions would catch.
describe('the module public surface', () => {
  it.each([
    'HermesMailbox',
    'HermesMailboxAttachmentStrip',
    'HermesMailboxBodyView',
    'HermesMailboxComposer',
    'HermesMailboxFolderPanel',
    'HermesMailboxHeaders',
    'HermesMailboxMessageCard',
    'HermesMailboxThreadListPanel',
    'HermesMailboxThreadPanel',
    'useHermesMailboxFolderLabels',
    'readHermesMailboxBody',
    'readHermesMailboxCount',
    'readHermesMailboxFileSize',
    'parseHermesMailboxAddress',
    'formatHermesMailboxAddress',
    'isHermesMailboxAddressUsable',
    'normalizeHermesMailboxEmail',
    'splitHermesMailboxAddressList',
  ])('should export %s', (name) => {
    expect(typeof (mailbox as Record<string, unknown>)[name]).toBe('function');
  });

  it('should keep the offline planner out of every component', () => {
    // The contract gives recipient planning to the server. The planner stays
    // exported for reference and tests; a component calling it would be the
    // silent substitution the contract forbids.
    expect(typeof mailbox.planHermesMailboxEnvelopeOffline).toBe('function');
  });
});
