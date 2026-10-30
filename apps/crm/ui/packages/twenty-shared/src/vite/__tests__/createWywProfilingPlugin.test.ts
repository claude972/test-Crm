import { createWywProfilingPlugin } from '../createWywProfilingPlugin';

describe('createWywProfilingPlugin', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const fixture = () => ({
    name: 'native-wyw',
    enforce: 'post' as const,
    configResolved: jest.fn((_config: { command: string; root: string }) => {}),
    transform: jest.fn((_code: string, _id: string, _options?: unknown) => ({
      code: 'compiled',
      map: null,
    })),
    buildStart: jest.fn(),
    closeBundle: jest.fn(),
    unrelatedOption: 'preserved',
  });

  it('preserves provider options and skips files without Linaria', () => {
    const original = fixture();
    const profiled = createWywProfilingPlugin(original);
    expect(profiled.name).toBe(original.name);
    expect(profiled.unrelatedOption).toBe('preserved');
    expect(profiled.enforce).toBe('pre');
    expect(
      profiled.transform('export const value = 1;', '/src/plain.ts'),
    ).toBeNull();
    expect(original.transform).not.toHaveBeenCalled();
  });

  it('delegates synchronous transformation with its original context and arguments', () => {
    const original = fixture();
    const profiled = createWywProfilingPlugin(original);
    const context = { nativeContext: true };
    const options = { ssr: true };
    const code = "import { css } from '@linaria/core';";
    expect(
      profiled.transform.call(context, code, '/src/file.ts', options),
    ).toEqual({
      code: 'compiled',
      map: null,
    });
    expect(original.transform).toHaveBeenCalledWith(
      code,
      '/src/file.ts',
      options,
    );
    expect(original.transform.mock.contexts[0]).toBe(context);
  });

  it('preserves an asynchronous transformation result', async () => {
    const transform = jest.fn(async (_code: string, _id: string) => ({
      code: 'async-compiled',
      map: null,
    }));
    const profiled = createWywProfilingPlugin({ ...fixture(), transform });
    await expect(
      profiled.transform("import '@linaria/react';", '/src/file.tsx'),
    ).resolves.toEqual({ code: 'async-compiled', map: null });
    expect(transform).toHaveBeenCalledTimes(1);
  });

  it('delegates native configuration and warms Babel using the resolved root', async () => {
    const original = fixture();
    const profiled = createWywProfilingPlugin(original);
    const config = { command: 'serve', root: '/canonical/app' };
    const context = { nativeContext: true };
    profiled.configResolved.call(context, config);
    await profiled.buildStart.call(context);
    expect(original.configResolved).toHaveBeenCalledWith(config);
    expect(original.configResolved.mock.contexts[0]).toBe(context);
    expect(original.transform).toHaveBeenCalledWith(
      expect.stringContaining("from '@linaria/react'"),
      '/canonical/app/src/__wyw_warmup__.tsx',
    );
    expect(original.transform.mock.contexts[0]).toBe(context);
    expect(() => profiled.closeBundle()).not.toThrow();
  });
});
