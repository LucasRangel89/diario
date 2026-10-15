/* ============================================================
   CSV (FORMATOS 1 E 2), BACKUP JSON E EXERCÍCIOS PERSONALIZADOS
   ------------------------------------------------------------
   Trecho de test_engine.js, movido sem alterar a lógica dos testes.
   Avaliado pelo runner no MESMO escopo dos demais trechos (ordem do nome).
   ============================================================ */

    console.log('\n== 17. CSV formato 2: round-trip com dados representativos (sintéticos) ==');
    const porTipo = t => api.EXERCISE_CATALOG_FULL.find(e => e.tipo === t && e.tipo !== 'corrida').nome;
    const EX_FIXA = porTipo('carga_total'), EX_PAR = porTipo('halter_par'), EX_UNI = porTipo('halter_uni');
    const EX_AFUNDO = porTipo('par_dois_lados'), EX_ISO = porTipo('isometria');
    const base = (o) => ({ sessao: 'Peito/Tríceps', rir: null, conferir: false, notes: '', technique: 'Convencional', nextGoal: '', isPR: false, muscle: 'Geral', kind: 'peso', ...o });
    const sinteticos = [
        base({ id: 1001, date: '2026-10-01', exercise: EX_FIXA, type: 'carga_total', weight: 60, reps: [10, 8, 8], rir: 2, conferir: true,
            notes: 'Pegada "pronada"; cuidado: ombro\nlinha 2 — ação, ç' }),
        base({ id: 1002, date: '2026-10-01', exercise: EX_PAR, type: 'halter_par', weight: 20, reps: [10, 10] }),
        base({ id: 1003, date: '2026-10-02', exercise: EX_UNI, type: 'halter_uni', weight: 12, reps: [8, 8] }),
        base({ id: 1004, date: '2026-10-02', exercise: EX_AFUNDO, type: 'par_dois_lados', weight: 5, reps: [7, 8, 7] }),
        base({ id: 1005, date: '2026-10-03', exercise: EX_ISO, type: 'isometria', weight: 0, reps: [60, 40, 34.5] }),
        base({ id: 1006, date: '2026-10-04', exercise: EX_FIXA, type: 'carga_total', weight: 40, sets: [{ weight: 40, reps: 10 }, { weight: 35, reps: 10 }, { weight: 30, reps: 8 }], reps: [10, 10, 8], sessao: '' }),
        base({ id: 1007, date: '2026-10-05', exercise: EX_FIXA, type: 'carga_total', weight: 60, reps: [10, 8, 8], rir: 2, conferir: true, notes: 'Pegada "pronada"; cuidado: ombro\nlinha 2 — ação, ç' }),
        base({ id: 1008, date: '2026-10-05', exercise: EX_FIXA, type: 'carga_total', weight: 60, reps: [10, 8, 8], rir: 2, conferir: true, notes: 'Pegada "pronada"; cuidado: ombro\nlinha 2 — ação, ç' }),
        { id: 1009, date: '2026-10-06', kind: 'corrida', muscle: 'Cardio', exercise: 'Corrida (Rua)', distanceKm: 5.5, durationMin: 30, notes: 'Ritmo "leve"; ótimo', technique: 'Convencional', isPR: false, nextGoal: '', type: 'corrida', reps: [] }
    ];
    // legítimo: 1007 e 1008 são TREINOS IGUAIS em dias/IDs diferentes (duplicata legítima)
    const originaisPorId = new Map(sinteticos.map(l => [l.id, l]));
    api.setLogs(sinteticos.map(l => ({ ...l })));
    const csvRT = api.buildPlanilhaCSV();
    check('CSV tem as abas Log, Cardio e Formato', ['--- Sheet: Log ---', '--- Sheet: Cardio ---', '--- Sheet: Formato ---'].every(m => csvRT.includes(m)));
    const lido = api.lerPlanilhaCSV(csvRT);
    check('round-trip: arquivo gerado é lido sem erros', lido.erros.length === 0, lido.erros);
    check('round-trip: 8 treinos + 1 cardio importáveis', lido.logs.length === 9, lido.logs.length);
    const cardioLido = lido.logs.find(l => l.kind === 'corrida');
    check('round-trip: cardio volta como corrida (fora do volume)', !!cardioLido && cardioLido.distanceKm === 5.5 && cardioLido.durationMin === 30 && cardioLido.notes === 'Ritmo "leve"; ótimo', cardioLido);
    check('round-trip: cardio NÃO aparece na aba Log (sem misturar com volume)', !csvRT.split('--- Sheet: Catálogo ---')[0].includes('Corrida (Rua)'));
    const planoRT = api.planejarImportacaoLogs(lido.logs, []);
    check('round-trip: sem duplicar quando não há nada no app (9 novos)', planoRT.novos.length === 9 && planoRT.iguais === 0 && planoRT.conflitos.length === 0, planoRT);
    // equivalência dos dados relevantes E dos cálculos, registro a registro (pelo ID)
    const campos = l => ({ fp: api.csvLogFingerprint(l), vol: api.logVolumeKg(l), ...(({ cargaEfetiva, totalReps, bestSet, worstSet, est1RM, volume }) => ({ cargaEfetiva, totalReps, bestSet, worstSet, est1RM, volume }))(api.logFullMeta(l)) });
    const dif = [];
    lido.logs.forEach(imp => {
        const orig = originaisPorId.get(Number(imp.externalId.slice(1)));
        if (!orig) return dif.push('sem original ' + imp.externalId);
        const a = campos(orig), b = campos(imp);
        if (JSON.stringify(a) !== JSON.stringify(b)) dif.push({ id: imp.externalId, a, b });
        if (imp.type !== orig.type) dif.push({ tipo: imp.externalId, a: orig.type, b: imp.type });
        if (imp.technique !== orig.technique) dif.push({ tecnica: imp.externalId });
    });
    check('round-trip: campos e cálculos idênticos registro a registro (volume, 1RM, melhor/pior série, reps)', dif.length === 0, dif.slice(0, 2));
    const dropOrig = originaisPorId.get(1006), dropImp = lido.logs.find(l => l.externalId === 'L1006');
    check('drop-set preserva cada série (peso e reps)', JSON.stringify(dropImp.sets) === JSON.stringify(dropOrig.sets), dropImp.sets);
    const isoImp = lido.logs.find(l => l.externalId === 'L1005');
    check('isometria preserva segundos decimais (34,5 s) e não gera volume', isoImp.reps.join('|') === '60|40|34.5' && api.logVolumeKg(isoImp) === 0, isoImp.reps);
    const obsImp = lido.logs.find(l => l.externalId === 'L1001');
    check('observações com aspas, ponto e vírgula, quebra de linha e acentos preservadas', obsImp.notes === sinteticos[0].notes, obsImp.notes);
    check('campos vazios (sessão, RIR) voltam vazios/nulos, não viram zero', lido.logs.find(l => l.externalId === 'L1006').sessao === '' && lido.logs.find(l => l.externalId === 'L1002').rir === null);
    // reimportar o mesmo arquivo com os mesmos registros no app → nada novo
    const planoRe = api.planejarImportacaoLogs(lido.logs, sinteticos);
    check('reimportar o mesmo arquivo não duplica (0 novos, 9 já existentes)', planoRe.novos.length === 0 && planoRe.iguais === 9 && planoRe.conflitos.length === 0, { n: planoRe.novos.length, i: planoRe.iguais, c: planoRe.conflitos.length });
    const editado = sinteticos.map(l => l.id === 1002 ? { ...l, weight: 22 } : l);
    const planoConf = api.planejarImportacaoLogs(lido.logs, editado);
    check('mesmo ID com conteúdo alterado é CONFLITO (não sobrescreve)', planoConf.conflitos.length === 1 && planoConf.novos.length === 0, planoConf.conflitos.map(l => l.externalId));
    check('duplicata legítima (dois treinos idênticos) continua sendo 2 registros no arquivo', lido.logs.filter(l => l.date === '2026-10-05' && l.exercise === EX_FIXA).length === 2);

    console.log('\n== 17b. CSV formato 1 (antigo, sem ID nem Séries JSON) ==');
    const v1 = [
        'Data;Sessão;Exercício;Carga registrada (kg);S1;S2;S3;S4;S5;RIR;Conferir?;Observações;Unidade;Fator;Lados;Carga efetiva (kg);Total reps (ou segundos);Volume (kg);Melhor série;Menor série;1RM Epley (kg);Métrica de progresso',
        `09/10/2026;Costas;${EX_FIXA};50;10;10;8;;;2;Sim;"Obs; com ponto e vírgula";reps;1;1;50;28;1400;10;8;;50`,
        `09/10/2026;Costas;${EX_FIXA};50;10;10;8;;;2;Sim;"Obs; com ponto e vírgula";reps;1;1;50;28;1400;10;8;;50`,
        `10/10/2026;Costas;${EX_UNI};12,5;8;8;;;;;Não;Pé de pato "ação";halter;1;1;12,5;16;200;8;8;;12,5`,
        '',
        `10/10/2026;Costas;${EX_ISO};0;60;40;;;;;Não;;seg;1;1;0;100;0;60;40;;0`
    ].join('\n');
    const l1 = api.lerPlanilhaCSV('--- Sheet: Log ---\n' + v1);
    check('formato 1 lê sem erro (inclui vírgula decimal e linha vazia)', l1.erros.length === 0 && l1.logs.length === 4 && l1.modo === 'v1', { e: l1.erros, n: l1.logs.length });
    check('formato 1: séries S1–S5 viram reps e o peso de 12,5 é lido', l1.logs[2].reps.join() === '8,8' && l1.logs[2].weight === 12.5);
    check('formato 1: aspa solta no meio do campo não quebra a linha (Pé de pato "ação")', l1.logs[2].notes === 'Pé de pato "ação"', l1.logs[2].notes);
    check('formato 1: duas linhas idênticas legítimas são 2 registros', l1.logs[0].reps.join() === '10,10,8' && l1.logs[1].reps.join() === '10,10,8');
    const pl1a = api.planejarImportacaoLogs(l1.logs, []);
    check('formato 1: primeira importação traz tudo (4 novos)', pl1a.novos.length === 4);
    const pl1b = api.planejarImportacaoLogs(l1.logs, pl1a.novos.map(l => ({ ...l, id: l.id + 500 })));
    check('formato 1: reimportar o mesmo arquivo não duplica (0 novos)', pl1b.novos.length === 0 && pl1b.iguais === 4, { n: pl1b.novos.length, i: pl1b.iguais });
    const pl1c = api.planejarImportacaoLogs(l1.logs, [pl1a.novos[0]].map(l => ({ ...l, id: 777 })));
    check('formato 1: se o app tem só 1 de 2 duplicatas legítimas, importa a outra', pl1c.novos.length === 3 && pl1c.iguais === 1, { n: pl1c.novos.length, i: pl1c.iguais });

    console.log('\n== 17c. CSV inválido: nada é aceito em silêncio ==');
    const cab = 'Data;Sessão;Exercício;Carga registrada (kg);S1;S2;S3;S4;S5;RIR;Conferir?;Observações';
    const ruins = {
        'data impossível (31/02)': `${cab}\n31/02/2026;;${EX_FIXA};50;10;;;;;;;`,
        'data em texto': `${cab}\nontem;;${EX_FIXA};50;10;;;;;;;`,
        'carga não numérica': `${cab}\n09/10/2026;;${EX_FIXA};cinquenta;10;;;;;;;`,
        'repetição não numérica': `${cab}\n09/10/2026;;${EX_FIXA};50;dez;;;;;;;`,
        'RIR negativo': `${cab}\n09/10/2026;;${EX_FIXA};50;10;;;;;-1;;`,
        'Séries (JSON) quebrado': `${cab};ID do registro;Séries (JSON)\n09/10/2026;;${EX_FIXA};50;10;;;;;;;;L1;{"modo":"sets","series":[{"weight":40,"reps":`,
        'coluna extra sem aspas': `${cab}\n09/10/2026;;${EX_FIXA};50;10;;;;;;"x;y;z";sobra;extra`,
        'sem coluna obrigatória': 'Data;Sessão;Carga registrada (kg)\n09/10/2026;;50',
        'versão de formato futura': `--- Sheet: Log ---\n${cab}\n--- Sheet: Formato ---\nVersão do formato;9`,
        'cardio sem distância nem tempo': `--- Sheet: Cardio ---\nData;Modalidade;Distância (km);Duração (min);Observações;ID do registro\n09/10/2026;Corrida (Rua);;;;L9`,
        'peso corporal zero': `--- Sheet: Peso corporal ---\nData;Peso (kg);Observação\n09/10/2026;0;`,
        'início da semana inválido': `--- Sheet: Semana a semana ---\nInício da semana 1 (segunda-feira);31/02/2026`
    };
    Object.entries(ruins).forEach(([nome, txt]) => {
        const r = api.lerPlanilhaCSV(txt.startsWith('--- Sheet:') ? txt : '--- Sheet: Log ---\n' + txt);
        check(`CSV inválido é reportado: ${nome}`, r.erros.length > 0, r.logs.length);
    });
    check('linha inválida não vira zero nem data de hoje (logs válidos não incluem a linha ruim)', api.lerPlanilhaCSV(`--- Sheet: Log ---\n${cab}\n31/02/2026;;${EX_FIXA};50;10;;;;;;;`).logs.length === 0);
    check('arquivo sem abas reconhecíveis é reportado', api.lerPlanilhaCSV('texto qualquer').erros.length > 0);
    check('cabeçalho apenas (sem registros) não gera erro nem lançamentos', (() => { const r = api.lerPlanilhaCSV(`--- Sheet: Log ---\n${cab}`); return r.erros.length === 0 && r.logs.length === 0; })());

    console.log('\n== 17d. Serialização e parser de campos ==');
    check('csvField: aspas e ponto e vírgula são protegidos e aspas internas dobradas', api.csvField('a"b;c') === '"a""b;c"', api.csvField('a"b;c'));
    check('csvField: quebra de linha entra entre aspas', api.csvField('x\ny') === '"x\ny"');
    check('csvField: campo vazio ou nulo sai vazio', api.csvField('') === '' && api.csvField(null) === '' && api.csvField(undefined) === '');
    check('csvField: acentos e Unicode não são alterados', api.csvField('Ação, pé — ç ✓') === 'Ação, pé — ç ✓');
    check('parseCSVRows: aspa no meio do campo é literal', JSON.stringify(api.parseCSVRows('a;b "c";d', ';')) === JSON.stringify([['a', 'b "c"', 'd']]));
    check('parseCSVRows: campo com aspas duplicadas e separadores', JSON.stringify(api.parseCSVRows('"x ""y"" ; z";1', ';')) === JSON.stringify([['x "y" ; z', '1']]));
    check('data inválida: parseDataCSV rejeita 31/02 e aceita 28/02/2026', api.parseDataCSV('31/02/2026') === null && api.parseDataCSV('28/02/2026') === '2026-02-28' && api.parseDataCSV('2026-02-28') === '2026-02-28');
    check('csvLogId: registro local usa L + id; importado mantém o ID externo', api.csvLogId({ id: 12 }) === 'L12' && api.csvLogId({ id: 12, externalId: 'L99' }) === 'L99');

    // ============================================================
    // 18. Recuperação: estabilidade (dados vazios, datas, aliases, faixas)
    // ============================================================
    console.log('\n== 18. Recuperação: estabilidade dos cálculos ==');
    const hojeISO = api.getTodayLocalISO();
    const noMeioDia = iso => new Date(iso + 'T12:00:00').getTime();
    const nowRef = noMeioDia(hojeISO);
    check('sem registros: "SEM REGISTRO", sem NaN', api.recoveryState('Peito', [], nowRef).label === 'SEM REGISTRO');
    check('data inválida NÃO vira "100% pronto" (regressão: NaN)', api.recoveryState('Peito', [{ id: 1, date: 'lixo', exercise: 'Supino Reto na Máquina', reps: [8] }], nowRef).label === 'SEM REGISTRO');
    check('data inexistente (31/02) é ignorada', api.recoveryState('Peito', [{ id: 2, date: '2026-02-31', exercise: 'x', reps: [8] }], nowRef).label === 'SEM REGISTRO');
    const hoje = api.recoveryState('Peito', [{ id: 3, date: hojeISO, exercise: 'Supino Reto na Máquina', reps: [10, 10, 10] }], nowRef);
    check('mesmo dia (sem horas passadas): fadiga alta, não pronto', hoje.pct < 33 && hoje.label === 'FADIGA ALTA' && Number.isFinite(hoje.pct), hoje);
    const r3d = api.recoveryState('Peito', [{ id: 4, date: '2026-10-12', exercise: 'x', reps: [10] }], noMeioDia('2026-10-15'));
    check('3 dias depois (48 h de janela): pronto (estimado), texto sem "garantia"', r3d.label === 'PRONTO (ESTIMADO)' && /janela estimada/i.test(r3d.info), r3d);
    const rods = [];
    for (let d = 0; d < 14; d++) {
        const dia = new Date(Date.UTC(2026, 9, 1 + d)).toISOString().slice(0, 10);
        rods.push(api.recoveryState('Pernas', [{ id: 10, date: '2026-09-30', exercise: 'x', reps: [10, 10] }], noMeioDia(dia)));
    }
    check('virada de dia/semana: percentual sempre entre 2 e 100 e nunca NaN', rods.every(r => Number.isFinite(r.pct) && r.pct >= 2 && r.pct <= 100), rods.map(r => r.pct));
    const futuro = api.recoveryState('Peito', [{ id: 5, date: '2026-10-20', exercise: 'x', reps: [10] }], nowRef);
    check('data futura não quebra (percentual finito); limitação registrada no relatório', Number.isFinite(futuro.pct), futuro);
    check('grupo legado "Glúteos" usa a faixa e o grupo canônico "Posterior"', api.fatigueState('Glúteos', [], 0, nowRef).muscle === 'Posterior');
    check('séries acima da faixa (25 no Peito) → "acima da faixa"', api.fatigueState('Peito', [], 25, nowRef).volumeStatus === 'acima');
    check('séries abaixo da faixa (3 no Peito) → "abaixo da meta"', api.fatigueState('Peito', [], 3, nowRef).volumeStatus === 'abaixo');
    check('antebraço: 6 séries estão na faixa própria (4–10)', api.fatigueState('Antebraço', [], 6, nowRef).volumeStatus === 'na-faixa');
    const sinIndireto = { pct: 40, fator: 0.5, de: 'pegada', series: 2 };
    const fSin = api.fatigueState('Antebraço', [], 0, nowRef, sinIndireto);
    check('estímulo indireto reduz a prontidão e aparece como apoio (não como série direta)', fSin.recuperacaoPct === 40 && fSin.sinergia === sinIndireto && fSin.seriesSemana === 0, fSin);
    check('registros sem data válida não contam como apoio indireto', api.sinergiaState('Antebraço', [{ id: 9, kind: 'peso', muscle: 'Costas', date: '', exercise: 'Barra Fixa (Pull-up)', reps: [5] }], nowRef) === null);

    // ============================================================
    // 19. Backup: validação pura (sem alterar nada)
    // ============================================================
    console.log('\n== 19. Backup JSON: validação antes de substituir os dados ==');
    check('backup nulo ou sem objeto é rejeitado', api.validarBackupJSON(null).ok === false && api.validarBackupJSON([]).ok === false);
    check('backup sem "logs" é rejeitado', api.validarBackupJSON({ savedWorkouts: [] }).ok === false);
    check('"logs" não-lista é rejeitado', api.validarBackupJSON({ logs: 'x' }).ok === false);
    check('registro com data inválida rejeita o backup inteiro', api.validarBackupJSON({ logs: [{ id: 1, date: '2026-13-01', exercise: 'x' }] }).ok === false);
    check('registro sem exercício rejeita o backup', api.validarBackupJSON({ logs: [{ id: 1, date: '2026-10-01', exercise: '' }] }).ok === false);
    check('registro com carga negativa rejeita o backup', api.validarBackupJSON({ logs: [{ id: 1, date: '2026-10-01', exercise: 'x', weight: -5 }] }).ok === false);
    check('registro com séries (sets) inválidas rejeita o backup', api.validarBackupJSON({ logs: [{ id: 1, date: '2026-10-01', exercise: 'x', sets: 'nope' }] }).ok === false);
    check('savedWorkouts de tipo errado rejeita o backup', api.validarBackupJSON({ logs: [], savedWorkouts: 'x' }).ok === false);
    check('peso corporal inválido rejeita o backup', api.validarBackupJSON({ logs: [], userBodyweight: -1 }).ok === false);
    check('pesagem com data inválida rejeita o backup', api.validarBackupJSON({ logs: [], weightLog: [{ date: 'x', peso: 80 }] }).ok === false);
    const legado = api.validarBackupJSON({ version: 2, logs: [{ id: 5, date: '2026-10-01', exercise: 'Supino Reto na Máquina', weight: 50, reps: [10] }], userBodyweight: 80, deloadWeeks: ['2026-W41'], missionsXpTotal: 120, missionsClaimed: {}, tests: [], seasons: null, bossPortraits: {}, gameTheme: 'classico' });
    check('backup antigo (sem savedWorkouts/customExercises/sharedGameState) é aceito', legado.ok === true && legado.dados.logs.length === 1, legado.erros);
    check('backup antigo: campos ausentes NÃO apagam savedWorkouts nem exercícios personalizados', legado.dados.hasSavedWorkouts === false && legado.custom.presente === false);
    check('backup antigo: deloadWeeks legado vem do topo do arquivo', (legado.shared.deloadWeeks || []).join() === '2026-W41');
    check('ids repetidos no backup: a 1ª ocorrência mantém o id; as demais recebem id novo (edição/exclusão seguras)', (() => { const v = api.validarBackupJSON({ logs: [{ id: 7, date: '2026-10-01', exercise: 'x', reps: [1] }, { id: 7, date: '2026-10-02', exercise: 'y', reps: [1] }, { id: 8, date: '2026-10-03', exercise: 'z', reps: [1] }] }); const ids = v.dados.logs.map(l => l.id); return v.ok && ids[0] === 7 && new Set(ids).size === 3 && ids[2] === 8; })());
    check('backup antigo: registro sem id recebe id, migrado (Pescoço → Ombros)', (() => { const v = api.validarBackupJSON({ logs: [{ date: '2026-10-01', exercise: 'Extensão Cervical', muscle: 'Pescoço', weight: 10, reps: [10] }] }); return v.ok && v.dados.logs[0].id && v.dados.logs[0].muscle === 'Ombros'; })());

    console.log('\n== 19b. Exercícios personalizados: regras de conflito determinísticas ==');
    const nomeBase = api.EXERCISE_CATALOG_FULL[0].nome;
    const norm = api.normalizarExerciciosPersonalizados([
        { nome: 'Remada Teste', grupo: 'Costas', tipo: 'carga_total', fator: 1, lados: 1, faixa: [8, 12], descanso: 90, sinonimos: 'remada teste; rt', tagsExtras: ['iniciante'], cargaLombar: true },
        { nome: 'remada teste' },
        { nome: nomeBase },
        { nome: '   ' },
        { nome: 'Afundo Personalizado', tipo: 'par_dois_lados', fator: 2, lados: 2, faixa: [6, 10], descanso: 120, unidade: 'reps' },
        { nome: 'Tipo Inválido', tipo: 'nao_existe' }
    ]);
    check('nome repetido no arquivo: vale a primeira ocorrência', norm.lista.filter(e => e.nome.toLowerCase() === 'remada teste').length === 1 && norm.lista[0].sinonimos === 'remada teste; rt');
    check('nome do catálogo principal: não importado e reportado (catálogo intocado)', norm.conflitos.some(c => c.includes(nomeBase)) && !norm.lista.some(e => e.nome === nomeBase));
    check('item sem nome ou tipo desconhecido: erro, sem aceitar nada parcial', norm.erros.length === 2, norm.erros);
    check('propriedades de cálculo preservadas (fator, lados, faixa, descanso, lombar, tags extras)', (() => { const e = norm.lista[0]; return e.cargaLombar === true && e.tagsExtras[0] === 'iniciante' && e.descanso === 90 && e.faixa.join() === '8,12'; })());
    const ok2 = api.normalizarExerciciosPersonalizados([{ nome: 'Afundo Personalizado', tipo: 'par_dois_lados', fator: 2, lados: 2, faixa: [6, 10], descanso: 120 }]);
    check('afundo personalizado mantém fator 2, lados 2, faixa 6–10, descanso 120', ok2.erros.length === 0 && ok2.lista[0].fator === 2 && ok2.lista[0].lados === 2 && ok2.lista[0].faixa.join() === '6,10' && ok2.lista[0].descanso === 120);
