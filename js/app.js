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
import './perfil_exercicios.js';
import { formatRunDuration, formatRunPace, isRunLog, paceSecondsPerKm, runModality, runRecords, summarizeRunsByWeek, summarizeRunsByMonth, summarizeRunsByYear } from './corridas.js';
import { storage } from './storage.js';
import { DEFAULT_BAR_WEIGHT, DEFAULT_SLED_WEIGHT, FAIXA_SERIES_SEMANAIS, MUSCLE_META, MUSCLE_OPTIONS_FULL, MUSCULOS_MAPA, formatLoadText, formatPlates, formatRepsText, logEst1RM, logVolumeKg, CATALOG_TIPOS, EXERCISE_CATALOG, FAIXA_SERIES_POR_GRUPO, MUSCLE_WEIGHT, catalogInfo, detectAutoPR, duplaProgressao, inferExerciseType, logTstSeconds, normalizeMuscle, sinergiaState } from './catalogo.js';
import { SEASON_WEEKS, STORAGE_KEY_THEME, THEMES, XP_REST_PER_DAY, XP_GROUP_WEEK_CAP, XP_PER_EFFECTIVE_SET, completeSeason, computeBossProgress, isoWeekKey, isoWeekRange, missionsState, rankFromXP, seasonState, XP_MIN, autoDeloadWeekKeys, cardioXP, computeXP, logDamageKg, bossRewardXP } from './gamificacao.js';
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
import { renderSession, toggleSessionUnit, appendSessionExtra, updateSessionExtraHint, moveSessionUnit, showWarmupFor, showPlatesFor, registerSessionUnit, timerRemainingMs, updateSessionTimerDisplay, addSessionTimer, toggleSessionTimer, tickSessionTimer, vibrate, playBeepSound, spawnDamageFloat, normalizeBisets, pairLink, toggleDraftBiset, getAnimalRankForSession } from './sessao.js';
import { initStorageMigration, renderStorageStatus, seedInitialMockData } from './config.js';
import { DEFAULT_BOSS_PORTRAITS, bossPortraitSrc, resolvePortraitSrc, hydratePortraitBlobs, _bossImgCache, getBossImg, renderBossBattleUI, BOSS_LIGHTBOX_ID, bossLightboxIdx, bossStatusLabel, bossStatusClass, bossPortraitDownloadName, openBossLightbox, closeBossLightbox, navBossLightbox, renderBossLightbox, uploadBossPortrait, reservaManifest, reservaBossId, loadReservaManifest, reservaGroups, selectReservaBoss, applyReservaPortrait, resetBossPortraitToDefault, renderReservaStudio } from './boss.js';
import { updateTypeHint, onTypeChange, flashAutofill, suggestSessaoFor, onLogExerciseChange, toggleSetMode, renderSetRows, readSetRows, addSetRow, removeSetRow, initSetEditor, fieldsHTML, readFields, snapshotDrafts, findLastPerformance, lastPerformanceHTML, repeatLastPerformance, handleAddLog, _lastLogId, newLogId, editLog, saveEditedLog, handleFilterDateChange, getFilteredLogs, renderLogsTable, renderRecoveryMap, prefillMuscleFromMap, renderDaySuggestion, registerCorrida } from './registro.js';
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
let seasons = null;            // temporadas de 4 semanas
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
        if (typeof showBlobFailureWarning === 'function') showBlobFailureWarning('⚠️ Não foi possível salvar neste navegador. Exporte um backup JSON agora: alterações recentes podem não estar salvas.');
        else if (typeof alertModal === 'function') alertModal('⚠️ Não foi possível salvar neste navegador. Exporte um backup JSON agora: alterações recentes podem não estar salvas.');
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

// Aviso PERSISTENTE de gravação não confirmada (localStorage ou imagem): ao contrário
// do alertModal (some em ~4 s), fica na tela até a pessoa dispensar e traz a ação que
// protege os dados — o mesmo exportJSONBackup do botão de Config. Não é modal: não
// cobre a tela nem bloqueia o registro. Um só por vez (id fixo); cada notificador
// decide quando reaparece, uma vez por sequência de falhas e rearmado após sucesso.
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
    { id: 'treino', label: 'Treino', tabs: [['diario', 'Hoje'], ['historico', 'Histórico'], ['busca', 'Buscar'], ['montador', 'Meus treinos'], ['corridas', 'Corridas']] },
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
        bossProgress: raw.bossProgress && typeof raw.bossProgress === 'object' && [1, 2].includes(raw.bossProgress.version) ? raw.bossProgress : null,
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
        missionsXpTotal: missionXP, bosses: t.bosses, restDays: save.deloadRestDays, bossState: save.bossProgress
    });
}

function computeXPCtx(upto) {
    return computeGlobalXPCtx(upto);
}

function computeGlobalXPCtx(upto) {
    // XP de treino e cardio percorre o histórico completo exatamente uma vez,
    // sem depender do tema escolhido quando o registro foi criado.
    const allLogs = logs.filter(log => log && log.date && (!upto || log.date <= upto));
    const saves = Object.keys(THEMES).map(id => ensureThemeGameSave(id));
    const allDeloadWeeks = [...new Set([
        ...deloadWeeks,
        ...Object.keys(THEMES).flatMap(id => deloadWeeksEfetivos(seasonsDoTema(id, ensureThemeGameSave(id))))
    ])];
    const restDays = [...new Set(saves.flatMap(save => save.deloadRestDays || []))];
    const missionXP = saves.reduce((sum, save) => sum + (Number(save.missionsXpTotal) || 0), 0);
    const base = computeXP(upto, {
        logs: allLogs, bodyweight: userBodyweight, deloadWeeks: allDeloadWeeks,
        missionsXpTotal: missionXP, bosses: [], restDays
    });

    // Recompensas de chefão permanecem colecionáveis por tema; somamos apenas
    // o XP de derrotas, nunca voltamos a somar o XP de treino daquele tema.
    const bossXP = Object.values(THEMES).reduce((sum, theme) => {
        const themeLogs = allLogs.filter(log => log.xpTheme === theme.id && log.conferir !== true && String(log.conferir).toLowerCase() !== 'sim');
        const save = ensureThemeGameSave(theme.id);
        const progress = computeBossProgress(themeLogs, userBodyweight, theme.bosses, save.bossProgress);
        return sum + (progress.defeatedCount > 0
            ? theme.bosses.slice(0, progress.defeatedCount).reduce((n, boss) => n + bossRewardXP(boss), 0)
            : 0);
    }, 0);
    const activeTheme = THEMES[activeGameThemeId] || THEME;
    const activeSave = ensureThemeGameSave(activeTheme.id);
    const activeProgress = computeBossProgress(allLogs.filter(log => log.xpTheme === activeTheme.id), userBodyweight, activeTheme.bosses, activeSave.bossProgress);
    const xp = base.xp + bossXP;
    return { ...base, xp, bossXP, missionXP, prog: activeProgress };
}

function getGlobalXPTotal() {
    return computeGlobalXPCtx().xp;
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
    confirmModal(`Trocar para ${themeConfirmationName(nextTheme)}? Sua patente global será mantida; as coleções e os retratos dos temas também ficam salvos.`, () => changeGameTheme(nextTheme.id));
}

function showThemeGallery() {
    document.getElementById('theme-gallery-overlay')?.remove();
    const cards = Object.values(THEMES).map(theme => {
        const data = computeGlobalXPCtx();
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
                <div class="min-w-0"><span class="block text-[10px] font-bold uppercase tracking-wider text-gray-500">Patente global</span><span class="block truncate text-xs font-bold text-amber-300">${rankEmblemImg(theme.id, currentRank.level, 'inline-block h-4 w-4 rounded-full align-[-3px] mr-1')} ${escapeHtml(currentRank.name)}</span></div>
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
            <div><h2 class="font-oswald text-xl font-bold uppercase tracking-wider text-white">🎭 Temas de gamificação</h2><p class="mt-1 text-[11px] text-gray-400">Sua patente e seu XP são globais; cada tema muda a skin e mantém sua coleção de chefões.</p></div>
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
    const d = computeGlobalXPCtx();
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
        <p class="text-[10px] text-gray-500">XP e patente são globais: o histórico de todos os temas conta uma vez. Treinos rendem ${XP_PER_EFFECTIVE_SET} XP por série efetiva (faixa de reps, RIR ≤ 3 quando informado), com teto provisório de ${XP_GROUP_WEEK_CAP} por grupo/semana; cargas seguem como estatística. Chefões e retratos continuam colecionáveis por tema. Deload rende metade do XP de treino e descanso +${XP_REST_PER_DAY} XP/dia.</p>
    </div>`;
    document.body.appendChild(o);
}

// ============================ CORRIDAS (somente apresentação; a fonte é logs) ============================
function runPeriodCards(rows) {
    if (!rows.length) return '<p class="text-xs text-gray-500">Nenhuma corrida neste período.</p>';
    return rows.slice(-6).reverse().map(row => `
        <div class="bg-berzerker-dark border border-berzerker-border rounded-lg p-3 min-w-0">
            <div class="flex flex-wrap justify-between gap-1 text-xs"><strong class="text-white">${escapeHtml(row.period)}</strong><span class="text-gray-400">${row.runs} corrida(s)</span></div>
            <div class="font-oswald text-lg text-cyan-300">${fmtN(row.km)} km <span class="text-xs font-sans text-gray-400">· ${row.durationMin > 0 ? escapeHtml(row.pace || '—') : '—'}</span></div>
            <div class="text-xs text-gray-500">${formatRunDuration(row.durationMin)} · maior ${fmtN(row.longestDistanceKm)} km</div>
        </div>`).join('');
}

function renderRunsTab() {
    const overview = document.getElementById('runs-overview');
    if (!overview) return;
    // O histórico de cardio é compartilhado. Este painel só lê as corridas
    // reconhecidas pelo módulo puro, sem mudar kind, PR, XP ou os registros.
    const runs = logs.filter(isRunLog);
    const weeks = summarizeRunsByWeek(runs);
    const months = summarizeRunsByMonth(runs);
    const years = summarizeRunsByYear(runs);
    const records = runRecords(runs);
    const total = years.reduce((sum, row) => ({
        runs: sum.runs + row.runs, km: sum.km + row.km, durationMin: sum.durationMin + row.durationMin
    }), { runs: 0, km: 0, durationMin: 0 });
    const pace = total.durationMin > 0 ? paceSecondsPerKm(total.durationMin, total.km) : null;
    const overviewItem = (title, value, hint) => `
        <div class="bg-berzerker-card border border-berzerker-border rounded-xl p-4 min-w-0">
            <span class="block text-xs font-bold text-gray-400 uppercase">${title}</span>
            <strong class="block font-oswald text-xl sm:text-2xl text-cyan-300 mt-1">${value}</strong>
            <span class="text-xs text-gray-500">${hint}</span>
        </div>`;
    overview.innerHTML = overviewItem('Corridas', `${total.runs} corridas`, 'Rua e Esteira') +
        overviewItem('Distância total', `${fmtN(total.km)} km`, 'Todo o histórico') +
        overviewItem('Tempo total', formatRunDuration(total.durationMin), 'Todo o histórico') +
        overviewItem('Pace médio', pace == null ? '—' : formatRunPace(pace), 'Tempo total ÷ distância total');
    document.getElementById('runs-weeks').innerHTML = runPeriodCards(weeks);
    document.getElementById('runs-months').innerHTML = runPeriodCards(months);
    document.getElementById('runs-years').innerHTML = runPeriodCards(years);

    const longest = records.longestDistance;
    document.getElementById('runs-records').innerHTML = `
        <div class="bg-berzerker-dark border border-berzerker-border rounded-lg p-3">
            <div class="text-xs text-gray-400">Maior distância em uma corrida</div>
            <strong class="text-cyan-300">${longest ? `${fmtN(longest.distanceKm)} km` : '—'}</strong>
            ${longest ? `<span class="text-xs text-gray-500 ml-2">${escapeHtml(formatDateBR(longest.log.date))}</span>` : ''}
        </div>` + records.bestPaceByDistance.map(record => `
        <div class="bg-berzerker-dark border border-berzerker-border rounded-lg p-3">
            <div class="text-xs text-gray-400">${escapeHtml(record.label)}</div>
            <strong class="text-cyan-300">${escapeHtml(record.pace || '—')}</strong>
            ${record.log ? `<span class="text-xs text-gray-500 ml-2">${escapeHtml(formatDateBR(record.log.date))}</span>` : ''}
        </div>`).join('');
    document.getElementById('runs-shoes').innerHTML = records.shoeKm.length
        ? records.shoeKm.map(row => `
            <div class="bg-berzerker-dark border border-berzerker-border rounded-lg p-3 flex flex-wrap justify-between gap-2 text-sm min-w-0">
                <span class="text-gray-200 break-words min-w-0">${escapeHtml(row.shoe)}</span><strong class="text-cyan-300">${fmtN(row.km)} km</strong>
            </div>`).join('')
        : '<p class="text-xs text-gray-500">Nenhum tênis informado nas corridas.</p>';

    // Os filtros são apenas da lista. Recriar as opções a partir dos resumos
    // válidos evita regra de calendário paralela e preserva a seleção ao editar.
    const yearSelect = document.getElementById('runs-year');
    const selectedYear = yearSelect.value;
    yearSelect.innerHTML = '<option value="">Todos os anos</option>' + years.slice().reverse().map(row =>
        `<option value="${escapeHtml(row.period)}">${escapeHtml(row.period)}</option>`).join('');
    yearSelect.value = years.some(row => row.period === selectedYear) ? selectedYear : '';
    const selectedModality = document.getElementById('runs-modality').value;
    const filtered = runs.filter(log => (!selectedModality || runModality(log) === selectedModality) &&
        (!yearSelect.value || String(log.date || '').startsWith(yearSelect.value + '-')))
        .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || Number(b.id) - Number(a.id));
    const LIMIT = 60;
    document.getElementById('runs-results').innerHTML = filtered.length ? filtered.slice(0, LIMIT).map(log => {
        const modality = runModality(log);
        const km = Number(log.distanceKm), min = Number(log.durationMin);
        const seconds = Number.isFinite(min) && min > 0 ? paceSecondsPerKm(min, km) : null;
        const details = [
            log.runType ? `Tipo: ${escapeHtml(log.runType)}` : '',
            log.rpe != null ? `RPE ${escapeHtml(log.rpe)}` : '',
            log.hrAvg != null ? `FC média ${escapeHtml(log.hrAvg)} bpm` : '',
            log.shoe ? `👟 ${escapeHtml(log.shoe)}` : ''
        ].filter(Boolean).join(' · ');
        // IDs dos registros são numéricos; não colocar dados livres em data-args.
        const actions = Number.isSafeInteger(log.id) ? `
            <div class="flex flex-wrap gap-2 shrink-0">
                <button type="button" data-action="editLog" data-args="[${log.id}]" class="min-h-[44px] px-3 py-2 rounded-lg bg-berzerker-border text-white text-xs font-bold">✏️ Editar</button>
                <button type="button" data-action="deleteLog" data-args="[${log.id}]" class="min-h-[44px] px-3 py-2 rounded-lg border border-red-900/50 text-red-300 text-xs font-bold">Excluir</button>
            </div>` : '';
        return `
            <article data-run-id="${escapeHtml(log.id)}" class="bg-berzerker-dark border border-berzerker-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 min-w-0">
                <div class="min-w-0 space-y-1">
                    <div class="flex flex-wrap items-center gap-2 text-xs text-gray-400"><time datetime="${escapeHtml(log.date)}">${escapeHtml(formatDateBR(log.date))}</time>
                        <strong class="text-cyan-300">${escapeHtml(modality)}</strong>
                        ${log.isPR ? '<span title="PR de cardio do jogo (todas as modalidades)" class="text-emerald-400">🏆 PR de cardio (jogo)</span>' : ''}
                    </div>
                    <div class="text-sm text-white font-bold">${Number.isFinite(km) && km >= 0 ? `${fmtN(km)} km` : '—'} · ${Number.isFinite(min) && min >= 0 ? formatRunDuration(min) : '—'} · ${seconds == null ? '—' : formatRunPace(seconds)}</div>
                    ${details ? `<div class="text-xs text-gray-400 break-words">${details}</div>` : ''}
                    ${log.notes ? `<p class="text-xs text-gray-500 break-words">${escapeHtml(log.notes)}</p>` : ''}
                </div>${actions}
            </article>`;
    }).join('') + (filtered.length > LIMIT ? `<p class="text-xs text-gray-500 text-center">Mostrando ${LIMIT} de ${filtered.length} corridas — filtre por ano ou modalidade.</p>` : '')
        : '<p class="text-center py-6 text-gray-400 border border-dashed border-berzerker-border rounded-xl">Nenhuma corrida com esses filtros.</p>';
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
    if (tab === 'corridas') renderRunsTab();
    if (tab === 'boss') { renderBossBattleUI(); renderMissions(); renderSeason(); }
    if (tab === 'story') generateStoryCard();
    if (tab === 'stats') { renderBadgesAndStreak(); initVolumeChart(); renderExerciseChart(); renderWeeklySetsChart(); renderTests(); }
    if (tab === 'config') { renderBackupReminder(); renderStorageStatus(); }
}

// ============================ EDIÇÃO ============================
function deleteLog(id) {
    confirmModal('Excluir este registro?', () => {
        logs = logs.filter(l => l.id !== id);
        if (activeSession) {
            // Item EXTRA (do Registro rápido) sai da sequência junto com o log;
            // o item planejado mantém o comportamento anterior: volta a pendente.
            activeSession.exercises = activeSession.exercises.filter(e => !(e.extra && e.logId === id));
            activeSession.exercises.forEach(e => { if (e.logId === id) { e.done = false; e.logId = null; } });
            renderSession();
        }
        saveLogsToStorage();
        refreshAll();
    });
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
            biset: !!e.biset, done: false, logId: null, draft: null, extra: false,
            loggedWeight: null, loggedReps: null, loggedPR: false,
            orderReason: e.orderReason || ''
        }))
    };
    const opcaoExtra = document.getElementById('log-count-in-session');
    if (opcaoExtra) opcaoExtra.checked = false;

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
        const opcaoExtra = document.getElementById('log-count-in-session');
        if (opcaoExtra) opcaoExtra.checked = false;
        updateSessionExtraHint();
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
            <div class="text-[10px] text-gray-500">🤝 = contribuição estimada do apoio indireto (séries ponderadas por fator heurístico; informativo, não é série direta e não abate a meta). O assistente sugere treinos que cobrem os grupos mais abaixo — mas quem manda é você.</div>
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

// ============================ LIGHTBOX DOS CHEFÕES ============================
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
    if (activeTab === 'corridas') renderRunsTab();
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
    computeGlobalXPCtx,
    getGlobalXPTotal,
    themeRankList,
    themeConfirmationName,
    requestGameThemeChange,
    showThemeGallery,
    checkRankUp,
    showRanksModal,
    renderRunsTab,
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
export { logs, savedWorkouts, draftExercises, editingWorkoutId, activeSession, userBodyweight, customBgImageData, volumeChartInstance, exChartInstance, setsChartInstance, weightLog, histVolChartInstance, settings, deloadWeeks, missionsXpTotal, missionsClaimed, tests, seasons, bossPortraits, portraitObjectURLs, STORY_BG_BLOB_KEY, themeGameSaves, activeGameThemeId, selectedStoryBossId, THEME, BOSSES, ANIMAL_RANKS, lastRankLevel, timer, wakeLock, lastKnownTodayISO, lastBackupAt, setEditorState, STORAGE_KEY_LOGS, STORAGE_KEY_BW, STORAGE_KEY_WORKOUTS, STORAGE_KEY_SEEDED, STORAGE_KEY_SETTINGS, STORAGE_KEY_GAME, STORAGE_KEY_THEME_GAMES, STORAGE_KEY_GAME_SHARED, STORAGE_KEY_STORY, STORAGE_KEY_BACKUP, safeStorage, saveBlobChecked, notifyBlobFailure, mensagemImagemSalva, TECHNIQUES, NEXT_GOALS, INP, LBL, MUSCLE_OPTIONS, NAV_GROUPS, activeNavGroup, activeTab, THEME_ICONS, THEME_IDS_LIST, THEME_ICON_IMGS, THEME_CARD_BGS, TAILWIND_SPACING_PX, imgSizeAttrs, themeIconImg, rankEmblemSrc, rankEmblemImg, _cardImgCache, getCardImg, drawCoverImg, STORY_CARD_STYLES, toLocalISO, getTodayLocalISO, formatDateBR, formatShortBR, updateHeaderDate, escapeHtml, setLogs, setSavedWorkouts, setUserBodyweight, setWeightLog, setHistVolChartInstance, closeElementById, hideElementById, fmtN, alertModal, confirmModal, shakeElement, migrateLog, normalizeSavedWorkouts, parseStoredObject, emptyThemeGameSave, ensureThemeGameSave, restoreActiveThemeGameSave, isoWeekDateRange, seasonsDoTema, deloadWeeksEfetivos, ensureDeloadRestAwards, loadGameProgressFromStorage, loadStoredData, logsForTheme, saveLogsToStorage, saveWorkoutsToStorage, saveSettings, saveGameState, saveStoryState, snapshotStoryBgDataURL, defaultTests, loadWorkoutsFromStorage, saveBodyweight, saveTrainingSettings, toggleDeloadWeek, updateStoryThemeInfo, applyTheme, changeGameTheme, computeThemeXPCtx, computeXPCtx, computeGlobalXPCtx, getGlobalXPTotal, themeRankList, themeConfirmationName, requestGameThemeChange, showThemeGallery, checkRankUp, showRanksModal, renderRunsTab, renderNavigation, selectNavGroup, switchTab, initStorageMigration, renderStorageStatus, seedInitialMockData, updateTypeHint, onTypeChange, flashAutofill, suggestSessaoFor, onLogExerciseChange, toggleSetMode, renderSetRows, readSetRows, addSetRow, removeSetRow, initSetEditor, fieldsHTML, readFields, snapshotDrafts, findLastPerformance, lastPerformanceHTML, repeatLastPerformance, handleAddLog, _lastLogId, newLogId, editLog, saveEditedLog, deleteLog, handleFilterDateChange, getFilteredLogs, renderLogsTable, renderRecoveryMap, prefillMuscleFromMap, renderDaySuggestion, registerCorrida, startSession, renderSession, toggleSessionUnit, appendSessionExtra, updateSessionExtraHint, moveSessionUnit, showWarmupFor, showPlatesFor, registerSessionUnit, endSession, timerRemainingMs, updateSessionTimerDisplay, addSessionTimer, toggleSessionTimer, tickSessionTimer, stopSessionTimer, vibrate, playBeepSound, acquireWakeLock, releaseWakeLock, spawnDamageFloat, normalizeBisets, pairLink, toggleDraftBiset, updateExerciseSuggestions, onWbExerciseChange, addExerciseToDraft, removeDraftExercise, moveDraftExercise, applySuggestedOrder, renderWeekGaps, renderDraftList, updateSaveButton, saveWorkout, clearDraft, editWorkout, deleteWorkout, renderSavedWorkouts, getAnimalRankForSession, updateHeaderChrome, updateSummaryMetrics, DEFAULT_BOSS_PORTRAITS, bossPortraitSrc, resolvePortraitSrc, hydratePortraitBlobs, _bossImgCache, getBossImg, renderBossBattleUI, BOSS_LIGHTBOX_ID, bossLightboxIdx, bossStatusLabel, bossStatusClass, bossPortraitDownloadName, openBossLightbox, closeBossLightbox, navBossLightbox, renderBossLightbox, OVERLAY_CLOSE_ORDER, closeTopOverlay, uploadBossPortrait, reservaManifest, reservaBossId, loadReservaManifest, reservaGroups, selectReservaBoss, applyReservaPortrait, resetBossPortraitToDefault, renderReservaStudio, renderMissions, claimMissions, renderSeason, finishSeasonNow, handleBgImageUpload, removeBgImage, wrapCanvasText, canvasMeasure, drawThemedFrame, drawThemedFrameArt, _fontsRedrawScheduled, withWebFonts, generateStoryCard, downloadStoryCard, openBossDefeatCard, generateBossDefeatCard, downloadBossDefeatCard, calculate1RM, renderWarmupCalculator, calculateWarmupFromForm, calculatePlatesFromForm, calculatePlatesQuick, weeklyStreakInfo, BADGE_ART, badgeArtSrc, badgeArtImg, badgeArtFallback, bestWeekWorkouts, renderBadgesAndStreak, initVolumeChart, renderExerciseChart, renderWeeklySetsChart, renderTests, addTestRecord, deleteTestRecord, addCustomTest, deleteTest, parseCSVRows, buildBackupPayload, exportJSONBackup, applyImportedBackup, importJSONBackup, renderBackupReminder, clearAllData, startDateWatcher, refreshAll };
