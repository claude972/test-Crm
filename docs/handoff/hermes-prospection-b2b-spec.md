# Hermès — base clients, réception du scraping et campagnes B2B

## Demande et décisions confirmées

Créer une base clients CRM complète, un espace de réception des collectes Hermès et des campagnes e-mail avec suivi facultatif des ouvertures et gestion durable des désinscriptions. Public confirmé : **professionnels uniquement (B2B)**. Référence visuelle Monday, web/PWA, sociétés cloisonnées et dashboard commun limité aux sociétés autorisées sont conservés.

Cette mission est un cadrage fonctionnel à implémenter. Elle ne lance ni collecte ni campagne vers de vrais destinataires.

## 1. Base clients CRM

Réutiliser les objets clients existants plutôt que créer un second carnet d'adresses. Distinguer société exploitante, entreprise cliente et interlocuteurs professionnels. Prévoir :

- entreprise : raison sociale, identifiants professionnels pertinents si disponibles, secteur, site, coordonnées et adresse professionnelle ;
- interlocuteur : nom/prénom, fonction, entreprise associée, coordonnées professionnelles et préférences de contact ;
- suivi : prospect à qualifier/qualifié/client/inactif, commercial responsable, tags, notes, tâches, prochaines actions et opportunités ;
- provenance : collecte Hermès, import, Forms ou saisie ; URL/source, date de collecte, date de mise à jour et justificatifs de réutilisation ;
- chronologie : WhatsApp/e-mails, réponses Forms, rendez-vous Cal.diy, campagnes et actions Hermès effectivement reçus ;
- marketing : éligibilité à la prospection, raisons et preuves, opposition, autorisation de suivi distincte, dates et périmètre.

Les statuts CRM, la validité d'une adresse, l'éligibilité à prospecter et l'accord au suivi d'ouverture sont des dimensions distinctes. Un contact créé ou importé n'est pas automatiquement éligible à une campagne. Les champs manquants restent identifiés ; aucun enrichissement n'invente une donnée.

## 2. Espace « Collectes Hermès »

Recevoir les résultats du scraping Hermès par une interface serveur authentifiée et un import CSV/JSON, selon les capacités réelles du service à auditer. Cette mission porte sur la réception des résultats ; elle ne crée pas un crawler généraliste ou un contournement de restrictions d'accès.

Afficher les lots, leur provenance, la société destinataire et les lignes reçues. États proposés : reçu, à vérifier, doublon/conflit, validé/importé, rejeté, erreur. Fournir prévisualisation, mapping des champs, validation des formats et rapport des erreurs. Prévoir sélection des lignes et validation en lot ; les conflits restent visibles et les modifications manuelles vérifiées sont préservées.

Rapprocher dans la société destinataire sans fusion ambiguë. Rejouer un job ou réimporter le même fichier ne crée pas de doublons et ne réactive pas une opposition. Conserver la provenance des champs et une trace des décisions ; éviter de conserver indéfiniment les données brutes inutiles. Ne pas inférer la qualité professionnelle ou la possibilité de prospecter à partir du seul domaine d'une adresse e-mail.

Les données accessibles publiquement restent soumises aux règles de réutilisation, d'information et d'opposition : leur présence sur Internet n'accorde pas une autorisation générale de prospection. [CNIL — réutilisation des données publiques](https://www.cnil.fr/fr/reutilisation-de-vos-donnees-publiees-sur-internet-des-fins-commerciales-quels-sont-vos-droits).

## 3. Campagnes e-mail par société

Créer une campagne avec société expéditrice, compte SMTP autorisé, nom, objet, version HTML et texte, modèle et personnalisation maîtrisée (prénom, entreprise, commercial, etc.). Une valeur de remplacement est prévue pour les champs absents. Prévoir aperçu, test à un destinataire de recette autorisé, audience segmentée, exclusions expliquées, planification, lancement explicite, pause et annulation des envois restants.

Chaque destinataire reçoit un envoi individuel ; ne pas exposer une liste d'adresses en copie. Réutiliser le transport et la queue existants si adaptés ; prévoir limitation du débit, quota configurable, anti-doublon et traitement des erreurs. Vérifier la configuration de l'expéditeur et du domaine avant le lancement. Une acceptation SMTP n'est pas une preuve de remise en boîte de réception : n'afficher une livraison confirmée que si une source fiable la confirme.

Recalculer l'éligibilité et les exclusions lors de la préparation puis juste avant l'expédition. Bloquer les désinscrits, adresses invalides ou bloquées, contacts non qualifiés pour cette prospection, doublons d'adresse dans la campagne et envois déjà traités. Une reprise après incident ne doit pas réémettre aveuglément un message au résultat incertain.

Dans l'hypothèse d'une prospection France/UE, vérifier information, possibilité d'opposition et pertinence de la sollicitation pour l'activité professionnelle ; distinguer adresses nominatives et génériques et consigner la justification applicable. La seule mention B2B ne rend pas n'importe quelle collecte/campagne licite. [CNIL — prospection électronique, partie professionnels](https://www.cnil.fr/fr/la-prospection-commerciale-par-courrier-electronique-sms-mms-et-automate-dappel).

## 4. Ouvertures : option distincte de l'envoi

Prévoir « suivi désactivé » et « suivi activé pour les destinataires autorisés ». L'option est désactivée par défaut en l'absence d'une autorisation documentée ou d'une exemption précisément établie pour la finalité. L'éligibilité B2B à la prospection n'est pas un accord automatique aux pixels de suivi.

Analyser le cas au regard de la recommandation CNIL en vigueur : certains usages nécessitent le consentement et les exemptions sont limitées. Ne pas transformer l'exemption de délivrabilité en permission générale de profiler les prospects. [CNIL — recommandation du 14 avril 2026](https://www.cnil.fr/fr/recommandation-pixel-suivi-courriels), [FAQ du 22 juillet 2026](https://www.cnil.fr/fr/faq-recommandation-pixels-courriers-electroniques).

Afficher « ouverture détectée », « aucune ouverture détectée », « suivi désactivé » ou « mesure indisponible », avec horodatage approprié. Un chargement d'image n'est pas une preuve de lecture humaine, et son absence ne prouve pas que le message n'a pas été lu. Les protections de messagerie peuvent empêcher une mesure fiable. [Apple — Mail Privacy Protection](https://www.apple.com/legal/privacy/data/en/mail-privacy-protection/).

Les identifiants de suivi sont opaques et limités au message/périmètre ; aucune donnée client n'est révélée par une route publique. Minimiser les événements conservés, documenter leur durée et appliquer le retrait d'autorisation aux traitements ultérieurs. Ne pas relancer automatiquement un « non-ouvreur » sur la seule absence de pixel. Le suivi des clics et les séquences automatiques sont hors du premier lot, sauf décision complémentaire explicite.

## 5. Désinscription et opposition durable

Chaque message de campagne identifie l'expéditeur et comporte « Ne plus recevoir les e-mails de cette société ». Le destinataire se désinscrit sans compte CRM. Prévoir page de confirmation et prise en charge du mécanisme standard de désinscription en un clic lorsque applicable ; ne pas déclencher une opposition par la simple prévisualisation automatique d'un lien GET. [RFC 8058](https://www.rfc-editor.org/rfc/rfc8058).

L'opposition s'applique à la prospection e-mail de la société expéditrice, pour toutes ses campagnes, et pas seulement au lot courant. Elle est enregistrée dans une liste d'exclusion minimale, vérifiée à chaque import et envoi, sans réactivation silencieuse après scraping, fusion ou réimport. Une nouvelle autorisation éventuelle doit être explicite et justifiée. Aucune propagation vers d'autres sociétés cloisonnées sans périmètre et motif établis.

Annuler les expéditions non encore effectuées et refuser les relances dès prise en compte de l'opposition. Les messages déjà remis au transport ne peuvent pas être rappelés par cette fonction. Gérer également le signalement d'une opposition reçue par réponse e-mail ou saisie humaine autorisée, avec preuve et date.

Distinguer campagnes commerciales et messages de service nécessaires : un e-mail publicitaire ne doit pas contourner l'opposition en étant étiqueté transactionnel. La conservation de la preuve minimale d'opposition et les demandes de suppression suivent une politique documentée. [CNIL — communications électroniques et prise en compte durable de l'opposition](https://www.cnil.fr/fr/communication-electronique-quelles-regles).

## 6. Indicateurs, isolation et intégration

Dashboard société : lots/lignes reçus, qualifiés, rejets et doublons ; audiences éligibles/exclues ; campagnes et envois en attente, acceptés par SMTP, échoués, rejetés ou livrés si confirmés ; signaux d'ouverture et couverture du suivi ; oppositions et réponses entrantes si disponibles. Afficher les dénominateurs et ne pas attribuer un taux d'ouverture fiable aux destinataires non mesurables.

La vue commune agrège seulement les sociétés et mesures autorisées, avec ventilation. Campagnes, imports, événements, accès publics, exports, files de traitement et outils MCP conservent le périmètre structure. Une vue commune ne lance pas implicitement une campagne sous plusieurs expéditeurs.

Hermès reçoit le contexte autorisé des fiches qualifiées et des campagnes. Les réponses entrantes rejoignent la conversation et la chronologie ; leur traitement dépend du connecteur entrant prévu dans le cadrage SMTP. Les réponses Forms et réservations Cal.diy enrichissent ces mêmes fiches dans leur société. Les mots « connecté », « envoyé », « livré » ou « ouvert » doivent correspondre à des preuves distinctes.

## 7. Lots et recette

Ordre proposé : (1) base CRM et collecte en attente de qualification ; (2) rapprochement/provenance/exclusions ; (3) campagnes SMTP sans suivi, désinscription incluse dès ce lot ; (4) suivi facultatif et gestion de son autorisation ; (5) dashboard et recette complète. Claude porte les écrans Monday ; Codex porte contrats/validation/persistance, autorisations, queue, transport et événements. Réutiliser les branches et contrats déjà attribués.

Recette minimale sur comptes de test :
1. Importer un lot Hermès avec contact existant, nouveau professionnel, erreur, doublon et adresse déjà opposée ; vérifier qualification, rapport et provenance.
2. Rejouer le lot : aucune duplication, aucun écrasement injustifié et aucune levée d'opposition.
3. Créer une campagne ciblée : seuls les destinataires réellement éligibles sont retenus et les exclusions sont expliquées.
4. Désinscrire pendant une campagne puis réimporter le contact : aucun nouvel envoi commercial autorisé pour cet expéditeur.
5. Envoyer sans suivi : pas de pixel ni d'événement d'ouverture ; envoyer avec suivi autorisé : signal correctement rattaché et libellé prudent. Retirer l'autorisation et vérifier son effet.
6. Tester panne SMTP, reprise, message au résultat incertain et pause : aucun doublon aveugle.
7. Vérifier A/B/C, rôles, filtres forgés, exports, événements et MCP ; aucun accès à un contact, lot, campagne ou statistique d'une société interdite.
8. Vérifier les écrans et le parcours intégré dans une preview accessible au destinataire ; préciser ce qui reste simulé ou indisponible. Aucun envoi à de vrais prospects n'est autorisé par ce seul cadrage.
