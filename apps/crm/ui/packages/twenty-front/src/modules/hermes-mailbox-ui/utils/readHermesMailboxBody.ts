import { isNonEmptyString } from '@sniptt/guards';

import { sanitizeHtmlPreview } from '@/advanced-text-editor/utils/sanitizeHtmlPreview';
import { type HermesMailboxBody } from '@/hermes-mailbox-ui/types/HermesMailboxBody';
import { type HermesMailboxInlineImage } from '@/hermes-mailbox-ui/types/HermesMailboxAttachment';

// The server sanitises received HTML and is the authority on what is safe.
// This is a last client-side net, not a second sanitiser: it reuses the
// repository's own `sanitizeHtmlPreview` and then applies the two rules a
// reading pane needs on top. It has no option to relax either of them.
const CID_PREFIX = 'cid:';

// A resolved inline source must be unable to reach the network. The parent
// hands back a blob or a data image from an authenticated read; anything else
// is refused rather than trusted.
const isSafeResolvedSource = (value: string): boolean =>
  value.startsWith('blob:') || value.startsWith('data:image/');

const readContentId = (source: string): string | null => {
  const cleaned = source.replace(/[\u0000- ]/g, '');

  return cleaned.toLowerCase().startsWith(CID_PREFIX)
    ? cleaned.slice(CID_PREFIX.length)
    : null;
};

export type HermesMailboxHtmlRender = {
  html: string;
  // Images this pane does not display: an unresolved embedded image, or a
  // remote one the server did not strip. Stated as a fact; there is no control
  // to reveal them, because nothing in this application can fetch them.
  undisplayedImageCount: number;
};

const hardenHtml = (
  sanitizedHtml: string,
  inlineImages: HermesMailboxInlineImage[],
): HermesMailboxHtmlRender => {
  const parsed = new DOMParser().parseFromString(sanitizedHtml, 'text/html');

  const sourcesByContentId = new Map(
    inlineImages
      .filter((image) => isSafeResolvedSource(image.resolvedSource))
      .map((image) => [image.contentId, image.resolvedSource]),
  );

  let undisplayedImageCount = 0;

  parsed.body.querySelectorAll('img').forEach((image) => {
    const source = image.getAttribute('src') ?? '';
    const contentId = readContentId(source);
    const resolved =
      contentId === null ? undefined : sourcesByContentId.get(contentId);

    if (resolved !== undefined) {
      image.setAttribute('src', resolved);

      return;
    }

    // No network at open time: an image whose bytes this application does not
    // already hold is not fetched, whatever its address.
    image.removeAttribute('src');
    image.removeAttribute('srcset');
    image.setAttribute('data-hermes-undisplayed-image', 'true');
    undisplayedImageCount += 1;
  });

  parsed.body.querySelectorAll('a[href]').forEach((link) => {
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer nofollow');
  });

  return { html: parsed.body.innerHTML, undisplayedImageCount };
};

// 'unrenderable' is the honest outcome when the pass could not run. Stripping
// tags by hand in a catch block would be a third sanitiser written in the
// worst possible place.
export type HermesMailboxBodyRender =
  | { kind: 'empty' }
  | { kind: 'text'; text: string }
  | ({ kind: 'html' } & HermesMailboxHtmlRender)
  | { kind: 'unrenderable' };

// The single door between a received body and the DOM. No component reaches
// past it, and nothing in this module sets innerHTML from another source.
export const readHermesMailboxBody = (
  body: HermesMailboxBody | null,
  inlineImages: HermesMailboxInlineImage[] = [],
): HermesMailboxBodyRender => {
  if (body === null) {
    return { kind: 'empty' };
  }

  if (body.kind === 'text') {
    return isNonEmptyString(body.text.trim())
      ? { kind: 'text', text: body.text }
      : { kind: 'empty' };
  }

  if (!isNonEmptyString(body.html.trim())) {
    return { kind: 'empty' };
  }

  try {
    const render = hardenHtml(sanitizeHtmlPreview(body.html), inlineImages);

    if (!isNonEmptyString(render.html.trim())) {
      return render.undisplayedImageCount > 0
        ? { kind: 'html', ...render }
        : { kind: 'empty' };
    }

    return { kind: 'html', ...render };
  } catch {
    return { kind: 'unrenderable' };
  }
};
