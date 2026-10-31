import * as runtime from '@/hermes-mailbox-runtime/index';

// A smoke test on the barrel: it fails if a public export is renamed or an
// import path inside the module stops resolving.
describe('the mailbox runtime public surface', () => {
  it.each([
    'HermesMailboxRuntime',
    'useHermesMailboxRuntimeComposer',
    'useHermesMailboxRuntimeFolders',
    'useHermesMailboxRuntimeIdentity',
  ])('should export %s', (name) => {
    expect(typeof (runtime as Record<string, unknown>)[name]).toBe('function');
  });
});
