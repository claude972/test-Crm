import { Injectable, ServiceUnavailableException } from '@nestjs/common';

import { RedisClientService } from 'src/engine/core-modules/redis-client/redis-client.service';
import { KovaaLabCRMConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { HERMES_INTAKE_TTL_SECONDS } from 'src/engine/core-modules/hermes-prospection/intake/hermes-intake-signature';

// Redis evaluates the nonce claim and rate limit as one atomic operation.
const CLAIM_SCRIPT = `
if redis.call('EXISTS', KEYS[1]) == 1 then return 0 end
local count = redis.call('INCR', KEYS[2])
if count == 1 then redis.call('PEXPIRE', KEYS[2], 120000) end
if count > tonumber(ARGV[2]) then return -1 end
redis.call('SET', KEYS[1], '1', 'PX', ARGV[1], 'NX')
return 1
`;

@Injectable()
export class HermesIntakeReplayService {
  constructor(
    private readonly redis: RedisClientService,
    private readonly config: KovaaLabCRMConfigService,
  ) {}

  async claim(
    connectionId: string,
    nonce: string,
    limit: number,
  ): Promise<'claimed' | 'replayed' | 'rate-limited'> {
    const prefix = `${this.config.get('REDIS_CACHE_PREFIX')}:hermes-intake:${connectionId}`;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([
        this.redis
          .getClient()
          .eval(
            CLAIM_SCRIPT,
            2,
            `${prefix}:nonce:${nonce}`,
            `${prefix}:rate:${Math.floor(Date.now() / 60_000)}`,
            (2 * HERMES_INTAKE_TTL_SECONDS + 1) * 1000,
            limit,
          ),
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => reject(new Error()), 3000);
        }),
      ]);
      if (result === 1) return 'claimed';
      if (result === 0) return 'replayed';
      if (result === -1) return 'rate-limited';
      throw new Error();
    } catch {
      throw new ServiceUnavailableException(
        'HERMES_INTAKE_REPLAY_STORE_UNAVAILABLE',
      );
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
