"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSameCalDavResource = void 0;
const utils_1 = require("kovaa-lab-shared/utils");
const isSameCalDavResource = (href, otherHref) => {
    const resolvedHref = URL.parse(href, otherHref);
    const resolvedOtherHref = URL.parse(otherHref);
    if (!(0, utils_1.isDefined)(resolvedHref) || !(0, utils_1.isDefined)(resolvedOtherHref)) {
        return false;
    }
    return (resolvedHref.origin === resolvedOtherHref.origin &&
        resolvedHref.pathname.replace(/\/+$/, '') ===
            resolvedOtherHref.pathname.replace(/\/+$/, ''));
};
exports.isSameCalDavResource = isSameCalDavResource;
