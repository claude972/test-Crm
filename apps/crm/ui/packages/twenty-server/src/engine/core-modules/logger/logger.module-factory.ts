import {
  LoggerDriverType,
  type LoggerModuleOptions,
} from 'src/engine/core-modules/logger/interfaces';
import { type KovaaLabCRMConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';

export const loggerModuleFactory = async (
  kovaaLabConfigService: KovaaLabCRMConfigService,
): Promise<LoggerModuleOptions> => {
  const driverType = kovaaLabConfigService.get('LOGGER_DRIVER');
  const logLevels = kovaaLabConfigService.get('LOG_LEVELS');

  switch (driverType) {
    case LoggerDriverType.CONSOLE: {
      return {
        type: LoggerDriverType.CONSOLE,
        logLevels: logLevels,
      };
    }
    default:
      throw new Error(
        `Invalid logger driver type (${driverType}), check your .env file`,
      );
  }
};
