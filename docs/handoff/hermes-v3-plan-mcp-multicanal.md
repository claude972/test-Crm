# Hermès — plan V3 MCP, messageries et prospection

## Objectif principal

Gérer ses sociétés autorisées dans un CRM web/PWA français : conversations WhatsApp multimédias, vraie messagerie e-mail, brouillons Hermès via MCP, prospects correctement classés, pipeline commercial fiable et campagnes émises depuis la boîte autorisée de la société. La livraison comprend une preview utilisable avec des parcours de recette réellement vérifiés.

Statut : plan documentaire actualisé à la demande « Quel est le plan selon skills ». Aucun nouveau développement applicatif lancé par cette publication. Les dernières décisions utilisateur remplacent les anciennes règles V2 contradictoires concernant la coupure du bot. La validation du design détaillé précède le câblage, conformément à la demande utilisateur.

Méthode : make-plan (collecte factuelle déléguée, synthèse root, phases avec preuves) et split (Claude frontend, Codex backend, branches isolées, missions GitHub avant exécution, revues croisées par SHA). La présente demande est un plan, pas un nouveau dispatch d’implémentation à Claude.

## Décisions acquises

- Français par défaut ; référence visuelle Pipedrive ; web/PWA seulement ; stack existante conservée. Les trois pistes statiques V2 ne constituent pas une validation du design détaillé ni une preuve de fonctions raccordées.
- Une société exploitante = workspace ; données, connexions, réglages et droits cloisonnés. La vue commune est limitée aux sociétés autorisées, en lecture seule.
- Hermès est relié en MCP. Le MCP prépare le brouillon ; les adaptateurs WhatsApp/mail réalisent l’émission autorisée. Aucun outil MCP d’envoi n’est supposé exister.
- « Désactiver les réponses du bot » signifie passer en ASSISTED : brouillons MCP autorisés, aucun envoi automatique, seul un clic humain peut envoyer. Cette règle vaut par société/canal et localement par conversation WhatsApp ou fil e-mail.
- Trois modes proposés et acceptés dans le cadrage : AUTO, ASSISTED, OFF complet. OFF complet interdit aussi le MCP et les brouillons ; il est distinct de la désactivation ordinaire des réponses automatiques. Réception et réponse humaine autorisée restent disponibles.
- Cible de priorité à implémenter et tester : le fil hérite de la politique société/canal, ou la restreint ; une société/canal OFF ne peut être rallumée localement et ASSISTED ne permet pas un AUTO local. Chaque mode/exception est visible ; les contrôles locaux du bot sont autorisés dans les conversations par la dernière demande utilisateur.
- Centre Réglages unique pour comptes, sociétés, membres, secrets, connexions et politiques par défaut ; les modules gardent les actions métier et commandes locales du bot. Aucun formulaire SMTP/Evolution/MCP dispersé.
- WhatsApp : recevoir/afficher ET envoyer images et vidéos ; lire les vocaux ; enregistrer, préécouter, annuler et envoyer un vocal depuis le navigateur/PWA.
- E-mail : réception/envoyés/brouillons, fils par objet, destinataires, répondre/tous/transférer, contenu riche et pièces jointes.
- Formulaire/WA/mail/scraping gardent provenance et historique. Une réception n’est pas automatiquement une opportunité ; ambiguïtés et nouvelles demandes commerciales arrivent à qualifier. Les oppositions restent distinctes de l’étape commerciale.
- Campagnes B2B : expéditeur réellement autorisé sur la boîte SMTP choisie ; audience, exclusions, personnalisation, aperçu/test, programmation, annulation, désinscription durable et résultats honnêtes. Brevo sert de référence de parcours, sans nouvelle intégration ou souscription implicite.

## Preuves disponibles et limites

Source applicative auditée : `333ba534927e177c90b35eb4157d75d8d767dec4`, feat/codex-hermes-integration, checkout p1-hermes-integration lu uniquement. Prototype statique : af8ce71e86ebfa03c07ee892bc782cbcdb53a249. Contrats V2 :1c6760cfc, historiques sur le modèle OFF dès que la dernière règle ASSISTED les contredit. Les audits V3 sont statiques, aucun nouveau test DB/provider/pipeline réel n’a été exécuté pour écrire ce plan.

Préfixes sources relatifs au dépôt au SHA333 : S = apps/crm/ui/packages/twenty-server/src ; C = S/engine/core-modules ; F = apps/crm/ui/packages/twenty-front/src ; T = apps/crm/ui/packages/twenty-server/test.

| Sujet | Existant prouvé | Écart / non testé |
|---|---|---|
| WhatsApp | C/hermes-connectors/evolution/messages/evolution-messages.adapter.ts:110 et evolution-webhook.receiver.ts:31,124 : sendText et texte entrant | Médias ignorés ; aucun contrat upload/récupération/lecture/envoi média dans l’inbox auditée |
| E-mail | C/hermes-mail/hermes-mail.policy.ts:97–154 extrait texte MIME ; service.ts:440–457 envoie du texte | HTML et attachments non conservés par ce chemin ; aucune vraie boîte enrichie déduite |
| Bot MCP | C/hermes-messaging/hermes-messaging.service.ts:285–354 permet les brouillons en MANUAL ; :450–476 coupe AUTO avec epoch | ASSISTED correspond conceptuellement à MANUAL mais policy société/canal, OFF complet et arbitrage global/local à créer |
| Pipeline | S/engine/workspace-manager/twenty-standard-application/utils/field-metadata/compute-opportunity-standard-flat-field-metadata.util.ts:203–267 : NEW/SCREENING/MEETING/PROPOSAL/CUSTOMER ; F/modules/object-record/record-drag/hooks/useUpdateDroppedRecordOnBoard.ts:177–183 écrit stage+position | Aucun gagné/perdu explicite dans ces options ; test de transitions/persistance à construire, ne pas rebaptiser CUSTOMER arbitrairement |
| Réceptions | C/hermes-messaging/hermes-messaging-person.service.ts:19–59 fait match uniquement ; events/hermes-event.service.ts:135–195 crée/réutilise des fiches natives pour Forms | Pas de classement prospect multicanal commun ; zéro doublon entre tous writers non démontré |
| Scraping | C/hermes-prospection/intake/hermes-intake.service.ts:68–122 : authentification, anti-rejeu, staging ; qualification humaine séparée | Connexion externe Hermès réelle non vérifiée ; payload accepté ne signifie pas prospect qualifié |
| Campagnes | Driver SMTP natif réel avec domaine autorisé ; resolver emailing-send.resolver.ts:83–106 applique licence/feature/billing | Mailbox exacte non garantie par le seul contrôle de domaine ; bridge Hermès smtpCampaignSending:false ; aucune licence ou connexion réelle inspectée ici |

## Phase 0 — Documentation et capacités vérifiées

**Contribution à l’objectif :** ne pas construire une interface sur des fonctions ou connexions supposées.

- Collecte source effectuée par deux sous-agents Codex (plan_mcp_media_facts, plan_crm_campaign_facts), synthèse root. Avant code, vérifier la version Evolution réellement cible, les capacités MCP, les accès de recette, les formats/quotas médias et le chemin licence de campagne. Aucun nouvel abonnement ni contournement de garde.
- APIs existantes autorisées comme socle : hermesMessagingConnections, hermesInboxConversations(input?), hermesInboxMessages(input), hermesInboxReply({conversationId,clientRequestId,text}), hermesInboxDraftReply({conversationId,messageId}), hermesInboxSetBotMode({conversationId,mode:MANUAL|AUTO}) ; source C/hermes-messaging/hermes-messaging.resolver.ts:49–139 et dtos/hermes-inbox.dto.ts:22–125. Ce socle est texte seulement.
- MCP existant : initialize → notifications/initialized → tools/list → tools/call, outil read-only configuré ; source C/hermes-prospection/intake/mcp/hermes-mcp-bot.adapter.ts:1–245 et hermes-mcp.schema.ts:1–93. Aucun nom d’outil Hermès inventé.
- Socle prospects : hermesImportBatches, hermesCreateImportBatch, hermesQualifyImportRows, hermesCreateCampaignDraft ; C/hermes-prospection/hermes-prospection.resolver.ts:47–99. Socle campagne : sendMessageCampaign, cancelMessageCampaign, sendMessageCampaignTest, previewMessageCampaignAudience, previewMessageCampaignSend ; S/modules/emailing/resolvers/emailing-send.resolver.ts:83–204.
- Patrons/documents à reprendre : contrats natifs et README des adaptateurs, API taguée de la version Evolution vérifiée ; documentation Brevo officielle https://help.brevo.com/hc/fr/articles/4413566705298 et https://help.brevo.com/hc/fr/articles/33949194347154. L’adresse expéditeur et la connexion réelle SMTP sont deux preuves distinctes.
- Sortie : inventaire présent/manquant/non configuré/non testé, liste Allowed APIs, versions et blocages. Endpoints médias Evolution et nouvelles politiques restent « à définir » jusqu’à documentation vérifiée.
- Vérification : confronter signatures aux sources ; identifier une voie de campagne compatible avec droits/licence et absence d’achat. Si indisponible, proposer une décision documentée, ne pas supprimer les gardes ni afficher un faux bouton opérationnel.

## Phase 1 — Contrats actualisés et maquettes détaillées

**Contribution à l’objectif :** valider le vrai produit avant son raccordement.

- Claude détaille la piste choisie : WhatsApp multimédia, e-mail de type boîte de réception, modes AUTO/ASSISTED/OFF et commande locale, réglages, réception/qualification, pipeline et campagne. Codex actualise les contrats partagés en parallèle sur fichiers distincts.
- Reprendre DESIGN.md et docs/design/hermes-v2 auaf8ce71e comme prototype uniquement ; les anciens labels bot coupé sont à revoir selon la nouvelle définition ASSISTED. Conserver références Pipedrive/français sans les redemander.
- Contrats nouveaux explicitement proposés : médias typés et sécurisés par workspace, politique de mode globale/locale, capacités calculées serveur, erreurs/états, lien mailbox→campagne et provenance multicanale. Ne pas annoncer une API nouvelle comme disponible.
- Vérification : images desktop/mobile390px, états vide/chargement/erreur/non configuré, aperçu vocal et pièce jointe, choix humain du brouillon, modes/priorités compréhensibles. Validation utilisateur des maquettes détaillées avant câblage.
- Garde : conserver les anciens rapports comme historiques ; nouveau plan prioritaire pour règles bot. Une maquette ne prouve ni lecture média réelle ni connexion.

## Phase 2 — Sociétés, droits et centre Réglages

**Contribution à l’objectif :** chaque action vise la bonne société et ses propres comptes.

- Codex reprend création/auth et adhésions natives ; Claude raccorde le parcours approuvé Ajouter/Choisir société et son dashboard. Vue commune autorisée readonly. Centraliser connexions Evolution, IMAP/SMTP, MCP, scraping, HeyForm et Cal.diy ; secrets chiffrés côté serveur et capacités honnêtes.
- Patrons : F/modules/auth/sign-in-up/hooks/useSignUpInNewWorkspace.ts:33–84 ; C/workspace/structure-dashboard/structure-dashboard.resolver.ts:48–62 ; C/hermes-mail/hermes-mail.policy.ts:7–64 ; C/secret-encryption/secret-encryption.service.ts:83–136. Réutiliser native auth et chiffrement, pas de JWT ou store crypto inventés.
- Vérification : sociétés A/B et C interdit, deux onglets, refresh, révocation, réglage A sans effet B, rejet des écritures avec contexte périmé, aucun secret dans API/client/logs/Git.
- Garde : une fiche Company cliente n’est pas un workspace ; un filtre de dashboard ne change pas le contexte d’écriture ; aucun compte personnel partagé sans délégation explicite.

## Phase 3 — Modes du bot Hermès MCP

**Contribution à l’objectif :** l’utilisateur maîtrise l’automatisation sans perdre l’aide à la rédaction.

- Implémenter AUTO/ASSISTED/OFF, héritage société/canal et exception locale restrictive ; exposer mode effectif et raison. « Désactiver réponses automatiques » → ASSISTED. « Arrêt complet » → OFF avec effet distinct annoncé.
- Reprendre séparation draft/envoi de F/modules/messaging-inbox/components/MessagingInboxComposer.tsx:111–127,157–167 ; epoch transactionnelle C/hermes-messaging/hermes-messaging.service.ts:450–476 ; ledger :756–825,874–920. L’ancien MANUAL peut rester compatible avec ASSISTED ; aucune activation AUTO implicite.
- Au passage AUTO→ASSISTED, aucun nouveau départ automatique : une réponse en préparation ne peut pas partir ; un brouillon peut rester/provenir du MCP seulement s’il est autorisé dans le nouveau contexte puis envoyé par action humaine. OFF complet invalide aussi les suggestions et bloque MCP. Réactivation sans rejouer le backlog. Barrière de dispatch distribuée et recontrôles avant émission ; une requête déjà partie ne peut être rappelée.
- Vérification : zéro émission en ASSISTED sans clic, MCP fonctionne et brouillon validable ; OFF zéro MCP ; arrêt pendant génération et juste avant transport ; indépendance entre fils/canaux/sociétés ; ancien onglet/ancienne version refusés ; émission incertaine jamais retry aveugle.
- Garde : ne pas recopier l’ancienne règle « toute désactivation interdit MCP » ; ne pas transformer une désactivation bot en opposition marketing, déconnexion du canal ou suppression de conversation.

## Phase 4 — Messageries WhatsApp et e-mail réelles

**Contribution à l’objectif :** recevoir, comprendre et répondre dans une interface familière à chaque canal.

- Claude : liste/fil WhatsApp avec image, lecteur vidéo/vocal, ajout de médias et enregistrement navigateur (permission micro, préécoute, annulation, envoi) ; interface e-mail dossiers/fils, objet, destinataires, répondre/tous/transférer, corps riche et attachments.
- Codex : contrat média de bout en bout (ID, type/MIME, taille, stockage, état, durée si pertinente), réception/récupération fournisseur, accès lecture/upload/envoi scoped, persistance/migrations officielles, adaptateurs vérifiés et ledger étendu au contenu média. Pour mail, conserver MIME/HTML utile et pièces jointes, rendu sûr et identité du thread.
- Patrons : C/hermes-messaging/entities/hermes-inbox-message.entity.ts:1–70 (à étendre officiellement) ; F/modules/activities/emails/hooks/useUploadEmailAttachment.ts:16–39 (directUploadFile/FileFolder.EmailAttachment) ; S/modules/messaging/message-outbound-manager/resolvers/send-email.resolver.ts:45–180 et dtos/send-email.input.ts:1–57 (API native distincte à étudier).
- Vérification : image/vidéo/vocal reçu, envoyé puis relu après refresh, MIME/taille refusés clairement, accès A/B interdit, enregistrement micro refusé/annulé géré, HTML/attachments mail et réponses rattachées au bon fil, panne de transport sans double envoi. Vrais fournisseurs seulement avec accès et destinataires de recette vérifiés.
- Garde : ne pas inventer sendMedia/sendWhatsAppAudio ; vérifier leurs API contre la version cible. sendEmail natif n’est pas un remplacement direct du ledger Hermes. Le fallback d’extraction texte HTML n’est pas un assainisseur HTML à réutiliser pour affichage.

## Phase 5 — Réceptions, scraping et base prospects commune

**Contribution à l’objectif :** aucune demande commerciale ne se perd et chaque contact conserve son histoire.

- Intégrer Formulaire/WA/mail/scraping avec source, société, date, contact et historique. Rattacher aux fiches natives existantes ; placer nouvelle demande commerciale à qualifier/affecter, ambiguïtés en revue. Réponses client, notifications techniques et spam ne créent pas silencieusement de prospects/opportunités. Préserver déduplication et oppositions, traiter les courses entre writers.
- Patrons : C/hermes-messaging/hermes-messaging-person.service.ts:19–59 (match sans création) ; C/hermes-prospection/intake/events/hermes-event.service.ts:135–195 et README.md (Person/Company/Note Forms) ; hermes-prospection.service.ts:102–195 ; utils/hermes-import-policy.ts:91–118.
- Connexion scraping : reprendre POST /webhooks/hermes/intake/:connectionId, signature HMAC du corps brut et nonce/timestamp, C/hermes-prospection/intake/hermes-intake.service.ts:68–122, hermes-intake-signature.ts:3–39. Tester lot signé réellement reçu depuis la source de recette, refus signature incorrecte, rejeu même lot/mêmes IDs, conflits et qualification. Réglage de connexion dans centre unique.
- Vérification : un même prospect reçu par formulaire puis WA/mail ne crée pas de doublon évitable ; ambiguïtés explicites, bonne société/affectation, source intacte, opposition conservée après réimport, aucune opportunité ou campagne émise à la réception.
- Garde : statut pending/qualified du staging ≠ étape commerciale ; import accepté ≠ qualifié ; le verrou Forms seul ne prouve pas zéro doublon global ; ne pas dépasser silencieusement 40lots/100lignes/2Mo sans migration paginée préparée.

## Phase 6 — Pipeline commercial fiable

**Contribution à l’objectif :** suivre chaque affaire avec des étapes et montants persistants et cohérents.

- Reprendre le board/opportunity natif, ses droits, propriétaire, contact/société, amount/currency, stage et position. Définir gagné/perdu et leurs effets avec le mécanisme de métadonnées natif, en préservant les valeurs/IDs existants ; séparer qualification prospect et progression d’affaire.
- Patrons : F/modules/object-record/record-drag/hooks/useUpdateDroppedRecordOnBoard.ts:90,163,177–183 ; F/modules/object-record/hooks/useUpdateOneRecord.ts:156–177 ; S/engine/workspace-manager/twenty-standard-application/utils/field-metadata/compute-opportunity-standard-flat-field-metadata.util.ts:203–267 ; S/modules/opportunity/standard-objects/opportunity.workspace-entity.ts:20.
- Vérification : créer affaire, affecter, déplacer une étape puis recharger et confirmer via API/DB de recette ; montant/devise et prochaine action cohérents, gagné/perdu vérifiables, filtres/dashboard corrects, échec mutation avec retour visuel, rôle interdit et société étrangère refusés.
- Garde : ne pas considérer le drag-and-drop visuel comme preuve de persistance ni le test existant de liste opportunities comme test de transitions ; ne pas renommer CUSTOMER arbitrairement.

## Phase 7 — Campagnes depuis la boîte SMTP autorisée

**Contribution à l’objectif :** joindre les bons prospects depuis la vraie identité de la société et recevoir leurs réponses au bon endroit.

- Claude reprend le parcours de campagne natif avec audience/exclusions, contenu personnalisé, aperçu, test synthétique autorisé, programmation/annulation et résultats. Les réglages persistants d’expéditeur, suivi et connexions restent centraux.
- Codex relie explicitement l’identité de boîte autorisée au transport SMTP et à la campagne : contrôler l’adresse exacte/alias autorisé, pas seulement le domaine From. Réutiliser moteur emailing/queues/suppression natifs et leurs gardes. Traiter la licence identifiée en Phase0 sans achat ni suppression des protections ; aucune capacité annoncée disponible tant que ce point et la connexion ne sont pas vérifiés.
- Patrons : C/emailing-domain/drivers/smtp/smtp-emailing-domain-driver.ts:302–355 ; smtp-connection.schema.ts:12–35 ; S/modules/emailing/resolvers/emailing-send.resolver.ts:83–204 ; message-campaign-audience.service.ts et message-suppression.service.ts natifs.
- Vérification : DRAFT/aperçu zéro émission ; test serveur limité au destinataire synthétique ; vraie session SMTP de recette et identité exacte, réponses reçues/rattachées ; désinscrit exclu avant départ même après aperçu ; cadence selon capacités fournisseur ; programmation/annulation ; suivi OFF sans pixel ; accepté SMTP ≠ livré ≠ ouverture observée ; timeout après remise sans second envoi.
- Garde : ne pas confondre From et boîte réellement connectée ; aucun second moteur de campagnes, abonnement nouveau, licence contournée ou test sur prospects réels.

## Phase 8 — Revue croisée, recette intégrée et lien final

**Contribution à l’objectif :** remettre un outil testable dont le rapport correspond à ce qui fonctionne réellement.

- Claude et Codex revérifient leurs livraisons par SHA, corrigent les constats et publient MISSIONS/CORRECTIONS. Root intègre seulement les révisions revues, exécute builds/checks adaptés puis navigateur desktop/mobile sur preview Vercel isolée. Frontend/backend de source identifiée, partage privé testé anonymement et expiration annoncée, credentials hors Git.
- Patrons de recette : T/integration/graphql/suites/hermes-prospection.integration-spec.ts:125,400,429,460,485,543,603,625 ; tests intake/__tests__/hermes-intake-security.spec.ts et hermes-events.http.spec.ts ; drivers/smtp/__tests__/smtp-emailing-domain-driver.spec.ts:244–405 ; ajouter vrais tests de transition pipeline. Harness officiel DB jetable uniquement, jamais base originale.
- Scénario transversal : formulaire de recette → contact/provenance → réception WA et e-mail reliées → brouillon MCP ASSISTED → clic humain → affaire/prochaine action/pipeline persistés → campagne synthétique depuis boîte autorisée → réponse rattachée → opposition empêchant une prochaine émission. Rejouer avec A/B, utilisateur non autorisé et révocation en vol.
- Vérification finale : build et tests réels, médias réels de recette, modes effectifs, cloisonnement/onglets, classement/pipeline/campagnes, états erreur/vide/chargement, français, clavier et mobile ; manifeste/installabilité PWA et comportement hors ligne effectivement fourni testés séparément.
- Garde : maquette statique, source présente, mocks et build vert ne prouvent pas intégration fournisseur. Rapporter réalisé/non configuré/non testé, compte de recette, échéance et lien utilisable ; aucun succès inventé.

## Répartition et exécution ultérieure

| Responsable | Propriété | Dépendance |
|---|---|---|
| Claude | Maquettes détaillées, frontend WA/mail, navigation/centre Réglages, UI modes/brouillons, pipeline et campagnes, français/accessibilité | Contrats source vérifiés puis validation des images avant câblage |
| Codex + sous-agents | Sessions/droits, contrats, données/médias, connecteurs, politique MCP, ingestion/classement, transport campagne, tests backend et CI | Capacités/licence vérifiées ; fichiers partagés attribués avant éditions |
| Root | Synthèse, missions GitHub, worktrees, arbitrage contrats, revues exactSHA et preview/recette | Livraisons isolées, aucune édition concurrente |

Branches établies : missions/p0-stabilization (coordination), feat/claude-hermes-v2-ui (prototype/lot UI existant), feat/codex-hermes-v2-core (contrats existants). Avant code applicatif, choisir une base d’intégration revue, créer/réutiliser worktrees et définir l’ownership concret ; les branches documentaires ne deviennent pas implicitement des implémentations complètes. Publication de ce plan ne déclenche ni Claude ni un monitor.

Hors périmètre immédiat : application native, nouveau service payant, production, prospection WhatsApp en masse, envois à de vrais prospects, analyse/transcription automatique des médias sans outil vérifié. Préserver original test-Crm, sauvegardes et modifications locales ; aucun secret dans Git.
