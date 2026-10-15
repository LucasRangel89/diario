/* ============================================================
   BUSCA & FILTROS (Fase 1) — tags acumulativas em ação
   ------------------------------------------------------------
   Uma única tela (aba 🔎 Buscar) com:
     • busca textual do catálogo (nome, grupo, equipamento, apelido, tag)
     • ~25 tags acumulativas agrupadas por categoria, com modo OU/E
     • filtros de grupo, equipamento, tipo de carga e ordenação
     • atalhos prontos (em casa, push, pull, força, já fiz, nunca fiz)
     • busca no histórico com os MESMOS filtros de tag
   O mesmo motor alimenta o seletor rápido (modal) que abre dentro do
   registro diário e do criador de treino — 0 duplicação de lógica.
   ============================================================ */

// Estado dos filtros da aba (persiste enquanto a página estiver aberta)
const searchState = {
    q: '', tags: [], tagMode: 'any',
    grupo: '', equipamento: '', tipo: '', sort: 'uso',
    onlyUsed: false, onlyNew: false,
    histQ: '', histMuscle: '', histPeriod: 'todos'
};

// Estado do seletor rápido (modal) — independente da aba
const pickerState = { target: 'log', q: '', tags: [], tagMode: 'any' };

const SEARCH_PRESETS = [
    { id: 'casa',    label: '🏠 Em casa',          patch: { tags: ['casa'], tagMode: 'any', onlyUsed: false, onlyNew: false } },
    { id: 'livre',   label: '🤸 Sem equipamento',  patch: { tags: ['peso-corporal'], tagMode: 'any', onlyUsed: false, onlyNew: false } },
    { id: 'push',    label: '↗️ Push',             patch: { tags: ['empurrar'], tagMode: 'any', onlyUsed: false, onlyNew: false } },
    { id: 'pull',    label: '↙️ Pull',             patch: { tags: ['puxar'], tagMode: 'any', onlyUsed: false, onlyNew: false } },
    { id: 'pernas',  label: '⬇️ Pernas',           patch: { tags: ['agachar', 'dobradica'], tagMode: 'any', onlyUsed: false, onlyNew: false } },
    { id: 'core',    label: '🧱 Core',             patch: { tags: ['core'], tagMode: 'any', onlyUsed: false, onlyNew: false } },
    { id: 'forca',   label: '🦍 Força',            patch: { tags: ['forca'], tagMode: 'any', onlyUsed: false, onlyNew: false } },
    { id: 'halter',  label: '💪 Só halteres',      patch: { tags: ['halter'], tagMode: 'any', onlyUsed: false, onlyNew: false } },
    { id: 'usados',  label: '🕐 Já fiz',           patch: { tags: [], onlyUsed: true, onlyNew: false } },
    { id: 'novos',   label: '✨ Nunca fiz',        patch: { tags: [], onlyUsed: false, onlyNew: true } }
];

// ============================ DADOS DE USO ============================
// Quantas vezes você registrou cada exercício, última data e melhor 1RM
function usageStats() {
    const usage = {}, lastUsed = {}, best1RM = {};
    const all = (typeof logs !== 'undefined' && Array.isArray(logs)) ? logs : [];
    all.forEach(l => {
        const n = l && l.exercise;
        if (!n) return;
        usage[n] = (usage[n] || 0) + 1;
        if (!lastUsed[n] || String(l.date) > String(lastUsed[n])) lastUsed[n] = l.date;
        if (l.kind !== 'corrida' && l.type !== 'isometria') {
            const est = logEst1RM(l);
            if (est > (best1RM[n] || 0)) best1RM[n] = est;
        }
    });
    return { usage, lastUsed, best1RM };
}

function searchOptsFrom(state, stats) {
    return {
        q: state.q, tags: state.tags, tagMode: state.tagMode,
        grupo: state.grupo, equipamento: state.equipamento, tipo: state.tipo, sort: state.sort,
        onlyUsed: state.onlyUsed, onlyNew: state.onlyNew,
        usage: stats.usage, lastUsed: stats.lastUsed
    };
}

function shiftLocalISO(iso, days) {
    const d = new Date(String(iso) + 'T12:00:00');
    d.setDate(d.getDate() + days);
    return toLocalISO(d);
}

// ============================ HTML COMPARTILHADO ============================
// Chips "somente leitura" de um exercício (cartões do diário, resultados, seletor).
// opts.first = tags que vêm primeiro (as do filtro ativo) — assim o cartão mostra
// POR QUE aquele exercício entrou no resultado, mesmo tendo 8+ tags.
function exerciseTagChipsHTML(name, opts = {}) {
    let ids = exerciseTags(name) || [];
    if (!ids.length) return '';
    const first = (opts.first || []).filter(t => ids.includes(t));
    if (first.length) ids = [...first, ...ids.filter(t => !first.includes(t))];
    const max = opts.max || 6;
    const shown = ids.slice(0, max);
    const rest = ids.length - shown.length;
    const html = shown.map(id => {
        const t = TAG_DEFS[id];
        if (!t) return '';
        const on = first.includes(id);
        return `<span class="px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wide ${on ? 'bg-berzerker-600 border-berzerker-500 text-white' : 'bg-berzerker-card border-berzerker-border text-gray-400'}" title="${escapeHtml(t.desc)}">${t.icon} ${escapeHtml(t.label)}</span>`;
    }).join('');
    return `<div class="flex flex-wrap gap-1 ${opts.className || ''}">${html}${rest > 0 ? `<span class="px-1.5 py-0.5 text-[9px] font-mono text-gray-600">+${rest}</span>` : ''}</div>`;
}

// Chips clicáveis de tag, agrupados por categoria, com contagem de resultados
function tagFilterHTML(state, facets, onToggle) {
    return TAG_BY_CATEGORY.map(cat => {
        const chips = cat.tags.map(t => {
            const on = state.tags.includes(t.id);
            const n = facets.tags[t.id] || 0;
            const dead = n === 0 && !on;
            const cls = on
                ? 'bg-berzerker-600 border-berzerker-500 text-white'
                : dead
                    ? 'bg-berzerker-card border-berzerker-border text-gray-600 cursor-not-allowed'
                    : 'bg-berzerker-dark border-berzerker-border text-gray-400 hover:text-white hover:border-gray-600';
            return `<button type="button" title="${escapeHtml(t.desc)}"${dead ? ' disabled' : ''} onclick="${onToggle}('${t.id}')"` +
                ` class="px-2 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wide whitespace-nowrap transition-colors ${cls}">` +
                `${t.icon} ${escapeHtml(t.label)} <span class="font-mono ${on ? 'text-white' : 'text-gray-500'}">${n}</span></button>`;
        }).join('');
        return `<div class="flex items-start gap-2">
            <span class="text-[9px] font-bold uppercase tracking-wider text-gray-500 w-24 shrink-0 pt-1.5">${cat.icon} ${escapeHtml(cat.label)}</span>
            <div class="flex flex-wrap gap-1.5 min-w-0">${chips}</div>
        </div>`;
    }).join('');
}

function tagModeButtonsHTML(mode, onClickFn, idPrefix) {
    const mk = (m, label) => `<button type="button" id="${idPrefix}-tagmode-${m}" onclick="${onClickFn}('${m}')"` +
        ` class="px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-colors ` +
        (mode === m ? 'bg-berzerker-600 border-berzerker-500 text-white' : 'bg-berzerker-dark border-berzerker-border text-gray-400 hover:text-white') +
        `">${label}</button>`;
    return mk('any', 'Qualquer tag (OU)') + mk('all', 'Todas (E)');
}

// ============================ ABA: BUSCAR ============================
function renderSearchScreen() {
    renderSearchFilters();
    renderCatalogResults();
    renderHistoryResults();
}

function renderSearchFilters() {
    const stats = usageStats();
    const semTags = searchCatalog(searchOptsFrom({ ...searchState, tags: [] }, stats));
    const facets = catalogFacets(semTags);

    // presets
    const presets = document.getElementById('cat-presets');
    if (presets) {
        presets.innerHTML = SEARCH_PRESETS.map(p => {
            const on = isPresetActive(p);
            return `<button type="button" onclick="applySearchPreset('${p.id}')"` +
                ` class="px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wide transition-colors ` +
                (on ? 'bg-cyan-700 border-cyan-600 text-white' : 'bg-berzerker-dark border-berzerker-border text-gray-400 hover:text-white hover:border-gray-600') +
                `">${p.label}</button>`;
        }).join('');
    }

    // selects (opções derivadas do catálogo + contagens)
    // entries = [value, label, contagem]
    const fill = (id, entries, current, allLabel) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.innerHTML = `<option value="">${allLabel}</option>` + entries.map(([val, label, n]) =>
            `<option value="${escapeHtml(val)}"${val === current ? ' selected' : ''}>${escapeHtml(label || val)}${n ? ` (${n})` : ''}</option>`).join('');
    };
    fill('cat-grupo', Object.entries(facets.grupo)
        .sort((a, b) => ((MUSCLE_META[a[0]] || {}).ordem || 9) - ((MUSCLE_META[b[0]] || {}).ordem || 9))
        .map(([g, n]) => [g, g, n]), searchState.grupo, 'Todos os grupos');
    fill('cat-equip', Object.entries(facets.equipamento).sort((a, b) => b[1] - a[1]).map(([q, n]) => [q, q, n]), searchState.equipamento, 'Todo equipamento');
    fill('cat-tipo', Object.entries(facets.tipo).sort((a, b) => b[1] - a[1]).map(([t, n]) => [t, (CATALOG_TIPOS[t] || {}).label || t, n]), searchState.tipo, 'Qualquer tipo de carga');

    const sortEl = document.getElementById('cat-sort');
    if (sortEl) {
        const opts = [['uso', 'Mais usados'], ['recentes', 'Usados há menos tempo'], ['nome', 'Nome (A–Z)'], ['grupo', 'Grupo muscular']];
        sortEl.innerHTML = opts.map(([v, l]) => `<option value="${v}"${v === searchState.sort ? ' selected' : ''}>${l}</option>`).join('');
    }

    // tags
    const tagsEl = document.getElementById('cat-tags');
    if (tagsEl) tagsEl.innerHTML = tagFilterHTML(searchState, facets, 'toggleSearchTag');
    const modeEl = document.getElementById('cat-tagmode');
    if (modeEl) modeEl.innerHTML = tagModeButtonsHTML(searchState.tagMode, 'setSearchTagMode', 'cat');
    const active = document.getElementById('cat-tags-active');
    if (active) {
        active.textContent = searchState.tags.length
            ? `· ${searchState.tags.length} ativa(s): ${searchState.tags.map(t => (TAG_DEFS[t] || {}).label || t).join(' + ')}`
            : `· ${Object.keys(TAG_DEFS).length} tags no catálogo`;
    }

    // espelha o texto digitado
    const q = document.getElementById('cat-q');
    if (q && q.value !== searchState.q) q.value = searchState.q;
}

function isPresetActive(p) {
    const t = (p.patch.tags || []);
    if (t.length) return t.length === searchState.tags.length && t.every(x => searchState.tags.includes(x)) && searchState.tagMode === (p.patch.tagMode || 'any');
    if (p.patch.onlyUsed) return searchState.onlyUsed && searchState.tags.length === 0;
    if (p.patch.onlyNew) return searchState.onlyNew && searchState.tags.length === 0;
    return false;
}

function renderCatalogResults() {
    const el = document.getElementById('cat-results');
    if (!el) return;
    const stats = usageStats();
    const list = searchCatalog(searchOptsFrom(searchState, stats));
    const countEl = document.getElementById('cat-count');
    const totalEx = allExercisesList().length;
    if (countEl) countEl.textContent = `${list.length} de ${totalEx} exercícios`;

    if (list.length === 0) {
        el.innerHTML = `<div class="md:col-span-2 text-center py-8 text-gray-500 border border-dashed border-berzerker-border rounded-xl text-sm">
            Nenhum exercício com esses filtros.<br>
            <button type="button" onclick="clearSearchFilters()" class="mt-2 px-3 py-1.5 bg-berzerker-border hover:bg-gray-700 text-white text-[10px] font-bold uppercase rounded-lg transition-colors">✕ Limpar filtros</button>
        </div>`;
        return;
    }

    el.innerHTML = list.map(e => {
        const uses = stats.usage[e.nome] || 0;
        const last = stats.lastUsed[e.nome];
        const best = stats.best1RM[e.nome];
        const tipoLabel = (CATALOG_TIPOS[e.tipo] || {}).label || e.tipo;
        const faixa = e.tipo === 'isometria' ? `${e.faixa[0]}–${e.faixa[1]} s`
            : e.tipo === 'corrida' ? 'distância/tempo'
                : `${e.faixa[0]}–${e.faixa[1]} reps`;
        const uso = uses
            ? `🕐 ${uses}× registrado${last ? ` · última ${formatShortBR(last)}` : ''}${best ? ` · 🏆 1RM ${best} kg` : ''}`
            : '✨ você ainda não registrou este exercício';
        return `
        <div data-ex="${escapeHtml(e.nome)}" class="bg-berzerker-dark border border-berzerker-border rounded-xl p-3.5 space-y-2 hover:border-berzerker-600 transition-colors">
            <div class="flex flex-wrap items-center gap-1.5">
                <span class="text-[10px] font-bold px-1.5 py-0.5 bg-berzerker-border text-berzerker-500 rounded uppercase">${escapeHtml(e.grupo)}</span>
                <span class="text-[10px] font-mono text-gray-500">${escapeHtml(e.equipamento)} · ${escapeHtml(tipoLabel)}</span>
            </div>
            <h3 class="font-bold text-white text-sm leading-tight">${escapeHtml(e.nome)}</h3>
            <div class="text-[11px] font-mono text-gray-400">faixa ${faixa}${e.descanso ? ` · descanso ${e.descanso}s` : ''}</div>
            ${exerciseTagChipsHTML(e.nome, { max: 8, first: searchState.tags })}
            <div class="text-[10px] font-mono ${uses ? 'text-cyan-300/90' : 'text-gray-500'}">${uso}</div>
            <div class="flex flex-wrap gap-1.5 pt-1 border-t border-berzerker-border">
                <button type="button" data-ex="${escapeHtml(e.nome)}" onclick="useExerciseInLog(this.getAttribute('data-ex'))" class="px-2.5 py-1.5 bg-berzerker-600 hover:bg-berzerker-500 text-white text-[10px] font-bold uppercase tracking-wide rounded-lg transition-colors">⚡ Registrar</button>
                <button type="button" data-ex="${escapeHtml(e.nome)}" onclick="useExerciseInBuilder(this.getAttribute('data-ex'))" class="px-2.5 py-1.5 bg-cyan-700 hover:bg-cyan-600 text-white text-[10px] font-bold uppercase tracking-wide rounded-lg transition-colors">🎯 No treino</button>
                <button type="button" data-ex="${escapeHtml(e.nome)}" onclick="showExerciseProgress(this.getAttribute('data-ex'))" class="px-2.5 py-1.5 bg-berzerker-border hover:bg-gray-700 text-white text-[10px] font-bold uppercase tracking-wide rounded-lg transition-colors"${uses ? '' : ' disabled'}>📊 Evolução</button>
                ${uses ? `<button type="button" data-ex="${escapeHtml(e.nome)}" onclick="repeatLastPerformance(this.getAttribute('data-ex'))" class="px-2.5 py-1.5 bg-berzerker-border hover:bg-gray-700 text-white text-[10px] font-bold uppercase tracking-wide rounded-lg transition-colors">↻ Repetir última</button>` : ''}
            </div>
        </div>`;
    }).join('');
}

// ============================ HISTÓRICO ============================
function searchHistoryLogs() {
    const all = (typeof logs !== 'undefined' && Array.isArray(logs)) ? logs : [];
    const q = searchState.histQ.trim();
    const days = searchState.histPeriod === 'todos' ? 0 : parseInt(searchState.histPeriod, 10) || 0;
    const minDate = days ? shiftLocalISO(getTodayLocalISO(), -days) : '';
    return all.filter(l => {
        if (!l) return false;
        if (searchState.histMuscle && normalizeMuscle(l.muscle) !== searchState.histMuscle) return false;
        if (minDate && String(l.date) < minDate) return false;
        if (searchState.tags.length && !matchesTags(exerciseTags(l.exercise), searchState.tags, searchState.tagMode)) return false;
        if (q && !matchesQuery(`${l.exercise} ${l.muscle} ${l.notes || ''} ${l.technique || ''} ${formatDateBR(l.date)} ${l.date}`, q)) return false;
        return true;
    }).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.id - a.id)));
}

function renderHistoryResults() {
    const el = document.getElementById('hist-results');
    if (!el) return;
    const muscles = [...new Set(((typeof logs !== 'undefined' && Array.isArray(logs)) ? logs : [])
        .map(l => normalizeMuscle(l && l.muscle)).filter(m => m && m !== 'Geral'))]
        .sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const muscleSel = document.getElementById('hist-muscle');
    if (muscleSel) {
        muscleSel.innerHTML = `<option value="">Todos os grupos</option>` + muscles.map(m =>
            `<option value="${escapeHtml(m)}"${m === searchState.histMuscle ? ' selected' : ''}>${escapeHtml(m)}</option>`).join('');
    }
    const qEl = document.getElementById('hist-q');
    if (qEl && qEl.value !== searchState.histQ) qEl.value = searchState.histQ;
    const perEl = document.getElementById('hist-period');
    if (perEl && perEl.value !== searchState.histPeriod) perEl.value = searchState.histPeriod;

    const found = searchHistoryLogs();
    const LIMIT = 60;
    const shown = found.slice(0, LIMIT);

    const summary = document.getElementById('hist-summary');
    if (summary) {
        const sessoes = new Set(found.map(l => l.date)).size;
        const ton = found.reduce((a, l) => a + logVolumeKg(l, userBodyweight), 0) / 1000;
        const prs = found.filter(l => l.isPR).length;
        summary.innerHTML = `<span class="font-mono text-gray-400">${found.length} registro(s)</span> · <span class="font-mono text-gray-400">${sessoes} dia(s)</span> · <span class="font-mono text-amber-400">${ton.toFixed(2)} ton</span>${prs ? ` · <span class="font-mono text-emerald-400">🏆 ${prs} PR(s)</span>` : ''}`;
    }

    if (found.length === 0) {
        el.innerHTML = `<div class="text-center py-6 text-gray-500 border border-dashed border-berzerker-border rounded-xl text-xs uppercase tracking-wider">Nenhum registro com esses filtros.</div>`;
        return;
    }

    el.innerHTML = shown.map(l => {
        const isCardio = l.kind === 'corrida';
        const detalhe = isCardio
            ? `${String(l.distanceKm ?? 0).replace('.', ',')} km · ${l.durationMin ?? 0} min`
            : `${formatLoadText(l)} × ${formatRepsText(l)} · ${fmtN(Math.round(logVolumeKg(l, userBodyweight)))} kg`;
        return `
        <div data-log-id="${l.id}" class="bg-berzerker-dark border border-berzerker-border rounded-xl p-3 space-y-1.5 hover:border-gray-600 transition-colors">
            <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-1.5">
                        <span class="text-[10px] font-mono px-1.5 py-0.5 bg-berzerker-border text-gray-300 rounded">${escapeHtml(formatShortBR(l.date))}</span>
                        <span class="text-[10px] font-bold px-1.5 py-0.5 bg-berzerker-card border border-berzerker-border text-berzerker-500 rounded uppercase">${escapeHtml(normalizeMuscle(l.muscle))}</span>
                        ${l.isPR ? '<span class="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded">🏆 PR</span>' : ''}
                        ${l.technique && l.technique !== 'Convencional' ? `<span class="text-[10px] font-mono text-gray-500">[${escapeHtml(l.technique)}]</span>` : ''}
                    </div>
                    <div class="font-bold text-white text-sm mt-1 truncate">${escapeHtml(l.exercise)}</div>
                    <div class="text-[11px] font-mono text-gray-400">${detalhe}</div>
                    ${l.notes ? `<div class="text-[11px] text-gray-500 italic">📝 ${escapeHtml(l.notes)}</div>` : ''}
                    ${exerciseTagChipsHTML(l.exercise, { max: 5, first: searchState.tags, className: 'mt-1' })}
                </div>
                <div class="flex flex-col gap-1.5 shrink-0">
                    <button type="button" onclick="editLog(${l.id})" class="px-2.5 py-1.5 bg-berzerker-border hover:bg-gray-700 text-white text-[10px] font-bold uppercase rounded-lg transition-colors">✏️ Editar</button>
                    <button type="button" data-date="${escapeHtml(l.date)}" onclick="openDayInDiary(this.getAttribute('data-date'))" class="px-2.5 py-1.5 bg-berzerker-dark border border-berzerker-border hover:border-gray-600 text-gray-300 text-[10px] font-bold uppercase rounded-lg transition-colors">📅 Ver dia</button>
                </div>
            </div>
        </div>`;
    }).join('') + (found.length > LIMIT ? `<p class="text-[11px] text-gray-500 text-center pt-1 font-mono">mostrando os ${LIMIT} mais recentes de ${found.length} — refine a busca</p>` : '');
}

// ============================ AÇÕES DOS FILTROS ============================
function setSearchQuery(v) { searchState.q = v || ''; renderCatalogResults(); }
function setSearchField(key, v) { searchState[key] = v; renderSearchScreen(); }
function setHistoryField(key, v) { searchState[key] = v; renderHistoryResults(); }

function toggleSearchTag(id) {
    const i = searchState.tags.indexOf(id);
    if (i >= 0) searchState.tags.splice(i, 1); else searchState.tags.push(id);
    searchState.onlyUsed = false; searchState.onlyNew = false;
    renderSearchScreen();
}

function setSearchTagMode(mode) { searchState.tagMode = mode === 'all' ? 'all' : 'any'; renderSearchScreen(); }

function applySearchPreset(id) {
    const p = SEARCH_PRESETS.find(x => x.id === id);
    if (!p) return;
    const already = isPresetActive(p);
    searchState.tags = already ? [] : [...(p.patch.tags || [])];
    searchState.tagMode = p.patch.tagMode || searchState.tagMode;
    searchState.onlyUsed = already ? false : !!p.patch.onlyUsed;
    searchState.onlyNew = already ? false : !!p.patch.onlyNew;
    renderSearchScreen();
}

function clearSearchFilters() {
    Object.assign(searchState, {
        q: '', tags: [], tagMode: 'any', grupo: '', equipamento: '', tipo: '', sort: 'uso',
        onlyUsed: false, onlyNew: false
    });
    renderSearchScreen();
}

// ============================ AÇÕES DOS RESULTADOS ============================
function setFieldValue(id, v) { const el = document.getElementById(id); if (el) el.value = v; }

// Reps alvo (dupla progressão: 2 séries no topo da faixa + 1 no meio)
function repsAlvoSugeridas(cat) {
    if (!cat || !cat.faixa) return '';
    if (cat.tipo === 'corrida') return '';
    if (cat.tipo === 'isometria') return `${cat.faixa[1]}, ${cat.faixa[0]}`;
    const meio = Math.round((cat.faixa[0] + cat.faixa[1]) / 2);
    return `${cat.faixa[1]}, ${cat.faixa[1]}, ${meio}`;
}

// Leva o exercício para o formulário de registro (com carga/reps da última vez)
function useExerciseInLog(name) {
    const cat = catalogInfo(name);
    setFieldValue('log-exercise', name);
    if (cat) {
        setFieldValue('log-muscle', cat.grupo);
        setFieldValue('type', cat.tipo);
    }
    if (typeof onLogExerciseChange === 'function') onLogExerciseChange();
    const last = (typeof findLastPerformance === 'function') ? findLastPerformance(name) : null;
    const prog = last ? duplaProgressao(last) : null;
    if (last) {
        // se o formulário estiver no modo "série a série", volta pro modo simples
        // (senão a carga/reps carregadas ficariam invisíveis)
        const modeSel = document.getElementById('mode');
        if (modeSel && modeSel.value === 'sets') { modeSel.value = 'simple'; if (typeof toggleSetMode === 'function') toggleSetMode(''); }
        setFieldValue('w', prog ? prog.proximaCarga : (last.weight || ''));
        setFieldValue('r', (last.sets ? last.sets.map(s => s.reps) : last.reps || []).join(', '));
    }
    if (typeof switchTab === 'function') switchTab('diario');
    document.getElementById('form-card-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.getElementById('w')?.focus();
    alertModal(prog
        ? `⚡ ${name} no formulário — dupla progressão sugere ${prog.proximaCarga} kg.`
        : (last ? `⚡ ${name} no formulário com a carga da última vez.` : `⚡ ${name} no formulário.`));
}

// Leva o exercício para o criador de treino (rascunho)
function useExerciseInBuilder(name) {
    const cat = catalogInfo(name);
    setFieldValue('wb-exercise', name);
    if (cat) {
        setFieldValue('wb-muscle', cat.grupo);
        if (typeof updateExerciseSuggestions === 'function') updateExerciseSuggestions();
        setFieldValue('wb-weight', '');
        setFieldValue('wb-reps', repsAlvoSugeridas(cat));
    }
    if (typeof onWbExerciseChange === 'function') onWbExerciseChange();
    if (typeof switchTab === 'function') switchTab('montador');
    document.getElementById('builder-card-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.getElementById('wb-weight')?.focus();
    alertModal(`🎯 ${name} pronto para entrar no treino — informe a carga alvo e adicione.`);
}

function showExerciseProgress(name) {
    const temRegistro = ((typeof logs !== 'undefined') ? logs : []).some(l => l.exercise === name && l.kind !== 'corrida' && l.type !== 'isometria');
    if (!temRegistro) { alertModal('Sem registros de carga deste exercício ainda.'); return; }
    if (typeof switchTab === 'function') switchTab('stats');
    const sel = document.getElementById('ex-chart-select');
    if (typeof renderExerciseChart === 'function') renderExerciseChart();
    if (sel) { sel.value = name; if (typeof renderExerciseChart === 'function') renderExerciseChart(); }
    document.getElementById('exChart')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function openDayInDiary(date) {
    setFieldValue('filter-date', date);
    if (typeof switchTab === 'function') switchTab('diario');
    if (typeof handleFilterDateChange === 'function') handleFilterDateChange(date);
}

// ============================ SELETOR RÁPIDO (MODAL) ============================
function openExercisePicker(target) {
    pickerState.target = target === 'wb' ? 'wb' : 'log';
    const campo = pickerState.target === 'wb' ? 'wb-exercise' : 'log-exercise';
    pickerState.q = (document.getElementById(campo) || {}).value || '';
    pickerState.tags = [];
    pickerState.tagMode = 'any';

    document.getElementById('picker-overlay')?.remove();
    const o = document.createElement('div');
    o.id = 'picker-overlay';
    o.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-start sm:items-center justify-center p-3 overflow-y-auto';
    o.innerHTML = `
        <div class="bg-berzerker-card border border-berzerker-border rounded-2xl p-4 w-full max-w-2xl shadow-2xl space-y-3">
            <div class="flex items-center justify-between gap-3 border-b border-berzerker-border pb-2.5">
                <div>
                    <h3 class="font-oswald text-lg font-bold text-white uppercase tracking-wider">🔎 Buscar exercício</h3>
                    <p id="picker-hint" class="text-[11px] text-gray-400">${pickerState.target === 'wb' ? 'Vai para o criador de treino.' : 'Vai para o registro do dia (com a última carga).'}</p>
                </div>
                <button type="button" onclick="closeExercisePicker()" class="px-2.5 py-1.5 bg-berzerker-border hover:bg-gray-700 text-white text-[10px] font-bold uppercase rounded-lg transition-colors">✕ Fechar</button>
            </div>
            <input type="search" id="picker-q" oninput="setPickerQuery(this.value)" value="${escapeHtml(pickerState.q)}" placeholder="Nome, apelido ou tag (ex: supino, rdl, casa, polia)" class="w-full bg-berzerker-dark border border-berzerker-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-berzerker-500">
            <div class="bg-berzerker-dark border border-berzerker-border rounded-xl p-2.5 space-y-2">
                <div class="flex items-center justify-between gap-2">
                    <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">🏷️ Filtrar por tags</span>
                    <div id="picker-tagmode" class="flex items-center gap-1"></div>
                </div>
                <div id="picker-tags" class="space-y-1.5 max-h-[30vh] overflow-y-auto"></div>
            </div>
            <div id="picker-count" class="text-[11px] font-mono text-gray-500"></div>
            <div id="picker-results" class="space-y-1.5 max-h-[40vh] overflow-y-auto"></div>
        </div>`;
    document.body.appendChild(o);
    o.addEventListener('click', ev => { if (ev.target === o) closeExercisePicker(); });
    renderPickerResults();
    document.getElementById('picker-q')?.focus();
}

function closeExercisePicker() {
    pickerState.q = ''; pickerState.tags = [];
    document.getElementById('picker-overlay')?.remove();
}

function setPickerQuery(v) { pickerState.q = v || ''; renderPickerResults(); }

function togglePickerTag(id) {
    const i = pickerState.tags.indexOf(id);
    if (i >= 0) pickerState.tags.splice(i, 1); else pickerState.tags.push(id);
    renderPickerResults();
}

function setPickerTagMode(mode) { pickerState.tagMode = mode === 'all' ? 'all' : 'any'; renderPickerResults(); }

function renderPickerResults() {
    const stats = usageStats();
    const base = searchCatalog({ q: '', tags: [], usage: stats.usage, lastUsed: stats.lastUsed, sort: 'uso' });
    const facets = catalogFacets(base);
    const list = searchCatalog({
        q: pickerState.q, tags: pickerState.tags, tagMode: pickerState.tagMode,
        usage: stats.usage, lastUsed: stats.lastUsed, sort: 'uso', limit: 40
    });

    const tagsEl = document.getElementById('picker-tags');
    if (tagsEl) tagsEl.innerHTML = tagFilterHTML(pickerState, facets, 'togglePickerTag');
    const modeEl = document.getElementById('picker-tagmode');
    if (modeEl) modeEl.innerHTML = tagModeButtonsHTML(pickerState.tagMode, 'setPickerTagMode', 'picker');
    const countEl = document.getElementById('picker-count');
    if (countEl) countEl.textContent = `${list.length} exercício(s)${pickerState.tags.length ? ` · tags: ${pickerState.tags.map(t => (TAG_DEFS[t] || {}).label || t).join(' + ')}` : ''}`;

    const el = document.getElementById('picker-results');
    if (!el) return;
    if (list.length === 0) {
        el.innerHTML = `<div class="text-center py-5 text-gray-500 border border-dashed border-berzerker-border rounded-xl text-xs">Nada encontrado — tente outra palavra ou remova tags.</div>`;
        return;
    }
    el.innerHTML = list.map(e => {
        const uses = stats.usage[e.nome] || 0;
        const last = stats.lastUsed[e.nome];
        return `
        <button type="button" data-ex="${escapeHtml(e.nome)}" onclick="chooseExerciseFromPicker(this.getAttribute('data-ex'))"
            class="w-full text-left bg-berzerker-dark border border-berzerker-border hover:border-berzerker-500 rounded-xl px-3 py-2.5 transition-colors">
            <div class="flex items-center justify-between gap-2">
                <span class="font-bold text-white text-sm truncate">${escapeHtml(e.nome)}</span>
                <span class="text-[10px] font-mono text-gray-500 shrink-0">${uses ? `${uses}×${last ? ` · ${formatShortBR(last)}` : ''}` : 'novo'}</span>
            </div>
            <div class="text-[10px] font-mono text-gray-500 mt-0.5">${escapeHtml(e.grupo)} · ${escapeHtml(e.equipamento)} · ${escapeHtml((CATALOG_TIPOS[e.tipo] || {}).label || e.tipo)}</div>
            ${exerciseTagChipsHTML(e.nome, { max: 5, first: pickerState.tags, className: 'mt-1.5' })}
        </button>`;
    }).join('');
}

function chooseExerciseFromPicker(name) {
    const target = pickerState.target;
    closeExercisePicker();
    if (target === 'wb') useExerciseInBuilder(name);
    else useExerciseInLog(name);
}

// Mostra as tags do exercício digitado (feedback imediato no registro diário)
function renderExerciseTagLine(elId, name) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.innerHTML = name && name.trim().length > 2 ? exerciseTagChipsHTML(name.trim(), { max: 7 }) : '';
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
        searchState,
    pickerState,
    SEARCH_PRESETS,
    usageStats,
    searchOptsFrom,
    shiftLocalISO,
    exerciseTagChipsHTML,
    tagFilterHTML,
    tagModeButtonsHTML,
    renderSearchScreen,
    renderSearchFilters,
    isPresetActive,
    renderCatalogResults,
    searchHistoryLogs,
    renderHistoryResults,
    setSearchQuery,
    setSearchField,
    setHistoryField,
    toggleSearchTag,
    setSearchTagMode,
    applySearchPreset,
    clearSearchFilters,
    setFieldValue,
    repsAlvoSugeridas,
    useExerciseInLog,
    useExerciseInBuilder,
    showExerciseProgress,
    openDayInDiary,
    openExercisePicker,
    closeExercisePicker,
    setPickerQuery,
    togglePickerTag,
    setPickerTagMode,
    renderPickerResults,
    chooseExerciseFromPicker,
    renderExerciseTagLine
    };
    g.__diarioExports = Object.assign(g.__diarioExports || {}, exports_);
    // Ações delegáveis (js/actions.js): toda função pública do módulo fica
    // disponível para os atributos data-action dos templates.
    const actionFns = {};
    Object.keys(exports_).forEach(k => { if (typeof exports_[k] === 'function') actionFns[k] = exports_[k]; });
    g.registerDiarioActions(actionFns);
    g.__diarioExportFiles = Object.assign(g.__diarioExportFiles || {}, { "js/busca.js": Object.keys(exports_).length });
})(typeof window !== 'undefined' ? window : globalThis);
