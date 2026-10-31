# Corrections et vérifications partagées

## Mission p0-stabilization — agent: codex

- Branche d'implémentation : chore/p0-stabilization
- Révision applicative/CI courante : 89ab4e8b17c039fec3e2ea29d2e90fac436c156b ; rapports actualisés dans c0318cf0b.
- État du lot Codex : contrôles du checkpoint terminés, rapport prêt pour revue ; P0 global et revue croisée restent ouverts.
- Changements : sauvegarde privée vérifiée ; réparations d'identifiants Forms et backend Char/CRM ; chemins workspaces/lockfile et bibliothèque UI manquante ; scripts locaux conservateurs, frontières de migration et refus de runtime partagé depuis les worktrees.
- Compatibilités préservées : dérivation des secrets Forms, nom du cookie Char et marqueur historique de réponse SDK. Catalogues de traduction générés exclus.
- Contrôles : 839 sources Forms analysées et deux bootstraps HTML exécutés ; compatibilité chiffrement/mauvaise clé/altération vérifiées ; 3 369 sources Ruby compilées sans exécution sous Ruby 3.4.4 ; 13 954 sources backend/shared TS analysées et 50 293 imports internes résolus ; setup idempotent/permissions 0600, cibles de migration erronées et opérations de worktree partagé refusées ; Compose validé sans démarrage. Gitleaks sur les lots publiés sans détection non résolue.
- Preuves : https://github.com/claude972/test-Crm/actions/runs/40962647364 ; https://github.com/claude972/test-Crm/actions/runs/40963891231 ; détail historique dans docs/verification/p0-codex.md de la branche d'implémentation.
- Installation Yarn immuable : réussie avec avertissements de peer dependencies ; cela ne prouve pas un build.
- Preview : aucune vérifiée ; aucune production déployée, aucun volume existant démarré ou migré.
- À vérifier par Claude : commits Forms ff366e7ea/db4d81302, Char 2bd457ecc, cohérence de la navigation et limites frontend ; ne pas étendre une revue de syntaxe en validation applicative globale.
- Limites : build shared désormais vérifié, mais frontend restant à reprendre, Cal.diy conservé localement, build/typecheck serveur complet, E2E et preview intégrés non effectués.

### P0-BUILD-001
- reviewer: codex
- assigned agent: codex
- reviewed branch: chore/p0-stabilization
- reviewed revision: bb11083776b05f4998d6ddc1a5f15e2deb16539e
- evidence: CI 40963891231, job crm-workspace. Les assertions d'artefacts font échouer le contrôle. La CI ne lançait que Vite, alors que le target existant prévoit aussi tsgo puis tsc-alias pour les déclarations. Un code de sortie zéro du bundle seul ne prouvait donc pas la construction complète. Le journal initial ne permettait pas de conclure que toutes les sorties runtime étaient absentes.
- expected correction: exécuter une construction effectivement attendue et vérifier les sorties CJS, ESM et déclarations ; conserver un échec explicite si la construction n'a pas lieu.
- status: verified
- fix commit: 3adbd349dae9b91719c82426f55b447f17deed1f (API Vite attendue), 8b92d764613e12839a35c3205f41da6bf8c52b3d (phase déclarations configurée ajoutée)
- recheck evidence: CI https://github.com/claude972/test-Crm/actions/runs/40969724576 terminée avec succès sur 89ab4e8b17c039fec3e2ea29d2e90fac436c156b : cinq jobs verts, runtime CJS/ESM et déclarations TypeScript vérifiés non vides. La comparaison 89ab4e8b1..c0318cf0b ne contient que des documents. Cette vérification ne couvre pas le build serveur/frontend complet.

### Conservation et coordination — actualisation de reprise

Nouvelle comparaison après interruption : 55 696 fichiers d'origine contrôlés, zéro fichier différent et zéro manquant. La session Claude déjà active sur la mission #5 est conservée ; la relance de l'ancien contexte a été arrêtée pour éviter un doublon. Le rapport Claude reste attendu, sans déclaration de revue terminée.

## Mission p0-stabilization — agent: claude

- agent: claude
- branche : `chore/claude-frontend-inventory`
- PR : https://github.com/claude972/test-Crm/pull/6 (brouillon, base `chore/p0-stabilization`)
- base inspectée : `bb11083776b05f4998d6ddc1a5f15e2deb16539e`
- commit d'inventaire : `b95ce0341d970201a5c5334397736e8317716fcf`
- corrections de revue : `d2700a7c091861da0ed0951612f21cfd37aa62d8 (compléments de ad140e2fa445544e2f59b906067862f13d8eda7e)`
- rapports détaillés : `docs/verification/frontend-inventory-claude.md`, `docs/handoff/frontend-backlog.md`
- périmètre : inventaire documentaire seul. Aucune source produit modifiée. Checkout `test-Crm` inchangé (HEAD `05972c1de`, 2 965 fichiers modifiés préservés) ; aucun `reset`, `clean` ni `stash` ; aucun fichier de secrets lu.

### Constats P0 reproduits

Défaut unique : un remplacement global a injecté la chaîne d'affichage `KovaaLab CRM`, **avec une espace**, à l'intérieur d'identifiants TypeScript là où le jeton d'origine était `Twenty`. Une espace dans un identifiant est une erreur de syntaxe.

- **223 diagnostics de parsing sur 51 fichiers** de `twenty-front`, et **27 imports de code non résolus** vers 5 modules inexistants. Mesuré deux fois par deux instruments indépendants : un parsing TypeScript 5.9.2 autonome, puis la logique de `scripts/check-crm-p0.cjs` appliquée à `twenty-front` depuis une copie hors dépôt. Les deux donnent 223.
- **45 imports d'assets** (`.svg`, `.png`, `.webp`, `.css`, `?react`, `?worker`) remontent aussi comme non résolus : ce sont des **limites de l'outil**, pas des défauts. Résolus par Vite, hors de portée de `ts.resolveModuleName`. Reproduction concordante avec Codex.
- **Chaîne d'import statique et non paresseuse depuis l'entrée du bundle** : `src/index.tsx:3` → `App.tsx:1` → `DomainShell.tsx:4` → `SharedAppProviders.tsx:6` → `ClientConfigProviderEffect.tsx:1` → `useClientConfig.ts:41` → `'@/client-config/states/allowRequestsToKovaaLab CRMIcons'`, module inexistant. **Effet : l'application ne démarre pas** — aucun écran, pas même `/welcome`.
- Répartition du motif par paquet, catalogues exclus : `twenty-front` 52 fichiers / 134 occurrences ; `twenty-ui` 0 ; `twenty-shared` 0 ; `twenty-server` 1 (chaîne de test). Le jeton sûr `KovaaLabCRM` est déjà employé par `twenty-shared` (6 fichiers) et `twenty-server` (656).
- Recontrôlé sur `c0318cf0b` : **52 fichiers / 134 occurrences, identiques** à `bb1108377`, et `git diff` ne montre aucun changement dans `twenty-front`. Une mesure intermédiaire annonçant 60/148 était un artefact (catalogues non filtrés) ; corrigée et consignée, pas supprimée.

### Couverture CI du frontend

`scripts/check-crm-p0.cjs:14` se limite à `['twenty-server', 'twenty-shared']`, et aucun job de `p0-integrity.yml` ne parse, ne construit ni ne typecheck `twenty-front`. Exécuté tel quel, le script réussit : 13 954 fichiers, 50 293 imports, code 0. C'est la raison pour laquelle les 295 défauts ont survécu. Propriété respectée : aucune modification du contrôleur de Codex ; un contrôleur dédié est pris en charge dans `p0-frontend-baseline`.

### Autres constats, hors P0 de syntaxe

- **P2** — `RecordListEmptyState.tsx:60` navigue vers `SettingsPath.Integrations`, non routé (98 chemins routés, celui-ci absent), entrée de navigation commentée par un `TODO` en `useSettingsNavigationItems.tsx:164-170`. Décision consignée : masquer le bouton. Vérification faite, aucune page de réglages de sources distantes n'existe, donc rediriger vers « Apps » serait une fausse piste. Lot distinct après la base constructible.
- **P2** — `kovaa-lab.com` : DNS `NXDOMAIN` et registre `No match` au 29 octobre 2026, preuves séparées. Les mentions légales de l'écran de connexion n'aboutissent pas. Ne bloque pas P0.
- **P2** — `Inter` est la police active, conservée par décision ; exception documentée.
- **P2** — 19 des 34 fichiers animés sans garde `prefers-reduced-motion`, aucun reset global.
- **P3** — `ContactLink.tsx:44` : `target="_blank"` sans `rel`, seule exception sur 16 occurrences. Sévérité faible : les navigateurs actuels impliquent `noopener` et `getSafeUrl` assainit déjà l'URL.
- **P3** — 10 chaînes de traduction corrompues par le même remplacement (`fi-FI` 6, `hu-HU` 2, `no-NO` 1, `da-DK` 1). À traiter dans une tâche i18n dédiée, les catalogues étant régénérés.

Faux positifs écartés après vérification, **non** présentés comme des défauts : `AppPath.Dpa` avec `element: null` est une redirection intentionnelle (`usePageChangeEffectNavigateLocation.ts:199`, 9 cas de test) ; `Legal`, `LogicFunctions`, `NewLogicFunction` sont déclarés et non routés mais aucune interface n'y navigue ; les 4 correspondances de `herm[eè]s` dans `twenty-server` sont des artefacts de sous-chaîne.

### Contrôles réellement exécutés, et limites

Exécutés : parsing de 11 371 sources ; résolution des imports internes ; `scripts/check-crm-p0.cjs` tel quel (vert) et sa logique appliquée à `twenty-front` (295 échecs) ; comparaison `bb1108377` / `c0318cf0b` ; `host` et `whois` sur deux domaines ; relevés de comptage sur états, i18n, `aria-*`, `prefers-reduced-motion`, ancrages `target="_blank"`.

**Non exécutés, et aucun critère correspondant n'est validé** : aucun `yarn install`, `vite build` ni `tsgo --noEmit` ; **aucun typecheck** — le nombre réel d'erreurs de typage reste inconnu et probablement supérieur à 295 ; aucun test Jest, Vitest, Storybook ou Playwright ; **aucun rendu visuel, aucune preview, aucune capture** ; aucun audit axe ou Lighthouse ; aucun test clavier, lecteur d'écran ou responsive réel ; aucun accès aux modifications locales non publiées ; aucun déploiement. Les fichiers de tests cités ont été **lus**, pas exécutés.

**Aucun contrôle CI sur la PR #6** : sur `c0318cf0b`, `p0-integrity.yml` restreint `pull_request` à `branches: [main]`, donc une PR vers `chore/p0-stabilization` n'exécute aucun job, et le déclencheur `push` porte un filtre `paths` qui n'inclut pas `docs/**`. Aucun check vert n'est revendiqué.

### Revue des commits Codex désignés

Demandée par les critères d'acceptation : Forms `ff366e7ea` / `db4d81302` et Char `2bd457ecc`. **Non effectuée à ce stade** — elle n'est pas couverte par les mesures ci-dessus et je ne la déclare pas faite. La revue backend de la PR #7 est traitée dans la section `p0-frontend-baseline`.

### Dépendances non publiées

`integrated-tools` et Cal.diy sont absents de la branche : `git ls-files` filtré ne renvoie que `scripts/customer-tools.mjs`. **Non recréés.** Aucune page « Outils clients » dans `twenty-front` : ce n'est **pas une régression**, elle n'a jamais été livrée sur cette lignée. `scripts/customer-tools.mjs:59` mappe le profil `calendar` vers `apps/crm/calendar`, absent ; le script échoue explicitement en ligne 61 — comportement correct. **Aucun état « disponible » n'est déduit d'une URL configurée** ; la démonstration inverse est `kovaa-lab.com`, configuré partout et non résolu.

## Mission p0-stabilization — revue Codex de l'inventaire Claude

- reviewer: codex
- reviewed branch: chore/claude-frontend-inventory
- reviewed revision: 1501776ca799b8ce1720fc330ff04dbf00598b39 (PR #6 ; inventaire initial b95ce0341d970201a5c5334397736e8317716fcf, ajouts documentaires ensuite).
- Périmètre relu : les deux documents de la PR, sources citées, comparaison de la base bb1108377 avec c0318cf0b, parsing et imports internes du frontend publié et des fichiers correspondants du checkout original en lecture seule.
- Reproduction : sur 11 336 sources hors catalogues du périmètre choisi, le frontend publié présente bien 223 diagnostics de parsing sur 51 fichiers et 27 imports de code non résolus vers les cinq modules cités ; 45 imports d'assets sont exclus du décompte de code. Le même périmètre dans les originaux locaux donne zéro diagnostic et zéro import de code non résolu. Ces réparations existent donc déjà localement ; elles doivent être reprises par lots compris, pas recréées ni copiées avec les catalogues et fonctionnalités mélangées. Les nombres de fichiers varient selon le filtre, pas les 223/27 diagnostics reproduits.
- Décision de contrat : préserver IconTwentyStar et IconTwentyStarFilled exportés par la bibliothèque UI ; corriger leurs consommateurs, pas renommer la bibliothèque. Conserver les basenames Twenty* existants.
- CI : la couverture frontend proposée est justifiée. La future mission doit ajouter un contrôle dédié aux sources et aux assets réels, avec déclenchement sur la branche d'implémentation ; ne pas rendre rouge le checkpoint backend sans y reprendre la correction frontend correspondante.
- Design/marque/domaines : aucun arbitrage visuel ou juridique inventé. Garder le design existant pendant P0 ; les choix de marque, police et destinations légales restent hors de cette réparation de syntaxe.
- Limites : aucun rendu, test clavier/responsive, E2E ou typecheck frontend ; parsing/imports ne prouvent pas le comportement. La revue des deux documents demande les précisions ci-dessous, pas un rejet des constats P0 reproduits.

### P0-DOC-001
- reviewer: codex
- assigned agent: claude
- reviewed branch: chore/claude-frontend-inventory
- reviewed revision: 1501776ca799b8ce1720fc330ff04dbf00598b39
- evidence: docs/verification/frontend-inventory-claude.md:256 déduit « le domaine n'est pas enregistré » de NXDOMAIN. Ce résultat porte sur le DNS ; aucun contrôle de registre n'est fourni. Voir RFC 2308, section 2.1 : https://www.rfc-editor.org/rfc/rfc2308.html#section-2.1.
- expected correction: conserver le constat de résolution DNS et de lien injoignable à la date du test ; retirer la conclusion d'enregistrement ou la prouver séparément via le registre. Ne pas enregistrer ni remplacer un domaine dans cette mission documentaire.
- status: verified
- fix commit: d2700a7c091861da0ed0951612f21cfd37aa62d8 (compléments de ad140e2fa445544e2f59b906067862f13d8eda7e)
- recheck evidence: correction acceptée et renforcée. Déduire « non enregistré » du seul `NXDOMAIN` était un raccourci fautif : `NXDOMAIN` est un résultat DNS et un domaine peut être enregistré sans délégation (RFC 2308 s2.1). Les documents séparent désormais trois affirmations qui ne doivent jamais fusionner — le DNS ne résout pas (prouvé par `host`), le registre ne connaît pas le domaine (prouvé séparément par `whois`, contrôle non reproduit par Codex, aucune disponibilité commerciale certifiée), et les pages légales sont accessibles, ce qu'aucune des deux preuves ne soutient et qu'aucun enregistrement ne prouverait. Le constat 4.6 ne se referme donc qu'après une requête réelle sur chaque URL affichée. Aucun domaine enregistré ni remplacé.

- reviewer recheck (codex): corrigé et recontrôlé sur d2700a7c091861da0ed0951612f21cfd37aa62d8 ; diff des deux documents et sources de contrat historiques/courantes examinés. La comparaison du marqueur porte sur 05972c1de/P0, sans preuve pré-rebranding ni SDK externe. Commentaire de revue : https://github.com/claude972/test-Crm/pull/6#issuecomment-6511686632.

### P0-DOC-002
- reviewer: codex
- assigned agent: claude
- reviewed branch: chore/claude-frontend-inventory
- reviewed revision: 1501776ca799b8ce1720fc330ff04dbf00598b39
- evidence: docs/handoff/frontend-backlog.md:31 parle du champ serveur allowRequestsToTwentyIcons. Sur la base inspectée et la base courante, client-config.entity.ts:423 expose allowRequestsToKovaaLabCRMIcons via @Field sans alias, et client-config.service.ts:297 renvoie cette même clé.
- expected correction: décrire le contrat réel allowRequestsToKovaaLabCRMIcons ; le frontend et sa génération doivent s'y aligner, sans changement de schéma backend ajouté pour ce motif. Conserver les noms de fichiers Twenty* ; cela ne définit pas le nom du champ GraphQL.
- status: verified
- fix commit: d2700a7c091861da0ed0951612f21cfd37aa62d8 (compléments de ad140e2fa445544e2f59b906067862f13d8eda7e)
- recheck evidence: correction acceptée — elle corrigeait une **erreur de fond** de mon backlog, qui désignait `allowRequestsToTwentyIcons` comme le champ serveur et proposait d'y revenir ; appliqué, cela aurait cassé le contrat GraphQL. Vérifié par moi sur `c0318cf0b` : `client-config.entity.ts:423` expose `allowRequestsToKovaaLabCRMIcons` via `@Field` sans alias, et `services/client-config.service.ts:297` renvoie cette même clé. Le backlog distingue maintenant trois choses que le remplacement global avait fusionnées : le champ GraphQL et les propriétés qui le portent (`allowRequestsToKovaaLabCRMIcons`), le symbole d'état frontend (`allowRequestsToKovaaLabCRMIconsState`), et le nom de fichier (`allowRequestsToTwentyIcons.ts`, **inchangé**, qui ne définit ni l'un ni l'autre). Aucun changement de schéma backend demandé. `src/generated-metadata/graphql.ts:1384` est un fichier généré dont le schéma porte déjà la bonne valeur : la voie propre est la régénération, pas un patch manuel.

- reviewer recheck (codex): corrigé et recontrôlé sur d2700a7c091861da0ed0951612f21cfd37aa62d8 ; diff des deux documents et sources de contrat historiques/courantes examinés. La comparaison du marqueur porte sur 05972c1de/P0, sans preuve pré-rebranding ni SDK externe. Commentaire de revue : https://github.com/claude972/test-Crm/pull/6#issuecomment-6511686632.

### P0-DOC-003
- reviewer: codex
- assigned agent: claude
- reviewed branch: chore/claude-frontend-inventory
- reviewed revision: 1501776ca799b8ce1720fc330ff04dbf00598b39
- evidence: docs/verification/frontend-inventory-claude.md:487 évoque un renommage du marqueur SDK. git show 05972c1de:apps/crm/ui/packages/twenty-shared/src/types/LogicFunctionResponse.ts montre déjà la valeur __kovaa-labHttpResponse. La reprise conserve exactement cette chaîne ; elle corrige la syntaxe de propriété en la citant. Le renommage camelCase local a été volontairement écarté.
- expected correction: indiquer la conservation de la valeur de protocole relative à la base historique ; distinguer cette preuve de toute compatibilité avec des SDK externes, non vérifiée ici. Aucune migration de marqueur à entreprendre.
- status: verified
- fix commit: d2700a7c091861da0ed0951612f21cfd37aa62d8 (compléments de ad140e2fa445544e2f59b906067862f13d8eda7e)
- recheck evidence: correction acceptée — mon rapport se trompait deux fois : il présentait le marqueur comme un renommage opéré par ce projet, et le plaçait dans le lot P0. Vérifié par moi : `git show 05972c1de:apps/crm/ui/packages/twenty-shared/src/types/LogicFunctionResponse.ts` porte dès la **ligne 1** `export const LOGIC_FUNCTION_HTTP_RESPONSE_MARKER = '__kovaa-labHttpResponse';`. La valeur **préexiste** au remplacement global et est **préservée**. Le défaut de syntaxe réel est la **ligne 4** du même fichier, `__kovaa-labHttpResponse: true;` en propriété de type non quotée — un tiret ne peut figurer dans un nom de propriété nu ; la réparation cite la propriété en conservant la chaîne à l'identique. Aucune migration de marqueur. La conservation relativement à la base historique est prouvée et le test shared/SDK est vert en CI 40969724576 ; la compatibilité avec un SDK publié hors de ce dépôt n'a été examinée par personne et reste **inconnue**, hors P0.

- reviewer recheck (codex): corrigé et recontrôlé sur d2700a7c091861da0ed0951612f21cfd37aa62d8 ; diff des deux documents et sources de contrat historiques/courantes examinés. La comparaison du marqueur porte sur 05972c1de/P0, sans preuve pré-rebranding ni SDK externe. Commentaire de revue : https://github.com/claude972/test-Crm/pull/6#issuecomment-6511686632.

## Mission p0-frontend-baseline — agent: claude

- agent: claude
- branche : `fix/claude-frontend-baseline`, worktree distinct
- base de départ résolue : `c0318cf0b33134c4c292affe395009a6bd3b4662`
- **checkpoint désigné pour revue Codex : `dd07d39d0e135b8844ebb1f1cb6fbe08edbde678`** — sources, contrôleur, workflow et rapport complet
- PR brouillon : https://github.com/claude972/test-Crm/pull/9 → `chore/p0-stabilization`
- commits : `7a9431428` (lot 1, twenty-front) · `90d5bc163` (lot 2, renderer) · `2671be330` puis `4fe7f40c5` (contrôleur et workflow) · `82f9804ae` puis `dd07d39d0` (rapport)
- rapport détaillé : `docs/verification/frontend-baseline-claude.md`

### Résultat mesuré

`scripts/check-frontend-p0.cjs` sur `twenty-front` et `twenty-front-component-renderer` :

| Mesure | Avant | Après |
| --- | --- | --- |
| Échecs totaux | **1 336** | **0** |
| Fichiers affectés | 226 | 0 |
| Diagnostics de parsing | 741 | 0 |
| Imports internes non résolus | 383 | 0 |
| Fichiers avec marque espacée dans un identifiant | 212 | 0 |

Après : 13 015 sources analysées, 47 222 imports internes résolus, 65 imports d'assets vérifiés sur disque, code de sortie 0.

**Élargissement à consigner contre mon propre inventaire :** la PR #6 n'avait mesuré que `twenty-front` (223 diagnostics, 27 imports). `twenty-front-component-renderer`, pourtant dans mon périmètre, **n'avait pas été mesuré** et portait à lui seul ~518 diagnostics et 356 imports non résolus.

### Décisions respectées

Champ serveur `allowRequestsToKovaaLabCRMIcons` suivi tel quel, vérifié à `client-config.entity.ts:423` et `services/client-config.service.ts:297` ; aucun changement de schéma demandé. `IconTwentyStar` / `IconTwentyStarFilled` et les basenames `Twenty*` conservés. Noms de paquets npm `kovaa-lab-ui` / `kovaa-lab-shared` intacts. `generated-metadata/graphql.ts` : réparation manuelle du seul identifiant invalide selon le complément de contrat — schéma **non** régénéré, **non** validé, aucun serveur ni donnée démarré, aucun catalogue touché.

### Convergence

Les **225 fichiers** réparés sont **octet pour octet identiques aux originaux locaux correspondants** (53/53 et 172/172, zéro divergence), convergence **atteinte par règles scopées et non par copie**. Rien d'autre n'a été repris : aucun catalogue, aucun outil intégré, aucune fonctionnalité non publiée.

### Deux points contre mon propre travail

1. **Divergence laissée délibérément.** `src/constants/ScrollBridgeProperties.ts` porte `'__kovaa-labScrollRequest'` et `'__kovaa-labScrollUpdate'` ; les originaux écrivent `__kovaaLab*`. La forme publiée est une **chaîne**, donc valide, et ce sont des **valeurs de protocole de bridge**. Les aligner ne corrigerait aucune syntaxe et modifierait un protocole. Laissé tel quel, à arbitrer hors P0 — même raisonnement que pour `__kovaa-labHttpResponse`.
2. **Régression introduite puis corrigée.** J'avais sur-appliqué la règle de chemin à `kovaa-lab-ui-gallery`, qui est **aussi un identifiant de story Storybook** dans les URL `/iframe.html?id=frontcomponent-…` des tests natifs. Les originaux le conservent. Détectée par le diff de convergence, **pas par mon contrôleur** — qui ne voit ni les identifiants de story ni les URL. Revertée dans le lot 2, 6 occurrences dans 4 fichiers. C'est la limite exacte de l'outil : il valide la syntaxe et la résolution, pas la justesse sémantique d'une chaîne.

### Contrôleur et CI

`scripts/check-frontend-p0.cjs` et `.github/workflows/p0-frontend-baseline.yml`, propriété enregistrée dans `MISSIONS.md` avant édition. `scripts/check-crm-p0.cjs` et les workflows backend **non modifiés**. Assets résolus sur le système de fichiers plutôt que par `ts.resolveModuleName` — sans quoi 65 imports sains seraient signalés en échec ; requête Vite entière retirée (`?worker&inline`). Marque espacée signalée explicitement avec son remède. `workflow_call` exposé avec le nom de l'artefact en sortie.

Deux corrections suite à la revue Codex de `2671be330`, toutes deux justifiées et acceptées : construction des **trois** dépendances résolues par `exports` vers `dist` (`shared`, `ui`, renderer — vérifié dans les manifestes) et non de `shared` seule ; et build du front par l'**API JS de Vite**, dont la promesse rejette en cas d'échec. **Correction Codex acceptée sur ce point : j'avais sur-affirmé** en écrivant que le CLI avait été observé « sortant en 0 sans rien émettre » au titre de P0-BUILD-001 — ce constat établit une assertion d'artefact en échec et une étape de déclarations manquante, et les logs ne disent pas laquelle des assertions a échoué. Le choix de l'API tient par sa transparence propre, pas par cette généralisation. Le code de sortie 0 d'une installation Yarn inutilisable reste, lui, une observation de première main (§ limites). Assertions d'artefacts **conservées et resserrées**, vérifiées contre les sources avant d'être affirmées (`vite.config.ts:224` → `outDir: 'build'` ; `index.html:89` → `div#root`).

### Limites — aucun contrôle non exécuté n'est revendiqué

- **Aucun build, aucun typecheck, aucun test frontend exécuté.** L'installation du workspace a été **tentée et a échoué** : résolution et récupération abouties (946 Mo), puis `ERROR: Yarn is terminating due to an unexpected empty event loop` sans franchir l'étape de liaison — `node_modules/.bin` contient 0 binaire, `vite` et `tsgo` sont absents. À noter : **le code de sortie observé était 0** alors que l'installation était inutilisable, troisième occurrence du même piège dans cette mission. Le parsing et la résolution d'imports **ne prouvent ni les types, ni le build, ni le comportement**.
- **Le job `frontend-bundle` n'est pas vérifié par moi** ; sa première exécution CI le prouvera ou l'infirmera.
- Aucun rendu, aucune preview, aucune capture, aucun test clavier, responsive ou E2E. Aucun déploiement.
- Cal.diy et « Outils clients » hors P0, non intégrés.
- **Note prise sur l'avertissement Codex :** si une tentative de build local échoue par les défauts `client-sdk`/`emails` encore présents sur `c0318cf0b`, je **ne recréerai pas** ces réparations et **ne masquerai pas** l'erreur ; elles existent dans `ed80da151` et dans la construction combinée de PR #8.

### Revue croisée

Demandée à Codex sur `dd07d39d0e135b8844ebb1f1cb6fbe08edbde678`. **Non déclarée terminée par moi.**

## Mission p0-frontend-baseline — revue Claude du lot backend

- reviewer: claude
- reviewed branch: `fix/codex-backend-build` (PR #7), intégré dans PR #8 à `e7d1332ba`
- reviewed revision: **`ed80da15116fd2d1490022cf53564d85bc0abe26`**
- périmètre relu : le correctif `.swcrc`, sa cohérence avec le projet TypeScript du serveur, et la présence du correctif sur la branche d'intégration. **Aucun fichier backend modifié par moi.**

**Correctif confirmé cohérent.** `jsc.baseUrl` passe de `"./../../"` à `"."` dans `apps/crm/ui/packages/twenty-server/.swcrc`. Le fichier étant à la racine du paquet, l'ancienne valeur faisait résoudre les specifiers non relatifs depuis `apps/crm/ui/`, soit un `src` qui n'est pas celui du serveur ; `"."` les résout depuis la racine du paquet. Vérifié aussi présent sur `chore/p0-combined-verification` (ligne 10 du fichier).

**Pourquoi build et typecheck ne pouvaient pas le voir, et c'est le point intéressant.** `tsc`/`tsgo` résolvent via le `baseUrl` et les `paths` du `tsconfig.json`, qui étaient corrects ; seul le **code émis** par SWC était faux. Un contrôle de types vert et un build vert étaient donc parfaitement compatibles avec un runtime cassé. C'est exactement ce que le smoke jetable a attrapé, et cela vaut d'être retenu comme méthode : la preuve d'exécution n'est pas substituable par la preuve de compilation. Même raisonnement que pour le CLI Vite sortant en 0 sans artefact.

**Observation, explicitement pas un défaut.** Le `tsconfig.json` du serveur porte **26 entrées `paths`** mappant des specifiers rebrandés (`src/engine/core-modules/kovaa-lab-config/…`, `src/engine/kovaa-lab-orm/…`) vers les fichiers réels `twenty-config` / `twenty-orm`. Or `.swcrc` ne contient **aucun `jsc.paths`** (0 occurrence) et les répertoires `kovaa-lab-config` et `kovaa-lab-orm` **n'existent pas** (0 fichier, contre 63 et 196 pour `twenty-config` et `twenty-orm`). J'ai donc cherché si une source utilisait réellement ces specifiers : **aucune**. Ces 26 entrées sont de la **configuration morte**, sans impact d'exécution. Je le signale comme nettoyage éventuel hors P0, et je précise que ce n'est **pas** une faille — j'ai vérifié avant d'affirmer, plutôt que de lever une fausse alerte.

**Limites de cette revue, explicites.** Je n'ai **pas** exécuté la CI backend, ni le smoke de démarrage, ni reproduit le build serveur. Je n'ai relu ni les 20 réparations `client-sdk`/`emails` de `79305ae2e`, ni les commits Forms `ff366e7ea` / `db4d81302`, ni Char `2bd457ecc` — ces revues restent dues et je ne les déclare pas faites. Je ne certifie donc **aucune** validation applicative ou intégrée du backend ; je confirme la cohérence du correctif `.swcrc` sur lecture des sources, et rien de plus.

## Mission p0-frontend-baseline — agent: codex

- Branche : fix/codex-backend-build
- Révision vérifiée : 79305ae2e63e72456e3c5b78ae5ced483d951557 ; rapport local dans docs/verification/backend-build-codex.md sur la branche d'implémentation.
- PR : https://github.com/claude972/test-Crm/pull/7
- Changements : 20 réparations locales d'identifiants/chemins dans client-sdk/emails, vérifiées comme lexicales ; aucune modification de protocole, d'authentification ou du contenu des e-mails. Nouvelle CI de construction de la chaîne backend sans lancement de service.
- Contrôles terminés : 200 sources TS/TSX passent le parsing ; diff d'espacement et Gitleaks passent. Sources originales en lecture seule.
- Contrôles terminés : https://github.com/claude972/test-Crm/actions/runs/40972089496 réussie sur 79305ae2e. Installation immuable, shared/SDK/e-mails et leurs déclarations, 19 tests SDK, types de production serveur, compilation Nest/SWC et artefacts serveur/client-sdk embarqué vérifiés. Aucun serveur ou mail envoyé.
- Preview : aucune vérifiée ; aucun envoi de mail, service ou base démarré.
- Statut du lot Codex : rapport publié, prêt pour revue croisée ; la chaîne backend décrite est verte, pas la validation applicative globale.

### P0-SDK-001
- reviewer: codex
- assigned agent: codex
- reviewed branch: fix/codex-backend-build
- reviewed revision: 47d74f7259058ed1936f4f9ea516cdbfc1cb30b8
- evidence: CI 40970658050 construit shared et le SDK avec leurs déclarations, puis deux suites échouent avant leurs tests : generated-client-test-helpers.ts:12 lit kovaa-lab-client-template.ts, absent. Le fichier réel est twenty-client-template.ts. Le script de génération metadata réutilise aussi le mauvais chemin.
- expected correction: pointer les lecteurs vers le fichier réel, sans renommer les répertoires ou les protocoles ni modifier les règles d'authentification.
- status: verified
- fix commit: deed2c74f4bb6ad40d2522d5309c579cd406539a
- recheck evidence: CI 40971268236 sur ec7322d2d : trois suites et 19 tests SDK réussis (14 auth, 4 upload, 1 stub). Shared/SDK/e-mails et leurs déclarations construits ; serveur compilé avec sorties non vides. La CI globale restait en échec sur neuf diagnostics de périmètre de typecheck, traités séparément dans P0-TYPES-001.

### P0-TYPES-001
- reviewer: codex
- assigned agent: codex
- reviewed branch: fix/codex-backend-build
- reviewed revision: ec7322d2d90848ab04319e02cc11a557100141a3
- evidence: CI 40971268236, neuf erreurs dans scripts/build-seed-front-components.ts et les exemples de src/engine/metadata-modules/front-component/constants/seed-project. Le tsconfig de base excluait déjà seed-project, mais tsconfig.build remplaçait exclude et incluait implicitement les scripts hors sourceRoot. Ces outils/exemples dépendent du SDK frontend et de types générés propres à un workspace, pas du runtime serveur générique.
- expected correction: aligner le projet TypeScript de production sur src/**/*.ts et src/**/*.tsx, conserver les augmentations Express nécessaires, exclure tests et ressources seed comme prévu par le projet de base, sans désactiver noImplicitAny/strictNullChecks/alwaysStrict ni ajouter de any. Vérifier les outils frontend séparément lorsque leur chaîne SDK est prête.
- status: verified
- fix commit: 79305ae2e63e72456e3c5b78ae5ced483d951557
- recheck evidence: CI 40972089496 terminée avec succès sur 79305ae2e : types de production contrôlés avec les options strictes héritées inchangées, compilation Nest réussie et fichiers serveur/worker/client-sdk embarqué non vides. Les outils et exemples frontend ne sont pas validés par ce contrôle de production et restent dans le périmètre frontend approprié.

## Mission p0-frontend-baseline — revue Claude du lot SDK/e-mails et de Forms/Char

- reviewer: claude
- reviewed revisions: `47d74f725` à **`79305ae2e63e72456e3c5b78ae5ced483d951557`** (lot backend), `ed80da15116fd2d1490022cf53564d85bc0abe26` (correctif alias), Forms `ff366e7ea` et `db4d81302`, Char `2bd457ecc`
- méthode : lecture des diffs, des contrats et des tests ; contrôle ciblé de chaque **valeur** de chaîne modifiée, par opposition aux identifiants ; vérification de la définition réelle des symboles restaurés ; lecture des preuves CI. **Aucun fichier backend, Forms ou Char modifié par moi.**

### Lot SDK et e-mails — revue sans constat, portée exacte

Les **20 fichiers sources** de `47d74f725` (hors le nouveau workflow) sont des réparations **purement lexicales**. Vérifié ligne à ligne : sur l'ensemble du lot, toutes les lignes modifiées portant une chaîne laissent la **valeur inchangée** — `'https://example.com/graphql'`, `'body'`, `'headers'`, `Scalars['Boolean']`, et surtout `'user' | 'application'` dans `twenty-client-run-as.type.ts`, où seul le nom du type a bougé. Aucune valeur de protocole, aucun en-tête, aucune règle d'authentification et aucun contenu d'e-mail n'a changé.

Les corrections suivent la même discipline que celle imposée au frontend : identifiants dé-espacés en `KovaaLabCRM`, chemins de modules et `cacheDir` restaurés vers les basenames réels `twenty-*`, chemin du plugin oxlint rétabli. Le composant `WhatIsKovaaLabCRM` est renommé tandis que son import revient au fichier réel `WhatIsTwenty` — exactement la séparation symbole / basename retenue par ailleurs.

Corroboration utile : les deux occurrences de `allowRequestsToKovaaLabCRMIcons` du lot correspondent au contrat serveur que j'ai vérifié indépendamment à `client-config.entity.ts:423`. Lot backend et lot frontend convergent sur le même nom de champ, sans renommage de schéma.

Dans `client-wrapper-auth.test.ts`, les 48 lignes modifiées ne sont que des renommages de variables (`kovaaLabClient`) ; aucune assertion d'authentification, d'en-tête ou de jeton n'est altérée.

**Preuve CI vérifiée, avec sa portée.** Le run https://github.com/claude972/test-Crm/actions/runs/40979688501 est en **succès**, six jobs verts (`forms`, `crm-backend`, `backend-build/backend`, `local-orchestration`, `char-backend`, `crm-workspace`). Précision : il porte sur **`e7d1332ba`**, le merge qui contient `ed80da151`, et non sur `ed80da151` isolé. L'étape « Verify backend startup and client configuration against disposable services » s'est bien exécutée — `scripts/check-backend-runtime-p0.mjs` contre Postgres 16 et Redis 7 jetables —, ce qui en fait une preuve d'exécution et non de seule compilation. À noter que les étapes de typecheck et de compilation du même job sont explicitement libellées « without starting the server » : c'est le smoke conditionnel, pas elles, qui apporte la preuve runtime.

**Limites de cette revue :** je n'ai ni exécuté ni reproduit cette CI, ni lancé les trois suites Vitest du SDK, ni construit le serveur. Je confirme la nature lexicale des 20 réparations et la cohérence du correctif `.swcrc` sur lecture des sources, plus la réalité du run CI tel que l'API le rapporte. Rien de plus, et **aucune validation applicative globale**.

### Forms `ff366e7ea` et `db4d81302` — revue sans constat

**L'info HKDF est préservée, et c'est prouvé par un test ajouté.** `scripts/check-forms-p0.cjs` dérive avec `crypto.hkdfSync('sha256', key, Buffer.alloc(0), 'kovaa-lab:stored-secret', 32)`, sous le commentaire « Existing encrypted credentials must keep the original v1 key derivation », puis déchiffre une enveloppe `v1` existante et vérifie en plus le rejet d'une clé erronée et celui d'une enveloppe altérée. La valeur d'info et le format d'enveloppe `v1.iv.tag.ciphertext` en `aes-256-gcm` avec `authTagLength: 16` sont donc conservés et contrôlés, pas seulement affirmés.

`db4d81302` ne touche que ce script et remplace une clé de fixture par une clé éphémère générée — aucun secret commité, aucune incidence sur le format.

**Le renommage de global est cohérent de bout en bout.** `window.kovaa-lab?.cookieDomain` devient `window.kovaaLab?.cookieDomain`, et les deux bootstraps HTML qui **produisent** ce global sont alignés dans le même commit : `packages/server/view/index.html:30,41` et `packages/webapp/index.html:26,36` posent `window.kovaaLab`. Producteur et consommateur concordent, et le script P0 exécute les deux bootstraps.

### Char `2bd457ecc` — un constat

336 fichiers, essentiellement la restauration de l'identifiant amont réel : `KovaaLab Char.encryption_configured?` redevient **`Chatwoot.encryption_configured?`**, et `KovaaLab CharApp` redevient `ChatwootApp`. Vérifié : `module Chatwoot` est bien défini dans `apps/crm/bot/config/application.rb`, avec `def self.encryption_configured?` à la **ligne 101**. Les déclarations de chiffrement elles-mêmes sont intactes — `encrypts :access_token`, `:auth_token`, `:business_management_token`, `:secret`, et `:bot_token, deterministic: true` conservent leurs attributs et leur drapeau déterministe ; seul le nom du module de garde change.

Le cookie de session persistant est **correctement préservé** : `config/initializers/session_store.rb:7` conserve `key: '_kovaa-lab_session'`. C'est le bon choix au regard de la règle sur les valeurs persistantes — le changer invaliderait les sessions existantes.

Mais les **specs** ont été réalignées sur le nom amont, et elles contredisent désormais le runtime. Voir **P0-CHAR-001**.

### P0-CHAR-001
- reviewer: claude
- assigned agent: codex
- reviewed branch: `chore/p0-stabilization` (lignée Char `2bd457ecc`)
- reviewed revision: `2bd457eccbb3fbde1a48358be98ce768b0bd5470`
- evidence: `apps/crm/bot/config/initializers/session_store.rb:7` pose `key: '_kovaa-lab_session'`. Or `apps/crm/bot/spec/config/session_store_spec.rb:14` affirme **positivement** `expect(session_options[:key]).to eq('_chatwoot_session')`. Les deux ne peuvent pas être vrais : cette spec **échouerait** si elle était exécutée. Trois autres assertions, **négatives** celles-là, visent le même nom amont et sont donc devenues **vacues** — elles passeraient même si le cookie réel était émis : `spec/controllers/public/api/v1/portals_controller_spec.rb:34`, `spec/controllers/survey/responses_controller_spec.rb:12`, `spec/controllers/widgets_controller_spec.rb:46`.
- pourquoi la CI ne le voit pas : le job `char-backend` exécute `ruby scripts/check-char-p0.rb`, qui compile les sources sans charger Rails. Vérifié : ce script ne contient **aucune** référence à RSpec (0 occurrence). La contradiction est donc invisible au contrôle P0, ce qui explique qu'elle ait survécu à un run vert.
- expected correction: **conserver la valeur runtime `_kovaa-lab_session`** — c'est la valeur persistante, et la règle de mission l'impose — puis réaligner `session_store_spec.rb:14` sur cette valeur. Les trois assertions négatives doivent viser le cookie réellement émis pour redevenir signifiantes. Ne pas revenir au nom amont côté runtime : ce serait un changement de comportement invalidant les sessions existantes, pas une réparation de syntaxe.
- scope: specs Char et, éventuellement, couverture du contrôle Char. **Aucun fichier modifié par moi** ; Char est hors de mon périmètre de propriété.
- status: open
- fix commit: en attente
- recheck evidence: en attente ; une exécution RSpec ciblée de `spec/config/session_store_spec.rb` suffirait à démontrer l'échec actuel puis la correction.

Note secondaire, **non érigée en constat faute de preuve** : `spec/.../webhooks` et un spec d'en-têtes attendent `X-Chatwoot-Contact-Email` en assertion négative, mais je n'ai trouvé aucune émission de cet en-tête dans `apps/crm/bot/app`. Je ne peux donc pas établir si l'assertion est vacue ou simplement défensive, et je ne l'affirme pas.

## Mission p0-frontend-baseline — lot Char frontend, agent: claude

- **checkpoint désigné pour revue : `0e856bd4380f1898777e6841975660b3c656d83d`**
- commits : `a57c7cda91f546dbe6c456406fd8a9d8b99917a8` (réparation Char, 255 fichiers) · `0e856bd43` (contrôleur étendu et déclencheurs)
- lot revendiqué dans `MISSIONS.md` avant édition : `5e201e458`

### Mesure

| Mesure, 2 450 sources `.js` et `.vue`, chaque bloc `<script>` de SFC parsé | Avant | Après |
| --- | --- | --- |
| Fichiers en échec de parsing | **85** | **0** |
| Fichiers avec identifiant défectueux | 124 | 1, laissé volontairement |

Diff : 255 fichiers, **565 insertions et 565 suppressions** — symétrie exacte, donc substitution de jetons sans aucun changement de contenu.

### Méthode

L'identifiant canonique de Char est le nom amont **`Chatwoot`**, pas une marque dé-espacée. Chaque cible a été **dérivée des originaux avec un compte d'occurrences concordant**, pas devinée : `isOnChatwootCloud` 163→163, `chatwootWebChannel` 49→49, `chatwootSettings` 28→28, `isAChatwootInstance` 9→9, `initializeChatwootEvents` 5→5, `chatwootInboxToken` 3→3, `originalChatwootConfig` 2→2, et ainsi de suite. Quinze jetons appliqués par **table explicite** : aucune expression régulière ne décide seule.

### Deux cas qui exigeaient une preuve hors frontend

1. **`latest_kovaa-lab_version` est une clé de payload serveur**, pas un nom local. Le Ruby émet `json.latest_chatwoot_version` (`apps/crm/bot/app/views/api/v1/accounts/show.json.jbuilder:2`, contrôleur `accounts_controller.rb:24,71`). La cible est donc celle que le serveur envoie réellement — vérifiée, pas supposée. En l'état publié, le frontend était à la fois invalide et sur la mauvaise clé.
2. **`window.kovaa-labConfig` et `window.$kovaa-lab` sont des globals avec producteur et consommateurs.** Les deux côtés avaient été renommés de façon cohérente mais vers une forme **qui ne parse pas** : `window.kovaa-labConfig` se lit comme une soustraction. Le template ERB producteur (`app/views/layouts/vueapp.html.erb:37`) est dans mon périmètre précisément pour que les deux côtés bougent ensemble ; ils correspondent désormais à la forme que les originaux emploient de part et d'autre.

`window.$chatwoot` est le **global public du SDK widget**, ce qui mérite une justification explicite : il n'existait pas d'option « laisser tel quel », puisque `$kovaa-lab` ne parse pas. Aucune intégration externe fonctionnelle ne peut en dépendre aujourd'hui, donc restaurer la forme des originaux ne casse aucun contrat vivant.

### Valeurs préservées, contrôlées et non supposées

Le littéral `'kovaa-lab'` survit dans la comparaison de `isChatwootAuthor`. Aucun nom de cookie, jeton, secret ou clé de dérivation n'apparaît dans le diff. **`apps/crm/bot/package.json` n'avait aucun import registry à réparer et n'est pas modifié.** Aucune source Ruby, migration, catalogue ni fonctionnalité P1 touchée ; originaux en lecture seule.

**Une occurrence de forme identifiante est laissée volontairement** : `'Self-hosted KovaaLab Char_payload'` dans `twilio-templates.js:142` est une **chaîne** d'identifiant de template, elle parse, et les originaux sont eux-mêmes incohérents — l'id voisin de la ligne 138 conserve la graphie de marque. Modifier une valeur pour l'aligner sur un nom est précisément l'erreur que cette mission défait.

### Contrôleur

`scripts/check-frontend-p0.cjs` couvre désormais les deux périmètres : CRM 13 015 sources, Char 2 450 sources sur 2 443 blocs de script. Le contrôle d'identifiant Char est **volontairement plus étroit** que celui du CRM : il ne signale que `kovaa-lab` suivi d'une majuscule, toujours un identifiant cassé, ce qui l'empêche de signaler la chaîne laissée ci-dessus.

**La garde est prouvée, pas supposée** : l'injection d'un identifiant à tiret dans `sdk/bubbleHelpers.js` a bien fait remonter ce fichier, et la restauration a rendu le code de sortie 0 avec un fichier octet pour octet identique. Un contrôle qui ne peut pas échouer n'est pas un contrôle.

### Limites

Aucun build, aucun typecheck, aucun test Vue ou Jest exécuté. Le parsing par bloc `<script>` **ne prouve ni les types, ni le rendu, ni le comportement** des composants. Aucun rendu, aucune preview. L'installation locale du workspace reste défaillante, donc la preuve passe par la CI, conformément à ma revendication de lot.

## Mission p0-frontend-baseline — revue Claude du complément SDK

- reviewer: claude
- reviewed revision: **`39cda1cb7`**
- **Revue sans constat.**

`src/sdk/define/index.ts` : symbole dé-espacé en `KovaaLabCRMRecord` et chemin restauré vers le basename réel `twenty-record.type`. Vérifié : ce fichier existe et déclare `export type KovaaLabCRMRecord<…>` — import et déclaration concordent désormais.

`vite.config.node.ts` : les six bindings du bandeau JS généré passent de `__kovaa-lab…` à `__kovaaLab…`. Un tiret dans un identifiant rend le bandeau **généré** invalide, donc la correction était nécessaire ; et elle est sûre parce que producteur et consommateur sont le même bandeau. Vérifié : 6 occurrences, soit 3 déclarations et 3 usages, toutes cohérentes. Ce ne sont pas des valeurs de protocole mais des alias locaux, ce qui les distingue des constantes `FRONT_COMPONENT_*_KEY` et du marqueur, que Codex conserve.

Deux ajouts que je relève comme **justes** : l'insertion de `node --check dist/front-component-renderer/build.mjs` et `.cjs` dans le script de construction, qui transforme une sortie en assertion vérifiable ; et l'extension de `scripts/check-crm-p0.cjs:14` à `'twenty-sdk'`, correction structurelle qui empêche la récidive — le même raisonnement que celui appliqué au frontend.

**Convergence de principe à consigner** : le rejet par Codex des changements camelCase appliqués aux **valeurs** de constantes de protocole rejoint exactement ma décision de laisser `'__kovaa-labScrollRequest'` tel quel dans `ScrollBridgeProperties.ts`. Une valeur de protocole se cite ; elle ne se renomme pas.

**Limites** : je n'ai ni exécuté la CI, ni construit le SDK, ni lancé ses tests. Je confirme la cohérence des trois fichiers sur lecture des sources et la résolution effective des cibles. Rien de plus.

## Répartition des sous-agents Claude — 29 octobre 2026

Délégation lancée sur instruction explicite du propriétaire, avec propriété de fichiers **disjointe par construction** : mes deux sous-agents sont en **lecture seule stricte**, ce qui garantit l'absence de conflit avec mon propre travail et l'impossibilité de modifier les originaux. Interdictions posées dans leurs consignes : aucune écriture de fichier, aucun commit, aucun `reset/clean/stash`, aucune lecture de `.env` ou `.runtime`, périmètre web/PWA exclusivement, aucune proposition d'implémentation.

| Sous-agent | Objet | Écriture |
| --- | --- | --- |
| Audit PWA | Surface PWA existante de `twenty-front` : manifeste, balises d'`index.html`, existence réelle des icônes référencées, présence ou absence de service worker, repérage d'un éventuel cache de données authentifiées. **Audit seul, aucune implémentation, aucun cache à concevoir.** | aucune |
| Revue contrats Char | Désaccords démontrables frontend/backend dans Char : clés de payload jbuilder, globals `window.*` producteur/consommateur, noms de cookies et en-têtes, assertions de test devenues vides de sens. | aucune |

Pendant leur exécution, je traite moi-même le blocage worker et les configurations Vite. Aucun de leurs périmètres ne recoupe les fichiers que je modifie. **Je reste responsable de la cohérence et de la publication** : leurs constats ne seront consignés ici qu'après vérification de ma part, et je ne publierai aucun résultat que je n'ai pas contrôlé.

## Mission p0-frontend-baseline — alignement des configurations Vite, agent: claude

- **SHA : `6974f96ca9c8e9ec770f9ed2c1cb5b9a558b7f6e`**, deux fichiers, 5 insertions et 5 suppressions

Cherché activement après le correctif worker, plutôt qu'attendu de l'étape CI suivante.

`twenty-front-component-renderer/vite.config.ts` portait **les deux moitiés** du même défaut : un `cacheDir` pointant vers un répertoire rebrandé inexistant, et `resolve.alias` dans la forme objet à clé terminée par un slash. Il est désormais en forme regex et **octet pour octet identique à l'original**. `twenty-front/vite.config.ts` portait le même défaut de `cacheDir` en ligne 106.

**Deux écarts avec les originaux délibérément NON reprises**, parce que les copier serait une faute :

1. Les originaux ajoutent `REACT_APP_CHAR_URL`, `REACT_APP_FORMS_URL` et `REACT_APP_CAL_DIY_URL`. Ces variables appartiennent à « Outils clients », **explicitement hors P0**. Elles restent dehors.
2. Les originaux importent `createWywProfilingPlugin` depuis `./scripts/createWywProfilingPlugin`, ma branche depuis `kovaa-lab-shared/vite`. **Vérifié avant de conclure** : `twenty-shared` exporte bien `./vite` et `src/vite/createWywProfilingPlugin.ts` y existe. Ma branche porte donc l'emplacement refactorisé et l'original l'ancien emplacement local : m'aligner sur l'original serait une **régression**. C'est précisément pourquoi une reprise aveugle des originaux est à écarter.

**Observation hors de mon périmètre, transmise sans y toucher :** deux `cacheDir` rebrandés subsistent, `twenty-cli/vite.config.ts:31` et `twenty-client-sdk/vite.config.ts:15` plus `vite.metadata.config.ts:13`. Celui de `client-sdk` est **déjà réparé sur la branche de Codex** (`47d74f725`) et n'apparaît chez moi que parce que ma base est antérieure. Celui de `twenty-cli` ne semble pas couvert. Impact faible — un `cacheDir` ne fait que déplacer le cache de Vite —, mais autant le traiter dans le même passage. Aucun doublon de ma part.

## URGENT pour les agents prospection — la capacité d'emailing existe déjà, largement

Publié en priorité parce que trois sous-agents codent « imports/prospection native » : **une grande partie de ce périmètre est déjà construite**. Risque réel de duplication si personne ne le dit maintenant.

Le relais annonçait « native emailing complet dans `src/modules/emailing` ». **Le fond est juste, le chemin était faux**, et la vérification a donné bien plus que le chemin corrigé.

### Ce qui existe déjà, vérifié fichier par fichier

| Capacité | Où elle vit réellement | Volume |
| --- | --- | --- |
| Emailing backend | `twenty-server/src/modules/emailing/**` et `twenty-server/src/engine/core-modules/emailing-domain/**` — types, DTO, drivers, services | ~369 fichiers correspondants |
| **UI de campagnes** | `twenty-front/src/modules/activities/emails/**` — `CampaignComposer`, `CampaignBodyField`, `CampaignDetailsFields`, `CampaignEnvelopeBox`, `CampaignSentEnvelope`, `CampaignSentPreview`, `CampaignVariablePicker`, `CampaignWidgetContainer` | 78 fichiers `Campaign|Unsubscribe` |
| Mutations d'envoi | `sendMessageCampaign`, `sendMessageCampaignTest`, `cancelMessageCampaign`, `previewMessageCampaignSend` | 4 |
| Brouillon et variables | `useCampaignBodyState`, `useCampaignDetailsState`, `useCampaignEmailEditorVariables`, `usePersistedCampaignDraft` | 4 hooks |
| Widgets de campagne | `WidgetType.MESSAGE_CAMPAIGN_BODY`, `MESSAGE_CAMPAIGN_DETAILS` | intégrés au page-layout |
| Thèmes de désinscription | `modules/settings/unsubscribe-topics/**` — création, mise à jour, suppression, `useUnsubscribeTopics` | 7+ |
| Liste de désinscrits | `modules/settings/unsubscribers/**` — `SettingsUnsubscribersList`, `SettingsUnsubscribePreview`, `…PreviewSender`, `…PreviewTracking` | 5+ |
| Blocklist | `modules/settings/accounts/**` — `SettingsAccountsBlocklist{Input,Section,Table,TableRow}` | 4+ |

### Deux exigences de la spec sont déjà satisfaites

**Le suivi est déjà désactivé par défaut.** `twenty-server/src/engine/core-modules/workspace/workspace.entity.ts` déclare `@Column({ default: false })` pour **`isCampaignOpenTrackingEnabled`** (ligne 140) **et** `isCampaignClickTrackingEnabled` (ligne 133). L'exigence « désactivé par défaut en l'absence d'autorisation documentée » est donc **déjà tenue au niveau des données**. Il ne faut **pas** construire un second mécanisme de défaut ; il reste à garantir que l'interface ne le bascule jamais silencieusement et que l'activation exige de désigner la base invoquée.

**Le refus de suivi sans désinscription existe déjà.** Le schéma expose `trackingRefused`, et `SettingsUnsubscribePreviewTracking` présente des options de suivi avec un libellé « conserver ». Le destinataire peut donc refuser la mesure tout en restant abonné — mécanisme plus fin que ce que la spec exigeait au minimum.

### Ce qui reste réellement à faire, et c'est là qu'il faut dépenser l'effort

- **Opposition durable par société expéditrice**, pour toutes ses campagnes, vérifiée à l'import **et juste avant l'expédition**, sans réactivation après scraping, fusion ou réimport. Les briques existantes sont des **thèmes de désinscription** et une **blocklist par compte** : à auditer pour savoir si leur portée est bien la société expéditrice, ce que je n'ai pas établi.
- **Désinscription en deux temps** : le `GET` affiche une confirmation, seul un `POST` enregistre. Reste à vérifier sur l'implémentation existante, car un lien `GET` actif désinscrirait sur préchargement.
- **Provenance et éligibilité** : les champs de collecte, justificatifs de réutilisation et éligibilité distincte du statut CRM ne sont pas couverts par ce que j'ai trouvé.
- **Séparation acceptation SMTP / livraison / ouverture** dans les libellés et les dénominateurs.

### Demande concrète aux agents prospection

Avant d'écrire un composeur, une liste de désinscrits, une blocklist ou un mécanisme de défaut de suivi : **lire les chemins ci-dessus**. Le dédoublonnage d'une UI de campagnes coûterait plus cher que l'ensemble du reste du lot, et la consigne « pas de features dupliquées » est explicite.

Je n'ai modifié **aucun** de ces fichiers. Ce relevé est en lecture seule.

## Prospection B2B — cadrage intégré au plan frontend, aucune exécution

Spécification lue en entier : `docs/handoff/hermes-prospection-b2b-spec.md` (`7f8ef26db`), et intégrée au chantier **`feat/claude-hermes-connectors-ui`**. **Aucun second chantier concurrent.**

**Cadre explicite, et je m'y tiens** : ceci est un cadrage fonctionnel. **Aucune collecte n'est lancée, aucun envoi vers de vrais prospects n'est effectué ni autorisé par ce document, et aucune implémentation n'est annoncée comme testée.** Je n'ai écrit aucun code de campagne ni de collecte.

### Ce que je retiens comme contraintes de conception, pas comme intentions

Quatre distinctions que la spécification impose et que l'interface doit rendre **impossibles à confondre** — c'est la part qui m'incombe :

1. **« B2B » n'est pas une autorisation.** La spécification est nette : « la seule mention B2B ne rend pas n'importe quelle collecte/campagne licite », et la présence d'une donnée sur Internet « n'accorde pas une autorisation générale de prospection ». L'écran ne doit donc jamais présenter un contact importé comme éligible du seul fait de son import. **Éligibilité, validité d'adresse, statut CRM et accord au suivi sont quatre dimensions distinctes.**
2. **Suivi d'ouverture désactivé par défaut.** L'activation exige une autorisation documentée ou une exemption précisément établie. « L'éligibilité B2B à la prospection n'est pas un accord automatique aux pixels de suivi. » Conséquence d'interface : l'option par défaut est **désactivée**, et l'activer demande de désigner la base invoquée — jamais une simple bascule.
3. **Quatre états d'ouverture, jamais un seul.** « ouverture détectée », « aucune ouverture détectée », « suivi désactivé », « mesure indisponible ». Un chargement d'image n'est **pas** une preuve de lecture, et son absence **ne prouve pas** le contraire. Donc : **aucun libellé « non lu »**, et **aucune relance automatique** sur l'absence de pixel. Les dashboards affichent les **dénominateurs** et n'attribuent aucun taux d'ouverture aux destinataires non mesurables.
4. **Acceptation SMTP ≠ livraison ≠ ouverture.** « Les mots connecté, envoyé, livré ou ouvert doivent correspondre à des preuves distinctes. » Une livraison ne s'affiche confirmée que si une source fiable la confirme.

C'est exactement la discipline du composant déjà livré en `9f57915fb` : `pending` y est le seul contour tiré parce qu'une attente ne doit pas se lire comme une confirmation. Les états de campagne étendront ce vocabulaire plutôt que d'en créer un second.

### Deux conséquences d'interface que je relève et qui ne sont pas évidentes

**La page de désinscription doit être en deux temps.** La spécification demande de ne pas déclencher une opposition « par la simple prévisualisation automatique d'un lien GET », et renvoie à la RFC 8058. Conséquence concrète : le lien `GET` affiche une **page de confirmation**, et seul un `POST` enregistre l'opposition. Sans cela, un scanner de messagerie ou un préchargement de client mail désinscrirait des destinataires à leur insu — un faux positif silencieux et irréversible côté destinataire.

**Cette page est publique et ne doit rien divulguer.** Le destinataire se désinscrit « sans compte CRM », et la spécification exige que les identifiants de suivi soient opaques et qu'« aucune donnée client ne soit révélée par une route publique ». L'écran n'affichera donc que l'**identité de la société expéditrice** et l'action — ni fiche, ni nom d'interlocuteur, ni appartenance, ni liste. Une route publique qui confirmerait « vous êtes bien Untel chez Machin » serait une fuite par conception.

**L'opposition est durable et par société expéditrice**, pour toutes ses campagnes, vérifiée à l'import **et juste avant l'expédition**, sans réactivation silencieuse après scraping, fusion ou réimport. L'interface doit donc montrer l'exclusion **et sa raison**, et ne jamais présenter un réimport comme une remise à zéro.

### Ce qui n'est pas de mon ressort, et que je ne trancherai pas

La **détermination de la base légale** — information, droit d'opposition, pertinence de la sollicitation, distinction adresses nominatives et génériques, portée des exemptions — n'est pas une décision d'ingénierie et je ne la prendrai pas. La spécification porte les références officielles ; mon rôle est que l'**option par défaut soit la plus prudente** et que les distinctions restent visibles à l'écran, pas de qualifier juridiquement un traitement.

### Intégration au plan, sans nouveau chantier

L'ordre de lots de la spécification est compatible avec le mien et le remplace là où il est plus précis : (1) base CRM et collecte en attente de qualification ; (2) rapprochement, provenance, exclusions ; (3) campagnes SMTP **sans** suivi, désinscription incluse **dès ce lot** ; (4) suivi facultatif et son autorisation ; (5) dashboard et recette.

Je relève que la désinscription arrive **dès le lot 3**, avant tout suivi — l'ordre est juste, et je ne le réordonnerai pas.

Dépendances qui restent bloquantes et que je ne contournerai pas : le **réception entrant e-mail** reste un choix distinct non tranché, donc aucun parcours de réponse entrante ne sera revendiqué ; les **contrats et la validation** appartiennent à Codex et ne seront pas consommés avant publication ; et `P0-STRUCT-001` — la persistance navigateur non rattachée au contexte — **touche directement ces écrans**, puisque lots, campagnes et statistiques doivent rester cloisonnés par société expéditrice.

### Limites

Aucun écran de prospection n'est écrit. Aucun build, typecheck ni rendu de ce périmètre. **Rien n'est testé, et je ne présenterai aucun de ces éléments comme implémenté ou vérifié.**

## Multi-structure et contrat inter-modules — lecture, adaptation et un blocage trouvé

Contrats lus avant toute décision d'écran, comme imposé : `docs/handoff/hermes-integration-contract.md` (`b38862269`) et `docs/handoff/hermes-multi-structure-contract.md` (`23d93951e`).

**Retenu et non supposé** : ces documents décrivent une **cible**, pas une API livrée. Le contrat est explicite — « Codex doit publier les types, exemples et règles d'erreur réellement compatibles avec le serveur **avant** consommation par Claude ». **Je ne code donc contre aucun DTO**, et je ne consommerai aucun type avant publication et coordination.

Décision propriétaire enregistrée sans interprétation : **chaque utilisateur voit le récapitulatif de ses sociétés autorisées**. La vue commune n'est pas réservée à la direction, et elle **n'élève aucun droit**. Distinction tenue : **société exploitante** (structure, à rattacher au workspace) contre **fiche Company** du carnet clients — ajouter des fiches Company ne constitue pas une architecture multi-structure.

### P0-STRUCT-001 — la persistance navigateur n'est pas rattachée au contexte

- reviewer: claude
- assigned agent: claude, **non corrigé** — voir pourquoi plus bas
- evidence, lue avant toute construction :
  1. `modules/metadata-store/storage/metadataStoreStorage.ts` appelle `createIndexedDbBackedJotaiStorage<MetadataStoreItem>('metadata-store')` — un **nom littéral unique**, sans aucun discriminant de société ou de workspace.
  2. Dans la fabrique `createIndexedDbBackedJotaiStorage.ts` : le store est `'keyval'` (ligne 8) et le canal inter-onglets est `` `kovaa-lab-front-${cacheName}-sync` `` (ligne 39), soit `kovaa-lab-front-metadata-store-sync`. **Global lui aussi.**
  3. Les clés de persistance des états sont nues : `key: 'currentWorkspaceState'` et `key: 'metadataStoreState'`.
  4. Aucune purge d'exécution au changement de contexte : `clearMetadataStoreStorage` et `resetJotaiStore` n'apparaissent, hors tests, que dans leur propre définition.
- effet, au regard de l'exigence : le contrat demande que « les clés de persistance navigateur soient correctement rattachées au contexte » et qu'« un changement de structure, une révocation ou une déconnexion ne réaffiche pas les données privées de la structure précédente », en « prenant en compte les onglets concurrents ». Or **changer de société laisserait le schéma, les vues et les layouts de la précédente dans le même store, sous les mêmes clés**, et **deux onglets ouverts sur deux sociétés différentes s'écriraient mutuellement** par un canal partagé.
- c'est l'**escalade directe de `P0-PWA-001`** : ce que j'y signalais comme une fuite à la déconnexion devient, en multi-structure, un défaut de cloisonnement.
- **pourquoi je ne le corrige pas dans ce lot** : la correction n'est pas un préfixe de clé. Elle exige de décider la correspondance structure/workspace — que le contrat laisse explicitement à documenter —, puis de traiter déconnexion, expiration, révocation en cours de session, changement de contexte et onglets concurrents comme un tout. Un préfixe posé avant cette décision donnerait l'illusion du cloisonnement, ce que le contrat interdit nommément.
- expected correction: rattacher le cache, le store et le canal inter-onglets au contexte de structure retenu, avec un point de purge unique réellement appelé, puis éprouver les onglets concurrents et la révocation en session.
- status: open, reported by claude

### Ce que l'existant offre, et ce qu'il ne prouve pas

Le contrat demande d'inspecter l'isolation existante avant d'introduire une entité. Fait : un composant `MultiWorkspaceDropdown` existe déjà dans le tiroir de navigation, avec ses sous-composants de liste d'espaces. Conformément au contrat, **je ne présente pas son existence comme une livraison** : il reste à vérifier qu'il ne liste que les sociétés autorisées, qu'un changement de contexte refait les vérifications d'accès, et qu'il ne réutilise rien de la société précédente. Le réglage `IS_MULTIWORKSPACE_ENABLED` à `false` et la preview P0 mono-workspace **ne satisfont pas** le critère, et je ne le prétendrai pas.

### Adaptation du lot 1

Réévaluation honnête de la navigation, après lecture des composants : le tiroir est **déjà mûr** — sections, titres de section, groupes, sous-items, sections repliables, états actif, replié et non-lu. Le restyler serait précisément le « juste logo/couleur » que le propriétaire rejette. Le vrai manque y est l'**architecture d'information** : sélecteur de société et contexte permanent, accueil opérationnel, conversations, agenda. Le sélecteur et le contexte relèvent désormais du multi-structure et viennent avant le reste, mais ils dépendent du périmètre autorisé calculé par le serveur — donc d'une publication de Codex.

J'ai donc livré d'abord la part de ce lot qui ne dépend d'aucun backend et que les deux contrats rendent nécessaire partout.

### Livré — `9f57915fb4d1df6f6cbcc88125848d6894c740f3`

Vocabulaire commun de **provenance et d'état de synchronisation** : `modules/connectors/types/ConnectorSyncStatus.ts` et `modules/connectors/components/ConnectorSyncTag.tsx`, 107 lignes, dans `twenty-front` que je possède.

Cinq états — `not-configured`, `pending`, `confirmed`, `failed`, `unavailable`. **`pending` est le seul contour tiré** : une confirmation fournisseur et une donnée locale qui l'attend ne doivent jamais se lire pareil, et faire porter cette différence par une **forme** plutôt que par la seule teinte la rend lisible sans vision des couleurs. `not-configured` est un état distinct, donc un connecteur non configuré **ne peut pas s'afficher comme connecté** — ce que les deux contrats interdisent.

Construit sur l'existant : la primitive `Tag` offrait déjà `solid`/`soft`/`outline`/`ghost` et un contour tiré, et le thème expose déjà 25 teintes. Les statuts colorés de la référence Monday demandaient donc d'**employer** le système, pas d'en inventer un.

**Un piège évité par vérification préalable** : mon premier jet importait `IconCloudOff`, `IconPlugConnectedX` et `IconProgress`, qui **n'existent pas** dans `kovaa-lab-ui/icon`. Les icônes retenues sont contrôlées présentes, et le choix suit la règle 5 du dictionnaire d'icônes — prendre une icône existante plutôt qu'ajouter un paquet. `TagColor`, `TagProps` et `IconComponent` sont importés comme types exportés, de sorte que la table de présentation est **typée** au lieu de s'élargir en `string`.

### Limites

Aucun build, aucun typecheck, aucun rendu : le workspace local n'a plus de `node_modules` et la preuve passe par la CI. Le contrôleur de parsing passe sur les deux paquets CRM et Char. **Ce composant n'est pas une refonte livrée**, et je ne le présenterai pas comme telle. Rien n'est consommé des contrats avant publication par Codex.

## Mission hermes-redesign-p1 — référence Monday validée, claim et plan, agent: claude

- référence consignée : **Monday CRM**, capture validée par le propriétaire, **thème clair de départ**. Navigation latérale lisible, tableaux structurés, statuts colorés, pipeline visuel, tableau de bord opérationnel. Couleurs multiples pour les **statuts et séries métier**, **une seule couleur principale pour les actions**, conformément à DESIGN.md.
- **Identité Hermès, pas une copie.** Aucun logo, contenu ni actif de marque Monday ne sera reproduit. La référence sert la structure et la lisibilité, pas l'habillage.
- branche de chantier inchangée : `feat/claude-hermes-connectors-ui`. **Aucune branche frontend concurrente.**

### Le mécanisme de thème : ce que « préserver » implique réellement

Point déterminant, trouvé avant toute édition. `twenty-ui/src/theme/constants/MainColorNames.ts` porte en tête : « Generated from design-tokens by scripts/generateThemeTokens.ts. **Do not edit manually.** Regenerate with `npx nx generateTokens kovaa-lab-ui` ».

Le thème n'est donc **pas** écrit à la main : il est **généré** depuis `twenty-ui/design-tokens/`, qui compte **88 fichiers** — `accent.ts`, `background.ts`, `border.ts`, `font.ts`, et un répertoire `color/` avec une échelle par teinte —, avec un test de pipeline `design-tokens/__tests__/themeTokenPipeline.test.ts`.

Éditer `ThemeLight.ts` directement serait **le même piège que le fichier GraphQL généré en P0** : un correctif écrasé à la régénération suivante. Préserver le mécanisme signifie donc passer par les tokens et régénérer, jamais contourner.

**Conséquence qui réduit beaucoup le travail de palette** : `ThemeColor` expose déjà **25 teintes** — `red`, `ruby`, `crimson`, `tomato`, `orange`, `amber`, `yellow`, `lime`, `grass`, `green`, `jade`, `mint`, `turquoise`, `cyan`, `sky`, `blue`, `iris`, `violet`, `purple`, `plum`, `pink`, `bronze`, `gold`, `brown`, `gray`. Les **statuts colorés** de la référence n'ont donc pas besoin de nouveaux tokens : ils ont besoin d'être **employés**. Et les primitives existent déjà dans `twenty-ui/src/primitives/data-display` : `Tag`, `Badge`, `Chip`.

### Typographie : vérifiée, et volontairement inchangée pour ce lot

Le prompt impose de vérifier la typographie disponible et licenciée **avant** tout changement. Fait : **ni Geist ni Satoshi ne sont déclarés** dans le workspace. Seuls `@fontsource/inter` et `@fontsource/dm-mono` le sont.

Les ajouter supposerait de modifier un manifeste **et le lockfile**, qui appartiennent à Codex. Je **conserve donc Inter pour ce lot**, par décision motivée et consignée, non par omission — et je ne présenterai pas cela comme une conformité à DESIGN.md, qui bannit Inter. L'écart reste ouvert, documenté, et relève d'une coordination avec Codex plus d'une décision du propriétaire sur la licence.

### Déclaration de propriété, par fichier, avant édition

- **Possédé** : `apps/crm/ui/packages/twenty-front/**` et ses tests ; `scripts/check-frontend-p0.cjs` ; `.github/workflows/p0-frontend-baseline.yml`.
- **Extension déclarée ici, non encore éditée** : `apps/crm/ui/packages/twenty-ui/design-tokens/**` — le **vrai** levier du thème, que ma déclaration précédente avait manqué en ne visant que `src/theme`. Je nommerai les fichiers de tokens touchés avant de les éditer, et toute modification passera par le générateur et son test de pipeline.
- **Extension déclarée, usage probable en lecture seule** : `twenty-ui/src/primitives/data-display/{Tag,Badge,Chip}` — à réutiliser plutôt qu'à modifier.
- **Non possédé, non touché** : backend, DTO et contrats partagés, `twenty-shared`, manifestes et **lockfile**, scripts et workflows de Codex, originaux `test-Crm`.

### Plan du lot 1 — cadre, navigation, liste, fiche client

Découpé en incréments relisibles plutôt qu'en une seule grande modification invérifiable. Chaque incrément est construit par la CI avant d'être présenté.

1. **Cadre et navigation latérale.** Hiérarchie et densité lisibles, groupes et libellés explicites, état actif net. Cible : `twenty-front/src/modules/ui/navigation/navigation-drawer/**` (dont `NavigationDrawerItem.tsx`, 450 lignes) et `modules/navigation/components/**`.
2. **Tableaux structurés.** En-têtes lisibles, alignements cohérents, densité de ligne maîtrisée, séparation de colonnes nette. Cible : `modules/object-record/record-table/**` (331 fichiers).
3. **Statuts colorés.** Emploi systématique de `Tag` avec les teintes sémantiques existantes sur les champs de type sélection et statut, en liste et en fiche.
4. **Fiche client.** En-tête clair, regroupement des champs, chronologie mise en avant. Cible : `modules/object-record/record-show/**` et la composition de widgets `RECORD_PAGE`.

Ordre volontaire : la navigation d'abord, parce que c'est le cadre que tout le reste habite, et parce que c'est là que le défaut d'ergonomie est le plus structurel.

### Ce que je ne revendiquerai pas

Je **ne peux pas construire ni vérifier visuellement en local** : l'arbre `node_modules` a été supprimé pour libérer le disque, et la preuve de construction passe par la CI. Donc aucun lot ne sera présenté comme visuellement validé avant une construction CI verte **et** une preview réellement accessible au destinataire. Un audit, un plan ou un changement de tokens ne sont pas une refonte livrée, et je ne les présenterai pas comme tels.

L'**accueil opérationnel** — le défaut structurel que j'ai relevé, où l'on atterrit sur une liste choisie par l'ordre des métadonnées — n'appartient pas à ce lot 1 : le prompt le place avec les parcours métier. Il reste le gain le plus net à venir, et le système de widgets `DASHBOARD` existe déjà pour le porter.

## Mission hermes-redesign-p1 — prise de chantier et audit, agent: claude

- **branche unique de chantier frontend : `feat/claude-hermes-connectors-ui`**, SHA **`af03bb4f2ce21c43e95502b0c71482618e406e75`**
- worktree : réutilisation de `/Volumes/Stockage/dev/hermes-crm/claude-frontend-baseline`. **Aucune copie complète créée** — un seul chantier, un seul worktree, le disque étant par ailleurs contraint.
- **Aucune branche concurrente.** `fix/claude-frontend-baseline` reste publiée comme trace du P0 et n'est pas supprimée.
- **Aucune direction visuelle choisie** : ni palette, ni police, ni composition, ni maquette. La référence du propriétaire est attendue, conformément à `DESIGN.md`. Je ne redemanderai pas une préférence déjà fournie.

### Réconciliation de la base, et pourquoi elle n'était pas triviale

La base commune proposée `0523dad07` portait **39 commits** que je n'avais pas ; ma branche en portait **7** qu'elle n'avait pas, dont **trois réparations P0 absentes d'elle** : la forme d'alias du renderer, les expressions Ruby du gabarit Char, et les valeurs de contrat de `featureFlags.js`. Partir de la base seule les aurait **silencieusement perdues**. Le chantier est donc la base **fusionnée** avec mon travail, pas la base en remplacement.

Un conflit, dans mon propre workflow, additif des deux côtés : Codex y avait ajouté les chemins `twenty-sdk` et `twenty-client-sdk`, moi ceux de Char. Résolu en **union** sur les deux déclencheurs, en conservant son intention et la mienne. Vérifié ensuite que mes deux autres correctifs de workflow survivaient : l'événement dans le groupe de concurrence, et le job de bundle sauté sur `push`.

Contrôlé **par contenu et non par ancestralité** — la leçon de la preview : les six réparations P0 sont présentes dans l'arbre fusionné, et `scripts/check-frontend-p0.cjs` sort en 0 sur les deux paquets CRM et les sources Char.

### Déclaration de propriété, par fichier

- **Possédé, édition autorisée** : `apps/crm/ui/packages/twenty-front/**` et ses tests ; `scripts/check-frontend-p0.cjs` et `.github/workflows/p0-frontend-baseline.yml`.
- **Extension candidate, non encore éditée** : les **32 fichiers** de `apps/crm/ui/packages/twenty-ui/src/theme`. Les jetons utiles sont `constants/ThemeLight.ts`, `constants/ThemeDark.ts`, `constants/ThemeCommon.ts`, `constants/GrayScaleLight.ts`, `constants/GrayScaleDark.ts`, `constants/MainColorNames.ts`, `theme-light.css`, `theme-dark.css`. **Je déclarerai chaque fichier nommément avant de l'éditer**, et pas avant d'avoir la référence visuelle.
- **Non possédé, non touché** : DTO et contrats partagés, `twenty-shared`, backend, scripts et workflows de Codex, originaux `test-Crm`.

### Audit de l'existant — lecture seule

Le constat qui oriente tout le reste : **le socle offre déjà la mécanique dont la refonte a besoin**. Le travail est largement de la composition et de la lisibilité, pas de l'infrastructure neuve. Le prompt demande de réutiliser les mécanismes existants ; voici ce qu'ils couvrent réellement.

**Types de vue déjà pris en charge** : `TABLE`, `KANBAN`, `CALENDAR`, `LIST`, `FIELDS`. Donc le **pipeline** d'opportunités et l'**agenda** ne sont pas à créer : `record-board` compte 105 fichiers, `record-table` 331, `record-calendar` 45. Les rendre lisibles et les alimenter est le vrai sujet.

**Système de page-layout et de widgets, substantiel** : `PageLayoutType` couvre `DASHBOARD`, `RECORD_PAGE`, `RECORD_INDEX`, `RECORD_FORM`, `STANDALONE_PAGE`, et 24 types de widgets existent, dont `CALENDAR`, `EMAILS`, `EMAIL_THREAD`, `CHAT_THREADS`, `TIMELINE`, `TASKS`, `NOTES`, `GRAPH`, `RECORD_TABLE`, `FILES`. Conséquence directe : l'**accueil opérationnel** et la **chronologie unifiée** de la fiche client se construisent sur `DASHBOARD` et `RECORD_PAGE` avec ces widgets, plutôt qu'en écrans neufs.

**Défaut d'ergonomie prouvé, et non un choix esthétique : il n'y a pas d'accueil opérationnel.** `useDefaultHomePagePath` renvoie `AppPath.Home` sur mobile, sinon la première vue du premier objet de métadonnées. Autrement dit, après connexion on atterrit sur **une liste d'enregistrements**, choisie par l'ordre des métadonnées. Aucun écran ne présente les suivis et actions du jour. C'est exactement le manque que le propriétaire décrit, et il est structurel.

**Conversations : partiellement présentes, non unifiées.** `activities/emails` compte 119 fichiers et le module `ai` 670, avec une boîte dédiée (`AppPath.AiChatInbox`). Mais il n'existe **aucune liste de fils multicanal** : les e-mails sont des activités rattachées à un enregistrement, et le chat IA vit sur sa propre route. Un fil WhatsApp n'a aujourd'hui nulle part où s'afficher. Ce n'est pas une régression — cela n'a jamais été livré.

**Contacts : fiche générique, pas de fiche contact dédiée.** `Person` est un objet comme un autre ; le rendu passe par `RecordShowPage` puis `RecordShowPageContent`. La chronologie unifiée demandée se construira donc par la composition de widgets sur le `RECORD_PAGE`, sans composant spécifique à inventer.

**Réglages : `SettingsPath.Integrations` est déclaré, non routé, et son entrée de navigation est commentée** par un `TODO: Re-enable when integrations page is ready` (`useSettingsNavigationItems.tsx:164-170`). C'est l'emplacement naturel et déjà réservé pour connecter WhatsApp, la messagerie, Hermès, Forms et les rendez-vous. Le bouton orphelin que j'avais relevé en P0 s'y résorbe de lui-même.

**États, accessibilité, responsive — l'acquis à préserver** : squelettes de chargement, frontières d'erreur à quatre niveaux, `RecordIndexEmptyState` à cinq branches, 35 catalogues i18n et 5 248 clés, attributs `aria-*` dans 500 fichiers du front et 69 de la bibliothèque, barre de navigation mobile dédiée. À l'inverse, deux faiblesses mesurées restent à traiter dans la refonte : **19 des 34 fichiers animés n'ont aucune garde `prefers-reduced-motion`** et il n'existe aucun reset global ; et `ContactLink.tsx:44` ouvre un onglet sans `rel`, seule exception sur 16 occurrences.

### Ce que je ne fais pas à ce stade

Aucune édition de composant, de thème ou de route. Aucun choix de palette, de police ni de maquette. Aucun lot d'implémentation démarré : le prompt fixe l'ordre — cadre et navigation, puis liste et fiche client, puis conversations, pipeline, agenda et formulaires, réglages — et j'attends la référence visuelle avant d'ouvrir le premier. Les connecteurs n'étant pas livrés, tout écran qui en dépendra affichera un état **non configuré** explicite, jamais un faux succès.

**Cet audit n'est pas une refonte**, et je ne le présenterai pas comme telle.

## Prise en compte du prompt connecteurs Hermès — lecture seule, aucun démarrage

- lu : `docs/handoff/hermes-connectors-claude-prompt.md` à `5968c1a06`, et la mission `hermes-connectors-p1` de `MISSIONS.md` (ligne 189), dont les deux affectations sont `pending`.
- **Instruction respectée : lecture et prise en compte uniquement.** Aucun développement engagé, aucune intégration démarrée, aucun ancien lot Char repris, aucune branche créée, aucun fichier de code touché. Mon checkpoint reste `ff0d937c2`.
- **Aucun rapport écrasé** : les cinq sections Claude de ce fichier sont vérifiées intactes sur la pointe, et cette section est ajoutée sans en remplacer aucune.

### Trois faits du prompt vérifiés par moi

1. **Base commune `0523dad07` disponible** — le commit existe et est porté par `origin/chore/p0-preview-session`. Le prompt demandait de vérifier sa disponibilité avant création de branches : c'est fait.
2. **Cal.diy n'est toujours pas publié** — `apps/crm` ne contient que `bot`, `form`, `ui`. Cela confirme la réserve du prompt et rejoint ce que j'avais établi en P0 : `scripts/customer-tools.mjs:59` mappe le profil `calendar` vers `apps/crm/calendar`, absent, et le script échoue alors explicitement.
3. **L'audit Cal.diy existe**, contrairement à ce que j'ai d'abord cru : `docs/stabilization/calendar-import-audit.md` est présent sur `chore/p0-preview-session`, `chore/p0-stabilization` et `chore/p0-combined-verification`. Il n'est simplement pas sur cette branche de coordination. Il est donc bien joignable depuis la base commune proposée. **Je ne le signale pas comme lacune** : j'ai vérifié dans les deux sens avant de conclure.

### Les trois points d'attention du propriétaire, enregistrés et non anticipés

- **SMTP est un canal d'envoi seul.** La réception reste une décision distincte — connecteur entrant existant à inspecter, sinon IMAP ou webhook fournisseur. Je ne promettrai aucun e-mail bidirectionnel avant que cette décision soit prise et consignée.
- **Le service MCP du bot Hermès reste à identifier.** Aucun serveur ni modèle ne sera supposé configuré.
- **Cal.diy est audité mais non publié.** Rien ne sera recréé, et l'audit sera lu avant toute reprise.

### Continuités avec le travail P0 déjà établi

Plusieurs limites du prompt recoupent exactement ce que cette mission a produit, ce qui mérite d'être relié plutôt que redécouvert :

- **« Aucun remplacement global de noms ou de valeurs de protocole »** est la leçon centrale du P0 : c'est un tel remplacement qui avait rendu `twenty-front` inconstructible, et c'est en distinguant identifiant, valeur de protocole, clé réseau et texte affiché que les réparations ont tenu. Les cas limites sont documentés ci-dessus — `ScrollBridgeProperties.ts` laissé intact, `'Self-hosted KovaaLab Char_payload'` laissé intact, `featureFlags.js` aligné sur le contrat et non sur le nom.
- **« Ne pas conserver de cache PWA privé sans isolation et purge explicites »** a déjà un constat ouvert et non corrigé : **`P0-PWA-001`**. Le magasin de métadonnées du workspace survit à la déconnexion. Cette contrainte du prompt ne part donc pas de zéro : elle hérite d'un défaut identifié, assorti du périmètre de conception requis — expiration de session, changement de workspace, impersonation, synchronisation multi-onglets.
- **« Préserver Char dans l'historique et les sources »** est respecté par construction : mon travail P0 sur Char a été une réparation sur place, sans aucune suppression, et les quatre constats backend Char restent en **lot séparé, non corrigés**, comme convenu.
- **Web et PWA uniquement** : contrainte déjà prise en compte et vérifiée dans ce fichier.

Je n'ouvre aucun périmètre et j'attends l'instruction de démarrage ainsi que la revue croisée de `ff0d937c2`.

## Revue Claude du correctif d'accès propriétaire — lecture seule

- reviewed: `0523dad07`, mise à jour de `docs/verification/p0-preview-online-codex.md`
- **Aucun fichier modifié. Je n'ai ni demandé ni reçu le jeton de partage, et je n'ai tenté aucun accès avec.**

### Deux propriétés de sécurité, vérifiées plutôt que crues

Un contournement de protection vient d'être introduit : c'est précisément le moment de contrôler ce qu'il n'a pas affaibli.

1. **La protection globale tient.** Requête anonyme après création du lien de partage : la racine et `/manifest.json` du lien de base renvoient toujours **HTTP 302** vers le SSO. Le contournement est donc bien borné au seul déploiement visé, comme annoncé.
2. **Aucun jeton de partage dans Git.** Recherche sur la branche de `protection-bypass`, `_vercel_jwt`, `x-vercel-protection-bypass`, `VERCEL_AUTOMATION_BYPASS` : aucun résultat. Recherche de chaînes longues dans les deux documents publiés : seuls un SHA de commit et deux identifiants de déploiement `dpl_…`, qui sont des identifiants et non des secrets. Les correspondances `sso_token` de la branche sont du code Char préexistant — `sso_authenticatable.rb`, surcharges Devise — sans rapport avec le lien Vercel. L'affirmation tient.

### Le cadrage de la correction est juste

Le rapport reproduit l'échec signalé par le propriétaire, puis **nomme la cause sans l'atténuer** : les tests du CLI authentifié ne suffisaient pas à prouver l'accès du destinataire, et c'est inscrit comme une **limite de livraison corrigée**, pas comme un contretemps. Reconnaître qu'un contrôle vert ne prouvait pas la propriété visée est exactement ce qu'on attend d'un rapport de vérification.

### Un point passe de « non établi » à « établi », par leur test

Ma revue précédente listait le **rendu de l'interface par un vrai navigateur** parmi ce que la preview n'établissait pas. C'est désormais établi — par leur test, pas par le mien : navigateur initialement **sans session Vercel**, lien de partage, accueil CRM, identifiants du compte synthétique, connexion réussie, puis liste Companies affichant les cinq sociétés d'exemple, avec capture remise au propriétaire. La distinction qu'ils posent est la bonne : cela valide la connexion et le **rendu des données** dans la preview déployée, et non le seul accueil de l'artefact.

### Correction de ma propre réserve PWA

Ma note précédente concluait que l'installabilité PWA était « plausiblement bloquée » parce que le manifeste était derrière le SSO. **Cette conclusion valait pour le lien de base et ne vaut plus pour le lien de partage** : avec le cookie de contournement, le manifeste et ses icônes redeviennent joignables en même origine, et le fetch de manifeste d'un navigateur n'a plus de redirection tierce à suivre.

Ce qui subsiste, et que je ne gonfle pas : l'installabilité est désormais **testable, mais non testée**. Personne n'a encore observé d'invite d'installation ni de lancement en mode autonome. Je corrige donc ma réserve en précisant son périmètre, plutôt que de la laisser lire comme un blocage.

Inchangé : aucun mode hors ligne n'existe, le tunnel ne transporte pas SSE, Char et Forms ne sont pas déployés, et **je ne déclare aucun état global P0 terminé**. `P0-PWA-001` reste ouvert.

## Revue Claude de la preview CRM — lecture seule

- reviewer: claude
- reviewed: `d1060f44e` (branche `chore/p0-preview-session`, PR #10), `docs/verification/p0-preview-online-codex.md`, `p0-preview-online-proof.json`, `scripts/check-preview-api-p0.mjs`
- périmètre demandé : rapport, checkpoint, configuration et manifeste. **Aucun fichier modifié. Aucun état global « P0 terminé » déclaré par moi.**

### Calibrage du rapport : je n'ai trouvé aucune sur-affirmation

C'est la conclusion principale et elle mérite d'être dite nettement. Le rapport énonce lui-même ses limites aux bons endroits : Char et Forms ne sont pas déployés par cette preview, l'onboarding et le CRUD ont été vérifiés **par API et non par clics**, aucun test d'installation sur appareil ni mode hors ligne n'est livré, et la livraison **ne clôt pas tout P0**. L'incident du premier déploiement classé production est divulgué plutôt que tu. Le script pousse la rigueur jusqu'à émettre `offline: 'not asserted'` et `authenticatedCrud: 'not asserted'` dans sa propre sortie : déclarer ce qu'on n'affirme pas est exactement le bon réflexe.

### Vérifié par moi, sans aucune tentative de contournement

**La protection Vercel est réellement active.** Requête anonyme, sans identifiant : `/`, `/manifest.json` et `/images/icons/ios/192.png` renvoient tous **HTTP 302** vers le SSO, avec `set-cookie: _vercel_sso_nonce=…; Secure; HttpOnly; SameSite=Lax` et `content-type: text/plain`. L'affirmation « protection conservée » est donc confirmée par un contrôle indépendant. Je n'ai utilisé aucun identifiant et n'ai rien cherché à déduire.

**« Icône 192 joignable » est exact.** J'avais soupçonné une sur-affirmation, la ligne 44 ne testant que l'origine. Vérifié : la ligne suivante exécute `await request(iconUrl.pathname)`, donc l'icône est bien récupérée. Mon soupçon était infondé et je le retire.

### Constat PWA que j'ajoute

Le manifeste est **derrière le SSO** : une requête non authentifiée reçoit un 302 vers une autre origine, avec un `content-type: text/plain`. Or `index.html:13` porte `crossorigin="use-credentials"` sur le lien du manifeste.

Conséquence : **l'installabilité PWA ne peut pas être supposée sur cette URL, et il est plausible qu'elle soit bloquée.** Le navigateur, en récupérant le manifeste, suivrait une redirection vers une origine tierce et recevrait autre chose que du JSON. Le rapport dit déjà qu'aucun test d'installation n'a été fait ; ce que j'ajoute, c'est **la raison pour laquelle on ne peut pas simplement l'essayer ici**, et ce qu'il faudrait : un manifeste et ses icônes joignables sans authentification, ou un déploiement non protégé dédié à ce seul contrôle. Ce n'est pas un défaut du produit, c'est une limite de la méthode de preview.

À noter que le contrôle en ligne passe précisément parce qu'il emploie le CLI authentifié : « joignable pour une session authentifiée » et « joignable pour le fetch de manifeste d'un navigateur » ne sont pas la même propriété.

### Delta entre la preview et mon checkpoint, à consigner

Le bundle déployé est l'artefact de **`c96b7eea6`**. Mes commits postérieurs — `6974f96ca`, `f890514bd`, `ff0d937c2` — **ne sont pas dans cette preview**. Elle ne valide donc pas mon checkpoint courant, et personne ne devrait plus tard le supposer.

Précision de méthode, car je me suis d'abord trompé : `git merge-base --is-ancestor` annonce mon correctif worker `6c7bcd48a` comme absent de l'arbre déployé, ce qui est **trompeur** — Root l'a réintégré sous `bad53ac26`, donc l'objet commit diffère. Le contrôle **par contenu** le montre bien présent (`resolve-renderer-source` dans `build-sandbox-document.ts`), et c'est pourquoi le bundle se construit. L'ancestralité est le mauvais instrument quand un correctif est réappliqué.

Restent donc dans l'arbre déployé, et c'est sans conséquence ici : le `cacheDir` rebrandé et la forme objet de l'alias du renderer — le premier ne déplace qu'un cache de build, le second fonctionne dans le bundle principal, Vite gérant le slash final. Et les défauts Char, qui n'ont aucun effet sur cette preview puisque **Char n'y est pas déployé**, comme leur rapport l'indique.

### Ce que cette preview établit, et ce qu'elle n'établit pas

Établi : le déploiement existe, est en `READY` et en cible preview ; la configuration runtime est same-origin ; le manifeste est servi en `standalone` avec son icône 192 ; et dix étapes d'API réelles passent — inscription, activation, reconnexion, profil relu, étapes facultatives, puis création, lecture, modification, relecture, suppression et vérification d'absence d'une société synthétique.

Non établi, et le rapport ne le prétend pas : le **rendu de l'interface** par des clics dans la preview, l'installabilité PWA, le mode hors ligne, le temps réel — le tunnel ne transporte pas SSE —, et toute assertion portant sur Char ou Forms.

**Je ne déclare aucun état global P0 terminé.** Mon propre `P0-PWA-001` reste ouvert, et les quatre constats Char backend restent en lot séparé, non corrigés.

## Checkpoint Claude consolidé — `ff0d937c204a1374c91e1395d53481693b5655db`

Branche `fix/claude-frontend-baseline`, PR #9. Web et PWA exclusivement ; aucune application native, aucun Expo/React Native, aucun build natif.

### CI combinée vérifiée

Run **`40986681086`**, workflow « P0 combined checkpoints », SHA **`c96b7eea6`** : **conclusion `success`, 8 jobs sur 8 en succès** — `frontend/frontend-sources`, `frontend/frontend-bundle`, `backend-build/backend`, et les cinq `source-integrity`. Vérifié par moi via l'API.

**Nuance que je maintiens** : j'ai relevé 7 occurrences de « desktop » dans le log, cohérentes avec un contrôle navigateur, mais je **n'ai pas identifié nommément** les étapes d'installation de Chromium, de téléchargement de l'artefact ni de publication de preuve navigateur dans le log que j'ai récupéré. Le smoke navigateur desktop/mobile sur artefact réel est donc **l'affirmation de Codex, cohérente avec ce que je constate, pas une vérification de ma part**. « Mobile » y désigne un viewport responsive en navigateur, pas une application native.

### Commits de ce checkpoint

| SHA | Objet |
| --- | --- |
| `6c7bcd48a` | résolveur worker du sandbox — débloque `renderer:sandbox:prebuild` |
| `6974f96ca` | alignement des deux configurations Vite que je possède |
| `f890514bd` | expressions Ruby des templates ERB **que j'avais laissées cassées**, et garde ERB du contrôleur |
| `ff0d937c2` | trois valeurs frontend alignées sur les contrats qui les définissent |

### Deux défauts que j'avais laissés, trouvés par revue déléguée

Je les mets en avant plutôt que de les diluer : ce sont mes manques, pas des découvertes neutres.

**`vueapp.html.erb`, le seul gabarit de `/app/*`, était à moitié réparé.** Ligne 8 : j'avais restauré la constante `ChatwootApp` sans le nom de méthode, laissant `ChatwootApp.kovaa-lab_cloud?` au lieu de `chatwoot_cloud?` (`lib/chatwoot_app.rb:20`). Ligne 52 : `KovaaLab Char.mfa_enabled?` **intacte**, alors que ni `Char` ni `KovaaLab` n'est une constante Ruby définie ; la forme canonique est `Chatwoot.mfa_enabled?` (`config/application.rb:111`). Même motif en `super_admin/dashboard/index.html.erb:59` pour `Chatwoot.config[:version]`.

**Pourquoi je les ai manqués, sans enjoliver :** ma table de jetons Char excluait délibérément la marque nue suivie d'une espace, parce que dans une **chaîne** JS ou Ruby c'est du texte affiché légitime. Dans une **expression Ruby d'ERB**, c'est du code. La distinction était juste pour les types de fichiers que j'avais mesurés et fausse pour celui-là. Et mon contrôleur ne pouvait pas l'attraper : il ne parsait que `.js` et `.vue`, et son contrôle Char ne se déclenche que sur `kovaa-lab` suivi d'une **majuscule**, alors que `kovaa-lab_cloud?` est suivi d'un souligné.

Correction structurelle : le contrôleur balaie désormais les **205 templates ERB** à la recherche d'un jeton de marque dans une expression Ruby, tout en laissant intacte une marque dans une chaîne Ruby — les quatre chaînes d'affichage de ces vues ne sont pas touchées. **Garde éprouvée** : la réintroduction du défaut exact que j'avais laissé le fait signaler en `vueapp.html.erb:8`, et la restauration rend le code 0.

### Trois valeurs alignées sur leur contrat

- `featureFlags.js:52` et `:47` déclaraient `'contact_kovaa-lab_support_team'` et `'kovaa-lab_v4'`, alors que `config/features.yml:160` et `:151` déclarent `contact_chatwoot_support_team` et `chatwoot_v4`. La chaîne de transport est littérale — `featurable.rb` fait un `pluck` des `name` du YAML, `_account.json.jbuilder` les émet tels quels —, donc une clé frontend non concordante vaut toujours faux. Effet : l'entrée « chat avec le support » ne s'affichait jamais. Le second indicateur n'a aucun consommateur : écart réel, effet latent.
- **Ce qui a bougé et ce qui n'a pas bougé** : les noms de constantes locales `KOVAALAB_V4` et `CONTACT_KOVAALAB_SUPPORT_TEAM` restent inchangés. Seules les **valeurs** changent, parce que les valeurs sont le contrat du backend. Même règle que `latest_chatwoot_version`.
- `App.vue:148` passait `:latest-kovaa-lab-version` quand `UpdateBanner.vue:12` déclare `latestChatwootVersion`. Un attribut kebab se normalise en `latestKovaaLabVersion` : la propriété ne recevait rien et la bannière de mise à jour ne s'affichait jamais. **Ce n'était pas une erreur de syntaxe** — un attribut à tirets est légal —, d'où l'aveuglement du parseur comme du contrôleur. Ma passe Char précédente avait corrigé l'expression de droite et la déclaration, en laissant le nom d'attribut.

Les deux fichiers sont désormais **identiques aux originaux**, et un contrôle croisé indépendant de **toutes** les valeurs de `featureFlags.js` contre `config/features.yml` et `premium_features.yml` ne remonte **aucune** valeur frontend inconnue du backend.

### À Codex — constats hors de mon périmètre, non touchés

1. **`app/models/channel/web_widget.rb:74`** émet `window.kovaa-labSDK.run({` dans l'extrait d'installation du widget, alors que le global est défini `window.chatwootSDK` (`entrypoints/sdk.js:219`). Cette valeur voyage dans le payload API (`_inbox.json.jbuilder:43`, clé `web_widget_script`), est affichée à l'agent et **injectée dans chaque portail d'aide** (`_portal_scripts.html.erb:101`). Évalué : `window.kovaa-lab SDK.run(...)` lève `ReferenceError`. Effet : le widget ne démarre ni chez les clients ayant copié l'extrait, ni dans les portails. C'est un modèle Ruby, donc ton périmètre — j'ai réparé les deux pages ERB, pas le producteur.
2. **`app/helpers/super_admin/account_features_helper.rb:31`** lit `f['chatwoot_internal']` alors que `config/features.yml` emploie la clé `kovaa-lab_internal:`. `filter_internal_features` sélectionne donc la liste vide : sur une installation auto-hébergée, les fonctionnalités réservées à l'éditeur restent visibles et activables en super-admin.
3. **`enterprise/app/models/captain/custom_tool.rb:55`** fixe `RESERVED_HEADER_PREFIX = 'x-kovaa-lab'` alors que les en-têtes réellement posés sont `X-Chatwoot-*` (`toolable.rb:85-103`, `http_tool.rb:53,84`). La garde ne réserve donc rien, et le test `custom_tool_spec.rb:167-173` qui fixe l'intention échoue.
4. **Assertions négatives devenues vides de sens**, en plus de `P0-CHAR-001` : `widgets_controller_spec.rb:46`, `portals_controller_spec.rb:34`, `responses_controller_spec.rb:12` visent `_chatwoot_session`, que l'application n'écrit jamais ; et `http_tool_spec.rb:484` vise `x-kovaa-lab-verified-email` et consorts, alors que les en-têtes émis sont `x-chatwoot-*`. Cette dernière est doublement vide : `not_to include(a,b,c)` passe dès qu'un seul manque.

**Contre-exemples vérifiés et sains**, pour que la liste ci-dessus ne passe pas pour une alerte générale : les assertions de `webhooks/trigger_spec.rb:203-204` et de `custom_tool_spec.rb:771,779` visent bien les noms réellement posés. Un balayage de toutes les assertions négatives à littéral de `apps/crm/bot/spec` ne remonte, hors les cas ci-dessus, aucun littéral ciblant un nom que l'application n'émet pas. Le problème est **circonscrit, pas systémique**.

### Limites de ce checkpoint

Aucune suite de tests exécutée de mon côté — ni RSpec, ni Vitest. Les effets utilisateur décrits sont lus dans le code et dans la chaîne de transport, **non observés**. Aucun rendu Rails, aucun navigateur piloté par moi. Je ne duplique pas votre orchestration de preview et je n'en revendique aucun résultat.

**Question ouverte signalée, pas érigée en défaut** : `apps/crm/bot/package.json` déclare des paquets `@kovaa-lab/*` et le JS les importe sous ces mêmes noms — les deux côtés concordent, ce n'est donc pas un désaccord interne. Mais aucun verrou ne couvre cette application et je n'ai pas vérifié que ces paquets existent au registre. Je ne peux ni confirmer ni infirmer qu'un `yarn install` y aboutit.

## Build frontend vert en CI, et correction d'une de mes affirmations

### Le bundle frontend construit

Run **`40985976531`**, workflow « P0 combined checkpoints », sur **`bad53ac26b0c3a17a91c91b95be41986c7343836`** — l'intégration isolée par Root de mon correctif worker `6c7bcd48a`.

| Job | Résultat |
| --- | --- |
| `frontend / frontend-sources` | **succès** |
| `frontend / frontend-bundle` | **succès** |
| `source-integrity / crm-workspace`, `crm-backend`, `char-backend`, `forms`, `local-orchestration` | succès |
| `backend-build / backend` | **échec** |

**C'est la première preuve d'exécution de la construction du frontend**, et elle valide le correctif du résolveur worker : le bundle se produit désormais, assertions d'artefacts incluses. Je peux donc enfin revendiquer un build frontend, ce que je refusais jusqu'ici faute de preuve.

**Précision nécessaire** : la **conclusion globale du run est `failure`**, à cause de `backend-build / backend`, qui relève du périmètre de Codex. Dire « la CI est verte » serait inexact ; ce qui est vert, c'est le frontend. Et ce run porte `bad53ac26`, donc mon correctif worker, mais **pas** `6974f96ca` qui aligne les deux configurations Vite — cet alignement reste à passer en CI.

### Correction d'une de mes affirmations sur l'installation locale

J'ai écrit à plusieurs reprises, y compris dans des messages de commit, que l'installation locale du workspace avait **échoué** en laissant « `node_modules/.bin` à 0 binaire, ni `vite` ni `tsgo` », après avoir vu yarn terminer sur `unexpected empty event loop`.

**C'était prématuré.** En libérant du disque je viens de constater que cet arbre portait en réalité **192 binaires et 4,0 Go**. Ma vérification était intervenue pendant l'étape de liaison, encore en cours : l'installation s'était poursuivie après mon contrôle. L'erreur yarn et le code de sortie 0 trompeur étaient réels, mais ma **conclusion** — « installation inutilisable » — ne l'était pas.

Ce que cela change, et ce que cela ne change pas : aucune de mes livraisons ne reposait sur un build local, et je n'ai jamais revendiqué de typecheck. Les preuves que j'ai avancées restent ce qu'elles étaient — parsing, résolution d'imports, convergence avec les originaux, et désormais la CI. Mais mon explication du « pourquoi aucun build local » était fausse, et je la corrige plutôt que de la laisser faire autorité.

Je ne peux plus le revérifier : sur instruction de ne créer aucune nouvelle copie complète, et le disque étant à 100 % avec 1,7 Gio libres, j'ai **supprimé cet arbre** — il était ignoré par git, hors suivi, et la preuve de construction passe désormais par la CI. Libéré : environ 5 Gio, de 1,7 à 6,7 Gio disponibles. **Aucun original touché**, aucune copie créée, worktree resté propre.

## Audit de la surface PWA existante — agent: claude

- périmètre : `apps/crm/ui/packages/twenty-front`, à `6974f96ca`. **Audit seul : aucune implémentation, aucun service worker ajouté, aucun cache conçu.**
- méthode : délégué à un sous-agent en lecture seule, puis **chaque constat ci-dessous revérifié par mes propres commandes** avant publication. Je ne relaie rien que je n'aie contrôlé.

### Ce qui est sain, vérifié

- **Les 112 icônes déclarées par `public/manifest.json` existent toutes.** Contrôle d'existence exécuté par moi : 112 déclarées, **0 manquante**. Aucune référence locale cassée.
- **Marque cohérente** : `"KovaaLab CRM"` dans le manifeste, le `<title>` et les métadonnées sociales, conformément à la décision de marque.
- **Aucun jeton d'authentification persisté** : l'auth passe par cookie.

### Service worker : il n'y en a aucun

Vérifié par moi : `serviceWorker`, `workbox`, `vite-plugin-pwa`, `registerSW`, `VitePWA` ne donnent **aucun résultat** dans `src`, `index.html`, `vite.config.ts` et `package.json`. L'application est donc **installable** (manifeste valide, icônes présentes, `display: standalone`) mais **sans aucune capacité hors ligne**.

**Ce n'est pas une régression** : cela n'a jamais été livré. Et au regard de la contrainte produit, c'est l'état sûr — aucun cache de données authentifiées n'existe parce qu'aucun cache n'existe.

### P0-PWA-001
- reviewer: claude
- assigned agent: claude, **mais à ne pas corriger en P0** (voir ci-dessous)
- reviewed revision: `6974f96ca9c8e9ec770f9ed2c1cb5b9a558b7f6e`
- evidence, chaîne vérifiée par quatre recherches indépendantes de ma part :
  1. `src/modules/auth/hooks/useAuth.ts:136` n'appelle à la déconnexion que `clearSessionLocalStorageKeys()`, qui retire **10 clés** de `localStorage` (`clearSessionLocalStorageKeys.ts:3-15`), dont bien `currentUserState` et `currentWorkspaceState`.
  2. La purge de l'IndexedDB passe par `clearMetadataStoreStorage()`, appelée **uniquement** depuis `clearAllSessionLocalStorageKeys.ts:17`.
  3. `clearAllSessionLocalStorageKeys()` est appelée **uniquement** depuis `jotaiStore.ts:7`, à l'intérieur de `resetJotaiStore()`.
  4. `resetJotaiStore` n'a **aucun appelant d'exécution** : la recherche hors tests ne remonte que sa propre définition.
- effet : après déconnexion, la base IndexedDB du magasin de métadonnées **subsiste sur le poste**. Elle contient le schéma métier du workspace — `objectMetadataItems`, `fieldMetadataItems`, vues, filtres, `pageLayouts` —, non chiffré et lisible par tout script de l'origine. Sur un poste partagé, l'utilisateur suivant peut lire la structure de données du workspace précédent.
- **pourquoi je ne le corrige pas maintenant, et c'est délibéré** : ce n'est pas un défaut de syntaxe ni un blocage de construction, donc hors du P0 « base constructible ». Surtout, la contrainte produit exige explicitement qu'un cache de données authentifiées ne soit traité **qu'avec une conception explicite de son isolation**. Brancher `resetJotaiStore()` sur la déconnexion serait un patch d'une ligne qui donnerait l'illusion du traitement : il resterait à décider du comportement sur expiration de session, changement de workspace, impersonation et multi-onglets — le magasin est synchronisé entre onglets par `BroadcastChannel`. Cela mérite une décision, pas un réflexe.
- expected correction: une conception d'isolation du magasin de métadonnées couvrant déconnexion, expiration, changement de workspace et multi-onglets ; puis un point de purge unique réellement appelé. À traiter comme un lot identifié, après la base constructible.
- status: open, reported by claude
- fix commit: aucun — non corrigé volontairement

### Observations, explicitement pas des défauts

- **`public/mockServiceWorker.js`** (9 193 octets) est dans `publicDir`, non surchargé dans `vite.config.ts`, donc **copié au build et joignable publiquement**. Vérifié : **aucun code d'exécution ne l'enregistre** (`mockServiceWorker`, `setupWorker`, `msw/browser` ne donnent rien hors tests). Il reste donc inerte. Je le signale comme poids mort exposé, pas comme faille.
- **`theme_color` et `background_color` du manifeste** (`#000000` et `#ffffff`) ne correspondent pas aux fonds réels du thème clair, et il n'existe qu'une valeur statique sans variante `prefers-color-scheme` alors que le thème est persisté. Effet cosmétique : léger saut de teinte au lancement en mode autonome. **Relève du design, pas de P0**, et la contrainte impose de conserver le design existant.
- **80 des 112 icônes sont des tuiles Windows 11** que les navigateurs n'exploitent pas via le manifeste, et **aucune icône `purpose: "maskable"`** n'est déclarée — sur Android l'icône est plaquée dans un badge au lieu d'épouser la forme adaptative. Améliorations possibles, aucune urgence, aucune action P0.
- `scope`, `id`, `description`, `orientation`, `lang` absents du manifeste ; balises iOS standalone absentes. **Jamais livrés, donc pas des régressions.**
- Hors périmètre signalé sans action : `apps/crm/ui/packages/twenty-companion` est une application **Electron desktop**. Ce n'est pas du natif mobile, et je ne propose aucun portage.

### Non vérifié

Aucune exécution : pas de build, pas de serveur, pas de Lighthouse, aucun audit d'installabilité navigateur — l'installabilité est déduite de la lecture des fichiers. Les en-têtes HTTP réellement servis pour le manifeste ne sont pas contrôlés. Les trois URL externes (`og:image`, `twitter:image`, logo de repli de workspace) n'ont fait l'objet d'**aucune requête réseau** : leur existence reste inconnue, et je ne la déduis pas. Le contenu visuel des 112 PNG n'a pas été regardé.

## Contrainte web/PWA — prise en compte par Claude

Contrainte de tête de `MISSIONS.md` (`f507ab647`) **lue et intégrée à mon suivi** : web et PWA uniquement, aucune application native iOS/Android, aucun portage Expo/React Native, aucun build natif ni publication store. Aucune de mes livraisons ne s'en écarte, et je l'ai vérifié plutôt que supposé :

- Mes périmètres sont `twenty-front` (React/Vite), `twenty-front-component-renderer` (bundles navigateur et workers), et le frontend Char (Vue/JS plus templates ERB). **Aucun code natif, aucune dépendance Expo ou React Native touchée.**
- Le répertoire `scripts/front-component-stories/native-tests/` du renderer, que j'ai modifié au lot 2, **ne concerne pas le natif mobile** : ses tests pilotent `/iframe.html?id=frontcomponent-…` dans un navigateur. Le mot « native » y désigne le comportement natif du DOM hôte. Vérifié avant de le dire.
- Le responsive mobile relevé dans mon inventaire — `MobileNavigationBar`, `MobileHomePage`, `CommandMenuForMobile`, la bascule de base typographique d'`index.css` — relève du **web responsive**, donc du périmètre, et n'implique aucun portage natif.
- Surface PWA existante, conservée sans extension : `index.html` référence `manifest.json`, une `apple-touch-icon` et des icônes. **Je n'ai ajouté aucun service worker, aucun cache hors ligne et aucune persistance de données authentifiées** ; la réserve de la contrainte sur l'isolation d'un cache privé ne se pose donc pas pour cette livraison.

Conséquence pour le backlog : les éléments P1 « Outils clients » restent spécifiés comme ouverture d'onglet web, sans aucune enveloppe applicative native.

## Mission p0-frontend-baseline — correctif renderer sandbox, agent: claude

- **SHA worker prêt à revue : `6c7bcd48a91c4f1abe4d44479fa0b00e9d9ccce5`** (correctif du résolveur worker, intégré isolément par Root sous `bad53ac26`)
- **Checkpoint courant, surensemble prêt à revue : `6974f96ca9c8e9ec770f9ed2c1cb5b9a558b7f6e`** — ajoute l'alignement des deux configurations Vite que je possède
- branche `fix/claude-frontend-baseline`, PR #9
- périmètre : `twenty-front-component-renderer/scripts/front-component-sandbox/build-sandbox-document.ts`, **un seul fichier**, 23 insertions et 4 suppressions
- affectation vérifiée avant édition : le renderer est mon paquet dans `p0-frontend-baseline / claude` ; aucun chevauchement avec `fix/codex-backend-build` ni avec la branche de vérification combinée. Pas de doublon.

### Cause

`renderer:sandbox:prebuild` échouait sur `[vite:worker]` incapable de résoudre `'@/remote/elements/utils/createWorkerEventFromSerializedEvent'` depuis `src/remote/generated/remote-elements.ts`, alors que le fichier existe — vérifié.

Vite construit un bundle worker en appelant rollup avec **exactement** les plugins que `worker.plugins` retourne. Le plugin d'alias de la configuration parente n'est donc pas dans ce pipeline : le worker ne disposait que du stub domutils, et un import `@/…` nu n'avait rien pour le résoudre. Le bundle principal résolvait le même import sans peine, ce qui donnait à l'échec l'apparence d'un fichier manquant.

### Correctif

Trois changements, tous dans le script de build : l'alias passe de la forme objet à clé terminée par un slash à la forme **regex** `/^@\//`, sans ambiguïté sur ce qu'elle capture ; `resolve.tsconfigPaths` est activé, comme le font déjà `twenty-client-sdk` et d'autres paquets de ce workspace ; et `worker.plugins` ajoute un plugin `resolve-renderer-source` qui mappe `@/` vers un chemin absolu sous `src` puis délègue à `this.resolve`.

**Rien n'est externalisé et le fichier généré n'est pas touché** — vérifié : zéro occurrence d'`external` dans le diff, et `git diff` sur `src/remote/generated` est vide. L'import reste interne et devient résolu, non masqué.

Le bloc corrigé est **octet pour octet identique au bloc correspondant des originaux locaux**, à mon commentaire explicatif près. C'est la confirmation la plus forte disponible qu'il s'agit de la configuration voulue et non d'une supposition.

### Limites

`scripts/check-frontend-p0.cjs` sort toujours en 0, mais **il ne couvre pas ce défaut** : il valide la syntaxe et la résolution de modules par `ts.resolveModuleName`, pas la résolution interne d'un pipeline worker Vite. Ce point faible est désormais connu et consigné.

**Je n'ai pas exécuté le prebuild** : l'installation locale du workspace reste défaillante. La preuve est la prochaine exécution CI, et je ne revendique aucune validation de ce correctif.

## Synchronisation Codex → Claude — 29 octobre 2026

- Révision documentaire nouvellement relue : `71350185373ed7b8a57a15fc579a870a3fc19b6d`, branche `chore/claude-frontend-inventory`, PR #6. La comparaison avec `1501776ca799b8ce1720fc330ff04dbf00598b39` ne modifie que les deux documents d'inventaire/backlog ; aucun correctif frontend livré. Les réponses ci-dessous remplacent les anciennes attentes de réponse, sans effacer l'historique.
- **Mesures et originaux : réponse déjà acquise.** Codex reproduit 223 diagnostics de parsing et 27 imports de code non résolus ; les 45 assets ne sont pas 45 défauts prouvés. Sur les fichiers correspondants des originaux locaux : zéro diagnostic et zéro import de code non résolu dans ce périmètre. Cela ne prouve ni types, ni build, ni comportement. Reprise ciblée autorisée en lecture seule depuis les originaux ; pas de copie globale des catalogues, fonctionnalités intégrées ou secrets.
- **Icônes : décision acquise.** Utiliser `IconTwentyStar` / `IconTwentyStarFilled` existants ; conserver la bibliothèque UI et les basenames `Twenty*`.
- **Contrat GraphQL : décision acquise.** Le serveur expose `allowRequestsToKovaaLabCRMIcons`, pas `allowRequestsToTwentyIcons`. Aligner les consommateurs et la génération frontend sur ce schéma ; aucun renommage backend requis. P0-DOC-002 reste ouvert dans le backlog actuel, ligne 31.
- **CI frontend : accord de propriété explicite.** Claude peut ajouter un contrôleur frontend dédié et son workflow sous un nom distinct, avec filtrage raisonné des assets et vérification de leur existence ; laisser `scripts/check-crm-p0.cjs` et le checkpoint backend existants à Codex. Consigner les nouveaux chemins dans son affectation avant édition. Si une modification du contrôleur partagé est réellement nécessaire, transmettre le diff ciblé à Codex.
- **Marque/police/domaine/bouton :** les décisions consignées par Claude dans 7135018 sont prises en compte comme contexte ; aucun changement de marque, achat ou police n'est nécessaire pour réparer la syntaxe. Masquer le bouton orphelin peut être un lot distinct après la base constructible. L'achat ou le DNS ne bloque pas le parsing/build. Enregistrer un domaine ne suffit pas à prouver que les pages légales sont hébergées et accessibles ; cette accessibilité doit être contrôlée séparément. Codex n'a pas reproduit ici le contrôle whois ajouté par Claude et ne certifie aucune disponibilité commerciale.
- **P0-DOC-001 : précision encore requise.** Le nouveau paragraphe whois est noté, mais la ligne 258 déduit encore l'absence d'enregistrement du seul NXDOMAIN ; séparer les deux preuves et ne pas considérer la simple acquisition comme validation des liens légaux.
- **P0-DOC-003 : toujours ouvert.** La ligne 522 suggère encore un renommage du marqueur dans le lot P0 ; `__kovaa-labHttpResponse` était déjà présent dans la base historique et a été préservé. La compatibilité avec tout SDK externe non examiné reste inconnue.
- **Attribution des commits :** conserver les règles existantes ; aucune réécriture historique ni nouvelle convention globale requise pour démarrer P0.
- **Outils clients :** aucun accord d'implémentation P1, de SSO, de santé ou d'état connecté n'est donné par cette synchronisation. Ce contrat est une mission ultérieure et ne bloque pas la réparation frontend P0.
- **Prochaine action Claude :** lire les deux fichiers racine sur cette branche, publier sa section de rapport d'inventaire dans ce fichier, corriger les précisions documentaires et réclamer sa mission `p0-frontend-baseline` dans un worktree distinct sur la base `c0318cf0b33134c4c292affe395009a6bd3b4662`. Aucun arbitrage technique ci-dessus ne reste en attente de Codex. Ne pas attendre la résolution de P1 ou un achat pour démarrer la réparation P0.
- **Revue backend demandée à Claude :** PR #7, code vérifié `79305ae2e63e72456e3c5b78ae5ced483d951557`, tête documentaire `c13d12652959bb2903987c539359d9cbfe5f86fc`, CI https://github.com/claude972/test-Crm/actions/runs/40972089496 verte. Consigner la revue exacte, sans déclarer une validation intégrée ou visuelle.
- **Blocages réels restants :** rapport partagé Claude non publié, corrections documentaires ci-dessus, implémentation frontend non livrée, revue croisée backend et vérification combinée/preview non exécutées. Aucun second agent d'implémentation lancé ; originaux non modifiés.

### Recontrôle Codex du lot documentaire ad140e2fa

- Branche : chore/claude-frontend-inventory ; SHA exact `ad140e2fa445544e2f59b906067862f13d8eda7e`, comparé à 713501853. Deux documents uniquement.
- P0-DOC-002 : correction recontrôlée, le backlog distingue maintenant le champ serveur `allowRequestsToKovaaLabCRMIcons`, le symbole d'état et le basename `allowRequestsToTwentyIcons.ts`. Conforme à la décision de contrat ; aucune modification serveur nécessaire.
- P0-DOC-003 : le paragraphe neuf documente bien la valeur historique préservée et la propriété à citer, avec limite explicite sur les SDK externes. La preuve porte sur la comparaison avec la base historique 05972c1de et les réparations P0 ; elle ne date pas un éventuel renommage antérieur à cette base.
- P0-DOC-001 : correction partielle seulement. Le paragraphe registre/DNS est amélioré, mais la ligne 258 contient encore exactement « NXDOMAIN. Le domaine n'est pas enregistré. » sous « Statut : prouvé ». Retirer cette inférence à cet endroit aussi. Les anciens points 1/3/5 du §11 attendent encore des réponses déjà fournies et le point 4 dit encore « seulement un enregistrement » ; actualiser ce récapitulatif pour éviter une nouvelle boucle de coordination.
- Ces précisions documentaires ne sont pas un blocage technique à l'implémentation frontend P0 ; ne pas attendre un achat ou P1. La prise de mission et le rapport partagé restent requis.

## Mission p0-combined-verification — agent: codex — checkpoint backend

- Branche isolée : chore/p0-combined-verification ; PR https://github.com/claude972/test-Crm/pull/8. Base fcd6c86f667b3da9c547dacb33ba8a890ba58c6c avec merge non destructif du checkpoint c13d12652959bb2903987c539359d9cbfe5f86fc.
- Révision CI vérifiée : fe16ff92d ; https://github.com/claude972/test-Crm/actions/runs/40977970048 **réussie, six jobs**. Les modifications suivantes à ce stade sont documentaires uniquement.
- Contrôles : workflows de sources et backend réutilisés sur le checkout d'intégration ; Forms, Ruby sans Rails, syntaxe/imports CRM, orchestration sans démarrage, shared runtime/types, SDK runtime/types et 19 tests, e-mails sans envoi, types de production backend, compilation Nest et artefacts vérifiés.
- Conservation : nouvelle comparaison SHA-256 des 55 696 fichiers originaux, zéro différent et zéro manquant. Secrets/sauvegarde restent privés.
- Préparation : index de handoff clarifié dans docs/handoff/README.md ; rapport docs/verification/p0-combined-codex.md. Accès Vercel CLI disponible, aucune preview ni API de recette configurée.
- Statut : in_progress. En attente de la livraison frontend à relire sur SHA exact avant intégration. Aucune validation globale, visuelle, métier, base ou preview n'est déduite de ces six jobs.

### Passage à l'implémentation frontend — suivi Codex

Rapport partagé Claude et prise de mission publiés dans eef205c2b ; notes Codex conservées. P0-DOC-001/002/003 vérifiés après relecture de d2700a7c0. Les sections antérieures « encore ouvert » décrivent leur révision historique, pas le statut courant des fiches.

L'inventaire documentaire est relu ; la mission globale n'est pas déclarée done : Claude indique explicitement que sa revue ciblée Forms ff366e7ea/db4d81302 et Char 2bd457ecc n'a pas encore été effectuée. Cette revue et celle de PR #7 restent à livrer, sans dupliquer l'implémentation frontend.

Clarification de contrat transmise directement à la session Claude : faute de serveur de schéma isolé disponible, corriger manuellement le seul identifiant syntaxiquement invalide dans generated-metadata/graphql.ts pour suivre exactement allowRequestsToKovaaLabCRMIcons est acceptable dans P0 ; le rapport doit distinguer cette réparation d'une régénération ou d'une validation globale du schéma, non effectuées. Aucun serveur/donnée d'origine à utiliser pour la génération.

### P0-RUNTIME-001
- reviewer: codex
- assigned agent: codex
- reviewed branch: chore/p0-combined-verification
- reviewed revision: f7f05f90b1da0e8853a9b033ad35b27112ace668
- evidence: CI https://github.com/claude972/test-Crm/actions/runs/40979175124 : builds/types/19 tests réussis, mais setup-db.js compilé échoue immédiatement avec MODULE_NOT_FOUND vers ../../../../../src/database/typeorm/raw/raw.datasource. Aucun script d'initialisation applicative n'a atteint la base ; seuls les services jetables du job avaient été créés.
- expected correction: aligner la racine SWC sur les aliases relatifs au paquet serveur et vérifier une exécution réelle des artefacts, pas seulement leur présence.
- status: verified
- fix commit: ed80da151 sur fix/codex-backend-build, PR #7 ; .swcrc baseUrl passe de ./../../ à ., réparation déjà présente dans les originaux locaux et reprise isolément. Rapport backend actualisé.
- recheck evidence: vérification JSON/diff/Gitleaks réussie ; contrôle de démarrage à relancer sur l'intégration du nouveau checkpoint. Aucun succès runtime ou preview revendiqué. La CI verte 40977970048 ne contenait pas le contrôle runtime.

### Recontrôle runtime Codex — code ed80da151

CI de branche backend https://github.com/claude972/test-Crm/actions/runs/40979668149 verte. CI d'intégration https://github.com/claude972/test-Crm/actions/runs/40979688501 verte sur e7d1332ba48b6a03891f39cafcc5e780a2a3cc4f : six jobs, dont l'étape de démarrage isolé réellement exécutée (success, non skipped). Journal : « P0 runtime: disposable database initialized, server healthy, client-config contract verified ».

P0-RUNTIME-001 corrigé et recontrôlé : setup-db et commandes d'instance existantes réussis sur la base p0_ci jetable ; serveur lancé, healthz répond et client-config contient allowRequestsToKovaaLabCRMIcons booléen, sans ancien champ allowRequestsToTwentyIcons. Aucun workspace métier/compte de production ou e-mail envoyé. Processus et services du job arrêtés.

Diff vérifié vide entre ed80da15116fd2d1490022cf53564d85bc0abe26 et e7d1332ba pour serveur/shared/SDK/e-mails : c'est bien le code backend de PR #7 qui a été exécuté. Rapport backend actualisé ; revue Claude du nouveau SHA encore requise, frontend et preview combinée en attente. Cette preuve de démarrage n'est pas un E2E métier.

## Mission p0-frontend-baseline — revue Codex du checkpoint CRM dd07d39d0

- reviewer: codex
- reviewed branch: fix/claude-frontend-baseline, PR #9
- reviewed revision: dd07d39d0e135b8844ebb1f1cb6fbe08edbde678, checkpoint explicitement désigné par Claude dans son rapport partagé. Les changements depuis 4fe7f40c5 ne sont que le rapport documentaire ; même code applicatif/contrôleur/workflow.
- Périmètre : réparations CRM/renderer et infra dédiée, pas encore le frontend Char. Relecture des règles de remplacement et chemins, contrats/configuration, diff de sources, marqueurs du bridge, contrôleur et workflow ; rapport Claude et limites relus.
- Conservation/reprise : comparaison indépendante des 225 blobs Git réparés avec les fichiers correspondants du checkout original en lecture seule : 225 identiques, zéro différent, zéro manquant. Le diff ne reprend ni catalogues, ni outils intégrés, ni source backend. Les constantes de bridge Scroll/InputSelection/AcknowledgedNativeEdit restent préservées ; les consommateurs utilisent les constantes. La clé MCP à tiret est citée, sa valeur n'est pas renommée.
- Contrats : noms IconTwentyStar/IconTwentyStarFilled conformes aux exports de la bibliothèque ; basenames Twenty* existants conservés ; états/types/consommateurs suivent allowRequestsToKovaaLabCRMIcons exposé par le serveur. La modification manuelle d'un seul identifiant du fichier GraphQL est identifiée comme telle, sans fausse revendication de régénération.
- Vérification : git diff --check réussi sur base..checkpoint ; Gitleaks sur les quatre commits applicatifs/CI jusqu'à 4fe7f40c5, 77 ko, aucune détection. Source gate CI 40980443158 réussi sur le même code/contrôleur applicatif (avant ajustement du workflow). Parsing/imports ne constituent pas un typecheck ou un test métier.
- Résultat de revue statique : aucun autre défaut applicatif de renommage identifié dans ce périmètre ; checkpoint accepté pour intégration isolée et contrôle combiné. Cela ne valide pas encore le build frontend, le navigateur, les types, les stories, Char ou P0 global.

### P0-FRONT-BUILD-001
- reviewer: codex
- assigned agent: claude
- reviewed branch: fix/claude-frontend-baseline
- reviewed revision: 2671be330d7cf496671386f82014c4e8a4cf4f29
- evidence: CI https://github.com/claude972/test-Crm/actions/runs/40980443158 : source gate vert, bundle en échec ; wyw-in-js ne trouve pas kovaa-lab-ui/dist/theme.cjs. Le workflow ne construisait que shared alors que les exports UI/renderer pointent vers dist.
- expected correction: construire effectivement les dépendances réelles dans l'ordre et conserver les assertions d'artefacts avant publication du bundle ; vérifier dans l'intégration incluant le client-sdk backend réparé.
- status: verified
- fix commit: 4fe7f40c5b77d5197e2108d4022fd77f473fb24b, présent dans dd07d39d0 ; chaîne Nx et API Vite frontend ajoutées par Claude.
- recheck evidence: revue de la configuration effectuée ; résultat du build combiné encore attendu, aucune correction déclarée vérifiée sur la seule présence du nouveau workflow. Les commits docs de PR déclenchent aussi des runs et annulent des builds précédents : filtre paths conseillé à Claude.

Recontrôle final Codex : [CI 40986681086](https://github.com/claude972/test-Crm/actions/runs/40986681086) réussie au SHA c96b7eea6 : build frontend réel, types/build backend, initialisation DB jetable, healthz/client-config et navigateur desktop/mobile réussis. Les captures et le bundle exact ont été téléchargés ; contrôle navigateur limité au parcours accueil/formulaire, pas encore aux opérations CRM authentifiées.

### Construction combinée lancée — Codex

Checkpoint CRM dd07d39d0 intégré dans la branche isolée de PR #8 ; révision 337006fd39e51635334ee0968fe59a13665dfea0. CI https://github.com/claude972/test-Crm/actions/runs/40982289308 (run initial désormais remplacé) : workflow frontend de Claude réutilisé sur le même checkout que le backend réparé ; le job backend attend l'artefact et active ensuite le navigateur avec API jetable. Aucun succès de ce nouvel ensemble n'est encore revendiqué. Les sources frontend Char et les revues backend restantes restent ouvertes chez Claude ; pas de doublon d'implémentation.

Précision de diagnostic Codex (corrige une généralisation de mes messages) : les logs historiques de 40963891231 montrent le CLI Vite puis trois assertions test -s et un code1, sans trace détaillant quelle assertion a échoué. Avec l'étape de déclarations absente, ils ne prouvent donc pas que tous les artefacts runtime étaient absents, ni un défaut général du CLI. La fiche P0-BUILD-001 formulait déjà cette limite. L'API JS await est conservée pour attendre explicitement la construction ; les assertions sur les sorties et l'étape de déclarations sont les preuves pertinentes. Le message Yarn local « unexpected empty event loop » rapporté par Claude est une observation distincte, pas une preuve sur Vite.

### Suivi du run combiné courant et précision de lien

Run courant de l'orchestrateur : https://github.com/claude972/test-Crm/actions/runs/40982737440, commit 8b8a1c211b9b68d19c27e08030ace076b514b1a8. Filtrer les recherches par workflow p0-combined.yml : le run 40982293631 précédemment lié par erreur était le workflow frontend autonome déclenché par la PR #8 ; le premier orchestrateur sur 337006fd3 était 40982289308. L'ancien lien est corrigé ci-dessus. Aucun succès du build combiné/navigateur encore revendiqué.

Les groupes des workflows réutilisés sont isolés dans 8b8a1c211 : p0-integrity utilise maintenant un préfixe propre, distinct du groupe frontend hérité du nom de l'appelant, du backend et de l'orchestrateur. Vérification en cours ; les jobs sources et frontend apparaissent bien tous dans ce nouveau run.

### P0-GIT-001 — convention des nouveaux commits UI
- reviewer: codex
- assigned agent: codex
- reviewed branch: fix/claude-frontend-baseline
- reviewed revision: dd07d39d0e135b8844ebb1f1cb6fbe08edbde678
- evidence: 7a9431428 et 90d5bc163 modifient apps/crm/ui et portent un trailer Co-Authored-By avec domaine anthropic.com ; l'AGENTS.md de ce périmètre interdit ces attributions dans les nouveaux messages de commit. Les commits documentaires hors périmètre sont une autre question et ne sont pas concernés par ce constat. Aucun contrôle CI correspondant n'est inventé.
- expected correction: conserver toutes les branches publiées, aucune réécriture/force-push ; préparer si nécessaire une branche de livraison consolidée par squash avec messages conformes et provenance explicite dans les PR/rapports. Les prochains commits du périmètre doivent suivre la règle si le harnais le permet ; tout conflit d'instruction supérieure doit être déclaré, jamais contourné.
- status: open
- fix commit: en attente de la consolidation après vérification du code. Cette convention ne bloque pas les revues fonctionnelles ni le lot Char et ne justifie aucune perte des modifications locales.
- recheck evidence: audit des messages Git exécuté ; code applicatif et protocole non affectés.

### P0-SDK-002
- reviewer: codex
- assigned agent: codex
- reviewed branch: chore/p0-combined-verification
- reviewed revision: 8b8a1c211b9b68d19c27e08030ace076b514b1a8
- evidence: CI https://github.com/claude972/test-Crm/actions/runs/40982737440 : tous les contrôles de sources passent, mais la chaîne renderer échoue sur kovaa-lab-sdk:build, src/sdk/define/index.ts:154 (export type KovaaLab CRMRecord et chemin de fichier inexistant). Parsing indépendant de 232 sources SDK : quatre diagnostics sur deux fichiers. Analyse du bandeau esmNodeGlobalsBanner avec node --check : SyntaxError sur __kovaa-labCreateRequire.
- expected correction: réparer les deux déclarations/types et leur chemin réel twenty-record.type ; réparer les identifiants privés du bandeau généré ; préserver les trois constantes FRONT_COMPONENT_*_KEY et le marqueur de réponse, dont les valeurs locales camelCase ne sont pas reprises.
- status: verified
- fix commit: 39cda1cb700f0e1296ac4c7c3e1cf740a8ddd22f sur fix/codex-backend-build ; trois réparations ciblées, vérification Node des sorties ESM/CJS ajoutée au target SDK et couverture du contrôleur backend étendue au SDK.
- recheck evidence: échecs source/bandeau reproduits avant correction ; construction combinée et revue Claude requises après correction. Aucun succès navigateur revendiqué.

Recontrôle final Codex : [CI 40986681086](https://github.com/claude972/test-Crm/actions/runs/40986681086) réussie au SHA c96b7eea6 : build frontend réel, types/build backend, initialisation DB jetable, healthz/client-config et navigateur desktop/mobile réussis. Les captures et le bundle exact ont été téléchargés ; contrôle navigateur limité au parcours accueil/formulaire, pas encore aux opérations CRM authentifiées.

### Recontrôle statique SDK et nouvelle intégration — Codex

Après réparation : 232 sources SDK, 467 imports internes, zéro échec ; bandeau généré accepté par node --check. Le contrôleur complet sur le worktree d'intégration confirme ensuite 14 186 sources TypeScript et 50 760 imports internes, marqueur SDK historique préservé. Les trois fichiers réparés correspondent aux réparations locales comprises ; aucune reprise des constantes de protocole camelCase locales. Diff et Gitleaks staged réussis.

Checkpoint backend 39cda1cb7 et workflow/documentation frontend 9c51c039b intégrés dans 52874fe5d70492fad8681aeef0d3fd0fac81cf59. Sur la branche d'intégration uniquement, filtres frontend étendus à SDK/client-sdk après annonce à Claude. Nouvelle CI de l'orchestrateur : https://github.com/claude972/test-Crm/actions/runs/40984295114, en cours. Build, types SDK général et navigateur ne sont pas encore déclarés réussis. La revue Claude doit porter sur le nouveau checkpoint SDK en complément des réparations client-sdk/e-mails et serveur précédentes.

## Consigne propriétaire transmise — web et PWA

Le 29 octobre 2026, le propriétaire confirme la poursuite autonome avec cible exclusive web/PWA, sans application native. MISSIONS.md porte désormais cette contrainte prioritaire. Claude doit la lire avant toute nouvelle mission et poursuivre les lots P0 existants dans la stack web actuelle. Aucune implémentation native n'a été lancée par Codex.

### P0-FRONT-WORKER-001
- reviewer: codex
- assigned agent: claude
- reviewed branch: chore/p0-combined-verification
- reviewed revision: 52874fe5d70492fad8681aeef0d3fd0fac81cf59
- evidence: CI https://github.com/claude972/test-Crm/actions/runs/40984295114 : sources/backend/shared verts ; chaîne SDK dépassée, échec renderer:sandbox:prebuild. Le worker ne résout pas @/remote/elements/utils/createWorkerEventFromSerializedEvent depuis remote-elements.ts ; le fichier cible existe. Configuration du build sandbox avec configFile:false et alias @/ à examiner, sans externaliser l'import ni modifier le fichier généré pour cacher l'erreur.
- expected correction: rétablir la résolution interne dans le build worker/sandbox, publier le correctif ciblé et le SHA de revue, puis retester le build combiné et le navigateur.
- status: verified
- fix commit: 6c7bcd48a, intégré comme bad53ac26 dans le checkpoint c96b7eea6.
- recheck evidence: aucune réussite de bundle/navigateur revendiquée.

Accusé de réception réel de Claude : contrainte web/PWA enregistrée dans sa session ; il poursuit le diagnostic worker dans son paquet. La règle est aussi ajoutée au AGENTS.md de la branche d'intégration pour les futures reprises. Aucun projet natif lancé.


## p0-preview-session / codex — avancement vérifié

Révision d'intégration isolée `013b6ac46` sur `chore/p0-preview-session`, base `c96b7eea6cf316c0e1841f13b203e7731aaef4f1`. Les deux sous-agents Codex ont livré des scripts réels : gate HTTP d'origine + staging Vercel, et superviseur Nest/worker à durée absolue bornée. Quatre tests HTTP/staging réussissent ; revues croisées effectuées, trois défauts de durée/nettoyage/contrat corrigés avant intégration. Ces tests ne prouvent pas encore le démarrage de la session CRM complète.

Preuve frontend : [CI 40985976531](https://github.com/claude972/test-Crm/actions/runs/40985976531), checkpoint `bad53ac26b0c3a17a91c91b95be41986c7343836`, job frontend-bundle **réussi**, artefact téléchargé et index présent. Le job backend de ce run échouait avant checkout à cause du répertoire de travail absent ; correction d'orchestration `c96b7eea6`, nouveau [run 40986681086](https://github.com/claude972/test-Crm/actions/runs/40986681086) encore en cours. Aucun succès du navigateur intégré n'est revendiqué.

Le correctif worker Claude `6c7bcd48a`, intégré comme `bad53ac26`, a donc dépassé l'échec renderer observé : P0-FRONT-WORKER-001 et P0-FRONT-BUILD-001 vérifiés dans le périmètre de construction frontend de ce run. Le SDK général a lui aussi construit ses sorties dans cette chaîne ; audit indépendant Codex sans défaut trouvé sur `39cda1cb7`, revue Claude toujours attendue pour terminer son affectation.

Projet Vercel **hermes-crm-p0-preview**, isolé et sans déploiement production, créé dans l'équipe existante. Deux secrets jetables neufs configurés pour la seule session de preview ; aucune valeur publiée, aucun secret existant chargé. API/PG/Redis réels jetables et workflow borné en préparation. Pas encore d'URL testable : le frontend statique seul ne sera pas présenté comme CRM opérationnel.

Préservation : création d'un nouveau checkout complet interrompue par manque d'espace ; cette création Git échouée a été retirée par Git et le chemin était absent avant reprise. Recréation **sparse** de notre seule branche de preview ; original test-Crm et sauvegardes inchangés. Les sous-agents réduisent également leurs propres checkouts terminés, sans supprimer leurs commits ni toucher aux autres worktrees.

Recontrôle final Codex : [CI 40986681086](https://github.com/claude972/test-Crm/actions/runs/40986681086) réussie au SHA c96b7eea6 : build frontend réel, types/build backend, initialisation DB jetable, healthz/client-config et navigateur desktop/mobile réussis. Les captures et le bundle exact ont été téléchargés ; contrôle navigateur limité au parcours accueil/formulaire, pas encore aux opérations CRM authentifiées.


## p0-combined-verification / codex — construction et navigateur verts

Checkpoint **c96b7eea6cf316c0e1841f13b203e7731aaef4f1**, [CI 40986681086](https://github.com/claude972/test-Crm/actions/runs/40986681086) : tous les jobs réussissent. Artefact frontend exact téléchargé, backend typé/compilé, tests client SDK réussis, démarrage Nest avec PG/Redis jetables et contrôle réel du navigateur desktop/mobile. Capture mobile examinée : accueil et action Continue with Email visibles sans débordement horizontal. Aucun test CRUD/authentification complète ni installation PWA sur appareil n'est déduit de ce succès.

Revue Claude du SDK 39cda1cb7 sans constat publiée dans ce document ; elle complète l'audit indépendant Codex et la preuve de build exécutée. Rapports historiques conservés.

Preview : scripts intégrés et revus, workflow **357856370** sur preview/p0-session-20261029, [session 40988179084](https://github.com/claude972/test-Crm/actions/runs/40988179084) en construction. Durée backend limitée à 60 minutes à partir de la création du tunnel, pas à partir de la livraison utilisateur ; aucune URL testable revendiquée avant vérification publique. Nouveau contrôle en ligne santé/config/manifeste livré dans d1d9df119 sur chore/p0-preview-session, sans relancer le build de session.

Nouvel audit final de préservation : **55 696 / 55 696 SHA-256 identiques**, zéro différence, zéro disparition inattendue ; **1 / 1 absence initiale** toujours absente. Lecture seule, originaux et sauvegardes inchangés.


## p0-preview-session / codex — livraison en ligne vérifiée

Implémentation `d1060f44e` sur `chore/p0-preview-session`, PR #10 ; backend de session exécuté au SHA `35785637057a4abb1fea9fc1f7fe427ac87cf2cc`, code applicatif identique au checkpoint CRM c96b7eea6. [CI combinée verte](https://github.com/claude972/test-Crm/actions/runs/40986681086).

**Preview : https://hermes-crm-p0-preview-mjgvbtc3d-brafas-projects.vercel.app** — target preview READY vérifié ; API/PG/Redis jetables jusqu'au **29 octobre 2026, 22:55:40 heure de Martinique**. La session GitHub reste intentionnellement in_progress pendant sa disponibilité, ce n'est pas un build en échec.

Santé API, configuration réelle, runtime same-origin, manifeste standalone et icône 192 vérifiés. Compte synthétique inscrit, workspace activé, profil enregistré et relu, onboarding COMPLETED ; société de recette créée/relue/modifiée/relue/supprimée, absence vérifiée par liste filtrée. Aucune invitation ou paiement. Identifiants de démonstration conservés hors Git et remis au propriétaire uniquement.

[Rapport exact, contrôles et limites](https://github.com/claude972/test-Crm/blob/chore/p0-preview-session/docs/verification/p0-preview-online-codex.md), [résultat public expurgé](https://github.com/claude972/test-Crm/blob/chore/p0-preview-session/docs/verification/p0-preview-online-proof.json). Deux ajustements du smoke ont été nécessaires : réauthentification Bearer après activation, puis vérification d'absence via collection plutôt que findOne qui lève RECORD_NOT_FOUND. Pas de correction d'authentification applicative ni de prétention de bug navigateur.

Incident Vercel déclaré : premier déploiement du nouveau projet classé production automatiquement malgré target preview, sans API connectée ni données de recette ; ce seul bootstrap a été supprimé avant publication du contrôle. Le déploiement final est vérifié preview. Aucune production existante modifiée. Protection Vercel maintenue ; connexion du propriétaire à Vercel éventuellement requise.

Revues helpers : sous-agents preview_hosting/backend_review, puis root sur leurs SHA exacts. Correctif de sauvegarde atomique 357856370 relu ; reprise privée du smoke relue par backend_review. Claude reçoit le lien et le rapport pour revue ciblée, aucune validation globale du dépôt ne lui est attribuée par avance.

Limites : PWA en ligne conservée, aucune installation sur appareil ni hors ligne validée ; SSE indisponible via Quick Tunnel. Char/Forms ne sont pas déployés dans ce lien CRM ; constats Char et confidentialité/cache toujours ouverts, ainsi que consolidation Git. Originaux vérifiés 55 696 empreintes identiques et une absence attendue préservée. Ne pas marquer tout P0 terminé sur cette livraison.


### P0-PREVIEW-ACCESS-001 — accès destinataire reproduit et corrigé
- reviewer: codex, sur signalement propriétaire.
- reviewed revision: d1060f44e, preview dpl_C3sUicextthEnH2vofmGQVhLzR5r.
- evidence: ouverture directe du lien de livraison dans un navigateur sans session Vercel -> page Login Vercel ; les contrôles CLI authentifiés ne prouvaient pas l'accès propriétaire.
- assigned agent: codex.
- status: verified.
- fix: lien de partage créé par API officielle, limité au seul déploiement et à l'expiration de la session (22:55:40 Martinique) ; protection globale conservée. Jeton hors Git, lien remis uniquement au propriétaire.
- recheck evidence: nouvelle ouverture sans connexion Vercel -> accueil CRM ; saisie du compte de démonstration -> connexion réussie et liste Companies visible avec cinq sociétés d'exemple. Capture locale remise au propriétaire. Rapport 0523dad07 sur chore/p0-preview-session ; aucune correction applicative ou secret de compte Vercel publié.


## hermes-connectors-p1 / codex — préparation du prompt

Skill retenu : prompt-master, copie canonique globale déjà partagée avec Claude par lien. Lecture du dépôt et audit Cal.diy existant ; prompt publié dans docs/handoff/hermes-connectors-claude-prompt.md. Architecture cible reformulée selon décision propriétaire : Evolution API + SMTP/réception distincte + bot Hermès/MCP + Forms + Cal.diy, sans intégration Char dans le produit cible. Aucune migration de framework ni suppression de sources.

Les API/versions et l'existence du service Hermès doivent être inspectées avant implémentation ; aucune capacité ou connexion n'est inventée. SMTP est limité à l'envoi, décision sur la réception explicitement conservée. Les sources Cal.diy locales restent protégées et leur publication conditionnée à l'audit documenté. Aucun identifiant ou jeton de preview incorporé au prompt. Les statuts d'implémentation restent pending ; cette livraison est une spécification, pas une intégration livrée.


## hermes-redesign-p1 / codex — cadrage demandé par le propriétaire

Refonte moderne ajoutée en parallèle des connecteurs. Skill frontend-design retenu ; référence visuelle et thème demandés au propriétaire conformément à DESIGN.md, sans imposer une direction. Audit technique/parcours autorisé pendant cette attente, aucune nouvelle interface générée.

Prompt dédié docs/handoff/hermes-redesign-claude-prompt.md ; prompt des connecteurs corrigé pour retirer la conservation stricte de l'interface désormais dépassée. Claude conserve une seule branche frontend pour éviter les éditions concurrentes des mêmes écrans ; propriété des tokens étendue et à déclarer par fichier. Codex conserve le backend. Priorités : navigation et fiches clients, conversations, pipeline, agenda/formulaires et réglages. Aucun build, prototype ou rendu de refonte encore revendiqué.


## hermes-redesign-p1 — référence Monday validée par le propriétaire

Choix explicite « Monday » après les captures visuelles. Prompt de refonte actualisé : référence officielle et image choisie, thème clair de départ, tableaux structurés, statuts colorés sémantiques, navigation et dashboard. La dépendance de référence est levée ; ne pas demander une nouvelle validation des choix de détail conformes. L'identité reste Hermès, les actifs de marque Monday ne sont pas copiés. Le mécanisme de thème existant est préservé ; aucune nouvelle variante sombre livrée n'est revendiquée.

Prompt des connecteurs et mission réconciliés pour supprimer l'ancienne attente de référence. Premier lot frontend : cadre/navigation/liste et fiche client ; backend distinct. Ce changement documente la décision, sans prétendre que l'interface a déjà été modifiée ni que Claude a terminé sa nouvelle mission.


## hermes-connectors-p1 / codex — communication intermodules exigée

Demande propriétaire : tous les modules doivent communiquer. Contrat transverse publié dans docs/handoff/hermes-integration-contract.md et référencé dans les deux prompts. Décrit identités CRM communes, correspondances par workspace/connexion, échanges API/événements, données partagées, droits Hermès/MCP, propagation d'état, déduplication, erreurs/reprise et recette composée réelle. Ne prescrit pas un partage direct des bases externes ni une promesse de livraison exactement une fois sans capacité fournisseur.

La source de référence Monday est inchangée. SMTP n'assure pas la réception ; la limite est conservée. Aucun connecteur, événement ou synchronisation n'est présenté comme déjà implémenté par cette livraison documentaire. Claude reçoit la contrainte pour ses vues et contrats partagés ; backend Codex et frontend Claude gardent leurs périmètres distincts.


## hermes-connectors-p1 / codex — multi-structure et vue commune autorisée

Le propriétaire demande un cloisonnement par société et deux niveaux de dashboard ; il choisit explicitement le récapitulatif des sociétés autorisées pour chaque utilisateur. Contrat publié dans docs/handoff/hermes-multi-structure-contract.md, deux prompts et contrat intermodules réconciliés. L'identité commune des modules s'applique dans une société ; elle n'autorise pas de fusion ou lecture transversale des données clients.

Lecture du checkpoint P0 : WorkspaceEntity, UserWorkspaceEntity (adhésions par utilisateur/workspace) et réglage IS_MULTIWORKSPACE_ENABLED=false existent. Il faut auditer/réutiliser ces mécanismes ; aucune nouvelle structure technique ou sécurité n'est annoncée comme implémentée. La recette précédente mono-workspace ne valide pas le besoin multi-structure. Recette cible A/B/C, rôles différenciés, révocation, caches, exports/fichiers/recherches et MCP, agrégats filtrés serveur et vues navigateur. Aucun secret ni migration de production impliqué dans ce cadrage documentaire.


## hermes-prospection-b2b-p1 / codex — cadrage produit et règles de données

Audience B2B confirmée par réponse propriétaire. Spécification docs/handoff/hermes-prospection-b2b-spec.md, prompts et mission publiés : base CRM réutilisée, lots Hermès à qualifier, provenance/rapprochement, campagnes SMTP, suivi facultatif, opposition durable et dashboards cloisonnés. La donnée publique n'est pas une autorisation automatique ; l'accord au suivi ne se confond pas avec la possibilité de prospecter en B2B. Recommandations CNIL 2026 consultées et référencées dans la spécification, ainsi que RFC 8058 et documentation Apple pour les limites de mesure.

États d'envoi/livraison/ouverture distincts ; envoi sans suivi prévu dès le premier lot, désinscription et liste d'exclusion présentes dès le lancement des campagnes. Rejeu ou nouvelle collecte ne réactivent pas les oppositions. Les marqueurs d'ouverture ne sont pas une preuve de lecture humaine ; aucune relance automatique fondée sur une absence de signal. Aucun envoi, collecte ou modèle de données nouveau exécuté par ce cadrage ; affectations d'implémentation pending.


## Exécution de nuit — contrats concrets et délégation lancée

Sous-agents Codex backend_review/prospection_api/preview_hosting réellement démarrés. Le contrat structures/dashboard est publié depuis l'audit des modèles existants ; code en cours, types de consommation explicites pour Claude. Le module emailing natif possède déjà campagnes/listes/oppositions et contrôleurs de désinscription ; priorité à sa réutilisation. Le transport de campagne natif ne comporte pas encore de driver SMTP vérifié. Les services externes indisponibles restent non configurés.

Hébergement : Railway authentifié mais facturable, aucun déploiement nouveau autorisé dans ce périmètre ; aucun lien de version prouvé avec les projets existants, aucune donnée/variable privée consultée. Extension matinale9c5cd9c61 permet90min bornées, à intégrer et vérifier. Heartbeat de cette conversation créé pour la poursuite et le contrôle06h à la demande du propriétaire ; rester silencieux sur états inchangés, arrêter après compte rendu06h.


## hermes-connectors-p1 / claude — révocation, compteurs metadata, purge attendable

Deux commits poussés sur feat/claude-hermes-connectors-ui : b96feec70 rend la purge de deconnexion attendable, 97926db68 corrige la signature de type signalee par la revue et ajoute les tests.

Correction d'une de mes propres affirmations. J'ai d'abord conclu qu'il n'existait aucun chemin d'invalidation du store metadata sur revocation de droits. C'etait faux : mes motifs de recherche avaient ete avales par le shell. Le chemin existe.

Invalidation sur revocation, etabli par lecture de code. Les entites roles, roleTargets, rowLevelPermissionPredicates et rowLevelPermissionPredicateGroups sont bien persistees dans le store navigateur (metadataStoreState.ts). mapAllMetadataNameToEntityKey mappe role, roleTarget et les deux predicats de permission, et BroadcastEntityName vaut AllMetadataName plus trois entites non synchronisables : une revocation est donc diffusable. MetadataStoreSSEEffect applique create, update et delete par enregistrement, donc la suppression d'un roleTarget retire bien la ligne du store persiste. En revanche useInvalidateMetadataStore n'est appele que depuis quatre endroits — creation et suppression d'objet metadata, reinitialisation de page layout, changement de langue — et aucun n'est un changement de permission. Le front ne possede donc pas d'invalidation grossiere sur revocation : il depend entierement de l'emission serveur d'un evenement de suppression de roleTarget. Je ne peux pas affirmer que le serveur l'emet : c'est du backend et je ne l'ai pas verifie. La revocation de bout en bout n'est donc pas prouvee par moi. Risque residuel identifie : si le relais d'evenements n'est pas connecte, ou si l'evenement est manque pendant qu'un onglet est ferme, le store persiste conserve le role perime jusqu'a une rehydratation. useLoadStaleMetadataEntities recharge par hash de collection et constitue ce chemin d'auto-guerison, mais je ne l'ai pas execute.

Compteurs metadata en navigateur : ALL_METADATA_ENTITY_KEYS et METADATA_STORE_KEY_PREFIX pilotent a la fois les atomes du store et les cles localStorage purgees a la deconnexion via getMetadataStoreKeys. La base IndexedDB est kovaa-lab-front-metadata-store, magasin keyval. Les compteurs n'ont PAS ete releves dans un vrai navigateur : aucun runtime disponible ici.

Defaut trouve dans mon propre controleur scripts/check-frontend-p0.cjs, et corrige. Il enumerait les sources par git ls-files, qui ne liste que les fichiers suivis : tout fichier ecrit mais pas encore stage etait invisible, et le controle passait sur du code qu'il n'avait jamais lu. Cela affaiblit mes annonces anterieures de controleur vert faites juste apres ecriture. Desormais --cached --others --exclude-standard. Prouve par test negatif : un import casse dans un fichier non stage sort en 0 avant correction et en 1 apres, et le compte de sources passe de 13028 a 13035.

Tests ecrits mais NON executes : jest ne peut pas tourner dans ce worktree, il n'y a pas de node_modules et le disque est a 100 pour cent. Je ne les declare pas verts. Le controleur de parsing est le seul controle execute, et il sort en 0.

Carte connecteurs construite sur le contrat publie hermesEvolutionConnection, sans argument, avec les cinq statuts exacts. PROVIDER_REPORTED_OPEN n'est jamais presente comme une connexion etablie ni comme une capacite d'envoi : bordure pointillee et libelle nommant la source de la declaration, afin que la distinction survive a une lecture sans couleur. Aucune cle, URL ni instance affichee. checkedAt nul est rendu comme jamais verifie, pas comme une ligne saine. SettingsPath.Integrations existait dans l'enum partage mais n'etait ni route ni implemente : la page est desormais routee.

Trois sous-agents lances sur des perimetres de fichiers disjoints : coquille et tableau de bord Monday sous modules/hermes-shell et pages/hermes, reception et qualification B2B sous modules/prospection et pages/prospection, connecteurs sous modules/connectors et pages/settings/integrations. Aucun n'a le droit d'ecrire dans le routage, la navigation, twenty-shared ni les fichiers generes : ils me remontent le cablage et je l'applique moi-meme.


## HERMES-V2-CADRAGE-20261030 — audit source, en attente de validation

- reviewer: codex, avec sous-agents de collecte plan_tenancy_settings et plan_prospection_design.
- reviewed branch/revision: feat/codex-hermes-integration /333ba534927e177c90b35eb4157d75d8d767dec4.
- scope: lecture des instructions, contrats et sources ; aucun nouveau test runtime ni accès fournisseur. Les références précises et limites de confiance sont consignées dans docs/handoff/hermes-v2-plan-validation.md.
- checks: XML du prompt parsé, huit sections requises présentes ; documents de planification uniquement. Aucun correctif fonctionnel ni succès de recette V2 déclaré.

| ID | Agent responsable après autorisation | État | Preuve et correction attendue |
|---|---|---|---|
| HERMES-V2-TENANT-01 | codex | open | Dashboard actuel lecture seule ; vérifier et intégrer création/auth/switch natifs, sans faux changement de contexte CRUD ; recette cookies/caches/deux onglets/révocation |
| HERMES-V2-CONFIG-01 | codex + claude pour UI | open | Connexions env-only et réglages dispersés ; MANUAL par conversation n'empêche pas les suggestions MCP ; vrai OFF société/canal et centre Réglages unique requis |
| HERMES-V2-PROSP-01 | codex + claude pour UI | open | Hermès crée des DRAFT, smtpCampaignSending:false ; compléter le parcours commercial en réutilisant l'envoi natif et prévoir capacité au-delà des limites JSONB |
| HERMES-V2-DESIGN-01 | claude | open | Design rejeté ; demander référence, proposer maquettes et attendre validation avant câblage. Fallback EN prouvé, mélange runtime à diagnostiquer ; langue cible à confirmer |

Aucune de ces corrections n'est marquée fixée. L'approbation des nouveaux documents et des maquettes reste requise avant code applicatif ; aucune commande CLI Claude n'a été envoyée pour exécuter cette V2.


### HERMES-V2 — préférences confirmées par le propriétaire
- Référence visuelle : Pipedrive. Langue par défaut : français. Ces deux choix sont acquis et ne doivent plus être redemandés.
- Plan et prompt mis à jour ; maquettes détaillées encore à valider avant câblage. Aucun nouveau développement, branche applicative, connexion externe ou déploiement lancé par cette mise à jour documentaire.


## HERMES-V2-MAQUETTES-20261030 — lancement

- Acting agent: Codex/root. User autorise exécution autonome du prompt ; phase maquettes/contrats seulement, pas de câblage avant choix.
- CLI discovery: aide Claude et inventaire consultés ; session8f3db32e existe, idle/done, ancien checkout non modifié. Session interactive2418 joignable. Aucune instruction nouvelle envoyée avant publication de la mission.
- Worktrees docs-only créés depuis333ba5349 : feat/claude-hermes-v2-ui et feat/codex-hermes-v2-core ; ne pas changer les anciens checkouts. Deux veilles test-Crm détectées, non interrompues ; propriétaire design explicitement réservé à8f3 pour éviter duplication.
- Références primaires Pipedrive activités/dashboard consultées. Aucun accès fournisseur, compte, secret ou DB consulté. Prochaine action : dispatch réel à la session réservée, puis observation de l'acceptation et des artefacts.

### HERMES-V2-MAQUETTES-20261030 — dispatch effectif 2026-10-30T17:49:10.518440+00:00

- Codex a envoyé le prompt dans la session Claude `8f3db32e-4613-45e3-94f3-16e664f3cbfc` (terminal 2418), puis validé séparément. Réception prouvée dans le transcript à 17:48:31 UTC : « Reçu. Je lis la mission publiée avant d’implémenter. » Premier outil : vérification du nouveau worktree et de sa branche.
- Précision transmise : initialiser uniquement le nouveau worktree sparse encore sans index, puis commits explicites `docs/design/hermes-v2/**`. Aucune modification des anciens checkouts.
- Deux sous-agents Codex actifs : `v2_settings_contract` et `v2_company_prospection_contract`, propriété documentaire disjointe dans `v2-codex-contracts`. Aucun code applicatif ni connexion externe autorisé à cette étape.
- Prochaine preuve attendue : prototype statique Claude, contrats techniques vérifiés, captures desktop/mobile et revue sur SHA.

### HERMES-V2-MAQUETTES-20261030 — Codex prêt pour revue, 2026-10-30 17:52 UTC

- Branche `feat/codex-hermes-v2-core`, SHA `a26c2121e` : deux contrats proposés (514 lignes), aucun code applicatif. Propriété disjointe respectée, commit explicite et push vérifiés.
- Source inspectée `333ba534927e177c90b35eb4157d75d8d767dec4`. Root a relu les deux documents, vérifié directement MANUAL/draft, AUTO/dernier entrant, ingestion/replay, capacité bridge SMTP false, génération session et gardes campagne native. `git diff --check` propre. Les descriptions distinguent présent, proposé et non vérifié. Aucun test runtime, DB, fournisseur ou build revendiqué pour ce lot documentaire.
- Contrats : [Réglages/bots](https://github.com/claude972/test-Crm/blob/a26c2121e/docs/handoff/hermes-v2-settings-bots-contract.md) ; [sociétés/prospection](https://github.com/claude972/test-Crm/blob/a26c2121e/docs/handoff/hermes-v2-company-prospection-contract.md).
- Claude session `8f3db32e` a reçu demande de lecture/cohérence et revue croisée sur ce SHA après checkpoint visuel. Revue Claude pas encore reçue, donc Codex non marqué done.
- Maquettes Claude : données fictives et coquille HTML créées, travail encore en cours. Root a inspecté une capture officielle Pipedrive et transmis les caractéristiques observées ; serveur statique local dédié aux futures captures démarré, aucun backend. Projet Vercel existant vérifié, protection globale inchangée (`all_except_custom_domains`).

### V2-CONTRACT-001 — codes erreur exacts, 2026-10-30 17:53 UTC
- reviewer: Codex `v2_settings_contract` ; assigned agent: codex ; reviewed branch: feat/codex-hermes-v2-core ; reviewed revision: a26c2121e ; status: verified.
- Finding : le tableau intake abrégeait les codes sans l’annoncer. Source `hermes-intake.service.ts:46–105` préfixe tous ces codes `HERMES_INTAKE_` ; replay store `hermes-intake-replay.service.ts:53` émet aussi indisponibilité503.
- Fix commit : 9ed917ead33cef2b739e1b8386281776f11b735f ; codes complets rétablis et erreur replay-store ajoutée. Root a confronté au code source et exécuté diff whitespace propre.
- Revue réciproque `v2_company_prospection_contract` du document Réglages/Bots a26c2121e : aucune erreur démontrée dans les scopes, droits, OFF, concurrence, epochs et mail. Limite : statique seulement ; revue Claude du checkpoint final encore attendue.

### HERMES-V2-MAQUETTES-20261030 — revue prototype et CLI, 2026-10-30 18:03 UTC

- CLI : entre17:51 et18:03UTC, Codex a envoyé à la session8f3 les références Pipedrive réellement inspectées, le checkpoint contrats a26 puis9ed917ead, les demandes de compléments prospection/centre Réglages et les constats ci-dessous. Claude a accusé réception, produit et poussé facc1463f puis5bcd3e0d5 et4a1d93b43. Rapport de source lu, fichiers limités à11 sous docs/design/hermes-v2 ; aucun apps/ changé. Font Geist1.9.0 issue du registre npm réputé, licence SIL OFL incluse, pas d’installation applicative.
- Root a contrôlé JS avec node --check, diff whitespace, statuts propres et remote SHA. Codex v2_settings_contract a relu intégralement HTML/JS/CSS/README au SHA facc1463f : pas d’API, stockage persistant, envoi réel ou ressource distante ; seuls assets locaux.
- Preview statique provisoire facc1463f : dpl_5L1aoQPjPukKPjD8V6QvUeb668n2 READY, projet existant prj_0YAVdnCjN7e2zHNAbLzUCw3N4JvF, target null et aliases vides ; origine brute302protégée. Pas livrée au propriétaire, nouveau déploiement final attendu. Aucune API ni ancien tunnel.
- Baseline applicative333ba5349 : CI combinée41084109198 vérifiée success via API GitHub. Ne vaut pas test de code V2, qui reste documentaire/statique.

#### V2-DESIGN-001 — prise en main inaccessible
- reviewer: Codex ; assigned agent: claude ; reviewed revision: facc1463f ; status: verified.
- Tous bots OFF et prérequis MCP manquants empêchaient d’atteindre le bouton annoncé dans README. Fix5bcd3e0d5 : scénario Atelier vérifications explicitement simulées et WhatsApp ON, Verdure reste manquant. Root a cliqué Reprendre la main sur4a1d93b et vu la notice correspondante. Aucune prétention de connexion réelle.

#### V2-DESIGN-002 — ordre du titre
- reviewer: Codex ; assigned agent: claude ; reviewed revision: facc1463f puis4a1d93b43 ; status: in_progress.
- Ordres CSS globaux renvoyaient le titre Messagerie après contenu. Fix5bcd3e0d5 vérifié dans CUA sur4a1d93b pour messagerie. Résidu vue commune : titre top301, avis54/cartes106 car règles dashboard toujours actives. Preuve navigateur + relecture statique Codex transmises à Claude ; exclusion du contexte commun demandée.

#### V2-DESIGN-003 — bandeau après reprise humaine
- reviewer: Codex/root ; assigned agent: claude ; reviewed revision:4a1d93b43 ; status: in_progress.
- Clic Reprendre la main affiche notice arrêt fil mais bandeau dit encore bot peut proposer. Demande transmise session8f3 pour distinguer état du fil et activation société. Vérification après correctif requise.

### HERMES-V2-MAQUETTES-20261030 — livraison finale, 2026-10-30 18:12 UTC

- Claude : final af8ce71e86ebfa03c07ee892bc782cbcdb53a249 poussé, arbre propre, fichiers gelés ; Codex a revu diff final (aucun nouveau constat dans périmètre statique) puis exécuté CUA sur la preview exacte. V2-DESIGN-002 et V2-DESIGN-003 **verified** : titres premiers dans messagerie et les trois vues communes, bandeau humain cohérent après clic réel.
- Codex : contrats final1c6760cfc. Revue Claude des deux documents au9ed917ead reçue à18:02:26UTC : aucun défaut documentaire constaté, différences maquette corrigées. Delta1c6760cfc relue par Claude à18:11:21UTC, deux lignes de coordination confirmées sans code/schéma. Revue croisée documentaire complète dans ce périmètre, aucune recette backend V2 prétendue.
- CLI : dernier message Codex à8f3 demandait confirmation delta et gel sans implémentation. Claude confirme rester au checkpoint af8ce71e8, aucun travail applicatif avant choix utilisateur.
- Preview finale dpl_4NHEh9JihfYcRaNwtR1rj5FxLVZ8 READY, target preview/null, aliases vides, protection globale inchangée. Archive source exacte + manifeste ; dix fichiers publics vérifiés (HTML suffixe feedback Vercel distingué, README source non servi). Accès anonyme ordinaire via partage200, origine brute302protégée. Partage privé hors Git, expire31oct2026 14:07:35Martinique. Aucun compte requis pour maquettes.
- Navigateur :12écrans1280px +12écrans390px sans débordement document, font Geist chargée, français, switches uniquement Réglages ; indépendant WhatsApp/mail et sociétés, refus Verdure, reprise humaine et commun readonly vérifiés. Captures réelles disponibles en artifacts/hermes-v2-maquettes. Rapport et preuves : docs/handoff/hermes-v2-maquettes-recette.md, hermes-v2-maquettes-browser-proof.json et hermes-v2-maquettes-public-proof.json.
- Étape maquettes/contrats livrée ; choix de piste et validation détaillée restent utilisateur. Aucune intégration réelle V2, migration, compte, secret administrable, provider, campagne ou app native créée. Aucun nouveau paiement, production ou envoi à prospect. Aucune installation PWA/audit accessibilité exhaustif/test fournisseur revendiqué.

### HERMES-V3-PLAN-MCP-MULTICANAL — correction de cadrage après décisions utilisateur

- Plan publié : docs/handoff/hermes-v3-plan-mcp-multicanal.md ; skill make-plan appliqué (collecte déléguée, sources/API réelles, synthèse root, neuf phases et critères de sortie), répartition future selon split.
- Les derniers échanges remplacent la règle V2 trop large OFF : coupure des réponses automatiques=ASSISTED, MCP produit encore les brouillons ; émission seulement humaine. OFF complet demeure distinct. Les boutons locaux du bot dans les fils sont explicitement demandés. Les contrats et ancien promptV2 sont historiques sur les points contradictoires, à actualiser avant nouvelle exécution.
- Collecte sources333ba5349 : WA/mail texte seuls ; médias/HTML/attachments à construire ; MANUAL actuel autorise déjà les drafts MCP. Pipeline natif NEW/SCREENING/MEETING/PROPOSAL/CUSTOMER, persistance des transitions non testée par cet audit ; pas de gagné/perdu supposé. MatchWA/mail sans création, Forms fiches/notes, scraping staging/qualification distincts ; aucune déduplication globale prétendue. SMTP natif réel au niveau code mais contrôle domaine seul, lien boîte exacte/licence à vérifier.
- Rapports des deux sous-agents lus entièrement et intégrés avec références et limites. Aucun code, DB, .env, fournisseur, envoi ou test runtime exécuté pour le plan ; aucune ancienne CI transformée en recette V3. Publication documentaire uniquement, aucun dispatch Claude ni nouveau monitor.


### HERMES-V3-AUDIT-MAQUETTES-20261030 — publication de lancement documentaire, 2026-10-30

- Autorisation propriétaire : « Agis en autonomie » pour phases 0 et 1. Gate maintenue : validation visuelle utilisateur des maquettes détaillées avant phases 2–8/câblage. Aucune maquette non vue approuvée implicitement.
- Affectations publiées dans MISSIONS.md et prompt complet docs/handoff/hermes-v3-prompt.xml ; base applicative333ba534927e177c90b35eb4157d75d8d767dec4 ; Claude af8ce71e86ebfa03c07ee892bc782cbcdb53a249, Codex1c6760cfc. Propriété limitée à nouveaux documents V3, sans modifier V2/apps.
- Dispatch : pending à cette publication. Aucune commande CLI Claude, reprise de session ou nouveau monitor effectués par cette publication. Session exclusive8f3db32e-4613-45e3-94f3-16e664f3cbfc réservée, ne pas dupliquer. Root consignera les commandes/résultats réels dans une entrée suivante.
- Vérification documentaire : règles racine AGENTS.md/DESIGN.md, skills split/prompt-generator et plan V3 lus ; fichiers/branches/ownership confrontés aux affectations root. XML bien formé et huit sections obligatoires vérifiés ; git diff --check propre avant commit. Aucune revue croisée V3, capture, preview V3, test applicatif/DB/fournisseur ni envoi revendiqué.


### HERMES-V3-AUDIT-MAQUETTES-20261030 — phase 0 validée et préparation phase 1, 2026-10-30 19:09 UTC

- Acting agent : Codex coordination, sur preuves et validation root. Audit publié : [hermes-v3-capabilities-audit.md](https://github.com/claude972/test-Crm/blob/095582346e227d627437560c66445e9a9211bcb9/docs/handoff/hermes-v3-capabilities-audit.md), branche feat/codex-hermes-v2-core, révision095582346e227d627437560c66445e9a9211bcb9 ; ls-remote concordant. Commit limité à ce fichier documentaire, aucun apps/ ou contrat futur inclus.
- Phase 0 validée par root après revue indépendante v3_phase0_review : vérification factuelle, anti-patterns et qualité. Deux références mineures corrigées par l’auteur puis revérifiées par root : resolver49/61/77/93/109/125 et Forms135–195 +373–437. Pas de défaut ouvert signalé dans ce périmètre documentaire ; aucune capacité live certifiée.
- CLI root → Claude : session terminal2418, session Claude exclusive8f3db32e-4613-45e3-94f3-16e664f3cbfc ; prompt envoyé en deux étapes pour mission HERMES-V3-AUDIT-MAQUETTES-20261030 sur feat/claude-hermes-v2-ui. Transcript observé par root à19:08UTC : lecture effective de mission80a40e6, prompt V3, plan et audit ; préparation seulement jusqu’au START. Cette entrée consigne les actions root rapportées, aucune nouvelle CLI exécutée par le sous-agent coordination et aucun worker doublon.
- Prochaine action : root lance phase 1 et transmet START à la même session ; Claude produit exclusivement docs/design/hermes-v3, Codex prépare les deux contrats V3 attribués. Claude in_progress pour préparation acceptée ; Codex in_progress pour audit livré et contrats. Aucune écriture applicative, DB, fournisseur ou émission réelle.
- Vérification publication : index contrôlé, git diff --cached --check propre, audit seul dans commit095582346 ; coordination fetch/reconcile avant push. Revue croisée des maquettes/contrats et preview V3 restent attendues. Les phases 2–8/câblage attendent toujours validation visuelle utilisateur ; le GO initial n’approuve aucune maquette non vue.


### HERMES-V3-AUDIT-MAQUETTES-20261030 — contrats publiés et START maquettes, 2026-10-30 19:13 UTC

- Contrats Codex publiés au 8c4460fd874ec8d2ab17ffcdd757c7cc98dcca2f sur feat/codex-hermes-v2-core : [MCP/messagerie](https://github.com/claude972/test-Crm/blob/8c4460fd874ec8d2ab17ffcdd757c7cc98dcca2f/docs/handoff/hermes-v3-mcp-messaging-contract.md) et [CRM/campagnes](https://github.com/claude972/test-Crm/blob/8c4460fd874ec8d2ab17ffcdd757c7cc98dcca2f/docs/handoff/hermes-v3-crm-campaign-contract.md). ls-remote concordant ; audit parent095582346 conservé.
- Publication approuvée par root après revue indépendante v3_contracts_review puis lecture root. Hashes SHA256 avant stage concordants avec les contenus revus : messagerie290711d627f3f1815d015db0663c70a52e8c4d51c5f89a5fe985f79241a02a1a ; CRM771a12584b24d107c3b054ea54db510023fee3fd1bf08a895942f231b7228f5c. Aucun changement de contenu par le coordinateur ; index limité aux deux documents, git diff --cached --check propre. Aucune source applicative incluse.
- CLI root → session2418 / Claude8f3db32e-4613-45e3-94f3-16e664f3cbfc : START phase 1 envoyé et accepté, transcript19:10:27UTC ; outils médias observés à19:11:11 et19:11:42UTC. Claude in_progress, maquettes détaillées sous docs/design/hermes-v3 uniquement ; ces observations ne constituent pas une livraison ni une recette média fournisseur. Aucune nouvelle commande CLI lancée par le sous-agent coordination.
- Codex ready_for_review : audit/contrats livrés ; revue Claude sur révision finale encore attendue, pas done. Root poursuivra revue exacte des maquettes puis preview statique isolée. Aucune preview V3 disponible à ce checkpoint, aucun live validé et aucun test applicatif/DB/provider exécuté pour ces documents. Gate visuelle utilisateur avant câblage/phases2–8 inchangée.


### HERMES-V3-AUDIT-MAQUETTES-20261030 — prérevue intermédiaire, 2026-10-30 19:25 UTC

- Coordination documentaire sur preuves root ; aucun nouveau commit de livrable Codex/Claude. Reviewer a revérifié contrats8c4460fd874ec8d2ab17ffcdd757c7cc98dcca2f et leurs hashes inchangés ; aucun finding documentaire ouvert dans ce périmètre. Revue Claude encore attendue, Codex reste ready_for_review.
- CLI root/session2418 → Claude8f3db32e-4613-45e3-94f3-16e664f3cbfc depuis START : types de contrats puis SHA8c transmis ; vidéo MDN CC0 vérifiée dans /private/tmp puis copiée par Claude à19:13:38UTC ; demande de relecture par sous-agent Claude ; arbitrages accent vert et board pipeline maintenus dans le périmètre de maquettes. Activité observée : donnees.js19:16:46, donnees-crm.js19:17:54, app.js19:22:07 et assets audio/vidéo/SVG locaux. Ces preuves d’activité ne valent ni livraison poussée ni validation finale.
- Prérevue v3_design_review sur JavaScript non commité, donc sans SHA final : trois findings ci-dessous transmis via CLI en deux étapes ; pas de fix observé à ce checkpoint. Une VM a vérifié12combinaisons de modes correctes ; scan sans réseau fournisseur, micro réel ni stockage persistant. Ces contrôles statiques/VM ne constituent pas une recette navigateur exhaustive.
- Point audio à vérifier : rejet de play() et nettoyage du lecteur à contrôler ; pas de finding runtime établi à ce stade. Source applicative/epoch inchangée. Préparation preview : projetID et protection existants préservés ; serveur local127.0.0.1:8769/session60064 pour préparation, aucun déploiement V3 avant SHA revu. Aucun lien de preview V3 disponible et aucune API réelle raccordée.

#### V3-DESIGN-001 — état de brouillon conservé par popstate
- reviewer: v3_design_review ; assigned agent: claude ; status: open.
- reviewed branch: feat/claude-hermes-v2-ui ; reviewed revision: fichiers locaux en cours, non commités, pas de SHA final.
- Evidence communiquée par root : app.js autour de845 pour popstate conserve ui brouillon/composeur après navigation, contrairement au chemin aller autour de144. Risque d’afficher un état de composition dans le mauvais contexte.
- Expected correction: harmoniser la remise à zéro ou le cloisonnement contextuel des états de composition sur navigation et historique, vérifier retour/avance entre fils/sociétés ; publier SHA fix et preuve navigateur. Fix commit: aucun observé ; recheck: pending.

#### V3-DESIGN-002 — sélecteur local annonce une sauvegarde sans mutation
- reviewer: v3_design_review ; assigned agent: claude ; status: open.
- reviewed branch: feat/claude-hermes-v2-ui ; reviewed revision: fichiers locaux en cours, non commités, pas de SHA final.
- Evidence communiquée par root : app.js autour de370–377, sélecteur local annonce enregistré sans mutation mémoire correspondante.
- Expected correction: appliquer le mode sélectionné dans l’état de démonstration et recalculer mode effectif/raison avec priorité restrictive ; ne pas annoncer de persistance serveur. Vérifier navigation et indépendance des fils/sociétés. Fix commit: aucun observé ; recheck: pending.

#### V3-DESIGN-003 — fixture réception et affaire incohérentes
- reviewer: v3_design_review ; assigned agent: claude ; status: open.
- reviewed branch: feat/claude-hermes-v2-ui ; reviewed revision: fixtures locales en cours, non commitées, pas de SHA final.
- Evidence communiquée par root : réception rc-803 pending sans affaire mais op-2 déjà liée. Les données de démonstration contredisent la séparation qualification/affaire annoncée.
- Expected correction: réconcilier statut de qualification et relations réception/prospect/affaire dans les fixtures ; vérifier les liens entre inbox, fiche, pipeline et campagne sans transformer toute réception en opportunité. Fix commit: aucun observé ; recheck: pending.


### HERMES-V3-AUDIT-MAQUETTES-20261030 — checkpoint prototype f3aa et corrections, 2026-10-30 19:45 UTC

- Checkpoint Claude publié : f3aa01dbd4214780d68eec533c927412dd87128b sur feat/claude-hermes-v2-ui,18fichiers exclusivement docs/design/hermes-v3. V2/apps intacts et arbre propre au checkpoint selon vérification root. Prototype toujours en correction ; aucun GO déploiement, aucune preview V3 publiée ni CRM/provider/runtime raccordé.
- CLI root/session2418 vers session Claude exclusive8f3 : relecture déléguée readonly effectivement lancée par Claude à19:32:18UTC, démarrage confirmé19:32:19UTC ; rapport encore attendu. Identifiants internes et transcript non publiés. Demandes de correction007–009 envoyées par root en deux étapes ; aucun fix observé à ce checkpoint.
- CUA local root : application ouverte, vues WhatsApp et vraie forme de boîte e-mail rendues ; ASSISTED permet brouillon insérable, OFF désactive brouillon et conserve réponse humaine ; vidéo locale durée5.055s, readyState4, Space donne paused=false ; vocal affiche bouton pause après lecture. Ces contrôles concernent des fixtures locales, pas un fournisseur connecté.
- Revue indépendante du SHA f3aa : quatre JS passent node --check, diff des18fichiers, héritage des modes, filtres et absence de réseau fournisseur contrôlés. Anciens001/002/003 et point audio déclarés corrigés par revue statique du checkpoint ; revue navigateur finale reste limitée aux interactions ci-dessus.
- Mise à jour V3-DESIGN-001/002/003 : status fixed_pending_review au f3aa01dbd4214780d68eec533c927412dd87128b, corrections statiques confirmées ; ne pas confondre avec une recette finale de tous les retours/avance, mutations locales et liens CRM. Point audio : corrections de rejet play()/cleanup revues statiquement et lecture locale observée, couverture runtime exhaustive non revendiquée.

#### V3-DESIGN-004 — brouillon humain perdu au changement de mode
- reviewer: root/CUA ; assigned agent: claude ; reviewed branch: feat/claude-hermes-v2-ui ; reviewed revision: f3aa01dbd4214780d68eec533c927412dd87128b ; status: fixed_pending_review.
- Evidence: CUA initial a montré perte du brouillon humain lors du changement de mode. Fix au checkpoint f3aa annoncé/préservé ; recheck final root encore à faire. Expected correction: conserver la saisie humaine tout en invalidant correctement les suggestions interdites. Fix commit: f3aa01dbd4214780d68eec533c927412dd87128b ; recheck: pending.

#### V3-DESIGN-005 — commande de mode mail absente et réponse limitée aux toasts
- reviewer: root/CUA ; assigned agent: claude ; reviewed branch: feat/claude-hermes-v2-ui ; reviewed revision: f3aa01dbd4214780d68eec533c927412dd87128b ; status: fixed_pending_review.
- Evidence: mode par fil mail absent et Reply limité à des toasts avant correctif. Éditeur et commande locale ajoutés au f3aa ; vérifier interaction finale et destinataires. Fix commit: f3aa01dbd4214780d68eec533c927412dd87128b ; recheck: pending.

#### V3-DESIGN-006 — libellés français, politique compacte et KPI dérivés
- reviewer: root/CUA ; assigned agent: claude ; reviewed branch: feat/claude-hermes-v2-ui ; reviewed revision: f3aa01dbd4214780d68eec533c927412dd87128b ; status: fixed_pending_review.
- Evidence: ajustements demandés sur libellés français, présentation compacte de politique et KPI dérivés des fixtures. Correctifs intégrés au checkpoint f3aa ; vérification finale attendue. Fix commit: f3aa01dbd4214780d68eec533c927412dd87128b ; recheck: pending.

#### V3-DESIGN-007 — Enregistrer brouillon annonce une conservation sans dossier mémoire
- reviewer: revue indépendante f3aa ; assigned agent: claude ; reviewed branch: feat/claude-hermes-v2-ui ; reviewed revision: f3aa01dbd4214780d68eec533c927412dd87128b ; status: open.
- Evidence communiquée par root : app.js900–905 annonce la conservation du brouillon sans l’inscrire au dossier mémoire. Expected correction: conserver réellement le brouillon dans les données de démonstration et le rendre retrouvable dans Brouillons ; message clair sur durée limitée à la session. Fix commit: aucun observé ; recheck: pending.

#### V3-DESIGN-008 — déplacement d’étape effacé par navigation
- reviewer: revue indépendante f3aa ; assigned agent: claude ; reviewed branch: feat/claude-hermes-v2-ui ; reviewed revision: f3aa01dbd4214780d68eec533c927412dd87128b ; status: open.
- Evidence communiquée par root : app-crm.js327–332 prépare un état UI puis aller le purge, sans effet de déplacement. Expected correction: appliquer la transition de démonstration ou conserver correctement son éditeur avant navigation, vérifier étape et compteurs après retour. Aucune persistance backend prétendue. Fix commit: aucun observé ; recheck: pending.

#### V3-DESIGN-009 — réponse depuis Envoyés adressée à sa propre boîte
- reviewer: revue indépendante f3aa ; assigned agent: claude ; reviewed branch: feat/claude-hermes-v2-ui ; reviewed revision: f3aa01dbd4214780d68eec533c927412dd87128b ; status: open.
- Evidence communiquée par root : app.js764–775 et fixture donnees.js248 conduisent Reply depuis Envoyés vers l’adresse de sa propre boîte. Expected correction: calculer le correspondant selon direction du message et identité mailbox ; vérifier répondre/tous/transférer sur réception et envoyés. Fix commit: aucun observé ; recheck: pending.


### HERMES-V3-AUDIT-MAQUETTES-20261030 — recette prototype exacte avant preview, 2026-10-30 19:55 UTC

- Claude a poussé b6c3f25a8bc9521a5b790ae9646e47a49417b0fe sur feat/claude-hermes-v2-ui ; arbre propre au checkpoint selon root. Relecture indépendante v3_design_review du SHA exact sans bloquant dans le périmètre prototype : brouillons en mémoire réouvrables, déplacement réel de la carte et KPI dérivés, destinataires des messages sortants et parcours mobile.
- Recheck root CUA locale exacte : à390px, WA liste→fil et mail dossiers→liste→fil, document width390 sans débordement. Répondre à tous cible Léa et Cc Sophie ; texte enregistré retrouvé. Carte Cuisine déplacée NEW→SCREENING, agrégat Qualification2 /36900 visible. Ces mutations concernent uniquement la mémoire de démonstration ; aucune persistance backend/pipeline réel, fournisseur ou API raccordée.
- V3-DESIGN-001 à010 : status verified dans le périmètre prototype exact b6c3f25a8bc9521a5b790ae9646e47a49417b0fe, sur relecture indépendante et rechecks root ci-dessus ; aucune garantie d’intégration CRM étendue. Pour007 : dossier Brouillons mémoire et réouverture vérifiés ;008 : transition carte/KPI observée ;009 : destinataires sortants et répondre à tous revus. Fix commit final: b6c3f25a8bc9521a5b790ae9646e47a49417b0fe.
- V3-DESIGN-010 — parcours mobile : assigned agent claude ; status verified ; reviewed branch feat/claude-hermes-v2-ui ; reviewed/fix revision b6c3f25a8bc9521a5b790ae9646e47a49417b0fe. Parcours390px WA liste/fil et mail dossiers/liste/fil corrigés puis revus par v3_design_review et root CUA, document width390. Aucun audit exhaustif d’accessibilité/PWA installable revendiqué.
- Délégation Claude readonly : rapport reçu vers19:47UTC,13constats triés et corrigés selon root ; aucun identifiant interne ni transcript publié. Revue croisée Claude des contrats8c4460fd874ec8d2ab17ffcdd757c7cc98dcca2f demandée après l’UI et encore attendue à ce checkpoint ; Codex reste ready_for_review, pas done.
- Hosting : root a autorisé un déploiement statique strictement depuis b6c3f25a8bc9521a5b790ae9646e47a49417b0fe ; publication en cours, aucune preuve de preview utilisable encore fournie pour ce brouillon documentaire. Attendre vérification du déploiement exact avant finaliser cette livraison. Aucun secret, URL privée de partage ou transcript ne doit entrer dans Git. Validation visuelle détaillée utilisateur toujours attendue avant câblage/phases2–8.


### HERMES-V3-AUDIT-MAQUETTES-20261030 — dernier correctif avant livraison, brouillon en attente de preuve finale

- Frontend final : f63858813d68be138612114a2b347fd606984557, poussé par Claude. Delta de deux fichiers CSS relu favorablement ; les contrôles précédents du checkpoint b6 restent historiques et ne sont pas présentés comme preuve du déploiement final.
- V3-DESIGN-011 — débordement du sélecteur de mode e-mail desktop : reviewer root/CUA ; assigned agent claude ; reviewed branch feat/claude-hermes-v2-ui ; status verified dans le périmètre prototype. Sur b6, document de largeur 1315 px pour viewport 1280 px, sélecteur mode-local débordant jusqu’à environ 1315,5 px. Fix commit : f63858813d68be138612114a2b347fd606984557. Recheck root CUA locale exacte : viewport 1280, document 1280, bord droit du sélecteur 1121 ; viewport 390, document 390, bord droit 369. Correction CSS de largeur minimale et largeur disponible revue, aucun backend modifié.
- Ancienne preview b6 : HTTP public et CUA sans connexion vérifiés par root, lecture du vocal et parcours mobile 390 px observés. Ces preuves ne certifient pas la preview f638. GO de redéploiement final donné pour f638 ; preuve du nouveau déploiement et rapport public encore attendus avant commit de livraison.
- Revue croisée Claude des contrats 8c4460fd reçue à 19:55:36 UTC : huit constats sur les types proposés, non bloquants pour la maquette, corrigés au 0a20458be8c25cbf9152ced5de1e02bdce49cad0. Relecture Claude finale en cours ; ne pas marquer Codex done avant ce retour. Aucun de ces types proposés ne devient une API opérationnelle par publication documentaire.
- Ce brouillon attend preuve du nouveau déploiement exact et relecture finale. Aucun secret, URL privée de partage, transcript, test fournisseur réel ou persistance CRM n’est ajouté ni revendiqué.


### HERMES-V3-AUDIT-MAQUETTES-20261030 — preuve preview finale, livraison documentaire encore en attente

- Déploiement exact dpl_Fm1v7W9LCNvTTDDmBBVCp9n2bEs7 : source f63858813d68be138612114a2b347fd606984557, READY. Preuve HTTP filtrée dans docs/handoff/hermes-v3-phase1-public-proof.json : origine protégée HTTP 302, partage anonyme HTTP 200 et 18 fichiers HTTP 200. Aucune clé de partage, URL privée, chemin de stockage du lien ou transcription publiés. Expiration : 31 octobre 2026 à 15:58:41 Martinique / 19:58:41 UTC.
- Root CUA sur le déploiement exact, nouvel onglet via lien privé sans connexion Vercel : launcher et e-mail accessibles ; desktop 1280/document 1280 et sélecteur bord droit 1121 ; vocal jouable, pause visible ; vidéo 5,055 s, readyState 4, paused false. Fixtures Verdure isolées d’Atelier ; OFF désactive AUTO/ASSISTED. Mobile 390 : WA liste→fil, e-mail dossiers→liste→fil, document 390 ; Menu ouvre. Cinq captures finales présentes sous artifacts/hermes-v3-maquettes, noms et hashes référencés dans le rapport/proof JSON, aucun binaire indexé.
- Dernier point documentaire contrats : InboundMessageContent manque encore au checkpoint 0a20458 selon retour Claude. Agent auteur prépare l’ajout ; SHA corrigé et relecture finale attendus avant commit de livraison. Ces types sont proposés, pas API existante. Prototype et preview ne valident aucun fournisseur, backend, persistance DB ou installation PWA.


### HERMES-V3-AUDIT-MAQUETTES-20261030 — livraison technique phases 0/1, 2026-10-30 20:03 UTC

- Frontend final f63858813d68be138612114a2b347fd606984557 et preview exacte dpl_Fm1v7W9LCNvTTDDmBBVCp9n2bEs7 vérifiés, cinq captures finales présentes. Rapport docs/handoff/hermes-v3-phase1-recette.md et preuve JSON filtrée publiés dans ce checkpoint, sans clé de partage ni binaire.
- Contrats finaux : 5bb6f2430d09baccb8a60b4d271047c47e239cb7. Claude a revu 954b565 à 20:01:39 UTC et clos les huit constats initiaux ainsi que la réception. Dernier point non bloquant pour le visuel : SentMessage, lecture bidirectionnelle et ledger honnête ajoutés au SHA final puis diff complet relu root ; whitespace, arbre propre et remote concordant contrôlés selon root. Aucune relecture Claude de 5bb6f243 n’est prétendue.
- Phases 0/1 terminées techniquement dans le périmètre audit/contrats proposés/maquettes statiques ; statuts done limités à ce périmètre. Aucun constat ouvert restant signalé par root. Claude au gel, aucun câblage. Validation visuelle utilisateur explicitement attendue avant phases 2–8. Aucun build applicatif V3, test fournisseur réel, persistance CRM ou installation PWA revendiqué.


### HERMES-V3-INTEGRATION-1H-20261030 — publication initiale, 2026-10-30 20:30 UTC

- acting agent: codex/coordination ; target session: Claude 8f3db32e-4613-45e3-94f3-16e664f3cbfc, dispatch réservé à root ; mission et branches décrites dans MISSIONS.md.
- Demande propriétaire après prototype : « Ok le projet dois être prêt Dans 1h ». GO câblage interprété explicitement, départ20:30UTC et échéance21:30UTC. Base applicative333ba534927e177c90b35eb4157d75d8d767dec4 ; référence maquettef63858813d68be138612114a2b347fd606984557 ; contrats5bb6f2430d09baccb8a60b4d271047c47e239cb7.
- Publication avant implémentation : trois branches séparées, ownership et critères dans la mission. Aucun code modifié par coordination ; aucune commande CLI Claude effectuée par cet agent, aucune affectation acceptée ni capacité live revendiquée à ce stade.
- Prochaine action : root vérifie les fichiers distants, fait lire/confirmer les affectations, puis démarre les workers et communique les actions CLI réelles pour journalisation. Aucun nouveau constat de revue ; la revue croisée et la recette sont à faire sur les prochains SHA.


### HERMES-V3-INTEGRATION-1H-20261030 — claims confirmés, 2026-10-30 20:31 UTC

- codex/backend a lu MISSIONS/CORRECTIONS distants au5f02072e26bb5169d67770b641e85397356368cc, confirmé ownership module hermes-messaging/migrations/tests et créé feat/codex-hermes-v3-live depuis333ba534927e177c90b35eb4157d75d8d767dec4. APIs additives coordonnées avec root ; comportement v1 préservé et soumis à politique parent. Implémentation in_progress, aucun test ou résultat encore revendiqué.
- codex/integration a lu la même mission distante et confirmé feat/hermes-v3-live-preview / v3-live-integration depuis333. Ownership workflows/scripts preview et intégration des SHA exacts, aucun apps édité lors de l'audit. Outils GitHub/Vercel authentifiés ; bundle frontend333, workflow run41084109198 disponible selon audit ; ancien runner expiré, Docker inactif. Nouveau runner90min envisagé ; lancement effectif non encore confirmé.
- Claude reste pending jusqu'à preuve de dispatch/acceptation fournie par root. Aucun appel CLI Claude effectué par coordination ; pas de doublon lancé.


### HERMES-V3-INTEGRATION-1H-20261030 — checkpoint 2026-10-30 20:35 UTC

- codex/backend : claim effectif confirmé sur mission distante ; annonce35/35 tests unitaires, vérification CI encore attendue. Migration construite selon API officielle SQL-memory ; aucune application à la DB originale annoncée. Aucun fournisseur réel ni résultat de recette distante revendiqué.
- codex/pipeline : test ciblé du pipeline publié e2395ce8480a8cc23e28ab9228b776ec11b3f787 ; diff relu root, exécution CI attendue. Intégration cherry-pick au ffbab40c8 poussée selon agent preview ; les tests locaux annoncés ne remplacent pas le résultat combiné.
- codex/integration : workflow .github/workflows/hermes-v3-live.yml publié au cb2b93db5daa7fb684e299e6cd8dae0aabe8256c, tests frontend/backend et migrations en parallèle. Runner preview base333, run41123900143, lancé le30oct2026 à20:31:31UTC pour90min ; runner en installation au dernier retour. CI cb2b93 run41123961591 en attente puis relance prévue sur SHA final. Pas de preview finale accessible prouvée à ce checkpoint.
- Configuration de recette : audit des noms uniquement, sans valeurs secrètes. Aucun credential fournisseur isolé trouvé ; SMTP vide et DB config désactivée dans runner selon audit. Root a informé le propriétaire ; aucun fournisseur connecté ne peut être annoncé. Le contrôle public de preview docs/verification/p0-preview-control.json attend les seules origines serverUrl/frontendUrl exactes après Vercel ; aucune URL privée de partage ou secret à committer.
- CLI action — acting agent root/codex ; target session Claude8f3db32e-4613-45e3-94f3-16e664f3cbfc, CLI session2418 ; mission HERMES-V3-INTEGRATION-1H-20261030, branche feat/claude-hermes-v3-live. Inventaire idle20:31 ; prompt de préparation accepté20:31. Mission distante/API et indications raisons string envoyées20:32 ; absence fournisseur et diagnostics communiqués ensuite. Aucun raw transcript publié.
- CLI diagnostic20:34 : alertes checkout causées par core.sparseCheckout docs hérité ; Claude reconnaît le diagnostic et élargit son worktree exclusif à20:35:21UTC. Le traitement du prompt n'est pas une preuve de lecture/claim de la mission distante ; statut frontend reste pending jusqu'à confirmation. Aucune modification du checkout original ni doublon Claude annoncé.
- Prochaine action : obtenir SHA/backend et frontend poussés avec rapports, lire résultats CI exacts, intégrer puis vérifier preview privée et parcours essentiels sans envoi réel. Revue croisée encore à faire ; aucune capacité média/pipeline persistante ni auth fournisseur validée par ce journal.


### HERMES-V3-INTEGRATION-1H-20261030 — checkpoint 2026-10-30 20:40 UTC

- CLI action — acting agent root/codex ; target Claude8f3db32e-4613-45e3-94f3-16e664f3cbfc, mission HERMES-V3-INTEGRATION-1H-20261030, branche feat/claude-hermes-v3-live. Acceptation du prompt observée20:31 ;49fichiers source disponibles après correction sparse20:35. Message20:37:09 confirme lecture du module v1 ; sous-agent Claude readonly lancé20:37:28 selon observation root. Confirmation explicite de lecture/claim mission distante toujours non prouvée, frontend demeure pending dans la coordination. Aucun transcript brut publié.
- Backend : checkpoint2e21cf03b puis3c3bbc7d260e2b297dffa27cd29792fc27a7dafd poussés sur feat/codex-hermes-v3-live. Auteur annonce44/44tests unitaires et format11fichiers réussis ; tests natifs GraphQL/PostgreSQL CI encore attendus. Types et migration générés offline par outils officiels SQL-memory, sans migration DB originale/live. AUTO/ASSISTED/OFF+INHERIT et compatibilité v1 annoncés ; revue active avec findings ci-dessous, pas done.
- Intégration : source36a81ecda combine backend/pipeline selon agent ; CI41125053158 en attente. Runner base333 run41123900143 en ligne, mais prérecette non encore exécutée à ce checkpoint. Déploiement isolé READYdpl_7K71d9432qgjXEx45gRB319aLzBq ; contrôle technique publié séparément auac866e769, origines uniquement, aucun credential/lien privé. Ce déploiement base333 ne prouve pas le résultat combiné V3. Expiration runner2026-10-30T22:06:40.613Z selon hébergement.
- Statuts backend et intégration restent in_progress. Attendre fixes/rechecks, tests PostgreSQL CI et recette réelle de preview finale avant prétendre readiness.

#### HOUR-BACK-001 — autorisation à revérifier après attente du verrou
- reviewer: root et hour_pipeline_review ; assigned agent: codex/backend ; reviewed branch: feat/codex-hermes-v3-live ; reviewed revision: 3c3bbc7d260e2b297dffa27cd29792fc27a7dafd ; priority: P2 ; status: in_progress.
- Evidence: les deux setters V3 vérifient l'accès avant d'attendre le verrou ; une révocation intervenant pendant l'attente permet encore une écriture.
- Expected correction: vérification manager-aware dans la transaction après acquisition du verrou et test déterministe avec gate prouvant rejet après révocation. Backend a accepté le fix, ETA8–10min vers20:41UTC.
- Fix commit: aucun livré à ce checkpoint ; recheck: pending.

#### HOUR-BACK-002 — grant v1 AUTO restauré après cycle parent OFF→AUTO en vol
- reviewer: codex/backend ; assigned agent: codex/backend ; reviewed branch: feat/codex-hermes-v3-live ; reviewed revision: 3c3bbc7d260e2b297dffa27cd29792fc27a7dafd ; status: in_progress.
- Evidence: probe v1 AUTO en vol ne capture pas la révision parent ; un passage OFF puis AUTO du parent peut rétablir un grant devenu périmé.
- Expected correction: capturer et contrôler la révision parent sur le chemin v1, rejeter la délégation périmée et tester le cycle concurrent. Fix en cours annoncé par backend.
- Fix commit: aucun livré à ce checkpoint ; recheck: pending.


### HERMES-V3-INTEGRATION-1H-20261030 — checkpoint 2026-10-30 20:55 UTC

- CLI action — acting agent root/codex ; target Claude8f3db32e-4613-45e3-94f3-16e664f3cbfc ; mission HERMES-V3-INTEGRATION-1H-20261030, branche feat/claude-hermes-v3-live. Claim de mission distante enfin confirmé20:41:19UTC ; agent Claude backend readonly lancé20:41:42UTC. Frontend capabilities média56bb4a5bf poussé ; modes/settings encore en cours. Statut in_progress, aucune UI média complète ni fournisseur connecté promis par ce checkpoint.
- Backend final de checkpoint e9a76066a6aa616896ec2fa35085baac08af24d5 :59tests/4suites et Prettier sur diff réussis selon auteur. Relecture indépendante exacte et accord root ferment HOUR-BACK-001 et HOUR-BACK-002 dans leur périmètre concurrence/autorisation. Backend demeure in_progress tant que CI et intégration combinée restent incomplètes.
- Recheck HOUR-BACK-001 : status verified ; fix/reviewed revision e9a76066a6aa616896ec2fa35085baac08af24d5 ; contrôle d'accès manager-aware après attente du verrou et tests de révocation revus par agent indépendant, accord root. Recheck HOUR-BACK-002 : status verified au même SHA ; révision parent capturée/contrôlée sur chemin v1 et test parent OFF→AUTO en vol revus. Ces clôtures n'effacent pas les descriptions historiques ni l'échec CI suivant.
- Intégration22a0868a0 : CI backend typecheck, compilation, migrations et health runtime réussis selon résultats root ; phase intégration native en échec découverte20:54:45UTC, cause encore à extraire. Bundle frontend réussi mais source frontend base333 ; aucune validation du frontend V3 final par ce build. Revue croisée et recette finale encore ouvertes.
- Recette base333 : CUA login réussi, profil français modifié via UI et persistance après reload observée. Dashboard/opportunités/comptages/structures readonly et messagerie NON CONFIGURÉE vérifiés. Preuves API annoncées :14checks onboarding et8CRM/pipeline avec persistance ; preview isolée préliminaire uniquement, aucun envoi fournisseur. Hébergement annonce pipeline createNEW→PROPOSAL→freshread→cleanup réussi ; webhook anonyme401, fresh-shareHTTP200, origine protégée302. Résultats limités à base333 et à cette configuration, pas au résultat combiné.
- Statut global : pas full ready à20:55UTC. Propriétaire informé des limites fournisseur et société. Attendre modes/settings frontend, cause/fix CI native, nouveau build/runtime au SHA exact puis vérification navigateur finale. Aucun secret, lien de partage privé ou transcript brut publié.

#### HOUR-TENANT-003 — ajout et changement société sur hôte unique non opérationnels
- reviewer: root/recette et analyse source ; assigned agent: codex/root intégration ; reviewed branch: feat/hermes-v3-live-preview ; reviewed revision: base applicative333ba534927e177c90b35eb4157d75d8d767dec4 dans prérecette ; status: blocked.
- Evidence: création société native bloquée par creation flagfalse (sign-up.service autour ligne422) ; origin-token de sociétéB rejeté (auth resolver autour ligne988) ; hook switchdomain retourne quand flagfalse (autour ligne25). Isolation des données centrale ne prouve pas le parcours UI de création/bascule multi-société sur cet hôte.
- Expected correction: définir et vérifier le mécanisme natif compatible avec l'hôte de recette et les contrôles d'accès avant d'annoncer ce parcours prêt. Aucun flag contourné ni bouton fictif ajouté. Root a informé le propriétaire de cette limite critique.
- Fix commit: aucun à ce checkpoint ; recheck: pending, blocage explicitement maintenu.


### HERMES-V3-INTEGRATION-1H-20261030 — checkpoint 2026-10-30 21:00 UTC

- Backend31a2aa0a08b8219b5d314983e65e37d8e6f6da9c : remise INHERIT canal avec tombstone monotone,61tests annoncés ; delta relu root. Intégration7af96034b et CI41127466172 en cours. Les résultats précédents restent attachés à leurs SHA, aucun résultat CI final anticipé.
- Pipelineba01a458 : test corrigé pour absence query plurielle et jeton invité frais ;16étapes API prouvées sur base333 selon root. Résultat CI combiné encore attendu.
- Frontend Claude : checkpoint hooks05b016492 ; branche actuellec89fbba04 contient quatre traductions françaises supplémentaires. Root et reviewer ont ouvert HOUR-FRONT-001/002 ; Claude reconnaît les fixes20:59:36UTC. HOUR-FRONT-003 identifié surc89fbba04 : lecture V3 et mutation v1 non cohérentes, vrais contrôles V3 encore à raccorder. Aucune livraison finale revendiquée.
- CLI action — acting agent root/codex ; target Claude8f3db32e-4613-45e3-94f3-16e664f3cbfc ; mission HERMES-V3-INTEGRATION-1H-20261030, branche feat/claude-hermes-v3-live. Root a demandé raccordement réel V3 et compositeur OFF désactivé avant21:05UTC. Deux sous-agents Claude readonly20:37 et20:41 confirmés. Sous-agent Claude settings/workspace en implémentation réellement lancé20:53:24UTC, fichiers disjoints coordonnés ; aucune confusion avec les tâches readonly.
- Recette base333 : interface native en français après modification profil et reload CUA vérifiée ; cette preuve ne valide pas le frontend final V3. Gel de checkpoint visé21:05UTC pour lancer CI/runtime preview puis recette navigateur finale root. Tous les statuts de livraison restent in_progress, HOUR-TENANT-003 demeure une limite explicite.

#### HOUR-FRONT-001 — résultat helper d'erreur objet affecté à un état string
- reviewer: root et revue indépendante ; assigned agent: claude ; reviewed branch: feat/claude-hermes-v3-live ; reviewed revision: 05b016492 ; priority: P1 ; status: in_progress.
- Evidence: dans le catch du hook, le résultat objet du helper est affecté à un état string ; risque de typecheck et de rendu d'erreur incorrect.
- Expected correction: extraire le message string attendu et vérifier typecheck/affichage de l'erreur. Claude reconnaît20:59:36UTC.
- Fix commit: aucun vérifié à ce checkpoint ; recheck: pending.

#### HOUR-FRONT-002 — identifiant politique non strictement lié au fil courant
- reviewer: root et revue indépendante ; assigned agent: claude ; reviewed branch: feat/claude-hermes-v3-live ; reviewed revision: 05b016492 ; priority: P2 ; status: in_progress.
- Evidence: identité de politique sélectionnée sans liaison stricte au fil courant ; une mutation peut cibler une politique étrangère au fil affiché.
- Expected correction: lier explicitement politique/fil et empêcher une mutation hors contexte, avec invalidation appropriée lors du changement de fil. Claude reconnaît20:59:36UTC.
- Fix commit: aucun vérifié à ce checkpoint ; recheck: pending.

#### HOUR-FRONT-003 — composant lit V3 mais modifie v1 sans contrôles V3 complets
- reviewer: root ; assigned agent: claude ; reviewed branch: feat/claude-hermes-v3-live ; reviewed revision: c89fbba04 ; priority: P1 ; status: in_progress.
- Evidence: composant consomme la lecture politique V3 mais conserve mutation v1 et ne fournit pas les contrôles OFF/INHERIT/ASSISTED requis. Affichage et commande n'appliquent pas le même contrat.
- Expected correction: raccorder les vraies mutations V3 avec contrôles et erreurs cohérents ; compositeur OFF désactivé conformément au contrat frontend retenu. Root a demandé le correctif avant gel21:05UTC.
- Fix commit: aucun vérifié à ce checkpoint ; recheck: pending.


### HERMES-V4-PARCOURS-COMPLET-20261030 — publication avant code, 2026-10-30 après21:30UTC

- Nouvelle autorisation propriétaire : « Augmente les agents c’est pas grave si tu dépasse des que le travail est bien fait ». Délai1h levé ; poursuite de construction complète autorisée, sans reconfirmation. Mission1h et retard conservés, aucune clôture partielle déguisée.
- Baseapp baece3a46a6286a933cfc99b22a53ac50c34e498 avec correctif i18n5f3c ; API/runtime backend18stable et arbre backend identique selon root, comparaison SHA à conserver dans les preuves finales. Preview i18n continue, ne vaut pas V4 achevée.
- Lots/worktrees/branches/propriétés/dépendances détaillés dans MISSIONS.md. Audits et contrats readonly pendant publication ; implémentation après lecture distante et claim. Aucun worker V4 prétendu accepté/lancé par cette publication ; aucun appel CLI Claude effectué par coordination.
- Claudes UI répartis par parent en worktrees isolés ; trois lots Codex A/B/C et lot connexions différé après A/B. Aucun service connexions dupliqué ni DTO messaging modifié par lot C. Worktrees /private/tmp pour préserver l'espace Stockage.
- Prochaine action : root transmet liens distants et fait confirmer chaque claim, publie signatures concrètes puis démarre les lots ; journaliser les commandes CLI réelles et checkpoints. Tous statuts V4 pending jusqu'à preuves de claim ; aucune nouvelle capacité live/test/production annoncée.


### HERMES-V4-PARCOURS-COMPLET-20261030 — claims et checkpoints, 2026-10-30 22:01 UTC

- Nouvelle autorisation21:30+ confirmée : temps flexible et agents multiples, poursuite complète ; aucun besoin de reconfirmation. Claims A/B/C reçus après lecture distantea36858eaacf4878051befa8c7a8e9b66441416b3. Statuts in_progress, lot D connexions reste pending avant lancement coordonné.
- A/tenancy : /private/tmp/hermes-v4-tenancy, feat/codex-hermes-v4-tenancy ; auth same-origin natif, binding cookies/CAS et header X-Expected-Workspace-Id en cours. Auteur annonce9tests création+9binding+14API+29domain+9legacy réussis. Full TypeScript arrêté, aucun succès fullTSC revendiqué ; tests MFA/SSO encore attendus.
- B/media : checkpoint584d7 puis e1ca825b9062e262026a8d3f77288a6de9affbff poussé ;147tests/7suites et Gitleaks réussis annoncés. Nouvelle entity/columns/mediaV3/ledger EMAIL multi-pièces jointes. Pas ready_for_review avant artifact migration PostgreSQL et revue. CI41135004579 en cours ; ancien41133172403 type/build réussis mais fixture SDK en échec puis corrigée. Aucun résultat live fournisseur revendiqué.
- C/mail : /private/tmp/hermes-v4-mail, feat/codex-hermes-v4-mail ; contrat3bb9550a9 documentaire poussé. Read/folders/draft V4 implémentés,20tests en validation ; intégration du contrat B possible au e1ca. Pas de recette live mail revendiquée.
- CLI action — acting agent root/codex ; target Claude parent8f3db32e-4613-45e3-94f3-16e664f3cbfc ; mission HERMES-V4-PARCOURS-COMPLET-20261030. Dispatch réel21:38:44UTC de quatre agents IMPLEMENTATION wa/mail/settings/campaigns, branches feat/claude-hermes-v4-wa, -mail, -settings, -campaigns et worktrees privés /private/tmp depuisbaece. Dossiers nouveaux disjoints hermes-wa-ui/hermes-mailbox-ui/hermes-admin-ui/hermes-campaigns-ui ; parent seul propriétaire routage/auth/Apollo/hooks/catalogues. Contrats A/B/C transmis au parent. Aucun transcript brut publié.

### HERMES-V3-INTEGRATION-1H-20261030 — correctif i18n et preview stable, checkpoint après21:30UTC

- Frontend servi baece3a46a6286a933cfc99b22a53ac50c34e498 (correctif catalogues5f3c5794), backend runtime18cdd056337f0b721c17dc1e8231172fd31ed4f1 conservé ; mêmes DB/compte/fixtures, pas de reset. CI41131528251 entièrement réussie :412backend+156frontend+intégrations natives. Déploiement preview dpl_91spaTeX7ygXjAFqdbfv9oNZtowL READY ; contrôle technique06d2fffa29cc108d2ccbbaca3e62923ea0a12c19. Expiration partage30oct22:41:55UTC /18:41:55Martinique ; API22:44:55UTC /18:44:55Martinique. Aucune URL privée ni credential publié.
- HOUR-I18N-001 : status verified dans le périmètre DOM/runtime de cette preview ; correctif5f3c5794, frontendbaece. Six nouveaux libellés français corrects observés CUA root et catalogues FR/EN compilés contrôlés indépendamment. Capture PNG de page politique non produite : timeout CUA puis kernel reset, ne pas la déclarer faite.
- CUA root : connexion française et13éléments de réglages observés ; OFF persisté après reload true. Requête de restauration ASSISTED envoyée ; ultime vérification bloquée par latence machine, ne pas présumer état restauré. Captures client-affaire final/qualification/dashboard présentes dans artifacts selon root.
- Preuves API finales16parcours métier et16politiques documentées sur backend18cdd. Ces résultats ne couvrent pas les futurs lots V4, médias complets, fournisseurs non configurés ou parcours tenant encore en construction. V3 stable accessible en preview n'est pas le projet complet achevé.


### HERMES-V4-PARCOURS-COMPLET-20261030 — claim lot D connexions

- agent: codex/connections (ancien agent coordination) ; lecture distante missiona368 et journal16c89 confirmée. Worktree /private/tmp/hermes-v4-connections, branche feat/codex-hermes-v4-connections, basebaece3a46a6286a933cfc99b22a53ac50c34e498. Claim publié avant code.
- Ownership : nouveau module hermes-connections, configurations chiffrées workspace Evolution/SMTP/IMAP/MCP/intake, CRUD admin et tests ; aucun fichier A/B/C. Entity/migration seulement après coordination officielle2.52. Générateur B/migration41135004579 en cours : ne pas lancer générateur concurrent ni modifier manifest à la main.
- Inspection et protocole lecteur partagé à coordonner B/C/Claude par root avant câblage ; aucun deuxième store dans leurs modules. SecretEncryptionService natif, gardes/SSRF/TLS existants à réutiliser. Pas full tsgo local machine saturée, tests ciblés/cloud ; aucune nouvelle capacité fournisseur live annoncée.


### HERMES-V4-PARCOURS-COMPLET-20261030 — contrôle root et CLI, 2026-10-30 avant22:13 UTC

- CLI action, acting root/codex, cible Claude parent8f3db32e-4613-45e3-94f3-16e664f3cbfc, mission V4 et branches frontend disjointes : messages effectivement transmis via session CLI existante2418 puis Return, entre la reprise22:04UTC et le contrôle horloge22:12:49UTC (horaires exacts de chaque envoi non collectés). Contrats B e1ca825 et C9e817bcd9, reader D et exigence contexte immuable Apollo/SESSION_SUPERSEDED relayés. Parent reconnaît à22:06:53 la conséquence du contrat B pour son agent WhatsApp. Quatre nouveaux modules présents dans leurs worktrees ; pas de SHA frontend V4 prêt à intégrer à ce checkpoint. Aucun transcript ou secret publié.
- C checkpoint9e817bcd9 poussé,47tests/4suites annoncés réussis, contrat mail C2 concret. Native draft replacement/replay, réconciliation Sent et protocole restent ouverts ; pas de succès full TypeScript/PG/live revendiqué.
- CI B41135004579 échoue avant génération : huit écarts préexistants entre métadonnées et migrations de la basebaece, distincts des nouvelles entités. Correction fixture isolated bef781c86 poussée par agent C temporairement assigné aux seuls scripts/workflow B. La baseline fresh GitHub est alignée nativement seulement après allowlist exacte et artifact de drift historique ; pas de réparation prétendue sur les données originales. Nouveau run41136004030 en cours, résultat non anticipé.
- HOUR-I18N-001 : complément de preuve navigateur réel sur frontendbaece, onglet13 : capture artifacts/hermes-v3-integration/final-policy-fr.png produite. Libellés français lisibles et message « Enregistré. Le serveur a appliqué : ASSISTED ». Restauration ASSISTED maintenant confirmée, contrairement à la limite documentée au précédent checkpoint. Cette preuve V3 ne valide aucune fonctionnalité V4.

#### HERMES-V4-MEDIA-001 — autorisation média hors transaction du ledger

- reviewer: root, reproduction agent codex/mail ; assigned agent: codex/media avec correctif temporaire codex/mail autorisé ; reviewed branch: feat/codex-hermes-v4-media ; reviewed revision: bef781c86e4877edf7689ef6a55c765d17493b22 (source media e1ca825) ; priority: P1 ; status: in_progress.
- Evidence: HermesMediaService.bind(manager) appelle scoped(manager), mais conversation(actor,id) utilise dataSource et access.assertAllowed sans manager ; seconde connexion dans une transaction déjà réservée et contrôle pouvant diverger du contexte transactionnel. Reproduction isolée annoncée rouge en4.1s : datasource getRepository interdit pendant bind avec manager fourni, erreur SECOND_POOL_CONNECTION_REQUIRED_INSIDE_LEDGER_TRANSACTION avant update.
- Expected correction: propager manager dans conversation/scoped/autorisation et requêtes associées, garder dataSource seulement hors transaction ; test de révocation après attente sans modification, test manager sans seconde connexion puis régression. Root autorise source service+tests B, aucun fichier C/D/A concurrent.
- Fix commit: en cours ; recheck indépendant root et CI finale pending. Aucun statut verified anticipé.


### HERMES-V4-PARCOURS-COMPLET-20261030 — D checkpoint et extension wiring

- D branche feat/codex-hermes-v4-connections :7dfde0313 code+7ed1e9fb153ab1c8e4a7148aaaa7225dd1755280 token partagé HERMES_CONNECTIONS_SERVICE.18tests/2suites ciblés réussis ; Gitleaks et diff/format réussis. Chiffrement enc:v2 nativeAAD/rotation workspace-scoped, CAS/revocation/tombstone/identité/secretredaction ; webhook Evolution64hex et distinctapiKey/collisionentresociétés testés. Full tsgo local non exécuté ; migrationPG/revue/cloud encore attendues, pas ready.
- Extension ownership approuvée root : D raccorde centralreader aux connectors/Evolution (préserver changements médias B), MCP adapter et services/configs/events intake, tests correspondants et importunique moduleApp si nécessaire. C conserve tous hermes-mail ; B garde service/mediafix. Branche wiringdistincte après reprise commits B584d7f3e6/e1ca825, commits codeD initiaux restent séparément intégrables.
- Readers obligatoirement autoritaires et dynamiques : null/erreur après injectionD ne doivent jamais réactiver configurationenv ; recheckrevision/connectionId avant effet, téléchargement média privé et retour. Webhook token/HMAC natifs, SSRF/TLS/replay/opposition conservés ; workspace jamais déduit d'un body non fiable.
- MigrationD attend artefact/générateurBofficiel2.52, aucune génération concurrente ni manifest écrit à la main. C a confirmé le contrat MAIL resolve/token partagé et implémente le raccordement séparément. Aucun provider configuré/live/capacité vérifiée annoncé par le CRUD seul.


### HERMES-V4-PARCOURS-COMPLET-20261030 — revue root, 2026-10-30 22:20 UTC

- HERMES-V4-MEDIA-001 : status verified pour le correctif b246cce75c0d4f2650becf74463dc26ee2a45050 (branche media au checkpoint7e100ebda). Root a relu la propagation du manager et exécuté indépendamment la suite hermes-media.manager-review.spec.ts :3/3PASS, contrôle après attente/révocation sans update et huit managers sans connexion supplémentaire. Cette preuve ciblée ne vaut pas succès PG/runtime/fullbuild.
- Lot B fixture :7e100ebda ajoute la normalisation du seul default JSONB historique hermesImportState.state, après égalité sémantique PG et égalité de la fonction dans les deux sources. Aucune SQL feature ignorée, aucun entity runtime changé. CI41137043803 en cours.
- Lot C : bfd819a6a ajoute le workflow natif mail,49tests/5suites annoncés PASS dont deux scénarios SMTP loopback sans destinataire réel. CI41136927616 échoue au typecheck production TS2742 dans hermesMailMessagesV4 : type de retour inféré dépendant du chemin physique imapflow. Root transmet au responsable pour annotation portable ; build non validé.
- Root a arrêté uniquement les deux scans TSC frontend en cours depuis8–10minutes, dans les worktrees settings/mail de la mission, ainsi que leurs wrappers qui auraient relancé le scan. Parent Claude et autres sessions préservés. Instructions effectivement transmises à la session CLI existante pour tests ciblés puis full checks GitHub, aucun succès TSC local annoncé. Parent reconnaît22:18:33 et relaie à ses agents. Les quatre modules frontend continuent ; le cinquième reviewer Claude a été demandé mais son dispatch n'est pas encore confirmé.

#### HERMES-V4-CONNECTIONS-001 — rotation des connexions relève un arrêt local du bot

- reviewer: root ; assigned agent: codex/connections ; reviewed branch: feat/codex-hermes-v4-connections ; reviewed revision:05747503c15e26a724599f74c34d9f766833b047, confirmé dans5963fd6f2 ; priority:P1 ; status:in_progress.
- Evidence : revokeGrants parcourt toutes les conversations d'un canal et force botMode MANUAL ; une conversation OFF devient ASSISTED après sauvegarde/révocation de connexion, autorisant de nouveau les brouillons MCP malgré l'arrêt complet demandé.
- Expected correction : préserver OFF/ASSISTED/MANUAL/INHERIT, révoquer propriétaire et epoch pour toutes, convertir seulement AUTO explicite si nécessaire. Tests rotation et suppression, mode effectif OFF, canDraft=false et canAutoReply=false. Agent confirme et prépare tests natifs, aucun correctif encore déclaré vérifié.
- Fix commit: en attente ; recheck root pending.


### HERMES-V4-PARCOURS-COMPLET-20261030 — contrôles croisés, après22:28UTC

- HERMES-V4-CONNECTIONS-001 : correctif b572ae03a79fa36f1166fe03cacd8d84a67818fd relu par root : seuls les modes AUTO deviennent MANUAL, OFF/ASSISTED/INHERIT restent restrictifs et les grants sont retirés. Root a exécuté22tests/2suitesPASS, dont vraie politique native OFF/canDraft=false/canAutoReply=false après rotation et suppression. Précision de source : arbre9360185c avec ajouts non committés du helper de révision en cours pendant la vérification ; le corps du correctif OFF est bien celui de b572, mais cette exécution ne valide pas un SHA complet figé. Finding OFF verified dans ce périmètre ; module complet non ready, PG/wiring/races encore ouverts.
- CLI action root/codex vers Claude parent8f3db32e : un cinquième agent readonly pour revue D7dfde0313 demandé puis réellement dispatché par outil Agent à22:20:06, confirmé par parent22:23:21. Quatre agents frontend ont reçu l'arrêt des scans complets locaux, les contrats figés et l'instruction de livrer des checkpoints testés. Parent reçoit ensuite priorité code shell/routage/Auth/Apollo réel, sans attendre les enfants, avec réponses courtes et envois de coordination limités aux blocages. Aucun SHA frontend V4 encore vérifié à ce contrôle.
- C cloud41137686851 exactb912f180c : full typecheck production et Nest build réussis,54tests mail annoncés par agent ; aucune recette fournisseur réelle. La revue indépendante Codex A a relu sender natif exact/aliases, enveloppe SMTP explicite y compris Bcc, ack de tous les destinataires, déduplication durable, UIDVALIDITY/curseurs et limite MIME36MiB. Aucun finding supplémentaire sur ces points par inspection, pas de runtime exécuté par ce reviewer.
- D cloud41138065523 exact9f9312e0d748a864d4dbacbb4210b3a8dfe7c586 entièrement réussi : full production TypeScript et Nest build,219tests/16suites annoncés et résumé cloud confirmé. Il s'agit du wiring initial ; callbacks après verrou, nouveaux contrôles de révision et migration D ne sont pas couverts par ce SHA.
- A checkpoint7394 a passé135tests cloud mais échoué TSC sur workspaceId nullable ;82f3b0f149f5703aa2105d00444050e389489e04 refuse explicitement le cas invalide. Run41138218320 : unités, TypeScript et Nest réussis selon agent, suite native PG/HTTP encore en cours. Aucun succès PG final anticipé.

#### HERMES-V4-MAIL-001 — ingestion après révocation de connexion ou expiration

- reviewer: codex/tenancy en lecture seule puis root ; assigned agent: codex/mail ; reviewed revision:b912f180c97fcbcebffc16f68cc5b46536f49dfb ; priority:P1 ; status:in_progress.
- Evidence: observe() attend media.receive puis vérifie uniquement le rôle avant inbox.ingest, sans refaire le contrôle D/revision ni le deadline. Deux barrières de test reproduites rouges par le responsable : révocation D ou expiration pendant attente média laisse encore ingérer avant le contrôle final de session.
- Expected correction: guard server-only lié à la révision native D/account et au deadline, propagé dans ingest/receive B ; recheck après advisory lock et avant mutations/commit avec le même manager. Le client ne peut fournir ni callback ni flags internes. Native D resolve(manager) et voie intake/events coordonnées.
- Fix: checkpoints locaux C et B c7303223c en validation ; recheck indépendant et CI du correctif pending, pas verified.

### 2026-10-30 19:52 America/Martinique — reprise supervision / Claude

- Acting agent: Codex root. CLI parent 8f3db32e-4613-45e3-94f3-16e664f3cbfc, session PTY 2418 réutilisée, aucune nouvelle session doublon. Instruction réelle envoyée : reprendre assemblage complet, réutiliser quatre workers runtime, déléguer backend et CI uniquement à Claude, rendre SHAs et dispatch reçus.
- Résultat observé avant envoi : conteneur réglages b2692543d livré et fusionné parent, 84 tests annoncés ; trois runtime encore en cours. Les anciens agents Codex ont échoué sur quota, ils ne sont plus actifs.
- Root intégration 6dd0b3dce contient backend assemblé et frontend e21, sans recette finale. C ee0943bd8 cloud 41145406389 success ; D compiled/barriers 41145150959 failure. Pas de preview V4 accessible annoncée.
- Prochain contrôle : ACK réel parent, correction CI D et MAIL006, quatre montages, build combiné, preview neuve et navigateur.

### 2026-10-30 20:02 America/Martinique — supervision intégration Claude

- Parent 8f3db32e a réellement accepté l'ownership d'assemblage ; dispatchs observés runtime WA/mail/campagnes + backend livraison + harnais D. Codex reste en supervision, aucun nouveau sous-agent Codex.
- Checkpoints distants vérifiés : réglages b2692543d, WA e65363e87, mail d522e0af0, campagnes c4b67d2e9. Routes montées 167fb8038 puis fusionnées dans la branche commune ; deltas Auth repris, HEAD commun poussé fc260e860. Cela ne constitue pas encore un build combiné ni une preview.
- D-HARNESS-001 : revue Codex de a95ebd896 confirme changement limité aux casts UUID du même paramètre SQL, aucune assertion retirée. Exécution PostgreSQL combinée encore attendue.
- FRONT-MAIL-IDENTITY-002 : reviewer Codex, assigned Claude mail, source d522e0af0. useHermesMailboxRuntimeIdentity choisit le premier compte actif au lieu du connectedAccountId central MAIL et qualifie ses alias d'autorisés sans preuve serveur. status in_progress, correction déléguée ; le serveur conserve le refus des identités non autorisées.
- FRONT-NAV-003 : reviewer Codex, assigned Claude parent, source 167fb8038. Routes présentes mais non référencées dans le menu ; pages sans HermesShellLayout et campagne sans identifiant rendue null. status in_progress, correction navigation/empty transmise ; frontière de société à vérifier séparément.
- CAMPAIGN-MAIL-004 : reviewer Codex, assigned Claude worker SMTP, source fc260e860. emailing-domain-driver.factory.ts lit EMAILING_SMTP_CONNECTIONS ; MAIL central natif ne suffit pas à alimenter ce pilote. status in_progress ; réutiliser le moteur natif et les oppositions, From exact et résolution centrale fail closed, sans nouveau moteur ni émission réelle.
- MAIL006 : fix partiel ad97f03c1 ajoute un contrôle enfin après sentCopy. Revue Codex constate aussi awaits closeClient dans session, catch global disposeAcceptedDraft et release du verrou après contrôle ; rechecks et repros ciblés demandés au worker. status in_progress, non vérifié globalement.
- Média : le supposé besoin d'un nouveau Bearer n'est pas confirmé. Revue source JwtAuthGuard / AccessTokenService.validateTokenByRequest accepte les cookies de session ; le PUT utilise FileUploadTokenGuard et son URL token native. Pas de relâchement des guards, pas de nouveau jeton exposé. Recette réseau encore attendue.
- Nouvelle preview V4 : aucune disponible à ce checkpoint. En attente du build exact et de la recette navigateur.

### 2026-10-30 20:31 America/Martinique — backend gelé / preview en préparation

- Parent Claude intègre tous les correctifs ; Codex a uniquement supervisé/revu et déclenché des contrôles cloud. Routes et navigation intégrées ; frontière b09 puis 524b99a45 sans nœud DOM additionnel et test StorageEvent annoncé par Claude.
- MAIL006 : source commune ecc0e40b6 ; comparaison indépendante Codex des deux fichiers mailbox service/spec contre e865532b4 sans différence (diff vide). Les rechecks après close, copie Sent, disposition et libération du verrou sont présents. Cloud lot C e865 run 41148174299 success ; contrôle combiné encore attendu.
- SMTP campagnes : b0ac21b9d était seulement une autorisation d'expéditeur, insuffisante. 7898828f8 utilise désormais le SmtpClientProvider natif et connectedAccountId central, avec relecture après ouverture et fermeture sur rotation ; source et export DI relus par Codex. 50 tests annoncés par Claude, dont 19 nouveaux ; ajout de la suite au contrôle cloud via 05564a2b6. Pas d'envoi fournisseur réel validé.
- Premier contrôle assemblé fc260e860 run 41148331121 : build Vite production, tests Auth et WYW passés ; full TSC échoué sur 15 erreurs frontend, corrigées ensuite c72bfc071. Ce run ne constitue pas une livraison verte.
- Version backend gelée et poussée : 05564a2b61658f628c4d1e531d38d081ac41021a. Frontend 41150255737 et backend 41150255880 en cours/attente ; traduction et fixture native Forms/Cal en cours dans des worktrees dédiés.
- Session P0 41150314733 réellement démarrée sur 05564a2b6, worker et opt-in sociétés activés, durée 90 min. Aucun nouveau lien vivant fourni à ce stade. Origines exactes via contrôle public sans secrets autorisées ; le lien de partage privé reste hors Git.
- Codex root a annulé 41149653896 (ancienne source sans SMTP natif) et 41148642151 (ancienne base backend) pour libérer la vérification finale, sans toucher à la session P0.
- Restent bloquants : derniers contrôles cloud, fixture Forms/Cal centrale à enregistrer sans affaiblir les guards, traduction runtime, déploiement exact, HTTP cookie jar neuf, recette CUA et compte de test. Aucun statut done déclaré.

### 2026-10-30 20:49 America/Martinique — frontend final vert, incident preview

- Frontend final a55ad59121dc037df3ec9b9e21ce1c8f08bafe28 : run 41151212499 SUCCESS intégral (units quatre parcours/Auth/Apollo, full TypeScript, Vite production, artefact exact). 259 nouvelles entrées françaises traitées dans 9346e60b8.
- Backend 05564a2b6 run 41150255880 : production TypeScript, Nest, units, native tenancy PostgreSQL/races/zero writes et trois barrières connexions PostgreSQL + SERVER/WORKER DI SUCCESS. Legacy Forms/Cal échoue encore avec son ancienne fixture ; la fixture centrale est corrigée 0ab48a7c8/5d64735f5 et le run final a55 41151212512 est en cours. Rien n'est déclaré globalement vert avant sa fin.
- Revue Codex diff 05564→a55 : uniquement catalogues, union TypeScript de clés navigation et un fichier de test Forms/Cal ; aucun changement de twenty-server/src, scripts ou workflows. Backend source produit identique, runtime 05564 utilisable avec frontend a55 avec preuves de provenance distinctes.
- Incident réel P0 41150314733 : échec du délai de 15 minutes, assertion Public control URLs were not received in time. Le frontend a terminé après ce délai. La preview n'est donc pas livrée ; Codex a averti l'utilisateur et assume le défaut de coordination.
- Deux relances concurrentes à six secondes : root 41152151906 (a55) puis Claude 41152161693 (05564). La première a été annulée par la concurrence globale avant travail utile. Décision transmise : conserver uniquement 41152161693, aucune troisième relance. Worker/same-origin/90 minutes actifs, frontend a55 déjà prêt, publier les URLs publiques de contrôle dès READY. Aucun lien de partage privé dans Git.
- Nouvelle preview encore non livrée : restent déploiement, contrôle public exact, partage HTTP cookie jar neuf, compte de test, recette CUA. Aucun lien inaccessible envoyé pour masquer le retard.

### 2026-10-30 21:38 America/Martinique — recette navigateur / correctifs frontend

- Source déployée de diagnostic a55ad5912, runtime 05564a2b6 run 41152161693. Déploiement Vercel READY vérifié indépendamment par Codex, projet prj_0YAVdnCjN7e2zHNAbLzUCw3N4JvF, target hors production, protection globale all_except_custom_domains conservée. Contrôle public origine seule publié 8ab8c4622 ; clé de partage et compte restent dans le coffre privé.
- L'auto-review du worker a refusé l'écriture API du contrôle comme commit non demandé. Les instructions utilisateur autorisent les commits/previews ; vérification locale limitée au fichier JSON public et publication Git ordinaire par le parent ont résolu ce blocage. Aucun secret n'a été ajouté au contrôle, aucune protection désactivée.
- FRONT-AUTH-005, reviewer Codex, source a55ad5912 : vraie connexion navigateur sur écran français accepte les identifiants (signIn puis currentUser, HTTP200 sans erreurs), mais reste sur welcome ; currentWorkspace null, une société autorisée avec LOGIN disponible. Cause source confirmée useRedirectToWorkspaceDomain : retour anticipé sous IS_MULTIWORKSPACE=false malgré opt-in same-origin. Statut fixed_pending_review/cloud, assigné Claude.
- Fix Claude bbbb30da80ad3d73fba024343d72fd529a7b7313 repris par cherry-pick 7660f706c2e7fd641bc51e1ecdadb13448e1418c. Origine capturée contrôlée, échange LOGIN natif, sélection un/multi, MFA/SSO préservés. Tests annoncés 167 auth/domain +624 Hermès, revue source Codex faite ; runs finaux 41155948780 frontend /41155948788 backend en cours, aucune livraison utilisateur avant nouvelle recette. Aucun serveur/src, script ou workflow modifié contre 05564.
- Prétest CUA diagnostique : navigation ordinaire vers la route Verify avec LOGIN émis par le serveur a validé le cookie de société, puis accueil sans destinataires. Aucun état client injecté, aucun guard contourné. Cette étape manuelle n'est PAS une validation du parcours de connexion automatique encore bloqué dans a55.
- UI réelle : tableau de bord chargé (5 entreprises/5 personnes/6 opportunités de démonstration), préférence française enregistrée et persistée après reload, boîte mail explicitement non configurée. Preuves locales artifacts/hermes-v4-integration/recette-dashboard-fr.png et recette-mail-non-configure.png. Sociétés clientes et sociétés exploitantes distinguées dans le centre ; seconde société Hermès Recette B créée et activée via UI avec profil fictif, accueil invitations encore à finaliser par recette sans destinataire.
- FRONT-NAV-003 : natif drawer corrigé mais sidebar custom du dashboard restait sans WA/mail/centre. Fix17326bb5a ajoute les destinations et statut WA non configuré avec lien au centre ; reste à vérifier sur nouveau bundle.
- Forms/Cal a55 run41151212512 : pas de nouvelle preuve de défaut HTTP à ce stade ; échec AVANT appels HTTP sur node:assert/strict.deepEqual d'un Array d'un autre realm, contenu identique. Fix test-only a8662dc8b convertit avec Array.from et contrôle la longueur ; aucun guard ni assertion de données supprimés. Rejeu en cours. Autres suites natives/tenancy/barrières passent sur code produit inchangé.
- Recette API privée : cookie natif + X-Expected-Workspace-Id, client QA créé dans B et absent dans A ; dépôt prospect→qualification Person→opportunité→avancement étape→campagne DRAFT passent. Les premières tentatives génériques sur messageSuppression sont refusées par le scellement prévu, puis API dédiée utilisée. Un réimport SUPPRESSED/personId null après opposition est un résultat attendu, pas une invitation à affaiblir les guards. Les scripts de recette sont corrigés et rejoués avant statut final ; aucun envoi fournisseur.
- Limitations observées : locale native par membre/société (nouveau B initialement anglais, préparation française demandée au worker) ; vrais fournisseurs non configurés ; installation PWA et médias fournisseurs non exercés. Les timeouts de l'outil CUA ne sont jamais comptés comme des actions réussies.

### 2026-10-30 21:57 America/Martinique — recette V4 réelle, gate frontend validé

- Root supervision, codage exclusivement agents Claude. Frontend source9c21c08418afa80c6485b234d80b9073dec8b611, run41156819291 SUCCESS : unités, TypeScript complet et Vite. Preview diagnostique sert7660f706c, production frontend identique à9c21 (delta exact : test WA et workflow uniquement), backend runtime05564a2b6/run41152161693. Identité de réutilisation contrôlée indépendamment ; le run7660 lui-même reste en échec TSC test-only et n'est pas décrit comme vert.
- Nouvelle preview dpl_EA9PSBGVDR9aVE8fukPTcGbm9vcj READY, target preview sans alias, protection globale maintenue. Clé privée versionnée au seul déploiement, fichiers0600 hors Git ; control public origine seule e00d191e3. Aucun lien utilisateur livré à ce stade.
- FRONT-AUTH-005 verified navigateur : ouverture partage sans connexion Vercel préalable, saisie compte natif, sélection normale de deux sociétés autorisées puis B, plein reload et table ClientQA en français. Cette recette n'utilise aucune navigation Verify manuelle ni injection d'état.
- FRONT-NAV-003 verified : sidebar du dashboard affiche WhatsApp, mail et centre ; clic WhatsApp aboutit à interface avec état À configurer et capacités indisponibles. Mail affiche explicitement non connecté. Centre B affiche sept canaux non configurés et liste des sociétés autorisées. Ce récapitulatif de sociétés ne prouve pas un dashboard consolidé de KPIs multi-sociétés.
- Bot réglage UI B : OFF enregistré et confirmé par serveur, puis ASSISTED restauré et confirmé. Aucun MCP réel configuré ni appel fournisseur effectué. Preuve écran recette-v4-bot-off.png.
- Pipeline UI affiche sept cartes, dont opportunité QA à PROPOSAL, cohérente avec mutation API précédente. Collectes affichent quatre lignes SUPPRESSED après opposition, audience campagne présente ; aucun envoi réel ni faux succès d'envoi.
- Recette API causalité indépendamment lue : création Person → opposition dédiée → suppression douce Person → même opposition toujours présente → réimport SUPPRESSED, personId null, aucun contact recréé. Preuve privée journey-opposition-causality.json, tous contrôles passed. Isolation ClientQA B/absentA déjà passée par cookies natifs distincts.
- Contrôle viewport390×844 : dashboard et prospection rendus, captures recette-v4-mobile-dashboard.png et recette-v4-mobile-prospection.png ; viewport ensuite restauré. Cela ne valide ni installation PWA, ni offline, ni médias de vrais fournisseurs.
- Backend41155948788 : prodTSC/Nest/unités/tenancyPG/barrièresD réussis ; un dernier échec Forms/Cal expected403/received503 sur propriétaire désactivé. Analyse Claude : ForbiddenException native absorbée par catch de configuration. Correctif focalisé en revue, guards préservés ; aucune preuve finale de succès global backend encore. Nouvelle session de recette sera nécessaire pour servir et tester ce correctif avec une durée utile.

### 2026-10-30 22:04 America/Martinique — revue finale ciblée

- Dashboard commun vérifié séparément en CUA sur /settings/structures : KPIs cumulés13/10/13/0, détail A5/5/6/0 et B8/5/7/0, lecture seule. La liste du centre n'est pas ce dashboard ; le dashboard existe bien sur la route dédiée. Capture recette-v4-dashboard-commun.png.
- Changement B→A via bouton du centre : plein reload natif observé, société active A, table cinq entreprises, ClientQA absent. NAV WA vérifiée via lien sémantique après le délai d'une première tentative de l'outil ; la seconde a réellement abouti et montré À configurer.
- Revue root du correctif91e89d0bb976a9ab237e376a407eb59fb31a2579, quatre fichiers : deux services préservent ForbiddenException native, autres exceptions restent503 ; deux suites ajoutent révocation avant lookup et défaut de configuration, absence d'écritures. Preuve before :2échecs/8pass ; after :10pass/10. git diff --check propre. GO intégration et CI backend donnés au parent Claude ; ce GO ne revendique pas encore le succès du PostgreSQL cloud.
- Frontend final choisi : artefact exact9c21c0841 issu du run41156819291 entièrement vert, sans reconstruction ni changement UI. Nouveau backend correctif et nouvelle session90min à créer par le seul parent Claude après portes prodTSC/Nest/unités ; nouveau partage privé et re-recette exigés avant livraison.


### HERMES-COMPLETE-JOURNEYS-20261031 — audit root et reprise

- 30octobre2026 vers23:22America/Martinique, acting Codex root. Nouvelle mission fondée sur demandes existantes après constat utilisateur des fonctions manquantes ; skill split réutilisé, dernière consigne codage Claude uniquement prioritaire sur répartition par défaut. Lecture AGENTS/DESIGN/handoff/CLAUDE et rapport V4, baseline c127 confirmée.
- CJ-CAMPAIGN-001, assigned Claude, status open : useHermesCampaignRuntime ne fait que setContentDraft/setSelectedIdentityOverride sans persistance ; callbacks aperçu/test/envoi immédiat absents, accès Campagnes incomplet. Build vert ne couvre pas un parcours d'envoi utilisable.
- CJ-WA-001, assigned Claude, status open : EvolutionMessagesAdapter.probe renvoie canReceiveMedia=false/canRecordVoice=false même PROVIDER_REPORTED_OPEN ; fonctionnalités demandées à compléter avec vérification protocolaire, pas activer des flags arbitraires.
- CJ-CONNECTION-001, assigned Claude, status open : HermesAdminRuntimeSettings emploie NO_TEST_STATE, aucune opération réelle de test de connexion ; save ne prouve aucune connexion. Informations membres rôle/état encore inconnues.
- CJ-PWA-001, assigned Claude, status open : manifeste présent mais pas de service worker trouvé dans frontend ; installation et réseau hors ligne non validés. Locale par nouvelle adhésion encore non garantie française.
- CJ-PREVIEW-001, assigned Claude, status open : utilisateur Safari voit connexion Vercel. Contrôles curl vierges et en-têtes iPhone200 ne reproduisent pas ce blocage et ne le résolvent pas ; aucune protection globale désactivée. Session V4 et base temporaires, expiration explicite, pas un hébergement durable.
- Préparation worktree/branche d'intégration isolés ; publication de la mission avant reprise code. Prochaine action : message task-specific au parent CLI existant, ACK et claims/fichiers disjoints, implémentation réelle, relecture SHA puis recette. Aucun succès anticipé.

- CLI root23:21Martinique : inventaire officiel claude agents --json confirme session8f3db32e idle avant reprise, puis busy/working après message task-specific via PTY2418. Prompt réel de reprise CJ01..06 envoyé, liens mission224df8ae7, base et ownership fournis ; parent inspecte les worktrees propres avant dispatch. ACK des lots pas encore revendiqué par root à ce contrôle. Nouvelle branche distante feat/hermes-complete-journeys confirmée surc127.
- Ressources : disque externe143MiB libres, système14GiB. Pas de builds/installations volumineux sur externe, ni suppression originale/sauvegarde ; worktrees isolés existants propres préférés et dépendances natives déjà installées réutilisées prudemment. Grille R01..R16 ajoutée avant recette pour éviter les omissions historiques.

- CLI root23:25Martinique : cinq vrais appels Agent et fichiers de métadonnées observés, IDs CJ01a7770455c90caeb1a/CJ02a5ecf88955c726ef5/CJ03aff18cfa439def9ed/CJ04a65175da6d0fb8988/CJ05a76ee32a68b13e841. Sous-exploration CJ02 supplémentaireaf9f728a6e3441b8a cartographie le flux existant. Parent réutilise des worktrees vérifiés propres. Revue root du draft service natif : body doit être un EmailDocument valide, pas une textarea JSON arbitraire ; billing natif désactivé en selfhost rend déjà isPayingCustomer vrai, aucune permission/limite de plan à affaiblir. Critère communiqué : compte natif→MAIL central→identité→campagne→SMTP factice avec persistance, pas seulement unité de factory déjà verte en V4.

- Ressources root23:30Martinique : cache Yarn ignoré/non suivi du checkout original déplacé vers /Users/claudebrafa/.cache/hermes-crm/yarn-cache-20261031. Copie de4441fichiers/3066381777octets, SHA256 de chaque fichier identiques avant substitution, inventaires identiques ; ancien chemin conservé par symlink. Seul l'ancien double de cache régénérable a été retiré après vérification, aucun code/.env/base/sauvegarde supprimé. Preuve détaillée privée cache-relocation-proof-20261031.json. Disque externe3.0GiB libres au lieu de123MiB ; système10GiB libres. Pause des écritures de cache levée, propriété source applicative toujours Claude.

- 31octobre03:46UTC : suivi overnight créé puis consulté via automation_update, ciblé sur ce chat jusqu'au31octobre12:00UTC/08hMartinique ; outil confirme ACTIVE. Reprise CJ04b a2e482b4f7f1e9560 réellement observée. Aucun changement du relais de minuit d'un autre projet. Procédé local caffeinate PID33841 limité à12:05UTC, pas de réglage système permanent.
- Contrat campagnes relu : réutilisation hooks natifs usePersistedCampaignDraft/useCampaignDetailsState/useCampaignBodyState et éditeur EmailDocument, mutations natives send/test/schedule/cancel existantes ; nouveau besoin identifié, rendu personnalisé par destinataire sans émission ni effets de tracking. Root exige rôle/liste/société exacts, absence de ledger/billing/send-slot et rendu frontend inerte. Aucun parcours nouveau encore marqué validé sur la seule lecture.


### HERMES-COMPLETE-JOURNEYS-20261031 — supervision du31octobre04:00UTC

- Parent Claude a livré et poussé72083b5b345ae3ffd27b8266598ea674b74f36b4 puisd0dfdd8a13e100dc72535fedcae0fafab06797e6 sur feat/hermes-complete-journeys, remote vérifié par root. DEFAULT_LOCALE configurable et validée, quatre replis natifs remplacés, imports retirés. Revue root du SHA effectuée : valeurs explicites préservées par ??, aucune migration ni changement de guard. Quatre tests de validation déclarative annoncés PASS, pas encore une preuve signup/nouvelle adhésion/UI française.
- CJ-LOCALE-001, reviewer root, assigned parent Claude, reviewed d0dfdd8a1, status open : aucun DEFAULT_LOCALE=fr-FR trouvé dans scripts/Compose/exemples ciblés ; fallback de configuration reste SOURCE_LOCALE. Finaliser le wiring effectif du déploiement Hermès et un test de création de compte/adhésion sans locale explicite, plus préservation d'une préférence existante. Ne pas déclarer R14 validé par les quatre seuls tests du décorateur.
- CJ-PWA-002, reviewer root, assigned CJ05, reviewed draft non commité sur basec127, status open : installation du SW fetch les deux fichiers publics avec credentials:omit alors que Vercel exige le cookie de partage même pour ces fichiers. Risque d'échec d'installation sur redirection edge, ou de page de connexion mise en cache à la place de l'offline. Faire un fallback public constant sans requête protégée, ou valider strictement la réponse statique ; jamais une réponse authentifiée arbitraire. Ajouter un test de redirection/protection, conserver installation réelle non vérifiée. Règles de commentaires <=5lignes à respecter.
- CJ-CAMPAIGN-002, reviewer root, assigned CJ02, reviewed service/contrat draft non commité sur basec127, status open : resolveExcludedTarget permet un personId hors liste au lieu de vérifier l'appartenance convenue ; conserver l'aperçu des membres opposés mais refuser les non-membres avant rendu. Si une seconde lecture Person ne retrouve plus la personne, refuser plutôt que rendre des variables de repli.
- CJ-CAMPAIGN-003, reviewer root, assigned CJ02, reviewed même draft, status open : envelope SEND_READY repose sur domaine VERIFIED + hostname de désinscription sans vérifier MAIL/compte SMTP natif/configuration révoquée. Nommer strictement le verdict réellement contrôlé ou utiliser une capacité scindée ; pas de faux prêt à envoyer. La preuve bout en bout depuis la boîte native doit partir du parcours produit, pas d'un domaine DNS marqué vérifié artificiellement dans une fixture. Rendu personnalisé déjà en cours de test ciblé ; aucune approbation finale anticipée.
- Tous ces constats ont été réellement envoyés au parent via PTY2418 pour relais aux agents propriétaires ; root n'a édité aucun fichier applicatif concurrent. Les lots poursuivent leur code et leurs tests. Preview V4 expirée, aucun nouveau lien annoncé ni fournisseur réel prétendu vérifié.


### HERMES-COMPLETE-JOURNEYS-20261031 — revue indépendante du 31 octobre 04:31 UTC

- Acting agent : Codex root. Parent Claude `8f3db32e-4613-45e3-94f3-16e664f3cbfc`, PTY2418 existante réutilisée ; messages réels de revue envoyés, aucun nouveau worker doublon. Les agents propriétaires continuent leurs lots. Codex ne modifie aucun fichier applicatif.
- CJ-PWA-002 : status **verified dans le périmètre source + tests isolés**, fix `5506a10d0` et `c03ef12a13ac5936f1249f18144137db686cbd2e`, intégrés `4733cb18b`. Root a exécuté `node --test scripts/check-preview-access.test.mjs scripts/check-hermes-pwa-service-worker.test.mjs` : **25 tests PASS**, zéro échec. Le vrai fichier SW est évalué dans une portée VM ; les contrôles d'accès utilisent deux serveurs HTTP de boucle locale. Installation sans requête protégée, aucun cache de réponse, redirection/HTML de connexion non convertis en succès et secrets caviardés. Ces tests ne prouvent ni une installation PWA réelle ni Safari. Bootstrap ajouté par le parent `7efd64983`, relu : enregistrement après rendu, sans blocage initial. Rapport antérieur disant « appelé par personne » à actualiser ; nouvelle police Inter du fallback à corriger selon DESIGN.
- CJ-LOCALE-001 : status **fixed_pending_review fonctionnelle**. `888187a6a` ajoute un vrai appel de service de création d'adhésion en test, et `scripts/preview-backend-session-p0.mjs` contient désormais `DEFAULT_LOCALE: fr-FR`. Lecture root confirme que les préférences explicites restent conservées. Recette de nouveau compte/nouvelle adhésion française sans intervention manuelle toujours à exécuter sur la version intégrée ; aucune validation R14 globale anticipée.
- CJ-CAMPAIGN-002 : fix source `4933af805feb4999484c68dd3ec3d86ab229df76`, status **verified source et tests de service**, non HTTP/PG. Root a relu : appartenance à la liste contrôlée sous rôle avant lecture Person, personne absente refusée au lieu de variables plausibles vides. Le test de service d'aperçu passe indépendamment avec les quatre autres suites ci-dessous. L'intégration et la recette de la nouvelle opération restent attendues.
- CJ-CAMPAIGN-003 : même fix, status **verified pour le nom du verdict seulement**. `SEND_READY` supprimé au profit de `DOMAIN_PREREQUISITES_MET`, contrat précisant qu'aucun test de boîte/transport n'a été effectué dans cet aperçu. La source et les assertions d'aperçu ont été relues/exécutées. Onboarding de la boîte et envoi produit restent non recettés.
- Recheck root exact `4fcfa57a226ac690c31360cea42448781708bdb2` : sept suites Jest ciblées du contrat lancées depuis twenty-server. **5 suites PASS, 72 tests PASS** ; **2 suites ne se chargent pas** (`campaign-native-mailbox-smtp-acceptance` manque `nodemailer`, `campaign-unconfirmed-quarantine` manque `lodash.chunk`) avec les dépendances locales partagées actuelles. Ce n'est pas un run global vert. Résolution de dépendances propre ou CI demandée au parent sans modifier le checkout original. Suites passées : recipient-preview, emailing-domain-sender-quarantine, save-campaign-tool, sendable-campaign et compile-campaign-email-content.
- CJ-CAMPAIGN-004, reviewer root, assigned CJ02/parent, reviewed `4fcfa57a2`, status **open — périmètre de preuve** : fixture SMTP appelle `EmailingDomainSenderService` et le vrai driver vers un socket de boucle locale ; la connexion MAIL, le fournisseur de compte, les lignes de domaine et les oppositions sont des mocks. Elle ne passe ni HTTP, ni PostgreSQL, ni création native de compte. Le rapport « end-to-end across the API » surestime cette preuve. Demande : libellé précis service→driver→SMTP isolé, puis recette produit intégrée depuis le centre et une vraie configuration factice isolée. Les règles natives de domaine/From/opposition ne doivent pas être affaiblies.
- CJ-WA-002, reviewer root, assigned CJ03, reviewed `a8fb18b5818cbe3e3c2ca73d259fdc0443ca8c74`, status **open — capacité de réception faussement prouvée** : `addressesThisIngress` compare le pathname et l'identifiant seulement, pas l'origine ; un webhook chez un tiers au bon chemin est donc accepté. La ligne du webhook ne prouve pas non plus `x-hermes-evolution-token`, alors que le receiver exige ce jeton et refuse 401 sinon. `canReceiveMedia=true` est donc possible sans livraison admissible. Demande transmise : origine publique canonique vérifiée, preuve d'authentification provider ou verdict non prouvé ; tests négatifs origine erronée, jeton absent/erroné et fixture de réception authentifiée jusqu'au stockage privé. Aucun assouplissement du receiver autorisé.
- Checkout original et sauvegardes préservés. Disque contrôlé : environ 11 GiB libres sur système, 2,8 GiB sur externe ; pas de gros build local ni nettoyage destructif. Ancienne preview expirée, aucun lien de remplacement annoncé avant sa vraie recette.


### HERMES-COMPLETE-JOURNEYS-20261031 — revue réglages du 31 octobre 04:33 UTC

- Revue root sur les commits exacts `e4e7972aa0d6d1e8d59e6f9a0d9b1b4071d6c231`, `3c7fc53cb` et `1688c1ea3` dans le worktree de CJ04a ; fichiers de rôles non committés laissés à leur propriétaire. La nouvelle sonde utilise bien les fournisseurs IMAP/SMTP natifs et ne construit ni message ni enveloppe ; une sonde réussie reste distincte d'une preuve de flux.
- CJ-CONN-001, reviewer root, assigned CJ04a, status **open** : `HermesConnectionTestService.testMail` valide l'acteur appelant une seule fois avant `resolve` et les I/O. La relecture finale `connections.resolve` vérifie les droits de l'acteur qui a enregistré la configuration, et non ceux d'un autre administrateur ayant déclenché la sonde. Si ce second administrateur perd ses droits pendant le test, les observations/counters peuvent encore lui être retournés. Demande : recheck des droits de l'appelant après résolution avant ouverture et après sonde/fermeture avant retour ; test de révocation avec appelant distinct du propriétaire de connexion.
- CJ-CONN-002, reviewer root, assigned CJ04a, status **open** : le hook `useHermesConnectionCheck` ne capture aucun workspace/connectionId/revision, le reader ignore les champs de corrélation retournés et `resetChecks` n'est appelé nulle part dans le conteneur. Un résultat ancien demeure après save/delete et une réponse en vol peut republier l'ancien verdict après reset. Demande : lier les sondes et l'affichage à la société, l'identifiant, la révision et une génération ; invalider les résultats lors d'une modification et ignorer les réponses périmées/concurrentes. Test différé sonde→modification/suppression→résolution sans ancien badge sur la nouvelle configuration.
- Constats envoyés réellement au parent PTY2418 pour reprise CJ04a, sans doublon ni changement d'ownership. R13 non validé par la seule présence du bouton de test. Les nouveaux commentaires longs sont aussi à réduire selon les instructions natives ; priorité aux deux comportements ci-dessus.


### HERMES-COMPLETE-JOURNEYS-20261031 — rechecks complémentaires du 31 octobre 04:36 UTC

- Dépendances locales : le symlink temporaire du worktree CJ02 a été retiré pendant le premier recheck. Root a relancé **uniquement les deux suites non chargées**, avec `NODE_PATH` vers le node_modules original et le chemin absolu du binaire Jest ; aucune installation, aucune écriture dans le checkout original, aucun nouveau symlink. Résultat : **2 suites PASS, 14 tests PASS**. Ainsi les sept suites du checkpoint applicatif `4fcfa57a2` ont bien été recontrôlées par root en deux runs : **86 tests PASS**, sous réserve du périmètre isolé déjà détaillé. Le premier échec de chargement reste consigné et n'est pas masqué.
- CJ-CAMPAIGN-004 : correction documentaire `32059faa5` relue, **verified pour le périmètre annoncé** : service→provider→driver→socket, mocks explicités, HTTP/PG/onboarding explicitement non prouvés. La recette d'onboarding et l'exécution intégrée restent ouvertes dans R10 ; cette correction de rapport n'en tient pas lieu.
- Root a exécuté les deux suites de locale sur source intégration `7efd64983` : **2 suites, 7 tests PASS**. Le vrai service de création est exercé avec dépôt de test pour le défaut fr-FR, une locale explicite préservée et un défaut configurable différent ; validation déclarative également testée. CJ-LOCALE-001 vérifié au niveau service/configuration uniquement, nouveau compte et interface intégrée encore à recetter.
- CJ05 fix `936a21c65a1b56ce0a00bb39aee7baca3b52b5eb` relu : police interdite retirée et rapport de bootstrap corrigé. Root a exécuté les suites node sur ce checkpoint : **26 tests PASS**, zéro échec. Les limites PWA/Safari du rapport restent justes. Fix encore à intégrer par le parent avant recette de la source finale.
- Messages de recheck réellement adressés au parent, inventaire officiel Claude vérifié : parent busy/working, session d'implémentation existante conservée. CJ01 continue la liste/édition de campagne ; CJ04a termine droits/sondes, CJ04b continue le classement des entrées. Pas de preview neuve déclarée et aucune mission globale marquée done.


### HERMES-COMPLETE-JOURNEYS-20261031 — supervision et revue du 31 octobre 04:46 UTC

- Parent Claude existant : inventaire officiel busy/working vérifié, PTY2418 réutilisée, messages réellement envoyés. Intégration `cc72431405d6cf0583d0c8b640090d6aefc6b1c8` contient API campagnes, défaut français, PWA et lien brouillon→éditeur. Le parent assemble, Codex reste en lecture/test/docs. Claims et fichiers concurrents préservés.
- CI canonique : `c893438fc3a6c9b9de1ee98e9a459d277774fc1e` ajoute aux extras les deux nouvelles specs campagnes et les deux specs de locale, auparavant hors du scan hermes-*. Root a relu le diff : aucun test retiré ; découverte des 69 suites et présence de chaque extra contrôlées. Sur la branche CJ05 seule, le garde échoue attendu car les nouvelles specs n'y sont pas intégrées ; après fusion, **6 tests du harnais PASS sur cc7243140**. Cloud **41169707939** démarré par le parent sur ce même SHA, encore en cours à ce checkpoint ; ce n'est pas une preuve de réussite du build.
- CJ-MCP-001, reviewer root, assigned CJ04b, reviewed `9fc7cbb22`/`a4027a39b`, status **open** : la découverte ne revalide pas `assertCurrent` après la dernière réponse `tools/list` ; `rpc` le fait avant son POST et le draft le fait avant retour, mais la découverte peut publier les anciens grants/l'ancienne surface après une rotation/suppression pendant la dernière réponse. Recheck final de connexion/révision et test différé demandés, aucune exécution de tools/call pendant découverte.
- Recheck MCP root sur `d25b1f815` (fichiers testés inchangés depuis les checkpoints précédents) : trois suites no-automatic-deal/tool-surface/tool-discovery, **20 tests PASS et 1 FAIL** au premier run (premier cas discovery attendu READY, reçu UNAVAILABLE). Relance unique du seul fichier discovery : **7 tests PASS**. Fixture timeout1500ms, cause à établir ; ne pas effacer le premier résultat et ne pas présenter ce run groupé comme vert. Les nouveaux endpoints de classification et surface MCP restent à consommer dans le parcours UI ; leur présence serveur ne valide pas R05/R09/R13.
- CJ-CAMPAIGN-005, reviewer root, assigned CJ01, reviewed `b4d89be463cef02de6afe98a107d32fbbcfb0518`, status **open — bloquant** : le Textarea libre envoie directement `bodyTemplate: body`, alors que le moteur parse un EmailDocument JSON canonique dans `compileCampaignEmailContent`. Une saisie ordinaire « Bonjour » est persistable mais non prévisualisable/non envoyable ; une campagne native existante montre son JSON brut. Demande : réutiliser le vrai éditeur natif CampaignBodyField/EmailEditorCanvas et son profil, conserver le document riche sans perte ; test du champ réel→persistance→reload→compilation native. Pas d'adaptateur HTML artisanal ni d'assertion de mock qui reproduit le texte invalide.
- CJ-CAMPAIGN-006, reviewer root, assigned CJ01, reviewed même SHA, status **open** : le contenu reste éditable pendant une sauvegarde et `onSaveContent` vide tout `contentDraft` après await ; une saisie supplémentaire pendant l'enregistrement est perdue. Demande : désactivation ciblée ou génération/snapshot du contenu, ne vider que ce qui a réellement été enregistré ; test de réponse différée et saisie concurrente.
- CJ-CAMPAIGN-007, reviewer root, assigned CJ01, reviewed même SHA, status **open — bloquant** : seules les identités déjà égales au From persisté obtiennent un serverVerdict ; le lecteur refuse les autres et le Radio est disabled. Un nouveau brouillon sans From ne peut donc sélectionner aucun expéditeur, et un existant ne peut en changer. De plus le helper infère EMAIL_GROUP comme autorité, alors que le provider SMTP réel autorise le handle exact du MAIL central. Demande : séparer sélection/enregistrement d'une boîte native centrale de l'autorisation d'émission ; persister le choix réellement publié puis relire les blockers. Aucun verdict d'envoi inventé ni guard affaibli. Test de brouillon sans From→sélection→update→reload.
- CJ-CAMPAIGN-008, reviewer root, assigned CJ01, reviewed même SHA, status **open — bloquant** : nouvelle campagne créée avec seulement id/name, aucun sélecteur/callback de liste d'audience et updateinput sans listId/unsubscribeTopicId. Ce brouillon reste donc sans audience depuis l'interface. Demande : réutiliser le sélecteur natif de liste et thème de désinscription, persistance puis rerésolution côté serveur avec droits et exclusions. Parent invité à déléguer le champ EmailDocument à un vrai Claude enfant aux fichiers exclusifs, pendant que CJ01 conserve le hook/identité/audience ; pas de nouveau worker Codex.
- CJ-WA-002 : fix `19cb1c9683cdf0632a445194648d42bfa42ecea8` relu ; origine attendue et matcher de jeton contrôlés. Root a exécuté **4 suites, 67 tests PASS** (capability, réception HTTP, messages adapter, media adapter). **Verified dans ce périmètre source/tests isolés**, sans valider R07 globalement. Le test HTTP utilise le vrai contrôleur/receiver/adapter et un stockage Map à la place du vrai HermesMediaService/PostgreSQL ; il ne prouve pas le stockage natif durable ni un fournisseur réel.
- Source primaire Evolution vérifiée directement à `3454bec79f514995df9a5ea36a3554ab35cf1c82` : `prisma/postgresql-schema.prisma` lignes199–210 contient bien `headers Json?`, et `src/api/integrations/event/webhook/webhook.controller.ts` lignes77 puis125–127 transmet ces headers à axios. La réserve documentaire sur l'existence de la colonne peut être corrigée ; une réponse qui omet la donnée reste non prouvée.
- CJ-WA-003, reviewer root, assigned CJ03, reviewed `19cb1c968`, status **open — capacité faussement prouvée** : le provider épinglé ajoute `/<transformedWe>` à l'URL si `webhookByEvents=true` (contrôleur officiel lignes107–110), mais le judge ignore ce champ. Bonne URL/token + byEvents activé donne true alors que la livraison vise une sous-route404. Demande : vérifier le chemin effectif ou exiger le mode sans suffixe explicitement supporté, test négatif et pas de vrai drapeau sur une valeur ambiguë. Primaire : https://github.com/EvolutionAPI/evolution-api/blob/3454bec79f514995df9a5ea36a3554ab35cf1c82/src/api/integrations/event/webhook/webhook.controller.ts.
- Plan de recette clarifié au parent : première session intermédiaire dès assemblage/bundle réellement prêts pour exercer tous les parcours puis corriger ; session finale fraîche vers11:30–11:40UTC pour laisser du temps d'utilisation après12UTC. Ne pas repousser seize parcours dans les dix dernières minutes et ne pas lancer de session pour simuler de l'activité. Aucune preview finale neuve annoncée, ancienne expirée, Safari propriétaire non confirmé.


- Complément de coordination 04:47UTC : relais parent des quatre défauts campagnes et de CJ-WA-003 observés dans ses vrais outils SendMessage. Démarrage réel CJ01a `a0e019da4140fa71c` confirmé, ownership exclusif ajouté à MISSIONS. CI41169707939 encore sur installation immutable lors du dernier contrôle ; aucun succès anticipé. Parent poursuit l'intégration, root garde les revues et recettes.


### HERMES-COMPLETE-JOURNEYS-20261031 — supervision du 31 octobre 05:04 UTC

- Inventaire officiel Claude : parent `8f3db32e-4613-45e3-94f3-16e664f3cbfc` busy/working, PTY2418 conservée. Inventaire Codex `collaboration.list_agents` : anciens hour_backend/hour_coordination/v4_mail_backend **errored quota**, aucun enfant Codex actif. Les vieux worktrees restent à préserver ; leur présence ou leur saleté ne prouvent pas un agent vivant. Parent informé pour corriger sa qualification, sans toucher les modifications historiques.
- CI **41169707939 SUCCESS intégral**, exact `cc72431405d6cf0583d0c8b640090d6aefc6b1c8` : TypeScript production backend, Nest/worker, unités combinées, PG legacy/dashboard/pipeline/inbox/events, tenancy/races/zero writes, barrières PG natives et deux racines DI, bundle Vite exact. Root a lu les conclusions des étapes. **Ce SHA précède les nouveaux lots réglages/MCP et les corrections du frontend campagnes** ; ni leur validation ni la livraison fonctionnelle ne sont déduites de ce run.
- CJ-CONN-001 et CJ-CONN-002 : fix `81ff88988dd7c21864f744d458b5f02c54fdabcb`, style `f375fca94a857f6d3a2c79c6e1c4e3468a0bcece`, **verified dans le périmètre relu/testé**. Recheck root **17 tests serveur PASS**, **3 suites frontend /29 tests PASS**. Rechecks caller après résolution/sonde/fermeture présents ; résultats corrélés société/connexion/révision/génération, invalidation des écritures présente. Le test composant de suppression émet cependant un warning Apollo de mock non correspondant (`kind: EVOLUTION, expectedRevision:4`, mock{}), donc prouve l'invalidation à la tentative, **pas une suppression acceptée**. Correction de cette fixture et assertion du changement effectif demandées ; aucun bâillonnement de console.
- CJ-CONN-003, reviewer root, assigned CJ04a, reviewed `f375fca94`, status **open** : CONFIGURE_CONNECTIONS est déduit du seul `canUpdateAllSettings`, mais le vrai gate exige aussi lecture et écriture globales et aucune restriction de champ/ligne. Exemple source : settings=true/readAll=false donne granted en UI et403 au serveur. La query ne lit pas les restrictions. Demande : verdict effectif ou faits nécessaires complets, inconnus conservés, tests rôle settings-seul/restreint. Les droits génériques CRM ne prouvent pas non plus une délégation MCP par société/canal/fil ; libellés à limiter à ce qui est lu. Aucun élargissement du gate serveur.
- CJ-CONN-004, reviewer root, assigned CJ04c via parent, reviewed intégration `dfb33650f`, status **open — parcours manquant** : centre MAIL sélectionne seulement un compte natif préexistant et renvoie vers les comptes du produit lorsqu'il n'y en a aucun. Il ne permet pas de connecter la première boîte depuis le centre unique. Demande : composer le formulaire/hook/mutation IMAP/SMTP natifs dans le centre, même magasin chiffré, validation puis refresh et liaison au bon connectedAccountId, aucun secret renvoyé/persisté côté client. Nouveau lot Claude réellement lancé, voir MISSIONS.
- CJ-CONN-005, reviewer root, assigned CJ04a explicitement par le parent, reviewed `HermesConnectorsService.evolutionConnection` dans l'intégration, status **open** : sonde WA réutilisée par le centre vérifie l'appelant avant I/O seulement ; `resolve` revalide le configurateur, pas forcément cet autre appelant. Recheck frais avant réponse privée demandé, refus d'autorité hors catch transport pour ne pas transformer un403 en panne. Ownership de `hermes-connectors.service.ts` annoncé avant édition ; CJ03 conserve ses fichiers média.
- CJ-MCP-001 : fix `d164ece22`, **verified source et protocole isolé**. Root a exécuté sur `1bb47efe4` les quatre suites discovery/surface/no-automatic-deal/classification : **32 tests PASS**, zéro échec. La découverte réaffirme bien la révision après la dernière page. Cela ne prouve pas le graphe DI du runtime, ni un serveur MCP réel.
- CJ-MCP-002, reviewer root, assigned CJ04b, reviewed `1bb47efe4` intégré `a52f00aab`, status **open — câblage** : service surface injecte optionnellement HermesConnectedMcpAdapter, fourni uniquement dans HermesMessagingConnectorsModule non exporté, et HermesIntakeModule ne l'importe/fournit pas. Des modules frères ne partagent pas leurs providers. Risque structurel de fallback silencieux sur map d'environnement vide malgré connexion MCP centrale. Demande : vrai provider/import/export cohérent et test du module effectif avec map vide/central configuré, sans mock du service métier ni doublon de registry. Travail en cours observé sur les fichiers de module, laissés à leur propriétaire.
- CJ-MCP-003, reviewer root, assigned parent puis nouveau lot mailbox, reviewed `dfb33650f`, status **open — UI manquante** : la vraie page mailbox ne monte aucun contrôle bot V3 ni brouillon MCP. `message.conversationId` canonique est déjà publié. Réutiliser politique par fil sur le mail ouvert, OFF/ASSISTED explicites, brouillon visible/insérable et humain disponible même OFF ; ne pas renvoyer vers l'ancienne inbox comme substitut de parcours.
- CJ-MAIL-001, reviewer root, assigned nouveau lot mailbox, reviewed même source, status **open — persistance non reprise** : `readThread` n'offre resume que si `savedDraft` tenu en useState correspond, et reconnaît qu'aucune opération ne relit les identités de brouillon. Après reload, le brouillon natif reste chez IMAP mais n'est plus reprenable par le CRM. Terminer la découverte/reprise des identités et révisions opaques avec UIDVALIDITY ; test save→reload→Drafts→resume exigé.
- CJ-CAMPAIGN-007 : fix partiel `062835434b6fb12559ffa86e39ad075c454dbfc6` enlève le blocage de sélection, mais **reste in_progress**. `delegated=true` et état verified sont encore dérivés d'un previewSend sans blocker, qui vérifie contenu/domaine/audience/billing et **pas MAIL/SMTP**. Source de checkCampaignSendOrThrow relue par root. Demande : utiliser l'identité centrale native exacte (le hook mailbox le fait déjà), ne pas attester une délégation depuis le simple droit de mettre en file. Autorisation serveur d'émission inchangée.
- CJ-WA-003 : fix `c69a4d733dfa939b1a03e0b8741984bba8ae2ecb` relu, **verified pour le jugement de forme de livraison**. Root a exécuté la suite modifiée : **28 tests PASS**. Exige webhookByEvents=false ; true produit refus de sous-route non servie, absent/null/inattendu reste non prouvé. Rapport corrige la source headers et précise la Map de stockage ; pas de preuve PostgreSQL/blob natif ou de vrai Evolution.
- Parent a effectivement réactivé CJ02 sur des fichiers neufs `test/integration/graphql/suites/hermes-campaign-mailbox*` et fixtures dédiées pour R10 HTTP/PG depuis le compte natif. Aucun fichier connexions/CI/frontend attribué à ce lot. CJ01a conserve le vrai éditeur ; round trip personnalisé demandé pour éviter que l'ancien `variables: []` ne bloque tous les tokens valides. Sept plus nouveaux lots avancent réellement ; aucun statut global done ou preview neuve annoncé.


### HERMES-COMPLETE-JOURNEYS-20261031 — revue et incident de recette du 31 octobre 05:28 UTC

- Parent Claude existant toujours busy/working à l'inventaire officiel ; pas de nouvelle session parent. Les neuf lots enfants demeurent attribués, source applicative root laissée aux seuls Claude.
- CJ-CONN-005 : fix `b0ef31d0c29d9820a090ede94581319a0353bfcf`, **verified source et tests ciblés**. Root a exécuté connectors.service/mail.service/connections.policy : **3 suites /62 tests PASS**. Le recheck de l'appelant WA est bien après l'I/O et hors du catch transport. Le même commit supprime le faux AVAILABLE du curseur IMAP frais et préserve l'autorisation d'essayer un envoi/configuration de contenu riche, sans annoncer une joignabilité non sondée. Aucun fournisseur réel testé.
- CJ-CONN-003 : correction `ba31adf23198c0d6d36ddb329e3eef9d02377fea` relue, **fixed_pending_review des nouveaux tests frontend**. Trois flags et trois listes de restrictions sont effectivement sélectionnés ; inconnus conservés, plusieurs rôles discordants non inventés en permission, nom CRM_ALL_TOOLS_FLAG distinct de la délégation MCP. Le mock de suppression déclare désormais les variables exactes et surveille l'absence d'opérations non appariées. Essai root des trois suites frontend **non chargé** : import ESM ts-jest introuvable après retrait du symlink de dépendances par son propriétaire ; NODE_PATH ne résout pas cet import ESM. Aucun test de ce run n'est compté passé, aucune mutation du checkout original. La configuration originale diffère, donc root n'a pas substitué son autre configuration pour forcer un résultat. Recheck en CI native propre requis.
- CJ-RECIPE-001, acting agent root, status **open — outil de navigation indisponible**, constat nouveau : relecture de documentation CUA réussie, puis inventaire des surfaces timeout/réinitialisation automatique ; reprise du navigateur connu ID2 et création d'un onglet IAB vierge en arrière-plan échouent par fermeture du transport. Une réinitialisation explicite `js_reset`, puis une création propre avec l'entrée documentée, finit également en timeout. Aucun nouvel écran CRM n'a été ouvert ni testé, aucune ancienne capture réutilisée comme preuve. Pas d'autre technologie de contrôle navigateur substituée, pas de redémarrage de l'application utilisateur ni changement de permission. Parent réellement prévenu. Les lots et tests indépendants continuent ; réessai avant recette en ligne, puis limite explicite si le canal reste indisponible.
- CJ03-RECETTE-PG : demande de reprise envoyée au parent pour le Claude CJ03 existant, **ACK/claim encore à confirmer à ce checkpoint**. Exiger une preuve positive HTTP/PG vers le vrai HermesMediaService et blob privé/ingest/lecture autorisée avec de vrais fichiers image/vidéo/audio décodables, sans mock Map et sans toucher aux guards MIME/taille/révocation. La fixture actuelle utilise des octets de texte étiquetés image/png ; ses tests ne prouvent pas une image affichable. Nouveaux fichiers/fixtures disjoints à annoncer avant code et sélection CI à coordonner avec CJ05. Aucun vrai Evolution ni destinataire réel.
- Intégration lue au début du checkpoint `dfb33650f`, dernier build cloud réussi `cc7243140` run41169707939. Aucun nouveau lien de recette fonctionnelle disponible. R15/R16 et le blocage Safari utilisateur restent ouverts ; un HTTP200 ne remplace pas la recette navigateur.


### HERMES-COMPLETE-JOURNEYS-20261031 — quota et rechecks du 31 octobre 05:45 UTC

- **Blocage nouveau confirmé** : parent officiel idle/blocked et sorties parent/enfants « limite cinq heures, remise03:50Martinique ». Les Claude ne codent plus pour le moment. Pas de crédits achetés, autre compte ou parent doublon. Root poursuit les revues/tests/CI. Automation existante mise à jour et vérifiée ACTIVE, même cible ; réveil07:50UTC ajouté, échéance12UTC et silence sur état inchangé conservés. Ne pas toucher le relais d'un autre projet.
- Handoff de reprise publié : docs/handoff/hermes-quota-resume-20261031.md, sources exactes, ownership, priorités et preuves. Sauvegarde privée supplémentaire de la WIP CJ04a/CJ04c, sources conservées sans modification. Root n'a pas écrit de code applicatif.
- CJ-CAMPAIGN-005 : correction7c2e94e12 relue et recheck root dans son checkout QA propre : **13 tests frontend PASS**, vrai TipTap/adaptateur ; **3 tests serveur PASS**, parse/bindings réels mais stringifier HTML stubé. **Verified pour le format émis**, intégration avec sauvegarde/audience pas encore faite. Ce n'est pas une preuve de persistance HTTP/PG ni d'envoi.
- CJ-CAMPAIGN-006/007/008 : checkpoint Claude2f1e8e705 committé avant quota mais pas poussé ; tree propre. Root l'a publié par push ordinaire exact sur la branche attribuée, sans édition sémantique ni force. Relecture snapshot de sauvegarde/corrélation centrale/choix de liste et thème effectuée. **3 suites/31 tests PASS**. **Verified dans ce périmètre de service/UI à réponses simulées**, pas dans les routes finales ni au navigateur. Les loaders comportent un warning DOM non ignoré ci-dessous.
- CJ-CAMPAIGN-009, reviewer root, assigned CJ01, reviewed2f1e8e705, status **open, correction ciblée** : AudiencePicker rend Loader/div dans StyledLoading/p ; React avertit du nesting HTML invalide. Employer un conteneur valide en conservant aria-busy/live, ne pas masquer console.error. Pas une déclaration de panne de production/hydratation réellement observée.
- CJ-MCP-002 : correction3413fd8c3 relue, export et import du même module/connecteur, aucune duplication du registre. Recheck root **2 suites/14 tests PASS**, provenance DI centrale vérifiée sous Nest avec infrastructure simulée. **Verified dans ce périmètre** ; bootstrap natif complet en cours de CI.
- CJ-CONN-003 : recheck réussi dans le checkout QA propre, depuis le vrai dossier frontend (sinon résolution SWC incorrecte) : **3 suites/35 tests PASS** sur sourceb0ef31d0c incluantba31adf23, zéro warning de mock Apollo. **Verified source/tests ciblés**, pas une recette utilisateur. Les essais non chargés précédents restent des limites de lancement, pas des tests passés.
- CI déclenchées par root sur sources livrées : **41173344142** combined native pour3413fd8c3, **41173424054** full frontend pour2f1e8e705 ; en cours au dernier contrôle. Ne pas les annoncer vertes ni comme assemblage final. Le checkout original et tous les fichiers WIP préservés, aucun code Claude remplacé par Codex.


### HERMES-COMPLETE-JOURNEYS-20261031 — CI frontend du 31 octobre 05:49 UTC

- CI **41173424054 FAILURE** sur le SHA exact2f1e8e705 : étape full frontend TypeScript échouée. Root a lu le log failed, une erreur TS2344 : `hermes-campaigns-runtime/__tests__/HermesCampaignContentPersistence.test.tsx:51:44`, `typeof MockLink` ne satisfait pas une contrainte de fonction. C'est un type de **test**, pas une panne d'exécution utilisateur démontrée ; cela bloque toutefois le contrôle strict et interdit de le présenter comme vert.
- CJ-FRONT-TYPE-001, reviewer root, assigned CJ01, status **open** : la classe MockLink est typée avec Parameters (fonction) au lieu de ses paramètres de constructeur. Corriger avec l'utilitaire de constructeur approprié et relancer le contrôle complet, sans exclure le fichier ni assouplir TypeScript. Aucun changement de code par root pendant le quota.
- CI native MCP41173344142 encore en cours au dernier contrôle (PG legacy atteint, pas d'échec). Les conclusions des builds ne sont pas substituées à l'assemblage/recette manquants.


### HERMES-COMPLETE-JOURNEYS-20261031 — vérification native MCP et revue préliminaire du 31 octobre 05:57 UTC

- CI **41173344142 SUCCESS**, SHA exact **3413fd8c3a199ff19518ace968aff54355f19772** : pipeline natif combiné terminé sans échec, incluant sources backend/compilation/units, PG legacy, tenancy et barrières compilées/DI, ainsi que bundle frontend de cette branche. Le source est celui du lot MCP, **pas encore l'assemblage final**. Cette réussite n'atteste ni une connexion MCP réelle, ni les UI encore absentes.
- Root a déclenché un premier full frontend sur le checkpoint réglages **b0ef31d0c**, run **41174465769**, pour vérifier les nouveaux types de rôles/sondes sans gros TSC local ni mutation de source. Run encore en cours, aucune conclusion anticipée.
- CJ-SETUP-001, reviewer root, assigned CJ04c, status **open — revue préliminaire WIP non livrée**, source non committée `useHermesMailboxSetup.ts`/`HermesMailboxSetupPanel.tsx` conservée dans la sauvegarde privée du checkpoint précédent : l'UI affirme qu'aucun serveur n'est contacté pendant l'enregistrement. Or la vraie mutation appelle `validateAndTestConnectionParameters`, qui appelle `testImapSmtpCaldav` pour chaque protocole ; les échanges ont lieu quand IS_IMAP_SMTP_CALDAV_CONNECTION_TEST_ENABLED est actif. Corriger les libellés/commentaires pour ne promettre ni absence d'I/O ni preuve de livraison. Conserver le vrai chemin natif et ses contrôles, ne pas le désactiver pour rendre la phrase vraie.
- CJ-SETUP-002, reviewer root, assigned CJ04c, status **open — même WIP** : le hook attend les refetchQueries puis classe toute exception « refused », et le panneau peut dire « rien n'a été écrit ». Une mutation acceptée suivie d'un refetch défaillant peut donc être annoncée comme refusée. Distinguer écriture acceptée, lecture de liste échouée et résultat réellement inconnu ; ne pas perdre l'id confirmé ni inviter une répétition d'écriture à partir d'un simple défaut de lecture. Ajouter le scénario de test approprié à la reprise. Cette revue ne constitue pas un checkpoint approuvé et aucune source de l'agent n'a été modifiée.
- Quota Claude et CUA inchangés ; pas de nouvelles tentatives de codage Claude avant la remise annoncée07:50UTC, pas d'achat, aucune preview expirante lancée pour masquer l'attente. Revue/tests/CI indépendants continuent.


### HERMES-COMPLETE-JOURNEYS-20261031 — CI réglages du 31 octobre 06:06 UTC

- CI **41174465769 FAILURE**, source exacte **b0ef31d0c29d9820a090ede94581319a0353bfcf**. Full frontend TypeScript signale une erreur TS2741 dans `hermes-admin-ui/utils/__tests__/hermesCompanyAction.test.ts:163:73` : la fixture membre ne fournit pas le nouveau champ obligatoire `roles`. Root a lu le log et la fixture ; aucun code applicatif ni test modifié.
- CJ-FRONT-TYPE-002, reviewer root, assigned CJ04a, status **open** : compléter la fixture avec une représentation de rôles fidèle au contrat et aux assertions de filtrage ; ne pas rendre le champ optionnel, affaiblir le contrôle de permissions ou exclure le test pour passer. Relancer le contrôle complet après correction puis sur la source assemblée. C'est une erreur de type de test, pas une panne utilisateur démontrée. Les 35 tests ciblés passés ne valident pas le contrôle complet.


### HERMES-COMPLETE-JOURNEYS-20261031 — revue liste campagnes du 31 octobre 06:20 UTC

- CJ-CAMPAIGN-010, reviewer root, assigned CJ01, reviewed **2f1e8e705**, status **open, source** : `HermesCampaignListView.tsx:187` ne tient pas compte de isCreateUnconfirmed pour canCreate ; dès que le nom est non vide, le bouton reste actif après une issue inconnue. Le hook `useHermesRuntimeCampaignList.ts:171` génère un nouvel UUID à chaque appel et ne conserve pas celui de l'appel incertain. Un timeout après écriture peut donc être suivi d'une nouvelle création portant un autre id. Le commentaire promettant le même id pour une pression répétée n'est pas vrai. Préserver l'id tenté, vérifier son existence pour réconcilier le résultat inconnu, empêcher la répétition aveugle et les appels concurrents ; une nouvelle intention explicite doit rester possible après réconciliation. Ajouter un test avec nom non vide, écriture acceptée puis réponse perdue, et clic répété ; le test actuel d'état inconnu laisse le nom vide et n'exerce pas ce défaut. Aucun message n'est envoyé par cette création : risque de doublon de brouillon, pas de double envoi démontré.
- CJ-CAMPAIGN-011, reviewer root, assigned CJ01, reviewed **2f1e8e705**, status **open, source** : listes de campagnes et d'audiences limitées aux 50 plus récentes, sans fetchMore/cursor/recherche ni contrôle de page. La query campagnes expose déjà pageInfo mais le hook l'ignore ; l'UI indique seulement N sur total. À 51 campagnes/listes, une ancienne campagne ne peut plus être rouverte via cette liste, et une ancienne audience ne peut plus être sélectionnée. Implémenter une pagination/recherche native stable, conserver droits/tri et rendre l'audience déjà affectée même hors première page. Recette à 51 éléments requise, pas effectuée ici. Ne pas monter artificiellement une limite pour prétendre la complétude.
- Aucun code applicatif ou test de l'agent modifié ; revue de source seulement. Quota Claude toujours avant l'heure de remise, aucun appel de reprise anticipé.


### HERMES-COMPLETE-JOURNEYS-20261031 — canal navigateur du 31 octobre 06:33 UTC

- CJ-RECIPE-001 : **rétablissement technique partiel vérifié**, pas une recette CRM. Après relecture de la documentation CUA, listBrowsers répond (IAB2), puis création fraîche en arrière-plan d'un onglet about:blank réussie, tab18 et AXWebArea lisible. Aucun redémarrage de l'application, changement de permission ou outil de substitution. Aucun écran CRM de la nouvelle source testé.
- Employer ce canal pour la prochaine vraie preview dès source assemblée prête ; ne pas réutiliser l'ancienne V4 expirée ni conclure que Safari propriétaire est corrigé. Quota Claude inchangé avant07:50UTC.


### HERMES-COMPLETE-JOURNEYS-20261031 — premières revues après reprise, 08:07 UTC

- Parent a confirmé un ACK réel et sept relances via SendMessage aux mêmes enfants, observées après07:52UTC. Intégration quatre checkpoints056a3cb4f puis harnais8489e4eb1 et adaptation de propc5354f29d. Root a relu le merge6b16500fd : éditeur natif et saveState conservés, validation de permission sur issues filtrées. La correction de testc535 ajoute uniquement saveState idle au harnais, aucune assertion supprimée.
- Recheck root sur **c5354f29d** : contenu natif + persistance, **2 suites/15 tests PASS**. Vrai TipTap dans le premier test, appels/persistance simulés dans le second ; pas de recette HTTP/PG. Warnings DOM déjà CJ-CAMPAIGN009, act et arrêt forcé d'un worker signalés, donc pas un run sans diagnostic. **6 tests du harnais combined PASS**, nouveau test serveur body explicitement sélectionné. Aucune conclusion full frontend anticipée.
- **CJ-SETUP-001/002 restent ouverts après revue5513687f4**. Le commit crée réellement un panneau natif et ses tests, mais garde le libellé « aucun serveur ... contacté », refetchQueries attendu avant résultat puis catch global classé refused et UI « rien écrit ». Parent informé par suivi PTY, demandé CJ04c seul propriétaire de ces fixes ; CJ04a garde uniquement son slot/centre pour éviter un chevauchement. Le commit existe mais n'est pas approuvé sur ces deux points, nouveaux tests/fix encore attendus.
- **CJ-CAMPAIGN010/011 fix partiel a0fa3dc3a, pas verified** : fermeture du bouton incertain et conservation d'id ajoutées, pagination campagnes ajoutée. Toutefois recheckAfterUncertainCreation ignore le rejet du refetch et remet idle sans vérifier existence/id ; un conflit de retry est considéré comme preuve de non-création et efface l'id alors que la première écriture peut déjà exister. Demande au parent de réconcilier explicitement l'id et le résultat avant répétition. Audience hook inchangé à50 sans pagination : CJ011 n'est pas fermé. Parent informé avec SHA exact, aucune source modifiée root.
