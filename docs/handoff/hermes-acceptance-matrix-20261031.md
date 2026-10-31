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


Complément 04:36 UTC : les deux suites campagnes non chargées ont été relancées avec résolution explicite des dépendances, sans mutation du checkout original : 14 tests PASS, soit les sept suites/86 tests recontrôlés en deux runs. Correction du périmètre de preuve relue `32059faa5`, onboarding HTTP/PG encore non recetté. Locale : root 7 tests PASS sur service/configuration. PWA : root 26 tests isolés PASS sur `936a21c65`, correction de police et rapport relus, intégration finale/installation/Safari toujours attendus.


## Checkpoint — 31 octobre 04:46 UTC

- R10 : premier frontend `b4d89be46` livré mais **non approuvé**. Quatre défauts de parcours concrets ouverts : format EmailDocument absent, saisie perdue pendant save, sélection de From impossible pour nouveau brouillon et audience non sélectionnable. Les callbacks branchés et tests de mocks ne ferment pas ces critères.
- R07 : root 67 tests isolés PASS sur `19cb1c968`, correction origine/jeton vérifiée dans ce périmètre. Nouveau défaut byEvents/suffixe404 à corriger. Vrai stockage natif et Evolution réel non validés.
- R05/R09/R13 : nouvelles queries classification et découverte MCP poussées ; affichage utilisateur encore à intégrer. Course de révision MCP ouverte ; premier run groupé de tests 20PASS/1FAIL, relance fichier seul7PASS, instabilité à expliquer.
- CI intégration `cc7243140`, run41169707939 en cours, harnais de sélection6testsPASS. Aucune nouvelle recette navigateur ni preview finale à ce checkpoint.


## Checkpoint — 31 octobre 05:04 UTC

- CI41169707939 entièrement verte sur cc7243140, **source antérieure aux nouveaux lots mail/réglages/MCP**. Aucune déduction de livraison globale.
- R13 : rechecks root serveur17PASS et frontend29PASS pour droits de l'appelant et résultats périmés ; droits effectifs affichés encore inexacts pour un rôle restreint, création première boîte absente du centre et sonde WA à durcir. CJ04c lancé pour le vrai onboarding natif.
- R08/R09 : défaut de reprise après reload et contrôles bot absents de la vraie mailbox constatés, nouveau lot CJ04d lancé. MCP32testsPASS mais injection du client central dans le module surface incorrecte à corriger.
- R10 : sélection From débloquée partiellement, attestation centrale encore à corriger. Suite produit HTTP/PG réattribuée au vrai CJ02. Format riche/audience/save concurrent toujours en cours.
- R07 : forme webhookByEvents corrigée et root28testsPASS ; vrai stockage natif et fournisseur non validés. R15/R16 toujours aucune installation PWA ni nouvelle preview/Safari utilisateur prouvés.


## Checkpoint — 31 octobre 05:28 UTC

- R13 : root62testsPASS sur b0ef31d0c pour sonde WA/états mail/identité des grants ; droits UI corrigés ba31adf23 relus mais nouveau recheck frontend non chargé faute résolution ESM locale, à vérifier en CI propre.
- R07 : preuve native positive médias demandée à CJ03, reprise non encore confirmée ; ancienne fixture Map avec octets de texte ne prouve pas des médias affichables.
- R15/R16 : **outil de navigation CUA indisponible malgré réinitialisation**. Pas de recette visuelle nouvelle possible à ce checkpoint ; développement/PG/HTTP continuent. Aucune ancienne capture ni curl200 promu en preuve navigateur, Safari propriétaire toujours non confirmé.


## Checkpoint — 31 octobre 05:45 UTC

- Codage Claude **bloqué par quota jusqu'à remise annoncée03:50Martinique/07:50UTC**. Reprise de la même session programmée, pas d'achat. Handoff concret hermes-quota-resume-20261031.md ; tests/revues/CI indépendants continuent.
- R10 : code audience/sender/save concurrent2f1e8e705 publié, root31testsPASS ; corps natif7c2e94e12 root13frontend+3serveurPASS. Pas encore assemblés ni montés/testés dans les routes finales. Warning DOM du loader à corriger.
- R09/R13 : DI MCP3413fd8c3 root14testsPASS ; droits effectifs/mock de suppressionb0ef31d0c root35testsfrontendPASS. Création première boîte, bot dans mailbox et reprise après reload toujours inachevés.
- Deux CI nouvelles en cours, sources séparées : MCP41173344142 et frontend41173424054. Recette visuelle toujours bloquée par CUA ; aucun nouveau lien livré.


## Checkpoint — 31 octobre 06:55 UTC

- Aucune nouvelle livraison globale : intégration finale, vrais parcours et nouvelle preview restent à réaliser après reprise des mêmes Claude à07:50UTC (quota). Tous les états historiques ci-dessus gardent leur périmètre. Dernier handoff de reprise à lire intégralement : `hermes-quota-resume-20261031.md`.
- R09/R13 : CI native MCP **41173344142 SUCCESS** sur3413fd8c3, incluant types/build/units/PG/DI/bundle de cette branche. Ni fournisseur MCP réel ni commandes bot de la vraie mailbox validés. Création première boîte et reprise de brouillons après reload encore inachevées. Revue WIP relève libellé erroné « aucun contact serveur » et confusion refetch échoué/écriture refusée, à corriger par CJ04c.
- R10/R13 : full frontend **41173424054 FAILURE** sur2f1e8e705 et **41174465769 FAILURE** surb0ef31d0c. Respectivement fixture MockLink typée comme fonction et fixture membre dépourvue de roles ; contrôles stricts bloquants, pas des pannes utilisateur démontrées. CJ01/CJ04a doivent corriger puis retester l'assemblage.
- R10 : liste native **10 tests supplémentaires PASS** sur2f1e. La revue constate toutefois création incertaine autorisant une nouvelle tentative avec UUID différent, et absence de pagination au-delà de50 campagnes/audiences (CJ-CAMPAIGN-010/011). Ces scénarios ne sont pas couverts par les dix tests, demeurent ouverts et ne sont pas validés navigateur.
- R15/R16 : canal CUA répond de nouveau à06:33UTC (inventaire et onglet vierge lisible). Blocage technique partiellement levé ; aucune nouvelle recette CRM ou installation PWA effectuée, aucune résolution Safari propriétaire déduite. Ancienne preview expirée ; pas de lien utilisable nouveau à ce checkpoint.


## Recette actuelle10:15UTC — deltas prouvés surd3eb5df38

- R01 : créationAlpha puisBêta, bascules native sélecteur et centre, logout/relogin normal/choixAlpha exécutés.
- R02 : dashboardBêta et récapitulatif deux sociétés cohérents ; campagnesAlphaabsentesBêta et réapparuesAlpha. Refus d'un membre non autorisé nonrecettés danscettepasse.
- R03/R04/R06 : dépôtJSONmanual1fauxB2B→qualification→client/contact→audience/brouillon, puis créationhumaineopportunité, New→Proposal, liens client/contact, reloadnom/étape/relationsPASS. CRUDcomplet/contactvalidation, DnD et externeHermès nonrecettés.
- R09/R13 : centreAlphaOFFpersistéaprèsreload, BêtaASSISTEDinchangé, canauxhérités. ParamétrageUIvalidé, pas réponsesbot/MCPeffectives.
- R07/R08 : étatsnonconfigurés réellementobservés, aucun parcours fournisseur validé.
- R10 : brouillonobjet/corpsTipTap persisté/reouvert, audience1 ; aperçu réel échoueApollo/UUIDv5. CorrectifsClaude578e/30ff relus/testésisolés, nouvellepreviewencoreattendue. TestSMTPHTTP/PG41189235623FAILURE(8/14), donc aucunengagementcomplet.
- R14/R15 : défautfrançaisobservé, centre+accueil390x844 essayés ; pasinstallationPWA/offline/Safari. R16 : IABsansloginVercelvalidé, previewexpire10:56:50UTCavantdeadline, nepaslivrercommehébergementdurable.

Preuves et limites détaillées : docs/verification/hermes-auth-recipe-41188341880.md. Les états historiques ci-dessus ne remplacent pas ces deltas et aucun critère global n'est déclaré totalement livré.


## Contre-épreuveC46 10:42–10:46UTC

Surc46etpreview41192248859 : CJ013UUIDv5/CJ014queryaperçu/CJ015menu/CJINTAKEUI002classification **validésUI** : collecte→qualifcontact1+société1→campagnev5→contenuenregistré→aperçupersonnaliséréel→reloadcontenuidentique. C'estunprogrèsR05/R06/R10, PASenvoiSMTP. R11 : réglagesuiviON/reloadpuisOFFpersisté, sujetdésinscriptioncréé/lié/reload ; marqueur/footer etoppositioneffectiveparcourspublic/réimportrestentnonvalidés. R16 : SafariMacfenêtreprivéefraîche→welcomeCRM sansloginVercel, capturé ; téléphonepropriétairetoujoursnonconfirmé, installationPWAnonfaite. R14 : textesanglaisvisiblesFormsCal/nouvellescopiescampagne, pasentièrementfrançais. Combined41192246414SUCCESSavecSMTPétapesautée ; fullfront41192244151FAILuniqueTS2322fixture, doncpasbuildstrictvert. Previewactuelleexpire11:54:23UTCavant8hMT ; finaleàrafraîchir.
