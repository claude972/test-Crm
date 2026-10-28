import { Injectable } from '@nestjs/common';

import { type CaptchaDriver } from 'src/engine/core-modules/captcha/drivers/interfaces/captcha-driver.interface';

import { GoogleRecaptchaDriver } from 'src/engine/core-modules/captcha/drivers/google-recaptcha.driver';
import { TurnstileDriver } from 'src/engine/core-modules/captcha/drivers/turnstile.driver';
import { CaptchaDriverType } from 'src/engine/core-modules/captcha/interfaces';
import { SecureHttpClientService } from 'src/engine/core-modules/secure-http-client/secure-http-client.service';
import { DriverFactoryBase } from 'src/engine/core-modules/kovaa-lab-config/dynamic-factory.base';
import { ConfigVariablesGroup } from 'src/engine/core-modules/kovaa-lab-config/enums/config-variables-group.enum';
import { ConfigGroupHashService } from 'src/engine/core-modules/kovaa-lab-config/services/config-group-hash.service';
import { KovaaLab CRMConfigService } from 'src/engine/core-modules/kovaa-lab-config/kovaa-lab-config.service';

@Injectable()
export class CaptchaDriverFactory extends DriverFactoryBase<CaptchaDriver | null> {
  constructor(
    kovaa-labConfigService: KovaaLab CRMConfigService,
    configGroupHashService: ConfigGroupHashService,
    private readonly secureHttpClientService: SecureHttpClientService,
  ) {
    super(kovaa-labConfigService, configGroupHashService);
  }

  protected buildConfigKey(): string {
    const driver = this.kovaa-labConfigService.get('CAPTCHA_DRIVER');

    if (!driver) {
      return 'disabled';
    }

    return `${driver}|${this.configGroupHashService.computeHash(ConfigVariablesGroup.CAPTCHA_CONFIG)}`;
  }

  protected createDriver(): CaptchaDriver | null {
    const driver = this.kovaa-labConfigService.get('CAPTCHA_DRIVER');
    const siteKey = this.kovaa-labConfigService.get('CAPTCHA_SITE_KEY');
    const secretKey = this.kovaa-labConfigService.get('CAPTCHA_SECRET_KEY');

    if (!driver) {
      return null;
    }

    if (!siteKey || !secretKey) {
      throw new Error('Captcha driver requires site key and secret key');
    }

    const captchaOptions = { siteKey, secretKey };

    switch (driver) {
      case CaptchaDriverType.GOOGLE_RECAPTCHA:
        return new GoogleRecaptchaDriver(
          captchaOptions,
          this.secureHttpClientService.getHttpClient({
            baseURL: 'https://www.google.com/recaptcha/api/siteverify',
          }),
        );

      case CaptchaDriverType.TURNSTILE:
        return new TurnstileDriver(
          captchaOptions,
          this.secureHttpClientService.getHttpClient({
            baseURL:
              'https://challenges.cloudflare.com/turnstile/v0/siteverify',
          }),
        );

      default:
        throw new Error(`Invalid captcha driver type: ${driver}`);
    }
  }

  getCurrentDriver(): CaptchaDriver | null {
    const driver = this.kovaa-labConfigService.get('CAPTCHA_DRIVER');

    if (!driver) {
      return null;
    }

    return super.getCurrentDriver();
  }
}
