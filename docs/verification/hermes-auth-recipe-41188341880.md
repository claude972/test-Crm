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
