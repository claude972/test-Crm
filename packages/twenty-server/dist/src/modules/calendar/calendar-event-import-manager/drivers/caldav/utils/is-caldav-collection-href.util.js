"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCalDavCollectionHref = void 0;
const utils_1 = require("kovaa-lab-shared/utils");
const is_same_caldav_resource_util_1 = require("src/modules/calendar/calendar-event-import-manager/drivers/caldav/utils/is-same-caldav-resource.util");
const isCalDavCollectionHref = (href, collectionUrl) => {
    const resolvedHref = URL.parse(href, collectionUrl);
    if (!(0, utils_1.isDefined)(resolvedHref)) {
        return false;
    }
    return (resolvedHref.pathname.endsWith('/') ||
        (0, is_same_caldav_resource_util_1.isSameCalDavResource)(href, collectionUrl));
};
exports.isCalDavCollectionHref = isCalDavCollectionHref;
