// Servi depuis public/ : doit rester à la racine pour que la portée du worker
// couvre toute l'application.
export const HERMES_SERVICE_WORKER_PATH = '/hermes-service-worker.js';

// La purge ne doit jamais retenir une déconnexion.
export const HERMES_PURGE_TIMEOUT_IN_MS = 1000;
