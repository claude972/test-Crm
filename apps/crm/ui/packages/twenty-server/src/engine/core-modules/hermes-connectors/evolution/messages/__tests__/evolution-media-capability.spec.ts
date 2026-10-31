import { createServer, type Server } from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';

import { EvolutionMessagesAdapter } from '../evolution-messages.adapter';
import {
  EVOLUTION_INGRESS_PATH,
  EVOLUTION_INGRESS_TOKEN_HEADER,
  EVOLUTION_UPSERT_EVENT,
  judgeEvolutionReception,
  judgeEvolutionVoice,
  readEvolutionIngressOrigins,
  readEvolutionIngressToken,
} from '../evolution-media-capability';

// A DEMONSTRATION PROVIDER, NOT A VERIFIED CONNECTOR.
//
// The listener below is a few lines of this test file answering on loopback. It
// is not Evolution, it proves nothing about a real instance, and a green run
// here is not provider access: it exercises our side of the wire against the
// shapes pinned at commit 3454bec79f514995df9a5ea36a3554ab35cf1c82. Host-side
// audio conversion and a real reception are deliberately out of its reach and
// remain unproven until an authorized instance is exercised.
const workspaceId = randomUUID();
const connectionId = randomUUID();
const instanceName = 'fixture-capability';
// This deployment's configured public origin, and the delivery token our
// ingress authenticates. The secret is a fixture value generated per test run
// and never appears in any assertion output.
const ingressOrigin = 'https://crm.example.test';
let webhookSecret = '';
const matchesIngressToken = (value: string) => value === webhookSecret;

let server: Server;
let requests: { method: string; path: string; key?: string }[];
let version: string;
let baseUrl = '';
let apiKey = '';
let state: 'open' | 'close' | 'connecting';
let webhook: unknown;
let webhookStatus: number;

const connection = () => ({ baseUrl, instanceName, apiKey });

const adapter = (
  overrides: {
    ingressConnectionId?: string | null;
    ingressOrigins?: readonly (string | null | undefined)[];
    matchesIngressToken?: ((value: string) => boolean) | null;
  } = {},
) =>
  new EvolutionMessagesAdapter(
    JSON.stringify({ [workspaceId]: connection() }),
    {
      allowedInternalHosts: ['127.0.0.1'],
      timeoutMs: 500,
      ingressConnectionId:
        'ingressConnectionId' in overrides
          ? overrides.ingressConnectionId
          : connectionId,
      ingressOrigins:
        'ingressOrigins' in overrides
          ? overrides.ingressOrigins
          : [ingressOrigin],
      matchesIngressToken:
        'matchesIngressToken' in overrides
          ? overrides.matchesIngressToken
          : matchesIngressToken,
    },
  );

// What the provider stores once an operator has pointed this instance at our
// connection-scoped ingress and subscribed the upsert event.
const configuredWebhook = (overrides: Record<string, unknown> = {}) => ({
  id: 'fixture-row',
  instanceId: 'fixture-instance',
  enabled: true,
  url: `${ingressOrigin}${EVOLUTION_INGRESS_PATH}/${connectionId}`,
  events: ['CONNECTION_UPDATE', EVOLUTION_UPSERT_EVENT],
  headers: { [EVOLUTION_INGRESS_TOKEN_HEADER]: webhookSecret },
  webhookBase64: false,
  webhookByEvents: false,
  ...overrides,
});

beforeEach(async () => {
  requests = [];
  version = '2.3.6';
  state = 'open';
  webhookSecret = randomBytes(32).toString('hex');
  webhook = configuredWebhook();
  webhookStatus = 200;
  apiKey = randomBytes(32).toString('hex');
  server = createServer(async (req, res) => {
    for await (const chunk of req) void chunk;
    requests.push({
      method: req.method ?? '',
      path: req.url ?? '',
      key: req.headers.apikey as string,
    });
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/') return res.end(JSON.stringify({ version }));
    if (req.url === `/instance/connectionState/${instanceName}`)
      return res.end(JSON.stringify({ instance: { instanceName, state } }));
    if (req.url === `/webhook/find/${instanceName}`) {
      res.statusCode = webhookStatus;
      return res.end(JSON.stringify(webhook));
    }
    res.statusCode = 404;
    res.end('{}');
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string')
    throw Error('Fixture address missing');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterEach(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('Evolution media capabilities, derived from a demonstration provider', () => {
  it('opens reception only when the instance itself reports our scoped ingress and the upsert event', async () => {
    const probe = await adapter().probe(workspaceId);

    expect(probe).toEqual({
      status: 'AVAILABLE',
      canSendMedia: true,
      canReceiveMedia: true,
      canRecordVoice: true,
    });
    // Reading a capability must never write one, and must never touch a send
    // route: asking the question cannot emit a WhatsApp message.
    expect(
      requests.map((request) => `${request.method} ${request.path}`),
    ).toEqual([
      `GET /instance/connectionState/${instanceName}`,
      'GET /',
      `GET /webhook/find/${instanceName}`,
    ]);
    expect(requests.every((request) => request.key === apiKey)).toBe(true);
    expect(requests.some((request) => request.method !== 'GET')).toBe(false);
  });

  it('answers false on every capability when nothing is configured for the workspace', async () => {
    const foreign = new EvolutionMessagesAdapter(
      JSON.stringify({ [randomUUID()]: connection() }),
      { allowedInternalHosts: ['127.0.0.1'], timeoutMs: 500 },
    );

    expect(await foreign.probe(workspaceId)).toEqual({
      status: 'NOT_CONFIGURED',
    });
    expect(requests).toHaveLength(0);
  });

  it('keeps every media capability false on a build that is not the pinned 2.3.6', async () => {
    version = '2.4.0';

    const probe = await adapter().probe(workspaceId);

    expect(probe).toEqual({
      status: 'AVAILABLE',
      canSendMedia: false,
      canReceiveMedia: false,
      canRecordVoice: false,
    });
    // A disqualified build is not interrogated further.
    expect(
      requests.some((request) => request.path.startsWith('/webhook/find')),
    ).toBe(false);
  });

  it('keeps media closed while the socket is not open, without asking a media question', async () => {
    state = 'connecting';

    const probe = await adapter().probe(workspaceId);

    expect(probe).toMatchObject({ status: 'UNAVAILABLE' });
    expect(probe.canReceiveMedia).toBeUndefined();
    expect(probe.canRecordVoice).toBeUndefined();
    expect(requests).toHaveLength(1);
  });

  it('reports a precise reason for each way reception is not configured', async () => {
    const cases: [unknown, string][] = [
      [configuredWebhook({ enabled: false }), 'WEBHOOK_DISABLED'],
      [
        configuredWebhook({ events: ['CONNECTION_UPDATE'] }),
        'WEBHOOK_EVENT_NOT_SUBSCRIBED',
      ],
      [
        configuredWebhook({ url: 'https://someone-else.example.test/hook' }),
        'WEBHOOK_URL_NOT_THIS_INGRESS',
      ],
      // Our ingress refuses an unscoped delivery, so the bare path can never
      // receive anything.
      [
        configuredWebhook({
          url: `https://crm.example.test${EVOLUTION_INGRESS_PATH}`,
        }),
        'WEBHOOK_URL_NOT_THIS_INGRESS',
      ],
      // Another connection's ingress is not this connection's.
      [
        configuredWebhook({
          url: `https://crm.example.test${EVOLUTION_INGRESS_PATH}/${randomUUID()}`,
        }),
        'WEBHOOK_URL_NOT_THIS_INGRESS',
      ],
      [null, 'WEBHOOK_NOT_CONFIGURED'],
    ];

    for (const [row, reason] of cases) {
      webhook = row;

      const capability = await adapter().mediaCapability(workspaceId);

      expect(capability.receptionReason).toBe(reason);
      expect(capability.canReceiveMedia).toBe(false);
      // Reception and sending are separate questions with separate answers.
      expect(capability.canSendMedia).toBe(true);
    }
  });

  it('treats an unreadable webhook read as unproven rather than as configured', async () => {
    webhookStatus = 500;

    const capability = await adapter().mediaCapability(workspaceId);

    expect(capability).toMatchObject({
      canReceiveMedia: false,
      receptionReason: 'WEBHOOK_NOT_READABLE',
    });
  });

  it('cannot attribute a delivery without a connection identity, so reception stays false', async () => {
    const capability = await adapter({ ingressConnectionId: null }).mediaCapability(workspaceId);

    expect(capability).toMatchObject({
      canSendMedia: true,
      canRecordVoice: true,
      canReceiveMedia: false,
      receptionReason: 'INGRESS_NOT_IDENTIFIED',
    });
  });

  it('never leaks the provider api key, the delivery token or a webhook URL into a capability answer', async () => {
    const capability = await adapter().mediaCapability(workspaceId);

    expect(JSON.stringify(capability)).not.toContain(apiKey);
    expect(JSON.stringify(capability)).not.toContain(webhookSecret);
    expect(JSON.stringify(capability)).not.toContain('crm.example.test');
  });

  // The origin matters: path plus connection id on someone else's host means
  // every delivery goes to that host and none to us.
  it('refuses reception when the webhook addresses another origin on the right path', async () => {
    webhook = configuredWebhook({
      url: `https://attacker.invalid${EVOLUTION_INGRESS_PATH}/${connectionId}`,
    });

    expect(await adapter().mediaCapability(workspaceId)).toMatchObject({
      canReceiveMedia: false,
      receptionReason: 'WEBHOOK_URL_NOT_THIS_INGRESS',
    });
  });

  it('refuses reception when no expected ingress origin is configured, rather than accepting any host', async () => {
    expect(
      await adapter({ ingressOrigins: [] }).mediaCapability(workspaceId),
    ).toMatchObject({
      canReceiveMedia: false,
      receptionReason: 'INGRESS_ORIGIN_UNKNOWN',
    });
  });

  it('does not accept a different port or scheme on the configured host', async () => {
    for (const url of [
      `https://crm.example.test:8443${EVOLUTION_INGRESS_PATH}/${connectionId}`,
      `http://crm.example.test${EVOLUTION_INGRESS_PATH}/${connectionId}`,
    ]) {
      webhook = configuredWebhook({ url });

      expect(
        (await adapter().mediaCapability(workspaceId)).receptionReason,
      ).toBe('WEBHOOK_URL_NOT_THIS_INGRESS');
    }
  });

  // Our own controller authenticates every delivery, so a webhook without an
  // accepted token is refused 401 before anything is stored.
  it('refuses reception when the webhook carries no delivery token', async () => {
    webhook = configuredWebhook({ headers: {} });

    expect(await adapter().mediaCapability(workspaceId)).toMatchObject({
      canReceiveMedia: false,
      receptionReason: 'WEBHOOK_TOKEN_NOT_CONFIGURED',
    });
  });

  it('refuses reception when the webhook carries a token that is not ours', async () => {
    webhook = configuredWebhook({
      headers: {
        [EVOLUTION_INGRESS_TOKEN_HEADER]: randomBytes(32).toString('hex'),
      },
    });

    expect(await adapter().mediaCapability(workspaceId)).toMatchObject({
      canReceiveMedia: false,
      receptionReason: 'WEBHOOK_TOKEN_MISMATCHED',
    });
  });

  it('keeps reception unproven when the token cannot be checked at all', async () => {
    // The provider did not report its headers.
    webhook = configuredWebhook({ headers: undefined });
    expect((await adapter().mediaCapability(workspaceId)).receptionReason).toBe(
      'WEBHOOK_TOKEN_UNVERIFIABLE',
    );

    // Or this caller supplied no way to compare one.
    webhook = configuredWebhook();
    expect(
      (await adapter({ matchesIngressToken: null }).mediaCapability(workspaceId))
        .receptionReason,
    ).toBe('WEBHOOK_TOKEN_UNVERIFIABLE');
  });

  it('accepts the delivery token header whatever case the operator typed', async () => {
    webhook = configuredWebhook({
      headers: { 'X-Hermes-Evolution-Token': webhookSecret },
    });

    expect(await adapter().mediaCapability(workspaceId)).toMatchObject({
      canReceiveMedia: true,
      receptionReason: null,
    });
  });
});

describe('The capability judgements themselves, without a listener', () => {
  const webhookRow = {
    kind: 'row' as const,
    row: {
      enabled: true,
      url: `${ingressOrigin}${EVOLUTION_INGRESS_PATH}/${connectionId}`,
      events: [EVOLUTION_UPSERT_EVENT],
    },
  };
  const evidence = (
    overrides: Partial<Parameters<typeof judgeEvolutionReception>[0]> = {},
  ) => ({
    versionVerified: true,
    ingressConnectionId: connectionId,
    ingressOrigins: [ingressOrigin],
    webhook: webhookRow,
    ingressToken: 'MATCHED' as const,
    ...overrides,
  });

  it('refuses reception on the build before anything else is considered', () => {
    expect(
      judgeEvolutionReception(evidence({ versionVerified: false })),
    ).toEqual({
      canReceiveMedia: false,
      reason: 'PROVIDER_VERSION_UNVERIFIED',
    });
  });

  it('does not accept a subscription written in the delivered lower-case form', () => {
    expect(
      judgeEvolutionReception(
        evidence({
          webhook: {
            kind: 'row',
            row: { ...webhookRow.row, events: ['messages.upsert'] },
          },
        }),
      ).reason,
    ).toBe('WEBHOOK_EVENT_NOT_SUBSCRIBED');
  });

  it('rejects a webhook URL that is not an absolute http(s) address', () => {
    for (const url of [
      `${EVOLUTION_INGRESS_PATH}/${connectionId}`,
      `ftp://crm.example.test${EVOLUTION_INGRESS_PATH}/${connectionId}`,
      '',
    ])
      expect(
        judgeEvolutionReception(
          evidence({ webhook: { kind: 'row', row: { ...webhookRow.row, url } } }),
        ).reason,
      ).toBe('WEBHOOK_URL_NOT_THIS_INGRESS');
  });

  it('accepts a single trailing slash on an otherwise exact ingress URL', () => {
    expect(
      judgeEvolutionReception(
        evidence({
          webhook: {
            kind: 'row',
            row: { ...webhookRow.row, url: `${webhookRow.row.url}/` },
          },
        }),
      ),
    ).toEqual({ canReceiveMedia: true, reason: null });
  });

  it('refuses a row whose enabled flag is absent instead of assuming it is on', () => {
    const { enabled: _enabled, ...withoutFlag } = webhookRow.row;

    expect(
      judgeEvolutionReception(
        evidence({ webhook: { kind: 'row', row: withoutFlag } }),
      ).reason,
    ).toBe('WEBHOOK_DISABLED');
  });

  it('requires the delivery token to match before reception opens', () => {
    expect(judgeEvolutionReception(evidence()).canReceiveMedia).toBe(true);

    for (const [token, reason] of [
      ['MISMATCHED', 'WEBHOOK_TOKEN_MISMATCHED'],
      ['NOT_CONFIGURED', 'WEBHOOK_TOKEN_NOT_CONFIGURED'],
      ['UNVERIFIABLE', 'WEBHOOK_TOKEN_UNVERIFIABLE'],
    ] as const)
      expect(judgeEvolutionReception(evidence({ ingressToken: token }))).toEqual(
        { canReceiveMedia: false, reason },
      );
  });

  it('reads a configured origin down to its origin and drops what is unusable', () => {
    expect(
      readEvolutionIngressOrigins([
        'https://crm.example.test/some/path?q=1',
        'https://crm.example.test',
        '  ',
        null,
        undefined,
        'not a url',
        'ftp://crm.example.test',
      ]),
    ).toEqual(['https://crm.example.test']);
  });

  it('reads the delivery token evidence without handling the secret itself', () => {
    const matches = (value: string) => value === 'expected-token';

    expect(readEvolutionIngressToken(null, matches)).toBe('UNVERIFIABLE');
    expect(readEvolutionIngressToken({}, null)).toBe('UNVERIFIABLE');
    expect(readEvolutionIngressToken('a string', matches)).toBe('UNVERIFIABLE');
    expect(readEvolutionIngressToken([], matches)).toBe('UNVERIFIABLE');
    expect(readEvolutionIngressToken({ other: 'x' }, matches)).toBe(
      'NOT_CONFIGURED',
    );
    // A non-string value is not a token.
    expect(
      readEvolutionIngressToken(
        { [EVOLUTION_INGRESS_TOKEN_HEADER]: 42 },
        matches,
      ),
    ).toBe('NOT_CONFIGURED');
    expect(
      readEvolutionIngressToken(
        { [EVOLUTION_INGRESS_TOKEN_HEADER]: 'wrong' },
        matches,
      ),
    ).toBe('MISMATCHED');
    expect(
      readEvolutionIngressToken(
        { [EVOLUTION_INGRESS_TOKEN_HEADER]: 'expected-token' },
        matches,
      ),
    ).toBe('MATCHED');
  });

  it('ties voice to the pinned build and to nothing else', () => {
    expect(judgeEvolutionVoice({ versionVerified: true })).toEqual({
      canRecordVoice: true,
      reason: null,
    });
    expect(judgeEvolutionVoice({ versionVerified: false })).toEqual({
      canRecordVoice: false,
      reason: 'PROVIDER_VERSION_UNVERIFIED',
    });
  });
});
