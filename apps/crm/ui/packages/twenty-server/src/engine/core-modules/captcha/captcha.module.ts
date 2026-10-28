import { type DynamicModule, Global } from '@nestjs/common';

import { CaptchaDriverFactory } from 'src/engine/core-modules/captcha/captcha-driver.factory';
import { CaptchaService } from 'src/engine/core-modules/captcha/captcha.service';
import { SecureHttpClientModule } from 'src/engine/core-modules/secure-http-client/secure-http-client.module';
import { KovaaLab CRMConfigModule } from 'src/engine/core-modules/kovaa-lab-config/kovaa-lab-config.module';

@Global()
export class CaptchaModule {
  static forRoot(): DynamicModule {
    return {
      module: CaptchaModule,
      imports: [KovaaLab CRMConfigModule, SecureHttpClientModule],
      providers: [CaptchaDriverFactory, CaptchaService],
      exports: [CaptchaService],
    };
  }
}
