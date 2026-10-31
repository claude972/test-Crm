import { isObject } from '@sniptt/guards';
import { validate as isUuid } from 'uuid';

// Three outcomes, deliberately distinct. A token that targets no workspace is
// legitimate - a user who has not created one yet - and must not be confused
// with a malformed or wrong-purpose token. Collapsing both into "no intent" is
// what made the guard refuse the accounts it was never meant to refuse.
export type LoginTokenWorkspaceIntent =
  | { kind: 'workspace'; workspaceId: string }
  | { kind: 'agnostic' }
  | { kind: 'invalid' };

const INVALID: LoginTokenWorkspaceIntent = { kind: 'invalid' };
const AGNOSTIC: LoginTokenWorkspaceIntent = { kind: 'agnostic' };

// This is request intent, never authentication. The native server verifies the
// signature, purpose, membership and cookie binding before changing its session.
export const getLoginTokenWorkspaceIntent = (
  loginToken: string,
): LoginTokenWorkspaceIntent => {
  try {
    const parts = loginToken.split('.');
    if (parts.length !== 3 || !parts.every((part) => part.length > 0))
      return INVALID;
    const encoded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload: unknown = JSON.parse(atob(encoded));
    if (!isObject(payload) || !('type' in payload) || payload.type !== 'LOGIN')
      return INVALID;
    // Absent is agnostic; present must be a usable workspace uuid.
    const workspaceId =
      'workspaceId' in payload ? payload.workspaceId : undefined;
    if (workspaceId === undefined || workspaceId === null) return AGNOSTIC;
    if (typeof workspaceId !== 'string' || !isUuid(workspaceId)) return INVALID;
    return { kind: 'workspace', workspaceId: workspaceId.toLowerCase() };
  } catch {
    return INVALID;
  }
};
