# Backlog frontend — correctifs P0 puis préparation P1 « Outils clients »

Date : 29 octobre 2026. Auteur : Claude. Base inspectée : `bb11083776b05f4998d6ddc1a5f15e2deb16539e`.

Preuves et méthode : `docs/verification/frontend-inventory-claude.md`. Les numéros de section (§) renvoient à ce rapport.

**Rien de ce backlog n'est implémenté.** Les correctifs P0 touchent des sources frontend que la mission d'inventaire interdit de modifier ; ils attendent une mission d'implémentation autorisée. P1 attend en outre une base applicative validée et un contrat backend convenu avec Codex.

## Lot A — P0 : rendre `twenty-front` compilable

Les trois premiers éléments sont un seul et même défaut vu sous trois angles. **Ils doivent être corrigés ensemble** : traiter la syntaxe sans les chemins de modules, ou sans l'alignement inter-paquets, laisse l'application non constructible tout en supprimant le signal de parsing.

### A1 — Restaurer des identifiants valides dans `twenty-front` (§ 4.1)

Portée : 52 fichiers, 134 occurrences du motif `KovaaLab CRM` collé à un caractère d'identifiant ; 223 diagnostics de syntaxe sur 51 fichiers.

Méthode imposée : **renommage ciblé, symbole par symbole**. Pas de remplacement global — c'en est précisément la conséquence. Le jeton sûr existe déjà dans le dépôt (`KovaaLabCRM`, employé par `twenty-shared` et `twenty-server`), mais pour les symboles du § A3 la cible correcte est le nom `Twenty*` d'origine, parce que c'est lui qui est exporté par le paquet fournisseur.

Symboles concernés :

| Symbole cassé | Déclaré dans |
| --- | --- |
| `allowRequestsToKovaaLab CRMIconsState`, champ `allowRequestsToKovaaLab CRMIcons` | `src/modules/client-config/states/allowRequestsToTwentyIcons.ts:3`, `src/modules/client-config/types/ClientConfig.ts:55`, `src/generated-metadata/graphql.ts:1384`, `src/modules/object-record/record-store/states/selectors/recordStoreIdentifierFamilySelector.ts:10` |
| `isKovaaLab CRMStandardApplication` | `src/modules/applications/utils/isTwentyStandardApplication.ts:8` |
| `getKovaaLab CRMWebsiteUrl`, type `KovaaLab CRMWebsitePage` | `src/modules/auth/utils/getTwentyWebsiteUrl.ts:9` et `:11` |
| `StyledKovaaLab CRMLogo` | `src/modules/onboarding/components/import-contacts/OnboardingImportPreviewSyncBadge.tsx:52` |
| `chatGptKovaaLab CRMAppUrl` | `src/modules/settings/mcp/constants/McpSetup.ts:2`, consommé en `src/modules/settings/mcp/utils/buildMcpSetupCategories.tsx:51` |
| espace de noms `KovaaLab CRMIcons` | `src/modules/page-layout/widgets/components/__tests__/RecordPageAddWidgetSection.test.tsx:4`, `src/modules/side-panel/pages/page-layout/components/__tests__/SidePanelPageLayoutRecordPageWidgetTypeSelect.test.tsx:17` |
| clé d'objet non quotée `kovaa-lab:` | `src/modules/settings/mcp/utils/__tests__/mcpSetup.test.ts:45` |

Attention particulière à `src/generated-metadata/graphql.ts:1384` : fichier **généré**. Le nom de champ y vient du schéma GraphQL. Le corriger à la main serait écrasé à la prochaine génération. **Le champ `allowRequestsToTwentyIcons` côté schéma appartient à Codex** : à coordonner, pas à patcher côté front.

Critère d'acceptation : les 11 371 fichiers `.ts`/`.tsx` de `twenty-front/src` passent le parsing sans diagnostic ; aucun identifiant du dépôt ne contient d'espace.

Vérification : `scripts/check-crm-p0.cjs` étendu (A4) sort en 0, puis `vite build` et `tsgo -p tsconfig.json --noEmit` sur `packages/twenty-front`.

### A2 — Rétablir les 27 chemins de modules (§ 4.2)

Cinq spécificateurs à ramener vers les fichiers réels, qui ont gardé leur basename `Twenty*` :

| Spécificateur à corriger | Occurrences | Cible réelle |
| --- | --- | --- |
| `@/client-config/states/allowRequestsToKovaaLab CRMIcons` | 13 | `allowRequestsToTwentyIcons` |
| `@/applications/utils/isKovaaLab CRMStandardApplication` | 8 | `isTwentyStandardApplication` |
| `@/auth/utils/getKovaaLab CRMWebsiteUrl` | 2 | `getTwentyWebsiteUrl` |
| `@/settings/developers/constants/KovaaLab CRMCliCreateAppCommands` | 2 | `TwentyCliCreateAppCommands` |
| `@/settings/developers/constants/KovaaLab CRMCliLoginCommand` | 2 | `TwentyCliLoginCommand` |

Renommer les fichiers plutôt que les imports est également acceptable, à condition de traiter aussi les tests associés (`__tests__/getTwentyWebsiteUrl.test.ts`) — mais c'est un choix de nommage, à décider avec Codex et sans valeur pour l'utilisateur. Le chemin minimal est de corriger les 27 imports.

Critère d'acceptation : 0 import interne non résolu dans `twenty-front`, hors spécificateurs d'assets Vite.

### A3 — Aligner les imports d'icônes sur ce que `twenty-ui` exporte (§ 4.3)

`twenty-ui` exporte `IconTwentyStar` et `IconTwentyStarFilled` (`src/icon/index.ts:32-33`) ; `twenty-front` importe `IconKovaaLab CRMStar` (`SettingsObjectFieldDataType.tsx:8`) et `IconKovaaLab CRMStarFilled` (`RatingInput.tsx:8`).

**Retirer l'espace ne suffit pas** : `IconKovaaLabCRMStar` n'existe pas non plus. Deux options, à trancher avec Codex :

1. ramener les deux imports du front à `IconTwentyStar` / `IconTwentyStarFilled` — minimal, sans effet de bord ;
2. renommer les icônes dans `twenty-ui` et aligner tous les consommateurs — cohérent avec le reste du rebranding, mais touche la bibliothèque UI et ses actifs `twenty-star.svg` / `twenty-star-filled.svg`.

Recommandation : l'option 1 pour le lot P0, l'option 2 plus tard si une mission de rebranding est décidée.

Critère d'acceptation : tout symbole importé par `twenty-front` depuis `kovaa-lab-ui` et `kovaa-lab-shared` existe dans le paquet exportateur.

### A4 — Étendre le contrôle P0 au frontend (§ 4.4) — propriété Codex

Sans cet élément, A1 à A3 peuvent récidiver silencieusement : aucun job de `.github/workflows/p0-integrity.yml` ne parse ni ne construit `twenty-front`, et `scripts/check-crm-p0.cjs:14` se limite à `['twenty-server', 'twenty-shared']`.

Proposition en deux parties, indissociables :

1. ajouter `'twenty-front'` à `scripts/check-crm-p0.cjs:14` ;
2. **filtrer les spécificateurs d'assets** avant le contrôle de résolution — extensions `.svg`, `.png`, `.webp`, `.jpg`, `.jpeg`, `.css`, `.gif`, `.avif` et suffixes de requête Vite `?react`, `?worker`, `?source`.

Mesure à l'appui : sur une copie hors dépôt avec `packages = ['twenty-front']`, le script remonte 295 échecs, dont **45 faux positifs** d'imports d'assets. Sans le point 2, le job serait bruyant dès sa première exécution et serait désactivé.

Critère d'acceptation : le job échoue sur une erreur de syntaxe ou un import interne non résolu introduit dans `twenty-front`, et ne produit aucun faux positif sur les assets Vite.

Vérification : introduire volontairement une erreur de syntaxe dans une branche jetable, constater l'échec ; constater le succès sur la branche réparée.

## Lot B — P2 et P3 : qualité d'interface

Indépendants du lot A, mais **non testables avant lui** : aucune vérification visuelle n'est possible tant que l'application ne démarre pas.

### B1 — P2 · Supprimer l'impasse vers `SettingsPath.Integrations` (§ 4.5)

`RecordListEmptyState.tsx:60` navigue vers un chemin non routé, dont l'entrée de navigation est commentée par un `TODO` (`useSettingsNavigationItems.tsx:164-170`).

Options : masquer le bouton tant que la page n'existe pas ; ou le rediriger vers `SettingsPath.Applications`, qui est routé et listé. La seconde est préférable si l'intention était bien d'orienter l'utilisateur d'une table distante vers la configuration de ses applications — intention à confirmer, je ne la devine pas.

**Lien direct avec P1** : si « Outils clients » prend place sous `Integrations`, cet élément se résout de lui-même. À séquencer après la décision P1 plutôt qu'avant.

Critère d'acceptation : le bouton mène à une page rendue, ou disparaît.

Vérification : avec un objet distant et une liste vide, cliquer « Go to Settings » et constater l'arrivée sur une page rendue.

### B2 — P2 · Résoudre les liens vers `kovaa-lab.com` (§ 4.6)

`kovaa-lab.com` renvoie `NXDOMAIN`. Le plus sensible : **les CGU et la politique de confidentialité de l'écran de connexion** (`getTwentyWebsiteUrl.ts:7`, consommé par `FooterNote.tsx:72, 80, 102, 110`). Puis `docs.kovaa-lab.com` (`twenty-shared/src/constants/DocumentationBaseUrl.ts:1`, 9 fichiers de production), `SettingsCommunity.tsx:116` et `:135`, et l'aperçu social (`index.html:19`, `:26`, dépôt GitHub en 404).

**Ce n'est pas un correctif frontend seul** : il faut soit enregistrer un domaine, soit choisir des cibles réelles, soit masquer les entrées concernées. Dépend de la décision de marque (§ 6 du rapport).

Critère d'acceptation : tout lien externe affiché résout, ou l'entrée qui le porte est masquée.

### B3 — P2 · Arbitrer la police de caractères (§ 4.7)

`Inter` est la police active — déclarée en 5 endroits et réellement livrée par `@fontsource/inter` — et `DESIGN.md` la bannit explicitement, tout en demandant par ailleurs de ne pas redessiner silencieusement un produit existant doté de son propre système de design.

**Décision utilisateur requise avant toute action.** `DESIGN.md` impose de fournir une référence visuelle avant d'ouvrir une nouvelle direction. Je n'en propose aucune.

Si l'alignement est retenu, le changement est concentré : le jeton `--t-font-family` dans `theme-light.css:184` et `theme-dark.css:180`, les constantes `ThemeLight.ts:199` et `ThemeDark.ts:200`, et `index.css:5` ; plus l'ajout d'une police auto-hébergée (aucun fichier Geist ou Satoshi n'existe dans `apps/crm/ui`) avec une pile de repli lisible.

Vérification : rendu des titres et du corps de texte sur une preview, en clair et en sombre, et comportement de la pile de repli quand la police échoue à charger.

### B4 — P2 · Compléter la prise en charge du mouvement réduit (§ 4.8)

34 fichiers de production animés, 15 avec garde `prefers-reduced-motion`, donc 19 sans ; aucun reset global.

Piste la plus économe : un reset global dans `src/index.css`, à valider visuellement — un reset trop large peut supprimer une transition qui porte l'information d'un changement d'état.

Critère d'acceptation : sous `prefers-reduced-motion: reduce`, aucune animation décorative ne joue ; les transitions fonctionnelles sont réduites, pas supprimées au point de masquer un changement d'état.

Vérification : émuler la préférence sur une preview et parcourir le tiroir de navigation, le menu de commandes, les tableaux et le panneau latéral.

### B5 — P3 · Attribut `rel` sur `ContactLink` (§ 4.9)

`ContactLink.tsx:44` pose `target="_blank"` sans `rel` : c'est la seule exception sur 16 occurrences de production, les 15 autres suivant la convention. Composant utilisé par les champs e-mail et téléphone des fiches.

Sévérité faible et assumée comme telle : les navigateurs actuels impliquent `noopener`, et `getSafeUrl(href)` assainit déjà l'URL. L'intérêt est la cohérence.

Préférer une règle de lint sur les ancrages `target="_blank"` à une correction ponctuelle.

### B6 — P3 · Réparer les catalogues de traduction (§ 4.10)

10 occurrences de `KovaaLab CRM` suivi d'un suffixe grammatical, dans `fi-FI.po` (6), `hu-HU.po` (2), `no-NO.po` (1), `da-DK.po` (1).

**Contrainte** : `apps/crm/ui/AGENTS.md` interdit de commiter les catalogues hors d'une tâche de traduction, `lingui extract` les régénérant avec des milliers de lignes de bruit. À traiter dans une tâche i18n dédiée, après la décision de marque, pas dans le lot A.

## Lot C — P1 « Outils clients » : préparation seulement

**Non implémentable aujourd'hui.** Trois conditions, aucune remplie :

1. `twenty-front` compile (lot A) ;
2. les sources `integrated-tools` et Cal.diy sont publiées — elles sont absentes de cette branche (§ 8 du rapport) ;
3. le contrat backend est convenu avec Codex.

**Aucune API, aucun état de santé et aucun état « connecté » n'a été créé dans cette mission.** Ce lot décrit une cible, pas du code.

### C1 — Emplacement dans l'interface

`SettingsPath.Integrations` est l'emplacement naturel : déjà déclaré (`SettingsPath.ts:81`), déjà réservé par un `TODO: Re-enable when integrations page is ready` (`useSettingsNavigationItems.tsx:164-170`), et déjà cible d'un bouton existant (§ B1).

La structure voisine est réutilisable telle quelle : `SettingsPath.Applications` et `SettingsPath.AvailableApplicationDetail` fournissent déjà le couple liste / détail et la notion d'application **disponible**.

Le tiroir de navigation n'a pas de liste en dur (`MainNavigationDrawerNavigationContent.tsx` s'alimente de `useNavigationMenuItemsByFolder()`). Une entrée de navigation principale, si elle est souhaitée, passera par le mécanisme d'éléments de menu d'espace de travail, pas par l'édition d'un tableau statique.

### C2 — Droits

À appuyer sur l'existant, sans nouveau mécanisme : `PermissionFlagType` (24 valeurs, dont `APPLICATIONS`, `MARKETPLACE_APPS`, `API_KEYS_AND_WEBHOOKS`), `useHasPermissionFlag`, `SettingsProtectedRouteWrapper`, `SettingsRoleRouteGuard`.

Règle : **le serveur impose les droits**. Le frontend ne fait que refléter ce que le serveur autorise. Une absence de droit se traduit par un message explicite, pas par un bouton inerte ni un écran vide.

### C3 — Configuration de disponibilité, distincte de la configuration de l'outil

Deux notions à ne jamais confondre dans l'interface :

- **configuré** : une URL et des paramètres existent pour cet espace de travail ;
- **disponible** : le serveur a effectivement constaté que l'outil répond, à une date donnée.

**Une URL configurée ne prouve ni la disponibilité ni l'autorisation.** La démonstration est dans le dépôt : `kovaa-lab.com` est configuré dans toute l'application et n'existe pas (§ 4.6).

Trois états, à afficher distinctement, reprenant la proposition de `docs/stabilization/p0-status.md` :

| État | Affichage attendu |
| --- | --- |
| `unknown` | « Disponibilité non vérifiée », avec la date du dernier contrôle si elle existe. **Jamais** présenté comme disponible. |
| `available` | Ouverture possible, avec la date du contrôle. |
| `unavailable` | Ouverture bloquée ou avertie, avec le message d'erreur affichable fourni par le serveur. |

Interdits explicites côté frontend : aucun contrôle de santé depuis le navigateur, aucun état « connecté » déduit, aucun défaut à `available` en l'absence d'information.

### C4 — Ouverture dans un nouvel onglet

Les trois outils ont des authentifications indépendantes, sans SSO ni synchronisation (`docs/stabilization/p0-status.md`). L'ouverture dans un nouvel onglet est donc le comportement correct : elle préserve la session CRM.

Convention du dépôt à appliquer : `target="_blank" rel="noopener noreferrer"`, telle qu'on la trouve dans 15 des 16 emplacements de production, par exemple `FooterNote.tsx:73-74`, `AttachmentRow.tsx:225-226`, `LinkifiedText.tsx:32-33`, `SettingsCard.tsx:115`.

L'utilisateur doit être prévenu qu'une connexion séparée lui sera demandée, **avant** le clic, pas après.

### C5 — Messages explicites

Tous les textes passent par Lingui (`Trans`, `useLingui`), avec `doNotTranslate()` réservé aux jetons techniques. États à couvrir, en reprenant les composants existants : chargement (`src/loading/`), erreur (les 4 niveaux de frontières d'erreur), vide (`RecordIndexEmptyStateDisplay` et ses 5 branches), désactivé, succès (`ToastProvider`).

Chaque message doit dire **ce qui s'est passé et quoi faire ensuite** : « Outil non configuré pour cet espace de travail » ; « Disponibilité non vérifiée depuis le JJ/MM » ; « Vous n'avez pas le droit d'ouvrir cet outil ». Pas de formulation générique du type « Une erreur est survenue ».

### C6 — Aucun secret côté navigateur

Le frontend ne reçoit, ne stocke et n'affiche **aucun** secret : ni jeton d'API, ni mot de passe, ni clé de chiffrement des modules. Les clés listées dans `scripts/customer-tools.mjs:18-27` (`CHAR_SECRET_KEY_BASE`, `FORMS_ENCRYPTION_KEY`, `CAL_AUTH_SECRET`…) restent dans `.runtime/customer-tools.env`, côté serveur, en mode `0600`.

Rappel de contexte : `index.html:33-37` expose un bloc `window._env_`. C'est le canal de configuration **publique** du front. Aucun secret ne doit y transiter.

### C7 — Contrat à convenir avec Codex

Point de départ, proposé par `docs/stabilization/p0-status.md` et **non implémenté** : un état d'intégration par espace de travail, portant identifiant d'outil, configuration, disponibilité (`unknown` | `available` | `unavailable`), autorisation, date de contrôle et erreur affichable.

Ce que le frontend attend du serveur :

- la disponibilité est **calculée côté serveur**, horodatée, et transmise explicitement — le navigateur ne la déduit jamais ;
- l'autorisation est **imposée côté serveur**, le frontend ne fait que la refléter ;
- l'erreur affichable est un message destiné à l'utilisateur, déjà traduisible, sans détail d'infrastructure ;
- l'isolation par espace de travail est garantie côté serveur.

**Accord explicite de Codex requis avant toute implémentation.** Les types partagés et le schéma GraphQL sont hors de mon périmètre ; je ne les modifierai pas sans décision commune.

## Séquencement proposé

1. **Lot A** (A1 à A4), un seul lot cohérent. Sans lui, rien d'autre n'est vérifiable. A4 en même temps que A1-A3, pour que le correctif soit protégé dès son arrivée.
2. **Preview isolée**, dépendance de `docs/stabilization/p0-status.md`, étape 6. Elle débloque toute vérification visuelle, donc tout le lot B.
3. **Décisions utilisateur** : marque (§ 6 du rapport), domaine (B2), police (B3). Indépendantes du code, peuvent être prises en parallèle du lot A.
4. **Lot B**, après la preview. B1 à séquencer après la décision C1.
5. **Lot C**, après publication d'une base applicative validée et accord sur le contrat.
