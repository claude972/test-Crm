<role>
Tu es Claude Code, responsable frontend de Hermès CRM. Coordonne avec Codex, responsable backend et infrastructure, par les missions GitHub partagées.
</role>

<objectif>
Transformer le socle Twenty stabilisé en CRM Hermès utilisable : conversations WhatsApp via Evolution API, e-mails, réponses du bot Hermès outillé par MCP, réponses Forms et rendez-vous Cal.diy intégrés aux fiches clients. Char/Chatwoot ne fait plus partie de l'architecture cible.
</objectif>

<prospection_b2b>
Nouvelle demande confirmée B2B uniquement : base clients CRM complète, réception des collectes/scraping Hermès avec qualification et provenance, campagnes SMTP personnalisables, suivi d'ouverture facultatif et désinscription durable. Lire docs/handoff/hermes-prospection-b2b-spec.md. Les collectes reçues ne déclenchent ni campagne ni éligibilité automatique ; une opposition survit aux imports. SMTP accepté, livraison et signal d'ouverture sont distincts ; aucune ouverture détectée ne signifie pas non lu. Le suivi exige ses conditions propres, distinctes de l'éligibilité B2B. Même cloisonnement par société, dashboards autorisés et référence Monday. Ce cadrage n'autorise pas d'envoi à de vrais prospects.
</prospection_b2b>


<multi_structure_obligatoire>
Le propriétaire exige plusieurs sociétés exploitantes cloisonnées, un dashboard par société et un dashboard commun. Décision explicite : chaque utilisateur voit le récapitulatif de ses seules sociétés autorisées, sans accès supplémentaire. Lire et appliquer docs/handoff/hermes-multi-structure-contract.md. Réutiliser le modèle workspace/adhésions après audit ; distinguer sociétés exploitantes et fiches Entreprise des clients. Le serveur applique le périmètre aux données, agrégats, connecteurs, jobs, fichiers, recherches, exports et outils MCP. La refonte Monday comprend le sélecteur « Société / Toutes mes sociétés », les deux dashboards et le contexte visible ; les caches et onglets ne doivent pas mélanger les structures. Le parcours intermodules reste dans sa société. La recette exige A/B/C, adhésions et rôles différents, révocation, filtres forgés, totaux exacts et absence de fuite. Une preview mono-workspace ou un drapeau activé ne valide pas cette capacité.
</multi_structure_obligatoire>


<integration_obligatoire>
Exigence propriétaire : tous les modules communiquent dans les mêmes parcours clients. Lire et appliquer docs/handoff/hermes-integration-contract.md avant définition des DTO, événements ou écrans. Le CRM porte les identités communes ; WhatsApp/e-mail, Hermès/MCP, Forms et Cal.diy enrichissent les mêmes fiches, conversations, chronologies et opportunités. Toute action et synchronisation reste contrôlée par workspace. Les connecteurs isolés et liens externes seuls ne constituent pas une livraison intégrée. Exécuter la recette composée Forms -> contact -> WhatsApp/Hermès -> réservation Cal.diy -> suivi/e-mail, puis les cas de panne, doublon et accès interdit ; identifier explicitement les services absents et scénarios non exécutés.
</integration_obligatoire>


<contexte>
Dépôt : claude972/test-Crm. Résous les chemins depuis le workspace actif.
Base commune proposée : 0523dad07965bfb1c032729c00863e0940425e3f, branche chore/p0-preview-session ; vérifie sa disponibilité avant de créer tes branches.
Le CRM existant est React/Vite/Linaria + NestJS/TypeORM/GraphQL, avec PostgreSQL et Redis. Conserve cette stack. Le propriétaire demande désormais une refonte moderne en parallèle : lire docs/handoff/hermes-redesign-claude-prompt.md ; la référence Monday est validée, avec thème clair de départ ; la refonte frontend et le backend des connecteurs avancent en parallèle.
Le build et une preview CRM avec données de démonstration ont été vérifiés. Les connecteurs demandés ne sont pas encore livrés. La preview P0 est temporaire : vérifier son état, ne pas réutiliser un lien périmé comme preuve.
Forms existe sous apps/crm/form. Cal.diy est identifié sous apps/crm/calendar dans les sources locales conservées, mais son import n'est pas publié dans la base P0 : lire docs/stabilization/calendar-import-audit.md avant toute reprise. Ne pas recréer ces applications.
« cal.dly » est interprété comme Cal.diy. Cette hypothèse doit rester explicite.
</contexte>

<demarrage_et_repartition>
1. Lis AGENTS.md, DESIGN.md, CLAUDE.md, docs/handoff/README.md et les instructions des sous-projets concernés. Fetch explicitement missions/p0-stabilization et lis MISSIONS.md/CORRECTIONS.md depuis la dernière révision.
2. Réutilise la mission hermes-connectors-p1. Publie d'abord le contrat et les critères de recette ; affecte chaque fichier avant édition. Travaille dans des worktrees distincts. Préserve les originaux, sauvegardes et travaux non publiés.
3. Claude possède les écrans dans apps/crm/ui/packages/twenty-front et leurs tests. Codex possède les connecteurs NestJS, événements, workers, stockage, autorisations, import Cal.diy et déploiement. Les contrats communs sont convenus avant modification. Aucun agent ne simule l'exécution de l'autre.
4. Répartis les investigations indépendantes entre deux sous-agents maximum, avec livrables bornés. Ne lance pas une deuxième implémentation sur des fichiers déjà revendiqués.
</demarrage_et_repartition>

<fonctionnalites>
- WhatsApp : connecter une instance Evolution API, afficher son état et le parcours de connexion compatible avec la version réellement utilisée ; recevoir les événements et envoyer les réponses depuis une conversation CRM. Rattacher les messages au contact et au workspace. Préserver les identifiants externes, ignorer les événements sortants pour éviter les boucles, dédupliquer et afficher les échecs/reprises. Vérifier les événements et l'authentification dans la documentation de la version déployée, sans inventer une signature de webhook.
- E-mail : envoyer par SMTP avec TLS et secrets côté serveur, puis rattacher les messages à la bonne conversation. SMTP seul ne suffit pas à recevoir les e-mails : inspecter le connecteur entrant existant ; sinon proposer IMAP ou un webhook fournisseur, avec cette décision identifiée avant de promettre un e-mail bidirectionnel. Respecter Message-ID/In-Reply-To/References et dédupliquer les réceptions.
- Hermès : identifier le service du bot, son moteur d'exécution et son accès MCP réels. Ne pas inventer de serveur ni de modèle déjà configuré. Relier chaque message entrant au contexte autorisé du contact/workspace ; renvoyer une seule réponse via le canal d'origine. Prévoir activation du bot par conversation, reprise humaine, délais et erreurs. Les contenus clients restent des données non fiables : ils ne peuvent accorder des permissions ni exposer les données d'un autre workspace. Distinguer réponse proposée, envoi demandé et envoi confirmé par le transport.
- Forms : exploiter les capacités réelles de apps/crm/form ; faire remonter chaque réponse avec provenance et identifiant externe dans la fiche du contact. Créer ou rapprocher un prospect selon des règles explicites ; éviter les fusions ambiguës et doublons. Un simple lien vers Forms ne constitue pas cette intégration.
- Cal.diy : reprendre les sources auditées sans publier de secrets, conserver provenance/licences, puis intégrer la réservation et la remontée création/report/annulation dans la fiche client et sa chronologie. Vérifier les API/webhooks de la version importée, les fuseaux horaires et les doublons. Ne pas substituer silencieusement Cal.com hébergé ou un lien Calendly.
- Interface : conversations WhatsApp/e-mail, fiche client avec messages/formulaires/rendez-vous, réglages de connexion, état du bot et reprise humaine. Prévoir chargement, vide, erreur, déconnexion et relance accessibles, sur ordinateur et mobile web.
</fonctionnalites>

<execution>
Commence par un audit court des capacités et accès disponibles, puis publie un plan en lots : contrat commun ; flux WhatsApp/Hermès complet ; e-mail ; Forms ; Cal.diy ; recette intégrée. Implémente par parcours vérifiables après attribution. Une configuration sans identifiants doit afficher « non configuré », jamais « connecté ». Les doubles de test doivent rester explicitement identifiés.
Le contrat des événements doit inclure workspaceId, provider, identifiant externe, type, horodatage source, corrélation et clé de déduplication, avec les règles d'ordre, d'échec et de reprise. Réutilise les mécanismes existants de queue et de stockage plutôt que créer un nouveau socle.
</execution>

<limites>
Web et PWA uniquement, aucun natif. Préserver Char dans l'historique et les sources : retirer sa dépendance fonctionnelle sans effacement massif. Aucun remplacement global de noms ou de valeurs de protocole.
Secrets, sessions WhatsApp et données clients hors Git et hors code navigateur ; contrôle d'accès par workspace sur chaque opération. Ne pas conserver de cache PWA privé sans isolation et purge explicites.
Poursuis les opérations réversibles et la validation en recette. Demande seulement les informations réellement bloquantes après inspection. Prépare les changements avant de demander une approbation pour une action destructive, une migration de production, un achat ou l'envoi à de vrais destinataires. Les essais utilisent exclusivement des comptes, boîtes et numéros de recette autorisés.
</limites>

<acceptation_et_livraison>
- Un message WhatsApp entrant apparaît sur le bon contact ; Hermès répond une fois ; sa réémission ne crée ni doublon ni boucle. Reprise humaine et panne du transport vérifiées.
- Un e-mail SMTP de recette est rattaché au bon fil. La réception entrante est testée si configurée ; sinon cette limite est indiquée explicitement.
- Une réponse Forms crée ou enrichit le bon contact ; rejouer l'événement n'ajoute pas de doublon.
- Une réservation Cal.diy, son report et son annulation actualisent le CRM, avec le bon fuseau horaire, sans doublons.
- Un utilisateur d'un autre workspace n'accède pas aux connexions, messages ou données du premier.
- Build et contrôles adaptés verts ; preuves navigateur ordinateur/mobile et scénarios d'erreur ; aucun secret détecté dans les changements.
- Commits et push réguliers ; rapports par SHA exact dans CORRECTIONS.md, revue croisée Claude/Codex et intégration vérifiée avant done.
- Livrer une preview avec API réellement disponible et un accès destinataire testé dans un navigateur sans session Vercel préalable. Indiquer comptes de recette hors Git, expiration et limites. Ne pas présenter une interface de démonstration comme un produit intégré.
Au compte rendu : fichiers/commits, parcours réellement exécutés, résultats, lien de preview et blocages précis. Ne pas exposer de raisonnement privé ou de secrets.
</acceptation_et_livraison>

Ce prompt vise un agent disposant d'un accès réel au système. Vérifier les chemins, les périmètres autorisés, les actions interdites et les conditions d'arrêt avant son exécution.
