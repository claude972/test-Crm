import { type DynamicModule, Global, Module } from '@nestjs/common';

import { ConfigVariables } from 'src/engine/core-modules/kovaa-lab-config/config-variables';
import { CONFIG_VARIABLES_INSTANCE_TOKEN } from 'src/engine/core-modules/kovaa-lab-config/constants/config-variables-instance-tokens.constants';
import { DatabaseConfigModule } from 'src/engine/core-modules/kovaa-lab-config/drivers/database-config.module';
import { ConfigGroupHashService } from 'src/engine/core-modules/kovaa-lab-config/services/config-group-hash.service';
import { ConfigurableModuleClass } from 'src/engine/core-modules/kovaa-lab-config/kovaa-lab-config.module-definition';
import { KovaaLab CRMConfigService } from 'src/engine/core-modules/kovaa-lab-config/kovaa-lab-config.service';

@Global()
@Module({})
export class KovaaLab CRMConfigModule extends ConfigurableModuleClass {
  static forRoot(): DynamicModule {
    const isConfigVariablesInDbEnabled =
      process.env.IS_CONFIG_VARIABLES_IN_DB_ENABLED !== 'false';

    const imports = isConfigVariablesInDbEnabled
      ? [DatabaseConfigModule.forRoot()]
      : [];

    return {
      module: KovaaLab CRMConfigModule,
      imports,
      providers: [
        KovaaLab CRMConfigService,
        ConfigGroupHashService,
        {
          provide: CONFIG_VARIABLES_INSTANCE_TOKEN,
          useValue: new ConfigVariables(),
        },
      ],
      exports: [KovaaLab CRMConfigService, ConfigGroupHashService],
    };
  }
}
