import { type WorkspaceUrls } from '~/generated-metadata/graphql';

// A structure IS an existing workspace, identified only by workspaceId: the
// contract adds no grouping entity. requiresAuthentication marks a structure
// whose own SSO or 2FA the current session does not satisfy.
export type HermesAuthorizedStructure = {
  workspaceId: string;
  displayName: string;
  isCurrent: boolean;
  requiresAuthentication: boolean;
  workspaceUrls: Pick<WorkspaceUrls, 'subdomainUrl' | 'customUrl'>;
};
