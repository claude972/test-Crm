import { Injectable } from '@nestjs/common';

import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'kovaa-lab-shared/utils';

import { readIsCompanyEnrichmentEnabled } from 'src/engine/core-modules/company-enrichment/utils/read-is-company-enrichment-enabled.util';
import { readBookCallStepMinEmployeeCount } from 'src/engine/core-modules/onboarding/utils/read-book-call-step-min-employee-count.util';
import { NodeEnvironment } from 'src/engine/core-modules/kovaa-lab-config/interfaces/node-environment.interface';
import { SupportDriver } from 'src/engine/core-modules/kovaa-lab-config/interfaces/support.interface';

import { MaintenanceModeService } from 'src/engine/core-modules/admin-panel/maintenance-mode.service';
import {
  type ClientAiEvaluationModelConfig,
  type ClientAiModelConfig,
  type ClientConfig,
} from 'src/engine/core-modules/client-config/client-config.entity';
import { DomainServerConfigService } from 'src/engine/core-modules/domain/domain-server-config/services/domain-server-config.service';
import { EmailingDomainDriver } from 'src/engine/core-modules/emailing-domain/drivers/types/emailing-domain-driver.type';
import { PUBLIC_FEATURE_FLAGS } from 'src/engine/core-modules/feature-flag/constants/public-feature-flag.const';
import { KovaaLab CRMConfigService } from 'src/engine/core-modules/kovaa-lab-config/kovaa-lab-config.service';
import { toDisplayCredits } from 'src/engine/core-modules/usage/utils/to-display-credits.util';
import { AI_MODEL_TIERS, parseAiModelVariantId } from 'kovaa-lab-shared/ai';
import { ENTERPRISE_INSTANCE_TYPE } from 'kovaa-lab-shared/constants';
import { MODEL_FAMILY_LABELS } from 'src/engine/metadata-modules/ai/ai-models/constants/model-family-labels.const';
import { getAvailableEfforts } from 'src/engine/metadata-modules/ai/ai-models/utils/get-available-efforts.util';
import { getNativeModelCapabilities } from 'src/engine/metadata-modules/ai/ai-models/utils/get-native-model-capabilities.util';
import { AiModelRegistryService } from 'src/engine/metadata-modules/ai/ai-models/services/ai-model-registry.service';
import { type AiModelBenchmark } from 'src/engine/metadata-modules/ai/ai-models/types/ai-model-benchmark.type';
import { type AiModelConfig } from 'src/engine/metadata-modules/ai/ai-models/types/ai-model-config.type';

@Injectable()
export class ClientConfigService {
  constructor(
    private kovaa-labConfigService: KovaaLab CRMConfigService,
    private domainServerConfigService: DomainServerConfigService,
    private aiModelRegistryService: AiModelRegistryService,
    private maintenanceModeService: MaintenanceModeService,
  ) {}

  private resolveBenchmark(modelConfig: AiModelConfig | undefined): {
    benchmark?: AiModelBenchmark;
    isInherited: boolean;
  } {
    if (isDefined(modelConfig?.benchmark)) {
      return { benchmark: modelConfig.benchmark, isInherited: false };
    }

    const { modelId: baseModelId, effort } = parseAiModelVariantId(
      modelConfig?.modelId ?? '',
    );
    const baseBenchmark = isDefined(effort)
      ? this.aiModelRegistryService.getModelConfig(baseModelId)?.benchmark
      : undefined;

    return { benchmark: baseBenchmark, isInherited: isDefined(baseBenchmark) };
  }

  private isCloudflareIntegrationEnabled(): boolean {
    return (
      !!this.kovaa-labConfigService.get('CLOUDFLARE_API_KEY') &&
      !!this.kovaa-labConfigService.get('CLOUDFLARE_ZONE_ID')
    );
  }

  async getClientConfig(): Promise<ClientConfig> {
    const captchaProvider = this.kovaa-labConfigService.get('CAPTCHA_DRIVER');
    const supportDriver = this.kovaa-labConfigService.get('SUPPORT_DRIVER');
    const calendarBookingPageId = this.kovaa-labConfigService.get(
      'CALENDAR_BOOKING_PAGE_ID',
    );
    const isBookCallOnboardingStepEnabled = isDefined(
      readBookCallStepMinEmployeeCount(this.kovaa-labConfigService),
    );
    const isCompanyEnrichmentEnabled = readIsCompanyEnrichmentEnabled(
      this.kovaa-labConfigService,
    );

    const isEmailingDomainInDemoMode =
      this.kovaa-labConfigService.get('EMAILING_DOMAIN_DRIVER') ===
      EmailingDomainDriver.LOG;

    const isBillingEnabled = this.kovaa-labConfigService.get('IS_BILLING_ENABLED');

    const availableModels =
      this.aiModelRegistryService.getAdminFilteredModels();
    const resolvedProviders =
      this.aiModelRegistryService.getResolvedProvidersForAdmin();

    const getProviderLabel = (providerName?: string | null) =>
      providerName
        ? (resolvedProviders[providerName]?.label ?? providerName)
        : undefined;

    const aiModels: ClientAiModelConfig[] = availableModels.map(
      (registeredModel) => {
        const modelConfig = this.aiModelRegistryService.getModelConfig(
          registeredModel.modelId,
        );

        const modelFamily = modelConfig?.modelFamily;
        const providerName = registeredModel.providerName;
        const { benchmark, isInherited } = this.resolveBenchmark(modelConfig);

        return {
          modelId: registeredModel.modelId,
          label: modelConfig?.label || registeredModel.modelId,
          modelFamily,
          modelFamilyLabel: modelFamily
            ? MODEL_FAMILY_LABELS[modelFamily]
            : undefined,
          sdkPackage: registeredModel.sdkPackage,
          providerName,
          providerLabel: getProviderLabel(providerName),
          nativeCapabilities: getNativeModelCapabilities(
            registeredModel.sdkPackage,
          ),
          inputCostPerMillionTokens: modelConfig?.inputCostPerMillionTokens,
          outputCostPerMillionTokens: modelConfig?.outputCostPerMillionTokens,
          contextWindowTokens: modelConfig?.contextWindowTokens,
          maxOutputTokens: modelConfig?.maxOutputTokens,
          isDeprecated: modelConfig?.isDeprecated,
          dataResidency: modelConfig?.dataResidency,
          intelligenceIndex: benchmark?.intelligenceIndex,
          outputTokensPerSecond: benchmark?.outputTokensPerSecond,
          costPerTask: benchmark?.costPerTask,
          isBenchmarkInherited: isInherited,
          efforts:
            isDefined(modelConfig) && !isDefined(modelConfig.effort)
              ? getAvailableEfforts(modelConfig)
              : undefined,
          effort: modelConfig?.effort,
        };
      },
    );

    const aiEvaluationModels: ClientAiEvaluationModelConfig[] =
      this.aiModelRegistryService
        .getAvailableEvaluationModelConfigs()
        .filter((modelConfig) =>
          this.aiModelRegistryService.isModelAdminAllowed(modelConfig.modelId),
        )
        .map((modelConfig) => ({
          modelId: modelConfig.modelId,
          label: modelConfig.label,
          description: modelConfig.description,
          providerLabel: getProviderLabel(modelConfig.modelId.split('/')[0]),
          isAvailable: isDefined(
            this.aiModelRegistryService.getEvaluationModel(modelConfig.modelId),
          ),
          supportedQuestionTypes: modelConfig.supportedQuestionTypes,
          maxCriteriaPerQuestion: modelConfig.maxCriteriaPerQuestion,
          maxScoreLevels: modelConfig.maxScoreLevels,
          medianLatencyMs: modelConfig.medianLatencyMs,
          inputCostPerMillionTokens: modelConfig.inputCostPerMillionTokens,
          outputCostPerMillionTokens: modelConfig.outputCostPerMillionTokens,
          isDeprecated: modelConfig.isDeprecated,
        }));

    const aiModelTiers = AI_MODEL_TIERS.flatMap((tier) => {
      const model = this.aiModelRegistryService.findDefaultModelForTier(tier);

      return isDefined(model) ? [{ tier, modelId: model.modelId }] : [];
    });

    const clientConfig: ClientConfig = {
      appVersion: this.kovaa-labConfigService.get('APP_VERSION'),
      billing: {
        isBillingEnabled,
        billingUrl: this.kovaa-labConfigService.get('BILLING_PLAN_REQUIRED_LINK'),
        stripePublishableKey: this.kovaa-labConfigService.get(
          'BILLING_STRIPE_PUBLISHABLE_KEY',
        ),
        trialPeriods: [
          {
            duration: this.kovaa-labConfigService.get(
              'BILLING_FREE_TRIAL_WITH_CREDIT_CARD_DURATION_IN_DAYS',
            ),
            isCreditCardRequired: true,
          },
          {
            duration: this.kovaa-labConfigService.get(
              'BILLING_FREE_TRIAL_WITHOUT_CREDIT_CARD_DURATION_IN_DAYS',
            ),
            isCreditCardRequired: false,
          },
        ],
      },
      aiModels,
      aiEvaluationModels,
      aiModelTiers,
      authProviders: {
        google: this.kovaa-labConfigService.get('AUTH_GOOGLE_ENABLED'),
        magicLink: false,
        password: this.kovaa-labConfigService.get('AUTH_PASSWORD_ENABLED'),
        microsoft: this.kovaa-labConfigService.get('AUTH_MICROSOFT_ENABLED'),
        sso: [],
      },
      signInPrefilled: this.kovaa-labConfigService.get('SIGN_IN_PREFILLED'),
      isMultiWorkspaceEnabled: this.kovaa-labConfigService.get(
        'IS_MULTIWORKSPACE_ENABLED',
      ),
      isEmailVerificationRequired: this.kovaa-labConfigService.get(
        'IS_EMAIL_VERIFICATION_REQUIRED',
      ),
      defaultSubdomain: this.kovaa-labConfigService.get('DEFAULT_SUBDOMAIN'),
      frontDomain: this.domainServerConfigService.getFrontUrl().hostname,
      serverUrl: this.kovaa-labConfigService.get('SERVER_URL'),
      publicFunctionDomain:
        this.domainServerConfigService.getPublicBaseHostnameOrUndefined() ??
        null,
      support: {
        supportDriver: supportDriver ? supportDriver : SupportDriver.NONE,
        supportFrontChatId: this.kovaa-labConfigService.get(
          'SUPPORT_FRONT_CHAT_ID',
        ),
      },
      sentry: {
        environment: this.kovaa-labConfigService.get('SENTRY_ENVIRONMENT'),
        release: this.kovaa-labConfigService.get('APP_VERSION'),
        dsn: this.kovaa-labConfigService.get('SENTRY_FRONT_DSN'),
        tracesSampleRate: this.kovaa-labConfigService.get(
          'SENTRY_FRONT_TRACES_SAMPLE_RATE',
        ),
      },
      captcha: {
        provider: captchaProvider ? captchaProvider : undefined,
        siteKey: this.kovaa-labConfigService.get('CAPTCHA_SITE_KEY'),
      },
      api: {
        mutationMaximumAffectedRecords: this.kovaa-labConfigService.get(
          'MUTATION_MAXIMUM_AFFECTED_RECORDS',
        ),
      },
      onboarding: isBillingEnabled
        ? {
            importContactsCreditsReward: toDisplayCredits(
              this.kovaa-labConfigService.get(
                'ONBOARDING_IMPORT_CONTACTS_CREDITS_REWARD',
              ),
            ),
            inviteTeamCreditsRewardPerUser: toDisplayCredits(
              this.kovaa-labConfigService.get(
                'ONBOARDING_INVITE_TEAM_CREDITS_REWARD_PER_USER',
              ),
            ),
            createProfileCreditsReward: toDisplayCredits(
              this.kovaa-labConfigService.get(
                'BILLING_FREE_WORKFLOW_CREDITS_FOR_TRIAL_PERIOD_WITHOUT_CREDIT_CARD',
              ),
            ),
            upgradeCreditsReward: toDisplayCredits(
              Math.max(
                0,
                this.kovaa-labConfigService.get(
                  'BILLING_FREE_WORKFLOW_CREDITS_FOR_TRIAL_PERIOD_WITH_CREDIT_CARD',
                ) -
                  this.kovaa-labConfigService.get(
                    'BILLING_FREE_WORKFLOW_CREDITS_FOR_TRIAL_PERIOD_WITHOUT_CREDIT_CARD',
                  ),
              ),
            ),
            inviteTeamMaxInvites: this.kovaa-labConfigService.get(
              'ONBOARDING_INVITE_TEAM_MAX_INVITES',
            ),
          }
        : null,
      isAttachmentPreviewEnabled: this.kovaa-labConfigService.get(
        'IS_ATTACHMENT_PREVIEW_ENABLED',
      ),
      analyticsEnabled: this.kovaa-labConfigService.get('ANALYTICS_ENABLED'),
      canManageFeatureFlags:
        this.kovaa-labConfigService.get('NODE_ENV') ===
          NodeEnvironment.DEVELOPMENT ||
        isBillingEnabled ||
        this.kovaa-labConfigService.get('IS_FEATURE_FLAG_MANAGEMENT_ENABLED'),
      publicFeatureFlags: PUBLIC_FEATURE_FLAGS,
      isCookieSessionEnabled: true,
      isMicrosoftMessagingEnabled: this.kovaa-labConfigService.get(
        'MESSAGING_PROVIDER_MICROSOFT_ENABLED',
      ),
      isMicrosoftCalendarEnabled: this.kovaa-labConfigService.get(
        'CALENDAR_PROVIDER_MICROSOFT_ENABLED',
      ),
      isGoogleMessagingEnabled: this.kovaa-labConfigService.get(
        'MESSAGING_PROVIDER_GMAIL_ENABLED',
      ),
      isGoogleCalendarEnabled: this.kovaa-labConfigService.get(
        'CALENDAR_PROVIDER_GOOGLE_ENABLED',
      ),
      isConfigVariablesInDbEnabled: this.kovaa-labConfigService.get(
        'IS_CONFIG_VARIABLES_IN_DB_ENABLED',
      ),
      isImapSmtpCaldavEnabled: this.kovaa-labConfigService.get(
        'IS_IMAP_SMTP_CALDAV_ENABLED',
      ),
      isEmailingDomainInDemoMode,
      allowRequestsToKovaaLab CRMIcons: this.kovaa-labConfigService.get(
        'ALLOW_REQUESTS_TO_KOVAALAB_ICONS',
      ),
      calendarBookingPageId: isNonEmptyString(calendarBookingPageId)
        ? calendarBookingPageId
        : undefined,
      isBookCallOnboardingStepEnabled,
      isCompanyEnrichmentEnabled,
      isCloudflareIntegrationEnabled: this.isCloudflareIntegrationEnabled(),
      isClickHouseConfigured: !!this.kovaa-labConfigService.get('CLICKHOUSE_URL'),
      isWorkspaceSchemaDDLLocked: this.kovaa-labConfigService.get(
        'WORKSPACE_SCHEMA_DDL_LOCKED',
      ),
      isOnboardingAiChatEnabled: this.kovaa-labConfigService.get(
        'IS_ONBOARDING_AI_CHAT_ENABLED',
      ),
      enterpriseInstanceType:
        this.kovaa-labConfigService.get('ENTERPRISE_INSTANCE_TYPE') ??
        ENTERPRISE_INSTANCE_TYPE.PRODUCTION,
    };

    const maintenanceMode =
      await this.maintenanceModeService.getMaintenanceMode();

    if (isDefined(maintenanceMode)) {
      clientConfig.maintenance = {
        startAt: new Date(maintenanceMode.startAt),
        endAt: new Date(maintenanceMode.endAt),
        link: maintenanceMode.link,
      };
    }

    return clientConfig;
  }
}
