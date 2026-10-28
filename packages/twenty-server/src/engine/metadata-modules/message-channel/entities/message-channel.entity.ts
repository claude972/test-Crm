export class MessageChannelEntity {
  id: string;
  name: string;
  type: string;
  syncStatus: 'SYNCED' | 'NOT_SYNCED' | 'FAILED';
  connectedAccountId: string;
  workspaceId: string;
  lastSyncedAt?: Date;
  errorMessage?: string;
}
