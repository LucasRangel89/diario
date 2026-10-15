// Service worker do Diário de Cargas.
// App 100% local (Tailwind e Chart.js empacotados em /vendor) — funciona offline na academia.
// Estratégia: rede primeiro para os arquivos do app (sempre a versão nova quando há sinal),
// cache como reserva offline. Incremente VERSION ao atualizar app/ativos para renovar o cache offline.
const VERSION = 'v31';
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
  './js/actions.js',
  './js/storage.js',
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
  './images/bosses/mu-de-aries.webp',
  './images/bosses/aldebaran-de-touro.webp',
  './images/bosses/saga-de-gemeos.webp',
  './images/bosses/mascara-da-morte-de-cancer.webp',
  './images/bosses/aiolia-de-leao.webp',
  './images/bosses/shaka-de-virgem.webp',
  './images/bosses/dohko-de-libra.webp',
  './images/bosses/milo-de-escorpiao.webp',
  './images/bosses/aiolos-de-sagitario.webp',
  './images/bosses/shura-de-capricornio.webp',
  './images/bosses/camus-de-aquario.webp',
  './images/bosses/grande-mestre.webp',
  './images/bosses/leao-de-nemeia.webp',
  './images/bosses/hidra-de-lerna.webp',
  './images/bosses/corca-de-cerineia.webp',
  './images/bosses/javali-de-erimanto.webp',
  './images/bosses/estabulos-de-augias.webp',
  './images/bosses/passaros-do-estinfalo.webp',
  './images/bosses/touro-de-crete.webp',
  './images/bosses/eguas-de-diomedes.webp',
  './images/bosses/cinturao-de-hipolita.webp',
  './images/bosses/rebanho-de-geriao.webp',
  './images/bosses/macas-das-hesperides.webp',
  './images/bosses/cerbero.webp',
  './images/bosses/o-predador.webp',
  './images/bosses/o-exterminador.webp',
  './images/bosses/tubarao.webp',
  './images/bosses/hans-gruber.webp',
  './images/bosses/ivan-drago.webp',
  './images/bosses/chucky.webp',
  './images/bosses/o-coringa.webp',
  './images/bosses/freddy-krueger.webp',
  './images/bosses/agent-smith.webp',
  './images/bosses/pennywise.webp',
  './images/bosses/thanos.webp',
  './images/bosses/darth-vader.webp',
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
  './images/bosses/draugr.webp',
  './images/bosses/troll-jovem-de-gelo.webp',
  './images/bosses/nokk-do-fiorde.webp',
  './images/bosses/huldra-da-floresta.webp',
  './images/bosses/fenrir.webp',
  './images/bosses/jormungandr.webp',
  './images/bosses/surtr.webp',
  './images/bosses/fafnir.webp',
  './images/bosses/nidhogg.webp',
  './images/bosses/skoll.webp',
  './images/bosses/ymir.webp',
  './images/bosses/ragnarok.webp',
  './images/bosses/provocador-da-arena.webp',
  './images/bosses/mirmilao-feroz.webp',
  './images/bosses/retiario-mestre.webp',
  './images/bosses/dupla-de-dimachaeri.webp',
  './images/bosses/hoplomaco.webp',
  './images/bosses/bestiario-e-pantera.webp',
  './images/bosses/venator-e-urso.webp',
  './images/bosses/leao-da-numidia.webp',
  './images/bosses/touro-da-arena.webp',
  './images/bosses/capitao-dos-pretorianos.webp',
  './images/bosses/comodo-o-imperador.webp',
  './images/bosses/maximo-o-gladiador.webp',
  './images/bosses/goblin-chefe.webp',
  './images/bosses/ogro-da-ponte.webp',
  './images/bosses/golem-de-pedra.webp',
  './images/bosses/necromante.webp',
  './images/bosses/hidra-do-pantano.webp',
  './images/bosses/grifo-guardiao.webp',
  './images/bosses/minotauro-da-masmorra.webp',
  './images/bosses/mago-negro.webp',
  './images/bosses/dragao-anciao.webp',
  './images/bosses/tita-de-ferro.webp',
  './images/bosses/rei-demonio.webp',
  './images/bosses/mestre-do-jogo.webp',
  './images/bosses/enxame-de-drones.webp',
  './images/bosses/pirata-espacial.webp',
  './images/bosses/androide-rebelde.webp',
  './images/bosses/mutante-das-luas.webp',
  './images/bosses/rainha-dos-insetos.webp',
  './images/bosses/colosso-estelar.webp',
  './images/bosses/leviatan-do-espaco.webp',
  './images/bosses/nucleo-de-ia-rebelde.webp',
  './images/bosses/dominio-sombrio.webp',
  './images/bosses/buraco-negro-vivo.webp',
  './images/bosses/devorador-de-planetas.webp',
  './images/bosses/imperador-galactico.webp',
  './images/bosses/goblins-de-moria.webp',
  './images/bosses/espectros-do-anel.webp',
  './images/bosses/balrog-de-morgoth.webp',
  './images/bosses/lurtz-o-uruk-hai.webp',
  './images/bosses/wargs-das-terras-bravias.webp',
  './images/bosses/uruk-hai-do-abismo-de-helm.webp',
  './images/bosses/saruman-o-branco.webp',
  './images/bosses/espectros-de-dunharrow.webp',
  './images/bosses/laracna.webp',
  './images/bosses/rei-bruxo-de-angmar.webp',
  './images/bosses/gollum-o-portador-caido.webp',
  './images/bosses/sauron-o-senhor-do-anel.webp'
,
  './images/temas/classico.webp',
  './images/temas/zodiaco.webp',
  './images/temas/hercules.webp',
  './images/temas/acao.webp',
  './images/temas/folclore.webp',
  './images/temas/nordica.webp',
  './images/temas/roma.webp',
  './images/temas/rpg.webp',
  './images/temas/galactica.webp',
  './images/temas/aneis.webp',
  './images/bosses/reserva/index.json',
  './images/badges/primeiro-sangue.webp'
  './images/badges/ofensiva-semanal.webp'
  './images/badges/mover-titan.webp'
  './images/badges/cacador-de-prs.webp'
  './images/badges/maratonista.webp'
  './images/badges/tanque-de-guerra.webp'
  './images/badges/berzerker-master.webp'
  './images/badges/cacador-de-chefoes.webp'
  './images/badges/primeiro-deload.webp'
  './images/badges/semana-completa.webp'
  './images/badges/colecionador.webp'
  './images/badges/mestre-dos-chefoes.webp'
  './images/badges/mes-de-ferro.webp'
  './images/badges/corredor.webp'
  './images/badges/sequencia-de-aco.webp'
  './images/badges/nivel-10.webp'
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
