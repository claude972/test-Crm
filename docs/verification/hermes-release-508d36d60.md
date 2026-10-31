# Hermès — candidat de recette 508d36d60

Source gelée : `508d36d60c024eb3f72f00dee82ebf87d019c626`, branche `fix/hermes-autonomous-recovery-20261031`.

## Preuves exactes au 31 octobre 2026, 17:33 UTC

- Frontend natif complet : [41223824108](https://github.com/claude972/test-Crm/actions/runs/41223824108), SUCCESS. Rapport JSON : 114 suites, 1348 tests PASS, 0 FAIL, 0 pending. Typage complet et bundle production PASS.
- Artefact frontend 13051106413, `hermes-v4-frontend-build-508d36d60c024eb3f72f00dee82ebf87d019c626` : digest GitHub et archive téléchargée identiques, `sha256:8c7be0609e5d8c606cd374c0052246556eeb705360775b95f0b4fd849e34cc16`. 2151 fichiers, aucun chemin traversant ni lien symbolique dans l'archive. Index HTML SHA256 `193144a109a3f5b8b3000110b8b7ed8e143f0bc00521974ec339c32e2d7f9ae3`.
- Artefact de preuve frontend 13050971715 : digest téléchargé vérifié `sha256:a77bffdd8420390a631d137cb86134d6fced7e72438618bb3bdb2042a5861343` ; JSON de tests et sortie de typage.
- [CI combinée finale 41223827218](https://github.com/claude972/test-Crm/actions/runs/41223827218) avec SMTP opt-in : EN COURS à ce point, pas annoncée PASS avant conclusion. Les anciens SMTP/migration 0fc et combined 6abc sont verts mais ne remplacent pas cette preuve du SHA final.
- Arbres backend src `82e6d846b5f185d9cddf5fc7e2b4b791902ef733` et test `10498413d33abc2bcb5f0f5f73fc4596ec9d64d2` identiques à45af, vérifiés par Git. Ceci prouve l'absence de delta backend depuis ces contrôles, pas une recette navigateur.

## État de livraison

Aucun runtime P0 ni déploiement Vercel nouveau n'est lancé à ce point. Aucun lien actif ou compte final n'est annoncé. Préparation privée conservée dans `/private/tmp/hermes-final-preview-508d36d60` ; aucun credential ou lien de partage dans ce rapport.

Après succès combiné, démarrer une seule session isolée du même SHA, avec worker, sociétés sur même origine et fixture mail TLS opt-in. Configurer compte/lien/domaine par UI puis tester campagnes et réception sur boîtes fictives ; preuve d'accès utilisateur sans login Vercel, véritables parcours desktop/mobile et expiration réelle restent à produire. Session90min jetable, pas un hébergement durable.

Les services réels Evolution/WhatsApp, MCP Hermès, Forms/Cal et SMTP personnel ne sont pas présentés connectés. Les tests de capture SMTP/IMAP et des adaptateurs simulés restent identifiés comme isolés. Pas d'envoi à des prospects réels.

## Gel et reports

Les correctifs ciblés de payload bot54, pipeline production/a0/dashboard0a2/fallbackc604, media7bd et loader8c sont intégrés/revus dans leur périmètre. Préférences, scopes, sources canoniques et absence de réémission sont conservés dans les contrôles cités ; les limites des revues et de la matrice R01–R16 restent valables jusqu'à recette.

Deux commits supplémentaires proposés par Claude sont différés : 5a93d9aba ajuste seulement le budget asynchrone de tests, inutile pour cette CI frontend déjà verte ; 3d0d629ec durcit une entrée de catalogue vide, sans reproduction contre les cinq libellés du bundle508 actuel (présents uniquement EN/FR, non vides, autres langues avec fallbackEN). Les accepter ultérieurement nécessite une preuve concrète ou un lot distinct, sans invalider cette recette par ajout opportuniste.
