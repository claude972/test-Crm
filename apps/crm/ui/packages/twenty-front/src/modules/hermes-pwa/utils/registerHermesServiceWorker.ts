import { HERMES_SERVICE_WORKER_PATH } from '@/hermes-pwa/constants/hermesServiceWorker';
import { getIsDevelopmentEnvironment } from '~/utils/getIsDevelopmentEnvironment';
import { logError } from '~/utils/logError';

export type HermesServiceWorkerOutcome =
  | 'registered'
  | 'unsupported'
  | 'insecure-context'
  | 'skipped-development'
  | 'failed';

// Rend l'application installable et donne une page hors connexion ; n'apporte
// aucun fonctionnement hors ligne du CRM. Ce que cela couvre exactement :
// docs/verification/hermes-pwa-degradation.md.
export const registerHermesServiceWorker =
  async (): Promise<HermesServiceWorkerOutcome> => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return 'unsupported';
    }

    if (getIsDevelopmentEnvironment()) {
      // Le serveur de développement partage souvent son origine avec un build
      // de production visité avant : un worker resté là intercepterait les
      // navigations de Vite et casserait le rechargement à chaud.
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();

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

    // Couvre https et localhost. Sans ce garde, register() lève.
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      return 'insecure-context';
    }

    try {
      await navigator.serviceWorker.register(HERMES_SERVICE_WORKER_PATH, {
        scope: '/',
        updateViaCache: 'none',
      });

      return 'registered';
    } catch (error) {
      // L'application marche sans : elle n'est alors ni installable, ni dotée
      // d'une page hors connexion.
      logError(error);

      return 'failed';
    }
  };
