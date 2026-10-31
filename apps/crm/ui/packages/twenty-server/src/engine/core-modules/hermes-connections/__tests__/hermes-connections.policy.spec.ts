import { connectionIdentity } from 'src/engine/core-modules/hermes-connections/hermes-connections.policy';

// The identity digest decides two things: whether a save keeps the connection
// ID — and therefore reuses old conversation and ledger context — and whether
// the secrets must be supplied again.

const mcp = (overrides: Record<string, unknown> = {}) => ({
  endpoint: 'https://mcp.example.test/rpc',
  toolName: 'lookup_contact',
  protocolVersion: '2025-11-25',
  argumentMap: { text: 'text' },
  ...overrides,
});

describe('connectionIdentity — the MCP grant list is part of the identity', () => {
  it('treats a widened grant list as a different identity', () => {
    // Widening what the bot may call without consent must rotate the
    // connection ID and force the secrets to be re-supplied.
    const narrow = connectionIdentity('MCP', mcp({ authorizedTools: ['a'] }));
    const wide = connectionIdentity('MCP', mcp({ authorizedTools: ['a', 'b'] }));

    expect(narrow).not.toEqual(wide);
  });

  it('treats granting a first tool as a different identity', () => {
    const none = connectionIdentity('MCP', mcp({ authorizedTools: [] }));
    const one = connectionIdentity('MCP', mcp({ authorizedTools: ['a'] }));

    expect(none).not.toEqual(one);
  });

  it('distinguishes order, because a different list is a different grant', () => {
    expect(
      connectionIdentity('MCP', mcp({ authorizedTools: ['a', 'b'] })),
    ).not.toEqual(
      connectionIdentity('MCP', mcp({ authorizedTools: ['b', 'a'] })),
    );
  });

  it('keeps the digest of a record stored before the field existed', () => {
    // Appending unconditionally would change every stored MCP digest, and
    // `resolve` fails closed on a mismatch — every existing MCP connection
    // would stop resolving. Absent must therefore hash as it always did.
    const before = connectionIdentity('MCP', mcp());
    const explicitlyAbsent = connectionIdentity(
      'MCP',
      mcp({ authorizedTools: undefined }),
    );

    expect(before).toEqual(explicitlyAbsent);
  });

  it('separates an absent grant list from an empty one', () => {
    // Absent is "this record predates the field"; empty is "nothing is
    // granted". They are not the same statement.
    expect(connectionIdentity('MCP', mcp())).not.toEqual(
      connectionIdentity('MCP', mcp({ authorizedTools: [] })),
    );
  });

  it('still keys the other fields of the identity', () => {
    const base = connectionIdentity('MCP', mcp());

    expect(base).not.toEqual(
      connectionIdentity('MCP', mcp({ toolName: 'other_tool' })),
    );
    expect(base).not.toEqual(
      connectionIdentity('MCP', mcp({ endpoint: 'https://other.test/rpc' })),
    );
  });

  it('leaves the digests of the other kinds untouched', () => {
    // A field that only exists on MCP must not perturb Evolution, mail or
    // intake digests, whose stored values must keep resolving.
    expect(
      connectionIdentity('EVOLUTION', {
        baseUrl: 'https://evolution.example.test',
        instanceName: 'atelier',
        authorizedTools: ['a'],
      }),
    ).toEqual(
      connectionIdentity('EVOLUTION', {
        baseUrl: 'https://evolution.example.test',
        instanceName: 'atelier',
      }),
    );
  });
});
