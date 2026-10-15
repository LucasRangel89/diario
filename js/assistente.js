/* ============================================================
   ASSISTENTE DE TREINOS — Fase 2 (ordem sugerida) + Fase 3 (fadiga real e
   próximo treino recomendado)
   ------------------------------------------------------------
   Tudo aqui é função PURA (sem DOM): recebe listas/logs e devolve dados.
   A UI (app.js) só apresenta os resultados. Isso deixa o algoritmo testável
   com vetores fixos no test_engine.js.
   ------------------------------------------------------------
   REGRAS DE ORDENAÇÃO (prioridade aprovada):
     1. Ativação/correção primeiro (Manguito Rotador, Face Pull);
     2. Compostos multiarticulares antes de isoladores;
     3. Não fadigar um músculo que será estabilizador/apoio depois;
     4. Equilíbrio empurrar/puxar (compostos alternam os padrões);
     5. Recuperação + séries semanais só desempata exercícios da mesma fase;
     6. Descanso do catálogo segue no cronômetro, e recuperação também é aviso.
   Desempates restantes: grupos grandes primeiro (Pernas → … → Antebraço),
   core/abdômen no fim. Bi-sets se movem como bloco (o par nunca se separa).
   ============================================================ */

// ---------- Fase 2: ordenação inteligente ----------

// Exercícios de ativação/correção que abrem o treino
const ATIVACAO_NOMES = ['Manguito Rotador', 'Face Pull'];

// Quão "grande" é o grupo (desempate: grande primeiro, enquanto há força)
const MUSCLE_SIZE_RANK = {
    'Pernas': 0, 'Posterior': 1, 'Costas': 2, 'Peito': 3, 'Ombros': 4,
    'Bíceps': 5, 'Tríceps': 6, 'Abdômen': 7, 'Core': 8, 'Antebraço': 9,
    'Geral': 10, 'Cardio': 11
};

// Músculo que "segura/apoia" → exercícios que precisam dele fresco.
// (sem flag /g — regex com /g é estado e quebra o .test repetido)
const STABILIZER_GROUPS = Object.fromEntries(Object.entries(SINERGIA).map(([g, cfg]) => [g, cfg.re]));

function isAtivacaoExercise(nome) {
    const n = normalizeText(nome || '');
    return ATIVACAO_NOMES.some(a => n.includes(normalizeText(a)));
}

// Classifica um exercício para as regras (usa as tags acumulativas do catálogo)
function classifyExercicio(ex) {
    const nome = (ex && (ex.exercise || ex.nome)) || '';
    const tags = exerciseTags(nome);
    const cat = catalogInfo(nome);
    const grupo = normalizeMuscle((ex && (ex.muscle || ex.grupo)) || (cat ? cat.grupo : 'Geral') || 'Geral');
    return {
        nome, tags, grupo,
        ativacao: isAtivacaoExercise(nome),
        core: grupo === 'Abdômen' || grupo === 'Core',
        composto: tags.includes('composto'),
        empurrar: tags.includes('empurrar'),
        puxar: tags.includes('puxar')
    };
}

// 0 ativação · 1 composto · 2 isolador/outros · 3 core/abdômen (fim)
function faseDe(c) {
    if (c.ativacao) return 0;
    if (c.core) return 3;
    if (c.composto) return 1;
    return 2;
}

// Bi-sets: blocos [i] ou [i, i+1] quando list[i+1].biset — o par nunca separa.
function bisetBlockRanges(list) {
    const blocks = [];
    (list || []).forEach((ex, i) => {
        const ehSegundo = !!(ex && ex.biset) && blocks.length > 0 && blocks[blocks.length - 1].length < 2
            && blocks[blocks.length - 1][0] === i - 1;
        if (ehSegundo) blocks[blocks.length - 1].push(i);
        else blocks.push([i]);
    });
    return blocks;
}

function blockPattern(list, range) {
    let hasE = false, hasP = false;
    range.forEach(i => {
        const c = classifyExercicio(list[i]);
        if (c.empurrar) hasE = true;
        if (c.puxar) hasP = true;
    });
    if (hasE && hasP) return 'misto';
    if (hasE) return 'empurrar';
    if (hasP) return 'puxar';
    return null;
}

// B (range) usa o músculo G como apoio? (e não é o próprio grupo-alvo de B)
function rangeUsaComoApoio(list, range, G) {
    const re = STABILIZER_GROUPS[G];
    if (!re) return false;
    return range.some(j => {
        const c = classifyExercicio(list[j]);
        return c.grupo !== G && re.test(c.nome);
    });
}

/* Ordena a lista de exercícios do treino pelas regras aprovadas.
   Entrada: [{muscle, exercise, biset, ...}] + contexto opcional {logs, nowMs}.
   Saída: NOVA lista (não mexe na original), mesma forma + orderReason por item.
   Sem contexto, mantém a ordenação-base (compatível com chamadas antigas). */
function orderWorkoutExercises(list, options = {}) {
    const src = Array.isArray(list) ? list : [];
    if (src.length <= 1) {
        return src.map(e => ({ ...e, orderReason: e.orderReason || 'Treino com 1 exercício só.' }));
    }

    const opts = options && typeof options === 'object' ? options : {};
    const hasRecoveryContext = Array.isArray(opts.logs);
    const allLogs = hasRecoveryContext ? opts.logs : [];
    const nowMs = Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
    const weekly = hasRecoveryContext
        ? weeklySetsByMuscle(allLogs, opts.refDateISO || assistenteTodayISO(nowMs))
        : {};
    const muscleStateCache = new Map();
    const muscleState = muscle => {
        const m = normalizeMuscle(muscle || 'Geral');
        if (!muscleStateCache.has(m)) {
            const muscleLogs = allLogs.filter(l => l && l.kind !== 'corrida' && normalizeMuscle(l.muscle || 'Geral') === m);
            const state = fatigueState(m, muscleLogs, weekly[m] || 0, nowMs);
            // Mesma lógica da recomendação: prontidão + séries que faltam − excesso.
            state.orderScore = state.pct + state.faltam * 4 - state.excesso * 3;
            muscleStateCache.set(m, state);
        }
        return muscleStateCache.get(m);
    };

    // ---- blocos (bi-set anda junto) ----
    const ranges = bisetBlockRanges(src);
    const classif = src.map(e => classifyExercicio(e));
    const rangeGroups = r => [...new Set(r.map(i => classif[i].grupo).filter(m => m && m !== 'Cardio'))];
    const rangeRecoveryScore = r => {
        const groups = rangeGroups(r);
        if (!groups.length) return 0; // Cardio não usa a meta de séries musculares.
        return groups.reduce((sum, m) => sum + muscleState(m).orderScore, 0) / groups.length;
    };
    const rangeRecoveryReason = r => {
        const groups = rangeGroups(r);
        if (!groups.length) return '';
        const resumo = groups.map(m => {
            const st = muscleState(m);
            const volume = st.faltam > 0
                ? `${st.seriesSemana}/${st.metaMin} séries; faltam ${st.faltam}`
                : st.excesso > 0
                    ? `${st.seriesSemana}/${st.metaMax} séries; ${st.excesso} acima da faixa`
                    : `${st.seriesSemana} séries; dentro da faixa`;
            return `${m}: ${st.pct}% de prontidão, ${volume}`;
        });
        return `Ajuste leve por recuperação e volume semanal: ${resumo.join(' · ')}`;
    };

    // ---- ordem-base: fase (ativação/compostos/isoladores/core), tamanho, ordem original ----
    const key = r => {
        const f = Math.min(...r.map(i => faseDe(classif[i])));
        const rank = Math.min(...r.map(i => MUSCLE_SIZE_RANK[classif[i].grupo] ?? 11));
        return [f, rank, r[0]];
    };
    const compareBase = (a, b) => {
        const ka = key(a), kb = key(b);
        return (ka[0] - kb[0]) || (ka[1] - kb[1]) || (ka[2] - kb[2]);
    };
    ranges.sort(compareBase);

    // Recuperação/volume só desempata blocos da MESMA fase.
    // Assim não passa isolador à frente de composto nem separa bi-sets.
    const recoveryMoved = new Set();
    if (hasRecoveryContext) {
        const baseOrder = ranges.slice();
        const baseIndex = new Map(baseOrder.map((r, i) => [r, i]));
        ranges.sort((a, b) => {
            const ka = key(a), kb = key(b);
            return (ka[0] - kb[0])
                || (rangeRecoveryScore(b) - rangeRecoveryScore(a))
                || (ka[1] - kb[1])
                || (ka[2] - kb[2]);
        });
        ranges.forEach((r, i) => {
            if (baseIndex.get(r) !== i) recoveryMoved.add(r);
        });
    }

    // ---- regra 4: alternar empurrar/puxar entre os compostos (fase 1) ----
    const patternFase1 = r => (Math.min(...r.map(i => faseDe(classif[i]))) === 1 ? blockPattern(src, r) : null);
    const altMoved = new Set();
    for (let i = 0; i < ranges.length - 1; i++) {
        const p1 = patternFase1(ranges[i]);
        if (p1 !== 'empurrar' && p1 !== 'puxar') continue;
        const p2 = patternFase1(ranges[i + 1]);
        if (p2 !== p1) continue;
        for (let j = i + 2; j < ranges.length; j++) {
            const pj = patternFase1(ranges[j]);
            if (pj === (p1 === 'empurrar' ? 'puxar' : 'empurrar')) {
                const tmp = ranges[i + 1]; ranges[i + 1] = ranges[j]; ranges[j] = tmp;
                altMoved.add(ranges[i + 1]); altMoved.add(ranges[j]);
                break;
            }
        }
    }

    // ---- regra 3: não fadigar o estabilizador/apoio antes do exercício que o usa ----
    // move o "fadigante" para logo depois do exercício que precisa dele
    const estabMoved = new Map(); // range → { after: range, G: 'Antebraço' }
    for (let pass = 0; pass < ranges.length * 4; pass++) {
        let moved = false;
        for (let a = 0; a < ranges.length && !moved; a++) {
            const A = ranges[a];
            if (A.some(i => classif[i].ativacao)) continue; // ativação é leve, fica onde está
            for (let b = 0; b < ranges.length && !moved; b++) {
                if (a === b) continue;
                const B = ranges[b];
                for (const gi of A) {
                    const G = classif[gi].grupo;
                    if (a < b && rangeUsaComoApoio(src, B, G)) {
                        ranges.splice(a, 1);
                        ranges.splice(b, 0, A); // após remover A, B está em b−1 → A entra em b (logo depois)
                        estabMoved.set(A, { after: B, G });
                        moved = true;
                        break;
                    }
                }
            }
        }
        if (!moved) break;
    }

    // ---- monta a saída com o "porquê" de cada posição ----
    const saida = [];
    ranges.forEach((r, pos) => {
        r.forEach((idx, k) => {
            const c = classif[idx];
            const partes = [];
            if (c.ativacao) partes.push('Ativação/correção primeiro — prepara as articulações sem cansar');
            else if (c.core) partes.push('Core/abdômen no fim — não atrapalha os exercícios compostos');
            else if (c.composto) partes.push('Composto multiarticular — fazer com o músculo fresco');
            else partes.push('Isolador — rende melhor depois dos compostos');
            if (c.composto && !c.ativacao && !recoveryMoved.has(r) && (MUSCLE_SIZE_RANK[c.grupo] ?? 11) <= 3) partes.push('Grupo grande primeiro, enquanto há força');
            if (recoveryMoved.has(r)) {
                const recoveryReason = rangeRecoveryReason(r);
                if (recoveryReason) partes.push(recoveryReason);
            }
            const est = estabMoved.get(r);
            if (est && est.G === c.grupo) {
                const alvo = (src[est.after[0]] || {}).exercise || '';
                partes.push(`Depois de "${alvo}" para não cansar o apoio de ${est.G}`);
            }
            if (altMoved.has(r) && (c.empurrar || c.puxar)) partes.push('Equilibra empurrar/puxar no treino');
            if (k > 0 && src[idx].biset) partes.push('Bi-set — anda junto com o par');
            saida.push({
                ...src[idx],
                biset: k > 0,          // regrava a flag: 2º do bloco = bi-set com o anterior
                orderReason: partes.join(' · '),
                orderPos: pos + 1
            });
        });
    });
    return saida;
}

// ---------- Fase 3: fadiga real (recuperação + séries/semana) ----------

function assistenteTodayISO(nowMs) {
    const d = (nowMs != null) ? new Date(nowMs) : new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Séries feitas por grupo na semana atual (seg–dom), fora corrida.
// A chave é sempre o grupo CANÔNICO do catálogo: um registro antigo gravado como
// "posteriores" ou "Biceps" cai na mesma linha do grupo certo (senão a meta
// semanal fica dividida e o app cobra séries que você já fez).
function weeklySetsByMuscle(allLogs, refDateISO) {
    const ref = refDateISO || assistenteTodayISO();
    const [ws, we] = isoWeekRange(ref);
    const out = {};
    (allLogs || []).forEach(l => {
        if (!l || l.kind === 'corrida') return;
        if (l.date < ws || l.date > we) return;
        const m = normalizeMuscle(l.muscle || 'Geral');
        const sets = (Array.isArray(l.sets) && l.sets.length) ? l.sets.length
            : (Array.isArray(l.reps) ? l.reps.length : 0);
        out[m] = (out[m] || 0) + sets;
    });
    return out;
}

/* Fadiga REAL = recuperação (%) temperada pelo volume da semana.
   Volume acima da faixa (10–20 séries) pesa na recuperação:
   cada série acima do máximo tira 2% da prontidão (mínimo 60% da recuperação). */
function fatigueState(muscle, muscleLogs, weeklySets, nowMs, sinergia) {
    const alvo = normalizeMuscle(muscle);
    const base = recoveryState(alvo, muscleLogs, nowMs);
    const series = Number(weeklySets) || 0;
    // A meta é do GRUPO: antebraço tem faixa própria, o resto fica em 10–20.
    const faixa = faixaSeriesDoGrupo(alvo);
    const min = faixa.min, max = faixa.max;
    const volumeStatus = series < min ? 'abaixo' : (series > max ? 'acima' : 'na-faixa');
    const faltam = Math.max(0, min - series);
    const excesso = Math.max(0, series - max);
    const direto = base.pct === null || base.pct === undefined ? null : base.pct;
    const sin = sinergia || null;
    const rec = Math.min(direto ?? 100, sin ? sin.pct : 100);
    const fadigaReal = Math.max(2, Math.min(100, Math.round(rec * Math.max(0.6, 1 - excesso * 0.02))));

    let st;
    if (fadigaReal < 33) {
        st = { label: 'EXAUSTO', icon: '🔥', badge: 'bg-red-950 text-red-400 border-red-800', bar: 'bg-red-500', border: 'border-red-600/60 shadow-lg shadow-red-950/40' };
    } else if (fadigaReal < 100) {
        st = { label: 'RECUPERANDO', icon: '⏳', badge: 'bg-amber-950 text-amber-400 border-amber-800', bar: 'bg-amber-500', border: 'border-amber-500/60 shadow-lg shadow-amber-950/40' };
    } else {
        st = { label: '100% PRONTO', icon: '✅', badge: 'bg-emerald-950 text-emerald-400 border-emerald-800', bar: 'bg-emerald-500', border: 'border-emerald-500/60 shadow-lg shadow-emerald-950/40' };
    }
    const volText = volumeStatus === 'abaixo' ? `${series}/${min}–${max} séries · abaixo da meta`
        : volumeStatus === 'acima' ? `${series}/${min}–${max} séries · acima da faixa`
            : `${series}/${min}–${max} séries · na faixa`;

    return {
        muscle: alvo,
        ...st,
        pct: fadigaReal,                 // prontidão real (o que a UI mostra)
        recuperacaoPct: rec,             // só a janela de recuperação
        seriesSemana: series, metaMin: min, metaMax: max,
        volumeStatus, faltam, excesso, volText,
        semRegistro: direto === null && !sin,
        sinergia: sin,
        sinergiaText: sin ? `🤝 apoio em ${sin.de} (~${Number(sin.series).toFixed(1).replace('.', ',')} séries equivalentes)` : '',
        info: base.info, last: base.last, hoursNeed: base.hoursNeed
    };
}

// Há quantos dias o usuário não registra treino (0 = treinou hoje/ontem não conta)
function diasDesdeUltimoTreino(allLogs, nowMs) {
    const datas = [...new Set((allLogs || []).map(l => l && l.date).filter(Boolean))].sort();
    if (!datas.length) return 0;
    const last = new Date(datas[datas.length - 1] + 'T12:00:00').getTime();
    return Math.max(0, Math.floor(((nowMs != null ? nowMs : Date.now()) - last) / 864e5));
}

/* Sugestão do PRÓXIMO TREINO: prioriza grupos mais descansados e mais abaixo
   da meta semanal de séries. Devolve todos os treinos pontuados + motivos
   em português simples (o melhor primeiro). */
function suggestNextWorkout(workouts, allLogs, nowMs) {
    const now = (nowMs != null) ? nowMs : Date.now();
    const weekly = weeklySetsByMuscle(allLogs, assistenteTodayISO(now));
    const dias = diasDesdeUltimoTreino(allLogs, now);
    const estadoLombar = regiaoLombarState(allLogs, now);

    const scored = (Array.isArray(workouts) ? workouts : []).map(w => {
        const groups = [...new Set((w.exercises || []).map(e => e && e.muscle).filter(Boolean)
            .map(m => normalizeMuscle(m)).filter(m => m !== 'Cardio'))];
        let score = 0;
        const motivos = [];
        groups.forEach(m => {
            const mLogs = (allLogs || []).filter(l => l && l.kind !== 'corrida' && normalizeMuscle(l.muscle) === m);
            const st = fatigueState(m, mLogs, weekly[m] || 0, now);
            score += st.pct + st.faltam * 4 - st.excesso * 3;
            if (st.faltam > 0) motivos.push(`${m}: faltam ${st.faltam} séries para a meta da semana (fez ${st.seriesSemana})`);
            else if (st.excesso > 0) motivos.push(`${m}: já passou da faixa da semana (${st.seriesSemana} séries)`);
            else motivos.push(`${m}: volume da semana na faixa (${st.seriesSemana} séries)`);
            if (st.pct >= 100) motivos.push(`${m} está descansado`);
            else motivos.push(`${m} ainda está ${String(st.label).toLowerCase()} (${st.pct}%)`);
        });
        const n = Math.max(1, groups.length);
        score = score / n;
        // Penalidade da lombar
        const penal = aplicaPenalidadeLombar(score, w, estadoLombar);
        score = penal.score;
        if (penal.penalidade > 0) {
            motivos.push(`⚠️ ${penal.qtdCarregaLombar} exercício(s) exigem a lombar, que ainda está ${String(estadoLombar.label).toLowerCase()}`);
        }
        if (dias >= 1) score += Math.min(dias, 7) * 5;
        return { w, score: Math.round(score), motivos, groups, diasSemTreinar: dias, penalidadeLombar: penal.penalidade, estadoLombar };
    });

    scored.sort((a, b) => (b.score - a.score)
        || String((a.w && a.w.name) || '').localeCompare(String((b.w && b.w.name) || ''), 'pt-BR'));
    return scored;
}

// Séries equivalentes de apoio indireto na SEMANA: Σ séries dos sinergiaLogs ×
// fator do grupo. É só informação — não soma em `series` nem abate `faltam`,
// porque a meta é de estímulo direto (o apoio já aparece na recuperação).
function seriesIndiretasSemana(muscle, logsSemana) {
    const cfg = SINERGIA[normalizeMuscle(muscle)];
    if (!cfg) return 0;
    const brutas = sinergiaLogs(muscle, logsSemana).reduce((total, l) => total + (
        (Array.isArray(l.sets) && l.sets.length) ? l.sets.length
            : (Array.isArray(l.reps) ? l.reps.length : 0)
    ), 0);
    return Math.round(brutas * cfg.fator * 10) / 10;
}

// O que falta para o "estímulo total" da semana (usado no montador).
// Cada grupo é cobrado pela PRÓPRIA faixa e traz o apoio indireto visível.
function weeklyGaps(allLogs, refDateISO) {
    const ref = refDateISO || assistenteTodayISO();
    const weekly = weeklySetsByMuscle(allLogs, ref);
    const [ws, we] = isoWeekRange(ref);
    const logsSemana = (Array.isArray(allLogs) ? allLogs : [])
        .filter(l => l && l.kind !== 'corrida' && l.date >= ws && l.date <= we);
    return MUSCULOS_MAPA.map(m => {
        const faixa = faixaSeriesDoGrupo(m);
        const series = weekly[m] || 0;
        const faltam = Math.max(0, faixa.min - series);
        const excesso = Math.max(0, series - faixa.max);
        return {
            muscle: m, series, faltam, excesso,
            min: faixa.min, max: faixa.max,
            indiretas: seriesIndiretasSemana(m, logsSemana),
            status: series < faixa.min ? 'abaixo' : (series > faixa.max ? 'acima' : 'na-faixa')
        };
    }).filter(g => g.faltam > 0 || g.excesso > 0)
        .sort((a, b) => (b.faltam - a.faltam) || a.muscle.localeCompare(b.muscle, 'pt-BR'));
}

// ============================================================
/* ============================================================
   REGIÕES DE CARGA (lombar, etc.) — ALERTA DE FADIGA SEM META
   ============================================================
   Não são grupos musculares e não entram na faixa de 10-20 séries.
   Servem só para alertar que a região está carregada e orientar o treino.
   Nível de carga da lombar:
     0 = não carrega / máquina guiada / deitado/sentado com apoio
     1 = leve (afundo, remada unilateral, desenvolvimento sentado)
     2 = moderado (stiff, remada curvada, good morning, hiperextensão, swing, sumô)
     3 = muito pesado (terra, agachamento livre barra costas, desenvolvimento militar em pé)
*/

// Horas base de recuperação por nível de carga por série
const LOMBAR_HORAS_POR_SERIE = { 0: 0, 1: 0.25, 2: 0.5, 3: 1.0 };
// Janela base mínima de recuperação depois de qualquer sessão que carregou lombar
const LOMBAR_HORAS_BASE = 24;

// Nível de carga lombar por nome explícito (sobrescreve tudo)
const LOMBAR_NIVEL = {
    'Levantamento Terra': 3,
    'Agachamento Livre': 3,
    'Desenvolvimento Militar': 3,
    'Stiff com Barra': 2,
    'Remada Curvada com Barra': 2,
    'Extensão Lombar (Banco Romano)': 2,
    'Swing de Kettlebell': 2,
    'Agachamento Sumô': 2,
    'Good Morning': 2,
    'Remada Unilateral c/ Halter': 1,
    'Afundo Búlgaro': 1,
    'Afundo c/ Halteres': 1,
    'Desenvolvimento c/ Halteres': 1,
    'Desenvolvimento Arnold': 1
};

// Regex de detecção por nível
const LOMBAR_REGEX_NIVEL = {
    3: /terra|deadlift|agachamento livre|back squat|desenvolvimento militar|overhead press.*barra/i,
    2: /stiff|rdl|good morning|remada curvada|bent over row|hiperextens|banco romano|back extension|swing|kettlebell|agachamento sumo|sumo squat/i,
    1: /afundo|bulgaro|remada unilateral|serrote|desenvolvimento.*halter|arnold/i
};

// Exercícios que NÃO carregam lombar mesmo que o regex bata
const LOMBAR_EXCLUSAO = [
    /leg press|hack squat|agachamento hack|cadeira extensora|leg extension|mesa flexora|leg curl|voador|crucifixo|supino maquina|crossover|peck deck|pulldown|puxada frontal|remada baixa|cadeira adutora|triceps|rosca|face pull|manguito|abdominal sentado|polia baixa/
];

// Fallback se custom_exercises ainda não carregou
if (typeof catalogInfoCustom !== 'function') { function catalogInfoCustom(nome) { return catalogInfo(nome); } }
if (typeof exercicioCarregaLombarCustom !== 'function') { function exercicioCarregaLombarCustom(nome) { return exercicioCarregaLombar(nome); } }

// Retorna o nível (0–3) de carga da lombar para um exercício
function nivelCargaLombar(nomeExercicio) {
    const n = normalizeText(nomeExercicio || '');
    if (!n) return 0;
    const cat = catalogInfoCustom(nomeExercicio);
    // Sobrescrita explícita: se o exercício tem cargaLombarNivel, usa ele
    if (cat && cat.cargaLombarNivel != null) return Number(cat.cargaLombarNivel);
    if (cat && cat.cargaLombar === false) return 0;
    // Sobrescrita por nome explícito do catálogo
    for (const [nome, nivel] of Object.entries(LOMBAR_NIVEL)) {
        if (n.includes(normalizeText(nome))) return nivel;
    }
    // Exclusões (máquina guiada)
    if (LOMBAR_EXCLUSAO.some(re => re.test(n))) return 0;
    // Se tem tag de dobradiça de quadril, começa com moderado
    const tags = exerciseTags(nomeExercicio);
    if (tags.includes('dobradica')) return 2;
    // Regex por nível
    for (let nivel = 3; nivel >= 1; nivel--) {
        if (LOMBAR_REGEX_NIVEL[nivel].test(n)) return nivel;
    }
    return 0;
}

function exercicioCarregaLombar(nomeExercicio) {
    return nivelCargaLombar(nomeExercicio) >= 1;
}

// Estado da região da lombar (sem meta de séries)
// Retorna { label, icon, pct, last, seriesNaSessao, nivelMedio, horasRestantes, dica, carregada, nivelPeso }
function regiaoLombarState(allLogs, nowMs) {
    const now = (nowMs != null) ? nowMs : Date.now();
    const logs = (allLogs || []).filter(l => l && l.kind !== 'corrida' && nivelCargaLombar(l.exercise) >= 1);
    if (!logs.length) {
        return {
            label: 'LIVRE',
            icon: '✅',
            badge: 'bg-emerald-950 text-emerald-400 border-emerald-800',
            bar: 'bg-emerald-500',
            border: 'border-emerald-500/60',
            pct: 100,
            carregada: false,
            horasRestantes: 0,
            horasNecessarias: 0,
            last: '',
            seriesNaSessao: 0,
            cargaTotal: 0,
            nivelPeso: 0,
            nivelMedio: 0,
            dica: 'Lombar descansada — você pode fazer exercícios que exigem a região hoje.'
        };
    }
    // Agrupa por data para achar a última sessão que carregou
    const porData = {};
    logs.forEach(l => {
        if (!porData[l.date]) porData[l.date] = { date: l.date, exercicios: new Set(), series: 0, cargaTotal: 0, niveis: [] };
        const nivel = nivelCargaLombar(l.exercise);
        porData[l.date].exercicios.add(l.exercise);
        const sets = (Array.isArray(l.sets) && l.sets.length) ? l.sets.length
            : (Array.isArray(l.reps) ? l.reps.length : 0);
        porData[l.date].series += sets;
        porData[l.date].cargaTotal += sets * (LOMBAR_HORAS_POR_SERIE[nivel] || 0);
        for (let s = 0; s < sets; s++) porData[l.date].niveis.push(nivel);
    });
    const datas = Object.keys(porData).sort().reverse();
    const ultimaData = datas[0];
    const sessao = porData[ultimaData];
    const dataMs = new Date(ultimaData + 'T12:00:00').getTime();
    const horasPassadas = (now - dataMs) / 36e5;
    const nivelMax = Math.max(0, ...sessao.niveis);
    const nivelMedio = sessao.series > 0 ? Math.round(sessao.niveis.reduce((a, b) => a + b, 0) / sessao.series * 10) / 10 : 0;
    // Janela: base + carga calculada por série, com mínimo maior se tem exercício pesado
    const horasNecessarias = LOMBAR_HORAS_BASE + sessao.cargaTotal + (nivelMax >= 3 ? 12 : nivelMax >= 2 ? 6 : 0);
    const horasRestantes = Math.max(0, horasNecessarias - horasPassadas);
    const pct = Math.max(2, Math.min(100, Math.round(horasPassadas / horasNecessarias * 100)));
    let label, icon, badge, bar, border, dica;
    if (pct < 33 || nivelMax === 3) {
        label = 'MUITO CARREGADA';
        icon = '⚠️';
        badge = 'bg-red-950 text-red-400 border-red-800';
        bar = 'bg-red-500';
        border = 'border-red-600/60 shadow-lg shadow-red-950/40';
        dica = 'Hoje: PREFIRA Hack, Extensora, Cadeira Flexora, Puxada na Polia, Supino Máquina. EVITE COMPLETAMENTE Terra, Agachamento Livre, Stiff ou qualquer dobradiça de quadril pesada.';
    } else if (pct < 100 || nivelMedio >= 1.5) {
        label = 'RECUPERANDO';
        icon = '⏳';
        badge = 'bg-amber-950 text-amber-400 border-amber-800';
        bar = 'bg-amber-500';
        border = 'border-amber-500/60 shadow-lg shadow-amber-950/40';
        dica = 'Lombar ainda recuperando: se for fazer exercício que usa a região, priorize CARGA LEVE e técnica PERFEITA, ou opte por máquinas guiadas que apoiam a coluna.';
    } else {
        label = 'LIVRE';
        icon = '✅';
        badge = 'bg-emerald-950 text-emerald-400 border-emerald-800';
        bar = 'bg-emerald-500';
        border = 'border-emerald-500/60';
        dica = 'Lombar descansada — você pode fazer exercícios que exigem a região hoje.';
    }
    const dataLegivel = new Date(ultimaData + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const diasPassados = Math.floor(horasPassadas / 24);
    const quando = diasPassados === 0 ? 'hoje' : diasPassados === 1 ? 'ontem' : `há ${diasPassados} dias`;
    const listaExercicios = [...sessao.exercicios].slice(0, 2).join(' + ');
    const last = `${listaExercicios} — ${quando}, ${sessao.series} séries (${dataLegivel})`;
    let descricaoPeso;
    if (nivelMax === 3) descricaoPeso = 'carga MUITO ALTA na lombar';
    else if (nivelMax === 2) descricaoPeso = 'carga moderada na lombar';
    else if (nivelMax === 1) descricaoPeso = 'carga leve na lombar';
    else descricaoPeso = '';
    return {
        label, icon, badge, bar, border, pct,
        carregada: pct < 100,
        horasPassadas: Math.round(horasPassadas),
        horasRestantes: Math.round(horasRestantes),
        horasNecessarias: Math.round(horasNecessarias),
        last,
        seriesNaSessao: sessao.series,
        cargaTotal: Math.round(sessao.cargaTotal * 10) / 10,
        nivelMax,
        nivelMedio,
        nivelPeso: descricaoPeso,
        ultimaData,
        dica
    };
}

// Penaliza um treino no score se ele tiver exercícios que carregam a lombar
// quando a região não está livre
function aplicaPenalidadeLombar(score, treino, estadoLombar) {
    if (!estadoLombar || !estadoLombar.carregada) return { score, penalidade: 0 };
    const exercicios = (treino && treino.exercises) || [];
    let penalidadeTotal = 0;
    let qtdCarregaLombar = 0;
    let qtdPesado = 0;
    exercicios.forEach(e => {
        const nivel = nivelCargaLombar(e && e.exercise);
        if (nivel >= 1) {
            qtdCarregaLombar++;
            if (nivel >= 2) qtdPesado++;
            // Penalidade maior para exercícios mais pesados
            penalidadeTotal += (100 - estadoLombar.pct) * (0.8 + nivel * 0.4);
        }
    });
    if (qtdCarregaLombar === 0) return { score, penalidade: 0 };
    const penalidade = Math.round(penalidadeTotal);
    return { score: score - penalidade, penalidade, qtdCarregaLombar, qtdPesado };
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
        ATIVACAO_NOMES,
    MUSCLE_SIZE_RANK,
    STABILIZER_GROUPS,
    isAtivacaoExercise,
    classifyExercicio,
    faseDe,
    bisetBlockRanges,
    blockPattern,
    rangeUsaComoApoio,
    orderWorkoutExercises,
    assistenteTodayISO,
    weeklySetsByMuscle,
    fatigueState,
    diasDesdeUltimoTreino,
    suggestNextWorkout,
    seriesIndiretasSemana,
    weeklyGaps,
    LOMBAR_HORAS_POR_SERIE,
    LOMBAR_HORAS_BASE,
    LOMBAR_NIVEL,
    LOMBAR_REGEX_NIVEL,
    LOMBAR_EXCLUSAO,
    nivelCargaLombar,
    exercicioCarregaLombar,
    regiaoLombarState,
    aplicaPenalidadeLombar
    };
    g.__diarioExports = Object.assign(g.__diarioExports || {}, exports_);
    g.__diarioExportFiles = Object.assign(g.__diarioExportFiles || {}, { "js/assistente.js": Object.keys(exports_).length });
})(typeof window !== 'undefined' ? window : globalThis);
