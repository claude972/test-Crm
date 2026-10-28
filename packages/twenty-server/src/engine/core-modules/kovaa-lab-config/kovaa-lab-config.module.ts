import { DynamicModule } from '@nestjs/common';

export class KovaaLabCRMConfigModule {
  static forRoot(): DynamicModule {
    return {
      module: KovaaLabCRMConfigModule,
    };
  }
}

export class KovaaLabConfigModule {}
