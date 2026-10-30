import { useApolloClient } from '@apollo/client/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { REACT_APP_SERVER_BASE_URL } from '~/config';

import { readMessagingInboxCallFailure } from '@/messaging-inbox/utils/readMessagingInboxCallFailure';

import { HERMES_WA_MEDIA_READ } from '@/hermes-wa-runtime/graphql/metadata-queries/hermesWaMediaRead';
import { type HermesWaMediaAccess } from '@/hermes-wa-runtime/types/HermesWaUploadTarget';
import { readHermesWaMediaReadTarget } from '@/hermes-wa-runtime/utils/readHermesWaRuntimePayload';

export type HermesWaMediaSourceControl = {
  access: HermesWaMediaAccess;
  // Fetches the bytes and hands back a blob: URL. Called from a control a
  // person pressed, never from an effect.
  resolve: () => void;
  // Lets go of the current blob: URL immediately.
  release: () => void;
};

// Only a relative backend path is accepted, and it is resolved against this
// deployment's own server base URL.
//
// The contract publishes `downloadPath` as relative, so an absolute URL, a
// protocol-relative one, or anything else that could retarget the fetch at
// another origin is refused rather than followed. The session travels with
// this request; it is not sent to a host the server named in a field.
const resolveDownloadUrl = (downloadPath: string): string | null => {
  if (!downloadPath.startsWith('/') || downloadPath.startsWith('//')) {
    return null;
  }

  return `${REACT_APP_SERVER_BASE_URL}${downloadPath}`;
};

// One media's bytes, as a revocable blob: URL.
//
// Why this exists at all: `hermesMediaRead` answers with a RELATIVE backend
// path, bound to a native FILE token with a sixty-second lifetime, and the
// route re-checks the current session, role, membership and conversation scope
// on every read. A browser attaches no session to an `<img>` or `<video>`, so a
// direct `src` on that path cannot work — the contract says so outright. The
// bytes are fetched here, wrapped in a blob: URL, and that URL is what the
// library renders.
//
// Revocation is the other half, and it is not optional: a blob: URL that is
// never revoked keeps the bytes of a private media alive in the page for as
// long as the document lives. One effect owns it, with the asset scope as its
// dependencies, so the URL is revoked both when this component unmounts and
// whenever the scope changes under it.
//
// Nothing runs on mount. `resolve` is the only way in.
//
// The media route accepts the session cookie when no bearer is presented, so
// `credentials: 'include'` is the right call and the only one this client can
// make: it holds no bearer token. The upload target carries its own short
// token in its URL and needs no header either.
export const useHermesWaMediaSource = ({
  conversationId,
  assetId,
}: {
  conversationId: string;
  assetId: string;
}): HermesWaMediaSourceControl => {
  const client = useApolloClient();

  const [access, setAccess] = useState<HermesWaMediaAccess>({ kind: 'idle' });

  // The URL currently handed out, held in a ref so the cleanup can revoke it
  // without the effect depending on it — a dependency there would revoke the
  // URL on the very render that produced it.
  const objectUrlRef = useRef<string | null>(null);

  // Each resolve carries its own number. An answer that lands after a newer
  // resolve started is dropped and its blob revoked, so a slow fetch cannot
  // overwrite a fresher one or leak its URL.
  const requestRef = useRef(0);

  const revokeCurrent = useCallback(() => {
    const current = objectUrlRef.current;

    if (current !== null) {
      URL.revokeObjectURL(current);
      objectUrlRef.current = null;
    }
  }, []);

  // Unmount and scope change, in one place. The cleanup runs on both, which is
  // exactly the two moments a handed-out blob: URL must stop existing.
  useEffect(
    () => () => {
      requestRef.current += 1;
      revokeCurrent();
    },
    [conversationId, assetId, revokeCurrent],
  );

  // A scope change also means the state must not keep describing the previous
  // asset: a resolved source from the media that was here before would be
  // rendered as this one's.
  useEffect(() => {
    setAccess({ kind: 'idle' });
  }, [conversationId, assetId]);

  const resolve = useCallback(() => {
    // Captured before the first await, and never read from state afterwards:
    // the thread on screen may have changed by the time the bytes arrive, and
    // this request still belongs to the asset it was made for.
    const capturedConversationId = conversationId;
    const capturedAssetId = assetId;

    const requestId = requestRef.current + 1;
    requestRef.current = requestId;

    revokeCurrent();
    setAccess({ kind: 'resolving' });

    const run = async () => {
      try {
        const { data } = await client.query<Record<string, unknown>>({
          query: HERMES_WA_MEDIA_READ,
          variables: {
            input: {
              conversationId: capturedConversationId,
              assetId: capturedAssetId,
            },
          },
          // The answer is bound to a token that lapses in about a minute. A
          // cached one would be handed out long after it stopped working.
          fetchPolicy: 'no-cache',
        });

        if (requestRef.current !== requestId) {
          return;
        }

        const target = readHermesWaMediaReadTarget(data?.hermesMediaRead);

        if (target.kind === 'unreadable') {
          setAccess({ kind: 'failed', message: null });

          return;
        }

        const url = resolveDownloadUrl(target.value.downloadPath);

        if (url === null) {
          setAccess({ kind: 'failed', message: null });

          return;
        }

        const response = await fetch(url, {
          method: 'GET',
          credentials: 'include',
          // The route answers no-store; nothing here asks the browser to keep
          // a private media in its own cache either.
          cache: 'no-store',
        });

        if (!response.ok) {
          if (requestRef.current === requestId) {
            setAccess(
              response.status === 401 || response.status === 403
                ? { kind: 'denied', message: null }
                : { kind: 'failed', message: null },
            );
          }

          return;
        }

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);

        // A newer resolve started while these bytes were in flight. The URL
        // just created is revoked here rather than handed out or dropped on
        // the floor.
        if (requestRef.current !== requestId) {
          URL.revokeObjectURL(objectUrl);

          return;
        }

        objectUrlRef.current = objectUrl;
        setAccess({ kind: 'resolved', objectUrl });
      } catch (error) {
        if (requestRef.current !== requestId) {
          return;
        }

        const failure = readMessagingInboxCallFailure(error);

        setAccess(
          failure.kind === 'denied'
            ? { kind: 'denied', message: failure.message }
            : { kind: 'failed', message: failure.message },
        );
      }
    };

    void run();
  }, [assetId, client, conversationId, revokeCurrent]);

  const release = useCallback(() => {
    requestRef.current += 1;
    revokeCurrent();
    setAccess({ kind: 'idle' });
  }, [revokeCurrent]);

  return { access, resolve, release };
};
