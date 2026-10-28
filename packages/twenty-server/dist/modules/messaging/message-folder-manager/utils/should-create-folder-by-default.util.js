"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldCreateFolderByDefault = void 0;
const utils_1 = require("kovaa-lab-shared/utils");
const MESSAGING_FOLDER_MANAGER_ALWAYS_EXCLUDED_FOLDERS_1 = require("src/modules/messaging/message-folder-manager/utils/MESSAGING_FOLDER_MANAGER_ALWAYS_EXCLUDED_FOLDERS");
const shouldCreateFolderByDefault = (standardFolder) => {
    if ((0, utils_1.isDefined)(standardFolder) &&
        MESSAGING_FOLDER_MANAGER_ALWAYS_EXCLUDED_FOLDERS_1.MESSAGING_FOLDER_MANAGER_ALWAYS_EXCLUDED_FOLDERS.includes(standardFolder)) {
        return false;
    }
    return true;
};
exports.shouldCreateFolderByDefault = shouldCreateFolderByDefault;
