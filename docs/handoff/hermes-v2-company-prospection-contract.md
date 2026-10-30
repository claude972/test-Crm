# Hermès V2 — contrat sociétés et prospection

Statut : **proposé, non implémenté**. Autorisation actuelle : maquettes et contrats seulement. Aucun câblage avant choix de la piste Pipedrive, validation des maquettes détaillées et autorisation explicite d’implémenter. Français par défaut acquis ; respecter une préférence explicite différente. Web/PWA uniquement ; stack React/Vite/Linaria/Lingui/Jotai et NestJS/TypeORM/PostgreSQL/Redis/GraphQL conservée.

Révision source relue : `333ba534927e177c90b35eb4157d75d8d767dec4`, worktree `p1-hermes-integration`, branche `feat/codex-hermes-integration`. Les chemins ci-dessous sont relatifs au dépôt, sur ce SHA ; `S` signifie `apps/crm/ui/packages/twenty-server/src`, `F` signifie `apps/crm/ui/packages/twenty-front/src`. Les numéros indiquent des lignes effectivement inspectées. Les propositions de noms V2 ne constituent ni un schéma généré ni des API disponibles.

Consignes lues : AGENTS.md et DESIGN.md du dossier parent et de la source, `apps/crm/ui/AGENTS.md`, `docs/handoff/README.md`, `docs/stabilization/p0-status.md` ; mission V2 et plan/prompt dans `p0-missions`. AGENTS.md/DESIGN.md sont absents du worktree sparse `p0-missions` : les règles applicables sont reprises du parent et de la source. La décision propriétaire Pipedrive remplace les anciennes directions visuelles pour cette V2. Aucun service, secret, base de données ou checkout original consulté pour ce contrat.

## 1. État actuel, preuve et écart

| État actuel | Preuve au SHA source | Écart V2 |
|---|---|---|
| Codé : société exploitante = workspace, adhésion native | `S/engine/core-modules/workspace/structure-dashboard/structure-dashboard.service.ts:154` relit UserWorkspace, utilisateur actif et workspace ACTIVE/CREATED | Une fiche CRM Company n’est jamais la société exploitante. Ne créer aucune table « société » doublant Workspace. |
| Codé : création native d’une société pour un utilisateur existant | `S/engine/core-modules/auth/auth.resolver.ts:698` `signUpInNewWorkspace(input?)` → workspace + loginToken ; `F/modules/auth/sign-in-up/hooks/useSignUpInNewWorkspace.ts:33` expose `createWorkspace` | Relier l’action approuvée à ce flux ; ne pas inventer une mutation GraphQL `createWorkspace` Hermès. Onboarding et politiques/licences natifs conservés. |
| Codé : changement natif par domaine et authentification | `F/modules/navigation/components/MultiWorkspaceDropdown/internal/components/AvailableWorkspaceItem.tsx:24` ; `F/modules/auth/utils/availableWorkspacesUtils.ts:25` choisit Verify avec loginToken, invitation ou connexion ; `F/modules/domain-manager/hooks/useRedirectToWorkspaceDomain.ts:23` ne redirige pas si multi-workspace désactivé | Vérifier la configuration réellement déployée et le parcours A/B ; aucun switch garanti par simple modification d’un label/filtre. |
| Codé : protection partielle contre réponse d’ancienne session | `F/modules/auth/utils/sessionGenerationStore.ts:3` génération en localStorage ; `F/modules/apollo/services/ApolloFactory.ts:100,198,215` contexte de requête et traitement d’erreurs anciennes | Ne prouve pas que deux onglets avec cookies partagés ne peuvent écrire sous la mauvaise société. Retry de session superseded à auditer avant toute mutation V2. |
| Codé : synthèse commune en lecture seule | `S/engine/core-modules/workspace/structure-dashboard/structure-dashboard.resolver.ts:48,62` ; service `:83,114,238` | Seulement quatre comptes d’objets existants, pas des KPI commerciaux/revenus/campagnes supplémentaires. Aucun changement de contexte d’écriture. |
| Codé : import manuel et qualification avec fiches natives | `S/engine/core-modules/hermes-prospection/hermes-prospection.resolver.ts:47,60,73` ; service `:102,173,195` | Suivi commercial, affectation, tags, prochaine action et segments non portés par les types actuels de staging. |
| Codé : entrée scraping signée | `S/engine/core-modules/hermes-prospection/intake/hermes-intake.controller.ts:17,22` ; service `:54,68,95,107` | Connexions env-only, non vérifiées ici ; pas de gestion administrateur persistante ni preuve de réception externe scrapingHermes. |
| Codé : staging borné JSONB, transaction/verrou par workspace | `S/engine/core-modules/hermes-prospection/hermes-import-state.service.ts:25,40,52,66` ; `utils/hermes-import-policy.ts:9` dans ce même module | 40 lots × 100 lignes, 100 campagnes référencées, 2 000 000 octets ; persistance paginée et politique de conservation à décider avant montée en charge. Ne masquer aucun rejet par une troncature UI. |
| Codé : accès staging strictement admin sans restrictions | `S/engine/core-modules/hermes-prospection/hermes-prospection-access.service.ts:20,50` | Le rendre commercial exige des ACL ligne/champ et délégations explicites. Aucun élargissement implicite. |
| Codé : brouillon natif, aucun envoi par le bridge Hermès | resolver prospection `:86` garde feature flag + email-group ; service `:212,336,365` crée messageList/messageListMember/messageCampaign DRAFT | Le bridge expose toujours `smtpCampaignSending:false` à `:58`, même si un driver SMTP natif existe maintenant. Distinguer capacité du bridge, présence du driver et configuration vérifiée. |
| Codé : moteur campagne complet natif | `S/modules/emailing/resolvers/emailing-send.resolver.ts:83,126,142,174,204` | Réutiliser ces opérations ; compléter les parcours après validation, sans deuxième queue/moteur. |
| Codé : SMTP natif avec résultat incertain protégé | `S/engine/core-modules/emailing-domain/drivers/smtp/smtp-emailing-domain-driver.ts:167,178,245,364` ; `S/modules/emailing/services/message-campaign-delivery.service.ts:429` | SMTP accepté n’est pas livré. Aucun serveur/compte fournisseur vérifié ni envoi effectué dans cette mission. |
| Codé : oppositions natives réappliquées au staging et à l’audience | service prospection `:381` ; `S/modules/emailing/services/message-campaign-audience.service.ts:69` ; `message-suppression.service.ts:118,240` | Recette course opposition/envoi, réimport et migration requise. Pas de réabonnement implicite. |
| Codé : locale initiale dépend navigateur/stockage/URL | `F/utils/i18n/initialI18nActivate.ts:7,11,23,31,36` ; ApolloFactory `:101` privilégie locale membre | FR par défaut non garanti : définir provenance du choix et migration des anciens défauts automatiques, pas seulement changer le fallback. |

« Codé » indique uniquement une preuve statique au SHA. Ce contrat ne revendique aucun test runtime, accès fournisseur, CI, preview ou connexion vérifiée supplémentaire.

## 2. Société, session et dashboards

### Identité et flux à conserver

Le contexte d’écriture est **un unique workspace authentifié**, déterminé par l’authentification native côté serveur. `workspaceId`, `userWorkspaceId`, rôles et permissions ne proviennent jamais d’un sélecteur libre envoyé par le navigateur. `personId` et `companyId` désignent des fiches CRM appartenant à ce workspace ; le même nom/email dans B ne donne aucun droit sur A. Les correspondances externes sont indexées par workspace + connexion + fournisseur + identifiant externe.

Ajouter une société réutilise `signUpInNewWorkspace` puis l’échange natif du loginToken et la redirection native. Le hook existant `:72–84` échange directement le token si multi-workspace désactivé, sinon redirige vers Verify sur le domaine de la nouvelle société. Respecter onboarding, activation, CAPTCHA/auth fournisseur/MFA et abonnement éventuels ; ne pas simuler un workspace prêt à écrire. Un échec de logo après création n’autorise pas à recréer aveuglément une deuxième société.

Changer de société réutilise AvailableWorkspace et ses URLs/authentifications natives. `hermesAuthorizedStructures` est un inventaire autorisé, pas un émetteur de session ; `requiresAuthentication:true` exige le flux natif de la cible. Si le mode de déploiement ne permet pas un changement sûr, désactiver les écritures jusqu’à authentification/refresh confirmé, avec erreur explicite.

### Contrat d’isolation proposé, à vérifier avant raccordement

Chaque écran/action conserve un contexte attendu `{workspaceId, userWorkspaceId, sessionGeneration}` capturé au chargement. Les requêtes, souscriptions et jobs transportent le contexte explicitement dans leur enveloppe interne. Les écritures serveur doivent comparer le workspace attendu de la page au contexte authentifié réel avant toute mutation ; une valeur « attendue » sert uniquement de garde de concordance, jamais de sélection du tenant. Le transport exact doit être coordonné avec les gardes natives ; aucun nouvel endpoint de session Hermès n’est proposé.

Un changement/révocation invalide les requêtes en vol, données optimistes, sélections de lignes, éditeurs, caches GraphQL/métadonnées, résultats de recherche, souscriptions et fichiers temporaires liés à A. Une réponse A ne peuple jamais B. Clés de cache comprenant workspace + principal + portée des permissions ; invalidation lors de changement de rôle et réauthentification. La vue commune a une clé distincte avec ensemble trié des workspaces autorisés et aucun cache public. Aucun service worker ne stocke des données authentifiées hors ligne sans contrat d’isolation spécifique.

Deux onglets : privilégier les domaines natifs quand disponibles ; vérifier les attributs effectifs de cookies et le domaine API. Ne présumer ni indépendance de cookies ni sécurité du seul localStorage. Si une session B remplace A sur une même origine, l’onglet A devient bloqué, purge ses résultats et demande rechargement/authentification. Aucune mutation A ne doit être rejouée automatiquement avec B, y compris le retry `supersededSessionRetryLink`. Contrôler aussi REST/streaming/uploads, pas seulement GraphQL. Une mutation dont l’issue est inconnue est réconciliée par clé d’idempotence, jamais retransmise aveuglément.

### Contrats dashboard existants, sans mutation nouvelle

- `hermesAuthorizedStructures: HermesAuthorizedStructure[]` : `{workspaceId,displayName,isCurrent,requiresAuthentication,workspaceUrls}` ; sessions standard ou workspace-agnostic, pas API key/app/OAuth, ni impersonation/playground. Preuve : resolver `:31–43`, DTO `:33–49`.
- `hermesStructureDashboard(input?: {workspaceIds?,periodStart?,periodEnd?})` : `{generatedAt,periodStart,periodEnd,partial,structures:[{structure,metrics}],totals}`. Valeurs métriques nulles si FORBIDDEN/UNAVAILABLE ; AVAILABLE/PARTIAL distincts ; contributeurs/total présents. DTO `hermes-structure-dashboard.dto.ts:13,24,63,81`.
- Maximum 100 sociétés, IDs uniques ; bornes temporelles `[début,fin)` sur `createdAt`, début strictement antérieur à fin. Sélection vide = aucun élément ; omission = sociétés autorisées et découvrables. Workspace caché uniquement en sélection explicite singleton du workspace courant. Un ID interdit/inconnu/révoqué dans la sélection fait échouer toute la portée avec erreur générique, pas de sous-ensemble silencieux (service `:72–105,147,208,267`).
- Membres actifs relus avant restitution, auth fournisseur/MFA évaluée par société, permissions natives objet/ligne/champ appliquées par `getRepositoryWithContextPermissions` (service `:114,175,246,263`). Une métrique interdite n’est pas zéro. Les quatre métriques comptent Company/Person/Opportunity/Task ; elles ne mesurent pas le chiffre d’affaires ni les conversions de prospection.
- Vue société : requête singleton. Vue commune : lecture seule ; chaque ligne nomme sa société. Un lien « ouvrir/travailler » déclenche le changement natif et vérifie le nouveau contexte avant toute édition. Aucun bouton d’écriture en contexte commun ; exports éventuels sont soumis à une autorisation distincte et ne sont pas acquis.

## 3. Permissions : état existant et cible proposée

| Action | Existant | Cible V2 proposée |
|---|---|---|
| Lister sociétés / dashboard | Session utilisateur autorisée, adhésion et ACL natives par société | Conserver ; rôle admin global sans adhésion ne donne pas accès |
| Ajouter société | Flux natif signUpInNewWorkspace sous utilisateur authentifié | Conserver les politiques natives, aucune élévation de licence |
| Lire imports / recevoir sous opérateur / qualifier / créer brouillon Hermès | Admin workspace actif, lecture/écriture de tous objets, aucune restriction ligne/champ | Maintenir jusqu’à couverture ACL de la nouvelle persistance ; ensuite permissions distinctes réception, lecture, qualification, affectation, campagne |
| Consulter/éditer un prospect | Permissions natives Person/Company pour les fiches, staging admin uniquement | Commercial voit ses lignes ou celles explicitement partagées, restrictions champ inchangées ; responsable d’équipe selon périmètre explicite ; admin selon rôle natif |
| Affecter | Pas de contrat Hermès actuel | Droit dédié + cible membre actif du même workspace ; aucun propriétaire externe ni compte révoqué |
| Créer tâche/note/rdv | Objets natifs présents | Autorisation native de chaque objet et de toutes ses relations ; aucun droit hérité du seul accès prospect |
| Campagne preview/test/planification/envoi/annulation | `SettingsPermissionGuard(WORKSPACE)`, email-group, feature ; envoi payant + crédits (`emailing-send.resolver.ts:47,90–106`) | Ne pas contourner ces gardes ; une permission commerciale proposée ne suffit pas à envoyer |
| Opposition | Services natifs, tokens opaques pour parcours public | Ajouter une opposition avec preuve/acteur ; suppression ou réabonnement ne sont jamais un effet de qualification/import |
| Intégration scrapingHermes | Signature connexion puis opérateur configuré, encore soumis à access.assertAllowed | Secret scope strict réception, pas session commerciale ; révocation opérateur/connexion bloque réception |

Ne pas exposer staging brut à un rôle restreint avant tests objet/ligne/champ et validation de chaque relation. API keys/apps refusées sur les opérations Hermès actuelles. Les opérations emailing natives acceptent davantage de principaux (`:47–58`) : le frontend V2 utilisateur ne doit pas inventer une délégation d’application ; conserver la sécurité native et ne pas présenter des capacités hors droits.

## 4. Prospection : contrat existant à réutiliser

### Réception scrapingHermes

`POST /webhooks/hermes/intake/:connectionId`, JSON UTF-8 brut, headers `x-hermes-timestamp`, `x-hermes-nonce`, `x-hermes-signature`. Signature existante : HMAC-SHA256, clé hexadécimale côté serveur, octets signés `v1\n{connectionId}\n{timestamp}\n{nonce}\n` suivis du corps brut ; signature `v1=` + 64 caractères hex, comparaison constante. Timestamp secondes sur 10 chiffres ±300 s ; nonce UUID v4 ; corps ≤2 000 000 octets (`hermes-intake-signature.ts:3–39`). Ne re-sérialiser le JSON ni avant signature côté source ni avant vérification côté réception.

Corps strict : `{externalBatchId,name,sourceUrl,collectedAt,rows:[{email,companyName,firstName?,lastName?,jobTitle?,website?,phone?}]}`, 1–100 lignes, champs inconnus refusés (`hermes-intake.schema.ts:39`). Aucun workspace/acteur contrôlé par le payload. La connexion serveur détermine workspace/opérateur, source SCRAPING autorisée, limite de 1–60 requêtes/minute (10 par défaut), secret unique par connexion (`:3–33`). Ces paramètres sont env-only à ce SHA, pas administrables depuis un formulaire V2 existant.

Le nonce déjà consommé donne 409 ; renouveler timestamp/nonce/signature pour une reprise technique du même **externalBatchId et contenu identique**. Le lot externe est préfixé par connectionId (`service.ts:89–92`), puis dédupliqué par empreinte de contenu normalisé. Une nouvelle signature ne contourne pas le conflit de contenu. Réponse 200 : `{batchId,externalBatchId,replay,rowCount,intakeConnectionId,qualificationRequired:true}`. Aucun contact, campagne ou envoi automatique à la réception. Distinguer réception acceptée et lignes valides.

Erreurs existantes (codes complets) : 400 `HERMES_INTAKE_RAW_BODY_REQUIRED`/`HERMES_INTAKE_PAYLOAD_INVALID`, 401 `HERMES_INTAKE_AUTHENTICATION_FAILED` générique (connexion inconnue/désactivée/signature invalide), 409 `HERMES_INTAKE_SIGNED_REQUEST_REPLAYED`, 413 `HERMES_INTAKE_BODY_TOO_LARGE`, 429 `HERMES_INTAKE_RATE_LIMITED`, 503 `HERMES_INTAKE_CONFIGURATION_UNAVAILABLE` (`hermes-intake.service.ts:46–105`) ou `HERMES_INTAKE_REPLAY_STORE_UNAVAILABLE` (`hermes-intake-replay.service.ts:52–54`). Pas de secret/payload brut en erreur ou log. UI : état non configuré/configuré non vérifié/connecté vérifié/erreur, jamais « connecté » par simple sauvegarde. Historique détaillé et reprise par ligne sont des extensions à créer.

### API metadata GraphQL actuelles

| Opération | Entrée / sortie utile | Règles |
|---|---|---|
| `hermesImportBatches` | État v1 : lots, campaignIds, capabilities | Pas de pagination actuelle ; GraphQLJSONObject ; ne promettre aucune capacité SMTP sur la valeur false du bridge |
| `hermesCreateImportBatch(input)` | externalBatchId/name/sourceUrl/collectedAt/rows → `{batch,replay}` | IDs stables, conflit si même ID/contenu différent ; erreurs par ligne ; provenance MANUAL ou SIGNED_INTAKE |
| `hermesQualifyImportRows(input)` | batchId, rowIds, professionalPurpose, privacyNoticeUrl, informationMethod → `{batchId,rows}` | finalité 8–1000 caractères, notice HTTPS, information already-informed ou first-contact-notice ; ≤100 IDs uniques |
| `hermesCreateCampaignDraft(input)` | name, subject, rowIds → `{campaignId,listId,status:'DRAFT',sendingAvailable:false}` | ≤100 lignes qualifiées, non opposées, email primaire actuel concordant ; feature/email-group natives |

Sources : resolver `:47–99`, DTO `dto/hermes-prospection.input.ts`, service `:47,65,102,212`. Les fiches Company/Person sont créées ou réutilisées par ORM natif avec permissions, email primaire et additionnel normalisés ; ambiguïté, archive et incohérence exigent revue. Les champs existants ne sont pas écrasés ; téléphone/site restent provenance tant que leur mapping natif n’est pas validé. Qualification et staging ont des transactions distinctes ; les IDs stables permettent une reprise, pas une revendication d’atomicité interbases. Une panne après création native doit retrouver les mêmes fiches.

États actuels de ligne : `pending | invalid | duplicate | suppressed | qualified | conflict` (`types/hermes-prospection.types.ts:11`). Ce sont des états de réception/qualification, **pas un pipeline commercial**. Ne pas remplacer l’un par l’autre.

## 5. Schéma et API V2 proposés — à créer après validation

### Persistance et liens natifs

Proposition : normaliser les lots et lignes en tables paginées serveur, avec `workspaceId` obligatoire ; garder la donnée commerciale sur les fiches natives et ajouter uniquement les relations/champs manquants par le mécanisme de métadonnées officiel. Aucune seconde fiche contact/entreprise, aucun second objet campagne. Les objets Task/Note/CalendarEvent et leurs relations existent sous `S/modules/task/standard-objects/`, `note/standard-objects/`, `calendar/common/standard-objects/` ; vérifier les capacités d’écriture/rendez-vous et intégrations Cal.diy avant de les annoncer raccordées.

| Entité/extension proposée | Champs et invariants |
|---|---|
| ImportBatch / ImportRow normalisés | IDs existants conservés ; workspaceId, externalBatchId scoppé connexion, fingerprint, provenance, timestamps, erreurs, statut qualification, liens Person/Company. Unicité `(workspaceId,connectionId,externalBatchId)` avec convention explicite pour MANUAL ; lignes indexées `(workspaceId,batchId,id)` |
| Qualification | Finalité, notice/version, méthode, acteur/date, décision de revue et raison ; historique append-only, aucun booléen « consentement » déduit du scraping |
| Suivi commercial lié à Person/Company | ownerUserWorkspaceId, étape, tags natifs si disponibles, prochaine action liée Task, dernière interaction attestée, issue/raison, revision ; tous IDs et relations même workspace |
| Historique commercial | acteur, source, ancien/nouvel état, horodatage ; liens note/tâche/message/rdv/opportunité natifs ; pas de corps de message privé recopié en journal global |
| Segment | expression de filtres autorisés et versionnée, accès/acteur, renvoi vers listes/audiences natives ; aucun carnet d’adresses dupliqué |
| Idempotence / audit | clé `(workspaceId,acteur,opération,key)` + empreinte + résultat stable ; mutation concurrente avec expectedRevision ; audit sans secret |

La suppression marketing native demeure l’autorité durable hors cycle de rétention des lots. Ne pas la recopier dans un booléen modifiable du prospect. Les migrations utilisent générateur/commandes officielles de la version courante (règles `apps/crm/ui/AGENTS.md`), avec up/down, comptages/empreintes de reprise, IDs/provenance/liens/statuts/oppositions préservés, unicités tenant, pas de SQL manuel sur une base existante. Pas de Supabase ajouté ; les contrôles workspace/ORM/ACL de cette stack restent obligatoires.

### Contrats d’interaction proposés (noms de travail, indisponibles)

Toutes les écritures sont sous session standard native, contexte attendu concordant, rôle actif relu ; entrée sans workspace de sélection. Résultat inclut workspaceId, revision et identifiants utiles pour interdire l’application d’une réponse d’un autre contexte.

| Nom proposé | Entrée / résultat | Contrôles |
|---|---|---|
| `hermesImportReceipts` | filtre état/source/période + cursor/first → edges/pageInfo | pagination stable crééeAt+id, limite documentée ; données brutes restreintes |
| `hermesProspects` | filtres recherche/owner/tags/étape/source/prochaine action + curseur → fiches CRM autorisées et suivi | filtrage serveur avant pagination/total ; aucune fuite par compte global |
| `hermesUpdateProspect` | personId, expectedRevision, idempotencyKey, patch owner/étape/tags → suivi révisé | affectation membre actif même société ; champs explicitement permis ; événement audité |
| `hermesLinkProspectActivity` | personId + ID d’une tâche/note/message/rdv natif + expectedRevision → lien | ne crée pas un moteur tâche/calendrier ; contrôle chaque extrémité et permission de lecture/écriture |
| `hermesConvertProspect` | personId, issue + éventuel opportunityId, expectedRevision, key → mêmes fiches + résultat | conversion ne duplique pas Person/Company ; création Opportunity seulement si demandée/autorisée ; aucune conversion sur ouverture |
| `hermesPreviewProspectSegment` | filtres/version → aperçu natif, exclusions par raison + total autorisé | service d’audience natif et oppositions courantes ; aucune permission d’envoi conférée |

Conserver les API de qualification/brouillon actuelles quand leur entrée suffit ; ajouter pagination/versionnement sans changer silencieusement leurs formes v1. La résolution d’un conflit de doublon doit être une action explicite proposée séparément : jamais fusion destructive automatique. Batch partiel : succès et erreurs par ligne stables ; aucune reprise globale déclenchant un double effet.

Pipeline commercial proposé : à qualifier → qualifié → à contacter → contacté → relance prévue → rendez-vous → converti/perdu. Définir les transitions permises et les raisons ; `contacté` nécessite une interaction humaine ou une acceptation d’envoi attestée, `rendez-vous` un événement natif confirmé, `converti` une décision explicite et lien CRM. Une opposition domine l’éligibilité d’envoi à toute étape, sans effacer l’historique ou falsifier la qualification. Actions manuelles, tâches et relances ne déclenchent pas automatiquement une campagne.

Erreurs V2 proposées : `WORKSPACE_CONTEXT_MISMATCH`, `PROSPECT_NOT_AVAILABLE` (inexistant/interdit générique), `ASSIGNEE_NOT_AVAILABLE`, `REVISION_CONFLICT`, `IDEMPOTENCY_CONFLICT`, `QUALIFICATION_REQUIRED`, `SUPPRESSED_RECIPIENT`, `CAPACITY_LIMIT`, `CAPABILITY_UNAVAILABLE`. Conserver les codes natifs lorsqu’une opération native échoue. Traduire le texte affiché en français sans traduire les codes ; aucune réponse d’erreur ne révèle l’existence d’une autre société.

## 6. Audiences, campagnes et résultats : réutiliser le moteur natif

Le bridge Hermès ne fait que sélectionner des fiches qualifiées et ouvrir une campagne native DRAFT. Le contenu, les listes, les tokens de désinscription, les files, la planification, l’envoi et les statistiques restent dans EmailingModule. Les réglages persistants expéditeur/suivi/politiques sont dans le centre Réglages de la société ; l’écran campagne contient contenu, audience, date et liens contextuels. L’absence de connexion ou de licence désactive l’action avec motif ; aucune fausse confirmation.

| Étape | API native existante | Contrat V2 |
|---|---|---|
| Rédiger/aperçu | messageCampaign natif + `previewMessageCampaignSend({campaignId,scheduledAt?})`, resolver `:204` | Valider contenu, expéditeur autorisé, notice premier contact, sujet, audience et droits avant proposer l’envoi ; aucune émission en DRAFT/preview |
| Audience | `previewMessageCampaignAudience({listId,unsubscribeTopicId?})`, `:174` | Doublons et exclusions expliqués, respect ACL ; photo d’aperçu non suffisante pour envoyer plus tard |
| Test | `sendMessageCampaignTest({toAddress,unsubscribeTopicId?,subject,body,fromAddress})`, `:142` | Cette API émet réellement ; V2 doit restreindre à un destinataire synthétique autorisé de recette côté serveur, pas seulement un champ UI. Aucun vrai prospect dans cette phase |
| Planifier/envoyer | `sendMessageCampaign({campaignId,scheduledAt?})`, `:85,108` | mêmes feature/email-group, WORKSPACE, abonnement payant et crédits ; date future validée dans service natif ; confirmation du workspace, destinataires éligibles et compte expéditeur |
| Annuler | `cancelMessageCampaign({campaignId})`, `:126` | SCHEDULED → DRAFT (déprogrammation), SENDING → CANCELED et lignes QUEUED annulées ; ne rappelle pas un message accepté/en vol (`message-campaign-lifecycle.service.ts:132–192`) |
| Suivre | CampaignDelivery et statistiques natives | API de présentation à relire/compléter, pas un nouveau journal d’envoi ; distinguer données indisponibles et zéro |

Revérifier exclusions, permissions de l’acteur/délégation et statut de connexion avant matérialisation puis juste avant émission ; les jobs système natifs exécutent en contexte workspace (`message-campaign-delivery.service.ts:65,143`), ils ne prouvent pas à eux seuls que la révocation de l’auteur suspend une campagne programmée. Ce comportement doit être défini/testé : proposition V2, mise en attente si auteur ou autorisation d’envoi révoqué, réautorisation explicite requise. L’annulation d’un effet SMTP déjà accepté est impossible ; afficher la limite exacte.

Oppositions : adresse normalisée + société + portée globale/topic selon modèle natif, motif et source vérifiés, date/preuve ; ne pas élargir une opposition à toutes les sociétés sans décision explicite. Réimport ou changement de propriétaire ne réabonne jamais. Le refus de suivi reste distinct d’une opposition marketing (`message-campaign-audience.service.ts:81–97`). La course opposition pendant campagne doit bloquer toutes les émissions encore évitables à la remise au driver. Vérifier le sender natif et conserver ses recontrôles (`message-campaign-batch-delivery.service.ts:158`).

Une métrique affiche son périmètre, sa période, son horodatage et sa source :

- **Accepté SMTP/fournisseur** : reçu positif du transport, pas livraison. Le champ legacy `deliveredRecipients` du driver SMTP désigne cette acceptation (`smtp-emailing-domain-driver.ts:167`).
- **Livré attesté** : événement authentifié corrélé à workspace/connexion/message. Sans événement exploitable : inconnu/non disponible, jamais 100 % livré.
- **Échec** : rejet confirmé ; **issue incertaine** : reçu perdu ou timeout après remise possible. Le natif porte `SEND_OUTCOME_UNCONFIRMED`, n’inviter aucun retry automatique (`message-campaign-delivery.service.ts:404,429,475` ; lifecycle `:229,243`).
- **Réponse** : message entrant effectivement relié à la fiche/campagne ; ne pas inférer une réponse d’un clic ou d’un rendez-vous isolé. Corrélation à spécifier et tester.
- **Ouverture observée/clic observé** : événement de tracking sous politique autorisée, pas preuve de lecture humaine ni conversion. Tracking OFF par défaut et refus individuel prioritaire ; pas de pixel/lien de suivi généré en OFF. Les statistiques natives existent (`message-campaign-statistics.service.ts:60,217`), leur exposition UI doit conserver cette sémantique.

## 7. Contrat minimal pour les maquettes Claude

Types ci-dessous **proposés pour la présentation**, sans fichier TypeScript ni contrôleur ajouté. Ils décrivent les états à montrer et ne remplacent pas les DTO existants.

```ts
type ViewScope =
  | { kind: 'company'; workspaceId: string; writable: boolean }
  | { kind: 'common'; workspaceIds: string[]; writable: false };
type ViewState = 'loading' | 'ready' | 'empty' | 'error' | 'forbidden'
  | 'reauthentication-required' | 'context-changed';
type Capability = { allowed: boolean; reasonCode?: string };
type ProspectStage = 'to-qualify' | 'qualified' | 'to-contact' | 'contacted'
  | 'follow-up-planned' | 'meeting' | 'converted' | 'lost';
type DisplayError = { code: string; message: string; retryable: boolean };
type MetricValue = {
  value: number | null;
  evidence: 'smtp-accepted' | 'provider-delivered' | 'reply-observed'
    | 'open-observed' | 'click-observed';
  available: boolean;
  observedAt: string | null;
};
```

`writable` et `Capability.allowed` sont calculés depuis l’autorisation réelle, jamais une élévation UI. Le scope commun est une sélection de lecture ; il n’est jamais transmis comme contexte d’une mutation. Les états `empty` et `forbidden` ont un texte différent, aucun compte zéro utilisé à la place d’un refus. `retryable:false` obligatoire sur effet d’envoi incertain ; un bouton « actualiser l’état » peut réconcilier sans réémettre.

Séquence d’écrans proposée pour la piste approuvée :

1. En-tête : société courante visible ; sélecteur sociétés autorisées ; « vue commune » identifiée lecture seule ; « ajouter une société » mène au flux natif. À l’entrée commune, masquer les actions d’écriture et proposer d’ouvrir explicitement une société.
2. Dashboard société ou commun : carte/ligne nommée par société, période et fraîcheur ; KPI indisponibles avec raison ; action d’ouverture vers authentification native, jamais édition depuis un agrégat.
3. Prospection → Réceptions : provenance scrapingHermes ou dépôt manuel, reçus/erreurs et qualification requise ; connexion en lecture seule et lien vers Réglages. Une ligne invalide est consultable ; import accepté ne signifie pas prospect qualifié.
4. Qualification → détail lot : doublons, conflits et oppositions visibles, choix humain et notice/finalité ; affectation seulement si autorisée. Conflit sans fusion automatique ; réessai conserve les IDs.
5. Base prospects → fiche native : recherche/filtres/tags/propriétaire/étape, prochaine action et historique ; tâches/notes/messages/rdv reliés aux mêmes fiches. Bouton « créer une audience » propose une revue, jamais un envoi implicite.
6. Audience → campagne native : exclusions expliquées → contenu/aperçu → brouillon → test synthétique autorisé → revue finale société/expéditeur/audience/date → programmation ou envoi, puis annulation selon état. Les maquettes montrent ces étapes comme cible, aucune action réelle raccordée actuellement.
7. Résultats : accepté, livré attesté, échec, incertain, réponse et ouverture observée distincts ; bouton de réconciliation sur incertain, aucune relance automatique. Réglages persistants accessibles par liens contextuels.

Exemples Given/When/Then obligatoires dans la recette et les états des maquettes :

| Étant donné | Quand | Alors |
|---|---|---|
| U1 membre A et pas C | U1 force C dans la synthèse | toute la requête est refusée, aucun nom ni compteur C |
| onglet affichant A, session remplacée par B | clic « affecter » depuis cet ancien onglet | contexte changé, zéro écriture dans A ou B, rechargement requis |
| même lot signé déjà reçu | reprise avec nouveau nonce et contenu identique | mêmes IDs et replay=true, aucune nouvelle fiche/campagne |
| prospect opposé avant réimport | le lot est reçu puis qualifié | opposition durable, aucune réactivation ni audience éligible |
| campagne brouillon et transport disponible | sauvegarde ou aperçu | zéro émission, statut DRAFT conservé |
| campagne programmée, opposition après aperçu | le job prépare l’émission | destinataire exclu au dernier contrôle évitable, raison affichée |
| reçu SMTP perdu après DATA | reprise du worker ou actualisation UI | issue incertaine/quarantaine, aucun deuxième envoi |
| préférence EN explicitement choisie | connexion puis passage A → B | EN conservé ; compte neuf sans préférence reste FR |

## 8. Phases, responsabilités et recette requise

| Phase après validation des maquettes | Propriétaire / dépendance | Patrons/fichiers concernés | Critères de sortie |
|---|---|---|---|
| Contrat final et droits | Codex + revue Claude ; décisions ci-dessous | présent document + contrat Réglages/Bots, types shared coordonnés | validation des scopes, erreurs et parcours ; aucun chevauchement de fichiers |
| Sociétés/session | Codex auth/API ; Claude UI approuvée | auth natif, MultiWorkspaceDropdown, Apollo/cache et dashboards existants | A/B/C, deux onglets, révocation, mismatch sans écriture |
| Persistance paginée/ACL | Codex ; avant ouverture commerciaux/volumes | module hermes-prospection, ORM/migrations officielles | reprise IDs/oppositions sans perte, transactions/concurrence testées sur DB jetable |
| Suivi et activités | Codex contrats, Claude parcours approuvés | Person/Company/Task/Note/CalendarEvent natifs | qualification, affectation, relance, rdv, conversion sans doublon et accès contrôlés |
| Campagnes et oppositions | Codex moteur existant, Claude écrans natifs | emailing resolver/services/driver, aucune seconde queue | DRAFT sans émission, test synthétique autorisé, planification/annulation et exclusions avant remise |
| Recette intégrée | Codex + Claude revue croisée SHA | tests natifs + navigateur en preview isolée | rapport réalisé/non configuré/non testé ; lien preview protégé vérifié après autorisation de câblage |

Matrice d’acceptation minimale à exécuter ultérieurement, aucune ligne déclarée passée dans cette livraison :

1. Créer A puis B par flux natif ; connexion/refresh/lien direct/retour navigateur ; paramètres et fiches A sans effet sur B ; Company cliente créée sans changement de société.
2. Utilisateur U1 membre A, U2 A+B, C interdit : listes/dashboard/export éventuel/IDs forcés refusés sans fuite ; retrait B pendant agrégation : pas de nom/compte B restitué. Tests natifs A/B/C disponibles dans `test/integration/graphql/suites/hermes-structure-dashboard.integration-spec.ts:453,494,535,563`, à rejouer sur SHA d’implémentation.
3. Deux onglets A/B, mutation A en vol puis switch B, cookies renouvelés, erreur tardive A et retry superseded : aucune écriture ni réponse A dans B. REST, souscription, upload, cache/refresh et stockage indisponible inclus ; contexte ambigu bloqué.
4. Rôle limité aux fiches affectées et champ email masqué : aucun staging brut, total ou audience ne révèle des fiches interdites. Révocation avant mutation/avant job interdit l’effet futur ; admin sans adhésion C demeure interdit.
5. HMAC valide, altération d’un octet, timestamp périmé, nonce rejoué, connexion désactivée/étrangère, opérateur révoqué, rate limit, panne replay store : refus sûrs ; reprise avec nouveau nonce et même lot = mêmes IDs ; contenu changé = conflit. Aucun appel fournisseur nécessaire à ce test.
6. Lot mixte valide/invalide/doublon/opposition/contact existant/additional email ambigu : revue exacte par ligne ; pas d’écrasement ni doublon CRM ; panne entre transaction native et staging reprise sans création supplémentaire.
7. Affecter à membre B depuis A rejeté ; changement concurrent par expectedRevision rejeté ; relance Task et rendez-vous natif correctement liés ; conversion réessayée idempotente ; ouverture seule n’altère aucune étape.
8. Dépasser les limites documentées = erreur explicite, aucune perte silencieuse ; pagination stable sous import concurrent ; migration et rollback/reprise contrôlés avec IDs, compteurs et empreintes, oppositions encore actives après suppression d’un lot.
9. Brouillon/preview = zéro émission. Test non synthétique refusé serveur. Garde feature/licence/email-group/crédits inchangée ; planification fuseau et date invalide vérifiées ; annulation ne promet pas retrait de messages déjà acceptés.
10. Opposition avant import/après aperçu/après planification/pendant remise → aucun envoi encore évitable ; réimport ne réabonne pas ; refus tracking n’est pas un refus marketing ; source fournisseur bounce/plainte invalide n’altère aucun statut.
11. SMTP fixture uniquement : accepté ≠ livré, perte de reçu = quarantaine sans réémission simple/batch ; statistiques non disponibles affichées telles quelles ; suivi OFF ne génère pas pixel/lien ; réponse corrélée sur message réel synthétique, pas sur ouverture.
12. Compte neuf navigateur anglais = FR ; ancien défaut automatique anglais migré selon règle approuvée ; préférence EN explicitement choisie conservée après login/reload/switch. États chargement/erreur/vide/réessai accessibles clavier et mobile 390 px ; aucune donnée privée mise en cache PWA par défaut.

## 9. Décisions encore nécessaires et limites

Acquis : plan lancé, français par défaut, référence Pipedrive, web/PWA, moteur emailing natif, sociétés = workspaces. Ne pas redemander ces choix.

À valider avec les maquettes/contrats : accès commercial aux données de prospection (affectation/équipe/partage), transitions et définition de conversion, volume/rétention et migration paginée, scope des oppositions par société/topic et éventuelle politique groupe, destinataires synthétiques autorisés, traitement de la révocation d’un auteur de campagne planifiée, provenance/migration des préférences linguistiques et effet d’un paramètre URL. Ces décisions n’autorisent pas une nouvelle licence/service payant ou un envoi réel.

Livraison actuelle : lecture statique de sources au SHA annoncé et rédaction de ce document seulement. Aucun code applicatif, schéma généré, migration, DB, service, modification de configuration, secret, connexion, envoi, test runtime ou déploiement. Publication GitHub et revue croisée regroupées par la coordination ; ce document ne fournit pas de preview fonctionnelle. Les capacités externes restent non configurées/non testées jusqu’à preuve de recette explicite.
