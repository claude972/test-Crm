import { CACHE_MANAGER, Cache, CacheModule } from '@nestjs/cache-manager';
import { Global, Inject, Module, type OnModuleDestroy } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { cacheStorageModuleFactory } from 'src/engine/core-modules/cache-storage/cache-storage.module-factory';
import { FlushCacheCommand } from 'src/engine/core-modules/cache-storage/commands/flush-cache.command';
import { CacheStorageService } from 'src/engine/core-modules/cache-storage/services/cache-storage.service';
import { CacheStorageNamespace } from 'src/engine/core-modules/cache-storage/types/cache-storage-namespace.enum';
import { KovaaLab CRMConfigService } from 'src/engine/core-modules/kovaa-lab-config/kovaa-lab-config.service';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: cacheStorageModuleFactory,
      inject: [KovaaLab CRMConfigService],
    }),
  ],
  providers: [
    ...Object.values(CacheStorageNamespace).map((cacheStorageNamespace) => ({
      provide: cacheStorageNamespace,
      useFactory: (
        cacheManager: Cache,
        kovaa-labConfigService: KovaaLab CRMConfigService,
      ) => {
        return new CacheStorageService(
          cacheManager,
          cacheStorageNamespace,
          kovaa-labConfigService.get('REDIS_CACHE_PREFIX'),
        );
      },
      inject: [CACHE_MANAGER, KovaaLab CRMConfigService],
    })),
    FlushCacheCommand,
  ],
  exports: Object.values(CacheStorageNamespace),
})
export class CacheStorageModule implements OnModuleDestroy {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async onModuleDestroy() {
    // oxlint-disable-next-line typescript/no-explicit-any
    if ((this.cacheManager.store as any)?.name === 'redis') {
      // oxlint-disable-next-line typescript/no-explicit-any
      await (this.cacheManager.store as any).client.quit();
    }
  }
}
