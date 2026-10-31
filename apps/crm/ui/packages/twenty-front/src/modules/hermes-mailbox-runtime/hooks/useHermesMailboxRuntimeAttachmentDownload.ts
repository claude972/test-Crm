import { useApolloClient } from '@apollo/client/react';
import { useCallback, useEffect, useRef } from 'react';

import { HERMES_MEDIA_READ } from '@/hermes-mailbox-runtime/graphql/metadata-queries/hermesMediaRead';
import { type HermesMailboxRuntimeMessage } from '@/hermes-mailbox-runtime/types/HermesMailboxRuntimePayload';
import { readHermesMailboxRuntimeMediaRead } from '@/hermes-mailbox-runtime/utils/readHermesMailboxRuntimePayload';
import { REACT_APP_SERVER_BASE_URL } from '~/config';

// Handing one private attachment to the person who asked for it.
//
// Same path as the embedded images: the media read answers with a relative,
// session-bound path that expires quickly, the bytes are fetched once, and the
// blob URL created from them is revoked — right after the download starts, and
// again on unmount for the case where that first revocation never ran.
//
// Returns undefined when this message has nothing readable, so the strip
// offers no download rather than one that would fail.
export const useHermesMailboxRuntimeAttachmentDownload = ({
  message,
}: {
  message: HermesMailboxRuntimeMessage | null;
}): ((attachmentId: string) => void) | undefined => {
  const client = useApolloClient();
  const createdRef = useRef<string[]>([]);

  useEffect(
    () => () => {
      createdRef.current.forEach((objectUrl) =>
        URL.revokeObjectURL(objectUrl),
      );
      createdRef.current = [];
    },
    [],
  );

  const conversationId = message?.conversationId ?? null;

  const download = useCallback(
    (attachmentId: string) => {
      const attachment = (message?.attachments ?? []).find(
        (candidate) =>
          candidate.state === 'READY' && candidate.assetId === attachmentId,
      );

      if (conversationId === null || attachment?.assetId === undefined) {
        return;
      }

      const assetId = attachment.assetId;

      const run = async () => {
        const { data } = await client.query<Record<string, unknown>>({
          query: HERMES_MEDIA_READ,
          variables: { input: { conversationId, assetId } },
          // The path expires, so it is never served from a cache.
          fetchPolicy: 'no-cache',
        });

        const read = readHermesMailboxRuntimeMediaRead(data?.hermesMediaRead);

        if (read.kind !== 'read') {
          return;
        }

        const response = await fetch(
          REACT_APP_SERVER_BASE_URL + read.value.downloadPath,
          // The session is the server-managed cookie the GraphQL transport
          // already uses. No token is read or rebuilt here.
          { credentials: 'include' },
        );

        if (!response.ok) {
          return;
        }

        const objectUrl = URL.createObjectURL(await response.blob());

        createdRef.current = [...createdRef.current, objectUrl];

        const anchor = document.createElement('a');

        anchor.href = objectUrl;
        // Provider-sourced and attacker-controlled in received mail, so it is
        // only ever a download name — never a path this code follows.
        anchor.download = attachment.filename ?? 'attachment';
        anchor.rel = 'noopener';
        anchor.click();

        // The download has started synchronously on click; the URL is no
        // longer needed and a copy of somebody's mail must not stay alive in
        // the tab.
        window.setTimeout(() => {
          URL.revokeObjectURL(objectUrl);
          createdRef.current = createdRef.current.filter(
            (entry) => entry !== objectUrl,
          );
        }, 0);
      };

      // A failed private read is silent on purpose: the strip already says
      // nothing was served, and an exception here must not take the message
      // down with it.
      run().catch(() => {});
    },
    [client, conversationId, message],
  );

  const hasReadableAttachment = (message?.attachments ?? []).some(
    (attachment) => attachment.state === 'READY' && attachment.assetId !== null,
  );

  return conversationId !== null && hasReadableAttachment
    ? download
    : undefined;
};
