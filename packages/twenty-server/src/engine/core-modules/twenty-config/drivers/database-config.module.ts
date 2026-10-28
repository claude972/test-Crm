import { type DynamicModule, Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

import { KeyValuePairEntity } from 'src/engine/core-modules/key-value-pair/key-value-pair.entity';
import { SecretEncryptionModule } from 'src/engine/core-modules/secret-encryption/secret-encryption.module';
import { ConfigCacheService } from 'src/engine/core-modules/kovaa-lab-config/cache/config-cache.service';
import { ConfigVariables } from 'src/engine/core-modules/kovaa-lab-config/config-variables';
import { CONFIG_VARIABLES_INSTANCE_TOKEN } from 'src/engine/core-modules/kovaa-lab-config/constants/config-variables-instance-tokens.constants';
import { ConfigValueConverterService } from 'src/engine/core-modules/kovaa-lab-config/conversion/config-value-converter.service';
import { DatabaseConfigDriver } from 'src/engine/core-modules/kovaa-lab-config/drivers/database-config.driver';
import { ConfigStorageService } from 'src/engine/core-modules/kovaa-lab-config/storage/config-storage.service';

@Module({})
export class DatabaseConfigModule {
  static forRoot(): DynamicModule {
    return {
      module: DatabaseConfigModule,
      imports: [
        TypeOrmModule.forFeature([KeyValuePairEntity]),
        ScheduleModule.forRoot(),
        SecretEncryptionModule,
      ],
      providers: [
        DatabaseConfigDriver,
        ConfigCacheService,
        ConfigStorageService,
        ConfigValueConverterService,
        {
          provide: CONFIG_VARIABLES_INSTANCE_TOKEN,
          useValue: new ConfigVariables(),
        },
      ],
      exports: [DatabaseConfigDriver],
    };
  }
}
