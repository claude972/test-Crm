# Adaptateur de statut Evolution — premier lot serveur

Base exacte : `afe0cb3fdea9f6a6a78098d71c6be4a2dc203e45` de `feat/codex-hermes-integration`. Branche isolée `feat/codex-evolution-adapter`, worktree sparse propre à cet agent. AGENTS.md, DESIGN.md, règles UI et coordination actuelle lus. Propriété limitée à ce dossier ; aucun CoreEngineModule, factory metadata, modèle DB, SMTP, prospection ou source frontend modifié.

## Audit et protocole retenu

Recherche du serveur existant : aucun transport Evolution/WhatsApp natif identifié dans les sources métier ; seul un champ de contact `whatsapp` est semé par le dev-seeder. Le mécanisme existant `secure-http-client/utils/create-ssrf-safe-agent.util.ts` est réutilisé, sans modifier ses fichiers ni utiliser le service dont le mode sûr peut être globalement désactivé.

Documentation officielle vérifiée par navigateur le 30 octobre 2026 : [Connection State](https://docs.evoapicloud.com/api-reference/instance-controller/connection-state). Contrat : GET `/instance/connectionState/{instance}`, en-tête `apikey`, objet `instance` contenant `instanceName` et `state`. Le portail historique a répondu 404/502 lors d'ouvertures directes ; le résultat indexé officiel et le code officiel ont été vérifiés en complément.

Snapshot upstream inspecté : `fa09d37892cdbb1d65a250155d293d92230c5b30`, dont [package.json](https://github.com/evolution-foundation/evolution-api/blob/fa09d37892cdbb1d65a250155d293d92230c5b30/package.json) annonce **2.3.7**. [Route officielle](https://github.com/evolution-foundation/evolution-api/blob/fa09d37892cdbb1d65a250155d293d92230c5b30/src/api/routes/instance.router.ts), [contrôleur](https://github.com/evolution-foundation/evolution-api/blob/fa09d37892cdbb1d65a250155d293d92230c5b30/src/api/controllers/instance.controller.ts), [auth guard](https://github.com/evolution-foundation/evolution-api/blob/fa09d37892cdbb1d65a250155d293d92230c5b30/src/api/guards/auth.guard.ts) et construction du paramètre dans `abstract.router.ts` inspectés. L'adaptateur cible ce contrat v2 ; il ne détecte ni ne prétend certifier la version d'un serveur déployé.

## Configuration et comportement

Construire `EvolutionConnectionAdapter(serializedConnections, options?)` exclusivement depuis une source de secrets serveur autorisée. Proposition de nom de configuration à intégrer par root : `HERMES_EVOLUTION_CONNECTIONS`, jamais variable publique/client. Format JSON : objet indexé par UUID workspace, chaque entrée contenant seulement `baseUrl`, `instanceName`, `apiKey`. Taille <=64 Kio, <=100 workspaces ; noms d'instance limités à des caractères de segment sûrs, clé sans caractère de contrôle. Une même origine/instance ne peut être attribuée à deux workspaces. Aucun setter, endpoint de configuration ou stockage nouveau n'est créé.

`probe(workspaceId)` sélectionne uniquement cette entrée, jamais un paramètre d'instance envoyé par le navigateur ; UUID invalide refusé et workspace non configuré = NOT_CONFIGURED sans requête. L'appelant doit avoir **déjà autorisé** ce workspace via les guards et permissions existants : l'adaptateur n'est pas un service d'authentification.

Le seul appel réseau est le GET de statut, sans fetchInstances global, création/connexion/QR/logout ni envoi. CONNECTED exige HTTP 200, objet valide, nom exact de l'instance attendue et `state=open`. `close` = DISCONNECTED, `connecting` = CONNECTING. Toutes les autres formes, erreurs et réponses d'une autre instance restent UNAVAILABLE ; aucune valeur CONNECTED par défaut ni cache d'un ancien succès. Le timestamp est le début du probe. La réponse contient uniquement workspaceId, provider, status, providerState, checkedAt et errorCode ; ni clé, URL, instanceName ou corps d'erreur fournisseur.

**CONNECTED décrit uniquement l'état d'instance rapporté par Evolution à cet instant.** Ce n'est pas une preuve d'envoi, de réception, d'association à un compte WhatsApp réel ou d'absence de panne ultérieure. Un canal non WhatsApp configuré à tort chez le fournisseur peut aussi rapporter open ; l'opérateur devra qualifier le type d'instance avant activation. Aucun serveur Evolution réel ni téléphone n'est utilisé dans cette livraison.

## Réseau et secrets

- HTTPS exigé, sans identifiants dans l'URL, chemin, query ou fragment. HTTP accepté uniquement pour 127.0.0.1, et reste bloqué par l'agent tant qu'une exception opérateur exacte n'existe pas ; cette possibilité sert la fixture locale.
- IP privées/DNS privé bloqués par défaut à l'ouverture de socket ; protections IPv4/IPv6 existantes réutilisées. `allowedInternalHosts` n'est fourni que par l'opérateur serveur, hors JSON et GraphQL ; pas de wildcard. Les métadonnées link-local restent bloquées même avec exception.
- Pas de redirection (donc aucun transfert d'apikey à une destination redirigée), pas de proxy ambiant, vérification TLS standard intacte, timeout/AbortSignal par probe 3 s par défaut (bornes 10–10000 ms), taille de réponse bornée à16 Kio, agents détruits en finally.
- Aucune erreur Axios, cause, corps fournisseur ou Zod brut renvoyé/loggé. La configuration est conservée en champ privé JavaScript, absente de JSON.stringify(adapter). Les erreurs de configuration sont génériques ; aucune clé originale lue ou publiée.

## Contrat GraphQL proposé, non exposé dans ce lot

```graphql
enum HermesEvolutionProbeStatus {
  NOT_CONFIGURED
  CONNECTED
  CONNECTING
  DISCONNECTED
  UNAVAILABLE
}

enum HermesEvolutionProbeErrorCode {
  AUTHENTICATION_FAILED
  INSTANCE_NOT_FOUND
  TIMEOUT
  INVALID_RESPONSE
  PROVIDER_ERROR
  REQUEST_FAILED
}

type HermesEvolutionConnectionProbe {
  workspaceId: UUID!
  provider: String!
  status: HermesEvolutionProbeStatus!
  providerState: String
  checkedAt: DateTime!
  errorCode: HermesEvolutionProbeErrorCode
}

extend type Query {
  hermesEvolutionConnection: HermesEvolutionConnectionProbe!
}
```

Le resolver proposé dérive le workspace courant du contexte authentifié et vérifie sa permission de consultation des connexions ; aucun argument de baseUrl, clé, instance ou workspace arbitraire. Pour un futur dashboard multi-structure, autoriser le périmètre par le contrat de structures avant chaque probe, sans réutiliser implicitement une clé d'un autre workspace. Configurer par gestionnaire de secrets opérateur ; une mutation publique recevant les clés est hors de ce lot. Root doit choisir le guard/permission exact et intégrer le provider dans son module ; aucun resolver accessible n'est prétendu livré ici.

## Vérifications et limites

**38 tests passent**, une suite Jest ciblée `--runInBand --runTestsByPath`, dépendances existantes en lecture seule, configuration/cache dans `/private/tmp`. La fixture est un serveur HTTP Node synthétique sur loopback : vraies requêtes Axios/en-têtes/URL, pas un serveur Evolution. États, workspace A/B/C, absence de configuration, formats inattendus, erreur/auth/404, redirection, timeout, taille, non-conservation d'un ancien succès, IP privée/DNS localhost, métadonnées IPv4/IPv6, secrets et configuration invalide couverts. Aucun appel externe ou service Railway existant.

TypeScript ciblé aux quatre nouveaux fichiers et à leurs imports de sécurité, sans compiler tout le dépôt : le premier passage avec `strictFunctionTypes=true` supplémentaire signalait deux incompatibilités préexistantes de callback dans create-ssrf-safe-agent (lignes79/102). Ce flag n'est pas activé par le projet. Recontrôle avec ses règles de variance, autres contrôles stricts conservés : **réussi, zéro diagnostic**. Aucun helper partagé modifié pour masquer ce diagnostic.

Prettier ciblé, diff check et Gitleaks sur le diff staged (~29 Kio, zéro détection) réussis. Pas de DB/migration, de test TLS réel, d'appareil WhatsApp, d'envoi, de webhook entrant, de cache inter-workspace, de construction cloud, de resolver ou de preview de ce connecteur. Les 38 tests ne valident pas ces étapes ; l'intégration et la recette réelle restent à root après revue de ce commit exact.
