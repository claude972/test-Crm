import { gql } from '@apollo/client';

// Deliberately argument-free, per the published contract: the server decides
// which workspace this session may see. Sending a workspaceId from the client
// would let the UI ask about a workspace it has no right to.
export const HERMES_EVOLUTION_CONNECTION = gql`
  query HermesEvolutionConnection {
    hermesEvolutionConnection {
      workspaceId
      provider
      status
      providerState
      checkedAt
      errorCode
    }
  }
`;
