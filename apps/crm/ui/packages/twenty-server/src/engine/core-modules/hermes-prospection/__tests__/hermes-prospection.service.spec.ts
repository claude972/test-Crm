import { BadRequestException, NotFoundException } from '@nestjs/common';

import { v5 } from 'uuid';

import { HermesProspectionService } from 'src/engine/core-modules/hermes-prospection/hermes-prospection.service';
import { type HermesProspectionState } from 'src/engine/core-modules/hermes-prospection/types/hermes-prospection.types';
import {
  buildHermesImportBatch,
  emptyHermesProspectionState,
} from 'src/engine/core-modules/hermes-prospection/utils/hermes-import-policy';

jest.mock(
  'src/engine/core-modules/hermes-prospection/hermes-import-state.service',
  () => ({ HermesImportStateService: class HermesImportStateService {} }),
);
jest.mock('src/modules/emailing/services/message-suppression.service', () => ({
  MessageSuppressionService: class MessageSuppressionService {},
}));
jest.mock('src/engine/twenty-orm/workspace-orm.manager', () => ({
  WorkspaceOrmManager: class WorkspaceOrmManager {},
}));
jest.mock('src/engine/metadata-modules/user-role/user-role.service', () => ({
  UserRoleService: class UserRoleService {},
}));
jest.mock(
  'src/modules/emailing/utils/build-emailing-role-permission-config.util',
  () => ({
    buildEmailingRolePermissionConfig: () => ({
      intersectionOf: { user: 'role-a' },
    }),
  }),
);

const actor = {
  workspaceId: 'workspace-a',
  userId: 'user-a',
  userWorkspaceId: 'membership-a',
};
const input = {
  externalBatchId: 'synthetic-batch',
  name: 'Synthetic directory',
  sourceUrl: 'https://example.test/directory',
  collectedAt: '2026-10-29T12:00:00Z',
  rows: [{ email: 'person@example.test', companyName: 'Example Company' }],
};
const qualification = {
  professionalPurpose: 'Relevant accounting service for the professional role',
  privacyNoticeUrl: 'https://example.test/privacy',
  informationMethod: 'first-contact-notice' as const,
};

const setup = () => {
  const state = emptyHermesProspectionState();
  const states = {
    read: jest.fn(async () => state),
    mutate: jest.fn(
      async <T>(
        _actor: typeof actor,
        operation: (value: HermesProspectionState) => Promise<T>,
      ) => operation(state),
    ),
  };
  const suppressions = {
    findApplicableSuppressions: jest.fn().mockResolvedValue([]),
  };
  const orm = {
    executeInWorkspaceContext: jest.fn(async <T>(operation: () => Promise<T>) =>
      operation(),
    ),
    getRepository: jest.fn().mockReturnValue({}),
    runInWorkspaceTransaction: jest.fn(),
  };
  const roles = {
    getRoleIdForUserWorkspace: jest.fn().mockResolvedValue('role-a'),
  };
  const service = new HermesProspectionService(
    states as unknown as ConstructorParameters<
      typeof HermesProspectionService
    >[0],
    suppressions as unknown as ConstructorParameters<
      typeof HermesProspectionService
    >[1],
    orm as unknown as ConstructorParameters<typeof HermesProspectionService>[2],
    roles as unknown as ConstructorParameters<
      typeof HermesProspectionService
    >[3],
  );

  return { service, state, states, suppressions, orm };
};

describe('Hermes suppression and qualification bridge', () => {
  it('stamps signed intake provenance only on creation and never upgrades manual replays', async () => {
    const { service } = setup();
    const manual = await service.createBatch(actor, input);
    expect(manual.batch.origin).toEqual({ kind: 'MANUAL' });
    const manualReplay = await service.createBatch(actor, input, {
      connectionId: 'trusted-connection',
    });
    expect(manualReplay.replay).toBe(true);
    expect(manualReplay.batch.origin).toEqual({ kind: 'MANUAL' });
    const automatic = await service.createBatch(
      actor,
      { ...input, externalBatchId: 'automatic-id' },
      { connectionId: 'trusted-connection' },
    );
    expect(automatic.batch.origin).toEqual({
      kind: 'SIGNED_INTAKE',
      connectionId: 'trusted-connection',
      receivedAt: automatic.batch.createdAt,
    });
    const automaticReplay = await service.createBatch(actor, {
      ...input,
      externalBatchId: 'automatic-id',
    });
    expect(automaticReplay.replay).toBe(true);
    expect(automaticReplay.batch.origin).toEqual(automatic.batch.origin);
  });

  it('rechecks native workspace-scoped opposition on every reimport', async () => {
    const { service, suppressions } = setup();

    suppressions.findApplicableSuppressions.mockResolvedValue([
      { emailAddress: 'person@example.test', reason: 'UNSUBSCRIBE' },
    ]);
    const first = await service.createBatch(actor, input);
    const second = await service.createBatch(actor, {
      ...input,
      externalBatchId: 'second-batch',
    });

    expect(first.batch.rows[0].status).toBe('suppressed');
    expect(second.batch.rows[0].status).toBe('suppressed');
    expect(suppressions.findApplicableSuppressions).toHaveBeenLastCalledWith({
      workspaceId: actor.workspaceId,
      emailAddresses: ['person@example.test'],
    });
  });

  it('does not confuse tracking opposition with marketing opposition', async () => {
    const { service, suppressions } = setup();

    suppressions.findApplicableSuppressions.mockResolvedValue([
      { emailAddress: 'person@example.test', reason: 'TRACKING' },
    ]);
    const result = await service.createBatch(actor, input);

    expect(result.batch.rows[0].status).toBe('pending');
  });

  it('blocks qualification after an opt-out recorded after initial import', async () => {
    const { service, suppressions, orm } = setup();
    const { batch } = await service.createBatch(actor, input);

    suppressions.findApplicableSuppressions.mockResolvedValue([
      { emailAddress: 'person@example.test', reason: 'UNSUBSCRIBE' },
    ]);
    const result = await service.qualify(actor, {
      ...qualification,
      batchId: batch.id,
      rowIds: [batch.rows[0].id],
    });

    expect(result.rows[0].status).toBe('suppressed');
    expect(orm.runInWorkspaceTransaction).not.toHaveBeenCalled();
  });

  it('rejects a foreign batch ID before native records can be accessed', async () => {
    const { service, orm } = setup();
    const otherBatch = buildHermesImportBatch({
      ...input,
      userId: 'other-user',
      now: '2026-10-29T12:00:00Z',
    });

    await expect(
      service.qualify(actor, {
        ...qualification,
        batchId: otherBatch.id,
        rowIds: [otherBatch.rows[0].id],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(orm.executeInWorkspaceContext).not.toHaveBeenCalled();
  });

  it('rechecks opposition before a native draft/list is created', async () => {
    const { service, suppressions, orm } = setup();
    const { batch } = await service.createBatch(actor, input);

    batch.rows[0].status = 'qualified';
    batch.rows[0].personId = 'native-person';
    batch.rows[0].qualification = {
      ...qualification,
      qualifiedAt: '2026-10-29T12:00:00Z',
      qualifiedByUserId: actor.userId,
    };
    suppressions.findApplicableSuppressions.mockResolvedValue([
      { emailAddress: 'person@example.test', reason: 'COMPLAINT' },
    ]);
    await expect(
      service.createCampaignDraft(actor, {
        name: 'Synthetic draft',
        subject: 'Synthetic subject',
        rowIds: [batch.rows[0].id],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(orm.runInWorkspaceTransaction).not.toHaveBeenCalled();
  });

  it('creates a native company and person with stable contact ID while preserving provenance', async () => {
    const { service, orm } = setup();
    const { batch } = await service.createBatch(actor, input);
    const builder = {
      withDeleted: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    const insert = jest.fn().mockResolvedValue({ identifiers: [] });

    orm.getRepository.mockReturnValue({ createQueryBuilder: () => builder });
    orm.runInWorkspaceTransaction.mockImplementation(async (operation) =>
      operation({ getRepository: () => ({ insert }) }),
    );
    const result = await service.qualify(actor, {
      ...qualification,
      batchId: batch.id,
      rowIds: [batch.rows[0].id],
    });

    expect(result.rows[0].status).toBe('qualified');
    expect(result.rows[0].personId).toBe(batch.rows[0].id);
    expect(result.rows[0].qualification).toMatchObject(qualification);
    expect(insert).toHaveBeenCalledTimes(2);
    expect(insert.mock.calls[1][0].emails.primaryEmail).toBe(
      input.rows[0].email,
    );
    expect(builder.where.mock.calls[0][0]).toContain('emailsAdditionalEmails');
  });

  it('requires review for ambiguous pre-existing CRM identities without creating duplicates', async () => {
    const { service, orm } = setup();
    const { batch } = await service.createBatch(actor, input);
    const people = {
      withDeleted: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest
        .fn()
        .mockResolvedValue([{ id: 'person-1' }, { id: 'person-2' }]),
    };
    const companies = { ...people, getMany: jest.fn().mockResolvedValue([]) };

    orm.getRepository
      .mockReturnValueOnce({ createQueryBuilder: () => people })
      .mockReturnValueOnce({ createQueryBuilder: () => companies });
    const result = await service.qualify(actor, {
      ...qualification,
      batchId: batch.id,
      rowIds: [batch.rows[0].id],
    });

    expect(result.rows[0].status).toBe('conflict');
    expect(orm.runInWorkspaceTransaction).not.toHaveBeenCalled();
  });

  it('refuses campaign recipients whose native primary email changed', async () => {
    const { service, orm } = setup();
    const { batch } = await service.createBatch(actor, input);

    batch.rows[0].status = 'qualified';
    batch.rows[0].personId = 'native-person';
    batch.rows[0].qualification = {
      ...qualification,
      qualifiedAt: '2026-10-29T12:00:00Z',
      qualifiedByUserId: actor.userId,
    };
    const repository = {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([
        {
          id: 'native-person',
          emails: { primaryEmail: 'new-unqualified@example.test' },
        },
      ]),
      insert: jest.fn(),
    };

    orm.runInWorkspaceTransaction.mockImplementation(async (operation) =>
      operation({ getRepository: () => repository }),
    );
    await expect(
      service.createCampaignDraft(actor, {
        name: 'Synthetic draft',
        subject: 'Synthetic subject',
        rowIds: [batch.rows[0].id],
      }),
    ).rejects.toThrow('RECIPIENT_PRIMARY_EMAIL_CHANGED_OR_UNAVAILABLE');
    expect(repository.insert).not.toHaveBeenCalled();
  });
  it.each([
    'legitimate',
    'different-list-id',
    'replaced-member',
    'duplicate-member',
    'missing-member',
    'archived-list',
    'archived-person',
    'opposition-during-revalidation',
  ])(
    'replays a draft only while its native audience remains eligible: %s',
    async (scenario) => {
      const { service, orm, suppressions } = setup();
      const { batch } = await service.createBatch(actor, input);
      const row = batch.rows[0];

      row.status = 'qualified';
      row.personId = 'native-person';
      row.qualification = {
        ...qualification,
        qualifiedAt: '2026-10-29T12:00:00Z',
        qualifiedByUserId: actor.userId,
      };
      const request = {
        name: 'Synthetic draft',
        subject: 'Synthetic subject',
        rowIds: [row.id],
      };
      const campaignId = v5(
        JSON.stringify({
          workspaceId: actor.workspaceId,
          name: request.name,
          subject: request.subject,
          rowIds: [row.id],
        }),
        v5.URL,
      );
      const listId = v5('list', campaignId);
      const campaigns = {
        findOne: jest.fn().mockResolvedValue({
          id: campaignId,
          listId: scenario === 'different-list-id' ? 'unrelated-list' : listId,
          status: 'DRAFT',
        }),
        insert: jest.fn(),
      };
      const people = {
        find: jest.fn().mockResolvedValue([
          {
            id: row.personId,
            emails: { primaryEmail: row.email },
            deletedAt: scenario === 'archived-person' ? new Date() : null,
          },
        ]),
        insert: jest.fn(),
      };
      const lists = {
        findOne: jest.fn().mockResolvedValue({
          id: listId,
          deletedAt: scenario === 'archived-list' ? new Date() : null,
        }),
        insert: jest.fn(),
      };
      const members = {
        find: jest.fn().mockResolvedValue(
          scenario === 'missing-member'
            ? []
            : scenario === 'duplicate-member'
              ? [{ personId: row.personId }, { personId: row.personId }]
              : [
                  {
                    personId:
                      scenario === 'replaced-member'
                        ? 'unexpected-person'
                        : row.personId,
                  },
                ],
        ),
        insert: jest.fn(),
      };

      orm.runInWorkspaceTransaction.mockImplementation(async (operation) =>
        operation({
          getRepository: (name: string) => {
            if (name === 'person') return people;
            if (name === 'messageCampaign') return campaigns;
            if (name === 'messageList') return lists;
            if (name === 'messageListMember') return members;
            throw new Error('Unexpected repository');
          },
        }),
      );
      if (scenario === 'opposition-during-revalidation') {
        suppressions.findApplicableSuppressions
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([
            { emailAddress: row.email, reason: 'UNSUBSCRIBE' },
          ]);
      }
      if (scenario === 'legitimate') {
        const first = await service.createCampaignDraft(actor, request);
        const second = await service.createCampaignDraft(actor, request);

        expect(first).toEqual(second);
        expect(first).toMatchObject({ campaignId, listId, status: 'DRAFT' });
        expect(people.find).toHaveBeenCalledTimes(2);
        expect(members.find).toHaveBeenCalledTimes(2);
      } else {
        await expect(
          service.createCampaignDraft(actor, request),
        ).rejects.toBeInstanceOf(BadRequestException);
      }
      for (const repository of [campaigns, people, lists, members])
        expect(repository.insert).not.toHaveBeenCalled();
    },
  );
});
