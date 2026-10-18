/* ============================================================
   RECUPERAÇÃO MUSCULAR, MIGRAÇÃO DE LOG, TEMPORADAS E TEMAS
   ------------------------------------------------------------
   Trecho de test_engine.js, movido sem alterar a lógica dos testes.
   Avaliado pelo runner no MESMO escopo dos demais trechos (ordem do nome).
   ============================================================ */

console.log('\n== 10. Migração de log legado ==');
const mig = api.migrateLog({ id: 1, date: '2026-10-01', muscle: 'Abdômen', exercise: 'Prancha Isométrica', weight: 134, reps: [] });
check('prancha legada vira isometria com 134 s', mig.type === 'isometria' && mig.reps[0] === 134, mig);
const mig2 = api.migrateLog({ id: 2, date: '2026-10-01', muscle: 'Costas', exercise: 'Barra Fixa (Pull-up)', weight: 0, reps: [10] });
check('barra fixa legada vira peso_corporal', mig2.type === 'peso_corporal', mig2);
const mig3 = api.migrateLog({ id: 3, date: '2026-10-01', muscle: 'Peito', exercise: 'Supino Reto com Halteres', weight: 38, reps: [12] });
check('supino halteres legado vira halter_par', mig3.type === 'halter_par', mig3);

console.log('\n== 11. Temporadas ==');
let seasons = { start: '2026-07-01', completed: [] };
const st = api.seasonState(seasons, '2026-10-12');
check('temporada vencida expira (ciclo curto de 4 semanas)', st.finished === true, st);
const done = api.completeSeason(seasons, '2026-10-12', 5000);
check('troféu registrado e XP preservado', done.completed.length === 1 && done.completed[0].xp === 5000 && done.start === '2026-10-12');

console.log('\n== 12. Recuperação muscular ==');
const recPerna = api.recoveryState('Pernas', [{ date: api.isoWeekRange('2026-10-12')[0], exercise: 'Agachamento', sets: null, reps: [8, 8, 8] }], Date.now());
check('perna com 72 h de janela', recPerna.hoursNeed >= 72, recPerna.hoursNeed);
const recSem = api.recoveryState('Peito', [], Date.now());
check('grupo sem registro', recSem.label === 'SEM REGISTRO');

console.log('\n== 12b. Grupo "Pescoço" removido ==');
const GRUPOS_ESPERADOS = ['Peito', 'Costas', 'Pernas', 'Posterior', 'Ombros', 'Bíceps', 'Tríceps', 'Abdômen', 'Core', 'Antebraço'];
check('10 grupos musculares, sem Pescoço', api.MUSCULOS_MAPA.length === 10 && api.MUSCULOS_MAPA.join(',') === GRUPOS_ESPERADOS.join(','), api.MUSCULOS_MAPA);
check('mapa de recuperação acompanha os 10 grupos (nada de Pescoço)', !('Pescoço' in api.MUSCLE_META) && api.MUSCULOS_MAPA.every(m => api.MUSCLE_META[m] && api.MUSCLE_META[m].ordem <= 10), Object.keys(api.MUSCLE_META));
check('nenhum exercício do catálogo segue em Pescoço', !api.EXERCISE_CATALOG_FULL.some(e => e.grupo === 'Pescoço'));
check('Extensão Cervical migrou para Ombros', api.catalogInfo('Extensão Cervical').grupo === 'Ombros');
check('busca por "pescoço" ainda acha a cervical', api.searchCatalog({ q: 'pescoço' }).some(e => e.nome === 'Extensão Cervical'));
check('registro antigo em Pescoço vira Ombros na migração', api.migrateLog({ id: 1, date: '2026-10-01', muscle: 'Pescoço', exercise: 'Extensão Cervical', weight: 10, reps: [15, 10] }).muscle === 'Ombros');
check('grupo extinto é remapeado sem erro (normalizeMuscle)', api.normalizeMuscle('Pescoço') === 'Ombros' && api.normalizeMuscle('Antebraço') === 'Antebraço' && api.normalizeMuscle('Geral') === 'Geral' && api.normalizeMuscle('') === 'Geral');
const csvAntigo = [
    ['Data', 'Sessão', 'Exercício', 'Carga registrada (kg)', 'S1', 'S2', 'S3', 'S4', 'S5', 'RIR', 'Conferir?', 'Observações'],
    ['09/10/2026', 'Posterior/Acessórios', 'Extensão Cervical', '10', '15', '10', '', '', '', '', 'Não', ''],
    ['09/10/2026', 'Posterior/Acessórios', 'Treino antigo', '10', '12', '', '', '', '', '', 'Não', '']
];
const importados = api.parseSheetLogRows(csvAntigo);
check('planilha antiga importa sem Pescoço (catálogo → Ombros; resto → Geral)', importados.length === 2 && importados[0].muscle === 'Ombros' && importados[1].muscle === 'Geral', importados.map(l => l.muscle));
check('séries da semana contam a cervical em Ombros', api.weeklySetsByMuscle([{ id: 1, kind: 'peso', muscle: 'Ombros', date: '2026-10-12', exercise: 'Extensão Cervical', reps: [15, 10] }], '2026-10-14')['Ombros'] === 2);

console.log('\n== 12c. Pernas × Posterior e co-ativação ==');
const EXERCICIOS_PERNAS = ['Leg Press 45°', 'Agachamento Hack', 'Agachamento Livre', 'Cadeira Extensora', 'Afundo Búlgaro', 'Afundo c/ Halteres', 'Agachamento Sumô'];
const EXERCICIOS_POSTERIOR = ['Mesa Flexora', 'Stiff com Barra', 'Elevação Pélvica (Hip Thrust)', 'Abdutor', 'Cadeira Adutora', 'Panturrilha em Pé', 'Panturrilha Sentado', 'Swing de Kettlebell'];
check('Pernas contém todos os exercícios de quadríceps', api.EXERCISE_CATALOG_FULL.filter(e => e.grupo === 'Pernas').map(e => e.nome).join('|') === EXERCICIOS_PERNAS.join('|'), api.EXERCISE_CATALOG_FULL.filter(e => e.grupo === 'Pernas').map(e => e.nome));
check('Posterior contém todos os exercícios da cadeia posterior', api.EXERCISE_CATALOG_FULL.filter(e => e.grupo === 'Posterior').map(e => e.nome).join('|') === EXERCICIOS_POSTERIOR.join('|'), api.EXERCISE_CATALOG_FULL.filter(e => e.grupo === 'Posterior').map(e => e.nome));
check('Glúteos não é grupo do catálogo nem consta em MUSCLE_META', !api.EXERCISE_CATALOG_FULL.some(e => e.grupo === 'Glúteos') && !('Glúteos' in api.MUSCLE_META));
check('Glúteos legado migra para Posterior (migrateLog + normalizeMuscle)', api.migrateLog({ id: 100, date: '2026-10-14', muscle: 'Glúteos', exercise: 'Elevação Pélvica (Hip Thrust)', reps: [10] }).muscle === 'Posterior' && api.normalizeMuscle('Glúteos') === 'Posterior');
const agoraSinergia = new Date('2026-10-14T18:00:00').getTime();
const logRemadaSinergia = { id: 101, date: '2026-10-14', kind: 'peso', muscle: 'Costas', exercise: 'Remada Baixa na Polia', reps: [10, 10, 10] };
const logsCandidatosAntebraco = [logRemadaSinergia,
    { id: 104, date: '2026-10-14', kind: 'peso', muscle: 'Antebraço', exercise: 'Remada Baixa na Polia', reps: [10, 10, 10] },
    { id: 105, date: '2026-10-14', kind: 'corrida', muscle: 'Cardio', exercise: 'Remada Baixa na Polia', reps: [10, 10, 10] }
];
const logsDeApoioAntebraco = api.sinergiaLogs('Antebraço', logsCandidatosAntebraco);
const apoioAntebraco = api.sinergiaState('Antebraço', logsCandidatosAntebraco, agoraSinergia);
check('remada apoia antebraço: 3 séries × 0,5 = 1,5 ponderadas', logsDeApoioAntebraco.length === 1 && logsDeApoioAntebraco[0] === logRemadaSinergia && apoioAntebraco && apoioAntebraco.fator === 0.5 && apoioAntebraco.seriesBrutas === 3 && apoioAntebraco.series === 1.5 && apoioAntebraco.ultimo === 'Remada Baixa na Polia' && apoioAntebraco.ultimoEm === '2026-10-14' && apoioAntebraco.exercicios.includes('Remada Baixa na Polia'), apoioAntebraco);
const fadigaComApoio = api.fatigueState('Antebraço', [], 0, agoraSinergia, apoioAntebraco);
check('apoio reduz prontidão (63%), deixa semRegistro falso e formata decimal pt-BR', fadigaComApoio.pct === 63 && fadigaComApoio.semRegistro === false && fadigaComApoio.sinergia === apoioAntebraco && fadigaComApoio.sinergiaText === '🤝 apoio estimado em pegada (~1,5 séries ponderadas)', fadigaComApoio);
check('Peito sem regra e sem logs não cria estado de sinergia', api.sinergiaState('Peito', [], agoraSinergia) === null);
check('grupo com regra, mas sem logs indiretos, também retorna null', api.sinergiaState('Antebraço', [], agoraSinergia) === null);
const logAgachamentoSinergia = { id: 102, date: '2026-10-14', kind: 'peso', muscle: 'Pernas', exercise: 'Agachamento Livre', reps: [8, 8, 8] };
check('agachamento é apoio indireto para Core e Posterior', !!api.sinergiaState('Core', [logAgachamentoSinergia], agoraSinergia) && !!api.sinergiaState('Posterior', [logAgachamentoSinergia], agoraSinergia));
check('Pernas não recebe regra nem aviso de sinergia', !('Pernas' in api.SINERGIA) && api.sinergiaState('Pernas', [logAgachamentoSinergia], agoraSinergia) === null);
check('STABILIZER_GROUPS deriva da mesma lista SINERGIA', Object.keys(api.STABILIZER_GROUPS).join() === Object.keys(api.SINERGIA).join());

const logDiretoPernas = { id: 103, date: '2026-10-14', kind: 'peso', muscle: 'Pernas', exercise: 'Agachamento Livre', type: 'carga_total', weight: 100, reps: [10, 10, 10] };
const setsDiretosSinergia = api.weeklySetsByMuscle([logDiretoPernas], '2026-10-14');
check('weeklySetsByMuscle não credita séries de apoio a Core/Posterior', setsDiretosSinergia.Pernas === 3 && setsDiretosSinergia.Core === undefined && setsDiretosSinergia.Posterior === undefined, setsDiretosSinergia);
const gapsDiretosSinergia = api.weeklyGaps([logDiretoPernas], '2026-10-14');
check('weeklyGaps mantém zero séries de meta para Core/Posterior apoiados', gapsDiretosSinergia.find(g => g.muscle === 'Core').series === 0 && gapsDiretosSinergia.find(g => g.muscle === 'Posterior').series === 0, gapsDiretosSinergia);
const xpDiretoSinergia = api.computeXP('2026-10-14', { logs: [logDiretoPernas], bodyweight: BW, deloadWeeks: [], missionsXpTotal: 0, bosses: [{ id: 'xp-check', maxHp: 100000000, weak: 'Posterior' }] });
check('computeXP conta séries efetivas diretas, sem séries de apoio (3 × 2,5 XP)', xpDiretoSinergia.training === 8, xpDiretoSinergia);
const chefaoPosterior = { id: 'weak-check', name: 'Teste', maxHp: 100000, weak: 'Posterior' };
const danoDiretoSinergia = api.logDamageKg(logDiretoPernas, BW, chefaoPosterior, 3, 'Peito');
const progressoDiretoSinergia = api.computeBossProgress([logDiretoPernas], BW, [chefaoPosterior], { version: 2, baselineById: {}, baselineLogIds: [], assignments: {} });
check('sinergia não credita séries indiretas nem concede a fraqueza semanal', danoDiretoSinergia === 3 && progressoDiretoSinergia.totalDamage === 3 && progressoDiretoSinergia.weakHits === 0, { danoDiretoSinergia, progressoDiretoSinergia });

console.log('\n== 13. Temas (12) ==');
const themeIds = Object.keys(api.THEMES);
const expectedThemeIds = ['classico', 'zodiaco', 'hercules', 'acao', 'folclore', 'nordica', 'roma', 'rpg', 'galactica', 'aneis', 'thundercats', 'office'];
check('12 temas carregados (IDs existentes preservados, novos ao fim)', themeIds.length === 12 && expectedThemeIds.every(id => themeIds.includes(id)), themeIds);
check('curva de patentes preservada', api.XP_MIN.join(',') === '0,150,500,1100,2000,3300,5000,7500,11000,16000', api.XP_MIN);
const expectedHpCurve = Array.from({ length: 12 }, (_, i) => api.BOSS_HP_BASE + api.BOSS_HP_STEP * i);
expectedThemeIds.forEach(id => {
    const t = api.THEMES[id];
    check(`tema ${id}: exatamente 10 patentes + 12 chefões + frame`, t && t.ranks.length === 10 && t.bosses.length === 12 && !!t.frame, t && { ranks: t.ranks.length, bosses: t.bosses.length, frame: t.frame });
    check(`tema ${id}: curva suave de HP compartilhada`, t && t.bosses.map(b => b.maxHp).join(',') === expectedHpCurve.join(','), t && t.bosses.map(b => b.maxHp));
    check(`tema ${id}: fraquezas válidas e justificadas`, t && t.bosses.every(b => api.MUSCULOS_MAPA.includes(b.weak) && typeof b.weakReason === 'string' && b.weakReason.trim().length > 10), t && t.bosses.filter(b => !api.MUSCULOS_MAPA.includes(b.weak) || !b.weakReason).map(b => b.name));
});
const aneis = api.THEMES.aneis;
check('Senhor dos Anéis: do Hobbit do Condado à LENDA DA TERRA MÉDIA', aneis.ranks.map(r => r[0]).join('|') === 'Hobbit do Condado|Andarilho do Norte|Companheiro da Sociedade|Guardião de Gondor|Cavaleiro de Rohan|Caçador de Orcs|Herói do Abismo de Helm|Portador do Anel|Rei de Gondor|LENDA DA TERRA MÉDIA', aneis.ranks.map(r => r[0]));
check('Senhor dos Anéis: jornada abre nos Goblins de Moria e fecha em Sauron', aneis.bosses[0].name === 'Goblins de Moria' && aneis.bosses[11].name === 'Sauron, o Senhor do Anel' && aneis.bosses.map(b => b.name).join('|') === 'Goblins de Moria|Espectros do Anel|Balrog de Morgoth|Lurtz, o Uruk-hai|Wargs das Terras Bravias|Uruk-hai do Abismo de Helm|Saruman, o Branco|Espectros de Dunharrow|Laracna (Shelob)|Rei-Bruxo de Angmar|Gollum, o Portador Caído|Sauron, o Senhor do Anel', aneis.bosses.map(b => b.name));
check('Senhor dos Anéis: fraquezas da jornada (pernas → costas → peito → ... → antebraço)', aneis.bosses.map(b => b.weak).join('|') === 'Pernas|Costas|Peito|Antebraço|Tríceps|Ombros|Bíceps|Core|Abdômen|Pernas|Posterior|Antebraço', aneis.bosses.map(b => b.weak));
check('Senhor dos Anéis: vocabulário do tema (arena, jornadas e provas)', aneis.arena === 'Jornada até o Monte da Perdição' && aneis.bossLabel === 'DESAFIO ATIVO' && aneis.stageWord === 'JORNADA' && aneis.missionWord === 'Prova da Sociedade' && aneis.missionWordPlural === 'Provas da Sociedade' && aneis.frame === 'anel' && /Condado ao Monte da Perdição/.test(aneis.desc));
check('missões do Senhor dos Anéis usam "Prova da Sociedade"', api.missionsState([], aneis, '2026-10-14').missions[0].title.startsWith('Prova da Sociedade ·'));
check('clássico mantém quatro IDs/retratos originais', api.THEMES.classico.bosses.slice(0, 4).map(b => `${b.id}:${b.name}`).join('|') === 'boss1:Golem de Anilhas|boss2:Hydra de Titânio|boss3:Mecagorila Berzerker|boss4:Behemoth Devastador', api.THEMES.classico.bosses.slice(0, 4));
check('clássico acrescenta oito monstros de fantasia pesada com emojis', api.THEMES.classico.bosses.slice(4).length === 8 && api.THEMES.classico.bosses.slice(4).every(b => !!b.icon && /ferro|aço|forja|ogro|quimera|dragão|minotauro|titã|colosso/i.test(b.name)), api.THEMES.classico.bosses.slice(4).map(b => b.name));
check('patentes clássicas não repetem nomes de chefões', !api.THEMES.classico.ranks.some(([rank]) => api.THEMES.classico.bosses.some(b => b.name.toLowerCase() === rank.toLowerCase())));
check('Zodíaco usa Aprendiz do Dojo e Grande Mestre em 12 etapas', api.THEMES.zodiaco.ranks[0][0] === 'Aprendiz do Dojo' && api.THEMES.zodiaco.bosses.length === 12 && api.THEMES.zodiaco.bosses[11].name === 'Grande Mestre' && !JSON.stringify(api.THEMES.zodiaco).includes('Mestre Ares'));
check('Ação: patentes 1–10 seguem a escala de heróis até CHUCK NORRIS', JSON.stringify(api.THEMES.acao.ranks) === JSON.stringify([['Indiana Jones, o Explorador', '🎩'], ['007, o Agente Secreto', '🍸'], ['John McClane, o Sobrevivente', '🧨'], ['Rocky Balboa, o Lutador', '🥊'], ['Frank Dux, o Guerreiro do Kumite', '🥋'], ['Mad Max, o Guerreiro da Estrada', '🚗'], ['Rambo, a Máquina de Guerra', '🎖️'], ['John Wick, o Baba-Yaga', '🐶'], ['Neo, o Escolhido', '🕶️'], ['CHUCK NORRIS, O INVENCÍVEL', '💪']]), api.THEMES.acao.ranks);
check('Ação: doze vilões em ordem de ameaça, com os ids preservados (b0…b11)', api.THEMES.acao.bosses.map(b => `${b.id}:${b.name}`).join('|') === 'b0:O Predador|b1:O Exterminador|b2:Tubarão|b3:Hans Gruber|b4:Ivan Drago|b5:Chucky|b6:O Coringa|b7:Freddy Krueger|b8:Agent Smith|b9:Pennywise|b10:Thanos|b11:Darth Vader', api.THEMES.acao.bosses.map(b => `${b.id}:${b.name}`));
check('Ação: fraqueza de cada vilão', api.THEMES.acao.bosses.map(b => b.weak).join('|') === 'Pernas|Peito|Costas|Core|Posterior|Abdômen|Ombros|Tríceps|Bíceps|Antebraço|Peito|Antebraço', api.THEMES.acao.bosses.map(b => b.weak));
const todasFraquezas = expectedThemeIds.flatMap(id => api.THEMES[id].bosses.map(b => b.weak));
const contagemFraquezas = todasFraquezas.reduce((acc, grupo) => (acc[grupo] = (acc[grupo] || 0) + 1, acc), {});
check('144 chefões mantêm 10 fraquezas distintas (Posterior 11, Pernas 16)', todasFraquezas.length === 144 && Object.keys(contagemFraquezas).length === 10 && contagemFraquezas.Posterior === 11 && contagemFraquezas.Pernas === 16, contagemFraquezas);
const thundercats = api.THEMES.thundercats;
check('ThunderCats: de Sobrevivente de Thundera à Lenda de Thundera', thundercats.ranks.map(r => r[0]).join('|') === 'Sobrevivente de Thundera|Aprendiz da Terceira Terra|Explorador da Terceira Terra|Sentinela da Toca dos Gatos|Guerreiro de Thundera|Guardião do Código|Portador da Espada Justiceira|Protetor do Olho de Thundera|Senhor dos ThunderCats|Lenda de Thundera', thundercats.ranks.map(r => r[0]));
check('ThunderCats: chefões abrem em Jackalman e fecham no Mumm-Ra poderoso', thundercats.bosses[0].name === 'Jackalman' && thundercats.bosses[10].name === 'Mumm-Ra, forma mumificada' && thundercats.bosses[11].name === 'Mumm-Ra, forma poderosa' && thundercats.frame === 'garra', thundercats.bosses.map(b => b.name));
const office = api.THEMES.office;
check('The Office: de Recém-contratado à Lenda de Scranton (Carreira na filial)', office.ranks.map(r => r[0]).join('|') === 'Recém-contratado|Assistente Administrativo|Representante de Vendas|Vendedor do Mês|Supervisor da Filial|Assistente do Gerente Regional|Assistente Gerente Regional|Gerente Regional|Diretor do Corporativo|Lenda de Scranton', office.ranks.map(r => r[0]));
check('The Office: linguagem aprovada (Filial de Scranton / Desafio do expediente)', office.arena === 'Filial de Scranton' && office.bossLabel === 'Desafio do expediente' && office.frame === 'caderno' && office.bosses[0].name === 'Impressora em pane' && office.bosses[11].name === 'Último expediente', office.bosses.map(b => b.name));
check('Ação: heróis não repetem nome de vilão', !api.THEMES.acao.ranks.some(([rank]) => api.THEMES.acao.bosses.some(b => b.name.toLowerCase() === rank.toLowerCase())));
check('Roma vai de Escravo da Arena a IMPERADOR DE ROMA e deixa o Imperador antes do final', api.THEMES.roma.ranks[0][0] === 'Escravo da Arena' && api.THEMES.roma.ranks[9][0] === 'IMPERADOR DE ROMA' && api.THEMES.roma.bosses[10].name.includes('Imperador') && api.THEMES.roma.bosses[11].name === 'Máximo, o Gladiador');
check('patentes romanas não repetem nomes exatos de chefões', !api.THEMES.roma.ranks.some(([rank]) => api.THEMES.roma.bosses.some(b => b.name.toLowerCase() === rank.toLowerCase())));
check('Nórdica abre com criaturas menores', api.THEMES.nordica.bosses.slice(0, 4).map(b => b.name).join('|') === 'Draugr|Troll Jovem de Gelo|Nøkk do Fiorde|Huldra da Floresta');
check('Nórdica termina com Ymir perto do fim e Ragnarök por último', api.THEMES.nordica.ranks[9][0] === 'ODIN, O PAI DE TODOS' && api.THEMES.nordica.bosses[10].name.includes('Ymir') && api.THEMES.nordica.bosses[11].name === 'Ragnarök');
check('Galáctica: General antes do Marechal (marechal é patente maior)', api.THEMES.galactica.ranks[5][0] === 'Almirante de Frota' && api.THEMES.galactica.ranks[6][0] === 'General Galáctico' && api.THEMES.galactica.ranks[7][0] === 'Marechal Estelar' && !JSON.stringify(api.THEMES.galactica).includes('Guardião do Setor'));
check('clássico retoma a escalada de animais nas patentes 8 e 9', api.THEMES.classico.ranks[7][0] === 'Kraken dos Abismos' && api.THEMES.classico.ranks[7][1] === '🐙' && api.THEMES.classico.ranks[8][0] === 'Fênix Imortal' && api.THEMES.classico.ranks[8][1] === '🔥' && !JSON.stringify(api.THEMES.classico).includes('Mestre da Fundição') && !JSON.stringify(api.THEMES.classico).includes('Lenda das Cargas'));
check('Roma chama o chefe 6 de Bestiário', api.THEMES.roma.bosses[5].name === 'Bestiário & Pantera' && !api.THEMES.roma.bosses[5].name.includes('Bestiarius'), api.THEMES.roma.bosses[5].name);
check('Hércules usa "Hércules" nas descrições (nada de Héracles)', !JSON.stringify(api.THEMES.hercules).includes('Héracles') && /Hércules/.test(JSON.stringify(api.THEMES.hercules)));
