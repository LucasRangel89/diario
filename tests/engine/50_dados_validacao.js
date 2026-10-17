/* ============================================================
   VALIDAÇÃO DE DADOS: DATAS, PR NA IMPORTAÇÃO E DATA FUTURA
   ------------------------------------------------------------
   Trecho de test_engine.js, movido sem alterar a lógica dos testes.
   Avaliado pelo runner no MESMO escopo dos demais trechos (ordem do nome).
   ============================================================ */

console.log('\n== 32. Validação de data unificada (js/datas.js) ==');
const CASOS_DATA = [
    ['2026-10-15', true], ['2026-02-31', false], ['2026-13-01', false], ['2026-00-10', false],
    ['2028-02-29', true], ['2027-02-29', false], ['2026-04-31', false], ['2026-01-01', true],
    ['2026-12-31', true], ['9999-12-31', true], ['0100-01-01', true], ['0000-01-01', false],
    ['2026-10-5', false], ['26-10-15', false], ['2026/10/15', false], ['2026-10-15T10:00:00', false],
    ['2026-10-15 ', false], ['', false], [' ', false], [null, false], [undefined, false],
    [0, false], [123, false], [{}, false], [[], false], [['2026-10-15'], false], [true, false], [NaN, false]
];
const divergentesData = CASOS_DATA.filter(([v]) => api.isoDataValida(v) !== api.dataDeRegistroValida({ date: v }));
check('isoDataValida e dataDeRegistroValida concordam nos 28 casos sintéticos', divergentesData.length === 0, divergentesData.map(([v]) => v));
const esperadoErrado = CASOS_DATA.filter(([v, esperado]) => api.isoDataValida(v) !== esperado);
check('a tabela de datas válidas/inválidas é respeitada (bissexto, 31/02, 13/01, vazios, com hora)', esperadoErrado.length === 0, esperadoErrado.map(([v]) => v));
check('registro sem data válida é reprovado (dataDeRegistroValida é a regra única aplicada ao registro)',
    api.dataDeRegistroValida(null) === false && api.dataDeRegistroValida({}) === false &&
    api.dataDeRegistroValida({ date: 20261015 }) === false && api.dataDeRegistroValida({ date: '2026-10-15' }) === true);
check('dataISOValida (números) concorda com isoDataValida (string) para os mesmos casos',
    CASOS_DATA.every(([v]) => {
        if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return true;
        const [y, m, d] = v.split('-').map(Number);
        return api.dataISOValida(y, m, d) === api.isoDataValida(v);
    }));
// Uma única definição no repositório: nenhum arquivo de js/ pode redeclarar a regra.
const definicoesData = fs.readdirSync('js').filter(f => f.endsWith('.js')).map(f => 'js/' + f).filter(f => {
    const src = fs.readFileSync(f, 'utf8');
    return /function\s+isoDataValida\s*\(|function\s+dataDeRegistroValida\s*\(|function\s+dataISOValida\s*\(/.test(src);
});
check('a regra de data existe em um único arquivo (sem duplicatas)', definicoesData.length === 1 && definicoesData[0] === 'js/datas.js', definicoesData);
const historicoSrc = fs.readFileSync('js/historico.js', 'utf8');
const corpoParseCSV = historicoSrc.slice(historicoSrc.indexOf('function parseDataCSV'), historicoSrc.indexOf('function csvLogId'));
check('parseDataCSV (importação de CSV) usa a mesma conferência de calendário, sem cálculo próprio',
    /dataISOValida\s*\(/.test(corpoParseCSV) && !/new Date\(Date\.UTC/.test(corpoParseCSV));
check('CSV: 29/02/2028 (bissexto) entra e 29/02/2027 não', api.parseDataCSV('29/02/2028') === '2028-02-29' && api.parseDataCSV('29/02/2027') === null);
check('CSV e backup concordam sobre 31/02', api.parseDataCSV('31/02/2026') === null && api.isoDataValida('2026-02-31') === false);

// ============================================================
// 33. isPR na importação: coluna INFORMATIVA (não decide PR, XP nem gamificação)
// O PR multiplica o dano no chefão por 2, soma XP_PR e cumpre missão semanal.
// Se um arquivo pudesse dizer "PR = Sim", importar daria XP e gamificação de
// graça. Por isso a importação nunca usa o valor do arquivo: o PR continua sendo
// decidido pelo app (detectAutoPR ao registrar) ou pelo flag manual do formulário.
// ============================================================
console.log('\n== 33. isPR na importação: coluna informativa ==');
const csvComPR = [
    '--- Sheet: Log ---',
    'Data;Sessão;Exercício;Carga registrada (kg);S1;S2;S3;S4;S5;RIR;Conferir?;Observações;Unidade;Fator;Lados;Carga efetiva (kg);Total reps (ou segundos);Volume (kg);Melhor série;Menor série;1RM Epley (kg);Métrica de progresso;ID do registro;Tipo de exercício;Grupo do registro;Técnica;Meta da próxima sessão;Séries (JSON);PR (informativo)',
    '02/10/2026;Peito;Supino Reto com Barra;100;10;8;8;;;;2;Não;;;;;;;100;8;116.7;100;L1001;carga_total;Peito;Convencional;;{"modo":"simples","series":[{"weight":100,"reps":10},{"weight":100,"reps":8},{"weight":100,"reps":8}]};Sim',
    '03/10/2026;Peito;Supino Reto com Barra;90;10;;;;;;2;Não;;;;;;;90;10;105;90;L1002;carga_total;Peito;Convencional;;{"modo":"simples","series":[{"weight":90,"reps":10}]};Não'
].join('\n');
const lidoPR = api.lerPlanilhaCSV(csvComPR);
check('CSV com a coluna PR (informativo) é lido sem erro', lidoPR.erros.length === 0 && lidoPR.logs.length === 2, lidoPR.erros);
check('PR=Sim no arquivo NÃO promove o registro a PR (isPR continua false nos dois)',
    lidoPR.logs.every(l => l.isPR === false), lidoPR.logs.map(l => l.isPR));
const xpImportado = api.computeXP('2026-10-02', { logs: lidoPR.logs, bodyweight: 80, deloadWeeks: [], missionsXpTotal: 0, bosses: [] });
const xpSemPRFalso = api.computeXP('2026-10-02', { logs: lidoPR.logs.map(l => ({ ...l, isPR: false })), bodyweight: 80, deloadWeeks: [], missionsXpTotal: 0, bosses: [] });
check('XP da importação não muda por causa da coluna PR (nem ganha XP_PR)', xpImportado.xp === xpSemPRFalso.xp && xpImportado.prXP === 0, { xp: xpImportado.xp, prXP: xpImportado.prXP });
const historicoPR = ['2026-09-28', '2026-09-29', '2026-09-30'].map((date, i) => ({ id: `H${i}`, date, kind: 'peso', exercise: 'Supino Reto com Barra', type: 'carga_total', weight: 80, reps: [10], conferir: false, isPR: false }));
const candidatesPR = [{ ...lidoPR.logs[0], id: 'import-A', isPR: true }, { ...lidoPR.logs[1], id: 'import-B', isPR: true }];
const xpComPRReal = api.computeXP('2026-10-03', { logs: [...historicoPR, ...candidatesPR], bodyweight: 80, deloadWeeks: [], missionsXpTotal: 0, bosses: [] });
check('PR histórico só pontua com três sessões prévias e no máximo um crítico na semana', xpComPRReal.prXP === api.XP_PR && xpComPRReal.xp >= xpImportado.xp, { prXP: xpComPRReal.prXP, XP_PR: api.XP_PR });
// exportar → reimportar: o PR que o app já conhece não se perde e não se inventa
const logComPR = { id: 4242, date: '2026-10-02', kind: 'peso', muscle: 'Peito', sessao: 'Peito', exercise: 'Supino Reto com Barra', type: 'carga_total', weight: 100, reps: [10, 8, 8], technique: 'Convencional', nextGoal: '', isPR: true, rir: 2, conferir: false, notes: '', xpTheme: 'classico' };
api.setLogs([logComPR]);
const csvExportado = api.buildPlanilhaCSV();
const linhaExportada = csvExportado.split('\n').find(ln => ln.startsWith('02/10/2026'));
check('exportação marca Sim na coluna PR (informativo) para um registro que é PR no app',
    /;Sim$/.test(linhaExportada), linhaExportada && linhaExportada.slice(-40));
const relido = api.lerPlanilhaCSV(csvExportado);
const planoRe = api.planejarImportacaoLogs(relido.logs, api.logsArr);
check('reimportar o próprio arquivo não duplica (o registro já existe pelo ID)', planoRe.iguais === 1 && planoRe.novos.length === 0, { iguais: planoRe.iguais, novos: planoRe.novos.length });
check('o PR que o app já tinha continua marcado (a importação não apaga nem inventa PR)', api.logsArr[0].isPR === true);
check('a coluna PR não entra na identidade do registro (mesmo conteúdo = mesmo registro, com ou sem PR)',
    api.csvLogFingerprint({ ...logComPR, isPR: false }) === api.csvLogFingerprint({ ...logComPR, isPR: true }));

// ============================================================
// 34. Mapa de recuperação: data futura conta como hoje (decisão de produto)
// O cálculo usa Math.max(0, agora − data do registro): uma data futura tem
// "tempo desde o último treino" zero, igual a um registro de hoje. É deliberado
// e documentado (index.html + docs/RECUPERACAO.md) — a estimativa nunca antecipa
// a janela de recuperação por causa de uma data digitada errada.
// ============================================================
console.log('\n== 34. Recuperação: data futura conta como hoje ==');
const agoraRec = new Date('2026-10-15T12:00:00').getTime();
const logHoje = { id: 1, date: '2026-10-15', kind: 'peso', muscle: 'Pernas', exercise: 'Agachamento Livre', reps: [8, 8, 8] };
const logFuturo = { id: 2, date: '2027-03-01', kind: 'peso', muscle: 'Pernas', exercise: 'Agachamento Livre', reps: [8, 8, 8] };
const recHoje = api.recoveryState('Pernas', [logHoje], agoraRec);
const recFuturo = api.recoveryState('Pernas', [logFuturo], agoraRec);
check('data futura produz exatamente o mesmo estado que hoje', JSON.stringify(recHoje) === JSON.stringify(recFuturo), { hoje: recHoje.pct, futuro: recFuturo.pct });
check('data futura NÃO antecipa a janela (segue FADIGA ALTA, prontidão mínima)', recFuturo.pct === 2 && recFuturo.label === 'FADIGA ALTA', recFuturo);
const fatFuturo = api.fatigueState('Pernas', [logFuturo], 0, agoraRec, null);
const fatHoje = api.fatigueState('Pernas', [logHoje], 0, agoraRec, null);
check('fatigueState (o que a UI mostra) também não muda com data futura', fatFuturo.pct === fatHoje.pct && fatFuturo.label === fatHoje.label, { futuro: fatFuturo.pct, hoje: fatHoje.pct });
check('ataque de data absurda não gera NaN/Infinity (app continua utilizável)',
    Number.isFinite(recFuturo.pct) && Number.isFinite(fatFuturo.pct) && recFuturo.pct >= 0 && recFuturo.pct <= 100);
// documentação amarrada ao comportamento
const docRec = fs.existsSync('docs/RECUPERACAO.md') ? fs.readFileSync('docs/RECUPERACAO.md', 'utf8') : '';
check('docs/RECUPERACAO.md explica que data futura conta como hoje', /data futura/i.test(docRec) && /hoje/i.test(docRec));
check('index.html explica o mesmo para o usuário no mapa', /data futura/i.test(fs.readFileSync('index.html', 'utf8')));