/* Teste de boot (jsdom) — carrega o index.html real, roda os scripts e valida o app.
   Requer: npm install (jsdom). Rodar: node test_ui.js */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = __dirname;
let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
// remove scripts externos (fontes/tailwind CDN não existem aqui)
html = html.replace(/<script src="https:\/\/[^"]+"><\/script>/g, '');
const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
const { window } = dom;
window.HTMLCanvasElement.prototype.getContext = () => null;
window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() { }, removeListener() { } }));
window.alert = () => { };
window.confirm = () => true;
window.scrollTo = () => { };
window.Chart = class { constructor() { } destroy() { } };

const scripts = ['js/catalogo.js', 'js/gamificacao.js', 'js/planilha_data.js', 'js/historico.js', 'js/busca.js', 'js/app.js'];
// Um único eval: consts de um script clássico precisam do mesmo escopo léxico (como <script> reais)
try {
    window.eval(scripts.map(s => fs.readFileSync(path.join(ROOT, s), 'utf8')).join('\n;\n')
        + '\n;window.__app = { THEMES, get logs() { return logs; }, get savedWorkouts() { return savedWorkouts; } };');
} catch (e) { console.error('✗ erro ao carregar scripts:', e.message); process.exit(1); }

let fails = 0;
const check = (name, cond, extra) => {
    if (cond) console.log('  ✔', name);
    else { fails++; console.log('  ✘', name, extra !== undefined ? JSON.stringify(extra) : ''); }
};

console.log('== Boot (jsdom) ==');
try { window.onload && window.onload(); } catch (e) { fails++; console.log('  ✘ window.onload lançou:', e.message); }

check('9 temas disponíveis', window.__app && Object.keys(window.__app.THEMES).length === 9);
check('seed real: 44 logs', window.__app.logs.length === 44, window.__app.logs.length);
check('seed real: 5 sessões salvas', window.__app.savedWorkouts.length === 5);
check('histórico renderizado', !!window.document.getElementById('history-content'));
check('select de tema com 9 opções', window.document.getElementById('game-theme-select').options.length === 9);
check('molduras novas existem', /frame === 'runas'/.test(fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8')) && /frame === 'espacial'/.test(fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8')));

// vistas do histórico
try {
    window.switchHistoryView('progresso');
    window.switchHistoryView('semanas');
    window.switchHistoryView('peso');
    window.switchHistoryView('log');
    check('4 vistas do histórico alternam sem erro', true);
} catch (e) { fails++; console.log('  ✘ vistas do histórico:', e.message); }

// CSV
try {
    const csv = window.buildPlanilhaCSV();
    check('buildPlanilhaCSV ok (22 colunas no Log)', csv.split(/--- Sheet: Log ---/)[1].split('\n')[1].split(';').length === 22);
} catch (e) { fails++; console.log('  ✘ buildPlanilhaCSV:', e.message); }

// aba Buscar + seletor
try {
    window.switchTab('busca');
    check('aba Buscar renderiza', window.document.getElementById('cat-results').innerHTML.length > 100);
    window.openExercisePicker('log');
    check('seletor rápido abre', !!window.document.getElementById('picker-overlay'));
    window.closeExercisePicker();
    check('seletor rápido fecha', !window.document.getElementById('picker-overlay'));
} catch (e) { fails++; console.log('  ✘ aba Buscar:', e.message); }

console.log(fails === 0 ? '\n✅ BOOT OK' : `\n❌ ${failures} FALHA(S)`.replace('failures', 'fails'));
process.exit(fails === 0 ? 0 : 1);
