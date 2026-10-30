import { gql } from '@apollo/client';

export const GET_AUTH_TOKENS_FROM_SSO_EXCHANGE_TOKEN = gql`
  mutation getAuthTokensFromSSOExchangeToken($ssoExchangeToken: String!) {
    getAuthTokensFromSSOExchangeToken(ssoExchangeToken: $ssoExchangeToken) {
      tokens {
        ...AuthTokenPairFragment
      }
    }
  }
`;

export const GET_AUTH_TOKENS_FROM_SSO_EXCHANGE_TOKEN_WITH_WORKSPACE = gql`
  mutation getAuthTokensFromSSOExchangeTokenWithWorkspace(
    $ssoExchangeToken: String!
  ) {
    getAuthTokensFromSSOExchangeToken(ssoExchangeToken: $ssoExchangeToken) {
      tokens {
        accessOrWorkspaceAgnosticToken {
          token
          expiresAt
        }
        refreshToken {
          token
          expiresAt
        }
      }
      workspaceLoginToken {
        token
        expiresAt
      }
    }
  }
`;
