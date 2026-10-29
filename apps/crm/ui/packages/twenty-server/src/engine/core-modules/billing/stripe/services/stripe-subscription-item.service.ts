/* @license Enterprise */

import { Injectable, Logger } from '@nestjs/common';

import { isDefined } from 'kovaa-lab-shared/utils';

import type Stripe from 'stripe';

import { StripeSDKService } from 'src/engine/core-modules/billing/stripe/stripe-sdk/services/stripe-sdk.service';
import { KovaaLabCRMConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';

@Injectable()
export class StripeSubscriptionItemService {
  protected readonly logger = new Logger(StripeSubscriptionItemService.name);
  private readonly stripe: Stripe;

  constructor(
    private readonly kovaaLabConfigService: KovaaLabCRMConfigService,
    private readonly stripeSDKService: StripeSDKService,
  ) {
    if (!this.kovaaLabConfigService.get('IS_BILLING_ENABLED')) {
      return;
    }
    this.stripe = this.stripeSDKService.getStripe(
      this.kovaaLabConfigService.get('BILLING_STRIPE_API_KEY'),
    );
  }

  async updateSubscriptionItem(
    stripeItemId: string,
    updateData: Stripe.SubscriptionItemUpdateParams,
  ) {
    await this.stripe.subscriptionItems.update(stripeItemId, updateData);
  }

  async createSubscriptionItem(
    stripeSubscriptionId: string,
    stripePriceId: string,
    quantity?: number,
  ) {
    return this.stripe.subscriptionItems.create({
      subscription: stripeSubscriptionId,
      price: stripePriceId,
      ...(isDefined(quantity) ? { quantity } : {}),
    });
  }

  async deleteSubscriptionItem(stripeItemId: string, clearUsage = false) {
    return this.stripe.subscriptionItems.del(stripeItemId, {
      clear_usage: clearUsage,
    });
  }
}
