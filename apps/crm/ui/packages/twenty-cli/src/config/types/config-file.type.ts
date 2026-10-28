export type RemoteEntry = {
  apiUrl: string;
  apiKey?: string;
  kovaa-labCLIAccessToken?: string;
  kovaa-labCLIRefreshToken?: string;
  kovaa-labCLIRegistrationClientId?: string;
  workspaceName?: string;
  [field: string]: unknown;
};

export type ConfigFile = {
  version: 1;
  defaultRemote?: string;
  remotes: Record<string, RemoteEntry>;
  [field: string]: unknown;
};
