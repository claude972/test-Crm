# Hermès — point d’intégration 30 octobre, 10:53 Martinique

Objectif utilisateur : web/PWA uniquement, vraie messagerie WhatsApp/Evolution + bot Hermès MCP, réception mail, entrée scraping automatique, Forms et Cal.diy reliés au CRM ; test final par lien à midi.

Root branche feat/codex-hermes-integration : backend806f58ca3, frontendcf501f9f2, garde bot ee20d8177 intégrés. Inbox durable trois tables par structure, manuel/AUTO/handoff, Evolution webhook/envoi, IMAP lecture seule et SMTP via comptes natifs chiffrés, entrée signée Hermès, bridge Forms/Cal notes/réservations réels. Aucun fournisseur externe réellement configuré/vérifié ; ne pas afficher connecté.

Claude CLI8f3db32e : termine AUTO/handoff, état intake GQL et raccordement réel des relations NoteTarget/CalendarEventTarget. Les anciens hooks awaiting-contract ne constituent pas une intégration terminée. Codex backend_review : tests natifs inbox et wrapper ; prospection_api : query étatintake/provenance signée et relations FormsCal ; preview_hosting : audit SMTP et génération/migration officielle. Root : intégration, contrôles, preview exacte et navigateur. Ne pas dupliquer ces fichiers.

CI806 : compilation serveur passe, 200 anciens tests et nouveau lot unit passent en cloud ; nouvelle migration officielle générée mais garde stricte refuse14DDL au lieu de13. Artefact conservé pour revue, pas de SQL manuel. Local170nouveaux tests :168passent et2timeouts sous charge ; relancer ces deux suites avant conclure. Mail22tests passent. Typecheckprod local réussit. Pas encore de preuve runtime/PG des nouveaux modules.

Ancienne preview interne41052809170 expirée13:40UTC ; ne pas fournir comme livraison. Nouvelle session90min à préparer sur SHA exact backend/frontend validé, preview Vercel protégée avec partage limité à expiration API. Exiger véritable test navigateur sans login Vercel, compte synthétique, liens et limitations honnêtes. Original test-Crm et sauvegardes préservés.

## Gel de recette — 11:10 Martinique

SHA final candidat publié : `47619ce6bbce1cf87ab66770e5f04631aba8a982`. Claude a livré le vrai état intake/provenance (`266432a11`) et les lectures natives des notes/calendriers (`4a462cc5b`) ; ces raccordements ne sont plus des stubs. AUTO/handoff est intégré, avec désactivation du retry automatique de la délégation. Forms est présenté comme des notes CRM natives.

Backend indépendant `41075842313` sur bae02ca00 vert : typecheck/compilation/démarrage, 201 tests historiques +177 nouveaux, migration PostgreSQL up/down/up et 21 cas HTTP/ORM natifs. Les deux cas natifs Forms/Cal et les dernières gardes sont attendus sur le candidat final. Local final : 105 tests frontend/11 suites passent ; 23 tests mail passent. Ne pas transformer ces preuves locales en validation navigateur ou connexion fournisseur réelle.

Final en cours : combined `41078123463`, backend indépendant `41078123431`, session isolée90min `41078168465`, branche `preview/p0-session-20261030-final-1510` au même SHA. L’agent preview_hosting possède déploiement/control/partage/onboarding ; root possède vraie recette CUA. Pas de push supplémentaire sur branchepreview sans coordination. Aucun lien de livraison encore validé à ce checkpoint, aucun fournisseur externe configuré en preview. Rapport de preuve détaillé dans docs/verification/hermes-unified-inbox-status-20261030.md sur la branche root.
