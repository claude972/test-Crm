import { BlocklistScope } from 'kovaa-lab-shared/types';

import { groupBlocklistHandlesByOwner } from 'src/modules/blocklist/utils/group-blocklist-handles-by-owner.util';

describe('groupBlocklistHandlesByOwner', () => {
  it('groups member-scoped handles under their workspace member', () => {
    const { workspaceScopedHandles, handlesByWorkspaceMemberId } =
      groupBlocklistHandlesByOwner([
        {
          handle: 'first@kovaa-lab.com',
          scope: BlocklistScope.WORKSPACE_MEMBER,
          workspaceMemberId: 'member-1',
        },
        {
          handle: 'second@kovaa-lab.com',
          scope: BlocklistScope.WORKSPACE_MEMBER,
          workspaceMemberId: 'member-1',
        },
        {
          handle: 'third@kovaa-lab.com',
          scope: BlocklistScope.WORKSPACE_MEMBER,
          workspaceMemberId: 'member-2',
        },
      ]);

    expect(workspaceScopedHandles).toEqual([]);
    expect(handlesByWorkspaceMemberId.get('member-1')).toEqual([
      'first@kovaa-lab.com',
      'second@kovaa-lab.com',
    ]);
    expect(handlesByWorkspaceMemberId.get('member-2')).toEqual([
      'third@kovaa-lab.com',
    ]);
  });

  it('collects workspace-scoped handles separately from member-scoped ones', () => {
    const { workspaceScopedHandles, handlesByWorkspaceMemberId } =
      groupBlocklistHandlesByOwner([
        {
          handle: '@competitor.com',
          scope: BlocklistScope.WORKSPACE,
          workspaceMemberId: null,
        },
        {
          handle: 'private@kovaa-lab.com',
          scope: BlocklistScope.WORKSPACE_MEMBER,
          workspaceMemberId: 'member-1',
        },
      ]);

    expect(workspaceScopedHandles).toEqual(['@competitor.com']);
    expect(handlesByWorkspaceMemberId.get('member-1')).toEqual([
      'private@kovaa-lab.com',
    ]);
  });

  it('drops a member-scoped handle whose workspace member was removed instead of applying it workspace-wide', () => {
    const { workspaceScopedHandles, handlesByWorkspaceMemberId } =
      groupBlocklistHandlesByOwner([
        {
          handle: 'orphan@kovaa-lab.com',
          scope: BlocklistScope.WORKSPACE_MEMBER,
          workspaceMemberId: null,
        },
      ]);

    expect(workspaceScopedHandles).toEqual([]);
    expect(handlesByWorkspaceMemberId.size).toBe(0);
  });

  it('drops entries without a handle', () => {
    const { workspaceScopedHandles, handlesByWorkspaceMemberId } =
      groupBlocklistHandlesByOwner([
        {
          handle: null,
          scope: BlocklistScope.WORKSPACE,
          workspaceMemberId: null,
        },
        {
          handle: null,
          scope: BlocklistScope.WORKSPACE_MEMBER,
          workspaceMemberId: 'member-1',
        },
      ]);

    expect(workspaceScopedHandles).toEqual([]);
    expect(handlesByWorkspaceMemberId.size).toBe(0);
  });
});
