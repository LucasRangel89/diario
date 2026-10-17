/* ============================================================
   PERFIS SEMÂNTICOS DE EXERCÍCIO — BASE ADITIVA (SCHEMA v1)
   ------------------------------------------------------------
   Trecho de test_engine.js, avaliado no mesmo escopo dos demais.
   Cobre:
   - schema/versionamento e estados de revisão;
   - ausência de classificação anatômica inventada em 72/72 exercícios;
   - compatibilidade do grupo legado em histórico, metas, chefões,
     CSV e backup JSON;
   - validação de perfis revisados e rejeição de "séries equivalentes";
   - inventário da taxonomia (documentado em docs/TAXONOMIA_EXERCICIOS.md).
   Nenhum dado do usuário é migrado por este trecho.
   ============================================================ */

console.log('\n== 18c. Perfis de exercício: base aditiva v1 ==');

const CAMPOS_EQUIVALENCIA = ['seriesEquivalentes', 'seriesBiologicas', 'seriesEquivalentesBiologicas', 'equivalenciaBiologica'];

check('schema v1, estados e registro são congelados', api.PERFIL_SCHEMA_VERSION === 1
    && Object.isFrozen(api.PERFIL_STATUS)
    && api.PERFIL_STATUS.NAO_REVISADO === 'nao_revisado'
    && api.PERFIL_STATUS.REVISADO === 'revisado'
    && Object.isFrozen(api.PERFIS_REVISADOS)
    && api.PERFIL_REGISTRO.schemaVersion === 1
    && api.PERFIL_REGISTRO.perfis === api.PERFIS_REVISADOS);
check('v1 não declara nenhum perfil revisado', Object.keys(api.PERFIS_REVISADOS).length === 0
    && api.validarRegistroPerfis().ok === true);
check('72 exercícios têm ID estável único (identidade, não anatomia)', (() => {
    const ids = api.EXERCISE_CATALOG_FULL.map(e => api.idEstavelDoExercicio(e.nome));
    return ids.length === 72 && ids.every(id => /^ex-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) && new Set(ids).size === 72;
})());
check('alias do catálogo resolve para o mesmo ID e nome canônico',
    api.idEstavelDoExercicio('stiff') === api.idEstavelDoExercicio('Stiff com Barra')
    && api.perfilDoExercicio('stiff').nomeCanonico === 'Stiff com Barra'
    && api.aliasesDoExercicio('stiff').includes('stiff'));
check('alias "supino" aponta para o supino do catálogo (não para um grupo inventado)',
    api.perfilDoExercicio('supino').nomeCanonico === 'Supino Reto na Máquina'
    && api.perfilDoExercicio('supino').taxonomiaLegada.grupo === 'Peito');

const PERFIS_CATALOGO = api.EXERCISE_CATALOG_FULL.map(entry => ({ entry, perfil: api.perfilDoExercicio(entry.nome) }));
check('todo exercício do catálogo tem perfil não revisado e sem anatomia',
    PERFIS_CATALOGO.every(({ perfil }) => perfil
        && perfil.statusRevisao === api.PERFIL_STATUS.NAO_REVISADO
        && perfil.anatomia === null
        && perfil.padraoMovimento === null
        && perfil.revisao === null));
check('o grupo legado do perfil é exatamente o grupo do catálogo (nenhuma reclassificação)',
    PERFIS_CATALOGO.every(({ entry, perfil }) => perfil.taxonomiaLegada.grupo === entry.grupo
        && perfil.agrupamentoVisual.grupo === entry.grupo));
check('perfil não revisado nunca gera contribuição anatômica',
    PERFIS_CATALOGO.every(({ entry }) => api.contribuicaoAnatomica(entry.nome) === null));
check('nenhum perfil usa campo de "séries equivalentes"',
    PERFIS_CATALOGO.every(({ perfil }) => CAMPOS_EQUIVALENCIA.every(k => !(k in perfil)
        && !(perfil.anatomia && k in perfil.anatomia))));

const perfilFora = api.perfilDoExercicio('Exercício Inventado XYZ');
check('exercício fora do catálogo não recebe ID, grupo nem anatomia',
    perfilFora && perfilFora.origem === 'fora_do_catalogo' && perfilFora.idEstavel === null
    && perfilFora.taxonomiaLegada.grupo === null && perfilFora.agrupamentoVisual.grupo === null
    && perfilFora.anatomia === null && perfilFora.limitacoes.includes('fora_do_catalogo'));
check('perfil fora do catálogo passa na validação sem inventar ID nem anatomia',
    perfilFora.idEstavel === null && api.validarPerfilExercicio(perfilFora).ok === true
    && api.contribuicaoAnatomica('Exercício Inventado XYZ') === null);
check('nome vazio não cria perfil', api.perfilDoExercicio('') === null && api.perfilDoExercicio(null) === null);
check('Extensão Cervical continua em Ombros (legado preservado)',
    api.perfilDoExercicio('Extensão Cervical').taxonomiaLegada.grupo === 'Ombros');

// ---------- Validação de perfil revisado (dados sintéticos de teste) ----------
// Não é uma classificação real do catálogo: serve só para provar o schema.
const perfilRevisadoSintetico = {
    schemaVersion: 1,
    idEstavel: 'ex-supino-reto-na-maquina',
    nomeCanonico: 'Supino Reto na Máquina',
    aliases: ['supino'],
    origem: 'catalogo',
    statusRevisao: 'revisado',
    taxonomiaLegada: { grupo: 'Peito' },
    agrupamentoVisual: { grupo: 'Peito' },
    anatomia: {
        musculosPrimarios: ['peitoral-maior'],
        musculosSecundarios: [{ musculo: 'triceps-braquial', papel: 'secundario', contribuicao: 'estimada' }]
    },
    padraoMovimento: { id: 'empurrar-horizontal', rotulo: 'Empurrar horizontal' },
    revisao: { por: 'Revisor de teste', em: '2026-10-17', versao: 1 }
};
const perfilNaoRevisadoSintetico = {
    ...perfilRevisadoSintetico,
    statusRevisao: 'nao_revisado',
    anatomia: null,
    padraoMovimento: null,
    revisao: null
};

check('perfil não revisado sintético passa na validação',
    api.validarPerfilExercicio(perfilNaoRevisadoSintetico).ok === true);
check('perfil revisado sintético completo passa na validação',
    api.validarPerfilExercicio(perfilRevisadoSintetico).ok === true);
check('perfil de catálogo sem ID estável é rejeitado (identidade obrigatória)',
    api.validarPerfilExercicio({ ...perfilNaoRevisadoSintetico, idEstavel: null }).ok === false
    && api.validarPerfilExercicio({ ...perfilNaoRevisadoSintetico, idEstavel: 'Supino Reto' }).ok === false);
check('perfil revisado sem revisor/data/versão é rejeitado',
    api.validarPerfilExercicio({ ...perfilRevisadoSintetico, revisao: null }).ok === false
    && api.validarPerfilExercicio({ ...perfilRevisadoSintetico, revisao: { por: '', em: '2026-10-17', versao: 1 } }).ok === false
    && api.validarPerfilExercicio({ ...perfilRevisadoSintetico, revisao: { por: 'Revisor', em: '2026-02-31', versao: 1 } }).ok === false
    && api.validarPerfilExercicio({ ...perfilRevisadoSintetico, revisao: { por: 'Revisor', em: '2026-10-17', versao: 0 } }).ok === false);
check('perfil revisado sem músculos primários é rejeitado',
    api.validarPerfilExercicio({ ...perfilRevisadoSintetico, anatomia: { ...perfilRevisadoSintetico.anatomia, musculosPrimarios: [] } }).ok === false
    && api.validarPerfilExercicio({ ...perfilRevisadoSintetico, anatomia: null }).ok === false);
check('perfil revisado sem padrão de movimento é rejeitado',
    api.validarPerfilExercicio({ ...perfilRevisadoSintetico, padraoMovimento: null }).ok === false);
check('perfil não revisado não pode carregar anatomia, padrão ou revisão',
    api.validarPerfilExercicio({ ...perfilNaoRevisadoSintetico, anatomia: perfilRevisadoSintetico.anatomia }).ok === false
    && api.validarPerfilExercicio({ ...perfilNaoRevisadoSintetico, padraoMovimento: perfilRevisadoSintetico.padraoMovimento }).ok === false
    && api.validarPerfilExercicio({ ...perfilNaoRevisadoSintetico, revisao: perfilRevisadoSintetico.revisao }).ok === false
    && api.validarPerfilExercicio({ ...perfilNaoRevisadoSintetico, musculosPrimarios: ['peitoral-maior'] }).ok === false);
check('contribuição secundária só aceita papel "secundario" e contribuição "estimada"',
    api.validarPerfilExercicio({
        ...perfilRevisadoSintetico,
        anatomia: { ...perfilRevisadoSintetico.anatomia, musculosSecundarios: [{ musculo: 'triceps-braquial', papel: 'secundario', contribuicao: 'equivalente' }] }
    }).ok === false);
check('campo de "séries equivalentes" é proibido em qualquer nível',
    CAMPOS_EQUIVALENCIA.every(k => api.validarPerfilExercicio({ ...perfilRevisadoSintetico, [k]: [] }).ok === false)
    && api.validarPerfilExercicio({ ...perfilRevisadoSintetico, anatomia: { ...perfilRevisadoSintetico.anatomia, seriesEquivalentes: [] } }).ok === false);
check('registro aceita somente perfis revisados com chave = ID',
    api.validarRegistroPerfis({ [perfilRevisadoSintetico.idEstavel]: perfilRevisadoSintetico }).ok === true
    && api.validarRegistroPerfis({ 'ex-outro': perfilRevisadoSintetico }).ok === false
    && api.validarRegistroPerfis({ [perfilNaoRevisadoSintetico.idEstavel]: perfilNaoRevisadoSintetico }).ok === false);

// O registro injetado é só para testar o gate; o app usa PERFIS_REVISADOS (vazio).
const registroValido = { [perfilRevisadoSintetico.idEstavel]: perfilRevisadoSintetico };
const perfilInjetado = api.perfilDoExercicio('Supino Reto na Máquina', registroValido);
check('registro revisado compatível expõe anatomia e padrão',
    perfilInjetado.statusRevisao === 'revisado'
    && perfilInjetado.anatomia.musculosPrimarios[0] === 'peitoral-maior'
    && perfilInjetado.padraoMovimento.id === 'empurrar-horizontal'
    && perfilInjetado.revisao.versao === 1
    && perfilInjetado.limitacoes.length === 0);
const contribuicaoInjetada = api.contribuicaoAnatomica('Supino Reto na Máquina', registroValido);
check('contribuição anatômica revisada não carrega "séries equivalentes"',
    contribuicaoInjetada
    && contribuicaoInjetada.musculosSecundarios[0].papel === 'secundario'
    && contribuicaoInjetada.musculosSecundarios[0].contribuicao === 'estimada'
    && CAMPOS_EQUIVALENCIA.every(k => !(k in contribuicaoInjetada)));
const registroDivergente = { [perfilRevisadoSintetico.idEstavel]: { ...perfilRevisadoSintetico, taxonomiaLegada: { grupo: 'Posterior' } } };
const perfilDivergente = api.perfilDoExercicio('Supino Reto na Máquina', registroDivergente);
check('registro que tentaria mudar o grupo legado é ignorado (sem reclassificação)',
    perfilDivergente.statusRevisao === 'nao_revisado'
    && perfilDivergente.taxonomiaLegada.grupo === 'Peito'
    && perfilDivergente.anatomia === null
    && perfilDivergente.limitacoes.includes('registro_revisado_invalido'));
const registroNomeErrado = { [perfilRevisadoSintetico.idEstavel]: { ...perfilRevisadoSintetico, nomeCanonico: 'Outro exercício' } };
check('registro com nome canônico divergente também é ignorado',
    api.perfilDoExercicio('Supino Reto na Máquina', registroNomeErrado).statusRevisao === 'nao_revisado'
    && api.perfilDoExercicio('Supino Reto na Máquina', registroNomeErrado).anatomia === null);

// ---------- Inventário da taxonomia ----------
const inventario = api.inventarioTaxonomia();
const CONTAGEM_ESPERADA = { 'Peito': 10, 'Costas': 9, 'Pernas': 7, 'Posterior': 8, 'Ombros': 9, 'Bíceps': 6, 'Tríceps': 7, 'Abdômen': 7, 'Core': 2, 'Antebraço': 2, 'Cardio': 5 };
check('inventário: 72 exercícios e contagem por grupo bate com o catálogo',
    inventario.totalExercicios === 72
    && Object.entries(CONTAGEM_ESPERADA).every(([g, n]) => inventario.porGrupo[g].totalExercicios === n));
check('inventário: 10 grupos no mapa + Geral/Cardio documentados separadamente',
    inventario.gruposNoMapa.length === 10
    && inventario.porGrupo.Geral.noMapa === false
    && inventario.porGrupo.Geral.totalExercicios === 0
    && inventario.porGrupo.Cardio.noMapa === false
    && inventario.porGrupo.Cardio.totalExercicios === 5);
check('inventário: janelas, faixas e pesos legados preservados',
    inventario.porGrupo.Pernas.recuperacaoHoras === 72
    && inventario.porGrupo.Posterior.recuperacaoHoras === 48
    && inventario.porGrupo.Posterior.xpPeso === 0.5
    && inventario.porGrupo['Antebraço'].faixaSeries.min === 4
    && inventario.porGrupo['Antebraço'].faixaSeries.max === 10);
check('inventário: lista do grupo Posterior intacta',
    inventario.porGrupo.Posterior.exercicios.join('|') === ['Mesa Flexora', 'Stiff com Barra', 'Elevação Pélvica (Hip Thrust)', 'Abdutor', 'Cadeira Adutora', 'Panturrilha em Pé', 'Panturrilha Sentado', 'Swing de Kettlebell'].join('|'));
check('inventário: nenhum perfil revisado nesta etapa',
    inventario.resumo.perfisRevisados === 0
    && inventario.resumo.perfisNaoRevisados === 72
    && Object.values(inventario.porGrupo).every(g => g.perfisRevisados === 0));
check('inventário: regras de apoio indireto são heurísticas identificadas',
    inventario.regrasDeApoioIndireto.length === 7
    && inventario.regrasDeApoioIndireto.every(r => typeof r.fator === 'number' && typeof r.regexFonte === 'string' && r.regexFonte.length > 0));
check('inventário: aliases musculares legados seguem disponíveis para migração',
    inventario.aliasesMuscularesLegados['Pescoço'] === 'Ombros'
    && inventario.aliasesMuscularesLegados['Glúteos'] === 'Posterior');
check('catálogo continua com 11 grupos e nenhum grupo anatômico novo',
    inventario.grupos.filter(g => g !== 'Geral').length === 11
    && !inventario.grupos.includes('Panturrilha')
    && !inventario.grupos.includes('Glúteos')
    && !inventario.grupos.includes('Adutores'));

// ---------- Compatibilidade: nada foi reclassificado ----------
const logPanturrilha = {
    id: 99001, date: '2026-10-14', kind: 'peso', muscle: 'Posterior',
    exercise: 'Panturrilha em Pé', type: 'carga_total', weight: 70,
    reps: [16, 15, 14], sessao: 'Posterior/Acessórios', conferir: false
};
const seriesSemana = api.weeklySetsByMuscle([logPanturrilha], '2026-10-14');
check('Panturrilha continua contando séries em Posterior (metas semanais)',
    seriesSemana.Posterior === 3 && seriesSemana['Panturrilha'] === undefined, seriesSemana);
check('chefão fraco em Posterior continua recebendo o dano da Panturrilha',
    api.logDamageKg(logPanturrilha, 80, { weak: 'Posterior' }, 3, 'Posterior') === 6);

const logsAntesDoTeste = api.logsArr;
api.setLogs([logPanturrilha]);
const csvCompat = api.buildPlanilhaCSV();
api.setLogs(logsAntesDoTeste);
const sheetLog = csvCompat.split(/--- Sheet: Log ---/)[1].split(/--- Sheet:/)[0].trim();
const linhasLog = api.parseCSVRows(sheetLog, ';');
const colGrupo = linhasLog[0].indexOf('Grupo do registro');
const linhaPanturrilha = linhasLog.find(r => r[2] === 'Panturrilha em Pé');
check('CSV mantém o grupo legado Posterior na coluna "Grupo do registro"',
    colGrupo >= 0 && !!linhaPanturrilha && linhaPanturrilha[colGrupo] === 'Posterior',
    { colGrupo, grupo: linhaPanturrilha && linhaPanturrilha[colGrupo] });
const csvLido = api.lerPlanilhaCSV(csvCompat);
const panturrilhaLida = csvLido.logs.find(l => l.exercise === 'Panturrilha em Pé');
check('CSV round-trip não reclassifica a Panturrilha',
    csvLido.erros.length === 0 && !!panturrilhaLida && panturrilhaLida.muscle === 'Posterior',
    { erros: csvLido.erros, muscle: panturrilhaLida && panturrilhaLida.muscle });

const backupCompat = api.validarBackupJSON({
    version: 6,
    logs: [{ id: 1, date: '2026-10-14', exercise: 'Panturrilha em Pé', muscle: 'Posterior', weight: 70, reps: [10] }]
});
check('backup JSON preserva o grupo legado Posterior',
    backupCompat.ok === true && backupCompat.dados.logs[0].muscle === 'Posterior', backupCompat.erros);
const backupGluteos = api.validarBackupJSON({
    version: 6,
    logs: [{ id: 2, date: '2026-10-14', exercise: 'Elevação Pélvica (Hip Thrust)', muscle: 'Glúteos', reps: [10] }]
});
check('alias legado Glúteos continua migrando para Posterior (regra existente)',
    backupGluteos.ok === true && backupGluteos.dados.logs[0].muscle === 'Posterior', backupGluteos.erros);
check('migrateLog mantém a regra legada e não consulta o perfil',
    api.migrateLog({ id: 3, date: '2026-10-14', muscle: 'Posterior', exercise: 'Panturrilha em Pé', reps: [10] }).muscle === 'Posterior'
    && api.migrateLog({ id: 4, date: '2026-10-14', muscle: 'Pescoço', exercise: 'Extensão Cervical', reps: [10] }).muscle === 'Ombros');
check('MUSCLE_META preserva as 12 entradas e as janelas originais',
    Object.keys(api.MUSCLE_META).length === 12
    && api.MUSCLE_META.Pernas.recoveryH === 72
    && api.MUSCLE_META.Posterior.recoveryH === 48
    && api.MUSCLE_META.Antebraço.recoveryH === 24);

// ---------- Identidade versionada de exercícios personalizados (decisão #8) ----------
console.log('\n== 18d. Exercícios personalizados: idEstavel versionado, sem anatomia ==');

// Estado isolado: a suíte continua com a lista que existia antes da seção.
const customAntes18d = api.getCustomExercises();
const NOME_CUSTOM = 'Remada X1 de Identidade';

const mintido18d = api.garantirIdentidadeVersionada([{ nome: NOME_CUSTOM, grupo: 'Costas' }]);
check('personalizado sem ID ganha idEstavel ex-slug e versao 1',
    mintido18d[0].idEstavel === 'ex-remada-x1-de-identidade'
    && api.idEstavelValido(mintido18d[0].idEstavel) && mintido18d[0].versao === 1, mintido18d[0]);
check('recunhagem é determinística (recarregar sem salvar reproduz o mesmo ID)',
    api.garantirIdentidadeVersionada([{ nome: NOME_CUSTOM, grupo: 'Costas' }])[0].idEstavel === mintido18d[0].idEstavel);
check('renomear NÃO recunha: o idEstavel sobrevive e a versao não sobe por conta do nome',
    api.garantirIdentidadeVersionada([{ ...mintido18d[0], nome: 'Outro Nome X1' }])[0].idEstavel === mintido18d[0].idEstavel
    && api.garantirIdentidadeVersionada([{ ...mintido18d[0], nome: 'Outro Nome X1' }])[0].versao === 1);
check('idEstavel inválido é substituído por um válido (arquivo corrompido não polui a identidade)',
    api.idEstavelValido(api.garantirIdentidadeVersionada([{ nome: 'Remada X2', idEstavel: 'Remada X2' }])[0].idEstavel));
check('personalizado não pode personificar o catálogo: ID reservado é recunhado',
    api.garantirIdentidadeVersionada([{ nome: 'Qualquer Nome', idEstavel: 'ex-supino-reto-na-maquina' }])[0].idEstavel !== 'ex-supino-reto-na-maquina'
    && api.idEstavelValido(api.garantirIdentidadeVersionada([{ nome: 'Qualquer Nome', idEstavel: 'ex-supino-reto-na-maquina' }])[0].idEstavel));
check('nome cujo slug colide com o catálogo ganha sufixo (sem colidir com o ID do catálogo)',
    api.garantirIdentidadeVersionada([{ nome: 'Supino reto na maquina' }])[0].idEstavel === 'ex-supino-reto-na-maquina-2');
check('dois personalizados com o mesmo slug recebem IDs distintos',
    (() => {
        const dup = api.garantirIdentidadeVersionada([{ nome: 'Remada Y1' }, { nome: 'remada y1!' }]);
        return dup[0].idEstavel === 'ex-remada-y1' && dup[1].idEstavel === 'ex-remada-y1-2' && new Set(dup.map(e => e.idEstavel)).size === 2;
    })());

api.setCustomExercisesList([{ nome: NOME_CUSTOM, grupo: 'Costas', idEstavel: 'ex-remada-x1-de-identidade', versao: 2, sinonimos: 'rx1; remada x' }]);
const perfilCustom18d = api.perfilDoExercicio(NOME_CUSTOM);
check('perfil de personalizado: fora_do_catalogo com ID persistido, sempre nao_revisado e sem anatomia',
    perfilCustom18d && perfilCustom18d.origem === 'fora_do_catalogo'
    && perfilCustom18d.idEstavel === 'ex-remada-x1-de-identidade'
    && perfilCustom18d.nomeCanonico === NOME_CUSTOM
    && perfilCustom18d.statusRevisao === 'nao_revisado'
    && perfilCustom18d.anatomia === null && perfilCustom18d.padraoMovimento === null && perfilCustom18d.revisao === null);
check('grupo declarado pelo usuário é organizacional, nunca anatomia validada',
    perfilCustom18d.taxonomiaLegada.grupo === 'Costas' && perfilCustom18d.agrupamentoVisual.grupo === 'Costas'
    && perfilCustom18d.limitacoes.includes('grupo_declarado_pelo_usuario')
    && api.contribuicaoAnatomica(NOME_CUSTOM) === null);
check('idEstavelDoExercicio devolve o ID persistido, não um slug do nome atual',
    api.idEstavelDoExercicio(NOME_CUSTOM) === 'ex-remada-x1-de-identidade');
check('aliases do personalizado vêm dos sinônimos declarados (identidade, não anatomia)',
    api.aliasesDoExercicio(NOME_CUSTOM).join('|') === 'rx1|remada x');
check('perfil de personalizado passa no validador do schema',
    api.validarPerfilExercicio(perfilCustom18d).ok === true, perfilCustom18d);
check('registro revisado para o ID de um personalizado é ignorado (sem revisão profissional nesta etapa)',
    (() => {
        const registro = {
            'ex-remada-x1-de-identidade': {
                ...perfilCustom18d, statusRevisao: 'revisado',
                anatomia: { musculosPrimarios: ['x'], musculosSecundarios: [{ musculo: 'y', papel: 'secundario', contribuicao: 'estimada' }] },
                padraoMovimento: { id: 'puxar-horizontal', rotulo: 'Puxar' },
                revisao: { por: 'Ninguém', em: '2026-10-17', versao: 1 }
            }
        };
        const p = api.perfilDoExercicio(NOME_CUSTOM, registro);
        return p.statusRevisao === 'nao_revisado' && p.anatomia === null
            && p.limitacoes.includes('registro_revisado_invalido');
    })());
check('nome fora do catálogo e sem registro continua sem ID (null preservado)',
    api.perfilDoExercicio('Exercício Inventado XYZ').idEstavel === null
    && api.idEstavelDoExercicio('Exercício Inventado XYZ') === null);

// Comportamentos legados não mudam: metas leem o muscle do registro; CSV
// formato 3 não ganha colunas de identidade.
const logCustom18d = {
    id: 99002, date: '2026-10-14', kind: 'peso', muscle: 'Costas',
    exercise: NOME_CUSTOM, type: 'carga_total', weight: 50, reps: [10, 10]
};
check('personalizado segue contando pelo muscle legado nas metas semanais (perfil não entra no cálculo)',
    api.weeklySetsByMuscle([logCustom18d], '2026-10-14').Costas === 2);
const logsAntes18d = api.logsArr;
api.setLogs([logCustom18d]);
const csvCustom18d = api.buildPlanilhaCSV();
api.setLogs(logsAntes18d);
const sheetCat18d = csvCustom18d.split(/--- Sheet: Catálogo ---/)[1].split(/--- Sheet:/)[0].trim();
const linhasCat18d = api.parseCSVRows(sheetCat18d, ';');
check('CSV formato 3: aba Catálogo mantém as 12 colunas, sem colunas de identidade',
    linhasCat18d[0].length === 12 && linhasCat18d[0][0] === 'Exercício'
    && !sheetCat18d.includes('idEstavel') && !sheetCat18d.includes('versao'), linhasCat18d[0]);
check('CSV inclui a linha do personalizado com o grupo declarado (sem anatomia nova)',
    linhasCat18d.some(r => r[0] === NOME_CUSTOM && r[1] === 'Costas'));

// Restaura a lista de personalizados ao estado anterior à seção.
api.setCustomExercisesList(customAntes18d);
