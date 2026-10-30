import { useApolloClient } from '@apollo/client/react';
import { useEffect, useState } from 'react';

import { HERMES_MEDIA_READ } from '@/hermes-mailbox-runtime/graphql/metadata-queries/hermesMediaRead';
import { type HermesMailboxRuntimeMessage } from '@/hermes-mailbox-runtime/types/HermesMailboxRuntimePayload';
import { readHermesMailboxRuntimeMediaRead } from '@/hermes-mailbox-runtime/utils/readHermesMailboxRuntimePayload';
import { type HermesMailboxInlineImage } from '@/hermes-mailbox-ui/types/HermesMailboxAttachment';
import { REACT_APP_SERVER_BASE_URL } from '~/config';

// The images a message body references by Content-ID.
//
// There is no provider URL and no static URL anywhere in this path. The bytes
// come from the private media read, which answers with a relative path that
// needs the session the browser already holds and expires quickly. The path is
// fetched once, turned into a blob URL, and every URL created here is revoked
// when the message closes or the component unmounts — a leaked blob URL is a
// copy of somebody's mail kept alive in the tab.
export const useHermesMailboxRuntimeInlineImages = ({
  message,
}: {
  message: HermesMailboxRuntimeMessage | null;
}): Record<string, HermesMailboxInlineImage[]> => {
  const client = useApolloClient();

  const [inlineImagesByMessageId, setInlineImagesByMessageId] = useState<
    Record<string, HermesMailboxInlineImage[]>
  >({});

  const conversationId = message?.conversationId ?? null;
  const messageId = message?.uid ?? null;

  // Only an imported image part with a Content-ID can be resolved. An
  // attachment the server marked UNSUPPORTED has no asset to read.
  const inlineParts = (message?.attachments ?? []).filter(
    (attachment) =>
      attachment.state === 'READY' &&
      attachment.assetId !== null &&
      attachment.contentId !== null,
  );

  // A stable key, so the effect does not re-fetch on every parent render.
  const partsKey = inlineParts
    .map((attachment) => attachment.assetId + ':' + attachment.contentId)
    .join(',');

  useEffect(() => {
    if (conversationId === null || messageId === null || partsKey === '') {
      setInlineImagesByMessageId({});

      return;
    }

    let cancelled = false;
    const created: string[] = [];

    const resolve = async () => {
      const resolved: HermesMailboxInlineImage[] = [];

      for (const part of inlineParts) {
        try {
          const { data } = await client.query<Record<string, unknown>>({
            query: HERMES_MEDIA_READ,
            variables: {
              input: { conversationId, assetId: part.assetId },
            },
            // The path expires, so it is never served from a cache.
            fetchPolicy: 'no-cache',
          });

          const read = readHermesMailboxRuntimeMediaRead(data?.hermesMediaRead);

          if (read.kind !== 'read' || cancelled) {
            continue;
          }

          const response = await fetch(
            REACT_APP_SERVER_BASE_URL + read.value.downloadPath,
            // The session is the server-managed cookie the GraphQL transport
            // already uses. No token is read or rebuilt here.
            { credentials: 'include' },
          );

          if (!response.ok || cancelled) {
            continue;
          }

          const blob = await response.blob();

          if (cancelled) {
            return;
          }

          const objectUrl = URL.createObjectURL(blob);

          created.push(objectUrl);
          resolved.push({
            contentId: part.contentId as string,
            resolvedSource: objectUrl,
          });
        } catch {
          // An image that could not be read is left out. The body reader
          // already says a referenced image was not resolved, and a failed
          // private read must not take the message down with it.
        }
      }

      if (cancelled) {
        return;
      }

      setInlineImagesByMessageId({ [messageId]: resolved });
    };

    void resolve();

    return () => {
      cancelled = true;
      created.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
      setInlineImagesByMessageId({});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, conversationId, messageId, partsKey]);

  return inlineImagesByMessageId;
};
