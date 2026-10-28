import { type OnModuleDestroy } from '@nestjs/common';

import { isDefined } from 'kovaa-lab-shared/utils';

import { type ConfigGroupHashService } from 'src/engine/core-modules/kovaa-lab-config/services/config-group-hash.service';
import { type KovaaLab CRMConfigService } from 'src/engine/core-modules/kovaa-lab-config/kovaa-lab-config.service';

export abstract class DriverFactoryBase<TDriver> implements OnModuleDestroy {
  private currentDriver: TDriver | null = null;
  private currentConfigKey: string | null = null;

  constructor(
    protected readonly kovaa-labConfigService: KovaaLab CRMConfigService,
    protected readonly configGroupHashService: ConfigGroupHashService,
  ) {}

  getCurrentDriver(): TDriver {
    let configKey: string;

    try {
      configKey = this.buildConfigKey();
    } catch (error) {
      throw new Error(
        `Failed to build config key for ${this.constructor.name}. Original error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (this.currentConfigKey !== configKey) {
      let newDriver: TDriver;

      try {
        newDriver = this.createDriver();
      } catch (error) {
        throw new Error(
          `Failed to create driver for ${this.constructor.name} with config key: ${configKey}. Original error: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      this.releaseCurrentDriver();

      this.currentDriver = newDriver;
      this.currentConfigKey = configKey;
    }

    if (!this.currentDriver) {
      throw new Error(
        `Failed to create driver for ${this.constructor.name} with config key: ${configKey}`,
      );
    }

    return this.currentDriver;
  }

  onModuleDestroy(): void {
    this.releaseCurrentDriver();

    this.currentConfigKey = null;
  }

  private releaseCurrentDriver(): void {
    if (!isDefined(this.currentDriver)) {
      return;
    }

    this.disposeDriver?.(this.currentDriver);
    this.currentDriver = null;
  }

  protected abstract buildConfigKey(): string;
  protected abstract createDriver(): TDriver;
  protected disposeDriver?(driver: TDriver): void;
}
