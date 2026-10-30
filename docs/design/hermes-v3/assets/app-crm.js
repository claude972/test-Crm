/* Hermès V3 — écrans CRM : tableau de bord, vue commune, réceptions,
   pipeline, campagne et centre Réglages. Données fictives, aucune API. */

(function () {
  'use strict';

  const { el, puce, puceSimule, libelleConnexion, politique, aller, ui, D, etatVide, entete, message, MODE_FR } = window.H;

  const euros = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
  const stageLabel = (id) => (D.stages.find((s) => s.id === id) || { label: id }).label;

  const SOURCE_LIB = { FORM: 'Formulaire', WHATSAPP: 'WhatsApp', EMAIL: 'E-mail', SCRAPING: 'Collecte' };
  const CLASSE_LIB = {
    TO_QUALIFY: 'À qualifier',
    COMMERCIAL_REQUEST: 'Demande commerciale',
    CUSTOMER_REPLY: 'Réponse client',
    TECHNICAL: 'Notification technique',
    SPAM: 'Non sollicité',
    REVIEW_REQUIRED: 'Revue requise',
  };
  const QUALIF_LIB = {
    PENDING: 'En attente', QUALIFIED: 'Qualifié', REJECTED: 'Rejeté', REVIEW_REQUIRED: 'Revue requise',
  };

  /* « À qualifier » a un sens unique dans toute la maquette : une demande
     encore ouverte ou une identité à trancher. Une réponse de client rattachée
     à une affaire existante n'attend aucune qualification. */
  const aQualifier = (r) => r.classification === 'TO_QUALIFY'
    || r.classification === 'REVIEW_REQUIRED'
    || (r.classification === 'COMMERCIAL_REQUEST' && r.qualification === 'PENDING');

  /* Tous les compteurs viennent des mêmes fixtures que les écrans de détail :
     un chiffre du tableau de bord se retrouve à l'identique dans le board et
     dans la liste des reçus. */
  function indicateurs(id) {
    const aff = D.affaires.filter((a) => a.societe === id);
    const retard = aff.filter((a) => a.retard).length;
    const attente = D.receptions.filter((r) => r.societe === id && aQualifier(r));
    const revue = attente.filter((r) => r.classification === 'REVIEW_REQUIRED').length;
    const etapes = aff.reduce((liste, a) => (liste.indexOf(a.stage) === -1 ? liste.concat([a.stage]) : liste), []);
    return [
      { label: 'Affaires ouvertes', valeur: String(aff.length),
        detail: aff.length ? 'réparties sur ' + etapes.length + ' étape' + (etapes.length > 1 ? 's' : '') : 'aucune affaire' },
      { label: 'Reçus à qualifier', valeur: String(attente.length),
        detail: revue ? 'dont ' + revue + ' en revue' : 'aucun en revue' },
      { label: 'Prochaines actions', valeur: String(aff.length),
        detail: retard ? 'dont ' + retard + ' en retard' : 'aucune en retard' },
      { label: 'Taux de réponse', valeur: null, detail: 'non mesuré — aucun suivi activé' },
    ];
  }

  function lienEcran(label, modif, classe) {
    const a = el('a', classe || 'lien', label);
    a.href = '#';
    a.addEventListener('click', (e) => { e.preventDefault(); aller(modif); });
    return a;
  }

  function bloc(titre, sousTitre) {
    const n = el('section', 'bloc');
    const h = el('header', 'bloc-entete');
    h.append(el('h2', 'bloc-titre', titre));
    if (sousTitre) h.append(el('p', 'bloc-sous', sousTitre));
    n.append(h);
    return n;
  }

  /* ---------- tableau de bord ---------- */

  function ecranDashboard(v) {
    const frag = document.createDocumentFragment();
    const s = D.societes[v.societe];
    frag.append(entete(s.nom, s.metier));

    const affaires = D.affaires.filter((a) => a.societe === v.societe);

    const resume = bloc('Pipeline commercial', 'Étapes natives de l’objet Opportunity');
    const etapes = el('div', 'etapes');
    D.stages.forEach((st) => {
      const lot = affaires.filter((a) => a.stage === st.id);
      const c = el('article', 'etape');
      c.append(el('span', 'etape-nom', st.label));
      c.append(el('span', 'etape-valeur', String(lot.length)));
      c.append(el('span', 'etape-montant', euros(lot.reduce((t, a) => t + a.montant, 0))));
      etapes.append(c);
    });
    const cible = el('article', 'etape etape-cible');
    cible.append(el('span', 'etape-nom', 'Gagné / perdu'));
    cible.append(el('span', 'etape-valeur', '—'));
    cible.append(el('span', 'etape-montant', 'cible à définir'));
    etapes.append(cible);
    resume.append(etapes);
    resume.append(el('p', 'note', 'Ces étapes sont celles du CRM. Aucune n’est réinterprétée en « gagné » : '
      + 'une issue explicite reste à créer avant d’exister.'));
    resume.append(lienEcran('Ouvrir le board', { ecran: 'pipeline' }, 'bouton bouton-discret'));
    frag.append(resume);

    const indic = el('div', 'indicateurs');
    indicateurs(v.societe).forEach((i) => {
      const c = el('article', 'indicateur' + (i.valeur === null ? ' indicateur-vide' : ''));
      c.append(el('span', 'indicateur-label', i.label));
      c.append(el('span', 'indicateur-valeur', i.valeur === null ? 'Non mesurable' : i.valeur));
      c.append(el('span', 'indicateur-detail', i.detail));
      indic.append(c);
    });
    frag.append(indic);

    const suivi = bloc('Affaires à suivre', 'Prochaine action portée par une tâche native');
    const t = el('table', 'tableau');
    const thead = el('thead');
    const trh = el('tr');
    ['Affaire', 'Contact', 'Étape', 'Montant', 'Prochaine action', 'Provenance'].forEach((h) => trh.append(el('th', null, h)));
    thead.append(trh);
    t.append(thead);
    const tb = el('tbody');
    affaires.forEach((a) => {
      const tr = el('tr');
      tr.append(el('td', 'cellule-forte', a.nom));
      const tdc = el('td');
      tdc.append(lienEcran(D.contacts[a.contact].nom, { ecran: 'receptions', societe: v.societe }));
      tr.append(tdc);
      const tds = el('td');
      tds.append(puce(stageLabel(a.stage), 'etape-puce'));
      tr.append(tds);
      tr.append(el('td', null, euros(a.montant)));
      const tda = el('td');
      tda.append(el('span', 'action-nom', a.prochaineAction));
      tda.append(el('span', a.retard ? 'action-date action-retard' : 'action-date', a.echeance + (a.retard ? ' · en retard' : '')));
      tr.append(tda);
      const tdp = el('td');
      if (a.recu) {
        const r = D.receptions.find((x) => x.id === a.recu);
        tdp.append(lienEcran(SOURCE_LIB[r.source] + ' · ' + r.id, { ecran: 'receptions', societe: v.societe }));
      } else tdp.append(el('span', 'texte-faible', 'saisie manuelle'));
      tr.append(tdp);
      tb.append(tr);
    });
    t.append(tb);
    suivi.append(t);
    frag.append(suivi);

    const autres = bloc('Mes autres sociétés', 'Lecture seule. Ouvrir une société pour y travailler.');
    autres.append(lienEcran('Voir la vue commune', { ecran: 'commune' }, 'bouton bouton-discret'));
    frag.append(autres);
    return frag;
  }

  /* ---------- vue commune ---------- */

  function ecranCommune(v) {
    const frag = document.createDocumentFragment();
    frag.append(entete('Mes sociétés', 'Lecture seule. Ouvrir une société pour y travailler.'));
    const b = bloc('Récapitulatif autorisé', 'Seules les sociétés dont vous êtes membre apparaissent.');
    const t = el('table', 'tableau');
    const thead = el('thead');
    const trh = el('tr');
    ['Société', 'Affaires', 'Reçus à qualifier', 'Prochaines actions', 'Accès'].forEach((h) => trh.append(el('th', null, h)));
    thead.append(trh);
    t.append(thead);
    const tb = el('tbody');
    Object.values(D.societes).forEach((s) => {
      const tr = el('tr');
      const td0 = el('td', 'cellule-forte');
      td0.append(document.createTextNode(s.nom));
      if (s.id === v.societe) td0.append(puce('Société active', 'etat'));
      tr.append(td0);
      tr.append(el('td', null, String(D.affaires.filter((a) => a.societe === s.id).length)));
      tr.append(el('td', null, String(D.receptions.filter((r) => r.societe === s.id && aQualifier(r)).length)));
      tr.append(el('td', null, indicateurs(s.id)[2].valeur));
      const tda = el('td');
      tda.append(lienEcran('Ouvrir', { ecran: 'dashboard', societe: s.id }, 'bouton bouton-discret'));
      tr.append(tda);
      tb.append(tr);
    });
    t.append(tb);
    b.append(t);
    b.append(el('p', 'note', 'Cette vue agrège des compteurs autorisés. Elle n’expose ni message, ni fiche, ni connexion d’une autre société, '
      + 'et n’ouvre aucun droit d’écriture. Un total partiel serait signalé comme tel plutôt qu’affiché comme zéro.'));
    frag.append(b);
    return frag;
  }

  /* ---------- réceptions ---------- */

  function ecranReceptions(v) {
    const frag = document.createDocumentFragment();
    const recus = D.receptions.filter((r) => r.societe === v.societe);
    frag.append(entete('Réceptions', 'Quatre axes distincts : réception, qualification, étape d’affaire, opposition'));

    const rappel = el('p', 'note note-cadre');
    rappel.textContent = 'Une réception n’est pas un prospect, et un prospect qualifié n’est pas une affaire. '
      + 'Aucune opportunité n’est créée automatiquement à l’arrivée d’un message.';
    frag.append(rappel);

    const b = bloc('Reçus', recus.length + ' reçus conservés avec leur provenance');
    const t = el('table', 'tableau tableau-receptions');
    const thead = el('thead');
    const trh = el('tr');
    ['Reçu', 'Provenance', 'Classement', 'Qualification', 'Contact', 'Affaire', 'Prochaine action'].forEach((h) => trh.append(el('th', null, h)));
    thead.append(trh);
    t.append(thead);
    const tb = el('tbody');
    recus.forEach((r) => {
      const tr = el('tr');
      const td0 = el('td', 'cellule-forte');
      td0.append(el('span', null, r.id));
      td0.append(el('span', 'texte-faible', r.recuLe));
      tr.append(td0);
      const tdp = el('td');
      tdp.append(puce(SOURCE_LIB[r.source], 'source'));
      tdp.append(el('span', 'texte-faible', r.connexion));
      tdp.append(el('code', 'ref-externe', r.externalEventId));
      tr.append(tdp);
      const tdc = el('td');
      tdc.append(puce(CLASSE_LIB[r.classification], 'classe'));
      tdc.append(el('span', 'texte-faible', r.resume));
      tr.append(tdc);
      const tdq = el('td');
      tdq.append(puce(QUALIF_LIB[r.qualification], 'qualif'));
      if (r.raisonCode) tdq.append(el('code', 'code-erreur', r.raisonCode));
      tr.append(tdq);
      const tdct = el('td');
      if (r.contact) {
        const c = D.contacts[r.contact];
        tdct.append(el('span', null, c.nom));
        tdct.append(el('span', 'texte-faible', c.societeCliente));
        const opp = D.oppositions.find((o) => o.contact === r.contact && o.societe === r.societe);
        if (opp) tdct.append(puce('Opposition marketing', 'opposition'));
      } else tdct.append(el('span', 'texte-faible', 'aucune fiche rattachée'));
      tr.append(tdct);
      const tda = el('td');
      if (r.affaire) {
        const a = D.affaires.find((x) => x.id === r.affaire);
        tda.append(lienEcran(a.nom, { ecran: 'pipeline' }));
        tda.append(el('span', 'texte-faible', stageLabel(a.stage)));
      } else tda.append(el('span', 'texte-faible', 'aucune'));
      tr.append(tda);
      tr.append(el('td', null, r.prochaineAction));
      tb.append(tr);
    });
    t.append(tb);
    b.append(t);

    const actions = el('div', 'actions');
    [['Qualifier le reçu', 'La qualification demande une finalité, une notice et un acteur vivant. Elle ne crée pas d’affaire par elle-même.'],
     ['Affecter à un membre', 'L’affectation vise un membre actif de cette société uniquement.'],
     ['Créer une affaire', 'La création d’une Opportunity native est une action explicite, idempotente, réservée à un reçu qualifié.']]
      .forEach(([label, explic]) => {
        const btn = el('button', 'bouton', label);
        btn.type = 'button';
        btn.title = explic;
        btn.addEventListener('click', () => message(explic + ' Rien n’est écrit dans la maquette.'));
        actions.append(btn);
      });
    actions.append(puceSimule('aucune écriture, aucune fiche native touchée'));
    b.append(actions);
    frag.append(b);

    if (D.oppositions.filter((o) => o.societe === v.societe).length) {
      const o = bloc('Oppositions marketing', 'Preuve durable, distincte de l’étape commerciale et du mode du bot');
      const liste = el('ul', 'liste-simple');
      D.oppositions.filter((x) => x.societe === v.societe).forEach((x) => {
        const li = el('li');
        li.append(el('strong', null, D.contacts[x.contact].nom));
        li.append(document.createTextNode(' · ' + x.portee + ' · depuis le ' + x.le + ' · ' + x.origine));
        liste.append(li);
      });
      o.append(liste);
      o.append(el('p', 'note', 'Une opposition exclut les émissions concernées. Elle ne modifie ni l’étape de l’affaire, ni l’historique, '
        + 'et survit à un réimport du même contact.'));
      frag.append(o);
    }
    return frag;
  }

  /* ---------- pipeline ---------- */

  function ecranPipeline(v) {
    const frag = document.createDocumentFragment();
    const affaires = D.affaires.filter((a) => a.societe === v.societe);
    frag.append(entete('Pipeline', D.societes[v.societe].nom + ' · ' + affaires.length + ' affaires'));

    if (ui.etapeDeplacee) {
      const n = el('p', 'note note-succes');
      n.textContent = ui.etapeDeplacee;
      frag.append(n);
    }

    const board = el('div', 'board');
    board.setAttribute('aria-label', 'Affaires par étape');
    D.stages.forEach((st) => {
      const col = el('section', 'colonne');
      const h = el('header', 'colonne-entete');
      h.append(el('h2', 'colonne-titre', st.label));
      col.append(h);
      const lot = affaires.filter((a) => a.stage === st.id);
      h.append(el('span', 'colonne-compte', lot.length + ' · ' + euros(lot.reduce((t, a) => t + a.montant, 0))));
      if (!lot.length) col.append(etatVide('Aucune affaire', 'Rien à cette étape.'));
      lot.forEach((a) => {
        const c = el('article', 'carte-affaire');
        c.append(el('h3', 'carte-titre', a.nom));
        const contact = D.contacts[a.contact];
        c.append(el('p', 'carte-contact', contact.nom + ' · ' + contact.societeCliente));
        c.append(el('p', 'carte-montant', euros(a.montant) + ' · ' + a.devise));
        const act = el('p', 'carte-action');
        act.append(el('span', 'action-nom', a.prochaineAction));
        act.append(el('span', a.retard ? 'action-date action-retard' : 'action-date', a.echeance + (a.retard ? ' · en retard' : '')));
        c.append(act);
        c.append(el('p', 'carte-proprietaire', 'Propriétaire : ' + a.proprietaire));
        if (a.recu) {
          const r = D.receptions.find((x) => x.id === a.recu);
          const p = el('p', 'carte-provenance');
          p.append(document.createTextNode('Provenance : '));
          p.append(lienEcran(SOURCE_LIB[r.source] + ' · ' + r.id, { ecran: 'receptions' }));
          c.append(p);
        }
        const lab = el('label', 'sr-seulement', 'Déplacer « ' + a.nom + ' » vers une autre étape');
        lab.setAttribute('for', 'etape-' + a.id);
        const sel = el('select', 'champ champ-mini');
        sel.id = 'etape-' + a.id;
        D.stages.forEach((s2) => {
          const o = el('option', null, s2.label);
          o.value = s2.id;
          if (s2.id === a.stage) o.selected = true;
          sel.append(o);
        });
        sel.addEventListener('change', () => {
          ui.etapeDeplacee = '« ' + a.nom + ' » passerait de ' + stageLabel(a.stage) + ' à ' + stageLabel(sel.value)
            + '. Déplacement simulé : la maquette n’écrit rien, et un mouvement visuel ne prouve pas la persistance. '
            + 'Le produit confirmerait après relecture serveur, ou annulerait la carte en cas d’échec.';
          sel.value = a.stage;
          window.H.aller({});
        });
        c.append(lab, sel, puceSimule('aucune mutation native n’est envoyée'));
        col.append(c);
      });
      board.append(col);
    });

    const cible = el('section', 'colonne colonne-cible');
    const hc = el('header', 'colonne-entete');
    hc.append(el('h2', 'colonne-titre', 'Issue de l’affaire'));
    hc.append(el('span', 'colonne-compte', 'à définir'));
    cible.append(hc);
    cible.append(etatVide('Gagné / perdu n’existe pas encore',
      'Les métadonnées natives s’arrêtent à CUSTOMER. Une issue explicite doit être ajoutée officiellement, sans renommer les valeurs existantes.'));
    board.append(cible);

    frag.append(board);
    frag.append(el('p', 'note', 'Chaque carte porte son contact, son montant, sa prochaine action et la provenance du reçu d’origine quand il y en a un.'));

    // Correspondance avec les valeurs internes du CRM : utile à un
    // administrateur, hors du parcours normal.
    const det = el('details', 'detail-admin');
    det.append(el('summary', null, 'Correspondance avec les valeurs internes du CRM'));
    const dl = el('dl', 'definitions');
    D.stages.forEach((st) => { dl.append(el('dt', null, st.label), el('dd', null, st.id)); });
    dl.append(el('dt', null, 'Issue de l’affaire'), el('dd', null, 'aucune valeur interne existante'));
    det.append(dl);
    det.append(el('p', 'note', 'Ces valeurs ne sont pas renommées : une issue gagné/perdu devra être ajoutée sans casser les cinq existantes.'));
    frag.append(det);
    return frag;
  }

  /* ---------- campagne ---------- */

  function capacite(label, cap, explication) {
    const n = el('div', 'capacite' + (cap.allowed ? '' : ' capacite-refus'));
    n.append(el('span', 'capacite-nom', label));
    n.append(el('span', 'capacite-etat', cap.allowed ? 'Disponible' : 'Indisponible'));
    if (cap.reasonCode) n.append(el('code', 'code-erreur', cap.reasonCode));
    n.append(el('span', 'texte-faible', explication));
    return n;
  }

  function ecranCampagne(v) {
    const frag = document.createDocumentFragment();
    const c = D.campagne;
    if (v.societe !== c.societe) {
      frag.append(entete('Campagne', D.societes[v.societe].nom));
      frag.append(etatVide('Aucune campagne pour cette société',
        'Les campagnes, audiences et identités d’expéditeur sont cloisonnées par société.'));
      return frag;
    }
    frag.append(entete(c.nom, 'Campagne B2B · état ' + c.etat));

    const ident = bloc('Expéditeur', 'La boîte réellement autorisée, pas seulement le domaine');
    c.identites.forEach((i) => {
      const n = el('article', 'identite' + (i.id === c.identiteChoisie ? ' actif' : ''));
      const haut = el('div', 'identite-haut');
      haut.append(el('span', 'identite-adresse', i.fromAddress));
      haut.append(puce(i.state === 'VERIFIED' ? 'Vérifiée' : i.state === 'REVOKED' ? 'Révoquée' : 'Non vérifiée',
        i.state === 'VERIFIED' ? 'ok' : 'alerte'));
      if (i.id === c.identiteChoisie) haut.append(puce('Sélectionnée', 'etat'));
      n.append(haut);
      n.append(el('p', 'texte-faible', i.mailbox));
      n.append(el('p', 'texte-faible', i.preuve));
      if (i.alias.length) n.append(el('p', 'texte-faible', 'Alias explicitement autorisés : ' + i.alias.join(', ')));
      if (i.replyTo) n.append(el('p', 'texte-faible', 'Réponses vers ' + i.replyTo));
      if (i.state !== 'VERIFIED') n.append(el('code', 'code-erreur', 'SENDER_IDENTITY_NOT_AUTHORIZED'));
      ident.append(n);
    });
    ident.append(el('p', 'note', 'Même domaine, adresse affichée, identifiant SMTP et boîte réellement déléguée sont quatre faits distincts. '
      + 'Un alias hors liste autorisée est refusé même dans le bon domaine.'));
    frag.append(ident);

    const caps = bloc('Capacités', 'Calculées côté serveur dans le produit · relevé fictif du ' + c.capacites.checkedAt);
    caps.append(capacite('Aperçu', c.capacites.preview, 'Aperçu destinataire sans aucune émission.'));
    caps.append(capacite('Test synthétique', c.capacites.testSynthetic, 'Restreint à des destinations de recette. Un test est une vraie émission, jamais vers un prospect.'));
    caps.append(capacite('Programmation', c.capacites.schedule, 'Programmer n’envoie pas : l’autorisation est relue au départ.'));
    caps.append(capacite('Envoi', c.capacites.send, 'La boîte exacte, la licence et le transport ne sont pas vérifiés : la campagne reste en brouillon.'));
    caps.append(el('p', 'note', 'Un booléen d’interface n’autorise rien. Ces états sont fictifs et le resteront tant que la configuration réelle n’est pas établie.'));
    frag.append(caps);

    const aud = bloc('Audience', c.audience.retenus + ' destinataires retenus');
    const t = el('table', 'tableau');
    const thead = el('thead');
    const trh = el('tr');
    ['Motif d’exclusion', 'Fiches'].forEach((h) => trh.append(el('th', null, h)));
    thead.append(trh);
    t.append(thead);
    const tb = el('tbody');
    c.audience.exclusions.forEach((x) => {
      const tr = el('tr');
      tr.append(el('td', null, x.motif));
      tr.append(el('td', null, String(x.nombre)));
      tb.append(tr);
    });
    t.append(tb);
    aud.append(t);
    const vars = el('ul', 'liste-simple');
    c.audience.variables.forEach((x) => {
      const li = el('li');
      li.append(el('code', null, '{{' + x.nom + '}}'));
      li.append(document.createTextNode(x.manquant ? ' — manquante sur ' + x.manquant + ' fiches' : ' — complète'));
      if (x.manquant) li.append(puce('à compléter', 'alerte'));
      liste_ajout(li, vars);
    });
    aud.append(el('h3', 'bloc-sous-titre', 'Personnalisation'), vars);
    aud.append(el('p', 'note', 'Les exclusions sont revérifiées au départ, y compris une opposition enregistrée après l’aperçu ou la programmation.'));
    frag.append(aud);

    const parcours = bloc('Parcours', 'Objet : ' + c.objet);
    const actions = el('div', 'actions');
    const mkAction = (label, explic, actif) => {
      const b = el('button', 'bouton' + (actif ? '' : ' '), label);
      b.type = 'button';
      b.disabled = !actif;
      b.title = explic;
      b.addEventListener('click', () => message(explic));
      return b;
    };
    actions.append(mkAction('Aperçu destinataire', 'Aperçu sans émission : aucun message ne quitte le CRM.', c.capacites.preview.allowed));
    actions.append(mkAction('Envoyer un test synthétique',
      'Un test est une émission réelle dans le produit, restreinte à une liste de destinations de recette. Rien n’est émis depuis cette maquette.',
      c.capacites.testSynthetic.allowed));
    actions.append(mkAction('Programmer', 'Programmée au ' + c.programmation.date + ' à ' + c.programmation.heure
      + ' (' + c.programmation.fuseau + '). L’identité et les exclusions sont relues au dernier moment évitable.', c.capacites.schedule.allowed));
    actions.append(mkAction('Annuler la programmation',
      'L’annulation retire les départs encore évitables. Elle ne rappelle pas un message déjà accepté par le serveur SMTP.', true));
    const envoi = mkAction('Envoyer la campagne',
      'Envoi indisponible : capacité serveur non vérifiée (CAPABILITY_UNAVAILABLE). La campagne reste en brouillon.', c.capacites.send.allowed);
    actions.append(envoi);
    actions.append(puceSimule('aucune émission, aucun destinataire réel'));
    parcours.append(actions);
    frag.append(parcours);

    const res = bloc('Résultats', 'Acceptation, livraison et ouverture sont des faits distincts');
    c.resultats.forEach((r) => {
      const n = el('div', 'resultat');
      n.append(el('span', 'resultat-label', r.label));
      n.append(el('span', 'resultat-valeur' + (r.available ? '' : ' resultat-inconnu'), r.available ? String(r.value) : 'Inconnu'));
      n.append(el('code', 'resultat-preuve', r.evidence));
      n.append(el('span', 'texte-faible', r.note));
      res.append(n);
    });
    res.append(el('p', 'note', 'Inconnu n’est pas zéro. Un résultat incertain après remise au transport reste incertain : '
      + 'il est réconcilié, jamais réémis à l’aveugle.'));
    frag.append(res);
    return frag;
  }

  function liste_ajout(li, parent) { parent.append(li); }

  /* ---------- réglages ---------- */

  const ONGLETS = [
    { id: 'societe', label: 'Société et membres' },
    { id: 'connexions', label: 'Connexions' },
    { id: 'politiques', label: 'Politiques du bot' },
  ];

  function ecranReglages(v) {
    const frag = document.createDocumentFragment();
    const onglet = ONGLETS.some((o) => o.id === v.onglet) ? v.onglet : 'societe';
    const s = D.societes[v.societe];
    frag.append(entete('Réglages', s.nom + ' · centre unique des comptes, connexions et politiques'));

    const nav = el('div', 'onglets');
    nav.setAttribute('role', 'tablist');
    ONGLETS.forEach((o) => {
      const a = el('a', 'onglet' + (o.id === onglet ? ' actif' : ''), o.label);
      a.href = '?ecran=reglages&societe=' + v.societe + '&onglet=' + o.id;
      a.setAttribute('role', 'tab');
      a.setAttribute('aria-selected', o.id === onglet ? 'true' : 'false');
      a.addEventListener('click', (e) => { e.preventDefault(); aller({ ecran: 'reglages', onglet: o.id }); });
      nav.append(a);
    });
    frag.append(nav);

    if (onglet === 'societe') {
      const b = bloc('Société exploitante', 'Une société exploitante est un workspace, pas une fiche Company cliente');
      const dl = el('dl', 'definitions');
      [['Nom', s.nom], ['Activité', s.metier], ['Boîte principale', s.boite]].forEach(([k, val]) => {
        dl.append(el('dt', null, k), el('dd', null, val));
      });
      b.append(dl);
      frag.append(b);

      const m = bloc('Membres', 'Les droits s’arrêtent à cette société');
      const t = el('table', 'tableau');
      const thead = el('thead');
      const trh = el('tr');
      ['Membre', 'Rôle', 'État'].forEach((h) => trh.append(el('th', null, h)));
      thead.append(trh);
      t.append(thead);
      const tb = el('tbody');
      D.reglages[v.societe].membres.forEach((mb) => {
        const tr = el('tr');
        tr.append(el('td', 'cellule-forte', mb.nom));
        tr.append(el('td', null, mb.role));
        tr.append(el('td', null, mb.etat));
        tb.append(tr);
      });
      t.append(tb);
      m.append(t);
      m.append(el('p', 'note', 'Un réglage de cette société n’a aucun effet sur l’autre. Un membre en lecture seule ne peut ni écrire, ni voir les connexions en détail.'));
      frag.append(m);
    }

    if (onglet === 'connexions') {
      const b = bloc('Connexions', 'Tout se règle ici : aucun formulaire de secret ailleurs dans le produit');
      D.reglages[v.societe].connexions.forEach((c) => {
        const n = el('article', 'connexion etat-' + c.etat);
        const haut = el('div', 'connexion-haut');
        haut.append(el('span', 'connexion-nom', c.nom));
        haut.append(el('span', 'connexion-protocole', c.protocole));
        n.append(haut);
        n.append(el('span', 'connexion-etat', libelleConnexion(c)));
        if (c.note) n.append(el('span', 'texte-faible', c.note));
        const actions = el('div', 'actions');
        const test = el('button', 'bouton bouton-discret', 'Tester la connexion');
        test.type = 'button';
        test.addEventListener('click', () => message('Un test réel vérifierait l’accès côté serveur et daterait le résultat. '
          + 'Aucun test n’est exécuté depuis la maquette.'));
        actions.append(test, puceSimule('aucune connexion n’est ouverte'));
        n.append(actions);
        b.append(n);
      });
      b.append(el('p', 'note', 'Aucun identifiant n’est saisi ni affiché ici. « Configuré, à vérifier » n’est pas « connecté » : '
        + 'seule une vérification datée l’est. « Connexion désactivée » est une décision d’administrateur, distincte d’un bot coupé.'));
      frag.append(b);
    }

    if (onglet === 'politiques') {
      const b = bloc('Politiques du bot par canal', 'Valeur par défaut héritée par les fils de la société');
      ['WHATSAPP', 'EMAIL'].forEach((canal) => {
        const p = politique(v.societe, canal, null, v.scenario);
        const n = el('article', 'politique');
        const haut = el('div', 'connexion-haut');
        haut.append(el('span', 'connexion-nom', canal === 'WHATSAPP' ? 'WhatsApp' : 'E-mail'));
        haut.append(puce(MODE_FR[p.companyMode], 'mode'));
        n.append(haut);
        n.append(el('p', 'texte-faible', window.H.MODE_EXPLIC[p.companyMode]));
        n.append(el('p', 'texte-faible', 'Définie par ' + p.deleguePar + ' le ' + p.le));
        const lab = el('label', 'sr-seulement', 'Politique du canal ' + canal);
        lab.setAttribute('for', 'pol-' + canal);
        const sel = el('select', 'champ');
        sel.id = 'pol-' + canal;
        ['AUTO', 'ASSISTED', 'OFF'].forEach((mode) => {
          const o = el('option', null, MODE_FR[mode]);
          o.value = mode;
          if (mode === p.companyMode) o.selected = true;
          sel.append(o);
        });
        sel.addEventListener('change', () => {
          const choisi = sel.value;
          sel.value = p.companyMode;
          message(choisi === 'AUTO'
            ? 'Passer ce canal en « Automatique » demande une autorisation explicite. Les messages déjà reçus ne sont pas repris.'
            : 'Réglage « ' + MODE_FR[choisi] + ' » simulé. Les conversations réglées plus largement cesseraient aussitôt de l’être.');
        });
        n.append(lab, sel, puceSimule('aucune politique n’est écrite'));
        b.append(n);
      });

      const t = el('table', 'tableau');
      const thead = el('thead');
      const trh = el('tr');
      ['Réglage de la société', 'Conversation : suivre', 'Conversation : automatique', 'Conversation : assisté', 'Conversation : arrêt'].forEach((h) => trh.append(el('th', null, h)));
      thead.append(trh);
      t.append(thead);
      const tb = el('tbody');
      [['Automatique', 'Automatique', 'Automatique', 'Assisté', 'Arrêt complet'],
       ['Assisté', 'Assisté', 'refusé', 'Assisté', 'Arrêt complet'],
       ['Arrêt complet', 'Arrêt complet', 'refusé', 'refusé', 'Arrêt complet']].forEach((ligne) => {
        const tr = el('tr');
        ligne.forEach((cell, i) => {
          const td = el('td', i === 0 ? 'cellule-forte' : (cell === 'refusé' ? 'cellule-refus' : null), cell);
          tr.append(td);
        });
        tb.append(tr);
      });
      t.append(tb);
      b.append(el('h3', 'bloc-sous-titre', 'Héritage restrictif'), t);
      b.append(el('p', 'note', 'Le réglage d’une conversation ne peut que restreindre. Une société à l’arrêt complet ne peut pas être rallumée '
        + 'depuis une conversation, et une société en « Assisté » ne permet pas un « Automatique » local.'));
      frag.append(b);
    }
    return frag;
  }

  window.ECRANS_CRM = {
    dashboard: ecranDashboard,
    commune: ecranCommune,
    receptions: ecranReceptions,
    pipeline: ecranPipeline,
    campagne: ecranCampagne,
    reglages: ecranReglages,
  };
})();
