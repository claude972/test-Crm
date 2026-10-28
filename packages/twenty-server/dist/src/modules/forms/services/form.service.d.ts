import { Repository } from 'typeorm';
import { FormEntity } from './entities/form.entity';
import { FormSubmissionEntity } from './entities/form-submission.entity';
export declare class FormService {
    private formRepo;
    private submissionRepo;
    private readonly logger;
    constructor(formRepo: Repository<FormEntity>, submissionRepo: Repository<FormSubmissionEntity>);
    createForm(data: {
        title: string;
        description?: string;
        fields: Record<string, any>;
        workspaceId?: string;
    }): Promise<FormEntity>;
    getForm(id: string): Promise<FormEntity | null>;
    listForms(workspaceId?: string): Promise<FormEntity[]>;
    submitForm(formId: string, data: Record<string, any>, submitterEmail?: string): Promise<FormSubmissionEntity>;
    getSubmissions(formId: string): Promise<FormSubmissionEntity[]>;
}
