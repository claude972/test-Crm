// Rend l'application installable et rend une page hors connexion. Ce n'est pas
// un mode hors ligne. Voir docs/verification/hermes-pwa-degradation.md.

// Contenu figé, jamais récupéré sur le réseau : sur une preview protégée une
// requête d'installation reçoit la redirection de connexion Vercel, et un
// précache mettrait cette page de connexion à la place de celle-ci.
const OFFLINE_DOCUMENT = `<!doctype html>
<html lang="fr" translate="no"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><meta name="theme-color" content="#0073ea">
<title>Hors connexion — Hermès CRM</title>
<style>
:root{--surface:#fcfcfc;--panel:#fff;--border:#ebebeb;--text:#141414;--muted:#6b6b6b;--accent:#0073ea;--accent-text:#fff;--step:8px}
@media (prefers-color-scheme:dark){:root{--surface:#1b1b1b;--panel:#171717;--border:#333;--text:#f1f1f1;--muted:#a0a0a0;--accent:#4799f5;--accent-text:#0a0a0a}}
*{box-sizing:border-box}
body{margin:0;padding:calc(var(--step)*5) var(--step);background:var(--surface);color:var(--text);font-family:var(--t-font-family,sans-serif);font-size:15px;line-height:1.55;-webkit-text-size-adjust:100%}
main{max-width:560px;margin:0 auto}
.brand{font-weight:600;letter-spacing:-.01em;margin-bottom:calc(var(--step)*4)}
h1{margin:0 0 var(--step);font-size:26px;font-weight:700;letter-spacing:-.02em}
p{margin:0 0 calc(var(--step)*2);color:var(--muted)}
.panel{margin:calc(var(--step)*3) 0;border:1px solid var(--border);border-radius:var(--step);background:var(--panel);padding:calc(var(--step)*2)}
.panel h2{margin:0 0 var(--step);font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
ul{margin:0;padding-left:calc(var(--step)*2.5);color:var(--muted)}
li+li{margin-top:calc(var(--step)*.5)}
button{appearance:none;min-height:44px;padding:0 calc(var(--step)*2.5);border:1px solid var(--accent);border-radius:6px;background:var(--accent);color:var(--accent-text);font:inherit;font-weight:600;cursor:pointer;transition:opacity 120ms ease}
button:hover{opacity:.88}
button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.status{margin-top:calc(var(--step)*2);font-family:var(--t-code-font-family,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:12px;color:var(--muted)}
@media (prefers-reduced-motion:reduce){button{transition:none}}
</style></head>
<body><main>
<div class="brand">Hermès CRM</div>
<h1>Vous êtes hors connexion</h1>
<p>Hermès CRM lit vos clients, vos opportunités et vos conversations sur le serveur à chaque affichage. Sans réseau, ces données ne sont pas disponibles sur cet appareil.</p>
<div class="panel"><h2>Ce que fait l'application sans réseau</h2><ul>
<li>Elle reste installée et s'ouvre, mais affiche cette page au lieu du CRM.</li>
<li>Aucune fiche, aucun message et aucun média n'est conservé sur l'appareil : rien n'est consultable hors connexion.</li>
<li>Aucune saisie n'est mise en file d'attente. Ce qui n'a pas été enregistré avant la coupure doit être ressaisi.</li>
</ul></div>
<button type="button" id="retry">Réessayer</button>
<p class="status" id="status" role="status" aria-live="polite">Réseau : vérification…</p>
</main><script>
(function(){var s=document.getElementById('status'),r=document.getElementById('retry');
var render=function(){s.textContent=navigator.onLine?'Réseau : rétabli. Réessayez pour revenir au CRM.':'Réseau : toujours indisponible.'};
r.addEventListener('click',function(){window.location.replace('/')});
window.addEventListener('online',render);window.addEventListener('offline',render);render()})();
</script></body></html>`;

const offlineResponse = () =>
  new Response(OFFLINE_DOCUMENT, {
    status: 503,
    statusText: 'Service Unavailable',
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });

// Ce worker n'écrit jamais dans CacheStorage. On supprime seulement ce qu'une
// version antérieure y avait mis.
const deleteOurPreviousCaches = async () => {
  const names = await caches.keys();

  await Promise.all(
    names
      .filter((name) => name.startsWith('hermes-offline-'))
      .map((name) => caches.delete(name)),
  );
};

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(deleteOurPreviousCaches().then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') {
    return;
  }

  // Seul filtre, et il est positif : `navigate` ne couvre que le document.
  // GraphQL, REST, métadonnées, fichiers et médias ne sont jamais interceptés,
  // donc jamais lisibles, stockables ni rejouables par ce worker.
  if (request.mode !== 'navigate') {
    return;
  }

  // Une redirection de connexion revient telle quelle : la substituer
  // cacherait une session Vercel ou CRM expirée derrière « hors connexion ».
  event.respondWith(fetch(request).catch(offlineResponse));
});
