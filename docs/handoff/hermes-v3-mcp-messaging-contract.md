# Hermès V3 — contrat proposé MCP et messageries

Date : 30 octobre 2026. Mission `HERMES-V3-AUDIT-MAQUETTES-20261030`, publiée au `80a40e6c32d5dc6b35987055bf6bec8633413128`. Phase 0 acceptée par root avant START phase 1. **Document cible, aucune API V3 implémentée.** Application de référence en lecture seule : `333ba534927e177c90b35eb4157d75d8d767dec4`. Voir [audit des capacités au SHA095582346](https://github.com/claude972/test-Crm/blob/095582346e227d627437560c66445e9a9211bcb9/docs/handoff/hermes-v3-capabilities-audit.md) et [contrat CRM/campagnes](hermes-v3-crm-campaign-contract.md).

Ce contrat remplace les règles contradictoires des contrats V2 et de l'ancien prompt V2 : désactiver les réponses automatiques signifie **ASSISTED**, MCP/brouillons conservés, envoi humain uniquement ; **OFF** est un arrêt complet distinct. Les commandes locales sont autorisées dans les conversations WhatsApp et fils e-mail. Les fichiers V2 restent historiques, inchangés. Français, Pipedrive et web/PWA sont acquis. Les phases 2–8/câblage attendent la validation visuelle utilisateur des maquettes détaillées.

## 1. Existant prouvé et frontière V3

Les chemins sont relatifs au dépôt au SHA333 ci-dessus : `S = apps/crm/ui/packages/twenty-server/src`, `C = S/engine/core-modules`, `F = apps/crm/ui/packages/twenty-front/src`. « Présent » décrit la source, pas une connexion live. Les références complètes, versions officielles et limites sont dans l'audit.

| API présente | Forme actuelle | Preuve source |
|---|---|---|
| `hermesMessagingConnections` | états, `canSend`, `canSync`, date/erreur | `C/hermes-messaging/hermes-messaging.resolver.ts:49–60` |
| `hermesInboxConversations(input?)` | `{channel?,limit?,cursor?}` ; page items/nextCursor | même resolver `:61–76`, DTO `dtos/hermes-inbox.dto.ts:22–42` |
| `hermesInboxMessages(input)` | `{conversationId,limit?,cursor?}` ; texte/statut | resolver `:77–92`, DTO `:43–46,76–87` |
| `hermesInboxReply(input)` | `{conversationId,clientRequestId,text}` ; texte seulement | resolver `:93–108`, DTO `:47–52` |
| `hermesInboxDraftReply(input)` | `{conversationId,messageId}` ; draft texte MCP | resolver `:109–124`, DTO `:53–57,107–113` |
| `hermesInboxSetBotMode(input)` | `{conversationId,mode:MANUAL|AUTO}` | resolver `:125–140`, DTO `:115–125` |
| `hermesInboxSyncEmail` | contexte serveur, sans compte arbitraire | `C/hermes-mail/hermes-mail.resolver.ts:33–44` |

Les DTO actuels ne fournissent ni média, ni mode ASSISTED/OFF, ni politique société/canal, ni mail enrichi. `sendEmail` natif est une autre API : compte, From optionnel, to/cc/bcc, sujet/body, références/draft et files ; `S/modules/messaging/message-outbound-manager/dtos/send-email.input.ts:1–57`, resolver `:45–180`. Elle ne remplace pas le ledger Hermès.

Extraits actuels, pas signatures V3 :

```ts
// C/hermes-messaging/types/hermes-messaging.types.ts:25–32,62–66
export type HermesMessagingSend = {
  workspaceId: string;
  conversationId: string;
  providerConnectionId: string;
  contactHandle: string;
  text: string;
  clientRequestId: string;
};
export type HermesInboxReplyInput = {
  conversationId: string;
  clientRequestId: string;
  text: string;
};
```

`draftReply` appelle le bot sans condition MANUAL/AUTO (`hermes-messaging.service.ts:285–354`). `setBotMode` vérifie aujourd'hui AUTO en générant sur le dernier entrant (`:426–443`) : ne pas conserver ce comportement d'activation en V3, qui ne doit ni générer sur backlog ni envoyer un ancien message. L'epoch monotone `:450–476`, le ledger durable et ses recontrôles `:734–935` sont des garanties à étendre, pas à supprimer.

## 2. Contexte, permissions et capacités cibles

Société exploitante = workspace, distinct d'une fiche Company cliente. Workspace déduit de la session native standard, jamais d'un label ou ID libre. Toute entrée V3 porte un contexte attendu opaque vérifiable ; le serveur compare session/workspace/membership et version de contexte. La vue commune reste lecture seule. Réponse tardive d'A après passage à B rejetée côté client et serveur ; aucun retry d'écriture implicite.

L'accès courant exige un administrateur non restreint et vivant (`C/hermes-messaging/hermes-messaging-access.service.ts:15–40`, `C/hermes-prospection/hermes-prospection-access.service.ts:20–64`). Les rôles ci-dessous sont **permissions cibles à définir et tester**, aucune ouverture de ce garde dans cette livraison.

| Action | Autorisation serveur cible, toujours dans la société active |
|---|---|
| Lire fil/message/média | adhésion active + accès à la connexion et au fil ; contrôle chaque pièce jointe, jamais seulement son URL |
| Brouillon MCP | lecture + permission drafting + mode effectif différent de OFF + MCP configuré et outil audité |
| Répondre humainement | permission d'émission sur connexion/identité + accès au fil ; possible en ASSISTED/OFF, sous contrôles transport et oppositions applicables |
| Restreindre localement | permission de commande bot sur ce fil ; epoch/revision attendue ; acteur audité |
| AUTO local ou remise en héritage | permission de délégation explicite, opérateur vivant ; ne dépasse jamais politique société/canal |
| Politique société/canal, connexions et secrets | administrateur autorisé au centre Réglages, sans exposer les secrets en lecture |

MCP présent : `initialize` → `notifications/initialized` → `tools/list` → `tools/call`, profil `2025-11-25`, outil configuré exact avec `readOnlyHint:true` et schéma compatible (`C/hermes-prospection/intake/mcp/hermes-mcp-bot.adapter.ts:148–225`, `hermes-mcp.schema.ts:1–93`). Aucun outil externe réel ni nom de tool d’envoi n’est vérifié. Les hints ne remplacent pas l’audit des droits/effects ; le MCP prépare, l’adaptateur canal émet sous autorisation.

Les capacités sont calculées côté serveur depuis droits vivants, mode, configuration, version/format/quotas et santé distincts. Un booléen UI n'autorise rien. `AVAILABLE` ne garantit ni codec ni livraison ; `CONFIGURED_UNVERIFIED` ne se traduit pas « connecté ». Un secret enregistré n'est pas une preuve d'accès. Les réglages centraux hébergent Evolution, IMAP/SMTP, MCP, membres et politiques ; aucune configuration secrète dans le composeur.

## 3. Politique AUTO / ASSISTED / OFF et héritage restrictif

Le mode est une politique d'assistance, pas une suppression marketing ou une déconnexion. Réception et réponse humaine autorisée restent disponibles dans les trois modes.

| Politique société/canal | Local INHERIT | Local AUTO | Local ASSISTED | Local OFF |
|---|---|---|---|---|
| AUTO | AUTO | AUTO, délégation explicite | ASSISTED | OFF |
| ASSISTED | ASSISTED | refus `BOT_POLICY_RESTRICTION` | ASSISTED | OFF |
| OFF | OFF | refus | refus | OFF |

Une ancienne exception devenue trop permissive est conservée pour audit mais ne s'applique plus ; le mode effectif reste le minimum restrictif (`OFF < ASSISTED < AUTO`) et la raison indique la politique supérieure. Les nouvelles mutations trop permissives sont refusées. Retirer une restriction en choisissant INHERIT alors que le résultat serait AUTO exige la même délégation explicite et nouvelle epoch qu’une activation AUTO ; une simple suppression technique d’exception ne l’active pas. « Réactiver » signifie choisir explicitement une politique permise ; aucune activation AUTO par sauvegarde de connexion, retour d'onglet, retrait d'exception, changement de rôle ou migration MANUAL.

| Effectif | MCP | Brouillon MCP affichable | Envoi automatique | Envoi humain autorisé |
|---|---|---|---|---|
| AUTO | oui sous capacités | oui | nouveaux entrants après délégation valide seulement | oui |
| ASSISTED | oui sous capacités | oui, sélection/révision humaine | jamais | clic humain distinct obligatoire |
| OFF complet | aucun appel | suggestions invalidées, aucun nouveau draft MCP | jamais | oui |

La proposition V2 `hermesStopConversationBot` est supersédée par `hermesSetConversationBotPolicy` : l'action « désactiver les réponses automatiques » sélectionne `ASSISTED`, tandis que « OFF complet » sélectionne `OFF` explicitement. Aucun endpoint d'arrêt V2 n'est déclaré existant ni ajouté par ce contrat.

Compatibilité proposée : lire MANUAL comme ASSISTED ; l'API v1 continue à accepter MANUAL/AUTO pendant migration versionnée. Aucun OFF n'est injecté dans un enum v1. Valeur inconnue ou politique manquante après migration : refus des actions bot, état explicite à résoudre, jamais AUTO par défaut. Les messages humains et leur brouillon manuel ne sont pas supprimés par OFF ; une suggestion MCP invalidée ne peut pas être envoyée via son ancien token.

### Arrêt en vol et absence de rejeu

Chaque politique société/canal, exception locale, délégation, connexion et autorisation pertinente possède une revision/epoch durable. Un job conserve leur snapshot, l'identité du fil/connexion, l'opérateur et l'ID entrant déclencheur. Recontrôles avant MCP, au retour MCP, à la réservation, après probe et au dernier départ réseau. Ancienne version/epoch refuse l'effet.

AUTO→ASSISTED invalide les grants automatiques : aucun nouveau départ automatique après la barrière de coupure. Un draft préparé n'est utilisable qu'après revalidation du contexte ASSISTED et émission par action humaine distincte. AUTO/ASSISTED→OFF interdit tout nouvel appel MCP et invalide les suggestions ; les retours MCP tardifs ne s'affichent pas comme prêts. ASSISTED/OFF→AUTO crée une nouvelle epoch et une borne d'entrants éligibles, sans relire/rejouer les anciens entrants ou réservations. Un doublon webhook ou callback ancien ne ressuscite pas un grant.

**Barrière cible distribuée** : sérialiser validation/départ avec la mutation de politique par société/canal et fil sur tous les workers, avec version de connexion et fencing ; une simple relecture SQL suivie d'un POST laisse une course. Définir le point linéarisé « départ transport » et acquitter la coupure après invalidation des départs encore évitables. Le verrou transactionnel actuel par workspace n'est pas une barrière réseau distribuée démontrée. Aucun verrou mémoire d'un seul process ne suffit. Une requête déjà remise au transport peut aboutir : afficher cette limite, ne pas promettre un rappel.

## 4. Types publics cibles pour maquettes et futur schéma

Les types suivants sont **proposés uniquement**, non générés dans `twenty-shared`, non servis par GraphQL. IDs opaques ; dates ISO UTC ; octets entiers ; tailles/durées/limites calculées serveur. `expectedContext`, `expectedRevision` et `clientRequestId` sont obligatoires pour les écritures proposées.

```ts
type BotMode = 'AUTO' | 'ASSISTED' | 'OFF';
type LocalBotMode = 'INHERIT' | BotMode;
type Channel = 'WHATSAPP' | 'EMAIL';
type Capability = { allowed: boolean; reasonCode: string | null };
type EffectiveBotPolicy = {
  workspaceId: string; channel: Channel; conversationId: string;
  companyMode: BotMode; localMode: LocalBotMode; effectiveMode: BotMode;
  reasonCode: 'INHERITED' | 'LOCAL_SET' | 'LOCAL_RESTRICTION' | 'COMPANY_RESTRICTION';
  policyRevision: string; localRevision: string; delegationEpoch: string | null;
  draft: Capability; humanSend: Capability; autoSend: Capability;
};
type MediaKind = 'IMAGE' | 'VIDEO' | 'VOICE' | 'FILE';
type MediaState = 'PENDING_FETCH' | 'UPLOADING' | 'PROCESSING' | 'READY'
  | 'FAILED' | 'QUARANTINED' | 'EXPIRED';
type MediaAsset = {
  id: string; workspaceId: string; kind: MediaKind; createdAt: string;
  name: string | null; mimeType: string; byteSize: number;
  durationMs: number | null; width: number | null; height: number | null;
  state: MediaState; errorCode: string | null;
  previewAllowed: boolean; downloadAllowed: boolean; accessExpiresAt: string | null;
};
type MailSenderIdentity = {
  mailboxId: string; fromAddress: string; aliasId: string | null; identityRevision: string;
};
type OutboundMessageContent =
  | { kind: 'TEXT'; text: string }
  | { kind: 'WHATSAPP_MEDIA'; mediaId: string; caption: string | null }
  | { kind: 'EMAIL'; sender: MailSenderIdentity;
      subject: string; text: string; sanitizedHtml: string | null;
      to: string[]; cc: string[]; bcc: string[]; attachmentIds: string[];
      replyKind: 'NEW' | 'REPLY' | 'REPLY_ALL' | 'FORWARD'; replyToMessageId: string | null };
type InboundMessageContent =
  | { kind: 'TEXT'; text: string }
  | { kind: 'WHATSAPP_MEDIA'; mediaId: string; caption: string | null }
  | { kind: 'EMAIL';
      envelope: { mailboxId: string; fromAddress: string;
        to: string[]; cc: string[]; bcc: string[] | null };
      subject: string; text: string; sanitizedHtml: string | null; attachmentIds: string[] };
type InboundMessage = {
  id: string; workspaceId: string; conversationId: string; channel: Channel; direction: 'RECEIVED';
  receivedAt: string; content: InboundMessageContent; mediaAssets: MediaAsset[];
};
type MessageDeliveryLedger = {
  clientRequestId: string; updatedAt: string; reasonCode: string | null;
  status: 'PENDING' | 'TRANSPORT_ACCEPTED' | 'DELIVERED_ATTESTED' | 'FAILED' | 'UNCONFIRMED';
};
type SentMessage = {
  id: string; workspaceId: string; conversationId: string; channel: Channel; direction: 'SENT';
  createdAt: string; content: OutboundMessageContent; mediaAssets: MediaAsset[];
  ledger: MessageDeliveryLedger;
};
type ConversationMessage = InboundMessage | SentMessage;
type DraftSuggestion = {
  id: string; conversationId: string; sourceMessageId: string;
  state: 'GENERATING' | 'READY' | 'UNAVAILABLE' | 'INVALIDATED';
  text: string | null; policyRevision: string; expiresAt: string | null;
};
type MailFolderRole = 'INBOX' | 'SENT' | 'DRAFTS' | 'ARCHIVE' | 'TRASH' | 'CUSTOM';
type MailFolder = {
  id: string; mailboxId: string; role: MailFolderRole; label: string;
  totalCount?: number | null; unreadCount?: number | null;
};
type DisplayError = { code: string; message: string; retryable: boolean; requestId: string };
```

`reasonCode` vaut `INHERITED` pour INHERIT, `LOCAL_SET` pour un choix local égal à la politique société/canal, `LOCAL_RESTRICTION` pour un choix local plus restrictif et `COMPANY_RESTRICTION` pour une ancienne exception devenue trop permissive et plafonnée.

`MediaAsset.createdAt` date la création de l'asset durable. `accessExpiresAt` décrit seulement l'expiration de l'accès temporaire courant, ou `null` sans accès émis ; il ne date pas la rétention de l'asset. L'expiration de cet accès ne met pas l'asset en état `EXPIRED` et ne modifie pas son identité. Rafraîchir via `hermesMediaReadAccess` exige un nouveau contrôle vivant workspace/fil/asset et droits ; un accès révoqué ou un asset indisponible ne sont pas renouvelés par simple possession de l'ancien accès. Les compteurs MailFolder sont optionnels et valent `null` ou sont absents si inconnus/non accessibles ; afficher « inconnu », jamais convertir en zéro. Un zéro exige une mesure autorisée.

`OutboundMessageContent` décrit uniquement la composition sortante proposée. Pour l'affichage d'un message reçu, l'expéditeur externe vient de l'enveloppe de réception authentifiée et de sa provenance : son adresse est informative et ne constitue jamais une identité autorisée d'émission. Cette enveloppe `InboundMessageContent.EMAIL` reste séparée du `sender` sortant ; aucune délégation de la boîte de l'expéditeur externe n'est exigée pour lire le message. `envelope.mailboxId` désigne la boîte locale de réception accessible, jamais la boîte de l'expéditeur externe. Les adresses to/cc sont filtrées serveur ; Bcc n'est retourné que si connu et autorisé, sinon `null`, sans révéler de destinataire caché. `mediaId` et `attachmentIds` référencent les `MediaAsset` autorisés de `InboundMessage.mediaAssets`, dans le même workspace/fil ; leurs métadonnées ne valent pas accès aux octets, soumis à `hermesMediaReadAccess`. Le HTML reçu est assaini côté serveur avant rendu.

`SentMessage` est le message sortant persisté, pas une preuve de livraison : `createdAt` date sa création et `direction:SENT` son sens. Son contenu et ses assets sont la version validée/persistée serveur, filtrée selon droits, avec les mêmes contrôles d'accès média. Le ledger distingue attente avant réservation réseau (`PENDING`), acceptation transport (`TRANSPORT_ACCEPTED`), livraison attestée par événement authentifié corrélé (`DELIVERED_ATTESTED`), échec établi (`FAILED`) et issue incertaine (`UNCONFIRMED`). Une copie Sent, un echo ou un accusé SMTP ne suffisent pas à attester la livraison. La réservation durable avant réseau passe en UNCONFIRMED tant qu'aucune issue n'est prouvée. Timeout/crash après remise possible reste UNCONFIRMED, sans retry aveugle ni nouvelle émission par actualisation. Le `clientRequestId` est opaque et scoped au workspace/fil ; sa lecture ne donne aucun droit de réémettre. Lecture/poll/réconciliation du statut exige les droits vivants du message et le contexte courant ; une réponse tardive d'un autre contexte est rejetée. Ces formes de lecture/envoi/ledger sont uniquement proposées et ne modifient aucun DTO v1.

L'identité `sender` est une sélection cible validée serveur : boîte exacte déléguée et adresse principale, ou alias exact explicitement autorisé (`aliasId` non nul), avec revision courante. Ni le domaine seul ni un From libre ne suffisent ; brouillon et envoi recontrôlent boîte/alias/connexion et permissions, puis l'envoi recontrôle au dernier départ évitable. Cette forme ne décrit pas une API d'identités actuellement disponible. Le contenu e-mail et les destinataires sont filtrés selon droits ; Bcc n'est jamais exposé à un lecteur sans autorisation d'accès aux données sortantes. Le HTML passé par le client à la composition n'est pas du `sanitizedHtml` de confiance : serveur valide/assainit avant persistance/rendu. Les objets média publics ne contiennent ni clé stockage, URL fournisseur, credential, chemin local, payload base64 ou identifiant d'instance.

| Interaction proposée, indisponible | Entrée / résultat cible |
|---|---|
| `hermesBotPolicy` | canal/fil → politique et capacités effectives |
| `hermesSetChannelBotPolicy` | canal/mode + contexte/revision/key → nouvelle politique ; admin au centre Réglages |
| `hermesSetConversationBotPolicy` | conversationId/localMode + contexte/revision/key → politique effective ; commande locale |
| `hermesCreateMediaUpload` puis `hermesFinalizeMediaUpload` | fil, kind, MIME/taille déclarés → autorisation courte scoped ; finalisation après contrôle des octets réels |
| `hermesMediaReadAccess` | mediaId, usage aperçu/téléchargement → accès court après contrôle vivant ; révocation et cache privés |
| Lectures inbox/mail, versions V3 cibles à définir | contexte/fil, ou mailbox/folder/thread accessibles + cursor/limit → page bidirectionnelle `ConversationMessage` (`InboundMessage` ou `SentMessage` avec ledger), métadonnées et assets autorisés ; statut ciblé par messageId sous les mêmes contrôles ; proposition de résultat versionné, pas réponse disponible des lectures v1 |
| `hermesInboxSendContentV3` | fil + OutboundMessageContent + contexte/revision/clientRequestId + draftId optionnel → `SentMessage`, incluant son `MessageDeliveryLedger` durable ; zéro nouveau départ lors d'une lecture du statut |
| `hermesMailFolders`, `hermesMailThreads`, `hermesSaveMailDraft` | mailbox/folder/thread scoped et pagination ; brouillon humain durable versionné, zéro émission |

Ce sont des noms de travail. Ne pas les appeler depuis les maquettes. Versionner le schéma/DTO avant raccordement ; ne pas étendre silencieusement le reply texte v1 avec des pièces jointes ignorées.

## 5. Médias WhatsApp de bout en bout

Réception cible : authentifier webhook et connexion, dériver workspace/instance côté serveur, dédupliquer identité provider, conserver métadonnées minimales et état `PENDING_FETCH`, puis récupérer via adaptateur serveur borné. Le provider peut fournir base64 mais ne le garantit pas. Le message reste lisible avec « média indisponible » si fetch échoue ; aucun remplacement silencieux par texte de succès. Persister identité provider nécessaire à la récupération sans exposer son enveloppe au client.

Stockage privé natif à réutiliser, scoped workspace avec relations composite message/asset et unicités tenant. Valider signature réelle des octets, MIME, taille, nom et limites de durée/dimensions ; ne pas faire confiance au Content-Type client. Refus formats dangereux, contrôle malwares/quarantaine à définir avant ouverture publique. Limites chiffrées restent à fixer après quotas/version cible vérifiés ; absence de limites validées interdit d'annoncer la capacité prête. Les téléchargements externes sont exclusivement serveur, avec protection SSRF/redirects/hosts et volumes bornés ; jamais une URL fournie librement au navigateur/provider.

Upload humain → finalisation → asset READY immuable → préécoute/aperçu → clic Envoyer → réservation ledger → transport → reçu. L'empreinte canonique couvre fil, destinataire, identité/version connexion, kind, texte/caption, hash des octets et attachments/identité expéditeur. Même clientRequestId + contenu différent = conflit ; même contenu/id = résultat stable. Réserver durablement `UNCONFIRMED` avant réseau ; timeout/crash sans preuve négative reste incertain, sans nouveau POST. Réutiliser lien canonical d'echo/provider. Ne pas inventer l'idempotence provider.

### Routes fournisseur documentées, non implémentées dans Hermès

Référence officielle Evolution **2.3.6**, commit `3454bec79f514995df9a5ea36a3554ab35cf1c82`, version installée inconnue. [Router envoi](https://github.com/evolution-foundation/evolution-api/blob/2.3.6/src/api/routes/sendMessage.router.ts), [router chat](https://github.com/evolution-foundation/evolution-api/blob/2.3.6/src/api/routes/chat.router.ts), [implémentation](https://github.com/evolution-foundation/evolution-api/blob/2.3.6/src/api/integrations/channel/whatsapp/whatsapp.baileys.service.ts#L2937).

| Usage cible | Route officielle serveur | Contraintes |
|---|---|---|
| Image/vidéo sortante | `POST /message/sendMedia/{instance}` | `number,mediatype,media` URL/base64, MIME/caption/filename optionnels ; pas de support universel codecs/taille déduit |
| Vocal sortant | `POST /message/sendWhatsAppAudio/{instance}` | audio URL/base64 ou multipart ; conversion par défaut Ogg/Opus mono48k, PTT ; `encoding:false` ne convertit pas WebM en Ogg |
| Média entrant | `POST /chat/getBase64FromMediaMessage/{instance}` | enveloppe provider `message:WebMessageInfo`, option conversion ; un ID CRM seul ne suffit pas |

Clé `apikey` et instance restent serveur ; contrôles workspace→instance et identité de connexion conservés. Le schéma existant refuse la même instance Evolution pour deux workspaces (`C/hermes-connectors/evolution/evolution-connection.schema.ts:45–65`). Ne pas le retirer pour mutualiser une boîte. Conserver aussi registre d'adaptateurs, isolation d'instance de service, contrôle providerConnectionId et grants existants. Aucune transcription/analyse média automatique ou pièce jointe transmise au MCP sans capacité spécifique auditée et permission explicite.

Enregistrement navigateur cible : geste humain → demande micro → enregistrer/arrêter → préécouter → annuler ou joindre → envoyer séparément. États permission refusée, micro absent/occupé, format non supporté, durée/volume limite, upload échoué et onglet interrompu ; libérer les pistes et URLs temporaires à annulation/sortie. Aucun auto-envoi à l'arrêt du micro. Tester négociation MIME Safari/Chrome/PWA et conversion réelle ; simulation de maquette sans permission micro réelle, clairement étiquetée.

## 6. E-mail : vraie boîte, fils et contenu sûr

Le chemin actuel extrait texte depuis MIME et répond en texte seul (`C/hermes-mail/hermes-mail.policy.ts:97–154`, service `:403–493`). Le fallback regex HTML n'est pas un assainisseur. Réutiliser compte connecté natif chiffré et délégation explicite ; ne pas découvrir/copier les comptes privés d'autres membres. `mailboxId` vise la boîte autorisée, `folderId` le dossier physique scoped ; rôles INBOX/SENT/DRAFTS sont mappings, pas des noms de dossiers IMAP supposés universels.

Conserver Message-ID/In-Reply-To/References normalisés et UIDVALIDITY+UID par dossier pour provenance/déduplication. Le sujet est affiché et aide la recherche, il ne suffit jamais à fusionner deux fils sans lien provider/RFC. Même objet chez deux correspondants ou deux sociétés reste distinct. Déplacement de dossier ne crée pas un second message ; réinitialisation UIDVALIDITY déclenche réconciliation contrôlée. Une copie Sent n'est pas une nouvelle preuve de livraison.

Composer : to/cc/bcc validés, Reply/Reply All excluent adresses propres/alias et doublons sans perdre les destinataires légitimes ; Forward crée une nouvelle émission avec contenu/pièces jointes choisi explicitement, pas reprise cachée d'une permission. Objet/headers sans injection CRLF, identité expéditeur autorisée. Brouillons humains versionnés, autosave sans émission, conflit concurrent visible. Les suggestions MCP restent séparées jusqu'au choix humain.

Conserver MIME utile, texte et HTML assaini avec version de politique ; bloquer scripts, formulaires, navigation dangereuse et ressources distantes par défaut, ne pas charger de pixels à l'ouverture. Rendre dans une surface isolée et vérifier liens/CID/attachments scoped. Pièces jointes passent le même contrat asset et permissions ; téléchargement `Content-Disposition` sûr, aucun accès fichier/URL arbitraire. La composition riche et `directUploadFile` natifs sont des patrons (`F/modules/activities/emails/hooks/useUploadEmailAttachment.ts:16–39`), pas preuve de leur raccordement Hermès.

## 7. Erreurs, états et recette requise

Codes **cibles** : `WORKSPACE_CONTEXT_MISMATCH`, `REVISION_CONFLICT`, `BOT_POLICY_RESTRICTION`, `BOT_POLICY_OFF`, `BOT_GRANT_STALE`, `DRAFT_INVALIDATED`, `MEDIA_NOT_AVAILABLE`, `MEDIA_TYPE_UNSUPPORTED`, `MEDIA_TOO_LARGE`, `MEDIA_PROCESSING_FAILED`, `CAPABILITY_UNAVAILABLE`. Conserver les codes existants pour opérations v1, notamment `CLIENT_REQUEST_CONFLICT`, `BOT_HUMAN_HANDOFF`, `MESSAGING_NOT_CONFIGURED`, `DELIVERY_UNCERTAIN`. Inexistant/interdit d'une autre société : réponse générique sans révéler son existence. Texte UI français et raison/action compréhensibles ; pas de stack/secret/payload provider. Incertain = `retryable:false`, actualiser/réconcilier sans réémettre.

États UI : chargement, vide, erreur, interdit, contexte changé, non configuré, non vérifié, traitement média, brouillon invalidé, transport incertain et succès d'acceptation distincts. Contrôles nommés/clavier/focus, lecteur sans autoplay, commandes accessibles de préécoute/annulation, mobile390px ; l'état n'est pas exprimé par couleur seule.

Matrice de recette ultérieure, **aucune ligne exécutée pour ce document** :

| Scénario | Résultat exigé |
|---|---|
| Choix local égal au parent, plus restrictif, INHERIT ou ancienne exception plafonnée | mode et raison respectivement LOCAL_SET/LOCAL_RESTRICTION/INHERITED/COMPANY_RESTRICTION cohérents ; aucune activation implicite |
| Désactiver les réponses automatiques puis OFF complet | commande V3 ASSISTED conserve le draft MCP ; OFF distinct l'invalide, aucun appel d'arrêt V2 supposé |
| Société AUTO, fil ASSISTED ; demande MCP puis clic humain | draft autorisé, zéro auto ; un seul message sur clic explicite |
| Société ASSISTED, essai local AUTO ; société OFF, essai local ASSISTED | refus serveur, mode effectif inchangé et raison visible |
| OFF complet pendant génération | aucun nouvel appel ; retour tardif invalidé ; réception/humain disponibles |
| AUTO→ASSISTED juste avant départ, deux workers | barrière bloque tout départ encore évitable ; aucune promesse de rappel du POST déjà parti |
| réactivation AUTO et replay anciens entrants/callbacks | aucun ancien départ ni génération sur backlog ; nouvelle epoch exigée |
| révocation opérateur/connexion ou ancien onglet A après switch B | draft/upload/lecture/send refusés avant effet, aucune fuite croisée |
| Accès média expiré, puis renouvellement autorisé/interdit | asset/createdAt inchangés ; nouvel accès court uniquement après recontrôle vivant ; aucun renouvellement hors droits |
| Dossier sans compteurs connus, puis total/unread mesurés à zéro | inconnu explicite puis zéro attesté ; aucun total étranger révélé |
| image/vidéo/vocal entrant et sortant | affichage/lecture puis refresh cohérents ; asset privé A inaccessible depuis B |
| micro refusé, annulation préécoute, fichier interdit/trop grand | erreurs actionnables ; zéro upload/envoi après annulation |
| timeout après remise média ; webhook echo concurrent | un seul effet et canonical stable ; incertain sans retry aveugle |
| E-mail entrant d’un expéditeur externe puis composition sortante | expéditeur reçu affiché selon provenance/droits, sans délégation requise ; adresse reçue jamais utilisable comme autorisation d’émission |
| E-mail avec boîte/From/alias non autorisés, revision révoquée | refus serveur avant émission, même dans le bon domaine ; seule identité exacte déléguée admise |
| e-mail HTML/CID/attachment, Reply All, Forward, Sent/Drafts | rendu sûr, bons destinataires/fils/dossiers après refresh, zéro pixel distant implicite |

Vérifications de cette livraison : lectures règles/mission/plan/contrats V2/audit final et sources ciblées au SHA annoncé ; confrontation des signatures et snippets, contrôle documentaire whitespace. Aucun code applicatif, migration, build/test runtime, DB, secret, provider, navigateur métier ou envoi. Les maquettes restent simulées ; la publication et la revue par SHA sont coordonnées par root. Capacités externes/version installée/limites médias restent non vérifiées ; gate visuelle avant câblage maintenue.
