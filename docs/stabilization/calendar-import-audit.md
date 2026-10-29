# Cal.diy — audit de provenance préalable à la reprise

Date : 29 octobre 2026. Sources conservées dans le checkout initial, sans modification. Cet audit ne publie pas l'application et ne valide pas son fonctionnement.

## Provenance vérifiée

- Dépôt upstream : https://github.com/calcom/cal.diy
- Révision déclarée et vérifiée : [commit upstream](https://github.com/calcom/cal.diy/commit/56da01b4b1664894b784aca636eccab0c56cc141).
- Arbre du commit : `a71f484c344db0e7cfcbbae00971d5248545ca05` ; réponse de l'arbre récursif non tronquée.
- Comparaison des blobs Git locaux avec l'arbre upstream : 7 690 fichiers identiques, 10 fichiers modifiés et un fichier ajouté (`UPSTREAM.json`). La comparaison calcule le hash Git du contenu ; elle ne se limite pas à des tailles ou dates de fichiers.

## Adaptations locales à examiner

- `.dockerignore`
- `Dockerfile`
- `apps/web/lib/app-providers.tsx`
- `apps/web/modules/bookings/components/Booker.tsx`
- `apps/web/next.config.ts`
- `packages/app-store/dailyvideo/_metadata.ts`
- `packages/app-store/googlecalendar/_metadata.ts`
- `packages/app-store/googlevideo/_metadata.ts`
- `packages/app-store/stripepayment/_metadata.ts`
- `packages/i18n/next-i18next.config.js`

Le fichier UPSTREAM.json local décrit les adaptations de construction Docker, imports navigateur, instrumentation serveur et mémoire. Ces déclarations doivent être comparées aux différences exactes avant reprise ; elles ne sont pas une preuve de build sur la branche P0.

## Contrôle de secrets

Gitleaks a analysé environ 84,5 Mo et signalé 206 détections : 195 generic-api-key, cinq stripe-access-token, quatre curl-auth-header, un jwt et une private-key. Parmi elles, 164 concernent i18n.lock. D'autres concernent exemples, fixtures, documentation, traductions ou télémétrie.

Le nombre de détections ne constitue pas une preuve de secrets réels, et la présence dans un dépôt public ne suffit pas à justifier une exemption. Qualifier chaque contexte et conserver uniquement des exceptions précisément justifiées avant publication. Aucun contenu détecté ni rapport brut n'est ajouté au dépôt.

## Limites et ordre de reprise

Conserver licences et provenance ; distinguer le socle upstream des dix adaptations locales pour la revue. Ne pas remplacer les sources locales ou modifier les bases. Les règles propres au sous-projet restent applicables aux correctifs. Le build, les types, les courriels de confirmation et la réservation de bout en bout ne sont pas validés par cet audit. Le profil calendar refuse actuellement de démarrer ou construire quand les sources sont absentes du checkout P0.
