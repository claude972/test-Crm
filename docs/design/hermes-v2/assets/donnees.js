// Données entièrement fictives. Aucune société, personne, adresse ou numéro
// ci-dessous ne désigne une entité réelle. Rien n'est lu ni écrit nulle part :
// ce fichier EST la source de vérité de la maquette.
//
// Le cloisonnement est le point que ces maquettes doivent prouver : chaque
// société porte ses propres données, et la vue commune n'agrège que celles
// dont l'utilisateur est membre.
window.MAQUETTE = {
  utilisateur: { nom: 'Camille Rousseau', role: 'Administratrice' },

  societes: [
    { id: 'atelier', nom: 'Atelier Fontaine', membre: true,
      secteur: 'Menuiserie sur mesure', ville: 'Nantes' },
    { id: 'verdure', nom: 'Verdure & Associés', membre: true,
      secteur: 'Paysagisme', ville: 'Rennes' },
    { id: 'orion', nom: 'Orion Industries', membre: false,
      secteur: 'Sous-traitance mécanique', ville: 'Le Mans' },
  ],

  // Indicateurs par société. `valeur: null` signifie « non mesurable » et ne
  // doit jamais s'afficher en 0 — la distinction est volontaire et fait partie
  // de ce qui est soumis à validation.
  indicateurs: {
    atelier: [
      { cle: 'Affaires ouvertes', valeur: 14, tendance: '+3 cette semaine' },
      { cle: 'Contacts qualifiés', valeur: 86, tendance: '+12 ce mois' },
      { cle: 'Relances dues', valeur: 5, tendance: 'dont 2 en retard' },
      { cle: 'Taux de réponse', valeur: null, tendance: 'non mesurable' },
    ],
    verdure: [
      { cle: 'Affaires ouvertes', valeur: 7, tendance: '+1 cette semaine' },
      { cle: 'Contacts qualifiés', valeur: 41, tendance: '+4 ce mois' },
      { cle: 'Relances dues', valeur: 2, tendance: 'aucune en retard' },
      { cle: 'Taux de réponse', valeur: null, tendance: 'non mesurable' },
    ],
  },

  pipeline: {
    atelier: [
      { etape: 'Nouveau', nombre: 6, montant: '48 200 €' },
      { etape: 'Qualifié', nombre: 4, montant: '91 500 €' },
      { etape: 'Devis envoyé', nombre: 2, montant: '34 000 €' },
      { etape: 'Négociation', nombre: 2, montant: '58 700 €' },
      { etape: 'Gagné', nombre: 3, montant: '76 400 €' },
    ],
    verdure: [
      { etape: 'Nouveau', nombre: 3, montant: '12 900 €' },
      { etape: 'Qualifié', nombre: 2, montant: '26 400 €' },
      { etape: 'Devis envoyé', nombre: 1, montant: '8 300 €' },
      { etape: 'Négociation', nombre: 1, montant: '19 000 €' },
      { etape: 'Gagné', nombre: 0, montant: '—' },
    ],
  },

  affaires: {
    atelier: [
      { nom: 'Réaménagement showroom', contact: 'Léa Mercier', etape: 'Négociation', montant: '32 400 €', echeance: '12 nov.', action: 'Relancer après visite', enRetard: false },
      { nom: 'Agencement boutique centre', contact: 'Hugo Barret', etape: 'Devis envoyé', montant: '18 900 €', echeance: '2 nov.', action: 'Répondre sur la pose', enRetard: true },
      { nom: 'Mobilier bureaux Erdre', contact: 'Sofia Nguyen', etape: 'Qualifié', montant: '27 100 €', echeance: '28 nov.', action: 'Envoyer le chiffrage', enRetard: false },
      { nom: 'Cuisine professionnelle', contact: 'Marc Delaunay', etape: 'Nouveau', montant: '9 800 €', echeance: '3 déc.', action: 'Qualifier le besoin', enRetard: false },
    ],
    verdure: [
      { nom: 'Parc résidentiel Beaulieu', contact: 'Inès Faure', etape: 'Négociation', montant: '19 000 €', echeance: '14 nov.', action: 'Confirmer la visite', enRetard: false },
      { nom: 'Toiture végétalisée', contact: 'Thomas Roy', etape: 'Qualifié', montant: '14 200 €', echeance: '25 nov.', action: 'Planifier le métré', enRetard: false },
      { nom: 'Entretien annuel copropriété', contact: 'Awa Diallo', etape: 'Nouveau', montant: '6 400 €', echeance: '31 oct.', action: 'Rappeler le syndic', enRetard: true },
    ],
  },

  // Les collectes arrivent par un point d'entrée authentifié, société par
  // société. Le dépôt manuel reste un second choix.
  collectes: {
    atelier: [
      { nom: 'Salon Habitat — octobre', origine: 'Point d’entrée', lignes: 48, recue: '28 oct.', etat: 'À qualifier' },
      { nom: 'Annuaire artisans Loire', origine: 'Point d’entrée', lignes: 120, recue: '21 oct.', etat: 'Qualifiée' },
      { nom: 'Reprise fichier 2024', origine: 'Dépôt manuel', lignes: 36, recue: '14 oct.', etat: 'Partielle' },
    ],
    verdure: [
      { nom: 'Syndics Bretagne', origine: 'Point d’entrée', lignes: 64, recue: '27 oct.', etat: 'À qualifier' },
      { nom: 'Contacts salon vert', origine: 'Dépôt manuel', lignes: 22, recue: '09 oct.', etat: 'Qualifiée' },
    ],
  },

  lignesCollecte: {
    atelier: [
      { contact: 'Camille Barre', societe: 'Menuiserie du Lac', email: 'c.barre@exemple-menuiserie.fr', etat: 'À qualifier', note: '—' },
      { contact: 'Yanis Pereira', societe: 'Agencement Pereira', email: 'contact@exemple-pereira.fr', etat: 'Qualifié', note: 'Contact créé' },
      { contact: 'Nora Lambert', societe: 'Boutique Lambert', email: '', etat: 'Invalide', note: 'Adresse absente' },
      { contact: 'Paul Guérin', societe: 'Atelier Guérin', email: 'p.guerin@exemple-guerin.fr', etat: 'Doublon', note: 'Déjà au CRM' },
      { contact: 'Sarah Oliveira', societe: 'Oliveira Déco', email: 's.oliveira@exemple-deco.fr', etat: 'Opposition', note: 'Désinscrite — non contactable' },
    ],
    verdure: [
      { contact: 'Lucie Hamon', societe: 'Syndic Armor', email: 'l.hamon@exemple-armor.fr', etat: 'À qualifier', note: '—' },
      { contact: 'Enzo Riou', societe: 'Copropriété Riou', email: 'e.riou@exemple-riou.fr', etat: 'Qualifié', note: 'Contact créé' },
      { contact: 'Maya Costa', societe: 'Jardins Costa', email: '', etat: 'Invalide', note: 'Adresse absente' },
    ],
  },

  conversations: {
    atelier: [
      { id: 'c1', canal: 'whatsapp', interlocuteur: 'Léa Mercier', apercu: 'Parfait, on valide le plan de la vitrine.', quand: '09:42', contact: true, nonLu: 2 },
      { id: 'c2', canal: 'whatsapp', interlocuteur: '+33 6 12 •• •• 47', apercu: 'Bonjour, vous faites du sur-mesure ?', quand: 'hier', contact: false, nonLu: 1 },
      { id: 'c3', canal: 'email', interlocuteur: 'h.barret@exemple-barret.fr', objet: 'Devis agencement boutique', apercu: 'Pouvez-vous détailler la pose ?', quand: 'hier', contact: true, nonLu: 0 },
      { id: 'c4', canal: 'email', interlocuteur: 's.nguyen@exemple-nguyen.fr', objet: 'Mobilier bureaux — relance', apercu: 'Je reviens vers vous lundi.', quand: '27 oct.', contact: true, nonLu: 0 },
    ],
    verdure: [
      { id: 'v1', canal: 'whatsapp', interlocuteur: 'Inès Faure', apercu: 'On peut décaler la visite ?', quand: '11:05', contact: true, nonLu: 1 },
      { id: 'v2', canal: 'email', interlocuteur: 't.roy@exemple-roy.fr', objet: 'Toiture végétalisée', apercu: 'Merci pour le chiffrage.', quand: 'hier', contact: true, nonLu: 0 },
    ],
  },

  messages: {
    c1: [
      { sens: 'entrant', texte: 'Bonjour, on a bien reçu la proposition.', quand: 'mar. 09:12', etat: 'Reçu' },
      { sens: 'sortant', texte: 'Bonjour Léa, parfait. Je vous envoie le plan de vitrine ce matin.', quand: 'mar. 09:20', etat: 'Accepté — livraison inconnue' },
      { sens: 'entrant', texte: 'Parfait, on valide le plan de la vitrine.', quand: 'mar. 09:42', etat: 'Reçu' },
    ],
    c2: [
      { sens: 'entrant', texte: 'Bonjour, vous faites du sur-mesure ?', quand: 'lun. 16:30', etat: 'Reçu' },
      { sens: 'sortant', texte: 'Bonjour, oui. Sur quel type de pièce ?', quand: 'lun. 16:48', etat: 'Non confirmé' },
    ],
    c3: [
      { sens: 'entrant', texte: 'Pouvez-vous détailler la pose ?', quand: 'lun. 14:02', etat: 'Reçu' },
    ],
    c4: [
      { sens: 'sortant', texte: 'Je vous relance concernant le mobilier.', quand: '27 oct.', etat: 'Accepté — livraison inconnue' },
      { sens: 'entrant', texte: 'Je reviens vers vous lundi.', quand: '27 oct.', etat: 'Reçu' },
    ],
    v1: [
      { sens: 'entrant', texte: 'On peut décaler la visite ?', quand: 'mar. 11:05', etat: 'Reçu' },
    ],
    v2: [
      { sens: 'entrant', texte: 'Merci pour le chiffrage.', quand: 'lun. 10:14', etat: 'Reçu' },
    ],
  },

  // Les deux bots sont indépendants et persistants, par société. Couper un bot
  // ne coupe pas le canal : la réception et la réponse humaine restent
  // possibles. C'est la règle que ces maquettes doivent rendre évidente.
  // Prospects travaillés, au-delà des collectes brutes : un propriétaire, une
  // étape et une prochaine action. C'est le niveau où l'on travaille.
  prospects: {
    atelier: [
      { contact: 'Camille Barre', societe: 'Menuiserie du Lac', proprietaire: 'Camille R.', etape: 'À contacter', action: 'Premier appel', quand: '31 oct.', enRetard: true },
      { contact: 'Yanis Pereira', societe: 'Agencement Pereira', proprietaire: 'Camille R.', etape: 'En discussion', action: 'Envoyer la plaquette', quand: '4 nov.', enRetard: false },
      { contact: 'Inès Lemoine', societe: 'Lemoine Habitat', proprietaire: 'Théo M.', etape: 'Rendez-vous pris', action: 'Visite sur site', quand: '6 nov.', enRetard: false },
      { contact: 'Paul Guérin', societe: 'Atelier Guérin', proprietaire: 'Non affecté', etape: 'À contacter', action: 'Affecter un propriétaire', quand: '—', enRetard: false },
      { contact: 'Sarah Oliveira', societe: 'Oliveira Déco', proprietaire: '—', etape: 'Opposition', action: 'Aucune — ne pas contacter', quand: '—', enRetard: false },
    ],
    verdure: [
      { contact: 'Lucie Hamon', societe: 'Syndic Armor', proprietaire: 'Camille R.', etape: 'En discussion', action: 'Relancer le devis', quand: '2 nov.', enRetard: false },
      { contact: 'Enzo Riou', societe: 'Copropriété Riou', proprietaire: 'Non affecté', etape: 'À contacter', action: 'Affecter un propriétaire', quand: '—', enRetard: false },
    ],
  },

  // Aperçu du parcours audience → brouillon → résultats. Entièrement statique :
  // aucune campagne n'est envoyable depuis cette maquette.
  audiences: {
    atelier: [
      { nom: 'Menuiseries Loire — qualifiées', contacts: 42, exclus: 3, maj: '29 oct.' },
      { nom: 'Salon Habitat — à relancer', contacts: 18, exclus: 1, maj: '28 oct.' },
    ],
    verdure: [
      { nom: 'Syndics Bretagne — qualifiés', contacts: 24, exclus: 2, maj: '27 oct.' },
    ],
  },

  campagnes: {
    atelier: [
      { nom: 'Présentation atelier — automne', audience: 'Menuiseries Loire — qualifiées', etat: 'Brouillon', resultat: 'Jamais envoyée' },
      { nom: 'Relance salon', audience: 'Salon Habitat — à relancer', etat: 'Brouillon', resultat: 'Jamais envoyée' },
    ],
    verdure: [
      { nom: 'Offre entretien annuel', audience: 'Syndics Bretagne — qualifiés', etat: 'Brouillon', resultat: 'Jamais envoyée' },
    ],
  },

  oppositions: {
    atelier: [
      { adresse: 's.oliveira@exemple-deco.fr', motif: 'Désinscription', portee: 'Tous les sujets', depuis: '12 oct.' },
      { adresse: 'contact@exemple-bureau.fr', motif: 'Refus de suivi', portee: 'Ouvertures et clics seulement', depuis: '3 oct.' },
    ],
    verdure: [
      { adresse: 'm.costa@exemple-costa.fr', motif: 'Désinscription', portee: 'Tous les sujets', depuis: '18 oct.' },
    ],
  },

  membres: {
    atelier: [
      { nom: 'Camille Rousseau', role: 'Administratrice', acces: 'Toutes les données' },
      { nom: 'Théo Marchand', role: 'Commercial', acces: 'Ses affaires et contacts' },
    ],
    verdure: [
      { nom: 'Camille Rousseau', role: 'Administratrice', acces: 'Toutes les données' },
    ],
  },

  // Chaque connexion porte un état cible explicite et, pour les canaux, le
  // protocole. `verifie` est la seule chose qui autorise l'activation d'un bot :
  // une connexion déclarée mais non vérifiée ne suffit pas.
  reglages: {
    atelier: {
      general: { nom: 'Atelier Fontaine', sousDomaine: 'atelier-fontaine', fuseau: 'Europe/Paris', langue: 'Français' },
      connexions: [
        { id: 'wa', nom: 'WhatsApp', protocole: 'Evolution API', etat: 'verifie', detail: 'Instance de démonstration — vérification simulée', verifie: true, le: '30 oct. 09:40' },
        { id: 'imap', nom: 'E-mail entrant', protocole: 'IMAP', etat: 'verifie', detail: 'contact@exemple-fontaine.fr', verifie: true, le: '30 oct. 08:12' },
        { id: 'smtp', nom: 'E-mail sortant', protocole: 'SMTP', etat: 'verifie', detail: 'contact@exemple-fontaine.fr', verifie: true, le: '30 oct. 08:12' },
        { id: 'mcp', nom: 'Hermès MCP', protocole: 'MCP', etat: 'verifie', detail: 'Serveur de démonstration — vérification simulée', verifie: true, le: '30 oct. 09:40' },
        { id: 'intake', nom: 'Collectes', protocole: 'Point d\u2019entrée signé', etat: 'verifie', detail: 'Dernière réception : 28 oct.', verifie: true, le: '28 oct. 17:40' },
        { id: 'forms', nom: 'Formulaires', protocole: 'HeyForm', etat: 'declare', detail: 'Réponses enregistrées en notes', verifie: false },
        { id: 'agenda', nom: 'Rendez-vous', protocole: 'Cal.diy', etat: 'absent', detail: 'Aucun agenda Cal.diy relié', verifie: false },
      ],
      // Démonstration : le bot WhatsApp part ACTIF pour que la reprise en main
      // soit atteignable. Le bot e-mail reste coupé dans la même société, ce qui
      // montre que les deux interrupteurs sont bien indépendants.
      bots: { whatsapp: true, email: false },
      demo: true,
    },
    verdure: {
      general: { nom: 'Verdure & Associés', sousDomaine: 'verdure-associes', fuseau: 'Europe/Paris', langue: 'Français' },
      connexions: [
        { id: 'wa', nom: 'WhatsApp', protocole: 'Evolution API', etat: 'absent', detail: 'Aucune instance déclarée', verifie: false },
        { id: 'imap', nom: 'E-mail entrant', protocole: 'IMAP', etat: 'verifie', detail: 'bonjour@exemple-verdure.fr', verifie: true, le: '29 oct. 19:05' },
        { id: 'smtp', nom: 'E-mail sortant', protocole: 'SMTP', etat: 'declare', detail: 'Serveur déclaré, aucun envoi test', verifie: false },
        { id: 'mcp', nom: 'Hermès MCP', protocole: 'MCP', etat: 'absent', detail: 'Aucun serveur déclaré', verifie: false },
        { id: 'intake', nom: 'Collectes', protocole: 'Point d\u2019entrée signé', etat: 'verifie', detail: 'Dernière réception : 27 oct.', verifie: true, le: '27 oct. 09:30' },
        { id: 'forms', nom: 'Formulaires', protocole: 'HeyForm', etat: 'absent', detail: 'Aucun formulaire relié', verifie: false },
        { id: 'agenda', nom: 'Rendez-vous', protocole: 'Cal.diy', etat: 'absent', detail: 'Aucun agenda Cal.diy relié', verifie: false },
      ],
      bots: { whatsapp: false, email: false },
    },
  },
};
