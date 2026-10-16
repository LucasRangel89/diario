import { CATALOG_ALIASES, CATALOG_BY_NAME, CATALOG_BY_SEARCH, CATALOG_TIPOS, EXERCISE_CATALOG_FULL, MUSCLE_OPTIONS_FULL, SINONIMOS, TAG_DEFS, TAG_IDS, catalogInfo, deriveTags, normalizeText, setCustomExercisesRef } from './catalogo.js';
import { exercicioCarregaLombar } from './assistente.js';
import { alertModal, escapeHtml, refreshAll, safeStorage, updateExerciseSuggestions } from './app.js';
import { renderSearchScreen } from './busca.js';
/* ============================================================
   EXERCÍCIOS CUSTOMIZADOS PELO USUÁRIO
   ------------------------------------------------------------
   Salvos em localStorage (nunca tocam o catálogo do código nem o seed).
   Aparecem na Busca, seletor rápido, datalists e histórico.
   São incluídos na aba "Catálogo" do CSV exportado.
   ============================================================ */

const STORAGE_KEY_CUSTOM_EX = 'berzerker_custom_exercises_v1';
let customExercises = [];

function loadCustomExercises() {
    try {
        customExercises = JSON.parse(safeStorage.get(STORAGE_KEY_CUSTOM_EX) || '[]');
        if (!Array.isArray(customExercises)) customExercises = [];
    } catch (e) {
        customExercises = [];
    }
    // Garante campos padrão
    customExercises = customExercises.map(e => ({
        tipo: 'carga_total', fator: 1, lados: 1, unidade: 'reps',
        faixa: [8, 12], descanso: 90, obs: '', sinonimos: '', tagsExtras: [],
        ...e
    }));
    rebuildCustomCatalog();
    return customExercises;
}

function saveCustomExercises() {
    safeStorage.set(STORAGE_KEY_CUSTOM_EX, JSON.stringify(customExercises));
    rebuildCustomCatalog();
    refreshAll && refreshAll();
}

// Normalização de uma lista vinda de backup JSON. Regras determinísticas e documentadas:
//  - item que não é objeto ou não tem nome → erro (o backup inteiro é rejeitado);
//  - nome igual a exercício do CATÁLOGO PRINCIPAL → não importado e reportado como conflito
//    (o catálogo nunca é alterado; registros antigos com esse nome continuam usando o catálogo);
//  - nome repetido dentro do próprio arquivo (sem diferenciar maiúsculas) → vale a primeira ocorrência;
//  - tipo de carga desconhecido ou números inválidos → erro (afetariam os cálculos).
// Pura: não altera o estado atual.
function normalizarExerciciosPersonalizados(lista) {
    const erros = [], conflitos = [], out = [];
    if (!Array.isArray(lista)) return { lista: out, erros: ['"customExercises" não é uma lista'], conflitos };
    const nomesBase = new Set(EXERCISE_CATALOG_FULL.map(e => String(e.nome).toLowerCase()));
    const vistos = new Set();
    lista.forEach((raw, i) => {
        const pos = `exercício personalizado #${i + 1}`;
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) { erros.push(`${pos} não é um objeto`); return; }
        const nome = typeof raw.nome === 'string' ? raw.nome.trim() : '';
        if (!nome) { erros.push(`${pos} sem nome`); return; }
        const chave = nome.toLowerCase();
        if (nomesBase.has(chave)) { conflitos.push(`"${nome}" já existe no catálogo principal (não importado)`); return; }
        if (vistos.has(chave)) { conflitos.push(`"${nome}" repetido no arquivo (mantida a primeira ocorrência)`); return; }
        const tipo = raw.tipo == null ? 'carga_total' : raw.tipo;
        if (!Object.prototype.hasOwnProperty.call(CATALOG_TIPOS, tipo)) { erros.push(`${pos} (${nome}): tipo de carga desconhecido "${tipo}"`); return; }
        const fator = raw.fator == null ? 1 : Number(raw.fator);
        const lados = raw.lados == null ? 1 : Number(raw.lados);
        if (!(fator > 0) || !(lados > 0)) { erros.push(`${pos} (${nome}): fator/lados inválidos`); return; }
        const faixa = Array.isArray(raw.faixa) && raw.faixa.length === 2 ? raw.faixa.map(Number) : [8, 12];
        if (!faixa.every(Number.isFinite)) { erros.push(`${pos} (${nome}): faixa de repetições inválida`); return; }
        const descanso = raw.descanso == null ? 90 : Number(raw.descanso);
        if (!Number.isFinite(descanso) || descanso < 0) { erros.push(`${pos} (${nome}): descanso inválido`); return; }
        vistos.add(chave);
        out.push({
            ...raw,
            id: typeof raw.id === 'string' && raw.id ? raw.id : 'custom_' + Date.now() + '_' + i,
            nome,
            grupo: typeof raw.grupo === 'string' && raw.grupo ? raw.grupo : 'Geral',
            equipamento: typeof raw.equipamento === 'string' ? raw.equipamento : '',
            tipo, fator, lados,
            unidade: typeof raw.unidade === 'string' && raw.unidade ? raw.unidade : 'reps',
            faixa, descanso,
            obs: typeof raw.obs === 'string' ? raw.obs : '',
            sinonimos: typeof raw.sinonimos === 'string' ? raw.sinonimos : '',
            tagsExtras: Array.isArray(raw.tagsExtras) ? raw.tagsExtras.filter(t => typeof t === 'string') : [],
            cargaLombar: !!raw.cargaLombar,
            isCustom: true
        });
    });
    return { lista: out, erros, conflitos };
}

// Substitui a lista inteira (restauração de backup) sem duplicar nada e reconstrói os índices.
function setCustomExercisesList(lista) {
    customExercises = (Array.isArray(lista) ? lista : []).map(e => ({
        tipo: 'carga_total', fator: 1, lados: 1, unidade: 'reps',
        faixa: [8, 12], descanso: 90, obs: '', sinonimos: '', tagsExtras: [],
        ...e
    }));
    rebuildCustomCatalog();
    return customExercises;
}

function getCustomExercises() {
    return Array.isArray(customExercises) ? customExercises : [];
}

let customBySearch = {};
let customByName = {};
function rebuildCustomCatalog() {
    customByName = {};
    customBySearch = {};
    customExercises.forEach(e => {
        e.cargaLombar = e.cargaLombar || false;
        // Deriva tags
        const derived = deriveTags(e);
        e.tags = [...new Set([...derived, ...(e.tagsExtras || [])])];
        // Índices
        const nomeKey = normalizeText(e.nome);
        customByName[e.nome.toLowerCase()] = e;
        customBySearch[nomeKey] = e;
        const allText = normalizeText([e.nome, e.grupo, e.equipamento, e.sinonimos || '', e.tags.map(t => t + ' ' + (TAG_DEFS[t] ? TAG_DEFS[t].label : '')).join(' ')].join(' '));
        e.busca = allText;
    });
    // Reconstroi o CATALOG_BY_SEARCH combinando base + custom
    rebuildFullSearchIndex();
}

function rebuildFullSearchIndex() {
    // Limpa entradas custom e readiciona
    Object.keys(customBySearch).forEach(k => {
        if (CATALOG_BY_SEARCH[k]) delete CATALOG_BY_SEARCH[k];
    });
    // Adiciona custom
    Object.entries(customBySearch).forEach(([k, v]) => {
        CATALOG_BY_SEARCH[k] = v;
    });
    // Atualiza CATALOG_BY_NAME também
    Object.entries(customByName).forEach(([k, v]) => {
        CATALOG_BY_NAME[k] = v;
    });
    // Adiciona aliases custom
    const aliases = {};
    customExercises.forEach(e => {
        if (e.sinonimos) {
            const termos = e.sinonimos.toLowerCase().split(/[,;]/).map(s => s.trim()).filter(Boolean);
            termos.forEach(t => aliases[t] = e.nome);
        }
    });
    Object.entries(aliases).forEach(([k, v]) => CATALOG_ALIASES[k] = v);
    // Reindexa todos os exercícios (base + custom) para atualizar tags/busca
    EXERCISE_CATALOG_FULL.forEach(e => {
        if (customByName[e.nome.toLowerCase()]) return; // não sobrescreve custom
        e.tags = deriveTags(e);
        e.busca = normalizeText([e.nome, e.grupo, e.equipamento, (CATALOG_TIPOS[e.tipo] || {}).label || '', SINONIMOS[e.nome] || '', e.tags.map(t => t + ' ' + (TAG_DEFS[t] ? TAG_DEFS[t].label : '')).join(' ')].join(' '));
    });
    customExercises.forEach(e => {
        e.tags = [...new Set([...deriveTags(e), ...(e.tagsExtras || [])])];
        e.busca = normalizeText([e.nome, e.grupo, e.equipamento, (CATALOG_TIPOS[e.tipo] || {}).label || '', e.sinonimos || '', e.tags.map(t => t + ' ' + (TAG_DEFS[t] ? TAG_DEFS[t].label : '')).join(' ')].join(' '));
    });
}

// Lista completa (base + custom) para busca/seletor
function allExercisesList() {
    return [...EXERCISE_CATALOG_FULL.filter(e => !customByName[e.nome.toLowerCase()]), ...customExercises];
}

// catalogInfo que também enxerga custom
function catalogInfoCustom(nome) {
    const base = catalogInfo(nome);
    if (base) return base;
    if (!nome) return null;
    return customByName[String(nome).toLowerCase()] || null;
}

// Exercício carrega lombar com suporte a custom
function exercicioCarregaLombarCustom(nome) {
    const cat = catalogInfoCustom(nome);
    if (cat && cat.cargaLombar === true) return true;
    if (cat && cat.cargaLombar === false) return false;
    return exercicioCarregaLombar(nome);
}

// CRUD
function addCustomExercise(data) {
    if (!data || !data.nome) return false;
    if (catalogInfo(data.nome)) {
        alertModal('❌ Já existe um exercício com esse nome no catálogo.');
        return false;
    }
    if (customByName[data.nome.toLowerCase()]) {
        alertModal('❌ Você já cadastrou um exercício com esse nome.');
        return false;
    }
    const novo = {
        id: 'custom_' + Date.now(),
        nome: data.nome.trim(),
        grupo: data.grupo || 'Geral',
        equipamento: data.equipamento || '',
        tipo: data.tipo || 'carga_total',
        fator: Number(data.fator) || 1,
        lados: Number(data.lados) || 1,
        unidade: data.unidade || 'reps',
        faixa: [Number(data.faixaMin) || 8, Number(data.faixaMax) || 12],
        descanso: Number(data.descanso) || 90,
        obs: data.obs || '',
        sinonimos: data.sinonimos || '',
        tagsExtras: Array.isArray(data.tagsExtras) ? data.tagsExtras : [],
        cargaLombar: !!data.cargaLombar,
        isCustom: true
    };
    customExercises.push(novo);
    saveCustomExercises();
    return true;
}

function updateCustomExercise(id, data) {
    const idx = customExercises.findIndex(e => e.id === id);
    if (idx < 0) return false;
    customExercises[idx] = { ...customExercises[idx], ...data, nome: data.nome.trim(), isCustom: true };
    saveCustomExercises();
    return true;
}

function deleteCustomExercise(id) {
    customExercises = customExercises.filter(e => e.id !== id);
    saveCustomExercises();
    return true;
}

function customExerciseFormHTML(existing = null) {
    const e = existing || {
        nome: '', grupo: 'Geral', equipamento: '', tipo: 'carga_total', fator: 1, lados: 1, unidade: 'reps',
        faixa: [8, 12], descanso: 90, obs: '', sinonimos: '', tagsExtras: [], cargaLombar: false
    };
    const grupoOptions = MUSCLE_OPTIONS_FULL.map(g => `<option value="${g}" ${e.grupo === g ? 'selected' : ''}>${g}</option>`).join('');
    const tipoOptions = Object.entries(CATALOG_TIPOS).map(([val, meta]) => `<option value="${val}" ${e.tipo === val ? 'selected' : ''}>${meta.label}</option>`).join('');
    const tagsOptions = TAG_IDS.map(tid => {
        const def = TAG_DEFS[tid];
        const checked = (e.tagsExtras || []).includes(tid) ? 'checked' : '';
        return `<label class="flex items-center gap-1 text-[11px]"><input type="checkbox" value="${tid}" ${checked} class="custom-tag-check w-3.5 h-3.5 rounded"> ${def.icon} ${def.label}</label>`;
    }).join('');
    return `
    <form id="custom-ex-form" class="space-y-3 text-sm">
        <div>
            <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Nome do exercício *</label>
            <input type="text" id="cex-nome" required value="${escapeHtml(e.nome)}" placeholder="Ex: Puxada com triângulo" class="w-full bg-berzerker-dark border border-berzerker-border rounded-lg px-2.5 py-2 text-white">
        </div>
        <div class="grid grid-cols-2 gap-3">
            <div>
                <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Grupo muscular *</label>
                <select id="cex-grupo" class="w-full bg-berzerker-dark border border-berzerker-border rounded-lg px-2.5 py-2 text-white">${grupoOptions}</select>
            </div>
            <div>
                <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Equipamento</label>
                <input type="text" id="cex-equipamento" value="${escapeHtml(e.equipamento)}" placeholder="Ex: Polia, Barra" class="w-full bg-berzerker-dark border border-berzerker-border rounded-lg px-2.5 py-2 text-white">
            </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
            <div>
                <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tipo de carga</label>
                <select id="cex-tipo" class="w-full bg-berzerker-dark border border-berzerker-border rounded-lg px-2.5 py-2 text-white" data-change-action="updateCustomExFormHint">${tipoOptions}</select>
                <p id="cex-tipo-hint" class="text-[10px] text-gray-500 mt-1"></p>
            </div>
            <div class="grid grid-cols-2 gap-2">
                <div>
                    <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Fator</label>
                    <select id="cex-fator" class="w-full bg-berzerker-dark border border-berzerker-border rounded-lg px-2 py-2 text-white">
                        <option value="1" ${e.fator === 1 ? 'selected' : ''}>1 (normal)</option>
                        <option value="2" ${e.fator === 2 ? 'selected' : ''}>2 (par/crossover)</option>
                    </select>
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Lados</label>
                    <select id="cex-lados" class="w-full bg-berzerker-dark border border-berzerker-border rounded-lg px-2 py-2 text-white">
                        <option value="1" ${e.lados === 1 ? 'selected' : ''}>1</option>
                        <option value="2" ${e.lados === 2 ? 'selected' : ''}>2 (por lado)</option>
                    </select>
                </div>
            </div>
        </div>
        <div class="grid grid-cols-3 gap-3">
            <div>
                <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Reps mín</label>
                <input type="number" id="cex-faixa-min" min="1" max="30" value="${e.faixa[0]}" class="w-full bg-berzerker-dark border border-berzerker-border rounded-lg px-2.5 py-2 text-white">
            </div>
            <div>
                <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Reps máx</label>
                <input type="number" id="cex-faixa-max" min="1" max="100" value="${e.faixa[1]}" class="w-full bg-berzerker-dark border border-berzerker-border rounded-lg px-2.5 py-2 text-white">
            </div>
            <div>
                <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Descanso (s)</label>
                <input type="number" id="cex-descanso" min="30" max="300" step="15" value="${e.descanso}" class="w-full bg-berzerker-dark border border-berzerker-border rounded-lg px-2.5 py-2 text-white">
            </div>
        </div>
        <div>
            <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Observações</label>
            <textarea id="cex-obs" rows="2" placeholder="Dicas de execução, pegada, etc." class="w-full bg-berzerker-dark border border-berzerker-border rounded-lg px-2.5 py-2 text-white">${escapeHtml(e.obs)}</textarea>
        </div>
        <div>
            <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Sinônimos de busca (separados por vírgula)</label>
            <input type="text" id="cex-sinonimos" value="${escapeHtml(e.sinonimos)}" placeholder="Ex: remada triangulo, puxada triangulo" class="w-full bg-berzerker-dark border border-berzerker-border rounded-lg px-2.5 py-2 text-white">
        </div>
        <div>
            <label class="flex items-center gap-2 text-[11px]">
                <input type="checkbox" id="cex-lombar" ${e.cargaLombar ? 'checked' : ''} class="w-4 h-4 rounded text-amber-500 bg-berzerker-dark border-berzerker-border">
                ⚠️ Este exercício exige/carrega a lombar (alerta de fadiga)
            </label>
        </div>
        <div>
            <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tags extras opcionais (as tags derivam automaticamente; marque só se precisar)</label>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-1.5 p-2 bg-berzerker-dark/50 rounded-lg border border-berzerker-border max-h-36 overflow-y-auto">
                ${tagsOptions}
            </div>
        </div>
        <div class="flex gap-2 pt-2">
            <button type="button" data-action="closeCustomExModal" class="flex-1 px-4 py-2 bg-berzerker-border hover:bg-gray-700 text-white text-xs font-bold uppercase rounded-lg">Cancelar</button>
            ${existing && existing.id ? `<button type="button" data-action="submitDeleteCustomEx" data-args='["${existing.id}"]' class="px-4 py-2 bg-red-900/50 hover:bg-red-800 text-red-300 text-xs font-bold uppercase rounded-lg">🗑️ Excluir</button>` : ''}
            <button type="submit" class="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase rounded-lg">${existing && existing.id ? '💾 Salvar alterações' : '➕ Criar exercício'}</button>
        </div>
    </form>`;
}

function updateCustomExFormHint() {
    const sel = document.getElementById('cex-tipo');
    const hint = document.getElementById('cex-tipo-hint');
    if (!sel || !hint) return;
    const meta = CATALOG_TIPOS[sel.value];
    hint.textContent = meta ? meta.hint : '';
}

// Janela do formulário de exercício personalizado.
// O formulário (customExerciseFormHTML) e o botão "➕ Novo exercício" (aba Buscar)
// já existiam, mas openModal/closeModal nunca tinham sido declarados: o clique
// lançava ReferenceError e nada abria. Mesmo padrão de overlay dos outros modais
// do app (edição de registro, seletor rápido): criado sob demanda e removido ao
// fechar — no Cancelar, no clique fora e no ESC (OVERLAY_CLOSE_ORDER em js/app.js).
const CUSTOM_EX_OVERLAY_ID = 'custom-ex-overlay';

function openModal(titulo, conteudoHTML) {
    closeModal();
    const o = document.createElement('div');
    o.id = CUSTOM_EX_OVERLAY_ID;
    o.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-start sm:items-center justify-center p-4 overflow-y-auto';
    o.setAttribute('role', 'dialog');
    o.setAttribute('aria-modal', 'true');
    o.setAttribute('aria-label', titulo);
    o.innerHTML = `
        <div class="bg-berzerker-card border border-berzerker-border rounded-2xl p-5 max-w-lg w-full shadow-2xl">
            <h3 class="font-oswald text-lg font-bold text-white uppercase tracking-wider mb-3">${escapeHtml(titulo)}</h3>
            ${conteudoHTML}
        </div>`;
    o.addEventListener('click', ev => { if (ev.target === o) closeModal(); });
    document.body.appendChild(o);
}

function closeModal() {
    document.getElementById(CUSTOM_EX_OVERLAY_ID)?.remove();
}

function openCustomExModal(existingId = null) {
    const existing = existingId ? customExercises.find(e => e.id === existingId) : null;
    openModal(existing ? '✏️ Editar exercício' : '➕ Novo exercício', customExerciseFormHTML(existing));
    const form = document.getElementById('custom-ex-form');
    if (form && existing && existing.id) form.dataset.editingId = existing.id;
    setTimeout(() => {
        updateCustomExFormHint();
        document.getElementById('custom-ex-form')?.addEventListener('submit', submitCustomExForm);
    }, 50);
}

function closeCustomExModal() { closeModal(); }

function submitCustomExForm(ev) {
    ev.preventDefault();
    const tagsExtras = [...document.querySelectorAll('.custom-tag-check:checked')].map(c => c.value);
    const data = {
        nome: document.getElementById('cex-nome').value.trim(),
        grupo: document.getElementById('cex-grupo').value,
        equipamento: document.getElementById('cex-equipamento').value.trim(),
        tipo: document.getElementById('cex-tipo').value,
        fator: Number(document.getElementById('cex-fator').value),
        lados: Number(document.getElementById('cex-lados').value),
        faixaMin: document.getElementById('cex-faixa-min').value,
        faixaMax: document.getElementById('cex-faixa-max').value,
        descanso: document.getElementById('cex-descanso').value,
        obs: document.getElementById('cex-obs').value.trim(),
        sinonimos: document.getElementById('cex-sinonimos').value.trim(),
        cargaLombar: document.getElementById('cex-lombar').checked,
        tagsExtras
    };
    if (!data.nome) { alertModal('❌ Dê um nome para o exercício.'); return; }
    // Verifica edição
    const editing = document.getElementById('custom-ex-form').dataset.editingId;
    let ok;
    if (editing) {
        ok = updateCustomExercise(editing, data);
    } else {
        ok = addCustomExercise(data);
    }
    if (ok) {
        closeModal();
        alertModal(editing ? '✅ Exercício atualizado!' : '✅ Exercício criado com sucesso! Ele aparece na busca e no seletor.');
        renderSearchScreen();
        updateExerciseSuggestions();
    }
}

function submitDeleteCustomEx(id) {
    if (!confirm('Tem certeza que quer excluir este exercício? Os registros antigos dele continuam no histórico.')) return;
    deleteCustomExercise(id);
    closeModal();
    alertModal('🗑️ Exercício excluído.');
    renderSearchScreen();
}

// ============================================================
// ETAPA 5.1 — manifesto de exports (fundação para ES modules)
// Cada arquivo declara explicitamente a sua superfície pública.
// No carregamento clássico os globais continuam valendo; quando a
// migração para <script type="module"> acontecer, este bloco vira
// `export { ... }`.
// ============================================================
// Ensina o catálogo a enxergar os exercícios customizados (sem ciclo de import)
setCustomExercisesRef(() => customExercises);

(function (g) {
    const exports_ = {
        STORAGE_KEY_CUSTOM_EX,
    customExercises,
    loadCustomExercises,
    saveCustomExercises,
    getCustomExercises,
    setCustomExercisesList,
    normalizarExerciciosPersonalizados,
    customBySearch,
    customByName,
    rebuildCustomCatalog,
    rebuildFullSearchIndex,
    allExercisesList,
    catalogInfoCustom,
    exercicioCarregaLombarCustom,
    addCustomExercise,
    updateCustomExercise,
    deleteCustomExercise,
    customExerciseFormHTML,
    updateCustomExFormHint,
    openCustomExModal,
    closeCustomExModal,
    submitCustomExForm,
    submitDeleteCustomEx
    };
    g.__diarioExports = Object.assign(g.__diarioExports || {}, exports_);
    // Ações delegáveis (js/actions.js): toda função pública do módulo fica
    // disponível para os atributos data-action dos templates.
    const actionFns = {};
    Object.keys(exports_).forEach(k => { if (typeof exports_[k] === 'function') actionFns[k] = exports_[k]; });
    g.registerDiarioActions(actionFns);
    g.__diarioExportFiles = Object.assign(g.__diarioExportFiles || {}, { "js/custom_exercises.js": Object.keys(exports_).length });
})(typeof window !== 'undefined' ? window : globalThis);
export { STORAGE_KEY_CUSTOM_EX, customExercises, loadCustomExercises, saveCustomExercises, getCustomExercises, setCustomExercisesList, normalizarExerciciosPersonalizados, customBySearch, customByName, rebuildCustomCatalog, rebuildFullSearchIndex, allExercisesList, catalogInfoCustom, exercicioCarregaLombarCustom, addCustomExercise, updateCustomExercise, deleteCustomExercise, customExerciseFormHTML, updateCustomExFormHint, openCustomExModal, closeCustomExModal, submitCustomExForm, submitDeleteCustomEx };
