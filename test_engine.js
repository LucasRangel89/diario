/* Smoke test do motor — roda em Node com stubs mínimos de DOM */
const fs = require('fs');

// ---- Stubs de browser ----
const noop = () => { };
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

// ---- Carrega os módulos (mesmo escopo) ----
const src = ['js/catalogo.js', 'js/gamificacao.js', 'js/assistente.js', 'js/planilha_data.js', 'js/historico.js', 'js/busca.js', 'js/app.js']
    .map(p => fs.readFileSync(p, 'utf8')).join('\n');
const api = new Function(src + `
  return {
    logVolumeKg, logTstSeconds, logEst1RM, logCargaEfetiva, logFullMeta, logBestSet, logWorstSet,
    epleySeValido, sinalProximaSessao, logMeta,
    formatLoadText, formatRepsText, duplaProgressao, detectAutoPR, recoveryState,
    formatPlates, inferExerciseType, catalogInfo,
    computeXP, computeBossProgress, logDamageKg, missionsState, isoWeekKey, isoWeekRange, XP_MIN,
    weeklyStreakInfo, seasonState, completeSeason, migrateLog,
    buildPlanilhaCSV, parseSheetLogRows, parseCSVRows, parseDateBRorISO, seedFromPlanilha, TYPE_META, THEMES,
    deriveTags, searchCatalog, matchesTags, exerciseTags, TAG_DEFS, EXERCISE_CATALOG_FULL,
    SINERGIA, sinergiaState, sinergiaLogs, STABILIZER_GROUPS,
    orderWorkoutExercises, isAtivacaoExercise, classifyExercicio, bisetBlockRanges,
    weeklySetsByMuscle, fatigueState, suggestNextWorkout, weeklyGaps, diasDesdeUltimoTreino,
    FAIXA_SERIES_SEMANAIS, MUSCULOS_MAPA, MUSCLE_META, normalizeMuscle, PLANILHA_SESSOES,
    normalizeSavedWorkouts, suggestSessaoFor, CATALOG_ALIASES,
    FAIXA_SERIES_POR_GRUPO, faixaSeriesDoGrupo, seriesIndiretasSemana,
    get STATE() { return { logs, settings, userBodyweight }; },
    setLogs(arr) { logs = arr; },
    setBW(v) { userBodyweight = v; },
    setWeightLog(arr) { weightLog = arr; },
    get logsArr() { return logs; },
    get savedWorkouts() { return savedWorkouts; },
    set savedWorkouts(arr) { savedWorkouts = arr; }
  };
`)();

let failures = 0;
function check(name, cond, extra) {
    if (cond) console.log('  ✔', name);
    else { failures++; console.log('  ✘', name, extra !== undefined ? JSON.stringify(extra) : ''); }
}

console.log('\n== 1. Volume por tipo (convenção da planilha) ==');
const BW = 80;
check('barra: 100 kg × 10 = 1000', api.logVolumeKg({ type: 'carga_total', weight: 100, reps: [10] }, BW) === 1000);
check('halter_par: 30/halter × 10 = 600', api.logVolumeKg({ type: 'halter_par', weight: 30, reps: [10] }, BW) === 600);
check('halter_uni: 25 × 8/lado × 2 = 400', api.logVolumeKg({ type: 'halter_uni', weight: 25, reps: [8] }, BW) === 400);
check('par_dois_lados (afundo): 5 × 22 × 2 × 2 = 440', api.logVolumeKg({ exercise: 'Afundo Búlgaro', type: 'par_dois_lados', weight: 5, reps: [7, 8, 7] }, BW) === 440);
check('peso_corporal digitado (barra fixa 93 kg): 93 × 10 = 930', api.logVolumeKg({ exercise: 'Barra Fixa (Pull-up)', type: 'peso_corporal', weight: 93, reps: [4, 2, 4] }, BW) === 930);
check('peso_corporal legado 0 kg cai no peso corporal: 80 × 10 = 800', api.logVolumeKg({ type: 'peso_corporal', weight: 0, reps: [10] }, BW) === 800);
check('isometria: 0 kg de tonelagem', api.logVolumeKg({ type: 'isometria', weight: 0, reps: [134] }, BW) === 0);
check('isometria TST = 134 s', api.logTstSeconds({ type: 'isometria', reps: [60, 40, 34] }) === 134);
check('prancha 95 kg × 134 s NÃO vira 12,7 t', api.logVolumeKg({ type: 'isometria', weight: 95, reps: [134] }, BW) === 0);
check('sets por série (drop): 40×10 + 35×10 + 30×10 = 1050', api.logVolumeKg({ type: 'carga_total', sets: [{ weight: 40, reps: 10 }, { weight: 35, reps: 10 }, { weight: 30, reps: 10 }] }, BW) === 1050);
check('corrida: volume 0', api.logVolumeKg({ kind: 'corrida', distanceKm: 5 }, BW) === 0);

console.log('\n== 1b. Vetores exatos da planilha do usuário ==');
const v1 = api.logFullMeta({ exercise: 'Tríceps Corda na Polia', type: 'carga_total', weight: 40, reps: [12, 12, 12] });
check('Tríceps Corda 40×36 = 1440', v1.volume === 1440 && v1.cargaEfetiva === 40 && v1.totalReps === 36, v1);
const v2 = api.logFullMeta({ exercise: 'Elevação Lateral c/ Halteres', type: 'halter_par', weight: 10, reps: [13, 13, 12, 11] });
check('Elev. Lateral 10×49×2 = 980', v2.volume === 980 && v2.cargaEfetiva === 20 && v2.totalReps === 49, v2);
const v3 = api.logFullMeta({ exercise: 'Crossover na Polia Alta', type: 'halter_par', weight: 20, reps: [12, 13, 12] });
check('Crossover 20×37×2 = 1480', v3.volume === 1480, v3);
const v4 = api.logFullMeta({ exercise: 'Afundo Búlgaro', type: 'par_dois_lados', weight: 5, reps: [7, 8, 7] });
check('Afundo 5×22×2×2 = 440', v4.volume === 440 && v4.fator === 2 && v4.lados === 2, v4);
const v5 = api.logFullMeta({ exercise: 'Prancha Isométrica', type: 'isometria', weight: 0, reps: [60, 40, 34] });
check('Prancha: volume 0, métrica = melhor tempo', v5.volume === 0 && v5.bestSet === 60 && v5.totalReps === 134, v5);
const v6 = api.logFullMeta({ exercise: 'Barra Fixa (Pull-up)', type: 'peso_corporal', weight: 93, reps: [4, 2, 4] });
check('Barra fixa 93×10 = 930', v6.volume === 930, v6);

console.log('\n== 2. Texto e 1RM ==');
check('format halter_par', api.formatLoadText({ type: 'halter_par', weight: 38 }) === '38 kg/halter');
check('format PC', api.formatLoadText({ type: 'peso_corporal', weight: 0 }) === 'PC');
check('format PC do dia (93 kg)', api.formatLoadText({ type: 'peso_corporal', weight: 93 }) === '93 kg (PC)');
check('1RM Epley 100×5 = 116,7', api.logEst1RM({ type: 'carga_total', weight: 100, reps: [5] }) === 116.7, api.logEst1RM({ type: 'carga_total', weight: 100, reps: [5] }));

console.log('\n== 2b. Regra do 1RM Epley da planilha (só ≤ 12 reps) ==');
check('epley 40 × (1+12/30) = 56', api.epleySeValido(40, 12) === 56, api.epleySeValido(40, 12));
check('epley 100 × (1+5/30) = 116,7', api.epleySeValido(100, 5) === 116.7, api.epleySeValido(100, 5));
check('melhor série 13 > 12 → null (1RM superestimado)', api.epleySeValido(20, 13) === null);
check('logFullMeta: Elev. Lateral best 13 → est1RM null', v2.est1RM === null, v2.est1RM);
check('logFullMeta: Tríceps best 12 → est1RM 56', v1.est1RM === 56, v1.est1RM);

console.log('\n== 3. Dupla progressão ==');
const supino = { exercise: 'Supino Reto com Barra', type: 'carga_total', weight: 100, reps: [10, 10, 10, 10] };
const prog = api.duplaProgressao(supino);
check('todas no topo (10 = topo 6-10) sugere +2,5', prog && prog.proximaCarga === 102.5, prog);
check('sem sugestão quando reps abaixo', api.duplaProgressao({ ...supino, reps: [8, 8] }) === null);
check('halter no topo sugere +2', api.duplaProgressao({ exercise: 'Elevação Lateral c/ Halteres', type: 'halter_par', weight: 10, reps: [20, 20, 20] }).proximaCarga === 12);
check('sinal ⬆ quando menor série no topo', api.sinalProximaSessao({ exercise: 'Cadeira Extensora', type: 'carga_total', weight: 40, reps: [18, 15, 20] }) === '⬆ Progredir');
check('sinal ➡ quando menor série fora do topo', api.sinalProximaSessao({ exercise: 'Tríceps Corda na Polia', type: 'carga_total', weight: 30, reps: [12, 15, 15] }) === '➡ Manter e buscar reps');

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
    { id: 1, date: '2026-10-01', kind: 'peso', muscle: 'Pernas', exercise: 'Agachamento', type: 'carga_total', weight: 100, reps: [10], isPR: false },
    { id: 2, date: '2026-10-02', kind: 'peso', muscle: 'Peito', exercise: 'Supino', type: 'carga_total', weight: 100, reps: [5], isPR: true }
];
const prog2 = api.computeBossProgress(logsBoss, BW, bosses);
check('chefão 1 derrotado pela fraqueza (sobra vaza p/ próximo)', prog2.defeatedCount === 1, prog2);
check('HP do 2º = 2000 - (250 + 1250) = 500', prog2.currentHp === 500, prog2.currentHp);
check('dano total = 1250 + 1250 = 2500', prog2.totalDamage === 2500, prog2.totalDamage);

console.log('\n== 7. XP com teto diário ==');
const logsXP = [
    { id: 1, date: '2026-10-01', kind: 'peso', muscle: 'Peito', exercise: 'Supino', type: 'carga_total', weight: 200, reps: [10, 10, 10, 10, 10], isPR: false },
    { id: 2, date: '2026-10-01', kind: 'corrida', distanceKm: 5, durationMin: 25, isPR: false }
];
const xp = api.computeXP('2026-10-01', { logs: logsXP, bodyweight: BW, deloadWeeks: [], missionsXpTotal: 0, bosses: [] });
check('teto de 60 XP de volume por grupo/dia', xp.training === 60, xp.training);
check('cardio XP = 53 (5×8 + 25×0,5)', xp.cardio === 53, xp.cardio);
const isolatedRestXP = api.computeXP('2026-10-13', { logs: [], bodyweight: BW, deloadWeeks: ['2026-W41'], missionsXpTotal: 0, bosses: [], restDays: ['2026-10-05', '2026-10-06'] });
check('dias de descanso podem ser atribuídos a um jogo sem duplicar XP', isolatedRestXP.restXP === 50, isolatedRestXP.restXP);

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

console.log('\n== 12b. Grupo "Pescoço" removido ==');
const GRUPOS_ESPERADOS = ['Peito', 'Costas', 'Pernas', 'Posterior', 'Ombros', 'Bíceps', 'Tríceps', 'Abdômen', 'Core', 'Antebraço'];
check('10 grupos musculares, sem Pescoço', api.MUSCULOS_MAPA.length === 10 && api.MUSCULOS_MAPA.join(',') === GRUPOS_ESPERADOS.join(','), api.MUSCULOS_MAPA);
check('mapa de recuperação acompanha os 10 grupos (nada de Pescoço)', !('Pescoço' in api.MUSCLE_META) && api.MUSCULOS_MAPA.every(m => api.MUSCLE_META[m] && api.MUSCLE_META[m].ordem <= 10), Object.keys(api.MUSCLE_META));
check('nenhum exercício do catálogo segue em Pescoço', !api.EXERCISE_CATALOG_FULL.some(e => e.grupo === 'Pescoço'));
check('Extensão Cervical migrou para Ombros', api.catalogInfo('Extensão Cervical').grupo === 'Ombros');
check('busca por "pescoço" ainda acha a cervical', api.searchCatalog({ q: 'pescoço' }).some(e => e.nome === 'Extensão Cervical'));
check('registro antigo em Pescoço vira Ombros na migração', api.migrateLog({ id: 1, date: '2026-10-01', muscle: 'Pescoço', exercise: 'Extensão Cervical', weight: 10, reps: [15, 10] }).muscle === 'Ombros');
check('grupo extinto é remapeado sem erro (normalizeMuscle)', api.normalizeMuscle('Pescoço') === 'Ombros' && api.normalizeMuscle('Antebraço') === 'Antebraço' && api.normalizeMuscle('Geral') === 'Geral' && api.normalizeMuscle('') === 'Geral');
const csvAntigo = [
    ['Data', 'Sessão', 'Exercício', 'Carga registrada (kg)', 'S1', 'S2', 'S3', 'S4', 'S5', 'RIR', 'Conferir?', 'Observações'],
    ['09/10/2026', 'Posterior/Acessórios', 'Extensão Cervical', '10', '15', '10', '', '', '', '', 'Não', ''],
    ['09/10/2026', 'Posterior/Acessórios', 'Treino antigo', '10', '12', '', '', '', '', '', 'Não', '']
];
const importados = api.parseSheetLogRows(csvAntigo);
check('planilha antiga importa sem Pescoço (catálogo → Ombros; resto → Geral)', importados.length === 2 && importados[0].muscle === 'Ombros' && importados[1].muscle === 'Geral', importados.map(l => l.muscle));
check('séries da semana contam a cervical em Ombros', api.weeklySetsByMuscle([{ id: 1, kind: 'peso', muscle: 'Ombros', date: '2026-10-12', exercise: 'Extensão Cervical', reps: [15, 10] }], '2026-10-14')['Ombros'] === 2);

console.log('\n== 12c. Pernas × Posterior e co-ativação ==');
const EXERCICIOS_PERNAS = ['Leg Press 45°', 'Agachamento Hack', 'Agachamento Livre', 'Cadeira Extensora', 'Afundo Búlgaro', 'Afundo c/ Halteres', 'Agachamento Sumô'];
const EXERCICIOS_POSTERIOR = ['Mesa Flexora', 'Stiff com Barra', 'Elevação Pélvica (Hip Thrust)', 'Abdutor', 'Cadeira Adutora', 'Panturrilha em Pé', 'Panturrilha Sentado', 'Swing de Kettlebell'];
check('Pernas contém todos os exercícios de quadríceps', api.EXERCISE_CATALOG_FULL.filter(e => e.grupo === 'Pernas').map(e => e.nome).join('|') === EXERCICIOS_PERNAS.join('|'), api.EXERCISE_CATALOG_FULL.filter(e => e.grupo === 'Pernas').map(e => e.nome));
check('Posterior contém todos os exercícios da cadeia posterior', api.EXERCISE_CATALOG_FULL.filter(e => e.grupo === 'Posterior').map(e => e.nome).join('|') === EXERCICIOS_POSTERIOR.join('|'), api.EXERCISE_CATALOG_FULL.filter(e => e.grupo === 'Posterior').map(e => e.nome));
check('Glúteos não é grupo do catálogo nem consta em MUSCLE_META', !api.EXERCISE_CATALOG_FULL.some(e => e.grupo === 'Glúteos') && !('Glúteos' in api.MUSCLE_META));
check('Glúteos legado migra para Posterior (migrateLog + normalizeMuscle)', api.migrateLog({ id: 100, date: '2026-10-14', muscle: 'Glúteos', exercise: 'Elevação Pélvica (Hip Thrust)', reps: [10] }).muscle === 'Posterior' && api.normalizeMuscle('Glúteos') === 'Posterior');
const agoraSinergia = new Date('2026-10-14T18:00:00').getTime();
const logRemadaSinergia = { id: 101, date: '2026-10-14', kind: 'peso', muscle: 'Costas', exercise: 'Remada Baixa na Polia', reps: [10, 10, 10] };
const logsCandidatosAntebraco = [logRemadaSinergia,
    { id: 104, date: '2026-10-14', kind: 'peso', muscle: 'Antebraço', exercise: 'Remada Baixa na Polia', reps: [10, 10, 10] },
    { id: 105, date: '2026-10-14', kind: 'corrida', muscle: 'Cardio', exercise: 'Remada Baixa na Polia', reps: [10, 10, 10] }
];
const logsDeApoioAntebraco = api.sinergiaLogs('Antebraço', logsCandidatosAntebraco);
const apoioAntebraco = api.sinergiaState('Antebraço', logsCandidatosAntebraco, agoraSinergia);
check('remada apoia antebraço: 3 séries × 0,5 = 1,5 equivalentes', logsDeApoioAntebraco.length === 1 && logsDeApoioAntebraco[0] === logRemadaSinergia && apoioAntebraco && apoioAntebraco.fator === 0.5 && apoioAntebraco.seriesBrutas === 3 && apoioAntebraco.series === 1.5 && apoioAntebraco.ultimo === 'Remada Baixa na Polia' && apoioAntebraco.ultimoEm === '2026-10-14' && apoioAntebraco.exercicios.includes('Remada Baixa na Polia'), apoioAntebraco);
const fadigaComApoio = api.fatigueState('Antebraço', [], 0, agoraSinergia, apoioAntebraco);
check('apoio reduz prontidão (63%), deixa semRegistro falso e formata decimal pt-BR', fadigaComApoio.pct === 63 && fadigaComApoio.semRegistro === false && fadigaComApoio.sinergia === apoioAntebraco && fadigaComApoio.sinergiaText === '🤝 apoio em pegada (~1,5 séries equivalentes)', fadigaComApoio);
check('Peito sem regra e sem logs não cria estado de sinergia', api.sinergiaState('Peito', [], agoraSinergia) === null);
check('grupo com regra, mas sem logs indiretos, também retorna null', api.sinergiaState('Antebraço', [], agoraSinergia) === null);
const logAgachamentoSinergia = { id: 102, date: '2026-10-14', kind: 'peso', muscle: 'Pernas', exercise: 'Agachamento Livre', reps: [8, 8, 8] };
check('agachamento é apoio indireto para Core e Posterior', !!api.sinergiaState('Core', [logAgachamentoSinergia], agoraSinergia) && !!api.sinergiaState('Posterior', [logAgachamentoSinergia], agoraSinergia));
check('Pernas não recebe regra nem aviso de sinergia', !('Pernas' in api.SINERGIA) && api.sinergiaState('Pernas', [logAgachamentoSinergia], agoraSinergia) === null);
check('STABILIZER_GROUPS deriva da mesma lista SINERGIA', Object.keys(api.STABILIZER_GROUPS).join() === Object.keys(api.SINERGIA).join());

const logDiretoPernas = { id: 103, date: '2026-10-14', kind: 'peso', muscle: 'Pernas', exercise: 'Agachamento Livre', type: 'carga_total', weight: 100, reps: [10, 10, 10] };
const setsDiretosSinergia = api.weeklySetsByMuscle([logDiretoPernas], '2026-10-14');
check('weeklySetsByMuscle não credita séries de apoio a Core/Posterior', setsDiretosSinergia.Pernas === 3 && setsDiretosSinergia.Core === undefined && setsDiretosSinergia.Posterior === undefined, setsDiretosSinergia);
const gapsDiretosSinergia = api.weeklyGaps([logDiretoPernas], '2026-10-14');
check('weeklyGaps mantém zero séries de meta para Core/Posterior apoiados', gapsDiretosSinergia.find(g => g.muscle === 'Core').series === 0 && gapsDiretosSinergia.find(g => g.muscle === 'Posterior').series === 0, gapsDiretosSinergia);
const xpDiretoSinergia = api.computeXP('2026-10-14', { logs: [logDiretoPernas], bodyweight: BW, deloadWeeks: [], missionsXpTotal: 0, bosses: [{ id: 'xp-check', maxHp: 100000000, weak: 'Posterior' }] });
check('computeXP conta só o grupo direto (3.000 kg × 0,5 ÷ 100 = 15 XP)', xpDiretoSinergia.training === 15, xpDiretoSinergia);
const chefaoPosterior = { id: 'weak-check', name: 'Teste', maxHp: 100000, weak: 'Posterior' };
const danoDiretoSinergia = api.logDamageKg(logDiretoPernas, BW, chefaoPosterior);
const progressoDiretoSinergia = api.computeBossProgress([logDiretoPernas], BW, [chefaoPosterior]);
check('sinergia não dá bônus ×1,25 de fraqueza no dano do chefão', danoDiretoSinergia === api.logVolumeKg(logDiretoPernas, BW) && progressoDiretoSinergia.totalDamage === danoDiretoSinergia && progressoDiretoSinergia.weakHits === 0, { danoDiretoSinergia, progressoDiretoSinergia });

console.log('\n== 13. Temas (10) ==');
const themeIds = Object.keys(api.THEMES);
const expectedThemeIds = ['classico', 'zodiaco', 'hercules', 'acao', 'folclore', 'nordica', 'roma', 'rpg', 'galactica', 'aneis'];
check('10 temas carregados', themeIds.length === 10 && expectedThemeIds.every(id => themeIds.includes(id)), themeIds);
check('curva de patentes preservada', api.XP_MIN.join(',') === '0,150,500,1100,2000,3300,5000,7500,11000,16000', api.XP_MIN);
const expectedHpCurve = Array.from({ length: 12 }, (_, i) => 25000 + 2000 * i);
expectedThemeIds.forEach(id => {
    const t = api.THEMES[id];
    check(`tema ${id}: exatamente 10 patentes + 12 chefões + frame`, t && t.ranks.length === 10 && t.bosses.length === 12 && !!t.frame, t && { ranks: t.ranks.length, bosses: t.bosses.length, frame: t.frame });
    check(`tema ${id}: curva suave de HP compartilhada`, t && t.bosses.map(b => b.maxHp).join(',') === expectedHpCurve.join(','), t && t.bosses.map(b => b.maxHp));
    check(`tema ${id}: fraquezas válidas e justificadas`, t && t.bosses.every(b => api.MUSCULOS_MAPA.includes(b.weak) && typeof b.weakReason === 'string' && b.weakReason.trim().length > 10), t && t.bosses.filter(b => !api.MUSCULOS_MAPA.includes(b.weak) || !b.weakReason).map(b => b.name));
});
const aneis = api.THEMES.aneis;
check('Senhor dos Anéis: do Hobbit do Condado à LENDA DA TERRA MÉDIA', aneis.ranks.map(r => r[0]).join('|') === 'Hobbit do Condado|Andarilho do Norte|Companheiro da Sociedade|Guardião de Gondor|Cavaleiro de Rohan|Caçador de Orcs|Herói do Abismo de Helm|Portador do Anel|Rei de Gondor|LENDA DA TERRA MÉDIA', aneis.ranks.map(r => r[0]));
check('Senhor dos Anéis: jornada abre nos Goblins de Moria e fecha em Sauron', aneis.bosses[0].name === 'Goblins de Moria' && aneis.bosses[11].name === 'Sauron, o Senhor do Anel' && aneis.bosses.map(b => b.name).join('|') === 'Goblins de Moria|Espectros do Anel|Balrog de Morgoth|Lurtz, o Uruk-hai|Wargs das Terras Bravias|Uruk-hai do Abismo de Helm|Saruman, o Branco|Espectros de Dunharrow|Laracna (Shelob)|Rei-Bruxo de Angmar|Gollum, o Portador Caído|Sauron, o Senhor do Anel', aneis.bosses.map(b => b.name));
check('Senhor dos Anéis: fraquezas da jornada (pernas → costas → peito → ... → antebraço)', aneis.bosses.map(b => b.weak).join('|') === 'Pernas|Costas|Peito|Antebraço|Tríceps|Ombros|Bíceps|Core|Abdômen|Pernas|Posterior|Antebraço', aneis.bosses.map(b => b.weak));
check('Senhor dos Anéis: vocabulário do tema (arena, jornadas e provas)', aneis.arena === 'Jornada até o Monte da Perdição' && aneis.bossLabel === 'DESAFIO ATIVO' && aneis.stageWord === 'JORNADA' && aneis.missionWord === 'Prova da Sociedade' && aneis.missionWordPlural === 'Provas da Sociedade' && aneis.frame === 'anel' && /Condado ao Monte da Perdição/.test(aneis.desc));
check('missões do Senhor dos Anéis usam "Prova da Sociedade"', api.missionsState([], aneis, '2026-10-14').missions[0].title.startsWith('Prova da Sociedade ·'));
check('clássico mantém quatro IDs/retratos originais', api.THEMES.classico.bosses.slice(0, 4).map(b => `${b.id}:${b.name}`).join('|') === 'boss1:Golem de Anilhas|boss2:Hydra de Titânio|boss3:Mecagorila Berzerker|boss4:Behemoth Devastador', api.THEMES.classico.bosses.slice(0, 4));
check('clássico acrescenta oito monstros de fantasia pesada com emojis', api.THEMES.classico.bosses.slice(4).length === 8 && api.THEMES.classico.bosses.slice(4).every(b => !!b.icon && /ferro|aço|forja|ogro|quimera|dragão|minotauro|titã|colosso/i.test(b.name)), api.THEMES.classico.bosses.slice(4).map(b => b.name));
check('patentes clássicas não repetem nomes de chefões', !api.THEMES.classico.ranks.some(([rank]) => api.THEMES.classico.bosses.some(b => b.name.toLowerCase() === rank.toLowerCase())));
check('Zodíaco usa Aprendiz do Dojo e Grande Mestre em 12 etapas', api.THEMES.zodiaco.ranks[0][0] === 'Aprendiz do Dojo' && api.THEMES.zodiaco.bosses.length === 12 && api.THEMES.zodiaco.bosses[11].name === 'Grande Mestre' && !JSON.stringify(api.THEMES.zodiaco).includes('Mestre Ares'));
check('Ação: patentes 1–10 seguem a escala de heróis até CHUCK NORRIS', JSON.stringify(api.THEMES.acao.ranks) === JSON.stringify([['Indiana Jones, o Explorador', '🎩'], ['007, o Agente Secreto', '🍸'], ['John McClane, o Sobrevivente', '🧨'], ['Rocky Balboa, o Lutador', '🥊'], ['Frank Dux, o Guerreiro do Kumite', '🥋'], ['Mad Max, o Guerreiro da Estrada', '🚗'], ['Rambo, a Máquina de Guerra', '🎖️'], ['John Wick, o Baba-Yaga', '🐶'], ['Neo, o Escolhido', '🕶️'], ['CHUCK NORRIS, O INVENCÍVEL', '💪']]), api.THEMES.acao.ranks);
check('Ação: doze vilões em ordem de ameaça, com os ids preservados (b0…b11)', api.THEMES.acao.bosses.map(b => `${b.id}:${b.name}`).join('|') === 'b0:O Predador|b1:O Exterminador|b2:Tubarão|b3:Hans Gruber|b4:Ivan Drago|b5:Chucky|b6:O Coringa|b7:Freddy Krueger|b8:Agent Smith|b9:Pennywise|b10:Thanos|b11:Darth Vader', api.THEMES.acao.bosses.map(b => `${b.id}:${b.name}`));
check('Ação: fraqueza de cada vilão', api.THEMES.acao.bosses.map(b => b.weak).join('|') === 'Pernas|Peito|Costas|Core|Posterior|Abdômen|Ombros|Tríceps|Bíceps|Antebraço|Peito|Antebraço', api.THEMES.acao.bosses.map(b => b.weak));
const todasFraquezas = expectedThemeIds.flatMap(id => api.THEMES[id].bosses.map(b => b.weak));
const contagemFraquezas = todasFraquezas.reduce((acc, grupo) => (acc[grupo] = (acc[grupo] || 0) + 1, acc), {});
check('120 chefões mantêm 10 fraquezas distintas (Posterior 9, Pernas 14)', todasFraquezas.length === 120 && Object.keys(contagemFraquezas).length === 10 && contagemFraquezas.Posterior === 9 && contagemFraquezas.Pernas === 14, contagemFraquezas);
check('Ação: heróis não repetem nome de vilão', !api.THEMES.acao.ranks.some(([rank]) => api.THEMES.acao.bosses.some(b => b.name.toLowerCase() === rank.toLowerCase())));
check('Roma vai de Escravo da Arena a IMPERADOR DE ROMA e deixa o Imperador antes do final', api.THEMES.roma.ranks[0][0] === 'Escravo da Arena' && api.THEMES.roma.ranks[9][0] === 'IMPERADOR DE ROMA' && api.THEMES.roma.bosses[10].name.includes('Imperador') && api.THEMES.roma.bosses[11].name === 'Máximo, o Gladiador');
check('patentes romanas não repetem nomes exatos de chefões', !api.THEMES.roma.ranks.some(([rank]) => api.THEMES.roma.bosses.some(b => b.name.toLowerCase() === rank.toLowerCase())));
check('Nórdica abre com criaturas menores', api.THEMES.nordica.bosses.slice(0, 4).map(b => b.name).join('|') === 'Draugr|Troll Jovem de Gelo|Nøkk do Fiorde|Huldra da Floresta');
check('Nórdica termina com Ymir perto do fim e Ragnarök por último', api.THEMES.nordica.ranks[9][0] === 'ODIN, O PAI DE TODOS' && api.THEMES.nordica.bosses[10].name.includes('Ymir') && api.THEMES.nordica.bosses[11].name === 'Ragnarök');
check('Galáctica: General antes do Marechal (marechal é patente maior)', api.THEMES.galactica.ranks[5][0] === 'Almirante de Frota' && api.THEMES.galactica.ranks[6][0] === 'General Galáctico' && api.THEMES.galactica.ranks[7][0] === 'Marechal Estelar' && !JSON.stringify(api.THEMES.galactica).includes('Guardião do Setor'));
check('clássico retoma a escalada de animais nas patentes 8 e 9', api.THEMES.classico.ranks[7][0] === 'Kraken dos Abismos' && api.THEMES.classico.ranks[7][1] === '🐙' && api.THEMES.classico.ranks[8][0] === 'Fênix Imortal' && api.THEMES.classico.ranks[8][1] === '🔥' && !JSON.stringify(api.THEMES.classico).includes('Mestre da Fundição') && !JSON.stringify(api.THEMES.classico).includes('Lenda das Cargas'));
check('Roma chama o chefe 6 de Bestiário', api.THEMES.roma.bosses[5].name === 'Bestiário & Pantera' && !api.THEMES.roma.bosses[5].name.includes('Bestiarius'), api.THEMES.roma.bosses[5].name);
check('Hércules usa "Hércules" nas descrições (nada de Héracles)', !JSON.stringify(api.THEMES.hercules).includes('Héracles') && /Hércules/.test(JSON.stringify(api.THEMES.hercules)));

console.log('\n== 14. Seed da planilha real + round-trip CSV ==');
api.setLogs([]);
api.seedFromPlanilha();
check('seed: 44 lançamentos de 28/09 a 10/10/2026', api.logsArr.length === 44, api.logsArr.length);
const somaVols = api.logsArr.reduce((a, l) => a + api.logVolumeKg(l), 0);
const seedCorda = api.logsArr.filter(l => l.exercise === 'Tríceps Corda na Polia');
check('seed: Tríceps Corda 1440 + 1260 = 2700', seedCorda.reduce((a, l) => a + api.logVolumeKg(l), 0) === 2700);
const seedMartelo = api.logsArr.filter(l => l.exercise === 'Rosca Martelo');
check('seed: Martelo convertido p/ haltere (8×2×16 + 6×2×31 = 628)', seedMartelo.reduce((a, l) => a + api.logVolumeKg(l), 0) === 628);
const seedCross = api.logsArr.filter(l => l.exercise === 'Crossover na Polia Alta');
check('seed: Crossover por lado (20/30/20) = 5.220', seedCross.reduce((a, l) => a + api.logVolumeKg(l), 0) === 5220, seedCross.map(l => l.weight));
check('seed: soma total de volumes = 60.182 kg', somaVols === 60182, somaVols);

const csv = api.buildPlanilhaCSV();
check('CSV exporta as 5 abas', ['--- Sheet: Log ---', '--- Sheet: Catálogo ---', '--- Sheet: Progresso ---', '--- Sheet: Semana a semana ---', '--- Sheet: Peso corporal ---'].every(m => csv.includes(m)));
const logSheet = csv.split(/--- Sheet: Log ---/)[1].split(/--- Sheet:/)[0].trim();
const rows = api.parseCSVRows(logSheet, ';');
check('cabeçalho Log com colunas da planilha', rows[0].length === 22 && rows[0][0] === 'Data' && rows[0].includes('Métrica de progresso'), rows[0].length);
const imported = api.parseSheetLogRows(rows);
check('round-trip: 44 linhas importadas', imported.length === 44, imported.length);
const impVols = imported.reduce((a, l) => a + api.logVolumeKg(l), 0);
check('round-trip: volumes idênticos (60.182 kg)', impVols === somaVols, impVols);
check('round-trip: data dd/mm/aaaa vira ISO', imported[0].date === '2026-09-28', imported[0].date);
check('round-trip: flag Conferir? preservada', imported.filter(l => l.conferir).length === api.logsArr.filter(l => l.conferir).length);
check('round-trip: sessão preservada', imported[0].sessao === 'Peito/Tríceps/Ombro', imported[0].sessao);
const impAfundo = imported.find(l => l.exercise === 'Afundo Búlgaro');
check('round-trip: Afundo segue 5×22×2×2 = 440', api.logVolumeKg(impAfundo) === 440, impAfundo);

console.log('\n== 15. Conversão de data do CSV ==');
check('dd/mm/aaaa → ISO', api.parseDateBRorISO('28/09/2026') === '2026-09-28');
check('ISO passa direto', api.parseDateBRorISO('2026-09-28') === '2026-09-28');

console.log('\n== 16. Tags acumulativas + busca ==');
const t1 = api.deriveTags({ nome: 'Supino Reto na Máquina' });
check('supino máquina: empurrar+composto+maquina', t1.includes('empurrar') && t1.includes('composto') && t1.includes('maquina'), t1);
const t2 = api.deriveTags({ nome: 'Afundo Búlgaro' });
check('afundo búlgaro: unilateral+agachar', t2.includes('unilateral') && t2.includes('agachar'), t2);
const t3 = api.deriveTags({ nome: 'Prancha Isométrica' });
check('prancha: core+resistencia (sem padrão articular)', t3.includes('core') && t3.includes('resistencia') && !t3.includes('composto'), t3);
check('25 tags no pool', Object.keys(api.TAG_DEFS).length === 25);
check('busca textual "supino halter" acha os 2', api.searchCatalog({ q: 'supino halter' }).length === 2, api.searchCatalog({ q: 'supino halter' }).map(e => e.nome));
check('busca sem acento: "elevacao pelvica"', api.searchCatalog({ q: 'elevacao pelvica' }).some(e => e.nome.includes('Pélvica')));
check('apelido: "bench press" acha supino reto', api.searchCatalog({ q: 'bench press' }).some(e => e.nome.includes('Supino Reto com Barra')));
check('tag "casa" retorna só exercícios de casa', api.searchCatalog({ tags: ['casa'] }).every(e => (e.tags || []).includes('casa')));
check('modo E: halter + unilateral', api.searchCatalog({ tags: ['halter', 'unilateral'], tagMode: 'all' }).every(e => e.tags.includes('halter') && e.tags.includes('unilateral')));
check('matchesTags OU/E', api.matchesTags(['a', 'b'], ['a', 'c'], 'any') && !api.matchesTags(['a', 'b'], ['a', 'c'], 'all'));
check('catálogo todo etiquetado (≥4 tags cada)', api.EXERCISE_CATALOG_FULL.every(e => (e.tags || []).length >= 4));

console.log('\n== 17. Ordenação inteligente (Fase 2) ==');
const nomes = arr => arr.map(e => e.exercise);

// Regra 1: ativação/correção primeiro
const o1 = api.orderWorkoutExercises([
    { muscle: 'Peito', exercise: 'Supino Reto na Máquina' },
    { muscle: 'Ombros', exercise: 'Manguito Rotador' }
]);
check('ativação (manguito) abre o treino', nomes(o1)[0] === 'Manguito Rotador', nomes(o1));
check('todo exercício traz o porquê da posição', o1.every(e => typeof e.orderReason === 'string' && e.orderReason.length > 10));

// Regra 2: composto antes de isolador + desempate por tamanho do grupo
const o2 = api.orderWorkoutExercises([
    { muscle: 'Bíceps', exercise: 'Rosca Martelo' },
    { muscle: 'Costas', exercise: 'Remada Curvada com Barra' },
    { muscle: 'Pernas', exercise: 'Mesa Flexora' }
]);
check('composto (remada) antes dos isoladores', nomes(o2)[0] === 'Remada Curvada com Barra', nomes(o2));
check('isoladores: grupo grande primeiro (pernas antes de bíceps)', nomes(o2)[1] === 'Mesa Flexora' && nomes(o2)[2] === 'Rosca Martelo', nomes(o2));

// Regra 3: não fadigar o estabilizador/apoio antes (antebraço segura o ab wheel)
const o3 = api.orderWorkoutExercises([
    { muscle: 'Antebraço', exercise: 'Extensão de Punho' },
    { muscle: 'Abdômen', exercise: 'Ab Wheel' }
]);
check('antebraço NÃO vai antes de quem precisa dele (ab wheel)', nomes(o3)[0] === 'Ab Wheel' && nomes(o3)[1] === 'Extensão de Punho', nomes(o3));
check('motivo cita o apoio/proteção', /apoio|Antebraço/.test(o3[1].orderReason), o3[1].orderReason);

// Regra 4: compostos alternam empurrar/puxar
const o4 = api.orderWorkoutExercises([
    { muscle: 'Peito', exercise: 'Supino Reto na Máquina' },
    { muscle: 'Peito', exercise: 'Supino Inclinado c/ Halteres' },
    { muscle: 'Costas', exercise: 'Puxada Frontal na Polia' },
    { muscle: 'Costas', exercise: 'Remada Curvada com Barra' }
]);
const pads = nomes(o4).map(n => api.classifyExercicio({ exercise: n }).empurrar ? 'E' : 'P');
check('empurrar/puxar alternam nos compostos', pads.join('') === 'PEPE' || pads.join('') === 'EPEP', [nomes(o4), pads]);
check('os 4 compostos continuam todos presentes', nomes(o4).slice().sort().join() === ['Puxada Frontal na Polia', 'Remada Curvada com Barra', 'Supino Inclinado c/ Halteres', 'Supino Reto na Máquina'].sort().join());

// Bi-set: o par anda junto (nunca separa)
const o5 = api.orderWorkoutExercises([
    { muscle: 'Peito', exercise: 'Supino Reto na Máquina' },
    { muscle: 'Peito', exercise: 'Crucifixo na Máquina', biset: true },
    { muscle: 'Costas', exercise: 'Puxada Frontal na Polia' }
]);
const iSup = nomes(o5).indexOf('Supino Reto na Máquina');
check('bi-set permanece adjacente', nomes(o5)[iSup + 1] === 'Crucifixo na Máquina', nomes(o5));
check('2º do par continua marcado como bi-set', o5[iSup + 1].biset === true && o5[iSup].biset === false);

// Core/abdômen no fim
const o6 = api.orderWorkoutExercises([
    { muscle: 'Abdômen', exercise: 'Abdominal Supra no Solo' },
    { muscle: 'Peito', exercise: 'Supino Reto na Máquina' },
    { muscle: 'Bíceps', exercise: 'Rosca Martelo' },
    { muscle: 'Core', exercise: 'Prancha Isométrica' }
]);
check('core/abdômen fecham o treino', nomes(o6).slice(2).sort().join() === ['Abdominal Supra no Solo', 'Prancha Isométrica'].sort().join(), nomes(o6));
check('composto (supino) vira o primeiro', nomes(o6)[0] === 'Supino Reto na Máquina', nomes(o6));

// Vetor real: split "Peito/Tríceps/Ombro" da planilha do usuário
const o7 = api.orderWorkoutExercises(api.PLANILHA_SESSOES[0].exercises);
check('vetor real: supinos compostos abrem', nomes(o7)[0] === 'Supino Inclinado c/ Halteres' && nomes(o7)[1] === 'Supino Reto na Máquina', nomes(o7));
check('vetor real: isoladores de peito depois dos compostos', nomes(o7)[2] === 'Crucifixo na Máquina' && nomes(o7)[3] === 'Crossover na Polia Alta', nomes(o7));
check('vetor real: tríceps (apoio do supino) no fim', nomes(o7).slice(5).sort().join() === ['Tríceps Corda na Polia', 'Tríceps Unilateral (francês/testa)'].sort().join(), nomes(o7));
check('vetor real: lista original preservada (não muta)', api.PLANILHA_SESSOES[0].exercises[0].exercise === 'Tríceps Corda na Polia');

// isometria/prancha sem padrão articular não quebra a ordenação
const o8 = api.orderWorkoutExercises([
    { muscle: 'Core', exercise: 'Prancha Isométrica' },
    { muscle: 'Pernas', exercise: 'Leg Press 45°' },
    { muscle: 'Ombros', exercise: 'Elevação Lateral c/ Halteres' }
]);
check('prancha no fim mesmo começando 1ª na lista', nomes(o8)[2] === 'Prancha Isométrica', nomes(o8));
check('leg press (composto grande) antes da elevação lateral', nomes(o8)[0] === 'Leg Press 45°', nomes(o8));
check('lista vazia/nula não quebra', Array.isArray(api.orderWorkoutExercises([])) && Array.isArray(api.orderWorkoutExercises(null)));

// Recuperação e meta semanal desempata apenas dentro da mesma fase.
const orderNow = new Date('2026-10-16T12:00:00').getTime();
const fatigueOrderLogs = [
    { id: 301, kind: 'peso', muscle: 'Pernas', date: '2026-10-16', exercise: 'Leg Press 45°', reps: Array(10).fill(10) }
];
const recoveryTieVector = [
    { muscle: 'Pernas', exercise: 'Leg Press 45°' },
    { muscle: 'Peito', exercise: 'Supino Reto na Máquina' }
];
const orderWithoutContext = api.orderWorkoutExercises(recoveryTieVector);
const orderWithRecovery = api.orderWorkoutExercises(recoveryTieVector, {
    logs: fatigueOrderLogs, nowMs: orderNow, refDateISO: '2026-10-16'
});
check('sem contexto preserva a ordem-base por grupo', nomes(orderWithoutContext)[0] === 'Leg Press 45°', nomes(orderWithoutContext));
check('na mesma fase, prioriza mais prontidão + séries que faltam', nomes(orderWithRecovery)[0] === 'Supino Reto na Máquina', nomes(orderWithRecovery));
check('a ordem adaptada explica prontidão e meta semanal', /prontidão/.test(orderWithRecovery[0].orderReason) && /faltam 10/.test(orderWithRecovery[0].orderReason), orderWithRecovery[0].orderReason);
check('não atribui ao tamanho do grupo uma posição decidida pela recuperação', !/Grupo grande primeiro/.test(orderWithRecovery[0].orderReason), orderWithRecovery[0].orderReason);
const recoveryKeepsPhases = api.orderWorkoutExercises([
    { muscle: 'Peito', exercise: 'Crucifixo na Máquina' },
    { muscle: 'Pernas', exercise: 'Leg Press 45°' }
], { logs: fatigueOrderLogs, nowMs: orderNow, refDateISO: '2026-10-16' });
check('prontidão nunca põe isolador antes de composto', nomes(recoveryKeepsPhases)[0] === 'Leg Press 45°', nomes(recoveryKeepsPhases));
const recoveryKeepsActivation = api.orderWorkoutExercises([
    { muscle: 'Pernas', exercise: 'Leg Press 45°' },
    { muscle: 'Ombros', exercise: 'Manguito Rotador' }
], { logs: fatigueOrderLogs, nowMs: orderNow, refDateISO: '2026-10-16' });
check('ativação continua abrindo mesmo com outro grupo mais recuperado', nomes(recoveryKeepsActivation)[0] === 'Manguito Rotador', nomes(recoveryKeepsActivation));
const recoveryKeepsSupport = api.orderWorkoutExercises([
    { muscle: 'Antebraço', exercise: 'Extensão de Punho' },
    { muscle: 'Abdômen', exercise: 'Ab Wheel' }
], { logs: fatigueOrderLogs, nowMs: orderNow, refDateISO: '2026-10-16' });
check('regra de estabilizador continua valendo com o ajuste de recuperação', nomes(recoveryKeepsSupport)[0] === 'Ab Wheel', nomes(recoveryKeepsSupport));
const recoveryKeepsBiset = api.orderWorkoutExercises([
    { muscle: 'Pernas', exercise: 'Leg Press 45°' },
    { muscle: 'Peito', exercise: 'Supino Reto na Máquina', biset: true },
    { muscle: 'Peito', exercise: 'Crucifixo na Máquina' }
], { logs: fatigueOrderLogs, nowMs: orderNow, refDateISO: '2026-10-16' });
const posBisetSupino = nomes(recoveryKeepsBiset).indexOf('Supino Reto na Máquina');
check('desempate por fadiga não separa bi-set', nomes(recoveryKeepsBiset)[posBisetSupino + 1] === 'Crucifixo na Máquina', nomes(recoveryKeepsBiset));

console.log('\n== 18. Fadiga real + séries semanais (Fase 3) ==');
// Semana de 12/10/2026 (seg) a 18/10/2026 (dom) — 14/10 cai no meio
check('faixa-alvo 10–20 séries', api.FAIXA_SERIES_SEMANAIS.min === 10 && api.FAIXA_SERIES_SEMANAIS.max === 20);
const sem = api.isoWeekRange('2026-10-14');
check('semana de referência = 12 a 18/10', sem[0] === '2026-10-12' && sem[1] === '2026-10-18', sem);
const fakeLogs = [
    { id: 1, kind: 'peso', muscle: 'Pernas', date: '2026-10-12', exercise: 'Leg Press 45°', reps: [10, 10, 10] },
    { id: 2, kind: 'peso', muscle: 'Pernas', date: '2026-10-13', exercise: 'Agachamento Hack', sets: [{}, {}, {}] },
    { id: 3, kind: 'peso', muscle: 'Peito', date: '2026-10-11', exercise: 'Supino Reto na Máquina', reps: [8, 8] },   // semana anterior
    { id: 4, kind: 'corrida', muscle: 'Cardio', date: '2026-10-12', distanceKm: 5 },
    { id: 5, kind: 'peso', muscle: 'Peito', date: '2026-10-16', exercise: 'Supino Reto na Máquina', reps: [8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8] }
];
const semSets = api.weeklySetsByMuscle(fakeLogs, '2026-10-14');
check('séries da semana: pernas = 6 (3 reps + 3 sets)', semSets['Pernas'] === 6, semSets);
check('fora da semana não conta (peito de 11/10 ficou de fora)', (semSets['Peito'] || 0) === 12, semSets);
check('corrida não conta série', semSets['Cardio'] === undefined, semSets);

const f1 = api.fatigueState('Pernas', [], 4, Date.now());
check('4 séries: abaixo da meta, faltam 6', f1.volumeStatus === 'abaixo' && f1.faltam === 6 && f1.excesso === 0, f1);
check('sem registro: prontidão 100% mas meta em falta', f1.pct === 100 && f1.semRegistro === true, f1);
const f2 = api.fatigueState('Pernas', [], 12, Date.now());
check('12 séries: na faixa', f2.volumeStatus === 'na-faixa' && f2.faltam === 0 && f2.excesso === 0, f2);
const f3 = api.fatigueState('Peito', [], 25, Date.now());
check('25 séries: acima da faixa (excesso 5)', f3.volumeStatus === 'acima' && f3.excesso === 5, f3);
check('volume estourado derruba a prontidão real', f3.pct < f3.recuperacaoPct && f3.pct === 90, f3);
const hojeLogs = [{ id: 9, kind: 'peso', muscle: 'Peito', date: '2026-10-16', exercise: 'Supino Reto na Máquina', reps: [8, 8, 8, 8] }];
const f4 = api.fatigueState('Peito', hojeLogs, 15, new Date('2026-10-16T20:00:00').getTime());
check('treinou hoje: recuperação baixa mesmo com volume na faixa', f4.recuperacaoPct < 33 && f4.label === 'EXAUSTO', f4);
check('texto de volume pronto para a tela', /séries/.test(f3.volText), f3.volText);

console.log('\n== 19. Sugestão do próximo treino (Fase 3) ==');
const wkA = { id: 1, name: 'A — Pernas', exercises: [{ muscle: 'Pernas', exercise: 'Leg Press 45°' }] };
const wkB = { id: 2, name: 'B — Peito', exercises: [{ muscle: 'Peito', exercise: 'Supino Reto na Máquina' }] };
const nowSug = new Date('2026-10-16T12:00:00').getTime();
const sug = api.suggestNextWorkout([wkA, wkB], fakeLogs, nowSug);
check('prioriza pernas: descansadas + muito abaixo da meta', sug[0].w.name === 'A — Pernas', sug.map(s => [s.w.name, s.score]));
check('raciocínio cita a meta da semana', sug[0].motivos.some(m => /faltam \d+ séries/.test(m)), sug[0].motivos);
check('raciocínio cita o descanso', sug[0].motivos.some(m => /descansado/.test(m)), sug[0].motivos);
check('peito aparece como alternativa com score menor', sug.length === 2 && sug[1].w.name === 'B — Peito' && sug[1].score < sug[0].score, sug.map(s => s.score));
check('lista vazia de treinos não quebra', api.suggestNextWorkout([], fakeLogs, nowSug).length === 0);

const gaps = api.weeklyGaps(fakeLogs, '2026-10-16');
check('weeklyGaps lista pernas com falta (6/10)', gaps.some(g => g.muscle === 'Pernas' && g.faltam === 4), gaps);
check('grupos na faixa saem da lista de faltas', !gaps.some(g => g.muscle === 'Peito'), gaps);
check('maior falta vem primeiro', gaps[0].faltam >= (gaps[gaps.length - 1] || { faltam: 0 }).faltam, gaps.map(g => g.faltam));
check('dias desde o último treino', api.diasDesdeUltimoTreino(fakeLogs, nowSug) === 0 && api.diasDesdeUltimoTreino([{ date: '2026-10-10' }], nowSug) === 6, api.diasDesdeUltimoTreino(fakeLogs, nowSug));

console.log('\n== 22. Arte própria: emblemas de patente, selos, cards e retratos ==');
{
    const THEME_IDS = ['classico','zodiaco','hercules','acao','folclore','nordica','roma','rpg','galactica','aneis'];
    const missing = [];
    let heavy = [];
    for (const t of THEME_IDS) {
        for (let lvl = 1; lvl <= 10; lvl++) {
            const f = `images/patentes/${t}-${String(lvl).padStart(2,'0')}.webp`;
            if (!fs.existsSync(f)) missing.push(f);
            else if (fs.statSync(f).size > 60 * 1024) heavy.push(f);
        }
        for (const f of [`images/temas/${t}.webp`, `images/cards/${t}.webp`]) if (!fs.existsSync(f)) missing.push(f);
    }
    check('100 emblemas de patente + 10 selos + 10 fundos de card existem', missing.length === 0, missing.slice(0, 6));
    check('emblemas de patente ficam leves (<= 60 KB cada)', heavy.length === 0, heavy.slice(0, 4));
    const appSrc = fs.readFileSync('js/app.js', 'utf8');
    const s0 = appSrc.indexOf('const DEFAULT_BOSS_PORTRAITS');
    const block = appSrc.slice(s0, appSrc.indexOf('};', s0));
    const entries = [...block.matchAll(/'([a-z]+):([a-zA-Z0-9]+)':\s*'([^']+)'/g)];
    check('120 retratos mapeados, um por chefão, e todos existem no disco',
        entries.length === 120 && entries.every(([, t, id, file]) => !!api.THEMES[t] && !!api.THEMES[t].bosses.find(b => b.id === id) && fs.existsSync(file)),
        { encontrados: entries.length });
    check('cada tema cobre os 12 chefões com retrato próprio',
        THEME_IDS.every(t => entries.filter(([, th]) => th === t).length === 12),
        THEME_IDS.map(t => `${t}:${entries.filter(([, th]) => th === t).length}`));
}

console.log('\n== 23. Badges: 16 medalhões de arte própria ==');
{
    const BADGE_SLUGS = ['primeiro-sangue','ofensiva-semanal','mover-titan','cacador-de-prs',
        'maratonista','tanque-de-guerra','berzerker-master','cacador-de-chefoes',
        'primeiro-deload','semana-completa','colecionador','mestre-dos-chefoes',
        'mes-de-ferro','corredor','sequencia-de-aco','nivel-10'];
    const missing = BADGE_SLUGS.filter(s => !fs.existsSync(`images/badges/${s}.webp`));
    const heavy = BADGE_SLUGS.filter(s => fs.existsSync(`images/badges/${s}.webp`) && fs.statSync(`images/badges/${s}.webp`).size > 60 * 1024);
    check('16 medalhões de badge existem no disco e ficam leves (<= 60 KB)', missing.length === 0 && heavy.length === 0, { missing, heavy });
    const swSrc = fs.readFileSync('sw.js', 'utf8');
    check('os 16 badges entram no CORE do service worker', BADGE_SLUGS.every(s => swSrc.includes(`'./images/badges/${s}.webp'`)));
    const appSrc = fs.readFileSync('js/app.js', 'utf8');
    const m = appSrc.match(/const BADGE_ART = [\s\S]*?\]\)/);
    check('BADGE_ART do app lista exatamente os 16 slugs com arte', !!m && BADGE_SLUGS.every(s => m[0].includes(`'${s}'`)) && (m[0].match(/'[a-z0-9-]+'/g) || []).length === 16, m && (m[0].match(/'[a-z0-9-]+'/g) || []).length);
    check('badge sem arquivo volta pro emoji (fallback no onerror)', /badgeArtFallback/.test(appSrc) && /data-fallback/.test(appSrc));
}

// Dimensões de um WebP lendo o cabeçalho (VP8/VP8L/VP8X) — sem depender de
// ImageMagick, que não existe no runner do CI.
function webpSize(file) {
    const b = fs.readFileSync(file);
    if (b.length < 16 || b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') return null;
    let off = 12;
    while (off + 8 <= b.length) {
        const fourcc = b.toString('ascii', off, off + 4);
        const size = b.readUInt32LE(off + 4);
        const data = b.subarray(off + 8, off + 8 + size);
        if (fourcc === 'VP8X') return { w: 1 + data.readUIntLE(4, 3), h: 1 + data.readUIntLE(7, 3) };
        if (fourcc === 'VP8 ') return { w: data.readUInt16LE(6) & 0x3fff, h: data.readUInt16LE(8) & 0x3fff };
        if (fourcc === 'VP8L') {
            const bits = data.readUInt32LE(1);
            return { w: 1 + (bits & 0x3fff), h: 1 + ((bits >>> 14) & 0x3fff) };
        }
        off += 8 + size + (size % 2);
    }
    return null;
}

console.log('\n== 24. Manifest com screenshots (prompt de instalação rico) ==');
{
    const manifest = JSON.parse(fs.readFileSync('manifest.webmanifest', 'utf8'));
    const shots = manifest.screenshots || [];
    const dims = { 'narrow': '1080x1920', 'wide': '1920x1080' };
    check('manifest declara 2 screenshots (retrato + paisagem)', shots.length === 2 && shots.every(s => fs.existsSync(s.src)), shots.map(s => s.src));
    check('screenshots têm o form_factor e o tamanho certos no disco',
        shots.every(s => {
            const want = dims[s.form_factor];
            if (!want || s.sizes !== want) return false;
            const dim = webpSize(s.src);
            return !!dim && `${dim.w}x${dim.h}` === want;
        }), shots.map(s => `${s.form_factor}:${s.sizes}`));
    check('screenshots ficam leves para o prompt de instalação', shots.every(s => fs.statSync(s.src).size <= 400 * 1024), shots.map(s => fs.statSync(s.src).size));
}

console.log('\n== 25. Estúdio de reservas: manifesto e integração ==');
{
    const idx = JSON.parse(fs.readFileSync('images/bosses/reserva/index.json', 'utf8'));
    const itens = Object.values(idx.temas).flat();
    check('index.json lista as 35 reservas e todas existem no disco', idx.total === 35 && itens.length === 35 && itens.every(i => fs.existsSync(i.file)), itens.length);
    check('cada reserva cai no tema certo pelo prefixo do arquivo', Object.entries(idx.temas).every(([t, lista]) => lista.every(i => i.file.includes(`/reserva/${t}-`) && i.label && i.slug)));
    const appSrc25 = fs.readFileSync('js/app.js', 'utf8');
    check('app lê o manifesto e reaproveita bossPortraits (upload por chefão)', /loadReservaManifest\(\)/.test(appSrc25) && /function applyReservaPortrait/.test(appSrc25) && /bossPortraits\[reservaBossId\] = src/.test(appSrc25) && /delete bossPortraits\[reservaBossId\]/.test(appSrc25));
    check('index.json das reservas entra no CORE do service worker', fs.readFileSync('sw.js', 'utf8').includes("'./images/bosses/reserva/index.json'"));
}

console.log('\n== 26. Grupos canônicos no estímulo semanal ==');
check('normalizeMuscle tolera plural, acento e caixa',
    api.normalizeMuscle('posteriores') === 'Posterior' && api.normalizeMuscle('POSTERIOR') === 'Posterior'
    && api.normalizeMuscle('Biceps') === 'Bíceps' && api.normalizeMuscle('bíceps') === 'Bíceps'
    && api.normalizeMuscle('  ombros  ') === 'Ombros' && api.normalizeMuscle('ANTEBRACO') === 'Antebraço'
    && api.normalizeMuscle('abdomen') === 'Abdômen' && api.normalizeMuscle('triceps') === 'Tríceps',
    ['posteriores', 'Biceps', 'ANTEBRACO', 'abdomen'].map(api.normalizeMuscle));
check('grupos extintos continuam remapeados', api.normalizeMuscle('Glúteos') === 'Posterior' && api.normalizeMuscle('Pescoço') === 'Ombros');
check('vazio cai em Geral e grupo fora do vocabulário passa adiante', api.normalizeMuscle('') === 'Geral' && api.normalizeMuscle('Panturrilha') === 'Panturrilha');

const logsVariantes = [
    { id: 1, kind: 'peso', muscle: 'Posterior', date: '2026-10-13', exercise: 'Mesa Flexora', reps: [15, 15] },
    { id: 2, kind: 'peso', muscle: 'posteriores', date: '2026-10-14', exercise: 'Stiff com Barra', reps: [10, 10, 10] },
    { id: 3, kind: 'peso', muscle: 'Glúteos', date: '2026-10-14', exercise: 'Elevação Pélvica (Hip Thrust)', sets: [{}, {}, {}] }
];
const semCanonica = api.weeklySetsByMuscle(logsVariantes, '2026-10-14');
check('variantes do mesmo grupo somam numa chave só (Posterior = 8)',
    semCanonica['Posterior'] === 8 && Object.keys(semCanonica).length === 1, semCanonica);
check('weeklyGaps enxerga as 8 séries canônicas de Posterior',
    api.weeklyGaps(logsVariantes, '2026-10-14').some(g => g.muscle === 'Posterior' && g.series === 8 && g.faltam === 2));
check('apoio indireto não confunde variante do próprio grupo com outro grupo',
    api.sinergiaLogs('Posterior', [{ id: 4, kind: 'peso', muscle: 'posteriores', date: '2026-10-14', exercise: 'Agachamento Livre', reps: [8, 8] }]).length === 0
    && api.sinergiaLogs('Posterior', [{ id: 5, kind: 'peso', muscle: 'Pernas', date: '2026-10-14', exercise: 'Agachamento Livre', reps: [8, 8] }]).length === 1);

api.savedWorkouts = [{
    id: 1, name: 'Posterior/Acessórios', exercises: [
        { muscle: 'Pernas', exercise: 'Mesa Flexora' },
        { muscle: 'Glúteos', exercise: 'Elevação Pélvica (Hip Thrust)' },
        { muscle: 'Pernas', exercise: 'Leg Press 45°' },
        { muscle: 'Costas', exercise: 'Exercício inventado pelo usuário' }
    ]
}];
api.normalizeSavedWorkouts();
check('treino salvo rederiva o grupo pelo catálogo (Mesa Flexora → Posterior)',
    api.savedWorkouts[0].exercises.map(e => e.muscle).join('|') === 'Posterior|Posterior|Pernas|Costas',
    api.savedWorkouts[0].exercises.map(e => e.muscle));
api.savedWorkouts = [];

console.log('\n== 27. Autofill flexível: apelidos, prefixo único e sessão sugerida ==');
check('apelidos falados caem no exercício certo',
    api.catalogInfo('stiff').nome === 'Stiff com Barra'
    && api.catalogInfo('TERRA').nome === 'Levantamento Terra'
    && api.catalogInfo('supino').nome === 'Supino Reto na Máquina'
    && api.catalogInfo('hip thrust').grupo === 'Posterior'
    && api.catalogInfo('serrote').nome === 'Remada Unilateral c/ Halter'
    && api.catalogInfo('hack').nome === 'Agachamento Hack',
    ['stiff', 'TERRA', 'supino', 'hip thrust', 'serrote', 'hack'].map(n => (api.catalogInfo(n) || {}).nome));
check('apelidos ignoram acento e caixa', api.catalogInfo('ELEVAÇÃO PELVICA').nome === 'Elevação Pélvica (Hip Thrust)' && api.catalogInfo('Búlgaro').nome === 'Afundo Búlgaro');
check('apelidos antigos de migração continuam valendo', api.catalogInfo('agachamento búlgaro').nome === 'Afundo Búlgaro' && api.catalogInfo('prancha isometrica').nome === 'Prancha Isométrica' && api.catalogInfo('tríceps francês c/ halter').nome === 'Tríceps Francês na Polia');
check('catálogo tem ~30 apelidos novos além dos 6 de migração', Object.keys(api.CATALOG_ALIASES).length >= 36, Object.keys(api.CATALOG_ALIASES).length);
check('prefixo único de 4+ caracteres completa o nome', api.catalogInfo('mesa flex').nome === 'Mesa Flexora' && api.catalogInfo('cadeira ext').nome === 'Cadeira Extensora');
check('prefixo ambíguo ou curto demais não adivinha', api.catalogInfo('supino inclinado c') === null && api.catalogInfo('mes') === null && api.catalogInfo('exercício inexistente') === null && api.catalogInfo('') === null);
check('nome exato do catálogo continua tendo prioridade', api.catalogInfo('Supino Inclinado com Barra').nome === 'Supino Inclinado com Barra');

api.setLogs([
    { id: 1, date: '2026-10-06', kind: 'peso', muscle: 'Bíceps', exercise: 'Rosca Martelo', sessao: 'Bíceps/Costas' },
    { id: 2, date: '2026-10-06', kind: 'peso', muscle: 'Biceps', exercise: 'Rosca Direta com Barra', sessao: 'Bíceps/Costas' },
    { id: 3, date: '2026-10-10', kind: 'peso', muscle: 'Bíceps', exercise: 'Rosca Martelo', sessao: 'Full Body' },
    { id: 4, date: '2026-10-09', kind: 'peso', muscle: 'Posterior', exercise: 'Mesa Flexora', sessao: 'Posterior/Acessórios' },
    { id: 5, date: '2026-10-10', kind: 'corrida', muscle: 'Cardio', exercise: 'Corrida (Rua)', sessao: 'Cardio leve' }
]);
check('sessão sugerida = a mais repetida no histórico do grupo', api.suggestSessaoFor('Bíceps') === 'Bíceps/Costas', api.suggestSessaoFor('Bíceps'));
check('variante do grupo cai na mesma sugestão', api.suggestSessaoFor('biceps') === 'Bíceps/Costas' && api.suggestSessaoFor('posteriores') === 'Posterior/Acessórios');
check('grupo deriva do catálogo quando só o exercício é informado', api.suggestSessaoFor('', 'Mesa Flexora') === 'Posterior/Acessórios' && api.suggestSessaoFor(null, 'stiff') === 'Posterior/Acessórios');
check('Cardio e grupo sem histórico não sugerem sessão', api.suggestSessaoFor('Cardio') === '' && api.suggestSessaoFor('Antebraço') === '' && api.suggestSessaoFor('Geral') === '');
api.setLogs([...api.logsArr, { id: 6, date: '2026-10-11', kind: 'peso', muscle: 'Bíceps', exercise: 'Rosca Scott', sessao: 'Full Body' }]);
check('empate de uso desempata pela sessão mais recente', api.suggestSessaoFor('Bíceps') === 'Full Body', api.suggestSessaoFor('Bíceps'));
api.setLogs([]);

console.log('\n== 28. Meta de séries por grupo + apoio indireto visível ==');
check('Antebraço tem faixa própria (4–10)', api.FAIXA_SERIES_POR_GRUPO['Antebraço'].min === 4 && api.FAIXA_SERIES_POR_GRUPO['Antebraço'].max === 10);
check('faixaSeriesDoGrupo devolve a exceção e o padrão 10–20',
    api.faixaSeriesDoGrupo('Antebraço') === api.FAIXA_SERIES_POR_GRUPO['Antebraço']
    && api.faixaSeriesDoGrupo('antebraco') === api.FAIXA_SERIES_POR_GRUPO['Antebraço']
    && api.faixaSeriesDoGrupo('Peito') === api.FAIXA_SERIES_SEMANAIS
    && api.faixaSeriesDoGrupo('') === api.FAIXA_SERIES_SEMANAIS);
const fAntebraco = api.fatigueState('Antebraço', [], 6, Date.now());
check('fatigueState cobra a faixa do grupo: 6 séries de antebraço estão na faixa',
    fAntebraco.volumeStatus === 'na-faixa' && fAntebraco.faltam === 0 && fAntebraco.excesso === 0
    && fAntebraco.metaMin === 4 && fAntebraco.metaMax === 10 && fAntebraco.volText.includes('6/4–10 séries'), fAntebraco.volText);
const fPeitoMeta = api.fatigueState('Peito', [], 6, Date.now());
check('grupo sem exceção segue o padrão: 6 séries de peito = faltam 4',
    fPeitoMeta.metaMin === 10 && fPeitoMeta.metaMax === 20 && fPeitoMeta.faltam === 4, fPeitoMeta);

const logsMetaGrupo = [
    { id: 1, kind: 'peso', muscle: 'Antebraço', date: '2026-10-14', exercise: 'Flexão de Punho', reps: [12, 12] },
    { id: 2, kind: 'peso', muscle: 'Costas', date: '2026-10-14', exercise: 'Remada Baixa na Polia', reps: [10, 10, 10] }
];
const gapAntebraco = api.weeklyGaps(logsMetaGrupo, '2026-10-14').find(g => g.muscle === 'Antebraço');
check('gap traz a faixa do grupo (min/max) junto de series e faltam',
    gapAntebraco.min === 4 && gapAntebraco.max === 10 && gapAntebraco.series === 2 && gapAntebraco.faltam === 2 && gapAntebraco.status === 'abaixo', gapAntebraco);
check('gap soma o apoio indireto da semana (3 séries de remada × 0,5 = 1,5)', gapAntebraco.indiretas === 1.5, gapAntebraco.indiretas);
check('indiretas NÃO entram em series nem abatem faltam', gapAntebraco.series === 2 && gapAntebraco.faltam === 2);
check('grupo sem regra de sinergia vem com indiretas zeradas',
    api.weeklyGaps(logsMetaGrupo, '2026-10-14').find(g => g.muscle === 'Peito').indiretas === 0);
check('apoio de fora da semana não conta como indireto',
    api.weeklyGaps([{ id: 3, kind: 'peso', muscle: 'Costas', date: '2026-10-01', exercise: 'Remada Baixa na Polia', reps: [10, 10, 10] }], '2026-10-14')
        .find(g => g.muscle === 'Bíceps').indiretas === 0);
check('seriesIndiretasSemana é puro: mesmo vetor fora da semana = 0',
    api.seriesIndiretasSemana('Bíceps', [{ id: 4, kind: 'peso', muscle: 'Costas', date: '2026-10-14', exercise: 'Remada Baixa na Polia', reps: [10, 10, 10] }]) === 1.5
    && api.seriesIndiretasSemana('Peito', [{ id: 5, kind: 'peso', muscle: 'Costas', date: '2026-10-14', exercise: 'Remada Baixa na Polia', reps: [10, 10, 10] }]) === 0);
const gapAntebracoAcima = api.weeklyGaps(
    [{ id: 6, kind: 'peso', muscle: 'Antebraço', date: '2026-10-14', exercise: 'Flexão de Punho', sets: Array.from({ length: 12 }, () => ({})) }],
    '2026-10-14').find(g => g.muscle === 'Antebraço');
check('acima da faixa do grupo: 12 séries de antebraço = +2 sobre o máximo 10',
    gapAntebracoAcima.status === 'acima' && gapAntebracoAcima.excesso === 2 && gapAntebracoAcima.max === 10, gapAntebracoAcima);
check('gaps continuam ordenados pela maior falta', (() => {
    const g = api.weeklyGaps(logsMetaGrupo, '2026-10-14');
    return g.every((x, i) => i === 0 || g[i - 1].faltam >= x.faltam);
})());

console.log('\n' + (failures === 0 ? '✅ TODOS OS TESTES PASSARAM' : `❌ ${failures} FALHA(S)`));
process.exit(failures === 0 ? 0 : 1);
