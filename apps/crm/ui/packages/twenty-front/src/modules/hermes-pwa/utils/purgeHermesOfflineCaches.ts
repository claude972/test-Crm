import { HERMES_PURGE_TIMEOUT_IN_MS } from '@/hermes-pwa/constants/hermesServiceWorker';

export type HermesOfflineCachePurgeOutcome =
  | 'nothing-to-clear'
  | 'cleared'
  | 'not-confirmed'
  | 'failed';

// Supprime tous les caches de l'origine, pas seulement les nôtres, et ne rejette
// jamais : une déconnexion ne doit pas échouer parce que CacheStorage est
// indisponible. Raisons et portée : docs/verification/hermes-pwa-degradation.md.
export const purgeHermesOfflineCaches =
  async (): Promise<HermesOfflineCachePurgeOutcome> => {
    // Absente en jsdom, en contexte non sécurisé et quand le stockage est
    // bloqué : rien n'a pu être écrit, donc rien n'est resté.
    if (typeof caches === 'undefined') {
      return 'nothing-to-clear';
    }

    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const timeout = new Promise<HermesOfflineCachePurgeOutcome>((resolve) => {
      timeoutId = setTimeout(
        () => resolve('not-confirmed'),
        HERMES_PURGE_TIMEOUT_IN_MS,
      );
    });

    const purge = (async (): Promise<HermesOfflineCachePurgeOutcome> => {
      // Peut lever, et pas seulement rendre une liste vide, quand le navigateur
      // refuse l'accès au stockage.
      const names = await caches.keys();

      if (names.length === 0) {
        return 'nothing-to-clear';
      }

      const deletions = await Promise.all(
        names.map((name) => caches.delete(name)),
      );

      // `false` veut dire « ce cache n'existait pas » : pas une purge confirmée.
      return deletions.every((isDeleted) => isDeleted)
        ? 'cleared'
        : 'not-confirmed';
    })();

    try {
      return await Promise.race([purge, timeout]);
    } catch {
      return 'failed';
    } finally {
      clearTimeout(timeoutId);
    }
  };
