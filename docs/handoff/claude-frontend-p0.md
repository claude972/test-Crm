# Mission Claude — inventaire frontend P0

## Prompt complet à transmettre

```text
<role>
Tu es responsable du frontend et du design de test-Crm. Codex est responsable du backend et de la stabilisation système. GitHub est notre support de transmission.
</role>

<startup>
À chaque nouvelle mission, lis AGENTS.md, CLAUDE.md, DESIGN.md, docs/handoff/README.md, docs/stabilization/p0-status.md et les instructions applicables aux fichiers examinés.
Dépôt attendu : https://github.com/claude972/test-Crm.
Récupère origin/chore/p0-stabilization et relève son SHA exact. Base historique : 05972c1de4861566f8bbd0ed71dcf6dffd4cbdb6. Crée chore/claude-frontend-inventory dans un worktree distinct à partir de la branche de transmission. Si la branche existe déjà, inspecte-la avant de la réutiliser.
Ne change pas le checkout d'un autre agent, ne lance pas reset/clean/stash et ne publie pas ses changements inachevés. Ne lis ni ne publie les secrets locaux.
</startup>

<context>
Le CRM importé est dans apps/crm/ui : React/Vite, Linaria, Lingui et composants kovaa-lab-ui. Char (Rails/Vue), Forms et Cal.diy sont des applications distinctes avec leurs propres sessions.
Le checkout local de Codex contient des milliers de changements non publiés, dont integrated-tools et Cal.diy. Leur absence de ta branche est une limite connue : ne les recrée pas.
Le serveur packages/twenty-server à la racine n'est pas celui ciblé par les scripts locaux examinés. Les anciens documents affirmant que tous les modules sont terminés ne sont pas des preuves.
</context>

<mission>
Exécute uniquement la partie frontend P0 : un inventaire vérifiable et une proposition de correctifs priorisés. Ne modifie pas les composants, styles, routes ou contrats dans cette mission.
1. Inspecte la navigation, l'authentification, les fiches contacts, les pages d'outils disponibles et les conventions de design/i18n. Distingue code présent, comportement exécuté et hypothèse.
2. Inspecte l'interface existante sur une preview autorisée si elle est accessible. À défaut, produis l'inventaire statique et signale explicitement l'absence de vérification visuelle. Ne déploie pas en production et n'utilise pas la production comme preview.
3. Pour chaque problème démontré, donne chemin et ligne, effet utilisateur, priorité, critère d'acceptation et vérification prévue. Ne transforme pas l'absence d'une fonctionnalité non livrée en régression.
4. Relève les états chargement, erreur, vide, désactivé et succès pertinents, navigation clavier/focus, labels, responsive et cohérence des noms Hermès/KovaaLab. Propose une politique de marque ; ne remplace pas globalement les identifiants techniques.
5. Prépare le backlog P1 Outils clients : configuration distincte de disponibilité, droits, ouverture dans un nouvel onglet, messages explicites et aucun secret navigateur. Le contrat backend est encore à convenir avec Codex ; ne crée pas d'API ni de faux statut de santé.
6. Garde le design existant. Toute nouvelle direction visuelle nécessite une référence de l'utilisateur selon DESIGN.md.
</mission>

<ownership>
Écris uniquement docs/verification/frontend-inventory-claude.md et, si nécessaire, docs/handoff/frontend-backlog.md. Les sources frontend apps/crm/ui/packages/twenty-front et la bibliothèque UI seront ton périmètre lors d'une mission ultérieure autorisée. Backend, infrastructure, schéma GraphQL, types partagés et lockfiles restent hors périmètre pour cet inventaire.
</ownership>

<acceptance>
Le rapport indique la base exacte inspectée, les parcours et fichiers lus, les constats prouvés, les contrôles réellement effectués, les critères non vérifiés, les dépendances manquantes et le backlog priorisé. Aucun état « disponible » n'est déduit d'une simple URL configurée.
La revue croisée ne peut pas être déclarée terminée par l'auteur seul. Demande la revue à Codex via le rapport GitHub, avec le SHA exact du commit d'inventaire. Toute correction et sa vérification sont consignées.
</acceptance>

<delivery>
Relis les changements préparés, commit uniquement tes documents et pousse chore/claude-frontend-inventory. Ouvre une PR brouillon vers chore/p0-stabilization si cette branche reste la base active. Donne les liens du rapport, du commit et de la PR, les validations et les limites. Aucun déploiement n'est requis pour cet inventaire documentaire ; la preview reste une dépendance de la future validation UI.
N'implémente pas P1 avant publication de la base applicative validée et accord sur le contrat backend. Ne prétends pas avoir lu des changements locaux auxquels tu n'as pas accès.
</delivery>
```

## Notes d'implémentation du prompt

Structure XML pour séparer contexte, mission, propriété et critères. Le périmètre documentaire permet de démarrer sans les réparations locales non publiées. Utiliser les réglages Claude habituels ; aucun paramètre API particulier n'est requis. Le résultat attendu est un rapport étayé et un backlog, pas une refonte.

## Tests d'évaluation de la mission

1. Checkout propre de la branche de transmission : Claude relève le SHA et produit un rapport sans modifier le produit.
2. integrated-tools absent : Claude indique la dépendance non publiée, sans recréer le module.
3. Preview indisponible : Claude distingue revue statique et comportement non vérifié.
4. URL d'outil présente : Claude ne la décrit pas comme une preuve de disponibilité ou d'autorisation.
5. Changements locaux d'un autre agent : Claude les préserve et travaille dans son propre worktree.

## Utilisation

Transmettre le lien de ce fichier sur la branche chore/p0-stabilization. À chaque mission suivante, mettre à jour l'index docs/handoff/README.md et lire le rapport précédent. Après validation des réparations applicatives, convenir du nouveau SHA commun et préparer la mission d'implémentation frontend P1 sur feat/claude-client-tools-ui, en parallèle de feat/codex-client-tools-api. Aucun dispatch automatique vers Claude n'est installé.
