import { gql } from '@apollo/client';

// The WhatsApp instance state, read only.
//
// This is the backend's existing probe, reused rather than duplicated. The
// server performs one request — the Evolution API's own
// `GET /instance/connectionState/{instance}` — through the SSRF-safe agent,
// with no redirects and a bounded response. It posts no message.
//
// Argument-free by contract: the server resolves the instance of the
// authenticated session's workspace. It requires an unrestricted workspace
// administrator, the same gate as every other connection operation.
//
// `status` carries a distinction worth keeping: PROVIDER_REPORTED_OPEN is a
// linked instance, while CONNECTING and DISCONNECTED mean the gateway
// answered perfectly and the WhatsApp pairing is not finished. The second case
// is neither « connecté » nor a network fault, and the screen says which.
export const HERMES_EVOLUTION_CONNECTION = gql`
  query HermesEvolutionConnection {
    hermesEvolutionConnection {
      status
      providerState
      checkedAt
      errorCode
    }
  }
`;
