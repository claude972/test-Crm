"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCalendarCreationSupportedProvider = void 0;
const types_1 = require("kovaa-lab-shared/types");
const isCalendarCreationSupportedProvider = (provider) => provider === types_1.ConnectedAccountProvider.GOOGLE ||
    provider === types_1.ConnectedAccountProvider.MICROSOFT ||
    provider === types_1.ConnectedAccountProvider.IMAP_SMTP_CALDAV;
exports.isCalendarCreationSupportedProvider = isCalendarCreationSupportedProvider;
