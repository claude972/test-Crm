import { type ExecutionContext } from '@nestjs/common';

import { type KovaaLabCRMConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { CloudflareSecretMatchGuard } from 'src/engine/core-modules/cloudflare/guards/cloudflare-secret.guard';

const buildMockContext = (headers: Record<string, unknown>) =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  }) as unknown as ExecutionContext;

describe('CloudflareSecretMatchGuard.canActivate', () => {
  let guard: CloudflareSecretMatchGuard;
  let kovaaLabConfigService: KovaaLabCRMConfigService;

  beforeEach(() => {
    kovaaLabConfigService = {
      get: jest.fn(),
    } as unknown as KovaaLabCRMConfigService;
    guard = new CloudflareSecretMatchGuard(kovaaLabConfigService);
  });

  it('should return true when the webhook secret matches', () => {
    jest.spyOn(kovaaLabConfigService, 'get').mockReturnValue('valid-secret');

    const context = buildMockContext({
      'cf-webhook-auth': 'valid-secret',
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw InternalServerErrorException when env is not set', () => {
    jest.spyOn(kovaaLabConfigService, 'get').mockReturnValue(undefined);

    const context = buildMockContext({
      'cf-webhook-auth': 'any-value',
    });

    expect(() => guard.canActivate(context)).toThrow(
      'CLOUDFLARE_WEBHOOK_SECRET is not configured',
    );
  });

  it('should return false when the header is missing', () => {
    jest.spyOn(kovaaLabConfigService, 'get').mockReturnValue('valid-secret');

    const context = buildMockContext({});

    expect(guard.canActivate(context)).toBe(false);
  });

  it('should return false when the header value is wrong', () => {
    jest.spyOn(kovaaLabConfigService, 'get').mockReturnValue('valid-secret');

    const context = buildMockContext({
      'cf-webhook-auth': 'wrong-secret',
    });

    expect(guard.canActivate(context)).toBe(false);
  });

  it('should return false when the header is an empty string', () => {
    jest.spyOn(kovaaLabConfigService, 'get').mockReturnValue('valid-secret');

    const context = buildMockContext({
      'cf-webhook-auth': '',
    });

    expect(guard.canActivate(context)).toBe(false);
  });

  it('should return false when header length differs from secret', () => {
    jest.spyOn(kovaaLabConfigService, 'get').mockReturnValue('short');

    const context = buildMockContext({
      'cf-webhook-auth': 'much-longer-value',
    });

    expect(guard.canActivate(context)).toBe(false);
  });
});
