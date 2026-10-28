"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("kovaa-lab-shared/types");
const compute_folder_ids_to_delete_util_1 = require("src/modules/messaging/message-folder-manager/utils/compute-folder-ids-to-delete.util");
describe('computeFolderIdsToDelete', () => {
    it('should mark folders deleted from provider for deletion', () => {
        const discoveredFolders = [
            {
                name: 'Inbox',
                externalId: 'INBOX',
                isSynced: true,
                isSentFolder: false,
                parentFolderId: null,
            },
        ];
        const existingFolders = [
            {
                id: 'inbox-id',
                name: 'Inbox',
                externalId: 'INBOX',
                isSynced: true,
                isSentFolder: false,
                parentFolderId: null,
                syncCursor: 'cursor',
                pendingSyncAction: types_1.MessageFolderPendingSyncAction.NONE,
            },
            {
                id: 'deleted-label-id',
                name: 'Old Label',
                externalId: 'deleted-label',
                isSynced: true,
                isSentFolder: false,
                parentFolderId: null,
                syncCursor: 'cursor',
                pendingSyncAction: types_1.MessageFolderPendingSyncAction.NONE,
            },
        ];
        const result = (0, compute_folder_ids_to_delete_util_1.computeFolderIdsToDelete)({
            discoveredFolders,
            existingFolders,
        });
        expect(result).toEqual(['deleted-label-id']);
    });
    it('should return empty when all local folders still exist in provider', () => {
        const discoveredFolders = [
            {
                name: 'Inbox',
                externalId: 'INBOX',
                isSynced: true,
                isSentFolder: false,
                parentFolderId: null,
            },
        ];
        const existingFolders = [
            {
                id: 'inbox-id',
                name: 'Inbox',
                externalId: 'INBOX',
                isSynced: true,
                isSentFolder: false,
                parentFolderId: null,
                syncCursor: 'cursor',
                pendingSyncAction: types_1.MessageFolderPendingSyncAction.NONE,
            },
        ];
        const result = (0, compute_folder_ids_to_delete_util_1.computeFolderIdsToDelete)({
            discoveredFolders,
            existingFolders,
        });
        expect(result).toEqual([]);
    });
});
