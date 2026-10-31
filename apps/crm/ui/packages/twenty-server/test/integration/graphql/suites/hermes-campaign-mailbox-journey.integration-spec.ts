import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import request from 'supertest';

import { FeatureFlagKey } from 'kovaa-lab-shared/types';
import {
  EMAIL_DOCUMENT_SCHEMA_VERSION,
  type EmailDocument,
} from 'kovaa-lab-shared/utils';

import { getAppProviderByClassName } from 'test/integration/utils/get-app-provider-by-class-name.util';
import { buildEmailDocument } from 'test/integration/utils/build-email-document.util';
import {
  type CampaignMailboxServer,
  readCapturedMessages,
  startCampaignMailboxContainer,
} from 'test/integration/utils/hermes-campaign-mailbox-fixture.util';
import { getCoreRepository } from 'test/integration/utils/get-core-repository.util';
import { saveImapSmtpCaldavAccount } from 'test/integration/metadata/suites/connected-account/utils/save-imap-smtp-caldav-account.util';
import { expectEventually } from 'test/integration/utils/expect-eventually.util';

import { hashPassword } from 'src/engine/core-modules/auth/auth.util';
import { type AccessTokenService } from 'src/engine/core-modules/auth/token/services/access-token.service';
import { EmailingDomainDriver } from 'src/engine/core-modules/emailing-domain/drivers/types/emailing-domain-driver.type';
import { EmailingDomainStatus } from 'src/engine/core-modules/emailing-domain/drivers/types/emailing-domain-status.type';
import { UnsubscribeHostnameStatus } from 'src/engine/core-modules/emailing-domain/drivers/types/unsubscribe-hostname-status.type';
import { type FeatureFlagService } from 'src/engine/core-modules/feature-flag/services/feature-flag.service';
import { EmailConnectionSecurity } from 'src/engine/core-modules/imap-smtp-caldav-connection/enums/email-connection-security.enum';
import { type KovaaLabCRMConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { UserEntity } from 'src/engine/core-modules/user/user.entity';
import { type UserWorkspaceService } from 'src/engine/core-modules/user-workspace/user-workspace.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthProviderEnum } from 'src/engine/core-modules/workspace/types/workspace.type';
import { type RoleService } from 'src/engine/metadata-modules/role/role.service';
import { MessageCampaignStatus } from 'kovaa-lab-shared/types';
import {
  SEED_APPLE_WORKSPACE_ID,
  SEED_YCOMBINATOR_WORKSPACE_ID,
} from 'src/engine/workspace-manager/dev-seeder/core/constants/seeder-workspaces.constant';
import { STANDARD_ROLE } from 'src/engine/workspace-manager/twenty-standard-application/constants/standard-role.constant';
import { getWorkspaceSchemaName } from 'src/engine/workspace-datasource/utils/get-workspace-schema-name.util';

// CI must enforce this target before native globalSetup can reset a database.
assert.equal(process.env.GITHUB_ACTIONS, 'true', 'Disposable CI only');
const database = new URL(process.env.PG_DATABASE_URL ?? '');

assert.ok(['postgres:', 'postgresql:'].includes(database.protocol));
assert.equal(database.hostname, '127.0.0.1');
assert.equal(database.port, '5432');
assert.equal(database.pathname, '/p0_ci');
assert.equal(database.search, '');

const APP_PORT = (global as unknown as { APP_PORT: number }).APP_PORT ?? 4000;

const A = SEED_APPLE_WORKSPACE_ID;
const B = SEED_YCOMBINATOR_WORKSPACE_ID;

const suffix = randomUUID().slice(0, 8);
const PREFIX = `hermes-campaign-mailbox-${suffix}`;
const MAILBOX_DOMAIN = `${PREFIX}.test`;
const MAILBOX_HANDLE = `operator@${MAILBOX_DOMAIN}`;
const MAILBOX_PASSWORD = `pw-${randomUUID()}`;
const TEST_DESTINATION = `operator@${MAILBOX_DOMAIN}`;
const SENDABLE_ADDRESS = `ada-${suffix}@${MAILBOX_DOMAIN}`;
const OPPOSED_ADDRESS = `grace-${suffix}@${MAILBOX_DOMAIN}`;

type ApiResult<TData> = { data?: TData; errors?: { message: string }[] };

const provider = getAppProviderByClassName;

jest.setTimeout(600_000);

const api = async <TData>(
  token: string | undefined,
  query: string,
  variables: object = {},
  endpoint: '/metadata' | '/graphql' = '/metadata',
): Promise<ApiResult<TData>> => {
  const operation = request(`http://127.0.0.1:${APP_PORT}`).post(endpoint);

  if (token) {
    operation.set('Authorization', `Bearer ${token}`);
  }

  const response = await operation.send({ query, variables });

  if (response.status !== 200) {
    if ([401, 403].includes(response.status)) {
      return { errors: [{ message: 'HTTP authentication refused' }] };
    }

    throw new Error(
      `Unexpected campaign fixture HTTP status ${response.status}`,
    );
  }

  return response.body as ApiResult<TData>;
};

const successful = <TData>(result: ApiResult<TData>): TData => {
  if (result.errors?.length || !result.data) {
    throw new Error(
      `Expected a successful operation, got ${JSON.stringify(result.errors)}`,
    );
  }

  return result.data;
};

const denied = <TData>(result: ApiResult<TData>): void => {
  expect(result.errors?.length ?? 0).toBeGreaterThan(0);
  // The fixture prefix must never leak through a refusal.
  expect(JSON.stringify(result.data ?? null).includes(PREFIX)).toBe(false);
};

// A genuine native email document. The generic record API does NOT stamp the
// schema version, and parseCanonicalEmailDocument rejects a versionless
// document, so the stamp is applied here exactly as the draft service would.
const buildCampaignBody = (text: string): string => {
  const document: EmailDocument = buildEmailDocument(text);

  return JSON.stringify({
    ...document,
    attrs: {
      ...document.attrs,
      schemaVersion:
        document.attrs?.schemaVersion ?? EMAIL_DOCUMENT_SCHEMA_VERSION,
    },
  });
};

describe('Hermes campaign from the operator mailbox, over HTTP and PostgreSQL', () => {
  let mailbox: CampaignMailboxServer;
  let tokenA: string;
  let tokenB: string;
  let connectedAccountId: string;
  let emailingDomainId: string;
  let personId: string;
  let opposedPersonId: string;
  let listId: string;
  let campaignId: string;

  const previousFeatureFlags = new Map<string, boolean>();

  const readFixtureMessages = async () =>
    (
      await Promise.all(
        [MAILBOX_HANDLE, SENDABLE_ADDRESS, OPPOSED_ADDRESS].map((username) =>
          readCapturedMessages({
            host: mailbox.host,
            port: mailbox.imapsPort,
            username,
            password: MAILBOX_PASSWORD,
          }),
        ),
      )
    ).flat();

  const join = async (
    user: UserEntity,
    workspaceId: string,
  ): Promise<string> => {
    // addUserToWorkspaceIfUserNotInWorkspace takes the entity, not its id: it
    // reads workspace.id itself, exactly as the proven suites resolve it.
    const workspace = await getCoreRepository<WorkspaceEntity>(
      WorkspaceEntity,
    ).findOneByOrFail({ id: workspaceId });

    const role = await provider<RoleService>(
      'RoleService',
    ).getRoleByUniversalIdentifier({
      universalIdentifier: STANDARD_ROLE.admin.universalIdentifier,
      workspaceId,
    });

    // getRoleByUniversalIdentifier resolves to RoleDTO | null.
    assert.ok(role, `The admin standard role is missing in ${workspaceId}`);

    await provider<UserWorkspaceService>(
      'UserWorkspaceService',
    ).addUserToWorkspaceIfUserNotInWorkspace(user, workspace, role.id);

    const issued = await provider<AccessTokenService>(
      'AccessTokenService',
    ).generateAccessToken({
      userId: user.id,
      workspaceId,
      authProvider: AuthProviderEnum.Password,
    });

    return issued.token;
  };

  beforeAll(async () => {
    // Read-and-assert rather than override: the suite refuses to run against a
    // provider it did not expect, instead of silently proving nothing.
    const config = provider<KovaaLabCRMConfigService>(
      'KovaaLabCRMConfigService',
    );

    assert.equal(
      config.get('EMAILING_DOMAIN_DRIVER'),
      EmailingDomainDriver.SMTP,
      'This journey requires EMAILING_DOMAIN_DRIVER=SMTP so the registered mailbox is the transport',
    );
    assert.equal(
      config.get('IMAP_SMTP_ALLOW_SELF_SIGNED'),
      true,
      "This journey requires IMAP_SMTP_ALLOW_SELF_SIGNED so the fixture's self-signed certificate is accepted",
    );

    const featureFlags = provider<FeatureFlagService>('FeatureFlagService');

    for (const workspaceId of [A, B]) {
      previousFeatureFlags.set(
        workspaceId,
        await featureFlags.isFeatureEnabled(
          FeatureFlagKey.IS_MESSAGE_CAMPAIGN_ENABLED,
          workspaceId,
        ),
      );
      await featureFlags.upsertWorkspaceFeatureFlag({
        workspaceId,
        featureFlag: FeatureFlagKey.IS_MESSAGE_CAMPAIGN_ENABLED,
        value: true,
      });
    }

    mailbox = await startCampaignMailboxContainer({
      username: MAILBOX_HANDLE,
      password: MAILBOX_PASSWORD,
      recipientAddresses: [SENDABLE_ADDRESS, OPPOSED_ADDRESS],
    });

    // The SSRF guard must reach the fixture, and it is NOT relaxed here. The
    // allowlist matches on hostname alone, so the loopback host is named
    // statically in the runner environment; the runtime-assigned port is
    // irrelevant to it. Asserting instead of mutating keeps the guard enforced
    // and fails loudly when the environment did not name the host: the
    // admin-panel mutation cannot help, because the integration runner sets
    // IS_CONFIG_VARIABLES_IN_DB_ENABLED=false.
    const allowedInternalHosts = config
      .get('OUTBOUND_HTTP_ALLOWED_INTERNAL_HOSTS')
      .map((entry: string) => entry.trim().toLowerCase());

    assert.ok(
      allowedInternalHosts.includes('*') ||
        allowedInternalHosts.includes(mailbox.host.toLowerCase()),
      `OUTBOUND_HTTP_ALLOWED_INTERNAL_HOSTS must name the fixture host ${mailbox.host} (set it in the runner environment; it cannot be set at runtime while database-backed config is disabled)`,
    );

    const user = await getCoreRepository<UserEntity>(UserEntity).save({
      email: `${PREFIX}@acme.test`,
      firstName: 'Campaign',
      lastName: 'Operator',
      passwordHash: await hashPassword(`pw-${randomUUID()}`),
    });

    tokenA = await join(user, A);
    tokenB = await join(user, B);
  });

  afterAll(async () => {
    for (const [workspaceId, previous] of previousFeatureFlags) {
      await provider<FeatureFlagService>('FeatureFlagService')
        .upsertWorkspaceFeatureFlag({
          workspaceId,
          featureFlag: FeatureFlagKey.IS_MESSAGE_CAMPAIGN_ENABLED,
          value: previous,
        })
        .catch(() => undefined);
    }

    await mailbox?.stop().catch(() => undefined);
  });

  it('registers the operator mailbox as a native connected account over TLS', async () => {
    const { data } = await saveImapSmtpCaldavAccount({
      token: tokenA,
      input: {
        handle: MAILBOX_HANDLE,
        connectionParameters: {
          IMAP: {
            host: mailbox.host,
            port: mailbox.imapsPort,
            username: MAILBOX_HANDLE.split('@')[0],
            password: MAILBOX_PASSWORD,
            connectionSecurity: EmailConnectionSecurity.SSL_TLS,
          },
          SMTP: {
            host: mailbox.host,
            port: mailbox.smtpsPort,
            username: MAILBOX_HANDLE.split('@')[0],
            password: MAILBOX_PASSWORD,
            connectionSecurity: EmailConnectionSecurity.SSL_TLS,
          },
        },
      },
      expectToFail: false,
    });

    expect(data.success).toBe(true);
    connectedAccountId = data.connectedAccountId;
    expect(connectedAccountId).toBeDefined();
  });

  it('registers that account as the central MAIL connection', async () => {
    const saved = successful<{ hermesSaveConnectionV4: { state?: string } }>(
      await api(
        tokenA,
        'mutation Save($input: HermesConnectionSaveInput!) { hermesSaveConnectionV4(input: $input) }',
        {
          input: {
            kind: 'MAIL',
            expectedRevision: 0,
            settings: {
              connectedAccountId,
              mailbox: 'INBOX',
            },
          },
        },
      ),
    );

    expect(saved.hermesSaveConnectionV4).toBeDefined();
  });

  it('verifies the sending domain through the real routine, with no seeded row', async () => {
    const created = successful<{
      createEmailingDomain: {
        id: string;
        domain: string;
        status: string;
        unsubscribeHostnameStatus: string | null;
      };
    }>(
      await api(
        tokenA,
        'mutation Create($input: CreateEmailingDomainInput!) { createEmailingDomain(input: $input) { id domain status unsubscribeHostnameStatus } }',
        { input: { domain: MAILBOX_DOMAIN } },
      ),
    );

    emailingDomainId = created.createEmailingDomain.id;

    expect(created.createEmailingDomain.domain).toBe(MAILBOX_DOMAIN);
    // VERIFIED here is produced by SmtpEmailingDomainDriver.verifyDomain
    // actually connecting to the fixture, not by a fixture row. It proves
    // connectivity through the registered mailbox, NOT SPF or DKIM.
    expect(created.createEmailingDomain.status).toBe(
      EmailingDomainStatus.VERIFIED,
    );
    // Produced by UnsubscribeHostnameService.sync falling back to
    // useServerHostname, because no DNS manager is configured. This is the
    // no-DNS-control path a provider-managed mailbox depends on.
    expect(created.createEmailingDomain.unsubscribeHostnameStatus).toBe(
      UnsubscribeHostnameStatus.ACTIVE,
    );
  });

  it('builds the audience and the campaign through the real record API', async () => {
    const person = successful<{ createPerson: { id: string } }>(
      await api(
        tokenA,
        'mutation($data: PersonCreateInput!) { createPerson(data: $data) { id } }',
        {
          data: {
            name: { firstName: 'Ada', lastName: 'Lovelace' },
            emails: { primaryEmail: SENDABLE_ADDRESS },
          },
        },
        '/graphql',
      ),
    );

    personId = person.createPerson.id;

    const opposed = successful<{ createPerson: { id: string } }>(
      await api(
        tokenA,
        'mutation($data: PersonCreateInput!) { createPerson(data: $data) { id } }',
        {
          data: {
            name: { firstName: 'Grace', lastName: 'Hopper' },
            emails: { primaryEmail: OPPOSED_ADDRESS },
          },
        },
        '/graphql',
      ),
    );

    opposedPersonId = opposed.createPerson.id;

    const list = successful<{ createMessageList: { id: string } }>(
      await api(
        tokenA,
        'mutation($data: MessageListCreateInput!) { createMessageList(data: $data) { id } }',
        { data: { name: `${PREFIX}-list` } },
        '/graphql',
      ),
    );

    listId = list.createMessageList.id;

    for (const member of [personId, opposedPersonId]) {
      successful(
        await api(
          tokenA,
          'mutation($data: MessageListMemberCreateInput!) { createMessageListMember(data: $data) { id } }',
          { data: { listId, personId: member } },
          '/graphql',
        ),
      );
    }

    const campaign = successful<{ createMessageCampaign: { id: string } }>(
      await api(
        tokenA,
        'mutation($data: MessageCampaignCreateInput!) { createMessageCampaign(data: $data) { id } }',
        {
          data: {
            name: `${PREFIX}-campaign`,
            status: MessageCampaignStatus.DRAFT,
            subject: `${PREFIX} pour {{fullName}}`,
            bodyTemplate: buildCampaignBody(
              'Bonjour {{fullName}}, voici notre offre.',
            ),
            fromAddress: { primaryEmail: MAILBOX_HANDLE },
            listId,
          },
        },
        '/graphql',
      ),
    );

    campaignId = campaign.createMessageCampaign.id;
    expect(campaignId).toBeDefined();
  });

  it('re-reads the persisted content and sender from PostgreSQL after the write', async () => {
    const reread = successful<{
      messageCampaign: {
        subject: string;
        bodyTemplate: string;
        fromAddress: { primaryEmail: string };
        listId: string;
      };
    }>(
      await api(
        tokenA,
        'query($id: UUID!) { messageCampaign(filter: { id: { eq: $id } }) { subject bodyTemplate fromAddress { primaryEmail } listId } }',
        { id: campaignId },
        '/graphql',
      ),
    );

    expect(reread.messageCampaign.subject).toContain('{{fullName}}');
    expect(reread.messageCampaign.fromAddress.primaryEmail).toBe(
      MAILBOX_HANDLE,
    );
    expect(reread.messageCampaign.listId).toBe(listId);
    // A real serialised document survived the round trip, not prose.
    expect(JSON.parse(reread.messageCampaign.bodyTemplate).type).toBe('doc');
  });

  it('renders a per-recipient preview and emits nothing', async () => {
    const before = await readFixtureMessages();

    const preview = successful<{
      previewMessageCampaignRecipient: {
        personId: string;
        subject: string;
        html: string;
        isRecipientSendable: boolean;
        envelope: { fromAddress: string; senderStatus: string };
      };
    }>(
      await api(
        tokenA,
        'query($input: PreviewMessageCampaignRecipientInput!) { previewMessageCampaignRecipient(input: $input) { personId subject html isRecipientSendable envelope { fromAddress senderStatus } } }',
        { input: { campaignId, personId } },
      ),
    );

    const rendered = preview.previewMessageCampaignRecipient;

    expect(rendered.personId).toBe(personId);
    // The variable substituted server-side for this exact recipient.
    expect(rendered.subject).toContain('Ada Lovelace');
    expect(rendered.subject).not.toContain('{{fullName}}');
    expect(rendered.html).toContain('Ada Lovelace');
    expect(rendered.envelope.fromAddress).toBe(MAILBOX_HANDLE);
    expect(rendered.isRecipientSendable).toBe(true);

    const after = await readFixtureMessages();

    // A preview emits nothing: the isolated server captured no new message.
    expect(after.length).toBe(before.length);
  });

  it('refuses a preview for a person outside the campaign list', async () => {
    denied(
      await api(
        tokenA,
        'query($input: PreviewMessageCampaignRecipientInput!) { previewMessageCampaignRecipient(input: $input) { personId subject } }',
        { input: { campaignId, personId: randomUUID() } },
      ),
    );
  });

  it('sends an explicitly addressed test, captured by the isolated server', async () => {
    const subject = `${PREFIX}-test-send`;

    successful<{ sendMessageCampaignTest: { messageId: string } }>(
      await api(
        tokenA,
        'mutation($input: SendMessageCampaignTestInput!) { sendMessageCampaignTest(input: $input) { messageId } }',
        {
          input: {
            toAddress: TEST_DESTINATION,
            subject,
            body: buildCampaignBody('Bonjour {{fullName}}, test.'),
            fromAddress: MAILBOX_HANDLE,
          },
        },
      ),
    );

    await expectEventually(async () => {
      const captured = await readFixtureMessages();

      const match = captured.find((message) =>
        message.subject.includes(subject),
      );

      expect(match).toBeDefined();
      // It left under the registered mailbox's exact address.
      expect(match?.from).toBe(MAILBOX_HANDLE);
      expect(match?.source.toLowerCase()).toContain('list-unsubscribe');
    });
  });

  it('refuses a sender that merely shares the verified domain', async () => {
    denied(
      await api(
        tokenA,
        'mutation($input: SendMessageCampaignTestInput!) { sendMessageCampaignTest(input: $input) { messageId } }',
        {
          input: {
            toAddress: TEST_DESTINATION,
            subject: `${PREFIX}-intruder`,
            body: buildCampaignBody('Bonjour.'),
            fromAddress: `someone-else@${MAILBOX_DOMAIN}`,
          },
        },
      ),
    );
  });

  it('schedules the campaign and then cancels it', async () => {
    const scheduledAt = new Date(Date.now() + 3_600_000).toISOString();

    successful(
      await api(
        tokenA,
        'mutation($input: SendMessageCampaignInput!) { sendMessageCampaign(input: $input) { campaignId queuedCount } }',
        { input: { campaignId, scheduledAt } },
      ),
    );

    const scheduled = successful<{
      messageCampaign: { status: string; scheduledAt: string | null };
    }>(
      await api(
        tokenA,
        'query($id: UUID!) { messageCampaign(filter: { id: { eq: $id } }) { status scheduledAt } }',
        { id: campaignId },
        '/graphql',
      ),
    );

    expect(scheduled.messageCampaign.status).toBe(
      MessageCampaignStatus.SCHEDULED,
    );
    expect(scheduled.messageCampaign.scheduledAt).not.toBeNull();

    successful(
      await api(
        tokenA,
        'mutation($input: CancelMessageCampaignInput!) { cancelMessageCampaign(input: $input) { campaignId canceledMessageCount } }',
        { input: { campaignId } },
      ),
    );

    const canceled = successful<{ messageCampaign: { status: string } }>(
      await api(
        tokenA,
        'query($id: UUID!) { messageCampaign(filter: { id: { eq: $id } }) { status } }',
        { id: campaignId },
        '/graphql',
      ),
    );

    expect(canceled.messageCampaign.status).toBe(
      MessageCampaignStatus.CANCELED,
    );
  });

  it('keeps a durable opposition out of the audience', async () => {
    const opposedEmail = OPPOSED_ADDRESS;

    successful(
      await api(
        tokenA,
        'mutation($input: CreateMessageSuppressionInput!) { createMessageSuppression(input: $input) { emailAddress } }',
        { input: { emailAddress: opposedEmail } },
      ),
    );

    const audience = successful<{
      previewMessageCampaignAudience: {
        sendable: number;
        globallyUnsubscribed: number;
      };
    }>(
      await api(
        tokenA,
        'query($input: PreviewMessageCampaignAudienceInput!) { previewMessageCampaignAudience(input: $input) { sendable globallyUnsubscribed } }',
        { input: { listId } },
      ),
    );

    expect(
      audience.previewMessageCampaignAudience.globallyUnsubscribed,
    ).toBeGreaterThanOrEqual(1);
    expect(audience.previewMessageCampaignAudience.sendable).toBe(1);
  });

  it('isolates company B from company A campaign and audience', async () => {
    denied(
      await api(
        tokenB,
        'query($input: PreviewMessageCampaignRecipientInput!) { previewMessageCampaignRecipient(input: $input) { personId subject } }',
        { input: { campaignId, personId } },
      ),
    );

    denied(
      await api(
        tokenB,
        'mutation($input: SendMessageCampaignInput!) { sendMessageCampaign(input: $input) { campaignId } }',
        { input: { campaignId } },
      ),
    );

    const crossRead = await api<{ messageCampaign: unknown }>(
      tokenB,
      'query($id: UUID!) { messageCampaign(filter: { id: { eq: $id } }) { id name } }',
      { id: campaignId },
      '/graphql',
    );

    expect(JSON.stringify(crossRead.data ?? null).includes(PREFIX)).toBe(false);
  });

  it('sends immediately on an explicit human action and captures it', async () => {
    const immediate = successful<{
      createMessageCampaign: { id: string };
    }>(
      await api(
        tokenA,
        'mutation($data: MessageCampaignCreateInput!) { createMessageCampaign(data: $data) { id } }',
        {
          data: {
            name: `${PREFIX}-immediate`,
            status: MessageCampaignStatus.DRAFT,
            subject: `${PREFIX}-immediate pour {{fullName}}`,
            bodyTemplate: buildCampaignBody('Bonjour {{fullName}}.'),
            fromAddress: { primaryEmail: MAILBOX_HANDLE },
            listId,
          },
        },
        '/graphql',
      ),
    );

    const immediateCampaignId = immediate.createMessageCampaign.id;

    successful(
      await api(
        tokenA,
        'mutation($input: SendMessageCampaignInput!) { sendMessageCampaign(input: $input) { campaignId queuedCount } }',
        { input: { campaignId: immediateCampaignId } },
      ),
    );

    await expectEventually(
      async () => {
        const captured = await readFixtureMessages();

        const match = captured.find((message) =>
          message.subject.includes(`${PREFIX}-immediate`),
        );

        expect(match).toBeDefined();
        expect(match?.from).toBe(MAILBOX_HANDLE);
        // The subject was substituted for the one sendable recipient.
        expect(match?.subject).toContain('Ada Lovelace');
      },
      { timeoutMs: 120_000, intervalMs: 500 },
    );

    // The opposed recipient must not have been sent to at all.
    const captured = await readFixtureMessages();

    expect(
      captured.filter((message) =>
        message.subject.includes(`${PREFIX}-immediate`),
      ).length,
    ).toBe(1);
    expect(
      captured.some(
        (message) =>
          message.subject.includes(`${PREFIX}-immediate`) &&
          message.to === OPPOSED_ADDRESS,
      ),
    ).toBe(false);
  });

  it('does not resend a delivery quarantined by an uncertain outcome', async () => {
    const dataSource = (
      global as unknown as {
        testDataSource: {
          query: (sql: string, parameters?: unknown[]) => Promise<unknown[]>;
        };
      }
    ).testDataSource;

    const schema = getWorkspaceSchemaName(A);

    // Mark the delivered row as an uncertain outcome. This edits fixture STATE
    // in PostgreSQL; it mocks nothing. The engine's own
    // buildNonQuarantinedCampaignDeliveryCriteria must then refuse to claim it.
    const quarantined = (await dataSource.query(
      `WITH quarantined AS (
         UPDATE "${schema}"."campaignDelivery"
            SET state = 'FAILED', "failureReason" = 'SEND_OUTCOME_UNCONFIRMED'
          WHERE "campaignId" IN (
            SELECT id FROM "${schema}"."messageCampaign" WHERE name LIKE $1
          )
          RETURNING id
       ) SELECT id FROM quarantined`,
      [`${PREFIX}-immediate%`],
    )) as { id: string }[];

    expect(quarantined.length).toBeGreaterThanOrEqual(1);

    const capturedBefore = await readFixtureMessages();

    const countImmediate = (messages: { subject: string }[]) =>
      messages.filter((message) =>
        message.subject.includes(`${PREFIX}-immediate`),
      ).length;

    const [immediateCampaign] = (await dataSource.query(
      `SELECT id FROM "${schema}"."messageCampaign" WHERE name LIKE $1 LIMIT 1`,
      [`${PREFIX}-immediate%`],
    )) as { id: string }[];

    expect(immediateCampaign).toBeDefined();

    // Asking again must not produce a second message for that recipient.
    await api(
      tokenA,
      'mutation($input: SendMessageCampaignInput!) { sendMessageCampaign(input: $input) { campaignId queuedCount } }',
      { input: { campaignId: immediateCampaign.id } },
    );

    const capturedAfter = await readFixtureMessages();

    expect(countImmediate(capturedAfter)).toBe(countImmediate(capturedBefore));

    const stillQuarantined = (await dataSource.query(
      `SELECT "failureReason" FROM "${schema}"."campaignDelivery" WHERE id = $1`,
      [quarantined[0].id],
    )) as { failureReason: string }[];

    expect(stillQuarantined[0].failureReason).toBe('SEND_OUTCOME_UNCONFIRMED');
  });
});
