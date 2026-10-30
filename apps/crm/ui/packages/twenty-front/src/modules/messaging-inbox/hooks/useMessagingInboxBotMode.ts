import { useMutation } from '@apollo/client/react';
import { useCallback, useState } from 'react';

import { HERMES_INBOX_SET_BOT_MODE } from '@/messaging-inbox/graphql/metadata-mutations/hermesInboxSetBotMode';
import { readMessagingInboxCallFailure } from '@/messaging-inbox/utils/readMessagingInboxCallFailure';

export type MessagingInboxBotModeState =
  | { kind: 'idle' }
  | { kind: 'requesting' }
  // What the SERVER decided, which is not always what was asked for.
  | { kind: 'settled'; mode: string; status: string }
  | { kind: 'denied' }
  | { kind: 'failed'; message: string | null };

export type MessagingInboxBotModeControl = {
  state: MessagingInboxBotModeState;
  setBotMode: (conversationId: string, mode: 'MANUAL' | 'AUTO') => void;
  reset: () => void;
};

// Per-conversation delegation.
//
// The answer is authoritative and the request is not. Asking for AUTO does not
// make a conversation AUTO: when the readonly MCP check finds no usable
// configuration the server leaves it MANUAL and says so in `status`. So this
// hook stores what came back and never the mode that was asked for — writing
// the request into local state is exactly how a screen starts claiming a
// delegation that does not exist.
//
// No bot owner is ever sent: the contract states the server resolves the
// operator from the session and that no caller may supply one.
export const useMessagingInboxBotMode = (): MessagingInboxBotModeControl => {
  const [setBotModeMutation] = useMutation<
    { hermesInboxSetBotMode: unknown },
    { input: { conversationId: string; mode: 'MANUAL' | 'AUTO' } }
  >(HERMES_INBOX_SET_BOT_MODE);

  const [state, setState] = useState<MessagingInboxBotModeState>({
    kind: 'idle',
  });

  const setBotMode = useCallback(
    (conversationId: string, mode: 'MANUAL' | 'AUTO') => {
      setState({ kind: 'requesting' });

      setBotModeMutation({ variables: { input: { conversationId, mode } } })
        .then(({ data }) => {
          const answer = data?.hermesInboxSetBotMode;

          if (
            typeof answer !== 'object' ||
            answer === null ||
            typeof (answer as { mode?: unknown }).mode !== 'string' ||
            typeof (answer as { status?: unknown }).status !== 'string'
          ) {
            // An unreadable answer is not a success. The screen keeps showing
            // the mode the conversation already reported.
            setState({ kind: 'failed', message: null });

            return;
          }

          setState({
            kind: 'settled',
            mode: (answer as { mode: string }).mode,
            status: (answer as { status: string }).status,
          });
        })
        .catch((error: unknown) => {
          const failure = readMessagingInboxCallFailure(error);

          setState(
            failure.kind === 'denied'
              ? { kind: 'denied' }
              : { kind: 'failed', message: failure.message },
          );
        });
    },
    [setBotModeMutation],
  );

  const reset = useCallback(() => setState({ kind: 'idle' }), []);

  return { state, setBotMode, reset };
};
