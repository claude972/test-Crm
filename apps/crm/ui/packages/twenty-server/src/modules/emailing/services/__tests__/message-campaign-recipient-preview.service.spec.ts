import { EMAIL_DOCUMENT_SCHEMA_VERSION } from 'kovaa-lab-shared/utils';

import { EmailingDomainExceptionCode } from 'src/engine/core-modules/emailing-domain/exceptions/emailing-domain.exception';
import { MessageSuppressionReason } from 'src/engine/core-modules/emailing-domain/types/message-suppression-reason.type';
import {
  MESSAGE_CAMPAIGN_PREVIEW_EXCLUSION_REASON,
  MESSAGE_CAMPAIGN_PREVIEW_SENDER_STATUS,
  MessageCampaignRecipientPreviewService,
} from 'src/modules/emailing/services/message-campaign-recipient-preview.service';

// ISOLATED FAKE MIME/HTML COMPILER — not the real one. The real
// compileOutboundEmailContent cannot run under this jest setup, so every spec
// in this area doubles it (see compile-campaign-email-content.util.spec.ts).
// The document handed to it is asserted, which is what proves the per-recipient
// bindings were resolved server-side before any composition.
jest.mock(
  'src/engine/core-modules/email/utils/compile-outbound-email-content.util',
  () => {
    type FakeNode = {
      type?: string;
      text?: string;
      marks?: { type: string; attrs?: { href?: string } }[];
      content?: FakeNode[];
    };

    // Emits just enough real HTML (text plus anchors) for the link collector to
    // behave as it does in production.
    const renderNode = (node: FakeNode): string => {
      if (node.type === 'text') {
        const href = node.marks?.find((mark) => mark.type === 'link')?.attrs
          ?.href;

        return href ? `<a href="${href}">${node.text}</a>` : (node.text ?? '');
      }

      return (node.content ?? []).map(renderNode).join('');
    };

    return {
      compileOutboundEmailContent: jest.fn(async (document: FakeNode) => {
        const inner = (document.content ?? []).map(renderNode).join('');

        return { html: `<p>${inner}</p>`, plainText: inner };
      }),
    };
  },
);

jest.mock(
  'src/engine/core-modules/emailing-domain/emailing-domain.entity',
  () => ({ EmailingDomainEntity: class {} }),
);
jest.mock('src/engine/core-modules/workspace/workspace.entity', () => ({
  WorkspaceEntity: class {},
}));
jest.mock(
  'src/engine/twenty-orm/workspace-scoped-repository/workspace-scoped-repository',
  () => ({ WorkspaceScopedRepository: class {} }),
);
jest.mock('src/engine/twenty-orm/workspace-orm.manager', () => ({
  WorkspaceOrmManager: class {},
}));
jest.mock('src/engine/metadata-modules/user-role/user-role.service', () => ({
  UserRoleService: class {},
}));
jest.mock('src/engine/core-modules/twenty-config/twenty-config.service', () => ({
  KovaaLabCRMConfigService: class {},
}));
jest.mock('src/modules/emailing/services/campaign-variable.service', () => ({
  CampaignVariableService: class {},
}));
jest.mock(
  'src/modules/emailing/services/message-campaign-audience.service',
  () => ({ MessageCampaignAudienceService: class {} }),
);
jest.mock('src/modules/emailing/services/message-suppression.service', () => ({
  MessageSuppressionService: class {},
}));
jest.mock(
  'src/modules/emailing/services/campaign-engagement-event.service',
  () => ({ CampaignEngagementEventService: class {} }),
);
jest.mock(
  'src/modules/emailing/standard-objects/message-campaign.workspace-entity',
  () => ({ MessageCampaignWorkspaceEntity: class {} }),
);
jest.mock(
  'src/modules/emailing/standard-objects/message-list-member.workspace-entity',
  () => ({ MessageListMemberWorkspaceEntity: class {} }),
);
jest.mock('src/modules/person/standard-objects/person.workspace-entity', () => ({
  PersonWorkspaceEntity: class {},
}));

// The real builder reads the ambient workspace context, which a unit test has
// none of. This labelled double keeps the caller's role id observable so role
// scoping stays assertable.
jest.mock(
  'src/modules/emailing/utils/build-emailing-role-permission-config.util',
  () => ({
    buildEmailingRolePermissionConfig: (userRoleId: string) => ({
      fakeRolePermissionConfigForTest: true,
      userRoleId,
    }),
  }),
);

const { MessageCampaignWorkspaceEntity } = jest.requireMock(
  'src/modules/emailing/standard-objects/message-campaign.workspace-entity',
);
const { MessageListMemberWorkspaceEntity } = jest.requireMock(
  'src/modules/emailing/standard-objects/message-list-member.workspace-entity',
);

const WORKSPACE_ID = '20202020-0000-4000-8000-0000000000aa';
const OTHER_WORKSPACE_ID = '20202020-0000-4000-8000-0000000000bb';
const USER_WORKSPACE_ID = '20202020-0000-4000-8000-0000000000cc';
const CAMPAIGN_ID = '20202020-0000-4000-8000-000000000001';
const LIST_ID = '20202020-0000-4000-8000-000000000002';
const PERSON_ID = '20202020-0000-4000-8000-000000000003';
const MEMBER_PERSON_ID = '20202020-0000-4000-8000-000000000004';
const OUTSIDER_PERSON_ID = '20202020-0000-4000-8000-000000000007';
const ROLE_ID = '20202020-0000-4000-8000-000000000005';
const OTHER_ROLE_ID = '20202020-0000-4000-8000-000000000006';

const bodyTemplate = JSON.stringify({
  type: 'doc',
  attrs: { schemaVersion: EMAIL_DOCUMENT_SCHEMA_VERSION },
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Bonjour {{firstName}}, ' },
        {
          type: 'text',
          text: 'notre offre',
          marks: [
            { type: 'link', attrs: { href: 'https://example.com/offre' } },
          ],
        },
      ],
    },
  ],
});

const bodyTemplateWithoutLink = JSON.stringify({
  type: 'doc',
  attrs: { schemaVersion: EMAIL_DOCUMENT_SCHEMA_VERSION },
  content: [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Bonjour {{firstName}}' }],
    },
  ],
});

type CampaignRow = {
  id: string;
  subject: string | null;
  bodyTemplate: string | null;
  fromAddress: { primaryEmail: string } | null;
  listId: string | null;
  unsubscribeTopicId: string | null;
};

const defaultCampaign = (): CampaignRow => ({
  id: CAMPAIGN_ID,
  subject: 'Offre pour {{firstName}}',
  bodyTemplate,
  fromAddress: { primaryEmail: 'news@example.com' },
  listId: LIST_ID,
  unsubscribeTopicId: null,
});

const activeDomain = {
  id: 'domain-1',
  domain: 'example.com',
  unsubscribeHostname: 'unsub.example.com',
  unsubscribeHostnameStatus: 'ACTIVE',
};

type SetupOptions = {
  campaign?: CampaignRow | null;
  readableByRoleId?: string;
  roleId?: string;
  sendableRecipients?: { personId: string; email: string }[];
  people?: Record<string, unknown>;
  listMemberPersonIds?: string[];
  emailingDomain?: Record<string, unknown> | null;
  emailingDomainByWorkspaceId?: Record<string, unknown>;
  workspace?: Record<string, unknown> | null;
  suppressions?: { reason: string; unsubscribeTopicId?: string | null }[];
  trackingOptedOut?: boolean;
  isEngagementAvailable?: boolean;
  driver?: string;
};

const setup = (options: SetupOptions = {}) => {
  const {
    campaign = defaultCampaign(),
    readableByRoleId = ROLE_ID,
    roleId = ROLE_ID,
    sendableRecipients = [{ personId: PERSON_ID, email: 'ada@client.com' }],
    people = {
      [PERSON_ID]: { id: PERSON_ID, emails: { primaryEmail: 'ada@client.com' } },
      [MEMBER_PERSON_ID]: {
        id: MEMBER_PERSON_ID,
        emails: { primaryEmail: 'opposed@client.com' },
      },
      [OUTSIDER_PERSON_ID]: {
        id: OUTSIDER_PERSON_ID,
        emails: { primaryEmail: 'outsider@client.com' },
      },
    },
    listMemberPersonIds = [PERSON_ID, MEMBER_PERSON_ID],
    emailingDomain = activeDomain,
    emailingDomainByWorkspaceId,
    workspace = {
      id: WORKSPACE_ID,
      subdomain: 'acme',
      isCampaignOpenTrackingEnabled: true,
      isCampaignClickTrackingEnabled: true,
    },
    suppressions = [],
    trackingOptedOut = false,
    isEngagementAvailable = true,
    driver = 'SMTP',
  } = options;

  const emailingDomainFindOne = jest.fn(async (askedWorkspaceId: string) =>
    emailingDomainByWorkspaceId
      ? (emailingDomainByWorkspaceId[askedWorkspaceId] ?? null)
      : emailingDomain,
  );

  const resolveNormalizedAudience = jest.fn(async () => ({
    sendableRecipients,
    audience: {},
  }));

  const findApplicableSuppressions = jest.fn(async () => suppressions);
  const isTrackingOptedOut = jest.fn(async () => trackingOptedOut);
  const assertKnownVariables = jest.fn(async () => undefined);

  const buildVariablesForPerson = jest.fn(
    async (
      _workspaceId: string,
      person: { emails?: { primaryEmail?: string } } | null,
    ) => ({
      firstName: person?.emails?.primaryEmail === 'ada@client.com' ? 'Ada' : '',
    }),
  );

  const personFindOne = jest.fn(
    async ({ where }: { where: { id: string } }) => people[where.id] ?? null,
  );

  const getRepository = jest.fn(
    (entity: unknown, permissionConfig: unknown) => {
      const grantedRoleId = (
        permissionConfig as { userRoleId?: string } | undefined
      )?.userRoleId;

      if (entity === MessageCampaignWorkspaceEntity) {
        return {
          findOne: jest.fn(async ({ where }: { where: { id: string } }) =>
            grantedRoleId === readableByRoleId && campaign?.id === where.id
              ? campaign
              : null,
          ),
        };
      }

      if (entity === MessageListMemberWorkspaceEntity) {
        return {
          findOne: jest.fn(
            async ({
              where,
            }: {
              where: { listId: string; personId: string };
            }) =>
              where.listId === LIST_ID &&
              listMemberPersonIds.includes(where.personId)
                ? { listId: where.listId, personId: where.personId }
                : null,
          ),
        };
      }

      return { findOne: personFindOne };
    },
  );

  const service = new MessageCampaignRecipientPreviewService(
    { findOne: emailingDomainFindOne } as never,
    { findOneBy: jest.fn(async () => workspace) } as never,
    {
      getRepository,
      executeInWorkspaceContext: async (callback: () => unknown) => callback(),
    } as never,
    { getRoleIdForUserWorkspace: jest.fn(async () => roleId) } as never,
    { assertKnownVariables, buildVariablesForPerson } as never,
    { resolveNormalizedAudience } as never,
    { findApplicableSuppressions, isTrackingOptedOut } as never,
    { isAvailable: () => isEngagementAvailable } as never,
    { get: jest.fn(() => driver) } as never,
  );

  return {
    service,
    emailingDomainFindOne,
    resolveNormalizedAudience,
    assertKnownVariables,
    isTrackingOptedOut,
    buildVariablesForPerson,
    getRepository,
    personFindOne,
  };
};

const preview = (
  service: MessageCampaignRecipientPreviewService,
  personId?: string,
) =>
  service.previewRecipient({
    workspaceId: WORKSPACE_ID,
    userWorkspaceId: USER_WORKSPACE_ID,
    campaignId: CAMPAIGN_ID,
    ...(personId !== undefined && { personId }),
  });

describe('MessageCampaignRecipientPreviewService', () => {
  describe('rendering, with no emission', () => {
    it('should render the subject for the recipient and resolve its bindings server-side', async () => {
      const { service } = setup();

      const result = await preview(service);

      expect(result.personId).toBe(PERSON_ID);
      expect(result.email).toBe('ada@client.com');
      // The subject goes through the real campaign template renderer.
      expect(result.subject).toBe('Offre pour Ada');
      // The body reached the compiler already substituted for this person.
      expect(result.html).toContain('Bonjour Ada');
      expect(result.isRecipientSendable).toBe(true);
      expect(result.recipientExclusionReason).toBeNull();
    });

    it('should never inject a sender, driver, queue or delivery repository', () => {
      // The constructor arity is the guarantee: nothing that could emit is
      // reachable from this service.
      expect(MessageCampaignRecipientPreviewService.length).toBe(9);
    });

    it('should report the variables it substituted', async () => {
      const { service } = setup();

      expect((await preview(service)).variablesUsed).toEqual(['firstName']);
    });

    it('should resolve the first sendable recipient when no person is asked for', async () => {
      const { service } = setup({
        sendableRecipients: [
          { personId: PERSON_ID, email: 'ada@client.com' },
          { personId: MEMBER_PERSON_ID, email: 'grace@client.com' },
        ],
      });

      expect((await preview(service)).personId).toBe(PERSON_ID);
    });

    it('should refuse when the audience resolves to no sendable recipient', async () => {
      const { service } = setup({ sendableRecipients: [] });

      await expect(preview(service)).rejects.toMatchObject({
        code: EmailingDomainExceptionCode.MESSAGE_CAMPAIGN_NOT_SENDABLE,
      });
    });
  });

  describe('validation the generic record API does not perform', () => {
    it('should refuse a campaign with no subject', async () => {
      const { service } = setup({
        campaign: { ...defaultCampaign(), subject: null },
      });

      await expect(preview(service)).rejects.toMatchObject({
        code: EmailingDomainExceptionCode.MESSAGE_CAMPAIGN_NOT_SENDABLE,
      });
    });

    it('should refuse a campaign with no content', async () => {
      const { service } = setup({
        campaign: { ...defaultCampaign(), bodyTemplate: null },
      });

      await expect(preview(service)).rejects.toMatchObject({
        code: EmailingDomainExceptionCode.MESSAGE_CAMPAIGN_NOT_SENDABLE,
      });
    });

    it('should surface an unknown variable before any rendering happens', async () => {
      const { service, assertKnownVariables } = setup();

      assertKnownVariables.mockRejectedValueOnce(
        new Error('Unknown campaign variables: firstName'),
      );

      await expect(preview(service)).rejects.toThrow(
        'Unknown campaign variables',
      );
    });
  });

  describe('scoping: role, list membership and company', () => {
    it('should hide a campaign from a role that cannot read it', async () => {
      const { service } = setup({ roleId: OTHER_ROLE_ID });

      await expect(preview(service)).rejects.toMatchObject({
        code: EmailingDomainExceptionCode.MESSAGE_CAMPAIGN_NOT_FOUND,
      });
    });

    it('should reject a person outside the campaign list before rendering anything', async () => {
      const { service, personFindOne, buildVariablesForPerson } = setup();

      await expect(preview(service, OUTSIDER_PERSON_ID)).rejects.toMatchObject({
        code: EmailingDomainExceptionCode.MESSAGE_CAMPAIGN_NOT_FOUND,
      });

      // A render must not become a way to read a person outside the audience.
      expect(personFindOne).not.toHaveBeenCalled();
      expect(buildVariablesForPerson).not.toHaveBeenCalled();
    });

    it('should reject any chosen person when the campaign has no list at all', async () => {
      const { service, personFindOne } = setup({
        campaign: { ...defaultCampaign(), listId: null },
      });

      await expect(preview(service, PERSON_ID)).rejects.toMatchObject({
        code: EmailingDomainExceptionCode.MESSAGE_CAMPAIGN_NOT_FOUND,
      });
      expect(personFindOne).not.toHaveBeenCalled();
    });

    it('should preview a suppressed list member, which is the useful case', async () => {
      const { service } = setup({
        sendableRecipients: [],
        suppressions: [
          {
            reason: MessageSuppressionReason.UNSUBSCRIBE,
            unsubscribeTopicId: null,
          },
        ],
      });

      const result = await preview(service, MEMBER_PERSON_ID);

      expect(result.isRecipientSendable).toBe(false);
      expect(result.recipientExclusionReason).toBe(
        MESSAGE_CAMPAIGN_PREVIEW_EXCLUSION_REASON.GLOBALLY_UNSUBSCRIBED,
      );
    });

    it('should fail rather than render when the scoped person read comes back null', async () => {
      const { service, buildVariablesForPerson } = setup({ people: {} });

      await expect(preview(service)).rejects.toMatchObject({
        code: EmailingDomainExceptionCode.MESSAGE_CAMPAIGN_NOT_FOUND,
      });
      expect(buildVariablesForPerson).not.toHaveBeenCalled();
    });

    it('should open every repository with the caller role permission config', async () => {
      const { service, getRepository } = setup();

      await preview(service);

      expect(getRepository).toHaveBeenCalled();

      for (const call of getRepository.mock.calls) {
        expect(call[1]).toMatchObject({ userRoleId: ROLE_ID });
      }
    });

    it('should resolve the sender against the caller workspace only', async () => {
      const { service, emailingDomainFindOne } = setup({
        emailingDomainByWorkspaceId: {
          [OTHER_WORKSPACE_ID]: activeDomain,
        },
      });

      const result = await preview(service);

      expect(emailingDomainFindOne).toHaveBeenCalledWith(
        WORKSPACE_ID,
        expect.anything(),
      );
      // Another company's verified domain must not qualify this sender.
      expect(result.envelope.senderStatus).toBe(
        MESSAGE_CAMPAIGN_PREVIEW_SENDER_STATUS.DOMAIN_NOT_VERIFIED,
      );
    });

    it('should scope the audience resolution to the caller workspace and role', async () => {
      const { service, resolveNormalizedAudience } = setup();

      await preview(service);

      expect(resolveNormalizedAudience).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: WORKSPACE_ID,
          listId: LIST_ID,
          roleId: ROLE_ID,
        }),
      );
    });
  });

  describe('sender identity, named by what was actually checked', () => {
    it('should report only that the domain prerequisites are met, never that the provider can send', async () => {
      const { service } = setup();

      const { envelope } = await preview(service);

      expect(envelope.fromAddress).toBe('news@example.com');
      expect(envelope.senderStatus).toBe(
        MESSAGE_CAMPAIGN_PREVIEW_SENDER_STATUS.DOMAIN_PREREQUISITES_MET,
      );
      // No status in this set may be read as transport readiness.
      expect(Object.values(MESSAGE_CAMPAIGN_PREVIEW_SENDER_STATUS)).not.toContain(
        'SEND_READY',
      );
    });

    it('should report a missing sender rather than inventing one', async () => {
      const { service } = setup({
        campaign: { ...defaultCampaign(), fromAddress: null },
      });

      const { envelope } = await preview(service);

      expect(envelope.fromAddress).toBeNull();
      expect(envelope.senderStatus).toBe(
        MESSAGE_CAMPAIGN_PREVIEW_SENDER_STATUS.NOT_PERSISTED,
      );
      expect(envelope.unsubscribeLinkWouldBeIncluded).toBe(false);
    });

    it('should refuse to qualify an unverified domain', async () => {
      const { service } = setup({ emailingDomain: null });

      expect((await preview(service)).envelope.senderStatus).toBe(
        MESSAGE_CAMPAIGN_PREVIEW_SENDER_STATUS.DOMAIN_NOT_VERIFIED,
      );
    });

    it('should refuse to qualify a domain whose unsubscribe hostname is not active', async () => {
      const { service } = setup({
        emailingDomain: {
          ...activeDomain,
          unsubscribeHostnameStatus: 'PENDING',
        },
      });

      const { envelope } = await preview(service);

      expect(envelope.senderStatus).toBe(
        MESSAGE_CAMPAIGN_PREVIEW_SENDER_STATUS.UNSUBSCRIBE_HOSTNAME_NOT_READY,
      );
      expect(envelope.unsubscribeLinkWouldBeIncluded).toBe(false);
    });
  });

  describe('durable opposition', () => {
    const opposedMember = (
      suppressions: { reason: string; unsubscribeTopicId?: string | null }[],
    ) => setup({ sendableRecipients: [], suppressions });

    it('should name a topic unsubscribe distinctly from a global one', async () => {
      const { service } = opposedMember([
        {
          reason: MessageSuppressionReason.UNSUBSCRIBE,
          unsubscribeTopicId: 'topic-1',
        },
      ]);

      expect(
        (await preview(service, MEMBER_PERSON_ID)).recipientExclusionReason,
      ).toBe(MESSAGE_CAMPAIGN_PREVIEW_EXCLUSION_REASON.TOPIC_UNSUBSCRIBED);
    });

    it('should name a hard suppression for a complaint', async () => {
      const { service } = opposedMember([
        { reason: MessageSuppressionReason.COMPLAINT },
      ]);

      expect(
        (await preview(service, MEMBER_PERSON_ID)).recipientExclusionReason,
      ).toBe(MESSAGE_CAMPAIGN_PREVIEW_EXCLUSION_REASON.HARD_SUPPRESSED);
    });

    it('should not treat a tracking opt-out as an exclusion, because it never blocks a send', async () => {
      const { service } = opposedMember([
        { reason: MessageSuppressionReason.TRACKING },
      ]);

      expect(
        (await preview(service, MEMBER_PERSON_ID)).recipientExclusionReason,
      ).toBe(MESSAGE_CAMPAIGN_PREVIEW_EXCLUSION_REASON.NOT_IN_AUDIENCE);
    });

    it('should report a list member with no usable address', async () => {
      const { service } = setup({
        sendableRecipients: [],
        people: {
          [MEMBER_PERSON_ID]: {
            id: MEMBER_PERSON_ID,
            emails: { primaryEmail: '' },
          },
        },
      });

      const result = await preview(service, MEMBER_PERSON_ID);

      expect(result.email).toBe('');
      expect(result.recipientExclusionReason).toBe(
        MESSAGE_CAMPAIGN_PREVIEW_EXCLUSION_REASON.NO_EMAIL,
      );
    });
  });

  describe('optional open marker, without claiming a read', () => {
    it('should report that a marker would be embedded when open tracking is on', async () => {
      const { service } = setup();

      expect((await preview(service)).envelope.openMarkerWouldBeIncluded).toBe(
        true,
      );
    });

    it('should report no marker when the workspace disabled open tracking', async () => {
      const { service } = setup({
        workspace: {
          id: WORKSPACE_ID,
          subdomain: 'acme',
          isCampaignOpenTrackingEnabled: false,
          isCampaignClickTrackingEnabled: true,
        },
      });

      const { envelope } = await preview(service);

      expect(envelope.openMarkerWouldBeIncluded).toBe(false);
      // Click tracking is a separate choice and stays on.
      expect(envelope.clickTrackingWouldBeApplied).toBe(true);
    });

    it('should report no marker for a recipient who opted out of tracking', async () => {
      const { service, isTrackingOptedOut } = setup({ trackingOptedOut: true });

      const { envelope } = await preview(service);

      expect(isTrackingOptedOut).toHaveBeenCalledWith({
        workspaceId: WORKSPACE_ID,
        emailAddress: 'ada@client.com',
      });
      expect(envelope.openMarkerWouldBeIncluded).toBe(false);
      expect(envelope.clickTrackingWouldBeApplied).toBe(false);
    });

    it('should report no marker when no engagement backend could record one', async () => {
      const { service } = setup({ isEngagementAvailable: false });

      expect((await preview(service)).envelope.openMarkerWouldBeIncluded).toBe(
        false,
      );
    });

    it('should report no marker when no tracking base url can be resolved', async () => {
      const { service } = setup({
        emailingDomain: { ...activeDomain, unsubscribeHostname: '' },
      });

      expect((await preview(service)).envelope.openMarkerWouldBeIncluded).toBe(
        false,
      );
    });

    it('should report click tracking only when the body carries a trackable link', async () => {
      const { service } = setup({
        campaign: {
          ...defaultCampaign(),
          bodyTemplate: bodyTemplateWithoutLink,
        },
      });

      const { envelope } = await preview(service);

      expect(envelope.clickTrackingWouldBeApplied).toBe(false);
      expect(envelope.openMarkerWouldBeIncluded).toBe(true);
    });
  });
});
