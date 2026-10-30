# Hermès V2 — contrat proposé Réglages, connexions et bots

Statut : **contrat technique proposé, aucune implémentation V2**. Sources relues au commit `333ba534927e177c90b35eb4157d75d8d767dec4` de `feat/codex-hermes-integration`, checkout `p1-hermes-integration` en lecture seule. Rédaction : 30 octobre 2026. Propriétaire backend/contrat : Codex ; maquettes, navigation et frontend : Claude. Le français et la référence Pipedrive sont acquis. Aucun câblage, migration, changement de garde ou connexion fournisseur avant choix et validation des maquettes détaillées et autorisation explicite d'implémenter.

## 1. Périmètre et conventions de preuve

Société exploitante signifie **workspace**, distinct d'une fiche Company cliente. Un filtre de dashboard ou la vue commune n'autorise aucune écriture de réglages. Toute mutation vise un workspace authentifié actif et vérifie à nouveau l'adhésion et les droits ; aucune cible déduite d'un label frontend.

Préfixes des références ci-dessous, relatifs à la racine du dépôt au SHA ci-dessus :

- `S/` = `apps/crm/ui/packages/twenty-server/src/` ; `C/` = `S/engine/core-modules/`.
- `F/` = `apps/crm/ui/packages/twenty-front/src/`.

Lectures : mission V2 et documents `docs/handoff/hermes-v2-plan-validation.md`, `hermes-v2-prompt.xml` du checkout `p0-missions` ; règles racine et règles du checkout source, dont `apps/crm/ui/AGENTS.md`. `p0-missions/AGENTS.md` et `p0-missions/DESIGN.md` sont absents du filesystem : les documents racine et ceux du checkout source ont servi de référence. La consigne produit spécifique Pipedrive prime sur les anciennes références visuelles génériques. Aucun `.env`, `.runtime`, base ou secret fournisseur consulté.

« Codé » ci-dessous signifie présent dans les sources, sans attester son fonctionnement déployé. Aucun appel fournisseur, test DB, navigateur, build ou test automatisé n'a été exécuté pour ce contrat. L'existence de tests est distinguée de leur résultat. L'état runtime des connexions reste **non vérifié** ; les valeurs par défaut `{}` sont seulement une preuve du comportement non configuré attendu, pas une inspection de l'environnement déployé.

## 2. État actuel / preuve / écart

| Sujet | État actuel et preuve source | Écart V2 |
|---|---|---|
| Statut Evolution | Codé : query `hermesEvolutionConnection`, `C/hermes-connectors/hermes-connectors.resolver.ts:33`; probe autorisé dans `.service.ts:29`, contrôle administrateur vivant `:52` | Aucune mutation de création/modification/révocation dans ce resolver ; pas de formulaire administrateur connecté déduit de la carte de statut |
| Configuration privée | `C/twenty-config/config-variables.ts:2459–2508` : `HERMES_EVOLUTION_CONNECTIONS`, `HERMES_EVOLUTION_WEBHOOK_SECRETS`, `HERMES_INTAKE_CONNECTIONS`, `HERMES_MAIL_CONNECTIONS`, `HERMES_MCP_CONNECTIONS` sensibles, env-only, défaut `{}` | Stockage administrable chiffré par workspace et mutations dédiées à créer. Ne pas déverrouiller le setter générique : `C/twenty-config/twenty-config.service.ts:208` rejette env-only |
| Registre adaptateurs | `C/hermes-connectors/hermes-messaging-connectors.module.ts:19–56` construit Evolution et MCP depuis les maps à l'initialisation ; webhook construit pareil | Changement dynamique/versionné des connexions et invalidation multi-processus à concevoir, pas simple sauvegarde en DB sans effet sur ces instances |
| Connexions messagerie | `hermesMessagingConnections` dans `C/hermes-messaging/hermes-messaging.resolver.ts:49`; service `:110–159`, états `NOT_CONFIGURED/CONFIGURED_UNVERIFIED/AVAILABLE/UNAVAILABLE` | Ajouter statut désactivé, preuve séparée par protocole et capacités bot. `lastCheckedAt` date le probe local ; ne prouve pas à lui seul une connexion fournisseur |
| Compte mail natif | `C/imap-smtp-caldav-connection/imap-smtp-caldav-connection.resolver.ts:53,84` : lecture propriétaire, sauvegarde avec validation/test `:118`, garde `CONNECTED_ACCOUNTS :43` | Ce contrat est celui d'un compte possédé par `userWorkspaceId`, pas une mutation Hermès de boîte partagée administrable |
| Chiffrement natif | `S/engine/metadata-modules/connected-account/entities/connected-account.entity.ts:33–47,70–99` impose enveloppes `enc:v2:` aux tokens/passwords ; scope `USER/WORKSPACE :27,133–138`. `C/secret-encryption/secret-encryption.service.ts:83–136` chiffre AES-GCM v2 avec workspace | Réutiliser ces primitives ; le scope WORKSPACE natif existe mais n'établit pas une délégation Hermès automatique. Ne pas recopier un compte privé dans les nouveaux réglages |
| Mail réception et émission | `C/hermes-mail/hermes-mail.service.ts:95–132` résout une map vers compte chiffré, propriétaire et adhésion autorisée ; `:201–399` synchronise IMAP ; `:403–493` émet SMTP ; polling `:496`. Binding `C/hermes-mail/hermes-mail.policy.ts:7–64` | Conserver la délégation explicite. `probe :135–165` considère une fraîcheur de curseur IMAP de dix minutes ; `canSend` se fonde sur la configuration SMTP sécurisée, pas sur un test SMTP en direct |
| Réception WhatsApp | `POST /webhooks/hermes/evolution`, `C/hermes-connectors/evolution/messages/evolution-webhook.controller.ts:18–32`, header `x-hermes-evolution-token`; receiver puis `inbox.ingest` dans module `:40–44` | Préserver authentification, isolation et réception pendant OFF bot. Rotation/révocation des secrets webhook administrables à créer |
| Bot manuel | `C/hermes-messaging/hermes-messaging.service.ts:285–354` appelle `bot.draftReply` sans contrôler `conversation.botMode`; DTO `dtos/hermes-inbox.dto.ts:107–118` | **MANUAL n'est pas OFF**. Il permet les suggestions MCP. Aucun interrupteur général persistant par workspace/canal n'est fourni par cette méthode |
| Délégation AUTO | Service `:368–478` règle `MANUAL/AUTO` par conversation ; `:426–443` demande une suggestion sur le dernier entrant pour vérifier AUTO ; `:513–620` contrôle propriétaire/epoch et droits | Ne pas recycler cet appel pour réactiver un bot : il consulte un ancien message. Politique canal, garde avant chaque MCP, invalidation globale et absence de rejeu à ajouter |
| Réponse et sécurité existantes | `C/hermes-messaging/hermes-messaging.service.ts:734–935` : idempotence, contrôle du grant, réservation durable `UNCONFIRMED :809`, nouvelle vérification `:852`, émission `:877` | Préserver toutes ces garanties et ajouter une barrière canal au dernier départ réseau. Une relecture seule laisse une course entre OFF et l'appel fournisseur |
| Droits actuels | `C/hermes-messaging/hermes-messaging-access.service.ts:15–40` réutilise l'accès prospection + permissions objets ; `C/hermes-prospection/hermes-prospection-access.service.ts:20–64` exige admin sans restrictions, adhésion/compte/workspace actifs | Les opérateurs ordinaires ne sont pas actuellement autorisés par ces API. Ne pas élargir ce garde pour satisfaire une maquette ; concevoir et tester d'abord une politique par connexion/conversation |
| Réglages dispersés | `F/modules/messaging-inbox/components/MessagingInboxThread.tsx:233–239` affiche contrôle dans fil ; `MessagingInboxBotModeControl.tsx:80–99` propose MANUAL et AUTO | Conserver seulement l'arrêt humain dans le fil. Activation/réactivation et exceptions quittent les modules pour Réglages |

## 3. Centre unique et droits

Un accès Réglages : Mon compte (profil, langue, sécurité et comptes personnels) ; Sociétés ; puis pour la société active Général, Membres, Connexions, Bots et Prospection. Les réglages natifs utiles avancés restent dans ce centre selon droits. Connexions contient Evolution WhatsApp, e-mail IMAP/SMTP, Hermès MCP, entrée scraping, Forms et Cal.diy. Ce contrat détaille les trois premières ; aucune connexion scraping/Forms/Cal.diy n'est annoncée disponible sans son propre inventaire et test.

Modules métier : état synthétique en lecture seule, actions métier et lien vers la sous-section Réglages du workspace actif. Aucun secret, formulaire de connexion, activation AUTO ou interrupteur persistant dans les conversations/campagnes. Une action « Reprendre la main » peut arrêter immédiatement la délégation de ce fil, même si la disponibilité fournisseur est inconnue. Elle ne réactive rien.

Matrice cible **proposée**, à mapper aux permissions natives sans rôle global donnant accès à toutes les sociétés :

| Opération | Admin société autorisé | Utilisateur/opérateur autorisé | Lecture seule | Non-membre/révoqué |
|---|---|---|---|---|
| Statut opérationnel minimal | Oui | Oui pour ses canaux/conversations autorisés | Selon accès données | Refus |
| Détails hôtes, identité, diagnostics et historique config | Oui | Seulement propriétaire de son compte personnel via API native | Non | Refus |
| Créer/modifier/tester/désactiver/révoquer connexion société | Oui | Non ; consentement sur son propre compte seulement | Non | Refus |
| Activer bot, mode, portée et exceptions | Oui | Non | Non | Refus |
| Arrêt immédiat d'une délégation du fil | Oui | Avec permission explicite sur ce fil | Non | Refus |
| Réception côté serveur | Adapteur authentifié, workspace/connexion actifs ; indépendante du bot | Sans session humaine imposée par l'UI | — | Aucune ingestion publique par ID libre |
| Réponse humaine / demande de suggestion | Oui avec données autorisées | Seulement après ajout et validation d'ACL spécifiques ; suggestion requiert aussi bot ON | Non | Refus |
| Lire un secret en clair ou son ciphertext | Jamais via API | Jamais | Jamais | Jamais |

La première livraison conserve la restriction admin actuelle tant que les ACL plus fines ne sont pas implémentées et vérifiées. Un admin ne peut sélectionner le compte personnel d'un autre membre par son seul rôle. La délégation d'un compte personnel requiert consentement de son propriétaire, droits live, portée explicite et révocation immédiate ; pas de changement implicite de scope USER en WORKSPACE. Une V1 propose une instance WhatsApp et une boîte partagée actives par société, historique conservé, multi-compte réservé à une extension validée.

## 4. Persistance et secrets — à créer après validation

Modèle logique proposé, noms de tables non imposés :

- `Connection` : ID opaque, workspace, type `EVOLUTION/EMAIL/HERMES_MCP`, version, état administratif, configuration non secrète validée, références secrètes, référence éventuelle au compte natif et délégation, horodatages, auteur et lien de remplacement. Unicité d'une connexion active par type/workspace V1. Anciennes identités conservées pour rattacher l'historique ; aucune réponse d'ancien fil envoyée via la nouvelle connexion par substitution silencieuse.
- `ConnectionVerification` : version de connexion, capacité `WA_RECEIVE/WA_SEND/IMAP_RECEIVE/SMTP_SEND/MCP_TOOL`, résultat, date, expiration et erreur normalisée. Rotation/configuration modifiée invalide les vérifications concernées. Réception webhook jamais déclarée vérifiée par le seul probe d'émission.
- `BotPolicy` : clé unique `(workspaceId, channel)`, `enabled=false` par défaut, mode explicite `ASSISTED/AUTO`, portée versionnée, epoch monotone, activation/watermark serveur, auteur. Chaque canal possède sa propre ligne et sa propre invalidation.
- `BotOperation/Draft` : workspace, canal, connexion/version, policy epoch, identité message/conversation, provenance `BOT`, état en attente/prêt/invalide/émis et request ID durable. Garder le grant conversation existant comme restriction supplémentaire. Ne pas faire confiance à une provenance déclarée par le client.
- Audit sans données sensibles : acteur, workspace, type d'action, ID, versions, avant/après des seuls champs autorisés, résultat, date. Ni messages complets, token, mot de passe, URL avec identifiant, stack fournisseur ou ancien ciphertext.

Secret store serveur : primitives natives `encryptVersioned/decryptVersionedOrThrow` avec `workspaceId`, enveloppe `enc:v2:` et clés gérées côté serveur, contraintes empêchant le stockage en clair ; aucune nouvelle cryptographie, aucun changement de format natif. Conserver le service `ConnectedAccountTokenEncryptionService` pour le mail. Secrets Evolution/API/webhook et MCP dans stockage serveur dédié, inaccessible aux schémas CRUD génériques, réponses GraphQL et exports. Les migrations futures passent par les commandes officielles du dépôt et préservent rollback, IDs et historique ; aucune migration dans cette phase.

Contrat de formulaire secret : `KEEP` garde la référence existante, `REPLACE(value)` remplace, `CLEAR` explicite est autorisé uniquement si cohérent avec l'état désactivé. Une chaîne vide ou des puces ne sont jamais un nouveau mot de passe. Sortie : `hasSecret=true/false`, texte fixe « Renseigné » ou « Non renseigné », date de changement ; aucun préfixe, longueur ou ciphertext. Entrées de mutations et réponses fournisseurs expurgées des logs, traces APM, erreurs et audit. Le client ne persiste pas les secrets dans Jotai durable, localStorage, URL, cache ou télémétrie.

Les maps env-only restent privées : migration/import opérateur explicite vers le store, validation par workspace, sources de configuration et précédence déclarées sans fallback silencieux vers une ancienne clé après révocation. Il faut remplacer la capture à l'initialisation des adaptateurs par une résolution/version active à l'exécution, y compris webhook et workers ; invalidation distribuée utile, mais jamais seule autorité pour OFF/révocation.

Sécurité réseau conservée : hôtes/ports/protocoles validés, protections SSRF et DNS à la socket, TLS, aucune URL arbitraire fournie par un opérateur ordinaire, aucun override réseau interne exposé au formulaire. MCP reprend le schéma strict existant `C/hermes-prospection/intake/mcp/hermes-mcp.schema.ts:9–52` (endpoint sans credentials/query/hash, toolName, argumentMap, protocole) et l'agent sûr du client `hermes-mcp-bot.adapter.ts:81–117`. Un test MCP utilise uniquement découverte/validation de l'outil autorisé en lecture ; pas de messages clients transmis comme simple test de connexion.

## 5. États honnêtes et capacités

Deux axes séparés : état de connexion et politique du bot. Un bot OFF laisse la connexion active et la réception/humain disponibles. « Désactiver la connexion » est une autre opération admin, avec impact réception/émission annoncé.

| Code public proposé | Libellé français | Preuve/effet |
|---|---|---|
| `NOT_CONFIGURED` | Non configuré | Aucune config utilisable pour ce workspace ; aucun héritage de A vers B |
| `CONFIGURED_UNVERIFIED` | Configuré, à vérifier | Sauvegardé/rotation effectuée, aucune preuve actuelle pour la capacité demandée |
| `CONNECTED_VERIFIED` | Connecté, vérifié le… | Test fournisseur réussi pour version + capacité précises ; date et expiration affichées |
| `ERROR` | Connexion en erreur | Échec normalisé, pas de succès fictif issu du cache |
| `DISABLED` | Connexion désactivée | Désactivation administrative distincte de OFF bot |

La traduction de `AVAILABLE` existant en `CONNECTED_VERIFIED` exige une preuve adaptée ; surtout pas une conversion mécanique du probe mail actuel. Représenter IMAP et SMTP séparément : réception vérifiée ne prouve pas émission et inversement. `canReceive`, `canHumanSend`, `canSuggest`, `canAutoReply` sont calculés côté serveur selon capacités, droits, politiques, vérification et statut fournisseur. Valeur inconnue = action bot refusée ; l'UI affiche inconnu/à vérifier sans produire un faux connecté. `SMTP accepté` ne devient ni `livré` ni `lu`.

## 6. Contrat API

### API existantes, à préserver avec gardes V2 supplémentaires

| Opération existante | Entrée/sortie vérifiées | Source |
|---|---|---|
| Query `hermesEvolutionConnection` | Aucun workspace client ; DTO statut du workspace auth | `C/hermes-connectors/hermes-connectors.resolver.ts:33` |
| Query `hermesMessagingConnections` | Liste `{channel,state,canSend,canSync,lastCheckedAt,errorCode}` | `C/hermes-messaging/hermes-messaging.resolver.ts:49`; `dtos/hermes-inbox.dto.ts:98` |
| Query `hermesInboxConversations(input?)` / `hermesInboxMessages(input)` | Canal/limit/cursor ; conversationId/limit/cursor, pages | Même resolver `:61,77`, DTO `:22–46` |
| Mutation `hermesInboxReply(input)` | `{conversationId,clientRequestId,text}` → message | Même resolver `:93`, DTO `:47–52` |
| Mutation `hermesInboxDraftReply(input)` | `{conversationId,messageId}` → `{mode,status,provider,text?}` | Même resolver `:109`, DTO `:53–57,107–113` |
| Mutation `hermesInboxSetBotMode(input)` | `{conversationId,mode:MANUAL|AUTO}` → `{conversationId,mode,status}` | Même resolver `:125`, DTO `:115–125` |
| Mutation `hermesInboxSyncEmail` | Pas d'entrée ; résultat sync JSON | `C/hermes-mail/hermes-mail.resolver.ts:33` |
| Query `getConnectedImapSmtpCaldavAccount(id)` / mutation `saveImapSmtpCaldavAccount(handle,connectionParameters,id?)` | Compte propriétaire, paramètres publics sans password ; sauvegarde → `{success,connectedAccountId}` | Resolver natif `C/imap-smtp-caldav-connection/imap-smtp-caldav-connection.resolver.ts:53,84`; suppression password dans `utils/build-public-connection-parameters.util.ts:38` |
| `myConnectedAccounts`, `deleteConnectedAccount(id)`, `disconnectConnectedAccount(id)` | DTO publics et vérification administrabilité avant mutation | `S/engine/metadata-modules/connected-account/resolvers/connected-account.resolver.ts:50,96,120` |

Décision de coordination frontend/backend (revue Claude du 30 octobre 2026) : après implémentation et validation, le nouveau bouton « Reprendre la main » appelle uniquement `hermesStopConversationBot`, encore **à créer**. L’ancienne entrée `hermesInboxSetBotMode(MANUAL)` reste compatible et délègue au même service d’arrêt transactionnel, sans MCP ; ne pas entretenir deux politiques d’arrêt. Le câblage consomme les capacités calculées serveur, jamais les prérequis dérivés côté client dans le prototype statique. Aucune de ces évolutions n’est codée par cette décision.

`hermesInboxSetBotMode(AUTO)` ne doit plus permettre l'activation depuis un fil ni via un ancien client contournant Réglages : le serveur exige les permissions et la politique centrale ; le choix du point d'entrée UI seul ne protège rien. La mutation MANUAL/reprise humaine reste sûre et sans MCP. Les nouvelles sorties sont versionnées ou ajoutées de façon compatible après régénération GraphQL coordonnée.

### Nouvelles opérations proposées — **à créer**, noms à valider avec Claude

Toutes utilisent session standard workspace-scoped, guards natifs + contrôle live ; pas de principal API/application/impersonation supplémentaire accordé implicitement. Le workspace d'autorité provient de l'auth. `expectedWorkspaceId` client est seulement une précondition obligatoire contre un onglet périmé, jamais un sélecteur d'autorisation ; mismatch = rejet avant toute I/O. Chaque écriture porte `clientRequestId` et `expectedVersion`, ou `expectedVersion=0` à la création. Résultat d'un replay identique conservé ; même ID/autre payload rejeté.

| Opération proposée | Contrat d'entrée spécifique | Sortie / effet |
|---|---|---|
| Query `hermesWorkspaceSettings` | Workspace auth, précondition de contexte | Métadonnées publiques, connexions, vérifications par capacité, deux politiques bot et capacités de l'acteur ; détails admin filtrés |
| Mutation `hermesUpsertWorkspaceConnection` | Type discriminant, ID éventuel, paramètres validés, opérations secret, référence/délégation mail explicite | DTO public versionné ; sauvegarde = non vérifié ; bot dépendant arrêté/epoch invalidée sur changement matériel |
| Mutation `hermesTestWorkspaceConnection` | ID + version, capacités à tester | Test borné, sans émission à un tiers ; résultat persisté seulement si version et droits toujours actuels à la fin. Test SMTP d'auth/TLS distinct d'un futur message test synthétique autorisé |
| Mutation `hermesSetWorkspaceConnectionEnabled` | ID/version, enabled booléen | État désactivé/à vérifier ; réactivation ne rallume aucun bot |
| Mutation `hermesRevokeWorkspaceConnection` | ID/version | Révocation serveur et invalidation workers/drafts ; arrêt bot dépendant, historique préservé ; aucun fallback env |
| Mutation `hermesSetChannelBotPolicy` | `channel:WHATSAPP|EMAIL`, `enabled`, mode explicite si ON, portée explicite, version et confirmation de portée AUTO | Politique + nouvelle epoch + `effectiveAt` serveur ; OFF n'exige pas de fournisseur joignable. ON exige droits, connexion canal et MCP vérifiés, aucune reprise ancienne |
| Mutation `hermesStopConversationBot` | Conversation/version de délégation | Arrêt du fil sans appel MCP ; conserve l'arrêt global et n'affecte pas l'autre canal |
| Mutation `hermesSubmitDraftReply` | Draft ID/version + request ID | Envoi assisté avec preuve serveur de provenance et policy epoch ; impossible après invalidation/OFF |

Pour le mail, la mutation dédiée compose les services natifs de compte chiffré et un binding/delegation administrable ; elle n'écrit pas directement un password JSON en contournant ces services. Création d'un compte partagé nécessite l'identité responsable et les règles natives de scope/administrabilité. Le consentement d'un propriétaire d'un compte personnel doit faire l'objet d'un contrat dédié avant implémentation, jamais d'un simple booléen envoyé par l'admin à sa place.

Erreurs proposées, codes stables dans `extensions.code` avec message Lingui français et correlation ID opaque, jamais d'exception fournisseur brute :

| Code | Situation / traitement |
|---|---|
| `UNAUTHENTICATED` / `FORBIDDEN` | Session absente, adhésion révoquée, droits insuffisants ; pas de retry automatique d'une mutation |
| `WORKSPACE_CONTEXT_MISMATCH` | Société attendue différente de session ; bloquer et recharger le contexte |
| `CONNECTION_NOT_FOUND` | ID absent ou hors workspace ; même forme pour éviter oracle inter-sociétés |
| `INVALID_CONNECTION_INPUT` | Paramètres/secret/protocole/endpoint invalides, champs sûrs indiqués |
| `VERSION_CONFLICT` / `CLIENT_REQUEST_CONFLICT` | Révision périmée ou clé d'idempotence réutilisée avec autre contenu |
| `CONNECTION_NOT_CONFIGURED` / `CONNECTION_UNVERIFIED` / `CONNECTION_DISABLED` | Prérequis manquants ; rester OFF |
| `PROVIDER_UNAVAILABLE` / `VERIFICATION_EXPIRED` | Connexion indisponible ou preuve périmée ; aucun faux succès |
| `BOT_DISABLED` / `BOT_POLICY_CHANGED` / `BOT_HUMAN_HANDOFF` | Arrêt canal, epoch différente, reprise fil ; résultat MCP écarté, jamais envoyé |
| `DRAFT_INVALIDATED` / `AUTO_SCOPE_CONFIRMATION_REQUIRED` | Ancienne suggestion ou activation sans confirmation explicite |
| `DELIVERY_UNCERTAIN` | Départ possible sans accusé certain ; garder ledger et ne jamais renvoyer automatiquement |

Les codes existants restent documentés/compatibles ou font l'objet d'une migration explicite ; cette proposition ne prétend pas qu'ils sont déjà renvoyés par GraphQL.

## 7. OFF effectif, réactivation et concurrence

Invariants obligatoires : OFF du bot WhatsApp de A bloque les appels MCP de **ce canal** (initialisation, découverte, tool call et suggestions comprises), résultats et émissions bot ; mail A et tous canaux B inchangés. La réception authentifiée et les réponses humaines autorisées continuent. L'absence de ligne de politique, erreur DB ou ambiguïté de contexte vaut OFF pour le bot, sans couper l'ingestion.

1. OFF transactionnel : autorisation/contexte, verrou par `(workspace,channel)`, `enabled=false`, incrément epoch monotone, invalidation des suggestions et opérations non parties, annulation logique de grants conversation de ce canal. Audit dans la même transaction. Aucun appel fournisseur requis pour couper. Annulation des tâches/AbortController en complément, jamais comme seule protection.
2. Avant toute interaction MCP : lire la politique autoritative, connexion/version vérifiée, grant, droits et message éligible ; capturer leurs versions. Le client MCP doit aussi vérifier avant chaque RPC de sa séquence et s'arrêter si invalidé. Les interfaces actuelles d'adaptateur n'ont pas cette garde : adaptation nécessaire.
3. Après résultat/callback : relire adhésion, permissions, connexion/version et epoch ; un résultat d'ancienne epoch est marqué invalide, sans texte utilisable renvoyé au client ni émission. Un callback authentifié peut compléter l'audit ; il n'autorise jamais l'envoi. Aucun endpoint public de callback MCP n'est attesté par cet audit ; cette règle s'applique aux résolutions de promesses et à tout futur callback.
4. Avant envoi assisté/auto : vérifier encore la provenance serveur et le draft, policy epoch, grant conversation, identité connexion, droits, idempotence et contact. Réserver durablement le départ puis appliquer une **barrière de dispatch distribuée** partagée avec OFF/révocation au dernier démarrage réseau. Un simple `if(enabled)` suivi d'un `await send()` ne suffit pas ; démontrer par test que OFF et départ ont un ordre unique, sur plusieurs processus. Le mécanisme exact (verrou/fencing + worker de dispatch) doit être validé avant code ; un mutex mémoire ou notification Redis seule est insuffisant.
5. Garantie temporelle : à partir de l'acquittement serveur OFF, aucun nouveau départ MCP ou bot ; tout résultat déjà en vol est inutilisable. Une requête déjà transmise au fournisseur avant la coupure ne peut pas être retirée par promesse locale : conserver son état réel/éventuellement incertain et l'indiquer, sans retry ni prétention de rappel. La barrière définit ce point de départ et borne le délai de prise en compte ; OFF échoué/non acquitté reste affiché en erreur, jamais confirmé par optimisme UI.
6. Réponse humaine : chemin explicite existant `hermesInboxReply` préservé sans exiger bot ON ; une suggestion soumise par Draft ID suit toujours les gardes bot. L'UI purge toute suggestion invalidée. Ne pas présenter un ancien envoi assisté comme humain pour éviter la garde. Un texte ressaisi volontairement par une personne est une réponse humaine, soumise aux autres droits et règles de canal.
7. ON : vérification actuelle canal + MCP et mode obligatoire. `ASSISTED` permet une demande humaine sur un nouveau message éligible ; `AUTO` nécessite portée/confirmation explicites et opérateur autorisé vivant. Aucun rétablissement des grants précédents ni de leur propriétaire par simple toggle. Nouvelle epoch, nouveau watermark serveur ; les vieux jobs, retries et résultats gardent leur ancienne epoch et sont écartés. Pas d'appel MCP sur le dernier message à l'activation.
8. Non-rejeu : enregistrer l'éligibilité/epoch à la **première réception durable**. Un événement reçu sous OFF, déjà connu, différé ou importé avec date fournisseur antérieure à l'activation reste non éligible après ON ; ne pas se fonder uniquement sur l'horodatage fourni par le client/fournisseur. Capturer aussi une frontière de réception/source pour les polls IMAP/backlogs ; événement d'âge/provenance incertaine = revue humaine sans bot. Ni réactivation, ni resynchronisation, ni webhook replay ne requalifie un ancien entrant. Nouveau grant de fil nécessaire s'il a été repris humainement.

L'ingestion actuelle relance `processAutoReply` même sur `replay=true` (`C/hermes-messaging/hermes-messaging.service.ts:670–676,725–730`). L'idempotence actuelle limite les doublons d'émission, mais ne prouve pas le non-rejeu MCP après changement de politique. Ajouter un critère explicite d'éligibilité, sans modifier les identités/digests historiques.

## 8. Recette et critères d'acceptation — à exécuter après autorisation

| Scénario | Résultat requis / preuve |
|---|---|
| A/B/C et onglets | Admin A modifie SMTP A : version et capacités B inchangées ; non-membre C refusé sans fuite ; deux onglets sur sessions divergentes, mismatch avant toute I/O ; révocation en vol et après refresh relue |
| Secrets | API, logs, traces, erreurs, snapshots et exports sans valeurs/ciphertexts ; KEEP/REPLACE/CLEAR déterministes ; réutilisation d'une enveloppe A dans B échoue ; clés serveur absentes client/Git |
| Compte privé | Admin ne lie pas le compte personnel d'un autre utilisateur sans consentement ; révocation du propriétaire stoppe la délégation ; compte historique et sa portée ne sont pas transformés silencieusement |
| Vérité des états | Config vide → non configuré ; sauvegarde sans probe → à vérifier ; IMAP OK/SMTP KO visibles séparément ; rotation pendant probe invalide son succès tardif ; pas de AVAILABLE fictif |
| OFF avant requête | 0 appel MCP, 0 départ bot sur canal coupé, même demande directe d'ancienne API ; mail/autre workspace inchangés |
| OFF pendant MCP | Bloquer fake provider à chaque RPC, couper, libérer résultat : aucune RPC suivante, aucun texte utilisable, aucun send ; audit invalide/cancelled |
| OFF entre réservation et send | Test contrôlé multi-processus au point de dispatch : OFF acquitté interdit départ ; réservation non partie échoue sans être envoyée ; départ antérieur reste honnêtement suivi |
| OFF après succès MCP | Suggestion déjà prête, callback tardif, onglet ancien et envoi assisté refusés ; réponse humaine autorisée toujours possible |
| OFF indépendant du canal | Webhook WhatsApp et polling IMAP continuent de créer les entrants avec bot OFF ; réponse humaine SMTP/WA fonctionne si connexion autorisée active |
| ON sans replay | Import IMAP initial, backlog, doublon webhook, ancien job/retry et grant antérieur : 0 suggestion/envoi ; nouveau message éligible seulement après activation et portée ; activation seule = 0 appel MCP |
| Reprise humaine | Stop fil accessible sans fournisseur ; résultat en vol invalidé ; pas de bouton/ancienne mutation permettant de réactiver hors politique centrale |
| Idempotence/incertitude | Même request ID = un départ maximum ; timeout après SMTP DATA/POST = UNCONFIRMED, jamais retry automatique ; refus certain distinct d'acceptation ; aucune promesse livré/lu |
| Centre Réglages FR | Maquette approuvée puis navigateur 390px/desktop, clavier/focus/labels, chargement/erreur/vide/succès ; un centre, pas de configuration dispersée ni état connecté simulé |

Socle de tests existants à compléter, **non exécuté ici** : `C/hermes-messaging/__tests__/hermes-messaging.service.spec.ts`, `hermes-messaging.integration-spec.ts`, `hermes-messaging-access.service.spec.ts` ; `C/hermes-connectors/__tests__/hermes-connectors.resolver.spec.ts`, `.service.spec.ts` ; `C/hermes-connectors/evolution/messages/__tests__/evolution-webhook.http.spec.ts` ; `C/hermes-mail/__tests__/hermes-mail.service.spec.ts` ; `C/hermes-prospection/intake/__tests__/hermes-mcp-bot.adapter.spec.ts`. Les tests de concurrence/persistance nécessitent une DB jetable et plusieurs workers réels, en CI cloud ; les mocks seuls ne prouvent pas la barrière distribuée.

## 9. Interface minimale offerte à Claude pour revue

Types de discussion **proposés**, pas de fichier TypeScript/GraphQL créé dans cette phase. Les opérations `hermesWorkspaceSettings` et mutations ci-dessus retournent ces structures publiques ; les mutations ajoutent `clientRequestId` et `effectiveAt`. Les entiers monotones sont transportés comme chaînes décimales pour éviter une perte de précision JavaScript.

```ts
type Channel = 'WHATSAPP' | 'EMAIL';
type ConnectionState =
  | 'NOT_CONFIGURED' | 'CONFIGURED_UNVERIFIED'
  | 'CONNECTED_VERIFIED' | 'ERROR' | 'DISABLED';
type VerificationCapability =
  | 'WA_RECEIVE' | 'WA_SEND' | 'IMAP_RECEIVE' | 'SMTP_SEND' | 'MCP_TOOL';
type VerificationPublic = {
  capability: VerificationCapability;
  state: 'UNVERIFIED' | 'VERIFIED' | 'ERROR' | 'EXPIRED';
  checkedAt: string | null;
  expiresAt: string | null;
  connectionVersion: string;
  errorCode: string | null;
};
type ConnectionPublic = {
  id: string;
  workspaceId: string;
  kind: 'EVOLUTION' | 'EMAIL' | 'HERMES_MCP';
  version: string;
  state: ConnectionState;
  displayName: string;
  hasSecret: boolean; // Présence seulement ; jamais valeur ou suffixe.
  verifications: VerificationPublic[];
};
type ChannelPolicyPublic = {
  workspaceId: string;
  channel: Channel;
  version: string;
  epoch: string;
  enabled: boolean;
  mode: 'ASSISTED' | 'AUTO';
  scope: { kind: 'AUTHORIZED_CONVERSATIONS'; conversationIds: string[] };
  activatedAt: string | null;
  effectiveAt: string;
  capabilities: {
    canReceive: boolean;
    canHumanSend: boolean;
    canSuggest: boolean;
    canAutoReply: boolean;
    canConfigure: boolean;
  };
};
type WorkspaceSettingsPublic = {
  workspaceId: string;
  connections: ConnectionPublic[];
  botPolicies: ChannelPolicyPublic[]; // Exactement WHATSAPP et EMAIL.
  canManageConnections: boolean;
};
```

La portée explicite par liste est un minimum pour discussion ; une portée « toutes les nouvelles conversations autorisées » exige un discriminant distinct, une confirmation AUTO et ses tests, jamais `[]` interprété implicitement comme toutes. Une connexion inexistante reste absente de `connections` et son emplacement UI porte `NOT_CONFIGURED` ; ne pas fabriquer d'ID ou de vérification. Les détails admin nécessaires aux formulaires (hôte, port, mailbox, outil MCP) feront l'objet de DTO discriminés supplémentaires sans secrets ; ils ne sont pas inclus dans le statut opérationnel minimal offert aux opérateurs.

Schéma d'états offert aux maquettes : `NOT_CONFIGURED → CONFIGURED_UNVERIFIED` à la sauvegarde ; test de toutes les capacités requises réussi → `CONNECTED_VERIFIED` ; échec → `ERROR` ; expiration ou changement matériel → `CONFIGURED_UNVERIFIED` ; désactivation → `DISABLED`. Réactivation connexion → `CONFIGURED_UNVERIFIED`, bot toujours OFF. Révocation retire la connexion active, garde l'historique et rend l'emplacement non configuré. Politique bot : OFF → demande ON avec mode/portée/prérequis valides → ON ; toute coupure/révocation invalide epoch et revient OFF. Les états `saving/testing/stopping/error` frontend sont transitoires et ne remplacent jamais les états persistants du serveur.

Libellés français minimum proposés pour accord avec Claude ; **clés conceptuelles**, à mapper à la convention Lingui existante, pas à introduire comme nouveau moteur i18n :

| Clé conceptuelle | Texte français |
|---|---|
| `settings.connection.notConfigured` | Non configuré |
| `settings.connection.unverified` | Configuré, à vérifier |
| `settings.connection.verified` | Connecté, vérifié le {date} |
| `settings.connection.error` | Connexion en erreur |
| `settings.connection.disabled` | Connexion désactivée |
| `settings.secret.present` / `.absent` | Renseigné / Non renseigné |
| `settings.bot.whatsapp` / `.email` | Bot WhatsApp / Bot e-mail |
| `settings.bot.off` / `.on` | Désactivé / Activé |
| `settings.bot.assisted` / `.automatic` | Assisté / Automatique |
| `settings.bot.stopPending` | Arrêt en cours |
| `settings.bot.offHelp` | La réception et vos réponses restent disponibles. |
| `settings.bot.policyChanged` | Le réglage a changé. Cette proposition a été annulée. |
| `settings.context.changed` | La société active a changé. Rechargez avant de continuer. |
| `settings.send.uncertain` | Envoi non confirmé. Ne renvoyez pas ce message. |

Scénarios GIVEN/WHEN/THEN remis pour la revue frontend/backend :

- GIVEN deux sociétés A/B et deux politiques ON dans chacune, WHEN l'admin coupe WhatsApp A et le serveur acquitte OFF, THEN zéro nouveau départ MCP/bot WhatsApp A, mail A et société B inchangés ; les entrants/humains A restent possibles.
- GIVEN une suggestion MCP A en vol et un ancien onglet, WHEN OFF change l'epoch puis le résultat arrive et l'onglet tente de l'envoyer, THEN aucun texte utilisable retourné ni envoi ; erreur `BOT_POLICY_CHANGED` ou `DRAFT_INVALIDATED`, affichée en français.
- GIVEN une boîte IMAP vérifiée sans preuve SMTP actuelle, WHEN le centre ouvre la connexion, THEN réception et émission ont leurs preuves distinctes et AUTO ne s'active pas sur un faux état global connecté.
- GIVEN un message reçu pendant OFF et un grant AUTO antérieur, WHEN ON est confirmé puis un replay/poll ressort cet ancien message, THEN aucun appel MCP et aucun envoi ; le grant ancien reste invalide.
- GIVEN le formulaire A et une session devenue B, WHEN la mutation contient `expectedWorkspaceId=A`, THEN rejet `WORKSPACE_CONTEXT_MISMATCH` avant modification ou fournisseur ; aucun secret A ou B exposé.
- GIVEN un utilisateur non propriétaire d'un compte personnel, WHEN il tente de le déléguer par son ID, THEN refus sans révéler ses paramètres, même s'il administre la société.

## 10. Dépendances et livraison

| Lot futur | Propriétaire | Dépendance / sortie vérifiable |
|---|---|---|
| Maquettes Réglages + fil arrêté + états français | Claude | Choix Pipedrive détaillé validé ; aucun branchement |
| ACL et DTO finaux | Codex + revue Claude | Contexte workspace sûr et matrice droits ; accord sur types générés avant source |
| Store/migrations/connexion native/délégations | Codex | Commandes officielles, tests DB et secrets ; règles de consentement et rétention décidées |
| Politique canal + invalidation + dispatch | Codex | Store/ACL ; preuve OFF multi-processus et aucun replay ; revue par SHA |
| Centre unique et remplacement anciens contrôles | Claude | Autorisation d'implémenter + maquettes + contrats validés ; pas de formulaire secret dans les modules |
| Recette intégrée | Codex backend + Claude frontend | CI, vrais accès synthétiques vérifiés et preview protégée, frontend/backend au SHA connu ; livraison explicite réalisé/non configuré/non testé |

Décisions restantes avant implémentation : confirmer la limite V1 une boîte/instance active et le traitement des anciens fils lors d'un remplacement ; consentement et responsabilité d'une boîte partagée ; mapping des rôles opérateur/lecture aux ACL natives ; portée AUTO exacte et confirmation ; expiration par capacité et rétention d'audit. Le mécanisme de barrière et les migrations doivent être spécifiés/revus avant écriture. Ces points n'empêchent pas les maquettes statiques et la revue de ce contrat.

Limites du livrable : aucun store, API nouvelle, OFF global, secret administrable ou nouvelle ACL codés ; aucun fournisseur connecté ou testé ; aucune preview V2 générée. Lecture source bornée au SHA indiqué ; les versions effectivement déployées et accès/licences restent à vérifier. Ce document ne constitue pas une autorisation de développement ou d'envoi et ne réutilise pas une ancienne validation visuelle.
