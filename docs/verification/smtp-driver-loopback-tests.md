# SMTP — transport réel vers fixture loopback

Branche de tests `test/p1-smtp-driver`, base `0523dad07965bfb1c032729c00863e0940425e3f`. Les commits production root `a308d9de0` et `ee4ebf4d2` sont repris sans modification (cherry-picks locaux `d63440fd0` et `d1566a4fd`). Propriété de ce lot : uniquement le nouveau spec `drivers/smtp/__tests__/smtp-emailing-domain-driver.spec.ts` et ce rapport. Aucun fichier production édité, serveur historique, fichier privé, DB ou service cloud utilisé.

## Méthode et portée

Nodemailer réel ouvre une connexion TCP vers un serveur Node `net` exclusivement lié à `127.0.0.1` sur port éphémère. La fixture parle EHLO/MAIL/RCPT/DATA, accepte ou rejette des destinataires synthétiques `example.test`, et conserve les enveloppes/contenus uniquement en mémoire. Les sockets et le pool SMTP sont fermés après chaque cas. Aucun message ne sort du poste ; la fixture ne délivre aucun e-mail et ne constitue pas un fournisseur SMTP de recette.

Le vrai `UnsubscribeContentService` enrichit les messages. Seule la signature du token est doublée par une fonction déterministe ; aucune preuve cryptographique ou de fonctionnement de l'endpoint de désinscription n'est revendiquée. Les gardes du driver, la préparation du contenu, Nodemailer et le protocole TCP sont effectivement exécutés.

Jest ciblé utilise les dépendances existantes en lecture seule de `test-Crm/apps/crm/ui/node_modules`, la transformation `@swc/jest` avec plugin Lingui absolu et une configuration/cache sous `/private/tmp`. Le mapper `src/` vise les sources stables root `p1-hermes-integration`, identiques aux commits désignés. Aucun package ajouté, installation ou typecheck global concurrent.

## Couverture

28 cas réussis sur `ee4ebf4d2` : isolation workspace/domaine/expéditeur, expéditeurs multiples et CRLF, configuration dangereuse et messages sans secret, origine de désinscription, injection d'en-têtes, DATA réel avec destinataire/sujet/footer/en-têtes one-click, acceptation partielle distincte de livraison, erreurs SMTP génériques non annoncées retryables, refus marketing multi-destinataire, destinataire avec nom affiché, refus des overrides List-Unsubscribe/List-Unsubscribe-Post, lots avec enveloppes distinctes et personnalisation/token propre, footer unique/tags réservés résolus, échec individuel conservant le reçu d'un autre destinataire, limites de taille 0/101.

Les deux régressions initialement signalées (correspondance nom affiché/adresse d'enveloppe et en-têtes List-Unsubscribe concurrents) sont corrigées par root dans `ee4ebf4d2` et couvertes par les tests. Le premier passage avait aussi révélé deux défauts de fixture/assertion, corrigés : DATA pipeliné sans destinataire accepté doit être refusé ; les en-têtes SMTP peuvent être repliés selon RFC. Aucun correctif production n'a été réclamé pour ces deux points de test.

## Régression supplémentaire prouvée puis corrigée

Sur `ee4ebf4d2`, un 29e cas échoue : une ligne de lot dont `recipient.email = 'alice@example.test, bob@example.test'` est acceptée. `sendEmailBatch` signe le token sur cette chaîne et appelle la préparation privée sans revalider un unique destinataire d'enveloppe ; Nodemailer interprète la liste et le lot retourne des reçus de succès. Le contrat marketing d'un token pour une personne n'est alors pas respecté.

Correction demandée à root, sans édition production par ce lot : valider toutes les lignes du lot avant enrichissement/envoi afin d'exiger exactement une adresse valide par ligne, sans CRLF. Le test exige `CONFIGURATION_ERROR` et zéro connexion SMTP pour cette entrée.

Commandes exécutées : Jest `--runInBand --runTestsByPath <spec>` (28 cas verts avant ajout du 29e), puis test ciblé `-t 'batch row containing multiple'` (échec reproduit). Prettier du seul nouveau spec et `git diff --check` réussis. L'acceptation SMTP mesurée n'est pas une livraison, une ouverture, un test TLS/STARTTLS ni une preuve de connexion au SMTP du propriétaire.

## Résultat final après correction root

Root corrige la validation des destinataires dans `78657e047` (cherry-pick local `061e238d9`). Les lignes de lot sont des adresses e-mail nues validées avant tout enrichissement/envoi ; CRLF refusé ; le parcours unitaire vérifie exactement une adresse parsée par chaîne. Aucun fichier production modifié par l'agent de tests.

Recontrôle ciblé complet exécuté sur ces sources stables : **1 suite, 29 tests réussis, zéro échec**, durée 3,394 s. La régression multi-adresse est désormais refusée avant connexion SMTP et les 28 cas précédents restent verts. La commande conserve `--runInBand --runTestsByPath` et la configuration temporaire décrite ci-dessus ; aucun typecheck global, installation, envoi externe ou service cloud. Ce résultat valide le transport vers la fixture loopback et les gardes couvertes, avec les limites cryptographie/TLS/fournisseur/livraison explicitées.

## Budget explicite des tests réseau — charge combinée

Root a ensuite exécuté un ensemble combiné : **70/71 tests réussis**, seul le test SMTP DATA dépassant le défaut Jest de 5 secondes pendant la contention disque/cache froid. Ce résultat est rapporté tel quel ; il ne s'agissait pas d'un échec de protocole démontré et le passage séparé en 3,394 s ne prouvait pas sa robustesse sous cette charge.

Le spec fixe désormais un timeout explicite de **30 secondes** pour ses cas avec fixture socket. Le nettoyage ferme pool/sockets puis attend la fermeture du serveur avec une borne indépendante de **5 secondes** ; dépasser cette borne fait échouer le test. Les délais du transport de production, la fixture et les assertions de reçu/contenu/rejet restent inchangés : aucun échec réseau n'est converti en succès.

Recontrôle après suppression des seuls caches Jest/SWC créés par ce lot : **29/29 réussis en 4,109 s**. Il s'agit d'un cache de transformation de test froid, pas d'une purge du cache disque système. Aucun recontrôle du groupe combiné de 71 n'a été exécuté par cet agent ; root garde cette preuve d'intégration. Prettier ciblé et diff check réussis.
