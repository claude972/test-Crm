export const mockMicrosoftMessages: any[] = [];
export const mockMicrosoftFolders: any[] = [];

export const microsoftGraphWithMessagesDeltaLink = {
  '@odata.deltaLink':
    'https://graph.microsoft.com/v1.0/me/mailFolders/INBOX/messages/delta?$select=id',
  value: [
    { id: 'message-1', subject: 'Test message 1' },
    { id: 'message-2', subject: 'Test message 2' },
    { id: 'message-3', subject: 'Test message 3' },
  ],
};
