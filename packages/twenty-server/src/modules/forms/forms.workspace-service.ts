import { Injectable } from '@nestjs/common';
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

@Injectable()
export class FormsWorkspaceService {
  async createForm(data: FormInput): Promise<FormWorkspaceEntity> {
    const form: FormWorkspaceEntity = {
      id: crypto.randomUUID(),
      name: data.name,
      description: data.description,
      fields: data.fields || {},
      isActive: true,
      workspaceId: data.workspaceId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    };
    return form;
  }

  async submitResponse(data: ResponseInput): Promise<FormResponseWorkspaceEntity> {
    const response: FormResponseWorkspaceEntity = {
      id: crypto.randomUUID(),
      formId: data.formId,
      personId: data.personId,
      companyId: data.companyId,
      answers: data.answers,
      submittedAt: new Date().toISOString(),
      status: 'SUBMITTED',
      workspaceId: data.workspaceId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    };
    return response;
  }

  async listResponses(formId: string, workspaceId: string): Promise<FormResponseWorkspaceEntity[]> {
    // TODO: implement repository query with workspace isolation
    return [];
  }
}
