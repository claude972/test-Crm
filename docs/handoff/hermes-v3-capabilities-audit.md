# Hermès V3 — audit de capacités, phase 0

Date : 30 octobre 2026. Mission `HERMES-V3-AUDIT-MAQUETTES-20261030`, publiée au `80a40e6c32d5dc6b35987055bf6bec8633413128` sur `missions/p0-stabilization`, lue avant écriture. Affectation exclusive `v3_capabilities` confirmée. Ce document prépare les contrats et maquettes ; aucune implémentation V3 n'est livrée.

## Périmètre et niveaux de preuve

Application lue uniquement dans `p1-hermes-integration`, HEAD vérifié `333ba534927e177c90b35eb4157d75d8d767dec4`. Aucun changement de cette source, DB, `.env`, `.runtime`, secret, compte ou configuration. Aucun provider appelé, aucune émission, aucune installation et aucun nouveau workflow déclenché. Les seuls réseaux utilisés sont les sources officielles publiques et GitHub Actions en lecture seule. Les entrées locales non suivies préexistantes `.swc/` et `apps/crm/ui/node_modules` sont laissées intactes.

Les liens applicatifs ci-dessous portent sur [la base exacte](https://github.com/claude972/test-Crm/tree/333ba534927e177c90b35eb4157d75d8d767dec4). Préfixes : `S = apps/crm/ui/packages/twenty-server/src`, `C = S/engine/core-modules`, `F = apps/crm/ui/packages/twenty-front/src`, `T = apps/crm/ui/packages/twenty-server/test`. Les chemins/lignes se rapportent à ce SHA, jamais aux fichiers de contrats.

- **Codé** : contrat ou chemin source identifié ; ne prouve pas son activation.
- **Manquant** : absent du chemin Hermès audité ; un mécanisme natif distinct peut exister.
- **Non configuré / non vérifié** : aucun accès de recette exploitable n'a été établi dans cette mission ; cela ne prétend pas que le serveur distant n'a aucune configuration.
- **Non testé réel** : pas de fournisseur, navigateur métier V3 ou persistance pipeline de recette vérifié. Les tests synthétiques/CI sont séparés.

## Matrice de capacités

| Fonction | Codé à la base 333 | Manquant / cible V3 | Configuration et preuve réelle |
|---|---|---|---|
| WA texte | `C/hermes-connectors/evolution/messages/evolution-messages.adapter.ts:110` ; webhook authentifié `evolution-webhook.receiver.ts:31,124` ; inbox et ledger persistants | Médias ignorés par le receiver actuel | Evolution de recette non configuré/non vérifié ; pas de réception/envoi réel |
| WA image/vidéo/vocal | API fournisseur officielle 2.3.6 vérifiée ci-dessous | DTO inbox, stockage, accès média, ingestion/download/upload, ledger média, lecteurs/enregistreur et adaptation transport | Aucun média reçu/envoyé/relu ; codecs navigateur, tailles et quotas runtime non testés |
| MCP brouillon | `C/hermes-prospection/intake/mcp/hermes-mcp-bot.adapter.ts:1–245`, schéma `hermes-mcp.schema.ts:1–93` ; MANUAL autorise draft dans `hermes-messaging.service.ts:285–354` | Outil/externe réel à auditer ; politique société/canal et OFF complet | Endpoint, nom exact, droits et disponibilité non configurés/non vérifiés ; zéro `tools/call` réel |
| Modes bot | MANUAL/AUTO par conversation, epoch à `hermes-messaging.service.ts:450–476`, réservations/ledger `:756–825,874–920` | ASSISTED/OFF, priorité restrictive globale/locale et barrière de dispatch distribuée | Pas de preuve d'arrêt AUTO V3 en vol par simple lecture |
| Mail Hermès | Sync IMAP ; extraction MIME texte `C/hermes-mail/hermes-mail.policy.ts:97–154`, réponse SMTP texte `hermes-mail.service.ts:440–457` | Conservation/rendu HTML sûr, attachments, dossiers/envoyés/brouillons enrichis, cc/bcc/tous/transfert via inbox | Boîte IMAP/SMTP et réception/réponse réelles non vérifiées |
| Mail natif | `S/modules/messaging/message-outbound-manager/dtos/send-email.input.ts:1–57`, resolver `:45–180` : compte, identité, destinataires, sujet, body, fichiers, reply/draft | Pont avec ledger Hermès, sécurité de rendu et synchronisation des états à concevoir | Existence native ≠ vraie boîte enrichie Hermès raccordée |
| Prospects multicanaux | Staging/qualification import ; Forms crée/réutilise fiches/notes `C/hermes-prospection/intake/events/hermes-event.service.ts:135–195,373–437` (insertions company/person/note/target `:381,391,416,427`) ; WA/mail match seulement `C/hermes-messaging/hermes-messaging-person.service.ts:19–59` | Classement commun/provenance et déduplication de tous writers | Aucun scénario réel cross-canal ou source scraping connectée vérifié |
| Pipeline | Métadonnées opportunity et mutation stage+position natives | Gagné/perdu explicites et recette des transitions/persistance | CI de liste et board présent ne prouvent pas transitions réelles |
| Campagnes | Moteur natif, audience/suppression, programmation/annulation, SMTP community, quarantaine UNCONFIRMED | Lien boîte exacte/alias autorisé → connexion transport → campagne ; capacité serveur honnête | Bridge `smtpCampaignSending:false` ; pas de mailbox/SMTP/quotas/droits runtime vérifiés |

## Evolution 2.3.6 : version et API fournisseur autorisée comme référence

La version cible du **contrat source** est 2.3.6. Vérification GitHub officielle : tag annoté `3f6a4735c8b731143431cd43d311ca57040e40a1` résout le commit `3454bec79f514995df9a5ea36a3554ab35cf1c82`. [Package tagué](https://github.com/evolution-foundation/evolution-api/blob/2.3.6/package.json), [ref du tag](https://api.github.com/repos/evolution-foundation/evolution-api/git/ref/tags/2.3.6). Le README du probe historique cite 2.3.7 : ce n'est pas la preuve du serveur déployé. Sa version effective demeure non vérifiée.

Ces routes sont **fournisseur serveur à serveur**, pas des mutations GraphQL Hermès déjà disponibles. [Montage message/chat](https://github.com/evolution-foundation/evolution-api/blob/2.3.6/src/api/routes/index.router.ts#L212), [router d'envoi](https://github.com/evolution-foundation/evolution-api/blob/2.3.6/src/api/routes/sendMessage.router.ts#L63), [DTO](https://github.com/evolution-foundation/evolution-api/blob/2.3.6/src/api/dto/sendMessage.dto.ts#L70), [schémas de validation](https://github.com/evolution-foundation/evolution-api/blob/2.3.6/src/validate/message.schema.ts#L95).

| Opération fournisseur vérifiée | Requête / réponse source | Limite de la preuve |
|---|---|---|
| `POST /message/sendMedia/{instance}` | `number`, `mediatype:image|document|video|audio`, `media` URL/base64 ; `mimetype`, `caption`, `fileName` optionnels ; multipart `file` accepté par le router ; HTTP201 | Le type TS comprend aussi `ptv` mais le schéma sendMedia ne l'accepte pas : ne pas dériver les valeurs du seul type TS |
| `POST /message/sendWhatsAppAudio/{instance}` | `number`, `audio` URL/base64 ou multipart `file`, `encoding` optionnel ; HTTP201 | Ne pas nommer arbitrairement la route `sendAudio` ; un vocal PTT est distinct de sendMedia audio |
| `POST /chat/getBase64FromMediaMessage/{instance}` | `{message: WebMessageInfo, convertToMp4?:boolean}` ; HTTP201 ; objet `mediaType,fileName,caption,size,mimetype,base64,buffer` (buffer null pour appel HTTP ordinaire) | Le [router](https://github.com/evolution-foundation/evolution-api/blob/2.3.6/src/api/routes/chat.router.ts#L113) utilise `schema:null` ; le [DTO](https://github.com/evolution-foundation/evolution-api/blob/2.3.6/src/api/dto/chat.dto.ts#L20) n'est pas une validation runtime suffisante. Ne pas passer seulement un ID CRM |

Points formats établis dans [l'implémentation Baileys taguée](https://github.com/evolution-foundation/evolution-api/blob/2.3.6/src/api/integrations/channel/whatsapp/whatsapp.baileys.service.ts#L2937) : vocal avec conversion activée par défaut, sortie Ogg/Opus mono48kHz, `ptt:true`; `encoding:false` conserve les octets mais annonce Opus, donc n'est pas une conversion WebM→Ogg. Image convertie JPEG ; vidéo standard nommée MP4 sans preuve d'un transcodage vidéo universel. Le download peut convertir un audio en `audio/mp4` sur demande. Sans corps message, il recherche via la clé fournisseur ; disponibilité et rétention restent à vérifier. Aucun plafond de taille ni inventaire exhaustif des codecs supportés n'est certifié ici. Prévoir des limites applicatives explicites, détection MIME/contenu et tests Safari/Chrome/PWA.

Réception : webhook `messages.upsert` avec `data.key`, contenu `data.message`, type et métadonnées fournisseur. La propriété base64 est conditionnelle au réglage webhook `base64` et au succès du téléchargement, jamais garantie. [Construction des messages et émission](https://github.com/evolution-foundation/evolution-api/blob/2.3.6/src/api/integrations/channel/whatsapp/whatsapp.baileys.service.ts#L1318). Le receiver Hermès actuel ignore ces médias : présence fournisseur n'implique aucune réception média Hermès.

Authentification : header `apikey`, global ou token d'instance validé côté fournisseur ([guard](https://github.com/evolution-foundation/evolution-api/blob/2.3.6/src/api/guards/auth.guard.ts#L10)). Secrets conservés serveur, instance choisie par workspace autorisé. Webhook local : [headers personnalisés officiels](https://github.com/evolution-foundation/evolution-api/blob/2.3.6/src/api/integrations/event/webhook/webhook.controller.ts#L71) ; Hermès utilise un token distinct `x-hermes-evolution-token`, pas une signature HMAC supposée fournie par Evolution. Ne pas exposer clé, URL ou instance au client ; ne pas faire télécharger au navigateur une URL fournisseur non contrôlée.

Idempotence : aucun champ/paramètre de déduplication d'envoi fournisseur n'a été identifié dans ces routes/schémas. `clientRequestId` appartient au ledger Hermès. Réserver avant POST, pas de retry aveugle sur timeout/non-ACK ou erreur après départ ; accepté ≠ livré. Le futur média doit étendre la même réserve durable au hash/identité du contenu et au workspace. Les webhooks reçoivent leurs propres clés de déduplication persistantes.

## Allowed APIs CRM présentes à la base 333

« Allowed » signifie référence existante à réutiliser sous ses guards/permissions ; aucune autorisation d'émission réelle dans cet audit.

| API existante | Entrée / portée et source |
|---|---|
| `hermesMessagingConnections` | Workspace du contexte ; état/canSend/canSync, pas de détails secrets. `C/hermes-messaging/hermes-messaging.resolver.ts:49–60` |
| `hermesInboxConversations(input?)` | Pagination limit1–100/cursor, canal optionnel ; workspace courant. Resolver `:61–76`, DTO `dtos/hermes-inbox.dto.ts:22–42` |
| `hermesInboxMessages(input)` | conversationId UUID + pagination. Resolver `:77–92`, DTO `dtos/hermes-inbox.dto.ts:43–46` |
| `hermesInboxReply(input)` | `{conversationId,clientRequestId,text}` ; UUID et texte1–20000 ; aucun média. Resolver `:93–108`, DTO `dtos/hermes-inbox.dto.ts:47–52` |
| `hermesInboxDraftReply(input)` | `{conversationId,messageId}` ; aucun endpoint/outil libre. Resolver `:109–124`, DTO `dtos/hermes-inbox.dto.ts:53–57` |
| `hermesInboxSetBotMode(input)` | `{conversationId,mode:MANUAL|AUTO}` ; ni OFF ni ASSISTED dans le schéma courant. Resolver `:125–140`, input DTO `dtos/hermes-inbox.dto.ts:115–119`, sortie `:120–125` |
| `hermesInboxSyncEmail` | Mutation sans compte arbitraire ; contexte authentifié, `C/hermes-mail/hermes-mail.resolver.ts:33–44` |
| `hermesImportBatches`, `hermesCreateImportBatch`, `hermesQualifyImportRows`, `hermesCreateCampaignDraft` | `C/hermes-prospection/hermes-prospection.resolver.ts:47–100` et DTO adjacents ; brouillon ≠ émission ; garde campagne conservée |
| `sendEmail(input)` natif | `connectedAccountId,fromHandle?,to,cc?,bcc?,subject,body,inReplyTo?,draftMessageId?,files?:{id,name}[],targetRecord?` ; vérifie compte utilisable par caller ; permission SEND_EMAIL_TOOL. `S/modules/messaging/message-outbound-manager/resolvers/send-email.resolver.ts:45–180` |
| `sendMessageCampaign`, `cancelMessageCampaign`, `sendMessageCampaignTest`, `previewMessageCampaignAudience`, `previewMessageCampaignSend` | Natif, `S/modules/emailing/resolvers/emailing-send.resolver.ts:83–225`, inputs nommés sous `C/emailing-domain/dtos/` ; guards workspace/feature/access/quota conservés. PreviewSend est session utilisateur seulement ; test est une vraie émission, pas une preview |

Les APIs nouvelles média, politique globale/locale, capacités étendues et liaison mailbox→campagne seront **propositions** des contrats V3, pas signatures utilisables à ce stade. Aucun outil MCP d'envoi n'est dans cette liste.

## MCP : séquence prouvée, outil réel inconnu

Client existant : `initialize` → `notifications/initialized` → `tools/list` borné → un `tools/call`, profil Streamable HTTP `2025-11-25`, JSON/SSE, session isolée. Bearer serveur, endpoint HTTPS configuré par workspace, `toolName` exact et `argumentMap` explicites. L'outil doit annoncer `readOnlyHint:true`, ne pas annoncer `destructiveHint:true`, et accepter le profil de schéma limité implémenté. Ces hints restent déclaratifs : audit opérateur et droits drafting requis. Sources : `C/hermes-prospection/intake/mcp/hermes-mcp-bot.adapter.ts`, `hermes-mcp.schema.ts`, `hermes-mcp-schema-validation.ts`, README adjacent ; spécifications officielles [lifecycle](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle), [transport](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports), [tools](https://modelcontextprotocol.io/specification/2025-11-25/server/tools).

Le serveur MCP entrant du CRM ne prouve pas un service externe Hermès de génération. Aucun nom de tool, compte ou endpoint externe n'a été découvert/vérifié. Pas de supposition `hermes.send`, `generateReply` ou `sendWhatsApp`. Sans configuration : NOT_CONFIGURED ; mauvais protocole/schéma/droits/outil : UNAVAILABLE. OFF complet cible bloque le MCP ; ASSISTED cible conserve le draft et exige le clic humain. Les comportements société/canal/héritage sont à implémenter.

## Mail natif et mail Hermès : frontières à préserver

Le parser Hermès PostalMime lit MIME, mais retourne le texte ou un fallback HTML réduit par regex, tronqué ; il ne conserve ni HTML ni attachments. Cette regex n'est pas un assainisseur pour rendre du HTML. Les références RFC sont limitées, le fil n'est pas une boîte native complète. La réponse Hermès passe `text`, destinataire unique, sujet et références, `disableFileAccess/disableUrlAccess:true` ; son Message-ID et son ledger gèrent sa propre opération.

Le chemin natif distinct possède composition riche et fichiers : `C/tool/tools/email-tool/email-composer.service.ts`, resolver/input natifs ci-dessus et `F/modules/activities/emails/hooks/useUploadEmailAttachment.ts:16–39` via `directUploadFile`/`FileFolder.EmailAttachment`. Réutilisation à étudier avec contrôles ownership/storage/sanitization. Appeler `sendEmail` directement depuis l'inbox ne remplace pas les réservations, recontrôles d'autorisation et règles d'émission incertaine Hermès. Aucun fichier/HTML/dossier enrichi ne doit être présenté comme déjà servi par `hermesInboxMessages`.

## Campagne SMTP : chemin sans nouvel achat identifié, conditionnel

Conclusion **source uniquement** : le moteur dispose d'un chemin SMTP community prévu par les gardes avec billing désactivé. Pas de suppression de garde, faux abonnement, changement de configuration ou contournement proposé. Cela ne certifie ni les droits d'usage juridique d'un déploiement particulier (plusieurs fichiers portent une mention Enterprise), ni une configuration/autorisation runtime. Si le déploiement n'utilise pas ce chemin autorisé, rester brouillon/preview et rendre le blocage ; aucun achat implicite.

Chaîne examinée au SHA333 :

1. `S/modules/emailing/resolvers/emailing-send.resolver.ts:54–109` : auth/permission WORKSPACE, feature `IS_MESSAGE_CAMPAIGN_ENABLED`, `EmailGroupAccess`, `isPayingCustomer`, `validateEmailSendOrThrow` avant send/schedule. Test et preview conservent leurs propres gardes.
2. `C/emailing-domain/services/email-group-access.service.ts:22–39` + `constants/community-emailing-domain-drivers.constant.ts:3–7` : SMTP explicitement community, accepté sans EnterprisePlan quand billing off. `C/billing/services/billing.service.ts:129–147` : billing off retourne true ; billing on exige abonnement Active.
3. `S/modules/emailing/services/email-billing.service.ts:27–55` → `C/usage-limit/services/usage-quota-admission.service.ts:34–77` : contrôle abonnement puis quotas. `C/billing/services/billing-usage.service.ts:50–57` retourne null quand billing off. `billing-credit-allowance.service.ts:23–25` désactive allowance avec billing off, utilisé par `usage-limit-quota.service.ts:809–822`. Les quotas personnalisés/défauts ne sont pas tous désactivés : `:693–764` ; ils peuvent encore refuser. Ne pas les neutraliser.
4. `message-campaign.service.ts:230–289` prépare campagne/domaine prêt/audience et recontrôle refus ; `message-campaign-schedule.service.ts:47–51,112–174` réutilise cette préparation au scheduling puis au départ différé.
5. Worker `message-campaign-delivery.service.ts:64–130` et batch `message-campaign-batch-delivery.service.ts:140–210` recontrôlent refus/quota, état campagne, suppression et slots. `campaign-send-slot.service.ts:24–72` conserve cadence via UsageLimitSpeedService. Annulation, opposition et UNCONFIRMED ne doivent pas être contournés.
6. `C/emailing-domain/drivers/emailing-domain-driver.factory.ts:47–50,139–145` recontrôle EmailGroupAccess puis construit SMTP avec `EMAILING_SMTP_CONNECTIONS`. Aucun checkout/provider n'a été configuré ici.
7. Feature encore nécessaire : `C/twenty-config/config-variables.ts:2435` a `HERMES_B2B_CAMPAIGNS_ENABLED=false` par défaut ; `C/workspace/services/workspace.service.ts:572` applique l'opt-in à la création. Ce flag ne prouve pas l'état d'un workspace existant.

**Boîte exacte non garantie** : `smtp-connection.schema.ts:12–35` contient host/port/security/auth et `senderDomains`, pas d'allowlist de mailboxes ni de lien connectedAccount. `smtp-emailing-domain-driver.ts:302–355` vérifie workspace et domaine From, puis utilise une connexion par workspace ; ce contrôle ne prouve pas que `commercial@domaine` est l'identité autorisée de `compta@domaine`. Le contrat V3 doit porter ID de boîte/connexion, adresse exacte et alias explicitement autorisés, droits et réponses rattachées. Même domaine, From affiché, auth username et mailbox réellement déléguée sont quatre faits distincts.

## Pipeline et tests : preuve disponible et manque réel

Métadonnées `S/engine/workspace-manager/twenty-standard-application/utils/field-metadata/compute-opportunity-standard-flat-field-metadata.util.ts:203–267` : NEW, SCREENING, MEETING, PROPOSAL, CUSTOMER, IDs existants à conserver. Board `F/modules/object-record/record-drag/hooks/useUpdateDroppedRecordOnBoard.ts:177–183` écrit stage+position via mutation native ; ce n'est pas une preuve de succès/persistance. `T/integration/graphql/suites/object-generated/opportunities.integration-spec.ts:1–74` vérifie lecture d'une liste et présence de champs, aucune transition gagné/perdu. Pas de test ciblé de transitions/persistance pipeline identifié dans cet audit. Définir gagné/perdu par métadonnées natives et recette DB/API jetable, sans rebaptiser CUSTOMER arbitrairement.

GitHub lu le 30 octobre : dernière CI de la branche et de la **base exacte333** [run41084109198](https://github.com/claude972/test-Crm/actions/runs/41084109198), `P0 combined checkpoints`, status completed/conclusion success. Les huit check-runs consultés réussissent, dont backend-build/backend et frontend/frontend-bundle. Logs consultés : frontend **18 suites /154 tests**, backend régressions **17/201**, messaging/intake **15/191**, tous passent. Ce sont des résultats historiques observés, pas des tests réexécutés par cet audit.

Workflow `.github/workflows/p0-backend-build.yml:118–129` choisit explicitement régressions Hermès/SMTP/quarantaine et suites messaging/mail/Evolution/intake ; `:153–192` vérifie migrations officielles en PostgreSQL jetable ; `:216–222` lance dashboard/prospection/messaging/events intégrés. Logs du run : migrations import/inbox réussies, onboarding synthétique avec persistance, puis navigateur desktop/mobile vérifiant sign-in, dashboard, import/qualification/DRAFT et zéro livraison. Build/types/smokes du workflow restent des preuves de ce périmètre synthétique. Aucune preuve Evolution réel, vrai MCP, SMTP externe, codecs navigateur ou campagne avec boîte exacte ne découle de ce vert. Ne pas attribuer les tests natifs de liste opportunities à la recette pipeline demandée.

## Accès de recette et décisions de sortie phase 0

Inventaire des outils disponibles examiné : lecture GitHub via CLI disponible ; pas d'outil connecté spécifique à l'instance Hermès/Evolution/MCP/SMTP de recette identifié. Les outils Sites génériques ne constituent pas un accès à ce CRM et ne justifient pas de lire leurs variables. Aucun `.mcp.json`, credential, environnement, DB originale ou secret CI consulté. Existence d'un outil shell ou d'un workflow ne vaut pas accès autorisé à un compte métier.

| Élément requis pour recette ultérieure | État de cette mission | Action nécessaire avant prétention fonctionnelle |
|---|---|---|
| URL et version Evolution de recette, instance dédiée | Non configuré/non vérifié | Obtenir statut/version par voie serveur autorisée et preuve compte/instance ; aucun achat |
| Médias et téléphone synthétiques dédiés | Non disponibles/non testés | Destinataires de recette validés, limites MIME/taille et ingress webhook sécurisé |
| MCP externe drafting exact | Non configuré/non vérifié | Catalogue réel, schéma et scope tool, sans outil d'envoi supposé |
| IMAP/SMTP boîte de recette | Non configuré/non vérifié | Identité exacte/alias/délégation et comptes scoped ; secrets hors Git |
| Feature/billing/driver/quotas réels campagne | Non inspectés | Capacité calculée côté serveur sur les valeurs autorisées, jamais déduite des defaults |
| DB/pipeline et droits A/B/C de recette | Non accédés | Harness officiel jetable et scénarios de transition/rechargement/révocation |

Bloqueurs réels avant câblage complet : design détaillé à valider, APIs Hermès médias/politiques absentes, identité mailbox exacte absente du driver campagne, et accès externes non établis. L'absence de licence payante n'est **pas** un blocage inconditionnel démontré : un chemin conditionnel community existe dans le code. Garder tous les refus de configuration/droits/quota visibles et pas de bouton « prêt à envoyer » sur seule maquette.

Guidance contrats/maquettes : distinguer Codé/Proposé/Simulé/Non configuré/Non testé ; médias typés et scoped workspace avec état transfert/erreur, pas d'URL secrète ; ASSISTED brouillon puis clic humain, OFF sans MCP ; héritage restrictif ; annulation de vocal et échec micro ; e-mail HTML/attachments présentés comme cible ; pipeline avec échec de sauvegarde ; campagne en DRAFT/preview tant que mailbox/feature/transport non vérifiés. Ne jamais créer une API locale fictive pour faire croire au raccordement.

## Contrôles réellement effectués et confiance

Lectures `cat/sed/rg` des chemins cités ; `git rev-parse HEAD`, `git status --short`, `git remote -v` ; `git show 80a40e6c:MISSIONS.md/CORRECTIONS.md` ; GitHub `gh api .../commits/333.../check-runs`, `gh run list`, `gh run view41084109198 --log` filtré ; ref/tag Evolution via `gh api` et sources officielles taguées via navigateur/curl TLS normal. L'ouverture initiale du mauvais ancien namespace Evolution a échoué ; reprise sur le dépôt officiel evolution-foundation. Python urllib a échoué sur la chaîne CA locale ; curl système a réussi sans désactiver TLS. Aucun de ces échecs n'est attribué au provider runtime.

Confiance élevée sur signatures/routes et contrôles source inspectés, moyenne sur l'exhaustivité transversale du pipeline et des quotas, nulle sur la configuration et l'interopérabilité externe non testées. Ce document ne certifie aucune capacité live. Vérification éditoriale : liens/chemins source confrontés, `git diff --check` ciblé ; aucun test applicatif exécuté pour ce document. Root/agent contrats possèdent le commit/push ; cet agent ne touche ni index ni autres livrables.
