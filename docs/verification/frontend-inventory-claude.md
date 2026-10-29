# Inventaire frontend P0 — Claude

Date : 29 octobre 2026. Agent : Claude (frontend et design). Mission : `docs/handoff/claude-frontend-p0.md`, publiée comme issue `claude972/test-Crm#5`.

Mission documentaire uniquement. Aucun composant, style, route ou contrat n'a été modifié.

## 1. Révisions et périmètre

| Élément | Valeur |
| --- | --- |
| Branche de transmission | `chore/p0-stabilization` |
| **SHA exact inspecté** | **`bb11083776b05f4998d6ddc1a5f15e2deb16539e`** |
| Base historique citée par la mission | `05972c1de4861566f8bbd0ed71dcf6dffd4cbdb6` (= `origin/fix/crm-workspace-paths`) |
| Branche de livraison | `chore/claude-frontend-inventory` |
| Worktree de travail | `/Volumes/Stockage/dev/hermes-crm/claude-frontend-inventory` |
| Fichiers écrits | `docs/verification/frontend-inventory-claude.md`, `docs/handoff/frontend-backlog.md` |

### Branche préexistante : inspection avant réutilisation

`chore/claude-frontend-inventory` **existait déjà en local** (absente du distant) et était déjà montée dans le worktree ci-dessus. Inspection avant réutilisation, comme l'exige le bloc `<startup>` de la mission :

- HEAD initial : `2bd457eccbb3fbde1a48358be98ce768b0bd5470`.
- `git merge-base --is-ancestor` : ce commit est un **ancêtre** de `bb11083`, **6 commits en retard**, 0 commit en avance. Ce n'était donc pas un travail divergent mais un pointeur resté en arrière sur la lignée de stabilisation.
- `git status --porcelain` : vide. Aucune modification non commitée à préserver.
- `git ls-tree -r chore/claude-frontend-inventory -- docs/verification docs/handoff` : contenait `docs/handoff/README.md`, `docs/handoff/claude-frontend-p0.md`, `docs/verification/p0-codex.md`. **Aucun** `frontend-inventory-claude.md`. Aucun travail d'inventaire à écraser.
- Action : `git merge --ff-only` vers `bb11083`. Avance rapide, sans réécriture d'historique.

### Préservation du checkout de Codex

Le checkout `/Volumes/Stockage/dev/hermes-crm/test-Crm` (branche `fix/crm-workspace-paths`, HEAD `05972c1de`) n'a reçu **aucune** modification. Aucun `git reset`, `git clean` ni `git stash` n'a été exécuté, nulle part.

Le dépôt local a un refspec restreint (`+refs/heads/main:refs/remotes/origin/main`), donc `git fetch origin` seul ne ramenait pas la branche de transmission. Elle a été récupérée par `git fetch origin chore/p0-stabilization:refs/remotes/origin/chore/p0-stabilization` : une écriture de référence, sans effet sur l'arbre de travail et sans changement de configuration du dépôt.

Aucun fichier de secrets n'a été lu. Pour `apps/crm/ui/.runtime/front.env` et `.runtime/customer-tools.env`, seule l'**existence** a été testée (voir § 3).

## 2. Documents lus

`AGENTS.md`, `CLAUDE.md`, `DESIGN.md`, `docs/handoff/README.md`, `docs/handoff/claude-frontend-p0.md`, `docs/stabilization/p0-status.md`, `docs/verification/p0-codex.md`, `apps/crm/ui/AGENTS.md`, `Makefile`, `scripts/build-crm.mjs`, `scripts/customer-tools.mjs`, `scripts/check-crm-p0.cjs`, `.github/workflows/p0-integrity.yml`.

## 3. Absence de vérification visuelle — raisons établies

**Aucune preview n'a été ouverte. Aucun écran n'a été vu. Aucune capture n'a été produite.** Trois obstacles, du plus décisif au moins :

1. **Le frontend ne compile pas** sur ce SHA (§ 4.1). La chaîne d'import cassée part de l'entrée `src/index.tsx` et n'est pas paresseuse : ni `vite build` ni le serveur de développement ne peuvent servir l'application. Aucun écran, pas même `/welcome`, ne peut s'afficher.
2. **Configuration d'exécution absente.** `scripts/build-crm.mjs:48` exige `apps/crm/ui/.runtime/front.env`. Test d'existence : absent. Le générer suppose `node scripts/local-project.mjs setup`, qui fabrique des secrets locaux — hors périmètre d'un inventaire.
3. **Dépendances non installées.** `apps/crm/ui/node_modules` absent. `build-crm.mjs:45` refuse de continuer sans `node_modules/.bin/tsgo`.

Conformément à la mission, aucun déploiement n'a été tenté et la production n'a jamais servi de preview. La validation visuelle de l'interface reste une dépendance ouverte de la future mission UI.

### Instrument utilisé à la place

Faute de runtime, l'analyse statique a été rendue exécutable : TypeScript **5.9.2** installé dans un répertoire temporaire hors dépôt, utilisé en **parsing seul** (`ts.createSourceFile` + `parseDiagnostics`), sans typecheck ni résolution de paquets externes. C'est exactement la méthode de `scripts/check-crm-p0.cjs`, appliquée à `twenty-front`. Les résultats des deux instruments concordent (§ 4.4).

Ce que cet instrument **ne** prouve pas : les types, la résolution des dépendances externes, le comportement à l'exécution, le rendu.

## 4. Constats démontrés

Statut de preuve pour chaque constat : **prouvé** (vérifié par une commande dont le résultat est reproductible ici), **code présent** (lu dans les sources, non exécuté), **hypothèse** (déduction explicitement non vérifiée).

---

### 4.1 — P0 · `twenty-front` ne compile pas : 223 erreurs de syntaxe sur 51 fichiers

**Statut : prouvé.**

Un remplacement global a injecté la chaîne d'affichage `KovaaLab CRM` — **avec une espace** — à l'intérieur d'identifiants TypeScript, là où le jeton d'origine était `Twenty`. Une espace dans un identifiant est une erreur de syntaxe.

Mesure : 11 371 fichiers `.ts`/`.tsx` de `apps/crm/ui/packages/twenty-front/src` analysés → **51 fichiers en échec de parsing, 223 diagnostics**.

Répartition du motif `KovaaLab CRM` collé à un caractère d'identifiant, par paquet :

| Paquet | Fichiers | Occurrences | Jeton sûr `KovaaLabCRM` |
| --- | --- | --- | --- |
| `twenty-front` | **52** | **134** | 0 fichier |
| `twenty-ui` | 0 | 0 | 0 fichier |
| `twenty-shared` | 0 | 0 | 6 fichiers |
| `twenty-server` | 1 (chaîne de test) | 1 | 656 fichiers |

**Diagnostic précis : deux conventions de renommage ont été appliquées.** `twenty-shared` et `twenty-server` utilisent `KovaaLabCRM`, sans espace, syntaxiquement valide — par exemple `isValidKovaaLabCRMSubdomain` dans `apps/crm/ui/packages/twenty-shared/src/utils/index.ts:388`. `twenty-front` a reçu la variante avec espace. Le jeton correct existe donc déjà dans le dépôt ; il n'y a pas de convention à inventer.

Déclarations cassées, au cœur du problème :

| Fichier:ligne | Code |
| --- | --- |
| `apps/crm/ui/packages/twenty-front/src/modules/client-config/states/allowRequestsToTwentyIcons.ts:3` | `export const allowRequestsToKovaaLab CRMIconsState = …` |
| `…/src/modules/applications/utils/isTwentyStandardApplication.ts:8` | `export const isKovaaLab CRMStandardApplication = (` |
| `…/src/modules/auth/utils/getTwentyWebsiteUrl.ts:9` | `type KovaaLab CRMWebsitePage = 'terms' \| 'privacy-policy';` |
| `…/src/modules/auth/utils/getTwentyWebsiteUrl.ts:11` | `export const getKovaaLab CRMWebsiteUrl = (` |
| `…/src/modules/client-config/types/ClientConfig.ts:55` | `allowRequestsToKovaaLab CRMIcons: boolean;` |
| `…/src/modules/object-record/record-store/states/selectors/recordStoreIdentifierFamilySelector.ts:10` | `allowRequestsToKovaaLab CRMIcons: boolean;` |
| `…/src/modules/onboarding/components/import-contacts/OnboardingImportPreviewSyncBadge.tsx:52` | `const StyledKovaaLab CRMLogo = styled.img\`` |
| `…/src/modules/settings/data-model/object-details/components/SettingsObjectFieldDataType.tsx:8` | `import { …, IconKovaaLab CRMStar } from 'kovaa-lab-ui/icon';` |
| `…/src/modules/ui/field/input/components/RatingInput.tsx:8` | `import { IconKovaaLab CRMStarFilled } from 'kovaa-lab-ui/icon';` |
| `…/src/modules/settings/mcp/constants/McpSetup.ts:2` | `chatGptKovaaLab CRMAppUrl:` |
| `…/src/generated-metadata/graphql.ts:1384` | `allowRequestsToKovaaLab CRMIcons: Scalars['Boolean']['output'];` |
| `…/src/modules/settings/mcp/utils/__tests__/mcpSetup.test.ts:45` | `kovaa-lab: {` — clé d'objet non quotée, variante `twenty` → `kovaa-lab` |

**Chaîne d'import prouvée depuis l'entrée du bundle**, arêtes statiques et non paresseuses :

```
src/index.tsx:3                        → @/app/components/App
src/modules/app/components/App.tsx:1   → @/app/components/DomainShell
…/DomainShell.tsx:4                    → @/app/components/SharedAppProviders
…/SharedAppProviders.tsx:6             → @/client-config/components/ClientConfigProviderEffect
…/ClientConfigProviderEffect.tsx:1     → @/client-config/hooks/useClientConfig
…/useClientConfig.ts:41                → '@/client-config/states/allowRequestsToKovaaLab CRMIcons'  ← module inexistant
```

**Effet utilisateur** : l'application ne démarre pas. Pas d'écran de connexion, pas de page d'accueil, pas de fiche contact. Rien ne s'affiche.

Deuxième surface atteinte, indépendamment : `FooterNote.tsx` (CGU et politique de confidentialité de l'écran de connexion, rendu par `SignInUpStandardContent.tsx:68`) porte à lui seul 29 diagnostics.

**Priorité : P0.** Bloquant absolu, antérieur à toute autre considération frontend.

**Critère d'acceptation** : les 11 371 fichiers de `twenty-front/src` passent le parsing sans diagnostic, et aucun identifiant du dépôt ne contient d'espace.

**Vérification prévue** : `scripts/check-crm-p0.cjs` étendu à `twenty-front` (§ 4.4) sort en 0, puis `vite build` et `tsgo -p tsconfig.json --noEmit` sur `packages/twenty-front`.

**Correction hors de cette mission.** La mission interdit de modifier les sources frontend, et la réparation doit employer le jeton `KovaaLabCRM` déjà en usage, par renommage ciblé — **jamais** par un nouveau remplacement global.

---

### 4.2 — P0 · 27 imports internes pointent vers 5 modules inexistants

**Statut : prouvé.**

Le remplacement a aussi réécrit les **chemins** de modules dans les chaînes d'import. Les fichiers cibles, eux, ont gardé leur nom `Twenty*`.

| Spécificateur importé | Occurrences | Fichier réel sur le disque |
| --- | --- | --- |
| `@/client-config/states/allowRequestsToKovaaLab CRMIcons` | 13 | `allowRequestsToTwentyIcons.ts` |
| `@/applications/utils/isKovaaLab CRMStandardApplication` | 8 | `isTwentyStandardApplication.ts` |
| `@/auth/utils/getKovaaLab CRMWebsiteUrl` | 2 | `getTwentyWebsiteUrl.ts` |
| `@/settings/developers/constants/KovaaLab CRMCliCreateAppCommands` | 2 | `TwentyCliCreateAppCommands.ts` |
| `@/settings/developers/constants/KovaaLab CRMCliLoginCommand` | 2 | `TwentyCliLoginCommand.ts` |

Les cinq cibles ont été testées une par une : aucune n'existe, ni en `.ts` ni en `.tsx`.

Cas notable : `SettingsDevelopersCliTab.tsx:2-3` et `SettingsDevelopersAppsTab.tsx:3-4` **passent le parsing** — l'espace y est dans une chaîne — mais ne résolvent pas. Corriger uniquement les erreurs de syntaxe laisserait donc ces deux pages cassées sans aucun signal de parsing. C'est pourquoi la vérification doit contrôler le parsing **et** la résolution des imports internes.

**Effet utilisateur** : échec de résolution à la construction du bundle, sur les mêmes surfaces qu'en 4.1, plus les onglets Réglages → Développeurs → CLI et Apps.

**Priorité : P0.** Même lot de correction que 4.1.

**Critère d'acceptation** : 0 import interne non résolu dans `twenty-front`, hors spécificateurs d'assets Vite.

**Vérification prévue** : identique à 4.1.

---

### 4.3 — P0 · Désynchronisation d'identifiants entre `twenty-front` et `twenty-ui`

**Statut : prouvé.**

Le renommage n'a pas touché `twenty-ui` : 0 fichier y contient `KovaaLab CRM`, alors que ce paquet expose toujours des symboles `Twenty*`.

- `apps/crm/ui/packages/twenty-ui/src/icon/index.ts:32` → `export { IconTwentyStar } from './components/IconTwentyStar';`
- `apps/crm/ui/packages/twenty-ui/src/icon/index.ts:33` → `export { IconTwentyStarFilled } from './components/IconTwentyStarFilled';`

Or `twenty-front` importe `IconKovaaLab CRMStar` (`SettingsObjectFieldDataType.tsx:8`) et `IconKovaaLab CRMStarFilled` (`RatingInput.tsx:8`) depuis `kovaa-lab-ui/icon`.

**Conséquence à retenir pour la correction** : retirer l'espace ne suffit pas. `IconKovaaLabCRMStar` n'existe pas davantage dans `twenty-ui`. Ces deux imports doivent revenir à `IconTwentyStar` / `IconTwentyStarFilled`, ou bien `twenty-ui` doit être renommé de façon coordonnée — décision à prendre, pas à deviner.

Incohérence voisine, non bloquante : `twenty-shared/src/utils/index.ts:388` exporte `isValidKovaaLabCRMSubdomain` depuis le fichier `./validation/isValidTwentySubdomain`. Le symbole est renommé, le nom de fichier non. Cela fonctionne ; c'est un écart de nommage, pas un défaut.

Cartographie du rebranding, fichiers de production, catalogues exclus :

| Paquet | Fichiers contenant `Twenty` | Fichiers contenant `KovaaLab` |
| --- | --- | --- |
| `twenty-front` | 0 | 5 696 |
| `twenty-ui` | 28 | 18 |
| `twenty-shared` | 11 | 46 |
| `twenty-server` | 1 515 | 5 039 |

Le rebranding est donc **partiel et non uniforme**. `twenty-front` est le seul paquet entièrement réécrit — et le seul cassé.

**Priorité : P0**, inséparable de 4.1 et 4.2.

**Critère d'acceptation** : tout symbole importé par `twenty-front` depuis `kovaa-lab-ui` et `kovaa-lab-shared` existe dans le paquet exportateur.

**Vérification prévue** : `tsgo --noEmit` sur `packages/twenty-front` après construction de `kovaa-lab-shared` et `kovaa-lab-ui`.

---

### 4.4 — P1 · La CI ne regarde pas le frontend : c'est pourquoi 4.1 à 4.3 ont survécu

**Statut : prouvé, par exécution.**

`scripts/check-crm-p0.cjs:14` :

```js
const packages = ['twenty-server', 'twenty-shared'];
```

Et `.github/workflows/p0-integrity.yml` : le job `crm-workspace` installe les dépendances (ligne 63) puis construit **uniquement** `twenty-shared` (lignes 64-72). Aucun des cinq jobs ne parse, ne construit ni ne typecheck `twenty-front`.

**Contrôles réellement exécutés :**

| Commande | Résultat |
| --- | --- |
| `HERMES_CHECK_MODULES=<tmp> node scripts/check-crm-p0.cjs` (tel quel) | **Réussi, code 0.** « CRM P0: 13954 backend/shared TypeScript files parsed; 50293 internal imports resolved; legacy SDK response marker preserved. » |
| Même script, copie hors dépôt, `packages = ['twenty-front']` | **Échec.** 11 356 fichiers analysés, 38 662 imports contrôlés, **295 échecs** sur **67 fichiers** |

Décomposition des 295 échecs :

- **223 échecs de syntaxe** — valeur identique à celle de l'instrument indépendant du § 4.1, les deux mesures se recoupent.
- **72 imports internes non résolus**, dont :
  - **45 spécificateurs d'assets** (`.svg`, `.png`, `.webp`, `.css`, `?react`, `?worker`) : **faux positifs de l'outil**, résolus par Vite mais hors de portée de `ts.resolveModuleName` ;
  - **27 spécificateurs de code réels** — exactement les 27 du § 4.2, obtenus par une méthode distincte.

**Nuance importante pour la correction** : ajouter `'twenty-front'` à la ligne 14 ne suffit pas. Sans filtrage des extensions d'assets et des suffixes de requête Vite, le job échouerait sur 45 faux positifs et serait vite désactivé. La correction doit faire les deux.

**Effet utilisateur** : indirect mais majeur — un frontend non compilable peut être fusionné sans qu'aucun signal ne se déclenche.

**Priorité : P1**, à traiter dans le même lot que les P0 pour empêcher la récidive.

**Critère d'acceptation** : un job CI échoue sur une erreur de syntaxe ou un import interne non résolu introduit dans `twenty-front`, et ne produit aucun faux positif sur les imports d'assets Vite.

**Vérification prévue** : introduire volontairement une erreur de syntaxe dans une branche jetable et constater l'échec du job ; puis constater le succès sur la branche réparée.

**Propriété** : `scripts/` et `.github/workflows/` appartiennent à Codex. Proposition, pas modification.

---

### 4.5 — P2 · Un bouton de l'interface mène à un chemin de réglages non routé

**Statut : prouvé pour le chemin, hypothèse assumée pour le rendu exact.**

| Fichier:ligne | Fait |
| --- | --- |
| `…/src/modules/object-record/record-list/components/RecordListEmptyState.tsx:60` | `onGoToSettings={() => navigate(SettingsPath.Integrations)}` |
| `apps/crm/ui/packages/twenty-shared/src/types/SettingsPath.ts:81` | `Integrations = 'integrations'` |
| `…/src/modules/settings/hooks/useSettingsNavigationItems.tsx:164-170` | entrée de navigation **commentée** : `// TODO: Re-enable when integrations page is ready` |
| `…/src/modules/app/components/SettingsRoutes.tsx` | 98 chemins routés ; `SettingsPath.Integrations` **absent**, aucun catch-all sous `settings` |

Déclenchement : `RecordIndexEmptyState.tsx:80-92`, branche `objectMetadataItem.isRemote`, bouton « Go to Settings » avec `IconSettings`. C'est donc l'état vide d'une table distante, pas un chemin passant.

**Effet utilisateur** : impasse. L'utilisateur clique un bouton d'aide et n'atteint pas de page utile. **Le rendu exact — page « non trouvée » ou zone de contenu vide sous le cadre des réglages — dépend de la résolution de `react-router` sur une route parente sans enfant correspondant, et n'a pas été vérifié faute de runtime.** C'est une hypothèse, pas un constat.

**Priorité : P2.** Chemin étroit, mais défaut réel et bon marché à corriger.

**Critère d'acceptation** : le bouton mène à une page existante, ou disparaît tant que la page Intégrations n'existe pas.

**Vérification prévue** : avec un objet distant et une liste vide, cliquer « Go to Settings » et constater l'arrivée sur une page rendue.

**À ne pas confondre avec une régression** : `Legal`, `LogicFunctions`, `NewLogicFunction` sont eux aussi déclarés et non routés, mais **aucune** interface n'y navigue (seul `src/utils/title-utils.ts:12-13` leur associe un titre de page). Ce sont des entrées d'énumération inertes, héritées de l'amont. Ce ne sont pas des fonctionnalités perdues.

De même, `AppPath.Dpa` porte `element: null` dans `createWorkspaceRouteObjects.tsx:178-180`. Vérifié : ce n'est pas un défaut — `usePageChangeEffectNavigateLocation.ts:199` redirige `/dpa` vers les réglages DPA, et neuf cas de ce comportement sont couverts par `__tests__/usePageChangeEffectNavigateLocation.test.ts:279-287`.

---

### 4.6 — P2 · Liens produit vers un domaine qui n'existe pas

**Statut : prouvé.**

- `host kovaa-lab.com` → **`NXDOMAIN`**. Le domaine n'est pas enregistré. (Contrôle de référence sur `twenty.com` : résolution normale, donc la méthode n'est pas en cause.)
- `gh api repos/kovaa-lab/kovaa-lab` → **404**. Le dépôt n'est pas accessible publiquement.

Références de production concernées :

| Fichier:ligne | Surface utilisateur |
| --- | --- |
| `…/src/modules/auth/utils/getTwentyWebsiteUrl.ts:7` | `KOVAALAB_WEBSITE_HREF = 'https://kovaa-lab.com'` → **CGU et politique de confidentialité de l'écran de connexion** (`FooterNote.tsx:72, 80, 102, 110`) |
| `apps/crm/ui/packages/twenty-shared/src/constants/DocumentationBaseUrl.ts:1` | `https://docs.kovaa-lab.com` → **9 fichiers de production** consommateurs de liens de documentation |
| `…/src/pages/settings/community/SettingsCommunity.tsx:116` | `https://kovaa-lab.com/partners/list` |
| `…/src/pages/settings/community/SettingsCommunity.tsx:135` | `https://kovaa-lab.com/releases` |
| `…/src/modules/workflow/.../WorkflowEditActionFormBuilder.tsx:295` | lien d'aide `docs.kovaa-lab.com` |
| `…/src/modules/navigation-menu-item/edit/hooks/useNavigationMenuItemAddOptions.tsx:175` | `link: 'https://kovaa-lab.com'` |
| `…/src/modules/settings/billing/constants/SettingsBillingPlanComparisonRows.ts:498` | libellé `Subdomain (yourco.kovaa-lab.com)` |
| `apps/crm/ui/packages/twenty-front/index.html:19` et `:26` | `og:image` et `twitter:image` → `raw.githubusercontent.com/kovaa-lab/kovaa-lab/...` (dépôt 404) → **aperçu social cassé** |

Les 215 autres occurrences de `kovaa-lab.com` dans `twenty-front/src` sont des données de tests, de stories et de mocks. Sans effet utilisateur ; hors de ce constat.

**Effet utilisateur** : les liens CGU et politique de confidentialité de l'écran de connexion n'aboutissent pas. C'est le point le plus sensible de la liste, parce qu'il touche des mentions légales.

**Priorité : P2.** À remonter en P1 si une mise en service devait être envisagée, un produit ne pouvant pas afficher des CGU injoignables.

**Critère d'acceptation** : tout lien externe affiché à l'utilisateur résout, ou l'entrée qui le porte est masquée.

**Vérification prévue** : extraire les URL externes des sources de production et contrôler leur résolution ; répéter le contrôle après décision de marque.

**Ce correctif n'est pas purement frontend** : il suppose soit d'enregistrer un domaine, soit de choisir des cibles réelles. Décision utilisateur (§ 6).

---

### 4.7 — P2 · La police active est `Inter`, explicitement bannie par `DESIGN.md`

**Statut : prouvé.**

`DESIGN.md` : « Do not introduce Inter, Poppins, Roboto, or system-ui as the design font. » Or `Inter` est la police du produit, déclarée en cinq endroits :

| Fichier:ligne | Déclaration |
| --- | --- |
| `apps/crm/ui/packages/twenty-front/src/index.css:5` | `font-family: 'Inter', sans-serif;` |
| `apps/crm/ui/packages/twenty-ui/src/theme/theme-light.css:184` | `--t-font-family: Inter, sans-serif;` |
| `apps/crm/ui/packages/twenty-ui/src/theme/theme-dark.css:180` | `--t-font-family: Inter, sans-serif;` |
| `apps/crm/ui/packages/twenty-ui/src/theme/constants/ThemeLight.ts:199` | `family: 'Inter, sans-serif'` |
| `apps/crm/ui/packages/twenty-ui/src/theme/constants/ThemeDark.ts:200` | `family: 'Inter, sans-serif'` |

Et la police est **réellement livrée** : `src/index.tsx:8-11` importe `@fontsource/inter/400.css` à `700.css`, dépendance déclarée en `packages/twenty-front/package.json:40` (`@fontsource/inter ^5.2.8`). Ce n'est donc pas un chargement manqué : c'est bien la police rendue.

Aucun fichier de police Geist ou Satoshi n'existe dans `apps/crm/ui`. Les `.woff2` présents dans le dépôt appartiennent à `twenty-docs` et `twenty-website`, hors de l'application.

Écart voisin, même nature : `DESIGN.md` annonce `#0A0A0A` en sombre et `#FAFAFA` en clair, tandis que le thème pose `--t-background-primary: color(display-p3 0.09 0.09 0.09)` (≈ `#171717`) et `color(display-p3 1 1 1)` (blanc pur) — `theme-dark.css:98` et `theme-light.css:98`.

**Priorité : P2, avec arbitrage utilisateur requis — pas une correction à appliquer seul.** `DESIGN.md` se termine par « Follow a more specific design system in a subproject when it applies; do not silently redesign an existing product. » Le CRM importé **a** son propre système de design mûr, piloté par jetons. Deux règles du même document pointent en sens opposés. Trancher appartient à l'utilisateur, et la mission demande explicitement de conserver le design existant.

**Si l'alignement sur `DESIGN.md` est retenu**, le changement est concentré : un jeton (`--t-font-family`) dans quatre fichiers de thème, plus `index.css:5`, plus l'ajout d'une police auto-hébergée avec pile de repli. Il faudra d'abord choisir entre Geist et Satoshi, vérifier la licence, et fournir une référence visuelle comme l'exige `DESIGN.md`.

**Vérification prévue** : après décision, contrôler le rendu des titres et du corps de texte sur une preview, en clair et en sombre, et vérifier la pile de repli quand la police échoue à charger.

---

### 4.8 — P2 · Couverture partielle de `prefers-reduced-motion`

**Statut : prouvé pour la mesure, non vérifié pour le rendu.**

`DESIGN.md` exige la prise en charge du mouvement réduit. Mesure sur les fichiers de production de `twenty-front` et `twenty-ui`, tests et stories exclus :

- **34 fichiers** contiennent `@keyframes` ou `animation:` ;
- **15** d'entre eux portent une garde `prefers-reduced-motion` ;
- donc **19 fichiers animés sans garde** ;
- 46 fichiers mentionnent `prefers-reduced-motion` au total, certains protégeant des transitions plutôt que des keyframes ;
- **aucun reset global** : `src/index.css` (69 lignes) n'en contient aucun, ni `index.html`, ni les fichiers de thème.

**Effet utilisateur** : pour un utilisateur ayant demandé la réduction des animations au niveau du système, une partie des animations continue de jouer. Quelles animations précisément n'a pas été vérifié.

**Priorité : P2.**

**Critère d'acceptation** : sous `prefers-reduced-motion: reduce`, aucune animation décorative ne joue ; les transitions fonctionnelles sont réduites, pas supprimées au point de masquer un changement d'état.

**Vérification prévue** : émuler `prefers-reduced-motion: reduce` sur une preview et parcourir le tiroir de navigation, le menu de commandes, les tableaux et le panneau latéral. Un reset global dans `index.css` est la piste la plus économe, à confirmer après inspection visuelle.

---

### 4.9 — P3 · `ContactLink` ouvre un nouvel onglet sans attribut `rel`

**Statut : prouvé.**

`…/src/modules/ui/field/display/components/internal/ContactLink/ContactLink.tsx:44` pose `target="_blank"` sans `rel`. Ce composant rend les champs **e-mail et téléphone des fiches** : consommé par `EmailDisplay.tsx` et `PhoneDisplay.tsx`.

La convention du dépôt est pourtant claire : les 15 autres emplacements de production posent `rel="noopener noreferrer"` ou `rel="noreferrer"` — par exemple `FooterNote.tsx:73-74`, `AttachmentRow.tsx:225-226`, `LinkifiedText.tsx:32-33`, `SettingsCard.tsx:115`.

**Sévérité réellement faible, et je le dis franchement** : les navigateurs actuels impliquent `noopener` pour `target="_blank"`, et le composant assainit déjà l'URL via `getSafeUrl(href)` (ligne 47). Le défaut est un écart de convention, pas une faille exploitable sur un navigateur à jour.

**Priorité : P3.**

**Critère d'acceptation** : tous les ancrages `target="_blank"` de production portent un `rel` explicite.

**Vérification prévue** : règle de lint sur les ancrages `target="_blank"`, plutôt qu'une correction ponctuelle.

---

### 4.10 — P3 · Catalogues de traduction corrompus par le même remplacement

**Statut : prouvé.**

Le remplacement a aussi touché des traductions où le nom du produit portait un suffixe grammatical. 10 occurrences dans 4 catalogues :

| Catalogue | Occurrences | Exemple |
| --- | --- | --- |
| `…/src/locales/fi-FI.po` | 6 | ligne 28738 : `"Tervetuloa KovaaLab CRMyn"` |
| `…/src/locales/hu-HU.po` | 2 | ligne 28738 : `"Üdvözöljük a KovaaLab CRMben"` |
| `…/src/locales/no-NO.po` | 1 | ligne 18901 : `"Åpne KovaaLab CRMs offisielle ChatGPT-integrasjon…"` |
| `…/src/locales/da-DK.po` | 1 | ligne 18901 : `"Åbn KovaaLab CRMs officielle ChatGPT-integration…"` |

**Effet utilisateur** : texte agrammatical visible en finnois, hongrois, norvégien et danois.

**Priorité : P3.**

**Contrainte à respecter** : `apps/crm/ui/AGENTS.md` interdit de commiter les catalogues hors d'une tâche de traduction, parce que `lingui extract` les régénère avec des milliers de lignes de bruit. Ce correctif appartient donc à une tâche i18n dédiée, pas au lot P0.

**Critère d'acceptation** : plus aucune occurrence du motif `KovaaLab CRM` suivi d'une lettre dans les catalogues.

**Vérification prévue** : relecture par un locuteur ou contrôle de cohérence par catalogue après décision de marque.

## 5. Inventaire des parcours

Statuts : **code présent** = lu dans les sources ; **non exécuté** = aucun rendu observé. Sur ce SHA, **aucun** comportement n'a été exécuté (§ 3). Rien de ce qui suit ne doit être lu comme « vérifié ».

### 5.1 Navigation

Routage piloté par la donnée, pas par une liste figée.

- `apps/crm/ui/packages/twenty-shared/src/types/AppPath.ts` — 32 entrées d'énumération ; `SettingsPath.ts` — 108 entrées, 98 routées.
- `…/src/modules/app/routing/utils/createWorkspaceRouteObjects.tsx` (190 lignes) — 13 routes de premier niveau, toutes en `lazy()` sauf l'index et `/dpa`.
- Routage par surface : `WorkspaceRoutes.tsx` filtre par `workspaceSurface.type` (`main` ou `side-panel`) ; `WorkspaceRouteUnavailable.tsx` couvre le cas indisponible.
- Tiroir : `MainNavigationDrawerContent.tsx` → `NavigationDrawerTabbedContent` ; les entrées viennent de `useNavigationMenuItemsByFolder()`, donc d'une configuration d'espace de travail. **Aucune liste de navigation en dur** : ajouter « Outils clients » passera par le mécanisme d'éléments de menu ou par une page de réglages, pas par l'édition d'un tableau statique.
- Mobile : `MobileNavigationBar.tsx`, `MobileNavigationBarScrollEffect.tsx`, `useMobileNavigationBarItems.ts` ; `AppPath.Home = '/home'` porte le commentaire « Mobile only: the navigation menu is a page there rather than a drawer ».

### 5.2 Authentification

- Portier unique : `…/src/modules/app/hooks/usePageChangeEffectNavigateLocation.ts` (222 lignes). Ordre des gardes : session absente → `/welcome` ; plan requis ; espace suspendu ; puis les cinq états d'onboarding (`WORKSPACE_ACTIVATION`, `PROFILE_CREATION`, `SYNC_EMAIL`, `INVITE_TEAM`, `BOOK_CALL`) ; puis les redirections d'index et `/dpa`.
- Couvert par `__tests__/usePageChangeEffectNavigateLocation.test.ts` — tests non exécutés par moi (§ 7).
- Garde contre la redirection ouverte : `…/src/modules/auth/utils/isValidReturnToPath.ts` — rejette ce qui n'est pas un chemin interne sûr, ce qui ne commence pas par `/`, la racine seule, et les préfixes d'onboarding et de réinitialisation de mot de passe. Test présent.
- `returnToPath` est lu depuis l'état puis, en repli, depuis le paramètre d'URL (lignes 30-34, 79-82), toujours à travers la garde.
- Multi-espace : `DomainShell.tsx` arbitre entre `RootApp` et `WorkspaceApp` selon `isMultiWorkspaceEnabled` et le domaine courant.

### 5.3 Fiches contacts

- Il n'existe **pas** de fiche contact dédiée. `Person` est un objet générique : `…/src/modules/people/types/Person.ts` (29 lignes ; `phone` marqué `@deprecated`) et le module `people` ne contient que ce type.
- Le rendu passe par `…/src/pages/object-record/RecordShowPage.tsx` → `RecordShowPageContent`, avec dérivations pour les fils de discussion IA et les versions de workflow.
- Champs e-mail et téléphone : `EmailDisplay.tsx` et `PhoneDisplay.tsx` via `ContactLink` (§ 4.9).
- **Conséquence pour P1** : rattacher un outil client à un contact ne demande pas de composant de fiche spécifique ; cela passe par le système de champs et de widgets de l'objet.

### 5.4 Pages d'outils

**Il n'y a pas de page « Outils clients » sur cette branche.** `git grep -ril "outils clients" -- apps/crm/ui` ne renvoie rien. Ce n'est **pas une régression** : cette page n'a jamais été livrée sur cette lignée (§ 8).

Surfaces existantes qui pourraient l'accueillir :

- `SettingsPath.Applications = 'applications'` — routé (`SettingsRoutes.tsx:1164`), listé sous le libellé « Apps » (`useSettingsNavigationItems.tsx:171-176`), protégé par `PermissionFlagType.APPLICATIONS`.
- `SettingsPath.AvailableApplicationDetail = 'applications/available/:availableApplicationId'` — routé (`SettingsRoutes.tsx:1176`). Notion de catalogue d'applications **disponibles** déjà présente.
- `SettingsPath.Integrations` — déclaré, non routé, entrée de navigation commentée (§ 4.5). **Emplacement naturel, et déjà réservé par un TODO.**
- Droits : `PermissionFlagType` expose 24 valeurs, dont `APPLICATIONS`, `MARKETPLACE_APPS`, `API_KEYS_AND_WEBHOOKS`. Mise en œuvre par `useHasPermissionFlag`, `SettingsProtectedRouteWrapper`, `SettingsRoleRouteGuard`.

### 5.5 Conventions de design et d'i18n

Issues de `apps/crm/ui/AGENTS.md` et confirmées par lecture des sources :

- **Styles** : Linaria, sans runtime — `styled` depuis `@linaria/react`, `css` depuis `@linaria/core`. Les couleurs passent par `themeCssVariables` ou les variables `--t-*`. Aucune valeur de couleur en dur dans les composants lus.
- **i18n** : Lingui. `Trans` et `useLingui` pour le texte utilisateur, `doNotTranslate()` pour ce qui doit rester littéral — par exemple `TwentyCliLoginCommand.ts:5`, où une commande CLI ne doit pas être traduite.
- **Icônes** : import depuis `kovaa-lab-ui/icon`, jamais depuis `@tabler/icons-react`.
- **Couverture i18n** : 35 catalogues, 5 248 clés.

| Locale | Clés | `msgstr` vides | Traduites |
| --- | --- | --- | --- |
| `en` | 5 248 | 4 | 5 244 |
| `pt-BR` | 5 248 | 16 | 5 232 |
| `fr-FR` | 5 248 | 68 | 5 180 |
| `es-ES` | 5 248 | 71 | 5 177 |
| `de-DE` | 5 248 | 85 | 5 163 |

Le français est à 98,7 %. Les 68 entrées vides n'ont pas été rattachées à des écrans précis.

## 6. Politique de marque proposée

Constat de départ : **« Hermès » n'apparaît nulle part dans les sources de l'interface.** Les 4 correspondances de `herm[eè]s` dans `twenty-server` sont des faux positifs (`otHERMEsSageThreads` dans `get-messages.service.ts`, `mail2hermes.com` dans une liste de fournisseurs d'e-mail). « Hermès » vit à l'extérieur de l'application :

| Couche | Nom employé | Preuves |
| --- | --- | --- |
| Interface du CRM | **KovaaLab CRM** | `index.html:22, 30, 31` (`og:title`, `twitter:title`, `<title>`) |
| Aide de la racine | **Hermès CRM** | `Makefile:7` |
| E-mails sortants de Char | **Hermès CRM** | `infra/modules.compose.yml:24` — `MAILER_SENDER_EMAIL: Hermès CRM <notifications@hermes.example.test>` |
| Infrastructure | `hermes` | `docker-compose.yml:2`, `infra/crm.compose.yml:7-13` (bases `hermes_crm`), contexte Docker `colima-hermes-crm`, CI `hermes-p0` |

Deux noms atteignent donc l'utilisateur : l'interface du CRM dit « KovaaLab CRM », les e-mails du module Char disent « Hermès CRM ».

**Politique proposée, en quatre règles.**

1. **Un seul nom visible par l'utilisateur**, à choisir par l'utilisateur. Il doit être identique dans le titre de l'application, les CGU, les e-mails sortants des trois modules et les métadonnées sociales. Je ne tranche pas : c'est une décision de marque, pas une décision technique.
2. **L'infrastructure garde `hermes`.** Noms de projets Compose, bases, volumes, contextes Docker, préfixes CI : aucun renommage. Rien n'y est visible par l'utilisateur et tout renommage casse des volumes de données existants.
3. **Aucun remplacement global d'identifiants techniques, jamais.** Les constats 4.1 à 4.3 et 4.10 sont précisément les dégâts d'un tel remplacement. Quand un identifiant doit changer, le jeton sûr existe déjà dans le dépôt : `KovaaLabCRM`, utilisé par `twenty-shared` et `twenty-server`. Les répertoires `twenty-*` et les basenames `Twenty*` restent tels quels tant qu'une mission dédiée ne les traite pas : leur nom n'est pas visible par l'utilisateur et les renommer déplacerait des milliers de fichiers pour un gain nul.
4. **Les noms de marque dans les chaînes traduisibles passent par Lingui**, pas par un éditeur de texte. C'est la leçon du § 4.10 : un suffixe grammatical collé au nom du produit ne survit pas à un `sed`.

Point bloquant adjacent : la marque retenue doit disposer d'un domaine réel. `kovaa-lab.com` n'existe pas (§ 4.6). Tant que ce point n'est pas réglé, les CGU et la politique de confidentialité de l'écran de connexion n'aboutissent pas.

## 7. Contrôles non effectués

Liste explicite. Rien ci-dessous n'a été exécuté, et aucun de ces critères n'est validé.

- **Aucune installation de dépendances** (`yarn install --immutable`), aucun `vite build`, aucun `tsgo --noEmit`.
- **Aucun typecheck.** Le parsing seul ne vérifie ni les types, ni la résolution des paquets externes. Le nombre réel d'erreurs de typage de `twenty-front` est inconnu et probablement supérieur aux 295 échecs mesurés.
- **Aucun test** : ni Jest, ni Vitest, ni Storybook, ni Playwright. Les fichiers de tests cités au § 5.2 ont été **lus**, pas exécutés.
- **Aucun rendu visuel** : aucune preview, aucune capture, aucun contrôle de contraste mesuré, aucun audit axe ou Lighthouse.
- **Aucun test clavier réel**, aucun passage au lecteur d'écran. Les 500 fichiers front et 69 fichiers `twenty-ui` porteurs d'attributs `aria-*`, le module `keyboard-shortcut-menu` et la quinzaine de hooks de hotkeys scopés attestent d'une infrastructure, **pas** d'une accessibilité vérifiée.
- **Aucun test responsive** sur appareil ou émulateur. `MobileNavigationBar`, `MobileHomePage`, `CommandMenuForMobile` et la bascule de base typographique de `index.css:37-41` sont du code lu.
- **Aucune vérification des états à l'exécution.** Les squelettes (4 composants sous `src/loading/`), les frontières d'erreur à 4 niveaux (`AppRootErrorFallback`, `AppPageErrorFallback`, `AppRouteErrorFallback`, `AppFullScreenErrorFallback`) et les 5 branches d'état vide de `RecordIndexEmptyState.tsx` sont du code présent, non exécuté.
- **Aucun accès aux modifications locales non publiées de Codex.** Elles ne sont pas visibles depuis cette branche et je n'ai pas inspecté son checkout.
- **Aucun déploiement**, aucun contact avec la production.
- **Aucun audit de secrets.** Seule l'existence de `.runtime/front.env` et `.runtime/customer-tools.env` a été testée ; leur contenu n'a pas été lu.

## 8. Dépendances non publiées et limites connues

1. **`integrated-tools` et Cal.diy sont absents de cette branche.** `git ls-files` filtré sur `integrated-tools`, `customer-tools`, `client-tools`, `cal.diy` ne renvoie qu'un seul fichier suivi : `scripts/customer-tools.mjs`. Ce sont des **dépendances non publiées**, conservées dans le checkout de Codex. Elles n'ont **pas** été recréées et ne doivent pas l'être depuis cette branche.
2. **Le module `calendar` n'a pas de sources ici.** `scripts/customer-tools.mjs:59` mappe les profils vers `{ char: "bot", forms: "form", calendar: "calendar" }`, donc `apps/crm/calendar/package.json`. Or `apps/crm` ne contient que `bot`, `form` et `ui`. Le script échoue alors explicitement en ligne 61 : « Sources du module … absentes de ce checkout ; consulter docs/stabilization/p0-status.md. » **C'est le comportement correct, pas un défaut.**
3. **`packages/twenty-server` à la racine n'est pas le serveur ciblé.** Confirmé par `docs/stabilization/p0-status.md` et par `scripts/build-crm.mjs:50`, qui construit `kovaa-lab-server` **dans** `apps/crm/ui`. Les fichiers `.ts` épars à la racine (`availability.service.ts`, `booking.service.ts`, `calendar-rdv.service.ts`, `graphql.resolvers.ts`…) relèvent du même héritage. Hors périmètre frontend ; non inspectés.
4. **Les documents historiques affirmant que tous les modules sont terminés ne sont pas des preuves** et n'ont pas été traités comme telles. Le présent rapport n'affirme que ce qu'une commande citée établit.
5. **Aucun état « disponible » n'est déduit d'une URL configurée.** Aucune URL d'outil n'a été présentée comme une preuve de disponibilité ni d'autorisation. L'inverse est documenté : `kovaa-lab.com` est **configuré partout et n'existe pas** (§ 4.6) — démonstration directe qu'une URL présente ne prouve rien.
6. **Conflit de convention à arbitrer.** `apps/crm/ui/AGENTS.md` annonce que la CI rejette les commits portant une attribution IA. Le périmètre de ce fichier est `apps/crm/ui` ; mes documents sont à la racine, et `.github/workflows/p0-integrity.yml` est le seul workflow du dépôt — il ne contient aucun contrôle de message de commit. Mon commit suit donc la convention d'attribution de mon harnais. **Si une politique à l'échelle du dépôt est souhaitée, elle doit être écrite dans l'`AGENTS.md` racine et appliquée par la CI.** À trancher avec Codex.

## 9. Observations hors périmètre, transmises à Codex

Relevées en passant, **non corrigées**, backend et scripts n'étant pas mon périmètre.

- `apps/crm/ui/packages/twenty-server/src/engine/core-modules/event-logs/producers/application-log/strip-ansi-escapes.util.spec.ts:29` — unique occurrence résiduelle du motif `KovaaLab CRM` dans `twenty-server`, ici dans une chaîne de test. Sans effet sur la compilation.
- `scripts/check-crm-p0.cjs:61` affirme `LOGIC_FUNCTION_HTTP_RESPONSE_MARKER === '__kovaa-labHttpResponse'`. Ce marqueur est un jeton de protocole entre le SDK et le serveur. Le renommage est cohérent **à l'intérieur** du dépôt, et le script le vérifie. Question ouverte : une version du SDK publiée hors de ce dépôt attendrait-elle l'ancien marqueur ? Réponse connue de Codex, pas de moi.
- Catalogues i18n de `twenty-server` : `…/i18n/locales/fi-FI.po:7233` et `:15684` portent la même corruption grammaticale qu'au § 4.10.

## 10. Backlog

Le backlog priorisé — correctifs P0 du frontend, puis préparation P1 « Outils clients » — est dans **`docs/handoff/frontend-backlog.md`**, publié avec ce rapport.

## 11. Demande de revue croisée à Codex

**Cette revue croisée n'est pas terminée. Je ne peux pas la déclarer terminée seul.**

@Codex — revue demandée sur **le commit d'inventaire `b95ce0341d970201a5c5334397736e8317716fcf`**, branche `chore/claude-frontend-inventory`, basée sur `bb11083776b05f4998d6ddc1a5f15e2deb16539e`.

Points sur lesquels ton avis est nécessaire :

1. **§ 4.1 à 4.3 — les 295 défauts de `twenty-front`.** Confirmes-tu la mesure sur ton checkout ? Et surtout : ces défauts sont-ils **déjà réparés dans tes modifications locales non publiées** ? Je n'ai pas accès à ces changements et ne peux pas le savoir. Si la réparation existe chez toi, mes P0 sont un constat sur la branche publiée, pas sur l'état réel de ton travail — et il faut le consigner.
2. **§ 4.3 — arbitrage d'identifiants.** Les imports d'icônes de `twenty-front` doivent-ils revenir à `IconTwentyStar` / `IconTwentyStarFilled`, ou `twenty-ui` doit-il être renommé de façon coordonnée ? Décision partagée, je ne la prends pas seul.
3. **§ 4.4 — extension de `scripts/check-crm-p0.cjs` à `twenty-front`.** Le fichier t'appartient. Ma proposition inclut le filtrage des spécificateurs d'assets Vite, sans quoi le job échouerait sur 45 faux positifs.
4. **§ 4.6 — domaine `kovaa-lab.com` inexistant.** Correctif non purement frontend. Quelle cible retenir pour les CGU, la politique de confidentialité et la documentation ?
5. **§ 8.6 — attribution dans les messages de commit.** Convention à fixer à l'échelle du dépôt, ou à laisser au périmètre `apps/crm/ui` ?
6. **Contrat « Outils clients ».** Aucune API, aucun état de santé et aucun état « connecté » n'a été créé. La proposition de contrat du backlog part de celle de `docs/stabilization/p0-status.md` et attend ton accord avant toute implémentation.

Aucun correctif n'a été appliqué dans cette mission ; il n'y a donc aucune correction ni vérification de correction à consigner. P1 n'est pas implémenté et ne le sera pas avant publication d'une base applicative validée et accord sur le contrat backend.

## 12. Annexe — re-vérification sur la base avancée

Pendant la rédaction, `chore/p0-stabilization` est passée de `bb11083776b05f4998d6ddc1a5f15e2deb16539e` à **`c0318cf0b33134c4c292affe395009a6bd3b4662`** (5 commits de Codex : `3adbd349d`, `e52f1b83d`, `8b92d7646`, `89ab4e8b1`, `c0318cf0b`). Les constats ont donc été recontrôlés sur la nouvelle pointe.

**Résultat : les constats tiennent à l'identique.**

| Mesure, commande identique sur les deux arbres | `bb11083` | `c0318cf` |
| --- | --- | --- |
| Fichiers de `twenty-front/src` portant le motif `KovaaLab CRM` dans un identifiant, catalogues exclus | 52 | **52** |
| Occurrences | 134 | **134** |

`git diff --stat bb11083 c0318cf -- apps/crm/ui/packages/twenty-front` est **vide** : aucun fichier du frontend n'a changé. Les 5 nouveaux commits portent sur la CI et la documentation. Les 5 modules manquants du § 4.2 sont toujours absents, les fichiers `Twenty*` étant toujours en place.

Une mesure intermédiaire a d'abord affiché 60 fichiers et 148 occurrences sur la nouvelle base. C'était un **artefact de mesure** : les catalogues `locales/` n'étaient pas exclus de ce comptage-là. Le chiffre est faux et n'est conservé ici que pour ne pas laisser croire à une aggravation.

### Pourquoi la PR de ce rapport n'a aucun contrôle CI

Sur la nouvelle base, `.github/workflows/p0-integrity.yml` restreint le déclencheur :

```yaml
  pull_request:
    branches: [main]
```

Cette PR cible `chore/p0-stabilization`, donc **aucun job ne s'exécute, par conception** (commit `e52f1b83d`, « ci(p0): avoid duplicate push and draft PR runs »). Le déclencheur `push` porte en outre désormais un filtre `paths` qui n'inclut pas `docs/**`.

Je ne revendique donc **aucun** contrôle CI vert sur cette livraison : il n'y en a eu aucun.

**Cela renforce le § 4.4** : non seulement aucun job ne couvre `twenty-front`, mais les PR vers la branche de transmission n'exécutent plus aucun contrôle. La proposition A4 du backlog doit en tenir compte — étendre `scripts/check-crm-p0.cjs` ne suffira pas si aucun déclencheur ne l'exécute sur les PR concernées.
