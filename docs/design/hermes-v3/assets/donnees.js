/* Hermès V3 — jeu de données fictif pour la maquette.
   Aucune donnée réelle, aucun identifiant de connexion, aucun secret.
   Le vocabulaire suit les contrats V3 proposés (BotMode, MediaState,
   MailFolderRole, ReceiptClassification, stages Opportunity natifs). */

window.MAQUETTE = {
  societes: {
    atelier: {
      id: 'atelier',
      nom: 'Atelier Fontaine',
      metier: 'Menuiserie sur mesure · Nantes',
      boite: 'contact@atelier-fontaine.fr',
    },
    verdure: {
      id: 'verdure',
      nom: 'Verdure & Associés',
      metier: 'Paysagiste · Rennes',
      boite: 'bonjour@verdure-associes.fr',
    },
  },

  membreActif: { nom: 'Camille Rousseau', role: 'Administratrice', initiales: 'CR' },

  /* Politique société/canal. Le mode effectif d'un fil est le minimum
     restrictif entre cette politique et l'exception locale. */
  politiques: {
    atelier: {
      WHATSAPP: { mode: 'AUTO', revision: 'pol-41', deleguePar: 'Camille Rousseau', le: '28 oct. 09:12' },
      EMAIL: { mode: 'ASSISTED', revision: 'pol-17', deleguePar: 'Camille Rousseau', le: '24 oct. 14:03' },
    },
    verdure: {
      WHATSAPP: { mode: 'OFF', revision: 'pol-9', deleguePar: 'Nadia Belkacem', le: '29 oct. 18:40' },
      EMAIL: { mode: 'ASSISTED', revision: 'pol-12', deleguePar: 'Nadia Belkacem', le: '26 oct. 11:20' },
    },
  },

  /* Assets média. Les états suivent MediaState du contrat proposé.
     Seuls les fichiers présents dans assets/medias sont réellement lisibles. */
  medias: {
    'md-vitrine': {
      id: 'md-vitrine', kind: 'IMAGE', name: 'vitrine-mercier.svg', mimeType: 'image/svg+xml',
      byteSize: 1488, width: 800, height: 600, state: 'READY',
      fichier: 'assets/medias/photo-vitrine.svg',
      alt: 'Vitrine en bois de la boutique, photo envoyée par la cliente',
    },
    'md-plan': {
      id: 'md-plan', kind: 'IMAGE', name: 'plan-pose-vitrine.svg', mimeType: 'image/svg+xml',
      byteSize: 1504, width: 800, height: 600, state: 'READY',
      fichier: 'assets/medias/photo-plan-pose.svg',
      alt: 'Plan coté de la vitrine, largeur 4200, hauteur 2600',
    },
    'md-vocal-cliente': {
      id: 'md-vocal-cliente', kind: 'VOICE', name: 'message vocal', mimeType: 'audio/mp4',
      byteSize: 28239, durationMs: 5953, state: 'READY',
      fichier: 'assets/medias/vocal-cliente.m4a',
    },
    'md-vocal-reponse': {
      id: 'md-vocal-reponse', kind: 'VOICE', name: 'message vocal', mimeType: 'audio/mp4',
      byteSize: 27568, durationMs: 5581, state: 'READY',
      fichier: 'assets/medias/vocal-reponse.m4a',
    },
    'md-massif': {
      id: 'md-massif', kind: 'VIDEO', name: 'massif-apres-plantation.mp4', mimeType: 'video/mp4',
      byteSize: 1128375, durationMs: 5055, width: 960, height: 540, state: 'READY',
      fichier: 'assets/medias/demo-video-flower.mp4',
      attribution: 'Vidéo « flower » — MDN interactive-examples, CC0 1.0',
    },
    'md-devis': {
      id: 'md-devis', kind: 'FILE', name: 'devis-D-2026-114.pdf', mimeType: 'application/pdf',
      byteSize: 184320, state: 'READY', fichier: null,
    },
    'md-croquis': {
      id: 'md-croquis', kind: 'IMAGE', name: 'croquis-comptoir.jpg', mimeType: 'image/jpeg',
      byteSize: 2201600, state: 'FAILED', errorCode: 'MEDIA_NOT_AVAILABLE', fichier: null,
    },
    'md-visite': {
      id: 'md-visite', kind: 'VIDEO', name: 'visite-chantier.mp4', mimeType: 'video/mp4',
      byteSize: 7340032, state: 'PROCESSING', fichier: null,
    },
    'md-ancien-plan': {
      id: 'md-ancien-plan', kind: 'FILE', name: 'plan-v1.dwg', mimeType: 'application/acad',
      byteSize: 940032, state: 'EXPIRED', fichier: null,
    },
  },

  /* Conversations WhatsApp. localMode suit LocalBotMode : INHERIT, AUTO, ASSISTED, OFF. */
  conversations: [
    {
      id: 'wa-lea', societe: 'atelier', canal: 'WHATSAPP', contact: 'lea',
      nom: 'Léa Mercier', poste: 'Boutique Mercier', handle: '+33 6 •• •• •• 18',
      localMode: 'INHERIT', localRevision: 'loc-3',
      apercu: 'Parfait, on valide le plan de la vitrine.', heure: '09:42', nonLus: 2,
    },
    {
      id: 'wa-ines', societe: 'atelier', canal: 'WHATSAPP', contact: 'ines',
      nom: 'Inès Caron', poste: 'Caron Optique', handle: '+33 6 •• •• •• 47',
      localMode: 'ASSISTED', localRevision: 'loc-11',
      apercu: 'Merci, je regarde et je reviens vers vous.', heure: 'hier', nonLus: 0,
    },
    {
      id: 'wa-marc', societe: 'atelier', canal: 'WHATSAPP', contact: 'marc',
      nom: 'Marc Delaunay', poste: 'Delaunay Traiteur', handle: '+33 6 •• •• •• 05',
      localMode: 'OFF', localRevision: 'loc-24',
      apercu: 'Je préfère qu’on se parle de vive voix.', heure: 'lun.', nonLus: 1,
    },
    {
      id: 'wa-paul', societe: 'atelier', canal: 'WHATSAPP', contact: 'paul',
      nom: 'Paul Hamon', poste: 'Hamon Agencement', handle: '+33 6 •• •• •• 91',
      localMode: 'AUTO', localRevision: 'loc-31', delegationEpoch: 'ep-12',
      apercu: 'D’accord pour le rendez-vous de jeudi.', heure: 'mar.', nonLus: 0,
    },
    {
      id: 'wa-sofia', societe: 'verdure', canal: 'WHATSAPP', contact: 'sofia',
      nom: 'Sofia Nguyen', poste: 'Copropriété Les Tilleuls', handle: '+33 6 •• •• •• 72',
      localMode: 'INHERIT', localRevision: 'loc-2',
      apercu: 'Vidéo du massif après plantation', heure: '11:05', nonLus: 1,
    },
  ],

  messages: {
    'wa-lea': [
      { id: 'm1', sens: 'entrant', jour: 'Hier', heure: '09:12', contenu: { kind: 'TEXT', text: 'Bonjour, on a bien reçu la proposition pour la vitrine.' }, etat: 'RECU' },
      { id: 'm2', sens: 'entrant', heure: '09:13', contenu: { kind: 'WHATSAPP_MEDIA', mediaId: 'md-vitrine', caption: 'La devanture aujourd’hui, avant dépose.' }, etat: 'RECU' },
      { id: 'm3', sens: 'entrant', heure: '09:14', contenu: { kind: 'WHATSAPP_MEDIA', mediaId: 'md-vocal-cliente', caption: null }, etat: 'RECU' },
      { id: 'm4', sens: 'sortant', heure: '09:20', auteur: 'Camille Rousseau', contenu: { kind: 'TEXT', text: 'Bonjour Léa. Je vous envoie le plan coté ce matin, avec la date de pose.' }, etat: 'ACCEPTE' },
      { id: 'm5', sens: 'sortant', heure: '09:21', auteur: 'Camille Rousseau', contenu: { kind: 'WHATSAPP_MEDIA', mediaId: 'md-plan', caption: 'Plan coté — pose le 12 novembre.' }, etat: 'ACCEPTE' },
      { id: 'm6', sens: 'entrant', jour: 'Aujourd’hui', heure: '09:41', contenu: { kind: 'WHATSAPP_MEDIA', mediaId: 'md-croquis', caption: 'Et le croquis du comptoir ?' }, etat: 'RECU' },
      { id: 'm7', sens: 'entrant', heure: '09:42', contenu: { kind: 'TEXT', text: 'Parfait, on valide le plan de la vitrine.' }, etat: 'RECU', nonLuDepuis: true },
    ],
    'wa-ines': [
      { id: 'm1', sens: 'entrant', jour: 'Hier', heure: '16:02', contenu: { kind: 'TEXT', text: 'Bonjour, pouvez-vous me rappeler le délai pour les présentoirs ?' }, etat: 'RECU' },
      { id: 'm2', sens: 'sortant', heure: '16:30', auteur: 'Camille Rousseau', contenu: { kind: 'TEXT', text: 'Bonjour Inès, comptez six semaines après validation du plan.' }, etat: 'INCERTAIN' },
      { id: 'm3', sens: 'entrant', heure: '16:48', contenu: { kind: 'TEXT', text: 'Merci, je regarde et je reviens vers vous.' }, etat: 'RECU' },
    ],
    'wa-marc': [
      { id: 'm1', sens: 'entrant', jour: 'Lundi', heure: '08:30', contenu: { kind: 'TEXT', text: 'Bonjour, j’ai vu votre message automatique la semaine dernière.' }, etat: 'RECU' },
      { id: 'm2', sens: 'entrant', heure: '08:31', contenu: { kind: 'TEXT', text: 'Je préfère qu’on se parle de vive voix.' }, etat: 'RECU', nonLuDepuis: true },
    ],
    'wa-paul': [
      { id: 'm1', sens: 'entrant', jour: 'Mardi', heure: '10:12', contenu: { kind: 'TEXT', text: 'Bonjour, est-ce que jeudi 14 h vous irait pour faire le point ?' }, etat: 'RECU' },
      { id: 'm2', sens: 'sortant', heure: '10:12', auteur: 'Hermès', automatique: true, contenu: { kind: 'TEXT', text: 'Bonjour Paul, jeudi 14 h est noté. Camille vous confirmera l’adresse dans la journée.' }, etat: 'ACCEPTE' },
      { id: 'm3', sens: 'entrant', heure: '10:19', contenu: { kind: 'TEXT', text: 'D’accord pour le rendez-vous de jeudi.' }, etat: 'RECU' },
    ],
    'wa-sofia': [
      { id: 'm1', sens: 'entrant', jour: 'Aujourd’hui', heure: '11:04', contenu: { kind: 'TEXT', text: 'Bonjour, la plantation du massif est terminée côté cour.' }, etat: 'RECU' },
      { id: 'm2', sens: 'entrant', heure: '11:05', contenu: { kind: 'WHATSAPP_MEDIA', mediaId: 'md-massif', caption: 'Le massif après plantation.' }, etat: 'RECU', nonLuDepuis: true },
      { id: 'm3', sens: 'entrant', heure: '11:06', contenu: { kind: 'WHATSAPP_MEDIA', mediaId: 'md-visite', caption: 'Et la vidéo de la visite complète.' }, etat: 'RECU' },
      { id: 'm4', sens: 'entrant', heure: '11:07', contenu: { kind: 'WHATSAPP_MEDIA', mediaId: 'md-ancien-plan', caption: null }, etat: 'RECU' },
    ],
  },

  /* Brouillons MCP. state suit DraftSuggestion : GENERATING, READY, UNAVAILABLE, INVALIDATED. */
  brouillons: {
    'wa-lea': {
      id: 'dr-118', sourceMessageId: 'm7', state: 'READY', policyRevision: 'pol-41',
      text: 'Merci Léa. Je bloque la pose au 12 novembre et je vous envoie le croquis du comptoir dans la journée.',
      expiresAt: 'expire dans 24 min',
    },
    'wa-ines': {
      id: 'dr-120', sourceMessageId: 'm3', state: 'READY', policyRevision: 'pol-41',
      text: 'Bonjour Inès, je reste disponible si vous voulez caler un rendez-vous pour les présentoirs.',
      expiresAt: 'expire dans 51 min',
    },
  },

  /* Boîte e-mail. Les rôles suivent MailFolderRole. */
  mail: {
    atelier: {
      mailboxId: 'mb-atelier-1', adresse: 'contact@atelier-fontaine.fr',
      dossiers: [
        { id: 'inbox', role: 'INBOX', label: 'Réception', nonLus: 2, total: 18 },
        { id: 'sent', role: 'SENT', label: 'Envoyés', nonLus: 0, total: 41 },
        { id: 'drafts', role: 'DRAFTS', label: 'Brouillons', nonLus: 0, total: 2 },
        { id: 'archive', role: 'ARCHIVE', label: 'Archives', nonLus: 0, total: 126 },
        { id: 'trash', role: 'TRASH', label: 'Corbeille', nonLus: 0, total: 7 },
      ],
      fils: [
        {
          id: 'ml-devis', dossier: 'inbox', contact: 'lea', societe: 'atelier', canal: 'EMAIL', localMode: 'INHERIT', localRevision: 'loc-4',
          objet: 'Devis D-2026-114 — vitrine Boutique Mercier',
          correspondants: 'Léa Mercier, vous', date: '09:58', nonLu: true, piecesJointes: 2, messages: 3,
        },
        {
          id: 'ml-pose', dossier: 'inbox', contact: 'hugo', societe: 'atelier', canal: 'EMAIL', localMode: 'INHERIT', localRevision: 'loc-6',
          objet: 'Pose du comptoir — disponibilités semaine 46',
          correspondants: 'Hugo Barret', date: 'hier', nonLu: true, piecesJointes: 0, messages: 2,
        },
        {
          id: 'ml-notif', dossier: 'inbox', contact: null, societe: 'atelier', canal: 'EMAIL', localMode: 'OFF', localRevision: 'loc-9',
          objet: 'HeyForm — nouvelle réponse au formulaire « Demande de devis »',
          correspondants: 'Notifications HeyForm', date: 'hier', nonLu: false, piecesJointes: 0, messages: 1,
        },
        {
          id: 'ml-relance', dossier: 'sent', contact: 'hugo', societe: 'atelier', canal: 'EMAIL', localMode: 'INHERIT', localRevision: 'loc-2',
          objet: 'Relance — chiffrage mobilier bureaux Erdre',
          correspondants: 'vous, Hugo Barret', date: '27 oct.', nonLu: false, piecesJointes: 1, messages: 1,
        },
        {
          id: 'ml-brouillon', dossier: 'drafts', contact: 'lea', societe: 'atelier', canal: 'EMAIL', localMode: 'INHERIT', localRevision: 'loc-1',
          objet: 'Re: Devis D-2026-114 — vitrine Boutique Mercier',
          correspondants: 'Brouillon · Léa Mercier', date: '10:04', nonLu: false, piecesJointes: 0, messages: 1,
        },
      ],
      contenus: {
        'ml-devis': {
          participants: { de: 'Léa Mercier <lea.mercier@boutique-mercier.fr>', a: ['contact@atelier-fontaine.fr'], cc: ['sophie.vidal@boutique-mercier.fr'], cci: [] },
          messages: [
            {
              id: 'e1', auteur: 'Léa Mercier', adresse: 'lea.mercier@boutique-mercier.fr', date: 'mercredi 29 octobre, 17:12',
              corps: [
                'Bonjour,',
                'Merci pour le devis D-2026-114. La hauteur sous plafond est bien de 2,60 m, donc le point 3 est à ajuster.',
                'Je mets Sophie en copie, elle suit le planning de la boutique.',
              ],
              pj: [],
            },
            {
              id: 'e2', auteur: 'Camille Rousseau', adresse: 'contact@atelier-fontaine.fr', date: 'jeudi 30 octobre, 08:40', sortant: true,
              corps: [
                'Bonjour Léa,',
                'Voici le devis corrigé avec la hauteur réelle et le plan coté correspondant.',
                'La pose reste possible le 12 novembre si la validation nous parvient avant vendredi.',
              ],
              pj: ['md-devis', 'md-plan'],
            },
            {
              id: 'e3', auteur: 'Léa Mercier', adresse: 'lea.mercier@boutique-mercier.fr', date: 'jeudi 30 octobre, 09:58',
              corps: ['C’est parfait. Je fais signer aujourd’hui et je vous confirme la date.'],
              citation: 'Le 30 octobre à 08:40, Camille Rousseau a écrit : Voici le devis corrigé avec la hauteur réelle…',
              pj: [],
            },
          ],
        },
        'ml-pose': {
          participants: { de: 'Hugo Barret <h.barret@barret-fils.fr>', a: ['contact@atelier-fontaine.fr'], cc: [], cci: [] },
          messages: [
            { id: 'e1', auteur: 'Hugo Barret', adresse: 'h.barret@barret-fils.fr', date: 'mercredi 29 octobre, 14:02', corps: ['Bonjour, quelles sont vos disponibilités en semaine 46 pour la pose du comptoir ?'], pj: [] },
            { id: 'e2', auteur: 'Hugo Barret', adresse: 'h.barret@barret-fils.fr', date: 'mercredi 29 octobre, 18:30', corps: ['Je relance, le chantier démarre lundi.'], pj: [] },
          ],
        },
        'ml-notif': {
          participants: { de: 'HeyForm <notifications@heyform.local>', a: ['contact@atelier-fontaine.fr'], cc: [], cci: [] },
          messages: [
            { id: 'e1', auteur: 'Notifications HeyForm', adresse: 'notifications@heyform.local', date: 'mercredi 29 octobre, 10:11', corps: ['Une nouvelle réponse au formulaire « Demande de devis » a été enregistrée.', 'Cette notification technique est classée hors demande commerciale : la réponse elle-même est le reçu à qualifier.'], pj: [] },
          ],
        },
        'ml-relance': {
          participants: { de: 'contact@atelier-fontaine.fr', a: ['h.barret@barret-fils.fr'], cc: [], cci: [] },
          messages: [
            { id: 'e1', auteur: 'Camille Rousseau', adresse: 'contact@atelier-fontaine.fr', date: 'lundi 27 octobre, 11:20', sortant: true, corps: ['Bonjour Hugo, je reviens vers vous sur le chiffrage du mobilier des bureaux Erdre.'], pj: ['md-devis'] },
          ],
        },
        'ml-brouillon': {
          participants: { de: 'contact@atelier-fontaine.fr', a: ['lea.mercier@boutique-mercier.fr'], cc: ['sophie.vidal@boutique-mercier.fr'], cci: [] },
          messages: [
            { id: 'e1', auteur: 'Camille Rousseau', adresse: 'contact@atelier-fontaine.fr', date: 'brouillon enregistré à 10:04', sortant: true, brouillon: true, corps: ['Bonjour Léa, merci pour la validation. Je confirme la pose du 12 novembre et je joins le planning de l’équipe.'], pj: [] },
          ],
        },
      },
      brouillons: {
        'ml-pose': {
          id: 'dr-131', state: 'READY', policyRevision: 'pol-17',
          text: 'Bonjour Hugo, nous sommes disponibles le mardi 11 et le jeudi 13 novembre. Dites-moi ce qui vous arrange et je bloque l’équipe.',
        },
        'ml-devis': {
          id: 'dr-134', state: 'READY', policyRevision: 'pol-17',
          text: 'Bonjour Léa, merci pour votre retour. Je confirme la hauteur corrigée de 2,60 m sur le devis D-2026-114 '
            + 'et je maintiens la pose au 12 novembre. Sophie reste en copie pour le planning de la boutique.',
        },
      },
    },
    verdure: {
      mailboxId: 'mb-verdure-1', adresse: 'bonjour@verdure-associes.fr',
      dossiers: [
        { id: 'inbox', role: 'INBOX', label: 'Réception', nonLus: 1, total: 9 },
        { id: 'sent', role: 'SENT', label: 'Envoyés', nonLus: 0, total: 12 },
        { id: 'drafts', role: 'DRAFTS', label: 'Brouillons', nonLus: 0, total: 0 },
        { id: 'archive', role: 'ARCHIVE', label: 'Archives', nonLus: 0, total: 38 },
        { id: 'trash', role: 'TRASH', label: 'Corbeille', nonLus: 0, total: 2 },
      ],
      fils: [
        { id: 'ml-tilleuls', dossier: 'inbox', contact: 'sofia', societe: 'verdure', canal: 'EMAIL', localMode: 'INHERIT', localRevision: 'loc-1', objet: 'Entretien annuel — copropriété Les Tilleuls', correspondants: 'Sofia Nguyen', date: '08:22', nonLu: true, piecesJointes: 0, messages: 1 },
      ],
      contenus: {
        'ml-tilleuls': {
          participants: { de: 'Sofia Nguyen <s.nguyen@les-tilleuls.fr>', a: ['bonjour@verdure-associes.fr'], cc: [], cci: [] },
          messages: [
            { id: 'e1', auteur: 'Sofia Nguyen', adresse: 's.nguyen@les-tilleuls.fr', date: 'jeudi 30 octobre, 08:22', corps: ['Bonjour, le conseil syndical souhaite reconduire le contrat d’entretien pour l’année prochaine.'], pj: [] },
          ],
        },
      },
      brouillons: {},
    },
  },
};
