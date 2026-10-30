// Rendu de la maquette. Aucun réseau, aucun stockage persistant : l'état des
// interrupteurs vit en mémoire et repart à zéro au rechargement, pour qu'une
// capture ne puisse jamais passer pour une configuration réelle.
(() => {
  const D = window.MAQUETTE;
  const $ = (s, r = document) => r.querySelector(s);

  const ECRANS = [
    { id: 'dashboard', nom: 'Tableau de bord' },
    { id: 'prospection', nom: 'Prospection' },
    { id: 'messagerie', nom: 'Messagerie' },
    { id: 'reglages', nom: 'Réglages' },
  ];

  const VARIANTES = {
    a: 'Variante A — Colonnes calmes',
    b: 'Variante B — Pipeline en avant',
    c: 'Variante C — Dense et tabulaire',
  };

  // Les sociétés dont l'utilisateur n'est pas membre n'apparaissent nulle part :
  // ni au sélecteur, ni dans la vue commune. Le cloisonnement se voit d'abord
  // à ce qui est absent.
  const miennes = D.societes.filter((s) => s.membre);

  const etat = {
    variante: 'a',
    ecran: 'dashboard',
    societe: 'atelier',
    vue: 'desktop',
    conversation: 'c1',
    canal: 'whatsapp',
    // Copie en mémoire, par société : couper un bot ne doit jamais toucher
    // une autre société.
    bots: Object.fromEntries(
      miennes.map((s) => [s.id, { ...D.reglages[s.id].bots }]),
    ),
    repriseHumaine: {},
  };

  const lireUrl = () => {
    const p = new URLSearchParams(location.search);
    const v = p.get('variante');
    const e = p.get('ecran');
    const s = p.get('societe');
    if (v && VARIANTES[v]) etat.variante = v;
    if (e && ECRANS.some((x) => x.id === e)) etat.ecran = e;
    if (s && (s === 'commune' || miennes.some((x) => x.id === s))) etat.societe = s;
    if (p.get('vue') === 'mobile') etat.vue = 'mobile';
    if (p.get('canal') === 'email') etat.canal = 'email';
  };

  const ecrireUrl = () => {
    const p = new URLSearchParams();
    p.set('variante', etat.variante);
    p.set('ecran', etat.ecran);
    p.set('societe', etat.societe);
    if (etat.vue === 'mobile') p.set('vue', 'mobile');
    history.replaceState(null, '', `?${p.toString()}`);
  };

  const estCommune = () => etat.societe === 'commune';
  const societeCourante = () =>
    estCommune() ? null : miennes.find((s) => s.id === etat.societe);
  const nomSociete = (id) =>
    (D.societes.find((s) => s.id === id) || {}).nom || id;

  const el = (tag, cls, texte) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (texte !== undefined) n.textContent = texte;
    return n;
  };

  // ---------- Tableau de bord ----------
  const rendreDashboard = () => {
    const f = document.createDocumentFragment();

    if (estCommune()) {
      f.append(enTete('Vue commune', 'Lecture seule — vos sociétés autorisées uniquement'));
      const avis = el('p', 'avis', 'Cette vue rassemble vos sociétés autorisées. Elle ne modifie rien et ne change pas la société dans laquelle vous travaillez.');
      f.append(avis);

      const grille = el('div', 'cartes');
      miennes.forEach((s) => {
        const c = el('article', 'carte');
        c.append(el('h3', 'carte-titre', s.nom));
        c.append(el('p', 'carte-meta', `${s.secteur} · ${s.ville}`));
        const l = el('dl', 'mini-indicateurs');
        D.indicateurs[s.id].forEach((i) => {
          l.append(el('dt', null, i.cle));
          l.append(el('dd', i.valeur === null ? 'est-inconnu' : null,
            i.valeur === null ? 'Non mesurable' : String(i.valeur)));
        });
        c.append(l);
        grille.append(c);
      });
      f.append(grille);
      return f;
    }

    const s = societeCourante();
    f.append(enTete(s.nom, `${s.secteur} · ${s.ville}`));

    const grille = el('div', 'indicateurs');
    D.indicateurs[s.id].forEach((i) => {
      const c = el('article', 'indicateur');
      c.append(el('span', 'indicateur-cle', i.cle));
      c.append(el('span', i.valeur === null ? 'indicateur-valeur est-inconnu' : 'indicateur-valeur',
        i.valeur === null ? 'Non mesurable' : String(i.valeur)));
      c.append(el('span', 'indicateur-tendance', i.tendance));
      grille.append(c);
    });
    f.append(grille);

    const sec = el('section', 'bloc');
    sec.append(el('h2', 'bloc-titre', 'Pipeline commercial'));
    const pipe = el('ol', 'pipeline');
    D.pipeline[s.id].forEach((e) => {
      const li = el('li', 'etape');
      li.append(el('span', 'etape-nom', e.etape));
      li.append(el('span', 'etape-nombre', String(e.nombre)));
      li.append(el('span', 'etape-montant', e.montant));
      pipe.append(li);
    });
    sec.append(pipe);
    f.append(sec);

    const sec2 = el('section', 'bloc');
    sec2.append(el('h2', 'bloc-titre', 'Affaires à suivre'));
    sec2.append(tableau(
      ['Affaire', 'Contact', 'Étape', 'Montant', 'Prochaine action'],
      D.affaires[s.id].map((a) => [
        a.nom, a.contact, pastille(a.etape), a.montant,
        prochaineAction(a),
      ]),
    ));
    f.append(sec2);

    // Synthèse des autres sociétés : toujours dans le DOM, hiérarchisée
    // différemment selon la variante. En tête pour la piste « synthèse »,
    // reléguée en bas pour les deux autres.
    const sec3 = el('section', 'bloc bloc-synthese');
    sec3.append(el('h2', 'bloc-titre', 'Mes autres sociétés'));
    sec3.append(el('p', 'bloc-note', 'Lecture seule. Ouvrir une société pour y travailler.'));
    sec3.append(tableau(
      ['Société', 'Affaires', 'Relances dues', 'Contacts qualifiés'],
      miennes.filter((a) => a.id !== s.id).map((a) => {
        const ind = D.indicateurs[a.id];
        return [
          a.nom,
          String(D.affaires[a.id].length),
          String(ind[2].valeur),
          String(ind[1].valeur),
        ];
      }),
    ));
    f.append(sec3);
    return f;
  };

  // ---------- Prospection ----------
  const rendreProspection = () => {
    const f = document.createDocumentFragment();
    if (estCommune()) {
      f.append(enTete('Prospection', 'Vue commune'));
      f.append(avisLectureSeule('La prospection se travaille dans une société. Choisissez-en une pour qualifier des collectes.'));
      return f;
    }
    const s2 = societeCourante();
    f.append(enTete('Prospection', s2.nom));

    // 1. Le travail quotidien : qui suit quoi, et quelle est la prochaine action.
    const secP = el('section', 'bloc');
    secP.append(el('h2', 'bloc-titre', 'Base de prospects'));
    secP.append(tableau(
      ['Contact', 'Société', 'Propriétaire', 'Étape', 'Prochaine action'],
      D.prospects[s2.id].map((x) => [
        x.contact, x.societe,
        x.proprietaire === 'Non affecté' ? marque('Non affecté') : x.proprietaire,
        pastille(x.etape),
        prochaineAction({ action: x.action, echeance: x.quand, enRetard: x.enRetard }),
      ]),
    ));
    secP.append(el('p', 'bloc-note', 'Un prospect opposé reste visible, sans propriétaire ni action : il ne se contacte plus.'));
    f.append(secP);

    // 2. D'où viennent les contacts.
    const sec = el('section', 'bloc');
    sec.append(el('h2', 'bloc-titre', 'Collectes reçues'));
    sec.append(el('p', 'bloc-note', 'Les collectes arrivent par un point d\u2019entrée authentifié, propre à cette société. Le dépôt manuel reste un second choix.'));
    sec.append(tableau(
      ['Collecte', 'Origine', 'Lignes', 'Reçue', 'État'],
      D.collectes[s2.id].map((c) => [c.nom, c.origine, String(c.lignes), c.recue, pastille(c.etat)]),
    ));
    f.append(sec);

    const sec2 = el('section', 'bloc');
    sec2.append(el('h2', 'bloc-titre', 'Qualification'));
    sec2.append(tableau(
      ['Contact', 'Société', 'Adresse', 'État', 'Note'],
      D.lignesCollecte[s2.id].map((l) => [
        l.contact, l.societe,
        l.email === '' ? marque('Non renseignée') : l.email,
        pastille(l.etat), l.note,
      ]),
    ));
    f.append(sec2);

    // 3. Le parcours audience -> brouillon -> résultats, entièrement statique.
    const secA = el('section', 'bloc');
    secA.append(el('h2', 'bloc-titre', 'Audiences et campagnes'));
    secA.append(tableau(
      ['Audience', 'Contacts', 'Exclus', 'Mise à jour'],
      D.audiences[s2.id].map((a2) => [a2.nom, String(a2.contacts), String(a2.exclus), a2.maj]),
    ));
    secA.append(tableau(
      ['Campagne', 'Audience', 'État', 'Résultat'],
      D.campagnes[s2.id].map((c) => [c.nom, c.audience, pastille(c.etat), marque(c.resultat)]),
    ));
    // Cette phrase est le point le plus important de l'écran : rien ne promet
    // un envoi. Le moteur natif exige un plan payant non vérifié ici.
    secA.append(el('p', 'avis', 'Aucune campagne n\u2019est envoyable depuis cette maquette. Les brouillons restent des brouillons : l\u2019envoi dépend d\u2019un moteur et d\u2019un plan qui ne sont pas vérifiés à ce stade.'));
    f.append(secA);

    const secO = el('section', 'bloc');
    secO.append(el('h2', 'bloc-titre', 'Oppositions'));
    secO.append(tableau(
      ['Adresse', 'Motif', 'Portée', 'Depuis'],
      D.oppositions[s2.id].map((o) => [o.adresse, o.motif, o.portee, o.depuis]),
    ));
    secO.append(el('p', 'bloc-note', 'Une opposition survit aux imports et ne se lève pas depuis cet écran. Un refus de suivi n\u2019est pas un refus d\u2019être contacté.'));
    f.append(secO);
    return f;
  };

  // ---------- Messagerie ----------
  const rendreMessagerie = () => {
    const f = document.createDocumentFragment();
    if (estCommune()) {
      f.append(enTete('Messagerie', 'Vue commune'));
      f.append(avisLectureSeule('Les conversations appartiennent à une société. Choisissez-en une pour répondre.'));
      return f;
    }
    const s = societeCourante();
    const bots = etat.bots[s.id];
    f.append(enTete('Messagerie', s.nom));

    const onglets = el('div', 'onglets');
    [['whatsapp', 'WhatsApp'], ['email', 'E-mail']].forEach(([id, nom]) => {
      const b = el('button', 'onglet', nom);
      b.type = 'button';
      b.setAttribute('aria-pressed', String(etat.canal === id));
      b.addEventListener('click', () => { etat.canal = id; const l = D.conversations[s.id].filter((c) => c.canal === id); etat.conversation = l.length ? l[0].id : null; rendre(); });
      onglets.append(b);
    });
    f.append(onglets);

    // L'état du bot est affiché ici, mais ne se règle pas ici : le module
    // montre l'état et renvoie au centre Réglages.
    const bandeBot = el('div', 'bande-bot');
    const actif = etat.canal === 'whatsapp' ? bots.whatsapp : bots.email;
    bandeBot.append(el('span', actif ? 'puce est-actif' : 'puce', actif ? 'Bot actif' : 'Bot coupé'));
    bandeBot.append(el('span', 'bande-bot-texte',
      actif
        ? 'Le bot peut proposer une réponse. Rien ne part sans votre envoi.'
        : 'Bot coupé. La réception et vos réponses restent possibles.'));
    const lien = el('button', 'lien', 'Régler dans Réglages');
    lien.type = 'button';
    lien.addEventListener('click', () => { etat.ecran = 'reglages'; rendre(); });
    bandeBot.append(lien);
    f.append(bandeBot);

    const zone = el('div', 'messagerie');
    const liste = el('ul', 'fils');
    const fils = D.conversations[s.id].filter((c) => c.canal === etat.canal);
    if (!fils.length) {
      liste.append(el('li', 'vide', 'Aucune conversation sur ce canal.'));
    }
    fils.forEach((c) => {
      const li = el('li', 'fil');
      const b = el('button', 'fil-bouton');
      b.type = 'button';
      if (etat.conversation === c.id) b.setAttribute('aria-current', 'true');
      b.append(el('span', 'fil-nom', c.interlocuteur));
      if (c.objet) b.append(el('span', 'fil-objet', c.objet));
      b.append(el('span', 'fil-apercu', c.apercu));
      const meta = el('span', 'fil-meta');
      meta.append(el('span', 'fil-quand', c.quand));
      if (!c.contact) meta.append(el('span', 'marque', 'Contact non rattaché'));
      if (c.nonLu) meta.append(el('span', 'compteur', `${c.nonLu} non lu${c.nonLu > 1 ? 's' : ''}`));
      b.append(meta);
      b.addEventListener('click', () => { etat.conversation = c.id; rendre(); });
      li.append(b);
      liste.append(li);
    });
    zone.append(liste);

    const fil = el('section', 'conversation');
    const courante = fils.find((c) => c.id === etat.conversation) || fils[0];
    if (!courante) {
      fil.append(el('p', 'vide', 'Choisissez une conversation.'));
    } else {
      fil.append(el('h2', 'conversation-titre', courante.interlocuteur));
      const msgs = el('ol', 'messages');
      (D.messages[courante.id] || []).forEach((m) => {
        const li = el('li', `message est-${m.sens}`);
        li.append(el('span', 'message-sens', m.sens === 'entrant' ? 'Reçu' : 'Envoyé'));
        li.append(el('p', 'message-texte', m.texte));
        const meta = el('span', 'message-meta');
        meta.append(el('span', null, m.quand));
        meta.append(el('span', 'message-etat', m.etat));
        li.append(meta);
        msgs.append(li);
      });
      fil.append(msgs);

      const repris = etat.repriseHumaine[courante.id];
      const actions = el('div', 'actions-fil');
      const zoneTexte = el('textarea', 'saisie');
      zoneTexte.placeholder = 'Écrire une réponse…';
      zoneTexte.setAttribute('aria-label', 'Votre réponse');
      actions.append(zoneTexte);
      const barre = el('div', 'actions-barre');
      const envoyer = el('button', 'bouton est-principal', 'Envoyer');
      envoyer.type = 'button';
      envoyer.disabled = true;
      envoyer.title = 'Maquette : aucun envoi réel';
      barre.append(envoyer);
      if (actif && !repris) {
        const proposer = el('button', 'bouton', 'Proposer un brouillon');
        proposer.type = 'button';
        proposer.disabled = true;
        proposer.title = 'Maquette : aucun appel réel';
        barre.append(proposer);
        // Arrêt immédiat dans le fil. C'est une action de sécurité, pas un
        // réglage : elle coupe ici et renvoie aux Réglages pour la suite.
        const reprise = el('button', 'bouton est-alerte', 'Reprendre la main');
        reprise.type = 'button';
        reprise.addEventListener('click', () => {
          etat.repriseHumaine[courante.id] = true;
          rendre();
        });
        barre.append(reprise);
      }
      actions.append(barre);
      if (repris) {
        actions.append(el('p', 'avis', 'Vous avez repris la main sur ce fil. Le bot n’y proposera plus rien. La réactivation se fait dans Réglages.'));
      }
      fil.append(actions);
    }
    zone.append(fil);
    f.append(zone);
    return f;
  };

  // ---------- Réglages ----------
  // Prérequis d'activation. Un bot ne s'allume pas parce qu'on le demande :
  // il s'allume si et seulement si ses connexions sont vérifiées. Sans cela
  // la maquette afficherait un faux « actif », exactement ce qu'on veut éviter.
  const prerequisBot = (connexions, canal) => {
    const par = Object.fromEntries(connexions.map((c) => [c.id, c]));
    const besoins = canal === 'whatsapp'
      ? [['wa', 'canal WhatsApp vérifié'], ['mcp', 'serveur Hermès MCP configuré']]
      : [['imap', 'réception IMAP vérifiée'], ['smtp', 'envoi SMTP vérifié'], ['mcp', 'serveur Hermès MCP configuré']];
    return besoins.filter(([id]) => !(par[id] && par[id].verifie)).map(([, texte]) => texte);
  };

  const rendreReglages = () => {
    const f = document.createDocumentFragment();
    f.append(enTete('Réglages', 'Tout le paramétrage se trouve ici, et nulle part ailleurs'));

    const secMoi = el('section', 'bloc');
    secMoi.append(el('h2', 'bloc-titre', 'Mon compte'));
    secMoi.append(tableau(
      ['Nom', 'Rôle', 'Langue'],
      [[D.utilisateur.nom, D.utilisateur.role, 'Français']],
    ));
    f.append(secMoi);

    const secC = el('section', 'bloc');
    secC.append(el('h2', 'bloc-titre', 'Mes sociétés'));
    secC.append(tableau(
      ['Société', 'Secteur', 'Ville', 'Accès'],
      miennes.map((x) => [x.nom, x.secteur, x.ville, pastille('Membre')]),
    ));
    const ajout = el('button', 'bouton', 'Ajouter une société');
    ajout.type = 'button';
    ajout.disabled = true;
    ajout.title = 'Maquette : aucune société n\u2019est créée';
    secC.append(ajout);
    secC.append(el('p', 'bloc-note', 'Seules vos sociétés apparaissent. Une société dont vous n\u2019êtes pas membre n\u2019est ni listée, ni agrégée dans la vue commune.'));
    f.append(secC);

    if (estCommune()) {
      f.append(avisLectureSeule('Général, Membres, Connexions, Bots et Prospection se règlent société par société. Choisissez une société pour y accéder.'));
      return f;
    }

    const s2 = societeCourante();
    const r = D.reglages[s2.id];
    const bots = etat.bots[s2.id];

    const secG = el('section', 'bloc');
    secG.append(el('h2', 'bloc-titre', `Général — ${s2.nom}`));
    secG.append(tableau(
      ['Nom', 'Sous-domaine', 'Fuseau', 'Langue'],
      [[r.general.nom, r.general.sousDomaine, r.general.fuseau, r.general.langue]],
    ));
    f.append(secG);

    const secM = el('section', 'bloc');
    secM.append(el('h2', 'bloc-titre', `Membres — ${s2.nom}`));
    secM.append(tableau(
      ['Membre', 'Rôle', 'Accès aux données'],
      D.membres[s2.id].map((m) => [m.nom, m.role, m.acces]),
    ));
    f.append(secM);

    const secX = el('section', 'bloc');
    secX.append(el('h2', 'bloc-titre', `Connexions — ${s2.nom}`));
    secX.append(tableau(
      ['Connexion', 'Protocole', 'État', 'Détail'],
      r.connexions.map((c) => [
        c.nom, c.protocole,
        pastille(c.etat === 'verifie' ? `Connecté — vérifié le ${c.le}`
          : c.etat === 'declare' ? 'Déclaré, non vérifié' : 'Non configuré'),
        c.detail,
      ]),
    ));
    secX.append(el('p', 'bloc-note', 'Aucun identifiant n\u2019est saisi ni affiché. « Déclaré, non vérifié » n\u2019est pas « connecté » : seule une vérification datée l\u2019est.'));
    f.append(secX);

    const secB = el('section', 'bloc');
    secB.append(el('h2', 'bloc-titre', `Bots — ${s2.nom}`));
    secB.append(el('p', 'bloc-note', 'Les deux interrupteurs sont indépendants et propres à cette société. Couper un bot ne coupe pas le canal : la réception et vos réponses restent possibles.'));

    [['whatsapp', 'Bot WhatsApp'], ['email', 'Bot e-mail']].forEach(([cle, nom]) => {
      const manquants = prerequisBot(r.connexions, cle);
      const bloque = manquants.length > 0;
      const ligne = el('div', 'interrupteur');
      const label = el('label', 'interrupteur-label');
      const id = `bot-${cle}`;
      label.htmlFor = id;
      label.append(el('span', 'interrupteur-nom', nom));
      label.append(el('span', 'interrupteur-aide',
        bloque
          ? `Activation impossible : il manque ${manquants.join(', ')}.`
          : bots[cle]
            ? 'Actif : le bot peut proposer une réponse. Rien ne part sans envoi humain.'
            : 'Coupé : aucune proposition ni réponse automatique sur ce canal.'));
      if (bloque) {
        const lienR = el('span', 'interrupteur-aide', 'Les prérequis se règlent dans Connexions, ci-dessus.');
        label.append(lienR);
      }
      const bouton = el('button', bots[cle] ? 'bascule est-actif' : 'bascule');
      bouton.type = 'button';
      bouton.id = id;
      bouton.setAttribute('role', 'switch');
      bouton.setAttribute('aria-checked', String(bots[cle]));
      bouton.disabled = bloque;
      if (bloque) bouton.title = `Prérequis manquants : ${manquants.join(', ')}`;
      bouton.append(el('span', 'bascule-piste'));
      bouton.append(el('span', 'bascule-etat',
        bloque ? 'Indisponible' : bots[cle] ? 'Actif' : 'Coupé'));
      bouton.addEventListener('click', () => {
        if (bloque) return;
        bots[cle] = !bots[cle];
        rendre();
      });
      ligne.append(label, bouton);
      secB.append(ligne);
    });
    f.append(secB);

    const secPr = el('section', 'bloc');
    secPr.append(el('h2', 'bloc-titre', `Prospection — ${s2.nom}`));
    secPr.append(tableau(
      ['Réglage', 'Valeur'],
      [
        ['Suivi des ouvertures', 'Désactivé'],
        ['Qualification humaine', 'Obligatoire avant création de contact'],
        ['Création de contact depuis une collecte', 'Autorisée après qualification'],
        ['Envoi de campagne', 'Indisponible — moteur non vérifié'],
      ],
    ));
    secPr.append(el('p', 'bloc-note', 'Ces réglages persistants vivent ici. Les modules affichent leur effet et renvoient à cette page, sans jamais proposer de les changer sur place.'));
    f.append(secPr);
    return f;
  };

  // ---------- Fabriques ----------
  const enTete = (titre, sous) => {
    const h = el('header', 'entete');
    h.append(el('h1', 'entete-titre', titre));
    if (sous) h.append(el('p', 'entete-sous', sous));
    return h;
  };

  const avisLectureSeule = (texte) => el('p', 'avis', texte);

  // Ce que la référence met au centre d'une carte : la prochaine action et sa
  // date, pas seulement le montant. Un retard se lit comme un retard.
  const prochaineAction = (a) => {
    const n = el('span', 'prochaine');
    n.append(el('span', 'prochaine-quoi', a.action));
    n.append(el('span', a.enRetard ? 'prochaine-quand est-retard' : 'prochaine-quand',
      a.enRetard ? `${a.echeance} · en retard` : a.echeance));
    return n;
  };
  const marque = (t) => { const s = el('span', 'marque', t); return s; };

  const pastille = (texte) => {
    const map = {
      'Qualifiée': 'est-ok', 'Qualifié': 'est-ok', 'Gagné': 'est-ok', 'Membre': 'est-ok',
      'Rendez-vous pris': 'est-ok',
      'À qualifier': 'est-attente', 'Partielle': 'est-attente', 'Négociation': 'est-attente',
      'En discussion': 'est-attente', 'À contacter': 'est-attente', 'Brouillon': 'est-attente',
      'Déclaré, non vérifié': 'est-attente',
      'Invalide': 'est-probleme', 'Doublon': 'est-probleme',
      'Opposition': 'est-bloque',
      'Non configuré': 'est-neutre',
    };
    // « Connecté — vérifié le … » porte une date : c'est le seul état qui
    // affirme une connexion, et il ne peut pas s'écrire sans elle.
    const classe = texte.startsWith('Connecté — vérifié') ? 'est-ok' : (map[texte] || 'est-neutre');
    const s = el('span', `pastille ${classe}`, texte);
    return s;
  };

  const tableau = (entetes, lignes) => {
    const t = el('table', 'tableau');
    const thead = el('thead');
    const tr = el('tr');
    entetes.forEach((e) => tr.append(el('th', null, e)));
    thead.append(tr);
    t.append(thead);
    const tb = el('tbody');
    if (!lignes.length) {
      const vide = el('tr');
      const td = el('td', 'vide', 'Rien à afficher.');
      td.colSpan = entetes.length;
      vide.append(td);
      tb.append(vide);
    }
    lignes.forEach((l) => {
      const r = el('tr');
      l.forEach((c, i) => {
        const cell = el('td');
        // L'en-tête est repris en libellé pour la lecture en colonne unique
        // sur mobile : une table qui déborde ne se lit pas.
        cell.setAttribute('data-intitule', entetes[i]);
        if (c instanceof Node) cell.append(c); else cell.textContent = c;
        r.append(cell);
      });
      tb.append(r);
    });
    t.append(tb);
    const enveloppe = el('div', 'tableau-cadre');
    enveloppe.append(t);
    return enveloppe;
  };

  // ---------- Coquille ----------
  const rendreNav = () => {
    const nav = $('#nav-liens');
    const mob = $('#barre-mobile');
    nav.textContent = '';
    mob.textContent = '';
    ECRANS.forEach((e) => {
      [nav, mob].forEach((cible) => {
        const b = el('button', cible === nav ? 'nav-lien' : 'barre-lien', e.nom);
        b.type = 'button';
        if (etat.ecran === e.id) b.setAttribute('aria-current', 'page');
        b.addEventListener('click', () => { etat.ecran = e.id; rendre(); });
        cible.append(b);
      });
    });
  };

  const rendreSelecteur = () => {
    const sel = $('#selecteur-societe');
    sel.textContent = '';
    miennes.forEach((s) => {
      const o = el('option', null, s.nom);
      o.value = s.id;
      sel.append(o);
    });
    const o = el('option', null, 'Toutes mes sociétés (lecture seule)');
    o.value = 'commune';
    sel.append(o);
    sel.value = etat.societe;
    sel.onchange = () => { etat.societe = sel.value; rendre(); };
  };

  const rendre = () => {
    document.documentElement.dataset.variante = etat.variante;
    document.documentElement.dataset.ecran = etat.ecran;
    document.documentElement.dataset.vue = etat.vue;
    $('#theme-variante').href = `assets/variante-${etat.variante}.css`;
    $('#bandeau-variante').textContent = VARIANTES[etat.variante];
    $('#nav-utilisateur').textContent = `${D.utilisateur.nom} · ${D.utilisateur.role}`;
    rendreNav();
    rendreSelecteur();
    const cible = $('#ecran');
    cible.textContent = '';
    cible.append(
      etat.ecran === 'dashboard' ? rendreDashboard()
      : etat.ecran === 'prospection' ? rendreProspection()
      : etat.ecran === 'messagerie' ? rendreMessagerie()
      : rendreReglages(),
    );
    ecrireUrl();
  };

  lireUrl();
  rendre();
})();
