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
