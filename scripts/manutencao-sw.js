// Service worker publicado NO LUGAR do sw.js real enquanto o site está em manutenção
// (arquivo MANUTENCAO presente na raiz; ver docs/MANUTENCAO.md).
//
// Ele é o oposto do sw.js do app: não pré-cacheia nada e não responde pelo cache.
// Motivo: durante a manutenção o único conteúdo publicado é manutencao.html, então
// guardar o app em cache só criaria a ilusão de que ele ainda está no ar. Quando o
// app volta, o sw.js de verdade (com VERSION nova) assume e repopula o CORE.
//
// Contrato com scripts/check-sw.js: VERSION no formato vNN, CORE como lista de
// './caminho' e todos os itens existentes no artefato. O artefato de manutenção
// NÃO tem index.html (é o que faz toda URL responder 404), então a lista aponta
// para o único arquivo publicado. Nada é pré-cacheado: a lista serve à checagem.
const VERSION = 'v76';
const CORE = ['./404.html'];
const EXTERNAL = [];

self.addEventListener('install', () => {
    // Assume na hora: não há cache para preparar.
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
    // Rede pura. Sem cache não há como servir uma versão antiga do app por engano.
    event.respondWith(fetch(event.request));
});
