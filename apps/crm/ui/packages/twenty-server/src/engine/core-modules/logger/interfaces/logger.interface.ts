import { type LogLevel } from '@nestjs/common';

export type KovaaLab CRMLogLevel = LogLevel | 'performance';

export enum LoggerDriverType {
  CONSOLE = 'CONSOLE',
}

export interface ConsoleDriverFactoryOptions {
  type: LoggerDriverType.CONSOLE;
  logLevels?: KovaaLab CRMLogLevel[];
}

export type LoggerModuleOptions = ConsoleDriverFactoryOptions;
