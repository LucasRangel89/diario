/* ============================================================
   SMOKE TEST DE UI — sobe o app inteiro num DOM falso (jsdom)
   ------------------------------------------------------------
   Roda com: npm run test:ui  (precisa de `npm install` uma vez).
   Garante: boot sem erro, navegação, aba 🔎 Buscar (tags acumulativas,
   filtros, presets, ordenação), seletor rápido (modal), busca no histórico,
   registro com tags — testes adaptados da PR #2 — e o Assistente de Treinos
   (Fase 2: ordem sugerida · Fase 3: fadiga real + próximo treino + montador).
   ============================================================ */
let JSDOM, VirtualConsole;
try { ({ JSDOM, VirtualConsole } = require('jsdom')); } catch (e) {
    // Falha EXPLÍCITA: sem jsdom os testes de UI não rodaram, e isso não pode virar aprovação.
    console.error('\n❌ jsdom não está instalado: os testes de UI NÃO foram executados. Rode `npm ci`.');
    process.exit(1);
}
const fs = require('fs');
const vm = require('vm');

// ---------- console virtual: erro não capturado vira falha ----------
const jsErrors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', e => jsErrors.push(String(e.message || e)));
virtualConsole.on('error', (...a) => jsErrors.push(a.join(' ')));

let html = fs.readFileSync('index.html', 'utf8');
// remove scripts externos (fontes/tailwind CDN não existem aqui)
html = html.replace(/<script src="https:\/\/[^"]+"><\/script>/g, '');
const dom = new JSDOM(html, {
    runScripts: 'dangerously',        // executa os scripts clássicos do app (handlers agora via delegação)
    pretendToBeVisual: true,
    url: 'http://localhost/',
    virtualConsole
});
const { window } = dom;
const document = window.document;
const ctx = dom.getInternalVMContext();

// ---------- stubs de browser ----------
// Canvas sem implementação real: objeto "auto-semelhante" que aceita qualquer
// chamada/propriedade (o Story Card desenha à vontade sem quebrar).
const makeCtx = () => new Proxy(function () { }, {
    get: (t, k) => (k === 'canvas' ? { width: 1080, height: 1920 } : makeCtx()),
    set: () => true,
    apply: () => makeCtx()
});
window.HTMLCanvasElement.prototype.getContext = () => makeCtx();
window.Chart = class { constructor() { return { destroy() { }, resize() { }, update() { } }; } };
window.Element.prototype.scrollIntoView = function () { };
window.scrollTo = () => { };
window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() { }, removeListener() { } }));
window.alert = () => { };
Object.defineProperty(window.navigator, 'vibrate', { value: () => true, configurable: true });
Object.defineProperty(window.navigator, 'serviceWorker', { value: { register: () => Promise.resolve() }, configurable: true });
Object.defineProperty(window.navigator, 'storage', { value: { persist: () => Promise.resolve() }, configurable: true });
// fetch mínimo para o Estúdio de Reservas (lê o index.json do disco)
window.fetch = url => {
    const file = String(url).replace(/^\.?\//, '');
    if (fs.existsSync(file)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(JSON.parse(fs.readFileSync(file, 'utf8'))) });
    }
    return Promise.resolve({ ok: false, json: () => Promise.resolve(null) });
};

// ---------- carrega os módulos na ordem do entry (js/app.js) ----------
// Os fontes são ES modules; o jsdom não executa type="module", então este
// harness remove import/export e roda o mesmo código no contexto compartilhado.
const stripModuleSyntax = s => s
    .replace(/^import [^\n]*;\n/gm, '')
    .replace(/^export \{[^\n]*\};?\n/gm, '');
// Ordem: perfil_exercicios.js antes de custom_exercises.js — o corpo do
// segundo injeta a lista de personalizados na base de perfis (mesma
// dependência que o grafo real resolve via import).
['js/actions.js', 'js/storage.js', 'js/catalogo.js', 'js/gamificacao.js', 'js/assistente.js', 'js/planilha_data.js', 'js/historico.js', 'js/busca.js', 'js/perfil_exercicios.js', 'js/custom_exercises.js', 'js/datas.js', 'js/corridas.js', 'js/cartoes.js', 'js/calculadoras.js', 'js/backup.js', 'js/persistencia.js', 'js/sessao.js', 'js/config.js', 'js/boss.js', 'js/registro.js', 'js/app.js']
    .forEach(f => vm.runInContext(stripModuleSyntax(fs.readFileSync(f, 'utf8')), ctx, { filename: f }));

// ---- Runner por área -------------------------------------------------------
// Os trechos vivem em tests/ui/*.js e são avaliados por script no MESMO escopo
// global do Node (vm.runInThisContext), como no arquivo único de antes: os
// síncronos rodam um a um; os assíncronos (40+) num único async wrapper (o
// manifesto das reservas chega por fetch e precisa esperar o event loop).
const path = require('path');
globalThis.window = window;
globalThis.document = document;
globalThis.ctx = ctx;
globalThis.html = html;
globalThis.jsErrors = jsErrors;
globalThis.fs = fs;
// R2: o código do app está distribuído em js/*.js — checagens de PRESENÇA de código
// (regex) leem o conjunto dos módulos, não um arquivo específico.
globalThis.fonteJs = () => fs.readdirSync('js').filter(f => f.endsWith('.js')).sort()
    .map(f => fs.readFileSync('js/' + f, 'utf8')).join('\n');
globalThis.failures = 0;
globalThis.totalChecks = 0;
globalThis.check = function check(nome, cond, extra) {
    globalThis.totalChecks++;
    if (cond) console.log('  ✔', nome);
    else { globalThis.failures++; console.log('  ✘', nome, extra !== undefined ? JSON.stringify(extra) : ''); }
};
const ev = expr => vm.runInContext(expr, ctx);
const $ = id => document.getElementById(id);
const fire = (el, type) => el && el.dispatchEvent(new window.Event(type, { bubbles: true, cancelable: true }));
const click = el => { if (!el) throw new Error('elemento não encontrado para clique'); return el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })); };
const setInput = (id, value) => { const el = $(id); el.value = value; fire(el, 'input'); };
const setSelect = (id, value) => { const el = $(id); el.value = value; fire(el, 'change'); };
const chipIn = (containerId, label) => [...$(containerId).querySelectorAll('button')].find(x => x.textContent.includes(label));
const btnIn = (el, label) => [...el.querySelectorAll('button')].find(x => x.textContent.includes(label));
const cards = () => [...$('cat-results').children].filter(c => c.dataset.ex);   // ignora o "vazio"
const titles = () => cards().map(c => (c.querySelector('h3') || {}).textContent || '');
const histCards = () => [...$('hist-results').querySelectorAll('[data-log-id]')];
const pickerRows = () => [...$('picker-results').querySelectorAll('button[data-ex]')];
const navGroupFor = tab => ({ diario: 'treino', montador: 'treino', historico: 'treino', busca: 'treino', corridas: 'treino', boss: 'jogo', story: 'jogo', stats: 'voce', calcs: 'voce', config: 'config' })[tab];
function navTo(tab) {
    const group = navGroupFor(tab);
    if (group) click($(`nav-group-${group}`));
    const button = $(`nav-${tab}`);
    if (button) click(button);
    else if (tab === 'config') ev("switchTab('config')");
    else throw new Error(`navegação não encontrada para ${tab}`);
}
const expostos = { ev, $, fire, click, setInput, setSelect, chipIn, btnIn, cards, titles,
    histCards, pickerRows, navGroupFor, navTo };
Object.assign(globalThis, expostos);

const AREAS_DIR = path.join(__dirname, 'tests', 'ui');
const AREAS = fs.readdirSync(AREAS_DIR).filter(f => /^\d\d_.*\.js$/.test(f)).sort();
// manifesto explícito: perder/renomear um trecho de teste NÃO pode passar em silêncio
const ESPERADAS = ['10_boot_navegacao.js', '20_busca_tags.js', '30_assistente_sessao.js', '40_reservas_card.js', '50_backup_gravacao.js', '60_csv_mapa_delegacao.js', '70_corridas_editor.js', '80_corridas_backup.js', '90_corridas_aba.js', '95_series_descanso_foto.js', '99_fechamento.js'];
const faltando = ESPERADAS.filter(f => !AREAS.includes(f));
const extras = AREAS.filter(f => !ESPERADAS.includes(f));
if (faltando.length || extras.length) { console.error('\n❌ trechos de teste ausentes ou inesperados em tests/ui:', { faltando, extras }); process.exit(1); }
const SINCRONAS = AREAS.filter(f => Number(f.slice(0, 2)) < 40);
const ASSINCRONAS = AREAS.filter(f => Number(f.slice(0, 2)) >= 40);
const lerArea = f => fs.readFileSync(path.join(AREAS_DIR, f), 'utf8');
SINCRONAS.forEach(f => vm.runInThisContext(lerArea(f), { filename: 'tests/ui/' + f }));


// ============================ ESTÚDIO DE RESERVAS ============================
// (async de propósito: o manifesto chega por fetch, então o bloco espera o
//  event loop antes de conferir a grade — e só então fecha o processo)
vm.runInThisContext(
    '(async () => {\n' + ASSINCRONAS.map(lerArea).join('\n') + '\n})();',
    { filename: 'tests/ui/async' }
);
