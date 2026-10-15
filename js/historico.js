import { EXERCISE_CATALOG_FULL, catalogInfo, inferExerciseType, logCargaEfetiva, logFullMeta, logVolumeKg, normalizeMuscle, sinalProximaSessao } from './catalogo.js';
import { cardioXP } from './gamificacao.js';
import { alertModal, escapeHtml, fmtN, getTodayLocalISO, histVolChartInstance, logs, parseCSVRows, refreshAll, saveBodyweight, saveGameState, saveLogsToStorage, saveSettings, setHistVolChartInstance, setLogs, setUserBodyweight, setWeightLog, settings, userBodyweight, weightLog } from './app.js';
/* ============================================================
   HISTÓRICO — formato da planilha do usuário
   Vistas: Log | Progresso | Semana a semana | Peso corporal
   + export/import CSV multi-planilha (formato dela, com ;)
   ============================================================ */

let historyView = 'log';
// weightLog é declarado em js/app.js (estado global persistido)

function switchHistoryView(v) {
    historyView = v;
    document.querySelectorAll('#history-views .seg-btn').forEach(b => {
        b.classList.toggle('seg-btn-active', b.dataset.view === v);
    });
    renderHistory();
}

function historyFilteredLogs() {
    const busca = (document.getElementById('hist-busca')?.value || '').toLowerCase();
    const grupo = document.getElementById('hist-grupo')?.value || '';
    const de = document.getElementById('hist-de')?.value || '';
    const ate = document.getElementById('hist-ate')?.value || '';
    const soConferir = document.getElementById('hist-conferir')?.checked;
    return logs.filter(l => {
        if (l.kind !== 'peso' && l.kind !== 'corrida') return false;
        if (busca && !(l.exercise || '').toLowerCase().includes(busca) && !(l.sessao || '').toLowerCase().includes(busca)) return false;
        if (grupo && grupo !== 'Todos' && normalizeMuscle(l.muscle) !== grupo) return false;
        if (de && l.date < de) return false;
        if (ate && l.date > ate) return false;
        if (soConferir && !l.conferir) return false;
        return true;
    });
}

function histDataBR(iso) {
    if (!iso) return '';
    const [y, m, d] = String(iso).split('-');
    return (d && m && y) ? `${d}/${m}/${y}` : iso;
}

function metricaProgresso(meta) {
    return meta.unidade === 'seg' ? `${fmtN(meta.bestSet, 0)} seg` : `${fmtN(meta.cargaEfetiva, 1)}`;
}

// A tabela do histórico é larga no celular: o GRUPO (canônico) ganha a coluna e
// o chip, e a sessão vira um detalhe discreto embaixo do exercício — o split do
// dia continua legível sem competir com o que alimenta a meta semanal.
function histGrupoChipHTML(l) {
    return `<span class="text-[10px] font-bold px-1.5 py-0.5 rounded border border-berzerker-border bg-berzerker-card text-berzerker-500 uppercase whitespace-nowrap">${escapeHtml(normalizeMuscle(l && l.muscle))}</span>`;
}

function histSessaoDetalheHTML(l) {
    const sessao = l && String(l.sessao || '').trim();
    return sessao ? `<span class="block text-[10px] font-normal text-gray-500 mt-0.5">${escapeHtml(sessao)}</span>` : '';
}

function renderHistory() {
    const box = document.getElementById('history-content');
    if (!box) return;
    if (historyView === 'log') box.innerHTML = historyLogHTML();
    else if (historyView === 'progresso') box.innerHTML = historyProgressoHTML();
    else if (historyView === 'semanas') box.innerHTML = historySemanasHTML();
    else box.innerHTML = historyPesoHTML();
    drawVolumeChartMini();
}

function historyLogHTML() {
    const rows = historyFilteredLogs();
    const totalVol = rows.filter(l => l.kind !== 'corrida').reduce((a, l) => a + logVolumeKg(l), 0);
    let totalKm = 0;
    let body = rows.map(l => {
        if (l.kind === 'corrida') {
            const km = Number(l.distanceKm) || 0;
            totalKm += km;
            const min = Number(l.durationMin) || 0;
            const pace = km > 0 ? Math.round(min / km * 10) / 10 : 0;
            return `<tr class="${l.conferir ? 'bg-amber-500/10' : ''} bg-cyan-900/10">
                <td class="px-2 py-1.5 whitespace-nowrap">${histDataBR(l.date)}</td>
                <td class="px-2 py-1.5">${histGrupoChipHTML(l)}</td>
                <td class="px-2 py-1.5 font-semibold text-cyan-300">🏃 ${escapeHtml(l.exercise)}${histSessaoDetalheHTML(l)}</td>
                <td class="px-2 py-1.5 text-center font-bold text-cyan-400" colspan="6">${String(km).replace('.', ',')} km em ${min} min · pace ${String(pace).replace('.', ',')} min/km · +${cardioXP(l)} XP</td>
                <td class="px-2 py-1.5 text-center">${l.conferir ? '⚠️' : ''}</td>
                <td class="px-2 py-1.5 text-xs text-gray-400 max-w-[16ch] truncate" title="${escapeHtml(l.notes || '')}">${escapeHtml(l.notes || '')}</td>
                <td colspan="10" class="px-2 py-1.5 text-center text-[10px] text-cyan-400/70 uppercase">Cardio / Corrida (não conta no volume de peso)</td>
            </tr>`;
        }
        const meta = logFullMeta(l);
        const total = meta.unidade === 'seg' ? meta.totalReps : meta.totalReps;
        return `<tr class="${l.conferir ? 'bg-amber-500/10' : ''}">
            <td class="px-2 py-1.5 whitespace-nowrap">${histDataBR(l.date)}</td>
            <td class="px-2 py-1.5">${histGrupoChipHTML(l)}</td>
            <td class="px-2 py-1.5 font-semibold text-white">${escapeHtml(l.exercise)}${histSessaoDetalheHTML(l)}</td>
            <td class="px-2 py-1.5 text-center font-bold">${fmtN(l.weight, 1)}</td>
            ${[0, 1, 2, 3, 4].map(i => `<td class="px-1 py-1.5 text-center">${l.reps && l.reps[i] != null ? fmtN(l.reps[i], 0) : ''}</td>`).join('')}
            <td class="px-2 py-1.5 text-center">${l.rir != null && l.rir !== '' ? l.rir : ''}</td>
            <td class="px-2 py-1.5 text-center">${l.conferir ? '⚠️' : ''}</td>
            <td class="px-2 py-1.5 text-xs text-gray-400 max-w-[16ch] truncate" title="${escapeHtml(l.notes || '')}">${escapeHtml(l.notes || '')}</td>
            <td class="px-2 py-1.5 text-center text-xs">${meta.unidade}</td>
            <td class="px-2 py-1.5 text-center text-xs">${meta.fator}</td>
            <td class="px-2 py-1.5 text-center text-xs">${meta.lados}</td>
            <td class="px-2 py-1.5 text-center text-berzerker-100">${fmtN(meta.cargaEfetiva, 1)}</td>
            <td class="px-2 py-1.5 text-center">${fmtN(total, 0)}</td>
            <td class="px-2 py-1.5 text-center font-semibold text-white">${fmtN(meta.volume, 0)}</td>
            <td class="px-2 py-1.5 text-center">${fmtN(meta.bestSet, 0)}</td>
            <td class="px-2 py-1.5 text-center">${fmtN(meta.worstSet, 0)}</td>
            <td class="px-2 py-1.5 text-center text-amber-300">${meta.est1RM != null ? fmtN(meta.est1RM, 1) : '—'}</td>
            <td class="px-2 py-1.5 whitespace-nowrap font-bold ${meta.unidade === 'seg' ? 'text-sky-300' : 'text-berzerker-100'}">${metricaProgresso(meta)}</td>
        </tr>`;
    }).join('');
    return `
    <div class="overflow-x-auto bg-gray-800/50 rounded-xl border border-berzerker-border">
        <table class="w-full text-xs">
            <thead class="bg-gray-900/70 text-gray-300">
                <tr>
                    <th class="px-2 py-2 text-left">Data</th>
                    <th class="px-2 py-2 text-left">Grupo</th>
                    <th class="px-2 py-2 text-left">Exercício</th>
                    <th class="px-2 py-2">Carga reg. (kg)</th>
                    <th class="px-1 py-2">S1</th><th class="px-1 py-2">S2</th><th class="px-1 py-2">S3</th><th class="px-1 py-2">S4</th><th class="px-1 py-2">S5</th>
                    <th class="px-2 py-2">RIR</th>
                    <th class="px-2 py-2">Conferir?</th>
                    <th class="px-2 py-2 text-left">Observações</th>
                    <th class="px-2 py-2">Unidade</th><th class="px-2 py-2">Fator</th><th class="px-2 py-2">Lados</th>
                    <th class="px-2 py-2">Carga efetiva (kg)</th>
                    <th class="px-2 py-2">Total reps</th>
                    <th class="px-2 py-2">Volume (kg)</th>
                    <th class="px-2 py-2">Melhor série</th>
                    <th class="px-2 py-2">Menor série</th>
                    <th class="px-2 py-2">1RM Epley (kg)</th>
                    <th class="px-2 py-2">Métrica de progresso</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-700/50">${body || `<tr><td colspan="22" class="text-center py-8 text-gray-400">Sem lançamentos no filtro.</td></tr>`}</tbody>
        </table>
    </div>
    <p class="text-xs text-gray-400 mt-2">⚠️ = linha marcada como "Conferir?". Volume: <b class="text-white">${fmtN(totalVol, 0)} kg</b>${totalKm > 0 ? ` · Cardio: <b class="text-cyan-300">${String(totalKm).replace('.', ',')} km</b>` : ''}.</p>`;
}

function historyProgressoHTML() {
    // Agrega por exercício (ordem alfabética) — mesmo espírito da aba Progresso da planilha
    const byEx = new Map();
    historyFilteredLogs().slice().sort((a, b) => a.date.localeCompare(b.date)).forEach(l => {
        if (!byEx.has(l.exercise)) byEx.set(l.exercise, []);
        byEx.get(l.exercise).push(l);
    });
    const rows = [...byEx.entries()].map(([ex, hist]) => {
        const first = hist[0], last = hist[hist.length - 1];
        const metaF = logFullMeta(first), metaL = logFullMeta(last);
        const cat = catalogInfo(ex);
        const sinal = sinalProximaSessao(hist[hist.length - 1]);
        const dPct = metaF.cargaEfetiva > 0 ? ((metaL.cargaEfetiva - metaF.cargaEfetiva) / metaF.cargaEfetiva * 100) : 0;
        return `<tr>
            <td class="px-2 py-1.5 font-semibold text-white">${escapeHtml(ex)}</td>
            <td class="px-2 py-1.5 text-xs text-gray-400">${escapeHtml(cat ? cat.grupo : first.muscle || '')}</td>
            <td class="px-2 py-1.5 text-center">${hist.length}</td>
            <td class="px-2 py-1.5 text-center">${histDataBR(first.date)}</td>
            <td class="px-2 py-1.5 text-center">${histDataBR(last.date)}</td>
            <td class="px-2 py-1.5 text-center">${fmtN(first.weight, 1)}</td>
            <td class="px-2 py-1.5 text-center">${fmtN(last.weight, 1)}</td>
            <td class="px-2 py-1.5 text-center ${dPct > 0 ? 'text-green-400' : dPct < 0 ? 'text-red-400' : ''}">${dPct > 0 ? '+' : ''}${fmtN(dPct, 1)}%</td>
            <td class="px-2 py-1.5 text-center text-berzerker-100">${fmtN(metaL.cargaEfetiva, 1)}</td>
            <td class="px-2 py-1.5 text-center">${metaL.totalReps}</td>
            <td class="px-2 py-1.5 text-center">${fmtN(metaL.bestSet, 0)}</td>
            <td class="px-2 py-1.5 text-center text-amber-300">${metaL.est1RM != null ? fmtN(metaL.est1RM, 1) : '—'}</td>
            <td class="px-2 py-1.5 text-center text-xs">${cat && cat.faixa ? `${cat.faixa[0]}–${cat.faixa[1]}` : '—'}</td>
            <td class="px-2 py-1.5 whitespace-nowrap font-bold ${sinal.includes('⬆') ? 'text-green-400' : 'text-berzerker-100'}">${sinal}</td>
        </tr>`;
    }).join('');
    return `
    <div class="overflow-x-auto bg-gray-800/50 rounded-xl border border-berzerker-border">
        <table class="w-full text-xs">
            <thead class="bg-gray-900/70 text-gray-300">
                <tr>
                    <th class="px-2 py-2 text-left">Exercício</th>
                    <th class="px-2 py-2 text-left">Grupo</th>
                    <th class="px-2 py-2">Sessões</th>
                    <th class="px-2 py-2">1ª data</th>
                    <th class="px-2 py-2">Última data</th>
                    <th class="px-2 py-2">Carga 1ª (kg)</th>
                    <th class="px-2 py-2">Carga última (kg)</th>
                    <th class="px-2 py-2">Δ%</th>
                    <th class="px-2 py-2">Carga efetiva última</th>
                    <th class="px-2 py-2">Total reps última</th>
                    <th class="px-2 py-2">Melhor série última</th>
                    <th class="px-2 py-2">1RM est. última</th>
                    <th class="px-2 py-2">Faixa alvo</th>
                    <th class="px-2 py-2 text-left">Sinal p/ próxima sessão</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-700/50">${rows || `<tr><td colspan="14" class="text-center py-8 text-gray-400">Sem dados no filtro.</td></tr>`}</tbody>
        </table>
    </div>`;
}

function getWeek1Start() {
    return settings.week1Start || '2026-09-28';
}

function setWeek1Start(v) {
    settings.week1Start = v;
    saveSettings();
    renderHistory();
}

function historySemanasHTML() {
    const w1 = getWeek1Start();
    const start = new Date(w1 + 'T12:00:00');
    const weeks = [];
    for (let i = 0; i < 12; i++) {
        const s = new Date(start); s.setDate(start.getDate() + i * 7);
        const e = new Date(s); e.setDate(s.getDate() + 6);
        weeks.push({ isoS: s.toISOString().slice(0, 10), isoE: e.toISOString().slice(0, 10) });
    }
    const totalRow = weeks.map(w => {
        const v = logs.filter(l => l.kind === 'peso' && l.date >= w.isoS && l.date <= w.isoE).reduce((a, l) => a + logVolumeKg(l), 0);
        return `<td class="px-2 py-2 text-center font-semibold">${fmtN(v, 0)}</td>`;
    }).join('');
    // Carga efetiva máxima por exercício por semana (exercícios com algum log)
    const exercises = [...new Set(logs.filter(l => l.kind === 'peso').map(l => l.exercise))].sort();
    const maxRows = exercises.map(ex => {
        const cells = weeks.map(w => {
            const max = logs.filter(l => l.kind === 'peso' && l.exercise === ex && l.date >= w.isoS && l.date <= w.isoE)
                .reduce((a, l) => Math.max(a, logCargaEfetiva(l)), 0);
            return `<td class="px-2 py-1.5 text-center ${max ? 'text-berzerker-100 font-semibold' : 'text-gray-600'}">${max ? fmtN(max, 1) : ''}</td>`;
        }).join('');
        return `<tr><td class="px-2 py-1.5 font-semibold text-white whitespace-nowrap">${escapeHtml(ex)}</td>${cells}</tr>`;
    }).join('');
    return `
    <div class="flex items-end gap-3 mb-4 flex-wrap">
        <label class="text-xs text-gray-400">Início da semana 1 (segunda-feira)
            <input type="date" value="${w1}" data-change-action="setWeek1Start" data-value-attr="value" class="block bg-gray-800 border border-berzerker-border rounded px-3 py-2 text-white">
        </label>
        <p class="text-xs text-gray-400 pb-2">Semanas de ${histDataBR(weeks[0].isoS)} a ${histDataBR(weeks[11].isoE)}.</p>
    </div>
    <div class="overflow-x-auto bg-gray-800/50 rounded-xl border border-berzerker-border">
        <table class="w-full text-xs">
            <thead class="bg-gray-900/70 text-gray-300">
                <tr><th class="px-2 py-2 text-left">Semana</th>${weeks.map((w, i) => `<th class="px-2 py-2 text-center">Sem ${i + 1}</th>`).join('')}</tr>
                <tr><th class="px-2 py-2 text-left text-gray-400">Início</th>${weeks.map(w => `<th class="px-2 py-2 text-center text-gray-400">${histDataBR(w.isoS)}</th>`).join('')}</tr>
            </thead>
            <tbody>
                <tr class="bg-gray-900/30"><td class="px-2 py-2 font-semibold">Volume total (kg)</td>${totalRow}</tr>
            </tbody>
        </table>
    </div>
    <h4 class="font-oswald text-berzerker-100 mt-6 mb-2">VOLUME POR SEMANA</h4>
    <div class="h-64 bg-gray-800/50 rounded-xl border border-berzerker-border p-3"><canvas id="chart-hist-volume"></canvas></div>
    <h4 class="font-oswald text-berzerker-100 mt-6 mb-2">CARGA EFETIVA MÁXIMA POR EXERCÍCIO E SEMANA</h4>
    <div class="overflow-x-auto bg-gray-800/50 rounded-xl border border-berzerker-border">
        <table class="w-full text-xs">
            <thead class="bg-gray-900/70 text-gray-300"><tr><th class="px-2 py-2 text-left">Exercício</th>${weeks.map((w, i) => `<th class="px-2 py-2 text-center">Sem ${i + 1}</th>`).join('')}</tr></thead>
            <tbody class="divide-y divide-gray-700/50">${maxRows}</tbody>
        </table>
    </div>`;
}

function historyPesoHTML() {
    const rows = weightLog.slice().sort((a, b) => a.date.localeCompare(b.date)).map(w => `
        <tr>
            <td class="px-2 py-1.5">${histDataBR(w.date)}</td>
            <td class="px-2 py-1.5 text-center font-semibold text-white">${fmtN(w.peso, 1)}</td>
            <td class="px-2 py-1.5 text-xs text-gray-400">${escapeHtml(w.obs || '')}</td>
            <td class="px-2 py-1.5 text-right"><button data-action="removeWeightLog" data-args='["${w.date}"]' class="text-red-400 hover:text-red-300 text-xs">✕</button></td>
        </tr>`).join('');
    return `
    <div class="flex gap-2 items-end flex-wrap mb-4">
        <label class="text-xs text-gray-400">Data<input type="date" id="pw-date" value="${getTodayLocalISO()}" class="block bg-gray-800 border border-berzerker-border rounded px-3 py-2 text-white"></label>
        <label class="text-xs text-gray-400">Peso (kg)<input type="number" id="pw-peso" step="0.1" class="block bg-gray-800 border border-berzerker-border rounded px-3 py-2 text-white w-28" placeholder="80"></label>
        <label class="text-xs text-gray-400">Observação<input type="text" id="pw-obs" class="block bg-gray-800 border border-berzerker-border rounded px-3 py-2 text-white w-52" placeholder="opcional"></label>
        <button data-action="addWeightLog" class="bg-berzerker-500 hover:bg-berzerker-100 text-white font-semibold px-4 py-2 rounded">Registrar peso</button>
        <button data-action="setBodyweightFromLog" class="bg-gray-700 hover:bg-gray-600 text-white font-semibold px-4 py-2 rounded text-sm">Usar como peso corporal do app</button>
    </div>
    <div class="overflow-x-auto bg-gray-800/50 rounded-xl border border-berzerker-border">
        <table class="w-full text-xs">
            <thead class="bg-gray-900/70 text-gray-300"><tr><th class="px-2 py-2 text-left">Data</th><th class="px-2 py-2">Peso (kg)</th><th class="px-2 py-2 text-left">Observação</th><th></th></tr></thead>
            <tbody class="divide-y divide-gray-700/50">${rows || `<tr><td colspan="4" class="text-center py-8 text-gray-400">Sem pesagens ainda.</td></tr>`}</tbody>
        </table>
    </div>`;
}

function addWeightLog() {
    const date = document.getElementById('pw-date').value || getTodayLocalISO();
    const peso = parseFloat(document.getElementById('pw-peso').value);
    const obs = document.getElementById('pw-obs').value.trim();
    if (!peso || peso < 20) return alertModal('⚠️ Peso inválido — informe um peso em kg (ex.: 80).');
    setWeightLog(weightLog.filter(w => w.date !== date));
    weightLog.push({ date, peso, obs });
    saveGameState();
    renderHistory();
}

function removeWeightLog(date) {
    setWeightLog(weightLog.filter(w => w.date !== date));
    saveGameState();
    renderHistory();
}

function setBodyweightFromLog() {
    const last = weightLog.slice().sort((a, b) => a.date.localeCompare(b.date)).pop();
    if (!last) return alertModal('⚠️ Sem pesagens — registre um peso primeiro.');
    setUserBodyweight(last.peso);
    document.getElementById('user-bodyweight').value = last.peso;
    saveBodyweight();
    alertModal(`⚖️ Peso corporal do app = ${fmtN(last.peso, 1)} kg (pesagem de ${histDataBR(last.date)}).`);
}

function drawVolumeChartMini() {
    const canvas = document.getElementById('chart-hist-volume');
    if (!canvas || historyView !== 'semanas' || typeof Chart === 'undefined') return;
    const w1 = getWeek1Start();
    const start = new Date(w1 + 'T12:00:00');
    const labels = [], vols = [];
    for (let i = 0; i < 12; i++) {
        const s = new Date(start); s.setDate(start.getDate() + i * 7);
        const e = new Date(s); e.setDate(s.getDate() + 6);
        labels.push(`S${i + 1}`);
        vols.push(logs.filter(l => l.kind === 'peso' && l.date >= s.toISOString().slice(0, 10) && l.date <= e.toISOString().slice(0, 10)).reduce((a, l) => a + logVolumeKg(l), 0));
    }
    if (histVolChartInstance) histVolChartInstance.destroy();
    setHistVolChartInstance(new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Volume (kg)/semana', data: vols, backgroundColor: '#FF6B00' }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#fff' } } }, scales: { x: { ticks: { color: '#aaa' } }, y: { ticks: { color: '#aaa' } } } }
    }));
}

/* ================= CSV — formato da planilha (multi-aba, ; ) ================= */

function csvNum(n) {
    return (n == null || isNaN(n)) ? '' : String(+n.toFixed(2));
}

function buildPlanilhaCSV() {
    // Texto multi-aba completo no formato da planilha (para export e para o arquivo do repositório)
    const LOG_COLS = ['Data', 'Sessão', 'Exercício', 'Carga registrada (kg)', 'S1', 'S2', 'S3', 'S4', 'S5', 'RIR', 'Conferir?', 'Observações', 'Unidade', 'Fator', 'Lados', 'Carga efetiva (kg)', 'Total reps (ou segundos)', 'Volume (kg)', 'Melhor série', 'Menor série', '1RM Epley (kg)', 'Métrica de progresso'];
    const CAT_COLS = ['Exercício', 'Grupo', 'Equipamento', 'Como registrar', 'Fator', 'Lados', 'Unidade', 'Reps mín.', 'Reps máx.', 'Extra estimado (kg)', 'Faixa do extra (kg)', 'Observações'];
    const PESO_COLS = ['Data', 'Peso (kg)', 'Observação'];
    const parts = [];

    // --- Sheet: Log ---
    parts.push('--- Sheet: Log ---');
    parts.push(LOG_COLS.join(';'));
    logs.filter(l => l.kind === 'peso').slice().sort((a, b) => a.date.localeCompare(b.date)).forEach(l => {
        const meta = logFullMeta(l);
        const reps = l.reps || [];
        const row = [
            histDataBR(l.date), l.sessao || '', l.exercise, csvNum(l.weight),
            csvNum(reps[0]), csvNum(reps[1]), csvNum(reps[2]), csvNum(reps[3]), csvNum(reps[4]),
            l.rir != null ? l.rir : '', l.conferir ? 'Sim' : 'Não', (l.notes || '').replace(/[\r\n]+/g, ' '),
            meta.unidade, meta.fator, meta.lados,
            csvNum(meta.cargaEfetiva), csvNum(meta.totalReps), csvNum(meta.volume),
            csvNum(meta.bestSet), csvNum(meta.worstSet), meta.est1RM != null ? csvNum(meta.est1RM) : '',
            meta.unidade === 'seg' ? csvNum(meta.bestSet) : csvNum(meta.cargaEfetiva)
        ];
        parts.push(row.join(';'));
    });

    // --- Sheet: Catálogo ---
    parts.push('--- Sheet: Catálogo ---');
    parts.push(CAT_COLS.join(';'));
    Object.values(EXERCISE_CATALOG_FULL).sort((a, b) => a.nome.localeCompare(b.nome)).forEach(c => {
        if (c.tipo === 'corrida') return;
        parts.push([c.nome, c.grupo, c.equipamento, c.como, c.fator, c.lados, c.unidade,
        c.faixa ? c.faixa[0] : '', c.faixa ? c.faixa[1] : '', c.extra || '', c.extraFaixa || '', (c.obs || '').replace(/[\r\n]+/g, ' ')].join(';'));
    });

    // --- Sheet: Progresso ---
    parts.push('--- Sheet: Progresso ---');
    parts.push(['Exercício', 'Grupo', 'Sessões', '1ª data', 'Última data', 'Carga 1ª (kg)', 'Carga última (kg)', 'Δ%', 'Carga efetiva última', 'Melhor série última', '1RM est. última', 'Faixa alvo', 'Sinal'].join(';'));
    const byEx = new Map();
    logs.filter(l => l.kind === 'peso').slice().sort((a, b) => a.date.localeCompare(b.date)).forEach(l => {
        if (!byEx.has(l.exercise)) byEx.set(l.exercise, []);
        byEx.get(l.exercise).push(l);
    });
    [...byEx.entries()].forEach(([ex, hist]) => {
        const first = hist[0], last = hist[hist.length - 1];
        const metaF = logFullMeta(first), metaL = logFullMeta(last);
        const cat = catalogInfo(ex);
        const dPct = metaF.cargaEfetiva > 0 ? ((metaL.cargaEfetiva - metaF.cargaEfetiva) / metaF.cargaEfetiva * 100) : 0;
        parts.push([ex, cat ? cat.grupo : '', hist.length, histDataBR(first.date), histDataBR(last.date),
        csvNum(first.weight), csvNum(last.weight), csvNum(dPct), csvNum(metaL.cargaEfetiva), csvNum(metaL.bestSet),
        metaL.est1RM != null ? csvNum(metaL.est1RM) : '', cat && cat.faixa ? `${cat.faixa[0]}-${cat.faixa[1]}` : '',
        sinalProximaSessao(last)].join(';'));
    });

    // --- Sheet: Semana a semana ---
    parts.push('--- Sheet: Semana a semana ---');
    parts.push(['Início da semana 1 (segunda-feira)', histDataBR(getWeek1Start())].join(';'));
    const w1 = getWeek1Start();
    const start = new Date(w1 + 'T12:00:00');
    const weeks = [];
    for (let i = 0; i < 12; i++) {
        const s = new Date(start); s.setDate(start.getDate() + i * 7);
        const e = new Date(s); e.setDate(s.getDate() + 6);
        weeks.push({ isoS: s.toISOString().slice(0, 10), isoE: e.toISOString().slice(0, 10) });
    }
    parts.push(['Semana', ...weeks.map((w, i) => `Sem ${i + 1}`)].join(';'));
    parts.push(['Início', ...weeks.map(w => histDataBR(w.isoS))].join(';'));
    parts.push(['Volume total (kg)', ...weeks.map(w => csvNum(logs.filter(l => l.kind === 'peso' && l.date >= w.isoS && l.date <= w.isoE).reduce((a, l) => a + logVolumeKg(l), 0)))].join(';'));
    [...byEx.keys()].sort().forEach(ex => {
        parts.push([`Carga efetiva máxima (kg) — ${ex}`, ...weeks.map(w => {
            const max = logs.filter(l => l.kind === 'peso' && l.exercise === ex && l.date >= w.isoS && l.date <= w.isoE).reduce((a, l) => Math.max(a, logCargaEfetiva(l)), 0);
            return max ? csvNum(max) : '';
        })].join(';'));
    });

    // --- Sheet: Peso corporal ---
    parts.push('--- Sheet: Peso corporal ---');
    parts.push(PESO_COLS.join(';'));
    weightLog.slice().sort((a, b) => a.date.localeCompare(b.date)).forEach(w => {
        parts.push([histDataBR(w.date), csvNum(w.peso), (w.obs || '').replace(/[\r\n]+/g, ' ')].join(';'));
    });

    return parts.join('\n');
}

function exportCSV() {
    const blob = new Blob(['\ufeff' + buildPlanilhaCSV()], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `diario_cargas_${getTodayLocalISO()}.csv`;
    a.click();
    alertModal('📊 CSV exportado — formato da planilha (multi-aba, ;, dd/mm/aaaa). Abra direto no Excel/Sheets.');
}

function parseDateBRorISO(s) {
    if (!s) return getTodayLocalISO();
    if (s.includes('/')) {
        const [d, m, y] = s.split('/');
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return s;
}

function importCSV(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => importPlanilhaCSV(String(e.target.result).replace(/^\ufeff/, ''));
    reader.onerror = () => alertModal('Erro ao ler o CSV.');
    reader.readAsText(file);
    event.target.value = '';
}

function parseSheetLogRows(rows) {
    // rows = parseCSVRows da aba Log (com cabeçalho). Puro — devolve os logs sem gravar.
    const header = rows[0].map(h => h.trim().toLowerCase());
    const idx = name => header.indexOf(name);
    const out = [];
    let id = logs.length ? Math.max(...logs.map(l => l.id)) + 1 : 1;
    rows.slice(1).forEach(c => {
        const exercise = (idx('exercício') >= 0 ? c[idx('exercício')] : c[2]) || '';
        if (!exercise.trim()) return;
        const reps = [];
        for (let i = 1; i <= 5; i++) {
            const v = parseFloat(idx(`s${i}`) >= 0 ? c[idx(`s${i}`)] : c[3 + i]);
            if (!isNaN(v) && v > 0) reps.push(v);
        }
        const wStr = idx('carga registrada (kg)') >= 0 ? c[idx('carga registrada (kg)')] : c[3];
        const weight = parseFloat(String(wStr).replace(',', '.')) || 0;
        const confStr = idx('conferir?') >= 0 ? c[idx('conferir?')] : (c[7] || '');
        const conferir = /^(sim|s|true|1)/i.test(confStr.trim());
        const rirStr = idx('rir') >= 0 ? c[idx('rir')] : c[5];
        const rir = rirStr !== '' && rirStr != null && !isNaN(parseFloat(rirStr)) ? parseFloat(rirStr) : null;
        const obs = (idx('observações') >= 0 ? c[idx('observações')] : c[8]) || '';
        const sessao = (idx('sessão') >= 0 ? c[idx('sessão')] : c[1]) || '';
        out.push({
            id: id++, date: parseDateBRorISO(idx('data') >= 0 ? c[idx('data')] : c[0]), kind: 'peso',
            muscle: normalizeMuscle((catalogInfo(exercise) || {}).grupo || 'Geral'),
            sessao: sessao.trim(),
            exercise: exercise.trim(),
            type: (catalogInfo(exercise) || {}).tipo || inferExerciseType(exercise),
            weight, reps, sets: null, technique: 'Convencional', nextGoal: '',
            isPR: false, rir, conferir, notes: obs.trim()
        });
    });
    return out;
}

function importPlanilhaCSV(text) {
    // Suporta: multi-aba (--- Sheet: X ---) OU CSV simples antigo do app
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    const sheets = {};
    let current = '_single';
    lines.forEach(l => {
        const m = l.match(/^---\s*Sheet:\s*(.+?)\s*---/i);
        if (m) { current = m[1].toLowerCase(); sheets[current] = []; return; }
        if (!sheets[current]) sheets[current] = [];
        sheets[current].push(l);
    });

    if (sheets['log']) {
        const novos = parseSheetLogRows(parseCSVRows(sheets['log'].join('\n'), ';'));
        setLogs([...novos, ...logs]);
        const imported = novos.length;
        // Peso corporal
        if (sheets['peso corporal']) {
            parseCSVRows(sheets['peso corporal'].join('\n'), ';').slice(1).forEach(c => {
                const peso = parseFloat(String(c[1]).replace(',', '.'));
                if (peso) {
                    const date = parseDateBRorISO(c[0]);
                    setWeightLog(weightLog.filter(w => w.date !== date));
                    weightLog.push({ date, peso, obs: c[2] || '' });
                }
            });
        }
        // Início da semana 1
        const sem = sheets['semana a semana'] || [];
        const w1line = sem.find(l => /início da semana 1/i.test(l));
        if (w1line) {
            const v = parseCSVRows(w1line, ';')[0][1];
            if (v) setWeek1Start(parseDateBRorISO(v.trim()));
        }
        saveLogsToStorage();
        saveGameState();
        refreshAll();
        return alertModal(`✅ Planilha importada — ${imported} lançamentos (aba Log) + peso corporal + semana 1.`);
    }

    // CSV simples (formato antigo do app): data;tipo;grupo;exercicio;carga;series_reps;...
    const rows = parseCSVRows(lines.join('\n'), ';');
    let imported = 0;
    let id = logs.length ? Math.max(...logs.map(l => l.id)) + 1 : 1;
    rows.slice(1).forEach(c => {
        const exercise = c[3];
        if (!exercise) return;
        logs.push({
            id: id++, date: parseDateBRorISO(c[0]), kind: 'peso', muscle: normalizeMuscle(c[2] || 'Geral'),
            sessao: '', exercise, type: c[1] || inferExerciseType(exercise),
            weight: parseFloat(c[4]) || 0,
            reps: (c[5] || '').split(',').map(x => parseInt(x)).filter(x => !isNaN(x) && x > 0),
            sets: null, technique: c[6] || 'Convencional', nextGoal: '',
            isPR: false, rir: c[7] !== '' && c[7] != null ? parseInt(c[7]) : null, conferir: false, notes: c[10] || ''
        });
        imported++;
    });
    saveLogsToStorage();
    refreshAll();
    alertModal(`✅ CSV importado — ${imported} lançamentos.`);
}

// ============================================================
// ETAPA 5.1 — manifesto de exports (fundação para ES modules)
// Cada arquivo declara explicitamente a sua superfície pública.
// No carregamento clássico os globais continuam valendo; quando a
// migração para <script type="module"> acontecer, este bloco vira
// `export { ... }`.
// ============================================================
(function (g) {
    const exports_ = {
        historyView,
    switchHistoryView,
    historyFilteredLogs,
    histDataBR,
    metricaProgresso,
    histGrupoChipHTML,
    histSessaoDetalheHTML,
    renderHistory,
    historyLogHTML,
    historyProgressoHTML,
    getWeek1Start,
    setWeek1Start,
    historySemanasHTML,
    historyPesoHTML,
    addWeightLog,
    removeWeightLog,
    setBodyweightFromLog,
    drawVolumeChartMini,
    csvNum,
    buildPlanilhaCSV,
    exportCSV,
    parseDateBRorISO,
    importCSV,
    parseSheetLogRows,
    importPlanilhaCSV
    };
    g.__diarioExports = Object.assign(g.__diarioExports || {}, exports_);
    // Ações delegáveis (js/actions.js): toda função pública do módulo fica
    // disponível para os atributos data-action dos templates.
    const actionFns = {};
    Object.keys(exports_).forEach(k => { if (typeof exports_[k] === 'function') actionFns[k] = exports_[k]; });
    g.registerDiarioActions(actionFns);
    g.__diarioExportFiles = Object.assign(g.__diarioExportFiles || {}, { "js/historico.js": Object.keys(exports_).length });
})(typeof window !== 'undefined' ? window : globalThis);
export { historyView, switchHistoryView, historyFilteredLogs, histDataBR, metricaProgresso, histGrupoChipHTML, histSessaoDetalheHTML, renderHistory, historyLogHTML, historyProgressoHTML, getWeek1Start, setWeek1Start, historySemanasHTML, historyPesoHTML, addWeightLog, removeWeightLog, setBodyweightFromLog, drawVolumeChartMini, csvNum, buildPlanilhaCSV, exportCSV, parseDateBRorISO, importCSV, parseSheetLogRows, importPlanilhaCSV };
