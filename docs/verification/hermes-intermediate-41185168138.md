# Hermès — recette intermédiaire41185168138,31octobre2026

Cette preview sert à trouver les défauts, elle n'est pas la livraison finale. Aucun fournisseur réel branché ni envoi à un prospect.

Source frontend/backend identique vérifiée : `924b3fccc341c578cd3834e5e894df2f8bd8f72d`. Fullfrontend41185151923 SUCCESS, artefact13036434243, nom `hermes-v4-frontend-build-924b3fccc341c578cd3834e5e894df2f8bd8f72d`, digest GitHub `sha256:3710ecd5ef8e5ddb5553141c0201a3b433513a6d258cc30a6426a7ef725deb07`. Index source SHA256 `1a778a540cf4caadc7633dc4f766150faa68b2ec0f17916be9420a243312c84c`, index staging `8cad6794da8a8851d145dbc2a5ea211ba33f2cd870643dc4ed45017b29f9e276` après unique remplacement du slot runtime par le helper revu. Manifeste2147fichiers hors bundle.

RuntimeP041185168138, attempt1, artefacttunnel13035983046 : mêmeSHA, expiration absolue **31octobre10:08:55.440UTC**. Vercel `dpl_E18kuoa5yCXrdMF9BpkFwikV5nDv`, projet `prj_0YAVdnCjN7e2zHNAbLzUCw3N4JvF`, READY,targetnull et zéroalias vérifiés par API. Protection globale `all_except_custom_domains` maintenue. Contrôle publicbae3db5ed envoyé après READY avec uniquement serverUrl/frontendUrl égales. Partage privé borné au déploiement, expire10:08:34UTC ; clé et compte restent hors Git. Ce runtime90min n'est pas un hébergement durable.

## Exécution réellement observée

- Healthz viaCLIauthentifiée :statusok. Le helper API a validé configuration publique et inscription synthétique, mais échoué à create_workspace avec UNAUTHENTICATED ; aucun CRUD ultérieur de ce run n'est validé. Rapport filtré local horsGit. Ce résultat n'est pas présenté comme une preuve anonyme Safari.
- CUA,IAB, nouvel onglet19 : lien de partage ouvert sans loginVercel, redirection vers /welcome et interface française. Connexion NORMALE au compte synthétique créé, par courriel/motdepasse dans les contrôles de l'app. Aucune injection de storage/état, aucun appel API substitué à la navigation.
- Après connexion, /workspace-activation se termine sur «La création de l'espace de travail a échoué». Console08:49:31UTC : useLoadCurrentUser/Authentification échouée ;08:49:34UTC : «Session was replaced by a newer sign-in.» Le bouton Recommencer a été essayé une fois, avec le même échec. Le lien d'accueil renvoie à l'activation et au même échec. Aucun dashboard ni module métier atteint ; ils ne sont donc pas recettés sur ce bundle.
- Aucune connexion Vercel réclamée dans cette ouverture IAB. **Safari du propriétaire reste non confirmé** ; ne pas assimiler l'un à l'autre. PWA/installation/offline encore non testés.

## Actions

CJ-AUTH-RECETTE-001 : blocage de parcours réel sur924, cause racine encore à diagnostiquer. ParentClaude propriétaireAuth prévenu avec SHA/heure/étapes. Corriger sans désactiver les contrôles de génération de session ni fabriquer d'état client. Garder la preuve échouée ; refaire une connexion et activation normales après correction.

R10 séparé : CI41183947336,e35ddba6a,opt-inSMTPvrai,FAILURE14/14tests au même beforeAllligne210 updateConfigVariable OUTBOUND_HTTP_ALLOWED_INTERNAL_HOSTS (réponse data absente). Docker/GreenMail ont démarré, il faut diagnostiquer l'auth/contrat de la fixture admin-panel. Aucun parcours SMTP final validé par cette première exécution. ParentCJ02/CJ05 prévenus, assertions et gardeSSRF à préserver.
