import { ForbiddenException } from '@nestjs/common';
import { v5 } from 'uuid';

import { HermesProspectionAccessService } from 'src/engine/core-modules/hermes-prospection/hermes-prospection-access.service';
import { HermesProspectionService } from 'src/engine/core-modules/hermes-prospection/hermes-prospection.service';
import { type HermesProspectionState } from 'src/engine/core-modules/hermes-prospection/types/hermes-prospection.types';
import {
  buildHermesImportBatch,
  emptyHermesProspectionState,
} from 'src/engine/core-modules/hermes-prospection/utils/hermes-import-policy';

jest.mock(
  'src/engine/core-modules/user-workspace/user-workspace.entity',
  () => ({ UserWorkspaceEntity: class {} }),
);
jest.mock('src/engine/metadata-modules/role-target/role-target.entity', () => ({
  RoleTargetEntity: class {},
}));
jest.mock(
  'src/engine/core-modules/hermes-prospection/entities/hermes-import-state.entity',
  () => ({ HermesImportStateEntity: class {} }),
);
jest.mock('src/modules/emailing/services/message-suppression.service', () => ({
  MessageSuppressionService: class {},
}));
jest.mock('src/engine/twenty-orm/workspace-orm.manager', () => ({
  WorkspaceOrmManager: class {},
}));
jest.mock('src/engine/metadata-modules/user-role/user-role.service', () => ({
  UserRoleService: class {},
}));
jest.mock(
  'src/modules/emailing/utils/build-emailing-role-permission-config.util',
  () => ({
    buildEmailingRolePermissionConfig: () => ({
      intersectionOf: { user: 'role-a' },
    }),
  }),
);

const ACTOR = {
  workspaceId: 'workspace-a',
  userId: 'user-a',
  userWorkspaceId: 'membership-a',
};
const ROLE = {
  workspaceId: ACTOR.workspaceId,
  canUpdateAllSettings: true,
  canReadAllObjectRecords: true,
  canUpdateAllObjectRecords: true,
  fieldPermissions: [],
  rowLevelPermissionPredicates: [],
  rowLevelPermissionPredicateGroups: [],
};

// A small repository double applies the queried relational WHERE, not a fixed
// response that would keep accepting disabled rows after the filter is fixed.
function matches(value: unknown, predicate: unknown): boolean {
  if (predicate && typeof predicate === 'object') {
    if ('type' in predicate && predicate.type === 'isNull')
      return value == null;
    if (!value || typeof value !== 'object') return false;
    return Object.entries(predicate).every(([key, expected]) =>
      matches((value as Record<string, unknown>)[key], expected),
    );
  }
  return value === predicate;
}

const membership = () => ({
  id: ACTOR.userWorkspaceId,
  workspaceId: ACTOR.workspaceId,
  userId: ACTOR.userId,
  deletedAt: null,
  user: { id: ACTOR.userId, disabled: false, deletedAt: null as Date | null },
  workspace: {
    id: ACTOR.workspaceId,
    activationStatus: 'ACTIVE',
    deletedAt: null as Date | null,
  },
});

function accessFixture(row = membership(), role: typeof ROLE | null = ROLE) {
  const memberships = {
    findOne: jest.fn(async ({ where }: { where: unknown }) =>
      !row.deletedAt && matches(row, where) ? row : null,
    ),
  };
  const roles = {
    findOne: jest.fn().mockResolvedValue(role ? { role } : null),
  };
  const access = new HermesProspectionAccessService(
    memberships as unknown as ConstructorParameters<
      typeof HermesProspectionAccessService
    >[0],
    roles as unknown as ConstructorParameters<
      typeof HermesProspectionAccessService
    >[1],
  );
  return { access, memberships, roles };
}

function draftFixture(
  people: { id: string; emails: { primaryEmail: string } }[],
) {
  const state = emptyHermesProspectionState();
  const batch = buildHermesImportBatch({
    externalBatchId: 'review-batch',
    name: 'Synthetic',
    sourceUrl: 'https://example.test/source',
    collectedAt: '2026-10-30T00:00:00Z',
    rows: [
      { email: 'qualified@example.test', companyName: 'Synthetic Company' },
    ],
    userId: ACTOR.userId,
    now: '2026-10-30T00:00:00Z',
  });
  batch.rows[0].status = 'qualified';
  batch.rows[0].personId = 'person-a';
  batch.rows[0].qualification = {
    professionalPurpose: 'Synthetic professional purpose',
    privacyNoticeUrl: 'https://example.test/privacy',
    informationMethod: 'first-contact-notice',
    qualifiedAt: '2026-10-30T00:00:00Z',
    qualifiedByUserId: ACTOR.userId,
  };
  state.batches.push(batch);
  const campaignRepository = {
    findOne: jest.fn(async ({ where }: { where: { id: string } }) => ({
      id: where.id,
      listId: v5('list', where.id),
      status: 'DRAFT',
    })),
    insert: jest.fn(),
  };
  const personRepository = { find: jest.fn().mockResolvedValue(people) };
  const listMemberRepository = {
    find: jest.fn().mockResolvedValue([{ personId: 'person-a' }]),
    insert: jest.fn(),
  };
  const states = {
    mutate: async <T>(
      _actor: typeof ACTOR,
      operation: (state: HermesProspectionState) => Promise<T>,
    ) => operation(state),
  };
  const suppressions = {
    findApplicableSuppressions: jest.fn().mockResolvedValue([]),
  };
  const orm = {
    executeInWorkspaceContext: async <T>(operation: () => Promise<T>) =>
      operation(),
    runInWorkspaceTransaction: async <T>(
      operation: (transaction: {
        getRepository: (name: string) => unknown;
      }) => Promise<T>,
    ) =>
      operation({
        getRepository: (name) =>
          name === 'person'
            ? personRepository
            : name === 'messageListMember'
              ? listMemberRepository
              : campaignRepository,
      }),
  };
  const service = new HermesProspectionService(
    states as unknown as ConstructorParameters<
      typeof HermesProspectionService
    >[0],
    suppressions as unknown as ConstructorParameters<
      typeof HermesProspectionService
    >[1],
    orm as unknown as ConstructorParameters<typeof HermesProspectionService>[2],
    {
      getRoleIdForUserWorkspace: async () => 'role-a',
    } as unknown as ConstructorParameters<typeof HermesProspectionService>[3],
  );
  return {
    service,
    campaignRepository,
    personRepository,
    listMemberRepository,
    input: {
      name: 'Synthetic draft',
      subject: 'Synthetic subject',
      rowIds: [batch.rows[0].id],
    },
  };
}

describe('Independent prospection review regressions', () => {
  it('allows a live unrestricted administrator', async () => {
    await expect(
      accessFixture().access.assertAllowed(ACTOR),
    ).resolves.toBeUndefined();
  });

  it('refuses actor A when the supplied membership belongs to workspace B', async () => {
    const row = membership();
    row.workspaceId = 'workspace-b';
    const { access, roles } = accessFixture(row);
    await expect(access.assertAllowed(ACTOR)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(roles.findOne).not.toHaveBeenCalled();
  });

  it('refuses a role assignment removed from the database', async () => {
    await expect(
      accessFixture(membership(), null).access.assertAllowed(ACTOR),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it.each([
    'disabled-user',
    'deleted-user',
    'inactive-workspace',
    'suspended-workspace',
    'deleted-workspace',
  ])(
    'refuses current database state %s despite an older valid session',
    async (scenario) => {
      const row = membership();
      if (scenario === 'disabled-user') row.user.disabled = true;
      if (scenario === 'deleted-user') row.user.deletedAt = new Date();
      if (scenario === 'inactive-workspace')
        row.workspace.activationStatus = 'INACTIVE';
      if (scenario === 'suspended-workspace')
        row.workspace.activationStatus = 'SUSPENDED';
      if (scenario === 'deleted-workspace')
        row.workspace.deletedAt = new Date();
      await expect(
        accessFixture(row).access.assertAllowed(ACTOR),
      ).rejects.toBeInstanceOf(ForbiddenException);
    },
  );

  it('retains the same draft/list identifiers for a legitimate replay without reinsertion', async () => {
    const { service, input, campaignRepository } = draftFixture([
      { id: 'person-a', emails: { primaryEmail: 'qualified@example.test' } },
    ]);
    const first = await service.createCampaignDraft(ACTOR, input);
    const second = await service.createCampaignDraft(ACTOR, input);
    expect(second).toEqual(first);
    expect(first).toMatchObject({ status: 'DRAFT', sendingAvailable: false });
    expect(campaignRepository.insert).not.toHaveBeenCalled();
  });

  it.each([
    {
      label: 'changed',
      people: [
        {
          id: 'person-a',
          emails: { primaryEmail: 'changed-unqualified@example.test' },
        },
      ],
    },
    { label: 'archived', people: [] },
  ])(
    'revalidates $label native recipients before returning an existing DRAFT',
    async ({ people }) => {
      const { service, input, campaignRepository } = draftFixture(people);
      await expect(service.createCampaignDraft(ACTOR, input)).rejects.toThrow(
        'RECIPIENT_PRIMARY_EMAIL_CHANGED_OR_UNAVAILABLE',
      );
      expect(campaignRepository.insert).not.toHaveBeenCalled();
    },
  );

  it('refuses an existing draft whose native list has been edited to another person', async () => {
    const { service, input, listMemberRepository } = draftFixture([
      { id: 'person-a', emails: { primaryEmail: 'qualified@example.test' } },
    ]);
    listMemberRepository.find.mockResolvedValue([
      { personId: 'unexpected-person' },
    ]);
    await expect(service.createCampaignDraft(ACTOR, input)).rejects.toThrow();
  });
});
