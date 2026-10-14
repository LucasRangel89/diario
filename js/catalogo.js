/* ============================================================
   CATÁLOGO DE EXERCÍCIOS — fonte do volume, XP e dano
   ------------------------------------------------------------
   CONVENÇÃO DA PLANILHA (nunca muda):
     Carga registrada = o número que você vê:
       pino da máquina/polia · peso de UM haltere (exercícios com par) ·
       soma das anilhas SEM barra/carrinho · pino de UM lado no crossover ·
       peso corporal do dia na barra fixa
     Carga efetiva = Carga registrada × Fator
     Volume (kg)   = Carga efetiva × reps totais × Lados
       Lados = 2 quando as reps são por lado/perna/braço
       Isometria (prancha): unidade "seg", volume 0 — progresso = melhor tempo
     1RM Epley = Carga efetiva × (1 + melhor série ÷ 30), só com melhor série ≤ 12
   ------------------------------------------------------------
   Campos do catálogo:
     fator  · 1 ou 2 (2 = par de halteres ou crossover, dois lados)
     lados  · 1 ou 2 (2 = reps contadas por lado/perna/braço)
     unidade· 'reps' ou 'seg'
     extra  · kg do barra/carrinho (SÓ informativo, não entra nas contas)
     faixa  · [min, max] de reps — usada na dupla progressão
   ============================================================ */

// Tipo de registro → fator/lados/unidade padrão (o catálogo pode sobrescrever)
const TYPE_META = {
    carga_total:   { fator: 1, lados: 1, unidade: 'reps' },
    halter_par:    { fator: 2, lados: 1, unidade: 'reps' },
    halter_uni:    { fator: 1, lados: 2, unidade: 'reps' },
    par_dois_lados:{ fator: 2, lados: 2, unidade: 'reps' },
    peso_corporal: { fator: 1, lados: 1, unidade: 'reps' },
    isometria:     { fator: 1, lados: 1, unidade: 'seg' }
};

const CATALOG_TIPOS = {
    carga_total:    { label: 'Pino / anilhas (carga registrada)', hint: 'Digite o número que você vê: pino da máquina/polia ou soma das anilhas SEM barra/carrinho. Fator 1.' },
    halter_par:     { label: 'Halteres (par) — peso de 1', hint: 'Digite o peso de UM haltere — o app aplica Fator 2 (soma dos dois).' },
    halter_uni:     { label: 'Unilateral — por lado', hint: 'Digite a carga de UM lado; as reps são POR LADO (Lados 2).' },
    par_dois_lados: { label: 'Par + reps por lado (ex: afundo)', hint: 'Peso de 1 haltere × 2 (Fator) e reps por perna/braço × 2 (Lados).' },
    peso_corporal:  { label: 'Peso corporal do dia', hint: 'Digite seu peso do dia (pré-preenchido). Na barra fixa é ele que conta.' },
    isometria:      { label: 'Isometria (segundos)', hint: 'Digite os segundos de cada série. Volume = 0; progresso = melhor tempo.' }
};

// ---------- Catálogo completo (app + planilha unificados) ----------
const EXERCISE_CATALOG_FULL = [
    // ============================== PEITO ==============================
    { nome: 'Supino Reto na Máquina',         grupo: 'Peito',    equipamento: 'Máquina articulada', como: 'número da máquina',   tipo: 'carga_total',  fator: 1, lados: 1, unidade: 'reps', faixa: [6, 10],  extra: null, descanso: 120, obs: 'Academia não tem supino com barra' },
    { nome: 'Supino Reto com Barra',          grupo: 'Peito',    equipamento: 'Barra',              como: 'soma das anilhas',    tipo: 'carga_total',  fator: 1, lados: 1, unidade: 'reps', faixa: [6, 10],  extra: 20,  descanso: 120 },
    { nome: 'Supino Inclinado c/ Halteres',   grupo: 'Peito',    equipamento: 'Halteres (par)',     como: 'peso de 1 haltere',   tipo: 'halter_par',   fator: 2, lados: 1, unidade: 'reps', faixa: [6, 10],  extra: null, descanso: 90 },
    { nome: 'Supino Inclinado com Barra',     grupo: 'Peito',    equipamento: 'Barra',              como: 'soma das anilhas',    tipo: 'carga_total',  fator: 1, lados: 1, unidade: 'reps', faixa: [6, 10],  extra: 20,  descanso: 120 },
    { nome: 'Supino Reto com Halteres',       grupo: 'Peito',    equipamento: 'Halteres (par)',     como: 'peso de 1 haltere',   tipo: 'halter_par',   fator: 2, lados: 1, unidade: 'reps', faixa: [8, 12],  extra: null, descanso: 90 },
    { nome: 'Crossover na Polia Alta',        grupo: 'Peito',    equipamento: 'Polia dupla',        como: 'peso de 1 lado',      tipo: 'halter_par',   fator: 2, lados: 1, unidade: 'reps', faixa: [10, 15], extra: null, descanso: 60, obs: 'Registrar sempre por lado' },
    { nome: 'Crucifixo na Máquina',           grupo: 'Peito',    equipamento: 'Máquina',            como: 'pino',                tipo: 'carga_total',  fator: 1, lados: 1, unidade: 'reps', faixa: [10, 15], extra: null, descanso: 60 },
    { nome: 'Peck Deck',                      grupo: 'Peito',    equipamento: 'Máquina',            como: 'pino',                tipo: 'carga_total',  fator: 1, lados: 1, unidade: 'reps', faixa: [10, 15], extra: null, descanso: 60 },
    { nome: 'Flexão de Braço',                grupo: 'Peito',    equipamento: 'Peso corporal',      como: 'peso corporal do dia',tipo: 'peso_corporal',fator: 1, lados: 1, unidade: 'reps', faixa: [8, 20],  extra: null, descanso: 60 },
    { nome: 'Paralelas (foco peito)',         grupo: 'Peito',    equipamento: 'Peso corporal',      como: 'peso corporal do dia',tipo: 'peso_corporal',fator: 1, lados: 1, unidade: 'reps', faixa: [6, 15],  extra: null, descanso: 90 },

    // ============================== COSTAS =============================
    { nome: 'Barra Fixa (Pull-up)',           grupo: 'Costas',   equipamento: 'Peso corporal',      como: 'peso corporal do dia',tipo: 'peso_corporal',fator: 1, lados: 1, unidade: 'reps', faixa: [3, 8],   extra: null, descanso: 120 },
    { nome: 'Puxada Frontal na Polia',        grupo: 'Costas',   equipamento: 'Polia',              como: 'pino',                tipo: 'carga_total',  fator: 1, lados: 1, unidade: 'reps', faixa: [8, 12],  extra: null, descanso: 90 },
    { nome: 'Remada Curvada com Barra',       grupo: 'Costas',   equipamento: 'Barra',              como: 'soma das anilhas',    tipo: 'carga_total',  fator: 1, lados: 1, unidade: 'reps', faixa: [8, 12],  extra: 10,  descanso: 120, obs: '20 kg se for barra olímpica' },
    { nome: 'Remada Unilateral c/ Halter',    grupo: 'Costas',   equipamento: 'Halter (1)',         como: 'peso do haltere',     tipo: 'halter_uni',   fator: 1, lados: 2, unidade: 'reps', faixa: [8, 12],  extra: null, descanso: 90, obs: 'Reps por lado' },
    { nome: 'Remada Baixa na Polia',          grupo: 'Costas',   equipamento: 'Polia',              como: 'pino',                tipo: 'carga_total',  fator: 1, lados: 1, unidade: 'reps', faixa: [8, 12],  extra: null, descanso: 90 },
    { nome: 'Voador Inverso',                 grupo: 'Costas',   equipamento: 'Máquina',            como: 'pino',                tipo: 'carga_total',  fator: 1, lados: 1, unidade: 'reps', faixa: [12, 15], extra: null, descanso: 60 },
    { nome: 'Levantamento Terra',             grupo: 'Costas',   equipamento: 'Barra',              como: 'soma das anilhas',    tipo: 'carga_total',  fator: 1, lados: 1, unidade: 'reps', faixa: [3, 8],   extra: 20,  descanso: 150 },
    { nome: 'Pulldown na Polia',              grupo: 'Costas',   equipamento: 'Polia',              como: 'pino',                tipo: 'carga_total',  fator: 1, lados: 1, unidade: 'reps', faixa: [8, 12],  extra: null, descanso: 90 },
    { nome: 'Remada Cavalinho',               grupo: 'Costas',   equipamento: 'Máquina',            como: 'pino',                tipo: 'carga_total',  fator: 1, lados: 1, unidade: 'reps', faixa: [8, 12],  extra: null, descanso: 90 },

    // ============================== PERNAS (quadríceps) =================
    { nome: 'Leg Press 45°',                  grupo: 'Pernas',   equipamento: 'Máquina c/ anilhas', como: 'soma das anilhas',    tipo: 'carga_total',  fator: 1, lados: 1, unidade: 'reps', faixa: [8, 12],  extra: 40,  descanso: 120, obs: 'Extra = carrinho (só informativo)' },
    { nome: 'Agachamento Hack',               grupo: 'Pernas',   equipamento: 'Máquina c/ anilhas', como: 'soma das anilhas',    tipo: 'carga_total',  fator: 1, lados: 1, unidade: 'reps', faixa: [8, 12],  extra: 30,  descanso: 120, obs: 'Extra = carrinho (só informativo)' },
    { nome: 'Agachamento Livre',              grupo: 'Pernas',   equipamento: 'Barra',              como: 'soma das anilhas',    tipo: 'carga_total',  fator: 1, lados: 1, unidade: 'reps', faixa: [5, 10],  extra: 20,  descanso: 150 },
    { nome: 'Cadeira Extensora',              grupo: 'Pernas',   equipamento: 'Máquina',            como: 'pino',                tipo: 'carga_total',  fator: 1, lados: 1, unidade: 'reps', faixa: [10, 15], extra: null, descanso: 60 },
    { nome: 'Afundo Búlgaro',                 grupo: 'Pernas',   equipamento: 'Halteres (par)',     como: 'peso de 1 haltere',   tipo: 'par_dois_lados', fator: 2, lados: 2, unidade: 'reps', faixa: [8, 12], extra: null, descanso: 90, obs: 'Reps por perna' },
    { nome: 'Afundo c/ Halteres',             grupo: 'Pernas',   equipamento: 'Halteres (par)',     como: 'peso de 1 haltere',   tipo: 'par_dois_lados', fator: 2, lados: 2, unidade: 'reps', faixa: [8, 12], extra: null, descanso: 90, obs: 'Reps por perna' },
    { nome: 'Agachamento Sumô',               grupo: 'Pernas',   equipamento: 'Barra',              como: 'soma das anilhas',    tipo: 'carga_total',  fator: 1, lados: 1, unidade: 'reps', faixa: [8, 12],  extra: 20,  descanso: 120, obs: 'Base aberta e pés para fora — puxa adutores e glúteo junto do quadríceps' },

    // ============================== POSTERIOR (isquiotibiais + glúteo) ===
    { nome: 'Mesa Flexora',                   grupo: 'Posterior', equipamento: 'Máquina',            como: 'pino',                tipo: 'carga_total',  fator: 1, lados: 1, unidade: 'reps', faixa: [10, 15], extra: null, descanso: 60 },
    { nome: 'Stiff com Barra',                grupo: 'Posterior', equipamento: 'Barra',              como: 'soma das anilhas',    tipo: 'carga_total',  fator: 1, lados: 1, unidade: 'reps', faixa: [6, 10],  extra: 20,  descanso: 120 },
    { nome: 'Elevação Pélvica (Hip Thrust)',  grupo: 'Posterior', equipamento: 'Máquina c/ anilhas', como: 'soma das anilhas',    tipo: 'carga_total',  fator: 1, lados: 1, unidade: 'reps', faixa: [10, 15], extra: 15,  descanso: 90, obs: 'Extra = alavanca da máquina' },
    { nome: 'Abdutor',                        grupo: 'Posterior', equipamento: 'Máquina',            como: 'pino',                tipo: 'carga_total',  fator: 1, lados: 1, unidade: 'reps', faixa: [12, 15], extra: null, descanso: 60, obs: 'Glúteo médio — agrupado na cadeia posterior' },
    { nome: 'Cadeira Adutora',                grupo: 'Posterior', equipamento: 'Máquina',            como: 'pino',                tipo: 'carga_total',  fator: 1, lados: 1, unidade: 'reps', faixa: [12, 15], extra: null, descanso: 60, obs: 'Adutores — agrupada na cadeia posterior, junto do Abdutor' },
    { nome: 'Panturrilha em Pé',              grupo: 'Posterior', equipamento: 'Máquina',            como: 'pino',                tipo: 'carga_total',  fator: 1, lados: 1, unidade: 'reps', faixa: [10, 15], extra: null, descanso: 60 },
    { nome: 'Panturrilha Sentado',            grupo: 'Posterior', equipamento: 'Máquina',            como: 'pino',                tipo: 'carga_total',  fator: 1, lados: 1, unidade: 'reps', faixa: [12, 20], extra: null, descanso: 60 },
    { nome: 'Swing de Kettlebell',            grupo: 'Posterior', equipamento: 'Kettlebell',         como: 'peso do kettlebell',  tipo: 'carga_total',  fator: 1, lados: 1, unidade: 'reps', faixa: [12, 20], extra: null, descanso: 60, obs: 'Dobradiça de quadril explosiva — cadeia posterior inteira' },

    // ============================== OMBROS =============================
    { nome: 'Desenvolvimento Militar',        grupo: 'Ombros',   equipamento: 'Barra',              como: 'soma das anilhas',    tipo: 'carga_total',  fator: 1, lados: 1, unidade: 'reps', faixa: [6, 10],  extra: 20,  descanso: 120 },
    { nome: 'Desenvolvimento c/ Halteres',    grupo: 'Ombros',   equipamento: 'Halteres (par)',     como: 'peso de 1 haltere',   tipo: 'halter_par',   fator: 2, lados: 1, unidade: 'reps', faixa: [8, 12],  extra: null, descanso: 90 },
    { nome: 'Elevação Lateral c/ Halteres',   grupo: 'Ombros',   equipamento: 'Halteres (par)',     como: 'peso de 1 haltere',   tipo: 'halter_par',   fator: 2, lados: 1, unidade: 'reps', faixa: [12, 20], extra: null, descanso: 60 },
    { nome: 'Elevação Frontal c/ Halter',     grupo: 'Ombros',   equipamento: 'Halter (1)',         como: 'peso do haltere',     tipo: 'halter_uni',   fator: 1, lados: 2, unidade: 'reps', faixa: [10, 15], extra: null, descanso: 60, obs: 'Reps por lado' },
    { nome: 'Face Pull',                      grupo: 'Ombros',   equipamento: 'Polia',              como: 'pino',                tipo: 'carga_total',  fator: 1, lados: 1, unidade: 'reps', faixa: [15, 20], extra: null, descanso: 60 },
    { nome: 'Remada Alta na Polia',           grupo: 'Ombros',   equipamento: 'Polia',              como: 'pino',                tipo: 'carga_total',  fator: 1, lados: 1, unidade: 'reps', faixa: [8, 12],  extra: null, descanso: 90 },
    { nome: 'Encolhimento de Ombros',         grupo: 'Ombros',   equipamento: 'Halteres (par)',     como: 'peso de 1 haltere',   tipo: 'halter_par',   fator: 2, lados: 1, unidade: 'reps', faixa: [10, 15], extra: null, descanso: 60, obs: 'Halteres (confirmado)' },
    { nome: 'Manguito Rotador',               grupo: 'Ombros',   equipamento: 'Polia',              como: 'pino',                tipo: 'carga_total',  fator: 1, lados: 1, unidade: 'reps', faixa: [15, 20], extra: null, descanso: 45, obs: 'Polia (confirmado) — roldanas reduzem a carga real; esforço médio' },

    // ============================== BÍCEPS =============================
    { nome: 'Rosca Direta com Barra',         grupo: 'Bíceps',   equipamento: 'Barra',              como: 'soma das anilhas',    tipo: 'carga_total',  fator: 1, lados: 1, unidade: 'reps', faixa: [8, 12],  extra: 10,  descanso: 60, obs: 'Extra = barra W ou reta comum' },
    { nome: 'Rosca Martelo',                  grupo: 'Bíceps',   equipamento: 'Halteres (par)',     como: 'peso de 1 haltere',   tipo: 'halter_par',   fator: 2, lados: 1, unidade: 'reps', faixa: [8, 12],  extra: null, descanso: 60 },
    { nome: 'Rosca Alternada c/ Halteres',    grupo: 'Bíceps',   equipamento: 'Halter (1)',         como: 'peso do haltere',     tipo: 'halter_uni',   fator: 1, lados: 2, unidade: 'reps', faixa: [8, 12],  extra: null, descanso: 60, obs: 'Reps por braço' },
    { nome: 'Rosca Scott',                    grupo: 'Bíceps',   equipamento: 'Barra W',            como: 'soma das anilhas',    tipo: 'carga_total',  fator: 1, lados: 1, unidade: 'reps', faixa: [8, 12],  extra: 10,  descanso: 60 },
    { nome: 'Rosca na Polia Baixa',           grupo: 'Bíceps',   equipamento: 'Polia',              como: 'pino',                tipo: 'carga_total',  fator: 1, lados: 1, unidade: 'reps', faixa: [10, 15], extra: null, descanso: 60 },
    { nome: 'Rosca Concentrada',              grupo: 'Bíceps',   equipamento: 'Halter (1)',         como: 'peso do haltere',     tipo: 'halter_uni',   fator: 1, lados: 2, unidade: 'reps', faixa: [10, 15], extra: null, descanso: 60, obs: 'Reps por braço' },

    // ============================== TRÍCEPS ============================
    { nome: 'Tríceps Corda na Polia',         grupo: 'Tríceps',  equipamento: 'Polia',              como: 'pino',                tipo: 'carga_total',  fator: 1, lados: 1, unidade: 'reps', faixa: [10, 15], extra: null, descanso: 60 },
    { nome: 'Tríceps na Polia Alta',          grupo: 'Tríceps',  equipamento: 'Polia',              como: 'pino',                tipo: 'carga_total',  fator: 1, lados: 1, unidade: 'reps', faixa: [10, 15], extra: null, descanso: 60 },
    { nome: 'Tríceps Unilateral (francês/testa)', grupo: 'Tríceps', equipamento: 'Polia',            como: 'pino',                tipo: 'halter_uni',   fator: 1, lados: 2, unidade: 'reps', faixa: [10, 15], extra: null, descanso: 60, obs: 'Polia (preferência); reps iguais por braço (confirmado)' },
    { nome: 'Tríceps Francês na Polia',       grupo: 'Tríceps',  equipamento: 'Polia/Máquina',      como: 'pino',                tipo: 'carga_total',  fator: 1, lados: 1, unidade: 'reps', faixa: [8, 12],  extra: null, descanso: 60, obs: 'Era registrado como "Francês c/ Halter" — confirmado que é polia' },
    { nome: 'Tríceps Testa com Barra W',      grupo: 'Tríceps',  equipamento: 'Barra W',            como: 'soma das anilhas',    tipo: 'carga_total',  fator: 1, lados: 1, unidade: 'reps', faixa: [8, 12],  extra: 10,  descanso: 60 },
    { nome: 'Paralelas (foco tríceps)',       grupo: 'Tríceps',  equipamento: 'Peso corporal',      como: 'peso corporal do dia',tipo: 'peso_corporal',fator: 1, lados: 1, unidade: 'reps', faixa: [6, 15],  extra: null, descanso: 90 },
    { nome: 'Supino Reto Pegada Fechada',     grupo: 'Tríceps',  equipamento: 'Barra',              como: 'soma das anilhas',    tipo: 'carga_total',  fator: 1, lados: 1, unidade: 'reps', faixa: [6, 10],  extra: 20,  descanso: 90 },

    // ============================== ABDÔMEN / CORE ====================
    { nome: 'Abdominal na Polia Alta',        grupo: 'Abdômen',  equipamento: 'Polia',              como: 'pino',                tipo: 'carga_total',  fator: 1, lados: 1, unidade: 'reps', faixa: [12, 15], extra: null, descanso: 45 },
    { nome: 'Rotação na Polia',               grupo: 'Abdômen',  equipamento: 'Polia',              como: 'pino',                tipo: 'halter_uni',   fator: 1, lados: 2, unidade: 'reps', faixa: [12, 15], extra: null, descanso: 45, obs: 'Reps iguais por lado (confirmado)' },
    { nome: 'Abdominal Supra no Solo',        grupo: 'Abdômen',  equipamento: 'Peso corporal',      como: 'peso corporal do dia',tipo: 'peso_corporal',fator: 1, lados: 1, unidade: 'reps', faixa: [15, 30], extra: null, descanso: 45 },
    { nome: 'Elevação de Pernas',             grupo: 'Abdômen',  equipamento: 'Peso corporal',      como: 'peso corporal do dia',tipo: 'peso_corporal',fator: 1, lados: 1, unidade: 'reps', faixa: [10, 20], extra: null, descanso: 45 },
    { nome: 'Abdominal Bicicleta',            grupo: 'Abdômen',  equipamento: 'Peso corporal',      como: 'peso corporal do dia',tipo: 'peso_corporal',fator: 1, lados: 1, unidade: 'reps', faixa: [15, 30], extra: null, descanso: 45 },
    { nome: 'Russian Twist',                  grupo: 'Abdômen',  equipamento: 'Peso corporal',      como: 'peso corporal do dia',tipo: 'peso_corporal',fator: 1, lados: 1, unidade: 'reps', faixa: [15, 30], extra: null, descanso: 45 },
    { nome: 'Ab Wheel',                       grupo: 'Abdômen',  equipamento: 'Roda',               como: 'peso corporal do dia',tipo: 'peso_corporal',fator: 1, lados: 1, unidade: 'reps', faixa: [8, 15],  extra: null, descanso: 60 },
    { nome: 'Prancha Isométrica',             grupo: 'Core',     equipamento: 'Peso corporal',      como: 'segundos',            tipo: 'isometria',    fator: 1, lados: 1, unidade: 'seg',  faixa: [30, 60], extra: null, descanso: 45, obs: 'Não entra no volume' },
    { nome: 'Prancha Lateral',                grupo: 'Core',     equipamento: 'Peso corporal',      como: 'segundos',            tipo: 'isometria',    fator: 1, lados: 1, unidade: 'seg',  faixa: [15, 60], extra: null, descanso: 45, obs: 'Não entra no volume' },

    // ============================== ANTEBRAÇO ===========================
    { nome: 'Extensão de Punho',              grupo: 'Antebraço',equipamento: 'Halteres (par)',     como: 'peso de 1 haltere',   tipo: 'halter_par',   fator: 2, lados: 1, unidade: 'reps', faixa: [12, 20], extra: null, descanso: 45, obs: 'Halteres (confirmado)' },
    { nome: 'Flexão de Punho',                grupo: 'Antebraço',equipamento: 'Halteres (par)',     como: 'peso de 1 haltere',   tipo: 'halter_par',   fator: 2, lados: 1, unidade: 'reps', faixa: [12, 20], extra: null, descanso: 45, obs: 'Halteres (confirmado)' },
    // "Pescoço" deixou de ser um grupo: a cervical entrou em Ombros (trapézio/ombro).
    { nome: 'Extensão Cervical',              grupo: 'Ombros',   equipamento: 'A definir',          como: 'a definir',           tipo: 'carga_total',  fator: 1, lados: 1, unidade: 'reps', faixa: [12, 20], extra: null, descanso: 45 },

    // ============================== CARDIO =============================
    { nome: 'Corrida (Esteira)',              grupo: 'Cardio',   equipamento: 'Esteira',            como: 'km e minutos',        tipo: 'corrida',      fator: 1, lados: 1, unidade: 'reps', faixa: [0, 0],   extra: null, descanso: 0 },
    { nome: 'Corrida (Rua)',                  grupo: 'Cardio',   equipamento: 'Livre',              como: 'km e minutos',        tipo: 'corrida',      fator: 1, lados: 1, unidade: 'reps', faixa: [0, 0],   extra: null, descanso: 0 },
    { nome: 'Bike / Ergométrico',             grupo: 'Cardio',   equipamento: 'Bike',               como: 'km e minutos',        tipo: 'corrida',      fator: 1, lados: 1, unidade: 'reps', faixa: [0, 0],   extra: null, descanso: 0 },
    { nome: 'Elíptico',                       grupo: 'Cardio',   equipamento: 'Elíptico',           como: 'km e minutos',        tipo: 'corrida',      fator: 1, lados: 1, unidade: 'reps', faixa: [0, 0],   extra: null, descanso: 0 },
    { nome: 'Remo (Ergômetro)',               grupo: 'Cardio',   equipamento: 'Remo',               como: 'km e minutos',        tipo: 'corrida',      fator: 1, lados: 1, unidade: 'reps', faixa: [0, 0],   extra: null, descanso: 0 }
];

// Aliases: nomes antigos do app → nome do catálogo unificado
const CATALOG_ALIASES = {
    'elevação lateral c/ halter': 'Elevação Lateral c/ Halteres',
    'crossover na polia': 'Crossover na Polia Alta',
    'tríceps polia alta': 'Tríceps na Polia Alta',
    'tríceps francês c/ halter': 'Tríceps Francês na Polia',
    'agachamento búlgaro': 'Afundo Búlgaro',
    'prancha isometrica': 'Prancha Isométrica'
};

// Índices
const CATALOG_BY_NAME = {};
EXERCISE_CATALOG_FULL.forEach(e => { CATALOG_BY_NAME[e.nome.toLowerCase()] = e; });

function catalogInfo(exerciseName) {
    const n = String(exerciseName || '').trim().toLowerCase();
    if (CATALOG_BY_NAME[n]) return CATALOG_BY_NAME[n];
    const alias = CATALOG_ALIASES[n];
    if (alias) return CATALOG_BY_NAME[alias.toLowerCase()] || null;
    return null;
}

// Sugestões por grupo (builder)
const EXERCISE_CATALOG = (() => {
    const m = {};
    EXERCISE_CATALOG_FULL.forEach(e => { (m[e.grupo] = m[e.grupo] || []).push(e.nome); });
    m['Geral'] = [];
    return m;
})();

// ---------- Recuperação muscular ----------
// recoveryH = horas até 100% com volume moderado; +2h por série acima de 8 na sessão
const MUSCLE_META = {
    'Peito':     { recoveryH: 48, xpWeight: 1.0, ordem: 1 },
    'Costas':    { recoveryH: 48, xpWeight: 1.0, ordem: 2 },
    // Pernas = quadríceps.
    'Pernas':    { recoveryH: 72, xpWeight: 0.5, ordem: 3 },
    // Posterior = isquiotibiais + glúteo.
    'Posterior': { recoveryH: 48, xpWeight: 0.5, ordem: 4 },
    'Ombros':    { recoveryH: 36, xpWeight: 1.0, ordem: 5 },
    'Bíceps':    { recoveryH: 36, xpWeight: 1.0, ordem: 6 },
    'Tríceps':   { recoveryH: 36, xpWeight: 1.0, ordem: 7 },
    'Abdômen':   { recoveryH: 24, xpWeight: 1.0, ordem: 8 },
    'Core':      { recoveryH: 24, xpWeight: 1.0, ordem: 9 },
    'Antebraço': { recoveryH: 24, xpWeight: 1.0, ordem: 10 },
    'Geral':     { recoveryH: 24, xpWeight: 1.0, ordem: 11 },
    'Cardio':    { recoveryH: 12, xpWeight: 1.0, ordem: 12 }
};
// 10 grupos musculares: quadríceps em Pernas; isquiotibiais + glúteo em Posterior.
const MUSCULOS_MAPA = ['Peito', 'Costas', 'Pernas', 'Posterior', 'Ombros', 'Bíceps', 'Tríceps', 'Abdômen', 'Core', 'Antebraço'];
const MUSCLE_OPTIONS_FULL = [...MUSCULOS_MAPA, 'Geral'];

// Grupos que deixaram de existir: registros antigos (localStorage, backup JSON,
// CSV da planilha) são remapeados sem erro na hora de carregar/importar.
const LEGACY_MUSCLE_ALIASES = { 'Pescoço': 'Ombros', 'Glúteos': 'Posterior' };
function normalizeMuscle(muscle) {
    const m = String(muscle || '').trim();
    return LEGACY_MUSCLE_ALIASES[m] || m || 'Geral';
}

// XP legado: pernas e cadeia posterior contam metade.
const MUSCLE_WEIGHT = { 'Pernas': 0.5, 'Posterior': 0.5 };

// ---------- Séries semanais por grupo (faixa-alvo) ----------
const FAIXA_SERIES_SEMANAIS = { min: 10, max: 20 };

// ---------- Anilhas ----------
const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
const DEFAULT_BAR_WEIGHT = 20;
const DEFAULT_SLED_WEIGHT = 40;

// ---------- Inferência para registros antigos ----------
function inferExerciseType(exerciseName, muscle) {
    const cat = catalogInfo(exerciseName);
    if (cat) return cat.tipo;
    const n = String(exerciseName || '').toLowerCase();
    if (/prancha|isometri|hold|suspens/.test(n)) return 'isometria';
    if (/barra fixa|pull-?up|chin-?up|flexão|paralela|abdominal|elevação de pernas|ab wheel|dips?/.test(n)) return 'peso_corporal';
    if (/unilateral|concentrada|martelo|alternada|búlgaro|afundo|passada|rotação na polia/.test(n)) return 'halter_uni';
    if (/halter|lateral c\/ halter/.test(n)) return 'halter_par';
    return 'carga_total';
}

// ============================================================
// ENGINES DE VOLUME — convenção da planilha
// ============================================================

// Fator/Lados/Unidade efetivos do registro (catálogo > campos do log > tipo)
function logMeta(log) {
    const cat = (log && log.exercise) ? catalogInfo(log.exercise) : null;
    const t = TYPE_META[(log && log.type)] || TYPE_META.carga_total;
    return {
        fator: (log && log.fator != null) ? log.fator : (cat ? cat.fator : t.fator),
        lados: (log && log.lados != null) ? log.lados : (cat ? cat.lados : t.lados),
        unidade: (log && log.unidade) ? log.unidade : (cat ? cat.unidade : t.unidade)
    };
}

// Carga efetiva = Carga registrada × Fator
function logCargaEfetiva(log) {
    return (Number(log && log.weight) || 0) * logMeta(log).fator;
}

// Meta completo da linha da planilha (todas as colunas calculadas)
function logFullMeta(log) {
    const m = logMeta(log);
    const hasSets = Array.isArray(log && log.sets) && log.sets.length > 0;
    const totalReps = hasSets
        ? log.sets.reduce((a, s) => a + (Number(s.reps) || 0), 0)
        : (Array.isArray(log && log.reps) ? log.reps.reduce((a, b) => a + (Number(b) || 0), 0) : 0);
    const cargaEfetiva = logCargaEfetiva(log);
    return {
        ...m,
        cargaEfetiva,
        totalReps,
        volume: logVolumeKg(log),
        bestSet: logBestSet(log),
        worstSet: logWorstSet(log),
        est1RM: m.unidade === 'seg' ? null : epleySeValido(cargaEfetiva, logBestSet(log))
    };
}

// Volume (kg) = Carga efetiva × reps totais × Lados (isometria e corrida = 0)
function logVolumeKg(log, bodyweight) {
    if (!log || log.kind === 'corrida') return 0;
    const { fator, lados, unidade } = logMeta(log);
    if (unidade === 'seg') return 0;
    // peso corporal legado (registro sem peso digitado) cai no peso corporal informado
    let w = Number(log.weight) || 0;
    if (!w && log.type === 'peso_corporal' && bodyweight) w = Number(bodyweight) || 0;
    if (Array.isArray(log.sets) && log.sets.length > 0) {
        return log.sets.reduce((acc, s) => acc + (Number(s.weight) || 0) * fator * (Number(s.reps) || 0) * lados, 0);
    }
    const reps = (Array.isArray(log.reps) ? log.reps : []).reduce((a, b) => a + (Number(b) || 0), 0);
    return w * fator * reps * lados;
}

// Tempo sob tensão (s) para isometria
function logTstSeconds(log) {
    if (!log) return 0;
    const { unidade } = logMeta(log);
    if (unidade !== 'seg' && log.type !== 'isometria') return 0;
    if (Array.isArray(log.sets) && log.sets.length > 0) return log.sets.reduce((a, s) => a + (Number(s.reps) || 0), 0);
    return (Array.isArray(log.reps) ? log.reps : []).reduce((a, b) => a + (Number(b) || 0), 0);
}

// Melhor série (reps ou segundos) do registro
function logBestSet(log) {
    if (!log) return 0;
    const arr = (Array.isArray(log.sets) && log.sets.length)
        ? log.sets.map(s => Number(s.reps) || 0)
        : (Array.isArray(log.reps) ? log.reps.map(Number) : []);
    return arr.length ? Math.max(...arr) : 0;
}

function logWorstSet(log) {
    if (!log) return 0;
    const arr = (Array.isArray(log.sets) && log.sets.length)
        ? log.sets.map(s => Number(s.reps) || 0)
        : (Array.isArray(log.reps) ? log.reps.map(Number) : []);
    return arr.length ? Math.min(...arr) : 0;
}

// 1RM Epley (usado no PR automático): carga efetiva × (1 + melhor série ÷ 30), reps clampadas em 12
function logEst1RM(log) {
    if (!log || log.kind === 'corrida') return 0;
    const { unidade } = logMeta(log);
    if (unidade === 'seg') return 0;
    const best = logBestSet(log);
    if (best <= 0) return 0;
    return Math.round(logCargaEfetiva(log) * (1 + Math.min(best, 12) / 30) * 10) / 10;
}

// 1RM Epley pela regra da planilha: só calcula com melhor série ≤ 12 (senão null)
function epleySeValido(cargaEfetiva, melhorSerie) {
    if (!melhorSerie || melhorSerie > 12) return null;
    return Math.round(cargaEfetiva * (1 + melhorSerie / 30) * 10) / 10;
}

// Textos de exibição
function formatLoadText(log) {
    if (!log) return '—';
    if (log.kind === 'corrida') return `${String(log.distanceKm ?? 0).replace('.', ',')} km`;
    const { fator, unidade } = logMeta(log);
    if (unidade === 'seg') return `${logTstSeconds(log)} s`;
    const w = log.weight ?? 0;
    if (log.type === 'peso_corporal') return w > 0 ? `${w} kg (PC)` : 'PC';
    if (fator === 2) return `${w} kg/halter`;
    return `${w} kg`;
}

function formatRepsText(log) {
    if (!log) return '—';
    if (log.kind === 'corrida') return `${String(log.distanceKm ?? 0).replace('.', ',')} km em ${log.durationMin ?? 0} min`;
    const { unidade, lados } = logMeta(log);
    if (unidade === 'seg') return `${logTstSeconds(log)} s`;
    const arr = (Array.isArray(log.sets) && log.sets.length)
        ? log.sets.map(s => s.reps)
        : (log.reps || []);
    return `(${arr.join(', ')})${lados === 2 ? ' /lado' : ''}`;
}

// ---------- Dupla progressão (regra da planilha) ----------
// Menor série da última sessão atingiu o topo da faixa → "⬆ Progredir"
function duplaProgressao(log) {
    const cat = catalogInfo(log ? log.exercise : '');
    if (!cat || !cat.faixa || log.kind === 'corrida' || logMeta(log).unidade === 'seg') return null;
    const topo = cat.faixa[1];
    const menor = logWorstSet(log);
    if (!(menor >= topo) || menor === 0) return null;
    const inc = (log.fator ?? cat.fator) === 2 ? 2 : 2.5;
    return { proximaCarga: (Number(log.weight) || 0) + inc, incremento: inc, faixa: cat.faixa };
}

// Sinal da próxima sessão (planilha): sempre ⬆ ou ➡
function sinalProximaSessao(log) {
    const prog = duplaProgressao(log);
    return prog ? '⬆ Progredir' : '➡ Manter e buscar reps';
}

// ---------- PR automático ----------
function detectAutoPR(newLog, allLogs, bodyweight) {
    if (!newLog) return false;
    if (newLog.kind === 'corrida') {
        const dist = Number(newLog.distanceKm) || 0;
        const anteriores = allLogs.filter(l => l.kind === 'corrida' && l.id !== newLog.id && (Number(l.distanceKm) || 0) > 0);
        const bestDist = anteriores.reduce((a, l) => Math.max(a, Number(l.distanceKm) || 0), 0);
        return dist > 0 && dist > bestDist;
    }
    if (logMeta(newLog).unidade === 'seg') {
        const tst = logTstSeconds(newLog);
        const anteriores = allLogs.filter(l => l.exercise === newLog.exercise && l.id !== newLog.id && logMeta(l).unidade === 'seg');
        const best = anteriores.reduce((a, l) => Math.max(a, logTstSeconds(l)), 0);
        return tst > 0 && tst > best;
    }
    const est = logEst1RM(newLog);
    if (est <= 0) return false;
    const anteriores = allLogs.filter(l => l.kind === 'peso' && l.exercise === newLog.exercise && l.id !== newLog.id && logMeta(l).unidade !== 'seg');
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
    const sameDay = muscleLogs.filter(l => l.date === last.date);
    const totalSets = sameDay.reduce((a, l) => a + ((l.sets && l.sets.length) || (l.reps && l.reps.length) || 0), 0);
    const hoursNeed = meta.recoveryH + Math.max(0, totalSets - 8) * 2;
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

const SINERGIA = {
    'Antebraço': { fator: 0.5, de: 'pegada',            re: /barra fixa|pull ?up|puxada|pulldown|remada|terra|ab wheel|agachamento livre|remo \(/i },
    'Bíceps':    { fator: 0.5, de: 'puxadas',           re: /remada|puxada|barra fixa|pull ?up|pulldown|remo \(/i },
    'Tríceps':   { fator: 0.5, de: 'empurradas',        re: /supino|desenvolvimento|paralela|flex[aã]o de bra/i },
    'Ombros':    { fator: 0.4, de: 'empurradas',        re: /supino|desenvolvimento|paralela|flex[aã]o de bra/i },
    'Core':      { fator: 0.5, de: 'compostos pesados', re: /agachamento|leg press|hack|terra|stiff|remada curvada|desenvolvimento|eleva[cç][aã]o p[eé]lvica|afundo|ab wheel/i },
    'Abdômen':   { fator: 0.3, de: 'compostos pesados', re: /agachamento|leg press|hack|terra|stiff|remada curvada|desenvolvimento/i },
    'Posterior': { fator: 0.4, de: 'agachamentos',      re: /agachamento|afundo|b[uú]lgaro|leg press|passada|hack/i }
};

// Logs de outros grupos que podem gerar apoio indireto para o músculo pedido.
function sinergiaLogs(muscle, allLogs) {
    const cfg = SINERGIA[muscle];
    if (!cfg || !Array.isArray(allLogs)) return [];
    return allLogs.filter(l => l && l.kind !== 'corrida' && l.muscle !== muscle && cfg.re.test(l.exercise || ''));
}

// Apoio indireto informa a recuperação; suas séries equivalentes não entram na meta semanal.
function sinergiaState(muscle, allLogs, nowMs) {
    const cfg = SINERGIA[muscle];
    if (!cfg) return null;
    const indiretos = sinergiaLogs(muscle, allLogs);
    if (!indiretos.length) return null;

    const base = recoveryState(muscle, indiretos, nowMs ?? Date.now());
    const seriesBrutas = indiretos.reduce((total, l) => total + (
        (Array.isArray(l.sets) && l.sets.length) ? l.sets.length
            : (Array.isArray(l.reps) ? l.reps.length : 0)
    ), 0);
    const latest = [...indiretos].sort((a, b) => (
        b.date < a.date ? -1 : b.date > a.date ? 1 : (b.id - a.id)
    ))[0];
    const pct = Math.max(2, Math.min(100, Math.round(100 - (100 - base.pct) * cfg.fator)));

    return {
        muscle, pct, fator: cfg.fator, de: cfg.de,
        series: Math.round(seriesBrutas * cfg.fator * 10) / 10,
        seriesBrutas, ultimo: base.last, ultimoEm: latest.date,
        exercicios: [...new Set(indiretos.map(l => String(l.exercise || '').trim()).filter(Boolean))]
    };
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

// ============================================================
// TAGS ACUMULATIVAS + BUSCA/FILTROS (Fase 1 do pool de exercícios)
// Integrado da versão publicada na PR #2 — adaptado ao catálogo completo.
// Tags derivadas por regra (nome + grupo + equipamento + tipo), com
// reforços pontuais em TAG_OVERRIDES. Base da aba 🔎 Buscar e do
// seletor rápido do registro.
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
    empurrar:      { label: 'Empurrar',        icon: '↗️', cat: 'padrao',      desc: 'Empurra a carga para longe do corpo: supinos, desenvolvimentos, tríceps.' },
    puxar:         { label: 'Puxar',           icon: '↙️', cat: 'padrao',      desc: 'Traz a carga em direção ao corpo: remadas, puxadas, roscas.' },
    agachar:       { label: 'Agachar',         icon: '⬇️', cat: 'padrao',      desc: 'Dominante de joelho: agachamentos, leg press, afundo, hack.' },
    dobradica:     { label: 'Dobradiça',       icon: '📐', cat: 'padrao',      desc: 'Dominante de quadril: terra, stiff, elevação pélvica, flexora.' },
    composto:      { label: 'Composto',        icon: '🏋️', cat: 'padrao',      desc: 'Multiarticular — recruta várias articulações e grupos.' },
    isolado:       { label: 'Isolado',         icon: '🔬', cat: 'padrao',      desc: 'Monoarticular — foca um músculo só.' },
    unilateral:    { label: 'Unilateral',      icon: '↔️', cat: 'padrao',      desc: 'Um lado por vez (reps por lado) — corrige assimetrias.' },
    // ---- equipamento ----
    barra:         { label: 'Barra',           icon: '🔩', cat: 'equipamento', desc: 'Barra reta ou barra W.' },
    halter:        { label: 'Halteres',        icon: '💪', cat: 'equipamento', desc: 'Halter ou par de halteres.' },
    polia:         { label: 'Polia / cabo',    icon: '🔗', cat: 'equipamento', desc: 'Cabo, polia alta ou baixa.' },
    maquina:       { label: 'Máquina',         icon: '⚙️', cat: 'equipamento', desc: 'Máquina articulada ou guiada (inclusive esteira/bike).' },
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

// Equipamento do catálogo → família de equipamento (inclui as variações deste catálogo)
const EQUIP_KIND = {
    'Barra': 'barra', 'Barra W': 'barra',
    'Halter': 'halter', 'Halteres': 'halter', 'Halteres (par)': 'halter', 'Halter (1)': 'halter',
    'Polia': 'polia', 'Polia dupla': 'polia', 'Polia/Máquina': 'polia', 'Polia (confirmar)': 'polia',
    'Máquina': 'maquina', 'Máquina articulada': 'maquina', 'Máquina c/ anilhas': 'maquina',
    'Esteira': 'maquina', 'Elíptico': 'maquina', 'Remo': 'maquina', 'Bike': 'maquina',
    'Peso corporal': 'peso-corporal', 'Roda': 'peso-corporal',
    // Kettlebell é peso livre como o halter: mesma família de tags (halter/casa/academia).
    'Kettlebell': 'halter',
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
const P_EMPURRAR   = /supino|desenvolviment|flexao de braco|paralela|triceps|elevacao lateral|elevacao frontal|crucifixo|peck deck|crossover|voador inverso|face pull/;
const P_PUXAR      = /puxada|remada|barra fixa|pull ?up|pulldown|face pull|rosca|biceps|encolhimento|levantamento terra|voador inverso/;
const P_AGACHAR    = /agachamento|leg press|afundo|passada|bulgaro|cadeira extensora|hack|abdutor|adutor/;
const P_DOBRADICA  = /terra|stiff|elevacao pelvica|hip thrust|mesa flexora|good morning|swing|kettlebell/;
const P_CORE       = /prancha|abdominal|elevacao de pernas|russian twist|ab wheel|rodinha|rotacao na polia/;
const P_COMPOSTO   = /supino|desenvolviment|agachamento|leg press|hack|terra|stiff|remada|puxada|pulldown|barra fixa|pull ?up|paralela|elevacao pelvica|hip thrust|afundo|bulgaro|passada|ab wheel|levantamento|remo \(|swing/;
const P_UNI        = /unilateral|alternada|concentrada|martelo|bulgaro|afundo|passada|prancha lateral/;
const P_POSTERIOR  = /terra|stiff|flexora|elevacao pelvica|hip thrust|gluteo|panturrilha|face pull|encolhimento|good morning|voador inverso|sumo|adutor|swing|kettlebell/;
const P_ANTERIOR   = /supino|crucifixo|peck deck|crossover|flexao de braco|agachamento|leg press|cadeira extensora|hack|afundo|bulgaro|passada|abdominal|prancha|elevacao de pernas|desenvolviment|elevacao frontal|abdutor/;
const P_AVANCADO   = /terra|agachamento livre|bulgaro|paralela|barra fixa|pull ?up|ab wheel|desenvolvimento militar|remada curvada|stiff|elevacao pelvica|hip thrust|hack|remo \(/;
const P_BASICO     = /prancha|abdominal|elevacao de pernas|russian twist|bicicleta|flexao de braco|panturrilha|encolhimento|face pull|puxada frontal|triceps polia|triceps corda|rosca na polia|crucifixo|peck deck|crossover|cadeira extensora|mesa flexora|abdutor|maquina/;

// Reforços pontuais (tags extras que a regra não pega) — nomes deste catálogo
const TAG_OVERRIDES = {
    'Prancha Lateral':                  ['unilateral', 'core'],
    'Ab Wheel':                         ['avancado', 'core'],
    'Levantamento Terra':               ['forca', 'avancado'],
    'Agachamento Livre':                ['forca'],
    'Corrida (Rua)':                    ['ar-livre'],
    'Remo (Ergômetro)':                 ['puxar', 'composto'],
    'Elevação Pélvica (Hip Thrust)':    ['posterior', 'agachar'],
    'Flexão de Braço':                  ['casa', 'anterior'],
    'Afundo Búlgaro':                   ['unilateral', 'avancado', 'agachar', 'posterior'],
    'Afundo c/ Halteres':               ['unilateral', 'agachar', 'posterior'],
    'Tríceps Unilateral (francês/testa)': ['unilateral', 'empurrar'],
    'Rotação na Polia':                 ['unilateral', 'core'],
    'Remada Unilateral c/ Halter':      ['unilateral', 'puxar'],
    'Extensão de Punho':                ['isolado', 'casa'],
    'Flexão de Punho':                  ['isolado', 'casa'],
    'Manguito Rotador':                 ['isolado', 'iniciante'],
    'Extensão Cervical':                ['isolado', 'iniciante'],
    'Encolhimento de Ombros':           ['isolado', 'casa'],
    'Tríceps Corda na Polia':           ['empurrar'],
    'Tríceps Francês na Polia':         ['empurrar'],
    'Voador Inverso':                   ['isolado', 'posterior'],
    'Abdutor':                          ['isolado', 'iniciante'],
    'Panturrilha em Pé':                ['isolado', 'posterior'],
    'Cadeira Extensora':                ['isolado', 'anterior'],
    'Mesa Flexora':                     ['isolado', 'posterior', 'dobradica'],
    'Agachamento Sumô':                 ['agachar', 'composto', 'posterior', 'intermediario'],
    'Cadeira Adutora':                  ['isolado', 'iniciante', 'posterior'],
    'Swing de Kettlebell':              ['composto', 'dobradica', 'posterior', 'condicionamento', 'casa']
};

// Sinônimos comuns — entram no índice de busca (pt/en e apelidos). Chaves = nomes do catálogo.
const SINONIMOS = {
    'Supino Reto na Máquina': 'chest press supino reto maquina',
    'Supino Reto com Barra': 'bench press supino reto barra',
    'Supino Inclinado com Barra': 'incline bench press supino inclinado',
    'Supino Reto com Halteres': 'dumbbell bench press supino halteres',
    'Supino Inclinado c/ Halteres': 'incline dumbbell press supino inclinado halteres',
    'Crucifixo na Máquina': 'fly machine voador peck deck',
    'Crossover na Polia Alta': 'cable fly crossover cabo polia',
    'Flexão de Braço': 'push up flexao de braco apoio',
    'Paralelas (foco peito)': 'dips paralela mergulho',
    'Paralelas (foco tríceps)': 'dips paralela mergulho',
    'Barra Fixa (Pull-up)': 'pull up chin up barra fixa',
    'Puxada Frontal na Polia': 'lat pulldown puxada frente',
    'Remada Curvada com Barra': 'bent over row remada curvada',
    'Remada Unilateral c/ Halter': 'serrote one arm row remada serrote',
    'Voador Inverso': 'reverse fly face pull inverso peck deck',
    'Levantamento Terra': 'deadlift terra dl',
    'Agachamento Livre': 'squat agachamento costas',
    'Agachamento Hack': 'hack squat hack maquina',
    'Leg Press 45°': 'leg press prensa 45',
    'Cadeira Extensora': 'leg extension extensora quadriceps',
    'Mesa Flexora': 'leg curl flexora posterior',
    'Stiff com Barra': 'romanian deadlift stiff rdl',
    'Afundo c/ Halteres': 'lunge afundo passada',
    'Afundo Búlgaro': 'bulgarian split squat bulgaro afundo',
    'Elevação Pélvica (Hip Thrust)': 'hip thrust elevacao pelvica gluteo ponte',
    'Panturrilha em Pé': 'calf raise panturrilha pe',
    'Abdutor': 'abducao abductor maquina gluteo',
    'Desenvolvimento Militar': 'overhead press militar ombros press',
    'Desenvolvimento c/ Halteres': 'dumbbell press desenvolvimento halteres',
    'Elevação Lateral c/ Halteres': 'lateral raise elevacao lateral ombro',
    'Face Pull': 'face pull rear delt deltoide posterior',
    'Encolhimento de Ombros': 'shrug encolhimento trapezio',
    'Manguito Rotador': 'manguito rotador cuff rotacao ombro polia',
    'Extensão Cervical': 'neck extension pescoço cervical',
    'Rosca Direta com Barra': 'barbell curl rosca direta biceps',
    'Rosca Martelo': 'hammer curl martelo',
    'Rosca Scott': 'preacher curl scott',
    'Tríceps Corda na Polia': 'triceps pushdown polia corda',
    'Tríceps na Polia Alta': 'triceps pushdown polia alta',
    'Tríceps Testa com Barra W': 'skull crusher testa frances',
    'Tríceps Francês na Polia': 'overhead extension frances polia',
    'Tríceps Unilateral (francês/testa)': 'unilateral triceps frances testa polia',
    'Rotação na Polia': 'woodchop rotacao polia obliquo',
    'Extensão de Punho': 'wrist curl extensao punho antebraco',
    'Flexão de Punho': 'wrist curl flexao punho antebraco',
    'Prancha Isométrica': 'plank prancha isometria',
    'Abdominal Supra no Solo': 'crunch abdominal supra solo',
    'Abdominal na Polia Alta': 'cable crunch abdominal polia',
    'Ab Wheel': 'ab wheel rodinha abdominal',
    'Corrida (Esteira)': 'running corrida esteira treadmill',
    'Corrida (Rua)': 'running corrida rua',
    'Bike / Ergométrico': 'bike cycling ergometrica pedal',
    'Remo (Ergômetro)': 'rowing remo ergometro',
    'Agachamento Sumô': 'sumo squat agachamento sumo base aberta adutor',
    'Cadeira Adutora': 'adductor machine cadeira adutora aducao adutores',
    'Swing de Kettlebell': 'kettlebell swing kb swing balanco dobradica'
};

// Texto sem acento/caixa — usado em TODA a busca (tolera "supino inclinado halter")
function normalizeText(s) {
    return String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

// Índice normalizado (sem acento nem caixa) → entrada do catálogo
const CATALOG_BY_SEARCH = {};
EXERCISE_CATALOG_FULL.forEach(e => { CATALOG_BY_SEARCH[normalizeText(e.nome)] = e; });

const TAG_IDS = Object.keys(TAG_DEFS);
// Lista completa de exercícios (base + customizados)
function allExercisesList() {
    if (typeof customExercises !== 'undefined' && Array.isArray(customExercises)) {
        return [...EXERCISE_CATALOG_FULL, ...customExercises];
    }
    return EXERCISE_CATALOG_FULL;
}
if (typeof catalogInfoCustom !== 'function') function catalogInfoCustom(n) { return catalogInfo(n); }
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
        if (P_CORE.test(n) || grupo === 'Abdômen' || grupo === 'Core') tags.add('core');
        if (tipo === 'halter_uni' || tipo === 'par_dois_lados' || P_UNI.test(n)) tags.add('unilateral');
        if (tipo !== 'isometria') {           // isometria = tempo sob tensão, sem padrão articular
            if (P_EMPURRAR.test(n)) tags.add('empurrar');
            if (P_PUXAR.test(n)) tags.add('puxar');
            if (P_AGACHAR.test(n)) tags.add('agachar');
            if (P_DOBRADICA.test(n)) tags.add('dobradica');
            if (P_COMPOSTO.test(n)) tags.add('composto'); else tags.add('isolado');
        }
    }

    // cadeia / região
    if (grupo === 'Costas' || grupo === 'Posterior' || P_POSTERIOR.test(n) || (grupo === 'Pernas' && P_DOBRADICA.test(n))) tags.add('posterior');
    if (grupo === 'Peito' || P_ANTERIOR.test(n) || (grupo === 'Pernas' && !P_DOBRADICA.test(n))) tags.add('anterior');

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

    const list = allExercisesList().filter(e => {
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
