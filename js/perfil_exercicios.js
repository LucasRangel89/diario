import { CATALOG_ALIASES, EXERCISE_CATALOG_FULL, LEGACY_MUSCLE_ALIASES, MUSCLE_META, MUSCULOS_MAPA, SINERGIA, catalogInfo, faixaSeriesDoGrupo, normalizeText } from './catalogo.js';
import { isoDataValida } from './datas.js';

/* ============================================================
   PERFIS SEMÂNTICOS DE EXERCÍCIO — BASE ADITIVA E VERSIONADA
   ------------------------------------------------------------
   Esta é a base da Etapa 2 do plano em
   docs/ANALISE_CRITICA_RELATORIO_CARGAS.md. Ela NÃO muda nenhum
   comportamento existente:

   - `muscle` continua sendo o campo legado e autoritativo dos
     registros, do CSV e do backup JSON;
   - metas semanais, XP, chefões, volume, 1RM, histórico e
     recomendações continuam usando o grupo do catálogo, sem
     consultar este módulo;
   - nenhum exercício foi classificado anatomicamente: na v1 todos
     os perfis nascem `nao_revisado`, sem músculos primários ou
     secundários;
   - o perfil não substitui uma revisão profissional. Nome, tags e
     regex não são usados como classificação anatômica.

   O perfil é versionado por `schemaVersion` (schema dos campos) e,
   quando revisado, por `revisao.versao` (versão daquela revisão).
   O grupo legado nunca é alterado por um perfil: se um registro
   revisado divergir do catálogo, ele é ignorado e o perfil volta a
   `nao_revisado` com a limitação `registro_revisado_invalido`.

   Exercícios personalizados também têm identidade versionada aqui
   (decisão pendente #8): `idEstavel` cunhado na criação e preservado
   em renomes, `versao` da definição, grupo do usuário só como
   agrupamento organizacional e perfil sempre `nao_revisado`.
   ============================================================ */

const PERFIL_SCHEMA_VERSION = 1;

const PERFIL_STATUS = Object.freeze({
    NAO_REVISADO: 'nao_revisado',
    REVISADO: 'revisado'
});

const PERFIL_ORIGEM = Object.freeze({
    CATALOGO: 'catalogo',
    FORA_DO_CATALOGO: 'fora_do_catalogo'
});

// Campos que apresentariam contribuição secundária como série biológica
// equivalente. O schema os proíbe explicitamente: fator heurístico não é
// medida de estímulo nem "série equivalente".
const PERFIL_CAMPOS_PROIBIDOS = Object.freeze([
    'seriesEquivalentes',
    'seriesBiologicas',
    'seriesEquivalentesBiologicas',
    'equivalenciaBiologica'
]);

// Registro de perfis revisados. Vazio na v1 de propósito: nenhum exercício
// passou por revisão profissional nesta etapa. Uma futura revisão entra aqui
// uma a uma, com revisor, data, versão e grupo legado compatível.
const PERFIS_REVISADOS = Object.freeze({});
const PERFIL_REGISTRO = Object.freeze({
    schemaVersion: PERFIL_SCHEMA_VERSION,
    status: 'base_sem_revisao_profissional',
    perfis: PERFIS_REVISADOS
});

// Aliases do catálogo agrupados pelo nome canônico (identidade, não anatomia).
const ALIASES_POR_CANONICO = (() => {
    const mapa = {};
    Object.entries(CATALOG_ALIASES).forEach(([alias, alvo]) => {
        (mapa[alvo] = mapa[alvo] || []).push(alias);
    });
    Object.keys(mapa).forEach(alvo => {
        mapa[alvo] = Object.freeze([...new Set(mapa[alvo])].sort((a, b) => a.localeCompare(b, 'pt-BR')));
    });
    return Object.freeze(mapa);
})();

function ehObjetoSimples(v) {
    return !!v && typeof v === 'object' && !Array.isArray(v);
}
function textoPreenchido(v) {
    return typeof v === 'string' && v.trim().length > 0;
}
function idEstavelValido(id) {
    return typeof id === 'string' && /^ex-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id);
}
function camposProibidosPresentes(obj) {
    if (!ehObjetoSimples(obj)) return [];
    return PERFIL_CAMPOS_PROIBIDOS.filter(k => Object.prototype.hasOwnProperty.call(obj, k));
}

// ---------- Exercícios personalizados (registro por injeção) ----------
// Este módulo NÃO importa js/custom_exercises.js (que importa este arquivo).
// Assim como js/catalogo.js faz com setCustomExercisesRef, a lista de
// exercícios personalizados chega por injeção de referência. A identidade de
// um personalizado é o `idEstavel` cunhado na criação e PRESERVADO em renomes
// e edições (decisão pendente #8 de docs/TAXONOMIA_EXERCICIOS.md): o nome
// atual é rótulo; a identidade é o ID. Nada disso é anatomia — o perfil de
// personalizado continua sempre `nao_revisado`.
let exerciciosPersonalizadosRef = () => [];
function setExerciciosPersonalizadosRef(fn) {
    exerciciosPersonalizadosRef = typeof fn === 'function' ? fn : () => [];
}
function exercicioPersonalizadoPorNome(nome) {
    const n = String(nome || '').trim().toLowerCase();
    if (!n) return null;
    let lista;
    try {
        lista = exerciciosPersonalizadosRef();
    } catch (e) {
        return null;
    }
    if (!Array.isArray(lista)) return null;
    return lista.find(e => e && typeof e === 'object' && typeof e.nome === 'string' && e.nome.trim().toLowerCase() === n) || null;
}

// ID estável derivado do NOME CANÔNICO do catálogo (nunca do nome digitado).
// É identidade, não classificação: um alias ("stiff") resolve para o mesmo ID.
// Renomear um exercício do catálogo exigirá manter o ID antigo como alias em
// uma migração explícita (decisão pendente documentada).
function idEstavelDeCatalogo(cat) {
    if (!cat || typeof cat.nome !== 'string') return null;
    const slug = normalizeText(cat.nome).replace(/\s+/g, '-');
    return slug ? `ex-${slug}` : null;
}

function idEstavelDoExercicio(nome) {
    const bruto = typeof nome === 'string' ? nome.trim() : '';
    if (!bruto) return null;
    // Personalizado registrado: o ID é o persistido (sobrevive a renomes),
    // nunca um slug derivado do nome atual.
    const custom = exercicioPersonalizadoPorNome(bruto);
    if (custom) return idEstavelValido(custom.idEstavel) ? custom.idEstavel : null;
    const cat = catalogInfo(bruto);
    // catalogInfo também enxerga personalizados (injetados no índice do
    // catálogo por js/custom_exercises.js); esses não têm identidade de catálogo.
    if (!cat || cat.isCustom) return null;
    return idEstavelDeCatalogo(cat);
}

// IDs reservados do catálogo: um personalizado nunca pode cunhar (nem preservar,
// vindo de arquivo) um ID igual ao de um exercício do catálogo — a chave de
// PERFIS_REVISADOS é o ID e identidade trocada seria impessoação.
function idsEstaveisDoCatalogo() {
    return EXERCISE_CATALOG_FULL.map(e => idEstavelDeCatalogo(e)).filter(Boolean);
}

// Cunha um ID estável novo para exercício personalizado. Determinístico: mesmo
// nome e mesmos IDs ocupados → mesmo resultado. `ocupados` são IDs já usados
// por outros personalizados; os IDs do catálogo entram sempre na reserva.
function idEstavelDeNomePersonalizado(nome, ocupados = new Set()) {
    const reservados = new Set(idsEstaveisDoCatalogo());
    if (ocupados && typeof ocupados[Symbol.iterator] === 'function') {
        for (const id of ocupados) if (idEstavelValido(id)) reservados.add(id);
    }
    const slug = normalizeText(nome).replace(/\s+/g, '-') || 'personalizado';
    let candidato = `ex-${slug}`;
    let sufixo = 2;
    while (reservados.has(candidato)) candidato = `ex-${slug}-${sufixo++}`;
    return candidato;
}

function aliasesDoExercicio(nome) {
    const bruto = typeof nome === 'string' ? nome.trim() : '';
    if (!bruto) return [];
    const custom = exercicioPersonalizadoPorNome(bruto);
    if (custom) {
        return String(custom.sinonimos || '').split(/[,;]/).map(s => s.trim()).filter(Boolean);
    }
    const cat = catalogInfo(bruto);
    if (!cat || cat.isCustom) return [];
    return [...(ALIASES_POR_CANONICO[cat.nome] || [])];
}

// ---------- Validação do schema (pura; não consulta o catálogo) ----------
// Regras centrais:
//   - perfil não revisado NÃO pode carregar anatomia, padrão ou revisão;
//   - perfil revisado exige revisor, data válida, versão, músculos primários
//     e padrão de movimento - mas não validamos a anatomia em si (isso é
//     responsabilidade da revisão profissional, não do código);
//   - campos de "séries equivalentes" são proibidos em qualquer nível.
function validarPerfilExercicio(perfil) {
    const erros = [];
    if (!ehObjetoSimples(perfil)) return { ok: false, erros: ['perfil não é um objeto'] };

    if (perfil.schemaVersion !== PERFIL_SCHEMA_VERSION) {
        erros.push(`schemaVersion deve ser ${PERFIL_SCHEMA_VERSION}`);
    }
    // Perfil fora do catálogo sem ID estável (nome solto, não registrado) tem
    // `idEstavel` null e nunca entra no registro revisado (a chave do registro
    // é o ID). Exercício PERSONALIZADO registrado carrega um `ex-...` persistido
    // (cunhado na criação e preservado em renomes — identidade versionada);
    // sem ID, ele também não entra em PERFIS_REVISADOS.
    const idValido = perfil.origem === PERFIL_ORIGEM.FORA_DO_CATALOGO
        ? (perfil.idEstavel === null || idEstavelValido(perfil.idEstavel))
        : idEstavelValido(perfil.idEstavel);
    if (!idValido) {
        erros.push(perfil.origem === PERFIL_ORIGEM.FORA_DO_CATALOGO
            ? 'idEstavel deve ser null ou ex-slug em perfil fora do catálogo'
            : 'idEstavel ausente ou fora do formato ex-slug');
    }
    if (!textoPreenchido(perfil.nomeCanonico)) {
        erros.push('nomeCanonico ausente');
    }
    if (!Object.values(PERFIL_STATUS).includes(perfil.statusRevisao)) {
        erros.push('statusRevisao deve ser nao_revisado ou revisado');
    }
    if (!Object.values(PERFIL_ORIGEM).includes(perfil.origem)) {
        erros.push('origem deve ser catalogo ou fora_do_catalogo');
    }
    if (!ehObjetoSimples(perfil.taxonomiaLegada) ||
        !(perfil.taxonomiaLegada.grupo === null || textoPreenchido(perfil.taxonomiaLegada.grupo))) {
        erros.push('taxonomiaLegada.grupo deve ser texto ou null');
    }
    if (!ehObjetoSimples(perfil.agrupamentoVisual) ||
        !(perfil.agrupamentoVisual.grupo === null || textoPreenchido(perfil.agrupamentoVisual.grupo))) {
        erros.push('agrupamentoVisual.grupo deve ser texto ou null');
    }
    if (perfil.aliases !== undefined && (!Array.isArray(perfil.aliases) || !perfil.aliases.every(textoPreenchido))) {
        erros.push('aliases deve ser uma lista de textos');
    }
    if (perfil.limitacoes !== undefined && (!Array.isArray(perfil.limitacoes) || !perfil.limitacoes.every(textoPreenchido))) {
        erros.push('limitacoes deve ser uma lista de textos');
    }
    if (camposProibidosPresentes(perfil).length) {
        erros.push(`campo proibido no perfil: ${camposProibidosPresentes(perfil).join(', ')}`);
    }

    if (perfil.statusRevisao === PERFIL_STATUS.NAO_REVISADO) {
        if (perfil.anatomia !== undefined && perfil.anatomia !== null) erros.push('perfil não revisado não pode ter anatomia');
        if (perfil.padraoMovimento !== undefined && perfil.padraoMovimento !== null) erros.push('perfil não revisado não pode ter padrão de movimento');
        if (perfil.revisao !== undefined && perfil.revisao !== null) erros.push('perfil não revisado não pode ter revisão');
        if (perfil.musculosPrimarios !== undefined || perfil.musculosSecundarios !== undefined) {
            erros.push('músculos devem ficar em anatomia e só existir em perfil revisado');
        }
    } else if (perfil.statusRevisao === PERFIL_STATUS.REVISADO) {
        const rev = perfil.revisao;
        if (!ehObjetoSimples(rev)) {
            erros.push('perfil revisado exige revisao');
        } else {
            if (!textoPreenchido(rev.por) || rev.por.trim().length < 3) erros.push('revisao.por deve identificar o revisor');
            if (!isoDataValida(rev.em)) erros.push('revisao.em deve ser uma data ISO válida');
            if (!Number.isInteger(rev.versao) || rev.versao < 1) erros.push('revisao.versao deve ser inteiro >= 1');
            if (camposProibidosPresentes(rev).length) erros.push('campo de equivalência de séries não é permitido em revisao');
        }

        const anatomia = perfil.anatomia;
        if (!ehObjetoSimples(anatomia)) {
            erros.push('perfil revisado exige anatomia');
        } else {
            const primarios = anatomia.musculosPrimarios;
            if (!Array.isArray(primarios) || primarios.length === 0) {
                erros.push('anatomia.musculosPrimarios deve ser uma lista não vazia');
            } else {
                if (!primarios.every(textoPreenchido)) erros.push('anatomia.musculosPrimarios contém item vazio');
                const normalizados = primarios.map(normalizeText);
                if (new Set(normalizados).size !== normalizados.length) erros.push('anatomia.musculosPrimarios contém duplicata');
            }
            const secundarios = anatomia.musculosSecundarios;
            if (secundarios !== undefined) {
                if (!Array.isArray(secundarios)) {
                    erros.push('anatomia.musculosSecundarios deve ser uma lista');
                } else {
                    secundarios.forEach((s, i) => {
                        if (!ehObjetoSimples(s) || !textoPreenchido(s.musculo)) erros.push(`anatomia.musculosSecundarios[${i}] sem músculo`);
                        else {
                            if (s.papel !== 'secundario') erros.push(`anatomia.musculosSecundarios[${i}].papel deve ser secundario`);
                            if (s.contribuicao !== 'estimada') erros.push(`anatomia.musculosSecundarios[${i}].contribuicao deve ser estimada`);
                            if (camposProibidosPresentes(s).length) erros.push(`anatomia.musculosSecundarios[${i}] usa campo de equivalência de séries`);
                        }
                    });
                }
            }
            if (camposProibidosPresentes(anatomia).length) erros.push('anatomia usa campo de equivalência de séries');
        }

        const padrao = perfil.padraoMovimento;
        if (!ehObjetoSimples(padrao)) {
            erros.push('perfil revisado exige padraoMovimento');
        } else {
            if (typeof padrao.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(padrao.id)) erros.push('padraoMovimento.id fora do formato slug');
            if (!textoPreenchido(padrao.rotulo)) erros.push('padraoMovimento.rotulo ausente');
            if (camposProibidosPresentes(padrao).length) erros.push('campo de equivalência de séries não é permitido em padraoMovimento');
        }
    }

    return { ok: erros.length === 0, erros };
}

// Um registro só aceita perfis revisados, com a chave igual ao ID estável.
function validarRegistroPerfis(registro = PERFIS_REVISADOS) {
    const erros = [];
    if (!ehObjetoSimples(registro)) return { ok: false, erros: ['registro de perfis não é um objeto'] };
    Object.entries(registro).forEach(([chave, perfil]) => {
        const validacao = validarPerfilExercicio(perfil);
        if (!validacao.ok) {
            erros.push(`${chave}: ${validacao.erros.join('; ')}`);
            return;
        }
        if (perfil.statusRevisao !== PERFIL_STATUS.REVISADO) {
            erros.push(`${chave}: o registro de perfis revisados não aceita perfil nao_revisado`);
        }
        if (perfil.idEstavel !== chave) {
            erros.push(`${chave}: a chave difere do idEstavel`);
        }
    });
    return { ok: erros.length === 0, erros };
}

// ---------- Perfis derivados do catálogo ----------
function perfilNaoRevisadoDeCatalogo(cat) {
    return {
        schemaVersion: PERFIL_SCHEMA_VERSION,
        idEstavel: idEstavelDoExercicio(cat.nome),
        nomeCanonico: cat.nome,
        aliases: aliasesDoExercicio(cat.nome),
        origem: PERFIL_ORIGEM.CATALOGO,
        statusRevisao: PERFIL_STATUS.NAO_REVISADO,
        taxonomiaLegada: { grupo: cat.grupo },
        agrupamentoVisual: { grupo: cat.grupo },
        anatomia: null,
        padraoMovimento: null,
        revisao: null,
        limitacoes: ['perfil_nao_revisado', 'sem_anatomia_validada']
    };
}

function perfilForaDoCatalogo(nomeBruto) {
    return {
        schemaVersion: PERFIL_SCHEMA_VERSION,
        idEstavel: null,
        nomeCanonico: nomeBruto,
        aliases: [],
        origem: PERFIL_ORIGEM.FORA_DO_CATALOGO,
        statusRevisao: PERFIL_STATUS.NAO_REVISADO,
        taxonomiaLegada: { grupo: null },
        agrupamentoVisual: { grupo: null },
        anatomia: null,
        padraoMovimento: null,
        revisao: null,
        limitacoes: ['perfil_nao_revisado', 'sem_anatomia_validada', 'fora_do_catalogo']
    };
}

// Perfil de exercício PERSONALIZADO: identidade versionada, sem anatomia.
// A identidade é o `idEstavel` persistido do registro (sobrevive a renomes);
// `versao` do registro versiona a definição, não a classificação. O grupo
// declarado pelo usuário é organizacional (taxonomiaLegada/agrupamentoVisual)
// e NUNCA vira anatomia validada: o perfil permanece `nao_revisado` e qualquer
// entrada de perfil revisado para o mesmo ID é ignorada (decisão pendente #8:
// "manter nao_revisado" até existir fluxo de revisão/opt-in).
function perfilDePersonalizado(entry, registro = PERFIS_REVISADOS) {
    const nome = entry && typeof entry.nome === 'string' ? entry.nome.trim() : '';
    if (!nome) return null;
    const id = entry && idEstavelValido(entry.idEstavel) ? entry.idEstavel : null;
    const grupo = entry && textoPreenchido(entry.grupo) ? entry.grupo : null;
    const limitacoes = ['perfil_nao_revisado', 'sem_anatomia_validada', 'fora_do_catalogo'];
    if (grupo) limitacoes.push('grupo_declarado_pelo_usuario');
    if (!id) limitacoes.push('sem_id_estavel');
    else if (registro && Object.prototype.hasOwnProperty.call(registro, id)) {
        limitacoes.push('registro_revisado_invalido');
    }
    return {
        schemaVersion: PERFIL_SCHEMA_VERSION,
        idEstavel: id,
        nomeCanonico: nome,
        aliases: String(entry.sinonimos || '').split(/[,;]/).map(s => s.trim()).filter(Boolean),
        origem: PERFIL_ORIGEM.FORA_DO_CATALOGO,
        statusRevisao: PERFIL_STATUS.NAO_REVISADO,
        taxonomiaLegada: { grupo },
        agrupamentoVisual: { grupo },
        anatomia: null,
        padraoMovimento: null,
        revisao: null,
        limitacoes
    };
}

function copiarAnatomia(anatomia) {
    if (!ehObjetoSimples(anatomia)) return null;
    return {
        musculosPrimarios: [...(anatomia.musculosPrimarios || [])],
        musculosSecundarios: (anatomia.musculosSecundarios || []).map(s => ({ ...s })),
        ...(textoPreenchido(anatomia.observacoes) ? { observacoes: anatomia.observacoes } : {})
    };
}

// Perfil de um exercício. Sem revisão (padrão), devolve apenas identidade +
// grupo legado + limitações. Um registro revisado só é aceito se continuar
// compatível com o catálogo: mesmo ID, mesmo nome canônico e MESMO grupo
// legado. Divergência não reclassifica nada: cai no perfil não revisado.
function perfilDoExercicio(nome, registro = PERFIS_REVISADOS) {
    const bruto = typeof nome === 'string' ? nome.trim() : '';
    if (!bruto) return null;

    // Personalizado registrado vem ANTES do catálogo: o índice do catálogo
    // também recebe os personalizados (js/custom_exercises.js), e a identidade
    // certa é a persistida, não um slug derivado do nome atual.
    const custom = exercicioPersonalizadoPorNome(bruto);
    if (custom) return perfilDePersonalizado(custom, registro);

    const cat = catalogInfo(bruto);
    if (!cat || cat.isCustom) return perfilForaDoCatalogo(bruto);

    const base = perfilNaoRevisadoDeCatalogo(cat);
    const id = base.idEstavel;
    const revisado = registro && Object.prototype.hasOwnProperty.call(registro, id) ? registro[id] : null;
    if (!revisado) return base;

    const validacao = validarPerfilExercicio(revisado);
    const compativel = validacao.ok
        && revisado.statusRevisao === PERFIL_STATUS.REVISADO
        && revisado.idEstavel === id
        && normalizeText(revisado.nomeCanonico) === normalizeText(cat.nome)
        && ehObjetoSimples(revisado.taxonomiaLegada)
        && revisado.taxonomiaLegada.grupo === cat.grupo;

    if (!compativel) {
        return { ...base, limitacoes: [...base.limitacoes, 'registro_revisado_invalido'] };
    }

    return {
        schemaVersion: PERFIL_SCHEMA_VERSION,
        idEstavel: id,
        nomeCanonico: cat.nome,
        aliases: base.aliases,
        origem: PERFIL_ORIGEM.CATALOGO,
        statusRevisao: PERFIL_STATUS.REVISADO,
        taxonomiaLegada: { grupo: cat.grupo },
        agrupamentoVisual: { grupo: cat.grupo },
        anatomia: copiarAnatomia(revisado.anatomia),
        padraoMovimento: revisado.padraoMovimento ? { ...revisado.padraoMovimento } : null,
        revisao: revisado.revisao ? { ...revisado.revisao } : null,
        limitacoes: []
    };
}

// Única porta de entrada para inferência anatômica. Devolve null enquanto o
// perfil não for revisado - o chamador não tem como "adivinhar" músculos.
function contribuicaoAnatomica(nome, registro = PERFIS_REVISADOS) {
    const perfil = perfilDoExercicio(nome, registro);
    if (!perfil || perfil.statusRevisao !== PERFIL_STATUS.REVISADO || !perfil.anatomia) return null;
    return {
        musculosPrimarios: [...perfil.anatomia.musculosPrimarios],
        musculosSecundarios: (perfil.anatomia.musculosSecundarios || []).map(s => ({ ...s })),
        padraoMovimento: perfil.padraoMovimento ? { ...perfil.padraoMovimento } : null,
        revisao: perfil.revisao ? { ...perfil.revisao } : null
    };
}

// ---------- Inventário da taxonomia vigente (somente leitura) ----------
// Documenta o que existe hoje, sem propor grupos novos. É a fonte usada por
// docs/TAXONOMIA_EXERCICIOS.md e pelos testes de compatibilidade.
function inventarioTaxonomia() {
    const gruposCatalogo = [...new Set(EXERCISE_CATALOG_FULL.map(e => e.grupo))];
    const grupos = [...new Set([...MUSCULOS_MAPA, ...Object.keys(MUSCLE_META), ...gruposCatalogo])];
    const porGrupo = {};
    let perfisRevisados = 0;

    grupos.forEach(grupo => {
        const exercicios = EXERCISE_CATALOG_FULL.filter(e => e.grupo === grupo).map(e => e.nome);
        const revisados = exercicios
            .map(nome => perfilDoExercicio(nome))
            .filter(perfil => perfil && perfil.statusRevisao === PERFIL_STATUS.REVISADO).length;
        perfisRevisados += revisados;
        porGrupo[grupo] = {
            grupo,
            noMapa: MUSCULOS_MAPA.includes(grupo),
            recuperacaoHoras: MUSCLE_META[grupo] ? MUSCLE_META[grupo].recoveryH : null,
            xpPeso: MUSCLE_META[grupo] ? MUSCLE_META[grupo].xpWeight : null,
            faixaSeries: MUSCULOS_MAPA.includes(grupo) ? { ...faixaSeriesDoGrupo(grupo) } : null,
            exercicios,
            totalExercicios: exercicios.length,
            perfisRevisados: revisados,
            perfisNaoRevisados: exercicios.length - revisados
        };
    });

    return {
        schemaVersion: PERFIL_SCHEMA_VERSION,
        totalExercicios: EXERCISE_CATALOG_FULL.length,
        grupos,
        gruposNoMapa: [...MUSCULOS_MAPA],
        porGrupo,
        aliasesMuscularesLegados: { ...LEGACY_MUSCLE_ALIASES },
        regrasDeApoioIndireto: Object.entries(SINERGIA).map(([grupo, cfg]) => ({
            grupo,
            fator: cfg.fator,
            de: cfg.de,
            regexFonte: String(cfg.re)
        })),
        resumo: {
            totalExercicios: EXERCISE_CATALOG_FULL.length,
            totalGrupos: grupos.length,
            gruposNoMapa: MUSCULOS_MAPA.length,
            perfisRevisados,
            perfisNaoRevisados: EXERCISE_CATALOG_FULL.length - perfisRevisados
        }
    };
}

// ============================================================
// Manifesto de exports (mesmo padrão dos outros módulos em js/).
// ============================================================
(function (g) {
    const exports_ = {
        PERFIL_SCHEMA_VERSION,
        PERFIL_STATUS,
        PERFIL_ORIGEM,
        PERFIS_REVISADOS,
        PERFIL_REGISTRO,
        idEstavelDoExercicio,
        idEstavelDeCatalogo,
        idEstavelDeNomePersonalizado,
        idEstavelValido,
        idsEstaveisDoCatalogo,
        aliasesDoExercicio,
        setExerciciosPersonalizadosRef,
        exercicioPersonalizadoPorNome,
        perfilDoExercicio,
        perfilDePersonalizado,
        contribuicaoAnatomica,
        validarPerfilExercicio,
        validarRegistroPerfis,
        inventarioTaxonomia
    };
    g.__diarioExports = Object.assign(g.__diarioExports || {}, exports_);
    // Ações delegáveis (js/actions.js): toda função pública do módulo fica
    // disponível para os atributos data-action dos templates.
    const actionFns = {};
    Object.keys(exports_).forEach(k => { if (typeof exports_[k] === 'function') actionFns[k] = exports_[k]; });
    g.registerDiarioActions(actionFns);
    g.__diarioExportFiles = Object.assign(g.__diarioExportFiles || {}, { "js/perfil_exercicios.js": Object.keys(exports_).length });
})(typeof window !== 'undefined' ? window : globalThis);

export { PERFIL_SCHEMA_VERSION, PERFIL_STATUS, PERFIL_ORIGEM, PERFIS_REVISADOS, PERFIL_REGISTRO, idEstavelDoExercicio, idEstavelDeCatalogo, idEstavelDeNomePersonalizado, idEstavelValido, idsEstaveisDoCatalogo, aliasesDoExercicio, setExerciciosPersonalizadosRef, exercicioPersonalizadoPorNome, perfilDoExercicio, perfilDePersonalizado, contribuicaoAnatomica, validarPerfilExercicio, validarRegistroPerfis, inventarioTaxonomia };
