/* B3 — Corridas ao fim de Treino, somente Rua/Esteira; fixture inteiramente sintético. */
{
    console.log('\n== UI 16. Aba Corridas: D2/D3, resumos, registros e compatibilidade ==');
    const antesB3 = JSON.stringify(ev('logs'));
    const ruaB3 = {
        id: 991001, date: '2021-01-01', kind: 'corrida', muscle: 'Cardio', exercise: 'Corrida (Rua)',
        distanceKm: 5, durationMin: 25, shoe: 'Tênis <Rua> & A', runType: 'leve', rpe: 6,
        hrAvg: 150, notes: '<img src=x onerror=alert(1)>', xpTheme: 'classico', isPR: true
    };
    const legadoB3 = {
        id: 991002, date: '2021-01-03', kind: 'corrida', muscle: 'Cardio', exercise: 'Esteira',
        distanceKm: 2, durationMin: 12, shoe: 'Tênis B', xpTheme: 'classico', isPR: false
    };
    const esteiraB3 = {
        id: 991003, date: '2026-10-15', kind: 'corrida', muscle: 'Cardio', exercise: 'Corrida (Esteira)',
        distanceKm: 10, durationMin: 50, shoe: 'Tênis B', xpTheme: 'classico', isPR: false
    };
    const outrosB3 = [
        { id: 991004, date: '2026-10-15', kind: 'corrida', muscle: 'Cardio', exercise: 'Bike / Ergométrico', distanceKm: 80, durationMin: 60, isPR: false },
        { id: 991005, date: '2026-10-15', kind: 'corrida', muscle: 'Cardio', exercise: 'Elíptico', distanceKm: 20, durationMin: 30 },
        { id: 991006, date: '2026-10-15', kind: 'corrida', muscle: 'Cardio', exercise: 'Remo (Ergômetro)', distanceKm: 10, durationMin: 40 },
        { id: 991007, date: '2026-10-15', kind: 'peso', muscle: 'Peito', exercise: 'Supino', weight: 50, reps: [8] }
    ];
    const runCardsB3 = () => [...($('runs-results')?.querySelectorAll('[data-run-id]') || [])];
    const logB3 = id => JSON.parse(ev(`JSON.stringify(logs.find(l => l.id === ${id}))`) || 'null');
    try {
        ev(`logs = ${JSON.stringify([ruaB3, legadoB3, esteiraB3, ...outrosB3])};`);
        const gruposB3 = JSON.parse(ev('JSON.stringify(NAV_GROUPS.map(g => [g.id, g.tabs.map(([id]) => id)]))'));
        check('D2: quatro grupos aprovados e Corridas é a última aba de Treino',
            JSON.stringify(gruposB3) === JSON.stringify([
                ['treino', ['diario', 'historico', 'busca', 'montador', 'corridas']],
                ['jogo', ['boss', 'story']], ['voce', ['stats', 'calcs']], ['config', ['config']]
            ]) && $('nav-groups').children.length === 4 && !!$('tab-content-corridas'));
        navTo('corridas');
        check('Corridas abre pelo menu e esconde as outras abas',
            !!$('nav-corridas') && $('nav-corridas').getAttribute('aria-current') === 'page' &&
            !$('tab-content-corridas').classList.contains('hidden') && $('tab-content-diario').classList.contains('hidden') &&
            $('tab-content-historico').classList.contains('hidden'));
        check('D3: só Rua/Esteira, inclusive nome legado de esteira; nenhum outro cardio nem musculação no painel',
            runCardsB3().length === 3 && runCardsB3().every(card => /Corrida \((Rua|Esteira)\)/.test(card.textContent)) &&
            !/Bike|Elíptico|Remo \(Ergômetro\)|Supino/.test($('tab-content-corridas').textContent) &&
            runCardsB3().some(card => card.dataset.runId === String(legadoB3.id) && card.textContent.includes('Corrida (Esteira)')));
        check('resumos usam semana ISO, mês/ano, km, duração e pace agregados só de corrida',
            $('runs-weeks').textContent.includes('2020-W53') && $('runs-weeks').textContent.includes('2026-W42') &&
            $('runs-months').textContent.includes('2021-01') && $('runs-years').textContent.includes('2026') &&
            $('runs-overview').textContent.includes('17') && $('runs-overview').textContent.includes('3 corridas'));
        check('recordes e tênis são informativos, sem bike nem confusão com PR do jogo',
            $('runs-records').textContent.includes('10 km') && $('runs-records').textContent.includes('5:00/km') &&
            $('runs-records').textContent.includes('não é tempo oficial') &&
            $('runs-shoes').textContent.includes('12 km') && $('runs-shoes').textContent.includes('Tênis <Rua> & A') &&
            $('tab-content-corridas').textContent.includes('não alteram o PR de cardio'));
        check('campos textuais de notas e tênis são escapados ao desenhar a aba',
            !$('tab-content-corridas').querySelector('img') && $('runs-results').textContent.includes(ruaB3.notes));
        click($('runs-results').querySelector(`[data-run-id="${legadoB3.id}"] [data-action="editLog"]`));
        check('nome legado aparece como Corrida (Esteira) no editor da aba (só duas opções)',
            $('er-exercise').value === 'Corrida (Esteira)' && $('er-exercise').options.length === 2);
        $('er-notes').value = 'edição sem trocar modalidade';
        click($('edit-log-overlay').querySelector('[data-action="saveEditedRunLog"]'));
        check('editar notas não reescreve o nome legado do registro nem a identidade CSV',
            logB3(legadoB3.id).exercise === 'Esteira' && logB3(legadoB3.id).notes === 'edição sem trocar modalidade' &&
            $('runs-results').querySelector(`[data-run-id="${legadoB3.id}"]`).textContent.includes('Corrida (Esteira)'));

        $('runs-modality').value = 'Corrida (Rua)'; fire($('runs-modality'), 'change');
        check('filtro por modalidade afeta a lista, não as estatísticas gerais',
            runCardsB3().length === 1 && runCardsB3()[0].dataset.runId === String(ruaB3.id) && $('runs-overview').textContent.includes('17'));
        $('runs-year').value = '2026'; fire($('runs-year'), 'change');
        check('filtro por ano sem correspondência exibe estado vazio e mantém totais',
            runCardsB3().length === 0 && $('runs-results').textContent.includes('Nenhuma corrida') && $('runs-overview').textContent.includes('17'));
        $('runs-modality').value = ''; fire($('runs-modality'), 'change');
        $('runs-year').value = ''; fire($('runs-year'), 'change');

        click($('tab-content-corridas').querySelector('[data-action="openNewRunLog"]'));
        const modalidadesB3 = [...$('er-exercise').options].map(option => option.value);
        check('nova corrida reutiliza o editor com só duas modalidades, pace ao digitar e campos D6',
            $('edit-log-overlay').textContent.includes('Registrar corrida') &&
            JSON.stringify(modalidadesB3) === JSON.stringify(['Corrida (Rua)', 'Corrida (Esteira)']) &&
            ['er-run-type', 'er-rpe', 'er-hr-avg', 'er-shoe', 'er-pace'].every(id => !!$(id)) &&
            $('er-duration').getAttribute('data-input-action') === 'updateRunEditPace');
        $('er-date').value = '2026-10-16';
        $('er-exercise').value = 'Corrida (Rua)';
        $('er-distance').value = '6'; fire($('er-distance'), 'input');
        $('er-duration').value = '00:30:00'; fire($('er-duration'), 'input');
        check('pace de 6 km em 30 min aparece antes de salvar', $('er-pace').textContent === '5:00/km');
        $('er-run-type').value = 'intervalado';
        $('er-rpe').value = '11';
        $('er-hr-avg').value = '160';
        $('er-shoe').value = 'Tênis Teste';
        $('er-notes').value = 'corrida sintética';
        const countB3 = ev('logs.length');
        click($('edit-log-overlay').querySelector('[data-action="saveEditedRunLog"]'));
        check('RPE inválido não cria corrida nem fecha o editor', ev('logs.length') === countB3 && !!$('edit-log-overlay'));
        $('er-rpe').value = '7';
        $('er-date').value = '';
        click($('edit-log-overlay').querySelector('[data-action="saveEditedRunLog"]'));
        check('data inválida ou vazia não cria corrida', ev('logs.length') === countB3 && !!$('edit-log-overlay'));
        $('er-date').value = '2026-10-16';
        $('er-exercise').innerHTML += '<option value="Bike / Ergométrico">Bike / Ergométrico</option>';
        $('er-exercise').value = 'Bike / Ergométrico';
        click($('edit-log-overlay').querySelector('[data-action="saveEditedRunLog"]'));
        check('modalidade forjada fora das duas corridas é recusada antes de gravar', ev('logs.length') === countB3 && !!$('edit-log-overlay'));
        $('er-exercise').value = 'Corrida (Rua)';
        click($('edit-log-overlay').querySelector('[data-action="saveEditedRunLog"]'));
        const novaB3 = JSON.parse(ev('JSON.stringify(logs[0])'));
        const novaIdB3 = novaB3.id;
        check('registro novo persiste em logs com D6, id, tema e sem campos de musculação',
            ev('logs.length') === countB3 + 1 && !$('edit-log-overlay') && novaB3.kind === 'corrida' &&
            novaB3.muscle === 'Cardio' && novaB3.type === 'corrida' && novaB3.exercise === 'Corrida (Rua)' &&
            novaB3.xpTheme === 'classico' && novaB3.runType === 'intervalado' && novaB3.rpe === 7 &&
            novaB3.hrAvg === 160 && novaB3.shoe === 'Tênis Teste' && novaB3.notes === 'corrida sintética' &&
            !('weight' in novaB3) && !('sets' in novaB3));
        check('XP preserva fórmula global e dano de cardio usa conversão própria, comparando PR também com bike',
            ev(`cardioXP(logs[0])`) === 63 && ev(`logDamageKg(logs[0], userBodyweight)`) === 18 &&
            novaB3.isPR === false && $('runs-results').textContent.includes('Tênis Teste'));
        const backupB3 = await ev('buildBackupPayload().then(p => JSON.stringify(p))');
        const csvB3 = ev('buildPlanilhaCSV()');
        check('JSON v6 e CSV v3 preservam os quatro campos D6 e PR (informativo) sem mudar o formato',
            JSON.parse(backupB3).version === 6 && JSON.parse(backupB3).logs[0].shoe === 'Tênis Teste' &&
            csvB3.includes('Versão do formato;3') && csvB3.includes('Tênis Teste') && csvB3.includes('PR (informativo)'));
        check('Bike, elíptico e remo seguem em logs e no CSV Cardio (fora de Corridas)',
            outrosB3.slice(0, 3).every(cardio => ev(`logs.some(l => l.id === ${cardio.id})`)) &&
            ['Bike / Ergométrico', 'Elíptico', 'Remo (Ergômetro)'].every(nome => csvB3.includes(nome)) &&
            !/Bike|Elíptico|Remo \(Ergômetro\)/.test($('tab-content-corridas').textContent));

        click($('runs-results').querySelector(`[data-run-id="${novaIdB3}"] [data-action="editLog"]`));
        check('editar pela aba mantém o editor de corrida restrito às duas modalidades',
            JSON.stringify([...$('er-exercise').options].map(o => o.value)) === JSON.stringify(['Corrida (Rua)', 'Corrida (Esteira)']));
        $('er-exercise').value = 'Corrida (Esteira)';
        $('er-distance').value = '8'; fire($('er-distance'), 'input');
        check('pace muda também ao editar distância, sem salvar', $('er-pace').textContent === '3:45/km');
        click($('edit-log-overlay').querySelector('[data-action="saveEditedRunLog"]'));
        check('edição mantém id/tema e redesenha lista/recordes sem duplicar registro',
            ev('logs.length') === countB3 + 1 && logB3(novaIdB3).exercise === 'Corrida (Esteira)' &&
            logB3(novaIdB3).xpTheme === 'classico' && runCardsB3().length === 4 &&
            $('runs-results').querySelector(`[data-run-id="${novaIdB3}"]`).textContent.includes('8 km'));
        click($('runs-results').querySelector(`[data-run-id="${novaIdB3}"] [data-action="deleteLog"]`));
        check('exclusão da corrida pede confirmação sem apagar antes da decisão', !!$('confirm-modal-overlay') && !!logB3(novaIdB3));
        click($('confirm-modal-no'));
        check('cancelar exclusão mantém corrida', !!logB3(novaIdB3));
        click($('runs-results').querySelector(`[data-run-id="${novaIdB3}"] [data-action="deleteLog"]`));
        click($('confirm-modal-yes'));
        check('confirmar exclusão só remove corrida escolhida e atualiza a aba',
            !logB3(novaIdB3) && runCardsB3().length === 3 && outrosB3.slice(0, 3).every(c => ev(`logs.some(l => l.id === ${c.id})`)));

        ev(`logs = ${JSON.stringify(outrosB3)}; refreshAll();`);
        check('sem corridas: estado vazio sem NaN, sem opções extras no registro e com CTA acessível',
            runCardsB3().length === 0 && $('runs-results').textContent.includes('Nenhuma corrida') &&
            !$('runs-overview').textContent.includes('NaN') && !!$('tab-content-corridas').querySelector('[data-action="openNewRunLog"]'));
    } catch (e) {
        check('fluxo completo de Corridas executa sem exceção', false, e.stack || e.message);
    } finally {
        $('edit-log-overlay')?.remove();
        $('confirm-modal-overlay')?.remove();
        ev(`logs = JSON.parse(${JSON.stringify(antesB3)}); saveLogsToStorage(); refreshAll();`);
        navTo('diario');
    }
}
