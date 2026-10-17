/* ============================================================
   CALCULADORAS — 1RM, aquecimento, anilhas, recordes e medalhas
   ------------------------------------------------------------
   Funções da aba Cálculos (1RM, aquecimento, anilhas), o registro de
   testes (recordes do usuário) e a faixa de badges/streak — estavam no
   meio de js/app.js.

   Dividido de js/app.js na refatoração R2 — as funções foram movidas
   sem alterar uma linha de lógica (mesmos corpos, mesmos nomes).
   Recebe do app o estado que só lê (tema ativo, logs, testes, chefões)
   por import; quem escreve estado continua no app.
   ============================================================ */

import { computeBossProgress, isoWeekKey, isoWeekRange, rankFromXP } from './gamificacao.js';
import { epleySeValido, formatPlates, logVolumeKg } from './catalogo.js';
import { BADGE_ART, BOSSES, INP, THEME, activeGameThemeId, alertModal, computeThemeXPCtx, deloadWeeks, escapeHtml, formatShortBR, getAnimalRankForSession, getTodayLocalISO, logs, logsForTheme, saveGameState, settings, tests, themeGameSaves, themeRankList, toLocalISO, userBodyweight } from './app.js';



// ============================ CALCULADORAS ============================
function calculate1RM() {
    const w = parseFloat(document.getElementById('calc-1rm-weight').value) || 0;
    const r = parseInt(document.getElementById('calc-1rm-reps').value) || 0;
    const resEl = document.getElementById('calc-1rm-result');
    const tableEl = document.getElementById('calc-1rm-table');
    const epley1RM = epleySeValido(w, r);
    if (epley1RM === null) {
        resEl.textContent = r > 12 ? 'Fora do intervalo de estimativa (1–12 reps)' : 'Informe carga e reps válidas';
        tableEl.innerHTML = '';
        return;
    }
    const e1RMTexto = epley1RM.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
    resEl.textContent = `${e1RMTexto} kg (estimado)`;
    const percentages = [100, 95, 90, 85, 80, 75, 70, 60];
    tableEl.innerHTML = percentages.map(p => `
        <div class="bg-berzerker-dark p-2 rounded border border-berzerker-border text-center">
            <span class="text-berzerker-500 font-bold">${p}%</span>
            <div class="text-white font-bold">${Math.round(epley1RM * (p / 100))} kg</div>
        </div>`).join('');
}
function renderWarmupCalculator() {
    const targetW = parseFloat(document.getElementById('calc-warmup-target').value) || 0;
    const container = document.getElementById('warmup-results-container');
    if (targetW <= 0) {
        container.innerHTML = `<p class="text-xs text-gray-500 italic">Digite a carga alvo para ver a pirâmide de aquecimento.</p>`;
        return;
    }
    const sets = [
        { title: 'Série 1 (Mobilidade / Barra)', weight: Math.round(targetW * 0.5), reps: '10-12 reps', desc: 'Aquece articulações sem fadiga.' },
        { title: 'Série 2 (Preparação SNC)', weight: Math.round(targetW * 0.7), reps: '6 reps', desc: 'Aumenta recrutamento motor.' },
        { title: 'Série 3 (Acoplamento de Carga)', weight: Math.round(targetW * 0.85), reps: '3 reps', desc: 'Prepara a mente para o peso.' },
        { title: 'Série 4 (Feeder Set)', weight: Math.round(targetW * 0.95), reps: '1 rep', desc: 'Garante a pegada sem acumular lactato.' },
        { title: 'Séries de Trabalho', weight: targetW, reps: 'Reps do Treino', desc: '100% da carga foco!' }
    ];
    container.innerHTML = sets.map((s, idx) => `
        <div class="p-3 bg-berzerker-dark rounded-xl border ${idx === 4 ? 'border-emerald-500/50 bg-emerald-950/20' : 'border-berzerker-border'} flex items-center justify-between">
            <div>
                <div class="text-xs font-bold text-white uppercase">${s.title}</div>
                <div class="text-[11px] text-gray-400">${s.desc}</div>
            </div>
            <div class="text-right">
                <div class="font-oswald text-lg font-bold text-berzerker-500">${s.weight} kg</div>
                <div class="text-xs font-mono text-gray-300">${s.reps}</div>
            </div>
        </div>`).join('');
}
function calculateWarmupFromForm() {
    const w = parseFloat(document.getElementById('w').value) || 0;
    if (w <= 0) { alertModal('Digite uma carga no campo de carga primeiro!'); return; }
    const box = document.getElementById('warmup-quick-box');
    const content = document.getElementById('warmup-quick-content');
    box.classList.remove('hidden');
    content.innerHTML = `
        • 50% (${Math.round(w * 0.5)}kg) × 10 reps (Aquece)<br>
        • 70% (${Math.round(w * 0.7)}kg) × 6 reps (Prepara)<br>
        • 85% (${Math.round(w * 0.85)}kg) × 3 reps (SNC)<br>
        • 100% (${w}kg) × Trabalhar!`;
}
function calculatePlatesFromForm() {
    const target = parseFloat(document.getElementById('plate-target').value) || 0;
    const base = parseFloat(document.getElementById('plate-base').value) || settings.barWeight;
    const el = document.getElementById('plate-result');
    if (target <= 0) { el.textContent = 'Digite a carga alvo.'; return; }
    el.innerHTML = `<b>${target} kg</b> = ${formatPlates(target, base)}${target >= base ? ' ✅' : ''}`;
}
function calculatePlatesQuick() {
    const w = parseFloat(document.getElementById('w').value) || 0;
    if (w <= 0) { alertModal('Digite uma carga no campo de carga primeiro!'); return; }
    const box = document.getElementById('warmup-quick-box');
    const content = document.getElementById('warmup-quick-content');
    box.classList.remove('hidden');
    content.innerHTML += `<br>⚙️ <b>${w} kg</b> = ${formatPlates(w, settings.barWeight)}`;
}


// ============================ STATS: STREAK SEMANAL + BADGES ============================
function weeklyStreakInfo() {
    const goal = settings.weeklyGoal || 3;
    let streak = 0;
    const today = new Date();
    let ref = new Date(today);
    let currentWeekCount = 0;

    for (let i = 0; i < 52; i++) {
        const [ws, we] = isoWeekRange(toLocalISO(ref));
        const days = new Set(logs.filter(l => l.date >= ws && l.date <= we).map(l => l.date)).size;
        if (i === 0) {
            currentWeekCount = days;
            if (days >= goal) streak++; // semana atual já bateu a meta: conta
            ref.setDate(ref.getDate() - 7);
            continue;
        }
        if (days >= goal) { streak++; ref.setDate(ref.getDate() - 7); }
        else break;
    }
    return { streak, goal, currentWeekCount };
}
function badgeArtSrc(slug) {
    return BADGE_ART[slug] || null;
}
function badgeArtImg(slug, icon, unlocked) {
    const src = badgeArtSrc(slug);
    if (!src) return `<span class="text-3xl shrink-0" role="img" aria-label="${escapeHtml(icon)}">${icon}</span>`;
    return `<img src="${src}" alt="emblema da conquista" width="48" height="48" data-fallback="${escapeHtml(icon)}" loading="lazy" decoding="async" data-error-action="badgeArtFallback" class="h-12 w-12 shrink-0 rounded-full object-cover border ${unlocked ? 'border-emerald-500/50' : 'border-berzerker-border'}" style="width:48px;height:48px;image-rendering:auto">`;
}
function badgeArtFallback(img) {
    const span = document.createElement('span');
    span.className = 'text-3xl';
    span.setAttribute('role', 'img');
    span.textContent = img.getAttribute('data-fallback') || '🏅';
    img.replaceWith(span);
}


// Maior número de dias treinados dentro de uma mesma semana ISO (badge Semana Completa)
function bestWeekWorkouts() {
    const perWeek = {};
    logs.forEach(l => {
        if (!l || !l.date) return;
        const w = isoWeekKey(l.date);
        (perWeek[w] = perWeek[w] || new Set()).add(l.date);
    });
    return Object.values(perWeek).reduce((m, s) => Math.max(m, s.size), 0);
}
function renderBadgesAndStreak() {
    const ws = weeklyStreakInfo();
    const streakEl = document.getElementById('stat-streak-days');
    const streakSub = document.getElementById('stat-streak-sub');
    if (streakEl) streakEl.textContent = `${ws.streak} ${ws.streak === 1 ? 'Semana' : 'Semanas'}`;
    if (streakSub) streakSub.textContent = `Ofensiva semanal · meta ${ws.goal} treinos/sem · esta semana: ${ws.currentWeekCount}/${ws.goal}`;

    const uniqueDates = [...new Set(logs.map(l => l.date))];
    let totalTon = 0, totalPRs = 0, totalKm = 0;
    logs.forEach(l => {
        totalTon += logVolumeKg(l, userBodyweight) / 1000;
        if (l.isPR) totalPRs++;
        if (l.kind === 'corrida') totalKm += Number(l.distanceKm) || 0;
    });

    const totalTonEl = document.getElementById('stat-total-tonnage');
    if (totalTonEl) totalTonEl.textContent = `${totalTon.toFixed(1)} TON`;

    const defeatedCount = computeBossProgress(logsForTheme(activeGameThemeId), userBodyweight, BOSSES, themeGameSaves[activeGameThemeId]?.bossProgress).defeatedCount;
    const rankTema = rankFromXP(computeThemeXPCtx(activeGameThemeId).xp, themeRankList(THEME));
    const badges = [
        { slug: 'primeiro-sangue', title: 'Primeiro Sangue', desc: '1º Exercício Registrado', unlocked: logs.length > 0, icon: '⚔️' },
        { slug: 'ofensiva-semanal', title: 'Ofensiva Semanal', desc: '3 Semanas seguidas na meta', unlocked: ws.streak >= 3, icon: '🔥' },
        { slug: 'mover-titan', title: 'Mover Titan', desc: '10+ Toneladas Acumuladas', unlocked: totalTon >= 10, icon: '🐘' },
        { slug: 'cacador-de-prs', title: 'Caçador de PRs', desc: '5+ Recordes Pessoais', unlocked: totalPRs >= 5, icon: '🏆' },
        { slug: 'maratonista', title: 'Maratonista', desc: '10+ km registrados', unlocked: totalKm >= 10, icon: '🏃' },
        { slug: 'tanque-de-guerra', title: 'Tanque de Guerra', desc: 'Razão > 50x Peso Corporal', unlocked: logs.some(l => getAnimalRankForSession(l.date).relativeRatio >= 50), icon: '🛡️' },
        { slug: 'berzerker-master', title: 'Berzerker Master', desc: '50+ Treinos Registrados', unlocked: uniqueDates.length >= 50, icon: '⚡' },
        { slug: 'cacador-de-chefoes', title: 'Caçador de Chefões', desc: '3+ Chefões Derrotados', unlocked: defeatedCount >= 3, icon: '👑' },
        { slug: 'primeiro-deload', title: 'Primeiro Deload', desc: '1ª semana de deload marcada', unlocked: deloadWeeks.length >= 1, icon: '🌙' },
        { slug: 'semana-completa', title: 'Semana Completa', desc: '4 treinos na mesma semana', unlocked: bestWeekWorkouts() >= 4, icon: '📅' },
        { slug: 'colecionador', title: 'Colecionador', desc: '5 chefões derrotados no tema', unlocked: defeatedCount >= 5, icon: '🧰' },
        { slug: 'mestre-dos-chefoes', title: 'Mestre dos Chefões', desc: `${BOSSES.length}/${BOSSES.length} chefões do tema`, unlocked: defeatedCount >= BOSSES.length, icon: '🐲' },
        { slug: 'mes-de-ferro', title: 'Mês de Ferro', desc: '20 treinos registrados', unlocked: uniqueDates.length >= 20, icon: '🔩' },
        { slug: 'corredor', title: 'Corredor', desc: '25 km acumulados', unlocked: totalKm >= 25, icon: '🛣️' },
        { slug: 'sequencia-de-aco', title: 'Sequência de Aço', desc: '8 semanas seguidas na meta', unlocked: ws.streak >= 8, icon: '🔗' },
        { slug: 'nivel-10', title: 'Nível 10 no Tema', desc: 'Patente máxima no jogo ativo', unlocked: rankTema.level >= 10, icon: '🌟' }
    ];

    const unlockedCount = badges.filter(b => b.unlocked).length;
    const badgesEl = document.getElementById('stat-unlocked-badges');
    if (badgesEl) badgesEl.textContent = `${unlockedCount} / ${badges.length}`;

    const grid = document.getElementById('badges-grid');
    if (grid) grid.innerHTML = badges.map(b => `
        <div class="p-3 rounded-xl border text-center transition-all ${b.unlocked ? 'bg-berzerker-dark border-emerald-500/50 text-white' : 'bg-berzerker-dark/40 border-berzerker-border text-gray-600 opacity-60'}">
            <div class="mb-1 flex h-12 items-center justify-center">${badgeArtImg(b.slug, b.icon, b.unlocked)}</div>
            <div class="font-bold text-xs uppercase ${b.unlocked ? 'text-emerald-400' : 'text-gray-500'}">${escapeHtml(b.title)}</div>
            <div class="text-[10px] text-gray-400 mt-0.5">${escapeHtml(b.desc)}</div>
        </div>`).join('');
}


// ============================ MODO TESTES ============================
function renderTests() {
    const el = document.getElementById('tests-container');
    if (!el) return;
    el.innerHTML = tests.map(t => {
        const lastRec = [...t.records].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
        const best = t.unit === 'min'
            ? (t.records.length ? Math.min(...t.records.map(r => r.value)) : null)
            : (t.records.length ? Math.max(...t.records.map(r => r.value)) : null);
        const pct = (best != null && t.goal > 0) ? Math.min(100, Math.round(best / t.goal * 100)) : 0;
        return `
        <div class="bg-berzerker-dark border border-berzerker-border rounded-xl p-4 space-y-2">
            <div class="flex items-start justify-between gap-2">
                <div>
                    <div class="font-bold text-white text-sm uppercase">${escapeHtml(t.name)}</div>
                    <div class="text-[10px] text-gray-500 font-mono">meta: ${t.goal} ${escapeHtml(t.unit)}${best != null ? ` · melhor: ${best} ${escapeHtml(t.unit)}` : ''}</div>
                </div>
                <button data-action="deleteTest" data-args='["${t.id}"]' aria-label="Excluir teste" class="text-gray-500 hover:text-red-400 text-xs" title="Excluir teste">🗑</button>
            </div>
            <div class="w-full h-2 bg-berzerker-border rounded-full overflow-hidden">
                <div class="h-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-amber-500'} rounded-full" style="width:${pct}%"></div>
            </div>
            <div class="flex items-center gap-1.5">
                <input type="date" id="test-date-${t.id}" value="${getTodayLocalISO()}" class="${INP} !py-1 !text-xs flex-1">
                <input type="number" step="0.5" min="0" id="test-val-${t.id}" placeholder="${escapeHtml(t.unit)}" class="${INP} !py-1 !text-xs w-20">
                <button data-action="addTestRecord" data-args='["${t.id}"]' class="px-2.5 py-1.5 bg-berzerker-600 hover:bg-berzerker-500 text-white text-[10px] font-bold rounded-lg">+ Registrar</button>
            </div>
            ${t.records.length ? `
            <div class="text-[10px] font-mono text-gray-400 space-y-0.5 max-h-24 overflow-y-auto border-t border-berzerker-border pt-1.5">
                ${[...t.records].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6).map(r => `
                    <div class="flex justify-between"><span>${formatShortBR(r.date)}</span><span class="text-white">${r.value} ${escapeHtml(t.unit)}</span>
                    <button data-action="deleteTestRecord" data-args='["${t.id}","${r.date}",${r.value}]' aria-label="Excluir registro de teste" class="text-gray-600 hover:text-red-400">✕</button></div>`).join('')}
            </div>` : '<div class="text-[10px] text-gray-600 italic">Sem registros ainda.</div>'}
        </div>`;
    }).join('') + `
        <div class="bg-berzerker-dark border border-dashed border-berzerker-border rounded-xl p-4 space-y-2">
            <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">➕ Novo marco de capacidade</div>
            <div class="flex flex-wrap gap-1.5">
                <input type="text" id="new-test-name" placeholder="Ex: Agachamento 1RM" class="${INP} !py-1 !text-xs flex-1 min-w-[120px]">
                <input type="text" id="new-test-unit" placeholder="unidade (kg/reps/s/min)" class="${INP} !py-1 !text-xs w-28">
                <input type="number" min="1" id="new-test-goal" placeholder="meta" class="${INP} !py-1 !text-xs w-20">
                <button data-action="addCustomTest" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded-lg">Criar</button>
            </div>
        </div>`;
}
function addTestRecord(testId) {
    const t = tests.find(x => x.id === testId);
    if (!t) return;
    const date = document.getElementById(`test-date-${testId}`).value || getTodayLocalISO();
    const value = parseFloat(document.getElementById(`test-val-${testId}`).value);
    if (isNaN(value) || value <= 0) { alertModal('Digite um valor válido para o teste.'); return; }
    t.records.push({ date, value });
    saveGameState();
    renderTests();
    alertModal(`📌 Teste "${t.name}": ${value} ${t.unit} registrado!`);
}
function deleteTestRecord(testId, date, value) {
    const t = tests.find(x => x.id === testId);
    if (!t) return;
    t.records = t.records.filter(r => !(r.date === date && r.value === value));
    saveGameState();
    renderTests();
}
function addCustomTest() {
    const name = document.getElementById('new-test-name').value.trim();
    const unit = document.getElementById('new-test-unit').value.trim() || 'reps';
    const goal = parseFloat(document.getElementById('new-test-goal').value) || 10;
    if (!name) { alertModal('Dê um nome ao teste.'); return; }
    tests.push({ id: 't' + Date.now(), name, unit, goal, records: [] });
    saveGameState();
    renderTests();
    alertModal(`🎯 Teste "${name}" criado!`);
}

// ============================================================
// Manifesto de exports (mesmo padrão dos outros módulos em js/).
// ============================================================
(function (g) {
    const exports_ = {
        calculate1RM,
        renderWarmupCalculator,
        calculateWarmupFromForm,
        calculatePlatesFromForm,
        calculatePlatesQuick,
        weeklyStreakInfo,
        badgeArtSrc,
        badgeArtImg,
        badgeArtFallback,
        bestWeekWorkouts,
        renderBadgesAndStreak,
        renderTests,
        addTestRecord,
        deleteTestRecord,
        addCustomTest,
    };
    g.__diarioExports = Object.assign(g.__diarioExports || {}, exports_);
    // Ações delegáveis (js/actions.js): toda função pública do módulo fica
    // disponível para os atributos data-action dos templates.
    const actionFns = {};
    Object.keys(exports_).forEach(k => { if (typeof exports_[k] === 'function') actionFns[k] = exports_[k]; });
    g.registerDiarioActions(actionFns);
    g.__diarioExportFiles = Object.assign(g.__diarioExportFiles || {}, { "js/calculadoras.js": Object.keys(exports_).length });
})(typeof window !== 'undefined' ? window : globalThis);

export { calculate1RM, renderWarmupCalculator, calculateWarmupFromForm, calculatePlatesFromForm, calculatePlatesQuick, weeklyStreakInfo, badgeArtSrc, badgeArtImg, badgeArtFallback, bestWeekWorkouts, renderBadgesAndStreak, renderTests, addTestRecord, deleteTestRecord, addCustomTest };
