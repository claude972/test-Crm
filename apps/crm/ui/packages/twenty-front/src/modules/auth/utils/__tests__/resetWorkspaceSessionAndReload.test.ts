import { createStore } from 'jotai';
import { currentUserState } from '@/auth/states/currentUserState';
import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { getSessionGeneration } from '@/auth/utils/getSessionGeneration';
import { rotateSessionGeneration } from '@/auth/utils/rotateSessionGeneration';
import { resetWorkspaceSessionAndReload } from '@/auth/utils/resetWorkspaceSessionAndReload';
import { purgeSessionStorage } from '@/auth/utils/purgeSessionStorage';
import { assignLocation } from '~/utils/assignLocation';

jest.mock('@/auth/utils/purgeSessionStorage', () => ({
  purgeSessionStorage: jest.fn(),
}));
jest.mock('~/utils/assignLocation', () => ({ assignLocation: jest.fn() }));
const A = '40d0a08f-24c8-45df-93c1-1c3be8c75d06';
const B = 'd3fecdeb-293a-4890-92d0-a1e133e72167';
const setup = () => {
  const store = createStore();
  store.set(currentWorkspaceState.atom, { id: A } as never);
  store.set(currentUserState.atom, { id: 'synthetic' } as never);
  rotateSessionGeneration();
  const client = { clearStore: jest.fn().mockResolvedValue(undefined) };
  return { store, client, sessionGeneration: getSessionGeneration() };
};
describe('native full reload only after verified cache and metadata purge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    jest.mocked(purgeSessionStorage).mockResolvedValue('cleared');
  });
  it('waits for the durable metadata purge before clearing old states and navigating', async () => {
    const f = setup();
    let finish!: (value: 'cleared') => void;
    jest.mocked(purgeSessionStorage).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const pending = resetWorkspaceSessionAndReload(f);
    await Promise.resolve();
    await Promise.resolve();
    expect(assignLocation).not.toHaveBeenCalled();
    expect(f.store.get(currentWorkspaceState.atom)?.id).toBe(A);
    finish('cleared');
    await pending;
    expect(f.store.get(currentWorkspaceState.atom)).toBeNull();
    expect(f.store.get(currentUserState.atom)).toBeNull();
    expect(assignLocation).toHaveBeenCalledWith('/');
  });
  it('does not navigate or announce a new tenant when purge cannot be confirmed', async () => {
    const f = setup();
    jest.mocked(purgeSessionStorage).mockResolvedValue('not-confirmed');
    await expect(resetWorkspaceSessionAndReload(f)).rejects.toThrow();
    expect(assignLocation).not.toHaveBeenCalled();
    expect(f.store.get(currentWorkspaceState.atom)?.id).toBe(A);
  });
  it('does not purge a later session when old cache clearing finishes late', async () => {
    const f = setup();
    let finish!: () => void;
    f.client.clearStore.mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    const pending = resetWorkspaceSessionAndReload(f);
    rotateSessionGeneration();
    f.store.set(currentWorkspaceState.atom, { id: B } as never);
    finish();
    await expect(pending).rejects.toMatchObject({
      errors: [
        expect.objectContaining({
          extensions: expect.objectContaining({
            subCode: 'SESSION_SUPERSEDED',
          }),
        }),
      ],
    });
    expect(purgeSessionStorage).not.toHaveBeenCalled();
    expect(assignLocation).not.toHaveBeenCalled();
    expect(f.store.get(currentWorkspaceState.atom)?.id).toBe(B);
  });
  it('never clears the current B state when an earlier A purge resolves after B won', async () => {
    const f = setup();
    let finish!: (value: 'cleared') => void;
    jest.mocked(purgeSessionStorage).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const pending = resetWorkspaceSessionAndReload(f);
    await Promise.resolve();
    await Promise.resolve();
    rotateSessionGeneration();
    f.store.set(currentWorkspaceState.atom, { id: B } as never);
    finish('cleared');
    await expect(pending).rejects.toMatchObject({
      errors: [
        expect.objectContaining({
          extensions: expect.objectContaining({
            subCode: 'SESSION_SUPERSEDED',
          }),
        }),
      ],
    });
    expect(assignLocation).not.toHaveBeenCalled();
    expect(f.store.get(currentWorkspaceState.atom)?.id).toBe(B);
  });
});
