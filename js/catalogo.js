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

// ============================================================
// FASE 1 — TAGS ACUMULATIVAS + BUSCA/FILTROS
// ------------------------------------------------------------
// Cada exercício ACUMULA várias tags (padrão de movimento, equipamento,
// objetivo, cadeia, nível e contexto). As tags são a base da tela de
// busca/filtros e do seletor rápido usado no registro diário.
// As tags são DERIVADAS por regra (nome + grupo + equipamento + tipo),
// com reforços pontuais em TAG_OVERRIDES — assim o catálogo inteiro fica
// etiquetado sem listas manuais, e exercícios digitados à mão (fora do
// catálogo) também ganham tags por inferência.
// ============================================================

const TAG_CATEGORIAS = [
    { id: 'padrao',      label: 'Padrão de movimento', icon: '🏋️' },
    { id: 'equipamento', label: 'Equipamento',         icon: '🔩' },
    { id: 'objetivo',    label: 'Objetivo / estímulo', icon: '🎯' },
    { id: 'cadeia',      label: 'Cadeia / região',     icon: '🧭' },
    { id: 'nivel',       label: 'Nível',               icon: '📶' },
    { id: 'contexto',    label: 'Contexto',            icon: '📍' }
];

// Pool de tags (25). `cat` = categoria; `desc` = tooltip na tela de filtros.
const TAG_DEFS = {
    // ---- padrão de movimento ----
    empurrar:      { label: 'Empurrar',        icon: '↗️',  cat: 'padrao',      desc: 'Empurra a carga para longe do corpo: supinos, desenvolvimentos, tríceps.' },
    puxar:         { label: 'Puxar',           icon: '↙️',  cat: 'padrao',      desc: 'Traz a carga em direção ao corpo: remadas, puxadas, roscas.' },
    agachar:       { label: 'Agachar',         icon: '⬇️',  cat: 'padrao',      desc: 'Dominante de joelho: agachamentos, leg press, afundo, hack.' },
    dobradica:     { label: 'Dobradiça',       icon: '📐', cat: 'padrao',      desc: 'Dominante de quadril: terra, stiff, elevação pélvica, flexora.' },
    composto:      { label: 'Composto',        icon: '🏋️', cat: 'padrao',      desc: 'Multiarticular — recruta várias articulações e grupos.' },
    isolado:       { label: 'Isolado',         icon: '🔬', cat: 'padrao',      desc: 'Monoarticular — foca um músculo só.' },
    unilateral:    { label: 'Unilateral',      icon: '↔️',  cat: 'padrao',      desc: 'Um lado por vez (reps por lado) — corrige assimetrias.' },
    // ---- equipamento ----
    barra:         { label: 'Barra',           icon: '🔩', cat: 'equipamento', desc: 'Barra reta ou barra W.' },
    halter:        { label: 'Halteres',        icon: '💪', cat: 'equipamento', desc: 'Halter ou par de halteres.' },
    polia:         { label: 'Polia / cabo',    icon: '🔗', cat: 'equipamento', desc: 'Cabo, polia alta ou baixa.' },
    maquina:       { label: 'Máquina',         icon: '⚙️',  cat: 'equipamento', desc: 'Máquina articulada ou guiada (inclusive esteira/bike).' },
    'peso-corporal': { label: 'Peso corporal', icon: '🤸', cat: 'equipamento', desc: 'Só o corpo (carga extra opcional).' },
    // ---- objetivo / estímulo ----
    forca:         { label: 'Força',           icon: '🦍', cat: 'objetivo',    desc: 'Faixa pesada de reps (até ~10 com mínimo baixo) — carga alta.' },
    hipertrofia:   { label: 'Hipertrofia',     icon: '📈', cat: 'objetivo',    desc: 'Faixa clássica de crescimento muscular.' },
    resistencia:   { label: 'Resistência',     icon: '🔥', cat: 'objetivo',    desc: 'Reps altas, isometria ou pump (12+).' },
    condicionamento: { label: 'Condicionamento', icon: '🏃', cat: 'objetivo',  desc: 'Cardio / capacidade aeróbica.' },
    // ---- cadeia / região ----
    core:          { label: 'Core',            icon: '🧱', cat: 'cadeia',      desc: 'Abdômen, lombar e estabilização do tronco.' },
    posterior:     { label: 'Cadeia posterior', icon: '🍑', cat: 'cadeia',     desc: 'Costas, glúteos, posteriores de coxa e panturrilha.' },
    anterior:      { label: 'Cadeia anterior',  icon: '🦵', cat: 'cadeia',     desc: 'Peito, quadríceps, abdômen e deltoide frontal.' },
    // ---- nível ----
    iniciante:     { label: 'Iniciante',       icon: '🟢', cat: 'nivel',       desc: 'Execução simples e guiada — bom para começar.' },
    intermediario: { label: 'Intermediário',   icon: '🟡', cat: 'nivel',       desc: 'Exige técnica e alguma base de treino.' },
    avancado:      { label: 'Avançado',        icon: '🔴', cat: 'nivel',       desc: 'Técnica exigente ou carga alta — atenção à execução.' },
    // ---- contexto ----
    academia:      { label: 'Academia',        icon: '🏢', cat: 'contexto',    desc: 'Precisa de estrutura de academia.' },
    casa:          { label: 'Em casa',         icon: '🏠', cat: 'contexto',    desc: 'Dá para fazer em casa (corpo, halteres ou elástico).' },
    'ar-livre':    { label: 'Ao ar livre',     icon: '🌳', cat: 'contexto',    desc: 'Rua, parque, pista — sem equipamento.' }
};

// Equipamento do catálogo → família de equipamento
const EQUIP_KIND = {
    'Barra': 'barra', 'Barra W': 'barra',
    'Halter': 'halter', 'Halteres': 'halter',
    'Polia': 'polia',
    'Máquina': 'maquina', 'Esteira': 'maquina', 'Elíptico': 'maquina', 'Remo': 'maquina',
    'Bike': 'maquina',
    'Peso corporal': 'peso-corporal', 'Roda': 'peso-corporal',
    'Livre': 'ar-livre'
};

// Família → tags de equipamento + contexto (vale p/ catálogo e p/ nome inferido)
const KIND_TAGS = {
    'barra':          ['barra', 'academia'],
    'halter':         ['halter', 'academia', 'casa'],
    'polia':          ['polia', 'academia'],
    'maquina':        ['maquina', 'academia'],
    'peso-corporal':  ['peso-corporal', 'academia', 'casa'],
    'ar-livre':       ['ar-livre']
};

// Sem equipamento informado (exercício digitado à mão) → família pelo nome.
// A ordem importa: "barra fixa" é peso corporal, não barra.
const KIND_FROM_NAME = [
    [/halter|dumbbell|serrote/, 'halter'],
    [/prancha|plank|flexao de braco|push ?up|barra fixa|pull ?up|chin ?up|paralela|dips|abdominal|crunch|elevacao de pernas|russian twist|ab wheel|rodinha|ponte|superman/, 'peso-corporal'],
    [/polia|cabo|cable|crossover|pulldown|puxada|corda|face pull/, 'polia'],
    [/maquina|machine|smith|cadeira|mesa flexora|leg press|hack|esteira|treadmill|bike|eliptico|ergometro|erg/, 'maquina'],
    [/barra|barbell|barra w/, 'barra']
];

// Padrões de nome (texto normalizado, sem acento) → tags
const P_EMPURRAR   = /supino|desenvolviment|flexao de braco|paralela|triceps|elevacao lateral|elevacao frontal|crucifixo|peck deck|crossover/;
const P_PUXAR      = /puxada|remada|barra fixa|pull ?up|pulldown|face pull|rosca|biceps|encolhimento|levantamento terra/;
const P_AGACHAR    = /agachamento|leg press|afundo|passada|bulgaro|cadeira extensora|hack/;
const P_DOBRADICA  = /terra|stiff|elevacao pelvica|hip thrust|mesa flexora|good morning/;
const P_CORE       = /prancha|abdominal|elevacao de pernas|russian twist|ab wheel|rodinha/;
const P_COMPOSTO   = /supino|desenvolviment|agachamento|leg press|hack|terra|stiff|remada|puxada|pulldown|barra fixa|pull ?up|paralela|elevacao pelvica|hip thrust|afundo|bulgaro|passada|ab wheel|levantamento|remo \(|flexao de braco/;
const P_UNI        = /unilateral|alternada|concentrada|martelo|bulgaro|afundo|passada|elevacao lateral|elevacao frontal|prancha lateral/;
const P_POSTERIOR  = /terra|stiff|flexora|elevacao pelvica|hip thrust|gluteo|panturrilha|face pull|encolhimento|good morning/;
const P_ANTERIOR   = /supino|crucifixo|peck deck|crossover|flexao de braco|agachamento|leg press|cadeira extensora|hack|afundo|bulgaro|passada|abdominal|prancha|elevacao de pernas|russian twist|ab wheel|desenvolviment|elevacao frontal/;
const P_AVANCADO   = /terra|agachamento livre|bulgaro|paralela|barra fixa|pull ?up|ab wheel|desenvolvimento militar|remada curvada|stiff|elevacao pelvica|hip thrust|hack|remo \(erg/;
const P_BASICO     = /prancha|abdominal|elevacao de pernas|russian twist|bicicleta|flexao de braco|panturrilha|encolhimento|face pull|puxada frontal|triceps polia|triceps corda|rosca na polia|crucifixo|peck deck|crossover|cadeira extensora|mesa flexora/;

// Reforços pontuais (tags extras que a regra não pega)
const TAG_OVERRIDES = {
    'Prancha Lateral':            ['unilateral', 'core'],
    'Ab Wheel':                   ['avancado', 'core'],
    'Levantamento Terra':         ['forca', 'avancado'],
    'Agachamento Livre':          ['forca'],
    'Corrida (Rua)':              ['ar-livre'],
    'Remo (Ergômetro)':           ['puxar', 'composto'],
    'Elevação Pélvica (Hip Thrust)': ['posterior', 'agachar'],
    'Flexão de Braço':            ['casa', 'anterior']
};

// Sinônimos comuns — entram no índice de busca (pt/en e apelidos)
const SINONIMOS = {
    'Supino Reto com Barra': 'bench press supino reto barra',
    'Supino Inclinado com Barra': 'incline bench press supino inclinado',
    'Supino Reto com Halteres': 'dumbbell bench press supino halteres',
    'Crucifixo na Máquina': 'fly machine voador peck',
    'Crossover na Polia': 'cable fly crossover cabo',
    'Flexão de Braço': 'push up flexao de braco apoio',
    'Paralelas (foco peito)': 'dips paralela mergulho',
    'Paralelas (foco tríceps)': 'dips paralela mergulho',
    'Barra Fixa (Pull-up)': 'pull up chin up barra fixa',
    'Puxada Frontal na Polia': 'lat pulldown puxada frente',
    'Remada Curvada com Barra': 'bent over row remada curvada',
    'Remada Unilateral c/ Halter': 'serrote one arm row remada serrote',
    'Levantamento Terra': 'deadlift terra dl',
    'Agachamento Livre': 'squat agachamento costas',
    'Agachamento Hack': 'hack squat hack maquina',
    'Leg Press 45°': 'leg press prensa 45',
    'Cadeira Extensora': 'leg extension extensora quadriceps',
    'Mesa Flexora': 'leg curl flexora posterior',
    'Stiff com Barra': 'romanian deadlift stiff rdl',
    'Afundo c/ Halteres': 'lunge afundo passada',
    'Agachamento Búlgaro': 'bulgarian split squat bulgaro',
    'Elevação Pélvica (Hip Thrust)': 'hip thrust elevacao pelvica gluteo ponte',
    'Panturrilha em Pé': 'calf raise panturrilha pe',
    'Desenvolvimento Militar': 'overhead press militar ombros press',
    'Desenvolvimento c/ Halteres': 'dumbbell press desenvolvimento halteres',
    'Elevação Lateral c/ Halter': 'lateral raise elevacao lateral ombro',
    'Face Pull': 'face pull rear delt deltoide posterior',
    'Encolhimento de Ombros': 'shrug encolhimento trapezio',
    'Rosca Direta com Barra': 'barbell curl rosca direta biceps',
    'Rosca Martelo': 'hammer curl martelo',
    'Rosca Scott': 'preacher curl scott',
    'Tríceps Polia Alta': 'triceps pushdown polia corda',
    'Tríceps Testa com Barra W': 'skull crusher testa frances',
    'Tríceps Francês c/ Halter': 'overhead extension frances',
    'Prancha Isométrica': 'plank prancha isometria',
    'Abdominal Supra no Solo': 'crunch abdominal supra solo',
    'Abdominal na Polia Alta': 'cable crunch abdominal polia',
    'Ab Wheel': 'ab wheel rodinha abdominal',
    'Corrida (Esteira)': 'running corrida esteira treadmill',
    'Bike / Ergométrico': 'bike cycling ergometrica pedal',
    'Remo (Ergômetro)': 'rowing remo ergometro'
};

// Texto sem acento/caixa — usado em TODA a busca (tolera "supino inclinado halter")
function normalizeText(s) {
    return String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

// Índice normalizado (sem acento nem caixa) → entrada do catálogo
const CATALOG_BY_SEARCH = {};
EXERCISE_CATALOG_FULL.forEach(e => { CATALOG_BY_SEARCH[normalizeText(e.nome)] = e; });

const TAG_IDS = Object.keys(TAG_DEFS);
const TAG_BY_CATEGORY = TAG_CATEGORIAS.map(c => ({
    ...c, tags: TAG_IDS.filter(id => TAG_DEFS[id].cat === c.id).map(id => ({ id, ...TAG_DEFS[id] }))
}));

// Deriva as tags acumulativas de um exercício (do catálogo ou digitado à mão)
function deriveTags(entry) {
    const e = entry || {};
    const n = normalizeText(e.nome || e.exercise || '');
    const tags = new Set();
    const tipo = e.tipo || inferExerciseType(e.nome || e.exercise, e.grupo);
    const ref = CATALOG_BY_SEARCH[n] || null;
    const grupo = e.grupo || (ref ? ref.grupo : '');
    const equip = e.equipamento || (ref ? ref.equipamento : '');

    // equipamento + contexto (família vem do catálogo ou é inferida pelo nome)
    let kind = EQUIP_KIND[equip] || '';
    if (!kind) {
        const hit = KIND_FROM_NAME.find(([re]) => re.test(n));
        if (hit) kind = hit[1];
    }
    if (tipo === 'peso_corporal') kind = kind || 'peso-corporal';
    (KIND_TAGS[kind] || []).forEach(t => tags.add(t));
    if (kind === 'peso-corporal') { tags.add('casa'); tags.add('academia'); }

    // padrão de movimento
    if (tipo === 'corrida') {
        tags.add('condicionamento'); tags.add('resistencia');
    } else {
        if (P_CORE.test(n) || grupo === 'Abdômen') tags.add('core');
        if (tipo === 'halter_uni' || P_UNI.test(n)) tags.add('unilateral');
        if (tipo !== 'isometria') {           // isometria = tempo sob tensão, sem padrão articular
            if (P_EMPURRAR.test(n)) tags.add('empurrar');
            if (P_PUXAR.test(n)) tags.add('puxar');
            if (P_AGACHAR.test(n)) tags.add('agachar');
            if (P_DOBRADICA.test(n)) tags.add('dobradica');
            if (P_COMPOSTO.test(n)) tags.add('composto'); else tags.add('isolado');
        }
    }

    // cadeia / região
    if (grupo === 'Costas' || P_POSTERIOR.test(n)) tags.add('posterior');
    if (grupo === 'Peito' || P_ANTERIOR.test(n)) tags.add('anterior');

    // objetivo / estímulo (pela faixa de reps do catálogo)
    if (tipo !== 'corrida') {
        const faixa = e.faixa || (ref ? ref.faixa : null) || [0, 0];
        const min = Number(faixa[0]) || 0, max = Number(faixa[1]) || 0;
        if (max > 0 && max <= 10 && min <= 6) tags.add('forca');   // faixa pesada (6–10 ou menos)
        if (min >= 12 || tipo === 'isometria') tags.add('resistencia');
        if (tipo !== 'isometria') tags.add('hipertrofia');
    }

    // nível
    if (P_AVANCADO.test(n)) tags.add('avancado');
    else if (P_BASICO.test(n) || kind === 'maquina' || kind === 'polia') tags.add('iniciante');
    else tags.add('intermediario');

    // reforços manuais
    (TAG_OVERRIDES[e.nome || e.exercise] || []).forEach(t => tags.add(t));

    return TAG_IDS.filter(id => tags.has(id)); // ordem estável = ordem do pool
}

// Anexa tags + índice de busca a cada entrada do catálogo (uma vez, no load)
EXERCISE_CATALOG_FULL.forEach(e => {
    e.tags = deriveTags(e);
    e.busca = normalizeText([
        e.nome, e.grupo, e.equipamento,
        (CATALOG_TIPOS[e.tipo] || {}).label || '',
        SINONIMOS[e.nome] || '',
        e.tags.map(t => `${t} ${TAG_DEFS[t] ? TAG_DEFS[t].label : ''}`).join(' ')
    ].join(' '));
});

// Tags de qualquer exercício (inclusive fora do catálogo — inferidas pelo nome)
function exerciseTags(name) {
    const cat = catalogInfo(name);
    if (cat && cat.tags && cat.tags.length) return cat.tags;
    return deriveTags({ nome: name, tipo: inferExerciseType(name), grupo: '', equipamento: '' });
}

// Facetas (contagem) para a tela de filtros — mostra quantos exercícios sobram por tag
function catalogFacets(list) {
    const src = Array.isArray(list) ? list : EXERCISE_CATALOG_FULL;
    const f = { tags: {}, grupo: {}, equipamento: {}, tipo: {} };
    src.forEach(e => {
        (e.tags || []).forEach(t => { f.tags[t] = (f.tags[t] || 0) + 1; });
        if (e.grupo) f.grupo[e.grupo] = (f.grupo[e.grupo] || 0) + 1;
        if (e.equipamento) f.equipamento[e.equipamento] = (f.equipamento[e.equipamento] || 0) + 1;
        if (e.tipo) f.tipo[e.tipo] = (f.tipo[e.tipo] || 0) + 1;
    });
    return f;
}

// Busca/filtro do catálogo — 1 função pura usada pela tela, pelo seletor e pelos testes
function searchCatalog(opts = {}) {
    const tokens = normalizeText(opts.q || '').split(' ').filter(Boolean);
    const tags = (opts.tags || []).filter(t => TAG_DEFS[t]);
    const tagMode = opts.tagMode === 'all' ? 'all' : 'any';
    const grupo = opts.grupo || '';
    const equipamento = opts.equipamento || '';
    const tipo = opts.tipo || '';
    const usage = opts.usage || {};        // { nomeExercicio: vezes registradas }
    const lastUsed = opts.lastUsed || {};  // { nomeExercicio: 'AAAA-MM-DD' }
    const onlyUsed = !!opts.onlyUsed;
    const onlyNew = !!opts.onlyNew;

    const list = EXERCISE_CATALOG_FULL.filter(e => {
        if (grupo && grupo !== 'Todos' && e.grupo !== grupo) return false;
        if (equipamento && e.equipamento !== equipamento) return false;
        if (tipo && e.tipo !== tipo) return false;
        if (tags.length) {
            const hits = tags.filter(t => (e.tags || []).includes(t)).length;
            if (tagMode === 'all' ? hits < tags.length : hits === 0) return false;
        }
        if (tokens.length && !tokens.every(t => (e.busca || '').includes(t))) return false;
        const uses = usage[e.nome] || 0;
        if (onlyUsed && uses === 0) return false;
        if (onlyNew && uses > 0) return false;
        return true;
    });

    const ordemGrupo = m => ((MUSCLE_META[m] || {}).ordem || 99);
    const sort = opts.sort || 'uso';
    list.sort((a, b) => {
        if (sort === 'nome') return a.nome.localeCompare(b.nome, 'pt-BR');
        if (sort === 'grupo') return ordemGrupo(a.grupo) - ordemGrupo(b.grupo) || a.nome.localeCompare(b.nome, 'pt-BR');
        if (sort === 'recentes') return String(lastUsed[b.nome] || '').localeCompare(String(lastUsed[a.nome] || '')) || a.nome.localeCompare(b.nome, 'pt-BR');
        // 'uso': o que você mais faz primeiro; nunca usados vão por nome
        return (usage[b.nome] || 0) - (usage[a.nome] || 0) || a.nome.localeCompare(b.nome, 'pt-BR');
    });

    const limit = Number(opts.limit) || 0;
    return limit > 0 ? list.slice(0, limit) : list;
}

// Um exercício bate com um conjunto de tags? (usado no histórico)
function matchesTags(itemTags, wanted, tagMode = 'any') {
    if (!wanted || wanted.length === 0) return true;
    const hits = wanted.filter(t => (itemTags || []).includes(t)).length;
    return tagMode === 'all' ? hits === wanted.length : hits > 0;
}

function matchesQuery(text, q) {
    const tokens = normalizeText(q || '').split(' ').filter(Boolean);
    if (!tokens.length) return true;
    const hay = normalizeText(text);
    return tokens.every(t => hay.includes(t));
}

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
    const raw = String(exerciseName || '');
    return CATALOG_BY_NAME[raw.toLowerCase()]
        || (typeof CATALOG_BY_SEARCH !== 'undefined' ? CATALOG_BY_SEARCH[normalizeText(raw)] : null)
        || null;
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
