import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { FormsWorkspaceService } from './forms.workspace-service';
import { FormWorkspaceEntity } from './form.workspace-entity';
import { FormResponseWorkspaceEntity } from './form-response.workspace-entity';

@Resolver(() => FormWorkspaceEntity)
export class FormsResolver {
  constructor(private readonly formsService: FormsWorkspaceService) {}

  @Mutation(() => FormWorkspaceEntity)
  async createForm(@Args('data') data: { name: string; description?: string; fields?: Record<string, any>; workspaceId: string }): Promise<FormWorkspaceEntity> {
    return this.formsService.createForm(data);
  }

  @Mutation(() => FormResponseWorkspaceEntity)
  async submitResponse(@Args('data') data: { formId: string; answers: Record<string, any>; personId?: string; companyId?: string; workspaceId: string }): Promise<FormResponseWorkspaceEntity> {
    return this.formsService.submitResponse(data);
  }

  @Query(() => [FormResponseWorkspaceEntity])
  async listResponses(@Args('formId') formId: string, @Args('workspaceId') workspaceId: string): Promise<FormResponseWorkspaceEntity[]> {
    return this.formsService.listResponses(formId, workspaceId);
  }
}
