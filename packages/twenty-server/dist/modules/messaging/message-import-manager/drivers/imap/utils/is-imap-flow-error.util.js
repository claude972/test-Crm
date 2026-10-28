"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isImapFlowError = void 0;
const utils_1 = require("kovaa-lab-shared/utils");
const isImapFlowError = (error) => {
    return ((0, utils_1.isDefined)(error) &&
        ('serverResponseCode' in error ||
            'responseStatus' in error ||
            'responseText' in error ||
            'executedCommand' in error ||
            'authenticationFailed' in error));
};
exports.isImapFlowError = isImapFlowError;
