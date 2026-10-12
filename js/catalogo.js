/* ============================================================
   CATÁLOGO DE EXERCÍCIOS — fonte do volume, XP e dano
   ------------------------------------------------------------
   tipo (define COMO o volume é calculado):
     - 'carga_total'        → carga informada É o total movido (barra, máquina,
                              polia, halter com as duas mãos). Volume = carga × reps
     - 'halter_par'         → carga informada é POR HALTERE (par). Volume = carga × 2 × reps
     - 'halter_uni'         → 1 haltere por lado; reps são POR LADO. Volume = carga × reps × 2
     - 'peso_corporal'      → carga informada = peso EXTRA (0 se livre).
                              Volume = (peso corporal + extra) × reps
     - 'isometria'          → reps armazenam SEGUNDOS. Não conta tonelagem;
                              conta tempo sob tensão (TST) e rende XP por tempo
   unilateral: true → reps por lado (dobram) mesmo em cabo/máquina
   faixa: [min, max] de reps usada na dupla progressão
   ============================================================ */

const CATALOG_TIPOS = {
    carga_total:        { label: 'Carga total (kg)',            hint: 'Digite a carga TOTAL movida (ex: barra, máquina, polia).' },
    halter_par:         { label: 'Carga por haltere (kg)',      hint: 'Digite a carga de CADA haltere — o app dobra automaticamente.' },
    halter_uni:         { label: 'Carga do haltere (kg)',       hint: 'Reps são POR LADO — o app conta os 2 lados no volume.' },
    peso_corporal:      { label: 'Carga extra (kg)',            hint: 'Sem carga extra = 0. Volume usa o seu peso corporal + extra.' },
    isometria:          { label: 'Tempo (segundos)',            hint: 'Registre o tempo em segundos (ex: prancha 60 s). Não vira tonelagem.' }
};

const EXERCISE_CATALOG_FULL = [
    // ============================== PEITO ==============================
    { nome: 'Supino Reto com Barra',          grupo: 'Peito',   equipamento: 'Barra',        tipo: 'carga_total',   faixa: [6, 10],  descanso: 120 },
    { nome: 'Supino Inclinado com Barra',     grupo: 'Peito',   equipamento: 'Barra',        tipo: 'carga_total',   faixa: [6, 10],  descanso: 120 },
    { nome: 'Supino Reto com Halteres',       grupo: 'Peito',   equipamento: 'Halteres',     tipo: 'halter_par',    faixa: [8, 12],  descanso: 90 },
    { nome: 'Supino Inclinado c/ Halteres',   grupo: 'Peito',   equipamento: 'Halteres',     tipo: 'halter_par',    faixa: [8, 12],  descanso: 90 },
    { nome: 'Crucifixo na Máquina',           grupo: 'Peito',   equipamento: 'Máquina',      tipo: 'carga_total',   faixa: [10, 15], descanso: 60 },
    { nome: 'Crossover na Polia',             grupo: 'Peito',   equipamento: 'Polia',        tipo: 'carga_total',   faixa: [10, 15], descanso: 60 },
    { nome: 'Peck Deck',                      grupo: 'Peito',   equipamento: 'Máquina',      tipo: 'carga_total',   faixa: [10, 15], descanso: 60 },
    { nome: 'Flexão de Braço',                grupo: 'Peito',   equipamento: 'Peso corporal',tipo: 'peso_corporal', faixa: [8, 20],  descanso: 60 },
    { nome: 'Paralelas (foco peito)',         grupo: 'Peito',   equipamento: 'Peso corporal',tipo: 'peso_corporal', faixa: [6, 15],  descanso: 90 },

    // ============================== COSTAS =============================
    { nome: 'Barra Fixa (Pull-up)',           grupo: 'Costas',  equipamento: 'Peso corporal',tipo: 'peso_corporal', faixa: [5, 12],  descanso: 120 },
    { nome: 'Puxada Frontal na Polia',        grupo: 'Costas',  equipamento: 'Polia',        tipo: 'carga_total',   faixa: [8, 12],  descanso: 90 },
    { nome: 'Remada Curvada com Barra',       grupo: 'Costas',  equipamento: 'Barra',        tipo: 'carga_total',   faixa: [6, 10],  descanso: 120 },
    { nome: 'Remada Unilateral c/ Halter',    grupo: 'Costas',  equipamento: 'Halter',       tipo: 'halter_uni',    faixa: [8, 12],  descanso: 90 },
    { nome: 'Remada Baixa na Polia',          grupo: 'Costas',  equipamento: 'Polia',        tipo: 'carga_total',   faixa: [8, 12],  descanso: 90 },
    { nome: 'Levantamento Terra',             grupo: 'Costas',  equipamento: 'Barra',        tipo: 'carga_total',   faixa: [3, 8],   descanso: 150 },
    { nome: 'Pulldown na Polia',              grupo: 'Costas',  equipamento: 'Polia',        tipo: 'carga_total',   faixa: [8, 12],  descanso: 90 },
    { nome: 'Remada Cavalinho',               grupo: 'Costas',  equipamento: 'Máquina',      tipo: 'carga_total',   faixa: [8, 12],  descanso: 90 },

    // ============================== PERNAS =============================
    { nome: 'Agachamento Livre',              grupo: 'Pernas',  equipamento: 'Barra',        tipo: 'carga_total',   faixa: [5, 10],  descanso: 150 },
    { nome: 'Agachamento Hack',               grupo: 'Pernas',  equipamento: 'Máquina',      tipo: 'carga_total',   faixa: [8, 12],  descanso: 120 },
    { nome: 'Leg Press 45°',                  grupo: 'Pernas',  equipamento: 'Máquina',      tipo: 'carga_total',   faixa: [8, 15],  descanso: 120 },
    { nome: 'Cadeira Extensora',              grupo: 'Pernas',  equipamento: 'Máquina',      tipo: 'carga_total',   faixa: [10, 15], descanso: 60 },
    { nome: 'Mesa Flexora',                   grupo: 'Pernas',  equipamento: 'Máquina',      tipo: 'carga_total',   faixa: [10, 15], descanso: 60 },
    { nome: 'Stiff com Barra',                grupo: 'Pernas',  equipamento: 'Barra',        tipo: 'carga_total',   faixa: [6, 10],  descanso: 120 },
    { nome: 'Afundo c/ Halteres',             grupo: 'Pernas',  equipamento: 'Halteres',     tipo: 'halter_uni',    faixa: [8, 12],  descanso: 90 },
    { nome: 'Agachamento Búlgaro',            grupo: 'Pernas',  equipamento: 'Halter',       tipo: 'halter_uni',    faixa: [8, 12],  descanso: 90 },
    { nome: 'Elevação Pélvica (Hip Thrust)',  grupo: 'Pernas',  equipamento: 'Barra',        tipo: 'carga_total',   faixa: [8, 12],  descanso: 90 },
    { nome: 'Panturrilha em Pé',              grupo: 'Pernas',  equipamento: 'Máquina',      tipo: 'carga_total',   faixa: [12, 20], descanso: 60 },
    { nome: 'Panturrilha Sentado',            grupo: 'Pernas',  equipamento: 'Máquina',      tipo: 'carga_total',   faixa: [12, 20], descanso: 60 },

    // ============================== OMBROS =============================
    { nome: 'Desenvolvimento Militar',        grupo: 'Ombros',  equipamento: 'Barra',        tipo: 'carga_total',   faixa: [6, 10],  descanso: 120 },
    { nome: 'Desenvolvimento c/ Halteres',    grupo: 'Ombros',  equipamento: 'Halteres',     tipo: 'halter_par',    faixa: [8, 12],  descanso: 90 },
    { nome: 'Elevação Lateral c/ Halter',     grupo: 'Ombros',  equipamento: 'Halter',       tipo: 'halter_uni',    faixa: [12, 20], descanso: 60 },
    { nome: 'Elevação Frontal c/ Halter',     grupo: 'Ombros',  equipamento: 'Halter',       tipo: 'halter_uni',    faixa: [10, 15], descanso: 60 },
    { nome: 'Remada Alta na Polia',           grupo: 'Ombros',  equipamento: 'Polia',        tipo: 'carga_total',   faixa: [8, 12],  descanso: 90 },
    { nome: 'Face Pull',                      grupo: 'Ombros',  equipamento: 'Polia',        tipo: 'carga_total',   faixa: [12, 20], descanso: 60 },
    { nome: 'Encolhimento de Ombros',         grupo: 'Ombros',  equipamento: 'Halteres',     tipo: 'halter_par',    faixa: [10, 15], descanso: 60 },

    // ============================== BÍCEPS =============================
    { nome: 'Rosca Direta com Barra',         grupo: 'Bíceps',  equipamento: 'Barra',        tipo: 'carga_total',   faixa: [8, 12],  descanso: 60 },
    { nome: 'Rosca Alternada c/ Halteres',    grupo: 'Bíceps',  equipamento: 'Halteres',     tipo: 'halter_uni',    faixa: [8, 12],  descanso: 60 },
    { nome: 'Rosca Martelo',                  grupo: 'Bíceps',  equipamento: 'Halteres',     tipo: 'halter_uni',    faixa: [8, 12],  descanso: 60 },
    { nome: 'Rosca Scott',                    grupo: 'Bíceps',  equipamento: 'Barra W',      tipo: 'carga_total',   faixa: [8, 12],  descanso: 60 },
    { nome: 'Rosca na Polia Baixa',           grupo: 'Bíceps',  equipamento: 'Polia',        tipo: 'carga_total',   faixa: [10, 15], descanso: 60 },
    { nome: 'Rosca Concentrada',              grupo: 'Bíceps',  equipamento: 'Halter',       tipo: 'halter_uni',    faixa: [10, 15], descanso: 60 },

    // ============================== TRÍCEPS ============================
    { nome: 'Tríceps Polia Alta',             grupo: 'Tríceps', equipamento: 'Polia',        tipo: 'carga_total',   faixa: [10, 15], descanso: 60 },
    { nome: 'Tríceps Testa com Barra W',      grupo: 'Tríceps', equipamento: 'Barra W',      tipo: 'carga_total',   faixa: [8, 12],  descanso: 60 },
    { nome: 'Tríceps Corda na Polia',         grupo: 'Tríceps', equipamento: 'Polia',        tipo: 'carga_total',   faixa: [10, 15], descanso: 60 },
    { nome: 'Tríceps Francês c/ Halter',      grupo: 'Tríceps', equipamento: 'Halter',       tipo: 'carga_total',   faixa: [8, 12],  descanso: 60 },
    { nome: 'Paralelas (foco tríceps)',       grupo: 'Tríceps', equipamento: 'Peso corporal',tipo: 'peso_corporal', faixa: [6, 15],  descanso: 90 },
    { nome: 'Supino Reto Pegada Fechada',     grupo: 'Tríceps', equipamento: 'Barra',        tipo: 'carga_total',   faixa: [6, 10],  descanso: 90 },

    // ============================== ABDÔMEN ============================
    { nome: 'Prancha Isométrica',             grupo: 'Abdômen', equipamento: 'Peso corporal',tipo: 'isometria',     faixa: [20, 90], descanso: 45 },
    { nome: 'Prancha Lateral',                grupo: 'Abdômen', equipamento: 'Peso corporal',tipo: 'isometria',     faixa: [15, 60], descanso: 45 },
    { nome: 'Abdominal Supra no Solo',        grupo: 'Abdômen', equipamento: 'Peso corporal',tipo: 'peso_corporal', faixa: [15, 30], descanso: 45 },
    { nome: 'Abdominal na Polia Alta',        grupo: 'Abdômen', equipamento: 'Polia',        tipo: 'carga_total',   faixa: [12, 20], descanso: 45 },
    { nome: 'Elevação de Pernas',             grupo: 'Abdômen', equipamento: 'Peso corporal',tipo: 'peso_corporal', faixa: [10, 20], descanso: 45 },
    { nome: 'Abdominal Bicicleta',            grupo: 'Abdômen', equipamento: 'Peso corporal',tipo: 'peso_corporal', faixa: [15, 30], descanso: 45 },
    { nome: 'Russian Twist',                  grupo: 'Abdômen', equipamento: 'Peso corporal',tipo: 'peso_corporal', faixa: [15, 30], descanso: 45 },
    { nome: 'Ab Wheel',                       grupo: 'Abdômen', equipamento: 'Roda',         tipo: 'peso_corporal', faixa: [8, 15],  descanso: 60 },

    // ============================== CARDIO =============================
    { nome: 'Corrida (Esteira)',              grupo: 'Cardio',  equipamento: 'Esteira',      tipo: 'corrida',       faixa: [0, 0],   descanso: 0 },
    { nome: 'Corrida (Rua)',                  grupo: 'Cardio',  equipamento: 'Livre',        tipo: 'corrida',       faixa: [0, 0],   descanso: 0 },
    { nome: 'Bike / Ergométrico',             grupo: 'Cardio',  equipamento: 'Bike',         tipo: 'corrida',       faixa: [0, 0],   descanso: 0 },
    { nome: 'Elíptico',                       grupo: 'Cardio',  equipamento: 'Elíptico',     tipo: 'corrida',       faixa: [0, 0],   descanso: 0 },
    { nome: 'Remo (Ergômetro)',               grupo: 'Cardio',  equipamento: 'Remo',         tipo: 'corrida',       faixa: [0, 0],   descanso: 0 }
];

// Índice nome(minúsculo) → entrada do catálogo
const CATALOG_BY_NAME = {};
EXERCISE_CATALOG_FULL.forEach(e => { CATALOG_BY_NAME[e.nome.toLowerCase()] = e; });

// Sugestões por grupo (compatibilidade com o fluxo antigo do builder)
const EXERCISE_CATALOG = (() => {
    const m = {};
    EXERCISE_CATALOG_FULL.forEach(e => { (m[e.grupo] = m[e.grupo] || []).push(e.nome); });
    m['Geral'] = [];
    return m;
})();

// ---------- Recuperação muscular (mapa de fadiga) ----------
// recoveryH = horas até 100% com volume moderado; +2h por série acima de 8 na sessão
const MUSCLE_META = {
    'Peito':   { recoveryH: 48, xpWeight: 1.0, ordem: 1 },
    'Costas':  { recoveryH: 48, xpWeight: 1.0, ordem: 2 },
    'Pernas':  { recoveryH: 72, xpWeight: 0.5, ordem: 3 },
    'Ombros':  { recoveryH: 36, xpWeight: 1.0, ordem: 4 },
    'Bíceps':  { recoveryH: 36, xpWeight: 1.0, ordem: 5 },
    'Tríceps': { recoveryH: 36, xpWeight: 1.0, ordem: 6 },
    'Abdômen': { recoveryH: 24, xpWeight: 1.0, ordem: 7 },
    'Geral':   { recoveryH: 24, xpWeight: 1.0, ordem: 8 },
    'Cardio':  { recoveryH: 12, xpWeight: 1.0, ordem: 9 }
};
const MUSCULOS_MAPA = ['Peito', 'Costas', 'Pernas', 'Ombros', 'Bíceps', 'Tríceps', 'Abdômen'];

// MUSCLE_WEIGHT legado (XP): pernas contam metade
const MUSCLE_WEIGHT = { 'Pernas': 0.5 };

// ---------- Séries semanais por grupo (faixa-alvo) ----------
const FAIXA_SERIES_SEMANAIS = { min: 10, max: 20 }; // alvo padrão de séries semanais por grupo

// ---------- Anilhas ----------
const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
const DEFAULT_BAR_WEIGHT = 20;   // kg da barra olímpica
const DEFAULT_SLED_WEIGHT = 40;  // kg do carrinho do leg press

// ---------- Inferência de tipo para registros antigos ----------
function inferExerciseType(exerciseName, muscle) {
    const n = String(exerciseName || '').toLowerCase();
    const cat = CATALOG_BY_NAME[n];
    if (cat) return cat.tipo;
    if (/prancha|isometri|hold|suspens/.test(n)) return 'isometria';
    if (/barra fixa|pull-?up|chin-?up|flexão|paralela|abdominal|elevação de pernas|ab wheel|dips?/.test(n)) return 'peso_corporal';
    if (/unilateral|concentrada|martelo|alternada|búlgaro|afundo|passada|lateral c\/ halter|remada unilateral/.test(n)) return 'halter_uni';
    if (/halter/.test(n)) return 'halter_par';
    return 'carga_total';
}

function catalogInfo(exerciseName) {
    return CATALOG_BY_NAME[String(exerciseName || '').toLowerCase()] || null;
}

// ============================================================
// ENGINES DE VOLUME — 1 fonte da verdade para XP/dano/tonelagem
// ============================================================

// Carga efetiva (kg) de UMA série/repetição, respeitando o tipo do exercício
function effectiveLoadKg(type, weight, bodyweight) {
    const w = Number(weight) || 0;
    const bw = Number(bodyweight) || 0;
    switch (type) {
        case 'halter_par':       return w * 2;          // 2 halteres
        case 'peso_corporal':    return bw + w;         // PC + carga extra
        case 'isometria':        return 0;              // tempo, não tonelagem
        case 'carga_total':
        case 'halter_uni':
        default:                 return w;
    }
}

// Reps efetivas (dobram em trabalho unilateral por lado)
function effectiveReps(repsArr, perSide) {
    const r = (Array.isArray(repsArr) ? repsArr : []).reduce((a, b) => a + (Number(b) || 0), 0);
    return perSide ? r * 2 : r;
}

// Volume total do registro em KG (0 para corrida/isometria)
function logVolumeKg(log, bodyweight) {
    if (!log || log.kind === 'corrida' || log.type === 'isometria') return 0;
    const perSide = !!log.perSide || log.type === 'halter_uni';
    if (Array.isArray(log.sets) && log.sets.length > 0) {
        return log.sets.reduce((acc, s) => {
            const load = effectiveLoadKg(log.type, s.weight, bodyweight);
            return acc + load * ((Number(s.reps) || 0) * (perSide ? 2 : 1));
        }, 0);
    }
    return effectiveLoadKg(log.type, log.weight, bodyweight) * effectiveReps(log.reps, perSide);
}

// Tempo sob tensão (s) para exercícios de isometria
function logTstSeconds(log) {
    if (!log || log.type !== 'isometria') return 0;
    if (Array.isArray(log.sets) && log.sets.length > 0) return log.sets.reduce((a, s) => a + (Number(s.reps) || 0), 0);
    return (Array.isArray(log.reps) ? log.reps : []).reduce((a, b) => a + (Number(b) || 0), 0);
}

// 1RM estimado (Epley) considerando a MELHOR série do registro
function logEst1RM(log) {
    if (!log || log.kind === 'corrida' || log.type === 'isometria') return 0;
    const perSide = !!log.perSide || log.type === 'halter_uni';
    let best = 0;
    const series = (Array.isArray(log.sets) && log.sets.length > 0)
        ? log.sets.map(s => ({ w: Number(s.weight) || 0, r: Number(s.reps) || 0 }))
        : (Array.isArray(log.reps) ? log.reps : []).map(r => ({ w: Number(log.weight) || 0, r: Number(r) || 0 }));
    series.forEach(s => {
        if (s.r <= 0) return;
        const repsTotal = perSide ? s.r : s.r; // 1RM usa reps por lado mesmo em unilateral
        const est = s.w * (1 + Math.min(repsTotal, 12) / 30);
        if (est > best) best = est;
    });
    return Math.round(best * 10) / 10;
}

// Texto de carga respeitando o tipo do exercício (para "última vez" etc.)
function formatLoadText(log) {
    if (!log) return '—';
    if (log.kind === 'corrida') return `${String(log.distanceKm ?? 0).replace('.', ',')} km`;
    switch (log.type) {
        case 'halter_par':    return `${log.weight} kg/halter`;
        case 'halter_uni':    return `${log.weight} kg · por lado`;
        case 'peso_corporal': return `PC${log.weight > 0 ? ' + ' + log.weight + ' kg' : ''}`;
        case 'isometria':     return `${logTstSeconds(log)} s`;
        default:              return `${log.weight} kg`;
    }
}

function formatRepsText(log) {
    if (!log) return '—';
    if (log.kind === 'corrida') return `${String(log.distanceKm ?? 0).replace('.', ',')} km em ${log.durationMin ?? 0} min`;
    if (log.type === 'isometria') return `${logTstSeconds(log)} s`;
    const arr = (Array.isArray(log.sets) && log.sets.length)
        ? log.sets.map(s => s.reps)
        : (log.reps || []);
    return `(${arr.join(', ')})${(log.perSide || log.type === 'halter_uni') ? ' /lado' : ''}`;
}

// ---------- Dupla progressão ----------
// Sugere subir a carga quando TODAS as séries batem o topo da faixa do catálogo
function duplaProgressao(log) {
    const cat = catalogInfo(log.exercise);
    if (!cat || !cat.faixa || log.type === 'isometria' || log.kind === 'corrida') return null;
    const topo = cat.faixa[1];
    const repsArr = (Array.isArray(log.sets) && log.sets.length)
        ? log.sets.map(s => Number(s.reps) || 0)
        : (Array.isArray(log.reps) ? log.reps.map(Number) : []);
    if (repsArr.length === 0 || repsArr.some(r => !(r >= topo))) return null;
    const inc = (log.type === 'carga_total') ? 2.5 : 2; // passo de progressão em kg
    return { proximaCarga: (Number(log.weight) || 0) + inc, incremento: inc, faixa: cat.faixa };
}

// ---------- PR automático por 1RM estimado ----------
function detectAutoPR(newLog, allLogs, bodyweight) {
    if (!newLog || newLog.kind === 'corrida') {
        // Corrida: PR de distância (ou de pace em 5 km)
        if (newLog && newLog.kind === 'corrida') {
            const dist = Number(newLog.distanceKm) || 0;
            const anteriores = allLogs.filter(l => l.kind === 'corrida' && l.id !== newLog.id && (Number(l.distanceKm) || 0) > 0);
            const bestDist = anteriores.reduce((a, l) => Math.max(a, Number(l.distanceKm) || 0), 0);
            return dist > 0 && dist > bestDist;
        }
        return false;
    }
    if (newLog.type === 'isometria') {
        const tst = logTstSeconds(newLog);
        const anteriores = allLogs.filter(l => l.type === 'isometria' && l.exercise === newLog.exercise && l.id !== newLog.id);
        const best = anteriores.reduce((a, l) => Math.max(a, logTstSeconds(l)), 0);
        return tst > 0 && tst > best;
    }
    const est = logEst1RM(newLog);
    if (est <= 0) return false;
    const anteriores = allLogs.filter(l => l.kind === 'peso' && l.exercise === newLog.exercise && l.id !== newLog.id && l.type !== 'isometria');
    const best = anteriores.reduce((a, l) => Math.max(a, logEst1RM(l)), 0);
    return est > best + 0.4;
}

// ---------- Recuperação muscular ----------
function recoveryState(muscle, muscleLogs, nowMs) {
    const meta = MUSCLE_META[muscle] || MUSCLE_META['Geral'];
    if (!muscleLogs || muscleLogs.length === 0) {
        return { label: 'SEM REGISTRO', icon: '✨', pct: null,
            badge: 'bg-berzerker-border text-gray-400 border-gray-700', bar: 'bg-gray-600',
            border: 'border-berzerker-border', info: 'Nunca treinado', last: '—', hoursNeed: meta.recoveryH };
    }
    const ordered = [...muscleLogs].sort((a, b) => (b.date < a.date ? -1 : b.date > a.date ? 1 : (b.id - a.id)));
    const last = ordered[0];
    // séries da sessão mais recente desse grupo (volume bruto do dia, nesse grupo)
    const sameDay = muscleLogs.filter(l => l.date === last.date);
    const totalSets = sameDay.reduce((a, l) => a + ((l.sets && l.sets.length) || (l.reps && l.reps.length) || 0), 0);
    const hoursNeed = meta.recoveryH + Math.max(0, totalSets - 8) * 2; // volume alto atrasa a recuperação
    const lastMs = new Date(last.date + 'T12:00:00').getTime();
    const hoursSince = Math.max(0, (nowMs - lastMs) / 36e5);
    const pct = Math.max(2, Math.min(100, Math.round(hoursSince / hoursNeed * 100)));

    let st;
    if (pct < 33) {
        st = { label: 'EXAUSTO', icon: '🔥', badge: 'bg-red-950 text-red-400 border-red-800', bar: 'bg-red-500',
            border: 'border-red-600/60 shadow-lg shadow-red-950/40' };
    } else if (pct < 100) {
        st = { label: 'RECUPERANDO', icon: '⏳', badge: 'bg-amber-950 text-amber-400 border-amber-800', bar: 'bg-amber-500',
            border: 'border-amber-500/60 shadow-lg shadow-amber-950/40' };
    } else {
        st = { label: '100% PRONTO', icon: '✅', badge: 'bg-emerald-950 text-emerald-400 border-emerald-800', bar: 'bg-emerald-500',
            border: 'border-emerald-500/60 shadow-lg shadow-emerald-950/40' };
    }
    const dias = Math.floor(hoursSince / 24);
    st.pct = pct;
    st.info = pct >= 100 ? (dias > 0 ? `Descansado há ${dias}d` : 'Recuperado') : `${Math.round(hoursNeed - hoursSince)}h p/ 100%`;
    st.last = last.exercise;
    st.hoursNeed = hoursNeed;
    return st;
}

// ---------- Calculadora de anilhas ----------
function formatPlates(totalWeight, baseWeight, plates) {
    const base = Number(baseWeight) || 0;
    const total = Number(totalWeight) || 0;
    const perSide = (total - base) / 2;
    if (perSide < 0) return `⚠️ Carga menor que o peso da barra/carrinho (${base} kg)`;
    if (perSide === 0) return `Só a barra/carrinho (${base} kg)`;
    const list = plates || PLATES;
    let rest = Math.round(perSide * 100) / 100;
    const used = [];
    for (const p of list) {
        while (rest >= p - 0.001) { used.push(p); rest = Math.round((rest - p) * 100) / 100; }
    }
    if (rest > 0.001) used.push(`${rest} kg impossíveis de montar`);
    const lado = used.filter(x => typeof x === 'number').join(' + ');
    return `${base} kg (barra/carrinho) + ${lado || '0'} por lado`;
}
