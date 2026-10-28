/* @license Enterprise */

import { Injectable, Logger } from '@nestjs/common';

import type Stripe from 'stripe';

import { StripeSDKService } from 'src/engine/core-modules/billing/stripe/stripe-sdk/services/stripe-sdk.service';
import { DomainServerConfigService } from 'src/engine/core-modules/domain/domain-server-config/services/domain-server-config.service';
import { KovaaLab CRMConfigService } from 'src/engine/core-modules/kovaa-lab-config/kovaa-lab-config.service';

@Injectable()
export class StripeBillingPortalService {
  protected readonly logger = new Logger(StripeBillingPortalService.name);
  private readonly stripe: Stripe;

  constructor(
    private readonly kovaa-labConfigService: KovaaLab CRMConfigService,
    private readonly domainServerConfigService: DomainServerConfigService,
    private readonly stripeSDKService: StripeSDKService,
  ) {
    if (!this.kovaa-labConfigService.get('IS_BILLING_ENABLED')) {
      return;
    }
    this.stripe = this.stripeSDKService.getStripe(
      this.kovaa-labConfigService.get('BILLING_STRIPE_API_KEY'),
    );
  }

  async createBillingPortalSession(
    stripeCustomerId: string,
    returnUrl?: string,
  ): Promise<Stripe.BillingPortal.Session> {
    return await this.stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url:
        returnUrl ?? this.domainServerConfigService.getBaseUrl().toString(),
    });
  }

  async createBillingPortalSessionForPaymentMethodUpdate(
    stripeCustomerId: string,
    returnUrl?: string,
  ): Promise<Stripe.BillingPortal.Session> {
    return await this.stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url:
        returnUrl ?? this.domainServerConfigService.getBaseUrl().toString(),
      flow_data: {
        type: 'payment_method_update',
      },
    });
  }
}
