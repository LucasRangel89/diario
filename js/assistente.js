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
        const m = muscle || 'Geral';
        if (!muscleStateCache.has(m)) {
            const muscleLogs = allLogs.filter(l => l && l.kind !== 'corrida' && (l.muscle || 'Geral') === m);
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

// Séries feitas por grupo na semana atual (seg–dom), fora corrida
function weeklySetsByMuscle(allLogs, refDateISO) {
    const ref = refDateISO || assistenteTodayISO();
    const [ws, we] = isoWeekRange(ref);
    const out = {};
    (allLogs || []).forEach(l => {
        if (!l || l.kind === 'corrida') return;
        if (l.date < ws || l.date > we) return;
        const m = l.muscle || 'Geral';
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
    const base = recoveryState(muscle, muscleLogs, nowMs);
    const series = Number(weeklySets) || 0;
    const min = FAIXA_SERIES_SEMANAIS.min, max = FAIXA_SERIES_SEMANAIS.max;
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
        muscle,
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

    const scored = (Array.isArray(workouts) ? workouts : []).map(w => {
        const groups = [...new Set((w.exercises || []).map(e => e && e.muscle).filter(m => m && m !== 'Cardio'))];
        let score = 0;
        const motivos = [];
        groups.forEach(m => {
            const mLogs = (allLogs || []).filter(l => l && l.kind !== 'corrida' && l.muscle === m);
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
        if (dias >= 1) score += Math.min(dias, 7) * 5;
        return { w, score: Math.round(score), motivos, groups, diasSemTreinar: dias };
    });

    scored.sort((a, b) => (b.score - a.score)
        || String((a.w && a.w.name) || '').localeCompare(String((b.w && b.w.name) || ''), 'pt-BR'));
    return scored;
}

// O que falta para o "estímulo total" da semana (usado no montador)
function weeklyGaps(allLogs, refDateISO) {
    const weekly = weeklySetsByMuscle(allLogs, refDateISO);
    const min = FAIXA_SERIES_SEMANAIS.min, max = FAIXA_SERIES_SEMANAIS.max;
    return MUSCULOS_MAPA.map(m => {
        const series = weekly[m] || 0;
        const faltam = Math.max(0, min - series);
        const excesso = Math.max(0, series - max);
        return {
            muscle: m, series, faltam, excesso,
            status: series < min ? 'abaixo' : (series > max ? 'acima' : 'na-faixa')
        };
    }).filter(g => g.faltam > 0 || g.excesso > 0)
        .sort((a, b) => (b.faltam - a.faltam) || a.muscle.localeCompare(b.muscle, 'pt-BR'));
}
