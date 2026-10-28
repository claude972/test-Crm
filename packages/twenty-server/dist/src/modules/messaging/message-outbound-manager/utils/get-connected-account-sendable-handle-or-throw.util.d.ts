import { type ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';
export declare const getConnectedAccountSendableHandleOrThrow: ({ connectedAccount, requestedFromHandle, }: {
    connectedAccount: Pick<ConnectedAccountEntity, "handle" | "handleAliases">;
    requestedFromHandle: string;
}) => string;
