import { gql } from '@apollo/client';

// A typed DTO, unlike the four GraphQLJSONObject operations. Every field below
// is checked against hermes-intake-state.dto.ts.
//
// No argument: the workspace comes from the session. Nothing here carries a
// secret — the HMAC key, the nonce and the absolute webhook URL are not in
// this type and must never be.
export const HERMES_INTAKE_STATE = gql`
  query HermesIntakeState {
    hermesIntakeState {
      status
      checkedAt
      errorCode
      endpoints {
        connectionId
        structureId
        structureName
        label
        isAccepting
        lastCollectionAt
        providerState
        errorCode
        sources {
          source
          relativeEndpoint
          humanQualificationRequired
          nativeContactCreationEnabled
        }
      }
    }
  }
`;
