import { MessageFolderImportPolicy } from 'kovaa-lab-shared/types';
import { type MessageFolderEntity } from 'src/engine/metadata-modules/message-folder/entities/message-folder.entity';
export declare const computeGmailExcludeSearchFilter: (messageFolders: Pick<MessageFolderEntity, "externalId" | "isSynced" | "name" | "parentFolderId">[], messageFolderImportPolicy: MessageFolderImportPolicy) => string;
