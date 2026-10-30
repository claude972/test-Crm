# Preview du matin — 30 octobre 2026

Branche `chore/p0-morning-preview`, base exacte `0523dad07965bfb1c032729c00863e0940425e3f`. Propriété accordée par root : workflow preview, orchestrateur CI, tests et ce rapport. Originaux, backend/frontend applicatifs et configurations privées exclus. Coordination missions/specifications actuelles relues sur `missions/p0-stabilization` avant le lot.

## Changement concret

Le workflow propose désormais `workflow_dispatch.inputs.session-minutes`, choix strict **60 ou 90**, défaut **90**. Un lancement par nouvelle branche `preview/p0-session-*` utilise également **90 minutes**. L'orchestrateur valide le choix avant tout appel réseau ou lancement de processus et calcule une seule date absolue depuis le début du gate/tunnel. Aucun plafond de helper n'est relevé au-delà de 90 minutes ; aucun changement de contrôle ne prolonge la durée. Pour un appel direct sans paramètre, le défaut historique de 60 minutes est conservé.

Le timeout du job passe à **150 minutes** pour laisser la construction précéder la session de 90 minutes sans consommer son budget. Les protections, secrets, PG/Redis jetables, worker, contrôle public atomique et nettoyages existants sont conservés. Aucun lancement cloud, déploiement Vercel, contrôle public ou automation créé par ce lot.

Vérification exécutée : `node --test scripts/preview-morning.test.mjs`, un test comprenant 14 invocations de sous-processus. Onze entrées invalides refusées avant réseau/processus ; défaut et choix 60/90 atteignent exclusivement un fetch de métadonnées intercepté localement puis arrêt de fixture, sans service ni réseau réel. Aucune valeur de secret de fixture dans les sorties. `node --check scripts/preview-ci-session-p0.mjs` et `git diff --check` réussis. Le test ne revendique pas une disponibilité cloud ou une validation navigateur.

## Disponibilité pour 06:00 Martinique

Option sans nouvel hébergement payant : root relance une session fraîche vers **05:00–05:15 America/Martinique (09:00–09:15 UTC)**, sur le SHA frontend/backend effectivement retenu et construit. La durée absolue de 90 minutes démarre après la construction, au lancement du gate. Root récupère le nouveau tunnel, prépare le vrai bundle frontend, vérifie le target preview Vercel avant contrôle public, recrée un lien de partage borné à l'expiration et revérifie l'accès utilisateur/API réelle. Annoncer l'heure d'expiration réellement publiée par l'artefact, sans promettre une disponibilité permanente ou le maintien des données d'une session jetable précédente. Une relance matinale est nécessaire ; les anciens liens/API P0 expirent.

Root garde la responsabilité du réveil autonome autorisé par le propriétaire et de cette livraison matinale ; ce lot n'installe aucun watcher permanent. Le job GitHub-hosted est limité à six heures, ce n'est donc pas une solution permanente : [limites officielles GitHub](https://docs.github.com/en/actions/reference/limits).

## Alternatives vérifiées en lecture seule

Railway CLI **5.30.1 authentifiée**, un workspace accessible avec 19 projets. Métadonnées d'usage uniquement : environ **36,89 USD** déjà facturables dans le cycle courant, sans plafond workspace configuré. Rien ne démontre une enveloppe gratuite disponible pour une nouvelle API/PG/Redis ; aucun nouveau service, projet, abonnement ou modification de quota autorisé par ce constat. [Railway facture les ressources consommées selon le plan](https://docs.railway.com/pricing/plans). Aucun token ou variable de service lu/affiché.

Métadonnées de dépôts uniquement inspectées pour les deux noms CRM/Hermès existants ; aucun lien vers test-Crm établi par cette inspection. Leur existence ne prouve ni isolation ni autorisation de réutiliser leurs données. Aucun endpoint métier ou configuration de ces projets consulté.

Docker : contextes colima et colima-hermes-crm présents ; métadonnées de connexion interrogées, les deux daemons sont inaccessibles. Aucun démarrage de VM/conteneur ni lecture de DB/fichier privé effectué. Cette voie ne fournit donc pas une API persistante déjà prête.

Conclusion de disponibilité : la route concrète sans nouveau coût d'hébergement engagé reste une session Actions fraîche et bornée. Une API Railway permanente nécessiterait une décision explicite sur les frais et une nouvelle infrastructure isolée ; aucune disponibilité n'est inventée.
