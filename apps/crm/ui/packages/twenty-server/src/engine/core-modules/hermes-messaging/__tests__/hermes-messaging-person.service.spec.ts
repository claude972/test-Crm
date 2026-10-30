import { HermesMessagingPersonService } from 'src/engine/core-modules/hermes-messaging/hermes-messaging-person.service';
import { type WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';
jest.mock('src/engine/metadata-modules/user-role/user-role.service', () => ({
  UserRoleService: class {},
}));
const actor = {
  workspaceId: 'workspace-a',
  userWorkspaceId: 'membership-a',
  userId: 'user-a',
};
jest.mock('src/engine/twenty-orm/workspace-orm.manager', () => ({
  WorkspaceOrmManager: class {},
}));
const setup = (rows: { id: string; deletedAt?: string | null }[]) => {
  const query = {
    alias: 'person',
    where: jest.fn().mockReturnThis(),
    withDeleted: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(rows),
  };
  const context = jest.fn(
    async (work: () => Promise<unknown>, _context: unknown) => work(),
  );
  const repository = jest.fn(() => ({ createQueryBuilder: () => query }));
  const service = new HermesMessagingPersonService(
    {
      executeInWorkspaceContext: context,
      getRepository: repository,
    } as unknown as WorkspaceOrmManager,
    {
      getRoleIdForUserWorkspace: jest.fn().mockResolvedValue('effective-role'),
    } as never,
  );
  return { service, query, context, repository };
};
describe('native Person matching for shared conversations', () => {
  it('uses native canonical email matching in the selected workspace without creating a contact', async () => {
    const { service, query, context, repository } = setup([
      { id: 'native-person' },
    ]);
    expect(await service.match(actor, 'EMAIL', 'person@example.com')).toEqual({
      personId: 'native-person',
      personMatchStatus: 'MATCHED',
    });
    expect(query.where).toHaveBeenCalledWith(expect.stringContaining('LOWER'), {
      handles: ['person@example.com'],
    });
    expect(repository).toHaveBeenCalledWith('person', {
      intersectionOf: { userWorkspaceRoleId: 'effective-role' },
    });
    expect(context.mock.calls[0][1]).toMatchObject({
      workspace: { id: 'workspace-a' },
    });
  });
  it('uses native canonical phone matching and refuses group/LID numeric guesses', async () => {
    const { service, query, repository } = setup([{ id: 'native-person' }]);
    await service.match(actor, 'WHATSAPP', '596696123456@s.whatsapp.net');
    expect(query.where).toHaveBeenCalledWith(
      expect.stringContaining('regexp_replace'),
      { handles: ['+596696123456'] },
    );
    repository.mockClear();
    expect(
      (await service.match(actor, 'WHATSAPP', '123456@lid')).personId,
    ).toBeNull();
    expect(
      (await service.match(actor, 'WHATSAPP', '123456@g.us')).personId,
    ).toBeNull();
    expect(repository).not.toHaveBeenCalled();
  });
  it.each([
    { rows: [{ id: 'one' }, { id: 'two' }] },
    { rows: [{ id: 'archived', deletedAt: '2026-01-01' }] },
  ])('leaves ambiguous or archived identities unlinked', async ({ rows }) => {
    expect(
      await setup(rows).service.match(actor, 'EMAIL', 'person@example.com'),
    ).toEqual({ personId: null, personMatchStatus: 'AMBIGUOUS' });
  });
  it('reports unavailable native ORM rather than losing the persisted inbox', async () => {
    const { service, query } = setup([]);
    query.getMany.mockRejectedValue(Error('private storage details'));
    expect(await service.match(actor, 'EMAIL', 'person@example.com')).toEqual({
      personId: null,
      personMatchStatus: 'UNAVAILABLE',
    });
  });
});
