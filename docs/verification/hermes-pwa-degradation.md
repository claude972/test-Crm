# PWA Hermès — ce qui est mis en cache, ce qui dégrade, ce qui n'est pas vérifié

Lot CJ-05. Rédigé le 2026-10-31. Référencé depuis
`public/hermes-service-worker.js`,
`src/modules/hermes-pwa/utils/registerHermesServiceWorker.ts` et
`src/modules/hermes-pwa/utils/purgeHermesOfflineCaches.ts`.

## Ce que le service worker met en cache

**Rien.** `public/hermes-service-worker.js` n'écrit jamais dans CacheStorage. Il
ne fait aucune requête réseau à l'installation. Il ne lit CacheStorage que pour
supprimer les caches `hermes-offline-*` qu'une version antérieure avait laissés.

La page hors connexion est un contenu figé dans le fichier du worker, sans
aucune balise `src` ou `href` vers l'origine. Il n'y a donc aucune réponse à
vérifier, aucune question de cookie, aucune question d'origine.

### Pourquoi pas de précache

Première version : l'installation demandait `/hors-connexion.html` et l'icône en
`credentials: 'omit'`. Sur la preview protégée, l'edge Vercel exige son cookie de
partage **même pour les fichiers statiques** ; sans cookie la réponse est une
redirection 302 vers `vercel.com/sso-api`. Deux issues, mauvaises toutes les
deux : l'installation échoue, ou elle réussit et met en cache la page de
connexion Vercel **comme page hors connexion**. Un utilisateur hors réseau
aurait vu un écran de connexion Vercel. Défaut relevé en revue, corrigé en
supprimant la cause plutôt qu'en ajoutant une validation.

C'est le même mécanisme que le blocage Safari signalé : voir
`hermes-preview-access-safari-20261031.md` §3.

### Typographie

La page est une surface produit, donc elle suit les règles du produit. Elle
emploie les jetons existants, `--t-font-family` et `--t-code-font-family`, avec
leur repli, et ne déclare aucune police à elle : `DESIGN.md` interdit Inter,
Poppins, Roboto et system-ui. Comme cette page ne charge aucune feuille de style
— c'est le but — c'est le repli du jeton qui s'applique en pratique. Une
régression interdit le retour d'une police bannie dans ce fichier.

## Ce que le service worker refuse de toucher

Un seul filtre, et il est positif : seules les navigations `GET`
(`request.mode === 'navigate'`) entrent dans le gestionnaire `fetch`. Pour tout
le reste, `respondWith` n'est jamais appelé, donc la requête part au réseau
exactement comme sans service worker — ni lisible, ni stockable, ni rejouable.

Jamais interceptés : GraphQL (`/graphql`), REST (`/rest/*`), métadonnées
(`/metadata`), `/client-config`, fichiers et pièces jointes (`/files/*`), médias
et vocaux (`/media/*`), `manifest.json`, et toute requête non-`GET` y compris une
navigation `POST`.

Jamais mis en cache non plus : `index.html`, qui porte la configuration de
déploiement `window._env_`.

Une redirection de connexion, ou une page de connexion répondant 200, revient
**telle quelle**. La remplacer par la page hors connexion masquerait une session
Vercel ou CRM expirée derrière un faux diagnostic réseau.

## Ce qui dégrade sans réseau, exactement

- L'application reste installée et s'ouvre, et affiche la page hors connexion
  **au lieu du CRM**.
- Aucune fiche, aucun message, aucun média n'est conservé sur l'appareil : rien
  n'est consultable hors connexion.
- Aucune saisie n'est mise en file d'attente. Ce qui n'a pas été enregistré avant
  la coupure doit être ressaisi.

**Ce n'est pas un mode hors ligne.** Une seule page hors connexion est
implémentée, et la page elle-même le dit à l'utilisateur. Aucune promesse de
fonctionnement hors ligne du CRM n'est faite.

Ce que l'ajout apporte réellement : l'installabilité sur Chrome et Edge, qui
exigent un service worker rendant une réponse à une navigation sans réseau, et
un écran explicatif au lieu de l'erreur du navigateur.

## Purge à la déconnexion et à la bascule de société

`purgeHermesOfflineCaches()` supprime **tous** les caches de l'origine, pas
seulement les nôtres. L'invariant de confidentialité est tenu à l'écriture — le
worker n'écrit rien — donc cette purge est une ceinture : si une version
antérieure du worker, ou un autre code sur cette origine, a laissé une réponse
privée dans CacheStorage, elle ne doit pas survivre à la fin de la session sur
cet appareil.

Branchée dans `@/auth/utils/purgeSessionStorage`, **seul point de passage commun
à la déconnexion** (`useAuth.clearSession`) **et à la bascule de société**
(`resetWorkspaceSessionAndReload` → `purgeWorkspaceSessionCache`). Un seul
endroit, les deux chemins couverts.

Elle est bornée à une seconde, ne rejette jamais, et ne modifie pas le verdict
rendu pour le magasin de métadonnées : une déconnexion ne doit pas échouer parce
que CacheStorage est indisponible (navigation privée, stockage bloqué, contexte
non sécurisé). Elle est démarrée en parallèle de la purge IndexedDB et attendue
avant la navigation, pour que `location.assign` ne l'interrompe pas.

## Enregistrement — actif

`registerHermesServiceWorker()` est appelé depuis `src/index.tsx`, dans un
`.finally()` après le premier rendu, donc un échec d'enregistrement ne peut ni
retarder ni empêcher l'affichage. Câblé par le parent, commit `7efd64983` sur
`feat/hermes-complete-journeys`.

Cela rend l'installabilité et la page hors connexion observables. Cela ne rend
pas R15 vérifié pour autant : voir « Non vérifié » plus bas.

L'enregistrement ne fait rien en développement, et y retire au contraire un
worker Hermès resté d'une visite de build de production sur la même origine, qui
intercepterait les navigations de Vite.

## Tests

- `scripts/check-hermes-pwa-service-worker.test.mjs` — charge le **vrai** fichier
  du worker dans une portée simulée : aucune requête ni écriture à
  l'installation, installation qui réussit derrière un edge protégé, redirection
  de connexion rendue telle quelle sans cache, requêtes privées jamais
  interceptées, page hors connexion sans dépendance réseau. 10 tests.
- `src/modules/hermes-pwa/utils/__tests__/` — purge et enregistrement, 14 tests.
- `src/modules/auth/utils/__tests__/purgeSessionStorage.test.ts` — la purge de
  CacheStorage a bien lieu sur le chemin de déconnexion, et un CacheStorage
  refusé ne fait pas échouer la déconnexion.

## Non vérifié

- **R15, installation PWA : NON VÉRIFIÉ.** Un manifeste et un `start_url` ne
  prouvent pas qu'une PWA installée passe la protection Vercel ; le contexte de
  cookie en mode autonome sur iOS peut différer de celui de l'onglet. À établir
  par une installation réelle, recette de root via CUA.
- **Dégradation hors connexion : NON VÉRIFIÉE au navigateur.** Les tests
  ci-dessus exercent le fichier du worker, pas un navigateur réel.
- Aucun paquet n'a été ajouté. Le worker est un fichier de `public/`, servi tel
  quel par Vite, sans plugin.
