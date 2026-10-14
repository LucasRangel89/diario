// Service worker do Diário de Cargas.
// App 100% local (Tailwind e Chart.js empacotados em /vendor) — funciona offline na academia.
// Estratégia: rede primeiro para os arquivos do app (sempre a versão nova quando há sinal),
// cache como reserva offline. Incremente VERSION ao atualizar app/ativos para renovar o cache offline.
const VERSION = 'v14';
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
  './js/custom_exercises.js',
  './js/app.js',
  './images/bosses/golem-anilhas.webp',
  './images/bosses/hidra-titanio.webp',
  './images/bosses/mecagorila.webp',
  './images/bosses/behemoth.webp',
  './images/bosses/cavaleiro-de-ferro.webp',
  './images/bosses/ogro-da-bigorna.webp',
  './images/bosses/quimera-blindada.webp',
  './images/bosses/dragao-de-aco.webp',
  './images/bosses/minotauro-das-forjas.webp',
  './images/bosses/leviatan-de-ferro.webp',
  './images/bosses/tita-de-escorcia.webp',
  './images/bosses/colosso-das-forjas.webp',
  './images/bosses/saci.webp',
  './images/bosses/curupira.webp',
  './images/bosses/caipora.webp',
  './images/bosses/lobisomem.webp',
  './images/bosses/cuca.webp',
  './images/bosses/mula-sem-cabeca.webp',
  './images/bosses/iara.webp',
  './images/bosses/boto.webp',
  './images/bosses/boitata.webp',
  './images/bosses/naia.webp',
  './images/bosses/mapinguari.webp',
  './images/bosses/anhanguera.webp',
  './images/bosses/mu-de-aries.webp',
  './images/bosses/aldebaran-de-touro.webp',
  './images/bosses/leao-de-nemeia.webp',
  './images/bosses/hidra-de-lerna.webp',
  './images/bosses/o-predador.webp',
  './images/bosses/retiario-mestre.webp'
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
