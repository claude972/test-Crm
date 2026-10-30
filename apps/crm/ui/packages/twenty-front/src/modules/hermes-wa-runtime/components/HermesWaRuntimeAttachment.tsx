import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { HermesWaMediaAttachment } from '@/hermes-wa-ui/components/HermesWaMediaAttachment';
import { HermesWaAlertNote } from '@/hermes-wa-ui/components/HermesWaNote';

import { useHermesWaMediaSource } from '@/hermes-wa-runtime/hooks/useHermesWaMediaSource';
import { type HermesWaRuntimeAsset } from '@/hermes-wa-runtime/types/HermesWaRuntimeAsset';
import { toHermesWaMedia } from '@/hermes-wa-runtime/utils/toHermesWaMedia';
import { toHermesWaMediaSource } from '@/hermes-wa-runtime/utils/toHermesWaMediaSource';

const StyledFrame = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;
`;

type HermesWaRuntimeAttachmentProps = {
  conversationId: string;
  asset: HermesWaRuntimeAsset;
};

// One attachment, with its bytes.
//
// This is the seam between the library — which takes a descriptor and a
// resolved source and never builds an address — and the media API, which hands
// out a relative path that needs the session and lapses in a minute.
//
// One instance per attachment, and that is deliberate: the blob: URL's life is
// tied to this component's life, so unmounting the thread, scrolling the
// message away, or opening another conversation revokes it. The hook's effect
// is keyed on the conversation and the asset, so a change of either revokes
// too.
//
// Nothing is fetched on mount. The library renders the "no access yet" state
// with its own button, and that button is what calls `resolve`.
export const HermesWaRuntimeAttachment = ({
  conversationId,
  asset,
}: HermesWaRuntimeAttachmentProps) => {
  const { t } = useLingui();

  const { access, resolve } = useHermesWaMediaSource({
    conversationId,
    assetId: asset.id,
  });

  return (
    <StyledFrame>
      <HermesWaMediaAttachment
        media={toHermesWaMedia(asset)}
        source={toHermesWaMediaSource(access)}
        // Asking for the bytes again is the only thing this screen can do
        // about an absent source. There is no `onRetryRequested`: the media's
        // own lifecycle is the server's, and this client cannot re-run a
        // native sniff by asking.
        onSourceRefreshRequested={resolve}
      />

      {/* A refusal and a failure are different answers and get different
          sentences. Neither is rendered as a missing file: the media may be
          perfectly fine and the access not. */}
      {access.kind === 'denied' && (
        <HermesWaAlertNote role="alert">
          {t`Reading this media was refused.`}
        </HermesWaAlertNote>
      )}

      {access.kind === 'failed' && (
        <HermesWaAlertNote role="alert">
          {t`This media could not be read. Asking again may work.`}
        </HermesWaAlertNote>
      )}
    </StyledFrame>
  );
};
