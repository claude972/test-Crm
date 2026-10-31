// Exerce le VRAI fichier public/hermes-service-worker.js dans une portée de
// service worker simulée : le fichier est lu sur le disque et évalué, donc ce
// test échoue si quelqu'un y ajoute une mise en cache ou une requête réseau à
// l'installation. Ne remplace pas la recette navigateur.

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
    this.redirected = init.redirected ?? false;
    this.url = init.url ?? '';
    this.type = init.type ?? 'basic';
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

const loadServiceWorker = ({ fetchImplementation }) => {
  const listeners = new Map();
  const cacheNames = new Set();
  const writes = [];
  const fetchCalls = [];
  const skipWaiting = { called: false };
  const claim = { called: false };

  const cacheApi = {
    open: async (name) => {
      cacheNames.add(name);

      return {
        // Toute écriture est enregistrée pour être assertée à zéro.
        put: async (request, response) => {
          writes.push({ name, request, response });
        },
        match: async () => undefined,
        addAll: async (requests) => {
          writes.push({ name, request: requests, response: null });
        },
      };
    },
    keys: async () => [...cacheNames],
    delete: async (name) => cacheNames.delete(name),
  };

  const self = {
    addEventListener: (type, listener) => listeners.set(type, listener),
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
    caches: cacheApi,
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

  return {
    dispatch,
    cacheNames,
    writes,
    fetchCalls,
    skipWaiting,
    claim,
    listeners,
  };
};

const networkFails = async () => {
  throw new TypeError('Failed to fetch');
};

const installed = async (fetchImplementation = networkFails) => {
  const worker = loadServiceWorker({ fetchImplementation });
  await worker.dispatch('install', {});

  return worker;
};

test("l'installation ne fait aucune requête réseau et n'écrit aucun cache", async () => {
  const worker = await installed();

  // Le correctif du défaut relevé en revue : il n'y a plus rien à substituer,
  // donc une preview protégée ne peut pas faire précacher sa page de connexion.
  assert.deepEqual(worker.fetchCalls, []);
  assert.deepEqual(worker.writes, []);
  assert.equal(worker.skipWaiting.called, true);
});

test("sur une origine protégée sans cookie, l'installation réussit quand même", async () => {
  // L'ancienne version demandait /hors-connexion.html avec credentials omit et
  // recevait cette redirection : installation en échec, ou page de connexion
  // précachée comme page hors connexion.
  const protectedEdge = async (request) =>
    new FakeResponse('', {
      status: 302,
      headers: { location: 'https://vercel.com/sso-api?url=' + request.url },
    });

  const worker = await installed(protectedEdge);

  assert.deepEqual(worker.fetchCalls, []);
  assert.deepEqual(worker.writes, []);
  assert.equal(worker.skipWaiting.called, true);
});

test('une redirection de connexion revient telle quelle et n\'est pas mise en cache', async () => {
  const loginRedirect = new FakeResponse('', {
    status: 302,
    headers: { location: 'https://vercel.com/sso-api?url=https://crm.test/' },
  });
  const worker = await installed(async () => loginRedirect);

  const { respondedWith } = await worker.dispatch('fetch', {
    request: new FakeRequest('https://crm.test/dashboard', {
      mode: 'navigate',
    }),
  });

  // Substituer la page hors connexion ici cacherait un partage Vercel expiré
  // derrière un faux diagnostic réseau. C'est précisément le symptôme Safari.
  assert.equal(respondedWith, loginRedirect);
  assert.equal(respondedWith.status, 302);
  assert.deepEqual(worker.writes, []);
});

test('un document de connexion Vercel en 200 revient tel quel, sans cache', async () => {
  const loginPage = new FakeResponse('<title>Login – Vercel</title>', {
    status: 200,
    redirected: true,
    url: 'https://vercel.com/login',
  });
  const worker = await installed(async () => loginPage);

  const { respondedWith } = await worker.dispatch('fetch', {
    request: new FakeRequest('https://crm.test/', { mode: 'navigate' }),
  });

  assert.equal(respondedWith, loginPage);
  assert.deepEqual(worker.writes, []);
});

test('ne touche à aucune requête privée : GraphQL, REST, métadonnées, fichiers, médias', async () => {
  const worker = await installed();

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
    new FakeRequest('https://crm.test/manifest.json', {
      mode: 'same-origin',
      credentials: 'include',
    }),
    new FakeRequest('https://crm.test/', { method: 'POST', mode: 'navigate' }),
  ];

  for (const request of privateRequests) {
    const { didRespond } = await worker.dispatch('fetch', { request });

    assert.equal(
      didRespond,
      false,
      `${request.method} ${request.url} a été interceptée`,
    );
  }

  assert.deepEqual(worker.fetchCalls, []);
  assert.deepEqual(worker.writes, []);
});

test('une navigation en ligne va au réseau, sans écriture de cache', async () => {
  const document = new FakeResponse('<!doctype html><div id="root">', {
    status: 200,
  });
  const worker = await installed(async () => document);

  const request = new FakeRequest('https://crm.test/dashboard', {
    mode: 'navigate',
  });
  const { respondedWith } = await worker.dispatch('fetch', { request });

  assert.equal(worker.fetchCalls[0], request);
  assert.equal(respondedWith, document);
  // index.html porte window._env_ : la configuration de déploiement ne doit
  // jamais être figée sur un appareil.
  assert.deepEqual(worker.writes, []);
});

test('une navigation hors connexion rend la page hors connexion figée', async () => {
  const worker = await installed();

  const { respondedWith } = await worker.dispatch('fetch', {
    request: new FakeRequest('https://crm.test/dashboard', {
      mode: 'navigate',
    }),
  });

  // Ce qui rend l'application installable sur Chrome et Edge : une navigation
  // obtient une réponse même sans réseau.
  assert.equal(respondedWith.status, 503);
  assert.equal(
    respondedWith.headers.get('Content-Type'),
    'text/html; charset=utf-8',
  );
  assert.equal(respondedWith.headers.get('Cache-Control'), 'no-store');
  assert.match(respondedWith.body, /Vous êtes hors connexion/);
  // Dit ce qui dégrade, sans promettre un hors ligne complet.
  assert.match(respondedWith.body, /rien n'est consultable hors connexion/);
  assert.deepEqual(worker.writes, []);
});

test('la page hors connexion ne dépend d\'aucune ressource réseau', async () => {
  const worker = await installed();

  const { respondedWith } = await worker.dispatch('fetch', {
    request: new FakeRequest('https://crm.test/', { mode: 'navigate' }),
  });

  // Une balise src/href vers l'origine échouerait exactement quand cette page
  // sert : hors réseau, ou derrière la connexion Vercel.
  assert.doesNotMatch(respondedWith.body, /\ssrc="\//);
  assert.doesNotMatch(respondedWith.body, /\shref="\//);
});

test('la page hors connexion suit la typographie du produit, sans police bannie', () => {
  const source = readFileSync(SERVICE_WORKER_PATH, 'utf8');

  // DESIGN.md interdit ces polices. La page est une surface produit : elle
  // emploie les jetons existants et leur repli, jamais sa propre déclaration.
  for (const banned of ['Inter', 'Poppins', 'Roboto', 'system-ui']) {
    assert.ok(
      !source.includes(banned),
      `police bannie déclarée dans la page hors connexion : ${banned}`,
    );
  }

  // Cette page ne charge aucune feuille de style, donc c'est le repli du jeton
  // qui s'applique réellement.
  assert.match(source, /font-family:var\(--t-font-family,sans-serif\)/);
  assert.match(source, /font-family:var\(--t-code-font-family,/);
});

test("l'activation supprime les caches laissés par une version antérieure", async () => {
  const worker = await installed();
  worker.cacheNames.add('hermes-offline-v1');
  worker.cacheNames.add('un-cache-d-un-autre-code');

  await worker.dispatch('activate', {});

  // Les nôtres partent ; ce qui n'est pas à nous est laissé à la purge de
  // déconnexion, côté page.
  assert.deepEqual([...worker.cacheNames], ['un-cache-d-un-autre-code']);
  assert.equal(worker.claim.called, true);
});

test("n'expose aucun gestionnaire de messages, donc aucune commande à distance", async () => {
  const worker = await installed();

  assert.deepEqual([...worker.listeners.keys()].sort(), [
    'activate',
    'fetch',
    'install',
  ]);
});
