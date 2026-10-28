import { Repository } from 'typeorm';
import { MessageChannelEntity } from 'src/engine/metadata-modules/message-channel/entities/message-channel.entity';
import { WorkspaceOrmManager } from 'src/engine/kovaa-lab-orm/workspace-orm.manager';
export type MessagingRelaunchFailedMessageChannelJobData = {
    workspaceId: string;
    messageChannelId: string;
};
export declare class MessagingRelaunchFailedMessageChannelJob {
    private readonly workspaceOrmManager;
    private readonly messageChannelRepository;
    constructor(workspaceOrmManager: WorkspaceOrmManager, messageChannelRepository: Repository<MessageChannelEntity>);
    handle(data: MessagingRelaunchFailedMessageChannelJobData): Promise<void>;
}
