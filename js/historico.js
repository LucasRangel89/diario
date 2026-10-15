import { dataISOValida } from './datas.js';
import { CATALOG_TIPOS, EXERCISE_CATALOG_FULL, catalogInfo, inferExerciseType, logCargaEfetiva, logFullMeta, logVolumeKg, normalizeMuscle, sinalProximaSessao } from './catalogo.js';
import { cardioXP } from './gamificacao.js';
import { getCustomExercises } from './custom_exercises.js';
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

// ============================================================
// CSV — formato da planilha (multi-aba, separador ;, datas dd/mm/aaaa)
// ------------------------------------------------------------
// FORMATO 2 (atual; aba "Formato" = 2). Compatível com o formato 1 (sem aba Formato):
//  - Aba Log: as 22 colunas originais, mesma ordem e mesmo significado, seguidas de
//    6 colunas NOVAS: ID do registro, Tipo de exercício, Grupo do registro, Técnica,
//    Meta da próxima sessão e Séries (JSON) — a série a série completa (pesos e reps
//    por série, inclusive drop-set). Arquivos antigos não têm essas colunas: as séries
//    são lidas de S1–S5 e a identidade é calculada pelo conteúdo (ver planejarImportacaoLogs).
//  - Coluna `PR (informativo)` (acrescentada ao formato 2, no fim da aba Log): é
//    INFORMATIVA. A importação NUNCA usa esse valor como fonte de verdade — os
//    registros importados entram com isPR = false e o PR é decidido pelo app
//    (detectAutoPR ao registrar) ou pelo flag manual do formulário. Motivo: PR
//    multiplica o dano do chefão por 2, soma XP_PR e cumpre missão semanal; aceitar
//    "PR = Sim" de um arquivo daria XP e gamificação de graça. A coluna é exportada
//    para leitura humana na planilha; quem lê é a versão nova (versões antigas
//    ignoram colunas desconhecidas, então o arquivo continua compatível).
//  - Aba Cardio (nova): corrida/cardio, separada do volume de musculação.
//  - Aba Formato (nova): versão do formato.
// Importáveis: data, sessão, exercício, carga, repetições/séries, RIR, Conferir?,
//   observações, ID, tipo, grupo, técnica, meta; cardio; peso corporal; início da semana 1.
// Calculadas (ignoradas na importação; o app recalcula): Unidade, Fator, Lados, Carga
//   efetiva, Total reps, Volume, Melhor/Menor série, 1RM Epley, Métrica de progresso;
//   abas Progresso e Semana a semana.
// Informativas (não reimportadas): aba Catálogo (referência do catálogo + personalizados).
// Campos com ; " ou quebra de linha são sempre entre aspas (csvField); aspas internas são dobradas.
// ============================================================
const CSV_FORMATO_VERSAO = 2;
const CSV_LOG_COLS_V1 = ['Data', 'Sessão', 'Exercício', 'Carga registrada (kg)', 'S1', 'S2', 'S3', 'S4', 'S5', 'RIR', 'Conferir?', 'Observações', 'Unidade', 'Fator', 'Lados', 'Carga efetiva (kg)', 'Total reps (ou segundos)', 'Volume (kg)', 'Melhor série', 'Menor série', '1RM Epley (kg)', 'Métrica de progresso'];
const CSV_LOG_COLS = [...CSV_LOG_COLS_V1, 'ID do registro', 'Tipo de exercício', 'Grupo do registro', 'Técnica', 'Meta da próxima sessão', 'Séries (JSON)', 'PR (informativo)'];
const CSV_CARDIO_COLS = ['Data', 'Modalidade', 'Distância (km)', 'Duração (min)', 'Observações', 'ID do registro'];
const CSV_PESO_COLS = ['Data', 'Peso (kg)', 'Observação'];

// Serialização de um campo: aspas quando há ; " ou quebra de linha; aspas internas dobradas.
function csvField(v) {
    const s = (v == null) ? '' : String(v);
    if (/[;"\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
}
function csvNum(n) {
    return (n == null || isNaN(n)) ? '' : String(+n.toFixed(2));
}
function csvTexto(s) {
    return String(s == null ? '' : s).replace(/\r\n?/g, '\n');
}
// Número lido de célula: aceita vírgula decimal; null se vazio ou inválido.
function csvNumeroLido(s) {
    const t = String(s == null ? '' : s).trim().replace(',', '.');
    if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
    return Number(t);
}
// dd/mm/aaaa ou aaaa-mm-dd → ISO válido; null se a data não existir no calendário.
// A conferência de calendário é a regra única de js/datas.js (dataISOValida): a
// mesma que valida backups e registros, para o CSV não aceitar 31/02 que o resto rejeita.
function parseDataCSV(s) {
    const t = String(s == null ? '' : s).trim();
    let y, m, d, mm = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
    if (mm) { d = +mm[1]; m = +mm[2]; y = +mm[3]; }
    else {
        mm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
        if (!mm) return null;
        y = +mm[1]; m = +mm[2]; d = +mm[3];
    }
    if (!dataISOValida(y, m, d)) return null;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// Identidade estável de um registro exportado: o ID importado, ou 'L' + id local.
function csvLogId(l) {
    return l.externalId || ('L' + l.id);
}
// Séries completas, sem perda (drop-set, pesos diferentes, reps decimais em isometria).
function csvSeriesJSON(l) {
    const comSets = Array.isArray(l.sets) && l.sets.length > 0;
    const series = comSets
        ? l.sets.map(s => ({ weight: Number(s.weight) || 0, reps: Number(s.reps) || 0 }))
        : (Array.isArray(l.reps) ? l.reps.map(r => ({ weight: Number(l.weight) || 0, reps: Number(r) || 0 })) : []);
    return JSON.stringify({ modo: comSets ? 'sets' : 'simples', series });
}
function csvLogRow(l) {
    const meta = logFullMeta(l);
    const reps = l.reps || [];
    return [
        histDataBR(l.date), l.sessao || '', l.exercise || '', csvNum(Number(l.weight) || 0),
        csvNum(reps[0]), csvNum(reps[1]), csvNum(reps[2]), csvNum(reps[3]), csvNum(reps[4]),
        l.rir != null ? l.rir : '', l.conferir ? 'Sim' : 'Não', csvTexto(l.notes),
        meta.unidade, meta.fator, meta.lados,
        csvNum(meta.cargaEfetiva), csvNum(meta.totalReps), csvNum(meta.volume),
        csvNum(meta.bestSet), csvNum(meta.worstSet), meta.est1RM != null ? csvNum(meta.est1RM) : '',
        meta.unidade === 'seg' ? csvNum(meta.bestSet) : csvNum(meta.cargaEfetiva),
        csvLogId(l), l.type || '', l.muscle || '', l.technique || '', l.nextGoal || '', csvSeriesJSON(l),
        l.isPR ? 'Sim' : 'Não'   // informativo: a importação ignora (ver docs/FORMATO_CSV.md)
    ];
}
function csvCardioRow(l) {
    return [histDataBR(l.date), l.exercise || '', csvNum(Number(l.distanceKm) || 0), csvNum(Number(l.durationMin) || 0), csvTexto(l.notes), csvLogId(l)];
}

// Impressão digital do conteúdo de um registro (sem técnica/meta, que são metadados).
// Usada para detectar duplicatas legítimas e conflitos. Observações: espaços normalizados,
// porque o formato 1 trocava quebras de linha por espaço.
function csvLogFingerprint(l) {
    const r2 = v => (v == null || v === '' || !isFinite(Number(v))) ? '' : String(+Number(v).toFixed(2));
    const sets = Array.isArray(l.sets) && l.sets.length ? l.sets.map(s => [r2(s.weight), r2(s.reps)]) : null;
    const reps = Array.isArray(l.reps) ? l.reps.map(r2) : [];
    return JSON.stringify([
        l.kind === 'corrida' ? 'corrida' : 'peso', l.date || '', String(l.exercise || '').trim(), String(l.sessao || '').trim(),
        r2(l.weight), reps, sets, r2(l.rir), !!l.conferir, String(l.notes || '').replace(/\s+/g, ' ').trim(),
        r2(l.distanceKm), r2(l.durationMin)
    ]);
}

function buildPlanilhaCSV() {
    // Texto multi-aba completo no formato da planilha (para export e para o arquivo do repositório)
    const parts = [];
    const pesoLogs = logs.filter(l => l.kind !== 'corrida').slice().sort((a, b) => a.date.localeCompare(b.date));

    // --- Sheet: Log ---
    parts.push('--- Sheet: Log ---');
    parts.push(CSV_LOG_COLS.map(csvField).join(';'));
    pesoLogs.forEach(l => parts.push(csvLogRow(l).map(csvField).join(';')));

    // --- Sheet: Catálogo (catálogo principal + exercícios personalizados) ---
    const CAT_COLS = ['Exercício', 'Grupo', 'Equipamento', 'Como registrar', 'Fator', 'Lados', 'Unidade', 'Reps mín.', 'Reps máx.', 'Extra estimado (kg)', 'Faixa do extra (kg)', 'Observações'];
    parts.push('--- Sheet: Catálogo ---');
    parts.push(CAT_COLS.map(csvField).join(';'));
    const catalogoCompleto = [...EXERCISE_CATALOG_FULL];
    try {
        const custom = (typeof getCustomExercises === 'function') ? getCustomExercises() : [];
        if (Array.isArray(custom)) catalogoCompleto.push(...custom);
    } catch (e) { /* sem personalizados */ }
    catalogoCompleto.sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''))).forEach(c => {
        if (c.tipo === 'corrida' || c.type === 'corrida') return;
        const como = c.como || (CATALOG_TIPOS[c.tipo] ? CATALOG_TIPOS[c.tipo].label : '') || c.tipo || '';
        parts.push([c.nome, c.grupo, c.equipamento, como, c.fator, c.lados, c.unidade,
        c.faixa ? c.faixa[0] : '', c.faixa ? c.faixa[1] : '', c.extra || '', c.extraFaixa || '', csvTexto(c.obs).replace(/[\r\n]+/g, ' ')].map(csvField).join(';'));
    });

    // --- Sheet: Progresso ---
    parts.push('--- Sheet: Progresso ---');
    parts.push(['Exercício', 'Grupo', 'Sessões', '1ª data', 'Última data', 'Carga 1ª (kg)', 'Carga última (kg)', 'Δ%', 'Carga efetiva última', 'Melhor série última', '1RM est. última', 'Faixa alvo', 'Sinal'].map(csvField).join(';'));
    const byEx = new Map();
    pesoLogs.forEach(l => {
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
        sinalProximaSessao(last)].map(csvField).join(';'));
    });

    // --- Sheet: Semana a semana ---
    parts.push('--- Sheet: Semana a semana ---');
    parts.push(['Início da semana 1 (segunda-feira)', histDataBR(getWeek1Start())].map(csvField).join(';'));
    const w1 = getWeek1Start();
    const start = new Date(w1 + 'T12:00:00');
    const weeks = [];
    for (let i = 0; i < 12; i++) {
        const s = new Date(start); s.setDate(start.getDate() + i * 7);
        const e = new Date(s); e.setDate(s.getDate() + 6);
        weeks.push({ isoS: s.toISOString().slice(0, 10), isoE: e.toISOString().slice(0, 10) });
    }
    parts.push(['Semana', ...weeks.map((w, i) => `Sem ${i + 1}`)].map(csvField).join(';'));
    parts.push(['Início', ...weeks.map(w => histDataBR(w.isoS))].map(csvField).join(';'));
    parts.push(['Volume total (kg)', ...weeks.map(w => csvNum(pesoLogs.filter(l => l.date >= w.isoS && l.date <= w.isoE).reduce((a, l) => a + logVolumeKg(l), 0)))].map(csvField).join(';'));
    [...byEx.keys()].sort().forEach(ex => {
        parts.push([`Carga efetiva máxima (kg) — ${ex}`, ...weeks.map(w => {
            const max = pesoLogs.filter(l => l.exercise === ex && l.date >= w.isoS && l.date <= w.isoE).reduce((a, l) => Math.max(a, logCargaEfetiva(l)), 0);
            return max ? csvNum(max) : '';
        })].map(csvField).join(';'));
    });

    // --- Sheet: Peso corporal ---
    parts.push('--- Sheet: Peso corporal ---');
    parts.push(CSV_PESO_COLS.map(csvField).join(';'));
    weightLog.slice().sort((a, b) => a.date.localeCompare(b.date)).forEach(w => {
        parts.push([histDataBR(w.date), csvNum(w.peso), csvTexto(w.obs)].map(csvField).join(';'));
    });

    // --- Sheet: Cardio (corrida/cardio fora do volume de musculação) ---
    parts.push('--- Sheet: Cardio ---');
    parts.push(CSV_CARDIO_COLS.map(csvField).join(';'));
    logs.filter(l => l.kind === 'corrida').slice().sort((a, b) => a.date.localeCompare(b.date)).forEach(l => {
        parts.push(csvCardioRow(l).map(csvField).join(';'));
    });

    // --- Sheet: Formato ---
    parts.push('--- Sheet: Formato ---');
    parts.push(['Versão do formato', CSV_FORMATO_VERSAO].map(csvField).join(';'));

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

// Separa o texto em abas. Usa o parser com aspas (campos com quebra de linha
// ficam inteiros). Linhas totalmente vazias são descartadas.
function csvSplitSheets(text) {
    const rows = parseCSVRows(text, ';');
    const sheets = {};
    let current = '_single';
    rows.forEach(r => {
        const unica = r.length === 1 ? String(r[0] || '').trim() : '';
        const m = unica.match(/^---\s*Sheet:\s*(.+?)\s*---$/i);
        if (m) { current = m[1].trim().toLowerCase(); if (!sheets[current]) sheets[current] = []; return; }
        if (r.every(c => String(c == null ? '' : c).trim() === '')) return;
        if (!sheets[current]) sheets[current] = [];
        sheets[current].push(r);
    });
    return sheets;
}

function csvCabecalho(headerRow) {
    const h = (headerRow || []).map(x => String(x == null ? '' : x).trim().toLowerCase());
    return { h, col: nome => h.indexOf(String(nome).toLowerCase()) };
}
function csvCelula(c, col, nome) {
    const k = col(nome);
    return k >= 0 && c[k] != null ? String(c[k]) : '';
}
function csvErroTexto(e) {
    return `${e.aba ? e.aba + (e.registro ? ', registro ' + e.registro : '') + ': ' : ''}${e.msg}`;
}

// Aba Log (formato 1 ou 2). Pura: devolve { logs, erros }; não grava nada.
// Parâmetro: rows = linhas parseadas, com o cabeçalho na primeira posição.
function analisarLinhasLog(rows) {
    const erros = [], out = [];
    if (!rows || rows.length < 2) return { logs: out, erros };
    const { h, col } = csvCabecalho(rows[0]);
    const faltando = ['data', 'exercício', 'carga registrada (kg)'].filter(n => col(n) < 0);
    if (faltando.length) {
        erros.push({ aba: 'Log', registro: 1, msg: `cabeçalho sem as colunas obrigatórias: ${faltando.join(', ')}` });
        return { logs: out, erros };
    }
    const v2 = col('id do registro') >= 0 || col('séries (json)') >= 0;
    rows.slice(1).forEach((c, i) => {
        const registro = i + 2;
        const cel = nome => csvCelula(c, col, nome);
        const erro = msg => erros.push({ aba: 'Log', registro, msg });
        if (c.length > h.length) return erro(`${c.length} colunas, mas o cabeçalho tem ${h.length} (campo com ";" sem aspas?)`);
        const exercise = cel('exercício').trim();
        if (!exercise) return erro('exercício vazio');
        const date = parseDataCSV(cel('data'));
        if (!date) return erro(`data inválida "${cel('data')}"`);
        let weight = csvNumeroLido(cel('carga registrada (kg)'));
        if (weight == null || weight < 0) return erro(`carga inválida "${cel('carga registrada (kg)')}"`);
        let reps = [], sets = null;
        const jsonTxt = v2 ? cel('séries (json)').trim() : '';
        if (jsonTxt) {
            let obj = null;
            try { obj = JSON.parse(jsonTxt); } catch (e) { return erro('Séries (JSON) não é JSON válido'); }
            const serie = obj && Array.isArray(obj.series) ? obj.series : null;
            const valida = serie && serie.every(s => s && typeof s === 'object' && Number.isFinite(s.weight) && s.weight >= 0 && Number.isFinite(s.reps) && s.reps > 0);
            if (!valida) return erro('Séries (JSON) com carga ou repetições inválidas');
            reps = serie.map(s => s.reps);
            if (obj.modo === 'sets') sets = serie.map(s => ({ weight: s.weight, reps: s.reps }));
            if (serie.length) weight = serie[0].weight;
        } else {
            for (let k = 1; k <= 5; k++) {
                const raw = cel(`s${k}`).trim();
                if (!raw) continue;
                const v = csvNumeroLido(raw);
                if (v == null || v <= 0) return erro(`repetições inválidas em S${k}: "${raw}"`);
                reps.push(v);
            }
        }
        const rirRaw = cel('rir').trim();
        let rir = null;
        if (rirRaw !== '') {
            rir = csvNumeroLido(rirRaw);
            if (rir == null || rir < 0) return erro(`RIR inválido "${rirRaw}"`);
        }
        const catItem = catalogInfo(exercise);
        const grupoCol = v2 ? cel('grupo do registro').trim() : '';
        const tipoCol = v2 ? cel('tipo de exercício').trim() : '';
        out.push({
            id: 0, date, kind: 'peso',
            muscle: normalizeMuscle((catItem && catItem.grupo) || grupoCol || 'Geral'),
            sessao: cel('sessão').trim(), exercise,
            type: (catItem && catItem.tipo) || tipoCol || inferExerciseType(exercise),
            weight, reps, sets,
            technique: (v2 && cel('técnica').trim()) || 'Convencional',
            nextGoal: v2 ? cel('meta da próxima sessão').trim() : '',
            // Coluna "PR (informativo)": deliberadamente NÃO lida. Aceitar "Sim" do
            // arquivo daria XP (XP_PR), crítico no chefão e missão de PR sem treino.
            isPR: false, rir,
            conferir: /^(sim|s|true|1)/i.test(cel('conferir?').trim()),
            notes: csvTexto(cel('observações')).trim(),
            externalId: v2 ? (cel('id do registro').trim() || null) : null
        });
    });
    return { logs: out, erros };
}

// Compatível com chamadas antigas: devolve só os lançamentos válidos.
function parseSheetLogRows(rows) {
    return analisarLinhasLog(rows).logs;
}

function analisarLinhasCardio(rows) {
    const erros = [], out = [];
    if (!rows || rows.length < 2) return { logs: out, erros };
    const { col } = csvCabecalho(rows[0]);
    const faltando = ['data', 'modalidade'].filter(n => col(n) < 0);
    if (faltando.length) { erros.push({ aba: 'Cardio', registro: 1, msg: `cabeçalho sem as colunas obrigatórias: ${faltando.join(', ')}` }); return { logs: out, erros }; }
    rows.slice(1).forEach((c, i) => {
        const registro = i + 2;
        const cel = nome => csvCelula(c, col, nome);
        const erro = msg => erros.push({ aba: 'Cardio', registro, msg });
        const date = parseDataCSV(cel('data'));
        if (!date) return erro(`data inválida "${cel('data')}"`);
        const exercise = cel('modalidade').trim();
        if (!exercise) return erro('modalidade vazia');
        const num = nome => {
            const raw = cel(nome).trim();
            if (raw === '') return 0;
            const v = csvNumeroLido(raw);
            return (v == null || v < 0) ? NaN : v;
        };
        const distanceKm = num('distância (km)'), durationMin = num('duração (min)');
        if (!Number.isFinite(distanceKm)) return erro(`distância inválida "${cel('distância (km)')}"`);
        if (!Number.isFinite(durationMin)) return erro(`duração inválida "${cel('duração (min)')}"`);
        if (distanceKm <= 0 && durationMin <= 0) return erro('informe distância e/ou duração');
        out.push({
            id: 0, date, kind: 'corrida', muscle: 'Cardio', exercise, distanceKm, durationMin,
            notes: csvTexto(cel('observações')).trim(), technique: 'Convencional',
            isPR: false,   // cardio: PR de distância também é decidido pelo app, não pelo arquivo
            nextGoal: '', type: 'corrida', reps: [], externalId: cel('id do registro').trim() || null
        });
    });
    return { logs: out, erros };
}

function analisarLinhasPeso(rows) {
    const erros = [], out = [];
    if (!rows || rows.length < 2) return { pesos: out, erros };
    const { col } = csvCabecalho(rows[0]);
    rows.slice(1).forEach((c, i) => {
        const registro = i + 2;
        const cel = nome => csvCelula(c, col, nome);
        const erro = msg => erros.push({ aba: 'Peso corporal', registro, msg });
        const date = parseDataCSV(cel('data'));
        if (!date) return erro(`data inválida "${cel('data')}"`);
        const peso = csvNumeroLido(cel('peso (kg)'));
        if (peso == null || peso <= 0) return erro(`peso inválido "${cel('peso (kg)')}"`);
        out.push({ date, peso, obs: csvTexto(cel('observação')).trim() });
    });
    return { pesos: out, erros };
}

// Formato 1 (sem abas): data;tipo;grupo;exercicio;carga;series_reps;tecnica;rir;...;observações(c[10])
function analisarCSVSimples(rows) {
    const erros = [], out = [];
    const cab = (rows && rows[0]) || [];
    const cabOk = /data/i.test(String(cab[0] || '')) && /exerc/i.test(String(cab[3] || ''));
    if (!cabOk) {
        erros.push({ msg: 'arquivo sem a aba "Log" e cabeçalho que não é o formato simples (data;tipo;grupo;exercício;…)' });
        return { logs: out, erros };
    }
    (rows || []).slice(1).forEach((c, i) => {
        const registro = i + 2;
        const erro = msg => erros.push({ aba: 'CSV simples', registro, msg });
        const exercise = String(c[3] || '').trim();
        if (!exercise) return;
        const date = parseDataCSV(c[0]);
        if (!date) return erro(`data inválida "${c[0] || ''}"`);
        const weight = csvNumeroLido(c[4]);
        if (weight == null || weight < 0) return erro(`carga inválida "${c[4] || ''}"`);
        const reps = [];
        for (const tok of String(c[5] || '').split(',')) {
            const t = tok.trim();
            if (!t) continue;
            const v = csvNumeroLido(t);
            if (v == null || v <= 0) return erro(`repetições inválidas "${t}"`);
            reps.push(v);
        }
        let rir = null;
        if (c[7] !== '' && c[7] != null) {
            rir = csvNumeroLido(c[7]);
            if (rir == null || rir < 0) return erro(`RIR inválido "${c[7]}"`);
        }
        const catItem = catalogInfo(exercise);
        out.push({
            id: 0, date, kind: 'peso', muscle: normalizeMuscle(c[2] || 'Geral'), sessao: '', exercise,
            type: String(c[1] || '').trim() || (catItem && catItem.tipo) || inferExerciseType(exercise),
            weight, reps, sets: null, technique: String(c[6] || '').trim() || 'Convencional', nextGoal: '',
            // CSV simples (formato 1, sem ID): PR nunca vem do arquivo — o app decide.
            isPR: false, rir, conferir: false, notes: csvTexto(c[10]).trim(), externalId: null
        });
    });
    return { logs: out, erros };
}

// Lê o texto inteiro SEM gravar nada. Devolve { modo, logs, cardio incluído em logs, pesos, semana1, erros }.
function lerPlanilhaCSV(text) {
    const erros = [];
    const sheets = csvSplitSheets(text);
    const res = { modo: 'v1', logs: [], pesos: [], semana1: null, erros };
    if (sheets['log']) {
        // Aba Formato: uma linha "Versão do formato;N" (casada pela etiqueta, não pela posição).
        const linhaVersao = (sheets['formato'] || []).find(r => /versão do formato/i.test(String(r[0] || '')));
        if (linhaVersao) {
            const versao = csvNumeroLido(linhaVersao[1]);
            if (versao == null || versao > CSV_FORMATO_VERSAO) erros.push({ aba: 'Formato', msg: `versão ${linhaVersao[1]} não suportada (máximo ${CSV_FORMATO_VERSAO})` });
            else res.modo = 'v' + versao;
        }
        const l = analisarLinhasLog(sheets['log']);
        erros.push(...l.erros); res.logs.push(...l.logs);
        if (sheets['cardio']) {
            const c = analisarLinhasCardio(sheets['cardio']);
            erros.push(...c.erros); res.logs.push(...c.logs);
        }
        if (sheets['peso corporal']) {
            const p = analisarLinhasPeso(sheets['peso corporal']);
            erros.push(...p.erros); res.pesos = p.pesos;
        }
        const sem = sheets['semana a semana'] || [];
        const w1 = sem.find(r => /início da semana 1/i.test(String(r[0] || '')));
        if (w1 && String(w1[1] || '').trim()) {
            const d = parseDataCSV(w1[1]);
            if (d) res.semana1 = d;
            else erros.push({ aba: 'Semana a semana', msg: `início da semana 1 inválido "${w1[1]}"` });
        }
    } else if (sheets['_single']) {
        const s = analisarCSVSimples(sheets['_single']);
        erros.push(...s.erros); res.logs.push(...s.logs);
    } else {
        erros.push({ msg: 'arquivo sem a aba "Log" nem linhas no formato simples' });
    }
    return res;
}

// Deduplicação. Estratégia (documentada em docs/FORMATO_CSV.md):
//  1) Registro com ID (formato 2): o ID é a identidade. Mesmo ID + mesmo conteúdo → já existente
//     (ignorado). Mesmo ID + conteúdo diferente → CONFLITO (não sobrescreve, é reportado).
//  2) Registro sem ID (formato 1 ou CSV de outra origem): identidade = conteúdo. Como dois
//     treinos iguais podem ser legítimos, conta-se a ocorrência: se o arquivo traz 2 idênticos e o
//     app já tem 2, nenhum é importado; se o app tem 1, importa-se 1.
// Função pura: não altera 'existentes' nem grava nada.
function planejarImportacaoLogs(novos, existentes) {
    const porId = new Map();
    const contagemPorConteudo = new Map();
    (existentes || []).forEach(l => {
        porId.set(csvLogId(l), l);
        const fp = csvLogFingerprint(l);
        contagemPorConteudo.set(fp, (contagemPorConteudo.get(fp) || 0) + 1);
    });
    const plano = { novos: [], iguais: 0, conflitos: [] };
    const idsNoArquivo = new Map();
    const ocorrenciasNoArquivo = new Map();
    (novos || []).forEach(n => {
        const fp = csvLogFingerprint(n);
        if (n.externalId) {
            const jaNoApp = porId.get(n.externalId) || null;
            const jaNoArquivo = idsNoArquivo.has(n.externalId) ? { fp: idsNoArquivo.get(n.externalId) } : null;
            const referencia = jaNoApp ? csvLogFingerprint(jaNoApp) : (jaNoArquivo ? jaNoArquivo.fp : null);
            if (referencia !== null) {
                if (referencia === fp) plano.iguais++;
                else plano.conflitos.push(n);
                return;
            }
            idsNoArquivo.set(n.externalId, fp);
            plano.novos.push(n);
            return;
        }
        const k = (ocorrenciasNoArquivo.get(fp) || 0) + 1;
        ocorrenciasNoArquivo.set(fp, k);
        if (k <= (contagemPorConteudo.get(fp) || 0)) plano.iguais++;
        else plano.novos.push(n);
    });
    return plano;
}

// Importação: valida tudo ANTES. Se houver qualquer erro, nada é alterado.
function importPlanilhaCSV(text) {
    const lido = lerPlanilhaCSV(text);
    if (lido.erros.length) {
        const amostra = lido.erros.slice(0, 5).map(e => '• ' + csvErroTexto(e)).join('\n');
        const mais = lido.erros.length > 5 ? `\n… e mais ${lido.erros.length - 5}` : '';
        return alertModal(`❌ Planilha não importada — nada foi alterado. ${lido.erros.length} problema(s): ${amostra.replace(/\n/g, ' ')}${mais}`);
    }
    if (!lido.logs.length && !lido.pesos.length && !lido.semana1) {
        return alertModal('ℹ️ Nenhum lançamento encontrado na planilha.');
    }
    const plano = planejarImportacaoLogs(lido.logs, logs);
    let proximoId = logs.length ? Math.max(...logs.map(l => l.id)) + 1 : 1;
    plano.novos.forEach(l => { l.id = proximoId++; });

    // Peso corporal: uma pesagem por data (como antes); substituições são contadas.
    let pesosNovos = 0, pesosSubstituidos = 0;
    lido.pesos.forEach(p => {
        const atual = weightLog.find(w => w.date === p.date);
        if (atual && atual.peso === p.peso && (atual.obs || '') === p.obs) return;
        if (atual) pesosSubstituidos++; else pesosNovos++;
        setWeightLog(weightLog.filter(w => w.date !== p.date));
        weightLog.push({ date: p.date, peso: p.peso, obs: p.obs });
    });
    if (lido.semana1) setWeek1Start(lido.semana1);

    setLogs([...plano.novos, ...logs]);
    const okLogs = saveLogsToStorage();
    const okShared = saveGameState();
    refreshAll();

    const novosCardio = plano.novos.filter(l => l.kind === 'corrida').length;
    const resumo = `${plano.novos.length - novosCardio} treino(s) e ${novosCardio} cardio novo(s); ${plano.iguais} já existente(s) ignorado(s); ${plano.conflitos.length} conflito(s) não importado(s)`;
    const extraPeso = `peso: ${pesosNovos} novo(s), ${pesosSubstituidos} substituído(s)`;
    if (!okLogs || !okShared) {
        return alertModal(`⚠️ Planilha lida (${resumo}), mas o navegador não confirmou o salvamento. Exporte um backup JSON agora.`);
    }
    if (plano.conflitos.length) {
        const ex = plano.conflitos.slice(0, 2).map(l => `${l.exercise} (${histDataBR(l.date)})`).join(', ');
        return alertModal(`⚠️ Importado: ${resumo}. Conflitos: ${ex}${plano.conflitos.length > 2 ? '…' : ''} — o registro existente foi mantido.`);
    }
    return alertModal(`✅ Planilha importada — ${resumo}; ${extraPeso}.`);
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
