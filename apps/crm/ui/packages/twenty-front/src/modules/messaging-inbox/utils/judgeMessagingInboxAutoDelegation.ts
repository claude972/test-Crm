import {
  type HermesMcpTool,
  type HermesMcpToolSurfaceReadState,
} from '@/hermes-admin-runtime/types/HermesMcpToolSurface';

// Whether a human may be OFFERED the AUTO delegation on one conversation.
//
// This is not the server's permission and never replaces it. The server stays
// the authority: it refuses BOT_DELEGATION_REQUIRED, BOT_POLICY_RESTRICTION,
// BOT_POLICY_STALE and CONVERSATION_CONTACT_REVIEW_REQUIRED on its own, and
// nothing here weakens any of them.
//
// What it does decide is whether offering the choice is honest at all. AUTO
// means the bot answers a customer without a human reading it first, so the
// control is offered only when the authority that would have to produce that
// answer says it can. 'unknown' is a third answer on purpose, and it is not a
// refusal: nobody has told us, so the choice is withheld and the reason said.
export type MessagingInboxAutoDelegationEligibility =
  | { kind: 'eligible'; draftingToolName: string }
  | {
      kind: 'ineligible';
      reason:
        | 'botServerNotConfigured'
        | 'botServerDidNotAnswer'
        | 'botServerConfigurationError'
        | 'noDraftingTool'
        | 'draftingToolNotAuthorized'
        | 'draftingToolNotCallable';
      // The server's own diagnostic when it published one. A reason, never an
      // outcome.
      errorCode: string | null;
    }
  | {
      kind: 'unknown';
      reason:
        | 'reading'
        | 'readDenied'
        | 'readUnreadable'
        | 'toolListIncomplete'
        | 'grantUnknown'
        | 'callabilityUnknown';
    };

type DraftingToolLookup =
  | { kind: 'found'; tool: HermesMcpTool; name: string }
  | { kind: 'absent' };

// Which advertised tool would write the reply.
//
// Two readings, in order: a tool that says so itself, then the name the surface
// published. `isDraftingTool === null` is never read as true, and a name is
// never read as a tool — a grant pointing at an absent tool is a fact this
// product already keeps visible, not a drafting tool.
const findDraftingTool = (
  tools: readonly HermesMcpTool[],
  draftingToolName: string | null,
): DraftingToolLookup => {
  const selfDeclared = tools.find((tool) => tool.isDraftingTool === true);

  if (selfDeclared !== undefined && selfDeclared.name !== null) {
    return { kind: 'found', tool: selfDeclared, name: selfDeclared.name };
  }

  if (draftingToolName === null) {
    return { kind: 'absent' };
  }

  const named = tools.find((tool) => tool.name === draftingToolName);

  return named === undefined
    ? { kind: 'absent' }
    : { kind: 'found', tool: named, name: draftingToolName };
};

// Whether an absence in `tools` is really an absence.
//
// `truncated` is the field that exists to stop a prefix being read as the whole
// list. Only an explicit `false` makes "not in the list" mean "does not exist";
// `true` and an unreadable value both leave the question open.
const isToolListComplete = (truncated: boolean | null): boolean =>
  truncated === false;

export const judgeMessagingInboxAutoDelegation = (
  surface: HermesMcpToolSurfaceReadState,
): MessagingInboxAutoDelegationEligibility => {
  if (surface.kind === 'loading') {
    return { kind: 'unknown', reason: 'reading' };
  }

  // A refused read says nothing about whether a bot server exists. Reporting
  // it as 'not configured' would send the operator to a setup screen over a
  // permission they simply do not have.
  if (surface.kind === 'denied') {
    return { kind: 'unknown', reason: 'readDenied' };
  }

  if (surface.kind === 'unreadable') {
    return { kind: 'unknown', reason: 'readUnreadable' };
  }

  if (surface.status === 'not-configured') {
    return {
      kind: 'ineligible',
      reason: 'botServerNotConfigured',
      errorCode: surface.errorCode,
    };
  }

  if (surface.status === 'unavailable') {
    return {
      kind: 'ineligible',
      reason: 'botServerDidNotAnswer',
      errorCode: surface.errorCode,
    };
  }

  if (surface.status === 'configuration-error') {
    return {
      kind: 'ineligible',
      reason: 'botServerConfigurationError',
      errorCode: surface.errorCode,
    };
  }

  const lookup = findDraftingTool(surface.tools, surface.draftingTool);

  // No drafting tool in a list that may be a prefix is not "there is none".
  if (lookup.kind === 'absent') {
    return isToolListComplete(surface.truncated)
      ? {
          kind: 'ineligible',
          reason: 'noDraftingTool',
          errorCode: surface.errorCode,
        }
      : { kind: 'unknown', reason: 'toolListIncomplete' };
  }

  // The grant, read as an explicit answer. Null is an unknown grant, which is
  // withheld rather than refused, and an empty `refusals` list is never read as
  // a grant: that inference is how a capability nobody checked gets reported
  // as permitted.
  if (lookup.tool.authorized === null) {
    return { kind: 'unknown', reason: 'grantUnknown' };
  }

  if (lookup.tool.authorized === false) {
    return {
      kind: 'ineligible',
      reason: 'draftingToolNotAuthorized',
      errorCode: surface.errorCode,
    };
  }

  if (lookup.tool.callable === null) {
    return { kind: 'unknown', reason: 'callabilityUnknown' };
  }

  if (lookup.tool.callable === false) {
    return {
      kind: 'ineligible',
      reason: 'draftingToolNotCallable',
      errorCode: surface.errorCode,
    };
  }

  // Both answers are an explicit true, from the authority that would have to
  // produce the reply. READY still proves no tool works — discovery calls
  // none — so this opens a choice, not a promise.
  return { kind: 'eligible', draftingToolName: lookup.name };
};
