import { Module } from '@nestjs/common';
import { FormsWorkspaceService } from './forms.workspace-service';
import { FormsResolver } from './forms.resolver';

@Module({
  providers: [
    FormsWorkspaceService,
    FormsResolver,
  ],
  exports: [
    FormsWorkspaceService,
  ],
})
export class FormsModule {}
