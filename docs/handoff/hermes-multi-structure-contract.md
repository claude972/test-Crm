# Hermès — multi-structure cloisonné et dashboards

## Décisions explicites du propriétaire

Le CRM doit gérer plusieurs structures/sociétés cloisonnées, avec un dashboard par société et un dashboard commun. Le propriétaire précise : **chaque utilisateur voit un récapitulatif de ses sociétés autorisées**. La vue commune n'est donc pas réservée par principe à la direction du groupe, et ne donne jamais accès aux sociétés non autorisées.

La référence visuelle Monday reste valide. Cette spécification complète les connecteurs et leur refonte ; elle décrit une cible à implémenter, pas une capacité déjà livrée dans la preview P0.

## Modèle métier et rattachement technique

Une structure est une société exploitante du CRM. Elle est distincte d'une fiche Entreprise/Company du carnet clients. L'ajout de plusieurs fiches Company ne constitue pas une architecture multi-structure.

Modèle cible : périmètre de regroupement -> structures -> données métier propres à chacune. Un utilisateur peut appartenir à plusieurs structures avec des rôles différents. Le regroupement sert à organiser la vue commune ; il ne remplace pas les autorisations par structure et ne doit pas être confondu avec le statut d'administrateur technique du serveur.

Inspecter et réutiliser l'isolation workspace, les adhésions user-workspace et les rôles existants avant d'introduire une nouvelle entité. Décider et documenter la correspondance structure/workspace, ainsi que le besoin réel d'une entité de regroupement. Éviter deux identifiants structureId/workspaceId contradictoires. Conserver les identifiants et données existants lors d'une migration réversible en recette.

Constat de départ sur le checkpoint P0 : le serveur comporte WorkspaceEntity, UserWorkspaceEntity et un réglage IS_MULTIWORKSPACE_ENABLED à false par défaut. La preview précédente était mono-workspace. L'existence de ces objets ou l'activation d'un drapeau ne prouve pas la livraison du cloisonnement demandé, de la navigation multi-société ou d'une agrégation autorisée.

## Cloisonnement obligatoire

Chaque structure conserve son périmètre de contacts, entreprises clientes, opportunités, tâches, conversations, messages, réponses Forms, réservations, documents et configuration Hermès. Les connexions Evolution/WhatsApp, boîtes e-mail, formulaires, agendas, secrets et droits d'outils MCP sont explicitement rattachés à une structure. Un serveur fournisseur commun peut être réutilisé si ses connexions et autorisations restent séparées et vérifiées.

Une adresse e-mail ou un téléphone identique dans deux sociétés ne fusionne pas automatiquement leurs contacts, conversations ou historiques. Les correspondances externes et clés de déduplication incluent la structure/workspace et la connexion fournisseur.

Appliquer les droits côté serveur sur les API, résolveurs, recherches, compteurs, exports, fichiers, téléchargements, notifications, événements, workers et appels MCP. Une interface filtrée ne remplace pas cette vérification. Les jetons, caches, requêtes et clés de persistance navigateur sont correctement rattachés au contexte ; un changement de structure, une révocation ou une déconnexion ne réaffiche pas les données privées de la structure précédente. Prendre en compte les onglets concurrents.

Un événement entrant obtient sa structure de la connexion serveur authentifiée. Une commande obtient sa structure du contexte utilisateur/service autorisé. Les identifiants fournis dans un message, formulaire public, argument MCP ou paramètre de route ne donnent aucun droit à eux seuls.

## Navigation et dashboards

Afficher un sélecteur de structure lisible et un contexte permanent : « Société A » ou « Toutes mes sociétés ». Le sélecteur ne liste que les sociétés autorisées pour l'utilisateur connecté. Le changement de contexte met à jour vues, requêtes et permissions ; il ne réutilise pas silencieusement une session ou des résultats d'une autre société.

Dashboard société : indicateurs et suivis issus uniquement de la société sélectionnée, dans la limite des permissions métier de l'utilisateur sur cette société.

Dashboard commun : agrégation en lecture des seules sociétés autorisées, avec total et ventilation par société. Le serveur calcule le périmètre autorisé à chaque requête à partir des adhésions et droits effectifs. Une société sélectionnée dans un filtre mais devenue interdite est exclue/refusée selon un comportement documenté ; son nom, ses compteurs et ses erreurs privées ne doivent pas être divulgués.

Chaque utilisateur dispose de la vue commune de son périmètre :
- un utilisateur de A voit le récapitulatif de A ;
- un utilisateur de A et B voit A+B et peut filtrer A ou B ;
- cet utilisateur ne voit rien de C s'il n'y est pas autorisé ;
- sans société autorisée, afficher un état vide et une action d'accès appropriée, sans dashboard global par défaut.

La vue commune n'élève pas les droits : agréger seulement les mesures que l'utilisateur peut effectivement consulter dans chaque société. Un détail accessible depuis un indicateur ouvre la société correspondante et refait les vérifications d'accès. Une action d'écriture conserve une société explicite ; aucune modification multi-société implicite depuis le dashboard commun.

Définir les indicateurs à partir de données existantes et de conventions communes : période, fuseau horaire, devise, statuts et fraîcheur. Ne pas additionner des montants de devises différentes comme un total unique sans règle de conversion documentée et données appropriées ; à défaut, ventiler par devise. Distinguer somme des fiches par société et nombre de clients uniques : aucune déduplication transversale de personnes n'est supposée par cette vue.

Une source de données indisponible ne transforme pas ses valeurs en zéro. Afficher le caractère partiel ou périmé du résultat. Prévoir les états chargement, erreur, vide, accès retiré et succès dans les vues société et commune.

## Communication intermodules

Tous les modules d'une société alimentent ses mêmes fiches et parcours, conformément à hermes-integration-contract.md. Le contexte est propagé à chaque étape Forms -> CRM -> WhatsApp/e-mail -> Hermès/MCP -> Cal.diy -> agenda/opportunité/chronologie, y compris dans les jobs différés et leurs reprises.

Le bot reçoit uniquement les données et outils permis dans sa société de traitement. Le fait qu'un utilisateur appartienne aussi à une autre société ne donne pas à une conversation WhatsApp de A l'accès au contexte client de B. Les fonctions de synthèse multi-société nécessitent un contexte utilisateur explicite et les mêmes contrôles que le dashboard commun ; elles ne sont pas activées implicitement pour les conversations clients.

## Recette d'autorisation et de données

1. Créer en recette A, B et C, avec des données différentes et certains téléphones/e-mails identiques pour vérifier l'absence de fusion et de fuite.
2. Utilisateur U1 membre de A : dashboard A et récapitulatif A uniquement. Tester aussi paramètres/URLs forgés vers B/C, fichiers, recherches et exports.
3. Utilisateur U2 membre de A+B : dashboards A et B, vue commune A+B avec ventilation correcte ; C reste absent. Vérifier des rôles différents dans A et B : la vue commune ne révèle pas les mesures interdites dans l'une d'elles.
4. Retirer B à U2 : après prise en compte de la révocation selon un délai maximal déclaré et testé, B disparaît des requêtes, totaux, sélecteur, anciens onglets et accès directs. Vérifier la révocation des sessions/caches si nécessaire.
5. Utilisateur sans société : aucune donnée de société, aucun total global et aucune attribution automatique de droits.
6. Jouer le parcours intermodules dans A et dans B. Les messages, réservations, réponses et reprises de jobs restent dans leur société, même si le client a le même e-mail/téléphone. Un contenu client ou argument MCP malveillant ne change pas le périmètre.
7. Vérifier filtre/période/devise, agrégats et accès au détail. Tester données indisponibles, erreur partielle et absence de données.
8. Vérifier dans le navigateur le changement de société, les deux dashboards, les rôles et le mobile web. Captures et scénarios réellement exécutés sont reliés au SHA exact et à la preview ; un simple seed de sociétés ou test simulé ne suffit pas à valider le multi-structure.

## Répartition et progression

Codex : audit du modèle workspace existant, contrat de périmètre et d'agrégation, autorisations, connecteurs/jobs, caches serveur, migrations de recette nécessaires, tests backend. Publier le contrat compatible avec le socle avant consommation par le frontend.

Claude : sélecteur de société, contexte actif visible, dashboards société/commun et leurs états, navigation vers les détails, isolation des requêtes et caches navigateur, cohérence Monday et tests responsive. Employer la même branche frontend que refonte/connecteurs pour éviter des modifications concurrentes des écrans.

Les deux agents déclarent leurs fichiers et revues dans MISSIONS.md/CORRECTIONS.md. Préserver les originaux et la recette mono-workspace précédente ; aucune migration ou ouverture de données de production implicite. La livraison reste en attente de code, tests d'isolation et recette multi-structure réels.
