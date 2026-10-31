import {
  type HermesMcpTool,
  type HermesMcpToolSurfaceReadState,
} from '@/hermes-admin-runtime/types/HermesMcpToolSurface';
import { judgeMessagingInboxAutoDelegation } from '@/messaging-inbox/utils/judgeMessagingInboxAutoDelegation';

const tool = (overrides: Partial<HermesMcpTool> = {}): HermesMcpTool => ({
  name: 'draft_reply',
  title: 'Draft a reply',
  authorized: true,
  callable: true,
  refusals: [],
  isDraftingTool: true,
  ...overrides,
});

const surface = (
  overrides: Partial<Extract<HermesMcpToolSurfaceReadState, { kind: 'read' }>>,
): HermesMcpToolSurfaceReadState => ({
  kind: 'read',
  status: 'ready',
  checkedAt: '2026-10-31T09:00:00.000Z',
  errorCode: null,
  authorizedTools: ['draft_reply'],
  draftingTool: 'draft_reply',
  truncated: false,
  tools: [tool()],
  ...overrides,
});

describe('judgeMessagingInboxAutoDelegation', () => {
  it('is eligible only when the authority answers an explicit yes twice', () => {
    expect(judgeMessagingInboxAutoDelegation(surface({}))).toEqual({
      kind: 'eligible',
      draftingToolName: 'draft_reply',
    });
  });

  // The three read states that say nothing about the configuration. None of
  // them may read as a refusal, and none may offer the control.
  it.each([
    ['loading', 'reading'],
    ['denied', 'readDenied'],
    ['unreadable', 'readUnreadable'],
  ] as const)('leaves eligibility unknown when the read is %s', (
    kind,
    reason,
  ) => {
    expect(judgeMessagingInboxAutoDelegation({ kind })).toEqual({
      kind: 'unknown',
      reason,
    });
  });

  it('does not report a denied read as an unconfigured bot server', () => {
    const verdict = judgeMessagingInboxAutoDelegation({ kind: 'denied' });

    expect(verdict.kind).toBe('unknown');
    expect(verdict).not.toMatchObject({ kind: 'ineligible' });
  });

  it.each([
    ['not-configured', 'botServerNotConfigured'],
    ['unavailable', 'botServerDidNotAnswer'],
    ['configuration-error', 'botServerConfigurationError'],
  ] as const)('is ineligible with its own reason when status is %s', (
    status,
    reason,
  ) => {
    expect(
      judgeMessagingInboxAutoDelegation(
        surface({ status, errorCode: 'MCP_SOCKET_CLOSED' }),
      ),
    ).toEqual({ kind: 'ineligible', reason, errorCode: 'MCP_SOCKET_CLOSED' });
  });

  // The trap this mission keeps finding: an empty refusal list is not a grant.
  it('never reads an empty refusal list as permission', () => {
    const verdict = judgeMessagingInboxAutoDelegation(
      surface({
        tools: [tool({ authorized: null, callable: null, refusals: [] })],
      }),
    );

    expect(verdict).toEqual({ kind: 'unknown', reason: 'grantUnknown' });
  });

  it('withholds the choice when callability is unknown', () => {
    expect(
      judgeMessagingInboxAutoDelegation(
        surface({ tools: [tool({ authorized: true, callable: null })] }),
      ),
    ).toEqual({ kind: 'unknown', reason: 'callabilityUnknown' });
  });

  it('is ineligible when the drafting tool is explicitly not callable', () => {
    expect(
      judgeMessagingInboxAutoDelegation(
        surface({
          tools: [tool({ callable: false })],
          errorCode: null,
        }),
      ),
    ).toEqual({
      kind: 'ineligible',
      reason: 'draftingToolNotCallable',
      errorCode: null,
    });
  });

  it('is ineligible when the operator granted nothing for the drafting tool', () => {
    expect(
      judgeMessagingInboxAutoDelegation(
        surface({ tools: [tool({ authorized: false })] }),
      ),
    ).toEqual({
      kind: 'ineligible',
      reason: 'draftingToolNotAuthorized',
      errorCode: null,
    });
  });

  // An absence in a list that may be a prefix is not an absence.
  it.each([
    ['true', true],
    ['unreadable', null],
  ] as const)(
    'leaves eligibility unknown when no drafting tool is listed and truncated is %s',
    (_label, truncated) => {
      expect(
        judgeMessagingInboxAutoDelegation(
          surface({ tools: [], draftingTool: null, truncated }),
        ),
      ).toEqual({ kind: 'unknown', reason: 'toolListIncomplete' });
    },
  );

  it('is ineligible for an absent drafting tool only when the list is complete', () => {
    expect(
      judgeMessagingInboxAutoDelegation(
        surface({ tools: [], draftingTool: null, truncated: false }),
      ),
    ).toEqual({ kind: 'ineligible', reason: 'noDraftingTool', errorCode: null });
  });

  // A grant naming a tool the server never advertised stays visible rather
  // than becoming a drafting tool.
  it('does not treat a named-but-unadvertised drafting tool as present', () => {
    expect(
      judgeMessagingInboxAutoDelegation(
        surface({
          tools: [tool({ name: 'search_crm', isDraftingTool: false })],
          draftingTool: 'draft_reply',
          truncated: false,
        }),
      ),
    ).toEqual({ kind: 'ineligible', reason: 'noDraftingTool', errorCode: null });
  });

  it('never reads an unknown isDraftingTool as the drafting tool', () => {
    expect(
      judgeMessagingInboxAutoDelegation(
        surface({
          tools: [tool({ name: 'maybe_drafts', isDraftingTool: null })],
          draftingTool: null,
          truncated: false,
        }),
      ),
    ).toEqual({ kind: 'ineligible', reason: 'noDraftingTool', errorCode: null });
  });

  it('falls back to the published drafting tool name when no tool self-declares', () => {
    expect(
      judgeMessagingInboxAutoDelegation(
        surface({
          tools: [tool({ name: 'draft_reply', isDraftingTool: null })],
          draftingTool: 'draft_reply',
        }),
      ),
    ).toEqual({ kind: 'eligible', draftingToolName: 'draft_reply' });
  });
});
