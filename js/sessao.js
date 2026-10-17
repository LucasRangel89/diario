/* ============================================================
   SESSÃO — treino ao vivo, cronômetro e efeitos do boss
   ------------------------------------------------------------
   Renderização da sessão (unidades, aquecimento, anilhas, registro),
   cronômetro dos descansos, bi-sets do rascunho e os efeitos visuais
   (vibração, bipe, número de dano) — estavam no meio de js/app.js.

   Dividido de js/app.js na refatoração R2 — as funções foram movidas
   sem alterar uma linha de lógica. Quem abre/fecha a sessão e escreve
   o estado (startSession/endSession) continua no app.
   ============================================================ */

import { CATALOG_TIPOS, MUSCLE_WEIGHT, catalogInfo, detectAutoPR, duplaProgressao, formatLoadText, formatPlates, formatRepsText, logVolumeKg, normalizeMuscle } from './catalogo.js';
import { bisetBlockRanges, exercicioCarregaLombar, fatigueState, regiaoLombarState, suggestNextWorkout, weeklySetsByMuscle } from './assistente.js';
import { rankFromXP } from './gamificacao.js';
import { saveLogsToStorage } from './persistencia.js';
import { activeGameThemeId, activeSession, alertModal, computeXPCtx, draftExercises, escapeHtml, fieldsHTML, fmtN, getTodayLocalISO, initSetEditor, lastPerformanceHTML, logs, newLogId, readFields, refreshAll, renderDraftList, savedWorkouts, settings, setEditorState, shakeElement, snapshotDrafts, stopSessionTimer, timer, userBodyweight } from './app.js';

// ============================ UNIDADES DA SESSÃO ============================
// Unidade = exercício único ou par de bi-set. Cada exercício ganha um uid
// estável no primeiro render: o estado de expansão é guardado por unidade
// (e não por índice), então reordenar não troca qual cartão está aberto.
// Recolher/abrir NÃO redesenha o DOM — os campos continuam montados porque
// readFields()/snapshotDrafts() dependem deles (inclusive uma série parcial).
let _sessionUidSeq = 0;
function ensureSessionUids(ex) {
    (ex || []).forEach(e => { if (!e.uid) e.uid = 'su' + (++_sessionUidSeq); });
}
function sessionUnits(ex) {
    ensureSessionUids(ex);
    const units = [];
    for (let i = 0; i < ex.length; i++) {
        const pair = !!(ex[i + 1] && ex[i + 1].biset);
        const idxs = pair ? [i, i + 1] : [i];
        if (pair) i++;
        units.push({ uid: ex[idxs[0]].uid, idxs, pair, pending: idxs.filter(k => !ex[k].done) });
    }
    return units;
}
function applySessionUnitExpansion() {
    const listEl = document.getElementById('session-exercises-list');
    if (!listEl || !activeSession) return;
    listEl.querySelectorAll('[data-unit-uid]').forEach(card => {
        const open = card.getAttribute('data-unit-uid') === activeSession.openUid;
        const body = card.querySelector('[data-unit-body]');
        const btn = card.querySelector('[data-action="toggleSessionUnit"]');
        if (body) body.classList.toggle('hidden', !open);
        if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
}
function toggleSessionUnit(uid) {
    if (!activeSession) return;
    // Só alterna classes/aria: nada de recriar o DOM a cada toque.
    activeSession.openUid = activeSession.openUid === uid ? null : uid;
    applySessionUnitExpansion();
}

// opts.skipSnapshot: usado quando os índices do DOM não correspondem mais à
// ordem de activeSession.exercises (reordenação) — o rascunho já foi capturado
// com o mapeamento correto antes da troca e um re-snapshot aqui embaralharia
// os drafts entre exercícios.
function renderSession(opts) {
    if (!activeSession) return;

    document.getElementById('session-title').textContent = activeSession.name;

    const ex = activeSession.exercises;
    ensureSessionUids(ex);
    const total = ex.length;
    const doneCount = ex.filter(e => e.done).length;
    document.getElementById('session-progress-text').textContent = `${doneCount} / ${total} exercícios`;
    document.getElementById('session-progress-bar').style.width = total > 0 ? `${(doneCount / total) * 100}%` : '0%';

    let sessionVol = 0;
    ex.forEach(e => {
        if (e.done && e.logId) {
            const lg = logs.find(x => x.id === e.logId);
            if (lg) sessionVol += logVolumeKg(lg, userBodyweight);
        }
    });
    document.getElementById('session-volume-text').textContent = `${fmtN(Math.round(sessionVol))} kg movidos na sessão`;

    if (!(opts && opts.skipSnapshot)) snapshotDrafts();
    const listEl = document.getElementById('session-exercises-list');
    const nowMs = Date.now();
    const weekly = weeklySetsByMuscle(logs, getTodayLocalISO());
    const lombarEstado = regiaoLombarState(logs, nowMs);

    const units = sessionUnits(ex);
    // Expansão por unidade: undefined = 1º render (abre a primeira pendente);
    // depois preserva a escolha do usuário (inclusive "tudo recolhido") e só
    // remonta se a unidade aberta saiu da sequência.
    const abertas = units.filter(u => u.pending.length);
    const uidValido = activeSession.openUid != null && abertas.some(u => u.uid === activeSession.openUid);
    if (activeSession.openUid === undefined || (activeSession.openUid != null && !uidValido)) {
        activeSession.openUid = abertas.length ? abertas[0].uid : null;
    }

    // Linha compacta de exercício concluído (mantém ✏️ Editar; Extra ganha selo)
    const doneRowHTML = (e) => {
        const lg = logs.find(x => x.id === e.logId);
        return `<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div class="flex items-center gap-2 flex-wrap min-w-0">
                    <span class="w-6 h-6 flex items-center justify-center rounded-md text-xs font-bold shrink-0 bg-emerald-600 text-white">✔</span>
                    <span class="text-xs font-bold px-1.5 py-0.5 bg-berzerker-border text-berzerker-500 rounded uppercase">${escapeHtml(e.muscle)}</span>
                    <span class="font-bold text-white text-sm">${escapeHtml(e.exercise)}</span>
                    ${e.extra ? '<span class="text-xs font-bold px-1.5 py-0.5 bg-violet-950 text-violet-300 border border-violet-600/60 rounded uppercase">Extra</span>' : ''}
                    ${e.loggedPR ? '<span class="text-xs font-bold px-1.5 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-700 rounded">🏆 PR</span>' : ''}
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    <span class="text-xs font-bold text-emerald-400 font-mono min-w-0 sm:whitespace-nowrap">${lg ? formatLoadText(lg) + ' × ' + formatRepsText(lg) : ''}</span>
                    <button type="button" data-action="editLog" data-args="[${e.logId}]" class="min-h-[44px] px-2.5 py-1.5 bg-berzerker-border hover:bg-gray-700 text-white text-xs font-bold rounded-lg transition-colors">✏️ Editar</button>
                </div>
            </div>
            ${lg && lg.notes ? `<p class="text-xs text-gray-400 mt-1.5 italic">📝 ${escapeHtml(lg.notes)}</p>` : ''}`;
    };

    // Corpo da unidade pendente: alertas + campos (carga/reps à vista; o resto
    // em "Mais detalhes", sem perder tipo/modo, séries, RIR, técnica, obs,
    // aquecimento e anilhas — estes últimos com handlers da sessão, que leem
    // s${i}-w e não o campo global w do Registro rápido).
    const pendingBodyHTML = (e, i) => {
        const d = e.draft || { weight: e.weight, repsText: e.repsText, type: e.type, technique: e.technique, nextGoal: '', isPR: false, notes: '' };
        const catInfo = catalogInfo(e.exercise);
        const fat = fatigueState(e.muscle, logs.filter(l => l.kind !== 'corrida' && l.muscle === e.muscle), weekly[e.muscle] || 0, nowMs, null, settings.weeklySeriesRanges);
        const tipoInfo = CATALOG_TIPOS[d.type || e.type || 'carga_total'];
        return `
            ${e.orderReason ? `<div class="text-xs text-gray-400 leading-relaxed"><span class="text-berzerker-500 font-bold">📌 Por que nesta posição:</span> ${escapeHtml(e.orderReason)}</div>` : ''}
            ${fat.pct !== null && fat.pct < 100 ? `<div class="text-xs text-amber-400/90 font-mono">⏳ ${escapeHtml(e.muscle)} ainda em recuperação estimada (${fat.pct}%) — considere uma carga mais leve</div>` : ''}
            ${exercicioCarregaLombar(e.exercise) && lombarEstado.carregada ? `<div class="text-xs text-red-400/90 font-mono">⚠️ Este exercício exige a lombar — ainda carregada (${lombarEstado.horasRestantes}h restantes): priorize técnica perfeita e carga mais leve</div>` : ''}
            ${catInfo && catInfo.descanso ? `<div class="text-xs text-gray-400 font-mono">⏱ Descanso do catálogo: ${catInfo.descanso}s · faixa ${catInfo.faixa[0]}–${catInfo.faixa[1]}${catInfo.tipo === 'isometria' ? ' s' : ' reps'}</div>` : ''}
            ${lastPerformanceHTML(e.exercise)}
            ${fieldsHTML(`s${i}-`, d, {
            quickCapture: true,
            warmupTools: { warmupAction: 'showWarmupFor', warmupArgs: [i], platesAction: 'showPlatesFor', platesArgs: [i] },
            hints: {
                type: tipoInfo ? tipoInfo.hint : '',
                faixa: catInfo && catInfo.faixa && catInfo.faixa[1] > 0
                    ? `Faixa do exercício: ${catInfo.faixa[0]}–${catInfo.faixa[1]} ${catInfo.tipo === 'isometria' ? 's' : 'reps'} · descanso ${catInfo.descanso}s`
                    : 'Exercício fora do catálogo — dupla progressão indisponível.'
            }
        })}`;
    };

    const unitHTML = (u) => {
        const open = activeSession.openUid === u.uid;
        const temPendente = u.pending.length > 0;
        if (!temPendente) {
            // concluída → cartão compacto, sem formulário
            return `<div class="rounded-xl border border-emerald-600/50 bg-emerald-950/10 p-3 space-y-1.5">
                ${u.pair ? '<div class="text-xs font-bold text-cyan-400 uppercase tracking-wider">🔗 BI-SET</div>' : ''}
                ${u.idxs.map(k => doneRowHTML(ex[k])).join('<div class="border-t border-dashed border-berzerker-border"></div>')}
            </div>`;
        }
        const numero = u.pair ? u.idxs.map(k => k + 1).join('+') : String(u.idxs[0] + 1);
        const titulos = u.idxs.map(k => `<span class="flex items-center gap-2 min-w-0">
                        <span class="text-xs font-bold px-1.5 py-0.5 bg-berzerker-border text-berzerker-500 rounded uppercase shrink-0">${escapeHtml(ex[k].muscle)}</span>
                        <span class="font-bold text-white text-sm truncate">${escapeHtml(ex[k].exercise)}</span>
                    </span>`).join('');
        const metas = u.idxs.map(k => `<span class="text-xs text-gray-400 font-mono min-w-0 sm:whitespace-nowrap">🎯 ${ex[k].weight > 0 ? ex[k].weight + ' kg' : '—'} × (${escapeHtml(ex[k].repsText || '—')})</span>`).join('');
        return `<div class="rounded-xl border ${u.pair ? 'border-cyan-500/60 bg-berzerker-dark' : 'border-berzerker-border bg-berzerker-dark'}" data-unit-uid="${u.uid}">
            <div class="flex items-center gap-1.5 p-2.5">
                <button type="button" data-action="toggleSessionUnit" data-args='["${u.uid}"]' aria-expanded="${open ? 'true' : 'false'}" aria-controls="sunit-${u.uid}" class="flex-1 min-w-0 flex items-center gap-2 min-h-[44px] text-left rounded-lg px-2 py-1.5 hover:bg-berzerker-border/40">
                    <span class="w-6 h-6 flex items-center justify-center rounded-md text-xs font-bold shrink-0 bg-berzerker-border text-gray-300">${numero}</span>
                    <span class="flex flex-col sm:flex-row sm:items-center gap-x-2 gap-y-0.5 min-w-0 flex-1">
                        ${titulos}
                        <span class="flex flex-wrap items-center gap-x-2 gap-y-0.5">${metas}
                            <span class="text-xs font-bold text-amber-300 whitespace-nowrap">⏳ Pendente</span>
                        </span>
                    </span>
                </button>
                <button type="button" data-action="moveSessionUnit" data-args="[${u.idxs[0]},-1]" title="Subir na ordem" aria-label="Subir exercício na ordem" class="min-h-[44px] min-w-[44px] px-2 py-2 text-sm font-bold bg-berzerker-border text-gray-300 rounded-md hover:bg-gray-700">▲</button>
                <button type="button" data-action="moveSessionUnit" data-args="[${u.idxs[0]},1]" title="Descer na ordem" aria-label="Descer exercício na ordem" class="min-h-[44px] min-w-[44px] px-2 py-2 text-sm font-bold bg-berzerker-border text-gray-300 rounded-md hover:bg-gray-700">▼</button>
            </div>
            <div id="sunit-${u.uid}" data-unit-body class="px-2.5 pb-3 space-y-3${open ? '' : ' hidden'}">
                ${u.pair ? '<div class="text-xs font-bold text-cyan-400 uppercase tracking-wider">🔗 BI-SET — os dois juntos; o descanso começa depois do par</div>' : ''}
                ${u.idxs.map(k => ex[k].done ? doneRowHTML(ex[k]) : pendingBodyHTML(ex[k], k)).join('<div class="border-t border-dashed border-berzerker-border"></div>')}
                <div class="flex justify-end"><button type="button" data-action="registerSessionUnit" data-args="[[${u.pending.join(',')}],${u.pair}]" class="min-h-[44px] px-4 py-2.5 bg-berzerker-600 hover:bg-berzerker-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors">✔ Registrar${u.pending.length > 1 ? ' Bi-set' : ''}</button></div>
            </div>
        </div>`;
    };

    let html = '';
    if (activeSession.ordenado) {
        html += `<div class="text-xs text-gray-400 bg-berzerker-dark border border-berzerker-border rounded-lg px-3 py-2">✨ <b class="text-white">Ordem sugerida aplicada</b> — cada exercício mostra o porquê da posição. Use ▲▼ para trocar quando quiser (o bi-set anda junto).</div>`;
    }
    // Aviso de lombar carregada no topo da sessão
    const temExercicioLombar = ex.some(e => !e.done && exercicioCarregaLombar(e.exercise));
    if (lombarEstado.carregada && temExercicioLombar) {
        html += `<div class="text-xs bg-red-950/40 border border-red-600/50 rounded-lg px-3 py-2 text-red-300">⚠️ <b>Sua lombar ainda está ${lombarEstado.label.toLowerCase()} (${lombarEstado.pct}% de prontidão estimada, ${lombarEstado.horasRestantes}h restantes).</b> ${escapeHtml(lombarEstado.dica)}</div>`;
    }
    html += units.map(unitHTML).join('');
    listEl.innerHTML = html;

    // Reanexa editores série a série
    ex.forEach((e, i) => {
        if (e.done) return;
        const d = e.draft || {};
        initSetEditor(`s${i}-`, { mode: d.mode || 'simple', sets: d.sets, weight: d.weight != null ? d.weight : e.weight });
    });

    // Sessão completa → sugestão do próximo treino (Fase 3)
    const banner = document.getElementById('session-next-hint');
    if (banner) {
        if (total > 0 && doneCount === total) {
            const scored = suggestNextWorkout(savedWorkouts, logs, Date.now(), settings.weeklySeriesRanges);
            const top = scored[0];
            banner.classList.remove('hidden');
            banner.innerHTML = top
                ? `<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div class="min-w-0">
                            <div class="text-xs font-bold text-emerald-400 uppercase tracking-wider">✅ Treino completo! Próximo treino sugerido:</div>
                            <div class="font-oswald text-lg font-bold text-white uppercase mt-0.5">${escapeHtml(top.w.name)}</div>
                            <div class="text-xs text-gray-400 mt-0.5">Por quê: ${escapeHtml(top.motivos.slice(0, 2).join(' · '))}</div>
                        </div>
                        <button data-action="startSession" data-args="[${top.w.id}]" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg whitespace-nowrap">▶ Começar este treino</button>
                    </div>`
                : `<div class="text-xs text-emerald-400 font-bold">✅ Treino completo! Bom trabalho.</div>`;
        } else {
            banner.classList.add('hidden');
            banner.innerHTML = '';
        }
    }

    // Opção "Contar no treino em andamento" do Registro rápido acompanha a sessão
    updateSessionExtraHint();
}


// Troca blocos da sessão (bi-set anda junto) — liberdade total sobre a ordem sugerida
function moveSessionUnit(i, dir) {
    if (!activeSession) return;
    snapshotDrafts();
    const ex = activeSession.exercises;
    const ranges = bisetBlockRanges(ex);
    const bi = ranges.findIndex(r => r.includes(i));
    const j = bi + dir;
    if (bi < 0 || j < 0 || j >= ranges.length) return;
    const tmp = ranges[bi]; ranges[bi] = ranges[j]; ranges[j] = tmp;
    activeSession.exercises = ranges.flat().map(k => ex[k]);
    // openUid anda com o objeto (uid estável): a unidade aberta continua a mesma.
    // skipSnapshot: os drafts já foram capturados com os índices corretos.
    renderSession({ skipSnapshot: true });
}
function showWarmupFor(i) {
    const e = activeSession.exercises[i];
    const w = parseFloat(document.getElementById(`s${i}-w`)?.value) || e.weight || 0;
    const box = document.getElementById(`s${i}-warmup-quick-box`);
    const content = document.getElementById(`s${i}-warmup-quick-content`);
    if (!box || !content) return;
    box.classList.remove('hidden');
    if (w <= 0) { content.innerHTML = 'Informe uma carga para ver o aquecimento.'; return; }
    content.innerHTML = `🔥 <b>Aquecimento para ${w} kg:</b><br>• 50% (${Math.round(w * 0.5)} kg) × 10<br>• 70% (${Math.round(w * 0.7)} kg) × 6<br>• 85% (${Math.round(w * 0.85)} kg) × 3<br>• 100% (${w} kg) × trabalho`;
}
function showPlatesFor(i) {
    const e = activeSession.exercises[i];
    const w = parseFloat(document.getElementById(`s${i}-w`)?.value) || e.weight || 0;
    const box = document.getElementById(`s${i}-warmup-quick-box`);
    const content = document.getElementById(`s${i}-warmup-quick-content`);
    if (!box || !content) return;
    const cat = catalogInfo(e.exercise);
    const ehMaquina = cat && /leg press|hack|smith/i.test(e.exercise);
    const base = ehMaquina ? settings.sledWeight : settings.barWeight;
    box.classList.remove('hidden');
    content.innerHTML += (content.innerHTML ? '<br>' : '') + `⚙️ <b>${w} kg</b> = ${formatPlates(w, base)}${ehMaquina ? ' (carrinho)' : ''}`;
}
function registerSessionUnit(idxs, isPair) {
    if (!activeSession) return;
    const date = document.getElementById('log-date').value || getTodayLocalISO();
    const items = idxs.map(i => ({ item: activeSession.exercises[i], f: readFields(`s${i}-`) }));
    const bad = items.find(x => x.f.mode === 'sets' ? x.f.sets.length === 0 : x.f.reps.length === 0);
    if (bad) {
        alertModal(`Digite ao menos uma repetição válida em \"${bad.item.exercise}\".`);
        // Erro: mantém/abre a unidade afetada — sem log, sem progresso e sem descanso.
        const alvo = sessionUnits(activeSession.exercises).find(u => u.idxs.some(k => idxs.includes(k)));
        if (alvo) { activeSession.openUid = alvo.uid; applySessionUnitExpansion(); }
        return;
    }

    let anyPR = false;
    let totalDmg = 0;
    items.forEach(({ item, f }) => {
        const id = newLogId();
        // Grupo canônico derivado do catálogo (o treino salvo pode trazer um
        // grupo antigo: a Mesa Flexora de "Pernas" conta em Posterior).
        const catItem = catalogInfo(item.exercise);
        const newLog = {
            id, date, kind: 'peso', muscle: normalizeMuscle(catItem ? catItem.grupo : item.muscle), exercise: item.exercise,
            xpTheme: activeGameThemeId, ...f, ...(isPair ? { biset: true } : {})
        };
        if (!newLog.sessao) newLog.sessao = activeSession.name;
        newLog.isPR = detectAutoPR(newLog, logs, userBodyweight);
        const prog = duplaProgressao(newLog);
        if (prog && !newLog.nextGoal) newLog.nextGoal = '📈 Aumentar Carga';
        logs.unshift(newLog);
        if (newLog.isPR) anyPR = true;
        totalDmg += logVolumeKg(newLog, userBodyweight) * (newLog.isPR ? 2 : 1);
        Object.assign(item, { done: true, logId: id, loggedWeight: f.weight, loggedReps: f.reps, loggedPR: newLog.isPR, draft: null });
    });
    saveLogsToStorage();
    document.getElementById('filter-date').value = date;
    refreshAll();
    // Registro válido: a unidade concluída fica compacta e a próxima pendente abre.
    const unidades = sessionUnits(activeSession.exercises);
    const depois = Math.max.apply(null, idxs);
    const proxima = unidades.find(u => u.pending.length && Math.min.apply(null, u.idxs) > depois)
        || unidades.find(u => u.pending.length);
    activeSession.openUid = proxima ? proxima.uid : null;
    renderSession();

    // Descanso automático: no bi-set só depois do par; caso contrário, ao registrar a série
    const muscle = items[0].item.muscle;
    const cat = catalogInfo(items[0].item.exercise);
    const rest = cat && cat.descanso ? cat.descanso : settings.restDefault;
    if (!isPair || items.length > 1) {
        stopSessionTimer(); // novo descanso, não soma ao restante da última série
        addSessionTimer(rest);
    }
    if (anyPR) { shakeElement(document.getElementById('active-session-card')); spawnDamageFloat(totalDmg, true); }
    else spawnDamageFloat(totalDmg, false);
}


// ==================== EXERCÍCIO EXTRA NO TREINO EM ANDAMENTO ====================
// Enquanto há sessão ativa, o Registro rápido pode contar o registro como item
// EXTRA concluído da sequência. O log é o mesmo do histórico (nunca um segundo
// log); o vínculo é pelo id do log recém-criado — nunca por nome — e o mesmo
// logId não é anexado duas vezes. Não toca em treinos salvos nem em backup.
function appendSessionExtra(log) {
    if (!activeSession || !log || log.id == null) return false;
    if (activeSession.exercises.some(e => e.logId === log.id)) return false;
    activeSession.exercises.push({
        muscle: log.muscle, exercise: log.exercise, type: log.type || 'carga_total',
        weight: log.weight || 0,
        repsText: log.repsText || (Array.isArray(log.reps) ? log.reps.join(', ') : ''),
        technique: log.technique || 'Convencional',
        biset: false, extra: true, done: true, logId: log.id, draft: null,
        loggedWeight: log.weight || 0, loggedReps: log.reps || null, loggedPR: !!log.isPR,
        orderReason: ''
    });
    return true;
}

// Opção "Contar no treino em andamento" do Registro rápido: visível só com
// sessão ativa. O aviso explica quando o nome bate com um item planejado
// pendente — a correspondência por nome nunca marca o item planejado.
function updateSessionExtraHint() {
    const wrap = document.getElementById('log-session-extra-wrap');
    const note = document.getElementById('log-session-match-note');
    if (!wrap) return;
    if (!activeSession) {
        wrap.classList.add('hidden');
        if (note) { note.classList.add('hidden'); note.textContent = ''; }
        return;
    }
    wrap.classList.remove('hidden');
    if (!note) return;
    const exName = String(document.getElementById('log-exercise')?.value || '').trim();
    const nome = exName.toLowerCase();
    const pendenteIgual = !!nome && activeSession.exercises.some(e =>
        !e.done && !e.extra && String(e.exercise || '').trim().toLowerCase() === nome);
    if (pendenteIgual) {
        note.classList.remove('hidden');
        note.textContent = `⚠️ \"${exName}\" já está pendente no treino em andamento. Este registro NÃO conclui o item planejado (use o ✔ Registrar do cartão dele para isso). Escolha: mantenha \"Contar no treino em andamento\" marcado para incluir um item Extra distinto, ou desmarque para deixar o registro só no histórico.`;
    } else {
        note.classList.add('hidden');
        note.textContent = '';
    }
}


// Concluir uma série preserva o rascunho; só Registrar conclui o exercício.
function completeSessionSet(prefix, rowIndex, rest = true) {
    const match = /^s(\d+)-$/.exec(prefix);
    const index = match ? Number(match[1]) : -1;
    const item = activeSession?.exercises[index];
    if (!item || item.done) return;
    snapshotDrafts();
    setEditorState[prefix] = item.draft?.sets || [];
    const row = setEditorState[prefix]?.[rowIndex];
    if (!row || row.completed) return;
    if (!(row.reps > 0) || !Number.isFinite(row.reps) || row.weight < 0 || !Number.isFinite(row.weight)) {
        alertModal('Preencha carga e repetições válidas antes de concluir a série.');
        return;
    }
    row.completed = true;
    if (item.draft?.sets?.[rowIndex]) item.draft.sets[rowIndex].completed = true;
    const button = document.querySelector(`[data-action="completeSessionSet"][data-args='${JSON.stringify([prefix, rowIndex])}']`);
    if (button) button.textContent = '✓ Série concluída';
    if (!rest) return;
    // Em bi-set, só inicia depois de ambos os exercícios da rodada.
    const unit = sessionUnits(activeSession.exercises).find(u => u.idxs.includes(index));
    if (unit?.pair && !unit.idxs.every(k => activeSession.exercises[k].done || setEditorState[`s${k}-`]?.[rowIndex]?.completed)) return;
    stopSessionTimer();
    const cat = catalogInfo(item.exercise);
    addSessionTimer(cat?.descanso || settings.restDefault);
}

function openRestControls() {
    const controls = document.getElementById('session-rest-controls');
    controls?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
}

// ============================ CRONÔMETRO POR HORÁRIO DE TÉRMINO ============================
function timerRemainingMs() {
    if (timer.running && timer.endsAt) return Math.max(0, timer.endsAt - Date.now());
    return Math.max(0, timer.remainingMs);
}
function updateSessionTimerDisplay() {
    const ms = timerRemainingMs();
    const totalS = Math.ceil(ms / 1000);
    const m = Math.floor(totalS / 60).toString().padStart(2, '0');
    const s = (totalS % 60).toString().padStart(2, '0');
    const el = document.getElementById('session-timer-display');
    if (el) el.textContent = `${m}:${s}`;
    const compact = document.getElementById('session-rest-compact');
    if (compact) {
        compact.hidden = !activeSession || ms <= 0;
        compact.textContent = `⏱ ${m}:${s}${timer.running ? '' : ' · pausado'} · controles`;
    }
}
function addSessionTimer(sec) {
    const addMs = sec * 1000;
    if (timer.running && timer.endsAt) {
        timer.endsAt += addMs;
    } else {
        timer.remainingMs = timerRemainingMs() + addMs;
    }
    updateSessionTimerDisplay();
    if (!timer.running) toggleSessionTimer(); // começa a contagem
}
function toggleSessionTimer() {
    const btn = document.getElementById('session-timer-btn');
    if (timer.running) {
        // pausa: congela o restante
        timer.remainingMs = timerRemainingMs();
        timer.running = false;
        timer.endsAt = null;
        if (timer.interval) clearInterval(timer.interval);
        timer.interval = null;
        if (btn) {
            btn.textContent = 'Retomar';
            btn.className = 'px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold uppercase rounded-lg transition-colors';
        }
        return;
    }
    if (timerRemainingMs() <= 0) {
        alertModal('Escolha um tempo de descanso!');
        return;
    }
    timer.endsAt = Date.now() + timerRemainingMs(); // horário de término fixo
    timer.running = true;
    if (btn) {
        btn.textContent = 'Pausar';
        btn.className = 'px-3 py-2 bg-berzerker-600 hover:bg-berzerker-500 text-white text-xs font-bold uppercase rounded-lg transition-colors';
    }
    if (timer.interval) clearInterval(timer.interval);
    timer.interval = setInterval(tickSessionTimer, 500);
    tickSessionTimer();
}
function tickSessionTimer() {
    updateSessionTimerDisplay();
    if (timer.running && timerRemainingMs() <= 0) {
        stopSessionTimer();
        playBeepSound();
        vibrate([200, 100, 200, 100, 400]);
        alertModal('⚡ FIM DO DESCANSO! DE VOLTA À BATALHA!');
    }
}
function vibrate(pattern) {
    try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) { }
}
function playBeepSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
    } catch (e) { }
}


// ============================ DANO FLUTUANTE ============================
function spawnDamageFloat(dmg, crit) {
    const anchor = document.getElementById('stat-boss-dmg');
    if (!anchor || dmg <= 0) return;
    const rect = anchor.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = `dmg-float ${crit ? 'dmg-crit' : ''}`;
    el.textContent = `-${Math.round(dmg).toLocaleString('pt-BR')} DMG${crit ? ' 💥 CRÍTICO' : ''}`;
    el.style.left = `${rect.left + rect.width / 2}px`;
    el.style.top = `${rect.top}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1400);
}


// ============================ BUILDER DE TREINO ============================
function normalizeBisets(arr) {
    arr.forEach((e, i) => { if (i === 0 || arr[i - 1].biset) e.biset = false; });
}
function pairLink(i) {
    const d = draftExercises, e = d[i];
    if (e.biset) return `<button data-action="toggleDraftBiset" data-args="[${i}]" class="ml-5 text-xs font-bold text-gray-400 hover:text-red-400 transition-colors">✂ Desfazer bi-set</button>`;
    if (i > 0 && !d[i - 1].biset && !(d[i + 1] && d[i + 1].biset))
        return `<button data-action="toggleDraftBiset" data-args="[${i}]" class="w-full text-xs font-bold text-cyan-400 hover:bg-cyan-950/30 border border-dashed border-cyan-500/40 rounded-lg py-1.5 transition-colors">🔗 Juntar com o exercício acima em bi-set</button>`;
    return '';
}
function toggleDraftBiset(i) {
    const e = draftExercises[i];
    if (e.biset) e.biset = false;
    else if (i === 0) { alertModal('O 1º exercício não tem anterior para formar bi-set.'); return; }
    else if (draftExercises[i - 1].biset) { alertModal('O anterior já é o 2º de um bi-set (máximo 2).'); return; }
    else if (draftExercises[i + 1] && draftExercises[i + 1].biset) { alertModal('Este exercício já abre um bi-set com o próximo.'); return; }
    else e.biset = true;
    renderDraftList();
}


// ============================ MÉTRICAS / RANK DA SESSÃO ============================
function getAnimalRankForSession(targetDate) {
    const dayLogs = logs.filter(l => l.date === targetDate);
    let totalVolumeKg = 0, adjustedKg = 0, prCount = 0;

    dayLogs.forEach(l => {
        const v = logVolumeKg(l, userBodyweight);
        totalVolumeKg += v;
        adjustedKg += v * (MUSCLE_WEIGHT[l.muscle] ?? 1);
        if (l.isPR) prCount++;
    });

    const relativeRatio = userBodyweight > 0 ? (adjustedKg / userBodyweight) : 0;
    const xpData = computeXPCtx(targetDate);
    const currentRank = rankFromXP(xpData.xp);

    return {
        ...currentRank, xp: xpData.xp, xpData,
        sessionTonnage: totalVolumeKg,
        relativeRatio, prCount, dayLogs
    };
}

// ============================================================
// Manifesto de exports (mesmo padrão dos outros módulos em js/).
// ============================================================
(function (g) {
    const exports_ = {
        renderSession,
        toggleSessionUnit,
        appendSessionExtra,
        updateSessionExtraHint,
        moveSessionUnit,
        showWarmupFor,
        showPlatesFor,
        registerSessionUnit,
        completeSessionSet,
        openRestControls,
        timerRemainingMs,
        updateSessionTimerDisplay,
        addSessionTimer,
        toggleSessionTimer,
        tickSessionTimer,
        vibrate,
        playBeepSound,
        spawnDamageFloat,
        normalizeBisets,
        pairLink,
        toggleDraftBiset,
        getAnimalRankForSession,
    };
    g.__diarioExports = Object.assign(g.__diarioExports || {}, exports_);
    // Ações delegáveis (js/actions.js): toda função pública do módulo fica
    // disponível para os atributos data-action dos templates.
    const actionFns = {};
    Object.keys(exports_).forEach(k => { if (typeof exports_[k] === 'function') actionFns[k] = exports_[k]; });
    g.registerDiarioActions(actionFns);
    g.__diarioExportFiles = Object.assign(g.__diarioExportFiles || {}, { "js/sessao.js": Object.keys(exports_).length });
})(typeof window !== 'undefined' ? window : globalThis);

export { renderSession, toggleSessionUnit, appendSessionExtra, updateSessionExtraHint, moveSessionUnit, showWarmupFor, showPlatesFor, registerSessionUnit, timerRemainingMs, updateSessionTimerDisplay, addSessionTimer, toggleSessionTimer, tickSessionTimer, vibrate, playBeepSound, spawnDamageFloat, normalizeBisets, pairLink, toggleDraftBiset, getAnimalRankForSession };
