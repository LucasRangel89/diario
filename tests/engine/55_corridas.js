/* Cobertura pura de js/corridas.js: somente registros sintéticos. */
{
    console.log('\n== 15. Corridas: tempo, pace, períodos ISO e recordes informativos ==');
    const runAPI = api;
    const quase = (a, b, eps = 1e-9) => Number.isFinite(a) && Math.abs(a - b) <= eps;
    check('tempo mm:ss converte para minutos decimais', quase(runAPI.parseRunDuration('24:37'), 24 + 37 / 60));
    check('tempo h:mm:ss converte para minutos decimais', quase(runAPI.parseRunDuration('1:02:03'), 62.05));
    check('minutos decimais aceitam ponto e vírgula', runAPI.parseRunDuration('24,5') === 24.5 && runAPI.parseRunDuration(24.5) === 24.5);
    check('tempo inválido: segundos fora de 0–59 são rejeitados', runAPI.parseRunDuration('12:60') === null && runAPI.parseRunDuration('1:60:00') === null);
    check('tempo inválido: formato, negativo e vazio são rejeitados', runAPI.parseRunDuration('1:2:3:4') === null && runAPI.parseRunDuration('-2') === null && runAPI.parseRunDuration('') === null);
    check('durationMin volta para h:mm:ss sem perda de segundos', runAPI.formatRunDuration(runAPI.parseRunDuration('1:02:03')) === '01:02:03');
    check('durationMin também formata corrida curta como hh:mm:ss', runAPI.formatRunDuration(runAPI.parseRunDuration('24:37')) === '00:24:37');
    check('pace em segundos/km usa a duração em minutos', quase(runAPI.paceSecondsPerKm(runAPI.parseRunDuration('24:37'), 5), 295.4));
    check('pace 5 km em 24:37 arredonda para 4:55/km', runAPI.formatRunPace(runAPI.paceSecondsPerKm(runAPI.parseRunDuration('24:37'), 5)) === '4:55/km');
    check('pace rejeita distância zero, negativa e dados inválidos', runAPI.paceSecondsPerKm(20, 0) === null && runAPI.paceSecondsPerKm(20, -1) === null && runAPI.formatRunPace(NaN) === '');
    check('predicado reconhece corrida de rua e esteira', runAPI.isRunLog({kind:'corrida',exercise:'Corrida (Rua)'}) && runAPI.isRunLog({kind:'corrida',exercise:'Corrida (Esteira)'}));
    check('predicado reconhece nome legado Esteira mesmo antes de migrateLog', runAPI.isRunLog({exercise:'Esteira',distanceKm:5}));
    check('predicado não inclui bike, elíptico, remo ou modalidades não-corrida', !runAPI.isRunLog({kind:'corrida',exercise:'Bike'}) && !runAPI.isRunLog({kind:'corrida',exercise:'Elíptico'}) && !runAPI.isRunLog({kind:'corrida',exercise:'Remo'}) && !runAPI.isRunLog({kind:'peso',exercise:'Supino'}));
    check('modalidade da aba usa só Rua/Esteira (inclusive nomes legados), nunca bike/elíptico/remo',
        typeof runAPI.runModality === 'function' &&
        runAPI.runModality({kind:'corrida',exercise:'Corrida (Rua)'}) === 'Corrida (Rua)' &&
        runAPI.runModality({kind:'corrida',exercise:'Corrida (Esteira)'}) === 'Corrida (Esteira)' &&
        runAPI.runModality({kind:'corrida',exercise:'Esteira'}) === 'Corrida (Esteira)' &&
        runAPI.runModality({exercise:'treadmill'}) === 'Corrida (Esteira)' &&
        runAPI.runModality({kind:'corrida',exercise:'running'}) === 'Corrida (Rua)' &&
        ['Bike / Ergométrico', 'Elíptico', 'Remo (Ergômetro)'].every(exercise => runAPI.runModality({kind:'corrida',exercise}) === null));
    check('virada de ano: 01/01/2021 pertence à semana ISO 2020-W53', runAPI.runISOWeekKey('2021-01-01') === '2020-W53');
    check('segunda-feira 04/01/2021 abre a semana ISO 2021-W01', runAPI.runISOWeekKey('2021-01-04') === '2021-W01');
    check('data ISO impossível não gera chave semanal', runAPI.runISOWeekKey('2021-02-30') === null);

    const syntheticRuns = [
        {id:1,kind:'corrida',exercise:'Corrida (Rua)',date:'2021-01-01',distanceKm:5,durationMin:24+37/60,shoe:'Tênis A'},
        {id:2,kind:'corrida',exercise:'Esteira',date:'2021-01-03',distanceKm:1,durationMin:6,shoe:'Tênis A'},
        {id:3,kind:'corrida',exercise:'Corrida (Rua)',date:'2021-01-04',distanceKm:2,durationMin:12,shoe:'Tênis B'},
        {id:4,kind:'corrida',exercise:'Bike',date:'2021-01-04',distanceKm:50,durationMin:90,shoe:'Bicicleta'}
    ];
    const weekSummaries = runAPI.summarizeRunsByWeek(syntheticRuns);
    check('resumo semanal ISO separa a virada de semana/ano e exclui bike', weekSummaries.length === 2 && weekSummaries[0].period === '2020-W53' && weekSummaries[0].runs === 2 && quase(weekSummaries[0].km, 6) && weekSummaries[1].period === '2021-W01' && weekSummaries[1].runs === 1);
    check('resumo semanal agrega duração, pace total ponderado e maior distância', quase(weekSummaries[0].durationMin, 30+37/60) && weekSummaries[0].pace === '5:06/km' && weekSummaries[0].longestDistanceKm === 5);
    const monthSummary = runAPI.summarizeRunsByMonth(syntheticRuns);
    check('resumo mensal entrega km, contagem, duração, pace e maior distância', monthSummary.length === 1 && monthSummary[0].period === '2021-01' && monthSummary[0].runs === 3 && quase(monthSummary[0].km, 8) && monthSummary[0].longestDistanceKm === 5 && monthSummary[0].pace === '5:20/km');
    check('resumo anual agrega os mesmos registros reconhecidos como corrida', runAPI.summarizeRunsByYear(syntheticRuns).length === 1 && runAPI.summarizeRunsByYear(syntheticRuns)[0].runs === 3);
    const records = runAPI.runRecords(syntheticRuns);
    check('recorde informativo de maior distância aponta para 5 km', records.longestDistance.distanceKm === 5 && records.longestDistance.log.id === 1);
    check('melhor pace para ≥5 km é o pace médio da corrida inteira e tem rótulo honesto', records.bestPaceByDistance[0].pace === '4:55/km' && records.bestPaceByDistance[0].log.id === 1 && records.bestPaceByDistance[0].label.includes('pace médio da corrida inteira') && records.bestPaceByDistance[0].label.includes('não é tempo oficial'));
    check('distâncias ≥10, 21,1 e 42,2 sem corrida elegível ficam sem recorde', records.bestPaceByDistance.slice(1).every(r => r.log === null && r.pace === ''));
    check('quilometragem por tênis soma só as corridas', records.shoeKm.length === 2 && records.shoeKm.find(x => x.shoe === 'Tênis A').km === 6 && records.shoeKm.find(x => x.shoe === 'Tênis B').km === 2);
    const shoeNames = runAPI.runRecords([
        {kind:'corrida',exercise:'Corrida (Rua)',date:'2026-10-15',distanceKm:3,durationMin:15,shoe:'__proto__'},
        {kind:'corrida',exercise:'Corrida (Esteira)',date:'2026-10-16',distanceKm:2,durationMin:12,shoe:'toString'}
    ]).shoeKm;
    check('tênis com nome igual a propriedade do objeto mantém km e não contamina o resumo',
        shoeNames.length === 2 && shoeNames.find(x => x.shoe === '__proto__')?.km === 3 && shoeNames.find(x => x.shoe === 'toString')?.km === 2);
    check('logs vazios produzem resumos e recordes vazios sem NaN', runAPI.summarizeRunsByWeek([]).length === 0 && runAPI.runRecords([]).longestDistance === null);
}
