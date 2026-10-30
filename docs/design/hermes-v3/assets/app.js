/* Hermès V3 — maquette statique.
   Aucune requête réseau, aucune API, aucun micro : getUserMedia n'est
   jamais appelé. L'enregistrement vocal est une simulation d'interface
   qui rejoue un fichier audio local déjà présent dans le dépôt. */

(function () {
  'use strict';

  const D = window.MAQUETTE;
  const ORDRE = { OFF: 0, ASSISTED: 1, AUTO: 2 };

  const el = (tag, cls, texte) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (texte !== undefined && texte !== null) n.textContent = texte;
    return n;
  };

  const puce = (texte, variante, titre) => {
    const n = el('span', 'puce' + (variante ? ' puce-' + variante : ''), texte);
    if (titre) n.title = titre;
    return n;
  };

  const puceSimule = (quoi) =>
    puce('simulé', 'simule', 'Cette commande est une démonstration d’interface : '
      + quoi + '. Aucune API n’est appelée.');

  const ETAT_CONNEXION = {
    verifie: (c) => 'Connecté, vérifié le ' + c.le,
    declare: () => 'Configuré, à vérifier',
    erreur: () => 'Connexion en erreur',
    desactivee: () => 'Connexion désactivée',
    absent: () => 'Non configuré',
  };

  const libelleConnexion = (c) => (ETAT_CONNEXION[c.etat] || ETAT_CONNEXION.absent)(c);

  const connexion = (societe, id) =>
    (D.reglages[societe].connexions || []).find((c) => c.id === id) || { id, etat: 'absent' };

  /* Les trois modes portent un nom français dans toute l'interface.
     AUTO, ASSISTED et OFF restent des valeurs internes, jamais affichées
     dans le parcours normal. */
  const MODE_FR = { AUTO: 'Automatique', ASSISTED: 'Assisté', OFF: 'Arrêt complet' };

  const MODE_EXPLIC = {
    AUTO: 'Le bot peut répondre seul aux nouveaux messages entrants.',
    ASSISTED: 'Le bot prépare des brouillons. Aucun envoi sans votre clic.',
    OFF: 'Aucun brouillon ni appel au bot. Réception et réponse humaine restent possibles.',
  };

  const MODE_LOCAL_LIB = {
    INHERIT: 'Suivre la société',
    AUTO: 'Automatique — le bot répond seul',
    ASSISTED: 'Assisté — brouillon, envoi humain',
    OFF: 'Arrêt complet — aucun bot',
  };

  /* Mode effectif = minimum restrictif entre politique société/canal et
     exception locale du fil. Une exception ne peut jamais élargir. */
  function politique(societe, canal, conv, scenario) {
    const pol = D.politiques[societe][canal];
    let companyMode = pol.mode;
    let bascule = false;
    if (scenario === 'bascule' && societe === 'atelier' && canal === 'WHATSAPP') {
      companyMode = 'ASSISTED';
      bascule = true;
    }
    const localMode = conv ? conv.localMode : 'INHERIT';
    const effectiveMode = localMode === 'INHERIT'
      ? companyMode
      : (ORDRE[localMode] <= ORDRE[companyMode] ? localMode : companyMode);

    /* Le contrat proposé ne prévoit que INHERITED, LOCAL_RESTRICTION et
       COMPANY_RESTRICTION. Il manque le cas d'une exception posée au même
       niveau que la société : elle ne restreint rien et ne peut pas être
       annoncée comme une restriction. LOCAL_SET comble ce trou ici ; l'écart
       est remonté dans la revue croisée du contrat. */
    let reasonCode;
    if (localMode === 'INHERIT') reasonCode = 'INHERITED';
    else if (ORDRE[localMode] < ORDRE[companyMode]) reasonCode = 'LOCAL_RESTRICTION';
    else if (ORDRE[localMode] === ORDRE[companyMode]) reasonCode = 'LOCAL_SET';
    else reasonCode = 'COMPANY_RESTRICTION';

    const canalConnexion = canal === 'WHATSAPP' ? connexion(societe, 'wa') : connexion(societe, 'smtp');
    const mcp = connexion(societe, 'mcp');

    const draft = effectiveMode === 'OFF'
      ? { allowed: false, reasonCode: 'BOT_POLICY_OFF', texte: 'Le mode OFF interdit tout appel au bot et invalide les brouillons.' }
      : mcp.etat !== 'verifie'
        ? { allowed: false, reasonCode: 'CAPABILITY_UNAVAILABLE', texte: 'Le serveur Hermès MCP n’est pas vérifié pour cette société.' }
        : { allowed: true, reasonCode: null, texte: null };

    const humanSend = canalConnexion.etat === 'verifie'
      ? { allowed: true, reasonCode: null, texte: null }
      : { allowed: false, reasonCode: 'MESSAGING_NOT_CONFIGURED', texte: 'La connexion de ce canal n’est pas vérifiée : ' + libelleConnexion(canalConnexion).toLowerCase() + '.' };

    const autoSend = effectiveMode === 'AUTO' && humanSend.allowed
      ? { allowed: true, reasonCode: null }
      : { allowed: false, reasonCode: effectiveMode === 'AUTO' ? 'MESSAGING_NOT_CONFIGURED' : 'BOT_POLICY_RESTRICTION' };

    return {
      canal, companyMode, localMode, effectiveMode, reasonCode, bascule,
      policyRevision: pol.revision, localRevision: conv ? conv.localRevision : null,
      deleguePar: pol.deleguePar, le: pol.le,
      draft, humanSend, autoSend,
      exceptionObsolete: reasonCode === 'COMPANY_RESTRICTION',
    };
  }

  function raisonTexte(p) {
    if (p.reasonCode === 'INHERITED') return 'hérité de la société (' + MODE_FR[p.companyMode] + ')';
    if (p.reasonCode === 'LOCAL_SET') return 'réglé sur cette conversation, au même niveau que la société';
    if (p.reasonCode === 'LOCAL_RESTRICTION') return 'restreint pour cette conversation';
    return 'plafonné par la société (' + MODE_FR[p.companyMode] + ')';
  }

  /* ---------- état d'interface, purement local ---------- */

  const ui = {
    reponse: '',
    brouillonOuvert: false,
    brouillonInsere: false,
    composeurMedia: null,
    enregistreur: null,
    envoye: null,
    etapeDeplacee: null,
    message: null,
    scenarioApplique: null,
    composeurMail: null,
    composeurMailType: null,
    envoyeAction: null,
    menuOuvert: false,
  };

  function vue() {
    const p = new URLSearchParams(location.search);
    const societe = D.societes[p.get('societe')] ? p.get('societe') : 'atelier';
    return {
      ecran: p.get('ecran') || 'dashboard',
      societe,
      fil: p.get('fil'),
      dossier: p.get('dossier') || 'inbox',
      dossierExplicite: p.has('dossier'),
      filExplicite: p.has('fil'),
      onglet: p.get('onglet'),
      scenario: p.get('scenario') || '',
    };
  }

  function aller(modif) {
    const v = Object.assign(vue(), modif);
    const p = new URLSearchParams();
    p.set('ecran', v.ecran);
    p.set('societe', v.societe);
    if (v.fil) p.set('fil', v.fil);
    if (v.ecran === 'mail' && v.dossier) p.set('dossier', v.dossier);
    if (v.onglet) p.set('onglet', v.onglet);
    if (v.scenario) p.set('scenario', v.scenario);
    const url = location.pathname + '?' + p.toString();
    try {
      history.pushState({}, '', url);
    } catch (e) {
      // Ouverte depuis le disque, l'origine est nulle et pushState est refusé.
      // L'adresse porte déjà tout l'état : une navigation complète suffit.
      location.href = url;
      return;
    }
    Object.assign(ui, {
      reponse: '', brouillonOuvert: false, brouillonInsere: false,
      composeurMedia: null, enregistreur: null, envoye: null,
      etapeDeplacee: null, message: null, scenarioApplique: null,
      composeurMail: null, composeurMailType: null, envoyeAction: null, menuOuvert: false,
    });
    rendre();
  }

  /* Les scénarios d'URL ouvrent l'écran directement dans l'état voulu, pour
     que chaque capture soit atteignable sans interaction. Appliqué une seule
     fois par destination : refermer un panneau ne le rouvre pas. */
  function appliquerScenario(v) {
    const cle = v.ecran + '|' + v.societe + '|' + (v.fil || '') + '|' + v.scenario;
    if (ui.scenarioApplique === cle) return;
    ui.scenarioApplique = cle;
    if (v.scenario === 'enregistrement') ui.enregistreur = 'encours';
    else if (v.scenario === 'preecoute') ui.enregistreur = 'preecoute';
    else if (v.scenario === 'micro-refuse') ui.enregistreur = 'refus';
    else if (v.scenario === 'media') ui.composeurMedia = 'pret';
    else if (v.scenario === 'media-refus') ui.composeurMedia = 'refus';
    else if (v.scenario === 'brouillon') ui.brouillonOuvert = true;
    else if (v.scenario === 'repondre') ui.composeurMailType = 'REPLY';
    else if (v.scenario === 'reponse-tous') ui.composeurMailType = 'REPLY_ALL';
    else if (v.scenario === 'transfert') ui.composeurMailType = 'FORWARD';
  }

  window.H = { el, puce, puceSimule, libelleConnexion, connexion, politique, raisonTexte, aller, vue, ui, D, MODE_EXPLIC, MODE_FR };

  /* ---------- coquille ---------- */

  const NAV = [
    { ecran: 'dashboard', label: 'Tableau de bord' },
    { ecran: 'wa', label: 'WhatsApp' },
    { ecran: 'mail', label: 'Boîte e-mail' },
    { ecran: 'receptions', label: 'Réceptions' },
    { ecran: 'pipeline', label: 'Pipeline' },
    { ecran: 'campagne', label: 'Campagne' },
    { ecran: 'reglages', label: 'Réglages' },
  ];

  function barre(v) {
    const b = el('nav', 'barre' + (ui.menuOuvert ? ' menu-ouvert' : ''));
    b.setAttribute('aria-label', 'Navigation principale');

    const marque = el('div', 'marque');
    marque.append(el('span', 'marque-sigle', 'H'), el('span', 'marque-nom', 'Hermès CRM'));
    b.append(marque);

    const bloc = el('div', 'barre-societe');
    const lab = el('label', 'barre-label', 'Société');
    lab.setAttribute('for', 'choix-societe');
    const sel = el('select', 'champ');
    sel.id = 'choix-societe';
    Object.values(D.societes).forEach((s) => {
      const o = el('option', null, s.nom);
      o.value = s.id;
      if (s.id === v.societe) o.selected = true;
      sel.append(o);
    });
    sel.addEventListener('change', () => aller({ societe: sel.value, fil: null, dossier: null }));
    bloc.append(lab, sel);
    b.append(bloc);

    // En 390 px la barre se réduit à la marque, la société et ce bouton.
    const menu = el('button', 'bouton bouton-menu', ui.menuOuvert ? 'Fermer' : 'Menu');
    menu.type = 'button';
    menu.setAttribute('aria-expanded', ui.menuOuvert ? 'true' : 'false');
    menu.addEventListener('click', () => { ui.menuOuvert = !ui.menuOuvert; rendre(); });
    b.append(menu);

    const liste = el('ul', 'nav');
    NAV.forEach((item) => {
      const li = el('li');
      const a = el('a', 'nav-lien' + (item.ecran === v.ecran ? ' actif' : ''), item.label);
      a.href = '?ecran=' + item.ecran + '&societe=' + v.societe;
      if (item.ecran === v.ecran) a.setAttribute('aria-current', 'page');
      a.addEventListener('click', (e) => {
        e.preventDefault();
        aller({ ecran: item.ecran, fil: null, dossier: null, onglet: null, scenario: null });
      });
      li.append(a);
      liste.append(li);
    });
    b.append(liste);

    const vueCommune = el('a', 'nav-lien nav-lien-discret' + (v.ecran === 'commune' ? ' actif' : ''), 'Mes sociétés — lecture seule');
    vueCommune.href = '?ecran=commune&societe=' + v.societe;
    vueCommune.addEventListener('click', (e) => { e.preventDefault(); aller({ ecran: 'commune', fil: null }); });
    b.append(vueCommune);

    const pied = el('div', 'barre-pied');
    pied.append(el('span', 'avatar', D.membreActif.initiales));
    const ident = el('div', 'barre-identite');
    ident.append(el('span', 'barre-nom', D.membreActif.nom), el('span', 'barre-role', D.membreActif.role));
    pied.append(ident);
    b.append(pied);
    return b;
  }

  function retour(libelle, modif) {
    const a = el('a', 'retour', '← ' + libelle);
    a.href = '#';
    a.addEventListener('click', (e) => { e.preventDefault(); aller(modif); });
    return a;
  }

  function entete(titre, sousTitre, actions) {
    const h = el('header', 'entete');
    const bloc = el('div');
    bloc.append(el('h1', 'titre', titre));
    if (sousTitre) bloc.append(el('p', 'sous-titre', sousTitre));
    h.append(bloc);
    if (actions) h.append(actions);
    return h;
  }

  /* ---------- médias ---------- */

  const MEDIA_ETAT = {
    PENDING_FETCH: 'Média en attente de récupération',
    UPLOADING: 'Envoi du média en cours',
    PROCESSING: 'Média en cours de traitement',
    FAILED: 'Média indisponible',
    QUARANTINED: 'Média en quarantaine',
    EXPIRED: 'Lien du média expiré',
  };

  const KIND_LIB = { IMAGE: 'Image', VIDEO: 'Vidéo', VOICE: 'Message vocal', FILE: 'Fichier' };

  const poids = (o) => (o >= 1048576 ? (o / 1048576).toFixed(1) + ' Mo' : Math.round(o / 1024) + ' Ko');
  const duree = (ms) => {
    const s = Math.round(ms / 1000);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  };

  /* Tout lecteur créé est enregistré ici afin d'être arrêté avant un
     nouveau rendu : quitter un fil ne doit pas laisser un son continuer. */
  const lecteursActifs = [];

  function arreterLecteurs() {
    lecteursActifs.splice(0).forEach((n) => { try { n.pause(); } catch (e) { /* lecteur déjà détaché */ } });
  }

  function lecteurVocal(m) {
    const n = el('div', 'vocal');
    const audio = document.createElement('audio');
    audio.src = m.fichier;
    audio.preload = 'metadata';
    lecteursActifs.push(audio);
    const bouton = el('button', 'vocal-bouton');
    bouton.type = 'button';
    bouton.setAttribute('aria-label', 'Lire le message vocal');
    bouton.textContent = '▶';
    const piste = el('div', 'vocal-piste');
    piste.setAttribute('role', 'progressbar');
    piste.setAttribute('aria-label', 'Progression du message vocal');
    piste.setAttribute('aria-valuemin', '0');
    piste.setAttribute('aria-valuemax', '100');
    piste.setAttribute('aria-valuenow', '0');
    const barreP = el('div', 'vocal-progres');
    piste.append(barreP);
    const temps = el('span', 'vocal-temps', duree(m.durationMs));
    const erreur = el('p', 'note note-alerte vocal-erreur', 'Lecture impossible : le fichier audio n’a pas pu être ouvert par le navigateur.');
    erreur.hidden = true;

    const auRepos = () => {
      bouton.textContent = '▶';
      bouton.setAttribute('aria-label', 'Lire le message vocal');
    };
    const signalerEchec = () => { erreur.hidden = false; auRepos(); };

    bouton.addEventListener('click', () => {
      if (audio.paused) {
        erreur.hidden = true;
        const lecture = audio.play();
        if (lecture && typeof lecture.catch === 'function') lecture.catch(signalerEchec);
        bouton.textContent = '❚❚';
        bouton.setAttribute('aria-label', 'Mettre en pause le message vocal');
      } else {
        audio.pause();
        auRepos();
      }
    });
    audio.addEventListener('error', signalerEchec);
    audio.addEventListener('timeupdate', () => {
      if (audio.duration) {
        const part = audio.currentTime / audio.duration * 100;
        barreP.style.width = part + '%';
        piste.setAttribute('aria-valuenow', String(Math.round(part)));
      }
      temps.textContent = duree(audio.currentTime * 1000);
    });
    audio.addEventListener('ended', () => {
      bouton.textContent = '▶';
      bouton.setAttribute('aria-label', 'Lire le message vocal');
      barreP.style.width = '0%';
      temps.textContent = duree(m.durationMs);
    });
    n.append(bouton, piste, temps, audio, erreur);
    return n;
  }

  function media(mediaId) {
    const m = D.medias[mediaId];
    const n = el('div', 'media media-' + m.kind.toLowerCase());
    if (m.state !== 'READY') {
      const bloc = el('div', 'media-indispo');
      bloc.append(el('strong', null, MEDIA_ETAT[m.state] || 'Média indisponible'));
      bloc.append(el('span', 'media-detail', KIND_LIB[m.kind] + ' · ' + (m.name || '') + (m.byteSize ? ' · ' + poids(m.byteSize) : '')));
      if (m.errorCode) bloc.append(el('code', 'code-erreur', m.errorCode));
      if (m.state === 'PROCESSING') bloc.append(el('span', 'media-detail', 'Le message reste lisible : le média sera disponible une fois traité.'));
      if (m.state === 'EXPIRED') bloc.append(el('span', 'media-detail', 'Demander un nouvel accès au média.'));
      n.append(bloc);
      return n;
    }
    if (m.kind === 'IMAGE') {
      const img = document.createElement('img');
      img.src = m.fichier;
      img.alt = m.alt || m.name;
      img.className = 'media-visuel';
      n.append(img);
    } else if (m.kind === 'VIDEO') {
      const v = document.createElement('video');
      v.src = m.fichier;
      v.controls = true;
      v.preload = 'metadata';
      v.playsInline = true;
      v.className = 'media-visuel';
      lecteursActifs.push(v);
      const echec = el('p', 'note note-alerte', 'Lecture impossible : cette vidéo n’a pas pu être ouverte par le navigateur.');
      echec.hidden = true;
      v.addEventListener('error', () => { echec.hidden = false; });
      n.append(v, echec);
      if (m.attribution) n.append(el('span', 'media-credit', m.attribution));
    } else if (m.kind === 'VOICE') {
      n.append(lecteurVocal(m));
    } else {
      const f = el('div', 'fichier');
      f.append(el('span', 'fichier-icone', '📎'));
      const info = el('div', 'fichier-info');
      info.append(el('span', 'fichier-nom', m.name), el('span', 'fichier-detail', poids(m.byteSize)));
      f.append(info);
      const dl = el('button', 'bouton bouton-discret', 'Télécharger');
      dl.type = 'button';
      dl.addEventListener('click', () => message('Le téléchargement d’une pièce jointe passe par un accès court contrôlé côté serveur. Rien n’est téléchargé depuis cette maquette.'));
      f.append(dl, puceSimule('aucun fichier réel n’est servi'));
      n.append(f);
    }
    return n;
  }

  function message(texte) {
    ui.message = texte;
    rendre();
  }

  /* ---------- WhatsApp ---------- */

  const ETAT_MSG = {
    RECU: 'Reçu',
    ACCEPTE: 'Accepté — livraison inconnue',
    INCERTAIN: 'Résultat incertain — aucune réémission automatique',
  };

  function bulle(m) {
    const ligne = el('div', 'ligne-bulle ' + m.sens);
    const b = el('div', 'bulle ' + m.sens);
    if (m.automatique) b.append(el('span', 'bulle-auteur', 'Hermès · réponse automatique'));
    if (m.contenu.kind === 'TEXT') {
      b.append(el('p', 'bulle-texte', m.contenu.text));
    } else {
      b.append(media(m.contenu.mediaId));
      if (m.contenu.caption) b.append(el('p', 'bulle-texte', m.contenu.caption));
    }
    const meta = el('div', 'bulle-meta');
    meta.append(el('span', 'bulle-heure', m.heure));
    meta.append(el('span', 'bulle-etat', ETAT_MSG[m.etat]));
    b.append(meta);
    ligne.append(b);
    return ligne;
  }

  function selecteurLocal(p, conv) {
    const bloc = el('div', 'commande-locale');
    const lab = el('label', 'barre-label', 'Bot sur cette conversation');
    lab.setAttribute('for', 'mode-local');
    const sel = el('select', 'champ');
    sel.id = 'mode-local';
    ['INHERIT', 'AUTO', 'ASSISTED', 'OFF'].forEach((mode) => {
      const o = el('option', null, MODE_LOCAL_LIB[mode]);
      o.value = mode;
      if (mode === p.localMode) o.selected = true;
      if (mode !== 'INHERIT' && mode !== 'OFF' && ORDRE[mode] > ORDRE[p.companyMode]) {
        o.disabled = true;
        o.textContent = MODE_LOCAL_LIB[mode] + ' — indisponible, la société est en « ' + MODE_FR[p.companyMode] + ' »';
      }
      if (mode === 'INHERIT' && p.companyMode === 'AUTO' && p.localMode !== 'INHERIT') {
        o.textContent = MODE_LOCAL_LIB[mode] + ' — redeviendrait automatique';
      }
      sel.append(o);
    });
    sel.addEventListener('change', () => {
      const choisi = sel.value;
      if (choisi !== 'INHERIT' && ORDRE[choisi] > ORDRE[p.companyMode]) {
        sel.value = p.localMode;
        message('Refusé : une exception de conversation ne peut que restreindre. '
          + 'La société reste en « ' + MODE_FR[p.companyMode] +' » et le mode de ce fil ne change pas.');
        return;
      }
      // La démo applique réellement l'exception, en mémoire seulement, pour que
      // les parcours ASSISTED et OFF soient parcourables écran par écran.
      const ancien = conv.localMode;
      conv.localMode = choisi;
      const rang = parseInt(String(conv.localRevision || 'loc-0').replace('loc-', ''), 10) || 0;
      conv.localRevision = 'loc-' + (rang + 1);
      const suite = politique(conv.societe, conv.canal, conv, vue().scenario);
      const delegation = choisi === 'INHERIT' && suite.effectiveMode === 'AUTO' && ancien !== 'INHERIT'
        ? ' Revenir à l’héritage le rendrait automatique : le produit demanderait la même autorisation explicite qu’une activation directe.'
        : '';
      // Un changement de mode invalide les suggestions du bot, pas le travail
      // humain en cours : la réponse saisie, un média choisi et un vocal en
      // préécoute restent là. Seule la purge de navigation les efface.
      const brouillonPerdu = ui.brouillonOuvert || ui.brouillonInsere;
      ui.brouillonOuvert = false;
      ui.brouillonInsere = false;
      message('Ce fil passe en « ' + MODE_FR[suite.effectiveMode] + ' ».'
        + delegation
        + (brouillonPerdu ? ' La suggestion du bot est invalidée ; votre texte est conservé et reste le vôtre.' : ' Votre réponse en cours est conservée.')
        + ' Changement de démonstration, en mémoire seulement : rien n’est enregistré ni envoyé.');
    });
    bloc.append(lab, sel, puceSimule('aucune politique n’est écrite'));
    return bloc;
  }

  /* Compact par défaut : le mode effectif et sa raison tiennent sur une ligne.
     L'explication, l'héritage et les références internes sont repliés. Seuls
     les faits qui bloquent une action restent visibles sans ouvrir. */
  function bandeauMode(p, conv) {
    const n = el('section', 'bandeau-mode mode-' + p.effectiveMode.toLowerCase());
    n.setAttribute('aria-label', 'Mode du bot pour cette conversation');

    const haut = el('div', 'bandeau-mode-haut');
    haut.append(puce('Bot : ' + MODE_FR[p.effectiveMode], 'mode'));
    haut.append(el('span', 'bandeau-mode-raison', raisonTexte(p)));
    n.append(haut);

    if (p.bascule) {
      n.append(el('p', 'note note-alerte', 'La société vient de passer de « Automatique » à « Assisté ». '
        + 'Plus aucune réponse ne part seule ; un brouillon déjà préparé reste utilisable et s’envoie sur votre clic. '
        + 'Les messages plus anciens ne sont pas repris.'));
    }
    if (!p.humanSend.allowed) {
      n.append(el('p', 'note note-alerte', p.humanSend.texte
        + ' Le mode du bot et l’état de la connexion sont deux choses différentes.'));
    }

    if (p.exceptionObsolete) {
      n.append(el('p', 'note note-alerte', 'Cette conversation garde un réglage « ' + MODE_FR[p.localMode]
        + ' » devenu plus large que celui de la société. Il est conservé dans l’historique mais ne s’applique plus : '
        + 'le bot reste en « ' + MODE_FR[p.effectiveMode] + ' ».'));
    }

    const det = el('details', 'bandeau-mode-detail');
    det.append(el('summary', null, 'Détail du mode et de l’héritage'));
    det.append(el('p', 'bandeau-mode-explic', MODE_EXPLIC[p.effectiveMode]));

    const details = el('dl', 'bandeau-mode-details');
    const ligne = (t, v) => { details.append(el('dt', null, t), el('dd', null, v)); };
    ligne('Réglage de la société', MODE_FR[p.companyMode] + ' sur le canal ' + (p.canal === 'WHATSAPP' ? 'WhatsApp' : 'e-mail'));
    ligne('Cette conversation', p.localMode === 'INHERIT' ? 'suit la société' : MODE_FR[p.localMode] + ', réglé ici');
    ligne('Référence interne', 'politique ' + p.policyRevision + (p.localRevision ? ' · exception ' + p.localRevision : ''));
    det.append(details);

    n.append(det);
    return n;
  }

  function carteBrouillon(p, conv) {
    const d = D.brouillons[conv.id];
    const n = el('section', 'brouillon');
    if (!p.draft.allowed) {
      n.classList.add('brouillon-bloque');
      n.append(el('h3', 'brouillon-titre', 'Brouillon indisponible'));
      n.append(el('p', 'brouillon-texte', p.draft.texte));
      n.append(el('code', 'code-erreur', p.draft.reasonCode));
      if (d) n.append(el('p', 'note', 'La suggestion précédente est invalidée (DRAFT_INVALIDATED) : son ancien jeton ne permet aucun envoi.'));
      return n;
    }
    if (!d) {
      n.append(el('p', 'brouillon-texte', 'Aucun brouillon préparé pour ce fil.'));
      return n;
    }
    const titre = el('div', 'brouillon-entete');
    titre.append(el('h3', 'brouillon-titre', 'Brouillon proposé par Hermès'));
    titre.append(puce(d.state, 'etat'));
    titre.append(puceSimule('aucun appel MCP n’est émis'));
    n.append(titre);
    n.append(el('p', 'brouillon-texte', d.text));
    n.append(el('p', 'note', 'Préparé à partir du dernier message reçu · ' + d.expiresAt));
    const actions = el('div', 'actions');
    const inserer = el('button', 'bouton', 'Insérer dans ma réponse');
    inserer.type = 'button';
    inserer.addEventListener('click', () => { ui.reponse = d.text; ui.brouillonInsere = true; rendre(); });
    const ignorer = el('button', 'bouton bouton-discret', 'Ignorer');
    ignorer.type = 'button';
    ignorer.addEventListener('click', () => { ui.brouillonOuvert = false; rendre(); });
    actions.append(inserer, ignorer);
    n.append(actions);
    n.append(el('p', 'note', 'Un brouillon ne part jamais seul : l’envoi demande un clic humain distinct.'));
    return n;
  }

  function enregistreurVocal(p) {
    const etat = ui.enregistreur;
    const n = el('section', 'enregistreur');
    const titre = el('div', 'enregistreur-entete');
    titre.append(el('h3', 'brouillon-titre', 'Message vocal'));
    titre.append(puceSimule('aucun micro n’est ouvert, aucune permission n’est demandée'));
    n.append(titre);

    if (etat === 'refus') {
      n.append(el('p', 'brouillon-texte', 'Accès au micro refusé. Le produit afficherait ici la marche à suivre pour réautoriser le navigateur, sans bloquer le reste du fil.'));
      n.append(el('code', 'code-erreur', 'MEDIA_RECORDER_PERMISSION_DENIED'));
      const reessayer = el('button', 'bouton bouton-discret', 'Fermer');
      reessayer.type = 'button';
      reessayer.addEventListener('click', () => { ui.enregistreur = null; rendre(); });
      n.append(reessayer);
      return n;
    }
    if (etat === 'encours') {
      const ligne = el('div', 'enregistreur-ligne');
      ligne.append(el('span', 'pastille-enregistrement', '●'));
      ligne.append(el('span', 'enregistreur-temps', '0:04'));
      ligne.append(el('span', 'enregistreur-etat', 'Enregistrement en cours'));
      n.append(ligne);
      const live = el('p', 'sr-seulement');
      live.setAttribute('role', 'status');
      live.textContent = 'Enregistrement en cours, 4 secondes.';
      n.append(live);
      const actions = el('div', 'actions');
      const stop = el('button', 'bouton', 'Arrêter');
      stop.type = 'button';
      stop.addEventListener('click', () => { ui.enregistreur = 'preecoute'; rendre(); });
      const annul = el('button', 'bouton bouton-discret', 'Annuler');
      annul.type = 'button';
      annul.addEventListener('click', () => { ui.enregistreur = null; rendre(); });
      actions.append(stop, annul);
      n.append(actions);
      n.append(el('p', 'note', 'Arrêter n’envoie rien : la préécoute précède toujours l’envoi.'));
      return n;
    }
    // préécoute
    n.append(el('p', 'note', 'Préécoutez avant d’envoyer. Annuler supprime l’enregistrement et libère la ressource.'));
    n.append(lecteurVocal(D.medias['md-vocal-reponse']));
    const actions = el('div', 'actions');
    const envoyer = el('button', 'bouton bouton-primaire', 'Envoyer le vocal');
    envoyer.type = 'button';
    envoyer.disabled = !p.humanSend.allowed;
    envoyer.addEventListener('click', () => {
      ui.enregistreur = null;
      ui.envoye = 'Vocal accepté par le ledger de la maquette. Dans le produit, l’état resterait « accepté » jusqu’à une preuve de livraison.';
      rendre();
    });
    const annuler = el('button', 'bouton bouton-discret', 'Annuler');
    annuler.type = 'button';
    annuler.addEventListener('click', () => { ui.enregistreur = null; rendre(); });
    actions.append(envoyer, annuler);
    n.append(actions);
    return n;
  }

  function composeurMedia(p) {
    const n = el('section', 'composeur-media');
    const titre = el('div', 'enregistreur-entete');
    titre.append(el('h3', 'brouillon-titre', 'Média à envoyer'));
    titre.append(puceSimule('aucun fichier n’est lu ni téléversé'));
    n.append(titre);
    if (ui.composeurMedia === 'refus') {
      n.append(el('p', 'brouillon-texte', 'Fichier refusé : 24,3 Mo pour une limite de 16 Mo sur ce canal.'));
      n.append(el('code', 'code-erreur', 'MEDIA_TOO_LARGE'));
      n.append(el('p', 'note', 'Les limites réelles dépendent de la version du fournisseur, qui n’est pas vérifiée à ce stade.'));
    } else {
      n.append(media('md-plan'));
      n.append(el('p', 'note', 'Image · plan-pose-vitrine.svg · aperçu avant envoi. L’envoi est une action humaine distincte.'));
    }
    const actions = el('div', 'actions');
    const envoyer = el('button', 'bouton bouton-primaire', 'Envoyer le média');
    envoyer.type = 'button';
    envoyer.disabled = ui.composeurMedia === 'refus' || !p.humanSend.allowed;
    envoyer.addEventListener('click', () => {
      ui.composeurMedia = null;
      ui.envoye = 'Média accepté par le ledger de la maquette, après réservation. Accepté n’est pas livré.';
      rendre();
    });
    const autre = el('button', 'bouton bouton-discret', ui.composeurMedia === 'refus' ? 'Choisir un autre fichier' : 'Simuler un fichier trop lourd');
    autre.type = 'button';
    autre.addEventListener('click', () => { ui.composeurMedia = ui.composeurMedia === 'refus' ? 'pret' : 'refus'; rendre(); });
    const annuler = el('button', 'bouton bouton-discret', 'Annuler');
    annuler.type = 'button';
    annuler.addEventListener('click', () => { ui.composeurMedia = null; rendre(); });
    actions.append(envoyer, autre, annuler);
    n.append(actions);
    return n;
  }

  function composeur(p, conv) {
    const n = el('section', 'composeur');
    if (ui.envoye) n.append(el('p', 'note note-succes', ui.envoye));
    if (ui.composeurMedia) n.append(composeurMedia(p));
    if (ui.enregistreur) n.append(enregistreurVocal(p));
    if (ui.brouillonOuvert) n.append(carteBrouillon(p, conv));

    const lab = el('label', 'sr-seulement', 'Votre réponse à ' + conv.nom);
    lab.setAttribute('for', 'zone-reponse');
    const zone = el('textarea', 'champ champ-zone');
    zone.id = 'zone-reponse';
    zone.rows = 3;
    zone.placeholder = 'Écrire une réponse…';
    zone.value = ui.reponse;
    zone.addEventListener('input', () => { ui.reponse = zone.value; });
    n.append(lab, zone);
    if (ui.brouillonInsere) n.append(el('p', 'note', 'Brouillon inséré. Relisez-le : il ne partira que si vous cliquez sur Envoyer.'));

    const actions = el('div', 'actions actions-composeur');

    const envoyer = el('button', 'bouton bouton-primaire', 'Envoyer');
    envoyer.type = 'button';
    envoyer.disabled = !p.humanSend.allowed;
    if (!p.humanSend.allowed) envoyer.title = p.humanSend.texte;
    envoyer.addEventListener('click', () => {
      if (!ui.reponse.trim()) { message('Écrivez une réponse avant d’envoyer.'); return; }
      ui.reponse = ''; ui.brouillonInsere = false; ui.brouillonOuvert = false;
      ui.envoye = 'Message accepté par le ledger de la maquette. Dans le produit, « accepté » n’est pas « livré ».';
      rendre();
    });

    const brouillon = el('button', 'bouton', 'Proposer un brouillon');
    brouillon.type = 'button';
    brouillon.disabled = !p.draft.allowed;
    if (!p.draft.allowed) brouillon.title = p.draft.texte + ' (' + p.draft.reasonCode + ')';
    brouillon.addEventListener('click', () => { ui.brouillonOuvert = true; rendre(); });

    const joindre = el('button', 'bouton', 'Joindre un média');
    joindre.type = 'button';
    joindre.addEventListener('click', () => { ui.composeurMedia = 'pret'; rendre(); });

    const vocal = el('button', 'bouton', 'Enregistrer un vocal');
    vocal.type = 'button';
    vocal.addEventListener('click', () => { ui.enregistreur = 'encours'; rendre(); });

    actions.append(envoyer, brouillon, joindre, vocal);
    n.append(actions);

    if (!p.draft.allowed) n.append(el('p', 'note', 'Brouillon indisponible : ' + p.draft.texte + ' La réponse humaine, elle, reste possible.'));
    return n;
  }

  function ecranWhatsApp(v) {
    const frag = document.createDocumentFragment();
    const convs = D.conversations.filter((c) => c.societe === v.societe && c.canal === 'WHATSAPP');
    const societe = D.societes[v.societe];

    frag.append(entete('WhatsApp', societe.nom + ' · ' + convs.length + ' conversations'));

    if (!convs.length) {
      frag.append(etatVide('Aucune conversation WhatsApp', 'Cette société n’a pas encore reçu de message sur ce canal.'));
      return frag;
    }
    const conv = convs.find((c) => c.id === v.fil) || convs[0];
    const p = politique(v.societe, 'WHATSAPP', conv, v.scenario);

    const grille = el('div', 'wa');
    const liste = el('ul', 'wa-liste');
    liste.setAttribute('aria-label', 'Conversations');
    convs.forEach((c) => {
      const cp = politique(v.societe, 'WHATSAPP', c, v.scenario);
      const li = el('li');
      const a = el('a', 'wa-item' + (c.id === conv.id ? ' actif' : ''));
      a.href = '?ecran=wa&societe=' + v.societe + '&fil=' + c.id;
      if (c.id === conv.id) a.setAttribute('aria-current', 'true');
      a.addEventListener('click', (e) => { e.preventDefault(); aller({ ecran: 'wa', fil: c.id }); });
      const haut = el('div', 'wa-item-haut');
      haut.append(el('span', 'wa-item-nom', c.nom));
      haut.append(el('span', 'wa-item-heure', c.heure));
      a.append(haut);
      a.append(el('p', 'wa-item-apercu', c.apercu));
      const bas = el('div', 'wa-item-bas');
      bas.append(puce(MODE_FR[cp.effectiveMode], 'mode-mini'));
      if (c.nonLus) bas.append(puce(c.nonLus + ' non lus', 'compteur'));
      a.append(bas);
      li.append(a);
      liste.append(li);
    });

    const fil = el('section', 'wa-fil');
    fil.append(retour('Conversations', { ecran: 'wa', fil: null }));
    const filEntete = el('header', 'fil-entete');
    const ident = el('div');
    ident.append(el('h2', 'fil-nom', conv.nom));
    ident.append(el('p', 'fil-detail', conv.poste + ' · ' + conv.handle));
    filEntete.append(ident);
    filEntete.append(selecteurLocal(p, conv));
    fil.append(filEntete);

    fil.append(bandeauMode(p, conv));

    const corps = el('div', 'fil-corps');
    (D.messages[conv.id] || []).forEach((m) => {
      if (m.jour) corps.append(el('div', 'jour-separateur', m.jour));
      if (m.nonLuDepuis) corps.append(el('div', 'jour-separateur jour-nonlu', 'Non lus'));
      corps.append(bulle(m));
    });
    fil.append(corps);
    fil.append(composeur(p, conv));

    grille.append(liste, fil);
    frag.append(grille);
    return frag;
  }

  /* ---------- boîte e-mail ---------- */

  const adresseDe = (chaine) => {
    const m = /<([^>]+)>/.exec(chaine);
    return (m ? m[1] : chaine).trim();
  };

  const TYPE_MAIL = { REPLY: 'Répondre', REPLY_ALL: 'Répondre à tous', FORWARD: 'Transférer' };

  /* Les destinataires découlent du choix : répondre vise l'expéditeur,
     répondre à tous ajoute les autres participants sans nos propres adresses
     ni doublons, transférer part sans destinataire et emporte les pièces
     jointes choisies explicitement. */
  /* Un transfert emporte les pièces jointes du fil entier : sur un échange,
     elles sont portées par le message qui les a apportées, pas par le dernier. */
  const piecesDuFil = (contenu) => contenu.messages.reduce(
    (liste, m) => liste.concat((m.pj || []).filter((id) => liste.indexOf(id) === -1)), []);

  function ouvrirComposeurMail(type, boite, fil, contenu) {
    const nous = boite.adresse;
    const expediteur = adresseDe(contenu.participants.de);

    /* On répond au correspondant, jamais à sa propre boîte : dans Envoyés et
       Brouillons l'expéditeur du fil, c'est nous. Les doublons et nos propres
       adresses sont retirés une seule fois, ici. */
    const externes = [expediteur]
      .concat(contenu.participants.a.map(adresseDe))
      .concat(contenu.participants.cc.map(adresseDe))
      .filter((x, i, t) => x && x !== nous && t.indexOf(x) === i);
    const principal = expediteur !== nous ? expediteur : (externes[0] || '');
    const autres = externes.filter((x) => x !== principal);

    const objetNu = fil.objet.replace(/^\s*(Re|Tr)\s*:\s*/i, '');
    ui.composeurMail = {
      type,
      a: type === 'FORWARD' || !principal ? [] : [principal],
      cc: type === 'REPLY_ALL' ? autres : [],
      objet: (type === 'FORWARD' ? 'Tr: ' : 'Re: ') + objetNu,
      corps: '',
      pj: type === 'FORWARD' ? piecesDuFil(contenu) : [],
      retires: [],
      brouillonOuvert: false,
      brouillonInsere: false,
    };
  }

  const deuxChiffres = (n) => String(n).padStart(2, '0');

  /* Le brouillon est réellement écrit dans le dossier Brouillons de la
     démonstration, puis relisible. En mémoire seulement : aucune persistance,
     aucun appel serveur. Réenregistrer le même fil met la copie à jour au lieu
     d'en empiler une seconde. */
  function enregistrerBrouillon(boite, fil, c) {
    const id = 'brouillon-' + fil.id;
    const maintenant = new Date();
    const heure = deuxChiffres(maintenant.getHours()) + ':' + deuxChiffres(maintenant.getMinutes());
    const existant = boite.fils.find((f) => f.id === id);
    const entree = {
      id, dossier: 'drafts', contact: fil.contact, societe: fil.societe, canal: 'EMAIL',
      localMode: 'INHERIT', localRevision: 'loc-1',
      objet: c.objet,
      correspondants: 'Brouillon · ' + (c.a.length ? c.a.join(', ') : 'sans destinataire'),
      date: heure, nonLu: false, piecesJointes: c.pj.length, messages: 1,
    };
    if (existant) Object.assign(existant, entree);
    else boite.fils.unshift(entree);

    boite.contenus[id] = {
      participants: { de: boite.adresse, a: c.a.slice(), cc: c.cc.slice(), cci: [] },
      messages: [{
        id: 'e1', auteur: D.membreActif.nom, adresse: boite.adresse,
        date: 'brouillon enregistré à ' + heure, sortant: true, brouillon: true,
        corps: (c.corps || '').split('\n').filter((l) => l.trim()).length
          ? c.corps.split('\n').filter((l) => l.trim())
          : ['(message vide)'],
        pj: c.pj.slice(),
      }],
    };

    if (!existant) {
      const dossier = boite.dossiers.find((d) => d.id === 'drafts');
      if (dossier) dossier.total += 1;
    }
    return id;
  }

  function composeurMail(p, boite, fil, contenu) {
    const c = ui.composeurMail;
    const n = el('section', 'composeur-mail');

    const titre = el('div', 'enregistreur-entete');
    titre.append(el('h3', 'brouillon-titre', TYPE_MAIL[c.type]));
    titre.append(puceSimule('aucun message n’est composé côté serveur ni envoyé'));
    n.append(titre);

    const ligne = (id, label, valeur, cle, aide) => {
      const bloc = el('div', 'champ-ligne');
      const lab = el('label', 'barre-label', label);
      lab.setAttribute('for', id);
      const champ = el('input', 'champ champ-large');
      champ.type = 'text';
      champ.id = id;
      champ.value = valeur;
      champ.addEventListener('input', () => {
        c[cle] = cle === 'objet' ? champ.value : champ.value.split(',').map((x) => x.trim()).filter(Boolean);
      });
      bloc.append(lab, champ);
      if (aide) bloc.append(el('span', 'texte-faible', aide));
      n.append(bloc);
      return bloc;
    };

    ligne('mail-a', 'À', c.a.join(', '), 'a',
      c.type === 'FORWARD' ? 'Un transfert part sans destinataire : vous choisissez à qui il va.' : null);
    ligne('mail-cc', 'Cc', c.cc.join(', '), 'cc',
      c.type === 'REPLY_ALL' ? 'Vos propres adresses et les doublons ont été retirés ; les autres participants sont conservés.' : null);
    ligne('mail-objet', 'Objet', c.objet, 'objet', null);

    const labCorps = el('label', 'barre-label', 'Message');
    labCorps.setAttribute('for', 'mail-corps');
    const corps = el('textarea', 'champ champ-zone');
    corps.id = 'mail-corps';
    corps.rows = 5;
    corps.placeholder = 'Écrire votre message…';
    corps.value = c.corps;
    corps.addEventListener('input', () => { c.corps = corps.value; });
    n.append(labCorps, corps);

    if (c.pj.length) {
      const pj = el('div', 'mail-pj');
      pj.append(el('h3', 'mail-pj-titre', 'Pièces jointes transférées'));
      c.pj.forEach((id) => {
        const m = D.medias[id];
        const chip = el('div', 'fichier');
        chip.append(el('span', 'fichier-icone', '📎'));
        const info = el('div', 'fichier-info');
        info.append(el('span', 'fichier-nom', m.name), el('span', 'fichier-detail', m.mimeType));
        chip.append(info);
        const retirer = el('button', 'bouton bouton-discret', 'Retirer');
        retirer.type = 'button';
        retirer.addEventListener('click', () => {
          c.pj = c.pj.filter((x) => x !== id);
          c.retires.push(m.name);
          rendre();
        });
        chip.append(retirer);
        pj.append(chip);
      });
      n.append(pj);
    }
    if (c.retires.length) n.append(el('p', 'note', 'Retiré du transfert : ' + c.retires.join(', ') + '.'));

    /* Le brouillon du bot vit dans l'éditeur : on le demande, on le relit, on
       l'insère, puis on envoie soi-même. En arrêt complet le bouton est
       désactivé et dit pourquoi, sans empêcher la réponse humaine. */
    const d = boite.brouillons[fil.id];
    const bloc = el('div', 'brouillon' + (p.draft.allowed ? '' : ' brouillon-bloque'));
    const bt = el('div', 'brouillon-entete');
    bt.append(el('h3', 'brouillon-titre', 'Brouillon proposé par Hermès'));
    if (p.draft.allowed) bt.append(puceSimule('aucun appel au bot n’est émis'));
    bloc.append(bt);

    if (!p.draft.allowed) {
      bloc.append(el('p', 'brouillon-texte', p.draft.texte));
      bloc.append(el('p', 'note', 'Votre réponse reste possible : seul le bot est à l’arrêt.'));
    } else if (!d) {
      bloc.append(el('p', 'brouillon-texte', 'Le bot n’a pas de proposition pour ce fil.'));
    } else if (!c.brouillonOuvert) {
      const demander = el('button', 'bouton', 'Proposer un brouillon');
      demander.type = 'button';
      demander.addEventListener('click', () => { c.brouillonOuvert = true; rendre(); });
      bloc.append(demander);
    } else {
      bloc.append(el('p', 'brouillon-texte', d.text));
      const actionsBrouillon = el('div', 'actions');
      const inserer = el('button', 'bouton', 'Insérer dans le message');
      inserer.type = 'button';
      inserer.addEventListener('click', () => { c.corps = d.text; c.brouillonInsere = true; rendre(); });
      const ignorer = el('button', 'bouton bouton-discret', 'Ignorer');
      ignorer.type = 'button';
      ignorer.addEventListener('click', () => { c.brouillonOuvert = false; rendre(); });
      actionsBrouillon.append(inserer, ignorer);
      bloc.append(actionsBrouillon);
      if (c.brouillonInsere) bloc.append(el('p', 'note', 'Inséré dans le message. Relisez-le : il ne partira que sur votre clic.'));
    }
    n.append(bloc);

    const actions = el('div', 'actions');
    const envoyer = el('button', 'bouton bouton-primaire', 'Envoyer');
    envoyer.type = 'button';
    envoyer.disabled = !p.humanSend.allowed;
    if (!p.humanSend.allowed) envoyer.title = p.humanSend.texte;
    envoyer.addEventListener('click', () => {
      if (!c.a.length) { message('Indiquez au moins un destinataire avant d’envoyer.'); return; }
      const nb = c.a.length + c.cc.length;
      ui.composeurMail = null;
      ui.envoye = 'Message accepté par le ledger de la maquette vers ' + nb + ' destinataire'
        + (nb > 1 ? 's' : '') + '. Aucune émission réelle : « accepté » n’est pas « livré ».';
      rendre();
    });

    const garder = el('button', 'bouton', 'Enregistrer le brouillon');
    garder.type = 'button';
    garder.addEventListener('click', () => {
      const id = enregistrerBrouillon(boite, fil, c);
      ui.composeurMail = null;
      ui.envoye = 'Brouillon conservé dans le dossier Brouillons. Enregistrer n’envoie rien, '
        + 'et la copie ne vit qu’en mémoire : elle disparaît au rechargement de la page.';
      ui.envoyeAction = { label: 'Ouvrir le brouillon', modif: { ecran: 'mail', dossier: 'drafts', fil: id } };
      rendre();
    });

    const annuler = el('button', 'bouton bouton-discret', 'Annuler');
    annuler.type = 'button';
    annuler.addEventListener('click', () => { ui.composeurMail = null; rendre(); });

    actions.append(envoyer, garder, annuler);
    n.append(actions);
    return n;
  }

  function ecranMail(v) {
    const frag = document.createDocumentFragment();
    const boite = D.mail[v.societe];
    const societe = D.societes[v.societe];
    frag.append(entete('Boîte e-mail', boite.adresse + ' · ' + societe.nom));

    const fils = boite.fils.filter((f) => f.dossier === v.dossier);
    const fil = fils.find((f) => f.id === v.fil) || fils[0] || null;
    const p = politique(v.societe, 'EMAIL', fil, v.scenario);

    const grille = el('div', 'mail');

    const dossiers = el('ul', 'mail-dossiers');
    dossiers.setAttribute('aria-label', 'Dossiers');
    boite.dossiers.forEach((d) => {
      const dedans = boite.fils.filter((f) => f.dossier === d.id);
      const nonLus = dedans.filter((f) => f.nonLu).length;
      const li = el('li');
      const a = el('a', 'mail-dossier' + (d.id === v.dossier ? ' actif' : ''));
      a.href = '?ecran=mail&societe=' + v.societe + '&dossier=' + d.id;
      if (d.id === v.dossier) a.setAttribute('aria-current', 'true');
      a.addEventListener('click', (e) => { e.preventDefault(); aller({ ecran: 'mail', dossier: d.id, fil: null }); });
      a.setAttribute('aria-label', d.label + ', ' + (nonLus ? nonLus + ' non lus' : dedans.length + ' fils'));
      a.append(el('span', 'mail-dossier-nom', d.label));
      a.append(el('span', 'mail-dossier-compte', nonLus ? nonLus + ' non lus' : String(dedans.length)));
      li.append(a);
      dossiers.append(li);
    });
    const noteDossier = el('p', 'note mail-note');
    noteDossier.append(document.createTextNode('Rôles INBOX, SENT, DRAFTS, ARCHIVE, TRASH. '));
    noteDossier.append(puceSimule('les dossiers ne sont pas synchronisés depuis une boîte réelle'));
    dossiers.append(noteDossier);

    const liste = el('ul', 'mail-liste');
    liste.setAttribute('aria-label', 'Fils de discussion');
    if (!fils.length) {
      const li = el('li');
      li.append(etatVide('Dossier vide', 'Aucun fil dans ce dossier.'));
      liste.append(li);
    }
    fils.forEach((f) => {
      const li = el('li');
      const a = el('a', 'mail-item' + (fil && f.id === fil.id ? ' actif' : '') + (f.nonLu ? ' nonlu' : ''));
      a.href = '?ecran=mail&societe=' + v.societe + '&dossier=' + v.dossier + '&fil=' + f.id;
      a.addEventListener('click', (e) => { e.preventDefault(); aller({ ecran: 'mail', fil: f.id }); });
      const haut = el('div', 'mail-item-haut');
      haut.append(el('span', 'mail-item-de', f.correspondants));
      haut.append(el('span', 'mail-item-date', f.date));
      a.append(haut);
      a.append(el('p', 'mail-item-objet', f.objet));
      const bas = el('div', 'mail-item-bas');
      if (f.messages > 1) bas.append(puce(f.messages + ' messages', 'compteur'));
      if (f.piecesJointes) bas.append(puce(f.piecesJointes + (f.piecesJointes > 1 ? ' pièces jointes' : ' pièce jointe'), 'compteur'));
      a.append(bas);
      li.append(a);
      liste.append(li);
    });

    const lecture = el('section', 'mail-fil');
    if (!fil) {
      lecture.append(etatVide('Aucun fil sélectionné', 'Choisissez un fil dans la liste.'));
    } else {
      const contenu = boite.contenus[fil.id];
      if (ui.composeurMailType && !ui.composeurMail) {
        ouvrirComposeurMail(ui.composeurMailType, boite, fil, contenu);
        ui.composeurMailType = null;
      }

      const filEntete = el('header', 'fil-entete');
      filEntete.append(el('h2', 'mail-objet', fil.objet));
      filEntete.append(selecteurLocal(p, fil));
      lecture.append(filEntete);
      lecture.append(bandeauMode(p, fil));
      if (ui.envoye) {
        const succes = el('div', 'note note-succes');
        succes.append(el('p', 'note-succes-texte', ui.envoye));
        if (ui.envoyeAction) {
          const b = el('button', 'bouton bouton-discret', ui.envoyeAction.label);
          b.type = 'button';
          b.addEventListener('click', () => aller(ui.envoyeAction.modif));
          succes.append(b);
        }
        lecture.append(succes);
      }
      const dest = el('dl', 'mail-destinataires');
      const ligne = (t, val) => { dest.append(el('dt', null, t), el('dd', null, val)); };
      ligne('De', contenu.participants.de);
      ligne('À', contenu.participants.a.join(', '));
      if (contenu.participants.cc.length) ligne('Cc', contenu.participants.cc.join(', '));
      ligne('Cci', contenu.participants.cci.length ? contenu.participants.cci.join(', ') : 'aucun — jamais exposé sans autorisation');
      lecture.append(dest);

      contenu.messages.forEach((m) => {
        const bloc = el('article', 'mail-message' + (m.sortant ? ' sortant' : ''));
        const ent = el('header', 'mail-message-entete');
        ent.append(el('span', 'mail-message-auteur', m.auteur));
        ent.append(el('span', 'mail-message-date', m.date));
        bloc.append(ent);
        if (m.brouillon) bloc.append(puce('Brouillon humain — non envoyé', 'etat'));
        const corps = el('div', 'mail-corps');
        m.corps.forEach((para) => corps.append(el('p', null, para)));
        bloc.append(corps);
        if (m.citation) {
          const det = el('details', 'mail-citation');
          det.append(el('summary', null, 'Afficher le message cité'));
          det.append(el('p', null, m.citation));
          bloc.append(det);
        }
        if (m.pj && m.pj.length) {
          const pj = el('div', 'mail-pj');
          pj.append(el('h3', 'mail-pj-titre', 'Pièces jointes'));
          m.pj.forEach((id) => pj.append(media(id)));
          bloc.append(pj);
        }
        lecture.append(bloc);
      });

      const noteHtml = el('p', 'note');
      noteHtml.textContent = 'Le contenu est rendu en texte assaini dans cette maquette : ni script, ni formulaire, ni ressource distante, '
        + 'et aucun pixel n’est chargé à l’ouverture.';
      lecture.append(noteHtml);

      const suggestion = boite.brouillons[fil.id];
      if (suggestion && !ui.composeurMail) {
        const d = suggestion;
        const bloc = el('section', 'brouillon');
        const titre = el('div', 'brouillon-entete');
        titre.append(el('h3', 'brouillon-titre', 'Brouillon proposé par Hermès'));
        titre.append(puce(p.effectiveMode === 'OFF' ? 'INVALIDATED' : d.state, 'etat'));
        titre.append(puceSimule('aucun appel MCP n’est émis'));
        bloc.append(titre);
        if (p.effectiveMode === 'OFF') {
          bloc.append(el('p', 'brouillon-texte', 'Suggestion invalidée par le passage en OFF.'));
          bloc.append(el('code', 'code-erreur', 'DRAFT_INVALIDATED'));
        } else {
          bloc.append(el('p', 'brouillon-texte', d.text));
          bloc.append(el('p', 'note', 'L’envoi reste une action humaine distincte.'));
        }
        lecture.append(bloc);
      }

      if (ui.composeurMail) {
        lecture.append(composeurMail(p, boite, fil, contenu));
      } else {
        const actions = el('div', 'actions');
        ['REPLY', 'REPLY_ALL', 'FORWARD'].forEach((type) => {
          const b = el('button', 'bouton' + (type === 'REPLY' ? ' bouton-primaire' : ''), TYPE_MAIL[type]);
          b.type = 'button';
          b.addEventListener('click', () => { ouvrirComposeurMail(type, boite, fil, contenu); rendre(); });
          actions.append(b);
        });
        lecture.append(actions);
      }
    }

    const colDossiers = el('div', 'mail-col mail-col-dossiers');
    colDossiers.append(dossiers);

    const colListe = el('div', 'mail-col mail-col-liste');
    colListe.append(retour('Dossiers', { ecran: 'mail', dossier: null, fil: null }), liste);

    const colFil = el('div', 'mail-col mail-col-fil');
    colFil.append(retour('Messages', { ecran: 'mail', fil: null }), lecture);

    grille.append(colDossiers, colListe, colFil);
    frag.append(grille);
    return frag;
  }

  function etatVide(titre, detail) {
    const n = el('div', 'etat-vide');
    n.append(el('p', 'etat-vide-titre', titre));
    n.append(el('p', 'etat-vide-detail', detail));
    return n;
  }
  window.H.etatVide = etatVide;
  window.H.entete = entete;
  window.H.media = media;
  window.H.message = message;

  /* ---------- rendu ---------- */

  function rendre() {
    arreterLecteurs();
    const v = vue();
    appliquerScenario(v);
    document.documentElement.setAttribute('data-ecran', v.ecran);
    document.documentElement.setAttribute('data-societe', v.societe);
    if (v.scenario) document.documentElement.setAttribute('data-scenario', v.scenario);
    else document.documentElement.removeAttribute('data-scenario');

    /* Niveau de navigation en profondeur pour les petits écrans : l'adresse
       porte déjà le dossier et le fil, le CSS n'a qu'à suivre. */
    const niveau = v.ecran === 'wa'
      ? (v.filExplicite ? 'fil' : 'liste')
      : v.ecran === 'mail'
        ? (v.filExplicite ? 'fil' : (v.dossierExplicite ? 'liste' : 'dossiers'))
        : 'ecran';
    document.documentElement.setAttribute('data-niveau', niveau);

    const appli = document.getElementById('appli');
    appli.textContent = '';
    appli.append(barre(v));

    const principal = el('main', 'principal');
    principal.id = 'principal';

    if (ui.message) {
      const bandeau = el('div', 'message-global');
      bandeau.setAttribute('role', 'status');
      bandeau.append(el('p', null, ui.message));
      const fermer = el('button', 'bouton bouton-discret', 'Fermer');
      fermer.type = 'button';
      fermer.addEventListener('click', () => { ui.message = null; rendre(); });
      bandeau.append(fermer);
      principal.append(bandeau);
    }

    const rendus = {
      wa: ecranWhatsApp,
      mail: ecranMail,
    };
    const fn = rendus[v.ecran] || (window.ECRANS_CRM && window.ECRANS_CRM[v.ecran]);
    if (fn) principal.append(fn(v));
    else principal.append(entete('Écran inconnu', 'Vérifiez le paramètre ecran dans l’adresse.'));

    appli.append(principal);

    // Les en-têtes de colonne sont reportés sur chaque cellule : en 390px les
    // tableaux deviennent des blocs étiquetés, sans défilement horizontal.
    // Une conversation s'ouvre sur ses derniers messages, comme une messagerie.
    const corps = principal.querySelector('.fil-corps');
    if (corps) corps.scrollTop = corps.scrollHeight;

    principal.querySelectorAll('table.tableau').forEach((t) => {
      const entetes = Array.prototype.map.call(t.querySelectorAll('thead th'), (th) => th.textContent);
      t.querySelectorAll('tbody tr').forEach((tr) => {
        Array.prototype.forEach.call(tr.children, (td, i) => {
          if (entetes[i]) td.setAttribute('data-label', entetes[i]);
        });
      });
    });
  }

  // Un retour navigateur change de fil ou de société : le contexte transitoire
  // (réponse en cours, brouillon ouvert, média, enregistreur) ne doit pas
  // réapparaître ailleurs. Même purge que dans aller().
  window.H.rendre = rendre;

  window.addEventListener('popstate', () => {
    Object.assign(ui, {
      reponse: '', brouillonOuvert: false, brouillonInsere: false,
      composeurMedia: null, enregistreur: null, envoye: null,
      etapeDeplacee: null, message: null, scenarioApplique: null,
      composeurMail: null, composeurMailType: null, envoyeAction: null, menuOuvert: false,
    });
    rendre();
  });
  document.addEventListener('DOMContentLoaded', rendre);
})();
