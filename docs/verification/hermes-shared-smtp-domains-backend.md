# CAT-BACKEND-SMTP-SHARED — backend checkpoint

Base : 90f180a5aed985be373fc577005a8a62ed04152e. Branche `fix/hermes-shared-smtp-domains-20261031`, arbre isolé sparse. Claims publiés avant code dans missions/p0-stabilization04db78080 puis9fba47efc. Root possède génération/intégration cloud ; aucun fournisseur réel ni DB locale lancé.

## Comportement

- Une provenance de driver serveur persistée dans core.emailingDomain, cachée du schéma GraphQL. Anciennes lignes default LEGACY_GLOBAL : leur driver n'est pas deviné depuis la configuration courante.
- Unicité `(workspaceId,domain,driver)` et unicité partielle globale du domaine pour tous les drivers horsSMTP. SMTP A/B peuvent partager un domaine en gardant deux lignes propres ; AWS/Resend/LOG/legacy conservent un propriétaire global unique.
- Création : réserve PENDING par insert atomique avant toute opération distante. Conflit d'unicité concurrent avant verify/register ; échec garde une ligne FAILED, aucun VERIFIED inventé. Vérification de reprise rejoue register avant de republier le verdict VERIFIED, afin de ne pas oublier un échec initial d'enregistrement.
- Factory, vérification, sélection campagne et handoff sender simple/batch vérifient la provenance compatible avec la configuration. Une ligne SMTP VERIFIED ne devient pas une preuve DNS cloud. Pas de fallback en cas de legacy/mismatch ; anciens jobs/campagnes ne sont pas retargetés vers une nouvelle ligne.
- Le domaine enregistré/vérifié enSMTP doit correspondre au domaine de la boîte exacte autorisée par le centre. Un From différent mais du même domaine reste refusé comme auparavant. Rotation/révocation et vérification TLS native conservées.
- SMTP unsubscribe prend SERVER_URL HTTPS même quand DNS manager existe ; aucun provision/adopt/refresh/delete de hostname partagé, aucun DNS/DMARC prétendu pour cette boîte. Signature/opposition/tenancy inchangées.
- Cleanup vérifie toute la provenance avant effets distants ; erreurs empêchent l'effacement local. Suppression workspace transporte désormais le snapshot `{domain,driver}` pris avant la cascade, en plus des noms existants ; job ancien sans snapshot ou snapshot incompatible refusé avant cleanup. Les autres flux workspace et permissions ne changent pas. Le cron ne sélectionne que le driver courant et revérifie sa compatibilité avant reprovisionnement.

## Validation réellement exécutée

- 77tests/6suites PASS : nouveaux cas shared-domain, sender suppression/quarantaine, SMTP natif de la boîte sur serveurs loopback synthétiques, factory centre, driverSMTP, workspace opt-in. Puis9/9 nouveaux cas shared-domain PASS après le correctif de reprise register (un cas supplémentaire, soit78cas distincts couverts au total, pas86 nouveaux tests).
- Les nouveaux cas prouvent A/B même domaine sur repositories de fixture, réservation avant effet, concurrence perdante sans verify, propriétaire cloud/legacy exclusif, refus driver/tenant étrangers, cleanup legacy/mixte sans effet, conservation d'ownership en échec, état FAILED et reprise register, absence totale d'appels DNS pour SMTP.
- Tests existants SMTP : vraies commandes Nodemailer contre serveurs HTTP/SMTP isolés de fixture seulement, aucun fournisseur/compte réel. Anciennes fixtures de factory sender adaptées au nouveau handoff lié à la ligne ; assertions de sécurité inchangées.
- Premier lancement avait8échecs de fixtures faute du nouveau nom de méthode getDriverForDomain ; adapté les deux fixtures, puis relance77PASS. Une commande de préparation locale avait un cwd erroné avant ces adaptations ; aucune source étrangère touchée.
- Tests locaux chargés avec chemins explicites des dépendances déjà installées, aucun node_modules créé. Jestcachefalse, SWCcache sous/private/tmp. Le dernier chargement unique a été lent(~75s) ; aucun build/typecheck complet local ajouté.
- Syntaxe/diff et contrôle de secrets exécutés avant commit. Aucune revendication PostgreSQL, migration générée ou envoi fournisseur réel. Les tests de repositories ne remplacent pas l'indexSQL réel A/B ; root doit exécuter cette preuve enCI.

## Migration officielle requise avant runtime

Le checkpoint schéma addb50143 contient l'entité/type et l'accès du type de driver. Ne pas déployer l'app sans migration. Le HideField ultérieur ne modifie pas le SQL.

Version courante2.52.0 ; nouveau fichier sous2-52 et inscription native dans instance-commands.constant.ts. Génération dans job GitHub isolé PG16/Redis/p0_ci sans.env privé, après setup-db et commandes existantes, à partir des entités compilées exactes :

`node dist/command/command.js generate:instance-command --name scope-smtp-emailing-domains --type fast --version 2.52.0`

Relire uniquement nouvelle colonne/type, retrait ancienne unicité, index composite/partiel et down associé. Ne pas éditer la migration historique2-9/1799000020000. Maximum2-52 observé1793403069092, inférieur à l'heure réelle31octobre ; recalculer avant génération. Les timestamps futurs d'autres versions n'imposent pas une date future2-52.

Intégrer l'artefact officiel, recompiler puis vérifier up/down/up + comparaison native sans dérive. Le down restaurateur UNIQUE(domain) doit refuser transactionnellement si des doublonsSMTP existent, jamais les détruire/dédoublonner automatiquement. Tester ce refus sûr et les contraintes concurrentes SQL réellement.

Recette supplémentaire requise :14parcoursR10 existants puis A/B avec deux boîtes synthétiques du même domaine sur GreenMailTLS, From exact et compte propres, mauvaises lignes étrangères refusées, unsubscribe/opposition A sans effet B, cleanup A sans effet B, rotation de driver refusée, absence de second envoi après DATA incertain. Les fixtures qui insèrent directement des lignes doivent spécifier SMTP uniquement lorsqu'elles configurent réellement le transport de fixture ; aucune exception LEGACY ajoutée pour faire passer un test.

## Limites de reprise

Les anciennes lignes restent LEGACY_GLOBAL et ne sont pas adoptées automatiquement par AWS/Resend ouSMTP. Les anciennes ressources cloud et jobs sans provenance nécessitent une reprise opérateur documentée, pas une émission ou suppression devinée. Une nouvelle ligne SMTP peut coexister avec cette réservation historique. Aucun effacement d'ancienne preuve DNS/driver pendant cette migration. Génération, typecheck complet et recette PG/cloud appartiennent au checkpoint intégré de root et ne sont pas prétendus exécutés ici.
