# Corrections et vérifications partagées

## Mission p0-stabilization — agent: codex

- Branche d'implémentation : chore/p0-stabilization
- Révision applicative/CI courante : 89ab4e8b17c039fec3e2ea29d2e90fac436c156b ; rapports actualisés dans c0318cf0b.
- État du lot Codex : contrôles du checkpoint terminés, rapport prêt pour revue ; P0 global et revue croisée restent ouverts.
- Changements : sauvegarde privée vérifiée ; réparations d'identifiants Forms et backend Char/CRM ; chemins workspaces/lockfile et bibliothèque UI manquante ; scripts locaux conservateurs, frontières de migration et refus de runtime partagé depuis les worktrees.
- Compatibilités préservées : dérivation des secrets Forms, nom du cookie Char et marqueur historique de réponse SDK. Catalogues de traduction générés exclus.
- Contrôles : 839 sources Forms analysées et deux bootstraps HTML exécutés ; compatibilité chiffrement/mauvaise clé/altération vérifiées ; 3 369 sources Ruby compilées sans exécution sous Ruby 3.4.4 ; 13 954 sources backend/shared TS analysées et 50 293 imports internes résolus ; setup idempotent/permissions 0600, cibles de migration erronées et opérations de worktree partagé refusées ; Compose validé sans démarrage. Gitleaks sur les lots publiés sans détection non résolue.
- Preuves : https://github.com/claude972/test-Crm/actions/runs/40962647364 ; https://github.com/claude972/test-Crm/actions/runs/40963891231 ; détail historique dans docs/verification/p0-codex.md de la branche d'implémentation.
- Installation Yarn immuable : réussie avec avertissements de peer dependencies ; cela ne prouve pas un build.
- Preview : aucune vérifiée ; aucune production déployée, aucun volume existant démarré ou migré.
- À vérifier par Claude : commits Forms ff366e7ea/db4d81302, Char 2bd457ecc, cohérence de la navigation et limites frontend ; ne pas étendre une revue de syntaxe en validation applicative globale.
- Limites : build shared désormais vérifié, mais frontend restant à reprendre, Cal.diy conservé localement, build/typecheck serveur complet, E2E et preview intégrés non effectués.

### P0-BUILD-001
- reviewer: codex
- assigned agent: codex
- reviewed branch: chore/p0-stabilization
- reviewed revision: bb11083776b05f4998d6ddc1a5f15e2deb16539e
- evidence: CI 40963891231, job crm-workspace. Les assertions d'artefacts font échouer le contrôle. La CI ne lançait que Vite, alors que le target existant prévoit aussi tsgo puis tsc-alias pour les déclarations. Un code de sortie zéro du bundle seul ne prouvait donc pas la construction complète. Le journal initial ne permettait pas de conclure que toutes les sorties runtime étaient absentes.
- expected correction: exécuter une construction effectivement attendue et vérifier les sorties CJS, ESM et déclarations ; conserver un échec explicite si la construction n'a pas lieu.
- status: verified
- fix commit: 3adbd349dae9b91719c82426f55b447f17deed1f (API Vite attendue), 8b92d764613e12839a35c3205f41da6bf8c52b3d (phase déclarations configurée ajoutée)
- recheck evidence: CI https://github.com/claude972/test-Crm/actions/runs/40969724576 terminée avec succès sur 89ab4e8b17c039fec3e2ea29d2e90fac436c156b : cinq jobs verts, runtime CJS/ESM et déclarations TypeScript vérifiés non vides. La comparaison 89ab4e8b1..c0318cf0b ne contient que des documents. Cette vérification ne couvre pas le build serveur/frontend complet.

### Conservation et coordination — actualisation de reprise

Nouvelle comparaison après interruption : 55 696 fichiers d'origine contrôlés, zéro fichier différent et zéro manquant. La session Claude déjà active sur la mission #5 est conservée ; la relance de l'ancien contexte a été arrêtée pour éviter un doublon. Le rapport Claude reste attendu, sans déclaration de revue terminée.

## Mission p0-stabilization — agent: claude

Rapport attendu de Claude sur sa branche d'inventaire. Cette absence de rapport ne constitue pas une revue sans constat.

## Mission p0-stabilization — revue Codex de l'inventaire Claude

- reviewer: codex
- reviewed branch: chore/claude-frontend-inventory
- reviewed revision: 1501776ca799b8ce1720fc330ff04dbf00598b39 (PR #6 ; inventaire initial b95ce0341d970201a5c5334397736e8317716fcf, ajouts documentaires ensuite).
- Périmètre relu : les deux documents de la PR, sources citées, comparaison de la base bb1108377 avec c0318cf0b, parsing et imports internes du frontend publié et des fichiers correspondants du checkout original en lecture seule.
- Reproduction : sur 11 336 sources hors catalogues du périmètre choisi, le frontend publié présente bien 223 diagnostics de parsing sur 51 fichiers et 27 imports de code non résolus vers les cinq modules cités ; 45 imports d'assets sont exclus du décompte de code. Le même périmètre dans les originaux locaux donne zéro diagnostic et zéro import de code non résolu. Ces réparations existent donc déjà localement ; elles doivent être reprises par lots compris, pas recréées ni copiées avec les catalogues et fonctionnalités mélangées. Les nombres de fichiers varient selon le filtre, pas les 223/27 diagnostics reproduits.
- Décision de contrat : préserver IconTwentyStar et IconTwentyStarFilled exportés par la bibliothèque UI ; corriger leurs consommateurs, pas renommer la bibliothèque. Conserver les basenames Twenty* existants.
- CI : la couverture frontend proposée est justifiée. La future mission doit ajouter un contrôle dédié aux sources et aux assets réels, avec déclenchement sur la branche d'implémentation ; ne pas rendre rouge le checkpoint backend sans y reprendre la correction frontend correspondante.
- Design/marque/domaines : aucun arbitrage visuel ou juridique inventé. Garder le design existant pendant P0 ; les choix de marque, police et destinations légales restent hors de cette réparation de syntaxe.
- Limites : aucun rendu, test clavier/responsive, E2E ou typecheck frontend ; parsing/imports ne prouvent pas le comportement. La revue des deux documents demande les précisions ci-dessous, pas un rejet des constats P0 reproduits.

### P0-DOC-001
- reviewer: codex
- assigned agent: claude
- reviewed branch: chore/claude-frontend-inventory
- reviewed revision: 1501776ca799b8ce1720fc330ff04dbf00598b39
- evidence: docs/verification/frontend-inventory-claude.md:256 déduit « le domaine n'est pas enregistré » de NXDOMAIN. Ce résultat porte sur le DNS ; aucun contrôle de registre n'est fourni. Voir RFC 2308, section 2.1 : https://www.rfc-editor.org/rfc/rfc2308.html#section-2.1.
- expected correction: conserver le constat de résolution DNS et de lien injoignable à la date du test ; retirer la conclusion d'enregistrement ou la prouver séparément via le registre. Ne pas enregistrer ni remplacer un domaine dans cette mission documentaire.
- status: open
- fix commit: en attente
- recheck evidence: en attente de la correction documentaire.

### P0-DOC-002
- reviewer: codex
- assigned agent: claude
- reviewed branch: chore/claude-frontend-inventory
- reviewed revision: 1501776ca799b8ce1720fc330ff04dbf00598b39
- evidence: docs/handoff/frontend-backlog.md:31 parle du champ serveur allowRequestsToTwentyIcons. Sur la base inspectée et la base courante, client-config.entity.ts:423 expose allowRequestsToKovaaLabCRMIcons via @Field sans alias, et client-config.service.ts:297 renvoie cette même clé.
- expected correction: décrire le contrat réel allowRequestsToKovaaLabCRMIcons ; le frontend et sa génération doivent s'y aligner, sans changement de schéma backend ajouté pour ce motif. Conserver les noms de fichiers Twenty* ; cela ne définit pas le nom du champ GraphQL.
- status: open
- fix commit: en attente
- recheck evidence: sources backend examinées ; correction du backlog attendue.

### P0-DOC-003
- reviewer: codex
- assigned agent: claude
- reviewed branch: chore/claude-frontend-inventory
- reviewed revision: 1501776ca799b8ce1720fc330ff04dbf00598b39
- evidence: docs/verification/frontend-inventory-claude.md:487 évoque un renommage du marqueur SDK. git show 05972c1de:apps/crm/ui/packages/twenty-shared/src/types/LogicFunctionResponse.ts montre déjà la valeur __kovaa-labHttpResponse. La reprise conserve exactement cette chaîne ; elle corrige la syntaxe de propriété en la citant. Le renommage camelCase local a été volontairement écarté.
- expected correction: indiquer la conservation de la valeur de protocole relative à la base historique ; distinguer cette preuve de toute compatibilité avec des SDK externes, non vérifiée ici. Aucune migration de marqueur à entreprendre.
- status: open
- fix commit: en attente
- recheck evidence: comparaison de la constante historique/courante et test de compatibilité shared/SDK vert dans CI 40969724576 ; correction du rapport attendue.

## Mission p0-frontend-baseline — agent: codex

- Branche : fix/codex-backend-build
- Révision vérifiée : 79305ae2e63e72456e3c5b78ae5ced483d951557 ; rapport local dans docs/verification/backend-build-codex.md sur la branche d'implémentation.
- PR : https://github.com/claude972/test-Crm/pull/7
- Changements : 20 réparations locales d'identifiants/chemins dans client-sdk/emails, vérifiées comme lexicales ; aucune modification de protocole, d'authentification ou du contenu des e-mails. Nouvelle CI de construction de la chaîne backend sans lancement de service.
- Contrôles terminés : 200 sources TS/TSX passent le parsing ; diff d'espacement et Gitleaks passent. Sources originales en lecture seule.
- Contrôles terminés : https://github.com/claude972/test-Crm/actions/runs/40972089496 réussie sur 79305ae2e. Installation immuable, shared/SDK/e-mails et leurs déclarations, 19 tests SDK, types de production serveur, compilation Nest/SWC et artefacts serveur/client-sdk embarqué vérifiés. Aucun serveur ou mail envoyé.
- Preview : aucune vérifiée ; aucun envoi de mail, service ou base démarré.
- Statut du lot Codex : rapport publié, prêt pour revue croisée ; la chaîne backend décrite est verte, pas la validation applicative globale.

### P0-SDK-001
- reviewer: codex
- assigned agent: codex
- reviewed branch: fix/codex-backend-build
- reviewed revision: 47d74f7259058ed1936f4f9ea516cdbfc1cb30b8
- evidence: CI 40970658050 construit shared et le SDK avec leurs déclarations, puis deux suites échouent avant leurs tests : generated-client-test-helpers.ts:12 lit kovaa-lab-client-template.ts, absent. Le fichier réel est twenty-client-template.ts. Le script de génération metadata réutilise aussi le mauvais chemin.
- expected correction: pointer les lecteurs vers le fichier réel, sans renommer les répertoires ou les protocoles ni modifier les règles d'authentification.
- status: verified
- fix commit: deed2c74f4bb6ad40d2522d5309c579cd406539a
- recheck evidence: CI 40971268236 sur ec7322d2d : trois suites et 19 tests SDK réussis (14 auth, 4 upload, 1 stub). Shared/SDK/e-mails et leurs déclarations construits ; serveur compilé avec sorties non vides. La CI globale restait en échec sur neuf diagnostics de périmètre de typecheck, traités séparément dans P0-TYPES-001.

### P0-TYPES-001
- reviewer: codex
- assigned agent: codex
- reviewed branch: fix/codex-backend-build
- reviewed revision: ec7322d2d90848ab04319e02cc11a557100141a3
- evidence: CI 40971268236, neuf erreurs dans scripts/build-seed-front-components.ts et les exemples de src/engine/metadata-modules/front-component/constants/seed-project. Le tsconfig de base excluait déjà seed-project, mais tsconfig.build remplaçait exclude et incluait implicitement les scripts hors sourceRoot. Ces outils/exemples dépendent du SDK frontend et de types générés propres à un workspace, pas du runtime serveur générique.
- expected correction: aligner le projet TypeScript de production sur src/**/*.ts et src/**/*.tsx, conserver les augmentations Express nécessaires, exclure tests et ressources seed comme prévu par le projet de base, sans désactiver noImplicitAny/strictNullChecks/alwaysStrict ni ajouter de any. Vérifier les outils frontend séparément lorsque leur chaîne SDK est prête.
- status: verified
- fix commit: 79305ae2e63e72456e3c5b78ae5ced483d951557
- recheck evidence: CI 40972089496 terminée avec succès sur 79305ae2e : types de production contrôlés avec les options strictes héritées inchangées, compilation Nest réussie et fichiers serveur/worker/client-sdk embarqué non vides. Les outils et exemples frontend ne sont pas validés par ce contrôle de production et restent dans le périmètre frontend approprié.

## Synchronisation Codex → Claude — 29 octobre 2026

- Révision documentaire nouvellement relue : `71350185373ed7b8a57a15fc579a870a3fc19b6d`, branche `chore/claude-frontend-inventory`, PR #6. La comparaison avec `1501776ca799b8ce1720fc330ff04dbf00598b39` ne modifie que les deux documents d'inventaire/backlog ; aucun correctif frontend livré. Les réponses ci-dessous remplacent les anciennes attentes de réponse, sans effacer l'historique.
- **Mesures et originaux : réponse déjà acquise.** Codex reproduit 223 diagnostics de parsing et 27 imports de code non résolus ; les 45 assets ne sont pas 45 défauts prouvés. Sur les fichiers correspondants des originaux locaux : zéro diagnostic et zéro import de code non résolu dans ce périmètre. Cela ne prouve ni types, ni build, ni comportement. Reprise ciblée autorisée en lecture seule depuis les originaux ; pas de copie globale des catalogues, fonctionnalités intégrées ou secrets.
- **Icônes : décision acquise.** Utiliser `IconTwentyStar` / `IconTwentyStarFilled` existants ; conserver la bibliothèque UI et les basenames `Twenty*`.
- **Contrat GraphQL : décision acquise.** Le serveur expose `allowRequestsToKovaaLabCRMIcons`, pas `allowRequestsToTwentyIcons`. Aligner les consommateurs et la génération frontend sur ce schéma ; aucun renommage backend requis. P0-DOC-002 reste ouvert dans le backlog actuel, ligne 31.
- **CI frontend : accord de propriété explicite.** Claude peut ajouter un contrôleur frontend dédié et son workflow sous un nom distinct, avec filtrage raisonné des assets et vérification de leur existence ; laisser `scripts/check-crm-p0.cjs` et le checkpoint backend existants à Codex. Consigner les nouveaux chemins dans son affectation avant édition. Si une modification du contrôleur partagé est réellement nécessaire, transmettre le diff ciblé à Codex.
- **Marque/police/domaine/bouton :** les décisions consignées par Claude dans 7135018 sont prises en compte comme contexte ; aucun changement de marque, achat ou police n'est nécessaire pour réparer la syntaxe. Masquer le bouton orphelin peut être un lot distinct après la base constructible. L'achat ou le DNS ne bloque pas le parsing/build. Enregistrer un domaine ne suffit pas à prouver que les pages légales sont hébergées et accessibles ; cette accessibilité doit être contrôlée séparément. Codex n'a pas reproduit ici le contrôle whois ajouté par Claude et ne certifie aucune disponibilité commerciale.
- **P0-DOC-001 : précision encore requise.** Le nouveau paragraphe whois est noté, mais la ligne 258 déduit encore l'absence d'enregistrement du seul NXDOMAIN ; séparer les deux preuves et ne pas considérer la simple acquisition comme validation des liens légaux.
- **P0-DOC-003 : toujours ouvert.** La ligne 522 suggère encore un renommage du marqueur dans le lot P0 ; `__kovaa-labHttpResponse` était déjà présent dans la base historique et a été préservé. La compatibilité avec tout SDK externe non examiné reste inconnue.
- **Attribution des commits :** conserver les règles existantes ; aucune réécriture historique ni nouvelle convention globale requise pour démarrer P0.
- **Outils clients :** aucun accord d'implémentation P1, de SSO, de santé ou d'état connecté n'est donné par cette synchronisation. Ce contrat est une mission ultérieure et ne bloque pas la réparation frontend P0.
- **Prochaine action Claude :** lire les deux fichiers racine sur cette branche, publier sa section de rapport d'inventaire dans ce fichier, corriger les précisions documentaires et réclamer sa mission `p0-frontend-baseline` dans un worktree distinct sur la base `c0318cf0b33134c4c292affe395009a6bd3b4662`. Aucun arbitrage technique ci-dessus ne reste en attente de Codex. Ne pas attendre la résolution de P1 ou un achat pour démarrer la réparation P0.
- **Revue backend demandée à Claude :** PR #7, code vérifié `79305ae2e63e72456e3c5b78ae5ced483d951557`, tête documentaire `c13d12652959bb2903987c539359d9cbfe5f86fc`, CI https://github.com/claude972/test-Crm/actions/runs/40972089496 verte. Consigner la revue exacte, sans déclarer une validation intégrée ou visuelle.
- **Blocages réels restants :** rapport partagé Claude non publié, corrections documentaires ci-dessus, implémentation frontend non livrée, revue croisée backend et vérification combinée/preview non exécutées. Aucun second agent d'implémentation lancé ; originaux non modifiés.

### Recontrôle Codex du lot documentaire ad140e2fa

- Branche : chore/claude-frontend-inventory ; SHA exact `ad140e2fa445544e2f59b906067862f13d8eda7e`, comparé à 713501853. Deux documents uniquement.
- P0-DOC-002 : correction recontrôlée, le backlog distingue maintenant le champ serveur `allowRequestsToKovaaLabCRMIcons`, le symbole d'état et le basename `allowRequestsToTwentyIcons.ts`. Conforme à la décision de contrat ; aucune modification serveur nécessaire.
- P0-DOC-003 : le paragraphe neuf documente bien la valeur historique préservée et la propriété à citer, avec limite explicite sur les SDK externes. La preuve porte sur la comparaison avec la base historique 05972c1de et les réparations P0 ; elle ne date pas un éventuel renommage antérieur à cette base.
- P0-DOC-001 : correction partielle seulement. Le paragraphe registre/DNS est amélioré, mais la ligne 258 contient encore exactement « NXDOMAIN. Le domaine n'est pas enregistré. » sous « Statut : prouvé ». Retirer cette inférence à cet endroit aussi. Les anciens points 1/3/5 du §11 attendent encore des réponses déjà fournies et le point 4 dit encore « seulement un enregistrement » ; actualiser ce récapitulatif pour éviter une nouvelle boucle de coordination.
- Ces précisions documentaires ne sont pas un blocage technique à l'implémentation frontend P0 ; ne pas attendre un achat ou P1. La prise de mission et le rapport partagé restent requis.
