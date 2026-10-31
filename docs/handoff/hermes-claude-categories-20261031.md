# Catégories Claude — livraisons par SHA, 31 octobre 2026

Mission HERMES-CATEGORY-RECOVERY-20261031. Parent Claude `8f3db32e`.
Trois catégories, un enfant propriétaire chacune, aucun doublon.

Ce document est publié à part de CORRECTIONS.md pour ne pas entrer en conflit
avec les écritures concurrentes de root. À déplacer dans CORRECTIONS.md par root
s'il le préfère inline.

## Identification des enfants

L'identité durable d'un enfant est son arbre et sa branche, pas un handle de
session. C'est ce qui porte les SHA et ce qui reste vérifiable après la fin de
l'agent.

| Catégorie | Arbre | Branche | Base |
|---|---|---|---|
| CAT-UI-MAIL | `/private/tmp/hermes-cj01-slice4` | `feat/claude-hermes-recovery-ui` | `5ece4c0fd` |
| CAT-I18N-PIPELINE | `/private/tmp/hermes-cjr14` | `feat/claude-hermes-rc-i18n-stages` | `5ece4c0fd` |
| CAT-UI-WA | `/private/tmp/hermes-rc-wa` | `feat/claude-hermes-rc-wa-ui` | `8fbd0773b` |

Checkpoint parent assemblé : `feat/claude-hermes-recovery-frontend` à `9d886b2f5`,
publié sur origin. Il ne contient que les deux premiers commits de CAT-UI-MAIL et
le commit de test de CAT-I18N-PIPELINE ; les livraisons plus récentes ci-dessous
ne sont pas encore assemblées.

## CAT-UI-MAIL — `feat/claude-hermes-recovery-ui`

| SHA | Objet | État |
|---|---|---|
| `fbaaf1cda` | monter le panneau de création de boîte dans le centre | assemblé, 32/32 verts |
| `ee7d6577d` | réunir l'expéditeur de campagne dans le centre | assemblé, 32/32 verts |
| `9f144a7c3` | retirer l'import mort signalé en revue | **assemblé** |
| `890dd295d` | enregistrer et vérifier le domaine de campagne natif | **assemblé**, ready_for_review |
| `070f0c07b` | exiger IMAP et SMTP, comme la liaison centrale l'exige | **assemblé**, ready_for_review |

42/42 verts sur quatre suites à l'assemblage, sept preuves négatives au total.

**Domaine natif, et pourquoi ce n'est pas le flux EMAIL_GROUP.** `createEmailingDomain`
n'avait **aucun document généré** : il est écrit à la main, selon le précédent du
dépôt. Le domaine **n'est pas une saisie** : il est dérivé de l'adresse de la boîte
enregistrée par la fonction native, et le panneau n'offre qu'un bouton. Un champ
libre serait précisément la façon d'enregistrer un domaine depuis lequel la société
n'envoie pas ; une preuve négative tient cette ligne. Les composants natifs de
vérification et d'enregistrements DNS sont réutilisés et non réécrits, et les
enregistrements DNS ne s'affichent que si le serveur en a publié — donc une société
autorisée par sa propre boîte ne se voit jamais réclamer des entrées inutiles.

Le bouton de vérification native est conservé tel quel : le re-cliquer est une
**relecture du verdict serveur**, pas une réémission d'écriture. L'écriture à risque
de doublon est la création, et c'est là que vivent les quatre états ; sur issue
inconnue le bouton d'enregistrement est **retiré** et seule la relecture est offerte.

**Contrat IMAP+SMTP : validation avant soumission, pas de faux canal.** Rien n'est
créé, synthétisé ni impliqué ; l'exigence est énoncée comme celle du serveur, avec
le protocole manquant nommé et la raison — la liaison centrale ne s'enregistre que
sur une boîte qui fait les deux, et c'est la réception qui fait créer le canal natif
dont l'expéditeur de campagne est résolu. La requête ne part simplement pas.

**Changement de comportement à relever en revue** : la règle du panneau a changé.
15 des 18 tests existants renseignaient IMAP seul et attendaient un enregistrement
réussi ; ils renseignent désormais les deux protocoles. Une assertion encodait
l'ancienne forme permissive et a dû changer — la garantie « rien n'est inventé
depuis des défauts » est désormais portée par CALDAV, le protocole réellement
optionnel. Le garde préexistant sur zéro protocole est conservé bien que devenu
inatteignable, pour ne retirer aucun contrôle.

**Tension de copie native signalée, non touchée** : le formulaire natif de connexion
dit « Configure SMTP settings … Leave blank if you don't need to send emails », ce
qui est correct pour un compte natif ordinaire et contredit désormais la note
d'exigence affichée un bloc plus bas dans le centre. Hors périmètre du lot.

Constats établis par ce lot, avec preuve :

- **L'expéditeur de campagne ne dépend d'aucune mutation de recette.** L'écriture
  passe par la mutation d'objet générée (`updateMessageCampaign` sur `fromAddress`).
  Il n'existe ni `setCampaignSender`, ni `assignSender`, ni `bindMailboxToCampaign`,
  et le code de fixture ne déclare aucune opération GraphQL.
- **Le défaut réel était un cran avant** : `HermesAdminRuntimePage` rendait
  `HermesAdminRuntimeSettings` sans `mailboxSetupSlot`, et personne ne remplissait
  ce slot hors tests. `hermes-mailbox-setup` était construit, testé, et monté
  nulle part : un opérateur pouvait choisir un compte natif existant mais pas en
  créer un. Preuve négative en remettant le slot à `undefined` : le bouton
  « Connecter une boîte » devient introuvable.

Reste ouvert et non corrigé : le contrat IMAP+SMTP (voir ci-dessous).

## CAT-I18N-PIPELINE — `feat/claude-hermes-rc-i18n-stages`

| SHA | Objet | État |
|---|---|---|
| `f64c974c1` | garantir que les libellés d'options standard atteignent le catalogue | assemblé, **test seul** |
| `d13ac13ea` | ne pas enregistrer une traduction d'option renvoyée comme un renommage | **assemblé**, ready_for_review |
| `6ff4f4667` | traduire au runtime les libellés d'options du modèle standard | **assemblé**, ready_for_review |

**Mise à jour : les étapes sont traduites au runtime, serveur seul, sans codegen.**
Assemblé à `521f4b4d6`. 139/139 verts sur 24 suites à l'assemblage.

Ordre délibéré : le garde d'écriture **précède** la traduction, donc la branche
n'est jamais à un commit où la traduction expédie sans protection.

Aucun fichier front, aucun `src/locales/**`, aucun `fr-FR.po`, **aucune propriété
de DTO, aucun codegen, aucune migration, aucun nouveau msgid**. `options` est un
champ GraphQL existant : la forme du schéma est inchangée, et c'est précisément
pourquoi aucun codegen n'est nécessaire.

Deux points vérifiés par le parent dans le source :

- **Lecture** : `resolveEffectiveTranslatedFlatEntity` résout désormais `options`
  avant la réduction scalaire existante, en déléguant à
  `resolveEffectiveTranslatedOptions`, qui appelle `translateStandardLabel` avec le
  contexte `fieldMetadata.label` — **le même contexte que le site d'écriture**, ce
  qui explique que les msgid résolvent déjà. Seul `label` est résolu ; `id`,
  `value`, `position` et `color` passent tels quels. Un manque au catalogue renvoie
  la chaîne stockée inchangée.
- **Écriture** : le garde est posé sur l'**autorité**, dans
  `sanitizeRawUpdateFieldInput`, et non sur le formulaire — donc il protège *tous*
  les clients, formulaire, mode groupé, onglet périmé, API, script. Il est restreint
  aux champs standard et il est **sans locale** : un libellé candidat compte comme
  écho s'il correspond à la traduction livrée du libellé stocké dans **n'importe
  laquelle** des 35 locales compilées, ce qu'un garde franco-seul n'aurait pas fait.

Correction apportée à la route proposée par le parent : la ruse du formulaire « À
propos » ne transposait pas, parce que ses champs sont des scalaires séparés qu'on
peut omettre, alors que `options` est **un seul champ tableau** remplacé en bloc.
Dès qu'une seule option est touchée, ne serait-ce que sa couleur, le tableau entier
part — libellés traduits compris. La route formulaire était donc la route DTO +
codegen déguisée. D'où le garde côté autorité.

Deux mécanismes indépendants distinguent maintenant un libellé personnalisé : à la
lecture, l'aller-retour catalogue rend inchangé ce qu'il ne connaît pas ; à
l'écriture, le test d'écho stocke verbatim un vrai renommage.

Quatre preuves négatives exécutées, dont celle demandée nommément : garde rendu
trop zélé, et les trois tests de renommage réel rougissent.

**État historique conservé pour mémoire :** `f64c974c1` est un test de
catalogue et ne le démontre pas ; root l'a dit et c'est exact. Ce qui est établi :

- `fieldMetadata` n'a que `['label','description']` comme propriétés traduisibles.
  `options` n'y figure pas, et sa configuration ne porte aucun `isOverridable`.
- Le formulaire de select réécrit le **tableau d'options entier**. Traduire à la
  lecture gèlerait donc un libellé français dans les options stockées pour les
  36 langues dès qu'un administrateur enregistre, même pour changer une couleur.
- Aucun canal d'override n'existe pour `options`, aucun marqueur de provenance,
  et `translations: [{property:'options'}]` est explicitement rejeté. Un libellé
  personnalisé ne peut donc pas être distingué d'un libellé standard au moment de
  la lecture. Aucune heuristique n'a été livrée.
- Aucun msgid ne manque : les six existent et sont traduits, vérifiés aussi en
  de-DE, es-ES et ja-JP. 83 libellés d'options standard sont concernés, pas 5.

`d13ac13ea` attaque la cause d'écriture plutôt que le symptôme. Il n'est pas relu.

## CAT-UI-WA — `feat/claude-hermes-rc-wa-ui`

| SHA | Objet | État |
|---|---|---|
| `10dada84b` | juger l'éligibilité à la délégation AUTO depuis l'autorité MCP | poussé, non assemblé, non relu |
| `b48ff0074` | ouvrir un chemin humain explicite vers AUTO par conversation | poussé, non assemblé, non relu |

Autorité d'éligibilité, vérifiée par le parent dans le source :

- **Permission de l'appelant à accorder AUTO : aucune autorité n'existe.** Le seul
  contrôle est une porte tout-ou-rien, `assertAllowed`, qui lève
  `ForbiddenException('MESSAGING_REQUIRES_UNRESTRICTED_WORKSPACE_ADMIN')` et garde
  chaque opération du module. Conséquence énoncée plutôt que masquée : tout appelant
  qui peut lire la politique peut déjà accorder AUTO. Le lot ne rend donc **rien**
  sur la permission de l'appelant, au lieu d'inventer un indicateur par grant.
- **Configuration MCP : autorité réelle, et c'est elle qui garde le contrôle.**
  Requête `hermesMcpToolSurface`, sans argument, périmètre workspace pris de la
  session. Éligibilité lue sur deux positifs explicites de l'outil de rédaction,
  `authorized === true` **et** `callable === true`. La liste `refusals` n'est jamais
  lue : une liste vide avec `authorized: null` donne inconnu, pas un grant. Une
  absence d'outil ne vaut absence que si `truncated === false`.
- `canAutoReply` **n'est pas** un signal d'éligibilité et n'a pas été utilisé comme
  tel : le serveur ne le met à vrai qu'une fois AUTO déjà actif, donc s'en servir
  pour offrir AUTO serait circulaire. Et `canDraft` vaut presque `effectiveMode !== 'OFF'`,
  puisque le bot du registre est enregistré inconditionnellement au démarrage ; il ne
  prouve rien sur un serveur MCP configuré.

Second défaut trouvé et corrigé, atteignable sans que personne demande AUTO, et
vérifié par le parent dans le source : la vérification de délégation porte sur le
mode **effectif** — `result.effectiveMode === 'AUTO' && input.delegateAuto !== true`
lève `BOT_DELEGATION_REQUIRED` — et `localMode === 'INHERIT' ? 'AUTO' : localMode`
fait qu'INHERIT contribue AUTO à la résolution. Donc dans une société réglée sur
AUTO, presser « Suivre la société » était refusé et affiché comme un échec
technique, sans issue. La délégation n'est **pas** envoyée pour INHERIT ; le refus
est expliqué et renvoie vers le choix explicite d'AUTO. Cause racine : ces refus
sont des `ConflictException`, donc `extensions.code === 'CONFLICT'`, que le lecteur
d'échec ne reconnaissait pas puisqu'il ne traitait que `FORBIDDEN`.

Tests : 27/27 sur les deux suites du lot, et 17/17 de régression sur les deux portes
d'entrée — la porte mail reste fonctionnelle. Quatre preuves négatives exécutées,
dont l'inférence du grant depuis `refusals.length` et le relâchement du garde
`truncated`, chacune faisant rougir exactement le test nommé.

Constat de l'audit tenancy, vérifié dans le source : le tableau `offered` de
`MessagingInboxBotModeControl.tsx` liste `INHERIT`, `ASSISTED` et `OFF` —
**`AUTO` n'y figure pas**, donc aucun humain ne peut le choisir. Le commentaire
au-dessus l'admet. Le hook envoie déjà `delegateAuto: true` uniquement pour
`mode === 'AUTO'`. Le mécanisme existe, le chemin humain non.

Fichiers partagés arbitrés par le parent : `readMessagingInboxPayload.ts` accordé
sans réserve (aucun consommateur hors périmètre) ; `types/MessagingInboxBotPolicy.ts`
et `hooks/useMessagingInboxBotMode.ts` accordés avec condition, car le **mail** les
consomme aussi — un changement doit laisser le contrôle du fil mail fonctionnel et
couvert par un test.

## Défauts restants, à ne pas lire comme des détails

1. **IMAP+SMTP.** Une boîte créée en SMTP seul ne crée aucun canal de message, et
   le backend lève alors `MESSAGE_CHANNEL_NOT_FOUND` au départ de la campagne. Le
   refus est honnête ; le panneau laisse atteindre cet état et la raison n'est pas
   actionnable là où elle arrive. En cours dans CAT-UI-MAIL, sans faux canal et
   sans garde assoupli.
2. **Étapes du pipeline en anglais au runtime.** Non corrigé.
3. **Aucun fournisseur réel connecté.** Evolution absent, aucun MCP connecté,
   aucun lien de preview valide. Tout parcours livré ici est câblé et non exercé.
4. **Types non vérifiés localement.** Gros builds interdits, swc jette les types :
   aucune de ces livraisons n'a de preuve de typage. La CI cloud est l'autorité.

## Règle de livraison appliquée depuis la remarque de root

Un commit local n'est pas une livraison. Les trois branches avaient des commits
non poussés à 15:06 UTC — `890dd295d` notamment — et sont désormais publiées. Les
enfants poussent à chaque commit et ne gardent plus rien pour un rapport final.
