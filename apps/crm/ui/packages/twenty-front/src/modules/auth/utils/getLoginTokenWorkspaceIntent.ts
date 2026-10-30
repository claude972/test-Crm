import { isObject } from '@sniptt/guards';
import { validate as isUuid } from 'uuid';

// This is request intent, never authentication. The native server verifies the
// signature, purpose, membership and cookie binding before changing its session.
export const getLoginTokenWorkspaceIntent = (
  loginToken: string,
): string | undefined => {
  try {
    const parts = loginToken.split('.');
    if (parts.length !== 3 || !parts.every((part) => part.length > 0))
      return undefined;
    const encoded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload: unknown = JSON.parse(atob(encoded));
    if (
      !isObject(payload) ||
      !('type' in payload) ||
      payload.type !== 'LOGIN' ||
      !('workspaceId' in payload) ||
      typeof payload.workspaceId !== 'string' ||
      !isUuid(payload.workspaceId)
    )
      return undefined;
    return payload.workspaceId.toLowerCase();
  } catch {
    return undefined;
  }
};
