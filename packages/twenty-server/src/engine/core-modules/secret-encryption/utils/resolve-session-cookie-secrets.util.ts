import { createHash } from 'crypto';

import { isNonEmptyString } from '@sniptt/guards';

import { deriveInstanceHmacKey } from 'src/engine/core-modules/secret-encryption/utils/derive-instance-hmac-key.util';
import { type KovaaLab CRMConfigService } from 'src/engine/core-modules/kovaa-lab-config/kovaa-lab-config.service';

const SESSION_COOKIE_HMAC_PURPOSE = 'session-cookie';

const buildLegacySessionSecret = (appSecret: string) =>
  createHash('sha256').update(`${appSecret}SESSION_STORE_SECRET`).digest('hex');

export const resolveSessionCookieSecretsOrThrow = ({
  kovaa-labConfigService,
}: {
  kovaa-labConfigService: Pick<KovaaLab CRMConfigService, 'get'>;
}): string[] => {
  const encryptionKey = kovaa-labConfigService.get('ENCRYPTION_KEY');
  const fallbackEncryptionKey = kovaa-labConfigService.get(
    'FALLBACK_ENCRYPTION_KEY',
  );
  const appSecret = kovaa-labConfigService.get('APP_SECRET');

  const rawPrimary = isNonEmptyString(encryptionKey)
    ? encryptionKey
    : appSecret;

  if (!isNonEmptyString(rawPrimary)) {
    throw new Error(
      'Cannot derive session cookie secret: set ENCRYPTION_KEY (or APP_SECRET for legacy deployments).',
    );
  }

  const secrets: string[] = [
    deriveInstanceHmacKey({
      rawKey: rawPrimary,
      purpose: SESSION_COOKIE_HMAC_PURPOSE,
    }).toString('hex'),
  ];

  if (isNonEmptyString(fallbackEncryptionKey)) {
    secrets.push(
      deriveInstanceHmacKey({
        rawKey: fallbackEncryptionKey,
        purpose: SESSION_COOKIE_HMAC_PURPOSE,
      }).toString('hex'),
    );
  }

  if (isNonEmptyString(appSecret)) {
    secrets.push(buildLegacySessionSecret(appSecret));
  }

  return secrets;
};
