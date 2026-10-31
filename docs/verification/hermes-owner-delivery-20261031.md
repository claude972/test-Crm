# Hermès — bilan de recette du 31 octobre 2026

Bilan préparé à 11:17 UTC, complété par recette de la preview finale à 11:48 UTC. Le produit reste incomplet ; les limites ci-dessous font partie de la remise.

Source candidate exacte : c46f667a62370ec889f775e0b189ccc74f7ebcd5, branche preview/cj-verified-20261031. Le bundle a été construit ; le contrôle TypeScript frontend reste en échec sur une fixture MockedResponse du test RuntimeContainer (TS2322 ligne414). CI combinée41192246414 passée avec étape SMTP explicitement sautée. Ne pas annoncer tous les tests verts.

| Demande | Résultat établi | Limite restante |
|---|---|---|
| R01 Sociétés cloisonnées | Création et bascule Alpha/Bêta sur d3 puis A/B sur la preview finale c46, campagnes distinctes observées | Comptes et bases temporaires ; nouvelles connexions réelles absentes |
| R02 Dashboards autorisés | Vue propre et récapitulatif des deux sociétés autorisées observés sur d3 puis c46 ; tests PG | Nouveau non-membre et lecture seule non recettés UI ; création outsider refusée SIGNUP_DISABLED sur C46 |
| R03 CRM clients | Création/édition/recherche entreprise et contact, validation e-mail, téléphone fictif, poste et relation persistés sur C46 | Suppression/restauration non essayées |
| R04 Pipeline | Création humaine opportunité, New→Proposal et liens contact/entreprise persistés sur d3 puis sur la preview finale c46 | Drag/drop et reprise finale à distinguer ; aucun flux fournisseur prouvé |
| R05 Classement | Qualification manuelle B2B et compteurs contact/société relus sur C46 | Réception effective mail/WA/formulaire non recettée |
| R06 Scraping Hermès | Dépôt JSON manuel fictif→qualification→contact/client→audience validé UI ; signatures/rejeu testés isolément | Hermès externe non raccordé |
| R07 WhatsApp et médias | Composants et contrôles serveur présents ; tests isolés | Aucune réception Evolution réelle, lecture image/vidéo/audio ni enregistrement vocal de bout en bout prouvés |
| R08 Boîte mail | Mailbox native et accès configuration IMAP/SMTP présents ; tests isolés | Aucune vraie boîte raccordée ; réception/réponse/transfert/brouillon réel non validés |
| R09 Bot MCP | OFF Alpha puis A finale persisté, ASSISTED Bêta puis B finale conservé ; politiques testées isolément | Aucun MCP fournisseur connecté ; réponses et arrêt par vrai fil/conversation non validés |
| R10 Campagnes | Menu, audience, objet/corps persistés, réouverture et aperçu personnalisé réel sans émission validés sur C46 | Expéditeur/relais absent ; test, programmation/annulation et envoi effectif non recettés ; SMTP HTTP/PG en échec8/14 |
| R11 Ouvertures/opposition | Suivi ON/reload puis OFF persisté ; sujet de désinscription créé et lié à campagne ; opposition isolée testée | Aucun mail suivi ni opposition publique→réimport prouvés de bout en bout |
| R12 Forms/Cal.diy | Contrats et tests PG isolés | Services externes non raccordés, réception réelle non validée |
| R13 Réglages | Centre et création native compte mail accessibles, politiques persistées | Parcours connexion réelle et rôles UI incomplets ; centralisation ergonomique à finir |
| R14 Français/Pipedrive | Nouvelles adhésions en français observées | Résidus anglais Forms/Cal et copies campagne ; aucune refonte finale Pipedrive approuvée |
| R15 Web/PWA | Web responsive390x844 observé ; manifest standalone et contrôles cache isolés | Installation/offline/mise à jour PWA non essayés réellement |
| R16 Accès preview | Preview finale ouverte en IAB et SafariMac privé sans compte Vercel ; connexion applicative réussie dans les deux | Expire le31octobre à09:07Martinique/13:07UTC ; partage expire09:06:36/13:06:36UTC ; iPhone propriétaire non confirmé ; hébergement durable absent |

Les essais utilisent exclusivement des fiches fictives et domaines .test. Aucun mail à un prospect, aucun fournisseur factice présenté comme réel, aucune mise en production. Les anciennes bases de recette sont détruites avec leurs sessions CI ; les sources Git et les modifications locales originales restent préservées.

Depuis10:18UTC, Claude est bloqué par la limite hebdomadaire annoncée jusqu’à23hMartinique. Aucun nouvel agent ni achat. Codex a assemblé les commits Claude par Git, supervisé, testé et documenté ; aucun code applicatif écrit par Codex. La permission de corriger uniquement la fixture TypeScript a été demandée et reste sans réponse.


## Preview finale réellement déployée et testée

- Source frontend ET backend : c46f667a62370ec889f775e0b189ccc74f7ebcd5. Même artefact13039577070/digestsha256:b8d4b3c5ff9282be96f19f789b1eef9f188e5d505333790dd81f0223fb777fb0, les2147fichiers relus et hashes identiques. Aucun ancien staging réutilisé.
- Runtime GitHubActions41197244441, expiresAt2026-10-31T13:07:05.105Z. Session temporaire, base détruite à échéance, aucun hébergement durable.
- Déploiement dpl_Sq8BwQEksZFDYNasmgGejpg7M6KB, origine https://hermes-crm-p0-preview-rle5khj6o-brafas-projects.vercel.app , projetprj_0YAVdnCjN7e2zHNAbLzUCw3N4JvF, READY/targetnull/zéroalias vérifiés. Contrôle d639879ed publié APRÈSREADY. Protection globale all_except_custom_domains maintenue.
- Lien privé à clé uniquement dans le coffre local, expiration2026-10-31T13:06:36Z. Identifiants du compte de recette dans demo-41197244441.json0600 ; aucune clé ni mot de passe dansGit.
- HTTP standard sansVercelCLIAuth/Authorization, cookiejar de partage seul : document/health/client-config/manifest/source200, healthok, origineconfigexacte, manifeststandalone, sourcec46. Premier essai du harnais utilisait par erreur /manifest.webmanifest (fallbackHTML), corrigé vers le vrai href /manifest.json ; ce n'était pas une panne produit.
- Compte créé par signUp natif seul, puis vrai navigateur email/password→création « Hermès Démo — 31 octobre »→profil RecetteHermès→invitations ignorées→CRM. Workspace7b2fccee-9570-43a0-9905-72ddb7604b6e. Aucune session injectée ni créationworkspaceAPI.
- Nouveau SafariMac privé7B4821A0-D898-461E-AF52-13DAEAE5F40D : lienpartagé→welcomeCRM sans loginVercel→email/password→entreprises, société et AtelierDémonstration visibles. Demande d'enregistrement du mot de passe refusée « Décider plus tard ». Fenêtre privée fermée par boutonAX118, retour à fenêtre normale vérifié. Capture safari-private-authenticated.png. Cela ne prouve pas l'iPhone propriétaire.

## Parcours réellement refait dans cette base finale

Dépôt JSON manuel fictif e61901ce-3e2d-417d-97f5-23cf2543fd3c, externe recette-finale-41197244441-01, sourcehttps://atelier-demo.test/source, prospect@atelier-demo.test. Saisie du champ date via clavier natif : collecte30oct20:30Martinique/31oct00:30UTC ; la méthode Playwright.fill n'avait pas déclenché l'état React et a été remplacée par les segments du contrôle natif. Lot reçu puis qualification humaine avec motif fictif et URLinformation.test. Classification contact1/société1, provenance manuelle explicitement non attribuable, aucune opportunité automatique.

Campagne9ff7fb8e-eb7e-5cd7-b308-b149ce7e61c7, « Campagne de démonstration — brouillon », audience1, objetBonjour{{fullName}},démonstrationHermès ; corpsTipTap enregistré puis reload : texte relu identique. Vrai sélecteur ProspectFictif puis clicAperçu : objet et corps « Bonjour Prospect Fictif » réellement rendus, statutvert aperçu rendu. Aucun transport, aucune émission. Capture campaign-preview.png observée. Expéditeur absent, donc test/programme/send indisponibles avec motif explicite ; aucun succès fournisseur déduit.

Opportunité9f8783eb-d655-414e-a62e-0261f1f261e2 « Opportunité de démonstration — aucun envoi » créée humainement après qualification. ÉtapeNew→Proposal, entrepriseAtelierDémonstration et contactProspectFictif sélectionnés dans leurs vraies listes. Fichecomplète rechargée : nom/Proposal/relations relus, chronologie4champs cohérente. Capture pipeline-after-reload.png observée. Pas de drag/drop ni mail envoyé.

Preuves locales : /private/tmp/hermes-preview-41197244441/recipe/ . Aucun fournisseur SMTP/IMAP/Evolution/MCP/Hermès/Forms/Cal réel connecté, aucune installation PWA réelle effectuée. Les preuves isolées et les parcours antérieurs conservent leur périmètre ; ce déploiement n'efface pas les critères manquants.


## Contre-épreuve finale multi-société11:50–11:53UTC

Depuis le centre, création native « Hermès Démo B — cloisonnement », profil terminé et invitations ignorées sans contacter personne. B possède une liste campagne vide (« Aucune campagne »), tandis que la campagne de démonstration réapparaît après la bascule vers A. Dashboard B : entreprises5/personnes5/opportunités6/tâches0. Vue « Vos sociétés autorisées » : A6/6/7/0, B5/5/6/0, total11/11/13/0 ; cohérent avec le contact/client qualifiés et l'opportunité manuelle dans A. Capture authorized-dashboard-two-companies.png observée, b-campaigns-empty.png conservée. Cela prouve la distinction entre sociétés autorisées de ce compte, PAS le refus d'un membre non autorisé ni le rôle lecture seule.

Centre A : groupe « Toute la société »→Arrêt complet→reload : boutonpressed/disabled confirmé, politiqueOFFpersistée. BasculeB→centre : Brouillon seulementpressed/disabled encore présent, politiqueASSISTEDconservée. Retour à A puis dashboard pour le propriétaire. Aucun MCP fournisseur ni réponsebot réelle testés. Ces données de recette vivent uniquement jusqu’à expiration de la session.


## Écrans messageries vérifiés11:54UTC

Sur la société A finale : WhatsApp affiche « À configurer », aucune conversation, réponses/synchro désactivées et médias entrants/envoi/vocaux indisponibles. Mail affiche « Aucune boîte aux lettres n'est connectée », dossiers/réponse-transfert/brouillons/PJ indisponibles. Ce ne sont pas des réceptions vides validées ; aucun fournisseur n'a été récupéré. Retour au dashboard A, ongletIAB22 conservé comme livrable.


## Dernier contrôle de remise11:57:49UTC

GET /healthz via curl standard et cookie de partage seul : HTTP200/statusok, expirationAPI13:07:05.105UTC et partage13:06:36UTC inchangées. Viewport390x844 de la nouvelle preview vérifié visuellement : dashboardA6/6/7/0 et pipeline lisibles, capturemobile-dashboard.png ; viewport restauré ensuite. Cela ne vaut pas installation/offlinePWA. Branches distantes vérifiées : sourcec46 et rapportmissions poussé. Aucun nouveau succès global ni aucune connexion fournisseur depuis les preuves ci-dessus.
