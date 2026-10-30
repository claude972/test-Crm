# Hermès — intégration de tous les modules

## Exigence propriétaire

Tous les modules doivent communiquer et alimenter les mêmes parcours CRM : WhatsApp/Evolution, e-mail, bot Hermès/MCP, Forms et Cal.diy. Cette spécification décrit la cible ; elle ne constitue pas une intégration déjà exécutée. Une succession de liens vers des applications ou des tests de connecteurs isolés ne satisfait pas cette exigence.

## Identité et responsabilités

Le CRM est la référence pour l'identité du contact, de l'entreprise, de l'opportunité et leur appartenance au workspace. Chaque service conserve la responsabilité de ses objets externes : transport de message, réponse de formulaire, réservation. Les échanges passent par les adaptateurs backend et leurs contrats ; les bases des fournisseurs ne sont pas modifiées directement par un autre module.

Les correspondances externes sont scellées au workspace : fournisseur, instance/boîte/formulaire/agenda, identifiant externe, identifiant CRM. Un même identifiant externe provenant d'une autre instance ou d'un autre workspace ne peut pas désigner implicitement le même contact. Les téléphones/e-mails sont normalisés et rapprochés selon des règles documentées ; les conflits et identités ambiguës demandent une résolution explicite, sans fusion aveugle. Les conversations de groupe et identifiants WhatsApp non téléphoniques doivent conserver leur identité externe.

Le workspace est déterminé par la session autorisée ou la connexion serveur authentifiée qui reçoit l'événement. Un champ workspaceId/contactId envoyé par un formulaire public ou un message client ne peut pas accorder des droits ni imposer un rattachement arbitraire.

## Parcours et données partagées

| Origine | Traitement attendu | Résultat commun |
| --- | --- | --- |
| Message WhatsApp | réception Evolution, rapprochement du contact, conversation, déclenchement Hermès si autorisé | fil et chronologie client, réponse/statut visibles |
| E-mail entrant | connecteur de réception à identifier, rapprochement et threading | même fiche client, conversation et contexte Hermès |
| Réponse Forms | ingestion authentifiée, déduplication, mapping des champs et identification du contact | réponse consultable, provenance, suivi commercial relié |
| Réservation Cal.diy | rapprochement et suivi de création/report/annulation | agenda, fiche client et opportunité liée si pertinente |
| Action Hermès | contexte autorisé, outil MCP identifié, commande contrôlée par le backend | action tracée, résultat confirmé et interface actualisée |
| Action humaine CRM | commande backend sur le bon module | état confirmé répercuté dans les vues concernées |

SMTP couvre l'envoi ; le canal de réception des e-mails reste à déterminer s'il n'existe pas déjà. Son absence bloque la revendication d'un parcours e-mail entrant/bot complet, sans empêcher les autres connecteurs d'avancer.

Le bot doit pouvoir exploiter le contexte autorisé du client : échanges, informations Forms, rendez-vous et suivi commercial disponibles. Les outils MCP et le moteur Hermès réels doivent être inventoriés avant d'annoncer ces capacités. Reprise humaine et désactivation du bot par conversation empêchent les réponses automatiques suivantes selon une règle testée. Aucune réservation, réponse ou transition commerciale n'est présentée comme confirmée sur la seule intention du bot.

## Contrat d'échange à concrétiser avant édition partagée

Enveloppe proposée : version de schéma, eventId, workspaceId validé côté serveur, type, producteur, connexion fournisseur, externalId, occurredAt, receivedAt, correlationId et causationId. Les liens contactId, conversationId, opportunityId, formResponseId, bookingId sont portés lorsqu'ils sont établis et autorisés. Le payload est typé par événement ; les secrets et données privées inutiles sont exclus des journaux.

Codex doit publier les types, exemples et règles d'erreur réellement compatibles avec le serveur avant consommation par Claude. Décrire les commandes sortantes et événements confirmés séparément. Réutiliser l'API, les autorisations, PostgreSQL et les mécanismes Redis/queue existants. Préciser les contraintes d'unicité, transactions, reprise après panne et ordre des événements ; employer un mécanisme durable de publication si une transaction métier et sa notification doivent rester cohérentes.

La déduplication dépend des identifiants stables du fournisseur, de la connexion et du type d'opération. Les événements en double, retardés ou désordonnés ne doivent ni créer une seconde réponse/réservation ni rétablir un état annulé avec un événement plus ancien. Les événements sortants et réponses du bot ne déclenchent pas une boucle de nouvelles réponses.

Une livraison externe au résultat incertain est distinguée d'un échec certain. Exploiter les clés d'idempotence du fournisseur si disponibles ; sinon réconcilier avant de réémettre. Ne pas promettre une livraison exactement une fois si le transport ne la garantit pas.

## Interface et disponibilité

La fiche client et sa chronologie réunissent les messages, réponses Forms, rendez-vous et actions Hermès effectivement reçus. Les vues conversations, agenda, formulaires et pipeline utilisent les mêmes identifiants et états confirmés. Une modification doit devenir visible après actualisation ; les mécanismes d'actualisation automatique et leur latence cible sont déclarés et testés selon les capacités de l'hébergement.

Afficher la provenance, l'état de synchronisation, l'erreur et la reprise appropriée. Une panne d'un fournisseur ne masque pas les informations déjà conservées ni ne bloque tout le CRM. Une donnée locale en attente de synchronisation ne porte pas le même état qu'une confirmation du fournisseur.

La référence visuelle reste Monday, avec identité Hermès. Les limites du tunnel P0, notamment SSE et expiration, ne valent pas preuve d'une synchronisation temps réel durable. Choisir et tester une solution d'actualisation compatible avec la preview livrée ; ne pas afficher un faux état temps réel.

## Recette intégrée obligatoire

1. Une soumission Forms de recette crée ou enrichit le contact attendu ; sa réémission ne duplique ni réponse ni contact.
2. Un message WhatsApp du même client se rattache à cette fiche. Hermès consulte les données Forms autorisées et répond sur le bon fil, si le bot est activé.
3. Une action de réservation autorisée reçoit une confirmation Cal.diy. Le rendez-vous apparaît dans l'agenda et la chronologie de ce contact ; son report et son annulation actualisent ces mêmes vues.
4. Un e-mail SMTP de recette appartient au bon fil client. Si un connecteur entrant est configuré, une réponse entrante rejoint cette fiche et le contexte Hermès ; sinon ce scénario reste explicitement incomplet.
5. L'opportunité liée retrouve les échanges/réponses/rendez-vous pertinents. Un rendez-vous seul ne marque pas automatiquement une vente gagnée sans règle métier explicite.
6. Reprise humaine, répétition d'événement, retard, erreur fournisseur et résultat d'envoi incertain sont testés sans double réponse ni boucle. Les essais utilisent uniquement des destinataires de recette autorisés.
7. Un second workspace et un autre utilisateur non autorisé ne lisent ni ne modifient ces données ou connexions. Les appels MCP, webhooks et commandes API respectent la même isolation.
8. Vérifier ces parcours dans la preview réelle et le navigateur, avec preuves et identifiants d'événements expurgés. Les fixtures et mocks restent identifiés comme tels. Une intégration ne passe done que dans son périmètre effectivement exécuté.

## Coordination

Contrat backend et adaptateurs : Codex. Vues communes et refonte : Claude. Référencer ce document depuis les deux prompts ; partager les changements de contrat avant d'éditer les consommateurs. Conserver les sources d'origine, les rapports historiques et les travaux déjà revendiqués. Cette priorité complète hermes-connectors-p1 et hermes-redesign-p1 ; elle ne réactive pas Char.
