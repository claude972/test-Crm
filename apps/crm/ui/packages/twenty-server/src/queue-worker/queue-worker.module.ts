import { Module, type OnModuleDestroy } from '@nestjs/common';

import { CoreEngineModule } from 'src/engine/core-modules/core-engine.module';
import { JobsModule } from 'src/engine/core-modules/message-queue/jobs.module';
import { MessageQueueModule } from 'src/engine/core-modules/message-queue/message-queue.module';
import { MessageQueueWorkerDrainService } from 'src/engine/core-modules/message-queue/services/message-queue-worker-drain.service';
import { KovaaLab CRMOrmModule } from 'src/engine/kovaa-lab-orm/kovaa-lab-orm.module';
import { WorkspaceEventEmitterModule } from 'src/engine/workspace-event-emitter/workspace-event-emitter.module';
import { ModulesModule } from 'src/modules/modules.module';

@Module({
  imports: [
    CoreEngineModule,
    ModulesModule,
    MessageQueueModule.registerExplorer(),
    WorkspaceEventEmitterModule,
    JobsModule,
    KovaaLab CRMOrmModule,
  ],
})
export class QueueWorkerModule implements OnModuleDestroy {
  constructor(
    private readonly messageQueueWorkerDrainService: MessageQueueWorkerDrainService,
  ) {}

  async onModuleDestroy() {
    await this.messageQueueWorkerDrainService.drainWorkers();
  }
}
