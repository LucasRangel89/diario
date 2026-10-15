/* ============================================================
   CSV, MAPA DE RECUPERAÇÃO, DELEGAÇÃO DE EVENTOS E CONSOLE LIMPO
   ------------------------------------------------------------
   Trecho de test_ui.js, movido sem alterar a lógica dos testes.
   Avaliado pelo runner no MESMO escopo dos demais trechos (ordem do nome).
   ============================================================ */

    console.log('\n== UI 12e. CSV: importação validada, sem duplicar e com cardio/personalizados ==');
    const csvAtual = ev('buildPlanilhaCSV()');
    check('CSV traz o exercício personalizado no Catálogo (campo com aspas dobradas)', csvAtual.includes('"' + nomeCustom.replace(/"/g, '""') + '"'));
    check('CSV tem abas Cardio e Formato (formato 2)', csvAtual.includes('--- Sheet: Cardio ---') && csvAtual.includes('--- Sheet: Formato ---'));
    const nCsv = ev('logs.length');
    ev('logs = []; saveLogsToStorage();');
    ev(`importPlanilhaCSV(${JSON.stringify(csvAtual)})`);
    check('importação do CSV restaura os registros (treinos e cardio)', ev('logs.length') === nCsv, ev('logs.length'));
    ev(`importPlanilhaCSV(${JSON.stringify(csvAtual)})`);
    check('reimportar o mesmo CSV não duplica nenhum registro', ev('logs.length') === nCsv, ev('logs.length'));
    check('a mensagem informa quantos já existiam', document.body.textContent.includes('já existente(s) ignorado(s)'));
    const idsAntesRuim = ev('JSON.stringify(logs.map(l => l.id))');
    ev(`importPlanilhaCSV(${JSON.stringify('--- Sheet: Log ---\nData;Sessão;Exercício;Carga registrada (kg)\n31/02/2026;;Supino Reto na Máquina;50')})`);
    check('CSV com data impossível: nada é gravado e o usuário é avisado', ev('JSON.stringify(logs.map(l => l.id))') === idsAntesRuim && document.body.textContent.includes('nada foi alterado'));

    console.log('\n== UI 12h. Textos do mapa de recuperação são de estimativa ==');
    const mapa = $('recovery-status-grid').textContent;
    check('mapa não exibe "100% PRONTO" como garantia', !mapa.includes('100% PRONTO') && !mapa.includes('EXAUSTO'));
    check('mapa usa a terminologia de prontidão estimada', mapa.includes('Prontidão estimada'));
    check('explicação do mapa diz que os percentuais são heurísticas de planejamento', document.body.textContent.includes('heurísticas de planejamento') && document.body.textContent.includes('100% não garante recuperação completa'));
    ev(`importPlanilhaCSV(${JSON.stringify('--- Sheet: Log ---\n' + ev('buildPlanilhaCSV()').split('--- Sheet: Log ---\n')[1].split('--- Sheet:')[0])})`);
    ev(`applyImportedBackup(JSON.parse(${JSON.stringify(payloadCompleto)}))`);

    // ============================ DELEGAÇÃO DE EVENTOS ============================
    console.log('\n== UI 13. Delegação de eventos (js/actions.js) ==');
    const btnMais30 = [...document.querySelectorAll('[data-action="addSessionTimer"]')].find(b => b.textContent.trim() === '+30');
    check('botão +30 do descanso usa data-action', !!btnMais30);
    if (btnMais30) { click(btnMais30); }
    check('clique delegado dispara a ação (+30 s no cronômetro)', $('session-timer-display').textContent === '00:30', $('session-timer-display').textContent);
    ev('stopSessionTimer();');
    const inlineNoIndex = (fs.readFileSync('index.html', 'utf8').match(/on(click|change|input|submit|keydown)="[^"]*"/g) || []);
    check('index.html não tem mais handlers inline (onclick/onchange/oninput/onsubmit)', inlineNoIndex.length === 0, inlineNoIndex.slice(0, 3));

    // ============================ ➕ NOVO EXERCÍCIO (I2) ============================
    // js/custom_exercises.js chamava openModal/closeModal/renderSearchTab, que nunca
    // existiram: o botão da aba Buscar lançava ReferenceError e nada abria. Este bloco
    // exercita o caminho REAL (clique → janela → criar → busca redesenhada → excluir).
    console.log('\n== UI 13b. ➕ Novo exercício: o botão da aba Buscar abre, cria e fecha ==');
    const esperaFormCex = () => new Promise(r => setTimeout(r, 80));   // o form liga o submit num setTimeout(50)
    const errosAntesCex = jsErrors.length;
    const novosErrosCex = () => jsErrors.slice(errosAntesCex, errosAntesCex + 2);
    const nomeNovoEx = 'Remada Sintética de Teste UI';
    const cardNovoEx = () => cards().some(c => c.dataset.ex === nomeNovoEx);
    const textoDe = id => ($(id) || {}).textContent || '';
    try {
        navTo('busca');
        ev('clearSearchFilters()');
        const nCustomAntesCex = ev('customExercises.length');
        const btnNovoEx = document.querySelector('#tab-content-busca [data-action="openCustomExModal"]');
        check('botão "➕ Novo exercício" está na aba Buscar e ligado a openCustomExModal', !!btnNovoEx && typeof window.getDiarioAction('openCustomExModal') === 'function');
        click(btnNovoEx);
        await esperaFormCex();
        check('clicar abre o formulário numa janela, sem erro', !!$('custom-ex-overlay') && !!$('custom-ex-form') && jsErrors.length === errosAntesCex, novosErrosCex());
        check('janela mostra "➕ Novo exercício" e a dica do tipo de carga', textoDe('custom-ex-overlay').includes('➕ Novo exercício') && textoDe('cex-tipo-hint').length > 0);
        click(btnIn($('custom-ex-form'), 'Cancelar'));
        check('"Cancelar" fecha a janela (closeCustomExModal), sem erro', !$('custom-ex-overlay') && jsErrors.length === errosAntesCex, novosErrosCex());
        click(btnNovoEx);
        await esperaFormCex();
        key('Escape');
        check('ESC fecha a janela do exercício personalizado', !$('custom-ex-overlay'));
        click(btnNovoEx);
        await esperaFormCex();
        click($('custom-ex-overlay'));
        check('clique fora do cartão fecha a janela', !$('custom-ex-overlay'));
        ev(`setSearchQuery(${JSON.stringify(nomeNovoEx)})`);
        check('antes de criar, a busca não encontra o exercício', !cardNovoEx());
        click(btnNovoEx);
        await esperaFormCex();
        $('cex-nome').value = nomeNovoEx;
        $('cex-grupo').value = 'Costas';
        click($('custom-ex-form').querySelector('button[type="submit"]'));
        check('"Criar exercício" grava o personalizado e fecha a janela',
            ev('customExercises.length') === nCustomAntesCex + 1 && ev(`customExercises.some(e => e.nome === ${JSON.stringify(nomeNovoEx)} && e.grupo === 'Costas')`) && !$('custom-ex-overlay'));
        check('a aba Buscar é redesenhada com o exercício novo (renderSearchScreen)', cardNovoEx(), titles().slice(0, 3));
        check('a confirmação de criação aparece para o usuário', document.body.textContent.includes('Exercício criado com sucesso'));
        check('nenhum erro não capturado no fluxo de criação', jsErrors.length === errosAntesCex, novosErrosCex());
        ev(`openExercisePicker('log'); setPickerQuery(${JSON.stringify(nomeNovoEx)});`);
        check('o seletor rápido também oferece o exercício novo', pickerRows().some(r => r.dataset.ex === nomeNovoEx));
        ev('closeExercisePicker()');
        // limpeza pelo caminho de exclusão do mesmo módulo (deixa o estado como estava)
        const idNovoEx = ev(`customExercises.find(e => e.nome === ${JSON.stringify(nomeNovoEx)}).id`);
        ev(`openCustomExModal(${JSON.stringify(idNovoEx)})`);
        await esperaFormCex();
        check('abrir com um id existente mostra "✏️ Editar exercício" com o botão Excluir', textoDe('custom-ex-overlay').includes('✏️ Editar exercício') && !!btnIn($('custom-ex-form'), 'Excluir'));
        const confirmOriginalCex = window.confirm;
        window.confirm = () => true;
        try { click(btnIn($('custom-ex-form'), 'Excluir')); } finally { window.confirm = confirmOriginalCex; }
        check('"Excluir" remove o personalizado, fecha a janela e redesenha a busca, sem erro',
            ev('customExercises.length') === nCustomAntesCex && !$('custom-ex-overlay') && !cardNovoEx() && jsErrors.length === errosAntesCex, novosErrosCex());
    } catch (e) {
        check('fluxo "➕ Novo exercício" roda até o fim sem exceção', false, e.message);
        document.getElementById('custom-ex-overlay')?.remove();
        document.getElementById('picker-overlay')?.remove();
    } finally {
        ev('clearSearchFilters()');
    }

    // ============================ CONSOLE ============================
    console.log('\n== UI 12. Console limpo ==');
    const graves = jsErrors.filter(m => !/Not implemented|Could not load|serviceWorker|HTMLCanvasElement/i.test(m));
    check('nenhum erro não capturado', graves.length === 0, graves.slice(0, 3));
