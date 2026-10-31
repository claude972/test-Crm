// Serveurs HTTP locaux réels qui reproduisent la Deployment Protection : 302
// vers une autre origine sans jeton, cookie posé par le lien de partage, puis
// accès par cookie seul. Aucun appel réseau sortant.

import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { test } from 'node:test';

import {
  checkPreviewAccess,
  createCookieJar,
  describeSetCookie,
  followWithinOrigin,
  looksLikeApplicationDocument,
  looksLikeVercelLogin,
  redactShareToken,
} from './check-preview-access.mjs';

const APPLICATION_DOCUMENT =
  '<!doctype html><html><head><script id="kovaa-lab-env-config"></script></head>' +
  '<body><div id="root"></div></body></html>';

const VERCEL_LOGIN_DOCUMENT =
  '<!doctype html><html><head><title>Login – Vercel</title></head><body></body></html>';

const SHARE_TOKEN = 'jeton-de-partage-tres-secret-0123456789';

const listen = (server) =>
  new Promise((resolve) =>
    server.listen(0, '127.0.0.1', () =>
      resolve(`http://127.0.0.1:${server.address().port}`),
    ),
  );

const close = (server) =>
  new Promise((resolve) => {
    server.close(resolve);
    server.closeAllConnections();
  });

const parseCookies = (request) =>
  new Map(
    (request.headers.cookie ?? '')
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((pair) => {
        const separator = pair.indexOf('=');

        return [pair.slice(0, separator), pair.slice(separator + 1)];
      }),
  );

// Reproduit le comportement observé : sans cookie ni jeton valide, tout chemin
// répond 302 vers une AUTRE origine. C'est la cause du symptôme Safari.
const createProtectedDeployment = ({
  shareToken = SHARE_TOKEN,
  servePwaAssets = true,
  cookieAttributes = 'Path=/; Secure; HttpOnly; SameSite=Lax',
} = {}) => {
  const requests = [];

  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    requests.push({ path: url.pathname, search: url.search });

    const cookies = parseCookies(request);
    const presentedToken = url.searchParams.get('_vercel_share');
    const hasCookie = cookies.get('_vercel_jwt') === 'jwt-derive-du-partage';

    if (presentedToken === shareToken) {
      response.writeHead(307, {
        'set-cookie': `_vercel_jwt=jwt-derive-du-partage; ${cookieAttributes}`,
        location: url.pathname,
      });
      response.end();

      return;
    }

    if (!hasCookie) {
      response.writeHead(302, {
        'set-cookie': `_vercel_sso_nonce=nonce-opaque; Max-Age=3600; Path=/; Secure; HttpOnly; SameSite=Lax`,
        location: `https://vercel.example/sso-api?url=${encodeURIComponent(url.pathname)}`,
        'content-type': 'text/plain',
      });
      response.end();

      return;
    }

    const pwaPaths = ['/manifest.json', '/hermes-service-worker.js'];

    if (pwaPaths.includes(url.pathname)) {
      if (!servePwaAssets) {
        response.writeHead(404).end();

        return;
      }

      response.writeHead(200, { 'content-type': 'text/plain' }).end('ok');

      return;
    }

    response.writeHead(200, { 'content-type': 'text/html' });
    response.end(APPLICATION_DOCUMENT);
  });

  return { server, requests };
};

test('un lien de partage valide passe, et le rapport dit ce qu\'il ne prouve pas', async () => {
  const { server, requests } = createProtectedDeployment();
  const origin = await listen(server);

  try {
    const report = await checkPreviewAccess({
      shareUrl: `${origin}/?_vercel_share=${SHARE_TOKEN}`,
    });

    const names = report.checks.map((check) => check.name);
    assert.deepEqual(names, [
      'protection-globale-conservee',
      'partage-anonyme-ouvre-application',
      'deuxieme-visite-par-cookie-seul',
      'ressources-pwa-servies',
    ]);

    assert.equal(report.checks[0].bareStatus, 302);
    assert.match(report.checks[0].redirectedOutOfOrigin, /vercel\.example/);
    assert.equal(report.checks[2].status, 200);
    assert.deepEqual(report.checks[2].cookiesCarried, ['_vercel_jwt']);
    assert.match(report.doesNotProve, /Safari/);
    // Le premier contrôle part d'un bac à cookies neuf : c'est bien le
    // visiteur qui n'a rien, pas une session déjà ouverte.
    assert.equal(requests[0].search, '');
  } finally {
    await close(server);
  }
});

test('le jeton n\'apparaît jamais dans le rapport', async () => {
  const { server } = createProtectedDeployment();
  const origin = await listen(server);

  try {
    const report = await checkPreviewAccess({
      shareUrl: `${origin}/?_vercel_share=${SHARE_TOKEN}`,
    });

    assert.ok(!JSON.stringify(report).includes(SHARE_TOKEN));
    assert.ok(!JSON.stringify(report).includes('jwt-derive-du-partage'));
  } finally {
    await close(server);
  }
});

test('un jeton expiré échoue au lieu de suivre la redirection vers la connexion', async () => {
  const { server } = createProtectedDeployment({ shareToken: 'un-autre-jeton' });
  const origin = await listen(server);

  try {
    await assert.rejects(
      () =>
        checkPreviewAccess({
          shareUrl: `${origin}/?_vercel_share=${SHARE_TOKEN}`,
        }),
      (error) => {
        assert.match(error.message, /redirige hors de l'origine/);
        assert.match(error.message, /NE PAS livrer ce lien/);
        // Et sans recracher le jeton dans le message d'erreur.
        assert.ok(!error.message.includes(SHARE_TOKEN));

        return true;
      },
    );
  } finally {
    await close(server);
  }
});

test('le faux positif historique est rejeté : 200 portant la page de connexion Vercel', async () => {
  // Reproduit la mesure du 2026-10-31 : curl -L rend final_status=200 avec
  // <title>Login – Vercel</title>. Un contrôle qui n'assertionne que le code
  // HTTP conclut à un succès ici.
  const server = http.createServer((request, response) => {
    response.writeHead(200, {
      'set-cookie': '_vercel_jwt=peu-importe; Path=/',
      'content-type': 'text/html',
    });
    response.end(VERCEL_LOGIN_DOCUMENT);
  });
  const origin = await listen(server);

  try {
    await assert.rejects(
      () =>
        checkPreviewAccess({
          shareUrl: `${origin}/?_vercel_share=${SHARE_TOKEN}`,
        }),
      /la protection Vercel ne couvre plus|page de connexion Vercel/,
    );
  } finally {
    await close(server);
  }
});

test('une origine nue accessible en 200 interrompt le contrôle', async () => {
  // Si la protection globale a sauté, il n'y a pas de bonne nouvelle à
  // annoncer : le CRM est ouvert à qui connaît l'hôte.
  const server = http.createServer((request, response) => {
    response.writeHead(200, { 'content-type': 'text/html' });
    response.end(APPLICATION_DOCUMENT);
  });
  const origin = await listen(server);

  try {
    await assert.rejects(
      () =>
        checkPreviewAccess({
          shareUrl: `${origin}/?_vercel_share=${SHARE_TOKEN}`,
        }),
      /la protection Vercel ne couvre plus/,
    );
  } finally {
    await close(server);
  }
});

test('un 200 sans les marqueurs du document applicatif échoue', async () => {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');

    if (url.searchParams.has('_vercel_share')) {
      response.writeHead(307, {
        'set-cookie': '_vercel_jwt=jeton; Path=/',
        location: '/',
      });
      response.end();

      return;
    }

    if ((request.headers.cookie ?? '').includes('_vercel_jwt')) {
      response.writeHead(200, { 'content-type': 'text/html' });
      response.end('<!doctype html><body>Rien à voir ici</body>');

      return;
    }

    response.writeHead(302, { location: 'https://vercel.example/sso-api' });
    response.end();
  });
  const origin = await listen(server);

  try {
    await assert.rejects(
      () =>
        checkPreviewAccess({
          shareUrl: `${origin}/?_vercel_share=${SHARE_TOKEN}`,
        }),
      /sans les marqueurs du document de l'application/,
    );
  } finally {
    await close(server);
  }
});

test('un partage qui ne pose aucun cookie échoue : la visite suivante retomberait sur la connexion', async () => {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');

    if (url.searchParams.has('_vercel_share')) {
      response.writeHead(200, { 'content-type': 'text/html' });
      response.end(APPLICATION_DOCUMENT);

      return;
    }

    response.writeHead(302, { location: 'https://vercel.example/sso-api' });
    response.end();
  });
  const origin = await listen(server);

  try {
    await assert.rejects(
      () =>
        checkPreviewAccess({
          shareUrl: `${origin}/?_vercel_share=${SHARE_TOKEN}`,
        }),
      /Aucun cookie posé par le lien de partage/,
    );
  } finally {
    await close(server);
  }
});

test('les ressources PWA manquantes sont dites, sans faire échouer l\'accès', async () => {
  const { server } = createProtectedDeployment({ servePwaAssets: false });
  const origin = await listen(server);

  try {
    const report = await checkPreviewAccess({
      shareUrl: `${origin}/?_vercel_share=${SHARE_TOKEN}`,
    });

    const pwaCheck = report.checks.at(-1);
    assert.match(pwaCheck.note, /n'est pas installable/);
    assert.match(pwaCheck.note, /manifest\.json \(404\)/);
  } finally {
    await close(server);
  }
});

test('les attributs du cookie de partage sont rapportés, jamais sa valeur', async () => {
  const { server } = createProtectedDeployment({
    cookieAttributes: 'Path=/; Secure; HttpOnly; SameSite=None',
  });
  const origin = await listen(server);

  try {
    const report = await checkPreviewAccess({
      shareUrl: `${origin}/?_vercel_share=${SHARE_TOKEN}`,
    });

    // Ces attributs décident du sort du cookie dans Safari : ils doivent être
    // au dossier, contrairement à la valeur.
    const shareCheck = report.checks[1];
    const jwt = shareCheck.cookiesSet.find(
      (cookie) => cookie.name === '_vercel_jwt',
    );
    assert.deepEqual(jwt.attributes, [
      'Path=/',
      'Secure',
      'HttpOnly',
      'SameSite=None',
    ]);
  } finally {
    await close(server);
  }
});

test('une URL sans jeton est refusée avant toute requête', async () => {
  await assert.rejects(
    () => checkPreviewAccess({ shareUrl: 'https://exemple.vercel.app/' }),
    /ne porte pas \?_vercel_share=/,
  );
});

test('http est refusé hors boucle locale', async () => {
  await assert.rejects(
    () =>
      checkPreviewAccess({
        shareUrl: `http://exemple.vercel.app/?_vercel_share=${SHARE_TOKEN}`,
      }),
    /Origine refusée/,
  );
});

test('followWithinOrigin ne suit jamais une redirection hors origine', async () => {
  const server = http.createServer((request, response) => {
    response.writeHead(302, { location: 'https://ailleurs.example/connexion' });
    response.end();
  });
  const origin = await listen(server);

  try {
    const cookieJar = createCookieJar();
    const result = await followWithinOrigin(`${origin}/`, {
      cookieJar,
      fetchImplementation: fetch,
    });

    assert.equal(result.leftOrigin, 'https://ailleurs.example/connexion');
    assert.equal(result.hops.length, 1);
  } finally {
    await close(server);
  }
});

test('redactShareToken caviarde jeton, jwt et nonce', () => {
  assert.equal(
    redactShareToken('https://h.vercel.app/?_vercel_share=abc123&x=1'),
    'https://h.vercel.app/?_vercel_share=<caviardé>&x=1',
  );
  assert.equal(
    redactShareToken('_vercel_jwt=ey.J.s; Path=/'),
    '_vercel_jwt=<caviardé>; Path=/',
  );
  assert.equal(
    redactShareToken('_vercel_sso_nonce=opaque; Secure'),
    '_vercel_sso_nonce=<caviardé>; Secure',
  );
});

test('describeSetCookie garde les attributs et jette la valeur', () => {
  assert.deepEqual(
    describeSetCookie('_vercel_jwt=valeur-secrete; Path=/; Secure; SameSite=Lax'),
    { name: '_vercel_jwt', attributes: ['Path=/', 'Secure', 'SameSite=Lax'] },
  );
});

test('les deux détecteurs de document ne se confondent pas', () => {
  assert.equal(looksLikeApplicationDocument(APPLICATION_DOCUMENT), true);
  assert.equal(looksLikeApplicationDocument(VERCEL_LOGIN_DOCUMENT), false);
  assert.equal(looksLikeVercelLogin(VERCEL_LOGIN_DOCUMENT), true);
  assert.equal(looksLikeVercelLogin(APPLICATION_DOCUMENT), false);
  // Le gabarit exact de la page de protection Vercel.
  assert.equal(looksLikeVercelLogin('<h1>Authentication Required</h1>'), true);
});

void once;
