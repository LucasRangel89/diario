/* ============================================================
   PERSISTÊNCIA — gravação do estado do app
   ------------------------------------------------------------
   Salvar logs, treinos, ajustes, estado do jogo e do Story Card,
   além da migração/normalização de registro antigo — estavam no meio
   de js/app.js. A camada de armazenamento em si (IndexedDB, espelho em
   localStorage, Blobs) continua em js/storage.js.

   Dividido de js/app.js na refatoração R2 — as funções foram movidas
   sem alterar uma linha de lógica (mesmos corpos, mesmos nomes).
   Lê o estado do app por import e nunca reatribui binding importado
   (só chama a API do storage e mexe nos objetos que recebe).
   ============================================================ */

import { THEMES, autoDeloadWeekKeys, computeBossProgress } from './gamificacao.js';
import { catalogInfo, inferExerciseType, normalizeMuscle } from './catalogo.js';
import { STORAGE_KEY_GAME_SHARED, STORAGE_KEY_LOGS, STORAGE_KEY_SETTINGS, STORAGE_KEY_STORY, STORAGE_KEY_THEME_GAMES, STORAGE_KEY_WORKOUTS, activeGameThemeId, bossPortraits, checkRankUp, customBgImageData, deloadWeeks, ensureDeloadRestAwards, ensureThemeGameSave, logs, missionsClaimed, missionsXpTotal, safeStorage, savedWorkouts, seasons, settings, tests, themeGameSaves, toLocalISO, userBodyweight, weightLog } from './app.js';

function logsForTheme(themeId = activeGameThemeId) {
    return logs.filter(log => log && log.xpTheme === themeId && log.conferir !== true && String(log.conferir).toLowerCase() !== 'sim');
}
function saveLogsToStorage() {
    logs.forEach(log => {
        if (!THEMES[log.xpTheme]) log.xpTheme = activeGameThemeId;
    });
    const ok = safeStorage.set(STORAGE_KEY_LOGS, JSON.stringify(logs));
    const save = ensureThemeGameSave(activeGameThemeId);
    const theme = THEMES[activeGameThemeId] || THEMES.classico;
    const combat = computeBossProgress(logsForTheme(activeGameThemeId), userBodyweight, theme.bosses, save.bossProgress);
    const combatChanged = JSON.stringify(save.bossProgress) !== JSON.stringify(combat.combatState);
    if (combatChanged) save.bossProgress = combat.combatState;
    const deloadChanged = ensureDeloadRestAwards();
    if (combatChanged || deloadChanged) saveGameState();
    checkRankUp();
    return ok;
}
function saveWorkoutsToStorage() { return safeStorage.set(STORAGE_KEY_WORKOUTS, JSON.stringify(savedWorkouts)); }
function saveSettings() {
    return safeStorage.set(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
}
function saveGameState() {
    const activeSave = ensureThemeGameSave(activeGameThemeId);
    activeSave.missionsXpTotal = Math.max(0, Number(missionsXpTotal) || 0);
    activeSave.missionsClaimed = { ...missionsClaimed };
    activeSave.seasons = seasons ? JSON.parse(JSON.stringify(seasons)) : null;
    activeSave.bossPortraits = { ...bossPortraits };
    const okSaves = safeStorage.set(STORAGE_KEY_THEME_GAMES, JSON.stringify(themeGameSaves));
    const okShared = safeStorage.set(STORAGE_KEY_GAME_SHARED, JSON.stringify({ deloadWeeks, tests, weightLog }));
    return okSaves && okShared;
}
function saveStoryState() {
    // O fundo enviado pelo usuário vive como Blob no IndexedDB (`bgBlob: '1'`).
    // `bgImageData` só fica preenchido em fallback legado (IndexedDB indisponível).
    return safeStorage.set(STORAGE_KEY_STORY, JSON.stringify({
        bgBlob: customBgImageData ? '1' : null,
        bgDate: customBgImageData?.storyDate || null,
        bgImageData: customBgImageData?.src?.startsWith('data:') ? customBgImageData.src : null
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
function emptyThemeGameSave() {
    return { missionsXpTotal: 0, missionsClaimed: {}, seasons: null, bossPortraits: {}, deloadRestDays: [], bossProgress: null };
}
function parseStoredObject(key) {
    try {
        const value = JSON.parse(safeStorage.get(key));
        return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
    } catch (e) { return null; }
}


// ============================ CARGA/PERSISTÊNCIA DE DADOS ============================
function migrateLog(l) {
    // Grupos extintos são remapeados ("Pescoço" → "Ombros"; "Glúteos" → "Posterior") sem quebrar o registro.
    if (l.muscle) l.muscle = normalizeMuscle(l.muscle);
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
    if (l.kind === 'corrida') { l.muscle = 'Cardio'; l.type = 'corrida'; }
    return l;
}


// Treinos salvos também carregam grupos antigos (ex.: seed da planilha trazia
// Glúteos no Hip Thrust e Pescoço na cervical) — normaliza ao carregar/semeiar.
// O catálogo manda: se o exercício existe nele, o grupo é o dele (assim a
// Mesa Flexora salva como "Pernas" volta para Posterior, que é onde ela conta).
function normalizeSavedWorkouts() {
    (savedWorkouts || []).forEach(w => {
        (w.exercises || []).forEach(e => {
            if (!e) return;
            const cat = catalogInfo(e.exercise);
            e.muscle = normalizeMuscle(cat ? cat.grupo : e.muscle);
        });
    });
    return savedWorkouts;
}
function isoWeekDateRange(weekKey) {
    const match = String(weekKey || '').match(/^(\d{4})-W(\d{1,2})$/);
    if (!match) return null;
    const year = Number(match[1]), week = Number(match[2]);
    if (week < 1 || week > 53) return null;
    const jan4 = new Date(year, 0, 4);
    const start = new Date(jan4);
    start.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (week - 1) * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return [toLocalISO(start), toLocalISO(end)];
}


// Temporadas do tema: o tema ativo manda pela variável global (que só volta ao
// save em saveGameState), os demais vivem no próprio save.
function seasonsDoTema(themeId, save) {
    return themeId === activeGameThemeId ? (seasons || (save && save.seasons)) : (save && save.seasons);
}


// Deload efetivo = semanas marcadas à mão (Config) ∪ semanas de deload
// automático (4ª semana de cada temporada do tema). Tudo que decide XP de
// descanso ou volume pela metade consulta esta lista, nunca `deloadWeeks` puro.
function deloadWeeksEfetivos(themeSeasons) {
    const s = themeSeasons === undefined ? seasons : themeSeasons;
    return [...new Set([...(Array.isArray(deloadWeeks) ? deloadWeeks : []), ...autoDeloadWeekKeys(s)])];
}


// Fundo em dataURL portátil (para o backup JSON): desenha a imagem num canvas
// limitado a 1080 px. Retorna null se não der (canvas indisponível).
function snapshotStoryBgDataURL() {
    try {
        if (!customBgImageData || !customBgImageData.naturalWidth) return null;
        const maxPx = 1080;
        const scale = Math.min(1, maxPx / Math.max(customBgImageData.naturalWidth, customBgImageData.naturalHeight));
        const c = document.createElement('canvas');
        c.width = Math.round(customBgImageData.naturalWidth * scale);
        c.height = Math.round(customBgImageData.naturalHeight * scale);
        c.getContext('2d').drawImage(customBgImageData, 0, 0, c.width, c.height);
        return c.toDataURL('image/jpeg', 0.8);
    } catch (e) { return null; }
}

// ============================================================
// Manifesto de exports (mesmo padrão dos outros módulos em js/).
// ============================================================
(function (g) {
    const exports_ = {
        logsForTheme,
        saveLogsToStorage,
        saveWorkoutsToStorage,
        saveSettings,
        saveGameState,
        saveStoryState,
        defaultTests,
        emptyThemeGameSave,
        parseStoredObject,
        migrateLog,
        normalizeSavedWorkouts,
        isoWeekDateRange,
        seasonsDoTema,
        deloadWeeksEfetivos,
        snapshotStoryBgDataURL,
    };
    g.__diarioExports = Object.assign(g.__diarioExports || {}, exports_);
    // Ações delegáveis (js/actions.js): toda função pública do módulo fica
    // disponível para os atributos data-action dos templates.
    const actionFns = {};
    Object.keys(exports_).forEach(k => { if (typeof exports_[k] === 'function') actionFns[k] = exports_[k]; });
    g.registerDiarioActions(actionFns);
    g.__diarioExportFiles = Object.assign(g.__diarioExportFiles || {}, { "js/persistencia.js": Object.keys(exports_).length });
})(typeof window !== 'undefined' ? window : globalThis);

export { logsForTheme, saveLogsToStorage, saveWorkoutsToStorage, saveSettings, saveGameState, saveStoryState, defaultTests, emptyThemeGameSave, parseStoredObject, migrateLog, normalizeSavedWorkouts, isoWeekDateRange, seasonsDoTema, deloadWeeksEfetivos, snapshotStoryBgDataURL };
