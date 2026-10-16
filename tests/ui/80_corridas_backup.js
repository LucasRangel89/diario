/* B4 — ida/volta dos campos D6 em backup JSON v6 e recusa atômica. */
{
    console.log('\n== UI 15. Backup JSON de corrida: D6 preservado e validação sem estado parcial ==');
    const logsOriginaisD6 = JSON.stringify(ev('logs'));
    const corridaD6UI = {
        id: 880001, date: '2026-10-15', kind: 'corrida', muscle: 'Cardio', exercise: 'Corrida (Rua)',
        xpTheme: 'roma', distanceKm: 5, durationMin: 24 + 37 / 60, notes: 'backup sintético',
        type: 'corrida', reps: [], runType: 'intervalado', rpe: 8, hrAvg: 162, shoe: 'Tênis JSON'
    };
    try {
        ev(`logs = [${JSON.stringify(corridaD6UI)}];`);
        const payloadD6 = JSON.parse(await ev('buildBackupPayload().then(p => JSON.stringify(p))'));
        check('backup mantém formato 6 e carrega D6 dentro do registro em logs', payloadD6.version === 6 && payloadD6.logs.length === 1 && payloadD6.logs[0].runType === 'intervalado' && payloadD6.logs[0].rpe === 8 && payloadD6.logs[0].hrAvg === 162 && payloadD6.logs[0].shoe === 'Tênis JSON');
        ev('logs = [];');
        const importouD6 = await ev(`applyImportedBackup(${JSON.stringify(payloadD6)})`);
        const restauradaD6 = JSON.parse(ev('JSON.stringify(logs[0])'));
        check('importar backup JSON v6 restaura todos os campos D6 sem coleção/chave nova', importouD6 === true && ev('logs.length') === 1 && restauradaD6.runType === 'intervalado' && restauradaD6.rpe === 8 && restauradaD6.hrAvg === 162 && restauradaD6.shoe === 'Tênis JSON');
        const estadoAntesD6Inv = ev('JSON.stringify({logs, settings, savedWorkouts, userBodyweight})');
        const invalidosD6 = [
            p => { p.logs[0].runType = 5; },
            p => { p.logs[0].runType = 'competição'; },
            p => { p.logs[0].rpe = '8'; },
            p => { p.logs[0].rpe = 11; },
            p => { p.logs[0].hrAvg = '162'; },
            p => { p.logs[0].hrAvg = 0; },
            p => { p.logs[0].shoe = 162; }
        ];
        let rejeitadosSemAlteracao = true;
        for (const corromper of invalidosD6) {
            const payloadRuim = JSON.parse(JSON.stringify(payloadD6));
            corromper(payloadRuim);
            const ok = await ev(`applyImportedBackup(${JSON.stringify(payloadRuim)})`);
            rejeitadosSemAlteracao = rejeitadosSemAlteracao && ok === false && ev('JSON.stringify({logs, settings, savedWorkouts, userBodyweight})') === estadoAntesD6Inv;
        }
        check('campo D6 presente com tipo/valor inválido rejeita o backup inteiro sem alterar estado', rejeitadosSemAlteracao);
    } catch (e) {
        check('fluxo de backup JSON D6 roda até o fim sem exceção', false, e.stack || e.message);
    } finally {
        ev(`logs = JSON.parse(${JSON.stringify(logsOriginaisD6)}); saveLogsToStorage();`);
    }
}
