import { type ApolloClient } from '@apollo/client';
import { t } from '@lingui/core/macro';
import { type createStore } from 'jotai';
import { AppPath } from 'kovaa-lab-shared/types';

import { currentUserState } from '@/auth/states/currentUserState';
import { currentUserWorkspaceState } from '@/auth/states/currentUserWorkspaceState';
import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { assertAuthSessionUnchanged } from '@/auth/utils/assertAuthSessionUnchanged';
import { purgeSessionStorage } from '@/auth/utils/purgeSessionStorage';
import { assignLocation } from '~/utils/assignLocation';

export const resetWorkspaceSessionAndReload = async ({
  client,
  store,
  sessionGeneration,
}: {
  client: Pick<ApolloClient, 'clearStore'>;
  store: ReturnType<typeof createStore>;
  sessionGeneration: string | null;
}): Promise<void> => {
  assertAuthSessionUnchanged(sessionGeneration);
  await client.clearStore();
  assertAuthSessionUnchanged(sessionGeneration);
  const purgeOutcome = await purgeSessionStorage();
  assertAuthSessionUnchanged(sessionGeneration);
  if (purgeOutcome !== 'cleared') throw new Error(t`Authentication failed`);
  store.set(currentUserState.atom, null);
  store.set(currentWorkspaceState.atom, null);
  store.set(currentWorkspaceMemberState.atom, null);
  store.set(currentUserWorkspaceState.atom, null);
  // Reloading closes old forms and constructs clients for the verified cookie.
  assignLocation(AppPath.Index);
};
