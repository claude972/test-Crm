// Chemin servi tel quel depuis `public/` : il doit rester à la racine pour que
// la portée du service worker couvre toute l'application.
export const HERMES_SERVICE_WORKER_PATH = '/hermes-service-worker.js';

export const HERMES_OFFLINE_PAGE_PATH = '/hors-connexion.html';

// La purge ne doit jamais retenir une déconnexion. Au-delà de ce délai on
// rapporte `not-confirmed` plutôt que de bloquer la sortie de session.
export const HERMES_PURGE_TIMEOUT_IN_MS = 1000;
