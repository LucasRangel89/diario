// Service worker do Diário de Cargas.
// Arquivos do próprio app: rede primeiro (sempre a versão nova quando há sinal), cache como reserva offline.
// Bibliotecas externas (Tailwind, Chart.js, fontes): cache primeiro. Troque VERSION só se mudar essas bibliotecas.
const VERSION = 'v1';
const CACHE = 'berzerker-' + VERSION;
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
const EXTERNAL = [
  'https://cdn.tailwindcss.com/3.4.17',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.js'
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(CORE);
    await Promise.allSettled(EXTERNAL.map(async u => {
      const rq = new Request(u, { mode: 'no-cors' });
      await c.put(rq, await fetch(rq));
    }));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

async function networkFirst(req) {
  const c = await caches.open(CACHE);
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch(req, { signal: ctrl.signal });
    clearTimeout(t);
    if (res.ok) c.put(req, res.clone());
    return res;
  } catch (_) {
    return (await c.match(req, { ignoreSearch: true }))
      || (req.mode === 'navigate' ? await c.match('./index.html') : Response.error());
  }
}

async function cacheFirst(req) {
  const c = await caches.open(CACHE);
  const hit = await c.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res.ok || res.type === 'opaque') c.put(req, res.clone());
    return res;
  } catch (_) { return Response.error(); }
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(new URL(req.url).origin === location.origin ? networkFirst(req) : cacheFirst(req));
});
