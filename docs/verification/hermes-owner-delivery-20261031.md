# Hermès — bilan de recette du 31 octobre 2026

Document préparatoire à 11:17 UTC. La preview finale et ses horaires doivent être ajoutés après déploiement et recette. Ce document ne constitue pas encore la livraison.

Source candidate exacte : c46f667a62370ec889f775e0b189ccc74f7ebcd5, branche preview/cj-verified-20261031. Le bundle a été construit ; le contrôle TypeScript frontend reste en échec sur une fixture MockedResponse du test RuntimeContainer (TS2322 ligne414). CI combinée41192246414 passée avec étape SMTP explicitement sautée. Ne pas annoncer tous les tests verts.

| Demande | Résultat établi | Limite restante |
|---|---|---|
| R01 Sociétés cloisonnées | Création et bascule Alpha/Bêta, données distinctes observées sur d3 | Comptes et bases temporaires ; nouvelles connexions réelles absentes |
| R02 Dashboards autorisés | Vue propre et récapitulatif des deux sociétés autorisées observés sur d3 ; tests PG | Nouveau non-membre et lecture seule non recettés UI ; création outsider refusée SIGNUP_DISABLED sur C46 |
| R03 CRM clients | Création/édition/recherche entreprise et contact, validation e-mail, téléphone fictif, poste et relation persistés sur C46 | Suppression/restauration non essayées |
| R04 Pipeline | Création humaine opportunité, New→Proposal et liens contact/entreprise persistés sur d3 | Drag/drop et reprise finale à distinguer ; aucun flux fournisseur prouvé |
| R05 Classement | Qualification manuelle B2B et compteurs contact/société relus sur C46 | Réception effective mail/WA/formulaire non recettée |
| R06 Scraping Hermès | Dépôt JSON manuel fictif→qualification→contact/client→audience validé UI ; signatures/rejeu testés isolément | Hermès externe non raccordé |
| R07 WhatsApp et médias | Composants et contrôles serveur présents ; tests isolés | Aucune réception Evolution réelle, lecture image/vidéo/audio ni enregistrement vocal de bout en bout prouvés |
| R08 Boîte mail | Mailbox native et accès configuration IMAP/SMTP présents ; tests isolés | Aucune vraie boîte raccordée ; réception/réponse/transfert/brouillon réel non validés |
| R09 Bot MCP | OFF Alpha persisté et ASSISTED Bêta conservé ; politiques testées isolément | Aucun MCP fournisseur connecté ; réponses et arrêt par vrai fil/conversation non validés |
| R10 Campagnes | Menu, audience, objet/corps persistés, réouverture et aperçu personnalisé réel sans émission validés sur C46 | Expéditeur/relais absent ; test, programmation/annulation et envoi effectif non recettés ; SMTP HTTP/PG en échec8/14 |
| R11 Ouvertures/opposition | Suivi ON/reload puis OFF persisté ; sujet de désinscription créé et lié à campagne ; opposition isolée testée | Aucun mail suivi ni opposition publique→réimport prouvés de bout en bout |
| R12 Forms/Cal.diy | Contrats et tests PG isolés | Services externes non raccordés, réception réelle non validée |
| R13 Réglages | Centre et création native compte mail accessibles, politiques persistées | Parcours connexion réelle et rôles UI incomplets ; centralisation ergonomique à finir |
| R14 Français/Pipedrive | Nouvelles adhésions en français observées | Résidus anglais Forms/Cal et copies campagne ; aucune refonte finale Pipedrive approuvée |
| R15 Web/PWA | Web responsive390x844 observé ; manifest standalone et contrôles cache isolés | Installation/offline/mise à jour PWA non essayés réellement |
| R16 Accès preview | Preview C46 ouverte en IAB et SafariMac privé sans compte Vercel | Session finale à renouveler ; iPhone propriétaire non confirmé ; hébergement durable absent |

Les essais utilisent exclusivement des fiches fictives et domaines .test. Aucun mail à un prospect, aucun fournisseur factice présenté comme réel, aucune mise en production. Les anciennes bases de recette sont détruites avec leurs sessions CI ; les sources Git et les modifications locales originales restent préservées.

Depuis10:18UTC, Claude est bloqué par la limite hebdomadaire annoncée jusqu’à23hMartinique. Aucun nouvel agent ni achat. Codex a assemblé les commits Claude par Git, supervisé, testé et documenté ; aucun code applicatif écrit par Codex. La permission de corriger uniquement la fixture TypeScript a été demandée et reste sans réponse.
