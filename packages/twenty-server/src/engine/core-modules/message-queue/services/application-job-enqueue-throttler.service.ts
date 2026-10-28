import { Injectable } from '@nestjs/common';

import { MetricsService } from 'src/engine/core-modules/metrics/metrics.service';
import { MetricsKeys } from 'src/engine/core-modules/metrics/types/metrics-keys.type';
import {
  ThrottlerException,
  ThrottlerExceptionCode,
} from 'src/engine/core-modules/throttler/throttler.exception';
import { ThrottlerService } from 'src/engine/core-modules/throttler/throttler.service';
import { KovaaLab CRMConfigService } from 'src/engine/core-modules/kovaa-lab-config/kovaa-lab-config.service';

@Injectable()
export class ApplicationJobEnqueueThrottlerService {
  constructor(
    private readonly throttlerService: ThrottlerService,
    private readonly kovaa-labConfigService: KovaaLab CRMConfigService,
    private readonly metricsService: MetricsService,
  ) {}

  async throttleOrThrow({
    applicationId,
    applicationRegistrationId,
    jobCount = 1,
  }: {
    applicationId: string;
    applicationRegistrationId: string;
    jobCount?: number;
  }): Promise<void> {
    const timeWindow = this.kovaa-labConfigService.get(
      'APPLICATION_JOB_ENQUEUE_RATE_LIMITING_TTL_IN_MS',
    );
    const applicationLimit = this.kovaa-labConfigService.get(
      'APPLICATION_JOB_ENQUEUE_RATE_LIMITING_LIMIT',
    );
    const registrationLimit = this.kovaa-labConfigService.get(
      'APPLICATION_REGISTRATION_JOB_ENQUEUE_RATE_LIMITING_LIMIT',
    );

    const [admittedCount] = await this.throttlerService.tryConsumeTokenBuckets({
      buckets: [
        {
          key: `enqueue:throttler:{${applicationRegistrationId}}:application:${applicationId}`,
          burst: applicationLimit,
          refillPerWindow: applicationLimit,
          windowMs: timeWindow,
        },
        {
          key: `enqueue:throttler:{${applicationRegistrationId}}:application-registration`,
          burst: registrationLimit,
          refillPerWindow: registrationLimit,
          windowMs: timeWindow,
        },
      ],
      tokensToConsume: jobCount,
      allowPartial: false,
    });

    if (admittedCount !== jobCount) {
      await this.metricsService.incrementCounterForEvent({
        key: MetricsKeys.JobEnqueueApplicationRateLimited,
        shouldStoreInCache: false,
        attributes: {
          application_id: applicationId,
          application_registration_id: applicationRegistrationId,
        },
      });

      throw new ThrottlerException(
        'Application job enqueue limit reached',
        ThrottlerExceptionCode.LIMIT_REACHED,
      );
    }
  }
}
