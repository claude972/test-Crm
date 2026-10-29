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

### B0 — P2 · Aligner le nom visible sur « KovaaLab CRM » — **décision prise**

> **Décidé par l'utilisateur le 29 octobre 2026 : le nom visible par l'utilisateur est « KovaaLab CRM ».**

L'interface du CRM est **déjà conforme** : `apps/crm/ui/packages/twenty-front/index.html:22, 30, 31` (`og:title`, `twitter:title`, `<title>`). Rien à changer côté frontend.

Deux écarts seulement, tous deux **hors de mon périmètre de propriété** :

| Fichier:ligne | État actuel | Cible | Propriétaire |
| --- | --- | --- | --- |
| `Makefile:7` | `Hermès CRM : setup, install, …` | `KovaaLab CRM : setup, install, …` | Codex |
| `infra/modules.compose.yml:24` | `MAILER_SENDER_EMAIL: Hermès CRM <notifications@hermes.example.test>` | `KovaaLab CRM <…>` | Codex |

Le second est le plus important : c'est le **nom d'expéditeur des e-mails sortants de Char**, donc le seul des deux réellement vu par un utilisateur final. Aujourd'hui, le CRM se présente comme « KovaaLab CRM » et ses e-mails arrivent signés « Hermès CRM ».

**Ce qui ne change pas**, conformément à la règle 2 de la politique de marque : toute l'infrastructure garde `hermes` — `docker-compose.yml:2`, `infra/crm.compose.yml:7-13` (bases `hermes_crm`, `hermes_crm_dev`), bases `hermes_char`, contexte Docker `colima-hermes-crm`, préfixe CI `hermes-p0`. Rien n'y est visible par l'utilisateur, et renommer une base casse des volumes existants.

**Ce qui ne change pas non plus** : aucun identifiant technique. Les répertoires `twenty-*` et les basenames `Twenty*` restent tels quels. La décision de marque porte sur le texte montré à l'utilisateur, pas sur le code — c'est exactement la confusion qui a produit les constats 4.1 à 4.3.

Critère d'acceptation : aucun texte visible par l'utilisateur, e-mails des trois modules inclus, n'emploie « Hermès CRM ».

Vérification : après correction, `git grep -in "Herm[eè]s CRM"` ne renvoie que des fichiers d'infrastructure ou de documentation historique, aucun texte d'interface ni en-tête d'e-mail.

### B1 — P2 · Supprimer l'impasse vers `SettingsPath.Integrations` (§ 4.5)

`RecordListEmptyState.tsx:60` navigue vers un chemin non routé, dont l'entrée de navigation est commentée par un `TODO` (`useSettingsNavigationItems.tsx:164-170`).

> **Décidé le 29 octobre 2026 : masquer le bouton. Ne pas le rediriger vers « Apps ».**

**Je révise ici ma propre suggestion initiale**, qui proposait de rediriger vers `SettingsPath.Applications`. Vérification faite, cette cible serait sémantiquement fausse.

Le bouton n'apparaît que sur l'état vide d'une **table distante** (`RecordIndexEmptyState.tsx:80-92`, branche `objectMetadataItem.isRemote`), avec le sous-titre « If this is unexpected, please verify your settings. » Il visait donc la configuration des **sources de données distantes**, ce qu'était la page Intégrations de l'amont.

Or **cette page n'existe pas dans ce frontend** : `git ls-files` filtré sur `remote`, `foreign`, `datasource` ne renvoie aucune page de réglages, et `isRemote` n'est qu'un drapeau de métadonnées consommé par la logique de lecture seule, d'agrégation et de ciblage de relations. `SettingsPath.Applications` concerne les applications installées, pas les sources distantes : y envoyer l'utilisateur remplacerait une impasse par une fausse piste, ce qui est pire — l'utilisateur chercherait une configuration absente sur une page sans rapport.

Décision retenue : **ne plus rendre le bouton**, en conservant le titre et le sous-titre explicatifs. L'utilisateur garde l'information utile — la table est distante et sa configuration est à vérifier — sans destination trompeuse. Concrètement : ne pas passer `onGoToSettings` depuis `RecordListEmptyState.tsx:60`. Aucun autre changement n'est nécessaire, et c'est vérifié — la prop est déjà optionnelle (`RecordIndexEmptyState.tsx:22`) et le bouton est rendu sous condition : `RecordIndexEmptyStateDisplay.tsx:41` → `{isDefined(onButtonClick) && (<Button …>)}`. Une prop omise suffit donc à retirer le bouton, sans toucher au composant d'affichage.

**Lien avec P1** : si « Outils clients » prend place sous `Integrations` et que cette page accueille aussi la configuration des sources distantes, le bouton pourra être rétabli vers une cible réelle. À rouvrir à ce moment-là, pas avant.

Critère d'acceptation : l'état vide d'une table distante n'affiche aucun bouton menant à un chemin non routé.

Vérification : avec un objet distant et une liste vide, constater que le texte explicatif s'affiche et qu'aucun bouton ne propose de navigation.

### B2 — P2 · Résoudre les liens vers `kovaa-lab.com` (§ 4.6)

`kovaa-lab.com` renvoie `NXDOMAIN`. Le plus sensible : **les CGU et la politique de confidentialité de l'écran de connexion** (`getTwentyWebsiteUrl.ts:7`, consommé par `FooterNote.tsx:72, 80, 102, 110`). Puis `docs.kovaa-lab.com` (`twenty-shared/src/constants/DocumentationBaseUrl.ts:1`, 9 fichiers de production), `SettingsCommunity.tsx:116` et `:135`, et l'aperçu social (`index.html:19`, `:26`, dépôt GitHub en 404).

**Ce n'est pas un correctif frontend seul** : il faut soit enregistrer un domaine, soit choisir des cibles réelles, soit masquer les entrées concernées.

**La décision de marque est prise (B0) et elle débloque l'option la plus simple.** Contrôle `whois` du 29 octobre 2026 : `kovaa-lab.com` et `kovaalab.com` sont **tous deux non enregistrés, donc disponibles**. Or `kovaa-lab.com` est exactement ce que le code attend déjà, dans chacune des références ci-dessus.

> **Décidé le 29 octobre 2026, l'utilisateur ayant demandé d'appliquer la recommandation : option 1 — `kovaa-lab.com` est le domaine retenu.**
>
> **L'exécution n'est pas faite et ne peut pas l'être par moi : enregistrer un domaine est un achat.** Je ne procède à aucun paiement ni à aucune souscription de service. La décision est arrêtée, l'acte d'achat reste à l'utilisateur.

Trois options avaient été évaluées, par ordre de coût croissant côté code :

1. **Enregistrer `kovaa-lab.com`** puis y publier au minimum `/terms`, `/privacy-policy` et un sous-domaine `docs`. **Zéro ligne de code modifiée. ← retenu.** C'est le seul chemin qui résout aussi l'aperçu social et les 9 fichiers consommateurs de liens de documentation sans toucher au frontend, et il est cohérent avec la marque décidée en B0. Le domaine était libre au `whois` du 29 octobre 2026.
2. Repointer les constantes vers un domaine déjà détenu — `getTwentyWebsiteUrl.ts:7` et `twenty-shared/src/constants/DocumentationBaseUrl.ts:1`. Écarté : suppose un domaine dont la détention n'est pas établie, et modifie du code frontend pour un gain nul par rapport à l'option 1.
3. Masquer les entrées dont la cible n'existe pas. Écarté : un produit ne peut pas se contenter de masquer ses mentions légales.

**Ce qu'il reste à faire, et par qui :**

| Action | Propriétaire | Code à modifier |
| --- | --- | --- |
| Enregistrer `kovaa-lab.com` | **utilisateur** (achat) | aucun |
| Publier `/terms` et `/privacy-policy` | utilisateur ou Codex | aucun |
| Faire résoudre `docs.kovaa-lab.com` | utilisateur ou Codex | aucun |
| Donner une cible réelle à l'aperçu social | Codex | `index.html:19`, `:26` |

Seul le dernier point touche du code. L'aperçu social pointe vers le dépôt GitHub `kovaa-lab/kovaa-lab`, en 404 : il demande une cible propre, soit un chemin sur le domaine une fois enregistré, soit une image servie depuis le dépôt réel.

**Tant que le domaine n'est pas enregistré, le constat 4.6 reste ouvert** et les mentions légales de l'écran de connexion n'aboutissent pas. La décision ne le referme pas ; seul l'enregistrement le fera.

Critère d'acceptation : tout lien externe affiché résout, ou l'entrée qui le porte est masquée — à l'exception des mentions légales, qui doivent résoudre.

### B3 — ~~P2 · Arbitrer la police de caractères~~ → **clos sans action** (§ 4.7)

> **Décidé le 29 octobre 2026 : `Inter` est conservé dans le CRM importé, comme exception documentée. Aucun changement de police. Élément clos, pas reporté.**

La contradiction apparente de `DESIGN.md` se résout sur la formulation exacte : la ligne 9 interdit d'**introduire** `Inter` — or `Inter` arrive avec le produit importé, via `@fontsource/inter` — tandis que la ligne 32 impose de suivre le système de design d'un sous-projet quand il en a un, et de ne pas redessiner silencieusement un produit existant. La ligne 28 exige par ailleurs une référence visuelle avant toute nouvelle direction ; aucune n'a été fournie.

Deux arguments de prudence s'y ajoutent : la mission impose de conserver le design existant, et **aucune vérification visuelle n'est possible sur ce SHA** — changer la police sans pouvoir observer le rendu une seule fois serait un changement à l'aveugle.

**Portée de la règle, désormais explicite** : le ban sur `Inter`, `Poppins`, `Roboto` et `system-ui` s'applique pleinement à **toute interface nouvellement écrite** pour ce projet, « Outils clients » compris. Ces écrans consommeront de toute façon les jetons existants du CRM.

Même décision pour l'écart de couleurs de fond (`#0A0A0A` / `#FAFAFA` annoncés par `DESIGN.md` contre les valeurs du thème) : le système du sous-projet prévaut, aucun changement.

**Ce qui rouvrirait l'élément** : une référence visuelle fournie par l'utilisateur et une décision assumée de redessiner le produit importé. Le changement resterait alors concentré — jeton `--t-font-family` dans `theme-light.css:184` et `theme-dark.css:180`, constantes `ThemeLight.ts:199` et `ThemeDark.ts:200`, `index.css:5` — plus une police auto-hébergée avec pile de repli, le choix entre Geist et Satoshi, et la vérification de licence. Aucun fichier Geist ou Satoshi n'existe aujourd'hui dans `apps/crm/ui`.

**Action restante, propriétaire de `DESIGN.md`** : y consigner cette exception, pour qu'un futur agent ne la redécouvre pas comme une violation. `DESIGN.md` est hors de mon périmètre de propriété pour cette mission.

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
3. **Décisions — toutes prises le 29 octobre 2026.** Marque : « KovaaLab CRM » (B0). Domaine : `kovaa-lab.com` (B2). Police : `Inter` conservé, élément clos (B3). Bouton de l'état vide distant : masqué (B1). Aucune ne reste en attente d'arbitrage.
4. **Lot B**, après la preview — sauf **B0**, qui ne dépend ni du lot A ni d'une preview : ce sont deux lignes de texte dans `Makefile` et `infra/modules.compose.yml`, et le nom d'expéditeur des e-mails de Char est aujourd'hui incohérent avec le produit. À faire dès que Codex passe sur ces fichiers. **B3 est clos sans action.**
5. **Lot C**, après publication d'une base applicative validée et accord sur le contrat.

### Ce qui reste suspendu à un acte hors code

| Élément | Bloqué par | Qui |
| --- | --- | --- |
| B2 — mentions légales qui aboutissent | l'enregistrement de `kovaa-lab.com` (achat) | **utilisateur** |
| B3 — exception `Inter` consignée dans `DESIGN.md` | une écriture dans un fichier hors de mon périmètre | propriétaire de `DESIGN.md` |
| B0 — nom d'expéditeur des e-mails de Char | une écriture dans `infra/`, hors de mon périmètre | Codex |
| Lot A — réparation de `twenty-front` | une écriture dans `twenty-front`, interdite par cette mission | mission d'implémentation autorisée |
| Revue croisée | l'examen de `b95ce034` par Codex | Codex |

Les décisions sont prises et documentées ; aucune de ces cinq exécutions ne m'appartient dans le cadre de cette mission.
