/* ============================================================
   B2 — editor específico de corrida, reparo legado e round-trip de identidade
   Somente registros sintéticos; caminho testado pelos botões reais da UI.
   ============================================================ */
{
    console.log('\n== UI 14. Corridas: editor específico e reparo dos registros legados ==');
    const logsOriginaisB2 = JSON.stringify(ev('logs'));
    const corridaBaseB2 = {
        id: 881001, date: '2026-10-15', kind: 'corrida', muscle: 'Cardio',
        exercise: 'Corrida (Rua)', xpTheme: 'zodiaco', distanceKm: 5, durationMin: 25,
        notes: 'registro sintético', type: 'corrida', reps: [], isPR: true
    };
    const corridaAnteriorB2 = {
        id: 881000, date: '2026-10-14', kind: 'corrida', muscle: 'Cardio',
        exercise: 'Corrida (Esteira)', xpTheme: 'zodiaco', distanceKm: 7, durationMin: 35,
        notes: '', type: 'corrida', reps: [], isPR: false
    };
    const camposMusculacaoB2 = ['weight','reps','mode','perSide','rir','sessao','conferir','sets','repsText','technique','nextGoal','biset'];
    const setupCorridaB2 = () => {
        ev(`logs = ${JSON.stringify([corridaBaseB2, corridaAnteriorB2])}; clearSearchFilters(); document.getElementById('filter-date').value = '2026-10-15'; renderLogsTable(); renderSearchScreen();`);
    };
    const corridaAtualB2 = () => JSON.parse(ev(`JSON.stringify(logs.find(l => l.id === ${corridaBaseB2.id}))`));
    const clickEditDiaB2 = () => click(document.querySelector(`#logs-container [data-action="editLog"][data-args="[${corridaBaseB2.id}]"]`));
    const clickEditBuscaB2 = () => click(document.querySelector(`#hist-results [data-log-id="${corridaBaseB2.id}"] [data-action="editLog"]`));
    try {
        setupCorridaB2();
        check('card diário de corrida usa o selo PR de distância, não PR (1RM auto)', document.querySelector('#logs-container').textContent.includes('🏆 PR de distância') && !document.querySelector('#logs-container').textContent.includes('PR (1RM auto)'));
        clickEditDiaB2();
        check('Editar na lista do dia abre o editor de corrida com distância/tempo, sem campos de musculação', !!$('edit-log-overlay') && $('edit-log-overlay').textContent.includes('Editar corrida') && !!$('er-distance') && !!$('er-duration') && !$('el-type'));
        check('editor próprio disponibiliza os quatro campos opcionais D6', !!$('er-run-type') && !!$('er-rpe') && !!$('er-hr-avg') && !!$('er-shoe') && ['leve','longo','intervalado','ritmo/limiar','prova','regenerativo','outro'].every(x => [...$('er-run-type').options].some(o => o.value === x)));
        $('er-distance').value = '6';
        fire($('er-distance'), 'input');
        click(document.querySelector('#edit-log-overlay [data-action="saveEditedRunLog"]'));
        const depoisDistanciaB2 = corridaAtualB2();
        check('mudar distância recalcula XP e dano pelas fórmulas atuais (6 km + 25 min = 61 XP, 725 dano)', ev(`cardioXP(logs.find(l => l.id === ${corridaBaseB2.id}))`) === 61 && ev(`logDamageKg(logs.find(l => l.id === ${corridaBaseB2.id}), userBodyweight)`) === 725);
        check('salvar corrida mantém id, kind, muscle, type e xpTheme e nunca grava campos de musculação', depoisDistanciaB2.id === corridaBaseB2.id && depoisDistanciaB2.kind === 'corrida' && depoisDistanciaB2.muscle === 'Cardio' && depoisDistanciaB2.type === 'corrida' && depoisDistanciaB2.xpTheme === 'zodiaco' && camposMusculacaoB2.every(k => !(k in depoisDistanciaB2)));

        // A segunda entrada é o card de histórico da busca. O tempo muda sem abrir o editor de musculação.
        setupCorridaB2();
        clickEditBuscaB2();
        check('Editar no card de histórico da Busca também abre o editor específico de corrida', !!$('er-distance') && !!$('er-duration') && !$('el-type'));
        $('er-distance').value = '6';
        $('er-duration').value = '00:30:00';
        $('er-run-type').value = 'ritmo/limiar';
        $('er-rpe').value = '11';
        $('er-hr-avg').value = '158';
        $('er-shoe').value = 'Tênis Sintético';
        $('er-notes').value = 'editada pela busca';
        click(document.querySelector('#edit-log-overlay [data-action="saveEditedRunLog"]'));
        const antesRPEInvalidoB2 = corridaAtualB2();
        check('RPE fora de 1–10 não salva nem altera o registro', !!$('edit-log-overlay') && antesRPEInvalidoB2.distanceKm === 5 && antesRPEInvalidoB2.durationMin === 25 && document.body.textContent.includes('RPE deve ser um número inteiro'));
        $('er-rpe').value = '7';
        fire($('er-duration'), 'input');
        check('editor calcula pace enquanto o tempo é digitado (6 km em 30 min = 5:00/km)', $('er-pace').textContent === '5:00/km');
        click(document.querySelector('#edit-log-overlay [data-action="saveEditedRunLog"]'));
        const depoisTempoB2 = corridaAtualB2();
        check('mudar tempo recalcula XP e dano (6 km + 30 min = 63 XP, 750 dano)', ev(`cardioXP(logs.find(l => l.id === ${corridaBaseB2.id}))`) === 63 && ev(`logDamageKg(logs.find(l => l.id === ${corridaBaseB2.id}), userBodyweight)`) === 750);
        check('salvar pela Busca persiste observações e campos D6 opcionais no próprio log', depoisTempoB2.notes === 'editada pela busca' && depoisTempoB2.runType === 'ritmo/limiar' && depoisTempoB2.rpe === 7 && depoisTempoB2.hrAvg === 158 && depoisTempoB2.shoe === 'Tênis Sintético');
        check('nenhum campo de musculação fica no registro editado pela Busca', camposMusculacaoB2.every(k => !(k in depoisTempoB2)));

        const poluidaB2 = {
            ...corridaBaseB2, type:'carga_total', reps:[1], weight:0, mode:'simple', perSide:false,
            rir:null, sessao:'perna', conferir:true, sets:null, repsText:'1', technique:'Drop-set', nextGoal:'Subir'
        };
        const migradaB2 = JSON.parse(ev(`JSON.stringify(migrateLog(${JSON.stringify(poluidaB2)}))`));
        const segundaMigracaoB2 = JSON.parse(ev(`JSON.stringify(migrateLog(${JSON.stringify(migradaB2)}))`));
        check('migração de corrida poluída corrige type para corrida e é idempotente', migradaB2.kind === 'corrida' && migradaB2.type === 'corrida' && JSON.stringify(migradaB2) === JSON.stringify(segundaMigracaoB2));
        ev(`logs = [${JSON.stringify(migradaB2)}];`);
        const csvB2 = ev('buildPlanilhaCSV()');
        const lidoB2 = JSON.parse(ev(`JSON.stringify(lerPlanilhaCSV(${JSON.stringify(csvB2)}).logs)`));
        const planoB2 = JSON.parse(ev(`JSON.stringify(planejarImportacaoLogs(${JSON.stringify(lidoB2)}, logs))`));
        check('corrida migrada com campos de musculação reimporta do CSV como igual (não conflito nem duplicata)', planoB2.iguais === 1 && planoB2.conflitos.length === 0 && planoB2.novos.length === 0);
        const limpaB2 = { ...migradaB2, type:'corrida', reps:[], distanceKm:migradaB2.distanceKm, durationMin:migradaB2.durationMin };
        check('fingerprint de corrida ignora campos de musculação, mas preserva data/modalidade/distância/tempo/observações', ev(`csvLogFingerprint(${JSON.stringify(migradaB2)}) === csvLogFingerprint(${JSON.stringify(limpaB2)})`));
        const musculacaoB2 = { id:881099, date:'2026-10-15', kind:'peso', muscle:'Costas', exercise:'Remada', weight:40, reps:[10], type:'carga_total' };
        check('fingerprint de musculação continua incluindo os campos de musculação', ev(`csvLogFingerprint(${JSON.stringify(musculacaoB2)}) !== csvLogFingerprint(${JSON.stringify({...musculacaoB2,weight:41})})`));
        ev(`logs = [${JSON.stringify(musculacaoB2)}]; document.getElementById('filter-date').value = '2026-10-15'; renderLogsTable();`);
        click(document.querySelector('#logs-container [data-action="editLog"]'));
        check('Editar musculação continua abrindo o editor genérico, sem o formulário de corrida', !!$('el-type') && !!$('el-r') && !$('er-distance') && typeof window.getDiarioAction('saveEditedLog') === 'function');
    } catch (e) {
        check('fluxo completo do editor de corrida roda até o fim sem exceção', false, e.stack || e.message);
    } finally {
        document.getElementById('edit-log-overlay')?.remove();
        ev(`logs = JSON.parse(${JSON.stringify(logsOriginaisB2)}); renderLogsTable(); renderSearchScreen();`);
    }
}
