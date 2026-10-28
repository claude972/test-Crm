"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("kovaa-lab-shared/types");
const compute_gmail_exclude_search_filter_util_1 = require("src/modules/messaging/message-import-manager/drivers/gmail/utils/compute-gmail-exclude-search-filter.util");
describe('computeGmailExcludeSearchFilter', () => {
    describe('SELECTED_FOLDERS policy', () => {
        it('returns empty string when no folders are synced', () => {
            const result = (0, compute_gmail_exclude_search_filter_util_1.computeGmailExcludeSearchFilter)([
                {
                    externalId: 'INBOX',
                    name: 'INBOX',
                    isSynced: false,
                    parentFolderId: null,
                },
            ], types_1.MessageFolderImportPolicy.SELECTED_FOLDERS);
            expect(result).toBe('');
        });
        it('builds positive OR query for selected user labels without category exclusions', () => {
            const result = (0, compute_gmail_exclude_search_filter_util_1.computeGmailExcludeSearchFilter)([
                {
                    externalId: 'Label_1',
                    name: 'CRM',
                    isSynced: true,
                    parentFolderId: null,
                },
                {
                    externalId: 'Label_2',
                    name: 'KovaaLab CRM visible',
                    isSynced: true,
                    parentFolderId: null,
                },
                {
                    externalId: 'INBOX',
                    name: 'INBOX',
                    isSynced: false,
                    parentFolderId: null,
                },
            ], types_1.MessageFolderImportPolicy.SELECTED_FOLDERS);
            expect(result).toContain('(label:crm OR label:kovaa-lab-visible)');
            expect(result).toContain('-label:spam');
            expect(result).toContain('-label:trash');
            expect(result).not.toContain('-category:promotions');
            expect(result).not.toContain('-category:updates');
        });
        it('includes category exclusions when INBOX is selected', () => {
            const result = (0, compute_gmail_exclude_search_filter_util_1.computeGmailExcludeSearchFilter)([
                {
                    externalId: 'INBOX',
                    name: 'INBOX',
                    isSynced: true,
                    parentFolderId: null,
                },
                {
                    externalId: 'Label_1',
                    name: 'CRM',
                    isSynced: false,
                    parentFolderId: null,
                },
            ], types_1.MessageFolderImportPolicy.SELECTED_FOLDERS);
            expect(result).toContain('label:inbox');
            expect(result).toContain('-category:promotions');
            expect(result).toContain('-category:social');
            expect(result).toContain('-label:spam');
        });
        it('excludes category filters when user label and INBOX are both selected', () => {
            const result = (0, compute_gmail_exclude_search_filter_util_1.computeGmailExcludeSearchFilter)([
                {
                    externalId: 'INBOX',
                    name: 'INBOX',
                    isSynced: true,
                    parentFolderId: null,
                },
                {
                    externalId: 'Label_1',
                    name: 'CRM',
                    isSynced: true,
                    parentFolderId: null,
                },
                {
                    externalId: 'SENT',
                    name: 'SENT',
                    isSynced: false,
                    parentFolderId: null,
                },
            ], types_1.MessageFolderImportPolicy.SELECTED_FOLDERS);
            expect(result).toContain('label:crm');
            expect(result).toContain('label:inbox');
            expect(result).not.toContain('-category:promotions');
            expect(result).toContain('-label:spam');
        });
        it('returns only default exclusions when all folders are synced', () => {
            const result = (0, compute_gmail_exclude_search_filter_util_1.computeGmailExcludeSearchFilter)([
                {
                    externalId: 'INBOX',
                    name: 'INBOX',
                    isSynced: true,
                    parentFolderId: null,
                },
                {
                    externalId: 'Label_1',
                    name: 'CRM',
                    isSynced: true,
                    parentFolderId: null,
                },
            ], types_1.MessageFolderImportPolicy.SELECTED_FOLDERS);
            expect(result).toContain('-label:spam');
            expect(result).toContain('-category:promotions');
            expect(result).not.toContain('label:inbox');
            expect(result).not.toContain('label:crm');
        });
        it('handles nested folder paths correctly', () => {
            const result = (0, compute_gmail_exclude_search_filter_util_1.computeGmailExcludeSearchFilter)([
                {
                    externalId: 'Label_parent',
                    name: 'Projects',
                    isSynced: false,
                    parentFolderId: null,
                },
                {
                    externalId: 'Label_child',
                    name: 'Active',
                    isSynced: true,
                    parentFolderId: 'Label_parent',
                },
            ], types_1.MessageFolderImportPolicy.SELECTED_FOLDERS);
            expect(result).toContain('label:projects-active');
        });
    });
    describe('ALL_FOLDERS policy', () => {
        it('returns only default exclusions', () => {
            const result = (0, compute_gmail_exclude_search_filter_util_1.computeGmailExcludeSearchFilter)([
                {
                    externalId: 'INBOX',
                    name: 'INBOX',
                    isSynced: true,
                    parentFolderId: null,
                },
            ], types_1.MessageFolderImportPolicy.ALL_FOLDERS);
            expect(result).toContain('-label:spam');
            expect(result).toContain('-category:promotions');
            expect(result).not.toContain('label:inbox');
        });
    });
    it('uses -label: syntax for system exclusions', () => {
        const result = (0, compute_gmail_exclude_search_filter_util_1.computeGmailExcludeSearchFilter)([
            {
                externalId: 'Label_1',
                name: 'Work',
                isSynced: true,
                parentFolderId: null,
            },
        ], types_1.MessageFolderImportPolicy.SELECTED_FOLDERS);
        expect(result).toContain('-label:trash');
        expect(result).toContain('-label:spam');
        expect(result).toContain('-label:chat');
        expect(result).not.toContain('-label:draft');
    });
    it('uses -category: syntax for category exclusions in ALL_FOLDERS mode', () => {
        const result = (0, compute_gmail_exclude_search_filter_util_1.computeGmailExcludeSearchFilter)([], types_1.MessageFolderImportPolicy.ALL_FOLDERS);
        expect(result).toContain('-category:promotions');
        expect(result).toContain('-category:social');
        expect(result).toContain('-category:forums');
        expect(result).toContain('-category:updates');
    });
});
