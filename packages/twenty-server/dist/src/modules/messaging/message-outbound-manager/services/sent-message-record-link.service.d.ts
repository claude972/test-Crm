import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { RecordPermissionsService } from 'src/engine/metadata-modules/record-permissions/services/record-permissions.service';
import { WorkspaceOrmManager } from 'src/engine/kovaa-lab-orm/workspace-orm.manager';
export declare class SentMessageRecordLinkService {
    private readonly workspaceOrmManager;
    private readonly recordPermissionsService;
    constructor(workspaceOrmManager: WorkspaceOrmManager, recordPermissionsService: RecordPermissionsService);
    linkSentMessageThreadToRecord({ authContext, messageThreadId, objectNameSingular, recordId, }: {
        authContext: WorkspaceAuthContext;
        messageThreadId: string;
        objectNameSingular: string;
        recordId: string;
    }): Promise<void>;
}
