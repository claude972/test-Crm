import { type EmailingDomainDriverProvenance } from 'src/engine/core-modules/emailing-domain/types/emailing-domain-driver-provenance.type';
import { EmailingDomainService } from 'src/engine/core-modules/emailing-domain/services/emailing-domain.service';
import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';

export type EmailingDomainWorkspaceCleanupJobData = {
  workspaceId: string;
  domains: string[];
  resources?: { domain: string; driver: EmailingDomainDriverProvenance }[];
};

@Processor(MessageQueue.deleteCascadeQueue)
export class EmailingDomainWorkspaceCleanupJob {
  constructor(private readonly emailingDomainService: EmailingDomainService) {}

  @Process(EmailingDomainWorkspaceCleanupJob.name)
  async handle(data: EmailingDomainWorkspaceCleanupJobData): Promise<void> {
    const { workspaceId, domains, resources } = data;

    try {
      await this.emailingDomainService.cleanupEmailingDomainsForWorkspace(
        workspaceId,
        domains,
        resources,
      );
    } catch (error) {
      throw new Error(
        `[${EmailingDomainWorkspaceCleanupJob.name}] Cannot cleanup emailing domains - ${workspaceId} - ${error?.message || error}`,
      );
    }
  }
}
