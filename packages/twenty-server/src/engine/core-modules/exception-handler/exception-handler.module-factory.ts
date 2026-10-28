import { type HttpAdapterHost } from '@nestjs/core';

import { NodeEnvironment } from 'src/engine/core-modules/kovaa-lab-config/interfaces/node-environment.interface';

import { type OPTIONS_TYPE } from 'src/engine/core-modules/exception-handler/exception-handler.module-definition';
import { ExceptionHandlerDriver } from 'src/engine/core-modules/exception-handler/interfaces';
import { type KovaaLab CRMConfigService } from 'src/engine/core-modules/kovaa-lab-config/kovaa-lab-config.service';

export const exceptionHandlerModuleFactory = async (
  kovaa-labConfigService: KovaaLab CRMConfigService,
  adapterHost: HttpAdapterHost,
): Promise<typeof OPTIONS_TYPE> => {
  const driverType = kovaa-labConfigService.get('EXCEPTION_HANDLER_DRIVER');

  switch (driverType) {
    case ExceptionHandlerDriver.CONSOLE: {
      return {
        type: ExceptionHandlerDriver.CONSOLE,
      };
    }
    case ExceptionHandlerDriver.SENTRY: {
      return {
        type: ExceptionHandlerDriver.SENTRY,
        options: {
          environment: kovaa-labConfigService.get('SENTRY_ENVIRONMENT'),
          release: kovaa-labConfigService.get('APP_VERSION'),
          dsn: kovaa-labConfigService.get('SENTRY_DSN') ?? '',
          serverInstance: adapterHost.httpAdapter?.getInstance(),
          debug:
            kovaa-labConfigService.get('NODE_ENV') === NodeEnvironment.DEVELOPMENT,
        },
      };
    }
    default:
      throw new Error(
        `Invalid exception capturer driver type (${driverType}), check your .env file`,
      );
  }
};
