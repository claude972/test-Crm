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
| `9f144a7c3` | retirer l'import mort signalé en revue | poussé, non assemblé |
| `890dd295d` | enregistrer et vérifier le domaine de campagne natif | poussé, non assemblé, non relu |

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
| `d13ac13ea` | ne pas enregistrer une traduction d'option renvoyée comme un renommage | poussé, non assemblé, non relu |

**Les étapes ne sont pas traduites au runtime.** `f64c974c1` est un test de
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
