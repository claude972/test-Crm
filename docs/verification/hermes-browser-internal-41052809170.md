# Recette navigateur interne — 30 octobre 2026

Cette recette utilise le déploiement preview interne du run41052809170, source front/backend exacte `9ce34b95b43fadf195bb0be3cacf378fe116f35c`. Elle expire à13:40:16UTC (09:40Martinique) et ne constitue donc PAS le lien à remettre pour12h. Aucun secret ou lien de partage n’est enregistré ici.

## Vérifié réellement

- Déploiement Vercel READY en preview, projet isolé, aucun alias assigné ; protection globale conservée. Cookiejar neuf, sans CLI Vercel ni Authorization : accès ordinaire protégé ; partage privé puis /healthz et /client-config réussis sur la même origine.
- Onboarding API :14 étapes réelles réussies, dont création/activation, profil, connexion et CRUD d’une société de recette suivi de son nettoyage.
- Navigateur IAB neuf pour ce domaine : accès privé, formulaire de connexion normal et retour effectif sur/dashboard. Aucun login Vercel préalable.
- Dashboard Hermès : compteurs natifs initiaux Companies5/People5/Opportunities6/Tasks0 (données de démonstration du workspace), pipeline et listes réellement chargés ; les anciens IDs Lingui sont remplacés par les textes lisibles.
- Réception UI : lot de3 lignes synthétiques, une pending, une invalid (email/société vides) et une duplicate. Seule la ligne pending est sélectionnable. Qualification réelle avec finalité et information explicites ; statut qualified obtenu. Création réelle de campagne DRAFT confirmée par « Draft created. Nothing was sent. ». Aucun clic Send/planification, aucun relais externe configuré.
- Retour dashboard : Companies et People passent chacun de5 à6. Le contact et sa société sont bien partagés avec les autres modules, pas simulés dans le frontend.
- Vue sociétés autorisées : compte courant unique, compteurs6/6/6/0 pour la ligne et le total. La preuve A/B/C à14 scénarios natifs reste séparée de ce compte de démonstration.
- Largeur390px : documentWidth390, aucun débordement horizontal du dashboard/structures. Le rendu mobile a toutefois révélé une navigation trop haute, à corriger avant validation finale.
- Contrôle HTTP PWA : manifest standalone, icône192 joignable, runtime même origine et API saine. Installation et fonctionnement hors ligne non affirmés.

## Défauts trouvés, pas masqués

Les deux radios d’information sont associées au même Field.Label (« Information method »). Les textes existent dans le DOM, mais leurs noms accessibles sont identiques ; le vrai test CI9ce échoue à ce sélecteur. La recette manuelle a sélectionné l’option par son texte DOM pour poursuivre ; elle ne valide PAS cette accessibilité. Correctif Claude8a9abe74b intégré rootb3eca2bc1 : association distincte via useId et retrait du Field.Root commun. Confirmation sur la prochaine CI.

Sur mobile, le menu complet de la route/dashboard précède les compteurs et occupe presque le premier écran. Claude corrige le repli initial et les contrôles accessibles du menu. Les préférences d’accueil natives restent conservées. Des mentions KovaaLab demeurent dans l’instance sous-jacente ; la correction du branding propre à l’espace Hermès est en revue.

La CI combinée41052674485 valide le build/les textes et atteint la qualification après vraie connexion et dashboard. Elle reste rouge sur les radios avant le correctif. Réception desktop/mobile complète et compteurs natifs sont à confirmer avec les derniers correctifs, sans affaiblir les assertions.

Captures locales dans le workspace artifacts : hermes-internal-dashboard-41052809170.png, hermes-internal-reception-draft-41052809170.png et hermes-internal-mobile-dashboard-41052809170.png. Ce sont des preuves internes datées, pas des maquettes ni la recette du futur créneau de12h.
