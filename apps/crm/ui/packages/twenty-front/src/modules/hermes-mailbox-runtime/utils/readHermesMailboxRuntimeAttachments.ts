import {
  type HermesMailboxRuntimeAttachment,
  type HermesMailboxRuntimeMessage,
} from '@/hermes-mailbox-runtime/types/HermesMailboxRuntimePayload';
import { type HermesMailboxAttachment } from '@/hermes-mailbox-ui/types/HermesMailboxAttachment';

// One attachment, described for the strip.
//
// `targetAssetId` is the asset id that is valid in the conversation the file
// is about to be used in: the file's own id when it is read in place, and the
// clone's id when a forward carried it across. `null` means no usable asset,
// and the strip then says the file cannot be served instead of offering it.
export const toHermesMailboxAttachment = (
  attachment: HermesMailboxRuntimeAttachment,
  {
    index,
    targetAssetId,
  }: { index: number; targetAssetId: string | null },
): HermesMailboxAttachment => ({
  // The library's identifier for this row. The asset id when there is one, so
  // a caller can map a row back to the bytes it stands for.
  id: attachment.assetId ?? 'part:' + String(attachment.index ?? index),
  name: attachment.filename,
  mimeType: attachment.mimeType,
  // The mail read publishes no per-part size, so none is invented: a missing
  // figure is not a zero-byte file.
  sizeBytes: null,
  availability:
    attachment.state === 'UNSUPPORTED'
      ? { kind: 'unavailable', reason: 'UNSUPPORTED' }
      : attachment.state === 'READY' && targetAssetId !== null
        ? { kind: 'available' }
        : attachment.state === 'READY'
          ? // Imported, but not usable in the scope it is needed in — a clone
            // that did not come back, typically. Not offered, and said so.
            { kind: 'unavailable', reason: 'SCOPE_UNAVAILABLE' }
          : // A state outside the published pair says nothing, and saying
            // nothing is not the same as saying the file can be served.
            { kind: 'unknown' },
});

// Every attachment of one message, read in place: a READY part is usable in
// its own conversation, so its own asset id is the target id.
export const readHermesMailboxRuntimeMessageAttachments = (
  message: HermesMailboxRuntimeMessage,
): HermesMailboxAttachment[] =>
  message.attachments.map((attachment, index) =>
    toHermesMailboxAttachment(attachment, {
      index,
      targetAssetId:
        message.conversationId !== null ? attachment.assetId : null,
    }),
  );
