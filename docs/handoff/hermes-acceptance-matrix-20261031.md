# Hermès — matrice de recette du propriétaire

Cette grille suit les demandes, pas le nombre de composants ou de tests verts. La colonne de preuve doit nommer le SHA, la route/bouton, l'opération persistée et le test exécuté. Un contrat simulé ne valide pas un fournisseur réel. Les états manquant, implémenté_non_recetté, validé_isolé, validé_fournisseur et bloqué_accès doivent rester distincts.

| ID | Demande / parcours à prouver | Contrôle attendu | État à la reprise |
|---|---|---|---|
| R01 | Société exploitante distincte des sociétés clientes, création et bascule | Ajout sans invitation réelle, profil terminé, préférences et connexions propres, reload et absence de données de l'autre société | V4 validé sur deux sociétés de test |
| R02 | Dashboard propre et commun limité aux sociétés autorisées | Totaux/détails cohérents ; société non autorisée et droits révoqués refusés, aucun sélecteur par header ; membre lecture seule sans mutation | V4 recette A/B et tests PG passés ; rôles UI à terminer |
| R03 | Base clients CRM | Créer/modifier/rechercher entreprise et contact B2B, e-mail/téléphone validés, rattachement entreprise, provenance et liens d'activité/opportunité conservés | CRUD complet à recetter ; qualification native déjà validée |
| R04 | Pipeline commerciale | Prospect qualifié puis opportunité explicite, déplacement d'étape et reload, liens contact/société, aucun doublon automatique à chaque message | API et carte UI V4 validées, refaire sur intégration finale |
| R05 | Classement des entrées mail/WA/formulaires/scraping | Origine et société identifiables, contacts connus/inconnus, traitement des doublons, aucune affaire créée sans action adaptée, liens vers conversation/fiche/pipeline | Services partiels ; flux fournisseurs non recettés |
| R06 | Réception scraping Hermès | Point d'entrée signé délégué par société, validation des lignes, rejets signature/rejeu/autre société, dépôt puis qualification, erreurs exploitables | Dépôt/qualification isolés validés ; Hermès externe absent |
| R07 | Messagerie WhatsApp complète | Conversation, texte, image/vidéo/audio reçus et lisibles, upload privé puis envoi humain explicite, vocal enregistré, confirmations/incertitude et droits de média | UI et backend partiels ; réception média/vocal fermés dans probe V4 |
| R08 | Messagerie mail | Compte natif de la société, dossiers, liste, lecture HTML sûre, images/PJ, nouveau message, réponse/tous/transfert, brouillon stable/reprise, Sent sans réémission | Implémentée et tests isolés ; aucune vraie boîte raccordée |
| R09 | Bot Hermès relié MCP | Outils réellement découverts/autorisés, contexte limité à la société, OFF n'appelle pas le bot ; ASSISTED prépare sans envoyer ; AUTO uniquement délégation explicite ; arrêt par conversation WA et fil mail sans bloquer l'humain | Politiques et interrupteurs testés partiellement ; MCP réel non connecté |
| R10 | Campagnes depuis sa boîte SMTP | Onglet/liste/create/reopen, audience, objet/contenu/expéditeur sauvegardés puis relus, aperçu, test à adresse choisie, programmation/annulation/envoi immédiat humains, SMTP natif exact et résultat incertain sans doublon | Incomplet : sauvegarde contenu/expéditeur et callbacks manquants |
| R11 | Ouvertures optionnelles et opposition durable | Tracking désactivé sans marqueur quand choisi, désinscription, opposition avant suppression puis réimport refusé, pas de faux statut de lecture certaine | Opposition isolée validée ; parcours réel mail/tracking non testé |
| R12 | Forms et Cal.diy | Réception signée formulaire et réservation/replanification/annulation dans le bon dossier client et agenda, événements stale/revoked refusés, déduplication | Services/PG isolés validés ; aucun service externe raccordé |
| R13 | Réglages à un seul endroit | Création/édition de connexions et comptes depuis centre, secrets en écriture seule, vrai test connexion sans émission, états et droits de membres exacts, réglages bots visibles et scopes explicites | Centre partiel, aucun test effectif de connexion, rôles inconnus |
| R14 | Français et référence Pipedrive | Préférence française par défaut des nouvelles adhésions, préférences existantes respectées, états métier et navigation cohérents ; aucune refonte visuelle improvisée | Recette française A/B ; défaut futur et finitions à terminer |
| R15 | Web/PWA sur téléphone, aucune native | Touch/keyboard, responsive, installation réellement essayée, dégradation réseau et mise à jour, pas de cache CRM/GraphQL/médias privés ni fuite entre sociétés après logout/bascule | Responsive partiel/manifest ; installation et offline non réalisés |
| R16 | Lien utilisable et données conservées pour recette | URL réellement ouverte sans compte Vercel préalable, disponibilité et durée prouvées, exact bundle/serveur, accès Safari utilisateur confirmé ; hébergement durable distingué d'une session jetable | Safari bloqué chez propriétaire ; preview/base temporaires seulement |

Les accès fournisseurs manquants doivent être listés après inventaire sécurisé de la configuration autorisée. Ils ne justifient pas l'absence d'un parcours codé et recetté sur un serveur de test identifié. Les tests de fournisseurs factices ne seront jamais annoncés comme une connexion réelle. Aucun envoi à des prospects, production ou nouveau service payant autorisé par cette matrice.


## Checkpoint de supervision — 31 octobre 04:31 UTC

Les états de la colonne « à la reprise » restent historiques. Les deltas suivants ne constituent pas une recette finale :

- R10 : opération d'aperçu personnalisé poussée `4933af805`, refus hors liste et validation de contenu testés par root ; UI liste/édition/callbacks encore en construction. Recheck indépendant 5 suites/72 tests passés, deux suites bloquées par dépendances locales. Départ SMTP de fixture annoncé par Claude, pas encore validé indépendamment ni par le parcours HTTP/PG.
- R07 : code de capacité média poussé `a8fb18b58`, **non approuvé** : preuve d'origine et d'authentification du webhook insuffisante (CJ-WA-002). Réception/vocal fournisseur toujours non validés.
- R14 : default locale configurée dans le script de session et tests comportementaux d'adhésion ajoutés `888187a6a`. Nouveau compte/adhésion à tester sans forcer la langue manuellement.
- R15 : fallback sans cache privé et enregistrement réel dans bootstrap `7efd64983`. Root a exécuté 25 contrôles isolés SW/accès PASS. Installation et dégradation réseau dans un vrai navigateur restent non vérifiées.
- R16 : contrôleur de partage vérifié sur serveurs HTTP isolés ; aucune nouvelle preview finale déployée, Safari propriétaire toujours non confirmé. Une fixture d'accès ne résout pas son signalement réel.
