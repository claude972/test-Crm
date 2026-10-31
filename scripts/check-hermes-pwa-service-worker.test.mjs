/*
 * Exerce le VRAI fichier public/hermes-service-worker.js dans une portée de
 * service worker simulée.
 *
 * On ne réimplémente pas sa logique ici : le fichier est lu sur le disque et
 * évalué, donc le test échoue si quelqu'un ajoute une mise en cache de GraphQL,
 * de médias ou d'index.html. C'est la seule garantie automatisable sans
 * navigateur, et elle ne remplace pas la recette navigateur.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const SERVICE_WORKER_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../apps/crm/ui/packages/twenty-front/public/hermes-service-worker.js',
);

class FakeResponse {
  constructor(body, init = {}) {
    this.body = body;
    this.status = init.status ?? 200;
    this.statusText = init.statusText ?? '';
    this.headers = new Map(Object.entries(init.headers ?? {}));
    this.ok = this.status >= 200 && this.status < 300;
  }
}

class FakeRequest {
  constructor(url, init = {}) {
    this.url = url;
    this.method = init.method ?? 'GET';
    this.mode = init.mode ?? 'cors';
    this.credentials = init.credentials ?? 'same-origin';
    this.cache = init.cache ?? 'default';
  }
}

// Reproduit CacheStorage d'assez près pour que les assertions portent sur un
// comportement réel : des clés, des suppressions et un `match` par chemin.
const createCacheStorage = () => {
  const caches = new Map();

  const openCache = (name) => {
    if (!caches.has(name)) {
      caches.set(name, new Map());
    }

    const entries = caches.get(name);

    return {
      put: async (request, response) => {
        const key = typeof request === 'string' ? request : request.url;
        entries.set(key, { request, response });
      },
      match: async (request) => {
        const key = typeof request === 'string' ? request : request.url;

        return entries.get(key)?.response;
      },
    };
  };

  return {
    storage: caches,
    api: {
      open: async (name) => openCache(name),
      keys: async () => [...caches.keys()],
      delete: async (name) => caches.delete(name),
    },
  };
};

// Charge le worker réel et rend ses écouteurs appelables.
const loadServiceWorker = ({ fetchImplementation }) => {
  const listeners = new Map();
  const { storage, api } = createCacheStorage();
  const fetchCalls = [];
  const skipWaiting = { called: false };
  const claim = { called: false };

  const self = {
    addEventListener: (type, listener) => {
      listeners.set(type, listener);
    },
    skipWaiting: async () => {
      skipWaiting.called = true;
    },
    clients: {
      claim: async () => {
        claim.called = true;
      },
    },
  };

  const context = {
    self,
    caches: api,
    Request: FakeRequest,
    Response: FakeResponse,
    fetch: async (request) => {
      fetchCalls.push(request);

      return fetchImplementation(request);
    },
    console,
  };

  vm.createContext(context);
  vm.runInContext(readFileSync(SERVICE_WORKER_PATH, 'utf8'), context, {
    filename: SERVICE_WORKER_PATH,
  });

  const dispatch = async (type, event) => {
    const listener = listeners.get(type);
    assert.ok(listener !== undefined, `aucun écouteur ${type} enregistré`);

    const pending = [];
    const responses = [];

    listener({
      ...event,
      waitUntil: (promise) => pending.push(promise),
      respondWith: (promise) => responses.push(promise),
    });

    await Promise.all(pending);

    return {
      respondedWith: responses.length === 0 ? undefined : await responses[0],
      didRespond: responses.length > 0,
    };
  };

  return { dispatch, storage, fetchCalls, skipWaiting, claim, listeners };
};

const installed = async ({ fetchImplementation } = {}) => {
  const worker = loadServiceWorker({
    fetchImplementation:
      fetchImplementation ??
      (async () => new FakeResponse('contenu public', { status: 200 })),
  });

  await worker.dispatch('install', {});

  return worker;
};

test('précache uniquement des fichiers publics, demandés sans identifiants', async () => {
  const worker = await installed();

  const cached = [...worker.storage.values()].flatMap((entries) => [
    ...entries.keys(),
  ]);

  // La liste fermée. Si index.html, /graphql ou un média apparaît ici, la
  // promesse de confidentialité est rompue.
  assert.deepEqual(cached.sort(), ['/hermes-icon.svg', '/hors-connexion.html']);

  for (const request of worker.fetchCalls) {
    // La garantie à l'écriture : une réponse authentifiée ne peut pas entrer
    // dans le cache si la requête n'a jamais porté les cookies de session.
    assert.equal(request.credentials, 'omit');
    assert.equal(request.cache, 'reload');
  }

  assert.equal(worker.skipWaiting.called, true);
});

test("l'installation échoue si une ressource hors connexion manque, plutôt que de précacher une erreur", async () => {
  const worker = loadServiceWorker({
    fetchImplementation: async () =>
      new FakeResponse('introuvable', { status: 404 }),
  });

  await assert.rejects(
    () => worker.dispatch('install', {}),
    /ressource hors connexion indisponible/,
  );
});

test("l'activation supprime nos caches de versions antérieures et garde le courant", async () => {
  const worker = await installed();
  await worker.storage.set('hermes-offline-v0', new Map());
  await worker.storage.set('un-cache-d-un-autre-code', new Map());

  await worker.dispatch('activate', {});

  assert.deepEqual([...worker.storage.keys()].sort(), [
    'hermes-offline-v1',
    // Pas à nous : l'activation n'y touche pas. C'est la purge de déconnexion,
    // côté page, qui nettoie tout.
    'un-cache-d-un-autre-code',
  ]);
  assert.equal(worker.claim.called, true);
});

test('ne touche à aucune requête privée : GraphQL, REST, métadonnées, fichiers, médias', async () => {
  const worker = await installed();
  const before = worker.fetchCalls.length;

  const privateRequests = [
    new FakeRequest('https://crm.test/graphql', {
      method: 'POST',
      mode: 'cors',
    }),
    new FakeRequest('https://crm.test/graphql?op=companies', { mode: 'cors' }),
    new FakeRequest('https://crm.test/metadata', { mode: 'cors' }),
    new FakeRequest('https://crm.test/rest/companies', { mode: 'cors' }),
    new FakeRequest('https://crm.test/files/abc/piece-jointe.pdf', {
      mode: 'same-origin',
    }),
    new FakeRequest('https://crm.test/media/vocal-123.ogg', {
      mode: 'no-cors',
    }),
    new FakeRequest('https://crm.test/client-config', { mode: 'cors' }),
    // Même une navigation, si ce n'est pas un GET, ne passe pas.
    new FakeRequest('https://crm.test/', {
      method: 'POST',
      mode: 'navigate',
    }),
  ];

  for (const request of privateRequests) {
    const { didRespond } = await worker.dispatch('fetch', { request });

    // `respondWith` jamais appelé : la requête part au réseau exactement comme
    // sans service worker. On ne peut ni la lire, ni la stocker, ni la rejouer.
    assert.equal(
      didRespond,
      false,
      `${request.method} ${request.url} a été interceptée`,
    );
  }

  // Et rien n'est parti dans le cache au passage.
  assert.equal(worker.fetchCalls.length, before);

  const cached = [...worker.storage.values()].flatMap((entries) => [
    ...entries.keys(),
  ]);
  assert.deepEqual(cached.sort(), ['/hermes-icon.svg', '/hors-connexion.html']);
});

test('une navigation en ligne va au réseau et sa réponse n\'est jamais mise en cache', async () => {
  const appResponse = new FakeResponse('<!doctype html><div id="root">', {
    status: 200,
  });
  const worker = await installed();
  const cachedBefore = [...worker.storage.values()].flatMap((entries) => [
    ...entries.keys(),
  ]);

  const request = new FakeRequest('https://crm.test/dashboard', {
    mode: 'navigate',
  });
  // Après l'installation, le réseau rend le document de l'application.
  worker.fetchCalls.length = 0;
  const { respondedWith } = await worker.dispatch('fetch', {
    request,
  });

  assert.equal(worker.fetchCalls[0], request);
  assert.equal(respondedWith.status, 200);

  const cachedAfter = [...worker.storage.values()].flatMap((entries) => [
    ...entries.keys(),
  ]);
  // index.html porte window._env_ : la configuration de déploiement ne doit
  // pas être figée dans le cache d'un appareil.
  assert.deepEqual(cachedAfter.sort(), cachedBefore.sort());
  assert.ok(!cachedAfter.includes('https://crm.test/dashboard'));

  void appResponse;
});

test('une navigation hors connexion rend la page hors connexion précachée', async () => {
  let isOffline = false;
  const worker = await installed({
    fetchImplementation: async () => {
      if (isOffline) {
        throw new TypeError('Failed to fetch');
      }

      return new FakeResponse('page hors connexion', { status: 200 });
    },
  });

  isOffline = true;

  const { respondedWith } = await worker.dispatch('fetch', {
    request: new FakeRequest('https://crm.test/dashboard', {
      mode: 'navigate',
    }),
  });

  // C'est aussi ce qui rend l'application installable sur Chrome et Edge :
  // une navigation obtient une réponse même sans réseau.
  assert.equal(respondedWith.body, 'page hors connexion');
  assert.equal(respondedWith.status, 200);
});

test('hors connexion sans page précachée, répond 503 plutôt qu\'une page blanche', async () => {
  const worker = loadServiceWorker({
    fetchImplementation: async () => {
      throw new TypeError('Failed to fetch');
    },
  });

  // Pas d'installation réussie : le cache est vide.
  const { respondedWith } = await worker.dispatch('fetch', {
    request: new FakeRequest('https://crm.test/', { mode: 'navigate' }),
  });

  assert.equal(respondedWith.status, 503);
  assert.match(respondedWith.body, /Hors connexion/);
  assert.equal(respondedWith.headers.get('Cache-Control'), 'no-store');
});

test("n'expose aucun gestionnaire de messages, donc aucune commande à distance", async () => {
  const worker = await installed();

  // La purge est faite depuis la page (purgeHermesOfflineCaches). Un
  // gestionnaire `message` ici serait une surface de commande non testée.
  assert.deepEqual([...worker.listeners.keys()].sort(), [
    'activate',
    'fetch',
    'install',
  ]);
});
