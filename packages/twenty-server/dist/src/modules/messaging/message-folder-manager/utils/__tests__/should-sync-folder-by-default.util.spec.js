"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("kovaa-lab-shared/types");
const should_sync_folder_by_default_util_1 = require("src/modules/messaging/message-folder-manager/utils/should-sync-folder-by-default.util");
describe('shouldSyncFolderByDefault', () => {
    describe('when messageFolderImportPolicy is SELECTED_FOLDERS', () => {
        it('should return false for all folders', () => {
            const result = (0, should_sync_folder_by_default_util_1.shouldSyncFolderByDefault)(types_1.MessageFolderImportPolicy.SELECTED_FOLDERS);
            expect(result).toBe(false);
        });
    });
    describe('when messageFolderImportPolicy is ALL_FOLDERS', () => {
        it('should return true for all folders', () => {
            const result = (0, should_sync_folder_by_default_util_1.shouldSyncFolderByDefault)(types_1.MessageFolderImportPolicy.ALL_FOLDERS);
            expect(result).toBe(true);
        });
    });
});
