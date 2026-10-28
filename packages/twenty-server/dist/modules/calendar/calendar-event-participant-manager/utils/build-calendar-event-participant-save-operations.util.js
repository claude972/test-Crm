"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCalendarEventParticipantSaveOperations = void 0;
const utils_1 = require("kovaa-lab-shared/utils");
const uuid_1 = require("uuid");
const buildParticipantKey = ({ calendarEventId, handle, }) => `${calendarEventId}:${handle}`;
const hasParticipantChanged = ({ existingParticipant, fetchedParticipant, }) => (existingParticipant.displayName ?? '') !==
    (fetchedParticipant.displayName ?? '') ||
    (existingParticipant.responseStatus ?? '') !==
        (fetchedParticipant.responseStatus ?? '') ||
    existingParticipant.isOrganizer !== fetchedParticipant.isOrganizer;
const buildCalendarEventParticipantSaveOperations = ({ fetchedParticipants, existingParticipants, channelRoleByCalendarEventId, channelHandles, }) => {
    const existingParticipantByKey = new Map();
    for (const existingParticipant of existingParticipants) {
        const participantKey = buildParticipantKey(existingParticipant);
        if (existingParticipantByKey.has(participantKey)) {
            continue;
        }
        existingParticipantByKey.set(participantKey, existingParticipant);
    }
    const operations = {
        participantsToInsert: [],
        participantsToUpdate: [],
        participantIdsToDelete: [],
    };
    for (const fetchedParticipant of fetchedParticipants) {
        const existingParticipant = existingParticipantByKey.get(buildParticipantKey(fetchedParticipant));
        if (!(0, utils_1.isDefined)(existingParticipant)) {
            operations.participantsToInsert.push({
                ...fetchedParticipant,
                id: (0, uuid_1.v4)(),
            });
            continue;
        }
        if (!hasParticipantChanged({ existingParticipant, fetchedParticipant })) {
            continue;
        }
        const channelRole = channelRoleByCalendarEventId.get(fetchedParticipant.calendarEventId);
        switch (channelRole) {
            case 'ONLY_CHANNEL':
            case 'ORGANIZER_CHANNEL':
                break;
            case 'ATTENDEE_CHANNEL':
            case 'ATTENDEE_CHANNEL_WITH_ORGANIZER_SYNCING':
                if (!channelHandles.includes(fetchedParticipant.handle)) {
                    continue;
                }
                break;
            case undefined:
                continue;
            default:
                (0, utils_1.assertUnreachable)(channelRole);
        }
        operations.participantsToUpdate.push({
            criteria: existingParticipant.id,
            partialEntity: fetchedParticipant,
        });
    }
    const fetchedParticipantKeys = new Set(fetchedParticipants.map(buildParticipantKey));
    for (const existingParticipant of existingParticipants) {
        if (fetchedParticipantKeys.has(buildParticipantKey(existingParticipant))) {
            continue;
        }
        const channelRole = channelRoleByCalendarEventId.get(existingParticipant.calendarEventId);
        switch (channelRole) {
            case 'ONLY_CHANNEL':
                operations.participantIdsToDelete.push(existingParticipant.id);
                break;
            case 'ORGANIZER_CHANNEL':
            case 'ATTENDEE_CHANNEL':
            case 'ATTENDEE_CHANNEL_WITH_ORGANIZER_SYNCING':
            case undefined:
                break;
            default:
                (0, utils_1.assertUnreachable)(channelRole);
        }
    }
    return operations;
};
exports.buildCalendarEventParticipantSaveOperations = buildCalendarEventParticipantSaveOperations;
