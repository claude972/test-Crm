import { type LogLevel } from '@nestjs/common';

export type KovaaLabCRMLogLevel = LogLevel | 'performance';

export enum LoggerDriverType {
  CONSOLE = 'CONSOLE',
}

export interface ConsoleDriverFactoryOptions {
  type: LoggerDriverType.CONSOLE;
  logLevels?: KovaaLabCRMLogLevel[];
}

export type LoggerModuleOptions = ConsoleDriverFactoryOptions;
