import { HERMES_PURGE_TIMEOUT_IN_MS } from '@/hermes-pwa/constants/hermesServiceWorker';

export type HermesOfflineCachePurgeOutcome =
  // CacheStorage était vide, ou l'API n'existe pas sur cette plateforme : rien
  // n'a pu rester sur l'appareil.
  | 'nothing-to-clear'
  | 'cleared'
  // Le délai a expiré, ou une suppression a répondu « absent ». On ne promet
  // pas que l'appareil est propre.
  | 'not-confirmed'
  | 'failed';

/*
 * Supprime TOUS les caches de cette origine, pas seulement ceux du service
 * worker Hermès.
 *
 * Notre service worker n'écrit que deux fichiers publics, donc il n'y a en
 * principe rien de privé à purger : l'invariant est tenu à l'écriture, pas ici.
 * Cette fonction est la ceinture : si une version antérieure du service worker,
 * ou un autre code sur cette origine, a laissé une réponse privée dans
 * CacheStorage, elle ne doit pas survivre à la fin de la session sur cet
 * appareil. Nos deux fichiers publics seront reprécachés à la prochaine
 * activation ; les perdre ne coûte rien.
 *
 * Ne rejette jamais : une déconnexion ne doit pas échouer parce que
 * CacheStorage est indisponible (navigation privée, stockage bloqué, contexte
 * non sécurisé).
 */
export const purgeHermesOfflineCaches =
  async (): Promise<HermesOfflineCachePurgeOutcome> => {
    // Absente en jsdom, en contexte non sécurisé et quand le stockage est
    // bloqué. Rien n'a alors pu être écrit, donc rien n'est resté.
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
      // `caches.keys()` peut lever quand le stockage est refusé par le
      // navigateur, pas seulement renvoyer une liste vide.
      const names = await caches.keys();

      if (names.length === 0) {
        return 'nothing-to-clear';
      }

      const deletions = await Promise.all(
        names.map((name) => caches.delete(name)),
      );

      // `false` signifie « ce cache n'existait pas » : on ne le présente pas
      // comme une purge confirmée.
      return deletions.every((isDeleted) => isDeleted) ? 'cleared' : 'not-confirmed';
    })();

    try {
      return await Promise.race([purge, timeout]);
    } catch {
      return 'failed';
    } finally {
      // Nettoyé sur tous les chemins : un timer pendant garderait la boucle
      // d'événements occupée après la déconnexion et fuirait d'un test à
      // l'autre sous faux timers.
      clearTimeout(timeoutId);
    }
  };
