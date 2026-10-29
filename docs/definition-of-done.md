# Critères de livraison et état des preuves

Les anciennes cases « terminé » et le tableau global ont été retirés : aucune preuve suffisante de validation intégrée ne les accompagnait. L'historique Git conserve leur contenu.

## À vérifier pour chaque changement

- Chemin d'exécution réel et périmètre identifiés.
- Logique métier, validation, erreurs et autorisations vérifiées.
- Isolation par workspace et absence d'exposition de secrets vérifiées.
- Migrations conformes au framework actif ; RLS et politiques pour toute nouvelle table applicative Supabase, le cas échéant.
- UI conforme au design existant, états pertinents, clavier et responsive vérifiés.
- Tests significatifs et contrôles de types/lint adaptés réellement exécutés.
- Commit ciblé publié et rapport indiquant les résultats et les limites.
- Preview isolée vérifiée après une fonctionnalité importante, sans substitution par un déploiement de production.
- Revue croisée du commit exact et vérification combinée enregistrées.

Aucune validation globale des quatre applications n'est déclarée dans cette livraison. Voir [P0](stabilization/p0-status.md) et les rapports sous `docs/verification/`.
