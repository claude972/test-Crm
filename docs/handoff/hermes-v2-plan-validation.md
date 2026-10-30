# Hermès V2 — plan soumis à validation

## Objectif principal

Un utilisateur gère ses sociétés autorisées dans un CRM web/PWA : chaque société possède ses données, son dashboard, ses réglages et ses connexions WhatsApp/e-mail ; une vue commune ne réunit que ses sociétés autorisées. Il travaille dans une prospection complète et trouve tout le paramétrage dans un unique centre Réglages, avec un design choisi sur maquettes avant développement.

**Statut : plan approuvé pour exécution autonome par le propriétaire (« Ok agis en autonomie lance le prompt »). Phase active : maquettes statiques et contrats techniques. Aucun câblage applicatif, migration ou connexion réelle avant validation des maquettes.**

Base de code auditée : `333ba534927e177c90b35eb4157d75d8d767dec4`, branche `feat/codex-hermes-integration`. La preview précédente utilisait79830 ; aucun accès fournisseur ni nouveau test runtime n'est déduit du présent audit en lecture seule.

## Décisions et points à valider

- Une **société exploitante = workspace**. Une fiche Company représente une entreprise cliente/prospecte, jamais une nouvelle société exploitante.
- Référence visuelle confirmée par le propriétaire : **Pipedrive**. Le design actuel est rejeté ; l'ancienne sélection Monday n'est plus une validation. Étudier les références Pipedrive réelles avant de proposer les maquettes ; ne pas copier sa marque ni supposer ses capacités produit.
- Langue confirmée par le propriétaire : **français par défaut**, sur tous les parcours. L'anglais ne doit pas réapparaître par simple détection du navigateur ; préserver seulement un choix de langue explicite lorsque l'option existe.
- Un seul accès Réglages dans la navigation. Les actions métier restent dans leurs modules ; les connexions, politiques et interrupteurs sont exclusivement dans Réglages.
- Un bot coupé ne coupe pas le canal : réception et réponses humaines restent possibles.
- Une reprise humaine immédiate peut rester une action de sécurité dans un fil, sans réactivation automatique depuis le module. Toute configuration de délégation et ses exceptions est centralisée.
- Web et PWA uniquement. Stack React/Vite/Linaria/Lingui/Jotai et NestJS/TypeORM/PostgreSQL/Redis/GraphQL conservée.

## État vérifié et écarts

Préfixe frontend : `apps/crm/ui/packages/twenty-front/`. Préfixe backend : `apps/crm/ui/packages/twenty-server/`. Les références décrivent les API réellement présentes ; les contrats futurs seront explicitement désignés comme nouveaux.

Index des sources principales à la base auditée :

- `apps/crm/ui/packages/twenty-front/src/modules/auth/sign-in-up/hooks/useSignUpInNewWorkspace.ts:33`
- `apps/crm/ui/packages/twenty-front/src/pages/settings/structures/SettingsStructuresDashboard.tsx:41`
- `apps/crm/ui/packages/twenty-front/src/pages/settings/integrations/SettingsIntegrations.tsx:28`
- `apps/crm/ui/packages/twenty-front/src/modules/messaging-inbox/components/MessagingInboxThread.tsx:233`
- `apps/crm/ui/packages/twenty-front/src/modules/messaging-inbox/components/MessagingInboxBotModeControl.tsx:80`
- `apps/crm/ui/packages/twenty-front/src/pages/prospection/ProspectionImportBatchesPage.tsx:168`
- `apps/crm/ui/packages/twenty-front/src/modules/prospection/components/HermesManualDepositSection.tsx:53`
- `apps/crm/ui/packages/twenty-front/src/utils/i18n/initialI18nActivate.ts:11`
- `apps/crm/ui/packages/twenty-front/src/utils/i18n/dynamicActivate.ts:8`
- `apps/crm/ui/packages/twenty-server/src/engine/core-modules/workspace/structure-dashboard/structure-dashboard.resolver.ts:48`
- `apps/crm/ui/packages/twenty-server/src/engine/core-modules/workspace/structure-dashboard/structure-dashboard.service.ts:54`
- `apps/crm/ui/packages/twenty-server/src/engine/core-modules/twenty-config/config-variables.ts:2459`
- `apps/crm/ui/packages/twenty-server/src/engine/core-modules/hermes-mail/hermes-mail.policy.ts:7`
- `apps/crm/ui/packages/twenty-server/src/engine/core-modules/hermes-messaging/hermes-messaging.service.ts:368`
- `apps/crm/ui/packages/twenty-server/src/engine/core-modules/hermes-prospection/hermes-prospection.resolver.ts:47`
- `apps/crm/ui/packages/twenty-server/src/engine/core-modules/hermes-prospection/hermes-prospection.service.ts:47`
- `apps/crm/ui/packages/twenty-server/src/engine/core-modules/hermes-prospection/utils/hermes-import-policy.ts:9`
- `apps/crm/ui/packages/twenty-server/src/modules/emailing/resolvers/emailing-send.resolver.ts:83`

| Sujet | Existant vérifié | Écart à traiter |
|---|---|---|
| Isolation et dashboard | `hermesAuthorizedStructures`, `hermesStructureDashboard(input?)` ; adhésions et permissions relues côté serveur | Le tableau actuel est en lecture seule ; son filtre ne change pas la société des écritures CRM |
| Création de société | `useSignUpInNewWorkspace.createWorkspace({displayName?,subdomain?,logo?})` et authentification native | Pas de parcours Hermès complet pour créer, configurer et entrer dans une société ; routage et cookies à vérifier |
| Réglages | Carte Evolution dans Intégrations ; comptes mail dans Comptes/e-mails ; maps privées par workspace | Réglages dispersés ; pas de gestion administrateur complète des connexions par société |
| Bot | `hermesInboxSetBotMode({conversationId,mode:MANUAL|AUTO})` dans chaque conversation | MANUAL laisse les suggestions MCP possibles : ce n'est pas un vrai interrupteur général OFF |
| Prospection | Réception signée, dépôts, qualification, contacts natifs, audiences et brouillons | Pas encore un espace commercial complet ; capacité Hermès `smtpCampaignSending:false` ; état JSONB limité à40lots/100lignes par lot/2Mo |
| Campagnes | API natives d'aperçu, test, envoi et annulation disponibles | Raccorder ces capacités avec leurs gardes, sans créer un deuxième moteur ni prétendre que l'envoi est déjà branché dans Prospection |
| Français | Catalogues et chargement Lingui existants ; fallback initial anglais | Déterminer la cause runtime du mélange de langues ; une traduction présente dans un PO n'est pas une preuve d'affichage |

## Phase 0 — Audit, inventaire des API et critères communs

**Contribution à l'objectif :** fonder la V2 sur les fonctions réelles et éviter de présenter des écrans de statut comme des fonctionnalités connectées.

- Audit source en lecture seule réalisé pour ce cadrage. Après validation, compléter les preuves runtime, les capacités d'hébergement et l'inventaire des réglages existants.
- Références : `workspace/structure-dashboard/structure-dashboard.resolver.ts:48` et `.service.ts:54` ; frontend `modules/auth/sign-in-up/hooks/useSignUpInNewWorkspace.ts:33` ; `pages/settings/structures/SettingsStructuresDashboard.tsx:41`.
- Réglages/connecteurs : frontend `pages/settings/integrations/SettingsIntegrations.tsx:28`, backend `core-modules/twenty-config/config-variables.ts:2459` et `core-modules/hermes-mail/hermes-mail.policy.ts:7`.
- Livrable : matrice « existant / manquant / non configuré / non testé », inventaire de chaque réglage et destination centrale, matrice des droits et dépendances externes.
- Vérification : nommer la révision auditée et les sources ; distinguer filtre de lecture, société active et compte mail personnel/boîte partagée.
- Interdits : secrets lus ou copiés dans un rapport, API supposée existante, changement d'authentification improvisé.

## Phase 1 — Architecture des écrans et maquettes, avant câblage

**Contribution à l'objectif :** permettre au propriétaire de choisir le produit qu'il verra avant d'investir dans une nouvelle interface.

- Référence reçue : Pipedrive. Préparer les pistes à partir de références visuelles réelles de ce produit, sans redemander ce choix. Les maquettes précises restent à valider.
- Préparer trois pistes comparables, avec visuels consultables sur téléphone : dashboard d'une société/vue commune, espace Prospection et centre Réglages. Montrer aussi le parcours de messagerie et les interrupteurs des bots.
- Après choix d'une piste, détailler les écrans desktop et mobile : ajout/sélection de société, dashboard, prospection, messagerie, réglages société, connexions et bots. Présenter les états vide, chargement, erreur, non configuré, désactivé et connecté vérifié.
- Références : `DESIGN.md`, `modules/hermes-shell/`, `modules/messaging-inbox/`, `modules/client-context/`, `pages/prospection/`. Les composants existants sont un socle technique, pas une obligation de conserver leur apparence rejetée.
- Vérification : captures/images concrètes, libellés dans la langue validée, navigation et lisibilité à390px et sur desktop. Montrer les réglages centralisés et le contexte société en permanence.
- Interdits : câbler les maquettes au backend, modifier l'application ou adopter automatiquement Monday avant validation explicite des maquettes et autorisation de développer.

## Phase 2 — Contrats, droits et répartition avant code

**Contribution à l'objectif :** faire communiquer tous les modules dans une même société, sans permettre à une action de viser la mauvaise société.

- Définir le contexte société, les capacités et DTO publics, les erreurs, les politiques des bots, le stockage des connexions et l'état de prospection. Marquer les nouvelles API comme « à créer ».
- Documenter la portée des oppositions et du dédoublonnage entre sociétés ; conserver les protections durables existantes et ne pas fusionner des contacts ou révéler une opposition d'une autre société sans politique explicite.
- Reprendre les gardes de `hermes-prospection-access.service.ts:20` et de `structure-dashboard`, et les primitives natives d'authentification/chiffrement. Ne pas étendre les droits par défaut pour rendre un écran accessible.
- Définir administrateur société, responsable commercial, opérateur et lecture selon les permissions natives disponibles ; ne pas donner à un utilisateur toutes les sociétés par son seul rôle global.
- Répartir les fichiers : Claude = maquettes, frontend, navigation et localisation ; Codex = données, API, sécurité, connexions, politiques des bots et tests backend. Attribuer explicitement contrats partagés, migrations et CI avant édition.
- Vérification : droits par opération, source de l'identité/workspace, règle de révocation, autorisations de connexion et règles entre onglets documentées ; branches et révision commune confirmées.
- Interdits : éditions concurrentes des mêmes fichiers, schéma GraphQL inventé, « tout est connecté » sans preuve.

## Phase 3 — Sociétés cloisonnées et vrais dashboards

**Contribution à l'objectif :** créer une société exploitable avec sa propre configuration et éviter les écritures croisées.

- Reprendre le parcours natif `createWorkspace`, les adhésions et l'authentification ; ajouter le parcours administrateur « Ajouter une société », ses droits et son initialisation.
- Fournir un sélecteur de société active qui change réellement le contexte de travail. Le dashboard commun reste une vue de lecture ; il ne doit jamais être une cible d'écriture ou d'enregistrement d'une connexion.
- Résoudre le routage/session sur l'hébergement retenu avant de proposer le changement de société : cookies, caches, sous-domaines éventuels, deux onglets et rejet des écritures sous un contexte devenu différent.
- Chaque société a son dashboard, ses contacts/opportunités/messages/imports/campagnes, ses membres, ses connexions et ses politiques. La vue commune agrège uniquement les sociétés autorisées et identifie la société de chaque élément.
- Références : API `hermesAuthorizedStructures`, `hermesStructureDashboard` et service associé ; auth native `useSignUpInNewWorkspace`; tests natifs dashboard A/B/C existants.
- Vérification : création A/B, connexion indépendante, paramètres A sans effet sur B, tentative d'ID C interdite, révocation immédiate, retour direct/refresh, erreurs réseau, caches et onglets croisés.
- Interdits : changement de label seul, JWT forgé, cookies partagés rendant une ancienne page capable d'écrire dans la nouvelle société, élévation de licence/rôle.

## Phase 4 — Centre Réglages unique, connexions et bots par société

**Contribution à l'objectif :** trouver et modifier tout le paramétrage au même endroit, avec un effet réel et limité à la bonne société.

Arborescence cible à valider dans les maquettes :

| Centre Réglages | Portée et contenu |
|---|---|
| Mon compte | Langue, profil et sécurité personnelle |
| Sociétés | Ajouter/choisir une société ; identité, membres et droits |
| Société sélectionnée — Général | Coordonnées, identité visuelle et préférences existantes |
| Société sélectionnée — Connexions | WhatsApp/Evolution ; e-mail IMAP/SMTP ; Hermès MCP ; entrée scraping ; Forms ; Cal.diy |
| Société sélectionnée — Bots | Bot WhatsApp ON/OFF ; bot e-mail ON/OFF ; fonctionnement assisté/automatique et reprise humaine |
| Société sélectionnée — Prospection | Sources, règles de qualification/dédoublonnage, expéditeurs et politiques d'envoi/suivi/opposition |
| Avancé, selon droits | Réglages natifs utiles : modèle de données, applications et automatisations ; conservés dans ce même centre |

- Modules métier : état de connexion en lecture seule, actions métier, lien contextuel vers le centre Réglages. Retirer les formulaires de connexion et interrupteurs de configuration dispersés, y compris l'activation AUTO dans les conversations.
- Connexions : reprendre les adaptateurs existants et les comptes mail natifs chiffrés. Prévoir un stockage serveur chiffré par société et des mutations administrateur dédiées ; les variables actuelles sont env-only et ne deviennent pas modifiables via le setter générique de configuration.
- Préserver une délégation explicite des comptes personnels vers une boîte partagée. Hypothèse V1 : une instance WhatsApp et une boîte mail partagée par société, avec historique des connexions remplacées. Soumettre le multi-compte comme extension explicite, sans le déclarer disponible par anticipation.
- États distincts : non configuré, configuré non vérifié, connecté vérifié, erreur et désactivé. Une sauvegarde de formulaire ne constitue pas une vérification fournisseur.
- OFF du bot WhatsApp ou e-mail bloque tout appel MCP de ce canal, suggestion comme automatique ; conserve la réception et l'envoi humain. Vérifier la politique avant appel, après résultat et avant émission ; invalider les propositions/callbacks non envoyés à la coupure.
- ON n'autorise pas implicitement des envois automatiques : mode explicite et confirmation de la portée. Réactivation sans rejeu des anciens messages ni reprise silencieuse de délégations anciennes. Aucun réglage A ne change le bot B.
- Reprise humaine : action d'arrêt immédiat éventuellement visible dans le fil ; la configuration et la réactivation restent au centre Réglages. Maintenir les garanties d'idempotence et d'envoi incertain.
- Références : `hermes-messaging.service.ts:368`, resolver `hermesInboxSetBotMode`, `hermesInboxDraftReply` ; frontend `MessagingInboxThread.tsx:233` et `MessagingInboxBotModeControl.tsx:80` ; comptes natifs et registre d'adaptateurs existants.
- Vérification : OFF = zéro appel MCP et zéro envoi bot, y compris callback en vol ; réception/réponse humaine toujours fonctionnelles ; clé jamais renvoyée au client ; création/modification/test/révocation strictement scoped ; secret masqué dans UI/logs/Git.
- Interdits : confondre MANUAL et OFF, rendre les secrets publics, connexion fictive, réutiliser une connexion privée d'un autre membre, retry d'un envoi dont l'acceptation est incertaine.

## Phase 5 — Prospection B2B réellement exploitable

**Contribution à l'objectif :** passer d'un dépôt de lots à un espace commercial complet, connecté au CRM et à la messagerie.

Parcours V1 proposé à valider :

1. Réceptions et provenance : entrée Hermès authentifiée, historique, erreurs et reprises ; dépôt manuel secondaire.
2. Qualification : doublons, erreurs, contact/société existants, affectation, finalité/notice, oppositions et validation humaine.
3. Base prospects : recherche, filtres, tags, propriétaire, source, étape, dernier contact et prochaine action ; fiches Person/Company natives communes aux autres modules.
4. Suivi : à qualifier → qualifié → à contacter → contacté → relance prévue → rendez-vous → converti/perdu ; opposition prioritaire. Tâches, notes, messages et rendez-vous liés à la même fiche ; aucune conversion fondée sur une simple ouverture e-mail.
5. Audiences : segments, exclusions, revue des destinataires et passage vers les campagnes natives, sans dupliquer le carnet CRM.
6. Campagnes : rédaction, aperçu, brouillon, test sur destinataire synthétique autorisé, programmation/envoi/annulation selon les capacités réelles. Connexions, expéditeurs et politiques restent dans Réglages ; les options persistantes par campagne y sont accessibles par lien contextuel.
7. Résultats : distinguer accepté SMTP, livraison attestée, échec, réponse et ouverture observée. Suivi désactivé par défaut selon la politique validée ; ne pas assimiler ouverture à lecture. Pas de métrique fournisseur inventée.
8. Oppositions durables : désinscription, réimport sans réabonnement implicite, exclusions revérifiées avant chaque émission ; rebonds/plaintes seulement si des événements vérifiés existent.

- Références Hermès : `hermes-prospection.resolver.ts:47` et service `:47`, `:102`, `:381` ; `hermes-import-policy.ts:9`; `ProspectionImportBatchesPage.tsx:168` et `HermesManualDepositSection.tsx:53`.
- Références moteur natif : `modules/emailing/resolvers/emailing-send.resolver.ts:83,126,142,174,204` : `sendMessageCampaign`, `cancelMessageCampaign`, `sendMessageCampaignTest`, `previewMessageCampaignAudience`, `previewMessageCampaignSend`.
- Capacité : décider une persistance paginée adaptée aux volumes avant de dépasser les limites JSONB actuelles. Si migration requise, utiliser les commandes officielles et préserver IDs, statuts, provenance, oppositions et rejouabilité ; pas d'ajout silencieux de limites côté UI.
- Vérification : import avec doublon/erreur/contact existant/opposition, affectation et changement de statut, relance, conversion sans doublon, audience excluant les oppositions, DRAFT sans émission, test synthétique, suivi OFF, panne/reprise sans double envoi et cloisonnement A/B/C.
- Interdits : deuxième moteur de campagnes, contournement des gardes natives email-group/feature/licence, test sur vrais prospects, envoi automatique de leads importés, promesse de livraison ou de statistiques indisponibles.

## Phase 6 — Frontend approuvé et langue cohérente

**Contribution à l'objectif :** fournir l'interface choisie et compréhensible sur ordinateur et téléphone, avec les mêmes données et les mêmes réglages.

- Implémenter uniquement les maquettes approuvées, en réutilisant les composants/patrons existants et les contrats validés ; pas de nouvelle direction improvisée en cours de câblage.
- Appliquer la langue validée à accueil, connexion, menus, réglages, messages système, erreurs, états vides, dates et nombres. Respecter un choix de langue explicite existant ; vérifier connexion/reload/changement de société et non seulement les catalogues PO.
- Français confirmé : tester un compte neuf avec navigateur anglais, un ancien défaut anglais et un choix anglais réellement explicite. Définir une seule source de préférence et une règle de migration des anciennes valeurs automatiques ; ne pas modifier seulement le fallback en laissant la détection navigateur réimposer EN.
- Références : `src/utils/i18n/initialI18nActivate.ts:11`, `dynamicActivate.ts:8`, `lingui.config.ts`, catalogues et usages `useLingui`/`Trans` existants. La traduction est explicitement dans cette mission ; extraction et compilation nécessaires, sans modifications de catalogues hors périmètre.
- Supprimer les anciennes entrées de réglages en doublon et les textes techniques inutiles dans les parcours métier ; conserver des diagnostics utiles accessibles aux administrateurs.
- Vérification : conformité aux images validées ; 390px/desktop, headers multi-sociétés lisibles, clavier/focus/labels, contraste, états chargement/erreur/vide/succès ; aucun formulaire secret dans un module.
- Interdits : anglais involontaire si FR choisi, traduire les noms des clients ou les identifiants de protocole, maquettes faussement présentées comme fonctionnalités raccordées.

## Phase 7 — Recette intégrée et lien de test

**Contribution à l'objectif :** remettre un lien utilisable, dont les fonctionnalités et limites correspondent à ce qui a réellement été testé.

- Revues croisées par SHA entre Claude et Codex ; contrôles adaptés, migrations officielles, API/ORM sur DB jetable et parcours navigateur réels.
- Matrice minimale : deux sociétés et un utilisateur non autorisé ; deux onglets et révocation ; réglages indépendants ; bots ON/OFF par canal et arrêt en vol ; prospection complète et opposition durable ; langue validée ; conformité aux maquettes desktop/mobile.
- Connexions externes : utiliser des accès et destinataires de recette vérifiés ; sinon afficher non configuré et indiquer précisément quels parcours ne sont pas testés.
- Preview web/PWA Vercel, frontend/backend de source approuvée vérifiable, compte synthétique, protection maintenue, accès sans connexion Vercel préalable, expiration annoncée. Une interface statique disponible ne prouve pas que l'API fonctionne.
- Vérifier manifeste et installation PWA sur téléphone ; annoncer séparément le comportement hors ligne réellement fourni/testé. Aucun mode hors ligne supposé à partir du seul manifeste.
- Livrable : lien testé, compte privé, images du rendu réel, rapport réalisé/non configuré/non testé et résultat CI honnête. Ne pas republier de partage privé/credentials dans Git.

## Organisation, validations et hors périmètre

- **Maintenant :** mission maquettes et contrats lancée ; références Pipedrive et français confirmées. Aucune fonctionnalité applicative V2 câblée avant choix des maquettes.
- **Validation 1 acquise :** lancement du plan autorisé ; langue française et référence Pipedrive confirmées. Ne pas les redemander.
- **Validation 2 :** choix puis validation des maquettes détaillées et autorisation explicite d'implémenter.
- **Après seulement :** affectations revendiquées Claude/Codex, worktrees isolés et contrats partagés publiés avant édition. Commits/push réguliers et revue croisée ; préserver le checkout original et ses sauvegardes.
- Aucun délai de réalisation ferme avant ces choix et la vérification des accès. Aucun nouveau service payant, aucune production, aucun envoi à de vrais prospects, aucune application native.
- Séquences automatiques avancées, prospection WhatsApp en masse, marketplace et enrichissement payant ne sont pas inclus automatiquement dans cette V1 ; les soumettre comme extensions distinctes.
