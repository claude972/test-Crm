import { act, render, screen } from '@testing-library/react';
import { useState } from 'react';

import { HermesWorkspaceScopeBoundary } from '@/app/components/HermesWorkspaceScopeBoundary';
import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';

// Counts mounts so a remount is observed rather than assumed.
const Form = () => {
  const [instance] = useState(() => `${Date.now()}-${Math.random()}`);

  return <span data-testid="form-instance">{instance}</span>;
};

const Switcher = () => {
  const setCurrentWorkspace = useSetAtomState(currentWorkspaceState);

  return (
    <button
      type="button"
      onClick={() =>
        setCurrentWorkspace({ id: 'workspace-b' } as never)
      }
    >
      switch
    </button>
  );
};

describe('HermesWorkspaceScopeBoundary', () => {
  it('unmounts the tree of the previous company when the company changes', () => {
    render(
      <>
        <Switcher />
        <HermesWorkspaceScopeBoundary>
          <Form />
        </HermesWorkspaceScopeBoundary>
      </>,
    );

    const before = screen.getByTestId('form-instance').textContent;

    act(() => {
      screen.getByRole('button', { name: 'switch' }).click();
    });

    // A different instance means the old subtree is gone: a form opened under
    // the previous company cannot still be sitting there.
    expect(screen.getByTestId('form-instance').textContent).not.toBe(before);
  });
});

// The real vector: another tab writes the company into local storage and this
// tab learns about it through a storage event, with no call of its own.
describe('HermesWorkspaceScopeBoundary, reached by a storage event', () => {
  it('drops the previous company tree when another tab switches', () => {
    localStorage.setItem(
      'currentWorkspaceState',
      JSON.stringify({ id: 'workspace-a' }),
    );

    render(
      <HermesWorkspaceScopeBoundary>
        <Form />
      </HermesWorkspaceScopeBoundary>,
    );

    const before = screen.getByTestId('form-instance').textContent;

    act(() => {
      const next = JSON.stringify({ id: 'workspace-b' });

      localStorage.setItem('currentWorkspaceState', next);
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'currentWorkspaceState',
          newValue: next,
          storageArea: localStorage,
        }),
      );
    });

    expect(screen.getByTestId('form-instance').textContent).not.toBe(before);
  });
});
