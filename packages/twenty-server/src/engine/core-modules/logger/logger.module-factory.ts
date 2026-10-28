import {
  LoggerDriverType,
  type LoggerModuleOptions,
} from 'src/engine/core-modules/logger/interfaces';
import { type KovaaLab CRMConfigService } from 'src/engine/core-modules/kovaa-lab-config/kovaa-lab-config.service';

export const loggerModuleFactory = async (
  kovaa-labConfigService: KovaaLab CRMConfigService,
): Promise<LoggerModuleOptions> => {
  const driverType = kovaa-labConfigService.get('LOGGER_DRIVER');
  const logLevels = kovaa-labConfigService.get('LOG_LEVELS');

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
