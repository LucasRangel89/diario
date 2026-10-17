/* ============================================================
   BACKUP — validação do JSON e montagem do pacote
   ------------------------------------------------------------
   Validação do backup JSON (antes de substituir qualquer dado),
   montagem do pacote exportável e o parser de CSV — estavam no meio
   de js/app.js.

   Dividido de js/app.js na refatoração R2 — as funções foram movidas
   sem alterar uma linha de lógica (mesmos corpos, mesmos nomes).
   Quem APLICA o backup (applyImportedBackup) e quem dispara o download
   continuam no app, donos do estado e do DOM.
   ============================================================ */

import { getCustomExercises, normalizarExerciciosPersonalizados } from './custom_exercises.js';
import { isoDataValida } from './datas.js';
import { activeGameThemeId, bossPortraits, deloadWeeks, logs, migrateLog, missionsClaimed, missionsXpTotal, saveGameState, savedWorkouts, seasons, settings, snapshotStoryBgDataURL, tests, themeGameSaves, userBodyweight, weightLog } from './app.js';

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
        } else if (c === '"' && cur === '') inQuotes = true;   // aspas só abrem campo no início (aspas soltas no meio são literais)
        else if (c === sep) { row.push(cur); cur = ''; }
        else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
        else if (c !== '\r') cur += c;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows;
}


// ---------- Validação do backup (pura: não altera o estado) ----------
// Formato 6 (atual): acrescenta "customExercises". Backups 1–5 continuam importáveis:
// campos AUSENTES mantêm o valor atual (savedWorkouts, settings, customExercises) ou
// recebem o padrão do formato antigo (deloadWeeks, tests, weightLog). Campos PRESENTES
// e com tipo errado fazem o backup inteiro ser rejeitado, sem alterar nada.
// Itens de customExercises podem carregar os campos OPCIONAIS de identidade
// versionada `idEstavel` (ex-slug, preservado em renomes) e `versao` (inteiro
// >= 1): válidos fazem ida e volta; ausentes/inválidos são cunhados/ajustados
// na importação (js/custom_exercises.js, garantirIdentidadeVersionada). O
// formato continua 6 — não há coluna nova de perfil nem exportação de anatomia.
// A regra de data válida vive em js/datas.js (módulo único, compartilhado com o
// catálogo e o CSV): antes havia uma cópia aqui e outra em js/catalogo.js.
function isObjetoSimples(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
function validarBackupJSON(parsed) {
    const erros = [];
    if (!isObjetoSimples(parsed)) return { ok: false, erros: ['o arquivo não contém um objeto de backup'] };
    if (!Array.isArray(parsed.logs)) return { ok: false, erros: ['campo "logs" ausente ou não é uma lista'] };

    const logsOk = [];
    parsed.logs.forEach((raw, i) => {
        const pos = `registro #${i + 1}`;
        if (!isObjetoSimples(raw)) { erros.push(`${pos} não é um objeto`); return; }
        if (!isoDataValida(raw.date)) { erros.push(`${pos}: data inválida "${raw.date}"`); return; }
        if (typeof raw.exercise !== 'string' || !raw.exercise.trim()) { erros.push(`${pos}: exercício ausente`); return; }
        if (raw.kind !== undefined && raw.kind !== 'peso' && raw.kind !== 'corrida') { erros.push(`${pos}: tipo de registro "${raw.kind}" desconhecido`); return; }
        if (raw.weight !== undefined && !(Number.isFinite(Number(raw.weight)) && Number(raw.weight) >= 0)) { erros.push(`${pos}: carga inválida`); return; }
        if (raw.reps !== undefined && (!Array.isArray(raw.reps) || !raw.reps.every(r => Number.isFinite(Number(r))))) { erros.push(`${pos}: repetições inválidas`); return; }
        if (raw.sets !== undefined && raw.sets !== null && (!Array.isArray(raw.sets) || !raw.sets.every(s => isObjetoSimples(s) && Number.isFinite(Number(s.weight)) && Number.isFinite(Number(s.reps))))) { erros.push(`${pos}: séries (sets) inválidas`); return; }
        const runTypes = ['leve', 'longo', 'intervalado', 'ritmo/limiar', 'prova', 'regenerativo', 'outro'];
        if (raw.runType !== undefined && (typeof raw.runType !== 'string' || !runTypes.includes(raw.runType))) { erros.push(`${pos}: tipo de corrida inválido`); return; }
        if (raw.rpe !== undefined && (typeof raw.rpe !== 'number' || !Number.isInteger(raw.rpe) || raw.rpe < 1 || raw.rpe > 10)) { erros.push(`${pos}: RPE inválido (esperado inteiro de 1 a 10)`); return; }
        if (raw.hrAvg !== undefined && (typeof raw.hrAvg !== 'number' || !Number.isFinite(raw.hrAvg) || raw.hrAvg <= 0)) { erros.push(`${pos}: frequência cardíaca média inválida`); return; }
        if (raw.shoe !== undefined && typeof raw.shoe !== 'string') { erros.push(`${pos}: tênis deve ser texto`); return; }
        logsOk.push(raw);
    });
    if (erros.length) return { ok: false, erros: erros.slice(0, 10) };

    const d = { logs: logsOk.map(migrateLog), hasSavedWorkouts: false, savedWorkouts: null };
    // Ids ausentes ou repetidos no arquivo: edição e exclusão usam o id, então cada registro precisa de um.
    // Regra determinística: a primeira ocorrência mantém o id; as seguintes recebem um id novo.
    const idsUsados = new Set();
    let proximoIdBackup = Math.max(0, ...d.logs.map(l => Number(l.id) || 0)) + 1;
    d.logs.forEach((l, i) => {
        if (l.id === undefined || l.id === null || l.id === '' || idsUsados.has(l.id)) l.id = proximoIdBackup++;
        idsUsados.add(l.id);
    });

    if (parsed.savedWorkouts !== undefined) {
        if (!Array.isArray(parsed.savedWorkouts) || !parsed.savedWorkouts.every(isObjetoSimples)) return { ok: false, erros: ['"savedWorkouts" deve ser uma lista de treinos'] };
        d.hasSavedWorkouts = true;
        d.savedWorkouts = parsed.savedWorkouts.map(w => ({ ...w }));
    }
    if (parsed.userBodyweight !== undefined && parsed.userBodyweight !== null && !(Number(parsed.userBodyweight) > 0)) return { ok: false, erros: ['"userBodyweight" inválido'] };
    if (parsed.settings !== undefined && parsed.settings !== null && !isObjetoSimples(parsed.settings)) return { ok: false, erros: ['"settings" deve ser um objeto'] };
    if (parsed.themeGameSaves !== undefined && parsed.themeGameSaves !== null && !isObjetoSimples(parsed.themeGameSaves)) return { ok: false, erros: ['"themeGameSaves" deve ser um objeto'] };
    if (parsed.gameTheme !== undefined && typeof parsed.gameTheme !== 'string') return { ok: false, erros: ['"gameTheme" deve ser texto'] };

    const shared = isObjetoSimples(parsed.sharedGameState) ? parsed.sharedGameState : parsed;
    if (shared.deloadWeeks !== undefined && (!Array.isArray(shared.deloadWeeks) || !shared.deloadWeeks.every(x => typeof x === 'string'))) return { ok: false, erros: ['"deloadWeeks" deve ser uma lista de semanas'] };
    if (shared.tests !== undefined && (!Array.isArray(shared.tests) || !shared.tests.every(isObjetoSimples))) return { ok: false, erros: ['"tests" deve ser uma lista'] };
    if (shared.weightLog !== undefined && (!Array.isArray(shared.weightLog) || !shared.weightLog.every(w => isObjetoSimples(w) && isoDataValida(w.date) && Number(w.peso) > 0))) return { ok: false, erros: ['"weightLog" (pesagens) inválido'] };

    let custom = { lista: null, erros: [], conflitos: [] };
    if (parsed.customExercises !== undefined && parsed.customExercises !== null) {
        custom = normalizarExerciciosPersonalizados(parsed.customExercises);
        if (custom.erros.length) return { ok: false, erros: custom.erros.slice(0, 10) };
    }

    return {
        ok: true, erros: [], dados: d,
        shared: {
            deloadWeeks: shared.deloadWeeks, tests: shared.tests, weightLog: shared.weightLog
        },
        custom: { presente: parsed.customExercises !== undefined && parsed.customExercises !== null, lista: custom.lista || [], conflitos: custom.conflitos }
    };
}


// ============================ BACKUP JSON ============================
// Monta o payload completo do backup (função separada para ser testável de
// ponta a ponta: exportar → apagar → importar → comparar). Imagens enviadas
// pelo usuário entram como dataURL portáteis SÓ no arquivo de backup — no
// app elas vivem como Blob no IndexedDB, nunca em base64 no localStorage.
async function buildBackupPayload() {
    saveGameState();
    const portraitImages = {};
    try {
        if (window.storage && typeof window.storage.getBlob === 'function' && typeof window.storage.blobToDataURL === 'function') {
            for (const [bossId, v] of Object.entries(bossPortraits || {})) {
                if (typeof v === 'string' && v.startsWith('idb:')) {
                    const blob = await window.storage.getBlob(v.slice(4));
                    const dataURL = await window.storage.blobToDataURL(blob);
                    if (dataURL) portraitImages[`${activeGameThemeId}:${bossId}`] = dataURL;
                }
            }
        }
    } catch (e) { /* backup segue sem as imagens */ }
    return {
        version: 6,
        userBodyweight,
        logs,
        savedWorkouts,
        settings,
        // Formato 6: exercícios personalizados (definições completas, sem o catálogo principal).
        customExercises: getCustomExercises(),
        gameTheme: activeGameThemeId,
        themeGameSaves,
        sharedGameState: { deloadWeeks, tests, weightLog },
        portraitImages,
        storyBgImageData: snapshotStoryBgDataURL(),
        // Campos legados para que versões antigas ainda consigam importar o backup.
        deloadWeeks, missionsXpTotal, missionsClaimed, tests, seasons, bossPortraits, weightLog,
        bgImageData: snapshotStoryBgDataURL(),
        exportDate: new Date().toISOString()
    };
}

// ============================================================
// Manifesto de exports (mesmo padrão dos outros módulos em js/).
// ============================================================
(function (g) {
    const exports_ = {
        parseCSVRows,
        isObjetoSimples,
        validarBackupJSON,
        buildBackupPayload,
    };
    g.__diarioExports = Object.assign(g.__diarioExports || {}, exports_);
    // Ações delegáveis (js/actions.js): toda função pública do módulo fica
    // disponível para os atributos data-action dos templates.
    const actionFns = {};
    Object.keys(exports_).forEach(k => { if (typeof exports_[k] === 'function') actionFns[k] = exports_[k]; });
    g.registerDiarioActions(actionFns);
    g.__diarioExportFiles = Object.assign(g.__diarioExportFiles || {}, { "js/backup.js": Object.keys(exports_).length });
})(typeof window !== 'undefined' ? window : globalThis);

export { parseCSVRows, isObjetoSimples, validarBackupJSON, buildBackupPayload };
