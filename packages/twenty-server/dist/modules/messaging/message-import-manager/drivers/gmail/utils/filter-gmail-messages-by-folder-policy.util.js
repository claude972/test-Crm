"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterGmailMessagesByFolderPolicy = void 0;
const types_1 = require("kovaa-lab-shared/types");
const messaging_gmail_excluded_category_labels_constant_1 = require("src/modules/messaging/message-import-manager/drivers/gmail/constants/messaging-gmail-excluded-category-labels.constant");
const messaging_gmail_folders_with_category_exclusions_constant_1 = require("src/modules/messaging/message-import-manager/drivers/gmail/constants/messaging-gmail-folders-with-category-exclusions.constant");
const filterGmailMessagesByFolderPolicy = (messages, messageChannel) => {
    const { messageFolders, messageFolderImportPolicy } = messageChannel;
    if (messageFolderImportPolicy === types_1.MessageFolderImportPolicy.ALL_FOLDERS) {
        return messages;
    }
    const syncedFolderExternalIds = (messageFolders ?? [])
        .filter((folder) => folder.isSynced && folder.externalId)
        .map((folder) => folder.externalId);
    return messages.filter((message) => {
        const messageLabelIds = message.labelIds ?? [];
        const messageIsInAtLeastOneSyncedFolder = messageLabelIds.some((labelId) => syncedFolderExternalIds.includes(labelId));
        if (!messageIsInAtLeastOneSyncedFolder) {
            return false;
        }
        const messageIsInSyncedCustomFolder = messageLabelIds.some((labelId) => syncedFolderExternalIds.includes(labelId) &&
            !messaging_gmail_folders_with_category_exclusions_constant_1.MESSAGING_GMAIL_FOLDERS_WITH_CATEGORY_EXCLUSIONS.includes(labelId));
        if (messageIsInSyncedCustomFolder) {
            return true;
        }
        const messageHasExcludedCategoryLabel = messageLabelIds.some((labelId) => messaging_gmail_excluded_category_labels_constant_1.MESSAGING_GMAIL_EXCLUDED_CATEGORY_LABELS.includes(labelId));
        return !messageHasExcludedCategoryLabel;
    });
};
exports.filterGmailMessagesByFolderPolicy = filterGmailMessagesByFolderPolicy;
