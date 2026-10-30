# Hermès V3 — recette des maquettes de phase 1

Phases 0 et 1 terminées techniquement : audit, contrats proposés et maquettes statiques livrés. Validation visuelle utilisateur attendue avant câblage. Mission : `HERMES-V3-AUDIT-MAQUETTES-20261030`. Le livrable est un prototype statique ; aucune API CRM ou connexion fournisseur n’est raccordée.

## Révisions

| Livrable | Révision | État |
|---|---|---|
| Audit de capacités | `095582346e227d627437560c66445e9a9211bcb9` | Revu documentairement en phase 0 |
| Contrats corrigés | `5bb6f2430d09baccb8a60b4d271047c47e239cb7` | Claude a clos les huit constats et la réception sur 954b565 à 20:01:39 UTC ; dernier ajout SentMessage, lecture bidirectionnelle et ledger relu root sur ce SHA final, sans prétendre à une relecture Claude de 5bb6f243 |
| Prototype final | `f63858813d68be138612114a2b347fd606984557` | Poussé ; delta CSS revu et recheck local desktop/mobile effectué |

La preview de l’ancien checkpoint `b6c3f25a8bc9521a5b790ae9646e47a49417b0fe` a été ouverte sans connexion, mais ne vaut pas preuve du déploiement final `f638588`. Le redéploiement final exact est maintenant vérifié ci-dessous.

## Contrôles effectués dans le périmètre prototype

| Contrôle | Résultat observé par root / revue indépendante | Limite |
|---|---|---|
| Sources statiques | Quatre fichiers JS passent `node --check` au checkpoint b6 ; héritage des modes, filtres, absence de réseau fournisseur revus | Delta final de deux fichiers CSS relu séparément ; pas de build applicatif V3 |
| Modes et brouillons | ASSISTED permet un brouillon insérable ; OFF le désactive et conserve la réponse humaine | Simulation, aucun appel MCP réel |
| Médias locaux | Vidéo de 5,055 s prête et jouable, vocal en lecture avec bouton pause | Fixtures locales, pas d’Evolution ni de microphone réel |
| E-mail | Boîte et éditeur rendus ; Répondre à tous cible Léa avec Sophie en Cc ; brouillon enregistré retrouvé | Données en mémoire uniquement |
| Pipeline | Carte Cuisine déplacée de NEW vers SCREENING ; agrégat Qualification à 2 / 36 900 | Mutation de démonstration, sans API ni persistance DB |
| Mobile | WhatsApp liste vers fil ; e-mail dossiers vers liste vers fil ; document de 390 px | Vérification locale du prototype, pas d’installation PWA |
| Débordement final | À 1280 px : document 1280, bord droit du sélecteur 1121 ; à 390 px : document 390, bord droit 369 | Recheck local exact du correctif CSS final |

Les constats `V3-DESIGN-001` à `V3-DESIGN-011` sont corrigés et revus dans le périmètre prototype décrit dans `CORRECTIONS.md`. Ces contrôles ne certifient aucune intégration CRM, fournisseur ou persistance commerciale.

## Preview et captures finales

Déploiement `dpl_Fm1v7W9LCNvTTDDmBBVCp9n2bEs7`, état READY, source `f63858813d68be138612114a2b347fd606984557`. Origine brute protégée : HTTP 302 ; partage anonyme : HTTP 200 ; dix-huit fichiers contrôlés répondent HTTP 200. Protection du projet préservée, aucun domaine de production substitué. Preuve filtrée : [hermes-v3-phase1-public-proof.json](hermes-v3-phase1-public-proof.json).

Le partage expire le **31 octobre 2026 à 15:58:41 en Martinique**, soit **19:58:41 UTC**. L’URL privée est remise uniquement dans le chat ; aucun token de partage ni chemin vers son stockage n’est enregistré dans Git.

Root a ouvert le déploiement final dans un nouvel onglet via lien privé sans connexion Vercel : launcher et boîte e-mail accessibles ; desktop 1280 px sans débordement ; vocal jouable et bouton pause visible ; vidéo de 5,055 s prête et en lecture. Les fixtures Verdure restent isolées d’Atelier ; OFF désactive AUTO et ASSISTED. À 390 px, WhatsApp liste→fil et e-mail dossiers→liste→fil restent dans la largeur du document ; Menu s’ouvre.

Cinq captures finales présentes hors Git ; taille et SHA256 enregistrés dans la preuve JSON, aucun binaire commité :

- `/Volumes/Stockage/dev/hermes-crm/artifacts/hermes-v3-maquettes/whatsapp-desktop.png`
- `/Volumes/Stockage/dev/hermes-crm/artifacts/hermes-v3-maquettes/email-desktop.png`
- `/Volumes/Stockage/dev/hermes-crm/artifacts/hermes-v3-maquettes/email-mobile.png`
- `/Volumes/Stockage/dev/hermes-crm/artifacts/hermes-v3-maquettes/pipeline-desktop.png`
- `/Volumes/Stockage/dev/hermes-crm/artifacts/hermes-v3-maquettes/whatsapp-mobile.png`

## Limites et prochaine décision

Aucun build applicatif V3, test fournisseur/runtime réel, persistance DB, installation PWA ou audit exhaustif d’accessibilité effectué pour cette livraison. Original `test-Crm`, secrets, bases et sauvegardes préservés. Aucun envoi réel, nouveau service payant ou déploiement en production.

La validation visuelle détaillée utilisateur reste nécessaire avant tout câblage et avant les phases 2 à 8. L’autorisation initiale d’agir en autonomie concernait les phases 0 et 1, sans approuver de maquette non vue.
