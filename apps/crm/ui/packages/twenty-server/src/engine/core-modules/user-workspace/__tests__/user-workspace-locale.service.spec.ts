import { UserWorkspaceService } from 'src/engine/core-modules/user-workspace/user-workspace.service';

// A membership carries its own locale, so a new one decides the language of
// the interface for that person in that company. It must start from the
// instance default, and an explicit locale must still win.
describe('UserWorkspaceService.create locale', () => {
  const build = (configuredDefault: string) => {
    const created: Record<string, unknown>[] = [];
    const service = Object.create(
      UserWorkspaceService.prototype,
    ) as UserWorkspaceService;

    Object.assign(service, {
      userWorkspaceRepository: {
        create: (entity: Record<string, unknown>) => {
          created.push(entity);

          return entity;
        },
        save: (entity: unknown) => entity,
      },
      kovaaLabConfigService: {
        get: (key: string) =>
          key === 'DEFAULT_LOCALE' ? configuredDefault : undefined,
      },
    });

    jest
      .spyOn(
        UserWorkspaceService.prototype as unknown as {
          computeDefaultAvatarUrl: () => Promise<string>;
        },
        'computeDefaultAvatarUrl',
      )
      .mockResolvedValue('avatar');

    return { service, created };
  };

  afterEach(() => jest.restoreAllMocks());

  it('gives a new membership the instance default when none is supplied', async () => {
    const { service, created } = build('fr-FR');

    await service.create({
      userId: 'user-1',
      workspaceId: 'workspace-1',
      isExistingUser: false,
    });

    expect(created).toHaveLength(1);
    expect(created[0].locale).toBe('fr-FR');
  });

  it('never overwrites a locale the caller supplied explicitly', async () => {
    const { service, created } = build('fr-FR');

    await service.create({
      userId: 'user-1',
      workspaceId: 'workspace-1',
      isExistingUser: true,
      locale: 'de-DE',
    });

    expect(created[0].locale).toBe('de-DE');
  });

  it('follows the configured default rather than hardcoding French', async () => {
    const { service, created } = build('es-ES');

    await service.create({
      userId: 'user-1',
      workspaceId: 'workspace-1',
      isExistingUser: false,
    });

    expect(created[0].locale).toBe('es-ES');
  });
});
