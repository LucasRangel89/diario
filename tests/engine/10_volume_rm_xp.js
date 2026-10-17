/* ============================================================
   VOLUME, 1RM, PR, ANILHAS, CHEFÃO, XP, MISSÕES E STREAK
   ------------------------------------------------------------
   Trecho de test_engine.js, movido sem alterar a lógica dos testes.
   Avaliado pelo runner no MESMO escopo dos demais trechos (ordem do nome).
   ============================================================ */

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
check('séries com cargas diferentes usam o par carga/reps da mesma série', api.logEst1RM({ exercise: 'Supino Reto com Barra', type: 'carga_total', weight: 80, sets: [{ weight: 100, reps: 5 }, { weight: 80, reps: 10 }] }) === 116.7);
check('série de aquecimento não define e1RM', api.logEst1RM({ type: 'carga_total', weight: 100, sets: [{ weight: 120, reps: 3, isWarmup: true }, { weight: 100, reps: 5 }] }) === 116.7);

console.log('\n== 2b. Regra do 1RM Epley da planilha (só ≤ 12 reps) ==');
check('epley 40 × (1+12/30) = 56', api.epleySeValido(40, 12) === 56, api.epleySeValido(40, 12));
check('epley 100 × (1+5/30) = 116,7', api.epleySeValido(100, 5) === 116.7, api.epleySeValido(100, 5));
check('melhor série 13 > 12 → null (fora do intervalo escolhido)', api.epleySeValido(20, 13) === null);
check('log com mais de 12 reps não gera e1RM no PR', api.logEst1RM({ type: 'carga_total', weight: 20, reps: [13] }) === 0);
check('logFullMeta: Elev. Lateral best 13 → est1RM null', v2.est1RM === null, v2.est1RM);
check('logFullMeta: Tríceps best 12 → est1RM 56', v1.est1RM === 56, v1.est1RM);
const calc1RMNodes = {
    'calc-1rm-weight': { value: '100' }, 'calc-1rm-reps': { value: '5' },
    'calc-1rm-result': { textContent: '', innerHTML: '' }, 'calc-1rm-table': { innerHTML: '' }
};
const getElementByIdOriginal = document.getElementById;
document.getElementById = id => calc1RMNodes[id] || null;
api.calculate1RM();
check('calculadora usa a mesma estimativa Epley (116,7 kg)', calc1RMNodes['calc-1rm-result'].textContent === '116,7 kg (estimado)');
calc1RMNodes['calc-1rm-reps'].value = '13';
api.calculate1RM();
check('calculadora não extrapola acima de 12 reps', /Fora do intervalo/.test(calc1RMNodes['calc-1rm-result'].textContent) && calc1RMNodes['calc-1rm-table'].innerHTML === '');
document.getElementById = getElementByIdOriginal;

console.log('\n== 3. Dupla progressão ==');
const supino = { exercise: 'Supino Reto com Barra', type: 'carga_total', weight: 100, reps: [10, 10, 10, 10] };
const prog = api.duplaProgressao(supino);
check('todas no topo (10 = topo 6-10) sugere +2,5', prog && prog.proximaCarga === 102.5, prog);
check('barra fixa sem carga adicional não sugere incremento em kg', api.duplaProgressao({ exercise: 'Barra Fixa (Pull-up)', type: 'peso_corporal', weight: 90, reps: [8, 8] }) === null);
check('sem sugestão quando reps abaixo', api.duplaProgressao({ ...supino, reps: [8, 8] }) === null);
check('halter no topo sugere +2', api.duplaProgressao({ exercise: 'Elevação Lateral c/ Halteres', type: 'halter_par', weight: 10, reps: [20, 20, 20] }).proximaCarga === 12);
check('sinal ⬆ quando menor série no topo', api.sinalProximaSessao({ exercise: 'Cadeira Extensora', type: 'carga_total', weight: 40, reps: [18, 15, 20] }) === '⬆ Progredir');
check('sinal ➡ quando menor série fora do topo', api.sinalProximaSessao({ exercise: 'Tríceps Corda na Polia', type: 'carga_total', weight: 30, reps: [12, 15, 15] }) === '➡ Manter e buscar reps');

console.log('\n== 4. PR automático ==');
const logsBase = [
    { id: 1, date: '2026-09-25', kind: 'peso', muscle: 'Peito', exercise: 'Supino', type: 'carga_total', weight: 100, reps: [5], isPR: false },
    { id: 2, date: '2026-09-27', kind: 'peso', muscle: 'Peito', exercise: 'Supino', type: 'carga_total', weight: 100, reps: [5], isPR: false },
    { id: 3, date: '2026-10-01', kind: 'peso', muscle: 'Peito', exercise: 'Supino', type: 'carga_total', weight: 100, reps: [5], isPR: false }
];
check('PR exige histórico mínimo de três sessões e melhora do recorde', api.detectAutoPR({ id: 4, date: '2026-10-04', exercise: 'Supino', type: 'carga_total', weight: 105, reps: [5] }, logsBase, BW) === true);
check('sem PR quando fica abaixo do recorde', api.detectAutoPR({ id: 4, date: '2026-10-04', exercise: 'Supino', type: 'carga_total', weight: 90, reps: [5] }, logsBase, BW) === false);
check('um exercício novo sem três sessões não dá PR', api.detectAutoPR({ id: 5, date: '2026-10-04', exercise: 'Rosca', type: 'carga_total', weight: 50, reps: [10] }, logsBase, BW) === false);
check('Conferir pendente não pode virar PR', api.detectAutoPR({ id: 5, date: '2026-10-04', exercise: 'Supino', type: 'carga_total', weight: 105, reps: [5], conferir: true }, logsBase, BW) === false);
const prNaSemana = [...logsBase, { id: 6, date: '2026-10-02', kind: 'peso', muscle: 'Peito', exercise: 'Supino', type: 'carga_total', weight: 105, reps: [5], isPR: true }];
check('no máximo um crítico por exercício na mesma semana', api.detectAutoPR({ id: 7, date: '2026-10-04', exercise: 'Supino', type: 'carga_total', weight: 110, reps: [5] }, prNaSemana, BW) === false);
const histPlank = [25, 27, 29].map((day, i) => ({ id: 10 + i, date: `2026-09-${day}`, kind: 'peso', exercise: 'Prancha Isométrica', type: 'isometria', reps: [120 + i * 10] }));
check('isometria: PR por tempo também respeita as três sessões', api.detectAutoPR({ id: 20, date: '2026-10-04', exercise: 'Prancha Isométrica', type: 'isometria', reps: [200] }, histPlank, BW) === true);

console.log('\n== 5. Anilhas ==');
check('90 kg leg press com carrinho 40 = carrinho + 25 por lado', api.formatPlates(90, 40).includes('+ 25 por lado'), api.formatPlates(90, 40));
check('100 kg barra 20 = 20 + 25 + 15 por lado? (40/lado)', api.formatPlates(100, 20).includes('25 + 15'), api.formatPlates(100, 20));

console.log('\n== 6. Chefão: fraqueza e crítico ==');
const bosses = [
    { id: 'b0', name: 'A', maxHp: 8, weak: 'Pernas' },
    { id: 'b1', name: 'B', maxHp: 20, weak: 'Peito' }
];
const logsBoss = [
    { id: 1, date: '2026-10-05', kind: 'peso', muscle: 'Peito', exercise: 'Supino Reto com Barra', type: 'carga_total', weight: 100, reps: [8, 8, 8, 8], isPR: false }
];
const freshCombatState = { version: 2, baselineById: {}, baselineLogIds: [], assignments: {} };
const prog2 = api.computeBossProgress(logsBoss, BW, bosses, freshCombatState);
check('séries efetivas no grupo menos estimulado causam dano dobrado e derrotam o primeiro chefão', prog2.defeatedCount === 1 && prog2.totalDamage === 8, prog2);
check('dano efetivo não depende da carga em kg', api.logDamageKg({ ...logsBoss[0], weight: 1000 }, BW, bosses[0], 4, 'Peito') === 8);
check('recompensa de chefão mantém a faixa histórica após recalibrar HP (125–235 XP)', api.bossRewardXP({ maxHp: 100 }) === 125 && api.bossRewardXP({ maxHp: 298 }) === 235);
const migrationState = { version: 1, baselineById: { b0: { ratio: 1, defeatedAt: '2026-10-01' }, b1: { ratio: 0.25, defeatedAt: null } }, baselineLogIds: ['old'], assignments: {} };
const migrated = api.computeBossProgress([{ id: 'old', date: '2026-10-01', kind: 'peso', exercise: 'Supino Reto com Barra', reps: [5] }], BW, bosses, migrationState);
const progReordenado = api.computeBossProgress([{ id: 'old', date: '2026-10-01', kind: 'peso', exercise: 'Supino Reto com Barra', reps: [5] }], BW, [bosses[1], bosses[0]], migrated.combatState);
check('migração mantém derrotas e frações de HP associadas ao ID após reordenar a lista', progReordenado.defeatedAt.b0 === '2026-10-01' && progReordenado.damageById.b0 === 8, progReordenado);
const oldKgLog = { id: 'legacy-kg', date: '2026-10-01', kind: 'peso', muscle: 'Peito', exercise: 'Supino Reto com Barra', type: 'carga_total', weight: 100, reps: [8, 8, 8, 8] };
const migratedV1 = api.computeBossProgress([oldKgLog], BW, [{ ...bosses[0], maxHp: 100, weak: null }], { version: 1, baselineById: {}, baselineLogIds: [], baselineTotalDamage: 0, assignments: {} });
check('migração v1 congela dano legado na fração equivalente e não reinterpreta kg como séries', migratedV1.combatState.version === 2 && migratedV1.damageById.b0 > 12 && migratedV1.damageById.b0 < 13 && migratedV1.totalDamage === 0, migratedV1);
const progRecalculado = api.computeBossProgress([{ id: 'old', date: '2026-10-01', kind: 'peso', exercise: 'Supino Reto com Barra', reps: [5] }], BW, [bosses[1], bosses[0]], progReordenado.combatState);
check('recalcular a batalha não duplica o dano registrado', progRecalculado.currentHp === progReordenado.currentHp && progRecalculado.totalDamage === progReordenado.totalDamage);

const muscleGroups = ['Peito', 'Costas', 'Pernas', 'Posterior', 'Ombros', 'Bíceps', 'Tríceps', 'Abdômen', 'Core', 'Antebraço'];
const priorWeekLogs = muscleGroups.map((muscle, i) => ({ id: `weak-${i}`, date: '2026-09-28', muscle }));
const priorCredits = new Map(priorWeekLogs.map((log, i) => [log, i === 0 ? 2 : 12]));
check('fraqueza semanal escolhe o grupo com menos séries efetivas na semana anterior', api.weaknessGroupForWeek(priorWeekLogs, '2026-10-05', priorCredits) === 'Peito');
const thisWeekLogs = muscleGroups.map((muscle, i) => ({ id: `goal-${i}`, date: '2026-10-05', muscle }));
const underTarget = new Map(thisWeekLogs.map(log => [log, 10]));
underTarget.set(thisWeekLogs[9], 3);
check('condição do Mestre falha quando um grupo fica abaixo do mínimo semanal', api.allGroupsMetForWeek(thisWeekLogs, '2026-10-05', underTarget) === false);
underTarget.set(thisWeekLogs[9], 4);
check('condição do Mestre passa quando todos os grupos atingem o mínimo (inclui Antebraço)', api.allGroupsMetForWeek(thisWeekLogs, '2026-10-05', underTarget) === true);
const master = [{ id: 'master', name: 'Mestre', archetype: 'Ms', maxHp: 100, weak: 'Peito' }];
const masterBlocked = api.computeBossProgress([{ id: 500, date: '2026-10-05', kind: 'peso', muscle: 'Peito', exercise: 'Supino Reto com Barra', reps: [8, 8, 8] }], BW, master, freshCombatState);
check('Mestre bloqueia dano enquanto faltar qualquer grupo na meta semanal (sem cura adicional)', masterBlocked.totalDamage === 0 && masterBlocked.currentHp === 100);

console.log('\n== 7. XP com teto diário ==');
const logsXP = [
    { id: 1, date: '2026-10-01', kind: 'peso', muscle: 'Peito', exercise: 'Supino Reto com Barra', type: 'carga_total', weight: 200, reps: [10, 10, 10, 10, 10], isPR: false },
    { id: 2, date: '2026-10-01', kind: 'corrida', distanceKm: 5, durationMin: 25, isPR: false }
];
const xp = api.computeXP('2026-10-01', { logs: logsXP, bodyweight: BW, deloadWeeks: [], missionsXpTotal: 0, bosses: [] });
check('XP de treino conta 2,5 por série efetiva, não kg movidos', xp.training === 13, xp.training);
check('cardio XP = 53 (5×8 + 25×0,5)', xp.cardio === 53, xp.cardio);
const isolatedRestXP = api.computeXP('2026-10-13', { logs: [], bodyweight: BW, deloadWeeks: ['2026-W41'], missionsXpTotal: 0, bosses: [], restDays: ['2026-10-05', '2026-10-06'] });
check('dias de descanso podem ser atribuídos a um jogo sem duplicar XP', isolatedRestXP.restXP === 50, isolatedRestXP.restXP);

console.log('\n== 7b. XP global independente do tema ==');
Object.values(api.themeSaves).forEach(save => { save.missionsXpTotal = 0; save.deloadRestDays = []; save.seasons = null; });
const xpGlobalLogs = [
    { id: 91001, date: '2026-10-01', kind: 'peso', muscle: 'Peito', exercise: 'Supino', type: 'carga_total', weight: 10, reps: [10], xpTheme: 'classico' },
    { id: 91002, date: '2026-10-02', kind: 'peso', muscle: 'Bíceps', exercise: 'Rosca', type: 'carga_total', weight: 10, reps: [10], xpTheme: 'aneis' }
];
api.setLogs(xpGlobalLogs);
api.setBW(BW);
const xpGlobalOriginal = api.computeGlobalXPCtx('2026-10-02').xp;
api.setLogs(xpGlobalLogs.map(log => ({ ...log, xpTheme: 'classico' })));
const xpGlobalReassigned = api.computeGlobalXPCtx('2026-10-02').xp;
check('logs históricos de todos os temas contam no XP global uma única vez', xpGlobalOriginal > 0 && xpGlobalOriginal === xpGlobalReassigned, { xpGlobalOriginal, xpGlobalReassigned });
const capLogs = [
    { id: 92001, date: '2026-10-05', kind: 'peso', muscle: 'Peito', exercise: 'Supino Reto com Barra', sets: Array.from({ length: 25 }, () => ({ reps: 10 })), rir: 2 },
    { id: 92002, date: '2026-10-06', kind: 'peso', muscle: 'Peito', exercise: 'Supino Reto na Máquina', reps: [10, 10, 10] }
];
const capCredits = api.effectiveSetAllocations(capLogs, '2026-10-11');
check('teto semanal limita o grupo a 20 séries efetivas, mesmo em vários registros', capCredits.get(capLogs[0]) === 20 && !capCredits.has(capLogs[1]), [...capCredits.values()]);
const pending = { id: 92003, date: '2026-10-07', kind: 'peso', muscle: 'Peito', exercise: 'Supino Reto com Barra', reps: [10, 10], conferir: true };
const hardSet = { id: 92004, date: '2026-10-07', kind: 'peso', muscle: 'Peito', exercise: 'Supino Reto com Barra', reps: [10, 10], rir: 4 };
const filteredCredits = api.effectiveSetAllocations([pending, hardSet], '2026-10-11');
check('Conferir pendente e séries com RIR > 3 não geram séries efetivas', filteredCredits.size === 0);
const pendingXP = api.computeXP('2026-10-07', { logs: [
    { id: 92007, date: '2026-10-07', kind: 'peso', muscle: 'Peito', exercise: 'Supino Reto com Barra', reps: [10, 10], conferir: true, isPR: true },
    { id: 92008, date: '2026-10-07', kind: 'corrida', distanceKm: 5, durationMin: 25, conferir: true }
], bodyweight: BW, bosses: [], restDays: [] });
check('Conferir pendente não rende XP, PR nem cardio XP', pendingXP.training === 0 && pendingXP.prXP === 0 && pendingXP.cardio === 0 && pendingXP.prog.totalDamage === 0, pendingXP);
const xpCargaAlta = api.computeXP('2026-10-08', { logs: [{ id: 92005, date: '2026-10-08', kind: 'peso', muscle: 'Peito', exercise: 'Supino Reto com Barra', weight: 200, reps: [10, 10, 10] }], bodyweight: BW, bosses: [], restDays: [] }).training;
const xpCargaBaixa = api.computeXP('2026-10-08', { logs: [{ id: 92006, date: '2026-10-08', kind: 'peso', muscle: 'Peito', exercise: 'Supino Reto com Barra', weight: 20, reps: [10, 10, 10] }], bodyweight: BW, bosses: [], restDays: [] }).training;
check('mesmas séries efetivas rendem mesmo XP com cargas diferentes', xpCargaAlta === xpCargaBaixa && xpCargaAlta === 8, { xpCargaAlta, xpCargaBaixa });

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
