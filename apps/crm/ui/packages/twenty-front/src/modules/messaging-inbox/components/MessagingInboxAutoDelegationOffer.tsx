import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { Button } from 'kovaa-lab-ui/primitives/input';
import { themeCssVariables } from 'kovaa-lab-ui/theme';
import { useState } from 'react';

import { useHermesMcpToolSurface } from '@/hermes-admin-runtime/hooks/useHermesMcpToolSurface';
import { MessagingInboxNote } from '@/messaging-inbox/components/MessagingInboxNote';
import { judgeMessagingInboxAutoDelegation } from '@/messaging-inbox/utils/judgeMessagingInboxAutoDelegation';

const StyledRow = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

type MessagingInboxAutoDelegationOfferProps = {
  isBusy: boolean;
  // Sends the explicit delegation. The caller owns the mutation; this
  // component owns only whether a person may be offered the choice.
  onDelegate: () => void;
};

// The one human path to automatic replies on this conversation.
//
// Mounted only when the policy was read and AUTO is not already the local
// mode, so the MCP discovery it performs is not run on every thread.
//
// Four properties this exists to hold:
//   explicit    — two deliberate presses, and nothing else on the screen
//                 reaches `onDelegate`. Following the company is NOT this.
//   readable    — the consequence is written out before the second press.
//   eligible    — offered only when the authority that would write the reply
//                 answered an explicit yes. Unknown withholds and says so.
//   delegating  — the caller sends the contract's own `delegateAuto: true`.
export const MessagingInboxAutoDelegationOffer = ({
  isBusy,
  onDelegate,
}: MessagingInboxAutoDelegationOfferProps) => {
  const { t } = useLingui();

  const surface = useHermesMcpToolSurface();
  const eligibility = judgeMessagingInboxAutoDelegation(surface);

  const [isConfirming, setIsConfirming] = useState(false);

  if (eligibility.kind === 'unknown') {
    // Not a refusal, and said so outright: nobody has answered, so the choice
    // is withheld rather than denied.
    const why =
      eligibility.reason === 'reading'
        ? t`the bot server is still being checked`
        : eligibility.reason === 'readDenied'
          ? t`you are not allowed to read the bot server's configuration`
          : eligibility.reason === 'readUnreadable'
            ? t`the bot server's configuration could not be read`
            : eligibility.reason === 'toolListIncomplete'
              ? t`the bot server returned a partial list of its tools`
              : eligibility.reason === 'grantUnknown'
                ? t`the bot server did not say whether its reply tool is granted`
                : t`the bot server did not say whether its reply tool can be called`;

    return (
      <MessagingInboxNote role="status">
        {t`Whether this conversation can be handed to the bot is unknown: ${why}. The choice is not offered until that is answered. This is not a refusal, and the bot has not been turned off.`}
      </MessagingInboxNote>
    );
  }

  if (eligibility.kind === 'ineligible') {
    const why =
      eligibility.reason === 'botServerNotConfigured'
        ? t`no bot server is configured for this company`
        : eligibility.reason === 'botServerDidNotAnswer'
          ? t`the configured bot server did not answer`
          : eligibility.reason === 'botServerConfigurationError'
            ? t`the bot server's configuration could not be used`
            : eligibility.reason === 'noDraftingTool'
              ? t`the bot server advertises no tool that writes replies`
              : eligibility.reason === 'draftingToolNotAuthorized'
                ? t`nobody has granted the bot server's reply tool`
                : t`the bot server says its reply tool cannot be called`;

    return (
      <MessagingInboxNote role="status">
        {isNonEmptyString(eligibility.errorCode)
          ? t`The bot cannot reply on its own here: ${why} (${eligibility.errorCode}). Drafts and replying by hand are unaffected.`
          : t`The bot cannot reply on its own here: ${why}. Drafts and replying by hand are unaffected.`}
      </MessagingInboxNote>
    );
  }

  if (!isConfirming) {
    return (
      <StyledRow>
        <Button
          variant="outline"
          size="sm"
          disabled={isBusy}
          onClick={() => setIsConfirming(true)}
        >
          {t`Let the bot reply on its own…`}
        </Button>
      </StyledRow>
    );
  }

  return (
    <>
      <MessagingInboxNote role="status">
        {/* Written before the second press, in the terms the consequence
            actually has: a message leaves without a human reading it. */}
        {t`If you confirm, the bot will answer this customer by itself, using the tool "${eligibility.draftingToolName}", and its replies will be sent without anyone reading them first. Only messages that arrive after you confirm are answered. You can end this at any time with "Stop the bot", and replying by hand keeps working throughout.`}
      </MessagingInboxNote>

      <StyledRow>
        <Button
          variant="outline"
          size="sm"
          loading={isBusy}
          onClick={() => {
            setIsConfirming(false);
            onDelegate();
          }}
        >
          {t`Confirm automatic replies`}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={isBusy}
          onClick={() => setIsConfirming(false)}
        >
          {t`Keep the bot off this conversation`}
        </Button>
      </StyledRow>
    </>
  );
};
