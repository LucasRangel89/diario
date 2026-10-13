// Service worker do Diário de Cargas.
// App 100% local (Tailwind e Chart.js empacotados em /vendor) — funciona offline na academia.
// Estratégia: rede primeiro para os arquivos do app (sempre a versão nova quando há sinal),
// cache como reserva offline. Troque VERSION ao mudar bibliotecas locais.
const VERSION = 'v8';
const CACHE = 'berzerker-' + VERSION;
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './vendor/tailwind.css',
  './vendor/chart.umd.js',
  './js/catalogo.js',
  './js/gamificacao.js',
  './js/assistente.js',
  './js/planilha_data.js',
  './js/historico.js',
  './js/busca.js',
  './js/app.js',
  './images/bosses/golem-anilhas.jpg',
  './images/bosses/hidra-titanio.jpg',
  './images/bosses/mecagorila.jpg',
  './images/bosses/behemoth.jpg',
  './images/bosses/saci.jpg',
  './images/bosses/curupira.jpg',
  './images/bosses/caipora.jpg',
  './images/bosses/lobisomem.jpg',
  './images/bosses/cuca.jpg',
  './images/bosses/mula-sem-cabeca.jpg',
  './images/bosses/iara.jpg',
  './images/bosses/boto.jpg',
  './images/bosses/boitata.jpg',
  './images/bosses/naia.jpg',
  './images/bosses/mapinguari.jpg',
  './images/bosses/anhanguera.jpg'
];
const EXTERNAL = [
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;900&family=Oswald:wght@500;600;700&family=Teko:wght@500;600;700&display=swap'
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
