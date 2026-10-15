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

    // ============================ CONSOLE ============================
    console.log('\n== UI 12. Console limpo ==');
    const graves = jsErrors.filter(m => !/Not implemented|Could not load|serviceWorker|HTMLCanvasElement/i.test(m));
    check('nenhum erro não capturado', graves.length === 0, graves.slice(0, 3));
