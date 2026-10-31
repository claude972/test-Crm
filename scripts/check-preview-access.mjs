#!/usr/bin/env node
/*
 * Vérifie qu'un lien de recette est réellement ouvrable par quelqu'un qui n'a
 * AUCUNE session Vercel.
 *
 * Pourquoi ce script existe. Les contrôles précédents passaient pour deux
 * raisons distinctes, aucune des deux ne prouvant l'accès du destinataire :
 *
 *   1. `check-preview-api-p0.mjs` et `check-preview-onboarding-p0.mjs` passent
 *      par `vercel curl`, donc par la CLI DÉJÀ AUTHENTIFIÉE du propriétaire.
 *      La Deployment Protection est satisfaite par le jeton de la CLI, pas par
 *      le navigateur. « Joignable pour une session authentifiée » et
 *      « joignable pour un visiteur » ne sont pas la même propriété.
 *   2. Un `curl -L` qui n'assertionne qu'un code 200 réussit CONTRE LA PAGE DE
 *      CONNEXION VERCEL : la chaîne de redirection aboutit à
 *      `vercel.com/login`, qui répond 200. Mesuré le 2026-10-31 sur ce projet :
 *      final_status=200, final_url=https://vercel.com/login?next=…,
 *      `<title>Login – Vercel</title>`.
 *
 * Ce script ne peut produire ni l'une ni l'autre : il n'emploie jamais la CLI
 * Vercel ni d'en-tête Authorization, il suit les redirections lui-même et
 * échoue dès qu'une redirection quitte l'origine du déploiement, et il exige
 * des marqueurs du document de l'application plutôt qu'un simple 200.
 *
 * CE N'EST PAS UNE PREUVE SAFARI. Un succès ici signifie « le jeton de partage
 * et son cookie fonctionnent au niveau HTTP, maintenant ». Les comportements
 * propres à Safari — stockage de cookie refusé, navigateur intégré d'une
 * application de messagerie, protection anti-rebond, autocomplétion qui perd la
 * requête — ne sont pas observables ici et doivent être vérifiés au navigateur.
 *
 * Usage :
 *   node scripts/check-preview-access.mjs "<url-de-partage-complète>"
 *
 * L'URL de partage contient le jeton. Le script ne l'affiche jamais et ne
 * l'écrit nulle part ; préférez le passer par PREVIEW_SHARE_URL plutôt qu'en
 * argument, pour qu'il n'apparaisse pas dans l'historique du shell.
 */

const SHARE_QUERY_PARAMETER = '_vercel_share';
const MAX_REDIRECTS = 5;
const REQUEST_TIMEOUT_IN_MS = 30000;

// Marqueurs du document réel de l'application. Un 200 ne suffit pas : la page
// de connexion Vercel, une page d'erreur et un HTML de repli répondent 200
// aussi.
const APPLICATION_DOCUMENT_MARKERS = ['kovaa-lab-env-config', 'id="root"'];

const REDACTED = '<caviardé>';

export const redactShareToken = (text) => {
  if (typeof text !== 'string') {
    return text;
  }

  // Caviarde la valeur du jeton partout où elle peut apparaître : requête,
  // en-tête Location, cookie.
  return text
    .replace(
      new RegExp(`(${SHARE_QUERY_PARAMETER}=)[^&\\s"']+`, 'gi'),
      `$1${REDACTED}`,
    )
    .replace(/(_vercel_jwt=)[^;,\s]+/gi, `$1${REDACTED}`)
    .replace(/(_vercel_sso_nonce=)[^;,\s]+/gi, `$1${REDACTED}`);
};

// Les attributs d'un cookie décident de son sort dans Safari ; sa valeur n'a
// aucun intérêt pour le diagnostic et ne doit pas sortir.
export const describeSetCookie = (header) => {
  const [pair, ...attributes] = header.split(';').map((part) => part.trim());
  const name = pair.slice(0, pair.indexOf('='));

  return {
    name,
    attributes: attributes.map((attribute) => {
      const [key, value] = attribute.split('=');

      return value === undefined ? key : `${key}=${value}`;
    }),
  };
};

// Bac à cookies minimal : on ne garde que le nom et la valeur, et on n'applique
// aucune règle de domaine parce que tout ce qui compte ici reste sur une seule
// origine. Dès qu'une redirection sort de l'origine, le contrôle échoue.
export const createCookieJar = () => {
  const cookies = new Map();
  const recorded = [];

  return {
    accept: (headers) => {
      const setCookieHeaders = headers.getSetCookie?.() ?? [];

      for (const header of setCookieHeaders) {
        const pair = header.split(';')[0];
        const separator = pair.indexOf('=');

        if (separator <= 0) {
          continue;
        }

        cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
        recorded.push(describeSetCookie(header));
      }
    },
    header: () =>
      [...cookies.entries()]
        .map(([name, value]) => `${name}=${value}`)
        .join('; '),
    names: () => [...cookies.keys()],
    described: () => recorded,
    isEmpty: () => cookies.size === 0,
  };
};

export const isSameOrigin = (a, b) => new URL(a).origin === new URL(b).origin;

export const assertAllowedUrl = (rawUrl) => {
  const url = new URL(rawUrl);

  if (url.protocol === 'https:') {
    return url;
  }

  // http n'est toléré que pour la boucle locale, qui est la seule façon de
  // tester ce script sans réseau.
  if (
    url.protocol === 'http:' &&
    (url.hostname === '127.0.0.1' || url.hostname === 'localhost')
  ) {
    return url;
  }

  throw new Error(
    `Origine refusée : ${url.protocol}//${url.host}. https exigé hors boucle locale.`,
  );
};

const request = async (url, { cookieJar, fetchImplementation }) => {
  const cookieHeader = cookieJar.header();
  const response = await fetchImplementation(url, {
    method: 'GET',
    redirect: 'manual',
    headers: {
      // Ce qu'un navigateur envoie pour un document. Jamais d'Authorization,
      // jamais de jeton de CLI.
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      ...(cookieHeader === '' ? {} : { Cookie: cookieHeader }),
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_IN_MS),
  });

  cookieJar.accept(response.headers);

  return response;
};

/*
 * Suit les redirections à la main, et refuse de quitter l'origine de départ.
 * C'est exactement le garde-fou qui manquait : une sortie d'origine vers
 * vercel.com est la page de connexion, pas un accès.
 */
export const followWithinOrigin = async (
  startUrl,
  { cookieJar, fetchImplementation },
) => {
  const origin = new URL(startUrl).origin;
  const hops = [];
  let currentUrl = startUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const response = await request(currentUrl, {
      cookieJar,
      fetchImplementation,
    });
    const location = response.headers.get('location');

    hops.push({
      url: redactShareToken(currentUrl),
      status: response.status,
      location: location === null ? null : redactShareToken(location),
    });

    if (response.status < 300 || response.status >= 400 || location === null) {
      return { response, hops, leftOrigin: null };
    }

    const nextUrl = new URL(location, currentUrl).toString();

    if (!isSameOrigin(nextUrl, origin)) {
      // On s'arrête ici volontairement, sans suivre : suivre donnerait le 200
      // de vercel.com et fabriquerait un faux succès.
      return {
        response,
        hops,
        leftOrigin: redactShareToken(nextUrl),
      };
    }

    currentUrl = nextUrl;
  }

  throw new Error(`Plus de ${MAX_REDIRECTS} redirections sur ${origin}.`);
};

export const looksLikeApplicationDocument = (body) =>
  APPLICATION_DOCUMENT_MARKERS.every((marker) => body.includes(marker));

export const looksLikeVercelLogin = (body) =>
  /<title>[^<]*Login[^<]*Vercel[^<]*<\/title>/i.test(body) ||
  body.includes('Authentication Required');

const checkProtectionStillHolds = async ({ origin, fetchImplementation }) => {
  // Bac à cookies NEUF : c'est le visiteur qui n'a rien.
  const cookieJar = createCookieJar();
  const { response, hops, leftOrigin } = await followWithinOrigin(
    `${origin}/`,
    { cookieJar, fetchImplementation },
  );

  if (leftOrigin === null && response.status === 200) {
    throw new Error(
      `L'origine nue répond 200 sans jeton : la protection Vercel ne couvre plus ${origin}. ` +
        `Contrôle interrompu, rien à livrer tant que ce n'est pas expliqué.`,
    );
  }

  return {
    name: 'protection-globale-conservee',
    bareStatus: response.status,
    redirectedOutOfOrigin: leftOrigin,
    hops,
    cookiesSet: cookieJar.described(),
  };
};

const checkShareLinkOpens = async ({ shareUrl, origin, fetchImplementation }) => {
  const cookieJar = createCookieJar();
  const { response, hops, leftOrigin } = await followWithinOrigin(shareUrl, {
    cookieJar,
    fetchImplementation,
  });

  if (leftOrigin !== null) {
    throw new Error(
      `Le lien de partage redirige hors de l'origine, vers ${leftOrigin}. ` +
        `C'est la page de connexion Vercel : le jeton est expiré, révoqué, ou ne correspond pas à ce déploiement. ` +
        `NE PAS livrer ce lien.`,
    );
  }

  const body = await response.text();

  if (looksLikeVercelLogin(body)) {
    throw new Error(
      `Réponse ${response.status} mais le corps est la page de connexion Vercel. ` +
        `Un contrôle qui n'assertionne que le code HTTP aurait conclu à un succès ici.`,
    );
  }

  if (response.status !== 200) {
    throw new Error(
      `Le lien de partage répond ${response.status} sur son propre document.`,
    );
  }

  if (!looksLikeApplicationDocument(body)) {
    throw new Error(
      `Réponse 200 sur l'origine, mais sans les marqueurs du document de l'application ` +
        `(${APPLICATION_DOCUMENT_MARKERS.join(', ')}). Bundle absent ou mauvais déploiement.`,
    );
  }

  if (cookieJar.isEmpty()) {
    throw new Error(
      `Aucun cookie posé par le lien de partage. L'accès ne survivrait pas à la navigation suivante : ` +
        `un navigateur qui refuse les cookies, ou qui reperd la requête, retomberait sur la connexion Vercel.`,
    );
  }

  return {
    check: { name: 'partage-anonyme-ouvre-application', status: 200, hops },
    cookieJar,
  };
};

/*
 * Le contrôle qui manquait vraiment pour Safari.
 *
 * Après la première visite, l'utilisateur ne retape pas l'URL complète : la
 * barre d'adresse lui propose l'hôte nu depuis l'historique, et la requête
 * `?_vercel_share=` disparaît. L'accès ne tient alors QUE par le cookie. Si ce
 * deuxième chargement ne passe pas, l'utilisateur voit la connexion Vercel à
 * sa deuxième visite, exactement comme signalé.
 */
const checkSecondVisitWithoutTheQuery = async ({
  origin,
  cookieJar,
  fetchImplementation,
}) => {
  const { response, hops, leftOrigin } = await followWithinOrigin(
    `${origin}/`,
    { cookieJar, fetchImplementation },
  );

  if (leftOrigin !== null) {
    throw new Error(
      `Deuxième visite sans la requête de partage : redirigée vers ${leftOrigin}. ` +
        `L'accès ne tient donc que tant que l'URL complète est rejouée, ce qui n'est pas le comportement d'une barre d'adresse.`,
    );
  }

  const body = await response.text();

  if (response.status !== 200 || !looksLikeApplicationDocument(body)) {
    throw new Error(
      `Deuxième visite sans la requête de partage : ${response.status} et document non conforme.`,
    );
  }

  return {
    name: 'deuxieme-visite-par-cookie-seul',
    status: 200,
    hops,
    cookiesCarried: cookieJar.names(),
  };
};

const checkOfflineAssetsAreServed = async ({
  origin,
  cookieJar,
  fetchImplementation,
}) => {
  const paths = [
    '/hermes-service-worker.js',
    '/hors-connexion.html',
    '/manifest.json',
  ];
  const results = [];

  for (const assetPath of paths) {
    const { response, leftOrigin } = await followWithinOrigin(
      `${origin}${assetPath}`,
      { cookieJar, fetchImplementation },
    );

    results.push({
      path: assetPath,
      status: leftOrigin === null ? response.status : 'redirigé-hors-origine',
    });
  }

  const unreachable = results.filter((result) => result.status !== 200);

  return {
    name: 'ressources-pwa-servies',
    results,
    // Pas une erreur fatale : l'installation PWA est un supplément, pas l'accès
    // de recette. Mais dit, parce qu'un manifeste derrière le SSO empêche
    // l'installation sans expliquer pourquoi.
    note:
      unreachable.length === 0
        ? 'Manifeste, worker et page hors connexion servis : installation possible.'
        : `Non servis : ${unreachable.map((result) => `${result.path} (${result.status})`).join(', ')}. L'application reste utilisable mais n'est pas installable.`,
  };
};

export const checkPreviewAccess = async ({
  shareUrl,
  fetchImplementation = fetch,
}) => {
  const url = assertAllowedUrl(shareUrl);

  if (!url.searchParams.has(SHARE_QUERY_PARAMETER)) {
    throw new Error(
      `L'URL ne porte pas ?${SHARE_QUERY_PARAMETER}=. Sans jeton il n'y a rien à vérifier : ` +
        `l'origine nue est protégée par construction.`,
    );
  }

  const origin = url.origin;
  const checks = [];

  checks.push(await checkProtectionStillHolds({ origin, fetchImplementation }));

  const { check: shareCheck, cookieJar } = await checkShareLinkOpens({
    shareUrl: url.toString(),
    origin,
    fetchImplementation,
  });
  checks.push({ ...shareCheck, cookiesSet: cookieJar.described() });

  checks.push(
    await checkSecondVisitWithoutTheQuery({
      origin,
      cookieJar,
      fetchImplementation,
    }),
  );

  checks.push(
    await checkOfflineAssetsAreServed({
      origin,
      cookieJar,
      fetchImplementation,
    }),
  );

  return {
    origin,
    checkedAt: new Date().toISOString(),
    checks,
    proves:
      "Le jeton de partage et son cookie donnent accès au document de l'application, sans compte Vercel, au moment de ce contrôle.",
    doesNotProve:
      "Un accès depuis Safari. Stockage de cookie refusé, navigateur intégré d'une application de messagerie, protection anti-rebond et autocomplétion qui perd la requête ne sont pas observables en HTTP. À confirmer au navigateur.",
  };
};

const main = async () => {
  const shareUrl = process.env.PREVIEW_SHARE_URL ?? process.argv[2];

  if (shareUrl === undefined || shareUrl === '') {
    process.stderr.write(
      'Usage : PREVIEW_SHARE_URL="<url>" node scripts/check-preview-access.mjs\n' +
        '        node scripts/check-preview-access.mjs "<url>"\n',
    );
    process.exitCode = 2;

    return;
  }

  try {
    const report = await checkPreviewAccess({ shareUrl });

    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    process.stdout.write(
      '\nPREUVE HTTP SEULEMENT — ce résultat ne vaut pas un accès Safari vérifié.\n',
    );
  } catch (error) {
    process.stderr.write(`ÉCHEC : ${redactShareToken(error.message)}\n`);
    process.exitCode = 1;
  }
};

// Exécuté seulement en ligne de commande, pour rester importable par le test.
if (process.argv[1] !== undefined && import.meta.url.endsWith('check-preview-access.mjs') && process.argv[1].endsWith('check-preview-access.mjs')) {
  await main();
}
