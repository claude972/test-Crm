import { gql } from '@apollo/client';

// The WhatsApp instance state, read only: the backend's existing probe,
// reused. One `GET /instance/connectionState/{instance}` through the SSRF-safe
// agent; it posts no message. Argument-free by contract, and gated on an
// unrestricted workspace administrator. CONNECTING and DISCONNECTED mean the
// gateway answered while the pairing is unfinished — neither state is a fault.
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
