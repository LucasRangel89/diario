/* Smoke test do motor — roda em Node com stubs mínimos de DOM */
const fs = require('fs');

// ---- Stubs de browser ----
const noop = () => { };
global.window = { localStorage: { getItem: () => null, setItem: noop }, addEventListener: noop, onload: null };
const __docListeners = [];
global.__docListeners = __docListeners; // visível dentro do new Function abaixo
global.document = {
    addEventListener: (type, fn) => { __docListeners.push(type); },
    getElementById: () => null,
    createElement: () => ({ classList: { add: noop, remove: noop, toggle: noop }, style: {}, appendChild: noop, remove: noop, setAttribute: noop, querySelector: () => ({ onclick: null }), click: noop }),
    body: { appendChild: noop }
};
global.navigator = { vibrate: noop };
global.Image = class { set src(v) { } };
global.Chart = undefined;

// ---- Stubs de armazenamento: localStorage + IndexedDB falsos (para js/storage.js) ----
const __lsData = new Map();
global.localStorage = {
    getItem: k => (__lsData.has(k) ? __lsData.get(k) : null),
    setItem: (k, v) => __lsData.set(k, String(v)),
    removeItem: k => __lsData.delete(k),
    clear() { __lsData.clear(); },
    get length() { return __lsData.size; },
    key(i) { return [...__lsData.keys()][i] ?? null; }
};
function makeFakeIDB() {
    const store = new Map();
    class FakeReq {
        constructor(exec) {
            this.onsuccess = null; this.onerror = null; this.onupgradeneeded = null; this.result = undefined;
            queueMicrotask(() => {
                try { exec(this); if (this.onsuccess) this.onsuccess({ target: this }); }
                catch (e) { if (this.onerror) this.onerror(e); }
            });
        }
    }
    const db = {
        objectStoreNames: { contains: () => true },
        transaction(_name, _mode) {
            return { objectStore(_store) {
                return {
                    get: k => new FakeReq(r => { r.result = store.has(k) ? store.get(k) : undefined; }),
                    put: (v, k) => new FakeReq(r => { store.set(k, v); r.result = k; }),
                    getAllKeys: () => new FakeReq(r => { r.result = [...store.keys()]; })
                };
            } };
        }
    };
    return { open(_name, _ver) { return new FakeReq(r => { r.result = db; }); } };
}
global.indexedDB = makeFakeIDB();

// ---- Carrega os módulos (mesmo escopo) ----
// Os fontes são ES modules (etapa 5.1); este harness clássico remove
// import/export e roda o mesmo código concatenado (escopo compartilhado).
const stripModuleSyntax = s => s
    .replace(/^import [^\n]*;\n/gm, '')
    .replace(/^export \{[^\n]*\};?\n/gm, '');
const src = ['js/actions.js', 'js/storage.js', 'js/catalogo.js', 'js/gamificacao.js', 'js/assistente.js', 'js/planilha_data.js', 'js/historico.js', 'js/busca.js', 'js/custom_exercises.js', 'js/datas.js', 'js/cartoes.js', 'js/calculadoras.js', 'js/backup.js', 'js/persistencia.js', 'js/app.js']
    .map(p => stripModuleSyntax(fs.readFileSync(p, 'utf8'))).join('\n');
const api = new Function(src + `
  return {
    logVolumeKg, logTstSeconds, logEst1RM, logCargaEfetiva, logFullMeta, logBestSet, logWorstSet,
    epleySeValido, sinalProximaSessao, logMeta,
    formatLoadText, formatRepsText, duplaProgressao, detectAutoPR, recoveryState,
    formatPlates, inferExerciseType, catalogInfo,
    computeXP, computeBossProgress, logDamageKg, missionsState, isoWeekKey, isoWeekRange, XP_MIN, XP_PR,
    weeklyStreakInfo, seasonState, completeSeason, migrateLog,
    buildPlanilhaCSV, parseSheetLogRows, parseCSVRows, parseDateBRorISO, seedFromPlanilha, TYPE_META, THEMES,
    deriveTags, searchCatalog, matchesTags, exerciseTags, TAG_DEFS, EXERCISE_CATALOG_FULL,
    SINERGIA, sinergiaState, sinergiaLogs, STABILIZER_GROUPS,
    orderWorkoutExercises, isAtivacaoExercise, classifyExercicio, bisetBlockRanges,
    weeklySetsByMuscle, fatigueState, suggestNextWorkout, weeklyGaps, diasDesdeUltimoTreino,
    regiaoLombarState, nivelCargaLombar,
    FAIXA_SERIES_SEMANAIS, MUSCULOS_MAPA, MUSCLE_META, normalizeMuscle, PLANILHA_SESSOES,
    RECOVERY_CONSTANTS, RECOVERY_CONFIG,
    normalizeSavedWorkouts, suggestSessaoFor, CATALOG_ALIASES,
    FAIXA_SERIES_POR_GRUPO, faixaSeriesDoGrupo, seriesIndiretasSemana, wrapCanvasText,
    SEASON_WEEKS, autoDeloadWeekKeys, XP_REST_PER_DAY, ensureDeloadRestAwards, getTodayLocalISO,
    lerPlanilhaCSV, planejarImportacaoLogs, csvLogFingerprint, csvField, csvLogId, analisarLinhasLog,
    validarBackupJSON, normalizarExerciciosPersonalizados, setCustomExercisesList, getCustomExercises,
    dataDeRegistroValida, isoDataValida, dataISOValida, fatigueState, sinergiaState, parseDataCSV,
    deloadWeeksEfetivos,
    setDeloadWeeks(arr) { deloadWeeks = arr; },
    setSeasons(s) { seasons = s; },
    setActiveTheme(id) { activeGameThemeId = id; },
    get themeSaves() { return themeGameSaves; },
    get STATE() { return { logs, settings, userBodyweight }; },
    setLogs(arr) { logs = arr; },
    storageRef: storage,
    docListeners: __docListeners,
    diarioActions: window.__diarioActions,
    getDiarioAction: window.getDiarioAction,
    setBW(v) { userBodyweight = v; },
    setWeightLog(arr) { weightLog = arr; },
    get logsArr() { return logs; },
    get savedWorkouts() { return savedWorkouts; },
    set savedWorkouts(arr) { savedWorkouts = arr; }
  };
`)();

// ---- Runner por área -------------------------------------------------------
// Os trechos vivem em tests/engine/*.js e são avaliados no MESMO escopo global
// (vm.runInThisContext), como no arquivo único de antes: os síncronos rodam um a
// um; os assíncronos (60+) rodam num único async wrapper, para continuarem
// trocando variáveis entre si. O contador e os helpers ficam no global.
const vm = require('vm');
const path = require('path');
globalThis.failures = 0;
globalThis.totalChecks = 0;
globalThis.check = function check(nome, cond, extra) {
    globalThis.totalChecks++;
    if (cond) console.log('  ✔', nome);
    else { globalThis.failures++; console.log('  ✘', nome, extra !== undefined ? JSON.stringify(extra) : ''); }
};
// Objeto de setup do harness (o que os trechos usavam do arquivo original)
globalThis.api = api;
globalThis.fs = fs;
// R2: o código do app está distribuído em js/*.js — checagens de PRESENÇA de código
// (regex) leem o conjunto dos módulos, não um arquivo específico.
globalThis.fonteJs = () => fs.readdirSync('js').filter(f => f.endsWith('.js')).sort()
    .map(f => fs.readFileSync('js/' + f, 'utf8')).join('\n');
globalThis.src = src;
globalThis.__lsData = __lsData;
globalThis.__docListeners = __docListeners;
globalThis.makeFakeIDB = makeFakeIDB;
globalThis.noop = noop;
globalThis.stripModuleSyntax = stripModuleSyntax;

const AREAS_DIR = path.join(__dirname, 'tests', 'engine');
const AREAS = fs.readdirSync(AREAS_DIR).filter(f => /^\d\d_.*\.js$/.test(f)).sort();
// manifesto explícito: perder/renomear um trecho de teste NÃO pode passar em silêncio
const ESPERADAS = ['10_volume_rm_xp.js', '20_recuperacao_temas.js', '30_catalogo_busca.js', '40_arte_jogo.js', '50_dados_validacao.js', '60_storage_modulos.js', '70_csv_backup.js', '99_fechamento.js'];
const faltando = ESPERADAS.filter(f => !AREAS.includes(f));
const extras = AREAS.filter(f => !ESPERADAS.includes(f));
if (faltando.length || extras.length) { console.error('\n❌ trechos de teste ausentes ou inesperados em tests/engine:', { faltando, extras }); process.exit(1); }
const SINCRONAS = AREAS.filter(f => Number(f.slice(0, 2)) < 60);
const ASSINCRONAS = AREAS.filter(f => Number(f.slice(0, 2)) >= 60);
const lerArea = f => fs.readFileSync(path.join(AREAS_DIR, f), 'utf8');
SINCRONAS.forEach(f => vm.runInThisContext(lerArea(f), { filename: 'tests/engine/' + f }));


// ============================================================
// ETAPA 1 — Camada de armazenamento (js/storage.js)
// Migração localStorage → IndexedDB: automática, idempotente,
// valida contagem, mantém o localStorage intacto e recupera do espelho.
// ============================================================
vm.runInThisContext(
    '(async () => {\n' + ASSINCRONAS.map(lerArea).join('\n') + '\n})().catch(e => { console.error("❌ ERRO NOS TESTES DE STORAGE:", e); process.exit(1); });',
    { filename: 'tests/engine/async' }
);
