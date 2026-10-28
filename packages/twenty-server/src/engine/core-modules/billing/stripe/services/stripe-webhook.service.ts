/* @license Enterprise */

import { Injectable, Logger } from '@nestjs/common';

import type Stripe from 'stripe';

import { StripeSDKService } from 'src/engine/core-modules/billing/stripe/stripe-sdk/services/stripe-sdk.service';
import { KovaaLab CRMConfigService } from 'src/engine/core-modules/kovaa-lab-config/kovaa-lab-config.service';
@Injectable()
export class StripeWebhookService {
  protected readonly logger = new Logger(StripeWebhookService.name);
  private stripe: Stripe;

  constructor(
    private readonly kovaa-labConfigService: KovaaLab CRMConfigService,
    private readonly stripeSDKService: StripeSDKService,
  ) {
    if (!this.kovaa-labConfigService.get('IS_BILLING_ENABLED')) {
      return;
    }
    this.stripe = this.stripeSDKService.getStripe(
      this.kovaa-labConfigService.get('BILLING_STRIPE_API_KEY'),
    );
  }

  constructEventFromPayload(signature: string, payload: Buffer) {
    const webhookSecret = this.kovaa-labConfigService.get(
      'BILLING_STRIPE_WEBHOOK_SECRET',
    );

    const returnValue = this.stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret,
    );

    return returnValue;
  }
}
