/* ============================================================
   CORRIDAS — funções puras para tempo, pace, agregações e recordes
   ------------------------------------------------------------
   Sem DOM e sem estado de topo: logs entram por argumento. Os recordes
   aqui são informativos e não participam da gamificação.
   ============================================================ */

function parseRunDuration(value) {
    if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value : null;
    const text = String(value ?? '').trim();
    if (!text) return null;
    if (/^\d+(?:[.,]\d+)?$/.test(text)) {
        const minutes = Number(text.replace(',', '.'));
        return Number.isFinite(minutes) && minutes >= 0 ? minutes : null;
    }
    const parts = text.split(':');
    if (parts.length !== 2 && parts.length !== 3) return null;
    if (!parts.every((part, i) => i === parts.length - 1 ? /^\d{1,2}(?:[.,]\d+)?$/.test(part) : /^\d+$/.test(part))) return null;
    const seconds = Number(parts[parts.length - 1].replace(',', '.'));
    if (!(seconds >= 0 && seconds < 60)) return null;
    if (parts.length === 2) {
        const minutes = Number(parts[0]);
        return Number.isFinite(minutes) ? minutes + seconds / 60 : null;
    }
    const hours = Number(parts[0]), minutes = Number(parts[1]);
    if (!(minutes >= 0 && minutes < 60)) return null;
    return Number.isFinite(hours) ? hours * 60 + minutes + seconds / 60 : null;
}

function formatRunDuration(durationMin) {
    const value = Number(durationMin);
    if (!Number.isFinite(value) || value < 0) return '';
    let total = Math.round(value * 60);
    const hours = Math.floor(total / 3600);
    total %= 3600;
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function paceSecondsPerKm(durationMin, distanceKm) {
    const minutes = Number(durationMin), km = Number(distanceKm);
    if (!Number.isFinite(minutes) || minutes < 0 || !Number.isFinite(km) || km <= 0) return null;
    return minutes * 60 / km;
}

function formatRunPace(secondsPerKm) {
    const pace = Number(secondsPerKm);
    if (!Number.isFinite(pace) || pace < 0) return '';
    const total = Math.round(pace);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}/km`;
}

function isRunLog(log) {
    if (!log || typeof log !== 'object') return false;
    const name = String(log.exercise || log.modalidade || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    if (/\b(bike|bicicleta|eliptic[oa]|remo|rowing|rower)\b/.test(name)) return false;
    const legacyRunName = /(^|\b)(corrida|esteira|running|treadmill)(\b|$)/.test(name);
    if (!legacyRunName) return false;
    return log.kind === 'corrida' || !log.kind;
}

function validISODateParts(date) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || ''));
    if (!m) return null;
    const y = Number(m[1]), month = Number(m[2]), day = Number(m[3]);
    const d = new Date(Date.UTC(y, month - 1, day));
    if (d.getUTCFullYear() !== y || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
    return { y, month, day, date: d };
}

function runISOWeekKey(date) {
    const parsed = validISODateParts(date);
    if (!parsed) return null;
    const d = new Date(parsed.date.getTime());
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const year = d.getUTCFullYear();
    const week = Math.ceil((((d - new Date(Date.UTC(year, 0, 1))) / 86400000) + 1) / 7);
    return `${year}-W${String(week).padStart(2, '0')}`;
}

function summarizeRunPeriod(logs, keyFor) {
    const grouped = new Map();
    (Array.isArray(logs) ? logs : []).filter(isRunLog).forEach(log => {
        const key = keyFor(log.date);
        if (!key) return;
        const row = grouped.get(key) || { period: key, km: 0, runs: 0, durationMin: 0, longestDistanceKm: 0 };
        const km = Number(log.distanceKm), duration = Number(log.durationMin);
        row.km += Number.isFinite(km) && km > 0 ? km : 0;
        row.durationMin += Number.isFinite(duration) && duration > 0 ? duration : 0;
        row.runs++;
        row.longestDistanceKm = Math.max(row.longestDistanceKm, Number.isFinite(km) && km > 0 ? km : 0);
        grouped.set(key, row);
    });
    return [...grouped.values()].sort((a, b) => a.period.localeCompare(b.period)).map(row => {
        const pace = paceSecondsPerKm(row.durationMin, row.km);
        return { ...row, paceSecondsPerKm: pace, pace: pace == null ? '' : formatRunPace(pace) };
    });
}

function summarizeRunsByWeek(logs) {
    return summarizeRunPeriod(logs, runISOWeekKey);
}
function summarizeRunsByMonth(logs) {
    return summarizeRunPeriod(logs, date => validISODateParts(date) ? String(date).slice(0, 7) : null);
}
function summarizeRunsByYear(logs) {
    return summarizeRunPeriod(logs, date => validISODateParts(date) ? String(date).slice(0, 4) : null);
}

function runRecords(logs) {
    const runs = (Array.isArray(logs) ? logs : []).filter(isRunLog);
    const withDistance = runs.filter(log => Number.isFinite(Number(log.distanceKm)) && Number(log.distanceKm) > 0);
    const longest = withDistance.slice().sort((a, b) => Number(b.distanceKm) - Number(a.distanceKm))[0] || null;
    const thresholds = [5, 10, 21.1, 42.2].map(minKm => {
        const candidates = withDistance.filter(log => Number(log.distanceKm) >= minKm)
            .map(log => ({ log, paceSecondsPerKm: paceSecondsPerKm(log.durationMin, log.distanceKm) }))
            .filter(x => x.paceSecondsPerKm != null)
            .sort((a, b) => a.paceSecondsPerKm - b.paceSecondsPerKm);
        const best = candidates[0];
        return {
            distanceKm: minKm,
            label: `Melhor pace em corrida ≥ ${String(minKm).replace('.', ',')} km (pace médio da corrida inteira; não é tempo oficial)`,
            log: best ? best.log : null,
            paceSecondsPerKm: best ? best.paceSecondsPerKm : null,
            pace: best ? formatRunPace(best.paceSecondsPerKm) : ''
        };
    });
    const shoeKm = {};
    runs.forEach(log => {
        const shoe = typeof log.shoe === 'string' ? log.shoe.trim() : '';
        const km = Number(log.distanceKm);
        if (!shoe || !Number.isFinite(km) || km <= 0) return;
        shoeKm[shoe] = (shoeKm[shoe] || 0) + km;
    });
    return {
        longestDistance: longest ? { log: longest, distanceKm: Number(longest.distanceKm) } : null,
        bestPaceByDistance: thresholds,
        shoeKm: Object.entries(shoeKm).sort((a, b) => a[0].localeCompare(b[0], 'pt-BR')).map(([shoe, km]) => ({ shoe, km }))
    };
}

(function (g) {
    const exports_ = { parseRunDuration, formatRunDuration, paceSecondsPerKm, formatRunPace, isRunLog, runISOWeekKey, summarizeRunsByWeek, summarizeRunsByMonth, summarizeRunsByYear, runRecords };
    g.__diarioExports = Object.assign(g.__diarioExports || {}, exports_);
    if (typeof g.registerDiarioActions === 'function') g.registerDiarioActions({});
    g.__diarioExportFiles = Object.assign(g.__diarioExportFiles || {}, { 'js/corridas.js': Object.keys(exports_).length });
})(typeof window !== 'undefined' ? window : globalThis);
export { parseRunDuration, formatRunDuration, paceSecondsPerKm, formatRunPace, isRunLog, runISOWeekKey, summarizeRunsByWeek, summarizeRunsByMonth, summarizeRunsByYear, runRecords };
