import { Test, type TestingModule } from '@nestjs/testing';

import { type Request } from 'express';

import { WellKnownController } from 'src/engine/core-modules/well-known/controllers/well-known.controller';
import { KovaaLabCRMConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';

describe('WellKnownController', () => {
  let controller: WellKnownController;
  const configGet = jest.fn();

  const buildMockRequest = (host: string, protocol = 'https') =>
    ({
      protocol,
      get: (header: string) =>
        header.toLowerCase() === 'host' ? host : undefined,
    }) as unknown as Request;

  beforeEach(async () => {
    configGet.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WellKnownController],
      providers: [
        {
          provide: KovaaLabCRMConfigService,
          useValue: { get: configGet },
        },
      ],
    }).compile();

    controller = module.get(WellKnownController);
  });

  describe('getMcpServerCard', () => {
    it('builds the card for the request host', () => {
      configGet.mockReturnValue('1.2.3');

      const card = controller.getMcpServerCard(
        buildMockRequest('workspace.kovaa-lab.com'),
      );

      expect(card.remotes[0].url).toBe('https://workspace.kovaa-lab.com/mcp');
      expect(card.version).toBe('1.2.3');
    });

    it('falls back to 0.0.0 when APP_VERSION is unset', () => {
      configGet.mockReturnValue(undefined);

      const card = controller.getMcpServerCard(
        buildMockRequest('workspace.kovaa-lab.com'),
      );

      expect(card.version).toBe('0.0.0');
    });
  });

  describe('getApiCatalog', () => {
    it('returns a parseable linkset anchored on the request host', () => {
      const body = controller.getApiCatalog(
        buildMockRequest('workspace.kovaa-lab.com'),
      );

      const parsed = JSON.parse(body);

      expect(
        parsed.linkset.map((entry: { anchor: string }) => entry.anchor),
      ).toContain('https://workspace.kovaa-lab.com/rest');
    });

    it('respects the forwarded protocol', () => {
      const body = controller.getApiCatalog(
        buildMockRequest('localhost:3000', 'http'),
      );

      expect(JSON.parse(body).linkset[0].anchor).toBe(
        'http://localhost:3000/rest',
      );
    });
  });
});
