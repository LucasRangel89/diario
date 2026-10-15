/* ============================================================
   DADOS DA PLANILHA DO USUÁRIO — seed inicial do app
   (Log de 28/09 a 10/10/2026 + convenções da planilha)
   Formato de cada linha:
   [dataISO, sessao, exercicio, cargaRegistrada, [S1..Sn], rir, conferir, obs]
   ============================================================ */

const PLANILHA_LOG = [
    ['2026-09-28', 'Peito/Tríceps/Ombro', 'Tríceps Corda na Polia', 40, [12, 12, 12], 1, true, 'Em 08/10 caiu para 30 kg - conferir pino'],
    ['2026-09-28', 'Peito/Tríceps/Ombro', 'Elevação Lateral c/ Halteres', 10, [13, 13, 12, 11], 1, false, 'App registrou 20 = 10 cada lado'],
    ['2026-09-28', 'Peito/Tríceps/Ombro', 'Crossover na Polia Alta', 20, [12, 13, 12], 1, false, '20 cada lado da polia'],
    ['2026-09-28', 'Peito/Tríceps/Ombro', 'Supino Inclinado c/ Halteres', 18, [8, 7, 7], 0, false, 'Falha. Aquecimento 2x16 já pesado - usar 16 no trabalho'],
    ['2026-09-28', 'Peito/Tríceps/Ombro', 'Supino Reto na Máquina', 70, [10, 8, 8, 8], 1, false, ''],
    ['2026-10-06', 'Bíceps/Costas', 'Rosca Martelo', 8, [8, 8], null, false, 'Registrado 16 = soma dos halteres (8+8) — convertido para 8/haltere (conferido)'],
    ['2026-10-06', 'Bíceps/Costas', 'Rosca Direta com Barra', 20, [12, 8, 6], null, false, 'Extra = barra estimada'],
    ['2026-10-06', 'Bíceps/Costas', 'Remada Curvada com Barra', 30, [12, 12, 14], null, false, ''],
    ['2026-10-06', 'Bíceps/Costas', 'Voador Inverso', 30, [13, 12, 12], null, false, ''],
    ['2026-10-06', 'Bíceps/Costas', 'Puxada Frontal na Polia', 50, [10, 10, 9], null, false, ''],
    ['2026-10-06', 'Bíceps/Costas', 'Remada Unilateral c/ Halter', 20, [12, 10, 9], null, false, 'Reps por lado'],
    ['2026-10-06', 'Bíceps/Costas', 'Barra Fixa (Pull-up)', 93, [4, 2, 4], null, false, 'Peso corporal do dia ≈ 93 kg (peso atual ≈ 94 kg — conferido)'],
    ['2026-10-07', 'Pernas/Abdômen', 'Abdominal na Polia Alta', 35, [15, 15, 15], null, false, ''],
    ['2026-10-07', 'Pernas/Abdômen', 'Abdutor', 40, [12, 15, 12], null, false, ''],
    ['2026-10-07', 'Pernas/Abdômen', 'Panturrilha em Pé', 80, [15, 15, 15, 15], null, false, ''],
    ['2026-10-07', 'Pernas/Abdômen', 'Cadeira Extensora', 40, [18, 15, 20], null, false, 'Reps acima da faixa - subir carga'],
    ['2026-10-07', 'Pernas/Abdômen', 'Afundo Búlgaro', 5, [7, 8, 7], null, false, 'Exercício novo e muito exigente - foco em técnica. Reps por perna'],
    ['2026-10-07', 'Pernas/Abdômen', 'Leg Press 45°', 90, [10, 12, 10], null, false, ''],
    ['2026-10-07', 'Pernas/Abdômen', 'Agachamento Hack', 40, [8, 8, 8, 8], null, false, 'Bastante exigente - progredir por reps'],
    ['2026-10-08', 'Peito/Tríceps/Ombro', 'Tríceps Corda na Polia', 30, [12, 15, 15], null, false, ''],
    ['2026-10-08', 'Peito/Tríceps/Ombro', 'Tríceps Unilateral (francês/testa)', 10, [19, 15, 10], null, false, 'Polia (conferido). Reps iguais por braço'],
    ['2026-10-08', 'Peito/Tríceps/Ombro', 'Elevação Lateral c/ Halteres', 8, [20, 20, 16, 12], null, true, 'Assumido 8 kg por haltere'],
    ['2026-10-08', 'Peito/Tríceps/Ombro', 'Crucifixo na Máquina', 60, [18, 20], null, false, '1RM superestimado (reps altas)'],
    ['2026-10-08', 'Peito/Tríceps/Ombro', 'Crossover na Polia Alta', 30, [15, 12, 12], null, false, 'Conferido: 30 por lado'],
    ['2026-10-08', 'Peito/Tríceps/Ombro', 'Supino Inclinado c/ Halteres', 12, [12, 12, 12], null, false, '2 halteres de 12 kg'],
    ['2026-10-08', 'Peito/Tríceps/Ombro', 'Supino Reto na Máquina', 60, [8, 8, 8, 8], null, false, 'Card dizia com Barra - academia só tem máquina'],
    ['2026-10-09', 'Posterior/Acessórios', 'Elevação Pélvica (Hip Thrust)', 40, [20, 20, 15], null, false, 'Anilhas nas laterais da máquina'],
    ['2026-10-09', 'Posterior/Acessórios', 'Mesa Flexora', 30, [20, 15, 15], null, false, ''],
    ['2026-10-09', 'Posterior/Acessórios', 'Rotação na Polia', 30, [15, 15, 15], null, false, 'Reps iguais por lado (conferido)'],
    ['2026-10-09', 'Posterior/Acessórios', 'Encolhimento de Ombros', 25, [15, 10, 10], null, false, 'Halteres (conferido). Registrado 50 = soma (25+25) — convertido para 25/haltere'],
    ['2026-10-09', 'Posterior/Acessórios', 'Extensão de Punho', 6, [10, 10, 10], null, false, 'Halteres (conferido) — 6 kg por haltere'],
    ['2026-10-09', 'Posterior/Acessórios', 'Flexão de Punho', 6, [10, 12, 15], null, false, 'Halteres (conferido) — 6 kg por haltere'],
    ['2026-10-09', 'Posterior/Acessórios', 'Extensão Cervical', 10, [15, 10], null, false, ''],
    ['2026-10-09', 'Posterior/Acessórios', 'Manguito Rotador', 20, [20, 20], null, false, 'Polia (conferido) — roldanas reduzem a carga real; esforço médio'],
    ['2026-10-10', 'Full Body', 'Panturrilha em Pé', 70, [16, 15, 14], null, false, ''],
    ['2026-10-10', 'Full Body', 'Prancha Isométrica', 0, [60, 40, 34], null, false, 'Registrar só segundos. App somou 95 kg x 134 s = 12,7 t ao volume'],
    ['2026-10-10', 'Full Body', 'Tríceps Francês na Polia', 35, [11, 10, 12], null, false, 'Conferido: é na polia (pino em 35 kg)'],
    ['2026-10-10', 'Full Body', 'Tríceps na Polia Alta', 20, [15, 15, 15], null, false, ''],
    ['2026-10-10', 'Full Body', 'Rosca Martelo', 6, [10, 10, 11], null, false, 'Registrado 12 = soma dos halteres (6+6) — convertido para 6/haltere (conferido)'],
    ['2026-10-10', 'Full Body', 'Rosca Direta com Barra', 20, [14, 11, 10], null, false, ''],
    ['2026-10-10', 'Full Body', 'Crossover na Polia Alta', 20, [15, 12, 8], null, false, 'Conferido: 20 por lado'],
    ['2026-10-10', 'Full Body', 'Face Pull', 20, [20, 20], null, false, ''],
    ['2026-10-10', 'Full Body', 'Elevação Lateral c/ Halteres', 6, [20, 20, 18], null, true, 'Assumido 6 kg por haltere'],
    ['2026-10-10', 'Full Body', 'Puxada Frontal na Polia', 50, [15, 15, 10], null, false, '']
];

// Sessões da planilha viram treinos salvos (para o "Iniciar" do app)
const PLANILHA_SESSOES = [
    { id: 2001, name: 'Peito/Tríceps/Ombro', exercises: [
        { muscle: 'Tríceps', exercise: 'Tríceps Corda na Polia', weight: 30, repsText: '12, 15, 15', technique: 'Convencional', type: 'carga_total' },
        { muscle: 'Tríceps', exercise: 'Tríceps Unilateral (francês/testa)', weight: 10, repsText: '12, 12', technique: 'Convencional', type: 'halter_uni' },
        { muscle: 'Ombros', exercise: 'Elevação Lateral c/ Halteres', weight: 8, repsText: '20, 20, 16', technique: 'Convencional', type: 'halter_par' },
        { muscle: 'Peito', exercise: 'Crucifixo na Máquina', weight: 60, repsText: '18, 20', technique: 'Convencional', type: 'carga_total' },
        { muscle: 'Peito', exercise: 'Crossover na Polia Alta', weight: 15, repsText: '15, 12, 12', technique: 'Convencional', type: 'halter_par' },
        { muscle: 'Peito', exercise: 'Supino Inclinado c/ Halteres', weight: 12, repsText: '12, 12, 12', technique: 'Convencional', type: 'halter_par' },
        { muscle: 'Peito', exercise: 'Supino Reto na Máquina', weight: 60, repsText: '8, 8, 8, 8', technique: 'Convencional', type: 'carga_total' }
    ]},
    { id: 2002, name: 'Bíceps/Costas', exercises: [
        { muscle: 'Bíceps', exercise: 'Rosca Martelo', weight: 6, repsText: '10, 10, 11', technique: 'Convencional', type: 'halter_par' },
        { muscle: 'Bíceps', exercise: 'Rosca Direta com Barra', weight: 20, repsText: '14, 11, 10', technique: 'Convencional', type: 'carga_total' },
        { muscle: 'Costas', exercise: 'Remada Curvada com Barra', weight: 30, repsText: '12, 12, 14', technique: 'Convencional', type: 'carga_total' },
        { muscle: 'Costas', exercise: 'Voador Inverso', weight: 30, repsText: '13, 12, 12', technique: 'Convencional', type: 'carga_total' },
        { muscle: 'Costas', exercise: 'Puxada Frontal na Polia', weight: 50, repsText: '15, 15, 10', technique: 'Convencional', type: 'carga_total' },
        { muscle: 'Costas', exercise: 'Remada Unilateral c/ Halter', weight: 20, repsText: '12, 10, 9', technique: 'Convencional', type: 'halter_uni' },
        { muscle: 'Costas', exercise: 'Barra Fixa (Pull-up)', weight: 80, repsText: '4, 2, 4', technique: 'Convencional', type: 'peso_corporal' }
    ]},
    { id: 2003, name: 'Pernas/Abdômen', exercises: [
        { muscle: 'Pernas', exercise: 'Leg Press 45°', weight: 90, repsText: '10, 12, 10', technique: 'Convencional', type: 'carga_total' },
        { muscle: 'Pernas', exercise: 'Agachamento Hack', weight: 40, repsText: '8, 8, 8, 8', technique: 'Convencional', type: 'carga_total' },
        { muscle: 'Pernas', exercise: 'Cadeira Extensora', weight: 40, repsText: '18, 15, 20', technique: 'Convencional', type: 'carga_total' },
        { muscle: 'Pernas', exercise: 'Mesa Flexora', weight: 30, repsText: '20, 15, 15', technique: 'Convencional', type: 'carga_total' },
        { muscle: 'Pernas', exercise: 'Abdutor', weight: 40, repsText: '12, 15, 12', technique: 'Convencional', type: 'carga_total' },
        { muscle: 'Pernas', exercise: 'Afundo Búlgaro', weight: 5, repsText: '7, 8, 7', technique: 'Convencional', type: 'par_dois_lados' },
        { muscle: 'Pernas', exercise: 'Panturrilha em Pé', weight: 70, repsText: '16, 15, 14', technique: 'Convencional', type: 'carga_total' },
        { muscle: 'Abdômen', exercise: 'Abdominal na Polia Alta', weight: 35, repsText: '15, 15, 15', technique: 'Convencional', type: 'carga_total' }
    ]},
    { id: 2004, name: 'Posterior/Acessórios', exercises: [
        { muscle: 'Glúteos', exercise: 'Elevação Pélvica (Hip Thrust)', weight: 40, repsText: '20, 20, 15', technique: 'Convencional', type: 'carga_total' },
        { muscle: 'Pernas', exercise: 'Mesa Flexora', weight: 30, repsText: '20, 15, 15', technique: 'Convencional', type: 'carga_total' },
        { muscle: 'Abdômen', exercise: 'Rotação na Polia', weight: 30, repsText: '15, 15, 15', technique: 'Convencional', type: 'halter_uni' },
        { muscle: 'Ombros', exercise: 'Encolhimento de Ombros', weight: 25, repsText: '15, 10, 10', technique: 'Convencional', type: 'halter_par' },
        { muscle: 'Antebraço', exercise: 'Extensão de Punho', weight: 6, repsText: '10, 10, 10', technique: 'Convencional', type: 'halter_par' },
        { muscle: 'Antebraço', exercise: 'Flexão de Punho', weight: 6, repsText: '10, 12, 15', technique: 'Convencional', type: 'halter_par' },
        { muscle: 'Pescoço', exercise: 'Extensão Cervical', weight: 10, repsText: '15, 10', technique: 'Convencional', type: 'carga_total' },
        { muscle: 'Ombros', exercise: 'Manguito Rotador', weight: 20, repsText: '20, 20', technique: 'Convencional', type: 'carga_total' }
    ]},
    { id: 2005, name: 'Full Body', exercises: [
        { muscle: 'Pernas', exercise: 'Panturrilha em Pé', weight: 70, repsText: '16, 15, 14', technique: 'Convencional', type: 'carga_total' },
        { muscle: 'Core', exercise: 'Prancha Isométrica', weight: 0, repsText: '60, 40, 34', technique: 'Convencional', type: 'isometria' },
        { muscle: 'Tríceps', exercise: 'Tríceps Francês na Polia', weight: 35, repsText: '11, 10, 12', technique: 'Convencional', type: 'carga_total' },
        { muscle: 'Tríceps', exercise: 'Tríceps na Polia Alta', weight: 20, repsText: '15, 15, 15', technique: 'Convencional', type: 'carga_total' },
        { muscle: 'Bíceps', exercise: 'Rosca Martelo', weight: 6, repsText: '10, 10, 11', technique: 'Convencional', type: 'halter_par' },
        { muscle: 'Bíceps', exercise: 'Rosca Direta com Barra', weight: 20, repsText: '14, 11, 10', technique: 'Convencional', type: 'carga_total' },
        { muscle: 'Peito', exercise: 'Crossover na Polia Alta', weight: 10, repsText: '15, 12, 8', technique: 'Convencional', type: 'halter_par' },
        { muscle: 'Ombros', exercise: 'Face Pull', weight: 20, repsText: '20, 20', technique: 'Convencional', type: 'carga_total' },
        { muscle: 'Ombros', exercise: 'Elevação Lateral c/ Halteres', weight: 6, repsText: '20, 20, 18', technique: 'Convencional', type: 'halter_par' },
        { muscle: 'Costas', exercise: 'Puxada Frontal na Polia', weight: 50, repsText: '15, 15, 10', technique: 'Convencional', type: 'carga_total' }
    ]}
];

// Converte as linhas da planilha em logs do app (convenção: carga registrada pura)
function seedFromPlanilha() {
    let id = 100;
    // Peso corporal confirmado pela usuária (≈94 kg agora; 93 kg no dia da barra fixa)
    userBodyweight = 94;
    weightLog = [{ date: '2026-10-10', peso: 94, obs: 'Peso atual ≈ 94 kg (conferido)' }];
    logs = PLANILHA_LOG.map(([date, sessao, exercise, weight, reps, rir, conferir, notes]) => {
        const cat = catalogInfo(exercise);
        const type = cat ? cat.tipo : inferExerciseType(exercise);
        return {
            id: id++, date, kind: 'peso',
            muscle: (cat && cat.grupo) || 'Geral',
            sessao, exercise, type, weight, reps,
            sets: null, technique: 'Convencional', nextGoal: '',
            isPR: false, rir, conferir: !!conferir, notes
        };
    });
    savedWorkouts = JSON.parse(JSON.stringify(PLANILHA_SESSOES));
}

// ============================================================
// ETAPA 5.1 — manifesto de exports (fundação para ES modules)
// Cada arquivo declara explicitamente a sua superfície pública.
// No carregamento clássico os globais continuam valendo; quando a
// migração para <script type="module"> acontecer, este bloco vira
// `export { ... }`.
// ============================================================
(function (g) {
    const exports_ = {
        PLANILHA_LOG,
    PLANILHA_SESSOES,
    seedFromPlanilha
    };
    g.__diarioExports = Object.assign(g.__diarioExports || {}, exports_);
    // Ações delegáveis (js/actions.js): toda função pública do módulo fica
    // disponível para os atributos data-action dos templates.
    const actionFns = {};
    Object.keys(exports_).forEach(k => { if (typeof exports_[k] === 'function') actionFns[k] = exports_[k]; });
    g.registerDiarioActions(actionFns);
    g.__diarioExportFiles = Object.assign(g.__diarioExportFiles || {}, { "js/planilha_data.js": Object.keys(exports_).length });
})(typeof window !== 'undefined' ? window : globalThis);
