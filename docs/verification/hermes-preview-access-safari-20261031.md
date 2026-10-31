# Accès de recette — pourquoi Safari demande Vercel alors que les contrôles curl passaient

Lot CJ-05. Rédigé le 2026-10-31. **Statut : l'accès Safari du propriétaire reste
NON VÉRIFIÉ.** Ce document explique le mécanisme, mesures à l'appui, et sépare un
plan durable exploitable d'une preview jetable. Aucune ressource n'a été
provisionnée, aucune protection n'a été modifiée, aucun secret n'est ici.

## 1. Ce qui est mesuré

Lecture seule de l'API Vercel, projet `hermes-crm-p0-preview`
(`prj_0YAVdnCjN7e2zHNAbLzUCw3N4JvF`, scope `brafas-projects`, équipe
`team_FwKGZr6VuoT5fQRt9qrpZwqP`), le 2026-10-31 :

| Réglage | Valeur |
| --- | --- |
| `ssoProtection.enabled` | `true` |
| `ssoProtection.deploymentType` | `all_except_custom_domains` |
| `passwordProtection.enabled` | `false` |
| `trustedIps.enabled` | `false` |
| `domains` (projet) | `[]` |
| `latestDeployment.target` | `null` (preview, pas de production) |

Requête anonyme, sans cookie, sans en-tête `Authorization`, sans CLI Vercel, sur
`https://hermes-crm-p0-preview-qdsunljba-brafas-projects.vercel.app/` :

```
HTTP/2 302
location: https://vercel.com/sso-api?url=https%3A%2F%2F…vercel.app%2F&nonce=…
set-cookie: _vercel_sso_nonce=…; Max-Age=3600; Path=/; Secure; HttpOnly; SameSite=Lax
content-type: text/plain
x-frame-options: DENY
x-robots-tag: noindex
```

**C'est exactement l'écran que voit le propriétaire.** Avec `ssoProtection`
actif et aucun domaine personnalisé sur le projet, toute visite de navigateur
sans session Vercel et sans jeton de partage valide DOIT aboutir là. Ce n'est
pas un défaut : c'est la protection demandée qui fonctionne.

La même URL avec `curl -L`, qui suit les redirections :

```
final_status=200
final_url=https://vercel.com/login?next=%2Fsso-api%3Furl%3D…
redirects=2
size=332169
<title>Login – Vercel</title>
occurrences de kovaa-lab-env-config dans le corps : 0
```

## 2. Pourquoi les contrôles « passaient »

Trois causes distinctes, aucune ne prouvant l'accès du destinataire.

**(a) Les contrôles verts emploient la CLI authentifiée du propriétaire.**
`scripts/check-preview-api-p0.mjs` et `scripts/check-preview-onboarding-p0.mjs`
passent par `vercel curl`, donc par le jeton de la CLI. La Deployment Protection
est satisfaite par ce jeton, pas par un navigateur. Le projet l'avait déjà écrit
— « joignable pour une session authentifiée » et « joignable pour un visiteur »
ne sont pas la même propriété — mais le script continue d'imprimer un résumé
vert sans le dire dans sa propre sortie.

**(b) Les preuves anonymes étaient vraies, et périmées à la livraison.** Elles
prouvent que le jeton de partage fonctionnait à l'instant du contrôle. Le TTL du
partage est borné à l'expiration de la session (`ttl <= 5400` s, `> 300` s) et
meurt avec le run de 90 minutes. Un lien prouvé à T est éteint quand le
propriétaire l'ouvre : l'URL retombe sur l'origine nue, donc sur le 302
ci-dessus. **C'est l'explication la plus probable du signalement.**

**(c) Un contrôle `-L` qui n'assertionne que 200 réussit contre la page de
connexion.** Mesuré en §1 : `final_status=200`, corps
`<title>Login – Vercel</title>`. Tout futur contrôle qui suit les redirections
et ne regarde que le code HTTP conclura à un succès sur un échec d'accès.

## 3. Hypothèses propres à Safari — à confirmer au navigateur

Non observables en HTTP. Elles ne sont PAS établies et ne doivent pas être
rapportées comme telles ; elles orientent la recette CUA de root.

1. **La barre d'adresse perd la requête.** À la deuxième visite, Safari propose
   l'hôte nu depuis l'historique et `?_vercel_share=…` disparaît. L'accès ne
   tient plus que par le cookie `_vercel_jwt`. `scripts/check-preview-access.mjs`
   contrôle désormais ce cas précis.
2. **Navigateur intégré d'une application de messagerie.** Un lien ouvert depuis
   Mail ou WhatsApp s'affiche souvent dans une vue intégrée dont le magasin de
   cookies est séparé : le cookie posé là n'atteint jamais Safari lui-même, et
   la visite suivante dans Safari repart sans rien.
3. **Cookies refusés.** « Empêcher le suivi intersites » et a fortiori
   « Bloquer tous les cookies » empêchent la conservation de `_vercel_jwt` :
   l'écran de connexion revient à chaque navigation.
4. **Atténuation anti-rebond.** `vercel.com/sso-api` est un redirecteur ;
   Safari classe ce type de domaine et peut purger ses cookies. Mécanisme
   plausible, propre à Safari, non vérifié ici.
5. **Contexte de cookie en mode autonome.** Une PWA installée peut ne pas
   partager le contexte de cookie de l'onglet. C'est pourquoi R15 et R16 restent
   non vérifiés.

**Cause commune avec le défaut du service worker.** L'edge protégé exige son
cookie pour *chaque* requête, y compris les fichiers statiques. Tout contexte qui
ne porte pas ce cookie reçoit une redirection de connexion hors origine au lieu
du fichier. C'est ce qui cassait le précache de la PWA (il aurait mis en cache la
page de connexion comme page hors connexion), et c'est le même mécanisme qui peut
casser une deuxième visite Safari et une PWA installée. Même famille de problème.

## 4. Plan durable, avec les ressources déjà autorisées

### 4.A Recommandé, aucun changement, gratuit : session Vercel du propriétaire

Le propriétaire se connecte **une fois** à Vercel dans Safari avec le compte qui
possède l'équipe (`brafa.claude@gmail.com`). Toutes les URL de déploiement
protégées s'ouvrent ensuite directement dans Safari, tant que cette session
Vercel vit. Renouvellement : se reconnecter.

- Coût : nul. Provisionnement : nul. Protection : inchangée.
- Limite : ne vaut que pour les personnes ayant accès à l'équipe Vercel.
- **Ce qu'il faut corriger n'est pas la protection, c'est la promesse de
  livraison.** Annoncer « lien vérifié utilisable » pour une URL qui exige une
  session Vercel absente, ou un jeton déjà expiré, est le défaut réel.

### 4.B Possible sans rien payer, mais c'est une décision du propriétaire

L'équipe possède déjà deux domaines vérifiés, `kovvalab.app` et `ced-fwi.fr`.
Comme `deploymentType` vaut `all_except_custom_domains`, un hôte personnalisé
rattaché à ce projet **n'est pas couvert par le SSO Vercel** : Safari l'ouvrirait
sans aucune connexion Vercel, et tous les `*.vercel.app` resteraient protégés.

Conséquences à accepter avant de le faire, et je ne l'ai pas fait :

- Sur cet hôte, le CRM n'a plus que sa propre authentification devant lui.
  Quiconque connaît le nom atteint l'écran de connexion du CRM.
- Un domaine de projet vise par défaut la cible production, ce que la mission
  interdit. Il faudrait une affectation preview/branche explicite, à vérifier.
- Un enregistrement DNS est à créer chez l'hébergeur actuel de `kovvalab.app`
  (ses serveurs de noms ne sont pas ceux de Vercel).

À trancher par le propriétaire. Rien n'est provisionné de mon fait.

## 5. Preview jetable — ce qu'elle est et ce qu'elle n'est pas

`.github/workflows/p0-preview-session.yml` : tunnel Quick Tunnel `cloudflared`
épinglé, PostgreSQL et Redis de service, backend compilé depuis le run, frontend
statique déployé à la main sur le projet preview.

- Durée **absolue 60 ou 90 minutes**, comptée depuis `preview-ci-session-p0.mjs
  start`, donc **avant** tunnel, déploiement, migrations et readiness. Le temps
  réellement utilisable est inférieur. Rien ne prolonge l'échéance.
- Le frontend statique peut rester joignable après l'expiration de l'API. **Une
  page qui s'affiche n'est pas un CRM qui fonctionne.**
- Ce n'est pas de l'hébergement. Ne jamais présenter 90 minutes comme durable.

## 6. Procédure de renouvellement

1. Relancer la session ; relever `expiresAt` absolu.
2. Déployer l'artefact frontend du SHA approuvé sur le projet preview, en
   `--target preview`. Jamais `--prod`, jamais d'alias de production.
3. Créer un partage borné : `PATCH /aliases/<dpl-id>/protection-bypass`, corps
   `{"ttl": <restant - 30>}`. Jamais de bypass automation global, jamais de clé
   dans Git, un journal ou un argument shell.
4. **Contrôler l'accès anonyme** :
   `PREVIEW_SHARE_URL="<url>" node scripts/check-preview-access.mjs`.
   Le script n'emploie ni la CLI Vercel ni `Authorization`, refuse toute
   redirection hors origine, exige les marqueurs du document applicatif, et
   vérifie la deuxième visite sans la requête de partage. Il caviarde le jeton.
5. **Recette navigateur par root via CUA**, sans session Vercel préalable, puis
   dans Safari. Tant que ce pas n'est pas fait, l'accès reste non vérifié.
6. Livrer en annonçant l'heure d'expiration réelle, et en disant que l'URL doit
   être ouverte **entière**, collée dans Safari, pas depuis une application de
   messagerie.

Consigne au destinataire, à joindre au lien :

> Collez l'URL complète directement dans Safari. Ne l'ouvrez pas depuis Mail ou
> WhatsApp : leur navigateur intégré ne conserve pas l'autorisation. À la visite
> suivante, recollez l'URL complète plutôt que de choisir la suggestion de la
> barre d'adresse. Si « Bloquer tous les cookies » est activé, l'accès est
> impossible.

## 7. Ce qui reste non vérifié

- **Accès Safari du propriétaire** : non reproduit, non résolu. Un passage de
  `check-preview-access.mjs` est une preuve HTTP, **pas** une preuve Safari.
- **R15, installation PWA** : non vérifié. Un manifeste et un `start_url` ne
  prouvent pas qu'une PWA installée passe la protection Vercel ; le contexte de
  cookie en mode autonome peut différer.
- **R16, lien utilisable** : non vérifié tant que 5 et 6 n'ont pas été exécutés.

Rien de tout cela ne doit être arrondi en « verified ».
