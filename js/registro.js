/* ============================================================
   REGISTRO — formulário do dia, histórico do dia e mapa de prontidão
   ------------------------------------------------------------
   Formulário de registro (tipo de carga, séries, autofill), "última vez" e
   repetir, adicionar/editar registro, tabela de registros do dia, mapa de
   prontidão estimada, sugestão do dia e cardio — estavam em js/app.js.
   deleteLog continua no app: ele reatribui `logs` (estado de topo).

   Dividido de js/app.js na refatoração R2 (rodada 2) — as declarações
   foram movidas sem alterar uma linha de lógica (corpos byte a byte
   idênticos). O estado de topo continua em js/app.js e é lido aqui por
   import (binding vivo); nenhuma função deste arquivo reatribui binding
   importado.
   ============================================================ */

import { CATALOG_TIPOS, MUSCULOS_MAPA, catalogInfo, detectAutoPR, duplaProgressao, formatLoadText, formatRepsText, inferExerciseType, logTstSeconds, logVolumeKg, normalizeMuscle, sinergiaState } from './catalogo.js';
import { cardioXP } from './gamificacao.js';
import { formatRunDuration, formatRunPace, paceSecondsPerKm, parseRunDuration } from './corridas.js';
import { fatigueState, regiaoLombarState, suggestNextWorkout, weeklySetsByMuscle } from './assistente.js';
import { renderExerciseTagLine } from './busca.js';
import { generateStoryCard } from './cartoes.js';
import { saveLogsToStorage } from './persistencia.js';
import { renderSession, spawnDamageFloat } from './sessao.js';
import { renderBossBattleUI } from './boss.js';
import { INP, LBL, MUSCLE_OPTIONS, NEXT_GOALS, TECHNIQUES, activeGameThemeId, activeSession, alertModal, escapeHtml, fmtN, formatShortBR, getTodayLocalISO, logs, refreshAll, savedWorkouts, setEditorState, shakeElement, updateSummaryMetrics, userBodyweight } from './app.js';

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

const RUN_TYPE_OPTIONS = [
    ['leve', 'Leve'], ['longo', 'Longo'], ['intervalado', 'Intervalado'],
    ['ritmo/limiar', 'Ritmo/limiar'], ['prova', 'Prova'], ['regenerativo', 'Regenerativo'], ['outro', 'Outro']
];
const CARDIO_MODALITIES = ['Corrida (Rua)', 'Corrida (Esteira)', 'Bike / Ergométrico', 'Elíptico', 'Remo (Ergômetro)'];

function editRunLog(log) {
    document.getElementById('edit-log-overlay')?.remove();
    const exercise = String(log.exercise || 'Corrida (Rua)');
    const modalities = CARDIO_MODALITIES.includes(exercise) ? CARDIO_MODALITIES : [...CARDIO_MODALITIES, exercise];
    const runType = RUN_TYPE_OPTIONS.map(([value, label]) => `<option value="${value}"${value === log.runType ? ' selected' : ''}>${label}</option>`).join('');
    const modalityOptions = modalities.map(value => `<option value="${escapeHtml(value)}"${value === exercise ? ' selected' : ''}>${escapeHtml(value)}</option>`).join('');
    const overlay = document.createElement('div');
    overlay.id = 'edit-log-overlay';
    overlay.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-start sm:items-center justify-center p-4 overflow-y-auto';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Editar corrida');
    overlay.innerHTML = `
        <div class="bg-berzerker-card border border-berzerker-border rounded-2xl p-5 max-w-lg w-full shadow-2xl">
            <h3 class="font-oswald text-lg font-bold text-white uppercase tracking-wider mb-3">✏️ Editar corrida</h3>
            <div class="grid grid-cols-2 gap-3">
                <div><label for="er-date" class="${LBL}">Data</label><input id="er-date" type="date" value="${escapeHtml(log.date || '')}" class="${INP} min-h-[44px]"></div>
                <div><label for="er-exercise" class="${LBL}">Modalidade</label><select id="er-exercise" class="${INP} min-h-[44px]">${modalityOptions}</select></div>
                <div><label for="er-distance" class="${LBL}">Distância (km)</label><input id="er-distance" type="number" min="0" step="0.01" value="${Number(log.distanceKm) || ''}" class="${INP} min-h-[44px]"></div>
                <div><label for="er-duration" class="${LBL}">Tempo (h:mm:ss)</label><input id="er-duration" type="text" inputmode="numeric" placeholder="00:24:37" value="${escapeHtml(Number(log.durationMin) > 0 ? formatRunDuration(log.durationMin) : '')}" class="${INP} min-h-[44px]" data-input-action="updateRunEditPace"></div>
                <div class="col-span-2 rounded-lg border border-cyan-700/30 bg-berzerker-dark px-3 py-2 text-sm text-cyan-300">Pace médio da corrida: <strong id="er-pace">—</strong></div>
                <div><label for="er-run-type" class="${LBL}">Tipo de corrida (opcional)</label><select id="er-run-type" class="${INP} min-h-[44px]"><option value="">Não informado</option>${runType}</select></div>
                <div><label for="er-rpe" class="${LBL}">RPE (1–10, opcional)</label><input id="er-rpe" type="number" min="1" max="10" step="1" value="${log.rpe ?? ''}" class="${INP} min-h-[44px]"></div>
                <div><label for="er-hr-avg" class="${LBL}">FC média (bpm, opcional)</label><input id="er-hr-avg" type="number" min="1" step="1" value="${log.hrAvg ?? ''}" class="${INP} min-h-[44px]"></div>
                <div><label for="er-shoe" class="${LBL}">Tênis (opcional)</label><input id="er-shoe" type="text" value="${escapeHtml(log.shoe || '')}" class="${INP} min-h-[44px]"></div>
                <div class="col-span-2"><label for="er-notes" class="${LBL}">Observações</label><textarea id="er-notes" rows="3" class="${INP}">${escapeHtml(log.notes || '')}</textarea></div>
            </div>
            <div class="flex gap-3 justify-end mt-4">
                <button type="button" data-action="closeElementById" data-args='["edit-log-overlay"]' class="px-4 py-2 bg-berzerker-border hover:bg-gray-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors">Cancelar</button>
                <button type="button" data-action="saveEditedRunLog" data-args="[${log.id}]" class="px-4 py-2 bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors">💾 Salvar corrida</button>
            </div>
        </div>`;
    overlay.addEventListener('click', event => { if (event.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
    updateRunEditPace();
}

function updateRunEditPace() {
    const pace = document.getElementById('er-pace');
    if (!pace) return;
    const distance = Number(String(document.getElementById('er-distance')?.value || '').replace(',', '.'));
    const duration = parseRunDuration(document.getElementById('er-duration')?.value);
    const seconds = duration == null ? null : paceSecondsPerKm(duration, distance);
    pace.textContent = seconds == null ? '—' : formatRunPace(seconds);
}

function saveEditedRunLog(id) {
    const log = logs.find(item => item.id === id);
    if (!log || log.kind !== 'corrida') return;
    const durationText = document.getElementById('er-duration').value.trim();
    const durationMin = durationText ? parseRunDuration(durationText) : 0;
    const distanceText = document.getElementById('er-distance').value.trim().replace(',', '.');
    const distanceKm = distanceText ? Number(distanceText) : 0;
    if (durationMin == null) { alertModal('Informe o tempo como h:mm:ss, mm:ss ou minutos decimais.'); return; }
    if (!Number.isFinite(distanceKm) || distanceKm < 0 || (distanceKm <= 0 && durationMin <= 0)) { alertModal('Informe uma distância e/ou tempo válidos.'); return; }
    const readOptionalNumber = id => {
        const value = document.getElementById(id).value.trim();
        return value ? Number(value) : null;
    };
    const runType = document.getElementById('er-run-type').value;
    const rpe = readOptionalNumber('er-rpe');
    const hrAvg = readOptionalNumber('er-hr-avg');
    const shoe = document.getElementById('er-shoe').value.trim();
    Object.assign(log, {
        date: document.getElementById('er-date').value || log.date,
        exercise: document.getElementById('er-exercise').value,
        distanceKm,
        durationMin,
        notes: document.getElementById('er-notes').value.trim(),
        kind: 'corrida', muscle: 'Cardio', type: 'corrida'
    });
    // D6 é aditivo e opcional. As validações de backup/CSV permanecem em B4.
    if (runType) log.runType = runType; else delete log.runType;
    if (rpe != null) log.rpe = rpe; else delete log.rpe;
    if (hrAvg != null) log.hrAvg = hrAvg; else delete log.hrAvg;
    if (shoe) log.shoe = shoe; else delete log.shoe;
    // Remove apenas a poluição conhecida da edição antiga de musculação; campos
    // desconhecidos, id, tema e demais dados do registro ficam intactos.
    ['weight', 'reps', 'mode', 'perSide', 'rir', 'sessao', 'conferir', 'sets', 'repsText', 'technique', 'nextGoal', 'biset'].forEach(key => delete log[key]);
    log.isPR = detectAutoPR(log, logs, userBodyweight);
    saveLogsToStorage();
    document.getElementById('edit-log-overlay')?.remove();
    const filter = document.getElementById('filter-date');
    if (filter) filter.value = log.date;
    refreshAll();
    renderSession();
    alertModal('✅ Corrida atualizada!');
}

function editLog(id) {
    const l = logs.find(x => x.id === id);
    if (!l) { alertModal('Registro não encontrado.'); return; }
    if (l.kind === 'corrida') { editRunLog(l); return; }
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
                    ${l.isPR ? `<span class="text-xs font-bold px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded">${l.kind === 'corrida' ? '🏆 PR de distância' : '🏆 PR (1RM auto)'}</span>` : ''}
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

// ============================================================
// Manifesto de exports (mesmo padrão dos outros módulos em js/).
// ============================================================
(function (g) {
    const exports_ = {
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
        saveEditedRunLog,
        updateRunEditPace,
        handleFilterDateChange,
        getFilteredLogs,
        renderLogsTable,
        renderRecoveryMap,
        prefillMuscleFromMap,
        renderDaySuggestion,
        registerCorrida,
    };
    g.__diarioExports = Object.assign(g.__diarioExports || {}, exports_);
    // Ações delegáveis (js/actions.js): toda função pública do módulo fica
    // disponível para os atributos data-action dos templates.
    const actionFns = {};
    Object.keys(exports_).forEach(k => { if (typeof exports_[k] === 'function') actionFns[k] = exports_[k]; });
    g.registerDiarioActions(actionFns);
    g.__diarioExportFiles = Object.assign(g.__diarioExportFiles || {}, { "js/registro.js": Object.keys(exports_).length });
})(typeof window !== 'undefined' ? window : globalThis);

export { updateTypeHint, onTypeChange, flashAutofill, suggestSessaoFor, onLogExerciseChange, toggleSetMode, renderSetRows, readSetRows, addSetRow, removeSetRow, initSetEditor, fieldsHTML, readFields, snapshotDrafts, findLastPerformance, lastPerformanceHTML, repeatLastPerformance, handleAddLog, _lastLogId, newLogId, editLog, saveEditedLog, saveEditedRunLog, updateRunEditPace, handleFilterDateChange, getFilteredLogs, renderLogsTable, renderRecoveryMap, prefillMuscleFromMap, renderDaySuggestion, registerCorrida };
