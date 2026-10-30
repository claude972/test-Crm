# Preview CRM web/PWA vérifiée — 29 octobre 2026

URL : https://hermes-crm-p0-preview-mjgvbtc3d-brafas-projects.vercel.app

Expiration API/DB : **29 octobre 2026 à 22:55:40, America/Martinique**, soit 30 octobre 02:55:40 UTC. Les données de cette session sont jetables. Le frontend statique peut rester joignable après expiration ; cela ne signifie pas que son API reste disponible.

## Révisions et preuves

- Code applicatif CRM : checkpoint `c96b7eea6cf316c0e1841f13b203e7731aaef4f1` ; [CI combinée 40986681086](https://github.com/claude972/test-Crm/actions/runs/40986681086) réussie, frontend/backend et navigateur desktop/mobile sur le bundle réel.
- API temporaire : workflow `35785637057a4abb1fea9fc1f7fe427ac87cf2cc`, [session 40988179084](https://github.com/claude972/test-Crm/actions/runs/40988179084), PostgreSQL/Redis jetables, serveur et worker supervisés avec échéance absolue.
- Bundle déployé : artefact `front-bundle-c96b7eea6cf316c0e1841f13b203e7731aaef4f1`, modifié uniquement pour la configuration publique runtime same-origin et le routage Vercel.
- Déploiement final : `dpl_C3sUicextthEnH2vofmGQVhLzR5r`, état READY et **target preview vérifiés par inspect**.
- Santé API, configuration réelle, HTML/runtime same-origin, manifeste standalone et icône 192 joignable : contrôlés en ligne par `scripts/check-preview-api-p0.mjs`.
- Inscription synthétique, création et activation du workspace, reconnexion, profil relu après sauvegarde, étapes facultatives passées sans invitation ni paiement : exécutés en ligne. Société synthétique créée, relue, modifiée, relue, supprimée ; absence vérifiée par liste filtrée. [Résultat public expurgé](./p0-preview-online-proof.json).

Les identifiants du compte de démonstration restent dans un fichier privé hors Git, destiné au propriétaire. Aucun mot de passe, JWT, secret d'origine ou identifiant DB n'est publié dans cette preuve.

## Corrections des contrôles, sans modification de l'authentification applicative

Le CLI Vercel local transmet `--non-interactive` à curl dans cette commande ; cet argument a été retiré après un échec avant inscription. Le token Bearer obtenu avant activation manque du membre créé ensuite ; le smoke réauthentifie donc le compte après activation, et peut reprendre explicitement son propre compte existant avec contrôles de chemin privé, run et origine. Le navigateur emploie des cookies avec un mécanisme serveur distinct ; aucun bug navigateur n'est déduit de cet échec du smoke.

La requête singulière company lève RECORD_NOT_FOUND après suppression ; la preuve d'absence emploie désormais companies avec filtre UUID et liste vide. Les deux échecs intermédiaires du smoke ne sont pas présentés comme des défauts métier corrigés.

## Incident Vercel maîtrisé

Le premier déploiement du nouveau projet a été automatiquement classé production malgré l'option explicite preview. Aucun contrôle API n'avait été publié et aucun secret d'origine n'existait dans l'environnement production ; aucune donnée de recette ni production existante n'y était reliée. Après création et vérification du véritable déploiement preview, ce seul bootstrap involontaire `dpl_D4szZvcRrquKNzs1QgpJn9Eo8NBg` a été supprimé avec succès avant publication du contrôle API. Aucun projet ou domaine de production existant n'a été modifié.

## Limites de cette livraison

La protection Vercel est conservée : le propriétaire peut devoir se connecter à son compte Vercel avant la connexion CRM. Les contrôles API utilisent le CLI authentifié du même compte. Le navigateur cloud a vérifié accueil/formulaire ; l'onboarding et le CRUD ci-dessus ont été vérifiés par API, pas par clics dans la preview protégée.

PWA existante conservée : manifeste et icônes servis, mais pas de test d'installation sur appareil ni de mode hors ligne livré. Quick Tunnel ne transporte pas SSE : fonctions temps réel limitées. Les applications Char/Forms et les nouvelles réparations Char de Claude ne sont pas déployées par cette preview CRM. Les constats de confidentialité du cache de métadonnées, les corrections Char restantes et la consolidation Git restent documentés dans CORRECTIONS.md ; cette livraison ne clôt pas tout P0.


## Correctif d'accès propriétaire — vérification navigateur réelle

Le propriétaire signale que le lien initial n'aboutit pas au CRM. Ouverture directe reproduite : écran de connexion Vercel. Les tests du CLI authentifié ne suffisaient donc pas à prouver l'accès du destinataire ; cette limite de livraison est corrigée.

Un lien de partage Vercel a été créé via l'API officielle pour le seul déploiement dpl_C3sUicextthEnH2vofmGQVhLzR5r, avec TTL borné à l'expiration de la session. La protection globale du projet reste active. Le jeton de partage est conservé hors Git et transmis au propriétaire dans le chat, jamais dans cette documentation publique.

Test en navigateur initialement sans session Vercel : lien de partage -> accueil CRM -> adresse du compte synthétique -> mot de passe -> connexion réussie -> liste Companies visible avec les cinq sociétés d'exemple. Capture locale preview-signed-in-40988179084.jpg remise au propriétaire. Le compte de démonstration était déjà provisionné par le smoke API ; ce test valide désormais sa connexion et le rendu des données dans la preview déployée, pas seulement l'accueil de l'artefact CI.
