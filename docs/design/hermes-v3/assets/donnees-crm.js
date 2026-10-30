/* Hermès V3 — données fictives CRM : contacts, réceptions, pipeline,
   campagne et réglages. Quatre axes tenus séparés, conformément au contrat :
   réception technique, qualification de la demande, étape d'affaire,
   opposition marketing. Aucun axe n'en déduit un autre. */

Object.assign(window.MAQUETTE, {
  contacts: {
    lea: { id: 'lea', nom: 'Léa Mercier', societeCliente: 'Boutique Mercier', societe: 'atelier', email: 'lea.mercier@boutique-mercier.fr', telephone: '+33 6 •• •• •• 18' },
    hugo: { id: 'hugo', nom: 'Hugo Barret', societeCliente: 'Barret & Fils', societe: 'atelier', email: 'h.barret@barret-fils.fr', telephone: '+33 6 •• •• •• 33' },
    ines: { id: 'ines', nom: 'Inès Caron', societeCliente: 'Caron Optique', societe: 'atelier', email: 'i.caron@caron-optique.fr', telephone: '+33 6 •• •• •• 47' },
    marc: { id: 'marc', nom: 'Marc Delaunay', societeCliente: 'Delaunay Traiteur', societe: 'atelier', email: 'm.delaunay@delaunay-traiteur.fr', telephone: '+33 6 •• •• •• 05' },
    paul: { id: 'paul', nom: 'Paul Hamon', societeCliente: 'Hamon Agencement', societe: 'atelier', email: 'p.hamon@hamon-agencement.fr', telephone: '+33 6 •• •• •• 91' },
    sofia: { id: 'sofia', nom: 'Sofia Nguyen', societeCliente: 'Copropriété Les Tilleuls', societe: 'verdure', email: 's.nguyen@les-tilleuls.fr', telephone: '+33 6 •• •• •• 72' },
  },

  /* Oppositions marketing : preuve durable, séparée de l'étape commerciale
     et du mode du bot. Une opposition n'efface pas l'historique. */
  oppositions: [
    { contact: 'ines', societe: 'atelier', portee: 'Prospection B2B', le: '18 oct. 2026', origine: 'Lien de désinscription' },
  ],

  /* ReceptionReceipt : source, classement, statut de qualification.
     Aucune opportunité n'est créée par la seule réception. */
  receptions: [
    {
      id: 'rc-801', societe: 'atelier', source: 'FORM', connexion: 'HeyForm · Demande de devis',
      externalEventId: 'hf_9f2c…a41', recuLe: '29 oct. 10:11', classification: 'COMMERCIAL_REQUEST',
      qualification: 'QUALIFIED', contact: 'lea', affaire: 'op-1', proprietaire: 'Camille Rousseau',
      resume: 'Vitrine sur mesure, boutique de 42 m², pose souhaitée avant les fêtes.',
      prochaineAction: 'Relancer après visite — 12 nov.',
    },
    {
      id: 'rc-802', societe: 'atelier', source: 'WHATSAPP', connexion: 'Evolution · instance atelier',
      externalEventId: 'wa_3b7e…c09', recuLe: '30 oct. 09:42', classification: 'CUSTOMER_REPLY',
      qualification: 'PENDING', contact: 'lea', affaire: 'op-1', proprietaire: 'Camille Rousseau',
      resume: 'Réponse de la cliente sur un devis en cours : rattachée au fil et à l’affaire existante.',
      prochaineAction: 'Aucune — la réponse ne crée pas de nouvelle affaire',
    },
    {
      id: 'rc-803', societe: 'atelier', source: 'EMAIL', connexion: 'IMAP · contact@atelier-fontaine.fr',
      externalEventId: 'rfc_<a91…@barret-fils.fr>', recuLe: '29 oct. 14:02', classification: 'TO_QUALIFY',
      qualification: 'PENDING', contact: 'hugo', affaire: null, proprietaire: null,
      resume: 'Demande de disponibilités pour une pose : à qualifier et à affecter.',
      prochaineAction: 'Qualifier et affecter à un commercial',
    },
    {
      id: 'rc-804', societe: 'atelier', source: 'SCRAPING', connexion: 'Collecte signée · lot B-2026-11',
      externalEventId: 'in_77c1…2fd', recuLe: '28 oct. 17:40', classification: 'TO_QUALIFY',
      qualification: 'PENDING', contact: null, affaire: null, proprietaire: null,
      resume: 'Ligne de collecte en staging. Une collecte n’établit ni consentement ni éligibilité à une campagne.',
      prochaineAction: 'Revue humaine : finalité, notice et acteur',
    },
    {
      id: 'rc-808', societe: 'atelier', source: 'FORM', connexion: 'HeyForm · Demande de devis',
      externalEventId: 'hf_41ab…d70', recuLe: '21 oct. 09:05', classification: 'COMMERCIAL_REQUEST',
      qualification: 'QUALIFIED', contact: 'hugo', affaire: 'op-2', proprietaire: 'Camille Rousseau',
      resume: 'Agencement d’une boutique de centre-ville, budget annoncé 20 000 €.',
      prochaineAction: 'Répondre sur la pose — 2 nov.',
    },
    {
      id: 'rc-805', societe: 'atelier', source: 'EMAIL', connexion: 'IMAP · contact@atelier-fontaine.fr',
      externalEventId: 'rfc_<4ff…@mailer.example>', recuLe: '28 oct. 06:14', classification: 'SPAM',
      qualification: 'REJECTED', contact: null, affaire: null, proprietaire: null,
      resume: 'Courrier non sollicité classé explicitement : aucun prospect ni opportunité créés.',
      prochaineAction: 'Aucune',
    },
    {
      id: 'rc-809', societe: 'atelier', source: 'EMAIL', connexion: 'IMAP · contact@atelier-fontaine.fr',
      externalEventId: 'rfc_<nf2…@heyform.local>', recuLe: '29 oct. 10:11', classification: 'TECHNICAL',
      qualification: 'REJECTED', contact: null, affaire: null, proprietaire: null,
      resume: 'Notification du formulaire, pas une demande : la réponse au formulaire est le reçu à qualifier, pas son e-mail d’avis.',
      prochaineAction: 'Aucune',
    },
    {
      id: 'rc-806', societe: 'atelier', source: 'WHATSAPP', connexion: 'Evolution · instance atelier',
      externalEventId: 'wa_51aa…77b', recuLe: '27 oct. 15:36', classification: 'REVIEW_REQUIRED',
      qualification: 'REVIEW_REQUIRED', contact: null, affaire: null, proprietaire: null,
      resume: 'Deux fiches possibles pour ce numéro. Aucune fusion automatique.',
      raisonCode: 'CONTACT_REVIEW_REQUIRED',
      prochaineAction: 'Choisir la bonne fiche ou en ouvrir une nouvelle',
    },
    {
      id: 'rc-807', societe: 'verdure', source: 'WHATSAPP', connexion: 'Evolution · instance verdure',
      externalEventId: 'wa_90de…1c4', recuLe: '30 oct. 11:05', classification: 'CUSTOMER_REPLY',
      qualification: 'PENDING', contact: 'sofia', affaire: 'op-5', proprietaire: 'Nadia Belkacem',
      resume: 'Photos et vidéo du chantier envoyées par la cliente, rattachées au contrat d’entretien.',
      prochaineAction: 'Classer les médias au dossier chantier',
    },
  ],

  /* Pipeline : valeurs natives NEW/SCREENING/MEETING/PROPOSAL/CUSTOMER.
     Les libellés français correspondent aux métadonnées réelles.
     Gagné/perdu reste une cible à définir, jamais CUSTOMER renommé. */
  stages: [
    { id: 'NEW', label: 'Nouveau' },
    { id: 'SCREENING', label: 'Qualification' },
    { id: 'MEETING', label: 'Rendez-vous' },
    { id: 'PROPOSAL', label: 'Proposition' },
    { id: 'CUSTOMER', label: 'Client' },
  ],

  affaires: [
    { id: 'op-1', societe: 'atelier', nom: 'Réaménagement showroom', contact: 'lea', stage: 'PROPOSAL', montant: 32400, devise: 'EUR', proprietaire: 'Camille Rousseau', prochaineAction: 'Relancer après visite', echeance: '12 nov.', recu: 'rc-801' },
    { id: 'op-2', societe: 'atelier', nom: 'Agencement boutique centre', contact: 'hugo', stage: 'MEETING', montant: 18900, devise: 'EUR', proprietaire: 'Camille Rousseau', prochaineAction: 'Répondre sur la pose', echeance: '2 nov.', retard: true, recu: 'rc-808' },
    { id: 'op-3', societe: 'atelier', nom: 'Mobilier bureaux Erdre', contact: 'hugo', stage: 'SCREENING', montant: 27100, devise: 'EUR', proprietaire: 'Thomas Girard', prochaineAction: 'Envoyer le chiffrage', echeance: '28 nov.', recu: null },
    { id: 'op-4', societe: 'atelier', nom: 'Cuisine professionnelle', contact: 'marc', stage: 'NEW', montant: 9800, devise: 'EUR', proprietaire: 'Thomas Girard', prochaineAction: 'Qualifier le besoin', echeance: '3 déc.', recu: null },
    { id: 'op-5', societe: 'verdure', nom: 'Entretien annuel Les Tilleuls', contact: 'sofia', stage: 'CUSTOMER', montant: 14200, devise: 'EUR', proprietaire: 'Nadia Belkacem', prochaineAction: 'Reconduire le contrat', echeance: '15 déc.', recu: 'rc-807' },
  ],

  /* Campagne : capacités calculées serveur dans le produit cible.
     Ici elles sont fictives et le montrent. */
  campagne: {
    societe: 'atelier',
    nom: 'Agencement commerce — Loire-Atlantique',
    objet: 'Repenser votre vitrine avant la saison',
    etat: 'DRAFT',
    identites: [
      { id: 'si-1', fromAddress: 'contact@atelier-fontaine.fr', mailbox: 'Boîte principale · IMAP+SMTP', alias: ['devis@atelier-fontaine.fr'], replyTo: 'contact@atelier-fontaine.fr', state: 'VERIFIED', revision: 'id-7', preuve: 'Délégation vérifiée le 28 oct. sur la boîte exacte' },
      { id: 'si-2', fromAddress: 'commercial@atelier-fontaine.fr', mailbox: 'Non reliée à une boîte connectée', alias: [], replyTo: null, state: 'UNVERIFIED', revision: 'id-9', preuve: 'Même domaine autorisé, mais aucune délégation de cette boîte' },
    ],
    identiteChoisie: 'si-1',
    capacites: {
      preview: { allowed: true, reasonCode: null },
      testSynthetic: { allowed: true, reasonCode: null },
      schedule: { allowed: true, reasonCode: null },
      send: { allowed: false, reasonCode: 'CAPABILITY_UNAVAILABLE' },
      checkedAt: '30 oct. 11:12',
    },
    audience: {
      retenus: 24,
      exclusions: [
        { motif: 'Opposition marketing durable', nombre: 3 },
        { motif: 'Doublon résolu sur la même fiche', nombre: 2 },
        { motif: 'Adresse invalide à la normalisation', nombre: 1 },
        { motif: 'Qualification incomplète', nombre: 4 },
      ],
      variables: [
        { nom: 'prenom', manquant: 0 },
        { nom: 'societe', manquant: 0 },
        { nom: 'ville', manquant: 5 },
      ],
    },
    programmation: { date: '4 novembre 2026', heure: '09:00', fuseau: 'Europe/Paris' },
    resultats: [
      { label: 'Accepté par le serveur SMTP', value: 0, available: true, evidence: 'SMTP_ACCEPTED', note: 'Aucune émission : la campagne est en brouillon.' },
      { label: 'Livraison attestée', value: null, available: false, evidence: 'PROVIDER_DELIVERED', note: 'Inconnu — nécessite un événement authentifié du fournisseur.' },
      { label: 'Réponses corrélées', value: null, available: false, evidence: 'REPLY_OBSERVED', note: 'Inconnu — aucune réponse rattachée.' },
      { label: 'Ouvertures observées', value: null, available: false, evidence: 'OPEN_OBSERVED', note: 'Suivi désactivé : ni pixel ni lien de suivi ne sont générés.' },
    ],
  },

  /* Centre Réglages — connexions. Cinq états, libellés exacts :
     Non configuré / Configuré, à vérifier / Connecté, vérifié le … /
     Connexion en erreur / Connexion désactivée. Aucun secret saisi ni affiché. */
  reglages: {
    atelier: {
      membres: [
        { nom: 'Camille Rousseau', role: 'Administratrice', etat: 'Active' },
        { nom: 'Thomas Girard', role: 'Commercial', etat: 'Actif' },
        { nom: 'Julie Fabre', role: 'Commerciale', etat: 'Invitation en attente' },
      ],
      connexions: [
        { id: 'wa', nom: 'WhatsApp', protocole: 'Evolution API', etat: 'verifie', le: '30 oct. 09:40' },
        { id: 'imap', nom: 'E-mail entrant', protocole: 'IMAP', etat: 'verifie', le: '30 oct. 08:12' },
        { id: 'smtp', nom: 'E-mail sortant', protocole: 'SMTP', etat: 'verifie', le: '30 oct. 08:12' },
        { id: 'mcp', nom: 'Hermès MCP', protocole: 'MCP · outil en lecture seule', etat: 'verifie', le: '30 oct. 09:40' },
        { id: 'intake', nom: 'Collectes', protocole: 'Point d’entrée signé', etat: 'verifie', le: '28 oct. 17:40' },
        { id: 'forms', nom: 'Formulaires', protocole: 'HeyForm', etat: 'declare' },
        { id: 'cal', nom: 'Rendez-vous', protocole: 'Cal.diy', etat: 'absent' },
      ],
    },
    verdure: {
      membres: [
        { nom: 'Nadia Belkacem', role: 'Administratrice', etat: 'Active' },
        { nom: 'Camille Rousseau', role: 'Lecture seule', etat: 'Active' },
      ],
      connexions: [
        { id: 'wa', nom: 'WhatsApp', protocole: 'Evolution API', etat: 'erreur', note: 'Échec d’authentification au dernier test (état fictif)' },
        { id: 'imap', nom: 'E-mail entrant', protocole: 'IMAP', etat: 'verifie', le: '29 oct. 19:05' },
        { id: 'smtp', nom: 'E-mail sortant', protocole: 'SMTP', etat: 'declare' },
        { id: 'mcp', nom: 'Hermès MCP', protocole: 'MCP · outil en lecture seule', etat: 'absent' },
        { id: 'intake', nom: 'Collectes', protocole: 'Point d’entrée signé', etat: 'verifie', le: '27 oct. 09:30' },
        { id: 'forms', nom: 'Formulaires', protocole: 'HeyForm', etat: 'desactivee', note: 'Désactivée par un administrateur (état fictif)' },
        { id: 'cal', nom: 'Rendez-vous', protocole: 'Cal.diy', etat: 'absent' },
      ],
    },
  },
});
