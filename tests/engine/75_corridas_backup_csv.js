/* B4 — compatibilidade JSON/CSV para os campos opcionais de corrida. */
{
    console.log('\n== 18. Backup JSON v5/v6 e CSV formato 3 para corrida (sintético) ==');
    const corridaD6 = {
        id: 770001, date: '2026-10-15', kind: 'corrida', muscle: 'Cardio', exercise: 'Corrida (Rua)',
        distanceKm: 5, durationMin: 24 + 37 / 60, notes: 'sintético; "teste"', type: 'corrida', reps: [],
        xpTheme: 'zodiaco', runType: 'ritmo/limiar', rpe: 7, hrAvg: 158, shoe: 'Tênis; "A"'
    };
    const validD6 = api.validarBackupJSON({ version: 6, logs: [corridaD6] });
    check('backup JSON v6 aceita e preserva os quatro campos D6 dentro de logs', validD6.ok && validD6.dados.logs[0].runType === 'ritmo/limiar' && validD6.dados.logs[0].rpe === 7 && validD6.dados.logs[0].hrAvg === 158 && validD6.dados.logs[0].shoe === 'Tênis; "A"');
    check('backup JSON aceita os sete valores válidos de runType', ['leve','longo','intervalado','ritmo/limiar','prova','regenerativo','outro'].every(runType => api.validarBackupJSON({version:6,logs:[{...corridaD6,runType}]}).ok));
    check('backup JSON rejeita runType inválido ou com tipo errado', !api.validarBackupJSON({version:6,logs:[{...corridaD6,runType:'competição'}]}).ok && !api.validarBackupJSON({version:6,logs:[{...corridaD6,runType:7}]}).ok);
    check('backup JSON rejeita RPE fora de 1–10, fracionário ou com tipo errado', [0,11,7.5,'7',null].every(rpe => !api.validarBackupJSON({version:6,logs:[{...corridaD6,rpe}]}).ok));
    check('backup JSON rejeita FC média não positiva ou com tipo errado', [0,-1,'158',null].every(hrAvg => !api.validarBackupJSON({version:6,logs:[{...corridaD6,hrAvg}]}).ok));
    check('backup JSON rejeita tênis que não seja texto', !api.validarBackupJSON({version:6,logs:[{...corridaD6,shoe:158}]}).ok);
    const legadoD5 = { id:770002,date:'2026-10-15',kind:'corrida',exercise:'Corrida (Rua)',distanceKm:-3,durationMin:'legado' };
    check('backups v5 e v6 continuam aceitando distanceKm/durationMin que o validador antigo não endurecia', [5,6].every(version => api.validarBackupJSON({version,logs:[{...legadoD5}]}).ok));

    api.setLogs([{ ...corridaD6 }]);
    const csv3 = api.buildPlanilhaCSV();
    const secaoCardio = csv3.split('--- Sheet: Cardio ---')[1].split('--- Sheet: Formato ---')[0].trim().split('\n').map(row => api.parseCSVRows(row, ';')[0]);
    const cabecalhoCardio = secaoCardio[0];
    check('export atual declara formato 3 e acrescenta D6 no fim da aba Cardio depois do ID', csv3.includes('Versão do formato;3') && cabecalhoCardio.slice(-4).join('|') === 'Tipo de corrida|RPE|FC média (bpm)|Tênis');
    const lido3 = api.lerPlanilhaCSV(csv3);
    const cardioLido3 = lido3.logs.find(log => log.kind === 'corrida');
    check('CSV 3 round-trip preserva tipo, RPE, FC, tênis com aspas/separadores, distância e duração', lido3.erros.length === 0 && cardioLido3.runType === corridaD6.runType && cardioLido3.rpe === 7 && cardioLido3.hrAvg === 158 && cardioLido3.shoe === corridaD6.shoe && cardioLido3.distanceKm === 5 && cardioLido3.durationMin === 24.62);
    const mesmoD6 = api.planejarImportacaoLogs(lido3.logs, [corridaD6]);
    check('CSV 3 reimportado com ID enriquecido é igual, sem conflito nem duplicata', mesmoD6.iguais === 1 && mesmoD6.conflitos.length === 0 && mesmoD6.novos.length === 0);

    const csv2 = [
        '--- Sheet: Log ---', 'Data;Sessão;Exercício;Carga registrada (kg)',
        '--- Sheet: Cardio ---', 'Data;Modalidade;Distância (km);Duração (min);Observações;ID do registro',
        '15/10/2026;Corrida (Rua);5;24.62;"sintético; ""teste""";L770001',
        '--- Sheet: Formato ---', 'Versão do formato;2'
    ].join('\n');
    const lido2 = api.lerPlanilhaCSV(csv2);
    const plano2 = api.planejarImportacaoLogs(lido2.logs, [corridaD6]);
    check('CSV formato 2 sem D6 importa e reimportado com log enriquecido conta como igual', lido2.erros.length === 0 && lido2.modo === 'v2' && plano2.iguais === 1 && plano2.conflitos.length === 0 && plano2.novos.length === 0);
    const csv1 = ['--- Sheet: Log ---','Data;Sessão;Exercício;Carga registrada (kg)','15/10/2026;;Supino Reto com Barra;50'].join('\n');
    const lido1 = api.lerPlanilhaCSV(csv1);
    check('CSV formato 1 sem aba Formato continua importável', lido1.erros.length === 0 && lido1.modo === 'v1' && lido1.logs.length === 1 && lido1.logs[0].kind === 'peso');
    const csvRuim = csv3.replace('15/10/2026', '15/10/2026').replace(';7;158;', ';11;158;');
    check('CSV formato 3 rejeita RPE fora da faixa antes de qualquer importação', api.lerPlanilhaCSV(csvRuim).erros.some(e => /RPE inválido/.test(e.msg)));
    const csvRunTypeRuim = csv3.replace('ritmo/limiar', 'competição');
    check('CSV formato 3 rejeita runType fora da lista', api.lerPlanilhaCSV(csvRunTypeRuim).erros.some(e => /tipo de corrida inválido/.test(e.msg)));
}
