# Hermès V3 — contrat proposé CRM, pipeline et campagnes

Date : 30 octobre 2026. Mission `HERMES-V3-AUDIT-MAQUETTES-20261030`, coordination `80a40e6c32d5dc6b35987055bf6bec8633413128`. START phase 1 après acceptation phase 0 ; [audit publié](https://github.com/claude972/test-Crm/blob/095582346e227d627437560c66445e9a9211bcb9/docs/handoff/hermes-v3-capabilities-audit.md). **Contrat proposé uniquement, aucune fonctionnalité V3 codée.** Application source en lecture seule : `333ba534927e177c90b35eb4157d75d8d767dec4`. Voir [contrat MCP/messageries](hermes-v3-mcp-messaging-contract.md).

Le plan V3 et les dernières décisions remplacent les propositions V2 contradictoires. Les fichiers historiques V2 restent inchangés. En particulier, la qualification prospect n'est pas le pipeline Opportunity, CUSTOMER n'est pas arbitrairement « gagné », désactiver les réponses automatiques signifie ASSISTED et les commandes locales sont autorisées. Les phases 2–8/câblage attendent la validation visuelle détaillée utilisateur.

## 1. Sources et Allowed APIs présentes

Préfixes au SHA333 : `S = apps/crm/ui/packages/twenty-server/src`, `C = S/engine/core-modules`, `F = apps/crm/ui/packages/twenty-front/src`, `T = apps/crm/ui/packages/twenty-server/test`. « Présent » signifie source lue, pas runtime ou résultat de recette.

| Domaine | Présent et preuve | Limite V3 |
|---|---|---|
| Import | `hermesImportBatches`, `hermesCreateImportBatch`, `hermesQualifyImportRows`, `hermesCreateCampaignDraft` ; `C/hermes-prospection/hermes-prospection.resolver.ts:47–100` | staging/qualification distincts ; draft ne donne pas droit d'émettre |
| Scraping | `POST /webhooks/hermes/intake/:connectionId` ; HMAC corps brut, timestamp/nonce, anti-rejeu, staging ; `intake/hermes-intake.service.ts:45–122`, `hermes-intake-signature.ts:3–39` | connexion externe non vérifiée ; payload reçu ≠ prospect qualifié |
| Forms | match/revue à `intake/events/hermes-event.service.ts:135–195`, insertions Company/Person/Note/target `:381,391,416,427` | verrou Forms ne couvre pas tous les writers ; zéro doublon global non démontré |
| WA/mail | `C/hermes-messaging/hermes-messaging-person.service.ts:19–59` | match seul, aucune création/fusion silencieuse |
| Opportunity | métadonnées natives `S/engine/workspace-manager/twenty-standard-application/utils/field-metadata/compute-opportunity-standard-flat-field-metadata.util.ts:203–267` | NEW/SCREENING/MEETING/PROPOSAL/CUSTOMER, sans gagné/perdu explicites |
| Board | `F/modules/object-record/record-drag/hooks/useUpdateDroppedRecordOnBoard.ts:177–183` écrit stage+position | mouvement visuel ≠ persistance vérifiée |
| Campagne | `sendMessageCampaign`, `cancelMessageCampaign`, `sendMessageCampaignTest`, `previewMessageCampaignAudience`, `previewMessageCampaignSend` ; `S/modules/emailing/resolvers/emailing-send.resolver.ts:83–225` | moteur natif sous ses propres guards ; test émet réellement |

Extrait actuel (`compute-opportunity-standard-flat-field-metadata.util.ts:226–267`), valeurs à préserver :

```ts
// Résumé des options source, pas nouvel enum généré.
type ExistingOpportunityStage = 'NEW' | 'SCREENING' | 'MEETING' | 'PROPOSAL' | 'CUSTOMER';
```

Tous les endpoints/mutations ci-dessous non listés comme présents sont des **noms de travail proposés**, sans resolver ni TypeScript partagé livré. Le bridge actuel annonce `smtpCampaignSending:false` (`C/hermes-prospection/hermes-prospection.service.ts:58`). Le frontend doit montrer la capacité serveur réelle, sans la déduire du nom de driver.

## 2. Réceptions multicanales et qualification sans doublon évitable

Société exploitante = workspace, pas Company cliente. Les événements sont attribués côté serveur à la société autorisée de leur connexion. Reprendre les sessions, adhésions, ORM et ACL natifs ; vue commune autorisée en lecture seule. Les API Hermès courantes sont réservées aux admins non restreints (`hermes-prospection-access.service.ts:20–64`) ; l'ouverture aux commerciaux exige un contrat de permissions et tests avant modification du garde.

Séparer quatre axes : **réception technique**, **classement/qualification de la demande**, **progression de l'affaire Opportunity**, **opposition marketing**. Aucun axe n'en déduit automatiquement un autre.

| Réception | Classement cible | Effet autorisé |
|---|---|---|
| Nouvelle demande commerciale formulaire/WA/mail | à qualifier/affecter | fiche native reliée ou revue ; création Opportunity uniquement sur action explicite autorisée |
| Réponse d'un client/contact connu | réponse liée au fil/contact/affaire si relation attestée | historique conservé, pas nouvelle opportunité automatique |
| Scraping signé | staging à qualifier | aucun « consentement » ni éligibilité campagne déduit de la collecte |
| Plusieurs contacts possibles, archivé, identités divergentes | revue requise | aucune fusion/écrasement arbitraire ; erreur/raison consultable |
| Spam/notification technique | classement explicite non commercial | pas de prospect/opportunité silencieux |
| Opposition | preuve durable séparée | exclut les émissions concernées ; ne falsifie ni stage ni historique |

Identité du reçu `(workspace,source,connection,externalEventId)` unique et durable ; empreinte canonique détecte même identité/contenu changé. Identifiants normalisés avec helpers natifs email/téléphone ; rapprochement déterministe uniquement si un unique match sûr accessible. Ne pas fusionner deux personnes parce qu'elles partagent domaine, nom, objet mail ou entreprise. Conserver provenance, IDs externes, date de réception, source/connexion, liens messages/formulaires/lots et acteur/date de qualification ; historique append-only sans duplication des corps privés dans une vue commune.

**Concurrence cible** : tous writers Forms/import/WA/mail passent le même service de résolution ou un protocole transactionnel partagé pour une identité normalisée par workspace. Un verrou propre à Forms et un verrou séparé inbox ne suffisent pas. Verrouiller/relire les candidats dans la transaction native, créer une seule fiche ou ouvrir un conflit ; pas de contrainte unique naïve interdisant les identités légitimement partagées. Réservation du reçu, création native et lien doivent être atomiques ou réconciliables de manière idempotente après crash. Un réessai conserve les IDs ; fusion destructive reste une action séparée.

Scraping conserve HMAC du corps brut, timestamp/nonce et stockage anti-rejeu fail-closed. Même lot reçu avec nouveau nonce valide renvoie le même lot si empreinte identique ; même ID/contenu différent = conflit. Qualifier exige revue, finalité/notice/version et acteur vivant, pas un booléen d'opt-in inventé. Les limites actuelles sont 40 lots,100 lignes/lot,2Mo état (`utils/hermes-import-policy.ts:10–13`) ; dépassement explicite, jamais suppression silencieuse. Persistance paginée/migration nécessaire avant augmentation, selon générateurs/commandes officielles ; pas de Supabase ajouté à la stack existante.

## 3. Types et interactions cibles

Types de présentation/contrat **proposés**, non servis actuellement. Réutiliser Person/Company/Task/Note/CalendarEvent/Opportunity natifs ; aucun second carnet d'adresses ou moteur de tâches/campagnes.

```ts
type ReceiptSource = 'FORM' | 'WHATSAPP' | 'EMAIL' | 'SCRAPING';
type ReceiptClassification = 'TO_QUALIFY' | 'COMMERCIAL_REQUEST' | 'CUSTOMER_REPLY'
  | 'TECHNICAL' | 'SPAM' | 'REVIEW_REQUIRED';
type QualificationStatus = 'PENDING' | 'QUALIFIED' | 'REJECTED' | 'REVIEW_REQUIRED';
type ReceiptProvenance =
  | { kind: 'MESSAGE'; messageId: string; conversationId: string }
  | { kind: 'FORM'; formId: string; submissionId: string }
  | { kind: 'IMPORT_BATCH'; batchId: string; rowId: string | null };
type ReceiptQualificationAudit = {
  id: string; revision: string; actorUserWorkspaceId: string; occurredAt: string;
  classification: ReceiptClassification; qualificationStatus: QualificationStatus;
  reasonCode: string | null;
};
type ReceptionReceipt = {
  id: string; workspaceId: string; source: ReceiptSource; connectionId: string;
  externalEventId: string; receivedAt: string; provenance: ReceiptProvenance[];
  classification: ReceiptClassification;
  qualificationStatus: QualificationStatus; personId: string | null;
  companyId: string | null; opportunityId: string | null;
  ownerUserWorkspaceId: string | null; revision: string; reasonCode: string | null;
  qualifiedByUserWorkspaceId: string | null; qualifiedAt: string | null;
  qualificationAudit: ReceiptQualificationAudit[];
};
type CampaignSenderIdentity = {
  id: string; workspaceId: string; mailboxId: string; transportBindingId: string;
  fromAddress: string; authorizedAliases: string[]; replyToAddress: string;
  revision: string; state: 'UNVERIFIED' | 'VERIFIED' | 'REVOKED';
};
type Capability = { allowed: boolean; reasonCode: string | null };
type CampaignCapabilities = {
  preview: Capability; testSynthetic: Capability; schedule: Capability; send: Capability;
  cancel: Capability;
  identityRevision: string | null; checkedAt: string;
};
type ObservedMetric = {
  value: number | null; available: boolean; observedAt: string | null;
  evidence: 'SMTP_ACCEPTED' | 'PROVIDER_DELIVERED' | 'REPLY_OBSERVED'
    | 'OPEN_OBSERVED' | 'CLICK_OBSERVED' | 'FAILED' | 'UNCONFIRMED';
};
```

La provenance est non vide : WHATSAPP/EMAIL porte un lien MESSAGE vers le message et sa conversation, FORM un lien FORM vers la soumission, SCRAPING un lien IMPORT_BATCH vers le lot et, si connue, sa ligne. Les liens supplémentaires attestés sont conservés, sans copier les corps privés. Tous les IDs liés, y compris acteurs/owner et Person/Company/Opportunity, sont résolus et contrôlés serveur dans le même workspace ; un lien message/conversation doit aussi correspondre au même fil. Aucun ID libre d'une autre société ne peut être attaché ou révélé.

`qualificationAudit` est append-only : chaque classement/décision de qualification conserve état résultant, raison, revision, acteur autorisé et vivant au moment de la mutation et date serveur, y compris rejet, révision ou remise en revue. `qualifiedByUserWorkspaceId`/`qualifiedAt` sont renseignés ensemble pour la qualification courante `QUALIFIED` ; ils sont tous deux `null` dans les autres états, dont la décision/acteur/date restent dans l'audit. Une révocation ultérieure de l'acteur n'invalide ni ne supprime cet historique. Une requalification crée un événement, sans écraser l'historique. L'audit est filtré selon droits et ne confond pas date de réception et date de qualification.

`ObservedMetric` distingue preuve d'acceptation SMTP, livraison attestée, réponse reçue/corrélée, échec établi (`FAILED`) et issue incertaine (`UNCONFIRMED`). `available:false` impose `value:null`, jamais zéro ; un zéro disponible exige une mesure. Une valeur incertaine compte les remises sans issue confirmée, pas des livraisons ni des échecs prouvés ; timeout seul ne vaut pas FAILED. `observedAt` date l'observation et les preuves sont corrélées côté serveur au même workspace/campagne/destinataire, sans exposition du payload privé.

`VERIFIED` doit être accompagné côté serveur de preuve de délégation/identité et fraîcheur ; une valeur de formulaire ne le fixe pas. Les alias ne sont retournés qu'aux rôles autorisés. Les identités de transport sont des IDs opaques, jamais host/login/password. Les données brutes et totaux sont filtrés serveur avant pagination pour ne pas révéler des fiches étrangères/interdites.

| Interaction proposée, indisponible | Contrat minimal |
|---|---|
| `hermesReceptionReceipts` | filtres source/classement/owner + cursor/limit → page stable autorisée |
| `hermesClassifyReceipt` | receiptId/décision/raison/liens + contexte/revision/key → reçu et audit révisés |
| `hermesAssignReceipt` | reçu/membre actif même société + contexte/revision/key → affectation ; interdit hors droits |
| `hermesCreateOpportunityFromReceipt` | reçu qualifié + champs natifs/relation + contexte/revision/key → Opportunity native idempotente ; aucune conversion sur ouverture |
| `hermesCampaignCapabilities` | campagne/identité → droits/configuration/quotas et raisons, sans secret ni fausse garantie live |
| `hermesBindCampaignSender` | campaignId/senderIdentityId + contexte/revisions/key → liaison au moteur natif ; aucune émission |

Toutes écritures comparent contexte workspace/membership, revision attendue et clé idempotente ; réévaluent droits à la transaction et avant effet externe. Codes cibles : `WORKSPACE_CONTEXT_MISMATCH`, `REVISION_CONFLICT`, `RECEIPT_NOT_AVAILABLE`, `CONTACT_REVIEW_REQUIRED`, `QUALIFICATION_REQUIRED`, `ASSIGNEE_NOT_AVAILABLE`, `SENDER_IDENTITY_NOT_AUTHORIZED`, `CAPABILITY_UNAVAILABLE`. Garder les codes natifs des opérations natives. Erreur inexistante/interdite générique, messages français sans payload/secret ni nom d'une autre société.

## 4. Pipeline : valeurs natives et persistance à prouver

Le pipeline Opportunity utilise les valeurs et IDs natifs NEW, SCREENING, MEETING, PROPOSAL, CUSTOMER. La qualification d'un reçu ne remplace pas ces stages. Une affaire conserve propriétaire, Person/Company, montant/devise et position, avec prochaine action via Task native. Les labels français doivent correspondre aux métadonnées réelles ; aucune réinterprétation implicite de CUSTOMER en gagné. Les colonnes gagné/perdu, leurs IDs/valeurs et effets restent à décider puis ajouter officiellement par métadonnées/migrations natives, sans renommer ni casser les valeurs existantes. Les maquettes peuvent montrer l'issue cible comme proposée, sans annoncer un champ actuel.

Écriture native et retour d'erreur doivent conserver état cohérent du board : optimistic move réconcilié/annulé si mutation échoue. Contrôle workspace/rôle/record/field et concurrence avant stage+position ; pas de pipeline parallèle dans un store JSON. Le test `T/integration/graphql/suites/object-generated/opportunities.integration-spec.ts:1–74` vérifie une liste, pas les transitions.

Recette pipeline requise sur harness DB jetable officiel : créer une affaire native liée au reçu, lire son stage/montant/devise/owner par API, déplacer, attendre mutation, recharger et confirmer API/DB ; répéter stages applicables et ordre/position, conflit et rollback visuel. Rôle interdit et ID d'une autre société refusés. Après définition explicite gagné/perdu : transitions et effets dashboard/filtre vérifiés, données anciennes conservées. Aucun de ces tests n'a été exécuté pour ce contrat.

## 5. Campagne depuis la vraie boîte autorisée

Réutiliser EmailingModule, audiences, suppression, scheduling/queues, statistiques et driver SMTP natifs. Aucun second moteur ni nouvel abonnement. Le contrôle actuel du driver valide workspace+domaine From et utilise une connexion par workspace (`C/emailing-domain/drivers/smtp/smtp-emailing-domain-driver.ts:302–355`) ; **il ne prouve pas l'autorisation d'une mailbox exacte**. `senderDomains`, username SMTP, From et compte IMAP délégué sont des preuves distinctes.

Liaison cible persistante : société → boîte autorisée/délégation → connexion/version transport → adresse exacte ou alias explicitement autorisé → campagne native. Alias hors allowlist refusé même dans le bon domaine. Reply-To doit être autorisé et pointer vers la réception de la boîte voulue ; réponse rattachée par vraie provenance RFC/message, pas par simple objet. Ne jamais recopier un compte personnel sans délégation. Les secrets et identités persistantes se règlent au centre Réglages ; la campagne sélectionne une identité disponible.

La campagne conserve le snapshot d'identité/revision pour audit mais relit l'autorisation courante au preview, scheduling, matérialisation et dernier départ évitable. Révocation auteur/délégation/alias/connexion met les envois encore évitables en attente/refus, sans reprendre automatiquement après réactivation ; réautorisation explicite. Toute API native encore accessible doit appliquer la même garantie de mailbox, pas seulement un wrapper Hermès contournable. Cette protection est proposée, non présente au niveau contrôle domaine actuel.

### Droits/licence : chemin community conditionnel, pas promesse live

L'audit phase 0 a identifié une voie source **SMTP community avec billing OFF**, sans achat ni suppression de garde : `EmailGroupAccessService` autorise le driver SMTP community, `BillingService.isPayingCustomer` retourne true lorsque billing est désactivé ; admission/quota/crédits/worker/driver ont été suivis. Cela ne prouve ni configuration runtime ni droits d'usage juridique d'un déploiement particulier. Préserver mentions de licence et chemin natif ; ne pas simuler abonnement/credits ou modifier billing pour débloquer un bouton.

Toujours conserver session/permission WORKSPACE, feature `IS_MESSAGE_CAMPAIGN_ENABLED`, EmailGroupAccess, garde plan conditionnelle, admission/quota et cadence, suppressions, état de campagne et vérifications worker/driver. Les quotas ne sont pas tous désactivés avec billing OFF. Le flag `HERMES_B2B_CAMPAIGNS_ENABLED` à false par défaut n'établit pas l'état réel d'un workspace. Si configuration/licence/droits/quota/mailbox ne sont pas vérifiés : capacité indisponible et motif visible ; DRAFT/aperçu seulement selon droits. Sources détaillées : audit, section campagne, `emailing-send.resolver.ts:54–109`, `email-group-access.service.ts:22–39`, `billing.service.ts:129–147`, `usage-quota-admission.service.ts:34–77`, delivery/batch/slots natifs.

### Parcours et état de livraison

| Étape | Contrat cible sur moteur natif |
|---|---|
| Audience/exclusions | fiches qualifiées autorisées, normalisation/dédoublonnage natifs, raisons d'exclusion ; snapshot d'aperçu ne suffit pas au départ |
| Contenu/personnalisation | sujet/corps validés, variables manquantes visibles, identité exacte sélectionnée, aperçu destinataire sans émission |
| DRAFT/preview | `previewMessageCampaignAudience` et `previewMessageCampaignSend` conservent zéro émission ; sauvegarde n'envoie pas |
| Test | `sendMessageCampaignTest` émet réellement ; restriction serveur à une allowlist de destinations synthétiques de recette, jamais prospects réels ; aucun envoi dans cette phase documentaire |
| Programmer/envoyer | `sendMessageCampaign({campaignId,scheduledAt?})` sous tous guards ; date/fuseau et revue explicites ; dernière exclusion/identité revérifiée au départ |
| Annuler | `CampaignCapabilities.cancel` expose droit/état courant et motif de refus ; `cancelMessageCampaign` recontrôle ces conditions serveur et déprogramme ou annule les lignes encore évitables ; une ligne déjà envoyée/remise au transport est irrévocable, aucun rappel SMTP accepté/en vol |
| Résultats | accepté SMTP, livré attesté, échec, incertain, réponse, ouverture/clic observés distincts ; inconnu ≠ zéro |

Opposition durable par société et portée native/topic, jamais effacée par réimport/changement d'owner/suppression d'un lot. Recontrôle avant remise au driver, y compris opposition après aperçu ou programmation. Tracking OFF ne génère ni pixel ni lien de suivi ; refus tracking distinct d'opposition marketing. Bounce/plainte entrants nécessitent provenance authentifiée avant effet. Pas de prospection WhatsApp massive.

SMTP accepté n'est pas livré ; le champ legacy `deliveredRecipients` du driver exprime l'acceptation. Livraison nécessite événement authentifié corrélé. Ouverture observée n'est pas une lecture humaine ni conversion. Réponse seulement si message réellement reçu et corrélé. Timeout/crash après remise possible = `SEND_OUTCOME_UNCONFIRMED`, quarantaine/réconciliation sans retry aveugle ; aucune statistique 100% livrée inventée.

## 6. Recette et livraison documentaire

Matrice ultérieure, **non exécutée dans cette livraison** :

| Scénario | Résultat exigé |
|---|---|
| Même demande formulaire puis WA/mail, writers simultanés | un contact sûr réutilisé ; ambiguïté en revue ; provenance de chaque reçu intacte |
| Provenance message/fil, formulaire/soumission et lot/ligne ; qualification puis remise en revue | liens typés même workspace et fil vérifiés ; qualifiedBy/At cohérents, historique append-only de chaque décision ; lien étranger refusé |
| Client répond, notification ou spam reçu | classement correct, aucune Opportunity/campagne automatique |
| Lot signé rejoué, altéré, nonce expiré, replay store indisponible | rejets sûrs ; lot identique réaccepté avec nouveau nonce = mêmes IDs ; zéro doublon |
| Réimport d'un opposé | opposition conservée et exclusion durable, pas de réabonnement |
| Société A/B, C interdite, deux onglets, révocation en vol | aucun nom/total/corps étranger ; écritures périmées refusées |
| Déplacement board puis refresh/API/DB jetable | stage/position/montant persistés ; échec mutation visible et réconcilié |
| From non autorisé dans le bon domaine | refus serveur avant transport ; alias explicitement délégué seulement accepté |
| DRAFT, aperçu, test hors allowlist | zéro émission pour DRAFT/aperçu ; test non synthétique refusé serveur |
| SMTP synthétique autorisé + réponse | session/identité exacte attestées, acceptation séparée livraison, réponse au bon fil |
| Annulation permise/interdite, campagne programmée puis transport déjà parti | capacité cancel et motif cohérents ; refus serveur hors droits/état, seuls départs évitables bloqués ; envoyé irrévocable |
| Opposition/révocation après scheduling | tous départs évitables bloqués, aucune reprise automatique |
| Accepté SMTP, livraison attestée, échec établi, reçu SMTP perdu puis restart | métriques SMTP_ACCEPTED/PROVIDER_DELIVERED/FAILED/UNCONFIRMED distinctes ; réponse reçue non assimilée à livré ; inconnu sans faux zéro, incertain sans second envoi |
| Tracking OFF et état non configuré | aucun pixel/lien ; motif clair, aucune capacité live simulée |

Contrôles réellement effectués : règles/mission distante/plan/audit acceptés lus, contrats V2 et sources ciblées au SHA333 confrontés, signatures et valeurs natives relues ; contrôle documentaire whitespace. Aucun build, test applicatif/runtime, DB, provider, secret/configuration, média ou campagne réelle, ni preview CRM V3. Publication/revue croisée exact SHA par root restent nécessaires. Les maquettes portent des données fictives sans API ; configuration externe, mailbox exacte et persistance pipeline restent non vérifiées. Validation visuelle détaillée avant phases 2–8/câblage.
