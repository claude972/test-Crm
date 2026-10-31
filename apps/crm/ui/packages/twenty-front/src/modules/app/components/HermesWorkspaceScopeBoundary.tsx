import { type ReactNode } from 'react';

import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

// The authenticated tree belongs to one company. `currentWorkspaceState` is
// persisted in local storage, so another tab switching company reaches this one
// through a storage event and this value changes under a tree that is still
// rendering the previous company's forms and panels.
//
// Keying the subtree unmounts all of it before the next one appears, so a form
// opened under the previous company cannot submit under the next. A cleanup
// effect would run too late: it fires once the replacement is already there.
export const HermesWorkspaceScopeBoundary = ({
  children,
}: {
  children: ReactNode;
}) => {
  const currentWorkspace = useAtomStateValue(currentWorkspaceState);

  return <div key={currentWorkspace?.id ?? 'no-workspace'}>{children}</div>;
};
