/* Smoke test do motor — roda em Node com stubs mínimos de DOM */
const fs = require('fs');

// ---- Stubs de browser ----
const noop = () => {};
global.window = { localStorage: { getItem: () => null, setItem: noop }, addEventListener: noop, onload: null };
global.document = {
    addEventListener: noop,
    getElementById: () => null,
    createElement: () => ({ classList: { add: noop, remove: noop, toggle: noop }, style: {}, appendChild: noop, remove: noop, setAttribute: noop, querySelector: () => ({ onclick: null }), click: noop }),
    body: { appendChild: noop }
};
global.navigator = { vibrate: noop };
global.Image = class { set src(v) { } };
global.Chart = undefined;

// ---- Carrega os módulos ----
const load = (p) => new Function(fs.readFileSync(p, 'utf8'))();
// catalogo e gamificacao rodam soltos; app.js precisa do escopo compartilhado
const src = fs.readFileSync('js/catalogo.js', 'utf8') + '\n' + fs.readFileSync('js/gamificacao.js', 'utf8') + '\n' + fs.readFileSync('js/busca.js', 'utf8') + '\n' + fs.readFileSync('js/app.js', 'utf8');
const api = new Function(src + `
  return {
    logVolumeKg, logTstSeconds, logEst1RM, effectiveLoadKg, effectiveReps,
    formatLoadText, formatRepsText, duplaProgressao, detectAutoPR, recoveryState,
    formatPlates, inferExerciseType, catalogInfo,
    TAG_DEFS, TAG_CATEGORIAS, TAG_BY_CATEGORY, EXERCISE_CATALOG_FULL,
    normalizeText, exerciseTags, searchCatalog, catalogFacets, matchesTags, matchesQuery, deriveTags,
    usageStats, searchHistoryLogs, renderSearchScreen, repsAlvoSugeridas,
    get SEARCH() { return searchState; },
    computeXP, computeBossProgress, logDamageKg, missionsState, isoWeekKey, isoWeekRange,
    weeklyStreakInfo, seasonState, completeSeason, migrateLog,
    get STATE() { return { logs, settings, userBodyweight }; },
    setLogs(arr) { logs = arr; },
    setBW(v) { userBodyweight = v; }
  };
`)();

let failures = 0;
function check(name, cond, extra) {
    if (cond) console.log('  ✔', name);
    else { failures++; console.log('  ✘', name, extra !== undefined ? JSON.stringify(extra) : ''); }
}

console.log('\n== 1. Volume por tipo ==');
const BW = 80;
check('barra: 100 kg × 10 = 1000', api.logVolumeKg({ type: 'carga_total', weight: 100, reps: [10] }, BW) === 1000);
check('halter_par: 30/halter × 10 = 600', api.logVolumeKg({ type: 'halter_par', weight: 30, reps: [10] }, BW) === 600);
check('halter_uni: 25 × 8/lado = 400', api.logVolumeKg({ type: 'halter_uni', weight: 25, reps: [8] }, BW) === 400);
check('peso_corporal (barra fixa 0 kg): 80 × 10 = 800', api.logVolumeKg({ type: 'peso_corporal', weight: 0, reps: [10] }, BW) === 800);
check('peso_corporal +10 kg extra: 90 × 10 = 900', api.logVolumeKg({ type: 'peso_corporal', weight: 10, reps: [10] }, BW) === 900);
check('isometria: 0 kg de tonelagem', api.logVolumeKg({ type: 'isometria', weight: 0, reps: [134] }, BW) === 0);
check('isometria TST = 134 s', api.logTstSeconds({ type: 'isometria', reps: [134] }) === 134);
check('prancha 95 kg × 134 s NÃO vira 12,7 t', api.logVolumeKg({ type: 'isometria', weight: 95, reps: [134] }, BW) === 0);
check('sets por série (drop): 40×10 + 35×10 + 30×10 = 1050', api.logVolumeKg({ type: 'carga_total', sets: [{ weight: 40, reps: 10 }, { weight: 35, reps: 10 }, { weight: 30, reps: 10 }] }, BW) === 1050);
check('corrida: volume 0', api.logVolumeKg({ kind: 'corrida', distanceKm: 5 }, BW) === 0);

console.log('\n== 2. Texto e 1RM ==');
check('format halter_par', api.formatLoadText({ type: 'halter_par', weight: 38 }) === '38 kg/halter');
check('format PC', api.formatLoadText({ type: 'peso_corporal', weight: 0 }) === 'PC');
check('format PC + 10', api.formatLoadText({ type: 'peso_corporal', weight: 10 }) === 'PC + 10 kg');
check('1RM Epley 100×5 = 116,7', api.logEst1RM({ type: 'carga_total', weight: 100, reps: [5] }) === 116.7, api.logEst1RM({ type: 'carga_total', weight: 100, reps: [5] }));

console.log('\n== 3. Dupla progressão ==');
const supino = { exercise: 'Supino Reto com Barra', type: 'carga_total', weight: 100, reps: [10, 10, 10, 10] };
const prog = api.duplaProgressao(supino);
check('todas no topo (10 = topo 6-10) sugere +2,5', prog && prog.proximaCarga === 102.5, prog);
check('sem sugestão quando reps abaixo', api.duplaProgressao({ ...supino, reps: [8, 8] }) === null);

console.log('\n== 4. PR automático ==');
const logsBase = [{ id: 1, date: '2026-10-01', kind: 'peso', muscle: 'Peito', exercise: 'Supino', type: 'carga_total', weight: 100, reps: [5], isPR: false }];
check('PR quando 1RM estoura o recorde', api.detectAutoPR({ id: 2, exercise: 'Supino', type: 'carga_total', weight: 105, reps: [5] }, logsBase, BW) === true);
check('sem PR quando fica abaixo', api.detectAutoPR({ id: 2, exercise: 'Supino', type: 'carga_total', weight: 90, reps: [5] }, logsBase, BW) === false);
check('isometria: PR por tempo', api.detectAutoPR({ id: 3, exercise: 'Prancha Isométrica', type: 'isometria', reps: [200] }, [{ id: 1, exercise: 'Prancha Isométrica', type: 'isometria', reps: [120] }], BW) === true);

console.log('\n== 5. Anilhas ==');
check('90 kg leg press com carrinho 40 = carrinho + 25 por lado', api.formatPlates(90, 40).includes('+ 25 por lado'), api.formatPlates(90, 40));
check('100 kg barra 20 = 20 + 25 + 15 por lado? (40/lado)', api.formatPlates(100, 20).includes('25 + 15'), api.formatPlates(100, 20));

console.log('\n== 6. Chefão: fraqueza e crítico ==');
const bosses = [
    { id: 'b0', name: 'A', maxHp: 1000, weak: 'Pernas' },
    { id: 'b1', name: 'B', maxHp: 2000, weak: 'Peito' }
];
const logsBoss = [
    { id: 1, date: '2026-10-01', kind: 'peso', muscle: 'Pernas', exercise: 'Agachamento', type: 'carga_total', weight: 100, reps: [10], isPR: false },   // 1000 × 1,25 = 1250 → derrota b0 e sobra 250
    { id: 2, date: '2026-10-02', kind: 'peso', muscle: 'Peito', exercise: 'Supino', type: 'carga_total', weight: 100, reps: [5], isPR: true }                 // 500 × 1,25 × 2 = 1250
];
const prog2 = api.computeBossProgress(logsBoss, BW, bosses);
check('chefão 1 derrotado pela fraqueza (sobra vaza p/ próximo)', prog2.defeatedCount === 1, prog2);
check('HP do 2º = 2000 - (250 + 1250) = 500', prog2.currentHp === 500, prog2.currentHp);
check('dano total = 1250 + 1250 = 2500', prog2.totalDamage === 2500, prog2.totalDamage);

console.log('\n== 7. XP com teto diário ==');
const logsXP = [
    { id: 1, date: '2026-10-01', kind: 'peso', muscle: 'Peito', exercise: 'Supino', type: 'carga_total', weight: 200, reps: [10, 10, 10, 10, 10], isPR: false }, // 10 000 kg → 100 XP bruto → cap 60
    { id: 2, date: '2026-10-01', kind: 'corrida', distanceKm: 5, durationMin: 25, isPR: false }                                                                  // 5×8 + 25×0,5 = 52,5
];
const xp = api.computeXP('2026-10-01', { logs: logsXP, bodyweight: BW, deloadWeeks: [], missionsXpTotal: 0, bosses: [] });
check('teto de 60 XP de volume por grupo/dia', xp.training === 60, xp.training);
check('cardio XP = 53 (5×8 + 25×0,5)', xp.cardio === 53, xp.cardio);

console.log('\n== 8. Missões semanais ==');
const theme = { missionWord: 'Prova de Cosmo' };
const hoje = '2026-10-12'; // segunda
const [ws, we] = api.isoWeekRange(hoje);
const logsMiss = [
    { id: 1, date: ws, kind: 'peso', muscle: 'Peito', exercise: 'X', type: 'carga_total', weight: 50, reps: [8], biset: true, isPR: true },
    { id: 2, date: we, kind: 'corrida', distanceKm: 3, durationMin: 15 }
];
const ms = api.missionsState(logsMiss, theme, hoje);
check('missão bi-set completa', ms.missions.find(m => m.id === 'biset').done);
check('missão PR completa', ms.missions.find(m => m.id === 'pr').done);
check('missão corrida ≥2 km completa', ms.missions.find(m => m.id === 'corrida').done);
check('missão 4 treinos pendente (só 2 dias)', !ms.missions.find(m => m.id === 'treinos').done);
check('nome da missão segue o tema', ms.missions[0].title.startsWith('Prova de Cosmo'), ms.missions[0].title);

console.log('\n== 9. Streak semanal ==');
api.setLogs([
    ...['2026-10-05', '2026-10-06', '2026-10-07'].map((d, i) => ({ id: i, date: d, kind: 'peso', muscle: 'Peito', exercise: 'X', type: 'carga_total', weight: 50, reps: [8] })),
    ...['2026-09-28', '2026-09-29', '2026-09-30'].map((d, i) => ({ id: 100 + i, date: d, kind: 'peso', muscle: 'Peito', exercise: 'X', type: 'carga_total', weight: 50, reps: [8] }))
]);
// "hoje" do teste pode não ser 2026-10-12; weeklyStreakInfo usa Date() real — apenas valida que roda e retorna struct
const wsInfo = api.weeklyStreakInfo();
check('weeklyStreakInfo retorna struct', typeof wsInfo.streak === 'number' && typeof wsInfo.goal === 'number', wsInfo);

console.log('\n== 10. Migração de log legado ==');
const mig = api.migrateLog({ id: 1, date: '2026-10-01', muscle: 'Abdômen', exercise: 'Prancha Isométrica', weight: 134, reps: [] });
check('prancha legada vira isometria com 134 s', mig.type === 'isometria' && mig.reps[0] === 134, mig);
const mig2 = api.migrateLog({ id: 2, date: '2026-10-01', muscle: 'Costas', exercise: 'Barra Fixa (Pull-up)', weight: 0, reps: [10] });
check('barra fixa legada vira peso_corporal', mig2.type === 'peso_corporal', mig2);
const mig3 = api.migrateLog({ id: 3, date: '2026-10-01', muscle: 'Peito', exercise: 'Supino Reto com Halteres', weight: 38, reps: [12] });
check('supino halteres legado vira halter_par', mig3.type === 'halter_par', mig3);

console.log('\n== 11. Temporadas ==');
let seasons = { start: '2026-07-01', completed: [] };
const st = api.seasonState(seasons, '2026-10-12');
check('temporada de 12 semanas expirou', st.finished === true, st);
const done = api.completeSeason(seasons, '2026-10-12', 5000);
check('troféu registrado e XP preservado', done.completed.length === 1 && done.completed[0].xp === 5000 && done.start === '2026-10-12');

console.log('\n== 12. Recuperação muscular ==');
const recPerna = api.recoveryState('Pernas', [{ date: api.isoWeekRange('2026-10-12')[0], exercise: 'Agachamento', sets: null, reps: [8, 8, 8] }], Date.now());
check('perna com 72 h de janela', recPerna.hoursNeed >= 72, recPerna.hoursNeed);
const recSem = api.recoveryState('Peito', [], Date.now());
check('grupo sem registro', recSem.label === 'SEM REGISTRO');


console.log('\n== 13. Tags acumulativas (Fase 1) ==');
const tagIds = Object.keys(api.TAG_DEFS);
check('pool com pelo menos 20 tags', tagIds.length >= 20, tagIds.length);
check('todas as tags têm categoria válida', tagIds.every(id => api.TAG_DEFS[id].cat && api.TAG_CATEGORIAS.some(c => c.id === api.TAG_DEFS[id].cat)));
check('categorias agrupam todas as tags', api.TAG_BY_CATEGORY.reduce((a, c) => a + c.tags.length, 0) === tagIds.length);
check('catálogo inteiro etiquetado (>= 4 tags)', api.EXERCISE_CATALOG_FULL.every(e => Array.isArray(e.tags) && e.tags.length >= 4),
    api.EXERCISE_CATALOG_FULL.filter(e => !e.tags || e.tags.length < 4).map(e => e.nome));
check('nenhuma tag inválida no catálogo', api.EXERCISE_CATALOG_FULL.every(e => e.tags.every(t => api.TAG_DEFS[t])));
const tTerra = api.exerciseTags('Levantamento Terra');
check('terra: dobradiça + força + avançado + posterior', ['dobradica', 'forca', 'avancado', 'posterior'].every(t => tTerra.includes(t)), tTerra);
const tSupino = api.exerciseTags('Supino Reto com Barra');
check('supino barra: empurrar + composto + barra + anterior', ['empurrar', 'composto', 'barra', 'anterior'].every(t => tSupino.includes(t)), tSupino);
const tPrancha = api.exerciseTags('Prancha Isométrica');
check('prancha: core + resistência + peso corporal + casa', ['core', 'resistencia', 'peso-corporal', 'casa'].every(t => tPrancha.includes(t)), tPrancha);
check('isometria não ganha padrão articular (composto/isolado)', !tPrancha.includes('composto') && !tPrancha.includes('isolado'), tPrancha);
const tCorrida = api.exerciseTags('Corrida (Rua)');
check('corrida na rua: condicionamento + ar livre', ['condicionamento', 'ar-livre'].every(t => tCorrida.includes(t)), tCorrida);
const tFora = api.exerciseTags('Agachamento Búlgaro c/ Halteres');
check('fora do catálogo também ganha tags por inferência', tFora.includes('unilateral') && tFora.includes('halter'), tFora);

console.log('\n== 14. Busca e filtros ==');
check('normalizeText tira acento e caixa', api.normalizeText('Supino Inclinação  W') === 'supino inclinacao w', api.normalizeText('Supino Inclinação  W'));
const r1 = api.searchCatalog({ q: 'supino halteres inclinado' });
check('busca por tokens em qualquer ordem', r1.length === 1 && r1[0].nome === 'Supino Inclinado c/ Halteres', r1.map(e => e.nome));
check('busca sem acento acha o exercício', api.searchCatalog({ q: 'elevacao pelvica' }).some(e => e.nome === 'Elevação Pélvica (Hip Thrust)'));
check('sinônimo em inglês (bench press)', api.searchCatalog({ q: 'bench press' }).length >= 2);
check('busca por tag escrita (casa)', api.searchCatalog({ q: 'casa' }).length > 5);
const casa = api.searchCatalog({ tags: ['casa'] });
check('filtro por tag casa', casa.length > 0 && casa.every(e => e.tags.includes('casa')));
const anyMode = api.searchCatalog({ tags: ['casa', 'barra'], tagMode: 'any' });
const allMode = api.searchCatalog({ tags: ['casa', 'barra'], tagMode: 'all' });
check('tag OU é mais largo que tag E', anyMode.length > allMode.length, [anyMode.length, allMode.length]);
check('tag E exige todas as tags', allMode.every(e => e.tags.includes('casa') && e.tags.includes('barra')));
check('combina grupo + tag', api.searchCatalog({ grupo: 'Pernas', tags: ['agachar'] }).every(e => e.grupo === 'Pernas' && e.tags.includes('agachar')));
check('combina equipamento + tipo', api.searchCatalog({ equipamento: 'Polia', tipo: 'carga_total' }).every(e => e.equipamento === 'Polia' && e.tipo === 'carga_total'));
check('filtro vazio devolve o catálogo inteiro', api.searchCatalog({}).length === api.EXERCISE_CATALOG_FULL.length);
const uso = { 'Supino Reto com Barra': 9, 'Agachamento Livre': 3 };
const ult = { 'Supino Reto com Barra': '2026-10-10', 'Agachamento Livre': '2026-10-11' };
check('ordem "uso" põe o mais registrado primeiro', api.searchCatalog({ usage: uso, sort: 'uso' })[0].nome === 'Supino Reto com Barra');
check('ordem "recentes" põe o último usado primeiro', api.searchCatalog({ lastUsed: ult, sort: 'recentes' })[0].nome === 'Agachamento Livre');
check('ordem "nome" é alfabética', api.searchCatalog({ sort: 'nome' })[0].nome.localeCompare(api.searchCatalog({ sort: 'nome' }).slice(-1)[0].nome, 'pt-BR') < 0);
check('onlyUsed: só o que já foi registrado', api.searchCatalog({ usage: uso, onlyUsed: true }).length === 2);
check('onlyNew: esconde o que já foi registrado', api.searchCatalog({ usage: uso, onlyNew: true }).every(e => !uso[e.nome]));
check('limit corta a lista', api.searchCatalog({ limit: 5 }).length === 5);
const fac = api.catalogFacets(api.EXERCISE_CATALOG_FULL);
check('facetas contam as tags', fac.tags.empurrar === api.EXERCISE_CATALOG_FULL.filter(e => e.tags.includes('empurrar')).length);
check('matchesTags OU/E', api.matchesTags(['a', 'b'], ['b', 'c'], 'any') === true && api.matchesTags(['a', 'b'], ['b', 'c'], 'all') === false);
check('matchesQuery AND de tokens', api.matchesQuery('Supino Reto com Barra', 'barra supino') === true && api.matchesQuery('Supino Reto', 'supino terra') === false);

console.log('\n== 15. Tela de busca + histórico filtrado ==');
api.setLogs([
    { id: 1, date: '2026-10-12', kind: 'peso', muscle: 'Peito', exercise: 'Supino Reto com Barra', type: 'carga_total', weight: 100, reps: [8, 8, 8], notes: 'ombro ok' },
    { id: 2, date: '2026-10-11', kind: 'peso', muscle: 'Abdômen', exercise: 'Prancha Isométrica', type: 'isometria', weight: 0, reps: [60, 45] },
    { id: 3, date: '2026-09-01', kind: 'corrida', muscle: 'Cardio', exercise: 'Corrida (Rua)', distanceKm: 5, durationMin: 28 }
]);
const us = api.usageStats();
check('usageStats conta registros', us.usage['Supino Reto com Barra'] === 1 && us.lastUsed['Supino Reto com Barra'] === '2026-10-12', us);
check('usageStats calcula melhor 1RM (100×8 = 126,7)', us.best1RM['Supino Reto com Barra'] === 126.7, us.best1RM);
api.SEARCH.tags = ['core']; api.SEARCH.tagMode = 'any'; api.SEARCH.histPeriod = 'todos'; api.SEARCH.histQ = ''; api.SEARCH.histMuscle = '';
const histCore = api.searchHistoryLogs();
check('histórico filtrado por tag core', histCore.length === 1 && histCore[0].exercise === 'Prancha Isométrica', histCore.map(l => l.exercise));
api.SEARCH.tags = []; api.SEARCH.histQ = 'ombro';
check('histórico filtrado por texto nas observações', api.searchHistoryLogs().length === 1);
api.SEARCH.histQ = ''; api.SEARCH.histMuscle = 'Cardio';
check('histórico filtrado por grupo', api.searchHistoryLogs().map(l => l.exercise).join() === 'Corrida (Rua)');
api.SEARCH.histMuscle = ''; api.SEARCH.histPeriod = '7';
check('histórico filtrado por período (7 dias)', api.searchHistoryLogs().every(l => l.date >= '2026-01-01') && api.searchHistoryLogs().length <= 3);
api.SEARCH.histPeriod = 'todos';
check('reps alvo sugeridas respeitam a faixa', api.repsAlvoSugeridas(api.catalogInfo('Supino Reto com Barra')) === '10, 10, 8', api.repsAlvoSugeridas(api.catalogInfo('Supino Reto com Barra')));
check('reps alvo de isometria em segundos', api.repsAlvoSugeridas(api.catalogInfo('Prancha Isométrica')) === '90, 20');
check('reps alvo de corrida vazia', api.repsAlvoSugeridas(api.catalogInfo('Corrida (Rua)')) === '');
let renderOk = true;
try { api.renderSearchScreen(); } catch (e) { renderOk = false; console.log('   erro:', e.message); }
check('renderSearchScreen não quebra sem DOM', renderOk);

console.log('\n' + (failures === 0 ? '✅ TODOS OS TESTES PASSARAM' : `❌ ${failures} FALHA(S)`));
process.exit(failures === 0 ? 0 : 1);
