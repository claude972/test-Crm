import { Injectable } from '@nestjs/common';

import { type EmailDriverInterface } from 'src/engine/core-modules/email/drivers/interfaces/email-driver.interface';

import { LoggerDriver } from 'src/engine/core-modules/email/drivers/logger.driver';
import { SmtpDriver } from 'src/engine/core-modules/email/drivers/smtp.driver';
import { EmailDriver } from 'src/engine/core-modules/email/enums/email-driver.enum';
import { DriverFactoryBase } from 'src/engine/core-modules/kovaa-lab-config/dynamic-factory.base';
import { ConfigVariablesGroup } from 'src/engine/core-modules/kovaa-lab-config/enums/config-variables-group.enum';
import { ConfigGroupHashService } from 'src/engine/core-modules/kovaa-lab-config/services/config-group-hash.service';
import { KovaaLab CRMConfigService } from 'src/engine/core-modules/kovaa-lab-config/kovaa-lab-config.service';

@Injectable()
export class EmailDriverFactory extends DriverFactoryBase<EmailDriverInterface> {
  constructor(
    kovaa-labConfigService: KovaaLab CRMConfigService,
    configGroupHashService: ConfigGroupHashService,
  ) {
    super(kovaa-labConfigService, configGroupHashService);
  }

  protected buildConfigKey(): string {
    const driver = this.kovaa-labConfigService.get('EMAIL_DRIVER');

    if (driver === EmailDriver.LOGGER) {
      return 'logger';
    }

    if (driver === EmailDriver.SMTP) {
      const emailConfigHash = this.configGroupHashService.computeHash(
        ConfigVariablesGroup.EMAIL_SETTINGS,
      );

      return `smtp|${emailConfigHash}`;
    }

    throw new Error(`Unsupported email driver: ${driver}`);
  }

  protected createDriver(): EmailDriverInterface {
    const driver = this.kovaa-labConfigService.get('EMAIL_DRIVER');

    switch (driver) {
      case EmailDriver.LOGGER:
        return new LoggerDriver();

      case EmailDriver.SMTP: {
        const host = this.kovaa-labConfigService.get('EMAIL_SMTP_HOST');
        const port = this.kovaa-labConfigService.get('EMAIL_SMTP_PORT');
        const user = this.kovaa-labConfigService.get('EMAIL_SMTP_USER');
        const pass = this.kovaa-labConfigService.get('EMAIL_SMTP_PASSWORD');
        const noTLS = this.kovaa-labConfigService.get('EMAIL_SMTP_NO_TLS');
        const name = this.kovaa-labConfigService.get('EMAIL_SMTP_NAME');

        if (!host || !port) {
          throw new Error('SMTP driver requires host and port to be defined');
        }

        const options: {
          host: string;
          port: number;
          auth?: { user: string; pass: string };
          secure?: boolean;
          ignoreTLS?: boolean;
          requireTLS?: boolean;
          name?: string;
        } = { host, port };

        if (name) {
          options.name = name;
        }

        if (user && pass) {
          options.auth = { user, pass };
        }

        if (noTLS) {
          options.secure = false;
          options.ignoreTLS = true;
        }

        return new SmtpDriver(options);
      }

      default:
        throw new Error(`Invalid email driver: ${driver}`);
    }
  }

  protected disposeDriver(driver: EmailDriverInterface): void {
    driver.close?.();
  }
}
