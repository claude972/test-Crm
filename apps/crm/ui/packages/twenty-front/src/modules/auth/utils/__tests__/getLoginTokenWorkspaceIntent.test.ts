import { getLoginTokenWorkspaceIntent } from '@/auth/utils/getLoginTokenWorkspaceIntent';

const A = '40d0a08f-24c8-45df-93c1-1c3be8c75d06';
const encode = (payload: unknown) =>
  'header.' +
  btoa(JSON.stringify(payload))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_') +
  '.signature';
describe('LOGIN workspace intent only', () => {
  it('reads only a normalized UUID from a LOGIN payload', () => {
    expect(
      getLoginTokenWorkspaceIntent(
        encode({
          type: 'LOGIN',
          workspaceId: A.toUpperCase(),
          sub: 'ignored',
          roles: ['ignored'],
        }),
      ),
    ).toEqual({ kind: 'workspace', workspaceId: A });
  });
  it.each([
    { type: 'LOGIN' },
    { type: 'LOGIN', workspaceId: null },
    { type: 'LOGIN', sub: 'user-without-a-workspace' },
  ])(
    'reports a LOGIN payload that names no workspace as agnostic, not invalid',
    (payload) => {
      expect(getLoginTokenWorkspaceIntent(encode(payload))).toEqual({
        kind: 'agnostic',
      });
    },
  );
  it.each([
    {},
    { type: 'ACCESS', workspaceId: A },
    { type: 'WORKSPACE_AGNOSTIC', workspaceId: A },
    { type: 'LOGIN', workspaceId: 'not-a-uuid' },
    { type: 'LOGIN', workspaceId: 42 },
    { type: 'LOGIN', workspaceId: '' },
    null,
  ])('rejects an absent or wrong-purpose workspace intent', (payload) => {
    expect(getLoginTokenWorkspaceIntent(encode(payload))).toEqual({
      kind: 'invalid',
    });
  });
  it.each([
    'not-a-jwt',
    'header.invalid-payload.signature',
    'header..signature',
    '.payload.signature',
    'header.payload.',
  ])(
    'refuses malformed intent without treating it as authentication',
    (token) => {
      expect(getLoginTokenWorkspaceIntent(token)).toEqual({ kind: 'invalid' });
    },
  );
});
