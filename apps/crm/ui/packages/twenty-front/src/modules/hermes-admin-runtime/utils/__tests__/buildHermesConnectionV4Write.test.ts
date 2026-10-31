import {
  HERMES_CONNECTION_FORM_EMPTY_VALUES,
  type HermesConnectionFormSubmission,
} from '@/hermes-admin-ui/types/HermesConnectionForm';
import { buildHermesConnectionV4Write } from '@/hermes-admin-runtime/utils/buildHermesConnectionV4Write';

const submission = (
  overrides: Partial<HermesConnectionFormSubmission> = {},
): HermesConnectionFormSubmission => ({
  values: HERMES_CONNECTION_FORM_EMPTY_VALUES,
  secret: { kind: 'unchanged' },
  expectedRevision: '4',
  ...overrides,
});

describe('buildHermesConnectionV4Write — WhatsApp', () => {
  it('sends the base URL and the instance name under the contract names', () => {
    const build = buildHermesConnectionV4Write(
      'EVOLUTION',
      submission({
        values: {
          ...HERMES_CONNECTION_FORM_EMPTY_VALUES,
          endpoint: '  https://evolution.example.test  ',
          label: '  atelier  ',
        },
      }),
      4,
    );

    expect(build).toEqual({
      kind: 'built',
      write: {
        kind: 'EVOLUTION',
        expectedRevision: 4,
        settings: {
          baseUrl: 'https://evolution.example.test',
          instanceName: 'atelier',
        },
      },
    });
  });

  it('omits the secrets entirely when neither was typed', () => {
    // Omitted keeps the stored set. Sent as {} it would wipe it.
    const build = buildHermesConnectionV4Write('EVOLUTION', submission(), 4);

    expect(build.kind).toBe('built');
    expect(
      build.kind === 'built' ? 'secrets' in build.write : true,
    ).toBe(false);
  });

  it('sends both secrets together, untrimmed', () => {
    // Supplying the object replaces the complete set, so both go or neither.
    // Neither is trimmed: spaces can be part of a secret.
    const build = buildHermesConnectionV4Write(
      'EVOLUTION',
      submission({
        secret: {
          kind: 'replaced',
          values: { apiKey: '  k3y  ', webhookSecret: 'a'.repeat(64) },
        },
      }),
      4,
    );

    expect(build.kind === 'built' ? build.write.secrets : null).toEqual({
      apiKey: '  k3y  ',
      webhookSecret: 'a'.repeat(64),
    });
  });

  it('never sends a secret field that belongs to another kind', () => {
    // A stray field would be refused by the server's strict validator, and
    // sending it would say this screen does not know what it is writing.
    const build = buildHermesConnectionV4Write(
      'EVOLUTION',
      submission({
        secret: {
          kind: 'replaced',
          values: { apiKey: 'k', webhookSecret: 'w', token: 'nope' },
        },
      }),
      4,
    );

    expect(build.kind === 'built' ? build.write.secrets : null).toEqual({
      apiKey: 'k',
      webhookSecret: 'w',
    });
  });
});

describe('buildHermesConnectionV4Write — signed collection', () => {
  it('sends the chosen sources and the rate as a number', () => {
    const build = buildHermesConnectionV4Write(
      'INTAKE',
      submission({
        values: {
          ...HERMES_CONNECTION_FORM_EMPTY_VALUES,
          allowedSources: ['SCRAPING', 'CALENDAR'],
          maxRequestsPerMinute: ' 30 ',
        },
        secret: { kind: 'replaced', values: { secret: 'f'.repeat(64) } },
      }),
      7,
    );

    expect(build).toEqual({
      kind: 'built',
      write: {
        kind: 'INTAKE',
        expectedRevision: 7,
        settings: {
          allowedSources: ['SCRAPING', 'CALENDAR'],
          maxRequestsPerMinute: 30,
        },
        secrets: { secret: 'f'.repeat(64) },
      },
    });
  });

  it('adds no source the operator did not choose', () => {
    const build = buildHermesConnectionV4Write(
      'INTAKE',
      submission({
        values: {
          ...HERMES_CONNECTION_FORM_EMPTY_VALUES,
          allowedSources: ['FORMS'],
          maxRequestsPerMinute: '1',
        },
      }),
      7,
    );

    expect(
      build.kind === 'built' ? build.write.settings.allowedSources : null,
    ).toEqual(['FORMS']);
  });
});

describe('buildHermesConnectionV4Write — mail and MCP are unchanged', () => {
  it('still sends mail as the bound account and the IMAP folder, with no secrets', () => {
    const build = buildHermesConnectionV4Write(
      'MAIL',
      submission({
        values: {
          ...HERMES_CONNECTION_FORM_EMPTY_VALUES,
          nativeAccountId: 'acc-1',
          imapFolder: 'INBOX',
        },
      }),
      2,
    );

    expect(build).toEqual({
      kind: 'built',
      write: {
        kind: 'MAIL',
        expectedRevision: 2,
        settings: { connectedAccountId: 'acc-1', mailbox: 'INBOX' },
      },
    });
  });

  it('still pins the MCP protocol version and the one required argument', () => {
    const build = buildHermesConnectionV4Write(
      'MCP',
      submission({
        values: {
          ...HERMES_CONNECTION_FORM_EMPTY_VALUES,
          endpoint: 'https://mcp.example.test/rpc',
          label: 'lookup_contact',
        },
        secret: { kind: 'replaced', values: { token: 't'.repeat(32) } },
      }),
      2,
    );

    expect(build.kind === 'built' ? build.write.settings : null).toEqual({
      endpoint: 'https://mcp.example.test/rpc',
      toolName: 'lookup_contact',
      protocolVersion: '2025-11-25',
      argumentMap: { text: 'text' },
    });
    expect(build.kind === 'built' ? build.write.secrets : null).toEqual({
      token: 't'.repeat(32),
    });
  });
});
