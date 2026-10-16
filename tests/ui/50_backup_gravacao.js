/* ============================================================
   BACKUP COMPLETO, FALHA DE GRAVAÇÃO E ROLLBACK
   ------------------------------------------------------------
   Trecho de test_ui.js, movido sem alterar a lógica dos testes.
   Avaliado pelo runner no MESMO escopo dos demais trechos (ordem do nome).
   ============================================================ */

    console.log('\n== UI 12b. Backup: exportar → apagar → importar → comparar ==');
    const logsIDsAntes = ev('JSON.stringify(logs.map(l => l.id))');
    const settingsAntes = ev('JSON.stringify(settings)');
    const treinosAntes = ev('JSON.stringify(savedWorkouts.map(w => w.id || w.name))');
    check('há dados do seed para o teste de backup', ev('logs.length') > 0 && ev('savedWorkouts.length') > 0);
    const payloadStr = await ev('buildBackupPayload().then(p => JSON.stringify(p))');
    const payload = JSON.parse(payloadStr);
    check('backup contém logs, treinos, configurações e tema',
        Array.isArray(payload.logs) && payload.logs.length === ev('logs.length')
        && Array.isArray(payload.savedWorkouts) && payload.settings && !!payload.gameTheme, { v: payload.version, logs: payload.logs && payload.logs.length });
    check('backup sem base64 de retrato no save (marcadores idb: ou arte padrão)',
        Object.values((payload.themeGameSaves && payload.themeGameSaves.classico && payload.themeGameSaves.classico.bossPortraits) || {}).every(v => typeof v === 'string' && !v.startsWith('data:')));
    // simula a perda total: estado em memória zerado e localStorage esvaziado
    ev('logs = []; savedWorkouts = []; settings = { weeklyGoal: 3, restDefault: 90, barWeight: DEFAULT_BAR_WEIGHT, sledWeight: DEFAULT_SLED_WEIGHT }; themeGameSaves = {};');
    window.localStorage.clear();
    const restaurou = await ev(`applyImportedBackup(JSON.parse(${JSON.stringify(payloadStr)}))`);
    check('importação do backup conclui', restaurou === true);
    check('logs restaurados idênticos (ids na mesma ordem)', ev('JSON.stringify(logs.map(l => l.id))') === logsIDsAntes);
    check('configurações restauradas idênticas', ev('JSON.stringify(settings)') === settingsAntes);
    check('treinos salvos restaurados idênticos', ev('JSON.stringify(savedWorkouts.map(w => w.id || w.name))') === treinosAntes);
    check('estado do jogo restaurado (saves por tema recriados)', ev("Object.keys(themeGameSaves).length") === Object.keys(payload.themeGameSaves || {}).length);

    // ============================ BACKUP COMPLETO (REGRESSÃO) ============================
    console.log('\n== UI 12c. Backup completo: treinos, exercícios personalizados, histórico e estado ==');
    const esperar = ms => new Promise(r => setTimeout(r, ms));
    const nomeCustom = 'Remada Teste Ç "x"; ação';
    check('cria exercício personalizado com acento, aspas e ponto e vírgula', ev(`addCustomExercise(${JSON.stringify({ nome: nomeCustom, grupo: 'Costas', equipamento: 'Polia', tipo: 'carga_total', fator: 1, lados: 1, unidade: 'reps', faixaMin: 6, faixaMax: 10, descanso: 120, obs: 'Obs: "x"', sinonimos: 'rt teste, remada ç', tagsExtras: ['iniciante'], cargaLombar: true })})`) === true);
    const customId = ev(`customExercises.find(e => e.nome === ${JSON.stringify(nomeCustom)}).id`);
    ev(`logs.unshift({ id: 880001, date: getTodayLocalISO(), kind: 'peso', muscle: 'Costas', sessao: 'Costas', exercise: ${JSON.stringify(nomeCustom)}, type: 'carga_total', weight: 30, reps: [8, 7], sets: [{ weight: 30, reps: 8 }, { weight: 25, reps: 7 }], technique: 'Drop-Set', nextGoal: '', isPR: false, rir: 1, conferir: false, notes: 'Linha 1\\nLinha "2"; fim', xpTheme: 'classico' }); saveLogsToStorage();`);
    ev(`weightLog = [{ date: '2026-10-10', peso: 81.5, obs: 'após "treino"; ok' }]; deloadWeeks = ['2026-W40']; saveGameState();`);
    const estado = () => ev(`JSON.stringify({
        logs: logs.map(l => [l.id, l.exercise, l.weight, l.reps, l.sets, l.notes, l.technique, l.sessao]),
        treinos: savedWorkouts.map(w => [w.id || w.name, (w.exercises || []).map(e => [e.exercise, e.muscle])]),
        custom: customExercises.map(e => ({ id: e.id, nome: e.nome, grupo: e.grupo, equipamento: e.equipamento, tipo: e.tipo, fator: e.fator, lados: e.lados, unidade: e.unidade, faixa: e.faixa, descanso: e.descanso, obs: e.obs, sinonimos: e.sinonimos, tagsExtras: e.tagsExtras, cargaLombar: e.cargaLombar, tags: e.tags })),
        peso: weightLog, deload: deloadWeeks, bw: userBodyweight, settings: settings, tema: activeGameThemeId,
        // deloadRestDays é DERIVADO (ensureDeloadRestAwards reconcilia com registros e com a data de hoje):
        // não entra na comparação de igualdade; a reprodutibilidade é testada à parte.
        saves: Object.fromEntries(Object.entries(themeGameSaves).map(([k, v]) => [k, { ...v, deloadRestDays: undefined }]))
    })`);
    const estadoCompleto = estado();
    const payloadCompleto = await ev('buildBackupPayload().then(p => JSON.stringify(p))');
    const payloadCompletoObj = JSON.parse(payloadCompleto);
    check('backup v6 inclui os exercícios personalizados (definição completa)', payloadCompletoObj.version === 6 && Array.isArray(payloadCompletoObj.customExercises) && payloadCompletoObj.customExercises.some(e => e.nome === nomeCustom && e.cargaLombar === true && e.descanso === 120));
    // perda total: apaga personalizado, histórico, treinos, peso, deload e configurações
    ev(`deleteCustomExercise(${JSON.stringify(customId)}); logs = []; savedWorkouts = []; weightLog = []; deloadWeeks = []; userBodyweight = 55; settings = { weeklyGoal: 2, restDefault: 60, barWeight: 20, sledWeight: 0 };`);
    check('estado zerado estadoAntes da importação (personalizado apagado)', ev('customExercises.length') === 0 && ev('savedWorkouts.length') === 0 && ev('logs.length') === 0);
    const restaurouCompleto = await ev(`applyImportedBackup(JSON.parse(${JSON.stringify(payloadCompleto)}))`);
    check('importação completa conclui', restaurouCompleto === true);
    check('REGRESSÃO: treinos salvos são restaurados do arquivo (estadoAntes ficavam vazios)', ev('savedWorkouts.length') === payloadCompletoObj.savedWorkouts.length && ev('savedWorkouts.length') > 0, ev('savedWorkouts.length'));
    check('histórico, peso, deload, configurações e personalizados restaurados identicamente', estado() === estadoCompleto, { diff: estado().slice(0, 200) });
    const diasDerivadosAntes = ev('JSON.stringify(themeGameSaves.classico.deloadRestDays)');
    ev('ensureDeloadRestAwards()');
    check('campos derivados (dias de descanso de deload) são reproduzíveis a partir dos registros restaurados', ev('JSON.stringify(themeGameSaves.classico.deloadRestDays)') === diasDerivadosAntes);
    const temporadasDoArquivo = JSON.stringify(JSON.parse(payloadCompleto).themeGameSaves.classico.seasons);
    check('temporadas do tema restauradas idênticas ao arquivo', ev('JSON.stringify(themeGameSaves.classico.seasons)') === temporadasDoArquivo);
    check('exercício personalizado aparece na busca do catálogo após restaurar', ev(`searchCatalog({ q: 'Remada Teste' }).some(e => e.nome === ${JSON.stringify(nomeCustom)})`));
    check('exercício personalizado aparece no seletor de exercícios (lista completa)', ev(`allExercisesList().some(e => e.nome === ${JSON.stringify(nomeCustom)})`));
    check('índices reconstruídos: catalogInfoCustom acha o personalizado restaurado', ev(`!!catalogInfoCustom(${JSON.stringify(nomeCustom)})`));
    check('registro histórico do personalizado preservado com séries e observações', ev(`logs.some(l => l.id === 880001 && l.sets.length === 2 && l.notes === 'Linha 1\\nLinha "2"; fim' && l.technique === 'Drop-Set')`));
    check('catálogo principal NÃO mudou ao importar personalizados', ev('EXERCISE_CATALOG_FULL.length') === ev(`EXERCISE_CATALOG_FULL.filter(e => !e.isCustom).length`) && !ev(`EXERCISE_CATALOG_FULL.some(e => e.nome === ${JSON.stringify(nomeCustom)})`));
    // importar de novo o MESMO arquivo: nada duplicado
    const nCustom = ev('customExercises.length'), nLogs = ev('logs.length'), nTreinos = ev('savedWorkouts.length');
    await ev(`applyImportedBackup(JSON.parse(${JSON.stringify(payloadCompleto)}))`);
    check('reimportar o mesmo backup não duplica personalizados, registros nem treinos', ev('customExercises.length') === nCustom && ev('logs.length') === nLogs && ev('savedWorkouts.length') === nTreinos, [nCustom, nLogs, nTreinos]);

    console.log('\n== UI 12d. Backup inválido, malformado e antigo ==');
    const estadoInvalido = estado();
    const invalido = await ev('applyImportedBackup({ logs: "x" })');
    check('backup inválido retorna false e não altera nada', invalido === false && estado() === estadoInvalido);
    check('usuário é avisado que nada foi alterado', document.body.textContent.includes('nada foi alterado'));
    const invalido2 = await ev('applyImportedBackup({ logs: [], savedWorkouts: "x" })');
    check('treinos de tipo errado rejeitam o backup inteiro (sem apagar o histórico)', invalido2 === false && estado() === estadoInvalido);
    ev(`importJSONBackup({ target: { files: [new File(['{"logs": [ quebrado'], 'backup.json', { type: 'application/json' })] } })`);
    await esperar(200);
    check('arquivo JSON malformado: mensagem de erro e estado preservado', estado() === estadoInvalido && document.body.textContent.includes('Erro ao ler o arquivo de backup'));
    const legacy = { version: 2, logs: [{ id: 555001, date: '2026-10-01', kind: 'peso', muscle: 'Peito', exercise: 'Supino Reto na Máquina', weight: 50, reps: [10, 10], type: 'carga_total', sessao: 'Peito' }], userBodyweight: 81, deloadWeeks: ['2026-W39'], missionsXpTotal: 300, missionsClaimed: {}, tests: [], seasons: null, bossPortraits: {}, gameTheme: 'classico' };
    const nCustomAntesLegacy = ev('customExercises.length'), nTreinosAntesLegacy = ev('savedWorkouts.length');
    const okLegacy = await ev(`applyImportedBackup(${JSON.stringify(legacy)})`);
    check('backup antigo (sem treinos, personalizados ou sharedGameState) importa', okLegacy === true && ev('logs.length') === 1 && ev('logs[0].id') === 555001 && ev('userBodyweight') === 81);
    check('backup antigo: campos ausentes não apagam personalizados nem treinos salvos', ev('customExercises.length') === nCustomAntesLegacy && ev('savedWorkouts.length') === nTreinosAntesLegacy);
    check('backup antigo: deloadWeeks legado é restaurado do topo do arquivo', ev('deloadWeeks.join()') === '2026-W39');
    await ev(`applyImportedBackup(JSON.parse(${JSON.stringify(payloadCompleto)}))`);
    check('volta ao estado do backup completo após o teste de compatibilidade', estado() === estadoCompleto);

    console.log('\n== UI 12f. Falha durante a aplicação: rollback sem estado parcial ==');
    ev('window.__restoreOrig = restoreActiveThemeGameSave; restoreActiveThemeGameSave = function () { throw new Error("falha simulada"); };');
    const falhou = await ev(`applyImportedBackup(JSON.parse(${JSON.stringify(payloadCompleto)}))`);
    ev('restoreActiveThemeGameSave = window.__restoreOrig; delete window.__restoreOrig;');
    check('exceção durante a aplicação devolve false', falhou === false);
    check('exceção durante a aplicação restaura o estado anterior (sem meia importação)', estado() === estadoCompleto, { diff: estado().slice(0, 160) });
    check('usuário é avisado e o estado anterior é mantido', document.body.textContent.includes('O estado anterior foi mantido'));

    console.log('\n== UI 12g. Falha de gravação (localStorage recusa) é observável ==');
    const setItemOrig = window.Storage.prototype.setItem;
    const anchorClickStorageOrig = window.HTMLAnchorElement.prototype.click;
    const avisoStorage = () => document.getElementById('blob-save-warning');
    const avisos = () => document.querySelectorAll('#blob-save-warning').length;
    const bannersTexto = () => [...document.body.children].filter(d => String(d.className).includes('bottom-5')).map(d => d.textContent).join(' | ');
    const downloadsStorage = [];
    try {
        window.Storage.prototype.setItem = function () { throw new Error('QuotaExceededError (simulado)'); };
        const a0 = avisos();
        check('safeStorage.set devolve false quando o navegador recusa a gravação', ev("safeStorage.set('berzerker_teste_falha', '1')") === false);
        const primeiroAvisoStorage = avisoStorage();
        check('(1) falha de localStorage mostra aviso persistente com ação de backup', !!primeiroAvisoStorage && /Não foi possível salvar neste navegador/i.test(primeiroAvisoStorage.textContent) && !!primeiroAvisoStorage.querySelector('button[data-action="exportJSONBackup"]'));
        check('a falha cria só um aviso persistente de gravação', avisos() === a0 + 1, avisos() - a0);
        window.HTMLAnchorElement.prototype.click = function () { downloadsStorage.push(this.getAttribute('download')); };
        const btnExportarStorage = primeiroAvisoStorage?.querySelector('button[data-action="exportJSONBackup"]');
        if (btnExportarStorage) click(btnExportarStorage);
        await new Promise(r => setTimeout(r, 200));
        window.HTMLAnchorElement.prototype.click = anchorClickStorageOrig;
        check('(1) botão do aviso de localStorage exporta JSON de verdade', downloadsStorage.some(n => /^berzerker-diario-backup-\d{4}-\d{2}-\d{2}\.json$/.test(n || '')));
        ev("safeStorage.set('berzerker_teste_falha', '2'); safeStorage.set('berzerker_teste_falha', '3');");
        check('(2) falhas seguidas NÃO empilham nem recriam o aviso', avisos() === 1 && avisoStorage() === primeiroAvisoStorage);
        check('saveLogsToStorage reporta a falha (fluxo crítico de registro)', ev('saveLogsToStorage()') === false);
        [...document.body.children].filter(d => String(d.className).includes('bottom-5')).forEach(d => d.remove());
        const okImport = await ev(`applyImportedBackup(JSON.parse(${JSON.stringify(payloadCompleto)}))`);
        check('importação com gravação recusada: dados ficam na tela, mas a mensagem NÃO diz "sucesso"', okImport === true && estado() === estadoCompleto && bannersTexto().includes('não confirmou o salvamento') && !bannersTexto().includes('Backup importado com sucesso'), bannersTexto());
        const btnDispensarStorage = avisoStorage()?.querySelector('button[data-action="closeElementById"]');
        if (btnDispensarStorage) click(btnDispensarStorage);
        check('(4) Dispensar fecha o aviso de localStorage', !!btnDispensarStorage && !avisoStorage());
        window.Storage.prototype.setItem = setItemOrig;
        check('(3) gravação confirmada rearma a sequência de falhas', ev("safeStorage.set('berzerker_teste_falha', '4')") === true);
        window.Storage.prototype.setItem = function () { throw new Error('QuotaExceededError (simulado)'); };
        ev("safeStorage.set('berzerker_teste_falha', '5')");
        check('(3) a próxima falha após sucesso mostra o aviso novamente', avisos() === 1 && /Não foi possível salvar/.test(avisoStorage()?.textContent || ''));
    } catch (e) {
        check('fluxo persistente de falha do localStorage roda até o fim sem exceção', false, e.message);
    } finally {
        window.Storage.prototype.setItem = setItemOrig;
        window.HTMLAnchorElement.prototype.click = anchorClickStorageOrig;
        avisoStorage()?.remove();
        ev("localStorage.removeItem('berzerker_teste_falha'); safeStorage.set('berzerker_teste_rearme', 'ok'); localStorage.removeItem('berzerker_teste_rearme');");
    }

    console.log('\n== UI 12i. Falha de gravação no IndexedDB (imagens e fundo) é observável ==');
    // IndexedDB simulado: modo 'ok' | 'falha' (put dispara onerror) | 'abort' (transação aborta).
    window.__idbMode = 'ok';
    window.__fakeIDB = function () {
        const req = () => ({ onsuccess: null, onerror: null, onupgradeneeded: null, result: undefined });
        const db = {
            objectStoreNames: { contains: () => true },
            transaction() {
                if (window.__idbMode === 'abort') throw new Error('transação abortada (simulada)');
                return {
                    objectStore: () => ({
                        get: () => { const r = req(); queueMicrotask(() => { r.result = undefined; if (r.onsuccess) r.onsuccess({ target: r }); }); return r; },
                        put: () => { const r = req(); queueMicrotask(() => { if (window.__idbMode === 'falha') { if (r.onerror) r.onerror(new Error('put falhou (simulado)')); } else { r.result = 'k'; if (r.onsuccess) r.onsuccess({ target: r }); } }); return r; },
                        getAllKeys: () => { const r = req(); queueMicrotask(() => { r.result = []; if (r.onsuccess) r.onsuccess({ target: r }); }); return r; }
                    })
                };
            }
        };
        return { open() { const r = req(); queueMicrotask(() => { r.result = db; if (r.onsuccess) r.onsuccess({ target: r }); }); return r; } };
    };
    // avisos ao usuário: banners do alertModal (bottom-5) + o aviso persistente de imagem
    // (#blob-save-warning, I5), que substituiu o alertModal no notifyBlobFailure
    const ehAvisoIdb = d => String(d.className).includes('bottom-5') || d.id === 'blob-save-warning';
    const idbBanners = () => [...document.body.children].filter(ehAvisoIdb).map(d => d.textContent).join(' | ');
    const limpaBanners = () => [...document.body.children].filter(ehAvisoIdb).forEach(d => d.remove());
    ev("window.indexedDB = window.__fakeIDB();");
    check('com IndexedDB funcionando, saveBlobChecked confirma a gravação (true)', (await ev("saveBlobChecked('teste:blob', new Blob(['a']))")) === true);
    limpaBanners();
    ev("window.__idbMode = 'falha';");
    check('erro no put: saveBlobChecked devolve false (não confirma o salvamento)', (await ev("saveBlobChecked('teste:blob', new Blob(['a']))")) === false);
    check('erro no put: o usuário é avisado', /não confirmou o salvamento/i.test(idbBanners()), idbBanners().slice(0, 120));
    const bannersAntes = [...document.body.children].filter(ehAvisoIdb).length;
    await ev("saveBlobChecked('teste:blob2', new Blob(['b'])); saveBlobChecked('teste:blob3', new Blob(['c']));");
    check('falhas seguidas no IndexedDB NÃO geram um aviso por imagem (aviso único por sequência)',
        [...document.body.children].filter(ehAvisoIdb).length === bannersAntes);
    ev("window.__idbMode = 'abort';");
    check('transação abortada: saveBlobChecked também devolve false', (await ev("saveBlobChecked('teste:blob', new Blob(['a']))")) === false);
    limpaBanners();
    ev("window.__idbMode = 'ok';");
    check('com a gravação restabelecida, saveBlobChecked volta a confirmar (true)', (await ev("saveBlobChecked('teste:blob', new Blob(['a']))")) === true);
    ev("window.__idbMode = 'falha';");
    await ev("saveBlobChecked('teste:blob', new Blob(['a']))");
    check('uma nova sequência de falhas volta a avisar (aviso rearmado após sucesso)', /não confirmou o salvamento/i.test(idbBanners()));
    limpaBanners();

    // Nunca "salvo" falso: a mensagem de sucesso do upload só sai com confirmação.
    check('imagem não confirmada NÃO vira "atualizado!" na mensagem',
        /não confirmou o salvamento/i.test(ev("mensagemImagemSalva(false, '🖼️ Retrato do chefão atualizado!')")) &&
        !/atualizado/i.test(ev("mensagemImagemSalva(false, '🖼️ Retrato do chefão atualizado!')")));
    check('imagem confirmada mantém a mensagem de sucesso', ev("mensagemImagemSalva(true, '🖼️ Retrato do chefão atualizado!')") === '🖼️ Retrato do chefão atualizado!');

    // Migração de retrato legado (dataURL → Blob): sem confirmação, nada de perder a imagem.
    window.__compressOriginal = ev('window.storage.compressImage');   // host: devolve a função de volta no fim
    window.__objURLOriginal = window.URL.createObjectURL;
    window.URL.createObjectURL = () => 'blob:jsdom';
    ev("window.storage.compressImage = async () => new Blob(['x']);");
    // rearma o aviso (o último aviso veio de mensagemImagemSalva) e limpa os banners
    ev("window.__idbMode = 'ok';");
    await ev("saveBlobChecked('teste:rearme', new Blob(['a']))");
    limpaBanners();
    ev("window.__idbMode = 'falha';");
    ev("bossPortraits.boss1 = 'data:image/png;base64,AAA';");
    await ev('hydratePortraitBlobs()');
    check('IndexedDB recusando: o retrato legado continua em dataURL (sem perda) e o usuário é avisado',
        ev("bossPortraits.boss1") === 'data:image/png;base64,AAA' && /não confirmou o salvamento/i.test(idbBanners()), { valor: ev("bossPortraits.boss1"), banner: idbBanners() });
    ev("window.__idbMode = 'ok';");
    await ev('hydratePortraitBlobs()');
    check('IndexedDB funcionando: o retrato legado migra para Blob (marcador idb:)', /^idb:portrait:/.test(ev("bossPortraits.boss1")), ev("bossPortraits.boss1"));
    delete ev("bossPortraits")['boss1'];
    ev('window.storage.compressImage = window.__compressOriginal;');
    window.URL.createObjectURL = window.__objURLOriginal;

    // Importação de backup com imagem que o IndexedDB não confirma: a mensagem final não diz "sucesso".
    limpaBanners();
    ev("window.__idbMode = 'falha';");
    window.__dataURLtoBlobOriginal = ev('window.storage.dataURLToBlob');
    ev("window.storage.dataURLToBlob = async () => new Blob(['x']);");
    const backupComImagem = JSON.parse(JSON.stringify(await ev('buildBackupPayload()')));
    backupComImagem.portraitImages = { 'classico:boss1': 'data:image/png;base64,AAA' };
    const okComImagemRuim = await ev(`applyImportedBackup(${JSON.stringify(backupComImagem)})`);
    const textoImportacao = idbBanners();
    check('importação com imagem não confirmada: dados entram, mas a mensagem NÃO diz "sucesso"',
        okComImagemRuim === true && /não confirmou o salvamento/i.test(textoImportacao) && !/importado com sucesso/i.test(textoImportacao), textoImportacao.slice(0, 160));
    ev("window.storage.dataURLToBlob = window.__dataURLtoBlobOriginal;");
    ev("window.__idbMode = 'ok';");
    limpaBanners();

    // Nenhuma gravação de imagem pode fugir do caminho que confirma (regressão do P3).
    // O único lugar que pode chamar window.storage.saveBlob é o próprio saveBlobChecked.
    // TODO js/*.js (a lista fixa antiga não via os módulos extraídos na R2, como js/boss.js,
    // onde agora vivem o upload e a migração de retratos).
    const fontesImagem = fs.readdirSync('js').filter(f => f.endsWith('.js')).sort().map(f => 'js/' + f);
    const srcApp = fs.readFileSync('js/app.js', 'utf8').replace(/async function saveBlobChecked[\s\S]*?\n}\n/, '');
    const diretas = fontesImagem.filter(f => /window\.storage\.saveBlob\(/.test(f === 'js/app.js' ? srcApp : fs.readFileSync(f, 'utf8')));
    check('toda gravação de imagem passa por saveBlobChecked (nada de saveBlob direto)', diretas.length === 0, diretas);
    check('o helper que confirma a gravação de Blob chama saveBlob de verdade (não é stub)',
        /window\.storage\.saveBlob\(key, blob\)/.test(fs.readFileSync('js/app.js', 'utf8')));

    console.log('\n== UI 12j. Aviso persistente de imagem não confirmada, com ação de backup ==');
    // O aviso do notifyBlobFailure era um alertModal (some em ~4 s). Agora fica na tela até
    // ser dispensado e traz o botão real de exportar o backup — mesma semântica: uma vez por
    // sequência de falhas, rearmado após gravação confirmada, nunca "salvo" sem confirmação.
    const avisoBlob = () => document.getElementById('blob-save-warning');
    const retratoAntesI5 = ev("bossPortraits.boss1");
    const objURLOrigI5 = window.URL.createObjectURL, revokeOrigI5 = window.URL.revokeObjectURL;
    const anchorClickOrig = window.HTMLAnchorElement.prototype.click;
    window.__compressOrigI5 = ev('window.storage.compressImage');   // host guarda e devolve no fim
    try {
        limpaBanners();
        ev("window.__idbMode = 'ok';");
        await ev("saveBlobChecked('teste:i5:rearme', new Blob(['a']))");
        check('gravação confirmada não mostra aviso de imagem', !avisoBlob());
        ev("window.__idbMode = 'falha';");
        await ev("saveBlobChecked('teste:i5:a', new Blob(['a']))");
        const primeiroAviso = avisoBlob();
        check('(1) primeira falha da sequência: aparece o aviso com "não confirmou o salvamento"',
            !!primeiroAviso && /não confirmou o salvamento/i.test(primeiroAviso.textContent) && primeiroAviso.getAttribute('role') === 'alert');
        await new Promise(r => setTimeout(r, 3900));   // o alertModal se remove em 3,8 s; o aviso persistente não
        check('o aviso continua na tela depois do tempo em que um alertModal some (persistente)', !!primeiroAviso && avisoBlob() === primeiroAviso && document.body.contains(primeiroAviso));
        await ev("saveBlobChecked('teste:i5:b', new Blob(['b'])); saveBlobChecked('teste:i5:c', new Blob(['c']))");
        ev("mensagemImagemSalva(false, '🖼️ Retrato do chefão atualizado!')");
        check('(1) falhas seguidas na mesma sequência não recriam nem duplicam o aviso',
            !!primeiroAviso && avisoBlob() === primeiroAviso && document.querySelectorAll('#blob-save-warning').length === 1);
        const btnBackupAviso = avisoBlob() && avisoBlob().querySelector('button[data-action="exportJSONBackup"]');
        check('(2) o aviso traz o botão "Exportar backup JSON" ligado ao exportJSONBackup do app',
            !!btnBackupAviso && /Exportar backup JSON/i.test(btnBackupAviso.textContent) && window.getDiarioAction('exportJSONBackup') === ev('exportJSONBackup'));
        const downloadsAviso = [];
        window.HTMLAnchorElement.prototype.click = function () { downloadsAviso.push(this.getAttribute('download')); };
        try {
            if (btnBackupAviso) click(btnBackupAviso);
            await new Promise(r => setTimeout(r, 200));
        } finally { window.HTMLAnchorElement.prototype.click = anchorClickOrig; }
        check('(2) clicar no botão do aviso exporta o backup JSON de verdade (download + confirmação)',
            downloadsAviso.some(n => /^berzerker-diario-backup-\d{4}-\d{2}-\d{2}\.json$/.test(n || '')) && /Backup exportado/i.test(idbBanners()), downloadsAviso);
        check('o app continua utilizável: o aviso não é modal (não cobre a tela) e segue na tela após exportar',
            !!primeiroAviso && !/\binset-0\b/.test(String(primeiroAviso.className)) && avisoBlob() === primeiroAviso);
        const btnDispensar = avisoBlob() && avisoBlob().querySelector('button[data-action="closeElementById"]');
        if (btnDispensar) click(btnDispensar);
        check('"Dispensar" tira o aviso da tela', !!btnDispensar && !avisoBlob());
        await ev("saveBlobChecked('teste:i5:d', new Blob(['d']))");
        ev("mensagemImagemSalva(false, '🖼️ Retrato do chefão atualizado!')");
        check('(3) dispensado, o aviso NÃO reaparece enquanto a sequência de falhas continua', !avisoBlob());
        ev("window.__idbMode = 'ok';");
        check('(4) gravação confirmada: saveBlobChecked devolve true e não cria aviso',
            (await ev("saveBlobChecked('teste:i5:e', new Blob(['e']))")) === true && !avisoBlob());
        // (4) upload real de retrato com gravação confirmada: a mensagem de sucesso volta, sem aviso
        limpaBanners();
        window.URL.createObjectURL = () => 'blob:jsdom';
        window.URL.revokeObjectURL = () => { };   // jsdom não implementa; o upload revoga a URL antiga
        ev("window.storage.compressImage = async () => new Blob(['retrato']);");
        await ev("uploadBossPortrait({ target: { files: [new Blob(['png'])] } }, 'boss1')");
        check('(4) após o sucesso, upload confirmado diz "Retrato do chefão atualizado!" e não mostra aviso',
            /Retrato do chefão atualizado!/.test(idbBanners()) && !/não confirmou/i.test(idbBanners()) && !avisoBlob(), idbBanners().slice(0, 140));
        ev("window.__idbMode = 'falha';");
        await ev("saveBlobChecked('teste:i5:f', new Blob(['f']))");
        check('(3) sucesso seguido de nova falha: o aviso volta (rearmado), com a ação de backup',
            !!avisoBlob() && avisoBlob() !== primeiroAviso && !!avisoBlob().querySelector('button[data-action="exportJSONBackup"]'));
        check('(5) mensagemImagemSalva(false, …) mantém "não confirmou o salvamento" e não diz "atualizado"',
            /não confirmou o salvamento/i.test(ev("mensagemImagemSalva(false, '🖼️ Retrato do chefão atualizado!')")) &&
            !/atualizado/i.test(ev("mensagemImagemSalva(false, '🖼️ Retrato do chefão atualizado!')")));
    } catch (e) {
        check('fluxo do aviso persistente roda até o fim sem exceção', false, e.message);
    } finally {
        // restaura o estado para os trechos seguintes
        window.HTMLAnchorElement.prototype.click = anchorClickOrig;
        window.URL.createObjectURL = objURLOrigI5;
        window.URL.revokeObjectURL = revokeOrigI5;
        ev('window.storage.compressImage = window.__compressOrigI5; delete window.__compressOrigI5;');
        if (retratoAntesI5 === undefined) ev("delete bossPortraits.boss1"); else ev(`bossPortraits.boss1 = ${JSON.stringify(retratoAntesI5)}`);
        ev("saveGameState(); window.__idbMode = 'ok';");
        limpaBanners();
    }
