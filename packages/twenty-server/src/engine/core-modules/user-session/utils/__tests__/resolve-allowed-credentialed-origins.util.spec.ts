import { ConfigVariables } from 'src/engine/core-modules/kovaa-lab-config/config-variables';
import { NodeEnvironment } from 'src/engine/core-modules/kovaa-lab-config/interfaces/node-environment.interface';
import { type KovaaLab CRMConfigService } from 'src/engine/core-modules/kovaa-lab-config/kovaa-lab-config.service';
import { resolveAllowedCredentialedOrigins } from 'src/engine/core-modules/user-session/utils/resolve-allowed-credentialed-origins.util';

type AllowedOriginsConfigVariables = Pick<
  ConfigVariables,
  'SERVER_URL' | 'FRONTEND_URL' | 'AUTH_COOKIE_ALLOWED_ORIGINS' | 'NODE_ENV'
>;

const PRODUCTION_CONFIG_VARIABLES: AllowedOriginsConfigVariables = {
  SERVER_URL: 'https://api.kovaa-lab.com',
  FRONTEND_URL: 'https://app.kovaa-lab.com',
  AUTH_COOKIE_ALLOWED_ORIGINS: '',
  NODE_ENV: NodeEnvironment.PRODUCTION,
};

const buildKovaaLab CRMConfigService = (
  allowedOriginsConfigVariables: AllowedOriginsConfigVariables,
): Pick<KovaaLab CRMConfigService, 'get'> => {
  const configVariables = Object.assign(
    new ConfigVariables(),
    allowedOriginsConfigVariables,
  );

  return {
    get: (key) => configVariables[key],
  };
};

describe('resolveAllowedCredentialedOrigins', () => {
  it('should allow the server, frontend and explicit origins', () => {
    const allowedOrigins = resolveAllowedCredentialedOrigins(
      buildKovaaLab CRMConfigService({
        ...PRODUCTION_CONFIG_VARIABLES,
        SERVER_URL: 'https://api.kovaa-lab.com/graphql',
        FRONTEND_URL: 'https://App.kovaa-lab.com',
        AUTH_COOKIE_ALLOWED_ORIGINS: ' https://other.example , file:///tmp',
      }),
    );

    expect([...allowedOrigins]).toEqual([
      'https://api.kovaa-lab.com',
      'https://app.kovaa-lab.com',
      'https://other.example',
    ]);
  });

  it('should skip derived loopback origins in production only', () => {
    const loopbackConfigVariables: AllowedOriginsConfigVariables = {
      SERVER_URL: 'http://localhost:3000',
      FRONTEND_URL: 'http://localhost:3001',
      AUTH_COOKIE_ALLOWED_ORIGINS: 'http://localhost:3001',
      NODE_ENV: NodeEnvironment.PRODUCTION,
    };

    const productionAllowedOrigins = resolveAllowedCredentialedOrigins(
      buildKovaaLab CRMConfigService(loopbackConfigVariables),
    );
    const developmentAllowedOrigins = resolveAllowedCredentialedOrigins(
      buildKovaaLab CRMConfigService({
        ...loopbackConfigVariables,
        NODE_ENV: NodeEnvironment.DEVELOPMENT,
      }),
    );

    expect([...productionAllowedOrigins]).toEqual(['http://localhost:3001']);
    expect([...developmentAllowedOrigins]).toEqual([
      'http://localhost:3000',
      'http://localhost:3001',
    ]);
  });

  it('should reuse the resolved origins while the config is unchanged', () => {
    const kovaa-labConfigService = buildKovaaLab CRMConfigService(
      PRODUCTION_CONFIG_VARIABLES,
    );

    expect(resolveAllowedCredentialedOrigins(kovaa-labConfigService)).toBe(
      resolveAllowedCredentialedOrigins(kovaa-labConfigService),
    );
  });

  it('should resolve the origins again when the config changes', () => {
    const allowedOriginsBeforeChange = resolveAllowedCredentialedOrigins(
      buildKovaaLab CRMConfigService(PRODUCTION_CONFIG_VARIABLES),
    );
    const allowedOriginsAfterChange = resolveAllowedCredentialedOrigins(
      buildKovaaLab CRMConfigService({
        ...PRODUCTION_CONFIG_VARIABLES,
        AUTH_COOKIE_ALLOWED_ORIGINS: 'https://other.example',
      }),
    );

    expect(allowedOriginsAfterChange).not.toBe(allowedOriginsBeforeChange);
    expect(allowedOriginsBeforeChange.has('https://other.example')).toBe(false);
    expect(allowedOriginsAfterChange.has('https://other.example')).toBe(true);
  });
});
