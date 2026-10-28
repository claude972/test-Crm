import { MatchParticipantService } from 'src/modules/match-participant/match-participant.service';
import { PersonHandleFieldService } from 'src/modules/match-participant/person-handle-field/person-handle-field.service';
import { type MessageParticipantWorkspaceEntity } from 'src/modules/messaging/common/standard-objects/message-participant.workspace-entity';
export type PersonHandleMatching = {
    fieldUniversalIdentifier: string;
    messageChannelIds: string[];
    handles: string[];
    changedPersonIds: string[];
};
export type MessageParticipantMatchParticipantJobData = {
    workspaceId: string;
    participantMatching: {
        personEmails: string[];
        workspaceMemberIds: string[];
    };
    personHandleMatching?: PersonHandleMatching[];
};
export declare class MessageParticipantMatchParticipantJob {
    private readonly matchParticipantService;
    private readonly personHandleFieldService;
    constructor(matchParticipantService: MatchParticipantService<MessageParticipantWorkspaceEntity>, personHandleFieldService: PersonHandleFieldService);
    handle(data: MessageParticipantMatchParticipantJobData): Promise<void>;
}
