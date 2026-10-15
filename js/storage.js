/* ============================================================
   CAMADA ÚNICA DE ARMAZENAMENTO — Diário de Cargas
   ------------------------------------------------------------
   Toda a persistência do app passa por aqui. O resto do código
   NÃO fala direto com localStorage/IndexedDB.

   Estratégia:
   - Cache síncrono em memória (populado do localStorage no boot) para
     manter a API síncrona que o app já usa.
   - IndexedDB (API nativa) é o armazenamento principal; a migração do
     localStorage é automática, idempotente e mantém a cópia antiga.
   - schemaVersion + migrações versionadas.
   ============================================================ */

const STORAGE_DB_NAME = 'berzerker-diario';
const STORAGE_DB_VERSION = 1;
const STORAGE_STORE = 'kv';
const STORAGE_SCHEMA_VERSION = 1;
const STORAGE_MIGRATED_FLAG = '__berzerker_migrated_v1';
const STORAGE_SCHEMA_KEY = '__berzerker_schema_version';

const _storageCache = new Map();
let _storageDB = null;
let _storageReady = false;

function _hasIndexedDB() {
    try { return typeof indexedDB !== 'undefined' && indexedDB !== null; } catch (e) { return false; }
}

function _openDB() {
    if (_storageDB) return Promise.resolve(_storageDB);
    if (!_hasIndexedDB()) return Promise.resolve(null);
    return new Promise((resolve, reject) => {
        let req;
        try { req = indexedDB.open(STORAGE_DB_NAME, STORAGE_DB_VERSION); }
        catch (e) { resolve(null); return; }
        req.onupgradeneeded = (ev) => {
            const db = ev.target.result;
            if (!db.objectStoreNames.contains(STORAGE_STORE)) {
                db.createObjectStore(STORAGE_STORE);
            }
        };
        req.onsuccess = (ev) => { _storageDB = ev.target.result; resolve(_storageDB); };
        req.onerror = () => resolve(null);
        req.onblocked = () => resolve(null);
    });
}

function _idbGet(key) {
    return _openDB().then(db => {
        if (!db) return undefined;
        return new Promise(resolve => {
            try {
                const tx = db.transaction(STORAGE_STORE, 'readonly');
                const st = tx.objectStore(STORAGE_STORE);
                const r = st.get(key);
                r.onsuccess = () => resolve(r.result);
                r.onerror = () => resolve(undefined);
            } catch (e) { resolve(undefined); }
        });
    });
}

function _idbSet(key, val) {
    return _openDB().then(db => {
        if (!db) return false;
        return new Promise(resolve => {
            try {
                const tx = db.transaction(STORAGE_STORE, 'readwrite');
                const st = tx.objectStore(STORAGE_STORE);
                const r = st.put(val, key);
                r.onsuccess = () => resolve(true);
                r.onerror = () => resolve(false);
            } catch (e) { resolve(false); }
        });
    });
}

function _idbKeys() {
    return _openDB().then(db => {
        if (!db) return [];
        return new Promise(resolve => {
            try {
                const tx = db.transaction(STORAGE_STORE, 'readonly');
                const st = tx.objectStore(STORAGE_STORE);
                const r = st.getAllKeys();
                r.onsuccess = () => resolve(r.result || []);
                r.onerror = () => resolve([]);
            } catch (e) { resolve([]); }
        });
    });
}

// Migrações versionadas: uma função por versão de destino.
const STORAGE_MIGRATIONS = {
    1: function (data) { return data; }
};

function _runMigrations(fromVersion, data) {
    let v = Number(fromVersion) || 0;
    let out = data;
    while (v < STORAGE_SCHEMA_VERSION) {
        v += 1;
        const fn = STORAGE_MIGRATIONS[v];
        if (typeof fn === 'function') out = fn(out);
    }
    return out;
}

// Popula cache síncrono a partir do localStorage (boot).
function _hydrateCacheFromLocalStorage() {
    try {
        if (typeof localStorage === 'undefined') return;
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k == null) continue;
            if (!_storageCache.has(k)) _storageCache.set(k, localStorage.getItem(k));
        }
    } catch (e) { /* ignore */ }
}

_hydrateCacheFromLocalStorage();

const storage = {
    schemaVersion: STORAGE_SCHEMA_VERSION,

    // Leitura: localStorage é a fonte síncrona (compatível com o app e os testes,
    // que podem escrever direto nele). O cache em memória só entra como reserva
    // quando o localStorage está BLOQUEADO (exeção/iframe sandbox) — nunca quando
    // ele responde, para não servir dado velho após um clear() externo.
    get(key) {
        let v = null, blocked = false;
        try {
            if (typeof localStorage === 'undefined') blocked = true;
            else v = localStorage.getItem(key);
        } catch (e) { blocked = true; }
        if (!blocked) return v;
        if (_storageCache.has(key)) return _storageCache.get(key);
        return null;
    },
    set(key, val) {
        const s = (val == null) ? null : String(val);
        _storageCache.set(key, s);
        let ok = true;
        try { if (typeof localStorage !== 'undefined') { if (s === null) localStorage.removeItem(key); else localStorage.setItem(key, s); } } catch (e) { ok = false; }
        // persistência assíncrona no IndexedDB
        _idbSet(key, s).catch(() => {});
        return ok;
    },
    remove(key) {
        _storageCache.delete(key);
        try { if (typeof localStorage !== 'undefined') localStorage.removeItem(key); } catch (e) { /* ignore */ }
        _idbSet(key, null).catch(() => {});
    },

    // Migração automática: localStorage -> IndexedDB, valida contagem, mantém localStorage.
    async migrate() {
        if (!_hasIndexedDB()) return { ok: false, reason: 'no-indexeddb' };
        const already = await _idbGet(STORAGE_MIGRATED_FLAG);
        if (already === '1') {
            _storageReady = true;
            return { ok: true, skipped: true };
        }
        // lê chaves do localStorage
        const keys = [];
        try {
            if (typeof localStorage !== 'undefined') {
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    if (k != null) keys.push(k);
                }
            }
        } catch (e) { /* ignore */ }

        let written = 0;
        for (const k of keys) {
            let v = null;
            try { v = (typeof localStorage !== 'undefined') ? localStorage.getItem(k) : null; } catch (e) { v = null; }
            const ok = await _idbSet(k, v);
            if (ok) written++;
        }
        // valida contagem de registros
        const idbKeys = await _idbKeys();
        const ok = idbKeys.length >= keys.length;
        if (ok) {
            // schema version
            const fromVer = (await _idbGet(STORAGE_SCHEMA_KEY)) || 0;
            const migratedData = _runMigrations(fromVer, { keys: idbKeys.length });
            await _idbSet(STORAGE_SCHEMA_KEY, String(STORAGE_SCHEMA_VERSION));
            await _idbSet(STORAGE_MIGRATED_FLAG, '1');
            _storageReady = true;
            return { ok: true, written, total: idbKeys.length };
        }
        return { ok: false, written, total: idbKeys.length, expected: keys.length };
    },

    isReady() { return _storageReady || !_hasIndexedDB(); },

    async persist() {
        try {
            if (navigator && navigator.storage && typeof navigator.storage.persist === 'function') {
                return await navigator.storage.persist();
            }
        } catch (e) { /* ignore */ }
        return false;
    },
    async estimate() {
        try {
            if (navigator && navigator.storage && typeof navigator.storage.estimate === 'function') {
                return await navigator.storage.estimate();
            }
        } catch (e) { /* ignore */ }
        return { usage: 0, quota: 0 };
    },

    // Compressão/redimensionamento de imagem (máx. ~1080 px, WebP/JPEG) -> Blob.
    // opts.square = true recorta um quadrado central antes de escalar (retratos).
    compressImage(input, maxPx, quality, mime, opts) {
        maxPx = maxPx || 1080;
        quality = (quality == null) ? 0.82 : quality;
        mime = mime || 'image/webp';
        const square = !!(opts && opts.square);
        return new Promise((resolve, reject) => {
            try {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                const finish = (src) => {
                    const canvas = (typeof document !== 'undefined') ? document.createElement('canvas') : null;
                    if (!canvas) { reject(new Error('no-canvas')); return; }
                    let w = img.naturalWidth || img.width;
                    let h = img.naturalHeight || img.height;
                    if (!w || !h) { reject(new Error('no-dims')); return; }
                    let sx = 0, sy = 0, sw = w, sh = h;
                    if (square) {
                        const side = Math.min(w, h);
                        sx = (w - side) / 2; sy = (h - side) / 2;
                        sw = sh = side;
                        w = h = side;
                    }
                    const scale = Math.min(1, maxPx / Math.max(w, h));
                    w = Math.round(w * scale);
                    h = Math.round(h * scale);
                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
                    canvas.toBlob((blob) => {
                        if (blob) resolve(blob);
                        else reject(new Error('toBlob-failed'));
                    }, mime, quality);
                };
                if (input instanceof Blob) {
                    const url = URL.createObjectURL(input);
                    img.onload = () => { URL.revokeObjectURL(url); finish(url); };
                    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('img-load-failed')); };
                    img.src = url;
                } else if (typeof input === 'string') {
                    img.onload = () => finish(input);
                    img.onerror = () => reject(new Error('img-load-failed'));
                    img.src = input;
                } else {
                    reject(new Error('unsupported-input'));
                }
            } catch (e) { reject(e); }
        });
    },

    // Blob no IndexedDB
    async saveBlob(key, blob) {
        return _idbSet('blob:' + key, blob);
    },
    async getBlob(key) {
        return _idbGet('blob:' + key);
    },
    async removeBlob(key) {
        return _idbSet('blob:' + key, null);
    },
    // Blob -> dataURL (para incluir imagens no backup JSON).
    async blobToDataURL(blob) {
        if (!blob) return null;
        return new Promise((resolve) => {
            try {
                const fr = new FileReader();
                fr.onload = () => resolve(String(fr.result || '') || null);
                fr.onerror = () => resolve(null);
                fr.readAsDataURL(blob);
            } catch (e) { resolve(null); }
        });
    },
    // dataURL -> Blob (para importar imagens do backup JSON).
    async dataURLToBlob(dataURL) {
        const s = String(dataURL || '');
        if (!s.startsWith('data:')) return null;
        try {
            const blob = await (await fetch(s)).blob();
            return blob && blob.size ? blob : null;
        } catch (e) { return null; }
    },

    // Leitura bruta do IndexedDB (diagnóstico/testes): não passa pelo localStorage.
    async peekRaw(key) { return _idbGet(key); },

    // Recuperação: se o localStorage perder chaves (limpeza automática do
    // navegador, storage estourado), restaura a partir do espelho no IndexedDB.
    // Idempotente: só regrava chaves que não estão mais no localStorage.
    async recoverFromIndexedDB() {
        if (!_hasIndexedDB()) return { ok: false, reason: 'no-indexeddb' };
        const keys = await _idbKeys();
        let restored = 0;
        for (const k of keys) {
            if (typeof k !== 'string' || k.startsWith('blob:') || k === STORAGE_MIGRATED_FLAG || k === STORAGE_SCHEMA_KEY) continue;
            let presente = false;
            try { presente = (typeof localStorage !== 'undefined') && localStorage.getItem(k) !== null; } catch (e) { presente = false; }
            if (presente) continue;
            const v = await _idbGet(k);
            if (v == null) continue;
            try { if (typeof localStorage !== 'undefined') localStorage.setItem(k, v); } catch (e) { /* segue com cache */ }
            _storageCache.set(k, v);
            restored++;
        }
        return { ok: true, restored };
    }
};

// Expor globalmente
try { if (typeof window !== 'undefined') window.storage = storage; } catch (e) { /* ignore */ }
try { if (typeof global !== 'undefined') global.storage = storage; } catch (e) { /* ignore */ }

// ============================================================
// ETAPA 5.1 — manifesto de exports (fundação para ES modules)
// Cada arquivo declara explicitamente a sua superfície pública.
// No carregamento clássico os globais continuam valendo; quando a
// migração para <script type="module"> acontecer, este bloco vira
// `export { ... }`.
// ============================================================
(function (g) {
    const exports_ = {
        STORAGE_DB_NAME,
    STORAGE_DB_VERSION,
    STORAGE_STORE,
    STORAGE_SCHEMA_VERSION,
    STORAGE_MIGRATED_FLAG,
    STORAGE_SCHEMA_KEY,
    _storageCache,
    _storageDB,
    _storageReady,
    _hasIndexedDB,
    _openDB,
    _idbGet,
    _idbSet,
    _idbKeys,
    STORAGE_MIGRATIONS,
    _runMigrations,
    _hydrateCacheFromLocalStorage,
    storage
    };
    g.__diarioExports = Object.assign(g.__diarioExports || {}, exports_);
    // Ações delegáveis (js/actions.js): toda função pública do módulo fica
    // disponível para os atributos data-action dos templates.
    const actionFns = {};
    Object.keys(exports_).forEach(k => { if (typeof exports_[k] === 'function') actionFns[k] = exports_[k]; });
    g.registerDiarioActions(actionFns);
    g.__diarioExportFiles = Object.assign(g.__diarioExportFiles || {}, { "js/storage.js": Object.keys(exports_).length });
})(typeof window !== 'undefined' ? window : globalThis);
export { STORAGE_DB_NAME, STORAGE_DB_VERSION, STORAGE_STORE, STORAGE_SCHEMA_VERSION, STORAGE_MIGRATED_FLAG, STORAGE_SCHEMA_KEY, _storageCache, _storageDB, _storageReady, _hasIndexedDB, _openDB, _idbGet, _idbSet, _idbKeys, STORAGE_MIGRATIONS, _runMigrations, _hydrateCacheFromLocalStorage, storage };
