import { gql } from '@apollo/client';

// The three write steps of the media lifecycle: prepare, finalize, cancel.
// The fourth step is not here, because it is not GraphQL — the raw bytes are
// PUT to the native quarantine target the prepare answer named.
//
// Lifecycle, as the contract publishes it:
//   prepare -> native upload quarantine -> finalize (after the native
//   magic-byte sniff, size and SHA256) -> READY -> one atomic ATTACHED inside
//   the durable send reservation.
//
// Cancel applies to PENDING and READY only. A sent asset cannot be cancelled as
// a draft, and cancellation durably revokes the asset.
//
// `mimeType` is sent stripped of its parameters. MediaRecorder reports
// `audio/webm;codecs=opus` and the contract refuses a declared type carrying
// parameters — but only the parameters go: the type itself is never rewritten
// into one the server is thought to prefer. If the native sniff reports
// video/webm for audio/webm input, finalize keeps the authoritative MIME with
// kind AUDIO; this client does not relabel anything.
export const HERMES_WA_PREPARE_MEDIA_UPLOAD = gql`
  mutation HermesWaPrepareMediaUpload($input: HermesPrepareMediaUploadInput!) {
    hermesPrepareMediaUpload(input: $input) {
      assetId
      uploadUrl
      contentType
      expiresAt
    }
  }
`;

export const HERMES_WA_FINALIZE_MEDIA_UPLOAD = gql`
  mutation HermesWaFinalizeMediaUpload($input: HermesMediaScopeInput!) {
    hermesFinalizeMediaUpload(input: $input) {
      id
      kind
      filename
      mimeType
      size
      status
    }
  }
`;

export const HERMES_WA_CANCEL_MEDIA_UPLOAD = gql`
  mutation HermesWaCancelMediaUpload($input: HermesMediaScopeInput!) {
    hermesCancelMediaUpload(input: $input)
  }
`;
