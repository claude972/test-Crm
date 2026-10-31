# Hermès — contre-épreuve Auth et campagnes,31octobre2026

Source exacte frontend/backend `d3eb5df38537fcfdcdc34d01cb6db130a203902c`, branche épinglée preview/cj-auth-d3eb5df38. Front41188342005SUCCESS, artefact13037558853, digestGitHub `sha256:d17cb437de6da88ca92aa6954413e602ccd9f2d51f904164e049542f68a4ad45`, indexsourceSHA256 `f3ddfc5049938d7669cb623a3c7e261bdde1054b762c4b6dfc7102dad19c15d3`. Runtime41188341880/attempt1, expiration10:56:50.232UTC. Verceldpl_4noqH7Zb3Bo4QnJjzmnYdw4DDHMC, projetprj_0YAVdnCjN7e2zHNAbLzUCw3N4JvF,READY,targetnull et zéroalias vérifiés, contrôle6ed250996 envoyé aprèsREADY. Partageprivé expire10:56:21UTC, accès/compteuniquementcoffre. Preview intermédiaire, pas de remise finale.

Après propagation du contrôle, health200/statusok. Premier probe pendant démarrage retournait502Cloudflare : conservé comme transitoire, pas déclaré vert. Compte synthétique créé par la seule mutationnative signUp, sans société ni activation injectée par script.

## Parcours navigateur réellement exécutés

IABonglet20, nouvelleorigine, aucun loginVercel demandé. Connexion email/motdepasse dans l'app, formulaire de création de société «Hermès Recette Alpha», profil fictif, invitations Passer puis Ignorer quand même sans destinataire. Arrivée normale dans Entreprises avec5lignes seed. **Contre-épreuve positive du blocage Auth924** : pas de SessionSuperseded à cet endroit. Aucun stockage client injecté, aucun dashboard forcé par API. Logout/relogin et deuxième société encore à recetter sur ce run. Interface française, résidus AllCompanies/System/1minuteago observés et transmis.

Campagnes : entrée absente du menu d3, donc URL interne connue utilisée pour tester la page — ce n'est pas une validation du menu. Création «RecetteB2B—aucunenvoi» depuis liste, saisie objet et corps dans le VRAI éditeur natif (avec {{fullName}}), Enregistrer, reloadcomplet et réouverture : objet et corps relus identiques. Brouillon, zéro émission.

Prospection : dépôt JSON manuel de1ligne entièrement fictive (domaine .test), provenance JSONmanuel visible. Qualification explicite avec contexte B2B et information au premiercontact. Ligne devientQualifiée, puis création d'une audience et de son brouillon par l'action native. Batchc55b5afa-3b33-4c9b-823b-c02d5b72b64b, sociétéfb086bda-26f3-496e-8e3d-cb545b40b94c. Pas un scraping externe ni une réception signée, aucune création automatique d'affaire déclarée.

## Défauts réels transmis à Claude

- Campagneissuequalification21863c22-e759-5ad5-9550-d4cda60568bc a unUUIDv5 déterministe légitime, rejeté par les inputs natifs de preview/send utilisantIsUUID4. Capacités/audience indiquent campaignIdmustbeaUUID. Garder idempotence et identifiers existants, aligner validation avec les UUIDnatifs acceptés et garder les guards de société.
- Sur le brouillon crééparliste(v4), choix de l'audience via VRAISelect,1destinataire retenu, choix du destinataire fictif, clicAperçu : échec Apollo4.2,mutation/mutation/query. Le hook emploie useMutation avec un documentQUERY. La présence du serveurpreview ne valide pas ce client ; aucun aperçu rendu par ce run.
- La classification de collecte garde contactsliés0 après qualification alors que qualifiée1 ; relecture aprèsmutation à corriger/retster.
- MenuCampagnes absent ; promesse de restriction de test en préproduction dansCapacités contredite par le vrai contrat du test manuel. Points transmis avecsource exacte.

Aucun envoi de test, programmation, envoi de campagne ou fournisseur réel testé sur cette preview. SMTP/Evolution/MCP/Forms/Cal non configurés. Safari propriétaire, installationPWA/offline et mobile encore non validés.


## Extension de recette09:50–10:00UTC

Depuis le vrai centre Connexions et sociétés d'Alpha : ajout de « Hermès Recette Bêta », activité fictive, profil puis invitations ignorées. Arrivée normale dans Bêta sans injection d'état. Sa liste Campagnes affiche **Aucune campagne**, alors que deux brouillons existent dans Alpha. Son tableau de bord affiche5entreprises/5personnes/6opportunités/0tâche de démonstration. La vue native Vos sociétés autorisées affiche **les deux seules sociétés de ce compte** et les totaux11entreprises/11personnes/12opportunités/0tâche : Alpha6/6/6/0, Bêta5/5/6/0. Le client fictif et le contact issus de la qualification sont donc comptés seulement dans Alpha. Bascule native du sélecteur Bêta→Alpha aboutit normalement ; la table Alpha affiche « Atelier Recette Alpha » et6entreprises. Preuve visuelle locale enregistrée horsGit : /private/tmp/hermes-preview-41188341880/recipe/alpha-company-after-switch.jpg.

Ceci prouve ce cloisonnement d'affichage et le récapitulatif autorisé pour ce compte administrateur. Ne prouve pas encore les refus d'un autre utilisateur non membre, tous les endpoints ou un pipeline modifié/rechargé. Les fournisseurs du centre sont explicitement Non configuré. Politique bot affichée société ASSISTED, canaux hérités ; aucune réponse bot ou connexion réelle testée.

R10CI41189235623 sur75c7 finit FAILURE :8tests échoués/6passés/14, premier échec saveImapSmtpCaldavAccount Tokeninvalid. Le helper partagé utilise le tokenfixturepar défaut et n'accepte pas tokenA ; l'appel du nouveau test ne transmet pas son jeton dynamique. Les échecs MAIL/domaine/transport/table aval ne constituent pas des parcours validés. Parent informé avec cause source ; aucune barrière affaiblie.


## Pipeline10:03UTC — parcours UI réellement exécuté

Dans Alpha, ouverture native Opportunités/Parétape ; bouton CréerOpportunité crée la fiche c5ab1228-f502-4d9b-a227-076a85e19f2b. Nom fictif « Recette pipeline Alpha — sans action externe », changement d'étape New→Proposal par sélecteur natif, rechargement complet : nom et Proposal relus. Puis relations natives Entreprise→AtelierRecetteAlpha(35b73631-5e0e-4608-b439-8585e3130e4b) et Pointdecontact→ProspectFictif(6ffc1950-7c18-460c-9feb-cda576b1d1d8), issus de la qualification manuelle précédente. Nouveau rechargement : les deux liens et l'étape sont relus dans la fiche et la carte. Capturelocale /private/tmp/hermes-preview-41188341880/recipe/pipeline-relations-after-reload.jpg. Aucun transport déclenché. Cette preuve valide création/changement d'étape/relations/persistance de cette opportunité ; pas encore glisser-déposer, suppression ni toutes les transitions. La création humaine ajoute une septième opportunité Alpha ; les totaux observés plus tôt précèdent cette action.
