/* ============================================================
   DIÁRIO DE CARGAS — núcleo do app (estado, sessão, UI, dados)
   ============================================================ */

// ============================ ESTADO GLOBAL ============================
let logs = [];
let savedWorkouts = [];
let draftExercises = [];
let editingWorkoutId = null;
let activeSession = null;
let userBodyweight = 80;
let customBgImageData = null;
let selectedStoryTheme = 'berzerker';
let volumeChartInstance = null;
let exChartInstance = null;
let setsChartInstance = null;
let weightLog = [];            // pesagens [{date, peso, obs}] — aba "Peso corporal"
let histVolChartInstance = null;

// Configurações de treino
let settings = { weeklyGoal: 3, restDefault: 90, barWeight: DEFAULT_BAR_WEIGHT, sledWeight: DEFAULT_SLED_WEIGHT };

// Gamificação persistida
let deloadWeeks = [];          // ['2026-W41', ...]
let missionsXpTotal = 0;       // XP já resgatado de missões
let missionsClaimed = {};      // { '2026-W41': true }
let tests = [];                // Modo Testes
let seasons = null;            // temporadas de 12 semanas
let bossPortraits = {};        // { bossId: dataURL }
let selectedStoryBossId = null;

let THEME = null, BOSSES = [], ANIMAL_RANKS = [];
let lastRankLevel = null, lastBossesDefeated = null;

// Cronômetro de descanso (baseado em horário de término — não trava com tela bloqueada)
let timer = { endsAt: null, remainingMs: 0, running: false, interval: null };
let wakeLock = null;

// Vigia a virada do dia
let lastKnownTodayISO = null;

// Estado dos editores "série a série" por prefixo de campo
const setEditorState = {};

// ============================ PERSISTÊNCIA ============================
const STORAGE_KEY_LOGS = 'berzerker_diario_cargas_logs_v2';
const STORAGE_KEY_BW = 'berzerker_user_bodyweight';
const STORAGE_KEY_WORKOUTS = 'berzerker_saved_workouts_v1';
const STORAGE_KEY_SEEDED = 'berzerker_seeded_v2';
const STORAGE_KEY_SETTINGS = 'berzerker_settings_v1';
const STORAGE_KEY_GAME = 'berzerker_game_state_v1';     // deload, missões, testes, temporadas, retratos
const STORAGE_KEY_STORY = 'berzerker_story_v1';          // tema visual do card + fundo
const STORAGE_KEY_BACKUP = 'berzerker_last_backup_at';

const safeStorage = {
    get(key) { try { return window.localStorage.getItem(key); } catch (e) { return null; } },
    set(key, val) { try { window.localStorage.setItem(key, val); } catch (e) { /* sem persistência */ } }
};

// ============================ CONSTANTES UI ============================
const TECHNIQUES = [['Convencional', 'Convencional'], ['Rest-Pause', 'Rest-Pause'], ['Drop-Set', 'Drop-Set'], ['Cluster', 'Cluster Set'], ['Isometria', 'Isometria Focus'], ['Excêntrica Lenta', 'Excêntrica Lenta']];
const NEXT_GOALS = [['', '— automático —'], ['📈 Aumentar Carga', '📈 Aumentar Carga (+kg)'], ['➕ Aumentar Reps', '➕ Mais Repetições'], ['⚖️ Manter Carga', '⚖️ Manter Carga'], ['🎯 Ajustar Execução', '🎯 Ajustar Técnica'], ['📉 Reduzir Carga', '📉 Reduzir Peso']];
const INP = 'w-full bg-berzerker-dark border border-berzerker-border rounded-lg px-2.5 py-2 text-white text-sm focus:outline-none focus:border-berzerker-500';
const LBL = 'block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1';
const MUSCLE_OPTIONS = MUSCLE_OPTIONS_FULL; // catálogo completo (11 grupos + Geral + Cardio)

// ============================ UTILITÁRIOS ============================
function toLocalISO(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}
function getTodayLocalISO() { return toLocalISO(new Date()); }
function formatDateBR(isoStr) {
    if (!isoStr) return '';
    const [y, m, d] = isoStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const dias = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
    return `${dias[date.getDay()]} · ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}
function formatShortBR(isoStr) {
    if (!isoStr) return '—';
    const [, m, d] = isoStr.split('-').map(Number);
    return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
}
function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function fmtN(n, dec) {
    return (Number(n) || 0).toLocaleString('pt-BR', dec != null ? { minimumFractionDigits: dec, maximumFractionDigits: dec } : undefined);
}

function alertModal(msg) {
    const banner = document.createElement('div');
    banner.className = 'fixed bottom-5 right-5 max-w-xs bg-berzerker-600 text-white font-bold px-5 py-3 rounded-xl shadow-2xl z-[70] transition-all text-xs uppercase tracking-wider';
    banner.textContent = msg;
    document.body.appendChild(banner);
    setTimeout(() => banner.remove(), 3800);
}

function confirmModal(msg, onConfirm) {
    const existing = document.getElementById('confirm-modal-overlay');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.id = 'confirm-modal-overlay';
    overlay.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4';
    overlay.innerHTML = `
        <div class="bg-berzerker-card border border-berzerker-border rounded-2xl p-6 max-w-sm w-full space-y-5 shadow-2xl">
            <p class="text-sm text-white font-bold leading-relaxed">${escapeHtml(msg)}</p>
            <div class="flex gap-3 justify-end">
                <button id="confirm-modal-no" class="px-4 py-2 bg-berzerker-border hover:bg-gray-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors">Cancelar</button>
                <button id="confirm-modal-yes" class="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors">Confirmar</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#confirm-modal-no').onclick = () => overlay.remove();
    overlay.onclick = (ev) => { if (ev.target === overlay) overlay.remove(); };
    overlay.querySelector('#confirm-modal-yes').onclick = () => { overlay.remove(); onConfirm(); };
}

function shakeElement(el) {
    if (!el) return;
    el.classList.remove('animate-pr-shake');
    void el.offsetWidth;
    el.classList.add('animate-pr-shake');
    setTimeout(() => el.classList.remove('animate-pr-shake'), 600);
}

// ============================ CARGA/PERSISTÊNCIA DE DADOS ============================
function migrateLog(l) {
    if (!l.kind) {
        l.kind = /corrida|esteira|bike|elíptic|remo|cardio/i.test(l.exercise || '') && l.distanceKm !== undefined ? 'corrida'
            : (/corrida|esteira|bike|elíptic|remo/i.test(l.exercise || '') && !l.reps ? 'corrida' : 'peso');
    }
    if (!l.type && l.kind === 'peso') l.type = inferExerciseType(l.exercise, l.muscle);
    if (l.type === 'isometria' && l.weight > 0 && (!Array.isArray(l.reps) || l.reps.length === 0)) {
        l.reps = [l.weight]; l.weight = 0;
    }
    // Upgrade de registros antigos: convenção da planilha (carga registrada pura)
    if (l.kind === 'peso') {
        if (l.type === 'peso_corporal' && (!l.weight || l.weight <= 0) && userBodyweight > 0) l.weight = userBodyweight;
        if (l.conferir === undefined) l.conferir = false;
    }
    if (l.kind === 'corrida') { l.muscle = 'Cardio'; }
    return l;
}

function loadStoredData() {
    try {
        const storedLogs = JSON.parse(safeStorage.get(STORAGE_KEY_LOGS));
        if (Array.isArray(storedLogs)) logs = storedLogs.map(migrateLog);
    } catch (e) { logs = []; }

    const storedBw = parseFloat(safeStorage.get(STORAGE_KEY_BW));
    if (!isNaN(storedBw) && storedBw > 0) {
        userBodyweight = storedBw;
        const bwInput = document.getElementById('user-bodyweight');
        if (bwInput) bwInput.value = storedBw;
    }
    try {
        const s = JSON.parse(safeStorage.get(STORAGE_KEY_SETTINGS));
        if (s && typeof s === 'object') settings = { ...settings, ...s };
    } catch (e) { /* defaults */ }
    try {
        const g = JSON.parse(safeStorage.get(STORAGE_KEY_GAME));
        if (g && typeof g === 'object') {
            deloadWeeks = Array.isArray(g.deloadWeeks) ? g.deloadWeeks : [];
            missionsXpTotal = g.missionsXpTotal || 0;
            missionsClaimed = g.missionsClaimed || {};
            tests = Array.isArray(g.tests) ? g.tests : defaultTests();
            seasons = g.seasons || null;
            bossPortraits = g.bossPortraits || {};
            weightLog = Array.isArray(g.weightLog) ? g.weightLog : [];
        } else {
            tests = defaultTests();
        }
    } catch (e) { tests = defaultTests(); }
    if (!Array.isArray(tests) || tests.length === 0) tests = defaultTests();
    try {
        const st = JSON.parse(safeStorage.get(STORAGE_KEY_STORY));
        if (st && typeof st === 'object') {
            if (st.selectedStoryTheme) selectedStoryTheme = st.selectedStoryTheme;
            if (st.bgImageData) {
                const img = new Image();
                img.onload = () => { customBgImageData = img; generateStoryCard(); };
                img.src = st.bgImageData;
            }
        }
    } catch (e) { /* ok */ }
    lastBackupAt = safeStorage.get(STORAGE_KEY_BACKUP);
}

function saveLogsToStorage() {
    safeStorage.set(STORAGE_KEY_LOGS, JSON.stringify(logs));
    checkRankUp();
}
function saveWorkoutsToStorage() { safeStorage.set(STORAGE_KEY_WORKOUTS, JSON.stringify(savedWorkouts)); }
function saveSettings() {
    safeStorage.set(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
}
function saveGameState() {
    safeStorage.set(STORAGE_KEY_GAME, JSON.stringify({
        deloadWeeks, missionsXpTotal, missionsClaimed, tests, seasons, bossPortraits, weightLog
    }));
}
function saveStoryState() {
    safeStorage.set(STORAGE_KEY_STORY, JSON.stringify({
        selectedStoryTheme,
        bgImageData: customBgImageData ? customBgImageData.src : null
    }));
}

function defaultTests() {
    return [
        { id: 't1', name: 'Supino 1RM', unit: 'kg', goal: 120, records: [] },
        { id: 't2', name: 'Barra fixa máx', unit: 'reps', goal: 12, records: [] },
        { id: 't3', name: 'Prancha máx', unit: 's', goal: 180, records: [] },
        { id: 't4', name: 'Corrida 5 km', unit: 'min', goal: 25, records: [] }
    ];
}

function loadWorkoutsFromStorage() {
    try {
        const stored = JSON.parse(safeStorage.get(STORAGE_KEY_WORKOUTS));
        if (Array.isArray(stored)) savedWorkouts = stored;
    } catch (e) { savedWorkouts = []; }
}

function saveBodyweight() {
    const val = parseFloat(document.getElementById('user-bodyweight').value);
    if (isNaN(val) || val <= 0) { alertModal('Digite um peso corporal válido!'); return; }
    userBodyweight = val;
    safeStorage.set(STORAGE_KEY_BW, val.toString());
    refreshAll();
    alertModal('Peso corporal salvo!');
}

function saveTrainingSettings() {
    const goal = parseInt(document.getElementById('cfg-weekly-goal').value);
    const rest = parseInt(document.getElementById('cfg-rest').value);
    const bar = parseFloat(document.getElementById('cfg-bar').value);
    const sled = parseFloat(document.getElementById('cfg-sled').value);
    settings.weeklyGoal = Math.min(7, Math.max(1, goal || 3));
    settings.restDefault = Math.min(600, Math.max(15, rest || 90));
    settings.barWeight = bar > 0 ? bar : DEFAULT_BAR_WEIGHT;
    settings.sledWeight = sled > 0 ? sled : DEFAULT_SLED_WEIGHT;
    saveSettings();
    refreshAll();
    alertModal('⚙️ Configurações de treino salvas!');
}

function toggleDeloadWeek() {
    const week = isoWeekKey(getTodayLocalISO());
    const i = deloadWeeks.indexOf(week);
    if (i >= 0) {
        deloadWeeks.splice(i, 1);
        alertModal('Semana de deload removida.');
    } else {
        deloadWeeks.push(week);
        alertModal('🧘 Semana de deload planejada! Volume rende 50% do XP e dias de descanso rendem XP de recuperação.');
    }
    saveGameState();
    refreshAll();
}

// ============================ TEMA / PATENTES ============================
function applyTheme(id) {
    THEME = THEMES[id] || THEMES.classico;
    BOSSES = THEME.bosses;
    ANIMAL_RANKS = THEME.ranks.map(([name, icon], i) => ({ minXp: XP_MIN[i], level: i + 1, name, icon }));
    const set = (el, fn) => { const e = document.getElementById(el); if (e) fn(e); };
    set('arena-title', e => e.textContent = THEME.arena);
    set('game-theme-select', e => e.value = THEME.id);
    set('game-theme-desc', e => e.textContent = THEME.desc);
    const xd = computeXPCtx();
    lastRankLevel = rankFromXP(xd.xp).level;
    lastBossesDefeated = xd.prog.defeatedCount;
}

function changeGameTheme(id) {
    applyTheme(id);
    safeStorage.set(STORAGE_KEY_THEME, THEME.id);
    refreshAll();
    alertModal(`🎭 Tema "${THEME.name}" aplicado! Seu progresso foi mantido.`);
}

function computeXPCtx(upto) {
    return computeXP(upto, {
        logs, bodyweight: userBodyweight, deloadWeeks,
        missionsXpTotal, bosses: BOSSES
    });
}

function checkRankUp() {
    const d = computeXPCtx();
    const r = rankFromXP(d.xp);
    const msgs = [];
    if (lastRankLevel !== null && r.level > lastRankLevel) {
        msgs.push(`🎖️ PATENTE NOVA: ${r.icon} ${r.name} (Nível ${r.level})!`);
    }
    if (lastBossesDefeated !== null && d.prog.defeatedCount > lastBossesDefeated) {
        const b = BOSSES[d.prog.defeatedCount - 1];
        if (b) msgs.push(`👑 CHEFÃO DERROTADO: ${b.icon} ${b.name}!`);
    }
    lastRankLevel = r.level;
    lastBossesDefeated = d.prog.defeatedCount;
    msgs.forEach((m, i) => setTimeout(() => alertModal(m), 400 * (i + 1)));
}

function showRanksModal(themeId) {
    const t = THEMES[themeId] || THEME;
    const d = computeXPCtx();
    const cur = rankFromXP(d.xp);
    const rankList = t.ranks.map(([name, icon], i) => ({ minXp: XP_MIN[i], level: i + 1, name, icon }));
    const curT = rankList.reduce((a, x) => (d.xp >= x.minXp ? x : a), rankList[0]);
    const nxt = rankList[curT.level] || null;
    const pct = nxt ? Math.min(100, Math.round((d.xp - curT.minXp) / (nxt.minXp - curT.minXp) * 100)) : 100;
    const fmt = n => fmtN(n);
    const rows = rankList.map((x, i) => {
        const lvl = i + 1;
        const st = lvl < curT.level ? 0 : (lvl === curT.level ? 1 : 2);
        const cls = ['border-emerald-600/40 bg-emerald-950/10', 'border-berzerker-500 bg-berzerker-600/10', 'border-berzerker-border opacity-60'][st];
        const tag = ['✔ conquistada', '◀ você está aqui', '🔒'][st];
        return `<div class="flex items-center justify-between gap-2 border ${cls} rounded-lg px-3 py-2">
            <div class="flex items-center gap-2 min-w-0"><span class="text-xl">${x.icon}</span><span class="text-xs font-bold text-white truncate">${escapeHtml(x.name)}</span></div>
            <div class="text-right shrink-0"><div class="text-[10px] font-mono text-gray-400">${fmt(x.minXp)} XP</div><div class="text-[9px] font-bold text-gray-500 uppercase">${tag}</div></div>
        </div>`;
    }).join('');
    const tabs = Object.values(THEMES).map(x => `<button onclick="showRanksModal('${x.id}')" class="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${x.id === t.id ? 'bg-berzerker-600 text-white' : 'bg-berzerker-border text-gray-400 hover:text-white'}">${escapeHtml(x.name)}</button>`).join('');
    document.getElementById('ranks-overlay')?.remove();
    const o = document.createElement('div');
    o.id = 'ranks-overlay';
    o.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-start sm:items-center justify-center p-4 overflow-y-auto';
    o.onclick = ev => { if (ev.target === o) o.remove(); };
    o.innerHTML = `<div class="bg-berzerker-card border border-berzerker-border rounded-2xl p-5 max-w-lg w-full shadow-2xl space-y-3">
        <div class="flex items-center justify-between"><h3 class="font-oswald text-lg font-bold text-white uppercase tracking-wider">📜 Patentes</h3><button onclick="document.getElementById('ranks-overlay').remove()" class="text-gray-400 hover:text-white">✕</button></div>
        <div class="flex flex-wrap gap-1.5">${tabs}</div>
        <div class="bg-berzerker-dark border border-berzerker-border rounded-xl p-3 space-y-1.5">
            <div class="flex justify-between text-[11px] font-bold text-gray-300"><span>${fmt(d.xp)} XP</span><span>${nxt ? 'próxima: ' + fmt(nxt.minXp) + ' XP' : 'nível máximo'}</span></div>
            <div class="w-full h-2 bg-berzerker-border rounded-full overflow-hidden"><div class="h-full bg-gradient-to-r from-berzerker-600 to-emerald-500" style="width:${pct}%"></div></div>
            <div class="text-[10px] text-gray-500 font-mono">Treino ${fmt(d.training)} · Corrida ${fmt(d.cardio)} · PRs ${fmt(d.prXP)} · Descanso ${fmt(d.restXP)} · Chefões ${fmt(d.bossXP)} · Missões ${fmt(d.missionXP)}</div>
        </div>
        <div class="space-y-1.5 max-h-[50vh] overflow-y-auto">${rows}</div>
        <p class="text-[10px] text-gray-500">1 XP a cada 100 kg movidos (pernas contam 50%, teto de ${XP_GROUP_DAY_CAP} XP/dia/grupo) · PR +${XP_PR} XP · corrida = km×8 + min×0,5 · chefão rende 0,5% do HP · descanso em deload +${XP_REST_PER_DAY} XP/dia.</p>
    </div>`;
    document.body.appendChild(o);
}

// ============================ TABS ============================
function switchTab(tab) {
    ['diario', 'historico', 'busca', 'boss', 'story', 'stats', 'calcs', 'config'].forEach(t => {
        const el = document.getElementById(`tab-content-${t}`);
        const btnDesktop = document.getElementById(`nav-${t}`);
        const btnMobile = document.getElementById(`m-nav-${t}`);
        if (t === tab) {
            el.classList.remove('hidden');
            if (btnDesktop) btnDesktop.className = 'px-4 py-2 rounded-lg bg-berzerker-600 text-white transition-all';
            if (btnMobile) btnMobile.className = 'px-3 py-1.5 rounded-lg bg-berzerker-600 text-white whitespace-nowrap';
        } else {
            el.classList.add('hidden');
            if (btnDesktop) btnDesktop.className = 'px-4 py-2 rounded-lg text-gray-400 hover:text-white transition-all';
            if (btnMobile) btnMobile.className = 'px-3 py-1.5 rounded-lg text-gray-400 bg-berzerker-card whitespace-nowrap';
        }
    });
    if (tab === 'historico') renderHistory();
    if (tab === 'busca') renderSearchScreen();
    if (tab === 'boss') { renderBossBattleUI(); renderMissions(); renderSeason(); }
    if (tab === 'story') generateStoryCard();
    if (tab === 'stats') { renderBadgesAndStreak(); initVolumeChart(); renderExerciseChart(); renderWeeklySetsChart(); renderTests(); }
    if (tab === 'config') renderBackupReminder();
}

// ============================ SEED ============================
function seedInitialMockData(todayStr) {
    // Seed = planilha real do usuário (Log de 28/09 a 10/10/2026 + 5 sessões)
    if (safeStorage.get(STORAGE_KEY_SEEDED) === '1') return;
    if (typeof seedFromPlanilha === 'function') seedFromPlanilha();
    saveLogsToStorage();
    saveWorkoutsToStorage();
    safeStorage.set(STORAGE_KEY_SEEDED, '1');
}

// ============================ FORMULÁRIO DE REGISTRO ============================
function updateTypeHint() {
    const sel = document.getElementById('type');
    const hint = document.getElementById('type-hint');
    if (!sel || !hint) return;
    const info = CATALOG_TIPOS[sel.value];
    hint.textContent = info ? info.hint : '';
    // Se o exercício do catálogo define o tipo, mostra a faixa de reps
    const exName = document.getElementById('log-exercise')?.value.trim();
    const cat = catalogInfo(exName);
    const faixaEl = document.getElementById('faixa-hint');
    if (faixaEl) {
        faixaEl.textContent = cat && cat.faixa && cat.faixa[1] > 0
            ? `Faixa do exercício: ${cat.faixa[0]}–${cat.faixa[1]} ${cat.tipo === 'isometria' ? 's' : 'reps'} · descanso ${cat.descanso}s`
            : 'Exercício fora do catálogo — dupla progressão indisponível.';
    }
}

// Atualiza o rótulo de carga do bloco de campos (por tipo de exercício)
function onTypeChange(prefix) {
    const sel = document.getElementById(prefix + 'type');
    const lbl = document.getElementById(prefix + 'w-label');
    const info = sel ? CATALOG_TIPOS[sel.value] : null;
    if (lbl && info) lbl.textContent = info.label;
    if (prefix === '') updateTypeHint();
}

function onLogExerciseChange() {
    const exName = document.getElementById('log-exercise')?.value.trim();
    const cat = catalogInfo(exName);
    if (cat) {
        const muscleSel = document.getElementById('log-muscle');
        const typeSel = document.getElementById('type');
        if (muscleSel) muscleSel.value = cat.grupo;
        if (typeSel) typeSel.value = cat.tipo;
    }
    if (typeof renderExerciseTagLine === 'function') renderExerciseTagLine('log-tags-line', exName || '');
    onTypeChange('');
}

function toggleSetMode(prefix) {
    const mode = document.getElementById(prefix + 'mode')?.value || 'simple';
    const box = document.getElementById(prefix + 'sets-box');
    const simpleBox = document.getElementById(prefix + 'simple-box');
    if (box) box.classList.toggle('hidden', mode !== 'sets');
    if (simpleBox) simpleBox.classList.toggle('hidden', mode === 'sets');
}

function renderSetRows(prefix) {
    const container = document.getElementById(prefix + 'sets');
    if (!container) return;
    const rows = setEditorState[prefix] || [];
    container.innerHTML = rows.map((s, i) => `
        <div class="flex items-center gap-1.5">
            <span class="text-[10px] font-bold text-gray-500 w-6">S${i + 1}</span>
            <input type="number" step="0.5" min="0" value="${s.weight ?? ''}" placeholder="kg" data-setw="${prefix}${i}" class="${INP} !py-1.5 !text-xs flex-1">
            <input type="number" min="0" value="${s.reps ?? ''}" placeholder="reps" data-setr="${prefix}${i}" class="${INP} !py-1.5 !text-xs flex-1">
            <input type="number" min="0" max="10" value="${s.rir ?? ''}" placeholder="RIR" data-seti="${prefix}${i}" class="${INP} !py-1.5 !text-xs w-16">
            <button type="button" onclick="removeSetRow('${prefix}', ${i})" class="p-1.5 text-gray-500 hover:text-red-400 text-xs">✕</button>
        </div>`).join('');
}

function readSetRows(prefix) {
    const rows = setEditorState[prefix] || [];
    return rows.map((s, i) => {
        const w = document.querySelector(`[data-setw="${prefix}${i}"]`);
        const r = document.querySelector(`[data-setr="${prefix}${i}"]`);
        const ri = document.querySelector(`[data-seti="${prefix}${i}"]`);
        return {
            weight: w ? (parseFloat(w.value) || 0) : (s.weight || 0),
            reps: r ? (parseInt(r.value) || 0) : (s.reps || 0),
            rir: ri && ri.value !== '' ? parseInt(ri.value) : null
        };
    }).filter(s => s.reps > 0);
}

function addSetRow(prefix) {
    setEditorState[prefix] = setEditorState[prefix] || [];
    const last = setEditorState[prefix][setEditorState[prefix].length - 1];
    setEditorState[prefix].push({ weight: last ? last.weight : 0, reps: last ? last.reps : 0, rir: last ? last.rir : null });
    renderSetRows(prefix);
}

function removeSetRow(prefix, i) {
    if (setEditorState[prefix]) setEditorState[prefix].splice(i, 1);
    renderSetRows(prefix);
}

function initSetEditor(prefix, value) {
    // value: { mode, sets } — mode 'simple' | 'sets'
    const mode = (value && value.mode) || 'simple';
    const modeSel = document.getElementById(prefix + 'mode');
    if (modeSel) modeSel.value = mode;
    setEditorState[prefix] = value && Array.isArray(value.sets) && value.sets.length
        ? value.sets.map(s => ({ ...s }))
        : [{ weight: (value && value.weight) || 0, reps: 0, rir: null }];
    renderSetRows(prefix);
    toggleSetMode(prefix);
}

function fieldsHTML(p, v, opts) {
    const o = opts || {};
    const optsSelect = (arr, sel) => arr.map(([val, lab]) => `<option value="${val}"${val === (sel || '') ? ' selected' : ''}>${lab}</option>`).join('');
    const typeOptions = Object.entries(CATALOG_TIPOS).map(([val, t]) =>
        `<option value="${val}"${val === (v.type || 'carga_total') ? ' selected' : ''}>${t.label}</option>`).join('');
    const wLabelText = (CATALOG_TIPOS[v.type || 'carga_total'] || CATALOG_TIPOS.carga_total).label;
    return `
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3">
        <div class="col-span-2"><label class="${LBL}">Tipo de registro</label>
            <select id="${p}type" onchange="onTypeChange('${p}')" class="${INP}">${typeOptions}</select>
        </div>
        <div class="col-span-2"><label class="${LBL}">Modo de registro</label>
            <select id="${p}mode" onchange="toggleSetMode('${p}')" class="${INP}">
                <option value="simple"${(v.mode || 'simple') === 'simple' ? ' selected' : ''}>Séries iguais (carga única)</option>
                <option value="sets"${v.mode === 'sets' ? ' selected' : ''}>Série a série (drop-set, pirâmide)</option>
            </select>
        </div>
    </div>
    <div id="${p}simple-box" class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-2.5">
        <div><label class="${LBL}" id="${p}w-label">${wLabelText}</label><input type="number" step="0.5" min="0" id="${p}w" value="${v.weight > 0 ? v.weight : ''}" placeholder="kg" class="${INP}"></div>
        <div class="sm:col-span-3"><label class="${LBL}">Reps por Série (ou segundos em isometria)</label><input type="text" id="${p}r" value="${escapeHtml(v.repsText || '')}" placeholder="12, 10, 8" class="${INP}"></div>
    </div>
    <div id="${p}sets-box" class="hidden mt-2.5 space-y-1.5">
        <div class="flex items-center justify-between"><label class="${LBL} !mb-0">Séries — carga · reps · RIR (opcional)</label>
            <button type="button" onclick="addSetRow('${p}')" class="text-[10px] font-bold text-cyan-400 hover:underline">+ série</button></div>
        <div id="${p}sets" class="space-y-1.5"></div>
    </div>
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-2.5">
        <div><label class="${LBL}">RIR (reps em reserva)</label><input type="number" min="0" max="10" id="${p}rir" value="${v.rir ?? ''}" placeholder="ex: 2" class="${INP}"></div>
        <div><label class="${LBL}">Técnica Avançada</label><select id="${p}t" class="${INP}">${optsSelect(TECHNIQUES, v.technique)}</select></div>
        <div class="col-span-2"><label class="${LBL} !text-emerald-400">💡 Meta Próximo Treino</label><select id="${p}g" class="${INP}">${optsSelect(NEXT_GOALS, v.nextGoal)}</select></div>
        <div class="col-span-2"><label class="${LBL}">Sessão (split do dia)</label><input type="text" id="${p}sessao" value="${escapeHtml(v.sessao || '')}" list="sessao-list" placeholder="ex: Peito/Tríceps/Ombro" class="${INP}"></div>
        <label class="flex items-center gap-2 cursor-pointer col-span-2 self-end pb-2"><input type="checkbox" id="${p}conf"${v.conferir ? ' checked' : ''} class="w-4 h-4 rounded text-amber-500 bg-berzerker-dark border-berzerker-border"><span class="text-[10px] font-bold text-amber-400 uppercase tracking-wider">⚠️ Conferir?</span></label>
        <div class="col-span-2 sm:col-span-4"><label class="${LBL}">Observações</label><textarea id="${p}n" rows="2" placeholder="Ex: ajuste do banco, dor, sensação, regulagem da máquina..." class="${INP}">${escapeHtml(v.notes || '')}</textarea></div>
        ${o.prOverride ? `<label class="flex items-center gap-2 cursor-pointer col-span-2"><input type="checkbox" id="${p}p"${v.isPR ? ' checked' : ''} class="w-4 h-4 rounded text-emerald-500 bg-berzerker-dark border-berzerker-border"><span class="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">🏆 PR (auto pelo 1RM — pode forçar)</span></label>` : ''}
    </div>`;
}

function readFields(p) {
    const g = k => document.getElementById(p + k);
    const mode = g('mode') ? g('mode').value : 'simple';
    const type = g('type') ? g('type').value : 'carga_total';
    const perSide = type === 'halter_uni';
    const base = {
        type, mode, perSide,
        technique: g('t').value,
        nextGoal: g('g').value,
        isPR: g('p') ? g('p').checked : false,
        rir: g('rir') && g('rir').value !== '' ? parseInt(g('rir').value) : null,
        sessao: g('sessao') ? g('sessao').value.trim() : '',
        conferir: g('conf') ? g('conf').checked : false,
        notes: g('n').value.trim()
    };
    if (mode === 'sets') {
        const sets = readSetRows(p);
        const reps = sets.map(s => s.reps);
        return { ...base, sets, reps, weight: sets.length ? sets[0].weight : 0, repsText: reps.join(', ') };
    }
    const reps = g('r').value.split(',').map(x => parseInt(x.trim())).filter(x => !isNaN(x) && x > 0);
    return { ...base, sets: null, weight: parseFloat(g('w').value) || 0, reps, repsText: g('r').value.trim() };
}

function snapshotDrafts() {
    if (!activeSession) return;
    activeSession.exercises.forEach((e, i) => {
        const w = document.getElementById(`s${i}-w`);
        const modeSel = document.getElementById(`s${i}-mode`);
        if (e.done || (!w && !modeSel)) return;
        const g = k => document.getElementById(`s${i}-${k}`);
        e.draft = {
            weight: w ? (parseFloat(w.value) || 0) : 0,
            repsText: g('r') ? g('r').value : '',
            mode: modeSel ? modeSel.value : 'simple',
            sets: (modeSel && modeSel.value === 'sets') ? readSetRows(`s${i}-`) : null,
            type: g('type') ? g('type').value : e.type,
            technique: g('t').value, nextGoal: g('g').value,
            isPR: g('p') ? g('p').checked : false,
            rir: g('rir') && g('rir').value !== '' ? parseInt(g('rir').value) : null,
            sessao: g('sessao') ? g('sessao').value : '',
            conferir: g('conf') ? g('conf').checked : false,
            notes: g('n').value
        };
    });
}

// ============================ ÚLTIMA VEZ / REPETIR ============================
function findLastPerformance(exerciseName, excludeId) {
    const cands = logs.filter(l => l.kind === 'peso' && l.exercise === exerciseName && l.id !== excludeId);
    cands.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.id - a.id)));
    return cands[0] || null;
}

function lastPerformanceHTML(exerciseName, excludeId) {
    const last = findLastPerformance(exerciseName, excludeId);
    if (!last) return '';
    const prog = duplaProgressao(last);
    return `<div class="flex items-center gap-2 flex-wrap text-[11px] font-mono text-gray-400 mt-1">
        <span>🕐 Última vez: <span class="text-gray-200">${formatShortBR(last.date)} · ${formatLoadText(last)} × ${formatRepsText(last)}</span></span>
        ${prog ? `<span class="text-emerald-400 font-bold">→ sugestão: ${prog.proximaCarga} kg</span>` : ''}
        <button type="button" data-ex="${escapeHtml(exerciseName)}" onclick="repeatLastPerformance(this.getAttribute('data-ex'))" class="px-2 py-0.5 bg-berzerker-border hover:bg-berzerker-600 text-white text-[10px] font-bold rounded uppercase">↻ Repetir</button>
    </div>`;
}

function repeatLastPerformance(exercise) {
    const last = findLastPerformance(exercise);
    if (!last) { alertModal('Sem registro anterior deste exercício.'); return; }
    const prog = duplaProgressao(last);
    const peso = prog ? prog.proximaCarga : (last.weight || 0);
    // Preenche o formulário rápido de registro
    const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    setVal('log-exercise', last.exercise);
    setVal('log-muscle', last.muscle);
    setVal('type', last.type || inferExerciseType(last.exercise, last.muscle));
    setVal('w', peso);
    setVal('r', (last.sets ? last.sets.map(s => s.reps) : last.reps || []).join(', '));
    onLogExerciseChange();
    document.getElementById('form-card-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    alertModal(prog
        ? `↻ Última performance carregada! Dupla progressão: suba para ${prog.proximaCarga} kg (todas as séries bateram ${prog.faixa[1]} reps).`
        : '↻ Última performance carregada no formulário.');
}

// ============================ ADD LOG ============================
function handleAddLog(event) {
    event.preventDefault();
    const date = document.getElementById('log-date').value;
    const muscle = document.getElementById('log-muscle').value;
    const exercise = document.getElementById('log-exercise').value.trim();
    const f = readFields('');

    if (!exercise) { alertModal('Digite o nome do exercício!'); return; }
    const temReps = f.mode === 'sets' ? f.sets.length > 0 : f.reps.length > 0;
    if (!temReps) { alertModal('Digite ao menos uma repetição válida (ex: 12, 10, 8) — ou segundos em isometria.'); return; }

    const newLog = {
        id: newLogId(), date, kind: 'peso', muscle, exercise,
        ...f
    };
    // PR automático pelo 1RM estimado (ou tempo, em isometria)
    newLog.isPR = detectAutoPR(newLog, logs, userBodyweight) || f.isPR;

    const prog = duplaProgressao(newLog);
    if (prog && !newLog.nextGoal) newLog.nextGoal = '📈 Aumentar Carga';

    logs.unshift(newLog);
    saveLogsToStorage();

    // Limpa campos, mantém data/grupo/tipo
    document.getElementById('log-exercise').value = '';
    document.getElementById('w').value = '';
    document.getElementById('r').value = '';
    document.getElementById('n').value = '';
    initSetEditor('', { mode: f.mode, sets: [] });
    document.getElementById('warmup-quick-box').classList.add('hidden');
    document.getElementById('filter-date').value = date;

    refreshAll();
    const vol = logVolumeKg(newLog, userBodyweight);
    let msg = `✅ "${exercise}" registrado! ${f.type === 'isometria' ? logTstSeconds(newLog) + ' s de tensão' : Math.round(vol).toLocaleString('pt-BR') + ' kg de volume'}`;
    if (newLog.isPR) msg += ` · 🏆 PR automático!`;
    if (prog) msg += ` · 💡 Dupla progressão: ${prog.proximaCarga} kg na próxima`;
    alertModal(msg);
    if (newLog.isPR) { shakeElement(document.getElementById('form-card-container')); spawnDamageFloat(vol * 2, true); }
}

// ============================ EDIÇÃO ============================
let _lastLogId = 0;
function newLogId() { _lastLogId = Math.max(Date.now(), _lastLogId + 1); return _lastLogId; }

function editLog(id) {
    const l = logs.find(x => x.id === id);
    if (!l) { alertModal('Registro não encontrado.'); return; }
    document.getElementById('edit-log-overlay')?.remove();
    const muscles = [...new Set([...MUSCLE_OPTIONS, l.muscle])];
    const o = document.createElement('div');
    o.id = 'edit-log-overlay';
    o.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-start sm:items-center justify-center p-4 overflow-y-auto';
    o.innerHTML = `
        <div class="bg-berzerker-card border border-berzerker-border rounded-2xl p-5 max-w-lg w-full shadow-2xl">
            <h3 class="font-oswald text-lg font-bold text-white uppercase tracking-wider mb-3">✏️ Editar registro</h3>
            <div class="grid grid-cols-2 gap-2.5">
                <div><label class="${LBL}">Data</label><input type="date" id="el-d" value="${l.date}" class="${INP}"></div>
                <div><label class="${LBL}">Grupo Muscular</label><select id="el-m" class="${INP}">${muscles.map(m => `<option value="${escapeHtml(m)}"${m === l.muscle ? ' selected' : ''}>${escapeHtml(m)}</option>`).join('')}</select></div>
                <div class="col-span-2"><label class="${LBL}">Exercício</label><input type="text" id="el-e" value="${escapeHtml(l.exercise)}" class="${INP}"></div>
            </div>
            ${fieldsHTML('el-', {
        type: l.type, mode: l.sets ? 'sets' : 'simple', sets: l.sets, weight: l.weight,
        repsText: (l.sets ? l.sets.map(s => s.reps) : l.reps || []).join(', '),
        technique: l.technique, nextGoal: l.nextGoal, isPR: l.isPR, notes: l.notes, rir: l.rir
    }, { prOverride: true })}
            <div class="flex gap-3 justify-end mt-4">
                <button onclick="document.getElementById('edit-log-overlay').remove()" class="px-4 py-2 bg-berzerker-border hover:bg-gray-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors">Cancelar</button>
                <button onclick="saveEditedLog(${id})" class="px-4 py-2 bg-berzerker-600 hover:bg-berzerker-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors">💾 Salvar alterações</button>
            </div>
        </div>`;
    document.body.appendChild(o);
    initSetEditor('el-', { mode: l.sets ? 'sets' : 'simple', sets: l.sets, weight: l.weight });
}

function saveEditedLog(id) {
    const l = logs.find(x => x.id === id);
    if (!l) return;
    const f = readFields('el-');
    const exercise = document.getElementById('el-e').value.trim();
    if (!exercise) { alertModal('Digite o nome do exercício!'); return; }
    const temReps = f.mode === 'sets' ? f.sets.length > 0 : f.reps.length > 0;
    if (!temReps) { alertModal('Digite ao menos uma repetição válida.'); return; }
    const isManualPR = f.isPR;
    Object.assign(l, f, {
        exercise, date: document.getElementById('el-d').value || l.date,
        muscle: document.getElementById('el-m').value
    });
    l.isPR = isManualPR || detectAutoPR(l, logs, userBodyweight);
    saveLogsToStorage();
    if (activeSession) activeSession.exercises.forEach(e => {
        if (e.logId === id) Object.assign(e, { exercise: l.exercise, muscle: l.muscle, loggedWeight: l.weight, loggedReps: l.reps, loggedPR: l.isPR });
    });
    document.getElementById('edit-log-overlay').remove();
    document.getElementById('filter-date').value = l.date;
    refreshAll();
    renderSession();
    alertModal('✅ Registro atualizado!');
}

function deleteLog(id) {
    confirmModal('Excluir este registro?', () => {
        logs = logs.filter(l => l.id !== id);
        if (activeSession) { activeSession.exercises.forEach(e => { if (e.logId === id) { e.done = false; e.logId = null; } }); renderSession(); }
        saveLogsToStorage();
        refreshAll();
    });
}

function handleFilterDateChange(newDate) {
    renderLogsTable();
    updateSummaryMetrics();
    renderRecoveryMap();
    renderBossBattleUI();
    generateStoryCard();
}

function getFilteredLogs() {
    const filterDate = document.getElementById('filter-date').value;
    return logs.filter(l => l.date === filterDate);
}

// ============================ RENDER: LOGS ============================
function renderLogsTable() {
    const container = document.getElementById('logs-container');
    const dayLogs = getFilteredLogs();

    if (dayLogs.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500 border border-dashed border-berzerker-border rounded-xl">
                Nenhum treino registrado nesta data.
            </div>`;
        return;
    }

    container.innerHTML = dayLogs.map(l => {
        const vol = logVolumeKg(l, userBodyweight);
        const isCardio = l.kind === 'corrida';
        const detalhe = isCardio
            ? `Distância: <span class="text-white font-bold">${String(l.distanceKm ?? 0).replace('.', ',')} km</span> · Tempo: <span class="text-cyan-300 font-bold">${l.durationMin ?? 0} min</span> · <span class="text-amber-400 font-bold">+${cardioXP(l)} XP</span>`
            : (l.type === 'isometria'
                ? `Tempo: <span class="text-white font-bold">${logTstSeconds(l)} s</span> × Séries: <span class="text-berzerker-500 font-bold">${formatRepsText(l)}</span> · <em class="text-gray-500">isometria não conta tonelagem</em>`
                : `Carga: <span class="text-white font-bold">${formatLoadText(l)}</span> × Séries: <span class="text-berzerker-500 font-bold">${formatRepsText(l)}</span> · Vol: <span class="text-amber-400 font-bold">${fmtN(Math.round(vol))} kg</span>`);
        return `
        <div class="bg-berzerker-dark border border-berzerker-border p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-gray-600 transition-colors">
            <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                    <span class="text-xs font-bold px-2 py-0.5 bg-berzerker-border text-berzerker-500 rounded uppercase">${escapeHtml(l.muscle)}</span>
                    ${l.isPR ? '<span class="text-xs font-bold px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded">🏆 PR (1RM auto)</span>' : ''}
                    ${l.technique && l.technique !== 'Convencional' ? `<span class="text-xs font-mono text-gray-400">[${escapeHtml(l.technique)}]</span>` : ''}
                    ${l.rir != null ? `<span class="text-[11px] font-mono text-cyan-300">RIR ${l.rir}</span>` : ''}
                    ${l.nextGoal ? `<span class="text-[11px] font-bold px-2 py-0.5 bg-berzerker-card border border-emerald-500/40 text-emerald-400 rounded">⚡ ${escapeHtml(l.nextGoal)}</span>` : ''}
                </div>
                <h3 class="font-bold text-white text-base mt-1">${l.biset ? '🔗 ' : ''}${escapeHtml(l.exercise)}${l.biset ? ' <span class="text-[10px] font-bold text-cyan-400 border border-cyan-500/40 rounded px-1.5 py-0.5 align-middle">BI-SET</span>' : ''}<button onclick="editLog(${l.id})" title="Editar" class="ml-2 px-2 py-0.5 text-xs text-gray-400 hover:text-cyan-400 align-middle">✏️ Editar</button></h3>
                ${l.notes ? `<p class="text-[11px] text-gray-400 mt-1 italic">📝 ${escapeHtml(l.notes)}</p>` : ''}
                <div class="text-xs text-gray-400 mt-1 font-mono">${detalhe}</div>
            </div>
            <button onclick="deleteLog(${l.id})" class="self-end sm:self-center p-2 text-gray-500 hover:text-red-400 transition-colors" title="Excluir">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
        </div>`;
    }).join('');
}

// ============================ RENDER: MAPA DE FADIGA ============================
// Fase 3: fadiga REAL = recuperação (%) + volume da semana vs faixa 10–20 séries
function renderRecoveryMap() {
    const gridEl = document.getElementById('recovery-status-grid');
    if (!gridEl) return;
    const nowMs = new Date().getTime();
    const weekly = weeklySetsByMuscle(logs, getTodayLocalISO());

    gridEl.innerHTML = MUSCULOS_MAPA.map(m => {
        const muscleLogs = logs.filter(l => l.kind !== 'corrida' && l.muscle && l.muscle.toLowerCase() === m.toLowerCase());
        const st = fatigueState(m, muscleLogs, weekly[m] || 0, nowMs);
        const pctText = st.pct === null ? '—' : `${st.pct}%`;
        return `
        <div onclick="prefillMuscleFromMap('${m}')" title="Registrar exercício de ${m}" class="cursor-pointer bg-berzerker-dark border ${st.border} rounded-xl p-3.5 space-y-2.5 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
            <div class="flex items-center justify-between gap-2">
                <span class="font-oswald text-lg font-bold text-white uppercase tracking-wide leading-none">${m}</span>
                <span class="text-lg leading-none">${st.icon}</span>
            </div>
            <div class="flex items-center justify-between gap-2 flex-wrap">
                <span class="px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${st.badge}">${st.label}</span>
                <span class="text-[10px] text-gray-500 font-mono">${st.info}</span>
            </div>
            <div>
                <div class="flex justify-between text-[10px] font-bold uppercase text-gray-500 mb-1">
                    <span>Prontidão real</span><span class="text-gray-400">${pctText}</span>
                </div>
                <div class="w-full h-2 bg-berzerker-border rounded-full overflow-hidden">
                    <div class="h-full ${st.bar} rounded-full transition-all duration-500" style="width: ${st.pct === null ? 100 : st.pct}%"></div>
                </div>
            </div>
            <div class="text-[10px] font-mono ${st.volumeStatus === 'abaixo' ? 'text-amber-400/90' : st.volumeStatus === 'acima' ? 'text-orange-400/90' : 'text-emerald-400/90'}">${st.volText}</div>
            <div class="text-[10px] text-gray-600 truncate border-t border-berzerker-border pt-1.5">Último: ${escapeHtml(st.last)} · janela ${st.hoursNeed}h</div>
        </div>`;
    }).join('');
}

function prefillMuscleFromMap(m) {
    const sel = document.getElementById('log-muscle');
    if (sel) sel.value = m;
    const card = document.getElementById('form-card-container');
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => document.getElementById('log-exercise')?.focus(), 400);
}

// ============================ RENDER: SUGESTÃO DO DIA ============================
// Fase 3: próximo treino recomendado — grupos mais descansados e mais abaixo
// da meta semanal, com o raciocínio em linguagem simples.
function renderDaySuggestion() {
    const el = document.getElementById('suggestion-content');
    if (!el) return;
    if (savedWorkouts.length === 0) {
        el.innerHTML = `<p class="text-xs text-gray-500">Monte um treino no <b>Criar Treino</b> para receber a sugestão do dia.</p>`;
        return;
    }
    const scored = suggestNextWorkout(savedWorkouts, logs, Date.now());
    const top = scored[0];
    const alternates = scored.slice(1, 3);
    el.innerHTML = `
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="min-w-0">
                <div class="text-xs text-gray-400 uppercase font-bold">🎯 Próximo treino recomendado (recuperação + séries da semana)</div>
                <div class="font-oswald text-xl font-bold text-white uppercase mt-1">${escapeHtml(top.w.name)}</div>
                <div class="text-[11px] text-gray-500 mt-0.5 leading-relaxed">Por quê: ${escapeHtml(top.motivos.slice(0, 3).join(' · '))}</div>
                ${top.diasSemTreinar >= 1 ? `<div class="text-[11px] text-amber-400/90 mt-0.5">⏳ Sem treino registrado há ${top.diasSemTreinar} ${top.diasSemTreinar === 1 ? 'dia' : 'dias'}.</div>` : ''}
                ${alternates.length ? `<div class="text-[10px] text-gray-600 mt-1.5">Outras opções: ${alternates.map(a => `<button type="button" onclick="startSession(${a.w.id})" class="underline hover:text-white transition-colors">${escapeHtml(a.w.name)}</button>`).join(' · ')}</div>` : ''}
            </div>
            <button onclick="startSession(${top.w.id})" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-lg shadow-emerald-600/20 whitespace-nowrap">▶ Treinar esta sugestão</button>
        </div>`;
}

// ============================ CARDIO / CORRIDA ============================
function registerCorrida(event) {
    event.preventDefault();
    const date = document.getElementById('cardio-date').value || getTodayLocalISO();
    const exercise = document.getElementById('cardio-type').value;
    const distanceKm = parseFloat(document.getElementById('cardio-distance').value) || 0;
    const durationMin = parseFloat(document.getElementById('cardio-duration').value) || 0;
    const notes = document.getElementById('cardio-notes').value.trim();
    if (distanceKm <= 0 && durationMin <= 0) { alertModal('Informe a distância e/ou o tempo da corrida.'); return; }
    const newLog = {
        id: newLogId(), date, kind: 'corrida', muscle: 'Cardio', exercise,
        distanceKm, durationMin, notes, technique: 'Convencional', isPR: false, nextGoal: '', type: 'corrida', reps: []
    };
    newLog.isPR = detectAutoPR(newLog, logs, userBodyweight);
    logs.unshift(newLog);
    saveLogsToStorage();
    document.getElementById('cardio-distance').value = '';
    document.getElementById('cardio-duration').value = '';
    document.getElementById('cardio-notes').value = '';
    document.getElementById('filter-date').value = date;
    refreshAll();
    alertModal(`🏃 Corrida registrada! ${String(distanceKm).replace('.', ',')} km · ${durationMin} min · +${cardioXP(newLog)} XP${newLog.isPR ? ' · 🏆 PR de distância!' : ''}`);
}

// ============================ SESSÃO ============================
function startSession(workoutId) {
    const w = savedWorkouts.find(x => x.id === workoutId);
    if (!w) { alertModal('Treino não encontrado!'); return; }

    const todayStr = getTodayLocalISO();
    document.getElementById('log-date').value = todayStr;
    document.getElementById('filter-date').value = todayStr;

    // Fase 2: ordem sugerida aplicada automaticamente (com o "porquê" de cada posição)
    const ordered = orderWorkoutExercises(w.exercises || [], { logs, nowMs: Date.now() });
    activeSession = {
        workoutId: w.id,
        name: w.name,
        ordenado: true,
        exercises: ordered.map(e => ({
            muscle: e.muscle,
            exercise: e.exercise,
            type: e.type || inferExerciseType(e.exercise, e.muscle),
            weight: e.weight || 0,
            repsText: e.repsText || (Array.isArray(e.reps) ? e.reps.join(', ') : ''),
            technique: e.technique || 'Convencional',
            biset: !!e.biset, done: false, logId: null, draft: null,
            loggedWeight: null, loggedReps: null, loggedPR: false,
            orderReason: e.orderReason || ''
        }))
    };

    renderLogsTable();
    updateSummaryMetrics();
    renderRecoveryMap();

    const card = document.getElementById('active-session-card');
    card.classList.remove('hidden');
    renderSession();
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    acquireWakeLock();
    alertModal(`⚔️ "${w.name}" iniciado! Bora treinar!`);
}

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
                        <span class="text-[10px] font-bold px-1.5 py-0.5 bg-berzerker-border text-berzerker-500 rounded uppercase">${escapeHtml(e.muscle)}</span>
                        <span class="font-bold text-white text-sm">${escapeHtml(e.exercise)}</span>
                        ${e.loggedPR ? '<span class="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-700 rounded">🏆 PR</span>' : ''}
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-bold text-emerald-400 font-mono whitespace-nowrap">${lg ? formatLoadText(lg) + ' × ' + formatRepsText(lg) : ''}</span>
                        <button onclick="editLog(${e.logId})" class="px-2 py-1 bg-berzerker-border hover:bg-gray-700 text-white text-[11px] font-bold rounded-lg transition-colors">✏️ Editar</button>
                    </div>
                </div>
                ${lg && lg.notes ? `<p class="text-[11px] text-gray-400 mt-1.5 italic">📝 ${escapeHtml(lg.notes)}</p>` : ''}
            </div>`;
        }
        const d = e.draft || { weight: e.weight, repsText: e.repsText, type: e.type, technique: e.technique, nextGoal: '', isPR: false, notes: '' };
        const catInfo = catalogInfo(e.exercise);
        const fat = fatigueState(e.muscle, logs.filter(l => l.kind !== 'corrida' && l.muscle === e.muscle), weekly[e.muscle] || 0, nowMs);
        return `<div>
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div class="flex items-center gap-2 flex-wrap min-w-0">
                    <span class="w-6 h-6 flex items-center justify-center rounded-md text-xs font-bold shrink-0 bg-berzerker-border text-gray-300">${i + 1}</span>
                    <span class="text-[10px] font-bold px-1.5 py-0.5 bg-berzerker-border text-berzerker-500 rounded uppercase">${escapeHtml(e.muscle)}</span>
                    <span class="font-bold text-white text-sm">${escapeHtml(e.exercise)}</span>
                </div>
                <div class="flex items-center gap-1.5">
                    <button type="button" onclick="moveSessionUnit(${i}, -1)" title="Subir na ordem" class="px-2 py-1 text-[10px] font-bold bg-berzerker-border text-gray-300 rounded-md hover:bg-gray-700">▲</button>
                    <button type="button" onclick="moveSessionUnit(${i}, 1)" title="Descer na ordem" class="px-2 py-1 text-[10px] font-bold bg-berzerker-border text-gray-300 rounded-md hover:bg-gray-700">▼</button>
                    <span class="text-[10px] text-gray-500 font-mono whitespace-nowrap">🎯 Meta: ${e.weight > 0 ? e.weight + ' kg' : '—'} × (${escapeHtml(e.repsText || '—')})</span>
                </div>
            </div>
            ${e.orderReason ? `<div class="text-[10px] text-gray-500 leading-relaxed"><span class="text-berzerker-500 font-bold">📌 Por que nesta posição:</span> ${escapeHtml(e.orderReason)}</div>` : ''}
            ${fat.pct !== null && fat.pct < 100 ? `<div class="text-[10px] text-amber-400/90 font-mono">⏳ ${escapeHtml(e.muscle)} ainda em recuperação (${fat.pct}%) — considere uma carga mais leve</div>` : ''}
            ${catInfo && catInfo.descanso ? `<div class="text-[10px] text-gray-500 font-mono">⏱ Descanso do catálogo: ${catInfo.descanso}s · faixa ${catInfo.faixa[0]}–${catInfo.faixa[1]}${catInfo.tipo === 'isometria' ? ' s' : ' reps'}</div>` : ''}
            ${lastPerformanceHTML(e.exercise)}
            <div class="flex gap-2 flex-wrap mt-1.5">
                <button type="button" onclick="showWarmupFor(${i})" class="px-2 py-1 text-[10px] font-bold bg-amber-900/30 border border-amber-500/30 text-amber-300 rounded-md hover:bg-amber-900/50">🔥 Aquecimento</button>
                <button type="button" onclick="showPlatesFor(${i})" class="px-2 py-1 text-[10px] font-bold bg-berzerker-border text-gray-200 rounded-md hover:bg-gray-700">⚙️ Anilhas</button>
            </div>
            <div id="s${i}-quickbox" class="hidden mt-1.5 text-[11px] font-mono bg-berzerker-dark/80 border border-amber-500/20 rounded-lg p-2"></div>
            ${fieldsHTML(`s${i}-`, d)}
        </div>`;
    };

    let html = '';
    if (activeSession.ordenado) {
        html += `<div class="text-[11px] text-gray-400 bg-berzerker-dark border border-berzerker-border rounded-lg px-3 py-2">✨ <b class="text-white">Ordem sugerida aplicada</b> — cada exercício mostra o porquê da posição. Use ▲▼ para trocar quando quiser (o bi-set anda junto).</div>`;
    }
    for (let i = 0; i < ex.length; i++) {
        const pair = !!(ex[i + 1] && ex[i + 1].biset);
        const idxs = pair ? [i, i + 1] : [i];
        if (pair) i++;
        const pending = idxs.filter(k => !ex[k].done);
        html += `<div class="rounded-xl border ${pending.length ? (pair ? 'border-cyan-500/60 bg-berzerker-dark' : 'border-berzerker-border bg-berzerker-dark') : 'border-emerald-600/50 bg-emerald-950/10'} p-4 space-y-3">
            ${pair ? '<div class="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">🔗 BI-SET — os dois juntos; o descanso começa depois do par</div>' : ''}
            ${idxs.map(k => itemHTML(ex[k], k)).join('<div class="border-t border-dashed border-berzerker-border"></div>')}
            ${pending.length ? `<div class="flex justify-end"><button onclick="registerSessionUnit([${pending.join(',')}], ${pair})" class="px-4 py-2 bg-berzerker-600 hover:bg-berzerker-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors">✔ Registrar${pending.length > 1 ? ' Bi-set' : ''}</button></div>` : ''}
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
                            <div class="text-[11px] text-gray-400 mt-0.5">Por quê: ${escapeHtml(top.motivos.slice(0, 2).join(' · '))}</div>
                        </div>
                        <button onclick="startSession(${top.w.id})" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg whitespace-nowrap">▶ Começar este treino</button>
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
        const newLog = {
            id, date, kind: 'peso', muscle: item.muscle, exercise: item.exercise,
            ...f, ...(isPair ? { biset: true } : {})
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

function endSession() {
    if (!activeSession) return;
    const remaining = activeSession.exercises.filter(e => !e.done).length;
    const finish = () => {
        activeSession = null;
        stopSessionTimer();
        releaseWakeLock();
        document.getElementById('active-session-card').classList.add('hidden');
        renderDaySuggestion();
        renderRecoveryMap();
        if (document.getElementById('builder-week-gaps')) renderWeekGaps();
        alertModal('💪 Treino finalizado! O mapa de fadiga e a sugestão do próximo treino já foram atualizados.');
    };
    if (remaining > 0) {
        confirmModal(`Ainda existem ${remaining} exercício(s) sem registro. Finalizar o treino mesmo assim?`, finish);
    } else {
        finish();
    }
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
            btn.className = 'px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold uppercase rounded-lg transition-colors';
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
        btn.className = 'px-3 py-2 bg-berzerker-600 hover:bg-berzerker-500 text-white text-[10px] font-bold uppercase rounded-lg transition-colors';
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

function stopSessionTimer() {
    if (timer.interval) clearInterval(timer.interval);
    timer = { endsAt: null, remainingMs: 0, running: false, interval: null };
    updateSessionTimerDisplay();
    const btn = document.getElementById('session-timer-btn');
    if (btn) {
        btn.textContent = 'Iniciar';
        btn.className = 'px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold uppercase rounded-lg transition-colors';
    }
}

// Ao voltar para o primeiro plano, o relógio se re-sincroniza pelo horário de término
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        tickSessionTimer();
        if (activeSession) acquireWakeLock();
    }
});

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

// ============================ WAKE LOCK (tela acesa no treino) ============================
async function acquireWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
            wakeLock.addEventListener('release', () => { wakeLock = null; });
        }
    } catch (e) { /* não suportado */ }
}
function releaseWakeLock() {
    try { if (wakeLock) { wakeLock.release(); wakeLock = null; } } catch (e) { }
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
    if (e.biset) return `<button onclick="toggleDraftBiset(${i})" class="ml-5 text-[10px] font-bold text-gray-500 hover:text-red-400 transition-colors">✂ Desfazer bi-set</button>`;
    if (i > 0 && !d[i - 1].biset && !(d[i + 1] && d[i + 1].biset))
        return `<button onclick="toggleDraftBiset(${i})" class="w-full text-[11px] font-bold text-cyan-400 hover:bg-cyan-950/30 border border-dashed border-cyan-500/40 rounded-lg py-1.5 transition-colors">🔗 Juntar com o exercício acima em bi-set</button>`;
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

function updateExerciseSuggestions() {
    const datalist = document.getElementById('wb-exercise-suggestions');
    const muscle = document.getElementById('wb-muscle')?.value;
    if (!datalist || !muscle) return;
    const historyNames = muscle === 'Geral'
        ? logs.map(l => l.exercise)
        : logs.filter(l => l.muscle === muscle).map(l => l.exercise);
    const all = [...new Set([...(EXERCISE_CATALOG[muscle] || []), ...historyNames])];
    datalist.innerHTML = all.map(n => {
        const cat = catalogInfo(n);
        const info = cat ? `${CATALOG_TIPOS[cat.tipo]?.label || ''}` : '';
        return `<option value="${escapeHtml(n)}">${escapeHtml(info)}</option>`;
    }).join('');
}

function onWbExerciseChange() {
    const exName = document.getElementById('wb-exercise')?.value.trim();
    const cat = catalogInfo(exName);
    const hint = document.getElementById('wb-type-hint');
    if (cat) {
        const muscleSel = document.getElementById('wb-muscle');
        if (muscleSel) muscleSel.value = cat.grupo;
        if (hint) hint.textContent = `${cat.equipamento} · ${CATALOG_TIPOS[cat.tipo]?.label || ''} · faixa ${cat.faixa[0]}–${cat.faixa[1]}${cat.tipo === 'isometria' ? ' s' : ' reps'}`;
    } else if (hint) {
        hint.textContent = 'Fora do catálogo — o tipo fica como "carga total".';
    }
}

function addExerciseToDraft(forceBiset) {
    const muscle = document.getElementById('wb-muscle').value;
    const exercise = document.getElementById('wb-exercise').value.trim();
    const weight = parseFloat(document.getElementById('wb-weight').value) || 0;
    const repsText = document.getElementById('wb-reps').value.trim();
    const technique = document.getElementById('wb-technique').value;

    if (!exercise) {
        alertModal('Digite o nome do exercício!');
        document.getElementById('wb-exercise').focus();
        return;
    }

    const reps = repsText.split(',').map(r => parseInt(r.trim())).filter(r => !isNaN(r) && r > 0);
    const cat = catalogInfo(exercise);
    const type = cat ? cat.tipo : inferExerciseType(exercise, muscle);
    const last = draftExercises[draftExercises.length - 1];
    let biset = false;
    if (forceBiset === true) {
        if (!last) alertModal('O bi-set precisa de um exercício anterior — este entra como o primeiro.');
        else if (last.biset) alertModal('O exercício anterior já é o 2º de um bi-set (máximo 2) — este entra separado.');
        else biset = true;
    }
    draftExercises.push({ muscle, exercise, weight, reps, repsText, technique, biset, type });
    renderDraftList();

    document.getElementById('wb-exercise').value = '';
    document.getElementById('wb-weight').value = '';
    document.getElementById('wb-reps').value = '';
    document.getElementById('wb-exercise').focus();
}

function removeDraftExercise(i) {
    draftExercises.splice(i, 1);
    renderDraftList();
}

function moveDraftExercise(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= draftExercises.length) return;
    [draftExercises[i], draftExercises[j]] = [draftExercises[j], draftExercises[i]];
    // ordem mudou na mão — os motivos da sugestão antiga não fazem mais sentido
    draftExercises.forEach(x => { x.orderReason = ''; });
    renderDraftList();
}

// Fase 2 no montador: reordena o rascunho pelas regras (você continua livre p/ trocar)
function applySuggestedOrder() {
    if (draftExercises.length < 2) { alertModal('Adicione pelo menos 2 exercícios para o assistente ordenar.'); return; }
    const ordered = orderWorkoutExercises(draftExercises, { logs, nowMs: Date.now() });
    draftExercises = ordered.map(e => ({ ...e }));
    renderDraftList();
    alertModal('✨ Ordem sugerida aplicada! Cada exercício mostra o porquê — use ▲▼ para mudar quando quiser.');
}

// Painel "o que falta na semana" (estímulo total = 10–20 séries por grupo)
function renderWeekGaps() {
    const el = document.getElementById('builder-week-gaps');
    if (!el) return;
    const gaps = weeklyGaps(logs, getTodayLocalISO());
    const min = FAIXA_SERIES_SEMANAIS.min, max = FAIXA_SERIES_SEMANAIS.max;
    if (gaps.length === 0) {
        el.innerHTML = `<div class="text-[11px] text-emerald-400/90 bg-emerald-950/20 border border-emerald-700/40 rounded-lg p-2.5">✅ Todos os grupos musculares estão dentro (ou acima) da faixa de ${min}–${max} séries/semana. Bom trabalho!</div>`;
        return;
    }
    const chips = gaps.map(g => {
        const txt = g.status === 'abaixo'
            ? `${g.muscle}: ${g.series}/${min} min · faltam ${g.faltam}`
            : `${g.muscle}: ${g.series}/${max} máx · +${g.excesso} acima`;
        const cls = g.status === 'abaixo'
            ? 'bg-amber-950/40 border-amber-700/40 text-amber-300'
            : 'bg-orange-950/40 border-orange-700/40 text-orange-300';
        return `<span class="text-[10px] font-mono px-2 py-1 rounded border ${cls}">${escapeHtml(txt)}</span>`;
    }).join('');
    el.innerHTML = `
        <div class="bg-berzerker-dark border border-berzerker-border rounded-xl p-3 space-y-2">
            <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">🎯 Estímulo da semana — o que falta (${min}–${max} séries por grupo)</div>
            <div class="flex flex-wrap gap-1.5">${chips}</div>
            <div class="text-[10px] text-gray-500">O assistente sugere treinos que cobrem os grupos mais abaixo da meta — mas quem manda é você.</div>
        </div>`;
}

function renderDraftList() {
    const listEl = document.getElementById('draft-exercises-list');
    const countEl = document.getElementById('draft-count');
    if (!listEl) return;
    if (countEl) countEl.textContent = draftExercises.length;
    normalizeBisets(draftExercises);
    const bb = document.getElementById('wb-biset-btn');
    if (bb) {
        const lastEx = draftExercises[draftExercises.length - 1];
        bb.disabled = !lastEx || !!lastEx.biset;
        bb.classList.toggle('opacity-40', bb.disabled);
        bb.title = bb.disabled ? 'Adicione antes um exercício que ainda não esteja num bi-set' : `Adiciona este exercício em bi-set com "${lastEx.exercise}"`;
    }

    if (draftExercises.length === 0) {
        listEl.innerHTML = `
            <div class="text-center py-6 text-gray-500 border border-dashed border-berzerker-border rounded-xl text-xs uppercase tracking-wider">
                Nenhum exercício no treino ainda — adicione acima.
            </div>`;
        return;
    }

    listEl.innerHTML = draftExercises.map((e, i) => pairLink(i) + `
        <div class="bg-berzerker-dark border ${e.biset ? 'border-cyan-500/60 ml-5' : 'border-berzerker-border'} rounded-xl p-3 flex items-center justify-between gap-3 hover:border-berzerker-600 transition-colors">
            <div class="flex items-center gap-3 min-w-0">
                <span class="w-6 h-6 flex items-center justify-center bg-berzerker-600/20 border border-berzerker-600/40 text-berzerker-500 rounded-md text-xs font-bold shrink-0">${i + 1}</span>
                <div class="min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="text-[10px] font-bold px-1.5 py-0.5 bg-berzerker-border text-berzerker-500 rounded uppercase">${escapeHtml(e.muscle)}</span>
                        ${e.technique !== 'Convencional' ? `<span class="text-[10px] font-mono text-gray-500">[${escapeHtml(e.technique)}]</span>` : ''}
                        ${e.type && e.type !== 'carga_total' ? `<span class="text-[10px] font-mono text-amber-400/80">${escapeHtml(CATALOG_TIPOS[e.type]?.label || e.type)}</span>` : ''}
                    </div>
                    <span class="font-bold text-white text-sm block truncate">${e.biset ? '🔗 ' : ''}${escapeHtml(e.exercise)}</span>
                    <span class="text-[11px] text-gray-400 font-mono">Meta: ${e.weight > 0 ? e.weight + ' kg' : '—'} × (${escapeHtml(e.repsText || '—')})</span>
                    ${e.orderReason ? `<div class="text-[10px] text-gray-500 mt-1 leading-relaxed">📌 ${escapeHtml(e.orderReason)}</div>` : ''}
                    ${lastPerformanceHTML(e.exercise)}
                </div>
            </div>
            <div class="flex items-center gap-0.5 shrink-0">
                <button onclick="moveDraftExercise(${i}, -1)" title="Subir" class="p-1.5 text-gray-500 hover:text-white transition-colors text-[10px]">▲</button>
                <button onclick="moveDraftExercise(${i}, 1)" title="Descer" class="p-1.5 text-gray-500 hover:text-white transition-colors text-[10px]">▼</button>
                <button onclick="removeDraftExercise(${i})" title="Remover" class="p-1.5 text-gray-500 hover:text-red-400 transition-colors text-xs">✕</button>
            </div>
        </div>
    `).join('');
}

function updateSaveButton() {
    const btn = document.getElementById('btn-save-workout');
    if (!btn) return;
    btn.textContent = editingWorkoutId !== null ? '💾 Atualizar Treino' : '💾 Salvar Treino';
}

function saveWorkout() {
    const nameEl = document.getElementById('workout-name');
    const name = nameEl.value.trim();
    if (!name) { alertModal('Dê um nome ao treino!'); nameEl.focus(); return; }
    if (draftExercises.length === 0) { alertModal('Adicione ao menos 1 exercício ao treino!'); return; }

    if (editingWorkoutId !== null) {
        const idx = savedWorkouts.findIndex(w => w.id === editingWorkoutId);
        if (idx >= 0) {
            savedWorkouts[idx] = { ...savedWorkouts[idx], name, exercises: JSON.parse(JSON.stringify(draftExercises)) };
        }
        alertModal('✅ Treino atualizado!');
    } else {
        savedWorkouts.push({ id: Date.now(), name, exercises: JSON.parse(JSON.stringify(draftExercises)) });
        alertModal('💾 Treino salvo! Agora é só clicar em ▶ Iniciar no dia do treino.');
    }

    saveWorkoutsToStorage();
    clearDraft(false);
    renderSavedWorkouts();
    renderDaySuggestion();
}

function clearDraft(showToast = true) {
    draftExercises = [];
    editingWorkoutId = null;
    const nameEl = document.getElementById('workout-name');
    if (nameEl) nameEl.value = '';
    renderDraftList();
    updateSaveButton();
    if (showToast) alertModal('Rascunho descartado.');
}

function editWorkout(id) {
    const w = savedWorkouts.find(x => x.id === id);
    if (!w) return;
    editingWorkoutId = id;
    draftExercises = JSON.parse(JSON.stringify(w.exercises));
    document.getElementById('workout-name').value = w.name;
    renderDraftList();
    updateSaveButton();
    document.getElementById('workout-name').scrollIntoView({ behavior: 'smooth', block: 'center' });
    alertModal(`✏️ Editando "${w.name}" — salve para aplicar as mudanças.`);
}

function deleteWorkout(id) {
    const w = savedWorkouts.find(x => x.id === id);
    if (!w) return;
    confirmModal(`Excluir o treino "${w.name}"?`, () => {
        savedWorkouts = savedWorkouts.filter(x => x.id !== id);
        if (editingWorkoutId === id) clearDraft(false);
        saveWorkoutsToStorage();
        renderSavedWorkouts();
        renderDaySuggestion();
        alertModal('Treino excluído.');
    });
}

function renderSavedWorkouts() {
    const listEl = document.getElementById('saved-workouts-list');
    if (!listEl) return;

    if (savedWorkouts.length === 0) {
        listEl.innerHTML = `
            <div class="col-span-full text-center py-6 text-gray-500 border border-dashed border-berzerker-border rounded-xl text-xs uppercase tracking-wider">
                Nenhum treino salvo ainda — monte o primeiro acima! 💪
            </div>`;
        return;
    }

    listEl.innerHTML = savedWorkouts.map(w => {
        const muscleTags = [...new Set(w.exercises.map(e => e.muscle))];
        return `
        <div class="bg-berzerker-dark border border-berzerker-border rounded-xl p-4 space-y-2.5 hover:border-berzerker-600 transition-colors flex flex-col">
            <div class="flex items-start justify-between gap-2">
                <h4 class="font-oswald font-bold text-white text-base uppercase leading-tight">${escapeHtml(w.name)}</h4>
                <span class="text-[10px] font-bold px-2 py-0.5 bg-berzerker-border text-gray-300 rounded uppercase whitespace-nowrap">${w.exercises.length} exs</span>
            </div>
            <div class="flex flex-wrap gap-1">
                ${muscleTags.map(mt => `<span class="text-[9px] font-bold px-1.5 py-0.5 bg-berzerker-border text-berzerker-500 rounded uppercase">${escapeHtml(mt)}</span>`).join('')}
            </div>
            <p class="text-[11px] text-gray-500 font-mono leading-relaxed line-clamp-2">${escapeHtml(w.exercises.map((e, i) => (i ? (e.biset ? ' + ' : ' · ') : '') + e.exercise).join(''))}</p>
            <div class="flex gap-2 pt-1 mt-auto">
                <button onclick="startSession(${w.id})" class="flex-1 px-3 py-2 bg-berzerker-600 hover:bg-berzerker-500 text-white text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors">▶ Iniciar</button>
                <button onclick="editWorkout(${w.id})" title="Editar" class="px-3 py-2 bg-berzerker-border hover:bg-gray-700 text-white text-[11px] rounded-lg transition-colors">✏️</button>
                <button onclick="deleteWorkout(${w.id})" title="Excluir" class="px-3 py-2 bg-berzerker-border hover:bg-red-900/60 text-red-400 text-[11px] rounded-lg transition-colors">🗑</button>
            </div>
        </div>`;
    }).join('');
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

function updateSummaryMetrics() {
    const filterDate = document.getElementById('filter-date').value;
    const rank = getAnimalRankForSession(filterDate);
    document.getElementById('stat-tonnage').textContent = `${(rank.sessionTonnage / 1000).toFixed(2)} TON`;
    document.getElementById('stat-relative').textContent = `${rank.relativeRatio.toFixed(1)}× BW`;
    document.getElementById('stat-rank').textContent = `${rank.icon} ${rank.name} (Niv ${rank.level} · ${fmtN(rank.xp)} XP)`;
    const todayDmg = Math.round(rank.sessionTonnage);
    document.getElementById('stat-boss-dmg').textContent = `${todayDmg.toLocaleString()} DMG`;
}

// ============================ BOSS BATTLE ============================
// Retratos padrão dos chefões (arte original embutida no app).
// O upload do usuário (bossPortraits) tem prioridade sobre estes.
const DEFAULT_BOSS_PORTRAITS = {
    'classico:boss1': 'images/bosses/golem-anilhas.jpg',
    'classico:boss2': 'images/bosses/hidra-titanio.jpg',
    'classico:boss3': 'images/bosses/mecagorila.jpg',
    'classico:boss4': 'images/bosses/behemoth.jpg',
    'folclore:b0': 'images/bosses/saci.jpg',
    'folclore:b1': 'images/bosses/curupira.jpg',
    'folclore:b2': 'images/bosses/caipora.jpg',
    'folclore:b3': 'images/bosses/lobisomem.jpg',
    'folclore:b4': 'images/bosses/cuca.jpg',
    'folclore:b5': 'images/bosses/mula-sem-cabeca.jpg',
    'folclore:b6': 'images/bosses/iara.jpg',
    'folclore:b7': 'images/bosses/boto.jpg',
    'folclore:b8': 'images/bosses/boitata.jpg',
    'folclore:b9': 'images/bosses/naia.jpg',
    'folclore:b10': 'images/bosses/mapinguari.jpg',
    'folclore:b11': 'images/bosses/anhanguera.jpg'
};

function bossPortraitSrc(bossId) {
    if (bossPortraits[bossId]) return bossPortraits[bossId]; // upload do usuário
    return DEFAULT_BOSS_PORTRAITS[(THEME ? THEME.id : 'classico') + ':' + bossId] || null;
}

// Cache de imagens para desenho em canvas (o canvas precisa de HTMLImageElement)
const _bossImgCache = {};
function getBossImg(src) {
    if (!src) return null;
    if (_bossImgCache[src]) return _bossImgCache[src];
    const img = new Image();
    img.src = src;
    _bossImgCache[src] = img;
    return img;
}

function renderBossBattleUI() {
    const prog = computeBossProgress(logs, userBodyweight, BOSSES);
    const filterDate = document.getElementById('filter-date').value || getTodayLocalISO();
    const rank = getAnimalRankForSession(filterDate);
    const todayDmg = Math.round(rank.dayLogs.reduce((a, l) => a + logDamageKg(l, userBodyweight, prog.current), 0));

    document.getElementById('boss-today-dmg-display').textContent = `${todayDmg.toLocaleString()} DMG`;
    document.getElementById('stat-boss-dmg').textContent = `${todayDmg.toLocaleString()} DMG`;

    const currentBoss = prog.current;
    const portrait = bossPortraitSrc(currentBoss.id);
    const activeCard = document.getElementById('active-boss-card');
    if (activeCard) {
        activeCard.innerHTML = `
            <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div class="flex items-center gap-4">
                    <div class="w-20 h-20 sm:w-24 sm:h-24 p-1 bg-berzerker-border/50 rounded-2xl border border-berzerker-border overflow-hidden flex items-center justify-center shrink-0">
                        ${portrait ? `<img src="${portrait}" class="w-full h-full object-cover rounded-xl" alt="retrato">` : `<span class="text-6xl">${currentBoss.icon}</span>`}
                    </div>
                    <div>
                        <span class="text-xs font-bold text-red-400 uppercase tracking-wider block">${THEME.bossLabel} — ${THEME.stageWord} ${prog.currentIdx + 1}/${BOSSES.length}</span>
                        <h3 class="font-oswald text-3xl font-bold text-white uppercase">${escapeHtml(currentBoss.name)}</h3>
                        <p class="text-xs text-gray-400 mt-0.5">${escapeHtml(currentBoss.desc)}</p>
                        <div class="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-700 uppercase">💢 Fraqueza: ${escapeHtml(currentBoss.weak || '—')} ×1,25</span>
                            <label class="text-[10px] font-bold px-2 py-0.5 rounded bg-berzerker-border text-gray-300 cursor-pointer hover:bg-gray-700">🖼️ Retrato
                                <input type="file" accept="image/*" class="hidden" onchange="uploadBossPortrait(event, '${currentBoss.id}')">
                            </label>
                            <button onclick="openBossDefeatCard()" class="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-900/40 text-amber-300 border border-amber-700/50 hover:bg-amber-900/70">📸 Card do Chefão</button>
                        </div>
                    </div>
                </div>
                <div class="text-right w-full sm:w-auto">
                    <span class="text-xs text-gray-400 font-bold uppercase block">Vida do Boss (HP)</span>
                    <div class="font-oswald text-3xl font-bold text-red-500">${fmtN(prog.currentHp)} / ${fmtN(currentBoss.maxHp)} HP</div>
                    <div class="text-[10px] text-gray-500 font-mono mt-0.5">${prog.critCount} golpes críticos (PR ×2) · ${prog.weakHits} acertos na fraqueza</div>
                </div>
            </div>
            <div class="space-y-1">
                <div class="w-full bg-berzerker-border h-5 rounded-full overflow-hidden p-0.5 border border-red-900/50">
                    <div class="bg-gradient-to-r from-red-700 via-berzerker-500 to-amber-500 h-full rounded-full transition-all duration-500" style="width: ${prog.hpPercent}%"></div>
                </div>
                <div class="flex justify-between text-[11px] font-mono text-gray-400">
                    <span>Dano total acumulado: ${fmtN(prog.totalDamage)} DMG (PRs = crítico ×2)</span>
                    <span>${prog.hpPercent.toFixed(1)}% HP Restante</span>
                </div>
            </div>`;
    }

    const grid = document.getElementById('bosses-grid');
    if (grid) {
        let checkKg = prog.totalDamage;
        grid.innerHTML = BOSSES.map((b, idx) => {
            const defeated = idx < prog.defeatedCount;
            const thumb = bossPortraitSrc(b.id);
            return `
                <div class="p-4 rounded-xl border ${defeated ? 'bg-emerald-950/20 border-emerald-500/50' : (idx === prog.currentIdx ? 'bg-berzerker-dark border-red-500' : 'bg-berzerker-dark/40 border-berzerker-border opacity-50')} space-y-2">
                    <div class="flex justify-between items-center">
                        ${thumb ? `<img src="${thumb}" alt="${escapeHtml(b.name)}" class="w-10 h-10 rounded-lg object-cover border border-berzerker-border">` : `<span class="text-2xl">${b.icon}</span>`}
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded ${defeated ? 'bg-emerald-500 text-black' : 'bg-berzerker-border text-gray-400'} uppercase">
                            ${defeated ? 'DERROTADO 🏆' : (idx === prog.currentIdx ? 'EM BATALHA ⚔️' : 'BLOQUEADO 🔒')}
                        </span>
                    </div>
                    <h4 class="font-oswald font-bold text-white text-lg">${escapeHtml(b.name)}</h4>
                    <span class="text-[10px] font-mono text-purple-300 block">💢 fraco a ${escapeHtml(b.weak || '—')}</span>
                    <span class="text-xs font-mono text-gray-400 block">${fmtN(b.maxHp)} HP · ${defeated ? '✔' : '🎁'} +${Math.round(b.maxHp / 200)} XP</span>
                </div>`;
        }).join('');
    }
}

function uploadBossPortrait(event, bossId) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
            // Redimensiona para 512px para não estourar o storage
            const c = document.createElement('canvas');
            const s = Math.min(img.width, img.height);
            c.width = 512; c.height = 512;
            const ctx = c.getContext('2d');
            ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 512, 512);
            bossPortraits[bossId] = c.toDataURL('image/jpeg', 0.8);
            saveGameState();
            renderBossBattleUI();
            alertModal('🖼️ Retrato do chefão atualizado!');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// ============================ MISSÕES SEMANAIS ============================
function renderMissions() {
    const el = document.getElementById('missions-content');
    if (!el) return;
    const st = missionsState(logs, THEME, getTodayLocalISO());
    const claimed = !!missionsClaimed[st.week];
    el.innerHTML = `
        <div class="flex items-center justify-between text-[11px] text-gray-400 font-mono mb-2">
            <span>Semana ${escapeHtml(st.week)} · ${formatShortBR(st.range[0])}–${formatShortBR(st.range[1])}</span>
            <span>${claimed ? '✔ XP resgatado' : `${st.totalXP} XP em jogo`}</span>
        </div>
        <div class="space-y-2">
            ${st.missions.map(m => `
                <div class="flex items-center justify-between gap-3 bg-berzerker-dark border ${m.done ? 'border-emerald-600/50' : 'border-berzerker-border'} rounded-lg p-2.5">
                    <div class="flex items-center gap-2 min-w-0">
                        <span class="text-lg">${m.icon}</span>
                        <div class="min-w-0">
                            <div class="text-xs font-bold text-white truncate">${escapeHtml(m.title)}</div>
                            <div class="text-[10px] text-gray-500 font-mono">${m.progress}/${m.target} · +${m.xp} XP</div>
                        </div>
                    </div>
                    <span class="text-[10px] font-bold uppercase ${m.done ? 'text-emerald-400' : 'text-gray-500'}">${m.done ? '✔ pronta' : 'em curso'}</span>
                </div>`).join('')}
        </div>
        <button onclick="claimMissions()" ${(!st.allDone || claimed) ? 'disabled' : ''} class="mt-3 w-full py-2.5 ${st.allDone && !claimed ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-berzerker-border opacity-50 cursor-not-allowed'} text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors">
            ${claimed ? '✔ XP resgatado esta semana' : (st.allDone ? `🎁 Resgatar ${st.totalXP} XP` : `Complete as 4 ${THEME.missionWordPlural || (THEME.missionWord + 's')} para resgatar`)}
        </button>`;
}

function claimMissions() {
    const st = missionsState(logs, THEME, getTodayLocalISO());
    if (!st.allDone || missionsClaimed[st.week]) return;
    missionsClaimed[st.week] = true;
    missionsXpTotal += st.totalXP;
    saveGameState();
    refreshAll();
    alertModal(`🎁 ${THEME.missionWord}s concluídas! +${st.totalXP} XP resgatados.`);
}

// ============================ TEMPORADA ============================
function renderSeason() {
    const el = document.getElementById('season-content');
    if (!el) return;
    const today = getTodayLocalISO();
    if (!seasons) seasons = { start: today, completed: [] };
    // Autocompleta temporada vencida
    let s = seasonState(seasons, today);
    if (s.finished) {
        const d = computeXPCtx();
        seasons = completeSeason(seasons, today, d.xp);
        saveGameState();
        alertModal('🏆 TEMPORADA CONCLUÍDA! Troféu conquistado — seu XP foi preservado e uma nova temporada começou.');
        s = seasonState(seasons, today);
    }
    const xpNow = computeXPCtx().xp;
    el.innerHTML = `
        <div class="flex items-center justify-between text-[11px] text-gray-400 font-mono mb-2">
            <span>Temporada iniciada em ${formatShortBR(s.start)}</span>
            <span>Semana ${s.currentWeek}/${SEASON_WEEKS} · termina em ${s.endsInDays} dias</span>
        </div>
        <div class="w-full h-3 bg-berzerker-border rounded-full overflow-hidden">
            <div class="h-full bg-gradient-to-r from-amber-600 to-yellow-400 rounded-full transition-all" style="width:${s.progressPct}%"></div>
        </div>
        <div class="flex items-center justify-between mt-2">
            <div class="text-xs text-gray-400">XP preservado entre temporadas · <b class="text-amber-400">${fmtN(xpNow)} XP</b></div>
            <button onclick="finishSeasonNow()" class="px-3 py-1.5 bg-berzerker-border hover:bg-gray-700 text-white text-[10px] font-bold uppercase rounded-lg">🏁 Encerrar agora</button>
        </div>
        ${(seasons.completed || []).length ? `
        <div class="mt-3 border-t border-berzerker-border pt-2">
            <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">🏆 Troféus de temporada</div>
            <div class="flex flex-wrap gap-1.5">
                ${seasons.completed.map(c => `<span class="px-2 py-1 bg-amber-950/40 border border-amber-700/40 rounded-lg text-[10px] text-amber-300 font-mono">🏆 ${formatShortBR(c.start)} → ${formatShortBR(c.end)} · ${fmtN(c.xp)} XP</span>`).join('')}
            </div>
        </div>` : ''}`;
}

function finishSeasonNow() {
    confirmModal('Encerrar a temporada atual e garantir o troféu? O XP é preservado.', () => {
        const d = computeXPCtx();
        seasons = completeSeason(seasons, getTodayLocalISO(), d.xp);
        saveGameState();
        refreshAll();
        alertModal('🏆 Temporada encerrada! Troféu adicionado à coleção.');
    });
}

// ============================ STORY CARD ============================
function handleBgImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
            customBgImageData = img;
            saveStoryState();
            generateStoryCard();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function removeBgImage() {
    customBgImageData = null;
    document.getElementById('bg-image-input').value = '';
    saveStoryState();
    generateStoryCard();
}

function setTheme(theme) {
    selectedStoryTheme = theme;
    saveStoryState();
    ['berzerker', 'cyberpunk', 'minimal'].forEach(t => {
        const btn = document.getElementById(`btn-theme-${t}`);
        if (btn) {
            btn.className = (t === theme)
                ? 'py-2 px-2 text-xs font-bold uppercase rounded-lg border bg-berzerker-600 border-berzerker-500 text-white'
                : 'py-2 px-2 text-xs font-bold uppercase rounded-lg border bg-berzerker-dark border-berzerker-border text-gray-400';
        }
    });
    generateStoryCard();
}

function drawThemedFrame(ctx, palette) {
    // Moldura acompanhando o tema de gamificação
    const frame = (THEME && THEME.frame) || 'ferro';
    if (frame === 'ouro') {
        const g = ctx.createLinearGradient(0, 0, 1080, 1920);
        g.addColorStop(0, '#7a5c1e'); g.addColorStop(0.5, '#f5d67a'); g.addColorStop(1, '#8a6a20');
        ctx.strokeStyle = g; ctx.lineWidth = 18; ctx.strokeRect(22, 22, 1036, 1876);
        ctx.strokeStyle = '#f8e7b0'; ctx.lineWidth = 3; ctx.strokeRect(48, 48, 984, 1824);
        // ornamentos de canto
        [[70, 70], [1010, 70], [70, 1850], [1010, 1850]].forEach(([x, y]) => {
            ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4);
            ctx.fillStyle = '#f5d67a'; ctx.fillRect(-14, -14, 28, 28);
            ctx.restore();
        });
    } else if (frame === 'marmore') {
        ctx.strokeStyle = '#d9d2c5'; ctx.lineWidth = 22; ctx.strokeRect(20, 20, 1040, 1880);
        ctx.strokeStyle = '#8f877a'; ctx.lineWidth = 2; ctx.strokeRect(38, 38, 1004, 1844);
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.strokeStyle = '#6b6156'; ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
            ctx.beginPath();
            const y0 = 120 + i * 230;
            ctx.moveTo(30, y0);
            ctx.bezierCurveTo(300, y0 - 40, 700, y0 + 60, 1050, y0 - 20);
            ctx.stroke();
        }
        ctx.restore();
    } else if (frame === 'neon') {
        ctx.shadowColor = '#00ffcc'; ctx.shadowBlur = 28;
        ctx.strokeStyle = '#00ffcc'; ctx.lineWidth = 6; ctx.strokeRect(28, 28, 1024, 1864);
        ctx.shadowColor = '#ff0055';
        ctx.strokeStyle = '#ff0055'; ctx.lineWidth = 3; ctx.strokeRect(48, 48, 984, 1824);
        ctx.shadowBlur = 0;
    } else if (frame === 'madeira') {
        // Folclore Brasileiro: moldura de madeira entalhada com tachas douradas
        const g = ctx.createLinearGradient(0, 0, 1080, 1920);
        g.addColorStop(0, '#3e2510'); g.addColorStop(0.5, '#8a5a28'); g.addColorStop(1, '#3e2510');
        ctx.strokeStyle = g; ctx.lineWidth = 20; ctx.strokeRect(21, 21, 1038, 1878);
        ctx.strokeStyle = '#d9a441'; ctx.lineWidth = 3; ctx.strokeRect(44, 44, 992, 1832);
        [[64, 64], [1016, 64], [64, 1856], [1016, 1856]].forEach(([x, y]) => {
            ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2);
            ctx.fillStyle = '#d9a441'; ctx.fill();
            ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2);
            ctx.fillStyle = '#6b431c'; ctx.fill();
        });
    } else if (frame === 'runas') {
        // Nórdica: moldura de pedra gelada com runas gravadas
        const g = ctx.createLinearGradient(0, 0, 1080, 1920);
        g.addColorStop(0, '#16202e'); g.addColorStop(0.5, '#5c7285'); g.addColorStop(1, '#16202e');
        ctx.strokeStyle = g; ctx.lineWidth = 18; ctx.strokeRect(22, 22, 1036, 1876);
        ctx.strokeStyle = '#a8d8e8'; ctx.lineWidth = 2; ctx.strokeRect(46, 46, 988, 1828);
        ctx.save();
        ctx.strokeStyle = '#a8d8e8'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        // runas geométricas (ᚠ-like: haste + traços) ao longo das laterais
        for (let y = 160; y < 1800; y += 170) {
            [[34, y], [1046, y]].forEach(([x, ry]) => {
                ctx.beginPath();
                ctx.moveTo(x, ry - 22); ctx.lineTo(x, ry + 22);
                ctx.moveTo(x, ry - 10); ctx.lineTo(x + 12, ry - 22);
                ctx.moveTo(x, ry + 6); ctx.lineTo(x + 12, ry + 18);
                ctx.stroke();
            });
        }
        ctx.restore();
    } else if (frame === 'louros') {
        // Roma: moldura dourada com louros nos cantos
        const g = ctx.createLinearGradient(0, 0, 1080, 1920);
        g.addColorStop(0, '#7a5c1e'); g.addColorStop(0.5, '#e8c86a'); g.addColorStop(1, '#7a5c1e');
        ctx.strokeStyle = g; ctx.lineWidth = 14; ctx.strokeRect(24, 24, 1032, 1872);
        ctx.strokeStyle = '#8a2c2c'; ctx.lineWidth = 2; ctx.strokeRect(46, 46, 988, 1828);
        ctx.save();
        ctx.fillStyle = '#e8c86a';
        // folhas de louro em arcos nos 4 cantos
        [[70, 70, 1], [1010, 70, -1], [70, 1850, 1], [1010, 1850, -1]].forEach(([x, y, dir]) => {
            for (let i = 0; i < 5; i++) {
                const a = (i / 5) * Math.PI / 2;
                const lx = x + dir * Math.cos(a) * 46, ly = y + Math.sin(a) * 46 * (y < 960 ? 1 : -1);
                ctx.save(); ctx.translate(lx, ly); ctx.rotate(a * dir);
                ctx.beginPath(); ctx.ellipse(0, 0, 12, 5, 0, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            }
            ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
        });
        ctx.restore();
    } else if (frame === 'brasao') {
        // RPG: brasão heráldico — borda dupla vermelha/dourada + escudo no topo
        ctx.strokeStyle = '#8a2c2c'; ctx.lineWidth = 16; ctx.strokeRect(24, 24, 1032, 1872);
        ctx.strokeStyle = '#e8c86a'; ctx.lineWidth = 3; ctx.strokeRect(48, 48, 984, 1824);
        // escudo central do topo
        ctx.save();
        ctx.translate(540, 96);
        ctx.beginPath();
        ctx.moveTo(-34, -34); ctx.lineTo(34, -34); ctx.lineTo(34, 10);
        ctx.quadraticCurveTo(34, 44, 0, 58); ctx.quadraticCurveTo(-34, 44, -34, 10);
        ctx.closePath();
        ctx.fillStyle = '#8a2c2c'; ctx.fill();
        ctx.strokeStyle = '#e8c86a'; ctx.lineWidth = 3; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-34, -12); ctx.lineTo(34, -12); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -34); ctx.lineTo(0, 58); ctx.stroke();
        ctx.restore();
        // losangos nos cantos
        [[64, 64], [1016, 64], [64, 1856], [1016, 1856]].forEach(([x, y]) => {
            ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4);
            ctx.fillStyle = '#e8c86a'; ctx.fillRect(-10, -10, 20, 20);
            ctx.fillStyle = '#8a2c2c'; ctx.fillRect(-5, -5, 10, 10);
            ctx.restore();
        });
    } else if (frame === 'espacial') {
        // Galáctica: moldura espacial com estrelas e circuito luminoso
        const g = ctx.createLinearGradient(0, 0, 1080, 1920);
        g.addColorStop(0, '#0b1030'); g.addColorStop(0.5, '#2a3a8a'); g.addColorStop(1, '#0b1030');
        ctx.strokeStyle = g; ctx.lineWidth = 18; ctx.strokeRect(22, 22, 1036, 1876);
        ctx.shadowColor = '#66e0ff'; ctx.shadowBlur = 12;
        ctx.strokeStyle = '#66e0ff'; ctx.lineWidth = 2; ctx.strokeRect(46, 46, 988, 1828);
        ctx.shadowBlur = 0;
        // estrelas na moldura
        for (let i = 0; i < 42; i++) {
            const edge = i % 4;
            const t = ((i * 97) % 100) / 100;
            let x, y;
            if (edge === 0) { x = 30 + t * 1020; y = 30; }
            else if (edge === 1) { x = 30 + t * 1020; y = 1888; }
            else if (edge === 2) { x = 30; y = 30 + t * 1858; }
            else { x = 1050; y = 30 + t * 1858; }
            const r = 1 + ((i * 13) % 3);
            ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fillStyle = i % 3 ? '#9ad8ff' : '#ffffff'; ctx.fill();
        }
    } else {
        ctx.strokeStyle = palette.borderPrimary;
        ctx.lineWidth = 10;
        ctx.strokeRect(30, 30, 1020, 1860);
    }
}

function generateStoryCard() {
    const canvas = document.getElementById('story-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const targetDate = document.getElementById('filter-date').value || getTodayLocalISO();
    const rank = getAnimalRankForSession(targetDate);
    const dayLogs = [...rank.dayLogs].sort((a, b) => a.id - b.id);

    const musicVibe = document.getElementById('vibe-music')?.value.trim() || '';
    const weatherVibe = document.getElementById('vibe-weather')?.value.trim() || '';

    let palette = {
        bgStart: '#0a0a0a', bgEnd: '#1a0303',
        cardBg: 'rgba(18, 18, 22, 0.88)', cardBorder: 'rgba(255, 255, 255, 0.08)',
        borderPrimary: '#dc2626', titleColor: '#ffffff',
        accentColor: '#ef4444', textDim: '#9ca3af',
        prColor: '#10b981', badgeBg: '#1f1f1f'
    };
    if (selectedStoryTheme === 'cyberpunk') {
        palette = {
            bgStart: '#050811', bgEnd: '#11021c',
            cardBg: 'rgba(10, 16, 31, 0.88)', cardBorder: 'rgba(0, 255, 204, 0.2)',
            borderPrimary: '#00ffcc', titleColor: '#00ffcc',
            accentColor: '#ff0055', textDim: '#8899ac',
            prColor: '#ffe600', badgeBg: '#121b2d'
        };
    } else if (selectedStoryTheme === 'minimal') {
        palette = {
            bgStart: '#121212', bgEnd: '#1c1c1c',
            cardBg: 'rgba(36, 36, 36, 0.88)', cardBorder: 'rgba(255, 255, 255, 0.12)',
            borderPrimary: '#ffffff', titleColor: '#ffffff',
            accentColor: '#e0e0e0', textDim: '#aaaaaa',
            prColor: '#ffffff', badgeBg: '#2e2e2e'
        };
    }

    if (customBgImageData) {
        ctx.drawImage(customBgImageData, 0, 0, 1080, 1920);
        const opacity = parseFloat(document.getElementById('bg-overlay-opacity').value) || 0.6;
        ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
        ctx.fillRect(0, 0, 1080, 1920);
    } else {
        const grad = ctx.createLinearGradient(0, 0, 0, 1920);
        grad.addColorStop(0, palette.bgStart);
        grad.addColorStop(1, palette.bgEnd);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1080, 1920);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 2;
        for (let x = 60; x < 1080; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 1920); ctx.stroke(); }
        for (let y = 60; y < 1920; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1080, y); ctx.stroke(); }
    }

    function drawRoundedRect(x, y, w, h, r, fillColor, strokeColor, strokeWidth = 1) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        if (fillColor) { ctx.fillStyle = fillColor; ctx.fill(); }
        if (strokeColor) { ctx.strokeStyle = strokeColor; ctx.lineWidth = strokeWidth; ctx.stroke(); }
    }

    drawThemedFrame(ctx, palette);

    ctx.fillStyle = palette.borderPrimary;
    ctx.fillRect(70, 75, 14, 85);
    ctx.fillStyle = palette.titleColor;
    ctx.font = 'bold 62px Oswald, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('DIÁRIO DE CARGAS', 100, 130);
    ctx.fillStyle = palette.accentColor;
    ctx.font = '34px Teko, sans-serif';
    ctx.fillText(`// ${THEME ? THEME.name.toUpperCase() : 'BERZERKER MODE'} · ${targetDate}`, 100, 168);

    drawRoundedRect(70, 200, 940, 150, 12, palette.cardBg, palette.accentColor, 2);
    ctx.font = '72px Inter, sans-serif';
    ctx.fillText(rank.icon, 100, 300);
    ctx.fillStyle = palette.accentColor;
    ctx.font = 'bold 22px Inter, sans-serif';
    ctx.fillText(`PATENTE — NÍVEL ${rank.level}/10 · ${fmtN(rank.xp)} XP`, 200, 245);
    ctx.fillStyle = palette.titleColor;
    ctx.font = 'bold 42px Oswald, sans-serif';
    ctx.fillText(rank.name.toUpperCase(), 200, 305);

    drawRoundedRect(70, 370, 455, 150, 12, palette.cardBg, palette.cardBorder, 1);
    drawRoundedRect(555, 370, 455, 150, 12, palette.cardBg, palette.cardBorder, 1);
    ctx.fillStyle = palette.borderPrimary;
    ctx.font = 'bold 64px Oswald, sans-serif';
    ctx.fillText(`${(rank.sessionTonnage / 1000).toFixed(2)} TON`, 95, 445);
    ctx.fillStyle = palette.textDim;
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.fillText('VOLUME TOTAL MOVIDO', 95, 485);
    ctx.fillStyle = palette.prColor;
    ctx.font = 'bold 64px Oswald, sans-serif';
    ctx.fillText(`${rank.relativeRatio.toFixed(1)}× BW`, 580, 445);
    ctx.fillStyle = palette.textDim;
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.fillText(`RAZÃO FORÇA (${userBodyweight}kg BW)`, 580, 485);

    let currentY = 540;
    if (musicVibe || weatherVibe) {
        drawRoundedRect(70, currentY, 940, 70, 8, palette.badgeBg, palette.cardBorder, 1);
        ctx.fillStyle = palette.titleColor;
        ctx.font = '22px Inter, sans-serif';
        let vibeText = '';
        if (musicVibe) vibeText += `🎵 ${musicVibe}  `;
        if (weatherVibe) vibeText += `🌩️ ${weatherVibe}`;
        ctx.fillText(vibeText, 90, currentY + 42);
        currentY += 90;
    }

    ctx.fillStyle = palette.titleColor;
    ctx.font = 'bold 34px Oswald, sans-serif';
    ctx.fillText('EXERCÍCIOS & SÉRIES DA SESSÃO:', 70, currentY + 30);
    currentY += 50;

    if (dayLogs.length === 0) {
        drawRoundedRect(70, currentY, 940, 100, 12, palette.cardBg, palette.cardBorder, 1);
        ctx.fillStyle = palette.textDim;
        ctx.font = '28px Inter, sans-serif';
        ctx.fillText('Nenhum treino registrado nesta data.', 100, currentY + 60);
    } else {
        const grouped = [];
        dayLogs.forEach(l => {
            const last = grouped[grouped.length - 1];
            if (last && last[0] === l.muscle) last[1].push(l);
            else grouped.push([l.muscle, [l]]);
        });
        const room = 1800 - currentY - grouped.length * 45;
        let cardSpacing = Math.min(75, Math.max(58, Math.floor(room / dayLogs.length)));
        let cardHeight = cardSpacing - 10;

        for (const [muscleGroup, groupLogs] of grouped) {
            if (currentY + 100 > 1800) break;
            ctx.fillStyle = palette.borderPrimary;
            ctx.font = 'bold 28px Oswald, sans-serif';
            ctx.fillText(`⚔️ ${muscleGroup.toUpperCase()}`, 70, currentY + 25);
            currentY += 35;
            groupLogs.forEach(l => {
                if (currentY + cardHeight > 1800) return;
                drawRoundedRect(70, currentY, 940, cardHeight, 8, palette.cardBg, palette.cardBorder, 1);
                ctx.fillStyle = palette.titleColor;
                ctx.font = 'bold 24px Inter, sans-serif';
                ctx.fillText(`${l.biset ? '🔗' : '•'} ${l.exercise}`, 90, currentY + 40);
                ctx.fillStyle = l.isPR ? palette.prColor : palette.accentColor;
                ctx.font = 'bold 22px Monospace, sans-serif';
                let detailStr = l.kind === 'corrida'
                    ? `${String(l.distanceKm ?? 0).replace('.', ',')} km · ${l.durationMin ?? 0} min`
                    : `${formatLoadText(l)} × ${formatRepsText(l)}`;
                if (l.isPR) detailStr += ` 🏆 PR`;
                ctx.textAlign = 'right';
                ctx.fillText(detailStr, 990, currentY + 40);
                ctx.textAlign = 'left';
                currentY += cardSpacing;
            });
            currentY += 10;
        }
    }

    const footerY = 1850;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(70, footerY - 30); ctx.lineTo(1010, footerY - 30); ctx.stroke();
    ctx.fillStyle = palette.borderPrimary;
    ctx.font = 'italic bold 40px Oswald, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('@BerzerkerMode // DIÁRIO DE CARGAS', 540, footerY);
    ctx.textAlign = 'left';
}

function downloadStoryCard() {
    const canvas = document.getElementById('story-canvas');
    if (!canvas) return;
    const targetDate = document.getElementById('filter-date').value || 'treino';
    const link = document.createElement('a');
    link.download = `berzerker-story-${targetDate}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

// ---------- Card compartilhável de chefão derrotado ----------
function openBossDefeatCard() {
    const overlay = document.createElement('div');
    overlay.id = 'boss-card-overlay';
    overlay.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 overflow-y-auto';
    overlay.onclick = ev => { if (ev.target === overlay) overlay.remove(); };
    overlay.innerHTML = `
        <div class="bg-berzerker-card border border-berzerker-border rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-3">
            <div class="flex items-center justify-between"><h3 class="font-oswald text-lg font-bold text-white uppercase">📸 Card do Chefão</h3>
            <button onclick="document.getElementById('boss-card-overlay').remove()" class="text-gray-400 hover:text-white">✕</button></div>
            <canvas id="boss-card-canvas" width="1080" height="1080" class="w-full rounded-xl border border-berzerker-border"></canvas>
            <button onclick="downloadBossDefeatCard()" class="w-full py-3 bg-gradient-to-r from-amber-600 to-berzerker-600 text-white font-bold text-xs uppercase tracking-widest rounded-xl">⬇️ Baixar Card (1080×1080)</button>
        </div>`;
    document.body.appendChild(overlay);
    generateBossDefeatCard();
}

function generateBossDefeatCard() {
    const canvas = document.getElementById('boss-card-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const prog = computeBossProgress(logs, userBodyweight, BOSSES);
    const boss = prog.defeatedCount > 0 ? BOSSES[Math.min(prog.defeatedCount, BOSSES.length) - 1] : prog.current;
    const derrotado = prog.defeatedCount > 0;
    const portrait = bossPortraitSrc(boss.id);
    const portraitImg = getBossImg(portrait);
    const rank = rankFromXP(computeXPCtx().xp);

    const g = ctx.createLinearGradient(0, 0, 0, 1080);
    g.addColorStop(0, '#14080a'); g.addColorStop(1, '#08080a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1080, 1080);

    drawThemedFrame(ctx, { borderPrimary: '#dc2626' });

    ctx.textAlign = 'center';
    ctx.fillStyle = derrotado ? '#fbbf24' : '#ef4444';
    ctx.font = 'bold 64px Oswald, sans-serif';
    ctx.fillText(derrotado ? 'CHEFÃO DERROTADO' : 'EM BATALHA', 540, 160);

    // Retrato/ícone
    ctx.save();
    ctx.beginPath();
    ctx.arc(540, 420, 190, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    if (portraitImg && portraitImg.complete && portraitImg.naturalWidth > 0) {
        ctx.drawImage(portraitImg, 350, 230, 380, 380);
    } else {
        ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(350, 230, 380, 380);
        ctx.font = '180px Inter, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(boss.icon, 540, 480);
        // quando a imagem carregar, redesenha o card
        if (portraitImg && !portraitImg.complete) {
            portraitImg.onload = () => generateBossDefeatCard();
        }
    }
    ctx.restore();
    ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.arc(540, 420, 195, 0, Math.PI * 2); ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 56px Oswald, sans-serif';
    ctx.fillText(boss.name.toUpperCase(), 540, 700);
    ctx.fillStyle = '#9ca3af';
    ctx.font = '28px Inter, sans-serif';
    ctx.fillText(`${fmtN(boss.maxHp)} HP · fraco a ${boss.weak}`, 540, 750);

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 44px Oswald, sans-serif';
    ctx.fillText(`${fmtN(prog.totalDamage)} DMG ACUMULADOS`, 540, 850);

    ctx.fillStyle = '#9ca3af';
    ctx.font = '26px Inter, sans-serif';
    ctx.fillText(`${rank.icon} ${rank.name} · Nível ${rank.level}`, 540, 910);
    ctx.font = '22px Inter, sans-serif';
    ctx.fillText(`Diário de Cargas · ${getTodayLocalISO()}`, 540, 960);
    ctx.textAlign = 'left';
}

function downloadBossDefeatCard() {
    const canvas = document.getElementById('boss-card-canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `berzerker-chefao-${getTodayLocalISO()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

// ============================ CALCULADORAS ============================
function calculate1RM() {
    const w = parseFloat(document.getElementById('calc-1rm-weight').value) || 0;
    const r = parseInt(document.getElementById('calc-1rm-reps').value) || 0;
    const resEl = document.getElementById('calc-1rm-result');
    const tableEl = document.getElementById('calc-1rm-table');
    if (w <= 0 || r <= 0) { resEl.textContent = '0 kg'; tableEl.innerHTML = ''; return; }
    const epley1RM = Math.round(w * (1 + r / 30));
    resEl.textContent = `${epley1RM} kg`;
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

    const badges = [
        { title: 'Primeiro Sangue', desc: '1º Exercício Registrado', unlocked: logs.length > 0, icon: '⚔️' },
        { title: 'Ofensiva Semanal', desc: '3 Semanas seguidas na meta', unlocked: ws.streak >= 3, icon: '🔥' },
        { title: 'Mover Titan', desc: '10+ Toneladas Acumuladas', unlocked: totalTon >= 10, icon: '🐘' },
        { title: 'Caçador de PRs', desc: '5+ Recordes Pessoais', unlocked: totalPRs >= 5, icon: '🏆' },
        { title: 'Maratonista', desc: '10+ km registrados', unlocked: totalKm >= 10, icon: '🏃' },
        { title: 'Tanque de Guerra', desc: 'Razão > 50x Peso Corporal', unlocked: logs.some(l => getAnimalRankForSession(l.date).relativeRatio >= 50), icon: '🛡️' },
        { title: 'Berzerker Master', desc: '50+ Treinos Registrados', unlocked: uniqueDates.length >= 50, icon: '⚡' },
        { title: 'Caçador de Chefões', desc: '3+ Chefões Derrotados', unlocked: computeBossProgress(logs, userBodyweight, BOSSES).defeatedCount >= 3, icon: '👑' }
    ];

    const unlockedCount = badges.filter(b => b.unlocked).length;
    const badgesEl = document.getElementById('stat-unlocked-badges');
    if (badgesEl) badgesEl.textContent = `${unlockedCount} / ${badges.length}`;

    const grid = document.getElementById('badges-grid');
    if (grid) grid.innerHTML = badges.map(b => `
        <div class="p-3 rounded-xl border text-center transition-all ${b.unlocked ? 'bg-berzerker-dark border-emerald-500/50 text-white' : 'bg-berzerker-dark/40 border-berzerker-border text-gray-600 opacity-60'}">
            <div class="text-3xl mb-1">${b.icon}</div>
            <div class="font-bold text-xs uppercase ${b.unlocked ? 'text-emerald-400' : 'text-gray-500'}">${b.title}</div>
            <div class="text-[10px] text-gray-400 mt-0.5">${b.desc}</div>
        </div>`).join('');
}

// ============================ GRÁFICOS ============================
function initVolumeChart() {
    const canvas = document.getElementById('volumeChart');
    if (!canvas || typeof Chart === 'undefined') return;
    const dateMap = {};
    logs.forEach(l => {
        const ton = logVolumeKg(l, userBodyweight) / 1000;
        dateMap[l.date] = (dateMap[l.date] || 0) + ton;
    });
    const labels = Object.keys(dateMap).sort().slice(-12);
    const dataValues = labels.map(d => dateMap[d]);
    if (volumeChartInstance) volumeChartInstance.destroy();
    volumeChartInstance = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
            labels: labels.length > 0 ? labels : ['Sem Dados'],
            datasets: [{
                label: 'Tonelagem (TON)',
                data: dataValues.length > 0 ? dataValues : [0],
                borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.15)',
                borderWidth: 3, fill: true, tension: 0.3,
                pointBackgroundColor: '#ef4444', pointRadius: 5
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af' } },
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af' } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

function renderExerciseChart() {
    const select = document.getElementById('ex-chart-select');
    const canvas = document.getElementById('exChart');
    if (!select || !canvas || typeof Chart === 'undefined') return;

    const names = [...new Set(logs.filter(l => l.kind === 'peso' && l.type !== 'isometria').map(l => l.exercise))].sort();
    const current = select.value;
    select.innerHTML = names.map(n => `<option value="${escapeHtml(n)}"${n === current ? ' selected' : ''}>${escapeHtml(n)}</option>`).join('');
    const chosen = select.value || names[0];
    if (!chosen) {
        if (exChartInstance) exChartInstance.destroy();
        return;
    }

    const series = logs
        .filter(l => l.exercise === chosen && l.kind === 'peso' && l.type !== 'isometria')
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.id - b.id)))
        .map(l => {
            const topSet = (l.sets && l.sets.length)
                ? Math.max(...l.sets.map(s => Number(s.weight) || 0))
                : Number(l.weight) || 0;
            return { date: l.date, topSet, est1RM: logEst1RM(l) };
        });

    if (exChartInstance) exChartInstance.destroy();
    exChartInstance = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
            labels: series.map(s => s.date),
            datasets: [
                {
                    label: 'Carga topo (kg)', data: series.map(s => s.topSet),
                    borderColor: '#22d3ee', backgroundColor: 'rgba(34, 211, 238, 0.12)',
                    borderWidth: 3, tension: 0.25, pointRadius: 4
                },
                {
                    label: '1RM estimado (kg)', data: series.map(s => s.est1RM),
                    borderColor: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.12)',
                    borderWidth: 3, borderDash: [6, 4], tension: 0.25, pointRadius: 4
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af' } },
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af' } }
            },
            plugins: {
                legend: { labels: { color: '#d1d5db', boxWidth: 14 } },
                title: { display: true, text: `Progressão de ${chosen}`, color: '#fff' }
            }
        }
    });
}

function renderWeeklySetsChart() {
    const canvas = document.getElementById('setsChart');
    if (!canvas || typeof Chart === 'undefined') return;

    // Séries por grupo nas últimas 8 semanas (seg–dom)
    const weeks = [];
    const now = new Date();
    for (let i = 7; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i * 7);
        weeks.push(isoWeekRange(toLocalISO(d)));
    }
    const labels = weeks.map(([ws]) => formatShortBR(ws));
    const dataByMuscle = MUSCULOS_MAPA.map(m => ({
        label: m,
        data: weeks.map(([ws, we]) => logs
            .filter(l => l.kind !== 'corrida' && l.muscle === m && l.date >= ws && l.date <= we)
            .reduce((a, l) => a + ((l.sets && l.sets.length) || (l.reps && l.reps.length) || 0), 0)),
        backgroundColor: `hsl(${(MUSCLE_META[m]?.ordem || 1) * 37 % 360}, 65%, 50%)`
    }));

    if (setsChartInstance) setsChartInstance.destroy();
    setsChartInstance = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels,
            datasets: [
                ...dataByMuscle,
                {
                    label: `mín ${FAIXA_SERIES_SEMANAIS.min} séries`,
                    type: 'line', data: labels.map(() => FAIXA_SERIES_SEMANAIS.min),
                    borderColor: '#22c55e', borderDash: [6, 4], borderWidth: 2, pointRadius: 0
                },
                {
                    label: `máx ${FAIXA_SERIES_SEMANAIS.max} séries`,
                    type: 'line', data: labels.map(() => FAIXA_SERIES_SEMANAIS.max),
                    borderColor: '#f59e0b', borderDash: [6, 4], borderWidth: 2, pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                x: { stacked: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af' } },
                y: { stacked: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af' } }
            },
            plugins: {
                legend: { labels: { color: '#d1d5db', boxWidth: 12, font: { size: 10 } } },
                title: { display: true, text: 'Séries semanais por grupo (faixa-alvo em tracejado)', color: '#fff' }
            }
        }
    });
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
                <button onclick="deleteTest('${t.id}')" class="text-gray-500 hover:text-red-400 text-xs" title="Excluir teste">🗑</button>
            </div>
            <div class="w-full h-2 bg-berzerker-border rounded-full overflow-hidden">
                <div class="h-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-amber-500'} rounded-full" style="width:${pct}%"></div>
            </div>
            <div class="flex items-center gap-1.5">
                <input type="date" id="test-date-${t.id}" value="${getTodayLocalISO()}" class="${INP} !py-1 !text-xs flex-1">
                <input type="number" step="0.5" min="0" id="test-val-${t.id}" placeholder="${escapeHtml(t.unit)}" class="${INP} !py-1 !text-xs w-20">
                <button onclick="addTestRecord('${t.id}')" class="px-2.5 py-1.5 bg-berzerker-600 hover:bg-berzerker-500 text-white text-[10px] font-bold rounded-lg">+ Registrar</button>
            </div>
            ${t.records.length ? `
            <div class="text-[10px] font-mono text-gray-400 space-y-0.5 max-h-24 overflow-y-auto border-t border-berzerker-border pt-1.5">
                ${[...t.records].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6).map(r => `
                    <div class="flex justify-between"><span>${formatShortBR(r.date)}</span><span class="text-white">${r.value} ${escapeHtml(t.unit)}</span>
                    <button onclick="deleteTestRecord('${t.id}', '${r.date}', ${r.value})" class="text-gray-600 hover:text-red-400">✕</button></div>`).join('')}
            </div>` : '<div class="text-[10px] text-gray-600 italic">Sem registros ainda.</div>'}
        </div>`;
    }).join('') + `
        <div class="bg-berzerker-dark border border-dashed border-berzerker-border rounded-xl p-4 space-y-2">
            <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">➕ Novo marco de capacidade</div>
            <div class="flex flex-wrap gap-1.5">
                <input type="text" id="new-test-name" placeholder="Ex: Agachamento 1RM" class="${INP} !py-1 !text-xs flex-1 min-w-[120px]">
                <input type="text" id="new-test-unit" placeholder="unidade (kg/reps/s/min)" class="${INP} !py-1 !text-xs w-28">
                <input type="number" min="1" id="new-test-goal" placeholder="meta" class="${INP} !py-1 !text-xs w-20">
                <button onclick="addCustomTest()" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded-lg">Criar</button>
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

function deleteTest(testId) {
    confirmModal('Excluir este teste e seus registros?', () => {
        tests = tests.filter(t => t.id !== testId);
        saveGameState();
        renderTests();
    });
}

// ============================ CSV ============================
// exportCSV/importCSV vivem em js/historico.js (formato multi-aba da planilha).
// parseCSVRows é compartilhado com o import de CSV.

function parseCSVRows(text, sep) {
    const rows = [];
    let row = [], cur = '', inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (inQuotes) {
            if (c === '"') {
                if (text[i + 1] === '"') { cur += '"'; i++; }
                else inQuotes = false;
            } else cur += c;
        } else if (c === '"') inQuotes = true;
        else if (c === sep) { row.push(cur); cur = ''; }
        else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
        else if (c !== '\r') cur += c;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows;
}

// ============================ BACKUP JSON ============================
function exportJSONBackup() {
    const backupData = {
        version: 3,
        userBodyweight,
        logs,
        savedWorkouts,
        settings,
        gameTheme: THEME ? THEME.id : 'classico',
        storyTheme: selectedStoryTheme,
        bgImageData: customBgImageData ? customBgImageData.src : null,
        deloadWeeks, missionsXpTotal, missionsClaimed, tests, seasons, bossPortraits, weightLog,
        exportDate: new Date().toISOString()
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `berzerker-diario-backup-${getTodayLocalISO()}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();

    lastBackupAt = getTodayLocalISO();
    safeStorage.set(STORAGE_KEY_BACKUP, lastBackupAt);
    renderBackupReminder();
    alertModal('📥 Backup exportado (dados, tema, configurações e retratos)!');
}

function importJSONBackup(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const parsed = JSON.parse(e.target.result);
            if (parsed && Array.isArray(parsed.logs)) {
                logs = parsed.logs.map(migrateLog);
                if (parsed.userBodyweight) userBodyweight = parsed.userBodyweight;
                if (Array.isArray(parsed.savedWorkouts)) savedWorkouts = parsed.savedWorkouts;
                if (parsed.settings) settings = { ...settings, ...parsed.settings };
                if (parsed.gameTheme && THEMES[parsed.gameTheme]) { applyTheme(parsed.gameTheme); safeStorage.set(STORAGE_KEY_THEME, parsed.gameTheme); }
                if (parsed.storyTheme) selectedStoryTheme = parsed.storyTheme;
                if (parsed.deloadWeeks) deloadWeeks = parsed.deloadWeeks;
                if (parsed.missionsXpTotal != null) missionsXpTotal = parsed.missionsXpTotal;
                if (parsed.missionsClaimed) missionsClaimed = parsed.missionsClaimed;
                if (Array.isArray(parsed.tests)) tests = parsed.tests;
                if (parsed.seasons) seasons = parsed.seasons;
                if (parsed.bossPortraits) bossPortraits = parsed.bossPortraits;
                if (Array.isArray(parsed.weightLog)) weightLog = parsed.weightLog;
                if (parsed.bgImageData) {
                    const img = new Image();
                    img.onload = () => { customBgImageData = img; generateStoryCard(); };
                    img.src = parsed.bgImageData;
                }
                lastRankLevel = null; lastBossesDefeated = null;

                saveLogsToStorage();
                saveWorkoutsToStorage();
                saveSettings();
                saveGameState();
                saveStoryState();
                safeStorage.set(STORAGE_KEY_BW, userBodyweight.toString());
                safeStorage.set(STORAGE_KEY_SEEDED, '1');

                const bwInput = document.getElementById('user-bodyweight');
                if (bwInput && userBodyweight > 0) bwInput.value = userBodyweight;

                alertModal('Backup importado com sucesso!');
                refreshAll();
            } else {
                alertModal('Arquivo JSON inválido!');
            }
        } catch (err) {
            alertModal('Erro ao ler o arquivo de backup.');
        }
    };
    reader.readAsText(file);
}

function renderBackupReminder() {
    const el = document.getElementById('backup-reminder');
    if (!el) return;
    if (!lastBackupAt) {
        const temDados = logs.length > 0;
        el.innerHTML = temDados
            ? `⚠️ <b>Você ainda não fez nenhum backup.</b> Um aparelho perdido é o fim do histórico — exporte abaixo.`
            : '✅ Sem dados para backup por enquanto.';
        el.className = temDados
            ? 'text-[11px] font-bold text-amber-400 bg-amber-950/30 border border-amber-700/40 rounded-lg p-2.5'
            : 'text-[11px] text-gray-500 bg-berzerker-dark border border-berzerker-border rounded-lg p-2.5';
        return;
    }
    const days = Math.floor((new Date(getTodayLocalISO() + 'T12:00:00') - new Date(lastBackupAt + 'T12:00:00')) / 864e5);
    const critico = days >= 7;
    el.innerHTML = `💾 Último backup há <b>${days} ${days === 1 ? 'dia' : 'dias'}</b> (${formatShortBR(lastBackupAt)})${critico ? ' — <b class="text-red-400">há muito tempo! Atualize seu backup.</b>' : ' — tudo em dia.'}`;
    el.className = critico
        ? 'text-[11px] font-bold text-red-400 bg-red-950/30 border border-red-800/40 rounded-lg p-2.5'
        : 'text-[11px] font-bold text-emerald-400 bg-emerald-950/20 border border-emerald-700/40 rounded-lg p-2.5';
}

function clearAllData() {
    confirmModal('Tem certeza que deseja apagar TODO o histórico e os treinos salvos?', () => {
        logs = [];
        savedWorkouts = [];
        draftExercises = [];
        editingWorkoutId = null;
        activeSession = null;
        stopSessionTimer();
        releaseWakeLock();
        document.getElementById('active-session-card').classList.add('hidden');
        safeStorage.set(STORAGE_KEY_SEEDED, '1');
        saveLogsToStorage();
        saveWorkoutsToStorage();
        refreshAll();
        alertModal('Dados zerados.');
    });
}

// ============================ VIGIA DE VIRADA DE DIA ============================
function startDateWatcher() {
    lastKnownTodayISO = getTodayLocalISO();
    setInterval(() => {
        const nowISO = getTodayLocalISO();
        if (nowISO === lastKnownTodayISO) return;
        const prevISO = lastKnownTodayISO;
        lastKnownTodayISO = nowISO;

        document.getElementById('header-today-date').textContent = formatDateBR(nowISO);
        const logDateEl = document.getElementById('log-date');
        if (logDateEl.value === prevISO) logDateEl.value = nowISO;
        const filterEl = document.getElementById('filter-date');
        if (filterEl.value === prevISO) {
            filterEl.value = nowISO;
            renderLogsTable();
            updateSummaryMetrics();
        }
        renderRecoveryMap();
        renderBadgesAndStreak();
        renderMissions();
        renderSeason();
        alertModal('🌙 Virou o dia! Mapa de fadiga e missões atualizados.');
    }, 30000);
}

// ============================ REFRESH TOTAL ============================
function refreshAll() {
    renderLogsTable();
    updateSummaryMetrics();
    renderRecoveryMap();
    renderBossBattleUI();
    renderDaySuggestion();
    renderMissions();
    renderSeason();
    generateStoryCard();
    renderBadgesAndStreak();
    initVolumeChart();
    updateExerciseSuggestions();
    if (document.getElementById('builder-week-gaps')) renderWeekGaps();
    if (document.getElementById('tests-container')) renderTests();
    if (document.getElementById('history-content')) renderHistory();
}

// ============================ BOOT ============================
window.onload = function () {
    const todayStr = getTodayLocalISO();
    document.getElementById('log-date').value = todayStr;
    document.getElementById('filter-date').value = todayStr;
    const cardioDate = document.getElementById('cardio-date');
    if (cardioDate) cardioDate.value = todayStr;
    document.getElementById('header-today-date').textContent = formatDateBR(todayStr);

    loadStoredData();
    loadWorkoutsFromStorage();
    applyTheme(safeStorage.get(STORAGE_KEY_THEME) || 'classico');

    if (logs.length === 0) seedInitialMockData(todayStr);

    // Sincroniza campos de configuração
    const setV = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    setV('cfg-weekly-goal', settings.weeklyGoal);
    setV('cfg-rest', settings.restDefault);
    setV('cfg-bar', settings.barWeight);
    setV('cfg-sled', settings.sledWeight);
    const deloadBtn = document.getElementById('cfg-deload-btn');
    if (deloadBtn) {
        const isDeload = deloadWeeks.includes(isoWeekKey(todayStr));
        deloadBtn.textContent = isDeload ? '✔ Semana de deload ATIVA (clique para remover)' : '🧘 Planejar semana de deload (esta semana)';
    }

    // Campos do formulário principal (prefixo vazio)
    const mainFields = document.getElementById('main-fields');
    if (mainFields) mainFields.innerHTML = fieldsHTML('', { type: 'carga_total', mode: 'simple' });

    updateExerciseSuggestions();
    initSetEditor('', { mode: 'simple', sets: [] });
    renderLogsTable();
    updateSummaryMetrics();
    renderRecoveryMap();
    renderBossBattleUI();
    renderDaySuggestion();
    renderMissions();
    renderSeason();
    generateStoryCard();
    calculate1RM();
    renderWarmupCalculator();
    renderBadgesAndStreak();
    initVolumeChart();
    renderDraftList();
    updateSaveButton();
    renderSavedWorkouts();
    renderWeekGaps();
    renderBackupReminder();
    updateTypeHint();
    renderHistory();

    startDateWatcher();

    // Aviso gentil de backup
    if (lastBackupAt) {
        const days = Math.floor((new Date(todayStr + 'T12:00:00') - new Date(lastBackupAt + 'T12:00:00')) / 864e5);
        if (days >= 7) setTimeout(() => alertModal(`💾 Seu último backup foi há ${days} dias. Hora de atualizar!`), 1500);
    } else if (logs.length > 0) {
        setTimeout(() => alertModal('💾 Dica: exporte um backup na aba ⚙️ Config para não perder seu histórico.'), 1500);
    }
};
