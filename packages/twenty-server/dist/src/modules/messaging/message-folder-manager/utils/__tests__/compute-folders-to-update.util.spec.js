"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("kovaa-lab-shared/types");
const compute_folders_to_update_util_1 = require("src/modules/messaging/message-folder-manager/utils/compute-folders-to-update.util");
describe('computeFoldersToUpdate', () => {
    it('should detect folder rename from provider', () => {
        const discoveredFolders = [
            {
                name: 'Work Emails',
                externalId: 'label-123',
                isSynced: true,
                isSentFolder: false,
                parentFolderId: null,
            },
        ];
        const existingFolders = [
            {
                id: 'folder-id',
                name: 'Old Label Name',
                externalId: 'label-123',
                isSynced: true,
                isSentFolder: false,
                parentFolderId: null,
                syncCursor: 'cursor',
                pendingSyncAction: types_1.MessageFolderPendingSyncAction.NONE,
            },
        ];
        const result = (0, compute_folders_to_update_util_1.computeFoldersToUpdate)({
            discoveredFolders,
            existingFolders,
        });
        expect(result.get('folder-id')?.name).toBe('Work Emails');
    });
    it('should detect folder moved to different parent', () => {
        const discoveredFolders = [
            {
                name: 'Subfolder',
                externalId: 'sub-1',
                isSynced: true,
                isSentFolder: false,
                parentFolderId: 'new-parent-ext',
            },
        ];
        const existingFolders = [
            {
                id: 'folder-id',
                name: 'Subfolder',
                externalId: 'sub-1',
                isSynced: true,
                isSentFolder: false,
                parentFolderId: 'old-parent-ext',
                syncCursor: 'cursor',
                pendingSyncAction: types_1.MessageFolderPendingSyncAction.NONE,
            },
        ];
        const result = (0, compute_folders_to_update_util_1.computeFoldersToUpdate)({
            discoveredFolders,
            existingFolders,
        });
        expect(result.get('folder-id')?.parentFolderId).toBe('new-parent-ext');
    });
    it('should not flag unchanged folders for update', () => {
        const folder = {
            name: 'Inbox',
            externalId: 'INBOX',
            isSynced: true,
            isSentFolder: false,
            parentFolderId: null,
        };
        const discoveredFolders = [folder];
        const existingFolders = [
            {
                ...folder,
                id: 'folder-id',
                syncCursor: 'cursor',
                pendingSyncAction: types_1.MessageFolderPendingSyncAction.NONE,
            },
        ];
        const result = (0, compute_folders_to_update_util_1.computeFoldersToUpdate)({
            discoveredFolders,
            existingFolders,
        });
        expect(result.size).toBe(0);
    });
    it('should treat empty string parentFolderId same as null', () => {
        const discoveredFolders = [
            {
                name: 'Folder',
                externalId: 'ext-1',
                isSynced: true,
                isSentFolder: false,
                parentFolderId: '',
            },
        ];
        const existingFolders = [
            {
                id: 'folder-id',
                name: 'Folder',
                externalId: 'ext-1',
                isSynced: true,
                isSentFolder: false,
                parentFolderId: null,
                syncCursor: 'cursor',
                pendingSyncAction: types_1.MessageFolderPendingSyncAction.NONE,
            },
        ];
        const result = (0, compute_folders_to_update_util_1.computeFoldersToUpdate)({
            discoveredFolders,
            existingFolders,
        });
        expect(result.size).toBe(0);
    });
});
