# Audit de livraison matin — 30 octobre 2026

Audit en lecture seule des scripts preview au snapshot root `650640f227ea7093573faae723504f9a56244725`. Rapport seulement ; aucun lancement, déploiement, changement de secret ou de protection effectué. La révision finale du matin reste à figer après CI combinée réussie. Une interface statique READY ne prouve pas une API disponible.

## État confirmé

- CLI Vercel 58.4.0 authentifiée ; checkout lié `/Volumes/Stockage/dev/hermes-crm/p0-preview-session/.vercel/project.json` : projet `hermes-crm-p0-preview`, ID `prj_0YAVdnCjN7e2zHNAbLzUCw3N4JvF`, scope `brafas-projects`, équipe `team_FwKGZr6VuoT5fQRt9qrpZwqP`.
- GET projet : `ssoProtection.deploymentType=all_except_custom_domains`. Aucune protection modifiée. Aucun achat requis par la procédure ; ne pas ajouter de produit/plan.
- Seul ancien déploiement trouvé : `dpl_C3sUicextthEnH2vofmGQVhLzR5r`, READY et `target:null` (preview). Son API et son compte synthétique ont expiré le 30 octobre à 02:55:40 UTC. Ne pas le présenter comme lien utilisable.
- Coffre `/Users/claudebrafa/.codex/private-preview/test-Crm-p0/` : répertoire0700, fichiers database/origin/demo/share0600. Valeurs secrètes non affichées. Ancien partage : scope `shareable-link`, expiration1793328942, déjà expirée. Ne pas réutiliser ses credentials ni sa clé de partage.
- Le contrôle GitHub courant est un ancien couple d’origines publiques identiques. Blob lu en direct : `a08e60cf7603515441bf1e5741ae5b13f8a06d0d`. Un nouveau run refuse précisément ce blob baseline ; publier ensuite un nouveau déploiement immuable, donc un contenu/blob différent.

## Sources et topologie à figer

Le workflow `.github/workflows/p0-preview-session.yml` compile le backend depuis son propre `github.sha` ; il ne construit pas le frontend. Le frontend doit provenir exclusivement de l’artefact `front-bundle-<SHA>` du run combiné choisi, dont `headSha` est vérifié et STRICTEMENT IDENTIQUE au SHA de la branche session backend. Ne pas prendre aa0d3a03c (documentation seule, sans artefact dédié) ni prétendre une égalité entre sources différentes. Candidat actuel650640f227ea7093573faae723504f9a56244725 : run41013453464 encore pending au contrôle ; le run33ba41012486685 est encore en cours. Aucun SHA final ni hash de bundle encore validé pour le matin. Ne pas reprendre `front-c96`, `front-bad53` ni un ancien staging.

Le staging vide est produit par `preview-prepare.mjs prepare <build> <staging-neuf> <tunnel>`. Le bundle est copié sans fichiers cachés/symlinks ; seul le slot runtime existant est remplacé par `REACT_APP_SERVER_BASE_URL:""`. Le frontend utilise effectivement `window._env_.REACT_APP_SERVER_BASE_URL || window.location.origin`, pas `import.meta.env`. Configuration générée : 22 routes ApiPath + filesystem + fallback SPA. Les routes transportent uniquement une référence `$P0_ORIGIN_SECRET` à l’environnement preview Vercel, jamais sa valeur dans le JSON ou le navigateur.

Gate : secret HTTP timingSafeEqual, retrait du secret avant Nest, Host et X-Forwarded-Host/Proto/Port forcés depuis l’origine HTTPS validée du contrôle. Nest reçoit SERVER_URL=FRONTEND_URL=AUTH_COOKIE_ALLOWED_ORIGINS, TRUST_PROXY=loopback. CORS et Auth restent actifs. Sans secret le tunnel doit retourner403 ; avec protection Vercel ordinaire le déploiement brut doit rester protégé.

## Durée et lifecycle

- Push `preview/p0-session-*` : session90min et worker=true. Dispatch : choisir explicitement90 et worker=true. Timeout job150min.
- Le TTL absolu commence dans `preview-ci-session-p0.mjs start`, après installation/build backend mais AVANT tunnel, déploiement, contrôle, migrations et readiness. `expiresAt` public fait foi, aucun renouvellement après ready.
- Gate09:15UTC (=05:15Martinique) donne expiration10:45UTC (=06:45Martinique). Gate09:00UTC donne10:30UTC (=06:30Martinique). Le lancement du workflow doit anticiper le build ; son heure de déclenchement n’est pas celle du gate. Ne pas promettre90min après livraison.
- La session attend au maximum15min le contrôle ; préparer le frontend et la liaison Vercel avant de démarrer le gate. L’upload tunnel puis le déploiement doivent laisser assez de marge pour publier le contrôle.
- setup-db puis run-instance-commands exécutés une fois. Changement d’origines : arrêt/restart serveur+worker sans réinitialiserDB. APP_SECRET stable durant le run, nouveau au run suivant.
- Gate et backend partagent P0_PREVIEW_EXPIRES_AT. Fin du run/annulation : SIGTERM groupes puis SIGKILL, retrait du contrôle local ; servicesPG/Redis détruits avec le job. Ne pas pousser une autre branche preview pendant la recette : concurrency cancel-in-progress arrête la session actuelle.

## Campagnes / SMTP

`preview-backend-session-p0.mjs:53–56` impose EMAIL_DRIVER=logger, EMAILING_DOMAIN_DRIVER=SMTP, EMAILING_SMTP_CONNECTIONS='{}', HERMES_B2B_CAMPAIGNS_ENABLED=true. La création d’un nouveau workspace active alors les objets natifs de campagne (`workspace.service.ts:572`). Le worker est réel, mais aucun relais SMTP workspace/domain n’est configuré ; le driver refuse explicitement l’envoi. La recette doit rester import→qualification→DRAFT, jamais Send/planification. Ne pas remplacer le transport vide par un faux succès, ni tester sur de vrais prospects. Les limites SSE restent applicables même si les lectures GraphQL et mutations réussissent.

## Séquence opérateur (préparation, commandes non exécutées ici)

Depuis un checkout propre de coordination root, remplacer les placeholders publics après revue :

```sh
gh run view <combined-run> --repo claude972/test-Crm --json headSha,status,conclusion
# Exiger conclusion=success, épingler UN SHA identique frontend et backend.
gh api repos/claude972/test-Crm/actions/runs/<combined-run>/artifacts --jq ' .artifacts[] | {id,name,size_in_bytes,digest,expired} '
gh run download <combined-run> --repo claude972/test-Crm --name front-bundle-<same-approved-sha> --dir /absolute/new-front-build
# Écrire un manifeste local hors du bundle, avant modification du slot runtime :
(cd /absolute/new-front-build && find . -type f -print0 | sort -z | xargs -0 shasum -a 256) > /absolute/new-front-build.sha256
# Créer/pousser une branche preview/p0-session-<fresh-id> au SHA backend approuvé,
# ou dispatch sur cette même révision :
gh workflow run p0-preview-session.yml --repo claude972/test-Crm --ref <fresh-preview-branch> -f session-minutes=90 -f start-worker=true
# Attendre artefact exact run+attempt, jamais artefact d'un run précédent.
gh run download <session-run> --repo claude972/test-Crm --name p0-preview-tunnel-<session-run>-<attempt> --dir /absolute/new-tunnel
node scripts/preview-prepare.mjs prepare /absolute/new-front-build /absolute/new-staging https://<fresh>.trycloudflare.com
# Lier uniquement ce staging au projet isolé existant.
vercel link --cwd /absolute/new-staging --scope brafas-projects --project hermes-crm-p0-preview --yes
vercel deploy --cwd /absolute/new-staging --scope brafas-projects --target preview --yes
# Capturer l’ID et inspecter : exiger projectId exact, READY, target preview/null.
vercel api /v13/deployments/<new-dpl-id> --scope brafas-projects --raw | python3 -c 'import json,sys; d=json.load(sys.stdin); print(json.dumps({k:d.get(k) for k in ["id","projectId","target","readyState","url"]}))'
```

Ne pas afficher la sortie intégrale d’un endpoint susceptible de contenir protectionBypass/env. Pour l’inspection précédente, capturer dans un fichier privé puis afficher seulement id/projectId/target/readyState/url. Incident antérieur : le premier déploiement d’un projet nouveau avait ciblé production malgré target preview ; le projet existe désormais, mais la vérification reste obligatoire. Ne pas promouvoir ni attribuer d’alias de production.

Après READY preview, publier via checkout de coordination un fichier `docs/verification/p0-preview-control.json` contenant EXACTEMENT serverUrl/frontendUrl, identiques à `https://<new-immutable-deployment>.vercel.app`, sans slash final. Commit/push sur missions/p0-stabilization dans les15min d’attente. Ne jamais y mettre run credentials, APP_SECRET, PG, origin secret ou share URL. Attendre le log `preview ready` puis vérifier healthz et client-config via Vercel. Écrire metadata publique de session avec deploymentUrl/runId/sha/expiresAt/environment="preview" avant d’exécuter le helper d’onboarding.

```sh
node scripts/check-preview-onboarding-p0.mjs --url https://<new-deployment>.vercel.app --run-id <session-run> --run-metadata /absolute/new-public-session.json --credentials /Users/claudebrafa/.codex/private-preview/test-Crm-p0/demo-<session-run>.json --result /absolute/new-redacted-result.json
```

Le helper exige une échéance future <=90min et au moins5min restantes. Ses credentials sont créés exclusivement0600. Vérifier ensuite welcome/login/dashboard/réception en navigateur sans compte Vercel via le partage ci-dessous, et contrôler le temps restant immédiatement avant remise du lien.

Le manifeste final de livraison doit associer explicitement same-approved-sha, combined-run, artifactId/digest GitHub, hash local index.html/manifeste, session-run/attempt, tunnel.expiresAt et deploymentId/origine. Avant publication, vérifier tunnel.sha == same-approved-sha. Aucun digest n’est inventé tant que l’artefact n’existe pas ; le rapport actuel n’en dispose pas.

## Partage humain limité au déploiement, sans login Vercel

API officielle vérifiée : `PATCH /aliases/{id}/protection-bypass`, id peut être l’ID du déploiement exact, body `{ttl:<secondes>}`. Le modèle officiel précise : ttl absent signifie PAS d’expiration. Ne pas employer un alias mobile, un override public, une exception de domaine ou le bypass automation global du projet.

Après avoir vérifié l’ID preview, calculer `ttl=floor((expiresAt-now)/1000)-30`, exiger ttl>300 et <=5400. Commande à exécuter seulement après autorisation du déploiement :

```sh
# PRIVATE_BODY contient seulement {"ttl":<remaining-seconds>}.
# umask protège également le fichier contenant la réponse avec clé secrète.
umask 077
vercel api /aliases/<new-dpl-id>/protection-bypass --scope brafas-projects --method PATCH --input /absolute/private-ttl.json --raw > /Users/claudebrafa/.codex/private-preview/test-Crm-p0/share-<session-run>.json
```

Le secret de partage est une CLÉ de `protectionBypass` dans cette réponse. Ne pas afficher les clés de cette map ! Vérifier uniquement son unique entrée de scope=shareable-link, createdAt et expires (secondes Unix), avec expires <= échéance API. Construire la share URL uniquement dans le coffre, avec `?_vercel_share=<clé>`. Ne pas enregistrer sa valeur dans Git, artefacts publics, arguments shell ou journaux. La remettre exclusivement au propriétaire par le canal privé final autorisé.

Preuve sans connexion Vercel : utiliser un nouveau contexte navigateur/cookiejar, sans storageState existant, sans CLI Vercel, sans header bypass automatique et sans Authorization. Ouvrir le lien privé, suivre sa redirection et laisser uniquement son cookie de partage. Vérifier que l’URL finale reste sur l’origine exacte du déploiement, que welcome est visible, puis GET /healthz retourne status=ok et /client-config un JSON dont serverUrl est cette origine. Vérifier ensuite login applicatif avec le compte synthétique privé et écran Hermès. Échouer si redirection vercel.com/login, 401/403 de protection, API502/timeout ou simple HTML à la place de JSON. Ne jamais publier Location/Set-Cookie ni l’URL complète portant la clé. `vercel curl` est utile au superviseur mais NE constitue PAS cette preuve d’accès utilisateur anonyme Vercel.

## Pièges restants et critères de remise

- Aucun lien utilisable n’est garanti par ce rapport : run matin, frontend SHA exact, contrôle et lien privé restent à produire et vérifier.
- Session démarrée trop tôt, build/queue lent, contrôle reçu après15min, source frontend d’ancien run ou nouveau push annulant concurrency : tous peuvent produire un lien mort avant06h.
- Interface Vercel survit à l’API éphémère : afficher l’expiration réelle, ne pas qualifier cette recette d’hébergement permanent ; révoquer le partage ou supprimer le seul déploiement temporaire propre à la fin si souhaité par root.
- Cloudflare Quick Tunnels : absence de garantie d’uptime, limite200 requêtes en vol, SSE non pris en charge. La synchronisation temps réel CRM n’est donc pas validée ; reload manuel peut être nécessaire. Ne pas masquer les erreurs de souscription comme de faux états synchronisés.
- Le contrôle ne lie pas cryptographiquement run/source : le superviseur root doit comparer artefact runId/sha/expiresAt puis ID/projet Vercel avant son commit. Pas de secret dans le contrôle.

## Vérifications réellement faites et sources

Lecture des scripts/workflow ; GET Vercel métadonnées filtrées ; noms/modes et métadonnées non secrètes du coffre ; contrôle GitHub lu via API. Appel pur createConfig avec tunnel synthétique :24 routes, `/.well-known` échappé, rejet du faux préfixe `/xwell-known`, référence d’environnement sans valeur de secret. Aucun DB/serveur/browser/session cloud lancé pour cet audit.

- [Vercel Shareable Links](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/sharable-links) : partage par déploiement et révocation.
- [SDK officiel, schéma TTL et deployment ID](https://raw.githubusercontent.com/vercel/sdk/main/src/models/patchurlprotectionbypassop.ts), lignes108–126.
- [SDK officiel, endpoint PATCH](https://raw.githubusercontent.com/vercel/sdk/main/src/funcs/aliasesPatchUrlProtectionBypass.ts), lignes96/126.
- [Cloudflare Quick Tunnels, limitations](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).

## Recette interne exécutée — 30 octobre, source9ce

Backend run41052809170 et frontend41052674485 : même SHA9ce34b95b43fadf195bb0be3cacf378fe116f35c. Front artefact12976390274 digest `sha256:4c6e5e2b4852d3b43037a72e7a750f67e90c87035fc08a011824f20cf381ab75`, 2098fichiers ; manifesteSHA256 `cf7ba807a8cc50039305a61cef3f6c72b379567ebb8b831b22760cc71f151c4d`, indexSHA256 `9b27d4318884886ca8a217260de294cffe9888c776dcf59c8895916054544e68`. Worktree propre neuf chore/p0-internal-deploy-9ce ; staging distinct release-20261030-staging. Vercel link a généré `.env.local` avec un tokenOIDC : fichier supprimé sans lecture avant upload, seules métadonnées projectId/orgId vérifiées.

CLI58.4.0 refuse désormais `--skip-domain` avec `--target preview` AVANT création. La commande corrigée conserve uniquement `--target preview --yes` ; aucune option production ajoutée. Autre piège de cette version : `vercel curl ... --non-interactive -- ...` transmet l’option à curl, qui échoue. Employer l’invocation exacte du helper éprouvé `vercel curl <path> --deployment <url> -- --config -`, dans un checkout lié au projet isolé. Aucun contrôle natif affaibli pour ces adaptations CLI.

Déploiement `dpl_AASJaddNFftZ1Lax9cgLDNMsLexN` READY, projectId exact et targetnullpreview vérifiés avant ContentsPUT ; contrôle public commitbc26818cf4b691bcda9e268dfb721d1b93d6d888. API expiration13:40:16.263UTC (départgate12:10:16.263UTC). URL publique `https://hermes-crm-p0-preview-a448finxf-brafas-projects.vercel.app`, protégée hors partage. Ce créneau interne expire avant12hMartinique et ne valide pas la disponibilité finale demandée.

Helper onboarding : PASS14étapes, signup/workspace activation/login/profil/onboardingcompleted/CRUDcompany et suppression vérifiée. Partage créé seulement pour cetIDdeployment, scope shareable-link et expiration <=APIexpiry-30s, réponse et URLdashboard exclusivement dans coffre0600. Preuve curl standard, cookiejar neuf sans CLIAuth ni Authorization : document nu302protégé, lien privé200 avec pathfinal/dashboard préservé, healthstatusok et client-configserverUrl exact200. Root a reçu uniquement cheminsprivés, jamais valeurs de secrets. La recette navigateur root et le run combiné restent indépendants de ces vérifications HTTP ; aucun succès global inventé.
