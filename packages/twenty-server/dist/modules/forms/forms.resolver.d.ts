import { FormsWorkspaceService } from './forms.workspace-service';
import { FormWorkspaceEntity } from './form.workspace-entity';
import { FormResponseWorkspaceEntity } from './form-response.workspace-entity';
export declare class FormsResolver {
    private readonly formsService;
    constructor(formsService: FormsWorkspaceService);
    createForm(data: {
        name: string;
        description?: string;
        fields?: Record<string, any>;
        workspaceId: string;
    }): Promise<FormWorkspaceEntity>;
    submitResponse(data: {
        formId: string;
        answers: Record<string, any>;
        personId?: string;
        companyId?: string;
        workspaceId: string;
    }): Promise<FormResponseWorkspaceEntity>;
    listResponses(formId: string, workspaceId: string): Promise<FormResponseWorkspaceEntity[]>;
}
