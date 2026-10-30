import { gql } from '@apollo/client';

export const HERMES_AUTHORIZED_STRUCTURES = gql`
  query HermesStructures {
    hermesAuthorizedStructures {
      workspaceId
      displayName
      isCurrent
      requiresAuthentication
      workspaceUrls {
        subdomainUrl
        customUrl
      }
    }
  }
`;
