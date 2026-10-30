# Vérification de la chaîne backend P0 — Codex

Date : 29 octobre 2026. Mission : p0-frontend-baseline / codex.

- Branche : `fix/codex-backend-build`.
- Base : `c0318cf0b33134c4c292affe395009a6bd3b4662`.
- Révision applicative/CI vérifiée : `79305ae2e63e72456e3c5b78ae5ced483d951557`.
- PR brouillon : https://github.com/claude972/test-Crm/pull/7.
- CI réussie : https://github.com/claude972/test-Crm/actions/runs/40972089496.

## Changements

Reprise de 20 réparations locales d'identifiants/chemins dans le SDK client et le paquet d'e-mails. Les comparaisons limitent ces changements aux jetons techniques et aux chemins ; aucun changement de contenu des e-mails, règle d'authentification, protocole, cookie ou clé persistante. Les sources originales restent en lecture seule.

Le test du client généré a révélé un autre chemin de fichier incorrect, également présent dans le script de génération metadata. Les lecteurs pointent maintenant sur `twenty-client-template.ts`, nom réel du fichier, au lieu de `kovaa-lab-client-template.ts`.

Le projet TypeScript de production incluait implicitement un script de construction frontend et les sources des exemples copiés comme ressources, alors que le projet de base excluait déjà ces exemples. Le périmètre est désormais celui du runtime serveur (`src/**/*.ts`, `src/**/*.tsx`) avec l'augmentation Express requise. Tests et exemples restent à vérifier dans leurs projets/outils appropriés. Les options `noImplicitAny`, `strictNullChecks` et `alwaysStrict` restent héritées et inchangées ; aucune suppression de diagnostic ni ajout de `any` pour contourner les erreurs.

## Contrôles exécutés

- Analyse syntaxique locale : 200 sources TypeScript/TSX du SDK et des e-mails sans diagnostic.
- Gitleaks sur les changements préparés et contrôle d'espacement : réussis, aucune détection non résolue.
- Installation Yarn 4 immuable sur un checkout neuf en CI : réussie, avec les avertissements de dépendances déjà signalés pour le checkpoint P0.
- Shared : bundle CJS/ESM et déclarations construits, sorties requises non vides.
- SDK client : bundles standard et metadata, déclarations et résolution des alias construits ; artefacts CJS/ESM/types requis présents.
- Tests existants du client généré : trois suites, 19 tests réussis — 14 authentification, quatre upload, un contrat de stub.
- E-mails : bundle et déclarations construits ; `dist/index.js` et `dist/index.d.ts` non vides. Aucun envoi de message.
- Serveur : `tsgo -p tsconfig.build.json --noEmit --singleThreaded` réussi dans le périmètre de production décrit ci-dessus.
- Nest/SWC : compilation réussie, `dist/main.js` et `dist/queue-worker/queue-worker.js` non vides. SDK client conditionné dans les assets conformément au target existant ; ses fichiers runtime et de déclaration requis sont présents.

La CI collecte les étapes de construction indépendantes même après un échec de tests du SDK, lorsque leurs dépendances sont produites. Un succès partiel ne transforme jamais la conclusion globale en succès.

## Corrections et limites

Les échecs intermédiaires et leurs corrections sont conservés dans `CORRECTIONS.md` sur `missions/p0-stabilization` : P0-SDK-001 pour le chemin du template, P0-TYPES-001 pour le périmètre de production. Le résultat final ci-dessus vérifie ces corrections sur leur SHA exact.

Aucun serveur, worker, base ou volume existant n'a été démarré ou migré. Aucun test métier serveur avec base, E2E, exécution de l'application complète, construction des outils/exemples frontend ou preview intégrée n'est revendiqué. Cette branche ne modifie ni les fonctionnalités P1, ni la stack, ni la politique d'accès aux données. Les sources frontend et Cal.diy restent à reprendre selon les missions partagées.

## Revue attendue de Claude

Relire `79305ae2e63e72456e3c5b78ae5ced483d951557` et ses changements relatifs à la base commune : cohérence des noms exportés/importés, conservation des protocoles, pertinence des frontières runtime/outillage et intégration avec les réparations frontend. Les constats et la re-vérification doivent être publiés dans le rapport partagé. Le build vert ne remplace pas cette revue croisée ; aucune mission globale P0 n'est déclarée terminée ici.

## Démarrage isolé — réparation de résolution SWC

La CI d'intégration 40979175124 a ajouté un contrôle réel de démarrage avec PostgreSQL/Redis jetables. Builds, types et 19 tests passent, mais le tout premier script compilé setup-db.js échoue avant sa connexion : MODULE_NOT_FOUND, chemin ../../../../../src/database/typeorm/raw/raw.datasource.

Cause : .swcrc conservait baseUrl ./../../ (racine du workspace), alors que les aliases ./src/* de tsconfig.json sont désormais relatifs au paquet serveur. La sortie SWC sortait donc de dist pour chercher des sources au mauvais endroit. La correction minimale aligne baseUrl sur le paquet (.). Cette même réparation existe déjà dans les originaux locaux ; elle est reprise sans les modifier. Elle ne change aucun schéma, contrat ou option stricte.

Le succès de compilation précédent ne prouvait pas cette résolution runtime. Nouvelle vérification de démarrage requise après intégration ; ce résultat ne doit pas encore être déclaré réussi.
