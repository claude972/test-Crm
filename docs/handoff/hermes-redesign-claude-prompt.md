<objectif>
Réaliser en parallèle des connecteurs une refonte moderne de Hermès CRM, avec une identité propre et des parcours cohérents pour les contacts, conversations, opportunités, formulaires et rendez-vous. Le socle Twenty reste technique ; la livraison doit apporter une amélioration réelle de navigation et d'utilisation, au-delà d'un changement de logo ou de couleur.
</objectif>

<reference_a_obtenir>
La référence visuelle et le thème sont demandés au propriétaire ; sa réponse n'est pas encore reçue à la rédaction. DESIGN.md impose : « Before starting any new visual direction, ask for a visual reference ». Ne pas choisir de palette, police, composition visuelle ou maquette nouvelle avant cette réponse. En attendant, avancer sur l'audit de l'existant, l'inventaire des composants, les parcours et les contrats. Ne pas demander une deuxième fois une préférence déjà fournie dans le fil ou la mission.
</reference_a_obtenir>

<contexte_et_propriete>
Dépôt claude972/test-Crm. Lire AGENTS.md, DESIGN.md, CLAUDE.md, les règles des sous-projets, puis MISSIONS.md et CORRECTIONS.md après fetch explicite de missions/p0-stabilization.
Lire aussi docs/handoff/hermes-connectors-claude-prompt.md : WhatsApp via Evolution API, e-mail SMTP avec réception distincte à définir, bot Hermès/MCP, Forms et Cal.diy ; Char sort de la cible.
La conservation du design dans le prompt initial est remplacée par cette demande de refonte, dans les limites de la référence choisie et de DESIGN.md.
Claude possède le frontend ; Codex possède les connecteurs backend et l'infrastructure. Réutiliser la branche frontend feat/claude-hermes-connectors-ui, ou une branche déjà revendiquée réconciliée, pour les parcours et leur refonte. Ne pas créer une deuxième implémentation concurrente des mêmes écrans. Le backend avance séparément sur feat/codex-hermes-connectors-api.
Périmètre frontend : apps/crm/ui/packages/twenty-front et tests associés ; extension de propriété aux tokens dans apps/crm/ui/packages/twenty-ui/src/theme et aux composants partagés strictement nécessaires après inventaire et déclaration des fichiers. Ne pas modifier les DTO/contrats partagés sans coordination Codex.
Conserver React/Vite/Linaria/Jotai/Lingui et les mécanismes de navigation et de données existants. Aucun changement de framework, aucune nouvelle application native, aucune perte de sources locales.
</contexte_et_propriete>

<travail>
1. Inspecter le CRM existant dans le navigateur et les composants, thèmes, routes et états réellement disponibles. Distinguer défauts d'ergonomie prouvés et choix esthétiques. Publier un inventaire court des écrans et fichiers concernés avant édition.
2. Dès réception de la référence, la consigner avec les préférences de thème. Lire la référence et proposer une direction courte ancrée dans les usages Hermès : couleurs/tokens, typographie disponible et licenciée, hiérarchie, densité, navigation et interactions. Suivre DESIGN.md et le skill frontend-design ; justifier les adaptations à ce CRM. Ne pas ajouter de validation répétitive pour les choix de détail conformes à la référence.
3. Refondre progressivement le cadre commun : navigation, barre d'actions, recherche existante, en-têtes de pages, tableaux, filtres, panneaux, formulaires et états. Réutiliser les composants et tokens plutôt que superposer un thème CSS global fragile.
4. Structurer les parcours métier :
   - accueil opérationnel : suivis et actions du jour, alimentés par des données réelles ; indicateurs indisponibles signalés, jamais inventés ;
   - contacts/entreprises : recherche, filtrage et fiche avec chronologie unifiée des échanges, réponses Forms et rendez-vous ;
   - conversations : liste des fils, conversation et contexte client ; WhatsApp/e-mail identifiables, état du bot Hermès et reprise humaine visibles ;
   - opportunités : rendre le pipeline existant plus lisible, préserver filtres, stages et actions métier ;
   - agenda et formulaires : présenter les données effectivement intégrées, avec source et état de synchronisation ;
   - réglages : connecter WhatsApp, la messagerie, Hermès, les formulaires et rendez-vous avec des libellés compréhensibles. Réserver les détails techniques aux réglages avancés utiles.
5. Livrer d'abord cadre/navigation + liste et fiche client, puis conversations, pipeline, agenda/formulaires et réglages. Intégrer chaque lot aux contrats backend publiés ; l'absence d'un connecteur doit produire un état non configuré ou indisponible explicite, sans faux succès.
6. Traiter responsive mobile web, navigation clavier, focus, lecteurs d'écran, contraste, réduction des animations, cibles tactiles et contenus longs. Éviter les débordements de page ; autoriser seulement un défilement local clairement identifié quand une grille métier l'exige.
7. Préserver les performances et la compatibilité React 18. Appliquer les règles React pertinentes au code effectivement modifié ; ne pas importer de mécanismes Next.js dans Vite ni ajouter de nouvelle bibliothèque d'interface pour sa seule apparence.
</travail>

<verification_et_livraison>
Conserver chargement, vide, erreur, succès, désactivé et reconnexion. Vérifier les permissions par workspace avec Codex et ne pas affaiblir l'authentification au profit d'une démo.
Après chaque lot significatif : contrôles adaptés, build, captures avant/après dans la preview réelle, parcours ordinateur et mobile web. Vérifier notamment consulter un contact, lire un fil, reprendre la main sur le bot, modifier une opportunité et afficher une réponse/réservation effectivement disponible. Les étapes dépendant d'un service absent restent explicitement non validées.
Publier commits, SHA exacts, rapport et limites dans CORRECTIONS.md ; revue croisée avec Codex avant done. Livrer une preview accessible au destinataire, testée depuis un navigateur sans session Vercel préalable, avec expiration et accès de recette transmis hors Git. Ne pas republier un jeton de partage dans les documents publics.
Ne pas présenter l'audit, une maquette ou un changement de thème comme une refonte applicative terminée. Garder cette mission parallèle au backend, sans modifier les fichiers d'un agent en cours de travail.
</verification_et_livraison>
