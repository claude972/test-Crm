import { Injectable, type Type } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'kovaa-lab-shared/utils';
import { type ObjectLiteral, Repository } from 'typeorm';

import { HARD_SUPPRESSION_REASONS } from 'src/engine/core-modules/emailing-domain/constants/hard-suppression-reasons.constant';
import { type MessageCampaignRecipientPreviewDTO } from 'src/engine/core-modules/emailing-domain/dtos/message-campaign-recipient-preview-output.dto';
import { EmailingDomainDriver } from 'src/engine/core-modules/emailing-domain/drivers/types/emailing-domain-driver.type';
import { EmailingDomainStatus } from 'src/engine/core-modules/emailing-domain/drivers/types/emailing-domain-status.type';
import { UnsubscribeHostnameStatus } from 'src/engine/core-modules/emailing-domain/drivers/types/unsubscribe-hostname-status.type';
import { EmailingDomainEntity } from 'src/engine/core-modules/emailing-domain/emailing-domain.entity';
import {
  EmailingDomainException,
  EmailingDomainExceptionCode,
} from 'src/engine/core-modules/emailing-domain/exceptions/emailing-domain.exception';
import { MessageSuppressionReason } from 'src/engine/core-modules/emailing-domain/types/message-suppression-reason.type';
import { KovaaLabCRMConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { UserRoleService } from 'src/engine/metadata-modules/user-role/user-role.service';
import { WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';
import { InjectWorkspaceScopedRepository } from 'src/engine/twenty-orm/workspace-scoped-repository/inject-workspace-scoped-repository.decorator';
import { WorkspaceScopedRepository } from 'src/engine/twenty-orm/workspace-scoped-repository/workspace-scoped-repository';
import { CampaignEngagementEventService } from 'src/modules/emailing/services/campaign-engagement-event.service';
import { CampaignVariableService } from 'src/modules/emailing/services/campaign-variable.service';
import { MessageCampaignAudienceService } from 'src/modules/emailing/services/message-campaign-audience.service';
import { MessageSuppressionService } from 'src/modules/emailing/services/message-suppression.service';
import { MessageListMemberWorkspaceEntity } from 'src/modules/emailing/standard-objects/message-list-member.workspace-entity';
import { MessageCampaignWorkspaceEntity } from 'src/modules/emailing/standard-objects/message-campaign.workspace-entity';
import { PersonWorkspaceEntity } from 'src/modules/person/standard-objects/person.workspace-entity';
import { buildEmailingRolePermissionConfig } from 'src/modules/emailing/utils/build-emailing-role-permission-config.util';
import { collectCampaignVariableNamesFromTemplatesOrThrow } from 'src/modules/emailing/utils/collect-campaign-variable-names-from-templates-or-throw.util';
import { collectTrackableLinkUrls } from 'src/modules/emailing/utils/collect-trackable-link-urls.util';
import { normalizeCampaignRecipientEmailAddress } from 'src/modules/emailing/utils/normalize-campaign-recipient-email-address.util';
import { renderCampaignEmail } from 'src/modules/emailing/utils/render-campaign-email.util';
import { getDomainFromEmail } from 'src/utils/get-domain-from-email';

// Names exactly what was inspected: emailing-domain rows. Mailbox, connected
// account and transport readiness are NOT checked here, so no value in this set
// may be read as "the provider can send".
export const MESSAGE_CAMPAIGN_PREVIEW_SENDER_STATUS = {
  DOMAIN_PREREQUISITES_MET: 'DOMAIN_PREREQUISITES_MET',
  NOT_PERSISTED: 'NOT_PERSISTED',
  DOMAIN_NOT_VERIFIED: 'DOMAIN_NOT_VERIFIED',
  UNSUBSCRIBE_HOSTNAME_NOT_READY: 'UNSUBSCRIBE_HOSTNAME_NOT_READY',
} as const;

export const MESSAGE_CAMPAIGN_PREVIEW_EXCLUSION_REASON = {
  HARD_SUPPRESSED: 'HARD_SUPPRESSED',
  GLOBALLY_UNSUBSCRIBED: 'GLOBALLY_UNSUBSCRIBED',
  TOPIC_UNSUBSCRIBED: 'TOPIC_UNSUBSCRIBED',
  NO_EMAIL: 'NO_EMAIL',
  NOT_IN_AUDIENCE: 'NOT_IN_AUDIENCE',
} as const;

type PreviewRecipientArgs = {
  workspaceId: string;
  userWorkspaceId: string;
  campaignId: string;
  personId?: string;
};

type ResolvedTarget = {
  personId: string;
  email: string;
  isRecipientSendable: boolean;
  recipientExclusionReason: string | null;
  person: PersonWorkspaceEntity;
};

/**
 * Renders one campaign recipient's message with the send path's own code, and
 * emits nothing. It injects no sender, driver, queue or delivery repository, so
 * no code path here can open a transport, stage a message, write a ledger row
 * or consume a quota.
 */
@Injectable()
export class MessageCampaignRecipientPreviewService {
  constructor(
    @InjectWorkspaceScopedRepository(EmailingDomainEntity)
    private readonly emailingDomainRepository: WorkspaceScopedRepository<EmailingDomainEntity>,
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>,
    private readonly workspaceOrmManager: WorkspaceOrmManager,
    private readonly userRoleService: UserRoleService,
    private readonly campaignVariableService: CampaignVariableService,
    private readonly messageCampaignAudienceService: MessageCampaignAudienceService,
    private readonly messageSuppressionService: MessageSuppressionService,
    private readonly campaignEngagementEventService: CampaignEngagementEventService,
    private readonly kovaaLabConfigService: KovaaLabCRMConfigService,
  ) {}

  private getRoleScopedRepository<T extends ObjectLiteral>(
    entity: Type<T>,
    roleId: string,
  ) {
    return this.workspaceOrmManager.getRepository(
      entity,
      buildEmailingRolePermissionConfig(roleId),
    );
  }

  async previewRecipient({
    workspaceId,
    userWorkspaceId,
    campaignId,
    personId,
  }: PreviewRecipientArgs): Promise<MessageCampaignRecipientPreviewDTO> {
    const roleId = await this.userRoleService.getRoleIdForUserWorkspace({
      workspaceId,
      userWorkspaceId,
    });

    const campaign = await this.workspaceOrmManager.executeInWorkspaceContext(
      async () => {
        const campaignRepository = await this.getRoleScopedRepository(
          MessageCampaignWorkspaceEntity,
          roleId,
        );

        return campaignRepository.findOne({ where: { id: campaignId } });
      },
    );

    // A role that cannot read the campaign gets the same answer as an unknown
    // id, so the preview never leaks another role's content.
    if (!isDefined(campaign)) {
      throw new EmailingDomainException(
        `Campaign ${campaignId} not found`,
        EmailingDomainExceptionCode.MESSAGE_CAMPAIGN_NOT_FOUND,
      );
    }

    const subject = campaign.subject;
    const bodyTemplate = campaign.bodyTemplate;

    if (!isNonEmptyString(subject)) {
      throw new EmailingDomainException(
        `Campaign ${campaignId} cannot be previewed: it has no subject`,
        EmailingDomainExceptionCode.MESSAGE_CAMPAIGN_NOT_SENDABLE,
      );
    }

    if (!isNonEmptyString(bodyTemplate)) {
      throw new EmailingDomainException(
        `Campaign ${campaignId} cannot be previewed: it has no content`,
        EmailingDomainExceptionCode.MESSAGE_CAMPAIGN_NOT_SENDABLE,
      );
    }

    // Drafts are persisted through the generic record API, which runs neither
    // the email-document parse nor the variable check. The preview is therefore
    // where an unknown variable or an unrenderable body surfaces, before a send
    // is ever attempted.
    const variablesUsed = [
      ...collectCampaignVariableNamesFromTemplatesOrThrow({
        subject,
        bodyTemplate,
      }),
    ].sort();

    await this.campaignVariableService.assertKnownVariables(
      workspaceId,
      variablesUsed,
    );

    const target = await this.resolveTarget({
      workspaceId,
      roleId,
      campaignId,
      listId: campaign.listId,
      unsubscribeTopicId: campaign.unsubscribeTopicId,
      personId,
    });

    const variables =
      await this.campaignVariableService.buildVariablesForPerson(
        workspaceId,
        target.person,
      );

    const rendered = await renderCampaignEmail({
      subjectTemplate: subject,
      bodyTemplate,
      variables,
    });

    const envelope = await this.resolveEnvelope({
      workspaceId,
      fromAddress: campaign.fromAddress?.primaryEmail ?? null,
      recipientEmail: target.email,
      renderedHtml: rendered.html,
    });

    return {
      personId: target.personId,
      email: target.email,
      subject: rendered.subject,
      html: rendered.html,
      plainText: rendered.plainText,
      variablesUsed,
      isRecipientSendable: target.isRecipientSendable,
      recipientExclusionReason: target.recipientExclusionReason,
      envelope,
    };
  }

  private async resolveTarget({
    workspaceId,
    roleId,
    campaignId,
    listId,
    unsubscribeTopicId,
    personId,
  }: {
    workspaceId: string;
    roleId: string;
    campaignId: string;
    listId: string | null;
    unsubscribeTopicId: string | null;
    personId?: string;
  }): Promise<ResolvedTarget> {
    const sendableRecipients = isDefined(listId)
      ? (
          await this.messageCampaignAudienceService.resolveNormalizedAudience({
            workspaceId,
            listId,
            roleId,
            ...(isDefined(unsubscribeTopicId) && { unsubscribeTopicId }),
          })
        ).sendableRecipients
      : [];

    if (!isDefined(personId)) {
      const [firstSendable] = sendableRecipients;

      if (!isDefined(firstSendable)) {
        throw new EmailingDomainException(
          `Campaign ${campaignId} cannot be previewed: its audience resolved to no sendable recipient`,
          EmailingDomainExceptionCode.MESSAGE_CAMPAIGN_NOT_SENDABLE,
        );
      }

      return {
        personId: firstSendable.personId,
        email: firstSendable.email,
        isRecipientSendable: true,
        recipientExclusionReason: null,
        person: await this.readPersonOrThrow({
          roleId,
          personId: firstSendable.personId,
        }),
      };
    }

    // A render is never a way to read someone outside this campaign's list: the
    // membership is checked under the caller's role before any person row is
    // read and before anything is composed.
    await this.assertListMembershipOrThrow({
      roleId,
      campaignId,
      listId,
      personId,
    });

    const person = await this.readPersonOrThrow({ roleId, personId });

    const sendableTarget = sendableRecipients.find(
      (recipient) => recipient.personId === personId,
    );

    if (isDefined(sendableTarget)) {
      return {
        personId: sendableTarget.personId,
        email: sendableTarget.email,
        isRecipientSendable: true,
        recipientExclusionReason: null,
        person,
      };
    }

    const email = normalizeCampaignRecipientEmailAddress(
      person.emails?.primaryEmail ?? '',
    );

    if (!isNonEmptyString(email)) {
      return {
        personId,
        email: '',
        isRecipientSendable: false,
        recipientExclusionReason:
          MESSAGE_CAMPAIGN_PREVIEW_EXCLUSION_REASON.NO_EMAIL,
        person,
      };
    }

    return {
      personId,
      email,
      isRecipientSendable: false,
      recipientExclusionReason: await this.resolveSuppressionReason({
        workspaceId,
        email,
        unsubscribeTopicId,
      }),
      person,
    };
  }

  private async assertListMembershipOrThrow({
    roleId,
    campaignId,
    listId,
    personId,
  }: {
    roleId: string;
    campaignId: string;
    listId: string | null;
    personId: string;
  }): Promise<void> {
    const membership = isDefined(listId)
      ? await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
          const listMemberRepository = await this.getRoleScopedRepository(
            MessageListMemberWorkspaceEntity,
            roleId,
          );

          return listMemberRepository.findOne({ where: { listId, personId } });
        })
      : null;

    if (!isDefined(membership)) {
      throw new EmailingDomainException(
        `Person ${personId} is not a member of campaign ${campaignId}'s list`,
        EmailingDomainExceptionCode.MESSAGE_CAMPAIGN_NOT_FOUND,
      );
    }
  }

  // A null read is a refusal, never a render with empty variables: that would
  // look plausible and be wrong.
  private async readPersonOrThrow({
    roleId,
    personId,
  }: {
    roleId: string;
    personId: string;
  }): Promise<PersonWorkspaceEntity> {
    const person = await this.workspaceOrmManager.executeInWorkspaceContext(
      async () => {
        const personRepository = await this.getRoleScopedRepository(
          PersonWorkspaceEntity,
          roleId,
        );

        return personRepository.findOne({ where: { id: personId } });
      },
    );

    if (!isDefined(person)) {
      throw new EmailingDomainException(
        `Person ${personId} not found`,
        EmailingDomainExceptionCode.MESSAGE_CAMPAIGN_NOT_FOUND,
      );
    }

    return person;
  }

  private async resolveSuppressionReason({
    workspaceId,
    email,
    unsubscribeTopicId,
  }: {
    workspaceId: string;
    email: string;
    unsubscribeTopicId: string | null;
  }): Promise<string> {
    const suppressions =
      await this.messageSuppressionService.findApplicableSuppressions({
        workspaceId,
        emailAddresses: [email],
        ...(isDefined(unsubscribeTopicId) && { unsubscribeTopicId }),
      });

    for (const suppression of suppressions) {
      // A tracking opt-out never blocks a send, so it is never an exclusion
      // reason: it only removes the marker.
      if (suppression.reason === MessageSuppressionReason.TRACKING) {
        continue;
      }

      if (HARD_SUPPRESSION_REASONS.includes(suppression.reason)) {
        return MESSAGE_CAMPAIGN_PREVIEW_EXCLUSION_REASON.HARD_SUPPRESSED;
      }

      return isDefined(suppression.unsubscribeTopicId)
        ? MESSAGE_CAMPAIGN_PREVIEW_EXCLUSION_REASON.TOPIC_UNSUBSCRIBED
        : MESSAGE_CAMPAIGN_PREVIEW_EXCLUSION_REASON.GLOBALLY_UNSUBSCRIBED;
    }

    // No durable opposition explains it, so the person is simply not a member
    // of the campaign's list.
    return MESSAGE_CAMPAIGN_PREVIEW_EXCLUSION_REASON.NOT_IN_AUDIENCE;
  }

  private async resolveEnvelope({
    workspaceId,
    fromAddress,
    recipientEmail,
    renderedHtml,
  }: {
    workspaceId: string;
    fromAddress: string | null;
    recipientEmail: string;
    renderedHtml: string;
  }): Promise<MessageCampaignRecipientPreviewDTO['envelope']> {
    const normalizedFromAddress = isNonEmptyString(fromAddress?.trim())
      ? fromAddress.trim()
      : null;

    const emailingDomain = isDefined(normalizedFromAddress)
      ? await this.emailingDomainRepository.findOne(workspaceId, {
          where: {
            domain: getDomainFromEmail(normalizedFromAddress)?.toLowerCase(),
            status: EmailingDomainStatus.VERIFIED,
          },
        })
      : null;

    const senderStatus = this.resolveSenderStatus({
      fromAddress: normalizedFromAddress,
      emailingDomain,
    });

    const areDomainPrerequisitesMet =
      senderStatus ===
      MESSAGE_CAMPAIGN_PREVIEW_SENDER_STATUS.DOMAIN_PREREQUISITES_MET;

    const workspace = await this.workspaceRepository.findOneBy({
      id: workspaceId,
    });

    const isTrackingPossible = await this.resolveIsTrackingPossible({
      workspaceId,
      workspace,
      emailingDomain,
      recipientEmail,
      renderedHtml,
    });

    return {
      fromAddress: normalizedFromAddress,
      senderStatus,
      openMarkerWouldBeIncluded:
        isTrackingPossible &&
        workspace?.isCampaignOpenTrackingEnabled === true,
      clickTrackingWouldBeApplied:
        isTrackingPossible &&
        workspace?.isCampaignClickTrackingEnabled === true &&
        collectTrackableLinkUrls(renderedHtml).length > 0,
      // The driver always attaches the unsubscribe footer and headers, and it
      // needs the domain's active unsubscribe hostname to build the URL.
      unsubscribeLinkWouldBeIncluded: areDomainPrerequisitesMet,
    };
  }

  private resolveSenderStatus({
    fromAddress,
    emailingDomain,
  }: {
    fromAddress: string | null;
    emailingDomain: EmailingDomainEntity | null;
  }): string {
    if (!isDefined(fromAddress)) {
      return MESSAGE_CAMPAIGN_PREVIEW_SENDER_STATUS.NOT_PERSISTED;
    }

    if (!isDefined(emailingDomain)) {
      return MESSAGE_CAMPAIGN_PREVIEW_SENDER_STATUS.DOMAIN_NOT_VERIFIED;
    }

    if (
      emailingDomain.unsubscribeHostnameStatus !==
        UnsubscribeHostnameStatus.ACTIVE ||
      !isNonEmptyString(emailingDomain.unsubscribeHostname)
    ) {
      return MESSAGE_CAMPAIGN_PREVIEW_SENDER_STATUS
        .UNSUBSCRIBE_HOSTNAME_NOT_READY;
    }

    return MESSAGE_CAMPAIGN_PREVIEW_SENDER_STATUS.DOMAIN_PREREQUISITES_MET;
  }

  /**
   * Mirrors the conditions CampaignTrackingContentService.prepareBatch actually
   * requires, so the preview neither promises a marker that would be absent nor
   * hides one that would be present.
   */
  private async resolveIsTrackingPossible({
    workspaceId,
    workspace,
    emailingDomain,
    recipientEmail,
    renderedHtml,
  }: {
    workspaceId: string;
    workspace: WorkspaceEntity | null;
    emailingDomain: EmailingDomainEntity | null;
    recipientEmail: string;
    renderedHtml: string;
  }): Promise<boolean> {
    if (!isDefined(workspace) || !isNonEmptyString(renderedHtml.trim())) {
      return false;
    }

    if (!this.campaignEngagementEventService.isAvailable()) {
      return false;
    }

    const isTrackingBaseUrlResolvable =
      this.kovaaLabConfigService.get('EMAILING_DOMAIN_DRIVER') ===
      EmailingDomainDriver.LOG
        ? isNonEmptyString(workspace.subdomain)
        : isNonEmptyString(emailingDomain?.unsubscribeHostname);

    if (!isTrackingBaseUrlResolvable) {
      return false;
    }

    if (!isNonEmptyString(recipientEmail)) {
      return false;
    }

    return !(await this.messageSuppressionService.isTrackingOptedOut({
      workspaceId,
      emailAddress: recipientEmail,
    }));
  }
}
