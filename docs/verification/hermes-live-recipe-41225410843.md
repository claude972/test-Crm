# Recette navigateur de la candidate 508 — 31 octobre 2026

Source exacte : `508d36d60c024eb3f72f00dee82ebf87d019c626`. Frontend 41223824108 SUCCESS : 114 suites / 1348 tests, types stricts et bundle production. Combined 41223827218 SUCCESS avec SMTP/IMAP isolés. Runtime unique 41225410843, expiration API 19:11:03.481 UTC (15:11 Martinique). Preview READY ; partage privé et identifiants hors Git, expiration du partage au plus tard celle de l’API. Protection globale Vercel conservée.

## Vérifié réellement par Codex dans le navigateur IAB

- Ouverture via partage privé sans compte Vercel, login applicatif, création UI de Recette Hermès Alpha, profil et invitations ignorées. Seul signup a été fait par API ; aucune création cachée de compte mail, domaine, audience ou CRM.
- Compte natif IMAPS/SMTPS fictif isolé créé par formulaire, liaison MAIL enregistrée ; arrêt bot mail explicite. Tests natifs de connexion : INBOX joignable et SMTP authentifié. GreenMail est un fournisseur de recette, aucun service personnel connecté.
- Domaine fictif enregistré dans Paramètres > Communication, verdict serveur Vérifié.
- Création UI de brouillons campagne. Expéditeur, objet et contenu persistés après rechargement. Dépôt JSON manuel d’une seule fiche fictive, qualification professionnelle explicite, liens contact et entreprise visibles dans le CRM. Ce dépôt ne valide pas la collecte automatique signée.
- Audience qualifiée : un destinataire fictif, zéro exclusion. Variable `firstName` refusée par le serveur ; correction native `name.firstName`, aperçu « Bonjour Ada » rendu sans émission, sans marqueur d’ouverture ni suivi de clic.
- Test envoyé à la seule adresse fictive explicitement saisie : accepté. Programmation à 18:40 UTC puis annulation : retour Brouillon et aucune date programmée. Envoi humain confirmé vers l’unique destinataire fictif : état Envoyé, un message accepté par le transport. Acceptation ne signifie pas livraison publique.
- INBOX native affiche le message de test reçu. **Son ouverture échoue avec MAIL_MESSAGE_CHANGED** : liste/réception visibles, lecture MIME non validée. Défaut reproduit et confié à backend_review, probe isolé CI 41227726342. Piste : GreenMail 2.1.9 annonce une taille RFC822 incorrecte, correction fournisseur 2.1.15 à prouver avant changement ; garde applicative conservée.
- Opportunité fictive créée, Nouveau → Proposition, liens entreprise et Ada Recette, rechargement : valeurs conservées. Les cinq étapes standard sont françaises dans le board et le tableau de bord. Dashboard Alpha : 6 entreprises, 6 personnes, 7 opportunités ; société courante indiquée.

## Restant / limites

Lecture MIME bloquée ; réponse/transfert/PJ non validés. Opposition durable, seconde société/bascule et connexion après logout, viewport mobile et Safari de cette preview restent à vérifier. WA/Evolution/MCP/Forms/Cal externes non configurés ; aucun succès fournisseur réel revendiqué. PWA installation/offline et iPhone non testés. Session DB jetable de 90 minutes, aucun hébergement durable livré. Aucun envoi à un vrai prospect. Captures locales privées dans /private/tmp/hermes-final-preview-508d36d60/recipe.
