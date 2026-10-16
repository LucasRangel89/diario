/* ============================================================
   TESTE DO GRAFO REAL DE MÓDULOS (produção) — Diário de Cargas
   ------------------------------------------------------------
   Roda com: npm run test:modules  (precisa de `npm install` uma vez)

   Por que este arquivo existe
   ---------------------------
   `test_engine.js` e `test_ui.js` removem import/export e rodam o
   código concatenado num MESMO escopo (os runners continuam fazendo
   isso; desde a R3 os checks vivem em `tests/engine/*` e `tests/ui/*`).
   Isso é ótimo para testar a lógica, mas esconde um modo de falha
   inteiro: em produção o navegador executa cada `js/*.js` como ES module, com escopo próprio
   e em modo estrito. Um nome usado em app.js e declarado em outro
   arquivo SEM import funciona no teste e quebra no navegador
   (ReferenceError no boot), e uma variável global implícita
   (`x = 1` sem `let/const`) funciona no teste e vira ReferenceError
   em módulo ES.

   Este arquivo carrega o grafo REAL (vm.SourceTextModule, strict) no
   DOM do jsdom, roda o boot como o navegador roda e exercita os
   caminhos principais. Requer `--experimental-vm-modules`
   (o npm run test:modules já passa a flag).
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

if (!process.execArgv.some(a => a.includes('experimental-vm-modules'))) {
    console.error('\n❌ rode com: node --experimental-vm-modules test_modules.js  (ou `npm run test:modules`)');
    process.exit(1);
}

let JSDOM, VirtualConsole;
try { ({ JSDOM, VirtualConsole } = require('jsdom')); } catch (e) {
    console.error('\n❌ jsdom não está instalado: os testes de módulos NÃO foram executados. Rode `npm ci`.');
    process.exit(1);
}

let failures = 0;
function check(name, cond, extra) {
    if (cond) console.log('  ✔', name);
    else { failures++; console.log('  ✘', name, extra !== undefined ? JSON.stringify(extra) : ''); }
}

// ---------- DOM real (jsdom), sem os scripts do index.html ----------
const jsErrors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', e => jsErrors.push(String(e.message || e)));
virtualConsole.on('error', (...a) => jsErrors.push(a.join(' ')));

let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(/<script src="https:\/\/[^"]+"><\/script>/g, '');
html = html.replace(/<script type="module"[^>]*><\/script>/g, '');   // carregamos o grafo nós mesmos
html = html.replace(/<script>[\s\S]*?<\/script>/g, '');             // e não o bootstrap inline
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/', virtualConsole });
const { window } = dom;
const document = window.document;
const ctx = dom.getInternalVMContext();

// ---------- stubs de browser (iguais aos do test_ui) ----------
const makeCtx = () => new Proxy(function () { }, {
    get: (t, k) => (k === 'canvas' ? { width: 1080, height: 1920 } : makeCtx()),
    set: () => true,
    apply: () => makeCtx()
});
window.HTMLCanvasElement.prototype.getContext = () => makeCtx();
window.Chart = class { constructor() { return { destroy() { }, resize() { }, update() { } }; } };
window.Element.prototype.scrollIntoView = function () { };
window.scrollTo = () => { };
window.alert = () => { };
window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() { }, removeListener() { } }));
Object.defineProperty(window.navigator, 'vibrate', { value: () => true, configurable: true });
Object.defineProperty(window.navigator, 'serviceWorker', { value: { register: () => Promise.resolve() }, configurable: true });
Object.defineProperty(window.navigator, 'storage', { value: { persist: () => Promise.resolve() }, configurable: true });
if (typeof window.URL.createObjectURL !== 'function') window.URL.createObjectURL = () => 'blob:jsdom';
if (typeof window.URL.revokeObjectURL !== 'function') window.URL.revokeObjectURL = () => { };
window.fetch = url => {
    const file = String(url).replace(/^\.?\//, '');
    if (fs.existsSync(file)) return Promise.resolve({ ok: true, json: () => Promise.resolve(JSON.parse(fs.readFileSync(file, 'utf8'))) });
    return Promise.resolve({ ok: false, json: () => Promise.resolve(null) });
};

// ---------- carrega o GRAFO REAL (ES modules, modo estrito) ----------
const modules = new Map();
function modOf(file) {
    if (modules.has(file)) return modules.get(file);
    const m = new vm.SourceTextModule(fs.readFileSync(file, 'utf8'), { identifier: file, context: ctx });
    modules.set(file, m);
    return m;
}

(async () => {
    console.log('\n== MOD 1. O grafo real de módulos linka e avalia (strict) ==');
    const entry = modOf('js/app.js');
    let linkErr = null;
    try {
        await entry.link((specifier, ref) => {
            const target = path.posix.normalize(path.posix.join(path.posix.dirname(ref.identifier), specifier));
            if (!fs.existsSync(target)) throw new Error(`import não resolvido: '${specifier}' em ${ref.identifier}`);
            return modOf(target);
        });
    } catch (e) { linkErr = e; }
    check('todo import relativo aponta para um arquivo existente', !linkErr, linkErr && linkErr.message);
    if (linkErr) { console.log('\n❌ TESTE DE MÓDULOS FALHOU (link)'); process.exit(1); }

    let evalErr = null;
    try { await entry.evaluate(); } catch (e) { evalErr = e; }
    check('avaliação dos módulos não lança (nada de TDZ/strict)', !evalErr, evalErr && `${evalErr.constructor.name}: ${evalErr.message}`);
    if (evalErr) { console.log('\n❌ TESTE DE MÓDULOS FALHOU (avaliação)'); process.exit(1); }

    const ns = (f) => modOf(f).namespace;
    const app = ns('js/app.js');
    const catalogo = ns('js/catalogo.js');
    check('app.js exporta o núcleo do app (logs, renderSession, loadStoredData)',
        typeof app.renderSession === 'function' && typeof app.loadStoredData === 'function' && Array.isArray(app.logs));
    // js/actions.js é o despachante (não declara superfície própria) — os demais registram manifesto.
    const comManifesto = Object.keys(window.__diarioExportFiles || {});
    const arquivosJs = fs.readdirSync('js').filter(f => f.endsWith('.js')).map(f => 'js/' + f).filter(f => f !== 'js/actions.js');
    check('todo módulo de js/ (menos actions.js) registra manifesto em window.__diarioExports',
        arquivosJs.every(f => comManifesto.includes(f)) && Object.keys(window.__diarioExports || {}).length > 400,
        { arquivos: comManifesto.length, simbolos: Object.keys(window.__diarioExports || {}).length });

    // ---------- boot como no navegador ----------
    console.log('\n== MOD 2. Boot real (strict): nenhum identificador não resolvido ==');
    let bootErr = null;
    try { window.onload(); } catch (e) { bootErr = e; }
    check('window.onload() roda sem exceção em modo estrito', !bootErr, bootErr && `${bootErr.constructor.name}: ${bootErr.message}`);
    if (bootErr) { console.log('\n❌ TESTE DE MÓDULOS FALHOU (boot)'); process.exit(1); }
    check('o app carregou os dados de exemplo (seed)', app.logs.length > 0, app.logs.length);
    check('o histórico foi renderizado no DOM', document.getElementById('logs-container').children.length > 0, document.getElementById('logs-container').children.length);

    // ---------- caminhos principais que o teste clássico não roda em strict ----------
    console.log('\n== MOD 3. Caminhos principais em produção (strict) ==');
    const errosDeCaminho = [];
    const passo = (nome, fn) => { try { fn(); } catch (e) { errosDeCaminho.push(`${nome}: ${e.message}`); } };
    passo('refreshAll', () => app.refreshAll());
    passo('renderRecoveryMap', () => app.renderRecoveryMap());
    passo('switchTab busca', () => app.switchTab('busca'));
    passo('switchTab corridas', () => app.switchTab('corridas'));
    passo('switchTab boss', () => app.switchTab('boss'));
    passo('renderBossBattleUI', () => app.renderBossBattleUI());
    passo('generateStoryCard', () => app.generateStoryCard());
    passo('generateBossDefeatCard', () => app.generateBossDefeatCard());
    passo('renderHistory', () => app.switchTab('historico'));
    passo('renderTests', () => app.renderTests());
    passo('renderWeekGaps', () => app.renderWeekGaps());
    passo('buildPlanilhaCSV', () => ns('js/historico.js').buildPlanilhaCSV());
    passo('renderStorageStatus', () => app.renderStorageStatus());
    check('nenhum caminho principal lança ReferenceError/TypeError em módulo estrito', errosDeCaminho.length === 0, errosDeCaminho);
    const soReferenceError = errosDeCaminho.filter(e => /is not defined|Cannot read|is not a function/.test(e));
    check('nenhum nome ficou fora de escopo (ReferenceError de import faltando)', soReferenceError.length === 0, soReferenceError);

    // ---------- registro + backup com o grafo real ----------
    console.log('\n== MOD 4. Registro e backup com o grafo real ==');
    app.setLogs([]);
    app.setLogs([{ id: 900001, date: app.getTodayLocalISO(), kind: 'peso', muscle: 'Peito', exercise: 'Supino Reto com Barra', type: 'carga_total', weight: 80, reps: [8, 8], isPR: false, xpTheme: 'classico' }]);
    check('setLogs + renderLogsTable funcionam no grafo real', app.logs.length === 1 && document.getElementById('logs-container').children.length >= 1);
    const logPeso = app.logs[0];
    app.setLogs([
        { id: 900002, date: '2026-10-15', kind: 'corrida', muscle: 'Cardio', exercise: 'Corrida (Rua)', distanceKm: 5, durationMin: 25 },
        { id: 900003, date: '2026-10-15', kind: 'corrida', muscle: 'Cardio', exercise: 'Bike / Ergométrico', distanceKm: 80, durationMin: 60 }
    ]);
    app.switchTab('corridas');
    check('grafo ESM real apresenta só corrida na aba, sem bike',
        document.querySelectorAll('#runs-results [data-run-id]').length === 1 &&
        !document.getElementById('tab-content-corridas').textContent.includes('Bike / Ergométrico'));
    app.setLogs([logPeso]);
    const payload = await app.buildBackupPayload();
    check('backup exportado tem logs e versão 6', Array.isArray(payload.logs) && payload.logs.length === 1 && payload.version === 6, payload.version);
    const json = JSON.parse(JSON.stringify(payload));
    const aplicado = await app.applyImportedBackup(json);
    check('backup reimportado aplica sem erro em módulo estrito', aplicado === true && app.logs.length === 1);

    console.log('\n== MOD 5. Console limpo ==');
    const graves = jsErrors.filter(m => !/Not implemented|Could not load|serviceWorker|HTMLCanvasElement/i.test(m));
    check('nenhum erro não capturado durante o boot e os caminhos principais', graves.length === 0, graves.slice(0, 3));

    console.log('\n' + (failures === 0 ? '✅ TESTE DE MÓDULOS REAIS PASSOU' : `❌ ${failures} FALHA(S) EM MÓDULOS`));
    process.exit(failures === 0 ? 0 : 1);
})().catch(e => {
    console.error('❌ ERRO NO TESTE DE MÓDULOS:', e);
    console.log(`\n❌ ${failures + 1} FALHA(S) EM MÓDULOS`);
    process.exit(1);
});
