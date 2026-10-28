import { Module } from '@nestjs/common';
import { JwtModule as NestJwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CoreEntityCacheModule } from 'src/engine/core-entity-cache/core-entity-cache.module';
import { EnterpriseModule } from 'src/engine/core-modules/enterprise/enterprise.module';
import {
  JWT_LEGACY_ALGORITHM,
  JWT_SUPPORTED_VERIFY_ALGORITHMS,
} from 'src/engine/core-modules/jwt/constants/jwt-algorithm.constant';
import { RotateSigningKeysCronJob } from 'src/engine/core-modules/jwt/crons/jobs/rotate-signing-keys.cron.job';
import { SigningKeyEntity } from 'src/engine/core-modules/jwt/entities/signing-key.entity';
import { JwtKeyManagerService } from 'src/engine/core-modules/jwt/services/jwt-key-manager.service';
import { JwtWrapperService } from 'src/engine/core-modules/jwt/services/jwt-wrapper.service';
import { SigningKeyEntityCacheProviderService } from 'src/engine/core-modules/jwt/services/signing-key-entity-cache-provider.service';
import { SigningKeyRotationService } from 'src/engine/core-modules/jwt/services/signing-key-rotation.service';
import { SigningKeyVerifyCounterService } from 'src/engine/core-modules/jwt/services/signing-key-verify-counter.service';
import { SecretEncryptionModule } from 'src/engine/core-modules/secret-encryption/secret-encryption.module';
import { KovaaLab CRMConfigService } from 'src/engine/core-modules/kovaa-lab-config/kovaa-lab-config.service';

const InternalJwtModule = NestJwtModule.registerAsync({
  useFactory: async (kovaa-labConfigService: KovaaLab CRMConfigService) => {
    return {
      secret: kovaa-labConfigService.get('APP_SECRET'),
      signOptions: {
        algorithm: JWT_LEGACY_ALGORITHM,
        expiresIn: kovaa-labConfigService.get('ACCESS_TOKEN_EXPIRES_IN'),
      },
      verifyOptions: {
        algorithms: [...JWT_SUPPORTED_VERIFY_ALGORITHMS],
      },
    };
  },
  inject: [KovaaLab CRMConfigService],
});

@Module({
  imports: [
    InternalJwtModule,
    TypeOrmModule.forFeature([SigningKeyEntity]),
    CoreEntityCacheModule,
    SecretEncryptionModule,
    EnterpriseModule,
  ],
  controllers: [],
  providers: [
    JwtWrapperService,
    JwtKeyManagerService,
    SigningKeyEntityCacheProviderService,
    SigningKeyVerifyCounterService,
    SigningKeyRotationService,
    RotateSigningKeysCronJob,
  ],
  exports: [
    JwtWrapperService,
    JwtKeyManagerService,
    SigningKeyVerifyCounterService,
  ],
})
export class JwtModule {}
