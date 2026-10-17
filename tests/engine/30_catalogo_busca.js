/* ============================================================
   CATÁLOGO, CSV, TAGS, ORDENAÇÃO, FADIGA E SUGESTÃO DE TREINO
   ------------------------------------------------------------
   Trecho de test_engine.js, movido sem alterar a lógica dos testes.
   Avaliado pelo runner no MESMO escopo dos demais trechos (ordem do nome).
   ============================================================ */

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
// Formato 2: as 22 colunas antigas continuam na mesma ordem; colunas novas vêm depois.
const COLUNAS_V1 = ['Data', 'Sessão', 'Exercício', 'Carga registrada (kg)', 'S1', 'S2', 'S3', 'S4', 'S5', 'RIR', 'Conferir?', 'Observações', 'Unidade', 'Fator', 'Lados', 'Carga efetiva (kg)', 'Total reps (ou segundos)', 'Volume (kg)', 'Melhor série', 'Menor série', '1RM Epley (kg)', 'Métrica de progresso'];
check('cabeçalho Log: 22 colunas v1 preservadas na ordem + colunas novas do formato 2 (com PR informativo no fim)', rows[0].slice(0, 22).join('|') === COLUNAS_V1.join('|') && rows[0].slice(22).join('|') === 'ID do registro|Tipo de exercício|Grupo do registro|Técnica|Meta da próxima sessão|Séries (JSON)|PR (informativo)', rows[0]);
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
check('sem registro: prontidão desconhecida, mas meta semanal permanece visível', f1.pct === null && f1.semRegistro === true && f1.faltam === 6 && f1.label === 'SEM DADOS', f1);
const f2 = api.fatigueState('Pernas', [], 12, Date.now());
check('12 séries: na faixa', f2.volumeStatus === 'na-faixa' && f2.faltam === 0 && f2.excesso === 0, f2);
const f3 = api.fatigueState('Peito', [{ date: '2026-10-12', exercise: 'Supino', reps: [8] }], 25, new Date('2026-10-16T12:00:00').getTime());
check('25 séries: acima da faixa (excesso 5)', f3.volumeStatus === 'acima' && f3.excesso === 5, f3);
check('volume excedente ajusta uma estimativa conhecida, não inventa prontidão', f3.pct < f3.recuperacaoPct && f3.pct === 90, f3);
const hojeLogs = [{ id: 9, kind: 'peso', muscle: 'Peito', date: '2026-10-16', exercise: 'Supino Reto na Máquina', reps: [8, 8, 8, 8] }];
const f4 = api.fatigueState('Peito', hojeLogs, 15, new Date('2026-10-16T20:00:00').getTime());
check('treinou hoje: recuperação baixa mesmo com volume na faixa', f4.recuperacaoPct < 33 && f4.label === 'FADIGA ALTA', f4);
check('texto de volume pronto para a tela', /séries/.test(f3.volText), f3.volText);

console.log('\n== 19. Sugestão do próximo treino (Fase 3) ==');
const wkA = { id: 1, name: 'A — Pernas', exercises: [{ muscle: 'Pernas', exercise: 'Leg Press 45°' }] };
const wkB = { id: 2, name: 'B — Peito', exercises: [{ muscle: 'Peito', exercise: 'Supino Reto na Máquina' }] };
const nowSug = new Date('2026-10-16T12:00:00').getTime();
const sug = api.suggestNextWorkout([wkA, wkB], fakeLogs, nowSug);
check('prioriza pernas: descansadas + muito abaixo da meta', sug[0].w.name === 'A — Pernas', sug.map(s => [s.w.name, s.score]));
check('raciocínio cita a meta da semana', sug[0].motivos.some(m => /faltam \d+ séries/.test(m)), sug[0].motivos);
check('raciocínio explica prontidão estimada ou ausência de dados', sug[0].motivos.some(m => /pronto segundo a estimativa|sem histórico suficiente/.test(m)), sug[0].motivos);
check('peito aparece como alternativa com score menor', sug.length === 2 && sug[1].w.name === 'B — Peito' && sug[1].score < sug[0].score, sug.map(s => s.score));
check('lista vazia de treinos não quebra', api.suggestNextWorkout([], fakeLogs, nowSug).length === 0);

const gaps = api.weeklyGaps(fakeLogs, '2026-10-16');
check('weeklyGaps lista pernas com falta (6/10)', gaps.some(g => g.muscle === 'Pernas' && g.faltam === 4), gaps);
check('grupos na faixa saem da lista de faltas', !gaps.some(g => g.muscle === 'Peito'), gaps);
check('maior falta vem primeiro', gaps[0].faltam >= (gaps[gaps.length - 1] || { faltam: 0 }).faltam, gaps.map(g => g.faltam));
check('dias desde o último treino', api.diasDesdeUltimoTreino(fakeLogs, nowSug) === 0 && api.diasDesdeUltimoTreino([{ date: '2026-10-10' }], nowSug) === 6, api.diasDesdeUltimoTreino(fakeLogs, nowSug));
