# Hermès V2 — livraison des trois pistes statiques

30 octobre 2026. Étape autorisée : maquettes et contrats, aucun câblage applicatif.

## Sources et responsabilités

- Claude réel, session8f3db32e : branche feat/claude-hermes-v2-ui, SHA final `af8ce71e86ebfa03c07ee892bc782cbcdb53a249`. Onze fichiers sous docs/design/hermes-v2 exclusivement. Trois pistes et quatre écrans par piste, police Geist locale et licence incluses.
- Codex : deux sous-agents pour contrats settings/bots et sociétés/prospection ; relectures réciproques, root pour intégration documentaire, revue CUA et publication. Branche feat/codex-hermes-v2-core, final `1c6760cfc` ; revue Claude des deux contrats au9ed917ead, delta final de coordination relu et confirmé par Claude à18:11:21UTC.
- Base applicative `333ba534927e177c90b35eb4157d75d8d767dec4`, CI combinée41084109198 success vérifiée. Ce succès n’est pas un build de nouvelles fonctions V2 : aucun apps/ changé. Original test-Crm et sauvegardes non modifiés par cette mission.

## Preview de maquettes vérifiée

Déploiement `dpl_4NHEh9JihfYcRaNwtR1rj5FxLVZ8` READY dans le projet existant `prj_0YAVdnCjN7e2zHNAbLzUCw3N4JvF`. Target null = preview, aliases vides, protection globale conservée. Origine protégée : https://hermes-crm-p0-preview-kazfplgnc-brafas-projects.vercel.app. Le lien complet privé est transmis uniquement dans le chat, jamais dans Git ; sans ce lien, redirection Vercel attendue.

Partage limité à86400secondes, échéance fournisseur **31 octobre2026 14:07:35 America/Martinique /18:07:35UTC**. Pas de compte CRM requis pour ces maquettes. Aucun ancien backend/tunnel ni compte expiré repris.

Preuves HTTP avec curl ordinaire et cookiejar neuf, sans CLIAuth ni Authorization : origine brute302protégée ; lien privé suivi200 ; dix fichiers publics comparés à l’archive exacte du SHA. Pour les deux HTML, Vercel ajoute uniquement son script feedback identifié par le deploymentId : suffixe contrôlé et séparé avant comparaison. README.md, documentation source, n’est pas servi par Vercel et est exclu explicitement de cette comparaison. Les JS/CSS/font/licence servis correspondent aux empreintes de source. Voir hermes-v2-maquettes-public-proof.json.

## Recette réelle CUA

Sur cette nouvelle origine, ouverture via partage sans login Vercel : page de choix puis12écrans à1280px et12écrans à390px. Attente du chargement et du titre réel avant captures ; documentWidth=viewport dans les24cas, français et Geist chargés, deux switches exclusivement en Réglages. Captures : `/Volumes/Stockage/dev/hermes-crm/artifacts/hermes-v2-maquettes/`, dont a/b/c-dashboard-desktop.png et les12versions mobile. JSON : hermes-v2-maquettes-browser-proof.json. Les captures sont des images du navigateur, pas des rendus inventés.

Interactions simulées vérifiées en ligne : WhatsApp ON→OFF conserve e-mail OFF, choix Verdure montre deux activations bloquées avec prérequis manquants, retour Atelier conserve OFF dans cette session. Sur nouvelle page Atelier, Reprendre la main donne le bandeau cohérent « Reprise humaine sur ce fil ». Contexte commun Messagerie refuse les actions et demande de choisir une société ; les trois dashboards communs ont titre premier et aucun switch.

Corrections revues : reprise initialement inaccessible ; ordre des titres Messagerie et contexte commun ; bandeau de fil contradictoire après reprise ; alignement des cinq états et séparation opposition/étape. Relecture statique Codex finale suraf8ce71e : aucun nouveau constat dans le diff et les invariants inspectés. Node --check des deux JS et git diff --check propres.

## Limites et suite

Il s’agit de **maquettes**, avec données et vérifications fournisseur fictives annoncées par bandeau permanent et scénario explicite. Aucun bot réel, réception réelle, scraping externe, mail, WhatsApp, campagne, secret administrable, création/switch de workspace ou nouvelle autorisation backend n’est raccordé. Les réglages et reprises simulés repartent à zéro au rechargement. Les capacités UI de ce prototype ne sont pas un modèle d’autorisation : serveur obligatoire au futur câblage.

Pas d’installation PWA, test hors ligne de l’application, audit accessibilité exhaustif ou test fournisseur revendiqué. Aucun envoi réel, service payant nouveau ou production. Choisir A/B/C puis valider les maquettes détaillées avant implantation de la V2. Réutiliser stack, auth, CRM et emailing natifs et préserver les gardes de licence.
