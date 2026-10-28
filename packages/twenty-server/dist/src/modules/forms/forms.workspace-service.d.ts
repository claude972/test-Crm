import { FormWorkspaceEntity } from './form.workspace-entity';
import { FormResponseWorkspaceEntity } from './form-response.workspace-entity';
interface FormInput {
    name: string;
    description?: string | null;
    fields?: Record<string, any>;
    workspaceId: string;
}
interface ResponseInput {
    formId: string;
    answers: Record<string, any>;
    personId?: string | null;
    companyId?: string | null;
    workspaceId: string;
}
export declare class FormsWorkspaceService {
    createForm(data: FormInput): Promise<FormWorkspaceEntity>;
    submitResponse(data: ResponseInput): Promise<FormResponseWorkspaceEntity>;
    listResponses(formId: string, workspaceId: string): Promise<FormResponseWorkspaceEntity[]>;
}
export {};
