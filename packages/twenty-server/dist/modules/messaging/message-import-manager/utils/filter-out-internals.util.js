"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterOutInternals = void 0;
const utils_1 = require("kovaa-lab-shared/utils");
const get_domain_from_email_or_throw_1 = require("src/utils/get-domain-from-email-or-throw");
const filterOutInternals = (primaryHandle, messages) => {
    return messages.filter((message) => {
        if (!message.participants) {
            return true;
        }
        const primaryHandleDomain = (0, get_domain_from_email_or_throw_1.getDomainFromEmailOrThrow)(primaryHandle);
        try {
            const isAllHandlesFromSameDomain = message.participants
                .filter((participant) => (0, utils_1.isDefined)(participant.handle))
                .every((participant) => (0, utils_1.isDefined)(participant.handle) &&
                (0, get_domain_from_email_or_throw_1.getDomainFromEmailOrThrow)(participant.handle) ===
                    primaryHandleDomain);
            if (isAllHandlesFromSameDomain) {
                return false;
            }
        }
        catch {
            return true;
        }
        return true;
    });
};
exports.filterOutInternals = filterOutInternals;
