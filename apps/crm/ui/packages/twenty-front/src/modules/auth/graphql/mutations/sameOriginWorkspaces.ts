import { gql } from '@apollo/client';

export type SameOriginWorkspaceLogin = {
  loginToken: { token: string };
  workspace: { id: string };
};

export const CREATE_WORKSPACE_ON_SAME_ORIGIN = gql`
  mutation CreateWorkspaceOnSameOrigin(
    $input: CreateWorkspaceOnSameOriginInput!
  ) {
    createWorkspaceOnSameOrigin(input: $input) {
      loginToken {
        token
      }
      workspace {
        id
      }
    }
  }
`;

export const SELECT_WORKSPACE_ON_SAME_ORIGIN = gql`
  mutation SelectWorkspaceOnSameOrigin(
    $input: SelectWorkspaceOnSameOriginInput!
  ) {
    selectWorkspaceOnSameOrigin(input: $input) {
      loginToken {
        token
      }
      workspace {
        id
      }
    }
  }
`;
