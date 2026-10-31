/*
 * Hermès CRM — service worker.
 *
 * Ce fichier a un seul rôle : rendre l'application installable et afficher une
 * page « hors connexion » lorsque le réseau est injoignable. Il ne met PAS
 * l'application en cache, et il n'est donc PAS un mode hors ligne complet.
 *
 * Règle de confidentialité, appliquée à l'écriture et non par liste noire :
 *
 *   1. Seules les navigations (`request.mode === 'navigate'`) en GET passent par
 *      le gestionnaire `fetch`. Tout le reste — GraphQL, REST, métadonnées,
 *      fichiers, médias, pièces jointes, jetons — sort du service worker sans
 *      que `respondWith` soit appelé, donc exactement comme sans service worker.
 *   2. Aucune réponse réseau n'est jamais écrite dans le cache à l'exécution.
 *      Le cache est rempli une seule fois à l'installation, avec une liste
 *      fermée de fichiers publics, demandés sans identifiants
 *      (`credentials: 'omit'`). Une réponse authentifiée ne peut donc pas y
 *      entrer.
 *   3. `index.html` n'est pas mis en cache : il porte la configuration
 *      d'environnement injectée au déploiement (`window._env_`).
 *
 * Conséquence assumée : hors connexion, l'utilisateur obtient la page
 * d'information, pas le CRM. Voir docs/verification/hermes-pwa-degradation.md.
 */

// Le préfixe sert à retrouver et supprimer nos caches de versions antérieures.
const CACHE_PREFIX = 'hermes-offline-';
const CACHE_NAME = `${CACHE_PREFIX}v1`;

const OFFLINE_PAGE_PATH = '/hors-connexion.html';
const OFFLINE_ICON_PATH = '/hermes-icon.svg';

// Liste fermée, publique, non authentifiée. Ne jamais y ajouter une ressource
// qui dépend de la session, de la société ou d'un jeton.
const PRECACHED_PUBLIC_PATHS = [OFFLINE_PAGE_PATH, OFFLINE_ICON_PATH];

// Dernier recours si même la page précachée manque : jamais une page blanche.
const INLINE_OFFLINE_HTML = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Hors connexion — Hermès CRM</title></head>
<body><h1>Hors connexion</h1>
<p>Hermès CRM a besoin du réseau pour afficher vos données. Reconnectez-vous puis réessayez.</p>
</body></html>`;

const precachePublicAssets = async () => {
  const cache = await caches.open(CACHE_NAME);

  await Promise.all(
    PRECACHED_PUBLIC_PATHS.map(async (path) => {
      // `credentials: 'omit'` est la garantie : la réponse stockée ne peut pas
      // être la réponse à une requête porteuse de cookies de session.
      // `cache: 'reload'` évite de recopier une entrée HTTP périmée.
      const request = new Request(path, {
        credentials: 'omit',
        cache: 'reload',
        mode: 'same-origin',
      });
      const response = await fetch(request);

      if (!response.ok) {
        throw new Error(
          `Hermès: ressource hors connexion indisponible (${path}, HTTP ${response.status})`,
        );
      }

      await cache.put(request, response);
    }),
  );
};

const deleteOurPreviousCaches = async () => {
  const names = await caches.keys();

  await Promise.all(
    names
      .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map((name) => caches.delete(name)),
  );
};

const respondToNavigation = async (request) => {
  try {
    // Toujours le réseau, et la réponse n'est jamais écrite dans le cache.
    return await fetch(request);
  } catch {
    const cache = await caches.open(CACHE_NAME);
    const offlinePage = await cache.match(OFFLINE_PAGE_PATH);

    if (offlinePage !== undefined) {
      return offlinePage;
    }

    return new Response(INLINE_OFFLINE_HTML, {
      status: 503,
      statusText: 'Service Unavailable',
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  }
};

self.addEventListener('install', (event) => {
  event.waitUntil(precachePublicAssets().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    deleteOurPreviousCaches().then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Une mutation ne passe jamais par ici.
  if (request.method !== 'GET') {
    return;
  }

  /*
   * Le seul filtre qui compte. `navigate` ne couvre que le document de la page.
   * GraphQL, REST, les métadonnées, les fichiers et les médias ont un `mode`
   * `cors`, `same-origin` ou `no-cors` : on ne les touche pas, donc on ne peut
   * ni les lire, ni les stocker, ni les rejouer.
   */
  if (request.mode !== 'navigate') {
    return;
  }

  event.respondWith(respondToNavigation(request));
});

/*
 * Il n'y a volontairement pas de gestionnaire `message` ici. La purge de
 * déconnexion et de bascule de société est faite depuis la page, qui accède au
 * même CacheStorage (voir purgeHermesOfflineCaches). Un seul chemin, testé,
 * plutôt qu'un contrat de messages redondant.
 */
