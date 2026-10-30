import { type INestApplication, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { type AddressInfo } from 'node:net';

import { HermesIntakeController } from 'src/engine/core-modules/hermes-prospection/intake/hermes-intake.controller';
import { HermesIntakeReplayService } from 'src/engine/core-modules/hermes-prospection/intake/hermes-intake-replay.service';
import { HermesIntakeService } from 'src/engine/core-modules/hermes-prospection/intake/hermes-intake.service';
import { HermesProspectionService } from 'src/engine/core-modules/hermes-prospection/hermes-prospection.service';
import { type HermesProspectionState } from 'src/engine/core-modules/hermes-prospection/types/hermes-prospection.types';
import { emptyHermesProspectionState } from 'src/engine/core-modules/hermes-prospection/utils/hermes-import-policy';
import { KovaaLabCRMConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';

jest.mock(
  'src/engine/core-modules/twenty-config/twenty-config.service',
  () => ({ KovaaLabCRMConfigService: class {} }),
);

const A = randomUUID();
const B = randomUUID();
const connectionA = randomUUID();
const connectionB = randomUUID();
const userA = randomUUID();
const userB = randomUUID();
const membershipA = randomUUID();
const membershipB = randomUUID();
const secretA = randomBytes(32).toString('hex');
const secretB = randomBytes(32).toString('hex');
const input = () => ({
  externalBatchId: randomUUID(),
  name: 'Synthetic scrape',
  sourceUrl: 'https://example.test/directory',
  collectedAt: new Date().toISOString(),
  rows: [{ email: 'person@example.test', companyName: 'Synthetic company' }],
});

// The HTTP listener is real; persistence/authority are isolated native-service
// fixtures. No SQL connection, operator secret or remote service is used.
describe('Hermes automatic intake — signed real loopback HTTP', () => {
  let app: INestApplication;
  let origin: string;
  const states = new Map<string, HermesProspectionState>();
  const blocked = new Map<string, Set<string>>();
  const nonces = new Set<string>();
  const revoked = new Set<string>();
  let transactionTail = Promise.resolve();
  const stageCalls = jest.fn();
  const claim = jest.fn(async (connectionId: string, nonce: string) => {
    const key = `${connectionId}:${nonce}`;
    if (nonces.has(key)) return 'replayed';
    nonces.add(key);
    return 'claimed';
  });
  let serialized = '';

  const post = async (
    body: object,
    options: {
      connectionId?: string;
      secret?: string;
      nonce?: string;
      timestamp?: string;
      tamper?: boolean;
      missingSignature?: boolean;
    } = {},
  ) => {
    const id = options.connectionId ?? connectionA;
    const nonce = options.nonce ?? randomUUID();
    const timestamp =
      options.timestamp ?? String(Math.floor(Date.now() / 1000));
    const raw = JSON.stringify(body);
    const signature = createHmac(
      'sha256',
      Buffer.from(options.secret ?? secretA, 'hex'),
    )
      .update(`v1\n${id}\n${timestamp}\n${nonce}\n`)
      .update(raw)
      .digest('hex');
    return fetch(`${origin}/webhooks/hermes/intake/${id}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-hermes-timestamp': timestamp,
        'x-hermes-nonce': nonce,
        ...(options.missingSignature
          ? {}
          : { 'x-hermes-signature': `v1=${signature}` }),
      },
      body: options.tamper ? `${raw} ` : raw,
    });
  };

  beforeAll(async () => {
    jest.useRealTimers();
    serialized = JSON.stringify({
      [connectionA]: {
        workspaceId: A,
        operatorUserId: userA,
        operatorUserWorkspaceId: membershipA,
        secret: secretA,
      },
      [connectionB]: {
        workspaceId: B,
        operatorUserId: userB,
        operatorUserWorkspaceId: membershipB,
        secret: secretB,
      },
    });
    const native = new HermesProspectionService(
      {
        mutate: async <T>(
          actor: {
            workspaceId: string;
            userId: string;
            userWorkspaceId: string;
          },
          operation: (state: HermesProspectionState) => Promise<T>,
        ) => {
          const run = transactionTail.then(async () => {
            stageCalls(actor);
            if (revoked.has(actor.userId))
              throw new ForbiddenException('PROSPECTION_ACCESS_DENIED');
            const expected =
              actor.workspaceId === A
                ? [userA, membershipA]
                : [userB, membershipB];
            if (
              actor.userId !== expected[0] ||
              actor.userWorkspaceId !== expected[1]
            )
              throw new ForbiddenException();
            const state =
              states.get(actor.workspaceId) ?? emptyHermesProspectionState();
            const result = await operation(state);
            states.set(actor.workspaceId, state);
            return result;
          });
          transactionTail = run.then(
            () => undefined,
            () => undefined,
          );
          return run;
        },
      } as unknown as ConstructorParameters<typeof HermesProspectionService>[0],
      {
        findApplicableSuppressions: async ({
          workspaceId,
          emailAddresses,
        }: {
          workspaceId: string;
          emailAddresses: string[];
        }) =>
          emailAddresses
            .filter((email) => blocked.get(workspaceId)?.has(email))
            .map((emailAddress) => ({ emailAddress, reason: 'UNSUBSCRIBE' })),
      } as unknown as ConstructorParameters<typeof HermesProspectionService>[1],
      {} as ConstructorParameters<typeof HermesProspectionService>[2],
      {} as ConstructorParameters<typeof HermesProspectionService>[3],
    );
    const module = await Test.createTestingModule({
      controllers: [HermesIntakeController],
      providers: [
        HermesIntakeService,
        {
          provide: KovaaLabCRMConfigService,
          useValue: { get: () => serialized },
        },
        { provide: HermesIntakeReplayService, useValue: { claim } },
        { provide: HermesProspectionService, useValue: native },
      ],
    }).compile();
    app = module.createNestApplication({ rawBody: true });
    app.useLogger(false);
    await app.listen(0, '127.0.0.1');
    origin = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
  });
  afterAll(async () => {
    await app?.close();
  });
  beforeEach(() => {
    stageCalls.mockClear();
    claim.mockClear();
  });

  it('accepts a signed batch, returns a persisted staging receipt and never qualifies it', async () => {
    const body = input();
    const response = await post(body);
    expect(response.status).toBe(200);
    const receipt = await response.json();
    expect(receipt).toMatchObject({
      replay: false,
      rowCount: 1,
      intakeConnectionId: connectionA,
      qualificationRequired: true,
    });
    const batch = states
      .get(A)
      ?.batches.find((item) => item.id === receipt.batchId);
    expect(batch?.externalBatchId).toBe(
      `${connectionA}:${body.externalBatchId}`,
    );
    expect(batch?.createdByUserId).toBe(userA);
    expect(batch?.rows[0].status).toBe('pending');
    expect(batch?.rows[0].personId).toBeUndefined();
  });

  it('rejects missing/invalid/tampered/expired signatures before any staging or replay-cache call', async () => {
    for (const options of [
      { missingSignature: true },
      { tamper: true },
      { secret: secretB },
      { timestamp: String(Math.floor(Date.now() / 1000) - 301) },
      { timestamp: String(Math.floor(Date.now() / 1000) + 301) },
    ])
      expect((await post(input(), options)).status).toBe(401);
    expect(stageCalls).not.toHaveBeenCalled();
    expect(claim).not.toHaveBeenCalled();
  });

  it('refuses signed workspace/operator overrides and unknown fields in the body', async () => {
    for (const addition of [
      { workspaceId: B },
      { operatorUserId: userB },
      { qualify: true },
    ])
      expect((await post({ ...input(), ...addition })).status).toBe(400);
    expect(stageCalls).not.toHaveBeenCalled();
  });

  it('keeps equal external IDs isolated across server-bound A/B connections', async () => {
    const body = input();
    expect((await post(body)).status).toBe(200);
    expect(
      (await post(body, { connectionId: connectionB, secret: secretB })).status,
    ).toBe(200);
    expect(
      states
        .get(A)
        ?.batches.some(
          (batch) =>
            batch.externalBatchId === `${connectionA}:${body.externalBatchId}`,
        ),
    ).toBe(true);
    expect(
      states
        .get(B)
        ?.batches.some(
          (batch) =>
            batch.externalBatchId === `${connectionB}:${body.externalBatchId}`,
        ),
    ).toBe(true);
    expect(
      (await post(body, { connectionId: connectionB, secret: secretA })).status,
    ).toBe(401);
  });

  it('rejects exact signed request replay, but a fresh signed retry returns the same batch ID', async () => {
    const body = input();
    const nonce = randomUUID();
    const first = await (await post(body, { nonce })).json();
    expect((await post(body, { nonce })).status).toBe(409);
    const retried = await (await post(body)).json();
    expect(retried).toMatchObject({ batchId: first.batchId, replay: true });
  });

  it('handles concurrent network retries idempotently through the native staging operation', async () => {
    const body = input();
    const responses = await Promise.all(
      Array.from({ length: 5 }, () => post(body)),
    );
    const receipts = await Promise.all(
      responses.map((response) => response.json()),
    );
    expect(responses.every((response) => response.status === 200)).toBe(true);
    expect(new Set(receipts.map((receipt) => receipt.batchId)).size).toBe(1);
    expect(receipts.filter((receipt) => !receipt.replay)).toHaveLength(1);
  });

  it('preserves native opposition across automatic reimport and keeps malformed rows invalid', async () => {
    blocked.set(A, new Set(['person@example.test']));
    const body = input();
    body.rows.push({ email: '', companyName: '' });
    const receipt = await (await post(body)).json();
    const batch = states
      .get(A)
      ?.batches.find((item) => item.id === receipt.batchId);
    expect(batch?.rows.map((row) => row.status)).toEqual([
      'suppressed',
      'invalid',
    ]);
    blocked.delete(A);
  });

  it('fails closed after delegated operator revocation, without creating a new batch', async () => {
    const before = states.get(A)?.batches.length;
    revoked.add(userA);
    expect((await post(input())).status).toBe(403);
    expect(states.get(A)?.batches.length).toBe(before);
    revoked.delete(userA);
  });

  it('rejects more than 100 rows and overlong IDs before calling native staging', async () => {
    const body = input();
    expect(
      (
        await post({
          ...body,
          rows: Array.from({ length: 101 }, () => body.rows[0]),
        })
      ).status,
    ).toBe(400);
    expect(
      (await post({ ...body, externalBatchId: 'x'.repeat(92) })).status,
    ).toBe(400);
    expect(stageCalls).not.toHaveBeenCalled();
  });
});
