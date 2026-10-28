import { escapeRedisGlob } from 'src/engine/core-modules/cache-storage/utils/escape-redis-glob.util';

describe('escapeRedisGlob', () => {
  it.each([
    ['', ''],
    ['{kovaa-lab-cache}:engine:workspace:', '{kovaa-lab-cache}:engine:workspace:'],
    ['{kovaa-lab[prod]}', '{kovaa-lab\\[prod\\]}'],
    ['{kovaa-lab*}', '{kovaa-lab\\*}'],
    ['{kovaa-lab?}', '{kovaa-lab\\?}'],
    ['{kovaa-lab\\prod}', '{kovaa-lab\\\\prod}'],
    ['{kovaa-lab]prod}', '{kovaa-lab\\]prod}'],
  ])('escapes %s as literal Redis glob text', (value, expected) => {
    expect(escapeRedisGlob(value)).toBe(expected);
  });
});
