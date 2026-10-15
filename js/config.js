/* ============================================================
   CONFIG — armazenamento (IndexedDB) e dados iniciais
   ------------------------------------------------------------
   Migração automática para o IndexedDB no primeiro boot, painel de status
   do armazenamento (persistência e quota, aba ⚙️ Config) e o seed do
   primeiro uso (js/planilha_data.js) — estavam no meio de js/app.js.
   A vigia de virada de dia e o refreshAll continuam no app: a vigia
   reatribui `lastKnownTodayISO` (estado de topo) e o refreshAll é o
   orquestrador de todas as telas.

   Dividido de js/app.js na refatoração R2 (rodada 2) — as declarações
   foram movidas sem alterar uma linha de lógica (corpos byte a byte
   idênticos). O estado de topo continua em js/app.js e é lido aqui por
   import (binding vivo); nenhuma função deste arquivo reatribui binding
   importado.
   ============================================================ */

import { seedFromPlanilha } from './planilha_data.js';
import { normalizeSavedWorkouts, saveLogsToStorage, saveWorkoutsToStorage } from './persistencia.js';
import { STORAGE_KEY_SEEDED, loadStoredData, loadWorkoutsFromStorage, safeStorage } from './app.js';

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

// ============================================================
// Manifesto de exports (mesmo padrão dos outros módulos em js/).
// ============================================================
(function (g) {
    const exports_ = {
        initStorageMigration,
        renderStorageStatus,
        seedInitialMockData,
    };
    g.__diarioExports = Object.assign(g.__diarioExports || {}, exports_);
    // Ações delegáveis (js/actions.js): toda função pública do módulo fica
    // disponível para os atributos data-action dos templates.
    const actionFns = {};
    Object.keys(exports_).forEach(k => { if (typeof exports_[k] === 'function') actionFns[k] = exports_[k]; });
    g.registerDiarioActions(actionFns);
    g.__diarioExportFiles = Object.assign(g.__diarioExportFiles || {}, { "js/config.js": Object.keys(exports_).length });
})(typeof window !== 'undefined' ? window : globalThis);

export { initStorageMigration, renderStorageStatus, seedInitialMockData };
