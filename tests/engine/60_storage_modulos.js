/* ============================================================
   CAMADA DE ARMAZENAMENTO (IndexedDB) E GRAFO DE MÓDULOS
   ------------------------------------------------------------
   Trecho de test_engine.js, movido sem alterar a lógica dos testes.
   Avaliado pelo runner no MESMO escopo dos demais trechos (ordem do nome).
   ============================================================ */

    console.log('\n== 1-storage. IndexedDB: migração, idempotência e recuperação ==');
    const storage = api.storageRef;

    // round-trip síncrono
    storage.set('berzerker_teste_rt', 'valor-123');
    check('storage.set/get round-trip', storage.get('berzerker_teste_rt') === 'valor-123');

    // migração: 3 chaves legadas no localStorage
    __lsData.set('berzerker_legado_a', '1');
    __lsData.set('berzerker_legado_b', '2');
    __lsData.set('berzerker_legado_c', '3');
    const mig1 = await storage.migrate();
    check('migração conclui com validação de contagem', mig1 && mig1.ok === true, mig1);
    check('localStorage NÃO é apagado depois da migração (cópia antiga preservada)',
        __lsData.get('berzerker_legado_a') === '1' && __lsData.get('berzerker_legado_b') === '2' && __lsData.get('berzerker_legado_c') === '3');
    const mig2 = await storage.migrate();
    check('segunda migração é pulada (idempotente)', mig2 && mig2.skipped === true, mig2);
    check('schemaVersion declarado = 1', storage.schemaVersion === 1);
    check('flag de migração gravada no IndexedDB', await storage.peekRaw('__berzerker_migrated_v1') === '1');
    check('schemaVersion gravado no IndexedDB', await storage.peekRaw('__berzerker_schema_version') === '1');

    // recuperação: localStorage esvaziado → espelho do IndexedDB restaura
    const antes = storage.get('berzerker_legado_a');
    __lsData.delete('berzerker_legado_a');
    __lsData.delete('berzerker_legado_b');
    const rec = await storage.recoverFromIndexedDB();
    check('chaves perdidas são restauradas do espelho do IndexedDB',
        rec && rec.ok && rec.restored >= 2 && storage.get('berzerker_legado_a') === antes && storage.get('berzerker_legado_b') === '2', rec);
    const rec2 = await storage.recoverFromIndexedDB();
    check('recuperação repetida não restaura nada (idempotente)', rec2 && rec2.ok && rec2.restored === 0, rec2);

    // ---- Etapa 5.1 (sub-etapa 3): despachante central de eventos ----
    console.log('\n== 5.1b. Despachante de eventos (js/actions.js) ==');
    check('actions.js registra os 5 tipos de evento', ['click','keydown','change','input','submit'].every(t => api.docListeners.includes(t)) && api.docListeners.includes('error'));
    check('registro de ações existe e registra função', typeof api.diarioActions === 'object' && typeof api.getDiarioAction('registerDiarioAction') === 'undefined');

    // ---- Etapa 5.1: manifestos de export (fundação ES modules) ----
    console.log('\n== 5.1. Manifestos de export por arquivo ==');
    const ex = window.__diarioExports || {};
    const files = window.__diarioExportFiles || {};
    // Todo módulo de js/ declara a própria superfície (js/actions.js é o despachante).
    const arquivosComManifesto = fs.readdirSync('js').filter(f => f.endsWith('.js')).map(f => 'js/' + f).filter(f => f !== 'js/actions.js');
    check(`todo módulo de js/ registra manifesto (${arquivosComManifesto.length} arquivos)`, arquivosComManifesto.every(f => f in files), Object.keys(files));
    const criticos = ['storage','safeStorage',
        'catalogInfo','logVolumeKg','duplaProgressao','sinalProximaSessao','recoveryState','normalizeMuscle',
        'THEMES','computeXP','computeBossProgress',
        'fatigueState','orderWorkoutExercises','suggestNextWorkout','regiaoLombarState',
        'PLANILHA_LOG','seedFromPlanilha','PLANILHA_SESSOES',
        'buildPlanilhaCSV','exportCSV',
        'searchCatalog','deriveTags','exerciseTags',
        'loadCustomExercises','catalogInfoCustom',
        'loadStoredData','renderSession','renderRecoveryMap','renderHistory','fieldsHTML'];
    const faltando = criticos.filter(n => !(n in ex));
    check('símbolos críticos presentes nos manifestos', faltando.length === 0, faltando);
    check('manifesto expõe mais de 400 símbolos (superfície completa)', Object.keys(ex).length > 400, Object.keys(ex).length);
    check('storage do manifesto tem migrate/persist/compressImage', typeof ex.storage.migrate === 'function' && typeof ex.storage.persist === 'function' && typeof ex.storage.compressImage === 'function');

    // ---- Etapa 5.1: toda data-* declarada tem handler registrado; sem handlers inline ----
    console.log('\n== 5.1c. Cobertura da delegação de eventos ==');
    // Varre index.html + TODO js/*.js: a lista fixa antiga deixava de fora os módulos
    // extraídos do app na R2 (cartoes, calculadoras, sessao, boss, registro...) e,
    // com eles, as ações dos templates que mudaram de arquivo.
    const fsDeleg = ['index.html', ...fs.readdirSync('js').filter(f => f.endsWith('.js')).sort().map(f => 'js/' + f)];
    const acaoRe = /data-(?:action|change-action|input-action|submit-action|error-action)="([\w$]+)"/g;
    const usadas = new Set();
    fsDeleg.forEach(f => {
        const src = fs.readFileSync(f, 'utf8');
        let m;
        while ((m = acaoRe.exec(src)) !== null) usadas.add(m[1]);
    });
    const naoRegistradas = [...usadas].filter(n => typeof api.diarioActions[n] !== 'function');
    check('toda ação declarada em data-* está registrada (' + usadas.size + ' ações)', naoRegistradas.length === 0, naoRegistradas);
    const inlineRestante = fsDeleg.reduce((n, f) => n + (fs.readFileSync(f, 'utf8').match(/\son(click|change|input|submit|keydown|error)="[^"]*"/g) || []).length, 0);
    check('nenhum handler inline em index.html e js/**', inlineRestante === 0, inlineRestante);

    // ---- Etapa 5.1: entry module na ordem certa ----
    console.log('\n== 5.1d. Entry module (js/app.js) ==');
    const entrySrc = fs.readFileSync('js/app.js', 'utf8');
    const primeiras = entrySrc.split('\n').filter(l => l.startsWith("import '")).map(l => l.match(/'([^']+)'/)[1]);
    check('entry importa actions.js primeiro (registro de ações antes de tudo)', primeiras[0] === './actions.js', primeiras.slice(0, 3));
    check('entry importa os 10 módulos na ordem do app (os 9 + datas.js)', JSON.stringify(primeiras.slice(0, 10)) === JSON.stringify(['./actions.js', './storage.js', './catalogo.js', './gamificacao.js', './assistente.js', './planilha_data.js', './historico.js', './busca.js', './custom_exercises.js', './datas.js']), primeiras);

    // ---- Etapa 5.1 (sub-etapa 4): sw.js pré-cacheia todo o js/ ----
    console.log('\n== 5.1e. Cache offline cobre os módulos ==');
    const swSrc = fs.readFileSync('sw.js', 'utf8');
    const coreMatch = swSrc.match(/const CORE = \[([\s\S]*?)\];/);
    const core = coreMatch ? (coreMatch[1].match(/'\.\/([^']+)'(?:\.webp)?'/g) || []).join('') : '';
    const coreList = (coreMatch ? coreMatch[1].match(/'\.?(\/[^']+)'/g) || [] : [])
        .map(x => x.slice(1, -1).replace(/^\.?\//, ''));
    const jsFiles = fs.readdirSync('js').filter(f => f.endsWith('.js'));
    const faltandoNoCore = jsFiles.filter(f => !coreList.includes('js/' + f));
    check('sw.js CORE inclui todos os arquivos de js/', faltandoNoCore.length === 0, faltandoNoCore);
    check('sw.js VERSION subiu para módulos (>= v32)', Number((swSrc.match(/VERSION = 'v(\d+)'/) || [])[1]) >= 32);

    // ============================================================
    // 17. CSV — formato 2: round-trip, campos especiais, séries, cardio
    // ============================================================