"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("kovaa-lab-shared/types");
const compute_folders_to_create_util_1 = require("src/modules/messaging/message-folder-manager/utils/compute-folders-to-create.util");
describe('computeFoldersToCreate', () => {
    const messageChannelId = 'channel-123';
    it('should create folders that exist in provider but not locally', () => {
        const discoveredFolders = [
            {
                name: 'Inbox',
                externalId: 'INBOX',
                isSynced: true,
                isSentFolder: false,
                parentFolderId: null,
            },
            {
                name: 'Sent',
                externalId: 'SENT',
                isSynced: true,
                isSentFolder: true,
                parentFolderId: null,
            },
        ];
        const existingFolders = [
            {
                id: 'existing-id',
                name: 'Inbox',
                externalId: 'INBOX',
                isSynced: true,
                isSentFolder: false,
                parentFolderId: null,
                syncCursor: 'cursor',
                pendingSyncAction: types_1.MessageFolderPendingSyncAction.NONE,
            },
        ];
        const result = (0, compute_folders_to_create_util_1.computeFoldersToCreate)({
            discoveredFolders,
            existingFolders,
            messageChannelId,
        });
        expect(result).toHaveLength(1);
        expect(result[0].externalId).toBe('SENT');
        expect(result[0].messageChannelId).toBe(messageChannelId);
        expect(result[0].syncCursor).toBeNull();
    });
    it('should normalize empty parentFolderId to null', () => {
        const discoveredFolders = [
            {
                name: 'Subfolder',
                externalId: 'sub-1',
                isSynced: true,
                isSentFolder: false,
                parentFolderId: '',
            },
        ];
        const result = (0, compute_folders_to_create_util_1.computeFoldersToCreate)({
            discoveredFolders,
            existingFolders: [],
            messageChannelId,
        });
        expect(result[0].parentFolderId).toBeNull();
    });
});
