# Hermès — reprise après le quota Claude du 31 octobre

## Faits et autorisation

À05:32UTC (01:32Martinique), l'inventaire officiel du parent8f3db32e est idle/blocked, et ses sorties ainsi que celles des enfants annoncent la limite cinq heures, remise à03:50Martinique =07:50UTC. Ils ne codent pas pendant ce blocage. Ne pas acheter de crédits, changer de compte ni démarrer une session doublon. Seuls les vrais Claude écrivent le code ; Codex continue revues/tests/CI/docs. L'objectif12UTC demeure, aucune promesse de complet sans preuve.

L'automation existante de ce chat reste ACTIVE, même cible, avec reprise à07:50UTC ajoutée ; elle doit être arrêtée après le bilan12UTC. Au réveil : vérifier l'heure et l'inventaire, envoyer une instruction au parent EXISTANT/PTy2418. Celui-ci réactive les mêmes enfants. Aucun nouveau GO du propriétaire nécessaire.

Lire le dernier état GitHub avec `git fetch origin missions/p0-stabilization`, puis `git show FETCH_HEAD:MISSIONS.md` et `git show FETCH_HEAD:CORRECTIONS.md`. Le ref origin/missions peut être périmé car le fetch par défaut ne suit que main. Préserver tous les claims et fichiers en vol.

## Source préservée, checkpoints à intégrer

Intégration actuelle feat/hermes-complete-journeys dans /private/tmp/hermes-complete-journeys, dernier HEAD observé dfb33650f. Basec12718d1c. Le parent reste propriétaire de l'assemblage, des routes/navigation/locales ; Codex n'a pas modifié ces fichiers ni résolu leurs conflits.

| Lot | Source | Situation |
|---|---|---|
| CJ01 | 2f1e8e7058c00401ef646fd9f6c4fd6ce2e4a0f0 | Commit Claude terminé avant quota, root l'a publié par push ordinaire sur feat/claude-hermes-complete-campaign-ui ; aucune modification sémantique root. Audience/thème persistés, identité issue du MAIL central, sauvegarde concurrente corrigée. |
| CJ01a | 7c2e94e122cdd66166a88f2c158cec6b1bd27c77 | Poussé sur feat/claude-hermes-complete-campaign-body ; vrai champ natif EmailDocument et adaptateur sans perte. Basec127 : intégration avec les nouveaux props de sauvegarde CJ01 à faire prudemment. |
| CJ04a | b0ef31d0c29d9820a090ede94581319a0353bfcf | Poussé sur feat/claude-hermes-complete-integrations ; droits effectifs/sondes corrigés, worktree encore dirty sur deux fichiers UI de configuration. |
| CJ04b | 3413fd8c3a199ff19518ace968aff54355f19772 | Poussé sur feat/claude-hermes-complete-mcp-intake ; import/export DI du client MCP central corrigé et testé. |
| CJ03 | c69a4d733dfa939b1a03e0b8741984bba8ae2ecb | Déjà intégré ; origine, jeton et forme de livraison vérifiés dans le jugement de capacité. Preuve PG/blob réelle encore manquante. |
| CJ05 | c893438fc | Harnais avec quatre nouveaux extras déjà intégré. Nouveau test serveur campaign-body-round-trip.util.spec.ts hors du scan hermes-* à ajouter à la sélection CI. |

CJ04c a trois fichiers de nouveau panneau mail non committés dans /private/tmp/hermes-v4-mailbox-setup, branche feat/claude-hermes-complete-mailbox-setup, agent a7769545de262e240. CJ04d, a06ec3f87a242a81b, /private/tmp/hermes-v4-i18n, feat/claude-hermes-complete-mailbox-journey : lecture faite, aucun code livré. CJ02 a repris les recherches de recette HTTP/PG mais aucun test produit nouveau livré. Aucun de ces lots ne doit être déclaré fini.

Copie privée additionnelle du travail dirty CJ04a et des trois fichiers CJ04c : /Users/claudebrafa/.codex/private-preview/test-Crm-p0/quota-wip-20261031T0540, patch + archive + manifeste, droits0700/0600. Sources laissées en place, aucun reset/stash/clean. Ne jamais publier cette archive. Original test-Crm, environnements et sauvegardes conservés.

## Priorités de reprise

1. Intégrer les quatre checkpoints relus ci-dessus. Monter réellement HermesCampaignListContainer sur /hermes/campagnes, entrée menu, lien détails et retour ; une bibliothèque exportée n'est pas un parcours. Monter les détails avec une identité de composant adaptée au campaignId pour ne pas garder le brouillon d'une autre campagne.
2. Fusionner le champ natif CJ01a avec le contrôle de sauvegarde CJ01 : conserver saveState/onSaveContent, compter la prose et non le JSON, utiliser les issues filtrées pour la permission de sauvegarde, laisser la validation serveur des variables légitimes. Adapter les nouveaux tests de composant aux props du contrat intégré sans perdre le vrai TipTap. Vérifier aussi qu'un contenu hérité montré après conversion est bien enregistré sous la forme canonique affichée.
3. CJ04c termine la création/sélection native de la première boîte depuis le centre. CJ04a insère le slot dans ses propres fichiers et complète les champs MCP/intake requis ; pas de second magasin de mots de passe. CJ04d termine OFF/ASSISTED/brouillon MCP dans la vraie mailbox et reprise d'un brouillon après reload avec identités/révisions opaques. Contrats serveur coordonnés, MAIL006/ledger anti-rejeu intacts.
4. CJ02 écrit la vraie recette produit R10 HTTP/PG sous nouveaux fichiers hermes-campaign-mailbox* : compte natif→MAIL→domaine réel de fixture→campagne/audience/contenu/From→preview/test/schedule/cancel/send, capture SMTP isolée, droits A/B/opposition/incertitude. Les services métier/guards/persistance ne sont pas des mocks. CJ03 doit reprendre la preuve positive médias HTTP/PG/privateblob avec vrais fichiers décodables ; la Map et des octets de texte étiquetés PNG ne la prouvent pas. Annoncer les chemins exclusifs et transmettre la sélection à CJ05.
5. Consommer réellement la découverte MCP dans le centre et la classification/provenance dans les entrées/inspections : les queries seules ne suffisent pas. Les reçus de notes existants contiennent déjà Source/Event/Reported at et des cibles natives ; s'appuyer sur ces données et faire vérifier l'attribution par les API, sans inventer d'affaire automatique. La classification d'un dépôt scraping peut être liée à son batchId déjà exposé dans la prospection.
6. Parent termine français/routes/contextes et toutes les traductions des nouveaux textes. CI strictes sur source COMBINÉE, tests négatifs et vraie recette utilisateur, pas seulement compilation. Un premier runtime intermédiaire dès bundle prêt sert à découvrir/fixer les défauts ; une session finale neuve vers11:30–11:40UTC laisse une durée utile après12UTC. Dans le workflow P0 le build précède le démarrage du minuteur90min ; planifier le dispatch en conséquence.

## Preuves indépendantes root pendant le blocage

- CJ04b3413 : 2 suites/14 tests PASS sur la DI effective et la surface MCP. Vrais modules/classes concernés, infrastructure hors périmètre simulée ; aucune preuve de fournisseur réel.
- CJ01a7c2e : 2 suites frontend/13 tests PASS, vrai TipTap et adaptateur ; 1 suite serveur/3 tests PASS, parse canonique et substitutions distinctes. Le stringifier HTML est stubé et la persistance de ce test est une capture de callback, pas HTTP/PG.
- CJ01 2f1e : 3 suites/31 tests PASS sur sauvegarde/réouverture/identité/audience. Warning DOM réel div descendant de p dans le loader du nouvel AudiencePicker, à corriger sans masquer la console (CJ-CAMPAIGN-009). Clic complet du sélecteur non exercé ; recette navigateur requise.
- CJ04a b0ef : 3 suites serveur/62 tests PASS ; recheck propre frontend depuis le dossier twenty-front : 3 suites/35 tests PASS, aucun warning Apollo du mock de suppression. Les précédents échecs de chargement liés aux chemins/ESM/SWC restent consignés, pas des défauts produit.
- Root utilise maintenant son propre checkout de QA détaché /private/tmp/hermes-codex-review-complete, aucun auteur concurrent. Son sparse-checkout a été désactivé uniquement dans config.worktree après vérification de extensions.worktreeConfig=true ; dépendances empruntées en lecture par un symlink qu'il possède, pas dans les worktrees des agents. Aucun changement de code applicatif.
- CI41169707939 SUCCESS sur cc7243140 est historique, antérieure aux nouveaux lots. CI nouvelle MCP3413 **41173344142** et frontend2f1e **41173424054** en cours au dernier contrôle ; vérifier leur vraie conclusion. Elles ne valident pas encore l'assemblage futur.

## Blocage navigateur et livraison

Le canal CUA est indisponible depuis05:15UTC : inventaire timeout, transport fermé, reprise du navigateur connu puis onglet vierge échoués, js_reset puis nouvelle création timeout. Aucune recette visuelle nouvelle, aucun ancien screenshot ni curl200 promu en preuve. Réessayer à un checkpoint utile par CUA seulement, ne pas substituer une automatisation navigateur shell. Pas de redémarrage de l'application utilisateur ni de permission élargie effectué. Prévenir honnêtement si cela reste bloqué.

Dernier disque contrôlé : système11GiB libres, externe1,1GiB, donc aucun gros build sur externe ni nettoyage de travail d'autrui. Pas de production, nouveau service payant, vrais prospects, secrets Git, ou affaiblissement de protection globale Vercel. L'ancienne preview V4 est expirée. Aucun nouveau lien de livraison ne doit être annoncé avant contrôle du vrai backend, du bundle exact et des parcours. Safari propriétaire encore non confirmé.


## Mise à jour CI05:49UTC — à corriger dès reprise

Frontend41173424054 a terminé FAILURE sur2f1e8e705. Erreur unique du log failed : `HermesCampaignContentPersistence.test.tsx(51,44)` TS2344, `typeof MockLink` est une classe utilisée avec Parameters (contrainte fonction). CJ01 doit utiliser le type des paramètres du constructeur, sans enlever le test ni assouplir le check, puis relancer la CI stricte. Le test s'exécute en Jest mais ne passe pas le typecheck ; ne pas confondre les deux. MCP41173344142 en cours, conclusion à relire.


## Mise à jour05:57UTC

MCP3413 run41173344142 est SUCCESS sur tout le pipeline natif. Full frontend réglagesb0ef run41174465769 démarré, conclusion à vérifier. Frontend2f reste rouge sur son type MockLink (CJ-FRONT-TYPE-001).

Deux constats préliminaires CJ04c à prendre avant sa livraison : CJ-SETUP-001, le vrai save natif peut contacter les protocoles (test conditionnel activable), donc ne pas afficher « aucun serveur n'a été contacté » ni désactiver les contrôles natifs ; CJ-SETUP-002, refetch en échec après mutation acceptée n'est pas un refus d'écriture ni une preuve « rien écrit ». Distinguer l'état accepté et la lecture non rafraîchie/inconnue, conserver l'id confirmé et tester ce cas.
