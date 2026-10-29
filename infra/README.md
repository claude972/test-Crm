> Note P0 : les confirmations historiques de construction, comptes et courriels ci-dessous concernent l'installation locale antérieure. Elles ne constituent pas des contrôles exécutés sur la branche P0. Consulter `docs/verification/` pour les contrôles actuels. Cal.diy et certaines réparations frontend restent à publier ; ne pas supposer que tous les profils se construisent depuis cette branche.

# Outils clients du CRM

Les sources sont conservées dans trois applications indépendantes :

| Module                          | Sources             | Accès local après démarrage | Navigation CRM   |
| ------------------------------- | ------------------- | --------------------------- | ---------------- |
| KovaaLab Char, issu de Chatwoot | `apps/crm/bot`      | `http://localhost:3011`     | `/tools/char`    |
| KovaaLab Forms                  | `apps/crm/form`     | `http://localhost:9157`     | `/tools/forms`   |
| Cal.diy                         | `apps/crm/calendar` | `http://localhost:3010`     | `/tools/cal-diy` |

Cal.diy est importé sans renommage des identifiants. Son dépôt et son commit sont consignés dans `apps/crm/calendar/UPSTREAM.json`, avec sa licence conservée.

## Configuration et lancement

Depuis la racine du dépôt, avec Docker démarré :

```sh
node scripts/customer-tools.mjs setup
node scripts/customer-tools.mjs validate calendar
node scripts/customer-tools.mjs build calendar
node scripts/customer-tools.mjs start calendar
node scripts/customer-tools.mjs status calendar
node scripts/customer-tools.mjs stop calendar
```

Remplacer `calendar` par `char` ou `forms` pour les autres modules. `setup` crée les secrets dans `.runtime/customer-tools.env` (ignoré par Git, permissions 0600) et conserve les valeurs existantes. Les profils ont leurs propres bases et volumes ; leurs bases ne sont pas exposées sur l’hôte. Les interfaces sont exposées seulement sur `127.0.0.1`.

Par défaut, le script utilise le contexte Docker `colima-hermes-crm`. `DOCKER_BIN` permet de préciser le chemin du binaire et `DOCKER_CONTEXT` un autre contexte. Sur le poste de développement actuel, Docker est dans `/Users/claudebrafa/.local/bin/docker`.

Exemple :

```sh
DOCKER_BIN=/Users/claudebrafa/.local/bin/docker node scripts/customer-tools.mjs build forms
```

Les volumes et images de ce contexte résident sur le disque externe, dans la VM Colima déplacée sous `/Volumes/Stockage/dev/hermes-crm/runtime-local`. Les sources de Char et Forms sont construites localement. Cal.diy est également construit depuis ses sources ; aucune image tierce n’est substituée aux applications clonées. La construction nécessite Docker Buildx. Le profil Colima actuel réserve 70 Gio de disque sur Stockage ; un disque virtuel de 30 Gio ne suffit pas aux images et caches de ces trois applications.

Cal.diy utilise la cible Docker `runner` et Next.js en production. La compilation des pages, le contrôle TypeScript et la génération des 88 pages statiques ont réussi. La construction utilise Webpack dans un processus distinct avec les optimisations mémoire ; le contrôle TypeScript reste activé. Le conteneur local n’utilise plus de volume de cache qui masquerait le dossier `.next` compilé.

Les imports Node incompatibles avec le navigateur ont été corrigés et Sentry est chargé nativement côté serveur. Les secrets réels sont transmis au démarrage ; la construction emploie des valeurs factices. Le démarrage applique les migrations Prisma et initialise le catalogue des applications. Les deux fichiers de swap permanents totalisent 6 Gio ; les fichiers temporaires et anciens caches de développement ont été retirés.

Le compte Cal.diy dispose d’un planning de test du lundi au vendredi, de 9 h à 17 h, en heure de Martinique. Les créneaux et le formulaire public ont été vérifiés dans le navigateur ; la confirmation et ses courriels restent à contrôler.

## Courriels de test

Mailpit capture les courriels sur cette installation locale, sans relais externe. Son interface est accessible sur `http://localhost:8025` et son serveur SMTP sur `127.0.0.1:1025`. Les conteneurs utilisent `mailpit:1025`. Les envois de Char, Forms et Cal.diy ont été vérifiés, notamment les demandes de réinitialisation de mot de passe. Aucun mot de passe n’a été modifié par ces essais.

Les comptes administrateurs locaux du CRM et des trois modules sont créés. Leurs identifiants distincts sont conservés dans `.runtime/admin-accounts.json`, ignoré par Git et accessible uniquement au propriétaire. Le CRM utilise l’espace existant renommé Hermès CRM ; ses données de démonstration sont conservées.

La commande `start` attend la disponibilité des services pendant dix minutes au maximum et échoue si leur état de santé ne devient pas satisfaisant.

## Redémarrer la VM sur Stockage

Sur le poste actuel, vérifier que `/Volumes/Stockage/dev/hermes-crm/runtime-local` est accessible avant de démarrer la VM existante :

```sh
COLIMA_HOME=/Volumes/Stockage/dev/hermes-crm/runtime-local/colima \
LIMA_HOME=/Volumes/Stockage/dev/hermes-crm/runtime-local/lima \
/Users/claudebrafa/.local/bin/colima start hermes-crm --activate=false
```

La construction du serveur et de l’interface CRM doit être effectuée avec les applications et la VM arrêtées sur ce poste de 8 Gio ; la construction de Cal.diy doit être effectuée avec les processus CRM arrêtés.

Sur ce poste de 8 Gio, la VM utilise 4 Gio de RAM et 6 Gio de swap sur le disque externe (fichiers de 2 et 4 Gio). L’ouverture de nouvelles pages Cal.diy en développement a épuisé la mémoire avec seulement 2 Gio de swap. Le profil Colima local réactive désormais les deux fichiers présents à son démarrage ; leur activation automatique a été vérifiée après un arrêt et un redémarrage complets de la VM. Le poste physique n’a pas été redémarré pendant cette vérification.

Les sources, journaux, images et volumes de cette VM résident sur le disque externe. Arrêter les applications et la VM avant de débrancher le disque.

## Adresses dans le CRM

Les onglets restent visibles et indiquent explicitement qu’un module n’est pas connecté lorsque son adresse manque. Après avoir vérifié le démarrage d’un module, renseigner son adresse publique dans l’environnement du frontend, puis redémarrer Vite ou reconstruire le frontend :

```dotenv
REACT_APP_CHAR_URL=http://localhost:3011
REACT_APP_FORMS_URL=http://localhost:9157
REACT_APP_CAL_DIY_URL=http://localhost:3010
```

Ces valeurs ne doivent contenir aucun jeton ni mot de passe. Les liens acceptent seulement HTTP/HTTPS et refusent les identifiants inclus dans une URL.

Chaque module s’ouvre dans son propre onglet et conserve sa propre authentification. Il ne s’agit pas encore d’une connexion unique ni d’une synchronisation des contacts, des réponses aux formulaires et des réservations avec les objets du CRM. Ces flux demandent des intégrations serveur et des webhooks distincts. Les restrictions d’intégration en iframe des applications restent actives.
