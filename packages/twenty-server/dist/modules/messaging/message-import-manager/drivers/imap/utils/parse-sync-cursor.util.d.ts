export type ImapSyncCursor = {
    highestUid: number;
    uidValidity: number;
    modSeq?: string;
};
export declare const parseSyncCursor: (cursor: string | null) => ImapSyncCursor | null;
