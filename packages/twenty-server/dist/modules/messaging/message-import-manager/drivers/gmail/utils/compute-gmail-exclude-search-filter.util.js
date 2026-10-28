"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeGmailExcludeSearchFilter = void 0;
const utils_1 = require("kovaa-lab-shared/utils");
const types_1 = require("kovaa-lab-shared/types");
const messaging_gmail_default_excluded_labels_constant_1 = require("src/modules/messaging/message-import-manager/drivers/gmail/constants/messaging-gmail-default-excluded-labels.constant");
const messaging_gmail_excluded_system_labels_constant_1 = require("src/modules/messaging/message-import-manager/drivers/gmail/constants/messaging-gmail-excluded-system-labels.constant");
const messaging_gmail_folders_with_category_exclusions_constant_1 = require("src/modules/messaging/message-import-manager/drivers/gmail/constants/messaging-gmail-folders-with-category-exclusions.constant");
const build_gmail_label_search_name_util_1 = require("src/modules/messaging/message-import-manager/drivers/gmail/utils/build-gmail-label-search-name.util");
const compute_gmail_default_not_synced_labels_search_filter_1 = require("src/modules/messaging/message-import-manager/drivers/gmail/utils/compute-gmail-default-not-synced-labels-search-filter");
const computeGmailExcludeSearchFilter = (messageFolders, messageFolderImportPolicy) => {
    const allExclusions = messaging_gmail_default_excluded_labels_constant_1.MESSAGING_GMAIL_DEFAULT_EXCLUDED_LABELS.map(compute_gmail_default_not_synced_labels_search_filter_1.computeGmailDefaultNotSyncedLabelsSearchFilter).join(' ');
    const systemExclusions = messaging_gmail_excluded_system_labels_constant_1.MESSAGING_GMAIL_EXCLUDED_SYSTEM_LABELS.map(compute_gmail_default_not_synced_labels_search_filter_1.computeGmailDefaultNotSyncedLabelsSearchFilter).join(' ');
    if (messageFolderImportPolicy === types_1.MessageFolderImportPolicy.ALL_FOLDERS) {
        return allExclusions;
    }
    const syncedFolders = messageFolders.filter((folder) => folder.isSynced);
    const allFoldersSynced = messageFolders.length > 0 &&
        messageFolders.every((folder) => folder.isSynced);
    if (allFoldersSynced) {
        return allExclusions;
    }
    const labelNamesToInclude = syncedFolders
        .map((folder) => (0, build_gmail_label_search_name_util_1.buildGmailLabelSearchName)(folder, messageFolders))
        .filter(utils_1.isDefined);
    if (labelNamesToInclude.length === 0) {
        return '';
    }
    const inclusionQuery = labelNamesToInclude.length === 1
        ? `label:${labelNamesToInclude[0]}`
        : `(${labelNamesToInclude.map((name) => `label:${name}`).join(' OR ')})`;
    const hasCustomLabelSelected = syncedFolders.some((folder) => !messaging_gmail_folders_with_category_exclusions_constant_1.MESSAGING_GMAIL_FOLDERS_WITH_CATEGORY_EXCLUSIONS.includes(folder.externalId ?? ''));
    if (hasCustomLabelSelected) {
        return `${inclusionQuery} ${systemExclusions}`;
    }
    return `${inclusionQuery} ${allExclusions}`;
};
exports.computeGmailExcludeSearchFilter = computeGmailExcludeSearchFilter;
