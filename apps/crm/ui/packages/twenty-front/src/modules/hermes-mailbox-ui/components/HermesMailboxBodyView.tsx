import { styled } from '@linaria/react';
import { Plural, Trans } from '@lingui/react/macro';
import { useMemo } from 'react';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { HermesMailboxNote } from '@/hermes-mailbox-ui/components/HermesMailboxNote';
import { type HermesMailboxInlineImage } from '@/hermes-mailbox-ui/types/HermesMailboxAttachment';
import { type HermesMailboxBody } from '@/hermes-mailbox-ui/types/HermesMailboxBody';
import { readHermesMailboxBody } from '@/hermes-mailbox-ui/utils/readHermesMailboxBody';

const StyledBodyText = styled.p`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: ${themeCssVariables.text.lineHeight.md};
  margin: 0;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
`;

// Also a containment boundary: a message is laid out for a mail client, not
// for this pane, so wide tables are clipped here rather than widening the page.
const StyledBodyHtml = styled.div`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: ${themeCssVariables.text.lineHeight.md};
  max-width: 100%;
  min-width: 0;
  overflow-wrap: anywhere;

  & p {
    margin: 0 0 ${themeCssVariables.spacing[2]};
  }

  & p:last-child {
    margin-bottom: 0;
  }

  & img,
  & table {
    max-width: 100%;
  }

  & img {
    block-size: auto;
  }

  & table {
    display: block;
    overflow-x: auto;
  }

  & a {
    color: ${themeCssVariables.font.color.primary};
    overflow-wrap: anywhere;
    text-decoration: underline;
  }

  & a:focus-visible {
    outline: 1px solid ${themeCssVariables.border.color.strong};
    outline-offset: ${themeCssVariables.spacing[0.5]};
  }

  & [data-hermes-undisplayed-image='true'] {
    border: 1px dashed ${themeCssVariables.border.color.strong};
    block-size: ${themeCssVariables.spacing[6]};
    inline-size: ${themeCssVariables.spacing[6]};
  }
`;

type HermesMailboxBodyViewProps = {
  body: HermesMailboxBody | null;
  // Embedded images the parent already read through the authenticated
  // attachment operation. This module resolves nothing and builds no URL.
  inlineImages?: HermesMailboxInlineImage[];
};

// A received body on screen. The HTML path never reaches the DOM without going
// through readHermesMailboxBody, and the dangerouslySetInnerHTML below is this
// module's only one.
export const HermesMailboxBodyView = ({
  body,
  inlineImages = [],
}: HermesMailboxBodyViewProps) => {
  const render = useMemo(
    () => readHermesMailboxBody(body, inlineImages),
    [body, inlineImages],
  );

  if (render.kind === 'empty') {
    return (
      <HermesMailboxNote>
        <Trans>No body in this message.</Trans>
      </HermesMailboxNote>
    );
  }

  if (render.kind === 'unrenderable') {
    return (
      <HermesMailboxNote role="alert">
        <Trans>
          This message could not be prepared for display, so none of it is
          shown.
        </Trans>
      </HermesMailboxNote>
    );
  }

  if (render.kind === 'text') {
    return <StyledBodyText>{render.text}</StyledBodyText>;
  }

  return (
    <>
      {/* A statement of fact with no control attached: these images are not
          held by this application, so nothing here could display them. */}
      {render.undisplayedImageCount > 0 && (
        <HermesMailboxNote>
          <Plural
            value={render.undisplayedImageCount}
            one="# image in this message is not displayed."
            other="# images in this message are not displayed."
          />
        </HermesMailboxNote>
      )}

      <StyledBodyHtml
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: render.html }}
      />
    </>
  );
};
