import { HERMES_SERVICE_WORKER_PATH } from '@/hermes-pwa/constants/hermesServiceWorker';
import { registerHermesServiceWorker } from '@/hermes-pwa/utils/registerHermesServiceWorker';
import { getIsDevelopmentEnvironment } from '~/utils/getIsDevelopmentEnvironment';

jest.mock('~/utils/getIsDevelopmentEnvironment');
jest.mock('~/utils/logError', () => ({ logError: jest.fn() }));

const mockedGetIsDevelopmentEnvironment = jest.mocked(
  getIsDevelopmentEnvironment,
);

type ServiceWorkerContainerStub = {
  register: jest.Mock;
  getRegistrations: jest.Mock;
};

const setServiceWorkerContainer = (
  stub: ServiceWorkerContainerStub | undefined,
) => {
  if (stub === undefined) {
    // @ts-expect-error removing the API is exactly the unsupported case.
    delete navigator.serviceWorker;

    return;
  }

  Object.defineProperty(navigator, 'serviceWorker', {
    value: stub,
    configurable: true,
    writable: true,
  });
};

const setSecureContext = (isSecureContext: boolean) => {
  Object.defineProperty(window, 'isSecureContext', {
    value: isSecureContext,
    configurable: true,
    writable: true,
  });
};

const createContainer = (): ServiceWorkerContainerStub => ({
  register: jest.fn().mockResolvedValue({}),
  getRegistrations: jest.fn().mockResolvedValue([]),
});

describe('registerHermesServiceWorker', () => {
  beforeEach(() => {
    mockedGetIsDevelopmentEnvironment.mockReturnValue(false);
    setSecureContext(true);
  });

  afterEach(() => {
    setServiceWorkerContainer(undefined);
    jest.clearAllMocks();
  });

  it('reports unsupported where the browser has no service worker API', async () => {
    setServiceWorkerContainer(undefined);

    await expect(registerHermesServiceWorker()).resolves.toBe('unsupported');
  });

  it('registers the root-scoped worker in production', async () => {
    const container = createContainer();
    setServiceWorkerContainer(container);

    await expect(registerHermesServiceWorker()).resolves.toBe('registered');

    // The scope has to be the root, otherwise the worker never sees the
    // navigations it exists to answer.
    expect(container.register).toHaveBeenCalledWith(
      HERMES_SERVICE_WORKER_PATH,
      { scope: '/', updateViaCache: 'none' },
    );
  });

  it('reports insecure-context instead of letting register throw', async () => {
    const container = createContainer();
    setServiceWorkerContainer(container);
    setSecureContext(false);

    await expect(registerHermesServiceWorker()).resolves.toBe(
      'insecure-context',
    );
    expect(container.register).not.toHaveBeenCalled();
  });

  it('reports failed, and does not throw, when registration is refused', async () => {
    const container = createContainer();
    container.register.mockRejectedValue(new Error('refused'));
    setServiceWorkerContainer(container);

    // A refused worker must cost the application nothing beyond installability
    // and the offline page.
    await expect(registerHermesServiceWorker()).resolves.toBe('failed');
  });

  it('registers nothing in development and removes our own stale worker', async () => {
    mockedGetIsDevelopmentEnvironment.mockReturnValue(true);
    const ourStaleWorker = {
      active: {
        scriptURL: `http://localhost:3001${HERMES_SERVICE_WORKER_PATH}`,
      },
      unregister: jest.fn().mockResolvedValue(true),
    };
    const someoneElsesWorker = {
      active: { scriptURL: 'http://localhost:3001/mockServiceWorker.js' },
      unregister: jest.fn().mockResolvedValue(true),
    };
    const container = createContainer();
    container.getRegistrations.mockResolvedValue([
      ourStaleWorker,
      someoneElsesWorker,
    ]);
    setServiceWorkerContainer(container);

    await expect(registerHermesServiceWorker()).resolves.toBe(
      'skipped-development',
    );

    expect(container.register).not.toHaveBeenCalled();
    // Ours goes, so a production worker left on localhost cannot intercept
    // Vite's navigations and turn hot reload into an unexplainable bug.
    expect(ourStaleWorker.unregister).toHaveBeenCalledTimes(1);
    // Anyone else's worker on this origin is none of our business: removing
    // the mock service worker would silently break the test tooling.
    expect(someoneElsesWorker.unregister).not.toHaveBeenCalled();
  });

  it('still reports skipped-development when listing registrations fails', async () => {
    mockedGetIsDevelopmentEnvironment.mockReturnValue(true);
    const container = createContainer();
    container.getRegistrations.mockRejectedValue(new Error('denied'));
    setServiceWorkerContainer(container);

    await expect(registerHermesServiceWorker()).resolves.toBe(
      'skipped-development',
    );
  });
});
