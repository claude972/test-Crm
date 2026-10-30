# Hermès CRM — maquettes V2

Prototype **statique** : HTML, CSS et JavaScript simple, aucune dépendance, aucun
appel réseau, aucune API. Ouvrir `index.html` suffit, y compris hors ligne.

Ces écrans **ne sont connectés à rien**. Un bandeau « Maquette » reste visible sur
chaque écran, chaque piste et chaque largeur. L'état des interrupteurs vit en
mémoire et repart à zéro au rechargement, pour qu'une capture ne puisse jamais
passer pour une configuration réelle.

## Servir

Les fichiers s'ouvrent directement (`file://`), mais un serveur statique évite
toute surprise de chemin relatif :

```
cd docs/design/hermes-v2
python3 -m http.server 8768
# puis http://127.0.0.1:8768/
```

## Les trois pistes

Même contenu, mêmes données, **trois organisations différentes**. Ce qui change
est la hiérarchie — ce qu'on lit en premier — et non la seule couleur.

| Piste | Ce qui ouvre l'écran | Pour qui |
|---|---|---|
| **A — Colonnes calmes** | Le pipeline, en pleine largeur. Les indicateurs deviennent du contexte sous lui. | Un responsable qui regarde d'abord **où en sont** les affaires. |
| **B — Suivi quotidien** | Les affaires et leur **prochaine action**, retards marqués. Le pipeline se réduit à un bandeau. | Celui qui ouvre le CRM pour savoir **quoi faire aujourd'hui**. |
| **C — Dense et tabulaire** | La **synthèse des sociétés**, puis la société ouverte. Chiffres alignés, densité assumée. | Un gérant qui compare **plusieurs sociétés** avant d'entrer dans l'une. |

L'accent diffère aussi, mais il suit la hiérarchie : vert sur A, encre sur B où
la couleur sert l'urgence, ardoise sur C où elle ne porte aucun statut.

## Capturer les écrans

L'URL porte tout l'état, donc une capture se rejoue à l'identique :

```
app.html?variante=a|b|c&ecran=dashboard|prospection|messagerie|reglages&societe=atelier|verdure|commune[&vue=mobile]
```

`index.html` liste tous les liens, dont les variantes mobile. Les douze écrans
demandés sont les trois pistes × quatre modules ; la vue commune et le mobile
390 px s'y ajoutent.

Pour le mobile, régler la fenêtre sur **390 px** de large : la bascule est faite
par media query, le paramètre `vue=mobile` sert seulement à retrouver le lien.

## Ce que les maquettes cherchent à montrer

**Cloisonnement.** Une société dont l'utilisateur n'est pas membre n'apparaît
nulle part : ni au sélecteur, ni dans la vue commune. Le cloisonnement se voit
d'abord à ce qui est **absent**. La vue commune est en lecture seule et le dit.

**Un seul centre de réglages.** Mon compte, Mes sociétés, puis Général,
Membres, Connexions, Bots et Prospection de la société ouverte. Les modules
affichent un état et renvoient ici ; ils ne proposent jamais de formulaire de
connexion ni d'interrupteur.

**Deux bots indépendants, et un vrai refus.** Les interrupteurs WhatsApp et
e-mail sont séparés et propres à chaque société. Surtout, **un bot ne s'allume
pas parce qu'on le demande** : il exige ses connexions vérifiées.

Les deux sociétés montrent les deux moitiés de la règle :

- **Atelier Fontaine** est un **scénario de démonstration**. Ses vérifications
  sont *simulées* — l'écran le dit en toutes lettres — pour que le bot WhatsApp
  parte actif. On peut donc le couper, voir la reprise en main dans un fil, et
  allumer ou couper le bot e-mail séparément dans la même société.
- **Verdure & Associés** garde ses prérequis manquants : les deux interrupteurs
  sont indisponibles, pour des raisons **différentes** — WhatsApp manque son
  canal et le serveur MCP, l'e-mail manque son envoi SMTP et le MCP. L'écran
  nomme ce qui manque plutôt que de proposer une activation fictive.

**Couper un bot ne coupe pas le canal.** La réception et les réponses humaines
restent possibles, et la messagerie le répète là où la question se pose.

**Reprise en main.** Dans un fil, « Reprendre la main » est une action d'arrêt
immédiate, pas un réglage : elle coupe ici et renvoie aux Réglages pour la
suite. Elle n'apparaît que lorsque le bot du canal est actif — donc sur
Atelier Fontaine, côté WhatsApp.

**États honnêtes.** « Déclaré, non vérifié » n'est pas « connecté » : seul un
état daté affirme une connexion. Une valeur non mesurable s'écrit « Non
mesurable » et jamais zéro. Une opposition reste visible, ne se lève pas, et un
refus de suivi n'est pas un refus d'être contacté.

**Aucune promesse d'envoi.** Les campagnes restent des brouillons et l'écran
écrit que l'envoi dépend d'un moteur et d'un plan qui ne sont pas vérifiés.

## Contrôles illustratifs

Ce qui réagit, pour montrer le parcours :

- le sélecteur de société et la vue commune ;
- la navigation entre les quatre modules, et la barre basse en mobile ;
- les onglets WhatsApp / E-mail et le choix d'une conversation ;
- « Reprendre la main » dans un fil ;
- les interrupteurs de bots **sur Atelier Fontaine**, dont les prérequis sont
  simulés comme réunis ; sur Verdure & Associés ils restent volontairement
  indisponibles et expliquent pourquoi.

Ce qui ne réagit pas, et porte une infobulle le disant : « Envoyer »,
« Proposer un brouillon », « Ajouter une société ». Ces boutons existent pour
montrer leur place, pas pour simuler un effet.

## Accessibilité et rendu

Grille de 8 px, bordures de 1 px, un seul accent par piste. Aucun statut ne
repose sur la couleur seule : chaque pastille porte son mot, le sens d'un
message est écrit, l'élément de navigation actif porte `aria-current` et les
interrupteurs sont des `role="switch"` avec `aria-checked`. Les tables passent
en blocs lisibles sous 760 px, chaque cellule reprenant son en-tête — une table
qui déborde ne se lit pas. `prefers-reduced-motion` est respecté.

## Police

Geist, servie **localement** depuis `assets/polices/`, sous licence SIL Open
Font 1.1 — le texte de la licence est à côté du fichier. Un seul fichier
variable couvre toutes les graisses et aucune requête externe n'est émise. Si le
fichier manque, le repli reste lisible.

## Données

`assets/donnees.js` est la seule source. Tout y est fictif : aucune société,
personne, adresse ou référence ne désigne une entité réelle. Les adresses
utilisent des domaines en `exemple-…` et les numéros sont masqués.

## Limites assumées

- Rien n'est persistant : recharger remet l'état initial.
- Aucun parcours de création de société n'est simulé ; le bouton existe, inerte.
- Les montants et dates sont des valeurs d'illustration cohérentes entre elles,
  pas des projections.
- Le rendu n'a pas été vérifié dans un navigateur par l'auteur de ces fichiers :
  les captures font foi.
