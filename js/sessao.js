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

import { MUSCLE_WEIGHT, catalogInfo, detectAutoPR, duplaProgressao, formatLoadText, formatPlates, formatRepsText, logVolumeKg, normalizeMuscle } from './catalogo.js';
import { bisetBlockRanges, exercicioCarregaLombar, fatigueState, regiaoLombarState, suggestNextWorkout, weeklySetsByMuscle } from './assistente.js';
import { rankFromXP } from './gamificacao.js';
import { saveLogsToStorage } from './persistencia.js';
import { activeGameThemeId, activeSession, alertModal, computeXPCtx, draftExercises, escapeHtml, fieldsHTML, fmtN, getTodayLocalISO, initSetEditor, lastPerformanceHTML, logs, newLogId, readFields, refreshAll, renderDraftList, savedWorkouts, settings, shakeElement, snapshotDrafts, stopSessionTimer, timer, userBodyweight } from './app.js';

function renderSession() {
    if (!activeSession) return;

    document.getElementById('session-title').textContent = activeSession.name;

    const total = activeSession.exercises.length;
    const doneCount = activeSession.exercises.filter(e => e.done).length;
    document.getElementById('session-progress-text').textContent = `${doneCount} / ${total} exercícios`;
    document.getElementById('session-progress-bar').style.width = total > 0 ? `${(doneCount / total) * 100}%` : '0%';

    let sessionVol = 0;
    activeSession.exercises.forEach(e => {
        if (e.done && e.logId) {
            const lg = logs.find(x => x.id === e.logId);
            if (lg) sessionVol += logVolumeKg(lg, userBodyweight);
        }
    });
    document.getElementById('session-volume-text').textContent = `${fmtN(Math.round(sessionVol))} kg movidos na sessão`;

    snapshotDrafts();
    const listEl = document.getElementById('session-exercises-list');
    const ex = activeSession.exercises;
    const nowMs = Date.now();
    const weekly = weeklySetsByMuscle(logs, getTodayLocalISO());

    const itemHTML = (e, i) => {
        if (e.done) {
            const lg = logs.find(x => x.id === e.logId);
            return `<div>
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div class="flex items-center gap-2 flex-wrap min-w-0">
                        <span class="w-6 h-6 flex items-center justify-center rounded-md text-xs font-bold shrink-0 bg-emerald-600 text-white">✔</span>
                        <span class="text-xs font-bold px-1.5 py-0.5 bg-berzerker-border text-berzerker-500 rounded uppercase">${escapeHtml(e.muscle)}</span>
                        <span class="font-bold text-white text-sm">${escapeHtml(e.exercise)}</span>
                        ${e.loggedPR ? '<span class="text-xs font-bold px-1.5 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-700 rounded">🏆 PR</span>' : ''}
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-bold text-emerald-400 font-mono whitespace-nowrap">${lg ? formatLoadText(lg) + ' × ' + formatRepsText(lg) : ''}</span>
                        <button data-action="editLog" data-args="[${e.logId}]" class="px-2 py-1 bg-berzerker-border hover:bg-gray-700 text-white text-xs font-bold rounded-lg transition-colors">✏️ Editar</button>
                    </div>
                </div>
                ${lg && lg.notes ? `<p class="text-xs text-gray-400 mt-1.5 italic">📝 ${escapeHtml(lg.notes)}</p>` : ''}
            </div>`;
        }
        const d = e.draft || { weight: e.weight, repsText: e.repsText, type: e.type, technique: e.technique, nextGoal: '', isPR: false, notes: '' };
        const catInfo = catalogInfo(e.exercise);
        const fat = fatigueState(e.muscle, logs.filter(l => l.kind !== 'corrida' && l.muscle === e.muscle), weekly[e.muscle] || 0, nowMs);
        return `<div>
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div class="flex items-center gap-2 flex-wrap min-w-0">
                    <span class="w-6 h-6 flex items-center justify-center rounded-md text-xs font-bold shrink-0 bg-berzerker-border text-gray-300">${i + 1}</span>
                    <span class="text-xs font-bold px-1.5 py-0.5 bg-berzerker-border text-berzerker-500 rounded uppercase">${escapeHtml(e.muscle)}</span>
                    <span class="font-bold text-white text-sm">${escapeHtml(e.exercise)}</span>
                </div>
                <div class="flex items-center gap-1.5">
                    <button type="button" data-action="moveSessionUnit" data-args="[${i},-1]" title="Subir na ordem" aria-label="Subir exercício na ordem" class="min-h-[44px] min-w-[44px] px-2 py-2 text-sm font-bold bg-berzerker-border text-gray-300 rounded-md hover:bg-gray-700">▲</button>
                    <button type="button" data-action="moveSessionUnit" data-args="[${i},1]" title="Descer na ordem" aria-label="Descer na ordem" class="min-h-[44px] min-w-[44px] px-2 py-2 text-sm font-bold bg-berzerker-border text-gray-300 rounded-md hover:bg-gray-700">▼</button>
                    <span class="text-xs text-gray-400 font-mono whitespace-nowrap">🎯 Meta: ${e.weight > 0 ? e.weight + ' kg' : '—'} × (${escapeHtml(e.repsText || '—')})</span>
                </div>
            </div>
            ${e.orderReason ? `<div class="text-xs text-gray-400 leading-relaxed"><span class="text-berzerker-500 font-bold">📌 Por que nesta posição:</span> ${escapeHtml(e.orderReason)}</div>` : ''}
            ${fat.pct !== null && fat.pct < 100 ? `<div class="text-xs text-amber-400/90 font-mono">⏳ ${escapeHtml(e.muscle)} ainda em recuperação estimada (${fat.pct}%) — considere uma carga mais leve</div>` : ''}
            ${exercicioCarregaLombar(e.exercise) && lombarEstado.carregada ? `<div class="text-xs text-red-400/90 font-mono">⚠️ Este exercício exige a lombar — ainda carregada (${lombarEstado.horasRestantes}h restantes): priorize técnica perfeita e carga mais leve</div>` : ''}
            ${catInfo && catInfo.descanso ? `<div class="text-xs text-gray-400 font-mono">⏱ Descanso do catálogo: ${catInfo.descanso}s · faixa ${catInfo.faixa[0]}–${catInfo.faixa[1]}${catInfo.tipo === 'isometria' ? ' s' : ' reps'}</div>` : ''}
            ${lastPerformanceHTML(e.exercise)}
            <div class="flex gap-2 flex-wrap mt-1.5">
                <button type="button" data-action="showWarmupFor" data-args="[${i}]" class="px-2 py-1 text-xs font-bold bg-amber-900/30 border border-amber-500/30 text-amber-300 rounded-md hover:bg-amber-900/50">🔥 Aquecimento</button>
                <button type="button" data-action="showPlatesFor" data-args="[${i}]" class="px-2 py-1 text-xs font-bold bg-berzerker-border text-gray-200 rounded-md hover:bg-gray-700">⚙️ Anilhas</button>
            </div>
            <div id="s${i}-quickbox" class="hidden mt-1.5 text-xs font-mono bg-berzerker-dark/80 border border-amber-500/20 rounded-lg p-2"></div>
            ${fieldsHTML(`s${i}-`, d)}
        </div>`;
    };

    let html = '';
    if (activeSession.ordenado) {
        html += `<div class="text-xs text-gray-400 bg-berzerker-dark border border-berzerker-border rounded-lg px-3 py-2">✨ <b class="text-white">Ordem sugerida aplicada</b> — cada exercício mostra o porquê da posição. Use ▲▼ para trocar quando quiser (o bi-set anda junto).</div>`;
    }
    // Aviso de lombar carregada no topo da sessão
    const lombarEstado = regiaoLombarState(logs, nowMs);
    const temExercicioLombar = ex.some(e => !e.done && exercicioCarregaLombar(e.exercise));
    if (lombarEstado.carregada && temExercicioLombar) {
        html += `<div class="text-xs bg-red-950/40 border border-red-600/50 rounded-lg px-3 py-2 text-red-300">⚠️ <b>Sua lombar ainda está ${lombarEstado.label.toLowerCase()} (${lombarEstado.pct}% de prontidão estimada, ${lombarEstado.horasRestantes}h restantes).</b> ${escapeHtml(lombarEstado.dica)}</div>`;
    }
    for (let i = 0; i < ex.length; i++) {
        const pair = !!(ex[i + 1] && ex[i + 1].biset);
        const idxs = pair ? [i, i + 1] : [i];
        if (pair) i++;
        const pending = idxs.filter(k => !ex[k].done);
        html += `<div class="rounded-xl border ${pending.length ? (pair ? 'border-cyan-500/60 bg-berzerker-dark' : 'border-berzerker-border bg-berzerker-dark') : 'border-emerald-600/50 bg-emerald-950/10'} p-4 space-y-3">
            ${pair ? '<div class="text-xs font-bold text-cyan-400 uppercase tracking-wider">🔗 BI-SET — os dois juntos; o descanso começa depois do par</div>' : ''}
            ${idxs.map(k => itemHTML(ex[k], k)).join('<div class="border-t border-dashed border-berzerker-border"></div>')}
            ${pending.length ? `<div class="flex justify-end"><button data-action="registerSessionUnit" data-args="[[${pending.join(',')}],${pair}]" class="px-4 py-2 bg-berzerker-600 hover:bg-berzerker-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors">✔ Registrar${pending.length > 1 ? ' Bi-set' : ''}</button></div>` : ''}
        </div>`;
    }
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
            const scored = suggestNextWorkout(savedWorkouts, logs, Date.now());
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
    renderSession();
}
function showWarmupFor(i) {
    const e = activeSession.exercises[i];
    const w = parseFloat(document.getElementById(`s${i}-w`)?.value) || e.weight || 0;
    const box = document.getElementById(`s${i}-quickbox`);
    if (!box) return;
    if (w <= 0) { box.classList.remove('hidden'); box.innerHTML = 'Informe uma carga para ver o aquecimento.'; return; }
    box.classList.remove('hidden');
    box.innerHTML = `🔥 <b>Aquecimento para ${w} kg:</b><br>• 50% (${Math.round(w * 0.5)} kg) × 10<br>• 70% (${Math.round(w * 0.7)} kg) × 6<br>• 85% (${Math.round(w * 0.85)} kg) × 3<br>• 100% (${w} kg) × trabalho`;
}
function showPlatesFor(i) {
    const e = activeSession.exercises[i];
    const w = parseFloat(document.getElementById(`s${i}-w`)?.value) || e.weight || 0;
    const box = document.getElementById(`s${i}-quickbox`);
    if (!box) return;
    const cat = catalogInfo(e.exercise);
    const ehMaquina = cat && /leg press|hack|smith/i.test(e.exercise);
    const base = ehMaquina ? settings.sledWeight : settings.barWeight;
    box.classList.remove('hidden');
    box.innerHTML = `⚙️ <b>${w} kg</b> = ${formatPlates(w, base)}${ehMaquina ? ' (carrinho)' : ''}`;
}
function registerSessionUnit(idxs, isPair) {
    if (!activeSession) return;
    const date = document.getElementById('log-date').value || getTodayLocalISO();
    const items = idxs.map(i => ({ item: activeSession.exercises[i], f: readFields(`s${i}-`) }));
    const bad = items.find(x => x.f.mode === 'sets' ? x.f.sets.length === 0 : x.f.reps.length === 0);
    if (bad) { alertModal(`Digite ao menos uma repetição válida em "${bad.item.exercise}".`); return; }

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
        newLog.isPR = detectAutoPR(newLog, logs, userBodyweight) || f.isPR;
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
    renderSession();

    // Descanso automático: no bi-set só depois do par; caso contrário, ao registrar a série
    const muscle = items[0].item.muscle;
    const cat = catalogInfo(items[0].item.exercise);
    const rest = cat && cat.descanso ? cat.descanso : settings.restDefault;
    if (!isPair || items.length > 1) addSessionTimer(rest);
    if (anyPR) { shakeElement(document.getElementById('active-session-card')); spawnDamageFloat(totalDmg, true); }
    else spawnDamageFloat(totalDmg, false);
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
        moveSessionUnit,
        showWarmupFor,
        showPlatesFor,
        registerSessionUnit,
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

export { renderSession, moveSessionUnit, showWarmupFor, showPlatesFor, registerSessionUnit, timerRemainingMs, updateSessionTimerDisplay, addSessionTimer, toggleSessionTimer, tickSessionTimer, vibrate, playBeepSound, spawnDamageFloat, normalizeBisets, pairLink, toggleDraftBiset, getAnimalRankForSession };
