# Hermès — résultat de la mission parcours complets, 31 octobre 2026

Base `c12718d1c`. Branche d'intégration `feat/hermes-complete-journeys`.
Rédigé par le coordinateur Claude. Les passes navigateur et les runs CI sont
exécutés par le propriétaire ; ce document ne revendique aucune preuve qu'il
n'a pas produite.

## Comment lire ce document

Trois niveaux, jamais mélangés :

- **Exécuté** — un parcours réellement traversé dans le navigateur sur la
  preview, ou un run CI terminé, avec sa trace.
- **Isolé** — un test unitaire ou d'intégration vert, sans fournisseur réel.
  Un test vert prouve ce qu'il contient, pas ce qu'on croit qu'il couvre.
- **Non vérifié** — écrit, assemblé, jamais exercé.

Aucun fournisseur externe n'est configuré : ni SMTP sortant réel, ni MCP, ni
Evolution, ni Forms, ni Cal.diy. **Aucune émission n'a eu lieu**, à aucun
moment, vers aucun destinataire.

## R01 — société exploitante distincte, création et bascule

**Exécuté.** Compte API neuf créé sans société, puis login e-mail/mot de passe
normal dans le navigateur, sans injection d'état : formulaire de création de
société, profil, invitations passées, table Entreprises. Puis, depuis le vrai
centre, création d'une seconde société Bêta avec profil et invitations, son
propre dashboard, et bascule native vers Alpha. Alpha retrouve ses deux
brouillons de campagne ; les campagnes de Bêta affichent « Aucune campagne ».

Non couvert : logout puis re-login, et la bascule répétée multi-sociétés.

Le blocage d'activation trouvé en recette a été corrigé : `SignInUpGlobalScopeFormEffect`
démarrait un second parcours de connexion concurrent, dont la redemption
faisait tourner la génération de session sous le `loadCurrentUser` en vol du
premier, et le rejet non géré s'affichait en « Authentification échouée ».
`assertAuthSessionUnchanged` n'a pas été touché et aucune rotation retirée.

## R02 — dashboard commun limité aux sociétés autorisées

**Exécuté.** Récapitulatif autorisé lu sur deux sociétés : Alpha 6/6/6/0,
Bêta 5/5/6/0. Aucun sélecteur par en-tête ; la page est en lecture seule et
l'ouverture d'une société passe par une connexion à cette société.

**Isolé.** Le serveur résout l'ensemble autorisé à chaque requête ; le client
n'envoie aucun périmètre. Une métrique rapportée mais non sommée est affichée
« non sommée » plutôt qu'en case vide, qui se lirait comme un zéro.

Non couvert : les rôles UI de membre restreint.

## R03 — base clients CRM

**Partiellement exécuté.** Les relations client et contact issues de la
qualification existent et sont relues. Le CRUD complet entreprise/contact,
avec validation e-mail et téléphone, n'a pas été recetté dans cette passe.

## R04 — pipeline commerciale

**Exécuté.** Opportunité créée à la main, déplacement New → Proposal, relations
société et contact provenant de la qualification, puis reload : nom, étape et
relations conservés. Aucun doublon automatique.

## R05 — classement des entrées

**Isolé.** Les reçus du pont Forms/Cal sont désormais listables et inspectables
avec leur identifiant canonique, et la classification est relue après une
qualification confirmée. Un reçu qu'aucune connexion candidate ne reproduit
reste listé comme non attribuable : jamais crédité à une connexion, jamais
jeté. Aucun flux fournisseur réel n'a été reçu.

## R06 — réception scraping Hermès

**Exécuté côté dépôt.** Une ligne B2B fictive saisie à la main dans l'UI de
prospection, qualification PASS, puis création d'un brouillon de campagne avec
son audience. Hermès externe absent.

## R07 — messagerie WhatsApp

**Isolé, et incomplet.** Un vrai vocal Opus était refusé à la réception et à la
finalisation : la comparaison portait sur la chaîne MIME paramétrée complète au
lieu de son essence, ce qui tuait tout le chemin vocal sur des octets réels.
Corrigé. Aucun fournisseur Evolution raccordé, donc **R07 n'est pas complet** et
ne doit pas être présenté comme tel.

## R08 — messagerie mail

**Isolé.** Aucune vraie boîte raccordée. Un défaut de classification a été
corrigé : une erreur GraphQL était rapportée comme un refus d'écriture alors que
le resolver commite la transaction puis attend six opérations non gardées, dont
un throw produit un `INTERNAL_SERVER_ERROR` **au-dessus d'un compte enregistré**.
Les refus sont désormais réservés aux codes prouvés avant écriture ; tout le
reste devient « écriture inconnue », sans réémission.

## R09 — bot Hermès relié MCP

**Isolé.** La surface d'outils MCP a enfin un consommateur : outils découverts,
accords, verdicts et refus du serveur. Les quatre pièges du contrat sont rendus —
un accord portant sur un outil jamais annoncé reste visible, `READY` n'est pas
une preuve qu'un outil fonctionne puisque aucun n'est appelé pendant la
découverte, une liste tronquée le dit, et `checkedAt` dit quand on a demandé.
**Aucun serveur MCP réel n'est connecté.**

## R10 — campagnes depuis sa boîte SMTP

**Partiellement exécuté, et non complet.**

Exécuté : création depuis la liste, brouillon, objet et corps TipTap réels avec
variable `{{fullName}}`, sauvegarde confirmée par l'UI, reload et réouverture.
Audience qualifiée affectée depuis le vrai Select, un destinataire résolu.

Deux défauts bloquants restent ouverts à l'heure de ce rapport :

1. **Les DTO de campagne refusent les identifiants du pont.** Douze validateurs
   `@IsUUID('4')` dans `emailing-domain/dtos`, quand le reste du serveur utilise
   `@IsUUID()` nu — 357 occurrences. Le pont frappe des UUID v5 déterministes,
   donc le serveur refuse son propre identifiant : `campaignId must be a UUID`.
2. **L'aperçu client est cassé.** `useHermesCampaignRuntime.ts:294` passait un
   document `query` à `useMutation`, qu'Apollo 4.2 refuse. Le commentaire au-dessus
   décrivait correctement l'intention.

L'étage SMTP d'intégration **n'a jamais dépassé son propre setup** : trois runs,
trois défauts de fixture successifs (entité workspace passée comme chaîne, rôle
nullable non gardé, token ambiant au lieu du token dynamique). Rien du parcours
campagne→SMTP n'est donc établi, dans un sens ni dans l'autre.

L'entrée Campagnes manquait dans le tiroir de navigation réel — la liste n'était
joignable que par une adresse tapée. Corrigée.

## R11 — ouvertures optionnelles et opposition durable

**Isolé.** Parcours mail et tracking réel non testé.

## R12 — Forms et Cal.diy

**Isolé.** Aucun service externe raccordé. Limite nommée : `bookingUid` n'est
jamais stocké sur un reçu, donc l'inspection d'une réservation dit que
l'enregistrement calendrier n'a jamais été demandé — explicitement pas qu'il
n'existe pas.

## R13 — réglages à un seul endroit

**Partiellement exécuté.** La création d'une société et son profil passent par
le vrai centre. Aucun test de connexion effectif vers un fournisseur réel.

## R14 — français et référence Pipedrive

**Exécuté, avec réserves nommées.** Recette française A/B faite. Trois résidus
anglais relevés en recette, et ils ne sont pas de même nature :

- « 1 minute ago » était un défaut de plomberie : huit appels de formatage
  relatif omettaient la locale de l'utilisateur. Corrigés, balayage exhaustif
  à zéro restant, aucune préférence stockée écrite.
- « System » est de la **donnée** — le sous-champ `name` du composite acteur,
  écrit en dur comme défaut de colonne et dans les prefills semés.
- « All Companies » est un **enregistrement de vue semé**, dont le gabarit
  traduisible existe déjà pour la vue INDEX ; ce site d'écriture contourne le
  mécanisme.

Rien n'a été migré sur les deux derniers : options et recommandation posées,
décision au propriétaire. Défaut plus large trouvé au passage : le frontend ne
lit jamais `DEFAULT_LOCALE` et retombe sur l'anglais en dur, donc un membre dont
la locale est nulle voit toute l'interface en anglais sur un déploiement
français.

## R15 — Web/PWA sur téléphone

**Non vérifié.** Installation réellement essayée, dégradation réseau et absence
de fuite entre sociétés après logout : aucun des trois n'a été exercé.

## R16 — lien utilisable et données conservées

**Partiellement exécuté.** Le partage Vercel s'ouvre sans compte Vercel
préalable, source exacte, cinq réponses 200 publiques prouvées. **L'accès Safari
du propriétaire n'est pas validé**, et une preview expirant dans l'heure n'est
pas un hébergement durable — les deux sont distincts et le second n'existe pas.

## Limites nommées, à ne pas lire comme des détails

- Les enums de surface d'outils MCP et les flux fournisseurs n'ont aucun
  consommateur réel : ce qui est rendu est ce que le serveur annonce.
- 86 msgid de source sont rédigés en français dans une locale source `en`,
  plus une trentaine ajoutés par un module qui suit sa propre convention : un
  utilisateur non francophone les verra en français.
- `onRetryObjections` n'est jamais passé. `HermesConnectionFlowProof` n'est
  jamais peuplé. L'emplacement EMAIL_SMTP n'a pas d'enregistrement central.
- `lastCheckedAt` dit quand on a demandé, pas que c'est encore vrai.
- Le `Select` du design system n'est pas pilotable sous jsdom : les tests
  vérifient le callback, pas le widget.
- Un spec frère de prospection était déjà rouge avant cette mission, pour une
  dépendance ESM que la config jest ne transforme pas. Non corrigé, non masqué.

## Ce que cette mission a surtout produit

Un même défaut est revenu une quinzaine de fois, sous les deux signes : une
surface qui affirme plus que sa preuve, ou moins. Une capacité déduite d'un
chemin ; un jeton de webhook ignoré ; une délégation déduite d'une liste de
blocages vide qui ne résout jamais le canal ; des droits appelants vérifiés
seulement avant les awaits ; un bouton de reprise sans identité derrière ; une
réponse perdue rapportée comme un refus ; une promesse résolue prise pour une
opération confirmée ; une restriction préproduction promise par une capacité qui
ne la garantit pas.

La règle qui en sort, et qui vaut plus que n'importe lequel des correctifs :
**lire chaque état depuis l'autorité qui va l'appliquer, ou le marquer inconnu.**

Son corollaire, payé trois fois en CI cette nuit : **un test vert ne prouve que
ce qu'il contient.** Les suites d'intégration frappaient des UUID v4, donc elles
ne voyaient pas le refus des v5. Les tests de l'écran de campagne mockaient le
hook, donc ils ne voyaient pas le mauvais hook Apollo à l'intérieur. L'énumération
des clés de navigation listait les six entrées existantes sans jamais exiger la
septième, donc elle ne voyait pas l'entrée absente.
