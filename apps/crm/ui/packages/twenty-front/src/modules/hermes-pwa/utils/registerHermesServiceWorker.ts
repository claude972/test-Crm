import { HERMES_SERVICE_WORKER_PATH } from '@/hermes-pwa/constants/hermesServiceWorker';
import { getIsDevelopmentEnvironment } from '~/utils/getIsDevelopmentEnvironment';
import { logError } from '~/utils/logError';

export type HermesServiceWorkerOutcome =
  | 'registered'
  // Le navigateur n'a pas l'API, ou la page n'est pas en contexte sécurisé
  // (http sur un hôte distant) : l'installation PWA n'est pas possible et
  // l'application fonctionne exactement comme avant.
  | 'unsupported'
  | 'insecure-context'
  // En développement, un service worker qui répond aux navigations se met en
  // travers du rechargement à chaud de Vite.
  | 'skipped-development'
  | 'failed';

/*
 * Enregistre public/hermes-service-worker.js.
 *
 * Ce que cela apporte : l'application devient installable (Chrome et Edge
 * exigent un service worker qui répond à une navigation hors connexion ; iOS
 * Safari se contente du manifeste et de l'icône, déjà présents), et une
 * navigation sans réseau affiche /hors-connexion.html au lieu de l'erreur du
 * navigateur.
 *
 * Ce que cela n'apporte pas : aucun fonctionnement hors ligne du CRM. Le
 * service worker ne met en cache ni GraphQL, ni REST, ni les métadonnées, ni
 * les fichiers, ni les médias, ni index.html.
 */
export const registerHermesServiceWorker =
  async (): Promise<HermesServiceWorkerOutcome> => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return 'unsupported';
    }

    if (getIsDevelopmentEnvironment()) {
      /*
       * Le serveur de développement partage souvent son origine (localhost)
       * avec un build de production visité auparavant. Un service worker resté
       * enregistré intercepterait les navigations de Vite, donc on le retire
       * plutôt que de laisser un bug de rechargement inexplicable.
       */
      try {
        const registrations =
          await navigator.serviceWorker.getRegistrations();

        await Promise.all(
          registrations
            .filter((registration) =>
              (registration.active?.scriptURL ?? '').endsWith(
                HERMES_SERVICE_WORKER_PATH,
              ),
            )
            .map((registration) => registration.unregister()),
        );
      } catch (error) {
        logError(error);
      }

      return 'skipped-development';
    }

    // `isSecureContext` couvre https et localhost. Sans lui, register() lève.
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      return 'insecure-context';
    }

    try {
      await navigator.serviceWorker.register(HERMES_SERVICE_WORKER_PATH, {
        scope: '/',
        // Le navigateur ne doit pas servir une version périmée du worker
        // depuis son cache HTTP lors de la vérification de mise à jour.
        updateViaCache: 'none',
      });

      return 'registered';
    } catch (error) {
      // Dit explicitement : l'application marche sans, mais elle n'est alors
      // pas installable et n'a pas de page hors connexion.
      logError(error);

      return 'failed';
    }
  };
