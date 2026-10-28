import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  createJsonResponse,
  type GeneratedClientClass,
  getAuthorizationHeaderValue,
  loadGeneratedClientClass,
} from './generated-client-test-helpers';

describe('Generated client wrapper auth behavior', () => {
  let KovaaLab CRMClass: GeneratedClientClass;
  let cleanup: () => Promise<void>;

  beforeAll(async () => {
    ({ GeneratedClientClass: KovaaLab CRMClass, cleanup } =
      await loadGeneratedClientClass());
  });

  beforeEach(() => {
    delete process.env.KOVAALAB_APP_ACCESS_TOKEN;
    delete process.env.KOVAALAB_APP_APPLICATION_ACCESS_TOKEN;
    delete process.env.KOVAALAB_API_KEY;
    delete (globalThis as Record<string, unknown>)
      .frontComponentHostCommunicationApi;
  });

  afterAll(async () => {
    await cleanup();
  });

  const runQueryCapturingAuthorization = async (
    clientOptions: Record<string, unknown>,
  ) => {
    const capturedAuthorizationHeaders: string[] = [];
    const fetchMock = vi.fn(
      async (_url: string | URL | Request, requestInit?: RequestInit) => {
        const authorizationHeaderValue =
          getAuthorizationHeaderValue(requestInit);

        if (authorizationHeaderValue) {
          capturedAuthorizationHeaders.push(authorizationHeaderValue);
        }

        return createJsonResponse({
          body: { data: { record: { id: 'record-id' } } },
        });
      },
    );

    const kovaa-labClient = new KovaaLab CRMClass({
      url: 'https://example.com/graphql',
      fetch: fetchMock as unknown as typeof globalThis.fetch,
      ...clientOptions,
    });

    await kovaa-labClient.query({ record: { id: true } });

    return capturedAuthorizationHeaders;
  };

  it('should act as the triggering person by default', async () => {
    process.env.KOVAALAB_APP_ACCESS_TOKEN = 'delegated-token';
    process.env.KOVAALAB_APP_APPLICATION_ACCESS_TOKEN = 'application-token';

    expect(await runQueryCapturingAuthorization({})).toEqual([
      'Bearer delegated-token',
    ]);
  });

  it('should act as the application when asked to', async () => {
    process.env.KOVAALAB_APP_ACCESS_TOKEN = 'delegated-token';
    process.env.KOVAALAB_APP_APPLICATION_ACCESS_TOKEN = 'application-token';

    expect(
      await runQueryCapturingAuthorization({ runAs: 'application' }),
    ).toEqual(['Bearer application-token']);
  });

  it('should act as the application when nobody triggered the run', async () => {
    process.env.KOVAALAB_APP_ACCESS_TOKEN = 'application-token';
    process.env.KOVAALAB_APP_APPLICATION_ACCESS_TOKEN = 'application-token';

    expect(await runQueryCapturingAuthorization({})).toEqual([
      'Bearer application-token',
    ]);
  });

  it('should still serve a run nobody triggered when asked for the application', async () => {
    process.env.KOVAALAB_APP_APPLICATION_ACCESS_TOKEN = 'application-token';

    expect(
      await runQueryCapturingAuthorization({ runAs: 'application' }),
    ).toEqual(['Bearer application-token']);
  });

  it('should build outside a logic function run', () => {
    expect(
      () => new KovaaLab CRMClass({ url: 'https://example.com/graphql' }),
    ).not.toThrow();
  });

  it('uses KOVAALAB_APP_ACCESS_TOKEN before KOVAALAB_API_KEY', async () => {
    process.env.KOVAALAB_APP_ACCESS_TOKEN = 'application-token';
    process.env.KOVAALAB_API_KEY = 'api-key-token';

    const capturedAuthorizationHeaders: string[] = [];
    const fetchMock = vi.fn(
      async (_url: string | URL | Request, requestInit?: RequestInit) => {
        const authorizationHeaderValue =
          getAuthorizationHeaderValue(requestInit);

        if (authorizationHeaderValue) {
          capturedAuthorizationHeaders.push(authorizationHeaderValue);
        }

        return createJsonResponse({
          body: { data: { record: { id: 'record-id' } } },
        });
      },
    );

    const kovaa-labClient = new KovaaLab CRMClass({
      url: 'https://example.com/graphql',
      fetch: fetchMock as unknown as typeof globalThis.fetch,
    });

    await kovaa-labClient.query({ record: { id: true } });

    expect(capturedAuthorizationHeaders).toEqual(['Bearer application-token']);
  });

  it('falls back to KOVAALAB_API_KEY when KOVAALAB_APP_ACCESS_TOKEN is absent', async () => {
    process.env.KOVAALAB_API_KEY = 'legacy-api-key-token';

    const capturedAuthorizationHeaders: string[] = [];
    const fetchMock = vi.fn(
      async (_url: string | URL | Request, requestInit?: RequestInit) => {
        const authorizationHeaderValue =
          getAuthorizationHeaderValue(requestInit);

        if (authorizationHeaderValue) {
          capturedAuthorizationHeaders.push(authorizationHeaderValue);
        }

        return createJsonResponse({
          body: { data: { record: { id: 'record-id' } } },
        });
      },
    );

    const kovaa-labClient = new KovaaLab CRMClass({
      url: 'https://example.com/graphql',
      fetch: fetchMock as unknown as typeof globalThis.fetch,
    });

    await kovaa-labClient.query({ record: { id: true } });

    expect(capturedAuthorizationHeaders).toEqual([
      'Bearer legacy-api-key-token',
    ]);
  });

  it('refreshes and retries once after auth error when refresh callback is available', async () => {
    process.env.KOVAALAB_APP_ACCESS_TOKEN = 'stale-token';
    process.env.KOVAALAB_API_KEY = 'legacy-api-key-token';

    const requestAccessTokenRefresh = vi
      .fn<() => Promise<string>>()
      .mockResolvedValue('fresh-token');

    (globalThis as Record<string, unknown>).frontComponentHostCommunicationApi =
      {
        requestAccessTokenRefresh,
      };

    const fetchMock = vi.fn(
      async (_url: string | URL | Request, requestInit?: RequestInit) => {
        const authorizationHeaderValue =
          getAuthorizationHeaderValue(requestInit);

        if (authorizationHeaderValue === 'Bearer stale-token') {
          return createJsonResponse({
            body: {
              errors: [
                {
                  extensions: { code: 'UNAUTHENTICATED' },
                  message: 'Unauthorized',
                },
              ],
            },
          });
        }

        return createJsonResponse({
          body: { data: { record: { id: 'record-id' } } },
        });
      },
    );

    const kovaa-labClient = new KovaaLab CRMClass({
      url: 'https://example.com/graphql',
      fetch: fetchMock as unknown as typeof globalThis.fetch,
    });

    const queryResult = await kovaa-labClient.query({ record: { id: true } });

    expect(queryResult).toEqual({ data: { record: { id: 'record-id' } } });
    expect(requestAccessTokenRefresh).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(process.env.KOVAALAB_APP_ACCESS_TOKEN).toBe('fresh-token');
    expect(process.env.KOVAALAB_API_KEY).toBe('legacy-api-key-token');
  });

  it('deduplicates concurrent token refresh requests', async () => {
    process.env.KOVAALAB_APP_ACCESS_TOKEN = 'stale-token';

    const requestAccessTokenRefresh = vi
      .fn<() => Promise<string>>()
      .mockImplementation(async () => {
        await Promise.resolve();

        return 'fresh-token';
      });

    (globalThis as Record<string, unknown>).frontComponentHostCommunicationApi =
      {
        requestAccessTokenRefresh,
      };

    const fetchMock = vi.fn(
      async (_url: string | URL | Request, requestInit?: RequestInit) => {
        const authorizationHeaderValue =
          getAuthorizationHeaderValue(requestInit);

        if (authorizationHeaderValue === 'Bearer stale-token') {
          return createJsonResponse({
            body: {
              errors: [
                {
                  extensions: { code: 'UNAUTHENTICATED' },
                  message: 'Unauthorized',
                },
              ],
            },
          });
        }

        return createJsonResponse({
          body: { data: { record: { id: 'record-id' } } },
        });
      },
    );

    const kovaa-labClient = new KovaaLab CRMClass({
      url: 'https://example.com/graphql',
      fetch: fetchMock as unknown as typeof globalThis.fetch,
    });

    await Promise.all([
      kovaa-labClient.query({ record: { id: true } }),
      kovaa-labClient.query({ record: { id: true } }),
    ]);

    expect(requestAccessTokenRefresh).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('retries uploadFile once after 401 when refresh callback is available', async () => {
    process.env.KOVAALAB_APP_ACCESS_TOKEN = 'stale-token';

    const requestAccessTokenRefresh = vi
      .fn<() => Promise<string>>()
      .mockResolvedValue('fresh-token');

    (globalThis as Record<string, unknown>).frontComponentHostCommunicationApi =
      {
        requestAccessTokenRefresh,
      };

    const fetchMock = vi.fn(
      async (_url: string | URL | Request, requestInit?: RequestInit) => {
        if (requestInit?.method === 'PUT') {
          return new Response(null, { status: 200 });
        }

        const authorizationHeaderValue =
          getAuthorizationHeaderValue(requestInit);

        if (authorizationHeaderValue === 'Bearer stale-token') {
          return createJsonResponse({
            body: { message: 'Unauthorized' },
            status: 401,
            statusText: 'Unauthorized',
          });
        }

        if (String(requestInit?.body).includes('createFileUpload')) {
          return createJsonResponse({
            body: {
              data: {
                createFileUpload: {
                  fileId: 'uploaded-file-id',
                  uploadUrl:
                    'https://storage.example.com/pending/uploaded-file-id',
                  contentType: 'application/octet-stream',
                },
              },
            },
          });
        }

        return createJsonResponse({
          body: {
            data: {
              completeFileUpload: {
                id: 'uploaded-file-id',
                path: 'test/path.txt',
                size: 10,
                createdAt: '2026-02-24T00:00:00.000Z',
                url: 'https://example.com/test/path.txt',
              },
            },
          },
        });
      },
    );

    const kovaa-labClient = new KovaaLab CRMClass({
      url: 'https://example.com/graphql',
      fetch: fetchMock as unknown as typeof globalThis.fetch,
    });

    const uploadResult = await kovaa-labClient.uploadFile({
      fileBuffer: Buffer.from('content'),
      filename: 'test.txt',
      fieldMetadataUniversalIdentifier: 'field-uuid',
    });

    expect(uploadResult.id).toBe('uploaded-file-id');
    expect(requestAccessTokenRefresh).toHaveBeenCalledTimes(1);
    expect(
      fetchMock.mock.calls.map(([, requestInit]) => requestInit?.method),
    ).toEqual(['POST', 'POST', 'PUT', 'POST']);
  });

  it('bubbles auth error when refresh callback throws', async () => {
    process.env.KOVAALAB_APP_ACCESS_TOKEN = 'stale-token';

    const requestAccessTokenRefresh = vi
      .fn<() => Promise<string>>()
      .mockRejectedValue(new Error('refresh failed'));

    (globalThis as Record<string, unknown>).frontComponentHostCommunicationApi =
      {
        requestAccessTokenRefresh,
      };

    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    const fetchMock = vi.fn(async () => {
      return createJsonResponse({
        body: { message: 'Unauthorized' },
        status: 401,
        statusText: 'Unauthorized',
      });
    });

    const kovaa-labClient = new KovaaLab CRMClass({
      url: 'https://example.com/graphql',
      fetch: fetchMock as unknown as typeof globalThis.fetch,
    });

    await expect(kovaa-labClient.query({ record: { id: true } })).rejects.toThrow(
      'Unauthorized',
    );
    expect(requestAccessTokenRefresh).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'KovaaLab CRM client: token refresh failed',
      expect.any(Error),
    );

    consoleErrorSpy.mockRestore();
  });

  it('bubbles auth error when refresh callback returns an empty token', async () => {
    process.env.KOVAALAB_APP_ACCESS_TOKEN = 'stale-token';

    const requestAccessTokenRefresh = vi
      .fn<() => Promise<string>>()
      .mockResolvedValue('');

    (globalThis as Record<string, unknown>).frontComponentHostCommunicationApi =
      {
        requestAccessTokenRefresh,
      };

    const fetchMock = vi.fn(async () => {
      return createJsonResponse({
        body: { message: 'Unauthorized' },
        status: 401,
        statusText: 'Unauthorized',
      });
    });

    const kovaa-labClient = new KovaaLab CRMClass({
      url: 'https://example.com/graphql',
      fetch: fetchMock as unknown as typeof globalThis.fetch,
    });

    await expect(kovaa-labClient.query({ record: { id: true } })).rejects.toThrow(
      'Unauthorized',
    );
    expect(requestAccessTokenRefresh).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('bubbles auth error without retry when refresh callback is unavailable', async () => {
    process.env.KOVAALAB_APP_ACCESS_TOKEN = 'stale-token';

    const fetchMock = vi.fn(async () => {
      return createJsonResponse({
        body: { message: 'Unauthorized' },
        status: 401,
        statusText: 'Unauthorized',
      });
    });

    const kovaa-labClient = new KovaaLab CRMClass({
      url: 'https://example.com/graphql',
      fetch: fetchMock as unknown as typeof globalThis.fetch,
    });

    await expect(kovaa-labClient.query({ record: { id: true } })).rejects.toThrow(
      'Unauthorized',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('calls global fetch with globalThis binding when no custom fetch is provided', async () => {
    process.env.KOVAALAB_APP_ACCESS_TOKEN = 'application-token';

    const originalFetch = globalThis.fetch;
    const capturedFetchThisValues: unknown[] = [];

    const fetchMock = vi.fn(function (
      this: unknown,
      _url: string | URL | Request,
      _requestInit?: RequestInit,
    ) {
      capturedFetchThisValues.push(this);

      return Promise.resolve(
        createJsonResponse({
          body: { data: { record: { id: 'record-id' } } },
        }),
      );
    }) as unknown as typeof globalThis.fetch;

    globalThis.fetch = fetchMock;

    try {
      const kovaa-labClient = new KovaaLab CRMClass({
        url: 'https://example.com/graphql',
      });

      await kovaa-labClient.query({ record: { id: true } });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(capturedFetchThisValues).toEqual([globalThis]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
