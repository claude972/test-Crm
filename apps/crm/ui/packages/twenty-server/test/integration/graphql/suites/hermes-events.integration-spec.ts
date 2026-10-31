import assert from 'node:assert/strict';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';

import request from 'supertest';
import { In } from 'typeorm';

import { getAppProviderByClassName as provider } from 'test/integration/utils/get-app-provider-by-class-name.util';
import { getCoreRepository } from 'test/integration/utils/get-core-repository.util';
import { hashPassword } from 'src/engine/core-modules/auth/auth.util';
import { type AccessTokenService } from 'src/engine/core-modules/auth/token/services/access-token.service';
import { type HermesConnectionsService } from 'src/engine/core-modules/hermes-connections/hermes-connections.service';
import { type KovaaLabCRMConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { UserEntity } from 'src/engine/core-modules/user/user.entity';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { type UserWorkspaceService } from 'src/engine/core-modules/user-workspace/user-workspace.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthProviderEnum } from 'src/engine/core-modules/workspace/types/workspace.type';
import { type RoleService } from 'src/engine/metadata-modules/role/role.service';
import { type WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import {
  SEED_APPLE_WORKSPACE_ID,
  SEED_YCOMBINATOR_WORKSPACE_ID,
} from 'src/engine/workspace-manager/dev-seeder/core/constants/seeder-workspaces.constant';
import { STANDARD_ROLE } from 'src/engine/workspace-manager/twenty-standard-application/constants/standard-role.constant';
import { type PersonWorkspaceEntity } from 'src/modules/person/standard-objects/person.workspace-entity';
import { type NoteWorkspaceEntity } from 'src/modules/note/standard-objects/note.workspace-entity';
import { type NoteTargetWorkspaceEntity } from 'src/modules/note/standard-objects/note-target.workspace-entity';
import { type CalendarEventWorkspaceEntity } from 'src/modules/calendar/common/standard-objects/calendar-event.workspace-entity';
import { type CalendarEventTargetWorkspaceEntity } from 'src/modules/calendar/common/standard-objects/calendar-event-target.workspace-entity';

// The CI wrapper must enforce this before native globalSetup resets anything.
assert.equal(process.env.GITHUB_ACTIONS, 'true', 'Disposable CI only');
const database = new URL(process.env.PG_DATABASE_URL ?? '');
assert.ok(['postgres:', 'postgresql:'].includes(database.protocol));
assert.equal(database.hostname, '127.0.0.1');
assert.equal(database.port, '5432');
assert.equal(database.pathname, '/p0_ci');
assert.equal(database.search, '');

const A = SEED_APPLE_WORKSPACE_ID;
const B = SEED_YCOMBINATOR_WORKSPACE_ID;
const PREFIX = `hermes-events-${randomUUID().slice(0, 8)}`;
// Assigned in beforeAll from the connection ids the central service mints.
let connectionA = '';
let connectionB = '';
const secretA = randomBytes(32).toString('hex');
const secretB = randomBytes(32).toString('hex');
const receivedAt = '2026-10-30T12:00:00.000Z';
type Fixture = {
  user: UserEntity;
  membership: UserWorkspaceEntity;
  token: string;
  roleId: string;
};
type Receipt = {
  personId: string;
  noteId: string;
  calendarEventId: string | null;
  replay: boolean;
  marketingConsentGranted: boolean;
};

const forms = () => ({
  version: 'hermes-bridge-v1',
  provider: 'HEYFORM',
  eventId: `${PREFIX}-form`,
  occurredAt: receivedAt,
  contact: {
    email: `${PREFIX}-form@example.test`,
    companyName: `${PREFIX} company`,
    firstName: 'Synthetic',
    lastName: 'Request',
  },
  event: {
    type: 'SUBMISSION_RECEIVED',
    formId: `${PREFIX}-form-id`,
    formName: 'Synthetic contact form',
    summary: 'Synthetic B2B incoming request, no marketing consent.',
  },
});
const calendar = () => ({
  version: 'hermes-bridge-v1',
  provider: 'CAL_DIY',
  eventId: `${PREFIX}-booking-created`,
  occurredAt: receivedAt,
  contact: {
    email: `${PREFIX}-booking@example.test`,
    companyName: `${PREFIX} booking company`,
    firstName: 'Synthetic',
    lastName: 'Booking',
  },
  event: {
    type: 'BOOKING_CREATED',
    bookingUid: `${PREFIX}-booking-uid`,
    status: 'ACCEPTED',
    title: 'Synthetic appointment',
    startsAt: '2026-11-01T12:00:00.000Z',
    endsAt: '2026-11-01T13:00:00.000Z',
    location: '',
  },
});
const post = async (
  kind: 'forms' | 'calendar',
  body: object,
  workspaceId = A,
  wrongKey = false,
) => {
  const connectionId = workspaceId === A ? connectionA : connectionB;
  const secret = wrongKey
    ? randomBytes(32).toString('hex')
    : workspaceId === A
      ? secretA
      : secretB;
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = randomUUID();
  const raw = JSON.stringify(body);
  const signature = createHmac('sha256', Buffer.from(secret, 'hex'))
    .update(`v1\n${connectionId}\n${timestamp}\n${nonce}\n`)
    .update(raw)
    .digest('hex');
  return request(`http://127.0.0.1:${APP_PORT}`)
    .post(`/webhooks/hermes/${kind}/${connectionId}`)
    .set('Content-Type', 'application/json')
    .set('x-hermes-timestamp', timestamp)
    .set('x-hermes-nonce', nonce)
    .set('x-hermes-signature', `v1=${signature}`)
    .send(raw);
};

// Real HTTP controller/HMAC/Redis, fresh DB authorization, native PostgreSQL
// repositories and transactions. No provider, mailbox, campaign or send call.
describe('Hermes Forms/Cal — native signed HTTP and PostgreSQL', () => {
  const fixtures = new Map<string, Fixture>();
  const ids = new Map<string, Map<string, Set<string>>>();
  // workspaceId -> revision of the INTAKE connection this suite registered.
  const registrations = new Map<string, number>();
  // The same unrestricted workspace administrator the endpoint is owned by.
  const operator = (workspaceId: string) => {
    const fixture = fixtures.get(workspaceId);
    assert.ok(fixture);
    return {
      workspaceId,
      userId: fixture.user.id,
      userWorkspaceId: fixture.membership.id,
    };
  };
  const remember = (
    workspaceId: string,
    name: string,
    id: string | null | undefined,
  ) => {
    if (!id) return;
    const workspaceIds = ids.get(workspaceId) ?? new Map<string, Set<string>>();
    ids.set(workspaceId, workspaceIds);
    const values = workspaceIds.get(name) ?? new Set<string>();
    workspaceIds.set(name, values);
    values.add(id);
  };
  const inspect = async <T>(
    workspaceId: string,
    work: (
      manager: WorkspaceOrmManager,
      permissions: { intersectionOf: { userWorkspaceRoleId: string } },
    ) => Promise<T>,
  ) => {
    const manager = provider<WorkspaceOrmManager>('WorkspaceOrmManager');
    const fixture = fixtures.get(workspaceId);
    assert.ok(fixture);
    return manager.executeInWorkspaceContext(
      () =>
        work(manager, {
          intersectionOf: { userWorkspaceRoleId: fixture.roleId },
        }),
      buildSystemAuthContext(workspaceId),
    );
  };
  const receipt = async (workspaceId: string, value: unknown) => {
    const result = value as Receipt;
    assert.ok(result.personId && result.noteId);
    remember(workspaceId, 'person', result.personId);
    remember(workspaceId, 'note', result.noteId);
    remember(workspaceId, 'calendarEvent', result.calendarEventId);
    await inspect(workspaceId, async (manager, permissions) => {
      const person = await manager
        .getRepository<PersonWorkspaceEntity>('person', permissions)
        .findOne({ where: { id: result.personId } });
      assert.ok(person);
      remember(workspaceId, 'company', person.companyId);
    });
    return result;
  };
  beforeAll(async () => {
    const config = provider<KovaaLabCRMConfigService>(
      'KovaaLabCRMConfigService',
    );
    assert.equal(
      config.get('EMAILING_DOMAIN_DRIVER'),
      'LOG',
      'No external emailing provider permitted',
    );
    for (const workspaceId of [A, B]) {
      const role = await provider<RoleService>(
        'RoleService',
      ).getRoleByUniversalIdentifier({
        workspaceId,
        universalIdentifier: STANDARD_ROLE.admin.universalIdentifier,
      });
      assert.ok(role);
      const user = await getCoreRepository<UserEntity>(UserEntity).save({
        id: randomUUID(),
        email: `${PREFIX}-${workspaceId}@example.test`,
        firstName: 'Synthetic',
        lastName: 'Events administrator',
        locale: 'en',
        passwordHash: await hashPassword(randomBytes(24).toString('base64url')),
        isEmailVerified: true,
        disabled: false,
        canAccessFullAdminPanel: false,
        canImpersonate: false,
      });
      const workspace = await getCoreRepository<WorkspaceEntity>(
        WorkspaceEntity,
      ).findOneByOrFail({ id: workspaceId });
      await provider<UserWorkspaceService>(
        'UserWorkspaceService',
      ).addUserToWorkspaceIfUserNotInWorkspace(user, workspace, role.id);
      const membership = await getCoreRepository<UserWorkspaceEntity>(
        UserWorkspaceEntity,
      ).findOneByOrFail({ userId: user.id, workspaceId });
      const token = await provider<AccessTokenService>(
        'AccessTokenService',
      ).generateAccessToken({
        userId: user.id,
        workspaceId,
        authProvider: AuthProviderEnum.Password,
      });
      fixtures.set(workspaceId, {
        user,
        membership,
        token: token.token,
        roleId: role.id,
      });
    }
    // The central connections service is the only registry the signed intake
    // guard consults: centralIntake resolves by connectionId through it and
    // has no environment fallback. So register the INTAKE endpoint for A and
    // B here, with its HMAC secret, exactly as an operator would, and take
    // the connection id the service mints rather than inventing one.
    const connections = provider<HermesConnectionsService>(
      'HermesConnectionsService',
    );
    const register = async (workspaceId: string, secret: string) => {
      const actor = operator(workspaceId);
      const current = (await connections.list(actor)).find(
        (connection) => connection.kind === 'INTAKE',
      );
      const view = await connections.save(actor, {
        kind: 'INTAKE',
        expectedRevision: current?.revision ?? 0,
        settings: {
          allowedSources: ['FORMS', 'CALENDAR'],
          // The previous env-only fixture omitted this and inherited the
          // schema default; keep that exact budget, do not widen it.
          maxRequestsPerMinute: 10,
        },
        secrets: { secret },
      });
      const { connectionId } = view;
      assert.ok(
        connectionId,
        'Lot D must register the INTAKE endpoint for this workspace',
      );
      assert.equal(view.state, 'CONFIGURED_UNVERIFIED');
      assert.deepEqual(view.secretFields, ['secret']);
      registrations.set(workspaceId, view.revision);
      return connectionId;
    };
    connectionA = await register(A, secretA);
    connectionB = await register(B, secretB);
    assert.notEqual(connectionA, connectionB);
  }, 180_000);
  afterAll(async () => {
    for (const [workspaceId, fixture] of fixtures) {
      // Restore this synthetic actor before cleanup if the negative test failed.
      await getCoreRepository<UserEntity>(UserEntity).update(fixture.user.id, {
        disabled: false,
      });
      // Withdraw the INTAKE registration while this operator can still act:
      // remove() re-checks access, and the membership is deleted just below.
      const revision = registrations.get(workspaceId);
      if (revision !== undefined)
        await provider<HermesConnectionsService>(
          'HermesConnectionsService',
        ).remove(operator(workspaceId), {
          kind: 'INTAKE',
          expectedRevision: revision,
        });
      await inspect(workspaceId, async (manager, permissions) => {
        const noteIds = [...(ids.get(workspaceId)?.get('note') ?? [])];
        const calendarIds = [
          ...(ids.get(workspaceId)?.get('calendarEvent') ?? []),
        ];
        if (noteIds.length)
          await manager
            .getRepository('noteTarget', permissions)
            .delete({ noteId: In(noteIds) });
        if (calendarIds.length)
          await manager
            .getRepository('calendarEventTarget', permissions)
            .delete({ calendarEventId: In(calendarIds) });
        for (const name of ['note', 'calendarEvent', 'person', 'company']) {
          const generated = [...(ids.get(workspaceId)?.get(name) ?? [])];
          if (generated.length)
            await manager
              .getRepository(name, permissions)
              .delete({ id: In(generated) });
        }
      });
      await provider<UserWorkspaceService>(
        'UserWorkspaceService',
      ).deleteUserWorkspace({
        workspaceId,
        userWorkspaceId: fixture.membership.id,
      });
      await inspect(workspaceId, async (manager, permissions) => {
        await manager
          .getRepository('workspaceMember', permissions)
          .delete({ userId: fixture.user.id });
      });
      await getCoreRepository<UserEntity>(UserEntity).delete({
        id: fixture.user.id,
      });
    }
  }, 180_000);

  it('persists Forms contact/company/Note targets, deduplicates and isolates A/B with native status metadata', async () => {
    const payload = forms();
    const responseA = await post('forms', payload);
    expect(responseA.status).toBe(200);
    const a = await receipt(A, responseA.body);
    const responseB = await post('forms', payload, B);
    expect(responseB.status).toBe(200);
    const b = await receipt(B, responseB.body);
    expect(a.personId).not.toBe(b.personId);
    expect(a.noteId).not.toBe(b.noteId);
    const replay = await post('forms', payload);
    expect(replay.status).toBe(200);
    expect(replay.body).toEqual({ ...a, replay: true });
    await inspect(A, async (manager, permissions) => {
      const notes = manager.getRepository<NoteWorkspaceEntity>(
        'note',
        permissions,
      );
      const note = await notes.findOne({ where: { id: a.noteId } });
      expect(note?.bodyV2?.markdown).toContain('Source: HEYFORM');
      const targets = await manager
        .getRepository<NoteTargetWorkspaceEntity>('noteTarget', permissions)
        .find({ where: { noteId: a.noteId } });
      expect(targets).toHaveLength(1);
      expect(targets[0]).toMatchObject({ targetPersonId: a.personId });
      expect(targets[0].targetCompanyId).toBeTruthy();
      expect(
        await manager
          .getRepository<PersonWorkspaceEntity>('person', permissions)
          .findOne({ where: { id: b.personId } }),
      ).toBeNull();
    });
    expect((await post('forms', { ...payload, workspaceId: B })).status).toBe(
      400,
    );
    expect((await post('forms', payload, A, true)).status).toBe(401);
    const status = await request(`http://127.0.0.1:${APP_PORT}`)
      .post('/metadata')
      .set('Authorization', `Bearer ${fixtures.get(A)!.token}`)
      .send({
        query:
          'query { hermesIntakeState { status endpoints { connectionId structureId isAccepting sources { source } } } }',
      });
    expect(status.status).toBe(200);
    expect(status.body.errors).toBeUndefined();
    expect(
      status.body.data.hermesIntakeState.endpoints.map(
        (endpoint: { connectionId: string }) => endpoint.connectionId,
      ),
    ).toEqual([connectionA]);
    expect(JSON.stringify(status.body).includes(secretA)).toBe(false);
    expect(JSON.stringify(status.body).includes(secretB)).toBe(false);
    expect(a.marketingConsentGranted).toBe(false);
  });

  it('persists booking/reschedule/cancellation in the same native event and rejects stale or revoked updates', async () => {
    const payload = calendar();
    const response = await post('calendar', payload);
    expect(response.status).toBe(200);
    const initial = await receipt(A, response.body);
    const moved = {
      ...payload,
      eventId: `${PREFIX}-booking-moved`,
      occurredAt: '2026-10-30T12:01:00.000Z',
      event: {
        ...payload.event,
        type: 'BOOKING_RESCHEDULED',
        startsAt: '2026-11-02T12:00:00.000Z',
        endsAt: '2026-11-02T13:00:00.000Z',
      },
    };
    const movedResponse = await post('calendar', moved);
    expect(movedResponse.status).toBe(200);
    const rescheduled = await receipt(A, movedResponse.body);
    expect(rescheduled.calendarEventId).toBe(initial.calendarEventId);
    const cancelled = {
      ...moved,
      eventId: `${PREFIX}-booking-cancelled`,
      occurredAt: '2026-10-30T12:02:00.000Z',
      event: { ...moved.event, type: 'BOOKING_CANCELLED', status: 'CANCELLED' },
    };
    const cancelledResponse = await post('calendar', cancelled);
    expect(cancelledResponse.status).toBe(200);
    await receipt(A, cancelledResponse.body);
    await inspect(A, async (manager, permissions) => {
      const saved = await manager
        .getRepository<CalendarEventWorkspaceEntity>(
          'calendarEvent',
          permissions,
        )
        .findOne({ where: { id: initial.calendarEventId! } });
      expect(saved).toMatchObject({ isCanceled: true });
      expect(Date.parse(saved!.startsAt!)).toBe(
        Date.parse(moved.event.startsAt),
      );
      const targets = await manager
        .getRepository<CalendarEventTargetWorkspaceEntity>(
          'calendarEventTarget',
          permissions,
        )
        .find({ where: { calendarEventId: initial.calendarEventId! } });
      expect(targets).toHaveLength(1);
      expect(targets[0]).toMatchObject({ targetPersonId: initial.personId });
      expect(targets[0].targetCompanyId).toBeTruthy();
    });
    expect(
      (await post('calendar', { ...moved, eventId: `${PREFIX}-stale` })).status,
    ).toBe(409);
    expect(
      (
        await post('calendar', {
          ...payload,
          eventId: `${PREFIX}-pending`,
          event: { ...payload.event, status: 'PENDING' },
        })
      ).status,
    ).toBe(400);
    await getCoreRepository<UserEntity>(UserEntity).update(
      fixtures.get(A)!.user.id,
      { disabled: true },
    );
    try {
      expect(
        (await post('calendar', { ...cancelled, eventId: `${PREFIX}-revoked` }))
          .status,
      ).toBe(403);
    } finally {
      await getCoreRepository<UserEntity>(UserEntity).update(
        fixtures.get(A)!.user.id,
        { disabled: false },
      );
    }
  });
});
