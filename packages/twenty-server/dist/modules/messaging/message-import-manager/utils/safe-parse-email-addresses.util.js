"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeParseEmailAddresses = void 0;
const guards_1 = require("@sniptt/guards");
const utils_1 = require("kovaa-lab-shared/utils");
const safeParseEmailAddresses = (header) => {
    return (0, utils_1.parseEmailAddressList)(header).filter((parsedAddress) => (0, guards_1.isNonEmptyString)(parsedAddress.address));
};
exports.safeParseEmailAddresses = safeParseEmailAddresses;
