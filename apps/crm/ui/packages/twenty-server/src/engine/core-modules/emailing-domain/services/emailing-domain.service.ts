import { type EmailingDomainDriverProvenance } from 'src/engine/core-modules/emailing-domain/types/emailing-domain-driver-provenance.type';
import { EmailingDomainDriver } from 'src/engine/core-modules/emailing-domain/drivers/types/emailing-domain-driver.type';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { msg } from '@lingui/core/macro';

import { MessageCampaignStatus } from 'kovaa-lab-shared/types';
import { isDefined } from 'kovaa-lab-shared/utils';

import { In, Not, Repository } from 'typeorm';

import { CAMPAIGN_DELIVERY_STATE } from 'src/engine/core-modules/emailing-domain/constants/campaign-delivery-state.constant';
import {
  EmailingDomainDriverException,
  EmailingDomainDriverExceptionCode,
} from 'src/engine/core-modules/emailing-domain/drivers/exceptions/emailing-domain-driver.exception';
import { EmailingDomainDriverFactory } from 'src/engine/core-modules/emailing-domain/drivers/emailing-domain-driver.factory';
import { EmailingDomainStatus } from 'src/engine/core-modules/emailing-domain/drivers/types/emailing-domain-status.type';
import { EmailingDomainEntity } from 'src/engine/core-modules/emailing-domain/emailing-domain.entity';
import {
  EmailingDomainException,
  EmailingDomainExceptionCode,
} from 'src/engine/core-modules/emailing-domain/exceptions/emailing-domain.exception';
import { DmarcRecordService } from 'src/engine/core-modules/emailing-domain/services/dmarc-record.service';
import { UnsubscribeHostnameService } from 'src/engine/core-modules/emailing-domain/services/unsubscribe-hostname.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';
import { InjectWorkspaceScopedRepository } from 'src/engine/twenty-orm/workspace-scoped-repository/inject-workspace-scoped-repository.decorator';
import { WorkspaceScopedRepository } from 'src/engine/twenty-orm/workspace-scoped-repository/workspace-scoped-repository';
import { CampaignDeliveryWorkspaceEntity } from 'src/modules/emailing/standard-objects/campaign-delivery.workspace-entity';
import { MessageCampaignWorkspaceEntity } from 'src/modules/emailing/standard-objects/message-campaign.workspace-entity';

@Injectable()
export class EmailingDomainService {
  constructor(
    @InjectWorkspaceScopedRepository(EmailingDomainEntity)
    private readonly emailingDomainRepository: WorkspaceScopedRepository<EmailingDomainEntity>,
    // Domain is globally unique, so existence checks need an unscoped repository.
    // eslint-disable-next-line kovaa-lab/prefer-workspace-scoped-repository
    @InjectRepository(EmailingDomainEntity)
    private readonly globalEmailingDomainRepository: Repository<EmailingDomainEntity>,
    private readonly emailingDomainDriverFactory: EmailingDomainDriverFactory,
    private readonly unsubscribeHostnameService: UnsubscribeHostnameService,
    private readonly dmarcRecordService: DmarcRecordService,
    private readonly workspaceOrmManager: WorkspaceOrmManager,
  ) {}

  private async withDnsRecords(
    emailingDomain: EmailingDomainEntity,
  ): Promise<EmailingDomainEntity> {
    if (emailingDomain.driver === EmailingDomainDriver.SMTP)
      return emailingDomain;
    return this.dmarcRecordService.withDnsRecord(
      await this.unsubscribeHostnameService.withDnsRecords(emailingDomain),
    );
  }

  async createEmailingDomain(
    domain: string,
    workspaceId: string,
  ): Promise<EmailingDomainEntity> {
    domain = domain.trim().toLowerCase();
    const driver = this.emailingDomainDriverFactory.getCurrentDriverType();
    const emailingDomainDriver =
      this.emailingDomainDriverFactory.getCurrentDriver();
    const existingEmailingDomain =
      await this.globalEmailingDomainRepository.findOne({
        where:
          driver === EmailingDomainDriver.SMTP
            ? { domain, workspaceId, driver }
            : { domain, driver: Not(EmailingDomainDriver.SMTP) },
      });
    if (isDefined(existingEmailingDomain)) {
      throw new EmailingDomainException(
        'Emailing domain is already registered',
        EmailingDomainExceptionCode.EMAILING_DOMAIN_ALREADY_REGISTERED,
        existingEmailingDomain.workspaceId === workspaceId
          ? { userFriendlyMessage: msg`Already registered in this workspace.` }
          : {},
      );
    }
    // Reserve ownership before any remote operation; the unique indexes also arbitrate concurrent requests.
    const reserved = await this.emailingDomainRepository.insertAndReturnOne(
      workspaceId,
      {
        domain,
        driver,
        status: EmailingDomainStatus.PENDING,
        verificationRecords: [],
        verifiedAt: null,
      },
    );
    try {
      this.emailingDomainDriverFactory.getDriverForDomain(reserved);
      await emailingDomainDriver.provisionWorkspace(workspaceId);
      this.emailingDomainDriverFactory.getDriverForDomain(reserved);
      const verificationResult = await emailingDomainDriver.verifyDomain({
        domain,
        workspaceId,
      });
      this.emailingDomainDriverFactory.getDriverForDomain(reserved);
      await emailingDomainDriver.registerDomain({ domain, workspaceId });
      this.emailingDomainDriverFactory.getDriverForDomain(reserved);
      await this.emailingDomainRepository.update(
        workspaceId,
        { id: reserved.id },
        {
          status: verificationResult.status,
          verificationRecords: verificationResult.verificationRecords,
          verifiedAt:
            verificationResult.status === EmailingDomainStatus.VERIFIED
              ? new Date()
              : null,
        },
      );
    } catch (error) {
      await this.emailingDomainRepository.update(
        workspaceId,
        { id: reserved.id },
        { status: EmailingDomainStatus.FAILED },
      );
      throw error;
    }
    await this.unsubscribeHostnameService.sync(workspaceId, reserved.id, {
      provision: true,
    });
    return this.withDnsRecords(
      await this.emailingDomainRepository.findOneOrFail(workspaceId, {
        where: { id: reserved.id },
      }),
    );
  }

  async ensureEmailingDomain(
    domain: string,
    workspaceId: string,
  ): Promise<void> {
    const existingEmailingDomain = await this.emailingDomainRepository.findOne(
      workspaceId,
      {
        where: {
          domain,
          driver: this.emailingDomainDriverFactory.getCurrentDriverType(),
        },
      },
    );

    if (isDefined(existingEmailingDomain)) {
      return;
    }

    await this.createEmailingDomain(domain, workspaceId);
  }

  async deleteEmailingDomainByDomainIfExists(
    workspaceId: string,
    domain: string,
  ): Promise<void> {
    const emailingDomain = await this.emailingDomainRepository.findOne(
      workspaceId,
      {
        where: {
          domain,
          driver: this.emailingDomainDriverFactory.getCurrentDriverType(),
        },
      },
    );

    if (!isDefined(emailingDomain)) {
      return;
    }

    this.emailingDomainDriverFactory.getDriverForDomain(emailingDomain);
    await this.deleteRemoteEmailingDomain(emailingDomain);
    await this.unsubscribeHostnameService.deprovision(emailingDomain);
    await this.emailingDomainRepository.delete(workspaceId, {
      id: emailingDomain.id,
    });
  }

  async deleteEmailingDomain(
    workspace: WorkspaceEntity,
    emailingDomainId: string,
  ): Promise<void> {
    const emailingDomain = await this.findEmailingDomainByIdOrThrow(
      workspace.id,
      emailingDomainId,
    );

    await this.validateNoCampaignSendingOrThrow(workspace.id);

    this.emailingDomainDriverFactory.getDriverForDomain(emailingDomain);
    await this.deleteRemoteEmailingDomain(emailingDomain);
    await this.unsubscribeHostnameService.deprovision(emailingDomain);
    await this.emailingDomainRepository.delete(workspace.id, {
      id: emailingDomain.id,
    });
  }

  async validateNoCampaignSendingOrThrow(workspaceId: string): Promise<void> {
    const isCampaignSending =
      await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
        const hasSendingCampaign = await this.workspaceOrmManager
          .getRepository(MessageCampaignWorkspaceEntity, {
            shouldBypassPermissionChecks: true,
          })
          .exists({ where: { status: MessageCampaignStatus.SENDING } });

        if (hasSendingCampaign) {
          return true;
        }

        return this.workspaceOrmManager
          .getRepository(CampaignDeliveryWorkspaceEntity, {
            shouldBypassPermissionChecks: true,
          })
          .exists({
            where: {
              state: In([
                CAMPAIGN_DELIVERY_STATE.QUEUED,
                CAMPAIGN_DELIVERY_STATE.SENDING,
              ]),
            },
          });
      }, buildSystemAuthContext(workspaceId));

    if (isCampaignSending) {
      throw new EmailingDomainException(
        `Workspace ${workspaceId} has a campaign sending`,
        EmailingDomainExceptionCode.EMAILING_DOMAIN_CAMPAIGN_SENDING,
      );
    }
  }

  async cleanupEmailingDomainsForWorkspace(
    workspaceId: string,
    domains: string[],
    resources?: { domain: string; driver: EmailingDomainDriverProvenance }[],
  ): Promise<void> {
    if (domains.length === 0) return;
    if (
      !resources ||
      resources.length !== domains.length ||
      domains.some((domain, index) => resources[index].domain !== domain)
    ) {
      throw new EmailingDomainDriverException(
        'Emailing cleanup requires the original provider provenance snapshot',
        EmailingDomainDriverExceptionCode.CONFIGURATION_ERROR,
      );
    }
    // Validate the entire snapshot before touching any resource from a deleted workspace.
    for (const resource of resources)
      this.emailingDomainDriverFactory.getDriverForDomain(resource);
    for (const resource of resources) {
      await this.emailingDomainDriverFactory
        .getDriverForDomain(resource)
        .cleanupDomain({ domain: resource.domain, workspaceId });
    }
    await this.emailingDomainDriverFactory
      .getDriverForDomain(resources[0])
      .deprovisionWorkspace(workspaceId);
  }

  async getEmailingDomains(
    workspace: WorkspaceEntity,
  ): Promise<EmailingDomainEntity[]> {
    const emailingDomains = await this.emailingDomainRepository.find(
      workspace.id,
      {
        where: {
          driver: this.emailingDomainDriverFactory.getCurrentDriverType(),
        },
        order: { createdAt: 'DESC' },
      },
    );

    return Promise.all(
      emailingDomains.map((emailingDomain) =>
        this.withDnsRecords(emailingDomain),
      ),
    );
  }

  async verifyEmailingDomain({
    workspaceId,
    emailingDomainId,
  }: {
    workspaceId: string;
    emailingDomainId: string;
  }): Promise<EmailingDomainEntity> {
    const emailingDomain = await this.findEmailingDomainByIdOrThrow(
      workspaceId,
      emailingDomainId,
    );

    const emailingDomainDriver =
      this.emailingDomainDriverFactory.getDriverForDomain(emailingDomain);

    const verificationResult = await emailingDomainDriver.verifyDomain({
      domain: emailingDomain.domain,
      workspaceId: emailingDomain.workspaceId,
    });

    this.emailingDomainDriverFactory.getDriverForDomain(emailingDomain);
    await emailingDomainDriver.registerDomain({
      domain: emailingDomain.domain,
      workspaceId: emailingDomain.workspaceId,
    });
    this.emailingDomainDriverFactory.getDriverForDomain(emailingDomain);
    const hasJustBecomeVerified =
      emailingDomain.status !== EmailingDomainStatus.VERIFIED &&
      verificationResult.status === EmailingDomainStatus.VERIFIED;

    await this.emailingDomainRepository.update(
      workspaceId,
      { id: emailingDomain.id },
      {
        status: verificationResult.status,
        verificationRecords: verificationResult.verificationRecords,
        ...(hasJustBecomeVerified ? { verifiedAt: new Date() } : {}),
      },
    );

    await this.unsubscribeHostnameService.sync(workspaceId, emailingDomain.id, {
      provision: true,
    });

    return this.withDnsRecords(
      await this.emailingDomainRepository.findOneOrFail(workspaceId, {
        where: { id: emailingDomain.id },
      }),
    );
  }

  private async findEmailingDomainByIdOrThrow(
    workspaceId: string,
    emailingDomainId: string,
  ): Promise<EmailingDomainEntity> {
    const emailingDomain = await this.emailingDomainRepository.findOne(
      workspaceId,
      {
        where: { id: emailingDomainId },
      },
    );

    if (!emailingDomain) {
      throw new EmailingDomainDriverException(
        'Emailing domain not found',
        EmailingDomainDriverExceptionCode.NOT_FOUND,
      );
    }

    return emailingDomain;
  }

  private async deleteRemoteEmailingDomain(
    emailingDomain: EmailingDomainEntity,
  ): Promise<void> {
    await this.emailingDomainDriverFactory
      .getDriverForDomain(emailingDomain)
      .cleanupDomain({
        domain: emailingDomain.domain,
        workspaceId: emailingDomain.workspaceId,
      });
  }
}
