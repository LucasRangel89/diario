import './actions.js';
import './storage.js';
import './catalogo.js';
import './gamificacao.js';
import './assistente.js';
import './planilha_data.js';
import './historico.js';
import './busca.js';
import './custom_exercises.js';
import './datas.js';
import { storage } from './storage.js';
import { DEFAULT_BAR_WEIGHT, DEFAULT_SLED_WEIGHT, FAIXA_SERIES_SEMANAIS, MUSCLE_META, MUSCLE_OPTIONS_FULL, MUSCULOS_MAPA, formatLoadText, formatPlates, formatRepsText, logEst1RM, logVolumeKg, CATALOG_TIPOS, EXERCISE_CATALOG, FAIXA_SERIES_POR_GRUPO, MUSCLE_WEIGHT, catalogInfo, detectAutoPR, duplaProgressao, inferExerciseType, logTstSeconds, normalizeMuscle, sinergiaState } from './catalogo.js';
import { SEASON_WEEKS, STORAGE_KEY_THEME, THEMES, XP_REST_PER_DAY, completeSeason, computeBossProgress, isoWeekKey, isoWeekRange, missionsState, rankFromXP, seasonState, XP_GROUP_DAY_CAP, XP_MIN, XP_PR, autoDeloadWeekKeys, cardioXP, computeXP, logDamageKg } from './gamificacao.js';
import { renderHistory } from './historico.js';
import { getCustomExercises, normalizarExerciciosPersonalizados, saveCustomExercises, setCustomExercisesList } from './custom_exercises.js';
import { renderExerciseTagLine, renderSearchScreen } from './busca.js';
import { bisetBlockRanges, exercicioCarregaLombar, fatigueState, orderWorkoutExercises, regiaoLombarState, suggestNextWorkout, weeklyGaps, weeklySetsByMuscle } from './assistente.js';
import { seedFromPlanilha } from './planilha_data.js';
import { isoDataValida } from './datas.js';
import { _fontsRedrawScheduled, imgSizeAttrs, themeIconImg, rankEmblemSrc, rankEmblemImg, getCardImg, drawCoverImg, wrapCanvasText, canvasMeasure, drawThemedFrame, drawThemedFrameArt, generateStoryCard, downloadStoryCard, openBossDefeatCard, generateBossDefeatCard, downloadBossDefeatCard, withWebFonts } from './cartoes.js';
import { calculate1RM, renderWarmupCalculator, calculateWarmupFromForm, calculatePlatesFromForm, calculatePlatesQuick, weeklyStreakInfo, badgeArtSrc, badgeArtImg, badgeArtFallback, bestWeekWorkouts, renderBadgesAndStreak, renderTests, addTestRecord, deleteTestRecord, addCustomTest } from './calculadoras.js';
import { parseCSVRows, isObjetoSimples, validarBackupJSON, buildBackupPayload } from './backup.js';
import { logsForTheme, saveLogsToStorage, saveWorkoutsToStorage, saveSettings, saveGameState, saveStoryState, defaultTests, emptyThemeGameSave, parseStoredObject, migrateLog, normalizeSavedWorkouts, isoWeekDateRange, seasonsDoTema, deloadWeeksEfetivos, snapshotStoryBgDataURL } from './persistencia.js';
import { renderSession, moveSessionUnit, showWarmupFor, showPlatesFor, registerSessionUnit, timerRemainingMs, updateSessionTimerDisplay, addSessionTimer, toggleSessionTimer, tickSessionTimer, vibrate, playBeepSound, spawnDamageFloat, normalizeBisets, pairLink, toggleDraftBiset, getAnimalRankForSession } from './sessao.js';
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
let bossPortraits = {};        // retratos do tema ativo { bossId: dataURL | 'idb:portrait:...' }
const portraitObjectURLs = {};  // marcador 'idb:...' → objectURL do Blob no IndexedDB (sessão atual)
const STORY_BG_BLOB_KEY = 'story-bg'; // chave do Blob do fundo do Story Card no IndexedDB
let themeGameSaves = {};       // progresso separado por tema
let activeGameThemeId = 'classico';
let selectedStoryBossId = null;

let THEME = null, BOSSES = [], ANIMAL_RANKS = [];
let lastRankLevel = null, lastBossesDefeated = null;

// Cronômetro de descanso (baseado em horário de término — não trava com tela bloqueada)
let timer = { endsAt: null, remainingMs: 0, running: false, interval: null };
let wakeLock = null;

// Vigia a virada do dia
let lastKnownTodayISO = null;

// Data do último backup exportado (aviso de backup atrasado)
let lastBackupAt = null;

// Estado dos editores "série a série" por prefixo de campo
const setEditorState = {};

// ============================ PERSISTÊNCIA ============================
const STORAGE_KEY_LOGS = 'berzerker_diario_cargas_logs_v2';
const STORAGE_KEY_BW = 'berzerker_user_bodyweight';
const STORAGE_KEY_WORKOUTS = 'berzerker_saved_workouts_v1';
const STORAGE_KEY_SEEDED = 'berzerker_seeded_v2';
const STORAGE_KEY_SETTINGS = 'berzerker_settings_v1';
const STORAGE_KEY_GAME = 'berzerker_game_state_v1';     // save legado, lido apenas para migração
const STORAGE_KEY_THEME_GAMES = 'berzerker_game_saves_v2';
const STORAGE_KEY_GAME_SHARED = 'berzerker_game_shared_v1';
const STORAGE_KEY_STORY = 'berzerker_story_v1';          // foto de fundo do Story Card
const STORAGE_KEY_BACKUP = 'berzerker_last_backup_at';

// Falha de gravação é OBSERVÁVEL: safeStorage.set devolve false e avisa o usuário
// uma única vez por sequência de falhas (sem um alerta por chave). Uma gravação
// bem-sucedida rearma o aviso.
let _storageFailureNotified = false;
function notifyStorageFailure() {
    if (_storageFailureNotified) return;
    _storageFailureNotified = true;
    try {
        if (typeof alertModal === 'function') alertModal('⚠️ Não foi possível salvar neste navegador. Exporte um backup JSON agora: alterações recentes podem não estar salvas.');
    } catch (e) { /* sem UI disponível */ }
}

const safeStorage = {
    get(key) {
        try { if (window.storage && typeof window.storage.get === 'function') return window.storage.get(key); } catch (e) { /* fallback */ }
        try { return window.localStorage.getItem(key); } catch (e) { return null; }
    },
    // Retorna true quando a gravação não falhou. Não é garantia de disco físico:
    // mede apenas exceções/falhas observáveis do navegador.
    set(key, val) {
        let ok = true;
        try {
            if (window.storage && typeof window.storage.set === 'function') ok = window.storage.set(key, val) !== false;
            else if (val == null) window.localStorage.removeItem(key);
            else window.localStorage.setItem(key, val);
        } catch (e) { ok = false; }
        if (ok) _storageFailureNotified = false;
        else notifyStorageFailure();
        return ok;
    }
};

// Imagens e fundo vivem como Blob no IndexedDB. Falha de gravação aqui também é
// OBSERVÁVEL (mesmo padrão do safeStorage.set): avisa uma vez por sequência, rearma
// após sucesso e nunca deixa a UI dizer "salvo" sem confirmação. O app continua
// utilizável — o registro/treino não depende da imagem.
let _blobFailureNotified = false;
const TEXTO_BLOB_NAO_CONFIRMADO = 'não confirmou o salvamento';
function notifyBlobFailure() {
    if (_blobFailureNotified) return;
    _blobFailureNotified = true;
    try {
        showBlobFailureWarning(`⚠️ A imagem ${TEXTO_BLOB_NAO_CONFIRMADO} (armazenamento de imagens indisponível ou sem espaço). O app continua funcionando, mas a imagem pode desaparecer ao recarregar — exporte um backup JSON.`);
    } catch (e) { /* sem UI disponível */ }
}

// Aviso PERSISTENTE da imagem não confirmada: ao contrário do alertModal (some em
// ~4 s), fica na tela até a pessoa dispensar e traz a ação que protege os dados —
// o mesmo exportJSONBackup do botão de Config. Não é modal: não cobre a tela nem
// bloqueia o registro. Um só por vez (id fixo); quem decide QUANDO aparecer é o
// notifyBlobFailure (uma vez por sequência de falhas, rearmado após sucesso).
const BLOB_WARNING_ID = 'blob-save-warning';
function showBlobFailureWarning(msg) {
    document.getElementById(BLOB_WARNING_ID)?.remove();
    const aviso = document.createElement('div');
    aviso.id = BLOB_WARNING_ID;
    aviso.setAttribute('role', 'alert');
    aviso.className = 'fixed top-4 left-4 right-4 sm:left-auto sm:right-5 sm:max-w-sm z-[65] bg-berzerker-card border border-amber-500/60 rounded-xl shadow-2xl p-4 space-y-3';
    aviso.innerHTML = `
        <p class="text-xs text-amber-200 font-bold leading-relaxed">${escapeHtml(msg)}</p>
        <div class="flex flex-wrap gap-2 justify-end">
            <button type="button" data-action="closeElementById" data-args='["${BLOB_WARNING_ID}"]' class="px-4 py-2 bg-berzerker-border hover:bg-gray-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors">Dispensar</button>
            <button type="button" data-action="exportJSONBackup" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors">💾 Exportar backup JSON</button>
        </div>`;
    document.body.appendChild(aviso);
}

// Grava um Blob confirmando o resultado. Devolve true SÓ quando o IndexedDB
// confirmou a gravação; false = não confirmado (nunca "salvo" falso).
// opts.silencioso: quem chama já vai avisar o usuário (ex.: importação de backup
// e upload com caminho reserva) — não dispara o aviso genérico.
async function saveBlobChecked(key, blob, opts) {
    let ok = false;
    try {
        if (window.storage && typeof window.storage.saveBlob === 'function') ok = (await window.storage.saveBlob(key, blob)) === true;
    } catch (e) { ok = false; }
    if (ok) _blobFailureNotified = false;
    else if (!(opts && opts.silencioso)) notifyBlobFailure();
    return ok;
}

// Mensagem final de um upload de imagem: só anuncia sucesso se a gravação foi
// confirmada. Sem confirmação, diz exatamente isso (nada de "atualizado!").
function mensagemImagemSalva(confirmado, textoSucesso) {
    if (confirmado) return textoSucesso;
    try { notifyBlobFailure(); } catch (e) { /* sem UI */ }
    return `⚠️ A imagem foi aplicada na tela, mas o navegador ${TEXTO_BLOB_NAO_CONFIRMADO}. Exporte um backup JSON agora.`;
}

// ============================ CONSTANTES UI ============================
const TECHNIQUES = [['Convencional', 'Convencional'], ['Rest-Pause', 'Rest-Pause'], ['Drop-Set', 'Drop-Set'], ['Cluster', 'Cluster Set'], ['Isometria', 'Isometria Focus'], ['Excêntrica Lenta', 'Excêntrica Lenta']];
const NEXT_GOALS = [['', '— automático —'], ['📈 Aumentar Carga', '📈 Aumentar Carga (+kg)'], ['➕ Aumentar Reps', '➕ Mais Repetições'], ['⚖️ Manter Carga', '⚖️ Manter Carga'], ['🎯 Ajustar Execução', '🎯 Ajustar Técnica'], ['📉 Reduzir Carga', '📉 Reduzir Peso']];
const INP = 'w-full bg-berzerker-dark border border-berzerker-border rounded-lg px-2.5 py-2 text-white text-sm focus:outline-none focus:border-berzerker-500';
const LBL = 'block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1';
const MUSCLE_OPTIONS = MUSCLE_OPTIONS_FULL; // catálogo completo (10 grupos + Geral)
const NAV_GROUPS = [
    { id: 'treino', label: 'Treino', tabs: [['diario', 'Hoje'], ['historico', 'Histórico'], ['busca', 'Buscar'], ['montador', 'Meus treinos']] },
    { id: 'jogo', label: 'Jogo', tabs: [['boss', 'Boss'], ['story', 'Story Card']] },
    { id: 'voce', label: 'Você', tabs: [['stats', 'Stats'], ['calcs', 'Calcs']] },
    { id: 'config', label: 'Config', tabs: [['config', 'Config']] }
];
let activeNavGroup = 'treino';
let activeTab = 'diario';
const THEME_ICONS = Object.freeze({
    classico: '🦍', zodiaco: '♈', hercules: '🦁', acao: '🎬', folclore: '🌴',
    nordica: '🛡️', roma: '🏛️', rpg: '🐉', galactica: '🚀', aneis: '💍'
});

// Arte própria dos temas: ícone (selo) e fundo dos cards. Patente = 10 níveis × 10 temas.
const THEME_IDS_LIST = ['classico', 'zodiaco', 'hercules', 'acao', 'folclore', 'nordica', 'roma', 'rpg', 'galactica', 'aneis'];
const THEME_ICON_IMGS = Object.freeze(Object.fromEntries(THEME_IDS_LIST.map(id => [id, `images/temas/${id}.webp`])));
const THEME_CARD_BGS = Object.freeze(Object.fromEntries(THEME_IDS_LIST.map(id => [id, `images/cards/${id}.webp`])));

// Escala de espaçamento do Tailwind em px. Serve para dar largura/altura
// intrínsecas às artes: sem os atributos o navegador reserva 0px até a imagem
// carregar e a grade inteira "pula" no celular (CLS).
const TAILWIND_SPACING_PX = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 7: 28, 8: 32, 10: 40, 12: 48, 14: 56, 16: 64, 20: 80, 24: 96 };

// Cache de imagens para os cards em canvas (fundo do tema + emblema da patente).
const _cardImgCache = {};

const STORY_CARD_STYLES = Object.freeze({
    classico: {
        palette: { bgStart: '#0a0a0a', bgEnd: '#1a0303', cardBg: 'rgba(18,18,22,.88)', cardBorder: 'rgba(255,255,255,.08)', borderPrimary: '#dc2626', titleColor: '#ffffff', accentColor: '#ef4444', textDim: '#9ca3af', prColor: '#10b981', badgeBg: '#1f1f1f' },
        fonts: { display: '"Oswald", sans-serif', accent: '"Teko", sans-serif', body: '"Inter", sans-serif', numeric: '"Oswald", sans-serif' }
    },
    zodiaco: {
        palette: { bgStart: '#080d22', bgEnd: '#171a42', cardBg: 'rgba(16,20,48,.9)', cardBorder: 'rgba(245,206,105,.2)', borderPrimary: '#d4af37', titleColor: '#fff7dc', accentColor: '#fbbf24', textDim: '#b9c4df', prColor: '#6ee7b7', badgeBg: '#121831' },
        fonts: { display: 'Georgia, serif', accent: 'Georgia, serif', body: '"Inter", sans-serif', numeric: '"Oswald", sans-serif' }
    },
    hercules: {
        palette: { bgStart: '#111318', bgEnd: '#27242b', cardBg: 'rgba(32,32,38,.9)', cardBorder: 'rgba(230,216,190,.18)', borderPrimary: '#d6c3a1', titleColor: '#fff9ed', accentColor: '#e5b75c', textDim: '#c2bcae', prColor: '#7dd3c7', badgeBg: '#28262b' },
        fonts: { display: 'Georgia, serif', accent: '"Teko", sans-serif', body: '"Inter", sans-serif', numeric: 'Georgia, serif' }
    },
    acao: {
        palette: { bgStart: '#080b12', bgEnd: '#1d0505', cardBg: 'rgba(17,20,28,.9)', cardBorder: 'rgba(248,113,113,.18)', borderPrimary: '#ef4444', titleColor: '#fffafa', accentColor: '#fb7185', textDim: '#b1b6c2', prColor: '#fbbf24', badgeBg: '#1b1014' },
        fonts: { display: '"Oswald", sans-serif', accent: '"Teko", sans-serif', body: '"Inter", sans-serif', numeric: 'monospace' }
    },
    folclore: {
        palette: { bgStart: '#071a12', bgEnd: '#162a16', cardBg: 'rgba(12,31,19,.9)', cardBorder: 'rgba(134,239,172,.17)', borderPrimary: '#34d399', titleColor: '#f5efd8', accentColor: '#facc15', textDim: '#b4b4a3', prColor: '#fb7185', badgeBg: '#102016' },
        fonts: { display: 'Georgia, serif', accent: '"Teko", sans-serif', body: '"Inter", sans-serif', numeric: '"Oswald", sans-serif' }
    },
    nordica: {
        palette: { bgStart: '#070d14', bgEnd: '#10243c', cardBg: 'rgba(12,24,38,.9)', cardBorder: 'rgba(147,197,253,.17)', borderPrimary: '#60a5fa', titleColor: '#e5f3ff', accentColor: '#38bdf8', textDim: '#a7b7c8', prColor: '#a3e635', badgeBg: '#0f1b2b' },
        fonts: { display: 'Georgia, serif', accent: '"Oswald", sans-serif', body: '"Inter", sans-serif', numeric: '"Oswald", sans-serif' }
    },
    roma: {
        palette: { bgStart: '#170809', bgEnd: '#38120d', cardBg: 'rgba(39,15,14,.9)', cardBorder: 'rgba(253,186,116,.18)', borderPrimary: '#d4a44f', titleColor: '#fff1d6', accentColor: '#f59e0b', textDim: '#d2bda0', prColor: '#34d399', badgeBg: '#2b1010' },
        fonts: { display: 'Georgia, serif', accent: 'Georgia, serif', body: '"Inter", sans-serif', numeric: 'Georgia, serif' }
    },
    rpg: {
        palette: { bgStart: '#0d0817', bgEnd: '#201328', cardBg: 'rgba(27,17,39,.9)', cardBorder: 'rgba(196,181,253,.18)', borderPrimary: '#a78bfa', titleColor: '#f4e9ff', accentColor: '#f472b6', textDim: '#c0b2d3', prColor: '#86efac', badgeBg: '#1c1428' },
        fonts: { display: 'Georgia, serif', accent: '"Teko", sans-serif', body: '"Inter", sans-serif', numeric: '"Oswald", sans-serif' }
    },
    galactica: {
        palette: { bgStart: '#050814', bgEnd: '#0b1e3a', cardBg: 'rgba(7,21,42,.92)', cardBorder: 'rgba(103,232,249,.2)', borderPrimary: '#22d3ee', titleColor: '#e0fbff', accentColor: '#60a5fa', textDim: '#9db6d0', prColor: '#a3e635', badgeBg: '#0c2035' },
        fonts: { display: '"Oswald", sans-serif', accent: 'monospace', body: '"Inter", sans-serif', numeric: 'monospace' }
    },
    aneis: {
        palette: { bgStart: '#06120a', bgEnd: '#1d2410', cardBg: 'rgba(11,27,15,.9)', cardBorder: 'rgba(226,196,110,.22)', borderPrimary: '#c9a227', titleColor: '#f7f2dd', accentColor: '#e2c46e', textDim: '#adb8a3', prColor: '#7dd3a0', badgeBg: '#122114' },
        fonts: { display: 'Georgia, serif', accent: '"Teko", sans-serif', body: '"Inter", sans-serif', numeric: '"Oswald", sans-serif' }
    }
});

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
function updateHeaderDate(isoStr) {
    const el = document.getElementById('header-today-date');
    if (!el) return;
    el.textContent = formatShortBR(isoStr);
    el.title = formatDateBR(isoStr);
}
function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
// ============================ SETTERS PARA MÓDULOS ============================
// Escritas de estado por outros módulos viram funções exportadas
// (imports de ES module são somente leitura; etapa 5.1, sub-etapa 2).
function setLogs(v) { logs = v; }
function setSavedWorkouts(v) { savedWorkouts = v; }
function setUserBodyweight(v) { userBodyweight = v; }
function setWeightLog(v) { weightLog = v; }
function setHistVolChartInstance(v) { histVolChartInstance = v; }

// Fecha/remove um overlay pelo id (data-action="closeElementById")
function closeElementById(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

// Esconde um elemento pelo id (data-action="hideElementById")
function hideElementById(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
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

function ensureThemeGameSave(themeId) {
    const id = THEMES[themeId] ? themeId : 'classico';
    const raw = themeGameSaves[id] && typeof themeGameSaves[id] === 'object' ? themeGameSaves[id] : {};
    const missionsClaimed = raw.missionsClaimed && typeof raw.missionsClaimed === 'object' && !Array.isArray(raw.missionsClaimed) ? raw.missionsClaimed : {};
    const bossPortraits = raw.bossPortraits && typeof raw.bossPortraits === 'object' && !Array.isArray(raw.bossPortraits) ? raw.bossPortraits : {};
    themeGameSaves[id] = {
        ...emptyThemeGameSave(), ...raw,
        missionsXpTotal: Math.max(0, Number(raw.missionsXpTotal) || 0),
        missionsClaimed,
        seasons: raw.seasons && typeof raw.seasons === 'object' ? raw.seasons : null,
        bossPortraits,
        deloadRestDays: Array.isArray(raw.deloadRestDays) ? [...new Set(raw.deloadRestDays.filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x)))].sort() : []
    };
    return themeGameSaves[id];
}

function restoreActiveThemeGameSave(themeId) {
    activeGameThemeId = THEMES[themeId] ? themeId : 'classico';
    const save = ensureThemeGameSave(activeGameThemeId);
    missionsXpTotal = save.missionsXpTotal;
    missionsClaimed = { ...save.missionsClaimed };
    seasons = save.seasons ? JSON.parse(JSON.stringify(save.seasons)) : null;
    bossPortraits = { ...save.bossPortraits };
    // Blobs do IndexedDB: hidrata objectURLs (e migra dataURLs legados) sem bloquear.
    if (typeof hydratePortraitBlobs === 'function') { try { hydratePortraitBlobs(); } catch (e) { /* noop */ } }
}

function ensureDeloadRestAwards() {
    const hoje = getTodayLocalISO();
    const trainingDates = new Set(logs.filter(l => l && l.date).map(l => l.date));
    const assignedDates = new Set();
    let changed = false;

    Object.keys(THEMES).forEach(themeId => {
        const save = ensureThemeGameSave(themeId);
        const semanasTema = new Set(deloadWeeksEfetivos(seasonsDoTema(themeId, save)));
        const keep = [];
        save.deloadRestDays.forEach(date => {
            const valid = semanasTema.has(isoWeekKey(date)) && !trainingDates.has(date) && !assignedDates.has(date);
            if (valid) { keep.push(date); assignedDates.add(date); }
            else changed = true;
        });
        if (keep.length !== save.deloadRestDays.length) save.deloadRestDays = keep;
    });

    const saveAtivo = ensureThemeGameSave(activeGameThemeId);
    deloadWeeksEfetivos(seasonsDoTema(activeGameThemeId, saveAtivo)).forEach(weekKey => {
        const range = isoWeekDateRange(weekKey);
        if (!range) return;
        const [start, end] = range;
        // Só até HOJE: dia futuro ainda pode virar treino, então não pode
        // render XP de descanso antecipado (o XP tem que ser conquistado).
        for (let date = start; date <= end && date <= hoje; ) {
            if (!trainingDates.has(date) && !assignedDates.has(date)) {
                saveAtivo.deloadRestDays.push(date);
                assignedDates.add(date);
                changed = true;
            }
            const next = new Date(`${date}T12:00:00`);
            next.setDate(next.getDate() + 1);
            date = toLocalISO(next);
        }
    });
    return changed;
}

function loadGameProgressFromStorage() {
    const storedTheme = safeStorage.get(STORAGE_KEY_THEME);
    activeGameThemeId = THEMES[storedTheme] ? storedTheme : 'classico';
    const legacy = parseStoredObject(STORAGE_KEY_GAME);
    const storedThemes = parseStoredObject(STORAGE_KEY_THEME_GAMES);
    themeGameSaves = {};
    if (storedThemes && Object.keys(storedThemes).some(id => THEMES[id] && storedThemes[id] && typeof storedThemes[id] === 'object')) {
        Object.entries(storedThemes).forEach(([id, save]) => {
            if (THEMES[id] && save && typeof save === 'object' && !Array.isArray(save)) themeGameSaves[id] = save;
        });
    } else {
        // Migração única do save antigo: todo o progresso de jogo vai para o tema ativo.
        const migrated = emptyThemeGameSave();
        if (legacy) {
            migrated.missionsXpTotal = Number(legacy.missionsXpTotal) || 0;
            migrated.missionsClaimed = legacy.missionsClaimed || {};
            migrated.seasons = legacy.seasons || null;
            migrated.bossPortraits = legacy.bossPortraits || {};
        }
        themeGameSaves[activeGameThemeId] = migrated;
    }

    const shared = parseStoredObject(STORAGE_KEY_GAME_SHARED) || {};
    deloadWeeks = Array.isArray(shared.deloadWeeks) ? shared.deloadWeeks : (Array.isArray(legacy?.deloadWeeks) ? legacy.deloadWeeks : []);
    tests = Array.isArray(shared.tests) ? shared.tests : (Array.isArray(legacy?.tests) ? legacy.tests : defaultTests());
    weightLog = Array.isArray(shared.weightLog) ? shared.weightLog : (Array.isArray(legacy?.weightLog) ? legacy.weightLog : []);
    if (!tests.length) tests = defaultTests();

    Object.keys(THEMES).forEach(ensureThemeGameSave);
    restoreActiveThemeGameSave(activeGameThemeId);
    let logsChanged = false;
    logs.forEach(log => {
        if (!THEMES[log.xpTheme]) { log.xpTheme = activeGameThemeId; logsChanged = true; }
    });
    if (logsChanged) safeStorage.set(STORAGE_KEY_LOGS, JSON.stringify(logs));
    ensureDeloadRestAwards();
    saveGameState();
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

    loadGameProgressFromStorage();
    try {
        const st = JSON.parse(safeStorage.get(STORAGE_KEY_STORY));
        if (st && typeof st === 'object') {
            // Novo: fundo vive como Blob no IndexedDB (flag `bgBlob`).
            if (st.bgBlob === '1' && window.storage && typeof window.storage.getBlob === 'function') {
                window.storage.getBlob(STORY_BG_BLOB_KEY).then(blob => {
                    if (!blob) return;
                    const url = URL.createObjectURL(blob);
                    const img = new Image();
                    img.onload = () => { customBgImageData = img; generateStoryCard(); };
                    img.src = url;
                }).catch(() => {});
            } else if (st.bgImageData) {
                // Legado: dataURL em base64 → migra para Blob e limpa o localStorage.
                const dataURL = st.bgImageData;
                const img = new Image();
                img.onload = () => {
                    customBgImageData = img;
                    generateStoryCard();
                    (async () => {
                        try {
                            if (window.storage && typeof window.storage.compressImage === 'function' && typeof window.storage.saveBlob === 'function') {
                                const blob = await window.storage.compressImage(dataURL, 1080, 0.82, 'image/webp');
                                // Não confirmou o Blob? Avisa (uma vez) e MANTÉM o dataURL legado.
                                if (await saveBlobChecked(STORY_BG_BLOB_KEY, blob)) saveStoryState();
                            }
                        } catch (e) { /* mantém o legado */ }
                    })();
                };
                img.src = dataURL;
            }
        }
    } catch (e) { /* ok */ }
    lastBackupAt = safeStorage.get(STORAGE_KEY_BACKUP);
}

function loadWorkoutsFromStorage() {
    try {
        const stored = JSON.parse(safeStorage.get(STORAGE_KEY_WORKOUTS));
        if (Array.isArray(stored)) savedWorkouts = stored;
    } catch (e) { savedWorkouts = []; }
    normalizeSavedWorkouts();
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
function updateStoryThemeInfo() {
    const icon = document.getElementById('story-theme-icon');
    const name = document.getElementById('story-theme-name');
    if (icon) icon.innerHTML = themeIconImg(THEME?.id, 'h-7 w-7 rounded-lg');
    if (name) name.textContent = THEME?.name || 'Tema atual';
}

function applyTheme(id) {
    THEME = THEMES[id] || THEMES.classico;
    activeGameThemeId = THEME.id;
    BOSSES = THEME.bosses;
    ANIMAL_RANKS = THEME.ranks.map(([name, icon], i) => ({ minXp: XP_MIN[i], level: i + 1, name, icon }));
    const set = (el, fn) => { const e = document.getElementById(el); if (e) fn(e); };
    set('arena-title', e => e.textContent = THEME.arena);
    updateStoryThemeInfo();
    const xd = computeXPCtx();
    lastRankLevel = rankFromXP(xd.xp).level;
    lastBossesDefeated = xd.prog.defeatedCount;
}

function changeGameTheme(id) {
    if (!THEMES[id]) return;
    saveGameState();
    restoreActiveThemeGameSave(id);
    safeStorage.set(STORAGE_KEY_THEME, id);
    applyTheme(id);
    refreshAll();
    alertModal(`🎭 Tema "${THEME.name}" aplicado! Seu progresso foi preservado.`);
}

function computeThemeXPCtx(themeId, upto) {
    const t = THEMES[themeId] || THEME || THEMES.classico;
    const save = ensureThemeGameSave(t.id);
    if (ensureDeloadRestAwards()) saveGameState();
    const gameLogs = logsForTheme(t.id);
    const missionXP = t.id === activeGameThemeId ? missionsXpTotal : save.missionsXpTotal;
    return computeXP(upto, {
        logs: gameLogs, bodyweight: userBodyweight, deloadWeeks: deloadWeeksEfetivos(seasonsDoTema(t.id, save)),
        missionsXpTotal: missionXP, bosses: t.bosses, restDays: save.deloadRestDays
    });
}

function computeXPCtx(upto) {
    return computeThemeXPCtx(activeGameThemeId || THEME?.id || 'classico', upto);
}

function getGlobalXPTotal() {
    return Object.keys(THEMES).reduce((sum, themeId) => sum + computeThemeXPCtx(themeId).xp, 0);
}

function themeRankList(theme) {
    return theme.ranks.map(([name, icon], i) => ({ minXp: XP_MIN[i], level: i + 1, name, icon }));
}

function themeConfirmationName(theme) {
    if (theme.id === 'roma') return 'Roma Antiga';
    return theme.name.replace(/\s+\(clássico\)$/i, '');
}

function requestGameThemeChange(id) {
    const nextTheme = THEMES[id];
    if (!nextTheme) return;
    document.getElementById('theme-gallery-overlay')?.remove();
    if (nextTheme.id === THEME?.id) return;
    confirmModal(`Trocar para ${themeConfirmationName(nextTheme)}? O progresso deste jogo será preservado.`, () => changeGameTheme(nextTheme.id));
}

function showThemeGallery() {
    document.getElementById('theme-gallery-overlay')?.remove();
    const cards = Object.values(THEMES).map(theme => {
        const data = computeThemeXPCtx(theme.id);
        const ranks = themeRankList(theme);
        const currentRank = rankFromXP(data.xp, ranks);
        const nextRank = ranks[currentRank.level] || null;
        const progress = nextRank
            ? Math.max(0, Math.min(100, Math.round((data.xp - currentRank.minXp) / (nextRank.minXp - currentRank.minXp) * 100)))
            : 100;
        const active = theme.id === THEME?.id;
        const defeated = Math.min(data.prog.defeatedCount, theme.bosses.length);
        return `<button type="button" data-theme-id="${theme.id}" data-action="requestGameThemeChange" data-args='["${theme.id}"]' class="text-left rounded-2xl border ${active ? 'border-berzerker-500 bg-berzerker-600/10 ring-1 ring-berzerker-500/30' : 'border-berzerker-border bg-berzerker-dark hover:border-gray-500'} p-4 transition-colors focus:outline-none focus:ring-2 focus:ring-berzerker-500">
            <div class="flex items-start justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0">${themeIconImg(theme.id, 'h-8 w-8 rounded-lg border border-berzerker-border')}<strong class="text-sm text-white leading-tight">${escapeHtml(theme.name)}</strong></div>
                ${active ? '<span class="shrink-0 rounded-full bg-berzerker-600/25 px-2 py-1 text-[10px] font-bold uppercase text-berzerker-300">Ativo</span>' : ''}
            </div>
            <div class="mt-3 flex items-end justify-between gap-2">
                <div class="min-w-0"><span class="block text-[10px] font-bold uppercase tracking-wider text-gray-500">Patente atual</span><span class="block truncate text-xs font-bold text-amber-300">${rankEmblemImg(theme.id, currentRank.level, 'inline-block h-4 w-4 rounded-full align-[-3px] mr-1')} ${escapeHtml(currentRank.name)}</span></div>
                <span class="shrink-0 text-[10px] font-mono text-gray-400">Nível ${currentRank.level}/10</span>
            </div>
            <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-berzerker-border"><div class="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-300" style="width:${progress}%"></div></div>
            <div class="mt-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-[10px] font-mono text-gray-500"><span>${fmtN(data.xp)} XP${nextRank ? ` / ${fmtN(nextRank.minXp)} XP` : ' · nível máximo'}</span><span>${defeated}/${theme.bosses.length} chefões</span></div>
            <p class="mt-2 line-clamp-2 text-[11px] leading-snug text-gray-500">${escapeHtml(theme.desc)}</p>
        </button>`;
    }).join('');
    const overlay = document.createElement('div');
    overlay.id = 'theme-gallery-overlay';
    overlay.className = 'fixed inset-0 z-[55] flex items-start justify-center overflow-y-auto bg-black/80 p-3 backdrop-blur-sm sm:items-center sm:p-5';
    overlay.onclick = event => { if (event.target === overlay) overlay.remove(); };
    overlay.innerHTML = `<div class="my-auto max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-berzerker-border bg-berzerker-card p-4 shadow-2xl sm:p-6">
        <div class="mb-4 flex items-center justify-between gap-3">
            <div><h2 class="font-oswald text-xl font-bold uppercase tracking-wider text-white">🎭 Temas de gamificação</h2><p class="mt-1 text-[11px] text-gray-400">Cada jogo mantém sua patente e seu progresso.</p></div>
            <button type="button" data-action="closeElementById" data-args='["theme-gallery-overlay"]' aria-label="Fechar galeria" class="rounded-lg px-3 py-2 text-gray-400 hover:bg-berzerker-dark hover:text-white">✕</button>
        </div>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">${cards}</div>
    </div>`;
    document.body.appendChild(overlay);
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
    const d = computeThemeXPCtx(t.id);
    const rankList = themeRankList(t);
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
            <div class="flex items-center gap-2 min-w-0">${rankEmblemImg(t.id, lvl)}<span class="text-xs font-bold text-white truncate">${escapeHtml(x.name)}</span></div>
            <div class="text-right shrink-0"><div class="text-[10px] font-mono text-gray-400">${fmt(x.minXp)} XP</div><div class="text-[10px] font-bold text-gray-500 uppercase leading-tight">${tag}</div></div>
        </div>`;
    }).join('');
    const tabs = Object.values(THEMES).map(x => `<button data-action="showRanksModal" data-args='["${x.id}"]' class="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${x.id === t.id ? 'bg-berzerker-600 text-white' : 'bg-berzerker-border text-gray-400 hover:text-white'}">${escapeHtml(x.name)}</button>`).join('');
    document.getElementById('ranks-overlay')?.remove();
    const o = document.createElement('div');
    o.id = 'ranks-overlay';
    o.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-start sm:items-center justify-center p-4 overflow-y-auto';
    o.onclick = ev => { if (ev.target === o) o.remove(); };
    o.innerHTML = `<div class="bg-berzerker-card border border-berzerker-border rounded-2xl p-5 max-w-lg w-full shadow-2xl space-y-3">
        <div class="flex items-center justify-between"><h3 class="font-oswald text-lg font-bold text-white uppercase tracking-wider">📜 Patentes</h3><button aria-label="Fechar patentes" data-action="closeElementById" data-args='["ranks-overlay"]'  class="text-gray-400 hover:text-white">✕</button></div>
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
function renderNavigation() {
    NAV_GROUPS.forEach(group => {
        const button = document.getElementById(`nav-group-${group.id}`);
        if (!button) return;
        const active = group.id === activeNavGroup;
        button.className = `min-w-0 min-h-[44px] px-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors ${active ? 'bg-berzerker-600 text-white' : 'bg-berzerker-dark text-gray-300 hover:text-white'}`;
        if (active) button.setAttribute('aria-current', 'page');
        else button.removeAttribute('aria-current');
    });

    const subnav = document.getElementById('nav-subnav');
    if (!subnav) return;
    const group = NAV_GROUPS.find(item => item.id === activeNavGroup) || NAV_GROUPS[0];
    if (group.id === 'config') {
        subnav.innerHTML = '';
        subnav.classList.add('hidden');
        return;
    }
    subnav.classList.remove('hidden');
    subnav.innerHTML = group.tabs.map(([tab, label]) => {
        const active = tab === activeTab;
        return `<button type="button" id="nav-${tab}" data-action="switchTab" data-args='["${tab}"]' ${active ? 'aria-current="page"' : ''} class="min-h-[44px] px-3 py-2 rounded-lg text-xs font-bold transition-colors ${active ? 'bg-berzerker-600/25 text-white border border-berzerker-500/50' : 'text-gray-400 bg-berzerker-dark/60 border border-transparent hover:text-white'}">${label}</button>`;
    }).join('');
}

function selectNavGroup(groupId) {
    const group = NAV_GROUPS.find(item => item.id === groupId);
    if (!group) return;
    if (group.id === 'config') {
        switchTab('config');
        return;
    }
    activeNavGroup = group.id;
    if (!group.tabs.some(([tab]) => tab === activeTab)) switchTab(group.tabs[0][0]);
    else renderNavigation();
}

function switchTab(tab) {
    const tabIds = NAV_GROUPS.flatMap(group => group.tabs.map(([id]) => id));
    if (!tabIds.includes(tab)) return;
    activeTab = tab;
    const group = NAV_GROUPS.find(item => item.tabs.some(([id]) => id === tab));
    if (group) activeNavGroup = group.id;
    tabIds.forEach(id => {
        const el = document.getElementById(`tab-content-${id}`);
        if (el) el.classList.toggle('hidden', id !== tab);
    });
    renderNavigation();
    if (tab === 'montador') { renderDraftList(); renderSavedWorkouts(); renderWeekGaps(); }
    if (tab === 'historico') renderHistory();
    if (tab === 'busca') renderSearchScreen();
    if (tab === 'boss') { renderBossBattleUI(); renderMissions(); renderSeason(); }
    if (tab === 'story') generateStoryCard();
    if (tab === 'stats') { renderBadgesAndStreak(); initVolumeChart(); renderExerciseChart(); renderWeeklySetsChart(); renderTests(); }
    if (tab === 'config') { renderBackupReminder(); renderStorageStatus(); }
}

// ============================ ARMAZENAMENTO (IndexedDB) ============================
// Migração automática no primeiro boot + painel de status (persistência e quota).
async function initStorageMigration() {
    try {
        if (window.storage && typeof window.storage.migrate === 'function') {
            const r = await window.storage.migrate();
            if (r && r.ok && !r.skipped) console.log('[storage] migração para IndexedDB concluída:', r);
            else if (r && !r.ok) console.warn('[storage] migração para IndexedDB não concluída:', r);
        }
        if (window.storage && typeof window.storage.recoverFromIndexedDB === 'function') {
            const rec = await window.storage.recoverFromIndexedDB();
            if (rec && rec.ok && rec.restored > 0) {
                console.warn(`[storage] ${rec.restored} chave(s) restaurada(s) do IndexedDB para o localStorage.`);
                loadStoredData();
                loadWorkoutsFromStorage();
            }
        }
        if (window.storage && typeof window.storage.persist === 'function') {
            const jaPersistente = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : false;
            if (!jaPersistente) await window.storage.persist();
        }
    } catch (e) { console.warn('[storage] falha na migração/persistência:', e); }
}

async function renderStorageStatus() {
    const el = document.getElementById('storage-status');
    if (!el) return;
    let linhas = [];
    try {
        if (navigator.storage && typeof navigator.storage.persisted === 'function') {
            const persistente = await navigator.storage.persisted();
            linhas.push(persistente
                ? '✅ Armazenamento <b>persistente</b>: o navegador não apaga seus dados por falta de espaço.'
                : '⚠️ Armazenamento <b>não persistente</b>: em espaço apertado o navegador pode limpar dados antigos. Faça backup com frequência.');
        }
        if (navigator.storage && typeof navigator.storage.estimate === 'function') {
            const est = await navigator.storage.estimate();
            const fmt = n => n >= 1073741824 ? (n / 1073741824).toFixed(2) + ' GB' : n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.round((n || 0) / 1024) + ' KB';
            linhas.push(`📦 Uso: <b>${fmt(est.usage || 0)}</b> de ~${fmt(est.quota || 0)} disponíveis.`);
        }
        linhas.push('🗃️ Dados gravados no <b>IndexedDB</b> (com espelho no localStorage durante a transição).');
    } catch (e) {
        linhas.push('ℹ️ Status de armazenamento indisponível neste navegador.');
    }
    el.innerHTML = linhas.map(t => `<div class="leading-relaxed">${t}</div>`).join('');
}

// ============================ SEED ============================
function seedInitialMockData(todayStr) {
    // Seed = planilha real do usuário (Log de 28/09 a 10/10/2026 + 5 sessões)
    if (safeStorage.get(STORAGE_KEY_SEEDED) === '1') return;
    if (typeof seedFromPlanilha === 'function') seedFromPlanilha();
    normalizeSavedWorkouts();
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

// Destaque verde curto no campo que o app acabou de preencher sozinho:
// confirma o autofill de relance, sem exigir conferência campo por campo.
function flashAutofill(el) {
    if (!el || !el.classList) return;
    const cls = ['ring-2', 'ring-emerald-500/70'];
    el.classList.add(...cls);
    clearTimeout(el._autofillFlash);
    el._autofillFlash = setTimeout(() => el.classList.remove(...cls), 900);
}

// Sessão (split do dia) sugerida pelo histórico do grupo: a mais repetida,
// com desempate pela mais recente. Devolve '' quando não há o que sugerir.
function suggestSessaoFor(muscle, exercise) {
    const grupo = normalizeMuscle(muscle || (catalogInfo(exercise) || {}).grupo || '');
    if (!grupo || grupo === 'Geral' || grupo === 'Cardio') return '';
    const candidatos = (Array.isArray(logs) ? logs : []).filter(l =>
        l && l.kind !== 'corrida' && String(l.sessao || '').trim() && normalizeMuscle(l.muscle) === grupo);
    if (!candidatos.length) return '';
    const resumo = {};
    candidatos.forEach(l => {
        const s = String(l.sessao).trim();
        const r = resumo[s] || (resumo[s] = { sessao: s, vezes: 0, ultima: '' });
        r.vezes += 1;
        if (String(l.date || '') > r.ultima) r.ultima = String(l.date || '');
    });
    return Object.values(resumo).sort((a, b) => (b.vezes - a.vezes)
        || (a.ultima < b.ultima ? 1 : a.ultima > b.ultima ? -1 : a.sessao.localeCompare(b.sessao, 'pt-BR')))[0].sessao;
}

function onLogExerciseChange() {
    const exName = document.getElementById('log-exercise')?.value.trim();
    const cat = catalogInfo(exName);
    if (cat) {
        const muscleSel = document.getElementById('log-muscle');
        const typeSel = document.getElementById('type');
        if (muscleSel && muscleSel.value !== cat.grupo) { muscleSel.value = cat.grupo; flashAutofill(muscleSel); }
        if (typeSel) typeSel.value = cat.tipo;
        // A sessão vem do histórico do grupo — só se o campo estiver vazio.
        const sessaoEl = document.getElementById('sessao');
        if (sessaoEl && !String(sessaoEl.value || '').trim()) {
            const sugestao = suggestSessaoFor(cat.grupo, cat.nome);
            if (sugestao) { sessaoEl.value = sugestao; flashAutofill(sessaoEl); }
        }
    }
    if (typeof renderExerciseTagLine === 'function') renderExerciseTagLine('log-tags-line', exName || '');
    onTypeChange('');
}

function toggleSetMode(prefix) {
    const mode = document.getElementById(prefix + 'mode')?.value || 'simple';
    const box = document.getElementById(prefix + 'sets-box');
    const simpleBox = document.getElementById(prefix + 'simple-box');
    const advanced = document.getElementById(prefix + 'advanced-details');
    if (box) box.classList.toggle('hidden', mode !== 'sets');
    if (simpleBox) simpleBox.classList.toggle('hidden', mode === 'sets');
    // Ao escolher o registro série a série, abra os detalhes para não ocultar
    // os campos necessários depois da mudança de modo.
    if (mode === 'sets' && advanced) advanced.open = true;
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
            <button type="button" data-action="removeSetRow" data-args='["${prefix}",${i}]' aria-label="Remover série" class="p-1.5 text-gray-500 hover:text-red-400 text-xs">✕</button>
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
    const typeModeHTML = `
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5${o.quickCapture ? '' : ' mt-3'}">
        <div class="col-span-2"><label class="${LBL}">Tipo de registro</label>
            <select id="${p}type" data-change-action="onTypeChange" data-args='["${p}"]' class="${INP}">${typeOptions}</select>
        </div>
        <div class="col-span-2"><label class="${LBL}">Modo de registro</label>
            <select id="${p}mode" data-change-action="toggleSetMode" data-args='["${p}"]' class="${INP}">
                <option value="simple"${(v.mode || 'simple') === 'simple' ? ' selected' : ''}>Séries iguais (carga única)</option>
                <option value="sets"${v.mode === 'sets' ? ' selected' : ''}>Série a série (drop-set, pirâmide)</option>
            </select>
        </div>
    </div>`;
    const simpleHTML = `
    <div id="${p}simple-box" class="grid grid-cols-2 sm:grid-cols-4 gap-2.5${o.quickCapture ? ' mb-3' : ' mt-2.5'}">
        <div><label class="${LBL}" id="${p}w-label">${wLabelText}</label><input type="number" step="0.5" min="0" id="${p}w" value="${v.weight > 0 ? v.weight : ''}" placeholder="kg" class="${INP}"></div>
        <div class="sm:col-span-3"><label class="${LBL}">Reps por Série (ou segundos em isometria)</label><input type="text" id="${p}r" value="${escapeHtml(v.repsText || '')}" placeholder="12, 10, 8" class="${INP}"></div>
    </div>`;
    const setsHTML = `
    <div id="${p}sets-box" class="hidden mt-2.5 space-y-1.5">
        <div class="flex items-center justify-between"><label class="${LBL} !mb-0">Séries — carga · reps · RIR (opcional)</label>
            <button type="button" data-action="addSetRow" data-args='["${p}"]' class="text-xs font-bold text-cyan-400 hover:underline">+ série</button></div>
        <div id="${p}sets" class="space-y-1.5"></div>
    </div>`;
    const extraHTML = `
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-2.5">
        <div><label class="${LBL}">RIR (reps em reserva)</label><input type="number" min="0" max="10" id="${p}rir" value="${v.rir ?? ''}" placeholder="ex: 2" class="${INP}"></div>
        <div><label class="${LBL}">Técnica Avançada</label><select id="${p}t" class="${INP}">${optsSelect(TECHNIQUES, v.technique)}</select></div>
        <div class="col-span-2"><label class="${LBL} !text-emerald-400">💡 Meta Próximo Treino</label><select id="${p}g" class="${INP}">${optsSelect(NEXT_GOALS, v.nextGoal)}</select></div>
        <div class="col-span-2"><label class="${LBL}">Sessão (split do dia)</label><input type="text" id="${p}sessao" value="${escapeHtml(v.sessao || '')}" list="sessao-list" placeholder="ex: Peito/Tríceps/Ombro" class="${INP}"></div>
        <label class="flex items-center gap-2 cursor-pointer col-span-2 self-end pb-2"><input type="checkbox" id="${p}conf"${v.conferir ? ' checked' : ''} class="w-4 h-4 rounded text-amber-500 bg-berzerker-dark border-berzerker-border"><span class="text-xs font-bold text-amber-400 uppercase tracking-wider">⚠️ Conferir?</span></label>
        <div class="col-span-2 sm:col-span-4"><label class="${LBL}">Observações</label><textarea id="${p}n" rows="2" placeholder="Ex: ajuste do banco, dor, sensação, regulagem da máquina..." class="${INP}">${escapeHtml(v.notes || '')}</textarea></div>
        ${o.prOverride ? `<label class="flex items-center gap-2 cursor-pointer col-span-2"><input type="checkbox" id="${p}p"${v.isPR ? ' checked' : ''} class="w-4 h-4 rounded text-emerald-500 bg-berzerker-dark border-berzerker-border"><span class="text-xs font-bold text-emerald-400 uppercase tracking-wider">🏆 PR (auto pelo 1RM — pode forçar)</span></label>` : ''}
    </div>`;

    if (o.quickCapture) {
        return `${simpleHTML}
        <details id="${p}advanced-details" class="border border-berzerker-border rounded-xl bg-berzerker-dark/50"${v.mode === 'sets' ? ' open' : ''}>
            <summary class="cursor-pointer select-none px-3 py-2.5 text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center justify-between gap-3">
                <span>Mais detalhes</span>
                <span class="text-xs text-gray-400 normal-case tracking-normal">séries individuais, técnica, observações e ferramentas</span>
            </summary>
            <div class="border-t border-berzerker-border p-3 space-y-3">
                ${typeModeHTML}
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div id="${p}type-hint" class="text-xs text-amber-400/90 font-mono bg-amber-950/20 border border-amber-700/30 rounded-lg px-3 py-2"></div>
                    <div id="${p}faixa-hint" class="text-xs text-cyan-300/90 font-mono bg-cyan-950/20 border border-cyan-700/30 rounded-lg px-3 py-2"></div>
                </div>
                ${setsHTML}
                ${extraHTML}
                <div id="${p}warmup-quick-box" class="hidden bg-berzerker-dark/80 border border-amber-500/30 rounded-xl p-3 text-xs space-y-1">
                    <div class="font-bold text-amber-400 uppercase tracking-wider flex items-center justify-between">
                        <span>🔥 Aquecimento & Anilhas</span>
                        <button type="button" data-action="hideElementById" data-args='["${p}warmup-quick-box"]' aria-label="Fechar aquecimento rápido" class="text-gray-400 hover:text-white">✕</button>
                    </div>
                    <div id="${p}warmup-quick-content" class="font-mono text-gray-300"></div>
                </div>
                <div class="flex flex-wrap gap-2">
                    <button type="button" data-action="calculateWarmupFromForm" class="px-3 py-2 bg-amber-900/30 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase rounded-lg hover:bg-amber-900/50">🔥 Aquecimento</button>
                    <button type="button" data-action="calculatePlatesQuick" class="px-3 py-2 bg-berzerker-border text-gray-200 text-xs font-bold uppercase rounded-lg hover:bg-gray-700">⚙️ Anilhas</button>
                </div>
                <p class="text-xs text-gray-400">🏆 O PR é detectado sozinho pelo 1RM estimado (ou tempo, em isometria) — sem checkbox. 💡 Quando todas as séries baterem o topo da faixa, o app sugere subir a carga.</p>
            </div>
        </details>`;
    }

    return `${typeModeHTML}${simpleHTML}${setsHTML}${extraHTML}`;
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
        <button type="button" data-ex="${escapeHtml(exerciseName)}" data-action="repeatLastPerformance" data-attr-args="data-ex" class="px-2 py-0.5 bg-berzerker-border hover:bg-berzerker-600 text-white text-[10px] font-bold rounded uppercase">↻ Repetir</button>
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
    const exercise = document.getElementById('log-exercise').value.trim();
    const f = readFields('');

    if (!exercise) { alertModal('Digite o nome do exercício!'); return; }
    const temReps = f.mode === 'sets' ? f.sets.length > 0 : f.reps.length > 0;
    if (!temReps) { alertModal('Digite ao menos uma repetição válida (ex: 12, 10, 8) — ou segundos em isometria.'); return; }

    // O grupo vem do catálogo quando o exercício é conhecido: o select pode
    // estar desatualizado (autofill, nome colado) e é ele que alimenta a meta
    // semanal, a recuperação e a fraqueza do chefão.
    const catRegistro = catalogInfo(exercise);
    const muscle = normalizeMuscle(catRegistro ? catRegistro.grupo : document.getElementById('log-muscle').value);
    // Sessão vazia → usa a que o histórico indica para este grupo.
    if (!String(f.sessao || '').trim()) f.sessao = suggestSessaoFor(muscle, exercise);

    const newLog = {
        id: newLogId(), date, kind: 'peso', muscle, exercise,
        xpTheme: activeGameThemeId, ...f
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
                <button data-action="closeElementById" data-args='["edit-log-overlay"]'  class="px-4 py-2 bg-berzerker-border hover:bg-gray-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors">Cancelar</button>
                <button data-action="saveEditedLog" data-args="[${id}]" class="px-4 py-2 bg-berzerker-600 hover:bg-berzerker-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors">💾 Salvar alterações</button>
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
                <h3 class="font-bold text-white text-base mt-1">${l.biset ? '🔗 ' : ''}${escapeHtml(l.exercise)}${l.biset ? ' <span class="text-[10px] font-bold text-cyan-400 border border-cyan-500/40 rounded px-1.5 py-0.5 align-middle">BI-SET</span>' : ''}<button data-action="editLog" data-args="[${l.id}]" title="Editar" class="ml-2 px-2 py-0.5 text-xs text-gray-400 hover:text-cyan-400 align-middle">✏️ Editar</button></h3>
                ${l.notes ? `<p class="text-[11px] text-gray-400 mt-1 italic">📝 ${escapeHtml(l.notes)}</p>` : ''}
                <div class="text-xs text-gray-400 mt-1 font-mono">${detalhe}</div>
            </div>
            <button data-action="deleteLog" data-args="[${l.id}]" class="self-end sm:self-center p-2 text-gray-500 hover:text-red-400 transition-colors" title="Excluir">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
        </div>`;
    }).join('');
}

// ============================ RENDER: MAPA DE FADIGA ============================
// Fase 3: fadiga REAL = recuperação (%) + volume da semana vs a faixa do grupo
function renderRecoveryMap() {
    const gridEl = document.getElementById('recovery-status-grid');
    if (!gridEl) return;
    const nowMs = new Date().getTime();
    const weekly = weeklySetsByMuscle(logs, getTodayLocalISO());

    gridEl.innerHTML = MUSCULOS_MAPA.map(m => {
        const muscleLogs = logs.filter(l => l && l.kind !== 'corrida' && normalizeMuscle(l.muscle) === m);
        const sin = sinergiaState(m, logs, nowMs);
        const st = fatigueState(m, muscleLogs, weekly[m] || 0, nowMs, sin);
        const pctText = st.pct === null ? '—' : `${st.pct}%`;
        return `
        <div data-action="prefillMuscleFromMap" data-args='["${m}"]' title="Registrar exercício de ${m}" class="cursor-pointer bg-berzerker-dark border ${st.border} rounded-xl p-3.5 space-y-2.5 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
            <div class="flex items-center justify-between gap-2">
                <span class="font-oswald text-lg font-bold text-white uppercase tracking-wide leading-none">${m}</span>
                <span class="text-lg leading-none">${st.icon}</span>
            </div>
            <div class="flex items-center justify-between gap-2 flex-wrap">
                <span class="px-2 py-0.5 text-xs font-bold uppercase rounded border ${st.badge}">${st.label}</span>
                <span class="text-xs text-gray-400 font-mono leading-snug break-words">${st.info}</span>
            </div>
            <div>
                <div class="flex justify-between text-xs font-bold uppercase text-gray-400 mb-1">
                    <span>Prontidão estimada</span><span class="text-gray-400">${pctText}</span>
                </div>
                <div class="w-full h-2 bg-berzerker-border rounded-full overflow-hidden">
                    <div class="h-full ${st.bar} rounded-full transition-all duration-500" style="width: ${st.pct === null ? 100 : st.pct}%"></div>
                </div>
            </div>
            <div class="text-xs font-mono leading-snug ${st.volumeStatus === 'abaixo' ? 'text-amber-400/90' : st.volumeStatus === 'acima' ? 'text-orange-400/90' : 'text-emerald-400/90'}">${st.volText}</div>
            ${st.sinergia ? `<div title="${escapeHtml(st.sinergia.exercicios.join(' · '))}" class="text-xs font-mono leading-snug text-cyan-400/80">${escapeHtml(st.sinergiaText)}</div>` : ''}
            <div class="text-xs text-gray-600 truncate leading-snug border-t border-berzerker-border pt-1.5">Último: ${escapeHtml(st.last)} · janela ${st.hoursNeed}h</div>
        </div>`;
    }).join('');
    // Painel da LOMBAR — alerta só quando há o que alertar
    const lombarEl = document.getElementById('lombar-alert-panel');
    if (lombarEl) {
        const lombar = regiaoLombarState(logs, nowMs);
        if (!lombar.carregada && lombar.pct >= 100) {
            // Região livre não é emergência: uma linha verde compacta basta, e o
            // mapa de recuperação abre com informação útil em vez de um aviso
            // permanente de "⚠️ Lombar" que ninguém consegue desligar.
            lombarEl.innerHTML = `
            <div class="bg-emerald-950/20 border ${lombar.border} rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2">
                <span class="font-oswald text-sm font-bold text-emerald-400 uppercase tracking-wide leading-none whitespace-nowrap">✅ Lombar sem alerta estimado</span>
                ${lombar.last ? `<span class="text-xs font-mono text-gray-400 break-words">Última carga: ${escapeHtml(lombar.last)}</span>` : '<span class="text-xs font-mono text-gray-400">Sem carga registrada na lombar.</span>'}
            </div>`;
        } else lombarEl.innerHTML = `
        <div class="bg-berzerker-dark border ${lombar.border} rounded-xl p-4 space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                    <span class="font-oswald text-lg font-bold text-white uppercase tracking-wide leading-none">Lombar ${lombar.icon}</span>
                </div>
                <span class="px-2 py-0.5 text-xs font-bold uppercase rounded border ${lombar.badge} whitespace-nowrap">${lombar.label}</span>
            </div>
            <div>
                <div class="flex justify-between text-xs font-bold uppercase text-gray-400 mb-1">
                    <span>Prontidão estimada da região</span><span class="text-gray-400">${lombar.pct}%</span>
                </div>
                <div class="w-full h-2 bg-berzerker-border rounded-full overflow-hidden">
                    <div class="h-full ${lombar.bar} rounded-full transition-all duration-500" style="width: ${lombar.pct}%"></div>
                </div>
            </div>
            ${lombar.last ? `<div class="text-xs text-gray-400">Última sessão que carregou: ${escapeHtml(lombar.last)} · ≈ ${lombar.horasRestantes}h restantes (estimativa)</div>` : ''}
            <p class="text-xs text-gray-400">Estimativa baseada no tempo desde a última sessão e no volume; não mede fadiga nem substitui orientação profissional.</p>
            <div class="text-xs text-gray-300 leading-relaxed">💡 ${escapeHtml(lombar.dica)}</div>
        </div>`;
    }
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
        el.innerHTML = `<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><p class="text-xs text-gray-400">Monte um treino no <b>Montador</b> para receber a sugestão do dia.</p><button type="button" data-action="switchTab" data-args='["montador"]' class="px-3 py-2 bg-berzerker-600/20 border border-berzerker-500/40 text-berzerker-500 text-xs font-bold uppercase rounded-lg hover:bg-berzerker-600/40">🎯 Abrir Montador</button></div>`;
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
                <div class="text-xs text-gray-400 mt-0.5 leading-relaxed">Por quê: ${escapeHtml(top.motivos.slice(0, 3).join(' · '))}</div>
                ${top.diasSemTreinar >= 1 ? `<div class="text-xs text-amber-400/90 mt-0.5">⏳ Sem treino registrado há ${top.diasSemTreinar} ${top.diasSemTreinar === 1 ? 'dia' : 'dias'}.</div>` : ''}
                ${alternates.length ? `<div class="text-xs text-gray-600 mt-1.5">Outras opções: ${alternates.map(a => `<button type="button" data-action="startSession" data-args="[${a.w.id}]" class="underline hover:text-white transition-colors">${escapeHtml(a.w.name)}</button>`).join(' · ')}</div>` : ''}
            </div>
            <button data-action="startSession" data-args="[${top.w.id}]" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-lg shadow-emerald-600/20 whitespace-nowrap">▶ Treinar esta sugestão</button>
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
        xpTheme: activeGameThemeId, distanceKm, durationMin, notes, technique: 'Convencional', isPR: false, nextGoal: '', type: 'corrida', reps: []
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
    switchTab('diario');
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    acquireWakeLock();
    alertModal(`⚔️ "${w.name}" iniciado! Bora treinar!`);
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

function stopSessionTimer() {
    if (timer.interval) clearInterval(timer.interval);
    timer = { endsAt: null, remainingMs: 0, running: false, interval: null };
    updateSessionTimerDisplay();
    const btn = document.getElementById('session-timer-btn');
    if (btn) {
        btn.textContent = 'Iniciar';
        btn.className = 'px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase rounded-lg transition-colors';
    }
}

// Ao voltar para o primeiro plano, o relógio se re-sincroniza pelo horário de término
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        tickSessionTimer();
        if (activeSession) acquireWakeLock();
    }
});

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

function updateExerciseSuggestions() {
    const datalist = document.getElementById('wb-exercise-suggestions');
    const muscle = document.getElementById('wb-muscle')?.value;
    if (!datalist || !muscle) return;
    const historyNames = muscle === 'Geral'
        ? logs.map(l => l.exercise)
        : logs.filter(l => normalizeMuscle(l.muscle) === normalizeMuscle(muscle)).map(l => l.exercise);
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
        if (muscleSel && muscleSel.value !== cat.grupo) { muscleSel.value = cat.grupo; flashAutofill(muscleSel); }
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

// Painel "o que falta na semana" (estímulo total pela faixa de CADA grupo)
function renderWeekGaps() {
    const el = document.getElementById('builder-week-gaps');
    if (!el) return;
    const gaps = weeklyGaps(logs, getTodayLocalISO());
    const faixas = `${FAIXA_SERIES_SEMANAIS.min}–${FAIXA_SERIES_SEMANAIS.max} séries por grupo`
        + Object.entries(FAIXA_SERIES_POR_GRUPO).map(([m, f]) => ` · ${m} ${f.min}–${f.max}`).join('');
    if (gaps.length === 0) {
        el.innerHTML = `<div class="text-[11px] text-emerald-400/90 bg-emerald-950/20 border border-emerald-700/40 rounded-lg p-2.5">✅ Todos os grupos musculares estão dentro (ou acima) da própria faixa da semana (${faixas}). Bom trabalho!</div>`;
        return;
    }
    const chips = gaps.map(g => {
        // O apoio indireto aparece, mas não entra na conta: a meta é de estímulo
        // direto (senão o antebraço "fecha a semana" só de segurar barra).
        const indiretos = g.indiretas > 0 ? ` · 🤝 +${String(g.indiretas.toFixed(1)).replace('.', ',')} indiretos` : '';
        const txt = g.status === 'abaixo'
            ? `${g.muscle}: ${g.series}/${g.min} min · faltam ${g.faltam}${indiretos}`
            : `${g.muscle}: ${g.series}/${g.max} máx · +${g.excesso} acima${indiretos}`;
        const cls = g.status === 'abaixo'
            ? 'bg-amber-950/40 border-amber-700/40 text-amber-300'
            : 'bg-orange-950/40 border-orange-700/40 text-orange-300';
        return `<span class="text-[10px] font-mono px-2 py-1 rounded border ${cls}">${escapeHtml(txt)}</span>`;
    }).join('');
    el.innerHTML = `
        <div class="bg-berzerker-dark border border-berzerker-border rounded-xl p-3 space-y-2">
            <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">🎯 Estímulo da semana — o que falta (${faixas})</div>
            <div class="flex flex-wrap gap-1.5">${chips}</div>
            <div class="text-[10px] text-gray-500">🤝 = séries equivalentes de apoio indireto (informativo, não abate a meta). O assistente sugere treinos que cobrem os grupos mais abaixo — mas quem manda é você.</div>
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
                <button data-action="moveDraftExercise" data-args="[${i},-1]" title="Subir" aria-label="Subir exercício na ordem" class="min-h-[44px] min-w-[44px] p-2 flex items-center justify-center text-gray-500 hover:text-white transition-colors text-sm">▲</button>
                <button data-action="moveDraftExercise" data-args="[${i},1]" title="Descer" aria-label="Descer exercício na ordem" class="min-h-[44px] min-w-[44px] p-2 flex items-center justify-center text-gray-500 hover:text-white transition-colors text-sm">▼</button>
                <button data-action="removeDraftExercise" data-args="[${i}]" title="Remover" aria-label="Remover exercício do rascunho" class="p-1.5 text-gray-500 hover:text-red-400 transition-colors text-xs">✕</button>
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
                Nenhum treino salvo ainda — monte o primeiro no Montador! 💪
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
                ${muscleTags.map(mt => `<span class="text-[10px] font-bold px-1.5 py-0.5 leading-tight bg-berzerker-border text-berzerker-500 rounded uppercase">${escapeHtml(mt)}</span>`).join('')}
            </div>
            <p class="text-[11px] text-gray-500 font-mono leading-relaxed line-clamp-2">${escapeHtml(w.exercises.map((e, i) => (i ? (e.biset ? ' + ' : ' · ') : '') + e.exercise).join(''))}</p>
            <div class="flex gap-2 pt-1 mt-auto">
                <button data-action="startSession" data-args="[${w.id}]" class="flex-1 px-3 py-2 bg-berzerker-600 hover:bg-berzerker-500 text-white text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors">▶ Iniciar</button>
                <button data-action="editWorkout" data-args="[${w.id}]" title="Editar" class="px-3 py-2 bg-berzerker-border hover:bg-gray-700 text-white text-[11px] rounded-lg transition-colors">✏️</button>
                <button data-action="deleteWorkout" data-args="[${w.id}]" title="Excluir" aria-label="Excluir treino salvo" class="px-3 py-2 bg-berzerker-border hover:bg-red-900/60 text-red-400 text-[11px] rounded-lg transition-colors">🗑</button>
            </div>
        </div>`;
    }).join('');
}

function updateHeaderChrome() {
    const icon = document.getElementById('header-theme-icon');
    const themeButton = document.getElementById('header-theme-button');
    const xp = document.getElementById('header-xp-display');
    if (icon) icon.innerHTML = themeIconImg(THEME?.id, 'h-7 w-7 rounded-lg');
    if (themeButton) {
        themeButton.title = `Tema atual: ${THEME?.name || 'Gamificação'}. Abrir galeria`;
        themeButton.setAttribute('aria-label', `Tema atual: ${THEME?.name || 'Gamificação'}. Abrir galeria de temas`);
    }
    const globalXP = getGlobalXPTotal();
    if (xp) xp.textContent = `${fmtN(globalXP)} XP`;
    const profileXP = document.getElementById('global-profile-xp');
    if (profileXP) profileXP.textContent = `${fmtN(globalXP)} XP`;
}

function updateSummaryMetrics() {
    const filterDate = document.getElementById('filter-date').value;
    const rank = getAnimalRankForSession(filterDate);
    document.getElementById('stat-tonnage').textContent = `${(rank.sessionTonnage / 1000).toFixed(2)} TON`;
    document.getElementById('stat-relative').textContent = `${rank.relativeRatio.toFixed(1)}× BW`;
    document.getElementById('stat-rank').innerHTML = `${rankEmblemImg(activeGameThemeId || THEME?.id, rank.level, 'inline-block h-5 w-5 rounded-full align-[-4px] mr-1')}${escapeHtml(rank.name)} (Niv ${rank.level} · ${fmtN(rank.xp)} XP)`;
    const todayDmg = Math.round(rank.sessionTonnage);
    document.getElementById('stat-boss-dmg').textContent = `${todayDmg.toLocaleString()} DMG`;
    updateHeaderChrome();
}

// ============================ BOSS BATTLE ============================
// Retratos padrão dos chefões (arte original embutida no app).
// O upload do usuário (bossPortraits) tem prioridade sobre estes.
// Os 120 chefões têm retrato em pixel art retrô (grade 160, paleta de 64 cores) em WebP lossless.
// Reservas/variações ficam em images/bosses/reserva/ e podem ser ligadas trocando o caminho aqui.
const DEFAULT_BOSS_PORTRAITS = {
    // classico
    'classico:boss1': 'images/bosses/golem-anilhas.webp',
    'classico:boss2': 'images/bosses/hidra-titanio.webp',
    'classico:boss3': 'images/bosses/mecagorila.webp',
    'classico:boss4': 'images/bosses/behemoth.webp',
    'classico:boss5': 'images/bosses/cavaleiro-de-ferro.webp',
    'classico:boss6': 'images/bosses/ogro-da-bigorna.webp',
    'classico:boss7': 'images/bosses/quimera-blindada.webp',
    'classico:boss8': 'images/bosses/dragao-de-aco.webp',
    'classico:boss9': 'images/bosses/minotauro-das-forjas.webp',
    'classico:boss10': 'images/bosses/leviatan-de-ferro.webp',
    'classico:boss11': 'images/bosses/tita-de-escorcia.webp',
    'classico:boss12': 'images/bosses/colosso-das-forjas.webp',
    // zodiaco
    'zodiaco:b0': 'images/bosses/mu-de-aries.webp',
    'zodiaco:b1': 'images/bosses/aldebaran-de-touro.webp',
    'zodiaco:b2': 'images/bosses/saga-de-gemeos.webp',
    'zodiaco:b3': 'images/bosses/mascara-da-morte-de-cancer.webp',
    'zodiaco:b4': 'images/bosses/aiolia-de-leao.webp',
    'zodiaco:b5': 'images/bosses/shaka-de-virgem.webp',
    'zodiaco:b6': 'images/bosses/dohko-de-libra.webp',
    'zodiaco:b7': 'images/bosses/milo-de-escorpiao.webp',
    'zodiaco:b8': 'images/bosses/aiolos-de-sagitario.webp',
    'zodiaco:b9': 'images/bosses/shura-de-capricornio.webp',
    'zodiaco:b10': 'images/bosses/camus-de-aquario.webp',
    'zodiaco:b11': 'images/bosses/grande-mestre.webp',
    // hercules
    'hercules:b0': 'images/bosses/leao-de-nemeia.webp',
    'hercules:b1': 'images/bosses/hidra-de-lerna.webp',
    'hercules:b2': 'images/bosses/corca-de-cerineia.webp',
    'hercules:b3': 'images/bosses/javali-de-erimanto.webp',
    'hercules:b4': 'images/bosses/estabulos-de-augias.webp',
    'hercules:b5': 'images/bosses/passaros-do-estinfalo.webp',
    'hercules:b6': 'images/bosses/touro-de-crete.webp',
    'hercules:b7': 'images/bosses/eguas-de-diomedes.webp',
    'hercules:b8': 'images/bosses/cinturao-de-hipolita.webp',
    'hercules:b9': 'images/bosses/rebanho-de-geriao.webp',
    'hercules:b10': 'images/bosses/macas-das-hesperides.webp',
    'hercules:b11': 'images/bosses/cerbero.webp',
    // acao
    'acao:b0': 'images/bosses/o-predador.webp',
    'acao:b1': 'images/bosses/o-exterminador.webp',
    'acao:b2': 'images/bosses/tubarao.webp',
    'acao:b3': 'images/bosses/hans-gruber.webp',
    'acao:b4': 'images/bosses/ivan-drago.webp',
    'acao:b5': 'images/bosses/chucky.webp',
    'acao:b6': 'images/bosses/o-coringa.webp',
    'acao:b7': 'images/bosses/freddy-krueger.webp',
    'acao:b8': 'images/bosses/agent-smith.webp',
    'acao:b9': 'images/bosses/pennywise.webp',
    'acao:b10': 'images/bosses/thanos.webp',
    'acao:b11': 'images/bosses/darth-vader.webp',
    // folclore
    'folclore:b0': 'images/bosses/saci.webp',
    'folclore:b1': 'images/bosses/curupira.webp',
    'folclore:b2': 'images/bosses/caipora.webp',
    'folclore:b3': 'images/bosses/lobisomem.webp',
    'folclore:b4': 'images/bosses/cuca.webp',
    'folclore:b5': 'images/bosses/mula-sem-cabeca.webp',
    'folclore:b6': 'images/bosses/iara.webp',
    'folclore:b7': 'images/bosses/boto.webp',
    'folclore:b8': 'images/bosses/boitata.webp',
    'folclore:b9': 'images/bosses/naia.webp',
    'folclore:b10': 'images/bosses/mapinguari.webp',
    'folclore:b11': 'images/bosses/anhanguera.webp',
    // nordica
    'nordica:b0': 'images/bosses/draugr.webp',
    'nordica:b1': 'images/bosses/troll-jovem-de-gelo.webp',
    'nordica:b2': 'images/bosses/nokk-do-fiorde.webp',
    'nordica:b3': 'images/bosses/huldra-da-floresta.webp',
    'nordica:b4': 'images/bosses/fenrir.webp',
    'nordica:b5': 'images/bosses/jormungandr.webp',
    'nordica:b6': 'images/bosses/surtr.webp',
    'nordica:b7': 'images/bosses/fafnir.webp',
    'nordica:b8': 'images/bosses/nidhogg.webp',
    'nordica:b9': 'images/bosses/skoll.webp',
    'nordica:b10': 'images/bosses/ymir.webp',
    'nordica:b11': 'images/bosses/ragnarok.webp',
    // roma
    'roma:b0': 'images/bosses/provocador-da-arena.webp',
    'roma:b1': 'images/bosses/mirmilao-feroz.webp',
    'roma:b2': 'images/bosses/retiario-mestre.webp',
    'roma:b3': 'images/bosses/dupla-de-dimachaeri.webp',
    'roma:b4': 'images/bosses/hoplomaco.webp',
    'roma:b5': 'images/bosses/bestiario-e-pantera.webp',
    'roma:b6': 'images/bosses/venator-e-urso.webp',
    'roma:b7': 'images/bosses/leao-da-numidia.webp',
    'roma:b8': 'images/bosses/touro-da-arena.webp',
    'roma:b9': 'images/bosses/capitao-dos-pretorianos.webp',
    'roma:b10': 'images/bosses/comodo-o-imperador.webp',
    'roma:b11': 'images/bosses/maximo-o-gladiador.webp',
    // rpg
    'rpg:b0': 'images/bosses/goblin-chefe.webp',
    'rpg:b1': 'images/bosses/ogro-da-ponte.webp',
    'rpg:b2': 'images/bosses/golem-de-pedra.webp',
    'rpg:b3': 'images/bosses/necromante.webp',
    'rpg:b4': 'images/bosses/hidra-do-pantano.webp',
    'rpg:b5': 'images/bosses/grifo-guardiao.webp',
    'rpg:b6': 'images/bosses/minotauro-da-masmorra.webp',
    'rpg:b7': 'images/bosses/mago-negro.webp',
    'rpg:b8': 'images/bosses/dragao-anciao.webp',
    'rpg:b9': 'images/bosses/tita-de-ferro.webp',
    'rpg:b10': 'images/bosses/rei-demonio.webp',
    'rpg:b11': 'images/bosses/mestre-do-jogo.webp',
    // galactica
    'galactica:b0': 'images/bosses/enxame-de-drones.webp',
    'galactica:b1': 'images/bosses/pirata-espacial.webp',
    'galactica:b2': 'images/bosses/androide-rebelde.webp',
    'galactica:b3': 'images/bosses/mutante-das-luas.webp',
    'galactica:b4': 'images/bosses/rainha-dos-insetos.webp',
    'galactica:b5': 'images/bosses/colosso-estelar.webp',
    'galactica:b6': 'images/bosses/leviatan-do-espaco.webp',
    'galactica:b7': 'images/bosses/nucleo-de-ia-rebelde.webp',
    'galactica:b8': 'images/bosses/dominio-sombrio.webp',
    'galactica:b9': 'images/bosses/buraco-negro-vivo.webp',
    'galactica:b10': 'images/bosses/devorador-de-planetas.webp',
    'galactica:b11': 'images/bosses/imperador-galactico.webp',
    // aneis
    'aneis:b0': 'images/bosses/goblins-de-moria.webp',
    'aneis:b1': 'images/bosses/espectros-do-anel.webp',
    'aneis:b2': 'images/bosses/balrog-de-morgoth.webp',
    'aneis:b3': 'images/bosses/lurtz-o-uruk-hai.webp',
    'aneis:b4': 'images/bosses/wargs-das-terras-bravias.webp',
    'aneis:b5': 'images/bosses/uruk-hai-do-abismo-de-helm.webp',
    'aneis:b6': 'images/bosses/saruman-o-branco.webp',
    'aneis:b7': 'images/bosses/espectros-de-dunharrow.webp',
    'aneis:b8': 'images/bosses/laracna.webp',
    'aneis:b9': 'images/bosses/rei-bruxo-de-angmar.webp',
    'aneis:b10': 'images/bosses/gollum-o-portador-caido.webp',
    'aneis:b11': 'images/bosses/sauron-o-senhor-do-anel.webp'
};

function bossPortraitSrc(bossId) {
    if (bossPortraits[bossId]) return resolvePortraitSrc(bossId); // upload do usuário (dataURL legado ou Blob no IndexedDB)
    return DEFAULT_BOSS_PORTRAITS[(THEME ? THEME.id : 'classico') + ':' + bossId] || null;
}

// Marcador 'idb:portrait:<tema>:<chefe>' → objectURL do Blob carregado nesta sessão.
// Enquanto o Blob não carregar, devolve null (arte padrão aparece e a UI re-renderiza).
function resolvePortraitSrc(bossId) {
    const v = bossPortraits[bossId];
    if (!v) return null;
    if (typeof v === 'string' && v.startsWith('idb:')) return portraitObjectURLs[v] || null;
    return v;
}

// Converte dataURLs legados de bossPortraits para Blobs no IndexedDB e hidrata
// os objectURLs dos marcadores. Idempotente: dataURL já migrado vira marcador.
async function hydratePortraitBlobs() {
    if (!window.storage || typeof window.storage.saveBlob !== 'function') return;
    const ids = Object.keys(bossPortraits || {});
    let mudou = false;
    for (const bossId of ids) {
        const v = bossPortraits[bossId];
        if (!v) continue;
        if (typeof v === 'string' && v.startsWith('idb:')) {
            if (!portraitObjectURLs[v]) {
                try {
                    const blob = await window.storage.getBlob(v.slice(4));
                    if (blob) portraitObjectURLs[v] = URL.createObjectURL(blob);
                } catch (e) { /* sem IndexedDB: segue */ }
            }
            continue;
        }
        // legado: dataURL → Blob (512 px quadrado, WebP)
        try {
            const blob = await window.storage.compressImage(v, 512, 0.82, 'image/webp', { square: true });
            const key = 'portrait:' + activeGameThemeId + ':' + bossId;
            // IndexedDB indisponível: mantém o dataURL (sem perda) e avisa uma vez.
            const ok = await saveBlobChecked(key, blob);
            if (!ok) continue;
            const marker = 'idb:' + key;
            portraitObjectURLs[marker] = URL.createObjectURL(blob);
            bossPortraits[bossId] = marker;
            mudou = true;
        } catch (e) { /* imagem inválida: mantém o dataURL */ }
    }
    if (mudou) { saveGameState(); renderBossBattleUI(); }
    else if (ids.some(id => bossPortraits[id] && String(bossPortraits[id]).startsWith('idb:') && portraitObjectURLs[bossPortraits[id]])) {
        renderBossBattleUI();
    }
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
    const prog = computeBossProgress(logsForTheme(activeGameThemeId), userBodyweight, BOSSES);
    const filterDate = document.getElementById('filter-date').value || getTodayLocalISO();
    const rank = getAnimalRankForSession(filterDate);
    const todayDmg = Math.round(rank.dayLogs.filter(l => l.xpTheme === activeGameThemeId).reduce((a, l) => a + logDamageKg(l, userBodyweight, prog.current), 0));

    document.getElementById('boss-today-dmg-display').textContent = `${todayDmg.toLocaleString()} DMG`;
    document.getElementById('stat-boss-dmg').textContent = `${todayDmg.toLocaleString()} DMG`;

    const currentBoss = prog.current;
    const portrait = bossPortraitSrc(currentBoss.id);
    const activeCard = document.getElementById('active-boss-card');
    if (activeCard) {
        activeCard.innerHTML = `
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <div class="flex items-start gap-3 sm:gap-4 min-w-0">
                    <button type="button" data-action="openBossLightbox" data-args='["${currentBoss.id}"]' title="Ampliar retrato de ${escapeHtml(currentBoss.name)}" aria-label="Ampliar retrato de ${escapeHtml(currentBoss.name)}" class="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 p-1 bg-berzerker-border/50 rounded-2xl border border-berzerker-border overflow-hidden flex items-center justify-center shrink-0 cursor-pointer transition-colors hover:border-berzerker-500 focus:outline-none focus:ring-2 focus:ring-berzerker-500">
                        ${portrait ? `<img src="${portrait}" class="w-full h-full object-cover rounded-xl shrink-0" style="image-rendering:pixelated" alt="retrato de ${escapeHtml(currentBoss.name)}">` : `<span class="text-5xl sm:text-6xl leading-none">${currentBoss.icon}</span>`}
                    </button>
                    <div class="min-w-0 flex-1">
                        <span class="flex flex-wrap items-center gap-x-1.5 whitespace-nowrap text-xs font-bold text-red-400 uppercase tracking-wider">${THEME.bossLabel} <span aria-hidden="true">—</span> ${THEME.stageWord} ${prog.currentIdx + 1}/${BOSSES.length}</span>
                        <h3 class="font-oswald text-2xl sm:text-3xl font-bold text-white uppercase leading-tight break-words">${escapeHtml(currentBoss.name)}</h3>
                        <p class="text-[11px] leading-snug text-gray-400 mt-0.5 break-words">${escapeHtml(currentBoss.desc)}</p>
                        <p class="text-[11px] leading-snug text-purple-200/80 mt-1 break-words"><strong>Brecha tática:</strong> ${escapeHtml(currentBoss.weakReason || 'Ataque temático.')}</p>
                        <div class="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1.5">
                            <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-700 uppercase leading-tight break-words">💢 Fraqueza: ${escapeHtml(currentBoss.weak || '—')} ×1,25</span>
                            <label class="text-[10px] font-bold px-2 py-0.5 rounded bg-berzerker-border text-gray-300 cursor-pointer hover:bg-gray-700">🖼️ Retrato
                                <input type="file" accept="image/*" class="hidden" data-change-action="uploadBossPortrait" data-args='["$event","${currentBoss.id}"]'>
                            </label>
                            <button data-action="openBossDefeatCard" class="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-900/40 text-amber-300 border border-amber-700/50 hover:bg-amber-900/70">📸 Card do Chefão</button>
                        </div>
                    </div>
                </div>
                <div class="min-w-0 shrink-0 text-right w-full sm:w-auto">
                    <span class="text-xs text-gray-400 font-bold uppercase block">Vida do Boss (HP)</span>
                    <div class="font-oswald text-2xl sm:text-3xl font-bold text-red-500 leading-tight">${fmtN(prog.currentHp)} / ${fmtN(currentBoss.maxHp)} HP</div>
                    <div class="text-[11px] text-gray-500 font-mono mt-0.5 leading-snug">${prog.critCount} golpes críticos (PR ×2) · ${prog.weakHits} acertos na fraqueza</div>
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
                <div role="button" tabindex="0" data-boss-id="${escapeHtml(b.id)}" data-action="openBossLightbox" data-args='["${b.id}"]' title="Ampliar retrato de ${escapeHtml(b.name)}" class="p-4 rounded-xl border cursor-pointer transition-colors hover:border-berzerker-500 focus:outline-none focus:ring-2 focus:ring-berzerker-500 ${defeated ? 'bg-emerald-950/20 border-emerald-500/50' : (idx === prog.currentIdx ? 'bg-berzerker-dark border-red-500' : 'bg-berzerker-dark/40 border-berzerker-border opacity-50')} space-y-2">
                    <div class="flex items-center justify-between gap-2">
                        ${thumb ? `<img src="${thumb}" alt="${escapeHtml(b.name)}" width="40" height="40" style="width:40px;height:40px;image-rendering:pixelated" loading="lazy" decoding="async" class="w-10 h-10 shrink-0 rounded-lg object-cover border border-berzerker-border">` : `<span class="text-2xl shrink-0 leading-none">${b.icon}</span>`}
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded leading-tight ${defeated ? 'bg-emerald-500 text-black' : 'bg-berzerker-border text-gray-400'} uppercase">
                            ${defeated ? 'DERROTADO 🏆' : (idx === prog.currentIdx ? 'EM BATALHA ⚔️' : 'BLOQUEADO 🔒')}
                        </span>
                    </div>
                    <h4 class="font-oswald font-bold text-white text-base sm:text-lg leading-tight break-words">${escapeHtml(b.name)}</h4>
                    <span class="text-[11px] font-mono text-purple-300 block leading-snug break-words">💢 fraco a ${escapeHtml(b.weak || '—')}</span>
                    <span class="text-[11px] leading-snug text-gray-500 block break-words">${escapeHtml(b.weakReason || 'Ataque temático.')}</span>
                    <span class="text-xs font-mono text-gray-400 block">${fmtN(b.maxHp)} HP · ${defeated ? '✔' : '🎁'} +${Math.round(b.maxHp / 200)} XP</span>
                </div>`;
        }).join('');
    }
    renderReservaStudio();
}

// ============================ LIGHTBOX DOS CHEFÕES ============================
// Os retratos já são 512×512 e já estão no cache offline: clicar em qualquer card
// da grade (ou no retrato do chefão ativo) abre a arte grande com os dados do
// combate. Navegação por setas (botão ou teclado), ESC fecha, clique no fundo fecha.
const BOSS_LIGHTBOX_ID = 'boss-lightbox-overlay';
let bossLightboxIdx = 0;

function bossStatusLabel(idx, prog) {
    if (idx < prog.defeatedCount) return 'DERROTADO 🏆';
    if (idx === prog.currentIdx) return 'EM BATALHA ⚔️';
    return 'BLOQUEADO 🔒';
}

function bossStatusClass(idx, prog) {
    if (idx < prog.defeatedCount) return 'bg-emerald-500 text-black border-emerald-400';
    if (idx === prog.currentIdx) return 'bg-berzerker-600 text-white border-berzerker-500';
    return 'bg-berzerker-border text-gray-300 border-gray-600';
}

// Nome de arquivo do download: tema + id + nome do chefão (data URL de upload vira .jpg)
function bossPortraitDownloadName(boss, src) {
    const ext = /^data:image\/(png|webp|jpeg|jpg)/i.test(String(src)) ? (RegExp.$1 === 'jpeg' ? 'jpg' : RegExp.$1.toLowerCase()) : 'webp';
    const slug = String(boss.name || boss.id).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `${(THEME ? THEME.id : 'berzerker')}-${boss.id}-${slug}.${ext}`;
}

function openBossLightbox(bossId) {
    if (!Array.isArray(BOSSES) || !BOSSES.length) return;
    const found = BOSSES.findIndex(b => b.id === bossId);
    bossLightboxIdx = found >= 0 ? found : 0;
    renderBossLightbox();
}

function closeBossLightbox() {
    const overlay = document.getElementById(BOSS_LIGHTBOX_ID);
    if (!overlay) return false;
    overlay.remove();
    return true;
}

function navBossLightbox(delta) {
    if (!Array.isArray(BOSSES) || !BOSSES.length) return;
    const step = Number(delta) || 0;
    bossLightboxIdx = ((bossLightboxIdx + step) % BOSSES.length + BOSSES.length) % BOSSES.length;
    renderBossLightbox();
}

function renderBossLightbox() {
    if (!Array.isArray(BOSSES) || !BOSSES.length) return;
    const idx = Math.min(Math.max(0, bossLightboxIdx), BOSSES.length - 1);
    bossLightboxIdx = idx;
    const b = BOSSES[idx];
    if (!b) return;
    const prog = computeBossProgress(logsForTheme(activeGameThemeId), userBodyweight, BOSSES);
    const src = bossPortraitSrc(b.id);
    const xpReward = Math.round(b.maxHp / 200);

    document.getElementById(BOSS_LIGHTBOX_ID)?.remove();
    const overlay = document.createElement('div');
    overlay.id = BOSS_LIGHTBOX_ID;
    overlay.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-3 overflow-y-auto';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', `Retrato de ${b.name}`);
    overlay.onclick = ev => { if (ev.target === overlay) closeBossLightbox(); };
    overlay.innerHTML = `
        <div class="my-auto w-full max-w-2xl bg-berzerker-card border border-berzerker-border rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4">
            <div class="flex items-start justify-between gap-3 border-b border-berzerker-border pb-3">
                <div class="min-w-0">
                    <h3 id="boss-lightbox-name" class="font-oswald text-xl sm:text-2xl font-bold text-white uppercase tracking-wider leading-tight">${escapeHtml(b.name)}</h3>
                    <p class="text-[10px] font-bold uppercase tracking-wider text-gray-500 mt-0.5">${escapeHtml(THEME ? THEME.name : '')} · ${escapeHtml(THEME ? THEME.bossLabel : 'CHEFÃO')} ${idx + 1}/${BOSSES.length}</p>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                    <span id="boss-lightbox-status" class="text-[10px] font-bold uppercase px-2 py-1 rounded border ${bossStatusClass(idx, prog)}">${bossStatusLabel(idx, prog)}</span>
                    <button type="button" data-action="closeBossLightbox" aria-label="Fechar (ESC)" title="Fechar (ESC)" class="px-2.5 py-1.5 bg-berzerker-border hover:bg-gray-700 text-white text-[10px] font-bold uppercase rounded-lg transition-colors">✕</button>
                </div>
            </div>
            <div class="flex items-center justify-center gap-2 sm:gap-4">
                <button type="button" data-action="navBossLightbox" data-args="[-1]" aria-label="Chefão anterior" title="Anterior (←)" class="shrink-0 w-10 h-16 sm:w-12 sm:h-24 rounded-xl border border-berzerker-border bg-berzerker-dark text-2xl text-gray-300 hover:text-white hover:border-berzerker-500 transition-colors">‹</button>
                <div class="w-56 h-56 sm:w-72 sm:h-72 rounded-2xl border border-berzerker-border bg-black/60 overflow-hidden flex items-center justify-center">
                    ${src
                        ? `<img id="boss-lightbox-img" src="${escapeHtml(src)}" alt="Retrato de ${escapeHtml(b.name)}" class="w-full h-full object-contain" style="image-rendering:pixelated">`
                        : `<span id="boss-lightbox-icon" class="text-8xl">${b.icon || '👹'}</span>`}
                </div>
                <button type="button" data-action="navBossLightbox" data-args="[1]" aria-label="Próximo chefão" title="Próximo (→)" class="shrink-0 w-10 h-16 sm:w-12 sm:h-24 rounded-xl border border-berzerker-border bg-berzerker-dark text-2xl text-gray-300 hover:text-white hover:border-berzerker-500 transition-colors">›</button>
            </div>
            <div class="grid grid-cols-3 gap-2 text-center">
                <div class="bg-berzerker-dark border border-berzerker-border rounded-xl px-2 py-2.5">
                    <span class="block text-[10px] font-bold uppercase tracking-wider text-gray-500">Vida máxima</span>
                    <span class="block font-oswald text-lg font-bold text-red-400">${fmtN(b.maxHp)} HP</span>
                </div>
                <div class="bg-berzerker-dark border border-berzerker-border rounded-xl px-2 py-2.5">
                    <span class="block text-[10px] font-bold uppercase tracking-wider text-gray-500">💢 Fraqueza ×1,25</span>
                    <span class="block font-oswald text-lg font-bold text-purple-300">${escapeHtml(b.weak || '—')}</span>
                </div>
                <div class="bg-berzerker-dark border border-berzerker-border rounded-xl px-2 py-2.5">
                    <span class="block text-[10px] font-bold uppercase tracking-wider text-gray-500">Recompensa</span>
                    <span class="block font-oswald text-lg font-bold text-amber-300">+${fmtN(xpReward)} XP</span>
                </div>
            </div>
            <p class="text-[11px] leading-relaxed text-purple-200/80"><strong class="uppercase tracking-wider text-gray-400">Brecha tática:</strong> ${escapeHtml(b.weakReason || 'Ataque temático.')}</p>
            ${b.desc ? `<p class="text-[11px] leading-relaxed text-gray-500">${escapeHtml(b.desc)}</p>` : ''}
            <div class="flex flex-wrap items-center gap-2">
                ${src ? `<a id="boss-lightbox-download" href="${escapeHtml(src)}" download="${escapeHtml(bossPortraitDownloadName(b, src))}" class="flex-1 text-center px-3 py-2.5 bg-berzerker-dark border border-berzerker-border hover:border-berzerker-500 text-gray-200 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors">⬇️ Baixar retrato</a>` : ''}
                <button type="button" data-action="navBossLightbox" data-args="[-1]" class="px-3 py-2.5 bg-berzerker-dark border border-berzerker-border hover:border-berzerker-500 text-gray-300 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors">‹ Anterior</button>
                <button type="button" data-action="navBossLightbox" data-args="[1]" class="px-3 py-2.5 bg-berzerker-dark border border-berzerker-border hover:border-berzerker-500 text-gray-300 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors">Próximo ›</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
}

// Setas navegam entre os chefões — só quando o lightbox está aberto.
document.addEventListener('keydown', e => {
    if (!document.getElementById(BOSS_LIGHTBOX_ID)) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); navBossLightbox(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); navBossLightbox(-1); }
});

// ============================ ESC FECHA TUDO ============================
// Um handler só para todas as camadas: fecha a de cima (na ordem de
// empilhamento da UI) e deixa as de baixo intactas.
const OVERLAY_CLOSE_ORDER = [
    BOSS_LIGHTBOX_ID,          // z-[60], por cima de tudo enquanto aberto
    'confirm-modal-overlay',   // confirmação bloqueia qualquer coisa atrás
    'picker-overlay',           // seletor rápido de exercício
    'custom-ex-overlay',        // formulário de exercício personalizado (js/custom_exercises.js)
    'edit-log-overlay',         // edição de registro
    'boss-card-overlay',        // Card do Chefão
    'ranks-overlay',            // modal de patentes
    'theme-gallery-overlay'     // galeria de temas (z-[55])
];
function closeTopOverlay() {
    for (const id of OVERLAY_CLOSE_ORDER) {
        const el = document.getElementById(id);
        if (el) { el.remove(); return id; }
    }
    return null;
}
document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' && e.key !== 'Esc') return;
    if (closeTopOverlay()) e.preventDefault();
});

async function uploadBossPortrait(event, bossId) {
    const file = event.target.files[0];
    if (!file) return;
    // Caminho novo: Blob comprimido (512 px quadrado, WebP) direto no IndexedDB —
    // nada de base64 no localStorage. Se algo falhar (sem IndexedDB/canvas),
    // cai no caminho antigo em dataURL para não perder o upload.
    try {
        if (window.storage && typeof window.storage.compressImage === 'function' && typeof window.storage.saveBlob === 'function') {
            const blob = await window.storage.compressImage(file, 512, 0.82, 'image/webp', { square: true });
            const key = 'portrait:' + activeGameThemeId + ':' + bossId;
            const ok = await saveBlobChecked(key, blob, { silencioso: true });
            if (ok) {
                const marker = 'idb:' + key;
                if (portraitObjectURLs[marker]) URL.revokeObjectURL(portraitObjectURLs[marker]);
                portraitObjectURLs[marker] = URL.createObjectURL(blob);
                bossPortraits[bossId] = marker;
                saveGameState();
                renderBossBattleUI();
                alertModal('🖼️ Retrato do chefão atualizado!');
                return;
            }
        }
    } catch (e) { /* cai para o caminho legado */ }
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
            // Caminho reserva (dataURL no localStorage): a mensagem só afirma "atualizado"
            // quando essa gravação também foi confirmada.
            const salvoNoLegado = saveGameState();
            renderBossBattleUI();
            alertModal(mensagemImagemSalva(salvoNoLegado, '🖼️ Retrato do chefão atualizado!'));
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// ============================ ESTÚDIO DE RESERVAS ============================
// Troca a arte de qualquer chefão pelas reservas de images/bosses/reserva/
// (35 artes prontas, agrupadas por tema no index.json) reaproveitando o
// mecanismo de upload por chefão (bossPortraits no save do tema).
let reservaManifest = null;
let reservaBossId = null;

function loadReservaManifest() {
    if (reservaManifest) return Promise.resolve(reservaManifest);
    return fetch('images/bosses/reserva/index.json')
        .then(r => (r && r.ok ? r.json() : null))
        .then(j => { reservaManifest = (j && j.temas) ? j : null; return reservaManifest; })
        .catch(() => null);
}

function reservaGroups(themeId) {
    const temas = (reservaManifest && reservaManifest.temas) || {};
    const doTema = temas[themeId] || [];
    // tema sem reserva própria (ex.: clássico) ainda pode emprestar as outras
    if (doTema.length) return [{ tema: themeId, itens: doTema }];
    return Object.keys(temas).sort().map(t => ({ tema: t, itens: temas[t] })).filter(g => g.itens.length);
}

function selectReservaBoss(bossId) {
    reservaBossId = bossId;
    renderReservaStudio();
}

function applyReservaPortrait(src) {
    if (!reservaBossId || !src) return;
    bossPortraits[reservaBossId] = src;
    saveGameState();
    renderBossBattleUI();
    renderReservaStudio();
    alertModal('🎨 Retrato trocado! Vale para este chefe neste aparelho.');
}

function resetBossPortraitToDefault() {
    if (!reservaBossId) return;
    const antigo = bossPortraits[reservaBossId];
    if (typeof antigo === 'string' && antigo.startsWith('idb:')) {
        if (window.storage && typeof window.storage.removeBlob === 'function') window.storage.removeBlob(antigo.slice(4));
        if (portraitObjectURLs[antigo]) { URL.revokeObjectURL(portraitObjectURLs[antigo]); delete portraitObjectURLs[antigo]; }
    }
    delete bossPortraits[reservaBossId];
    saveGameState();
    renderBossBattleUI();
    renderReservaStudio();
    alertModal('↩ Retrato padrão restaurado.');
}

function renderReservaStudio() {
    const sel = document.getElementById('reserva-boss-select');
    const grid = document.getElementById('reserva-grid');
    const status = document.getElementById('reserva-status');
    if (!sel || !grid) return;
    if (!Array.isArray(BOSSES) || !BOSSES.length) return;
    // o manifesto chega por fetch: desenha o seletor já e completa no redraw
    if (!reservaManifest && !renderReservaStudio._carregando) {
        renderReservaStudio._carregando = true;
        loadReservaManifest().then(m => { renderReservaStudio._carregando = false; if (m) renderReservaStudio(); });
    }
    if (!reservaBossId || !BOSSES.some(b => b.id === reservaBossId)) {
        const prog = computeBossProgress(logsForTheme(activeGameThemeId), userBodyweight, BOSSES);
        reservaBossId = (prog.current && prog.current.id) || BOSSES[0].id;
    }
    sel.innerHTML = BOSSES.map(b =>
        `<option value="${escapeHtml(b.id)}"${b.id === reservaBossId ? ' selected' : ''}>${escapeHtml(b.name)}${bossPortraits[b.id] ? ' · 🎨' : ''}</option>`).join('');

    const atual = bossPortraits[reservaBossId] || null;
    const padrao = DEFAULT_BOSS_PORTRAITS[(THEME ? THEME.id : 'classico') + ':' + reservaBossId] || null;
    const tileCls = on => `text-left rounded-xl border p-1.5 transition-colors ${on ? 'border-berzerker-500 bg-berzerker-600/15 ring-1 ring-berzerker-500/40' : 'border-berzerker-border bg-berzerker-dark hover:border-gray-500'}`;

    let html = padrao ? `
        <button type="button" data-action="resetBossPortraitToDefault" title="Retrato padrão do tema" class="${tileCls(!atual)}">
            <img src="${padrao}" alt="retrato padrão" loading="lazy" decoding="async" class="w-full aspect-square object-cover rounded-lg border border-berzerker-border" style="image-rendering:pixelated">
            <span class="block text-[10px] font-bold uppercase tracking-wide leading-tight mt-1 ${!atual ? 'text-berzerker-300' : 'text-gray-500'}">Padrão</span>
        </button>` : '';

    const grupos = reservaGroups(THEME ? THEME.id : 'classico');
    if (!grupos.length) {
        html += `<div class="col-span-full text-center text-[11px] text-gray-500 border border-dashed border-berzerker-border rounded-xl py-6">Sem reservas por enquanto — o index.json ainda não carregou.</div>`;
    }
    grupos.forEach(g => {
        if (grupos.length > 1) html += `<div class="col-span-full text-[10px] font-bold uppercase tracking-wider text-gray-500 pt-1">${escapeHtml((THEMES[g.tema] || {}).name || g.tema)}</div>`;
        g.itens.forEach(item => {
            html += `
            <button type="button" data-action="applyReservaPortrait" data-args='["${escapeHtml(item.file)}"]' title="${escapeHtml(item.label)}" class="${tileCls(atual === item.file)}">
                <img src="${escapeHtml(item.file)}" alt="${escapeHtml(item.label)}" loading="lazy" decoding="async" class="w-full aspect-square object-cover rounded-lg border border-berzerker-border" style="image-rendering:pixelated">
                <span class="block truncate text-[10px] font-bold uppercase tracking-wide leading-tight mt-1 ${atual === item.file ? 'text-berzerker-300' : 'text-gray-400'}">${escapeHtml(item.label)}</span>
            </button>`;
        });
    });
    grid.innerHTML = html;
    if (status) status.textContent = atual
        ? `🎨 arte personalizada neste chefe`
        : 'usando o retrato padrão do tema';
}

// ============================ MISSÕES SEMANAIS ============================
function renderMissions() {
    const el = document.getElementById('missions-content');
    if (!el) return;
    const st = missionsState(logsForTheme(activeGameThemeId), THEME, getTodayLocalISO());
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
        <button data-action="claimMissions" ${(!st.allDone || claimed) ? 'disabled' : ''} class="mt-3 w-full py-2.5 ${st.allDone && !claimed ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-berzerker-border opacity-50 cursor-not-allowed'} text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors">
            ${claimed ? '✔ XP resgatado esta semana' : (st.allDone ? `🎁 Resgatar ${st.totalXP} XP` : `Complete as 4 ${THEME.missionWordPlural || (THEME.missionWord + 's')} para resgatar`)}
        </button>`;
}

function claimMissions() {
    const st = missionsState(logsForTheme(activeGameThemeId), THEME, getTodayLocalISO());
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
    if (!seasons) { seasons = { start: today, completed: [] }; saveGameState(); }
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
            <span>Semana ${s.currentWeek}/${SEASON_WEEKS} · termina em ${s.endsInDays} dias${s.currentWeek >= SEASON_WEEKS ? ' · 🌙 deload' : ''}</span>
        </div>
        <div class="w-full h-3 bg-berzerker-border rounded-full overflow-hidden">
            <div class="h-full bg-gradient-to-r from-amber-600 to-yellow-400 rounded-full transition-all" style="width:${s.progressPct}%"></div>
        </div>
        <div class="text-[10px] text-gray-500 font-mono mt-1.5">🌙 Semana ${SEASON_WEEKS} = deload automático: volume rende 50% do XP e cada dia sem treino rende +${XP_REST_PER_DAY} XP de recuperação${s.currentWeek >= SEASON_WEEKS ? ' (você está nele)' : ''}.</div>
        <div class="flex items-center justify-between mt-2">
            <div class="text-xs text-gray-400">XP preservado entre temporadas · <b class="text-amber-400">${fmtN(xpNow)} XP</b></div>
            <button data-action="finishSeasonNow" class="px-3 py-1.5 bg-berzerker-border hover:bg-gray-700 text-white text-[10px] font-bold uppercase rounded-lg">🏁 Encerrar agora</button>
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
async function handleBgImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    // Caminho novo: Blob comprimido (máx. 1080 px, WebP) no IndexedDB; o
    // localStorage guarda só a flag `bgBlob`. Reserva: dataURL legado.
    try {
        if (window.storage && typeof window.storage.compressImage === 'function' && typeof window.storage.saveBlob === 'function') {
            const blob = await window.storage.compressImage(file, 1080, 0.82, 'image/webp');
            const ok = await saveBlobChecked(STORY_BG_BLOB_KEY, blob, { silencioso: true });
            if (ok) {
                const url = URL.createObjectURL(blob);
                const img = new Image();
                img.onload = () => { customBgImageData = img; saveStoryState(); generateStoryCard(); };
                img.src = url;
                return;
            }
        }
    } catch (e) { /* cai para o caminho legado */ }
    const reader = new FileReader();
    reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
            customBgImageData = img;
            // Reserva (dataURL no localStorage): só anuncia sucesso se confirmada.
            const salvoNoLegado = saveStoryState();
            generateStoryCard();
            if (!salvoNoLegado) alertModal(`⚠️ O fundo foi aplicado na tela, mas o navegador ${TEXTO_BLOB_NAO_CONFIRMADO}. Exporte um backup JSON agora.`);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function removeBgImage() {
    customBgImageData = null;
    if (window.storage && typeof window.storage.removeBlob === 'function') window.storage.removeBlob(STORY_BG_BLOB_KEY);
    document.getElementById('bg-image-input').value = '';
    saveStoryState();
    generateStoryCard();
}

/* Quebra um texto em até `maxLinhas` linhas de no máximo `maxLargura` px,
   medindo palavra a palavra com ctx.measureText. O que não couber na última
   linha é cortado com "…". Medidas não-numéricas (canvas sem implementação
   real, como no smoke test de UI) contam como 0: assim nada entra em loop nem
   quebra o texto à toa. */

// ============================ ARTE DOS BADGES ============================
// 16 medalhões de ferro na mesma série dos emblemas de patente (fundo quase
// preto, brilho carmesim). Se o arquivo não existir na instalação/cache, o
// onerror devolve o emoji original — o badge nunca fica sem ícone.
const BADGE_ART = Object.freeze(Object.fromEntries([
    'primeiro-sangue', 'ofensiva-semanal', 'mover-titan', 'cacador-de-prs',
    'maratonista', 'tanque-de-guerra', 'berzerker-master', 'cacador-de-chefoes',
    'primeiro-deload', 'semana-completa', 'colecionador', 'mestre-dos-chefoes',
    'mes-de-ferro', 'corredor', 'sequencia-de-aco', 'nivel-10'
].map(slug => [slug, `images/badges/${slug}.webp`])));

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

async function exportJSONBackup() {
    const backupData = await buildBackupPayload();
    const jsonStr = JSON.stringify(backupData, null, 2);
    const fileName = `berzerker-diario-backup-${getTodayLocalISO()}.json`;
    const saveViaPicker = async () => {
        if (typeof window.showSaveFilePicker !== 'function') return false;
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: fileName,
                types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }]
            });
            const writable = await handle.createWritable();
            await writable.write(jsonStr);
            await writable.close();
            return true;
        } catch (e) { return false; }
    };
    (async () => {
        const ok = await saveViaPicker();
        if (!ok) {
            const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(jsonStr);
            const dlAnchor = document.createElement('a');
            dlAnchor.setAttribute('href', dataStr);
            dlAnchor.setAttribute('download', fileName);
            document.body.appendChild(dlAnchor);
            dlAnchor.click();
            dlAnchor.remove();
        }
        lastBackupAt = getTodayLocalISO();
        safeStorage.set(STORAGE_KEY_BACKUP, lastBackupAt);
        renderBackupReminder();
        alertModal('📥 Backup exportado (dados, temas e progresso dos jogos)!');
    })();
}

// Aplica um backup validado. Tudo-ou-nada na memória: se algo lançar exceção durante
// a aplicação, o estado anterior é restaurado (snapshot). Falhas de gravação são reportadas.
async function applyImportedBackup(parsed) {
    const v = validarBackupJSON(parsed);
    if (!v.ok) {
        alertModal(`❌ Backup inválido — nada foi alterado. ${v.erros.slice(0, 3).join('; ')}`);
        return false;
    }
    const importedThemeId = (parsed.gameTheme && THEMES[parsed.gameTheme]) ? parsed.gameTheme : activeGameThemeId;
    // Imagens que o IndexedDB não confirmou gravar (aparece na mensagem final).
    let imagensNaoSalvas = 0;
    const snapshot = {
        logs, savedWorkouts, settings, userBodyweight, deloadWeeks, tests, weightLog, themeGameSaves,
        activeGameThemeId, lastRankLevel, lastBossesDefeated,
        customExercises: getCustomExercises().slice()
    };
    try {
        logs = v.dados.logs;
        if (v.dados.hasSavedWorkouts) { savedWorkouts = v.dados.savedWorkouts; normalizeSavedWorkouts(); }
        if (parsed.userBodyweight) userBodyweight = Number(parsed.userBodyweight);
        if (isObjetoSimples(parsed.settings)) settings = { ...settings, ...parsed.settings };

        const importedSaves = isObjetoSimples(parsed.themeGameSaves) ? parsed.themeGameSaves : null;
        themeGameSaves = {};
        if (importedSaves) {
            Object.entries(importedSaves).forEach(([id, save]) => {
                if (THEMES[id] && isObjetoSimples(save)) themeGameSaves[id] = save;
            });
        } else {
            // Backups antigos (sem saves por tema): migra o progresso para o tema exportado.
            themeGameSaves[importedThemeId] = {
                ...emptyThemeGameSave(),
                missionsXpTotal: Number(parsed.missionsXpTotal) || 0,
                missionsClaimed: isObjetoSimples(parsed.missionsClaimed) ? parsed.missionsClaimed : {},
                seasons: parsed.seasons || null,
                bossPortraits: isObjetoSimples(parsed.bossPortraits) ? parsed.bossPortraits : {}
            };
        }
        Object.keys(THEMES).forEach(ensureThemeGameSave);

        deloadWeeks = Array.isArray(v.shared.deloadWeeks) ? v.shared.deloadWeeks : [];
        tests = Array.isArray(v.shared.tests) && v.shared.tests.length ? v.shared.tests : defaultTests();
        weightLog = Array.isArray(v.shared.weightLog) ? v.shared.weightLog.map(w => ({ date: w.date, peso: Number(w.peso), obs: w.obs || '' })) : [];
        if (v.custom.presente) setCustomExercisesList(v.custom.lista);

        restoreActiveThemeGameSave(importedThemeId);
        applyTheme(importedThemeId);
        lastRankLevel = null; lastBossesDefeated = null;

        // Imagens do backup (dataURL portáteis) → Blob no IndexedDB + marcador no save.
        // Falha de imagem não cancela a importação dos dados (como antes), mas é CONTADA
        // e aparece na mensagem final: sem confirmação, nada de "importado com sucesso".
        try {
            if (window.storage && typeof window.storage.saveBlob === 'function') {
                const imgs = isObjetoSimples(parsed.portraitImages) ? parsed.portraitImages : {};
                for (const [chave, dataURL] of Object.entries(imgs)) {
                    if (typeof dataURL !== 'string' || !dataURL.startsWith('data:')) continue;
                    const [tema, ...resto] = chave.split(':');
                    const bossId = resto.join(':');
                    if (!THEMES[tema] || !bossId) continue;
                    const blob = await window.storage.dataURLToBlob(dataURL);
                    if (!blob) continue;
                    const key = `portrait:${tema}:${bossId}`;
                    if (await saveBlobChecked(key, blob, { silencioso: true })) {
                        const save = ensureThemeGameSave(tema);
                        save.bossPortraits[bossId] = 'idb:' + key;
                    } else imagensNaoSalvas++;
                }
                if (parsed.storyBgImageData) {
                    const blob = await window.storage.dataURLToBlob(parsed.storyBgImageData);
                    if (blob && !(await saveBlobChecked(STORY_BG_BLOB_KEY, blob, { silencioso: true }))) imagensNaoSalvas++;
                }
            }
        } catch (e) { /* segue sem imagens */ }
    } catch (err) {
        // Restaura o estado anterior: nada fica pela metade na memória.
        logs = snapshot.logs; savedWorkouts = snapshot.savedWorkouts; settings = snapshot.settings;
        userBodyweight = snapshot.userBodyweight; deloadWeeks = snapshot.deloadWeeks; tests = snapshot.tests;
        weightLog = snapshot.weightLog; themeGameSaves = snapshot.themeGameSaves;
        setCustomExercisesList(snapshot.customExercises);
        lastRankLevel = snapshot.lastRankLevel; lastBossesDefeated = snapshot.lastBossesDefeated;
        alertModal('❌ Erro ao aplicar o backup. O estado anterior foi mantido.');
        return false;
    }

    const bwInput = document.getElementById('user-bodyweight');
    if (bwInput && userBodyweight > 0) bwInput.value = userBodyweight;

    const okParts = [
        saveLogsToStorage(), saveWorkoutsToStorage(), saveSettings(), saveGameState(), saveStoryState(),
        safeStorage.set(STORAGE_KEY_BW, String(userBodyweight)), safeStorage.set(STORAGE_KEY_SEEDED, '1')
    ];
    if (v.custom.presente) saveCustomExercises();
    refreshAll();
    const conflitos = v.custom.conflitos;
    if (okParts.some(ok => !ok) || imagensNaoSalvas > 0) {
        alertModal(`⚠️ Backup aplicado na tela, mas o navegador ${TEXTO_BLOB_NAO_CONFIRMADO}${imagensNaoSalvas > 0 ? ` (${imagensNaoSalvas} imagem(ns) incluída(s))` : ''}. Exporte um backup agora.`);
    } else if (conflitos.length) {
        alertModal(`✅ Backup importado. ${conflitos.length} exercício(s) personalizado(s) não importado(s): ${conflitos[0]}`);
    } else {
        alertModal('Backup importado com sucesso!');
    }
    return true;
}

function importJSONBackup(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const parsed = JSON.parse(e.target.result);
            // storyTheme de backups antigos é ignorado; o tema do jogo define o visual.
            applyImportedBackup(parsed).catch(() => alertModal('Erro ao importar o backup.'));
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

        updateHeaderDate(nowISO);
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
    updateHeaderDate(todayStr);
    renderNavigation();

    loadStoredData();
    loadWorkoutsFromStorage();
    applyTheme(safeStorage.get(STORAGE_KEY_THEME) || 'classico');
    initStorageMigration();

    if (logs.length === 0) seedInitialMockData(todayStr);

    // Sincroniza campos de configuração
    const setV = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    setV('cfg-weekly-goal', settings.weeklyGoal);
    setV('cfg-rest', settings.restDefault);
    setV('cfg-bar', settings.barWeight);
    setV('cfg-sled', settings.sledWeight);
    const deloadBtn = document.getElementById('cfg-deload-btn');
    if (deloadBtn) {
        const semanaHoje = isoWeekKey(todayStr);
        const isDeload = deloadWeeks.includes(semanaHoje);
        // A 4ª semana da temporada é deload automático: o botão precisa dizer
        // isso, senão parece que a semana de descarga "apareceu do nada".
        const isAuto = !isDeload && deloadWeeksEfetivos().includes(semanaHoje);
        deloadBtn.textContent = isDeload ? '✔ Semana de deload ATIVA (clique para remover)'
            : isAuto ? `🌙 Deload automático ATIVO (semana ${SEASON_WEEKS} da temporada)`
                : '🧘 Planejar semana de deload (esta semana)';
    }

    // Campos do formulário principal (prefixo vazio)
    const mainFields = document.getElementById('main-fields');
    if (mainFields) mainFields.innerHTML = fieldsHTML('', { type: 'carga_total', mode: 'simple' }, { quickCapture: true });

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

    // ============================================================
    // Correção para Android/PWA: abrir seletor de data/hora ao tocar,
    // e garantir foco em campos de texto (teclado abre)
    // ============================================================
    function fixMobileInputs() {
        // Todos os inputs de data: chama showPicker() no clique/toque
        document.querySelectorAll('input[type="date"]').forEach(input => {
            if (input._pickerFixed) return;
            input._pickerFixed = true;
            input.addEventListener('click', (e) => {
                try {
                    if (typeof input.showPicker === 'function') {
                        e.preventDefault();
                        input.focus();
                        input.showPicker();
                    } else {
                        input.focus();
                    }
                } catch (err) { /* fallback: só foca */ input.focus(); }
            });
            input.addEventListener('touchend', (e) => {
                e.preventDefault();
                try {
                    if (typeof input.showPicker === 'function') input.showPicker();
                } catch (err) { /* ignore */ }
                input.focus();
            }, { passive: false });
        });
        // Garante foco duplo em inputs de texto (resolve perda de foco em WebView)
        document.querySelectorAll('input[type="text"], input[type="number"], textarea, input:not([type])').forEach(input => {
            if (input._focusFixed) return;
            input._focusFixed = true;
            input.addEventListener('touchend', () => {
                setTimeout(() => {
                    if (document.activeElement !== input) {
                        input.focus();
                    }
                }, 50);
            }, { passive: true });
        });
    }
    // Aplica agora e sempre que o DOM mudar (inputs criados dinamicamente)
    fixMobileInputs();
    const mo = new MutationObserver(fixMobileInputs);
    mo.observe(document.body, { childList: true, subtree: true });
};

// ============================================================
// ETAPA 5.1 — manifesto de exports (fundação para ES modules)
// Cada arquivo declara explicitamente a sua superfície pública.
// No carregamento clássico os globais continuam valendo; quando a
// migração para <script type="module"> acontecer, este bloco vira
// `export { ... }`.
// ============================================================
(function (g) {
    const exports_ = {
        logs,
    savedWorkouts,
    draftExercises,
    editingWorkoutId,
    activeSession,
    userBodyweight,
    customBgImageData,
    volumeChartInstance,
    exChartInstance,
    setsChartInstance,
    weightLog,
    histVolChartInstance,
    settings,
    deloadWeeks,
    missionsXpTotal,
    missionsClaimed,
    tests,
    seasons,
    bossPortraits,
    portraitObjectURLs,
    STORY_BG_BLOB_KEY,
    themeGameSaves,
    activeGameThemeId,
    selectedStoryBossId,
    THEME,
    lastRankLevel,
    timer,
    wakeLock,
    lastKnownTodayISO,
    setEditorState,
    STORAGE_KEY_LOGS,
    STORAGE_KEY_BW,
    STORAGE_KEY_WORKOUTS,
    STORAGE_KEY_SEEDED,
    STORAGE_KEY_SETTINGS,
    STORAGE_KEY_GAME,
    STORAGE_KEY_THEME_GAMES,
    STORAGE_KEY_GAME_SHARED,
    STORAGE_KEY_STORY,
    STORAGE_KEY_BACKUP,
    closeElementById,
    hideElementById,
    setLogs,
    setSavedWorkouts,
    setUserBodyweight,
    setWeightLog,
    setHistVolChartInstance,
    safeStorage,
    saveBlobChecked,
    notifyBlobFailure,
    mensagemImagemSalva,
    TECHNIQUES,
    NEXT_GOALS,
    INP,
    LBL,
    MUSCLE_OPTIONS,
    NAV_GROUPS,
    activeNavGroup,
    activeTab,
    THEME_ICONS,
    THEME_IDS_LIST,
    THEME_ICON_IMGS,
    THEME_CARD_BGS,
    TAILWIND_SPACING_PX,
    imgSizeAttrs,
    themeIconImg,
    rankEmblemSrc,
    rankEmblemImg,
    _cardImgCache,
    getCardImg,
    drawCoverImg,
    STORY_CARD_STYLES,
    toLocalISO,
    getTodayLocalISO,
    formatDateBR,
    formatShortBR,
    updateHeaderDate,
    escapeHtml,
    fmtN,
    alertModal,
    confirmModal,
    shakeElement,
    migrateLog,
    normalizeSavedWorkouts,
    parseStoredObject,
    emptyThemeGameSave,
    ensureThemeGameSave,
    restoreActiveThemeGameSave,
    isoWeekDateRange,
    seasonsDoTema,
    deloadWeeksEfetivos,
    ensureDeloadRestAwards,
    loadGameProgressFromStorage,
    loadStoredData,
    logsForTheme,
    saveLogsToStorage,
    saveWorkoutsToStorage,
    saveSettings,
    saveGameState,
    saveStoryState,
    snapshotStoryBgDataURL,
    defaultTests,
    loadWorkoutsFromStorage,
    saveBodyweight,
    saveTrainingSettings,
    toggleDeloadWeek,
    updateStoryThemeInfo,
    applyTheme,
    changeGameTheme,
    computeThemeXPCtx,
    computeXPCtx,
    getGlobalXPTotal,
    themeRankList,
    themeConfirmationName,
    requestGameThemeChange,
    showThemeGallery,
    checkRankUp,
    showRanksModal,
    renderNavigation,
    selectNavGroup,
    switchTab,
    initStorageMigration,
    renderStorageStatus,
    seedInitialMockData,
    updateTypeHint,
    onTypeChange,
    flashAutofill,
    suggestSessaoFor,
    onLogExerciseChange,
    toggleSetMode,
    renderSetRows,
    readSetRows,
    addSetRow,
    removeSetRow,
    initSetEditor,
    fieldsHTML,
    readFields,
    snapshotDrafts,
    findLastPerformance,
    lastPerformanceHTML,
    repeatLastPerformance,
    handleAddLog,
    _lastLogId,
    newLogId,
    editLog,
    saveEditedLog,
    deleteLog,
    handleFilterDateChange,
    getFilteredLogs,
    renderLogsTable,
    renderRecoveryMap,
    prefillMuscleFromMap,
    renderDaySuggestion,
    registerCorrida,
    startSession,
    renderSession,
    moveSessionUnit,
    showWarmupFor,
    showPlatesFor,
    registerSessionUnit,
    endSession,
    timerRemainingMs,
    updateSessionTimerDisplay,
    addSessionTimer,
    toggleSessionTimer,
    tickSessionTimer,
    stopSessionTimer,
    vibrate,
    playBeepSound,
    acquireWakeLock,
    releaseWakeLock,
    spawnDamageFloat,
    normalizeBisets,
    pairLink,
    toggleDraftBiset,
    updateExerciseSuggestions,
    onWbExerciseChange,
    addExerciseToDraft,
    removeDraftExercise,
    moveDraftExercise,
    applySuggestedOrder,
    renderWeekGaps,
    renderDraftList,
    updateSaveButton,
    saveWorkout,
    clearDraft,
    editWorkout,
    deleteWorkout,
    renderSavedWorkouts,
    getAnimalRankForSession,
    updateHeaderChrome,
    updateSummaryMetrics,
    DEFAULT_BOSS_PORTRAITS,
    bossPortraitSrc,
    resolvePortraitSrc,
    hydratePortraitBlobs,
    _bossImgCache,
    getBossImg,
    renderBossBattleUI,
    BOSS_LIGHTBOX_ID,
    bossLightboxIdx,
    bossStatusLabel,
    bossStatusClass,
    bossPortraitDownloadName,
    openBossLightbox,
    closeBossLightbox,
    navBossLightbox,
    renderBossLightbox,
    OVERLAY_CLOSE_ORDER,
    closeTopOverlay,
    uploadBossPortrait,
    reservaManifest,
    reservaBossId,
    loadReservaManifest,
    reservaGroups,
    selectReservaBoss,
    applyReservaPortrait,
    resetBossPortraitToDefault,
    renderReservaStudio,
    renderMissions,
    claimMissions,
    renderSeason,
    finishSeasonNow,
    handleBgImageUpload,
    removeBgImage,
    wrapCanvasText,
    canvasMeasure,
    drawThemedFrame,
    drawThemedFrameArt,
    _fontsRedrawScheduled,
    withWebFonts,
    generateStoryCard,
    downloadStoryCard,
    openBossDefeatCard,
    generateBossDefeatCard,
    downloadBossDefeatCard,
    calculate1RM,
    renderWarmupCalculator,
    calculateWarmupFromForm,
    calculatePlatesFromForm,
    calculatePlatesQuick,
    weeklyStreakInfo,
    BADGE_ART,
    badgeArtSrc,
    badgeArtImg,
    badgeArtFallback,
    bestWeekWorkouts,
    renderBadgesAndStreak,
    initVolumeChart,
    renderExerciseChart,
    renderWeeklySetsChart,
    renderTests,
    addTestRecord,
    deleteTestRecord,
    addCustomTest,
    deleteTest,
    parseCSVRows,
    buildBackupPayload,
    exportJSONBackup,
    applyImportedBackup,
    importJSONBackup,
    renderBackupReminder,
    clearAllData,
    startDateWatcher,
    refreshAll
    };
    g.__diarioExports = Object.assign(g.__diarioExports || {}, exports_);
    // Ações delegáveis (js/actions.js): toda função pública do módulo fica
    // disponível para os atributos data-action dos templates.
    const actionFns = {};
    Object.keys(exports_).forEach(k => { if (typeof exports_[k] === 'function') actionFns[k] = exports_[k]; });
    g.registerDiarioActions(actionFns);
    g.__diarioExportFiles = Object.assign(g.__diarioExportFiles || {}, { "js/app.js": Object.keys(exports_).length });
})(typeof window !== 'undefined' ? window : globalThis);
export { logs, savedWorkouts, draftExercises, editingWorkoutId, activeSession, userBodyweight, customBgImageData, volumeChartInstance, exChartInstance, setsChartInstance, weightLog, histVolChartInstance, settings, deloadWeeks, missionsXpTotal, missionsClaimed, tests, seasons, bossPortraits, portraitObjectURLs, STORY_BG_BLOB_KEY, themeGameSaves, activeGameThemeId, selectedStoryBossId, THEME, BOSSES, ANIMAL_RANKS, lastRankLevel, timer, wakeLock, lastKnownTodayISO, lastBackupAt, setEditorState, STORAGE_KEY_LOGS, STORAGE_KEY_BW, STORAGE_KEY_WORKOUTS, STORAGE_KEY_SEEDED, STORAGE_KEY_SETTINGS, STORAGE_KEY_GAME, STORAGE_KEY_THEME_GAMES, STORAGE_KEY_GAME_SHARED, STORAGE_KEY_STORY, STORAGE_KEY_BACKUP, safeStorage, saveBlobChecked, notifyBlobFailure, mensagemImagemSalva, TECHNIQUES, NEXT_GOALS, INP, LBL, MUSCLE_OPTIONS, NAV_GROUPS, activeNavGroup, activeTab, THEME_ICONS, THEME_IDS_LIST, THEME_ICON_IMGS, THEME_CARD_BGS, TAILWIND_SPACING_PX, imgSizeAttrs, themeIconImg, rankEmblemSrc, rankEmblemImg, _cardImgCache, getCardImg, drawCoverImg, STORY_CARD_STYLES, toLocalISO, getTodayLocalISO, formatDateBR, formatShortBR, updateHeaderDate, escapeHtml, setLogs, setSavedWorkouts, setUserBodyweight, setWeightLog, setHistVolChartInstance, closeElementById, hideElementById, fmtN, alertModal, confirmModal, shakeElement, migrateLog, normalizeSavedWorkouts, parseStoredObject, emptyThemeGameSave, ensureThemeGameSave, restoreActiveThemeGameSave, isoWeekDateRange, seasonsDoTema, deloadWeeksEfetivos, ensureDeloadRestAwards, loadGameProgressFromStorage, loadStoredData, logsForTheme, saveLogsToStorage, saveWorkoutsToStorage, saveSettings, saveGameState, saveStoryState, snapshotStoryBgDataURL, defaultTests, loadWorkoutsFromStorage, saveBodyweight, saveTrainingSettings, toggleDeloadWeek, updateStoryThemeInfo, applyTheme, changeGameTheme, computeThemeXPCtx, computeXPCtx, getGlobalXPTotal, themeRankList, themeConfirmationName, requestGameThemeChange, showThemeGallery, checkRankUp, showRanksModal, renderNavigation, selectNavGroup, switchTab, initStorageMigration, renderStorageStatus, seedInitialMockData, updateTypeHint, onTypeChange, flashAutofill, suggestSessaoFor, onLogExerciseChange, toggleSetMode, renderSetRows, readSetRows, addSetRow, removeSetRow, initSetEditor, fieldsHTML, readFields, snapshotDrafts, findLastPerformance, lastPerformanceHTML, repeatLastPerformance, handleAddLog, _lastLogId, newLogId, editLog, saveEditedLog, deleteLog, handleFilterDateChange, getFilteredLogs, renderLogsTable, renderRecoveryMap, prefillMuscleFromMap, renderDaySuggestion, registerCorrida, startSession, renderSession, moveSessionUnit, showWarmupFor, showPlatesFor, registerSessionUnit, endSession, timerRemainingMs, updateSessionTimerDisplay, addSessionTimer, toggleSessionTimer, tickSessionTimer, stopSessionTimer, vibrate, playBeepSound, acquireWakeLock, releaseWakeLock, spawnDamageFloat, normalizeBisets, pairLink, toggleDraftBiset, updateExerciseSuggestions, onWbExerciseChange, addExerciseToDraft, removeDraftExercise, moveDraftExercise, applySuggestedOrder, renderWeekGaps, renderDraftList, updateSaveButton, saveWorkout, clearDraft, editWorkout, deleteWorkout, renderSavedWorkouts, getAnimalRankForSession, updateHeaderChrome, updateSummaryMetrics, DEFAULT_BOSS_PORTRAITS, bossPortraitSrc, resolvePortraitSrc, hydratePortraitBlobs, _bossImgCache, getBossImg, renderBossBattleUI, BOSS_LIGHTBOX_ID, bossLightboxIdx, bossStatusLabel, bossStatusClass, bossPortraitDownloadName, openBossLightbox, closeBossLightbox, navBossLightbox, renderBossLightbox, OVERLAY_CLOSE_ORDER, closeTopOverlay, uploadBossPortrait, reservaManifest, reservaBossId, loadReservaManifest, reservaGroups, selectReservaBoss, applyReservaPortrait, resetBossPortraitToDefault, renderReservaStudio, renderMissions, claimMissions, renderSeason, finishSeasonNow, handleBgImageUpload, removeBgImage, wrapCanvasText, canvasMeasure, drawThemedFrame, drawThemedFrameArt, _fontsRedrawScheduled, withWebFonts, generateStoryCard, downloadStoryCard, openBossDefeatCard, generateBossDefeatCard, downloadBossDefeatCard, calculate1RM, renderWarmupCalculator, calculateWarmupFromForm, calculatePlatesFromForm, calculatePlatesQuick, weeklyStreakInfo, BADGE_ART, badgeArtSrc, badgeArtImg, badgeArtFallback, bestWeekWorkouts, renderBadgesAndStreak, initVolumeChart, renderExerciseChart, renderWeeklySetsChart, renderTests, addTestRecord, deleteTestRecord, addCustomTest, deleteTest, parseCSVRows, buildBackupPayload, exportJSONBackup, applyImportedBackup, importJSONBackup, renderBackupReminder, clearAllData, startDateWatcher, refreshAll };
