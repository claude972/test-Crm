export declare class FormSubmissionEntity {
    id: string;
    formId: string;
    data: Record<string, any>;
    submitterId: string;
    submitterEmail: string;
    status: 'pending' | 'completed' | 'failed';
    submittedAt: Date;
}
