"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeCalendarEventChannelRole = void 0;
const types_1 = require("kovaa-lab-shared/types");
const utils_1 = require("kovaa-lab-shared/utils");
const get_calendar_channel_handles_util_1 = require("src/modules/calendar/calendar-event-import-manager/utils/get-calendar-channel-handles.util");
const computeCalendarEventChannelRole = ({ organizerHandle, channelHandles, otherChannelIds, calendarChannelById, }) => {
    if (otherChannelIds.length === 0) {
        return 'ONLY_CHANNEL';
    }
    if (channelHandles.includes(organizerHandle)) {
        return 'ORGANIZER_CHANNEL';
    }
    const isOrganizerChannelSyncing = otherChannelIds.some((otherChannelId) => {
        const otherChannel = calendarChannelById.get(otherChannelId);
        if (!(0, utils_1.isDefined)(otherChannel) ||
            !otherChannel.isSyncEnabled ||
            !(0, get_calendar_channel_handles_util_1.getCalendarChannelHandles)({
                calendarChannel: otherChannel,
                connectedAccount: otherChannel.connectedAccount,
            }).includes(organizerHandle)) {
            return false;
        }
        switch (otherChannel.syncStatus) {
            case types_1.CalendarChannelSyncStatus.ACTIVE:
            case types_1.CalendarChannelSyncStatus.ONGOING:
                return true;
            case types_1.CalendarChannelSyncStatus.NOT_SYNCED:
            case types_1.CalendarChannelSyncStatus.FAILED_INSUFFICIENT_PERMISSIONS:
            case types_1.CalendarChannelSyncStatus.FAILED_UNKNOWN:
                return false;
            default:
                return (0, utils_1.assertUnreachable)(otherChannel.syncStatus);
        }
    });
    return isOrganizerChannelSyncing
        ? 'ATTENDEE_CHANNEL_WITH_ORGANIZER_SYNCING'
        : 'ATTENDEE_CHANNEL';
};
exports.computeCalendarEventChannelRole = computeCalendarEventChannelRole;
