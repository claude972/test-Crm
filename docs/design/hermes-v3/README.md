# Hermès V3 — maquettes détaillées

Prototype statique en HTML, CSS et JavaScript, sans dépendance, sans build et sans réseau.
Mission `HERMES-V3-AUDIT-MAQUETTES-20261030`, phase 1. Ce dossier ne modifie ni `apps/`, ni la
maquette V2, ni les contrats.

**Ce que ce prototype démontre :** une interface, ses parcours, ses états et la manière dont les
règles produit se lisent à l'écran.

**Ce qu'il ne démontre pas :** aucune connexion à un fournisseur, aucune réception WhatsApp ou
e-mail réelle, aucune persistance, aucune campagne opérationnelle. Toute commande dépourvue d'API
existante porte une puce « simulé » à côté d'elle.

## Ouvrir

Ouvrir `index.html` : la page liste 34 routes directes, une par écran et par scénario. Chaque
route ouvre l'application dans l'état décrit, sans interaction préalable, ce qui permet de
capturer un écran sans le mettre en scène à la main.

L'application elle-même est `app.html`. Son état tient entièrement dans l'adresse :

| Paramètre | Valeurs |
|---|---|
| `ecran` | `dashboard`, `commune`, `wa`, `mail`, `receptions`, `pipeline`, `campagne`, `reglages` |
| `societe` | `atelier`, `verdure` |
| `fil` | identifiant de conversation ou de fil e-mail |
| `dossier` | `inbox`, `sent`, `drafts`, `archive`, `trash` |
| `onglet` | `societe`, `connexions`, `politiques` |
| `scenario` | `bascule`, `brouillon`, `enregistrement`, `preecoute`, `micro-refuse`, `media`, `media-refus`, `repondre`, `reponse-tous`, `transfert` |

Un serveur statique suffit (`python3 -m http.server`). Le prototype fonctionne aussi en `file://` :
`history.pushState` y est refusé, le routage bascule alors sur une navigation complète.

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | lanceur et routes de capture |
| `app.html` | coquille de l'application |
| `assets/app.js` | coquille, politiques du bot, WhatsApp, boîte e-mail, éditeur de réponse |
| `assets/app-crm.js` | tableau de bord, vue commune, réceptions, pipeline, campagne, réglages |
| `assets/donnees.js` | sociétés, politiques, médias, conversations, boîtes e-mail |
| `assets/donnees-crm.js` | contacts, oppositions, reçus, affaires, campagne, réglages |
| `assets/base.css` | jetons, coquille, états, accessibilité, mobile |
| `assets/messagerie.css` | conversation WhatsApp et boîte e-mail |
| `assets/crm.css` | pipeline, réceptions, campagne, réglages |

## Les trois modes du bot

L'interface n'affiche que des noms français. Les valeurs internes restent dans le code et dans ce
document.

| Affiché | Valeur interne | Effet |
|---|---|---|
| Automatique | `AUTO` | le bot peut répondre seul aux nouveaux messages |
| Assisté | `ASSISTED` | le bot prépare un brouillon, rien ne part sans clic humain |
| Arrêt complet | `OFF` | aucun brouillon ni appel au bot ; réception et réponse humaine conservées |
| Suivre la société | `INHERIT` | la conversation n'a pas de réglage propre |

Le mode d'une conversation est le **minimum restrictif** entre le réglage de la société pour ce
canal et le réglage de la conversation. Un réglage de conversation ne peut jamais élargir.

| Société | Suivre | Automatique | Assisté | Arrêt |
|---|---|---|---|---|
| Automatique | Automatique | Automatique | Assisté | Arrêt |
| Assisté | Assisté | refusé | Assisté | Arrêt |
| Arrêt | Arrêt | refusé | refusé | Arrêt |

Les douze combinaisons sont atteignables depuis l'interface : le sélecteur d'une conversation
applique réellement le changement en mémoire, et refuse visiblement un choix plus large que la
société. Changer de mode n'efface pas la réponse humaine déjà saisie : seule la suggestion du bot
est invalidée. Changer de conversation, de société ou revenir en arrière purge le contexte.

Un bot à l'arrêt n'est ni une opposition marketing, ni une déconnexion de canal : les trois sont
des écrans et des objets distincts.

## Écrans

**WhatsApp** — liste de conversations, fil à hauteur fixe dont les messages défilent et dont le
composeur reste visible. Bulles entrantes blanches, sortantes vert clair, heure et état dans la
bulle, séparateurs de jour, marque de non-lus. Images entrantes et sortantes, vidéo, message vocal
jouable, pièce jointe, et les cas où le média n'est pas disponible. Enregistrement vocal simulé :
demande, refus, enregistrement, préécoute, annulation, envoi. Média avant envoi avec aperçu et
refus de taille.

**Boîte e-mail** — dossiers Réception, Envoyés, Brouillons, Archives, Corbeille ; liste de fils
avec objet, participants et pièces jointes ; lecture avec À, Cc, Cci, citation repliée et pièces
jointes. Répondre, Répondre à tous et Transférer ouvrent un éditeur : les destinataires découlent
du choix, le transfert part sans destinataire et emporte des pièces jointes retirables, un
brouillon Hermès s'insère en mode Assisté. Chaque fil porte son propre réglage de bot.

**Réceptions** — six classements de reçus avec leur provenance, leur source, leur identifiant
externe et leur prochaine action. Quatre axes tenus séparés : réception technique, qualification de
la demande, étape de l'affaire, opposition marketing. Aucune réception ne crée d'affaire.

**Pipeline** — board par étape, cartes portant contact, montant, prochaine action, propriétaire et
provenance du reçu d'origine. Le changement d'étape est simulé et le dit. Une colonne montre que
l'issue gagné/perdu n'existe pas encore.

**Campagne** — identité d'expéditeur reliée à une boîte exacte, seconde identité du même domaine
mais non déléguée donc refusée, capacités annoncées comme calculées côté serveur, audience et
motifs d'exclusion, parcours aperçu / test synthétique / programmation / annulation, résultats qui
distinguent accepté, livré, répondu et observé, et où « inconnu » n'est pas « zéro ».

**Réglages** — centre unique : société, membres, connexions et réglages du bot par canal. Aucun
formulaire de secret ailleurs dans le produit. Aucun identifiant n'est saisi ni affiché.

**Tableau de bord et vue commune** — compteurs dérivés des mêmes données que les écrans de détail.
La vue commune est en lecture seule et n'expose aucun contenu d'une autre société.

## Correspondance avec les valeurs internes

Déplacées hors du parcours normal à la demande de la revue ; elles restent accessibles dans un
détail replié sur le board et ici.

| Affiché | Valeur native Opportunity |
|---|---|
| Nouveau | `NEW` |
| Qualification | `SCREENING` |
| Rendez-vous | `MEETING` |
| Proposition | `PROPOSAL` |
| Client | `CUSTOMER` |
| Issue de l'affaire | aucune valeur existante |

`CUSTOMER` n'est pas « gagné ». Une issue explicite devra être ajoutée par métadonnées natives sans
renommer ni casser les cinq valeurs existantes.

Vocabulaire repris des contrats proposés : `MediaKind` IMAGE / VIDEO / VOICE / FILE,
`MediaState` PENDING_FETCH / UPLOADING / PROCESSING / READY / FAILED / QUARANTINED / EXPIRED,
`MailFolderRole` INBOX / SENT / DRAFTS / ARCHIVE / TRASH, `ReceiptSource` FORM / WHATSAPP / EMAIL /
SCRAPING, `ReceiptClassification` et `QualificationStatus`, états d'identité d'expéditeur
UNVERIFIED / VERIFIED / REVOKED, et preuves de résultat SMTP_ACCEPTED / PROVIDER_DELIVERED /
REPLY_OBSERVED / OPEN_OBSERVED.

## Capacités : ce qui existe et ce qui n'existe pas

Classement repris de l'audit de phase 0 (`095582346e227d627437560c66445e9a9211bcb9`), source
applicative lue en `333ba534927e177c90b35eb4157d75d8d767dec4`.

| Fonction montrée | État réel | Appui |
|---|---|---|
| Conversations et messages texte WhatsApp | **codé** | `hermesInboxConversations`, `hermesInboxMessages`, `hermesInboxReply` |
| Brouillon du bot | **codé partiellement** | `hermesInboxDraftReply` existe ; la politique société/canal et le mode Arrêt complet sont à créer |
| Modes Automatique / Assisté / Arrêt complet | **proposé** | le schéma actuel ne connaît que `MANUAL` et `AUTO` par conversation |
| Images, vidéos, vocaux WhatsApp | **proposé** | routes fournisseur documentées, aucune API Hermès de média |
| Enregistrement vocal navigateur | **simulé** | aucun micro n'est ouvert, aucune permission demandée |
| Dossiers, HTML et pièces jointes e-mail | **proposé** | le chemin actuel extrait du texte et répond en texte |
| Éditeur Répondre / Répondre à tous / Transférer | **simulé** | aucune composition serveur, aucune émission |
| Réceptions, classement et qualification | **codé partiellement** | staging et qualification existent ; le classement multicanal commun est à créer |
| Étapes du pipeline | **codé** | valeurs natives existantes ; les transitions ne sont pas testées |
| Issue gagné/perdu | **manquant** | aucune valeur native |
| Campagne : aperçu, test, programmation | **codé** | moteur natif sous ses propres gardes |
| Campagne : lien vers la boîte exacte | **proposé** | le pilote valide le domaine, pas la boîte déléguée |
| Connexions Evolution, IMAP, SMTP, MCP, collectes, HeyForm, Cal.diy | **non configuré / non vérifié** | aucun accès de recette établi |

Les cinq états de connexion portent les libellés exacts du contrat : « Non configuré »,
« Configuré, à vérifier », « Connecté, vérifié le … », « Connexion en erreur », « Connexion
désactivée ». « Configuré » n'est pas « connecté » ; « désactivée » est une décision
d'administrateur.

## Médias et licences

| Fichier | Origine | Licence |
|---|---|---|
| `assets/polices/Geist-Variable.woff2` | police Geist, reprise de la maquette V2 | SIL Open Font License 1.1, texte dans `assets/polices/Geist-LICENSE.txt` |
| `assets/medias/demo-video-flower.mp4` | vidéo « flower » du dépôt officiel MDN `mdn/interactive-examples`, `live-examples/media/cc0-videos/flower.mp4` | CC0 1.0 Universal, texte dans `assets/medias/LICENSE-MDN-CC0.txt` |
| `assets/medias/vocal-cliente.m4a`, `vocal-reponse.m4a` | synthèse vocale locale `say` puis `afconvert`, phrases fictives écrites pour la maquette | produites ici, aucune voix réelle enregistrée |
| `assets/medias/photo-vitrine.svg`, `photo-plan-pose.svg` | illustrations vectorielles écrites à la main dans ce dépôt | produites ici |

Attribution de la vidéo : « Vidéo *flower* — MDN interactive-examples, CC0 1.0 ». Somme de
contrôle vérifiée après copie : `0cd83d944a6ca7822b4a8306cecc60a36e859b041f6702c6a1ad9ead78924451`.
La vidéo illustre un média de conversation ; elle ne provient d'aucun échange WhatsApp.

## États couverts

Chargement implicite, vide, erreur, non configuré, désactivé, refus de droits, contexte média en
traitement, média indisponible, lien expiré, brouillon invalidé, résultat de transport incertain,
succès d'acceptation. L'acceptation n'est jamais présentée comme une livraison.

## Accessibilité

Chaque champ a un libellé associé. Les boutons d'icône portent un `aria-label` qui change avec
l'état. Le focus est visible. L'état n'est jamais porté par la seule couleur : un texte l'accompagne
toujours. L'enregistrement en cours est annoncé dans une région `status`. `prefers-reduced-motion`
est respecté. En 390 px les grilles passent sur une colonne et les tableaux deviennent des blocs
étiquetés, sans défilement horizontal de page. Les lecteurs n'ont pas d'autoplay, signalent une
erreur de lecture et sont arrêtés à chaque changement d'écran.

## Hypothèse de travail

La direction visuelle reprend la piste A de la V2 — colonnes calmes, densité, accent unique — comme
**hypothèse réversible**. Aucune piste n'a été validée par l'utilisateur et ce prototype ne vaut pas
validation graphique. L'accent vert et les bulles sortantes vert très clair ont été arbitrés en
cours de mission. L'aspect WhatsApp vient de la grammaire de la conversation, jamais d'un logo,
d'une palette ou d'une ressource de marque.

Référence de structure : Pipedrive. Jetons repris de `DESIGN.md` : grille de 8 px, Geist, surfaces
`#FAFAFA` et `#0A0A0A`, bordures de 1 px, un seul accent, aucune ombre lourde, aucune police Inter,
Poppins, Roboto ou system-ui, aucun dégradé violet.

## Contrôles réellement exécutés

- `node --check` sur les quatre fichiers JavaScript, à chaque modification. Tous passent.
- Vérification par script des liens entre fixtures : chaque `mediaId` cité existe, chaque contact
  cité existe, chaque affaire référencée par un reçu existe et réciproquement, chaque fil e-mail
  listé a un contenu.
- Vérification des compteurs : les quatre affaires d'Atelier Fontaine du board, du tableau de bord
  et de la vue commune proviennent du même calcul.
- Vérification des cinq états de connexion rendus, sur les deux sociétés.
- Recherche des interdits dans le JavaScript : aucun `getUserMedia`, `mediaDevices`,
  `MediaRecorder`, `fetch`, `XMLHttpRequest`, ni stockage navigateur. La seule occurrence du mot
  `getUserMedia` est le commentaire d'en-tête qui rappelle l'interdiction.
- Service statique local sur `127.0.0.1:8787` : `index.html`, `app.html`, la police, la vidéo et un
  vocal répondent en 200.
- Relecture déléguée à un agent en lecture seule sur l'ensemble des fichiers.

## Contrôles non exécutés

- **Aucune vérification visuelle en navigateur par l'auteur de ces fichiers** : l'extension de
  pilotage n'était pas connectée. Les captures, la vérification de rendu et la preview restent à la
  charge de root.
- Aucun test de rendu Safari, Chrome ou PWA, aucune mesure de contraste automatisée, aucun audit
  d'accessibilité outillé.
- Aucun test applicatif, aucune base de données, aucun fournisseur, aucun envoi.

## Limites

Une maquette statique ne prouve ni lecture de média réelle, ni connexion, ni persistance de
pipeline, ni campagne opérationnelle. Les limites de taille et de format des médias restent à fixer
une fois la version du fournisseur vérifiée. L'identité exacte de boîte pour une campagne n'est pas
garantie par le pilote actuel. Les noms d'opérations cités dans les contrats sont des propositions :
aucune n'est appelée ici.

Référence des contrats proposés : `8c4460fd874ec8d2ab17ffcdd757c7cc98dcca2f` sur
`feat/codex-hermes-v2-core`.
