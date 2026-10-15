/* ============================================================
   BUSCA, TAGS, FILTROS, SELETOR RÁPIDO E REGISTRO DIÁRIO
   ------------------------------------------------------------
   Trecho de test_ui.js, movido sem alterar a lógica dos testes.
   Avaliado pelo runner no MESMO escopo dos demais trechos (ordem do nome).
   ============================================================ */

console.log('\n== UI 3. Busca textual ==');
setInput('cat-q', 'supino');
check('busca "supino" filtra (tudo bate)', titles().length === ev("searchCatalog({ q: 'supino' }).length") && titles().length > 0 && titles().every(t => /supino/i.test(t)), titles());
setInput('cat-q', 'bench press');
check('apelido em inglês (bench press) acha supino', titles().length >= 1 && titles().every(t => /supino/i.test(t)), titles());
setInput('cat-q', 'inclinado halteres');
check('tokens em qualquer ordem', titles().includes('Supino Inclinado c/ Halteres') && titles().length === 1, titles());
setInput('cat-q', 'elevacao pelvica');
check('busca sem acento', titles().join() === 'Elevação Pélvica (Hip Thrust)', titles());
setInput('cat-q', 'zzzzz');
check('sem resultado → aviso + botão limpar', $('cat-results').textContent.includes('Nenhum exercício'));
setInput('cat-q', '');
check('limpar o texto volta ao catálogo todo', cards().length === totalEx, cards().length);

// ============================ TAGS + FILTROS ============================
console.log('\n== UI 4. Tags acumulativas e filtros ==');
const casaCount = ev(`EXERCISE_CATALOG_FULL.filter(e => e.tags.includes('casa')).length`);
click(chipIn('cat-tags', 'Em casa'));
check('tag "Em casa" filtra', cards().length === casaCount && casaCount < totalEx, [cards().length, casaCount]);
check('resultado destaca a tag ativa (mostra por que bateu)', cards().every(c => c.textContent.includes('Em casa')));
check('contador de tags ativas', $('cat-tags-active').textContent.includes('1 ativa'), $('cat-tags-active').textContent);
check('modo OU ativo por padrão', $('cat-tagmode-any').className.includes('bg-berzerker-600'));
click(chipIn('cat-tags', 'Halteres'));
const ou = cards().length;
check('OU soma (casa + halteres)', ou === ev(`EXERCISE_CATALOG_FULL.filter(e => e.tags.includes('casa') || e.tags.includes('halter')).length`), ou);
click($('cat-tagmode-all'));
const e_ = cards().length;
check('E intersecta (casa + halteres)', e_ > 0 && e_ < ou && e_ === ev(`EXERCISE_CATALOG_FULL.filter(x => x.tags.includes('casa') && x.tags.includes('halter')).length`), [e_, ou]);
check('todo resultado do modo E tem as duas tags', cards().every(c => c.textContent.includes('Em casa') && c.textContent.includes('Halteres')));
check('botão do modo E fica ativo', $('cat-tagmode-all').className.includes('bg-berzerker-600'));
click($('cat-tagmode-any'));
click(chipIn('cat-tags', 'Em casa')); click(chipIn('cat-tags', 'Halteres'));
check('desmarcar tudo volta ao catálogo todo', cards().length === totalEx, cards().length);

const nPernas = ev(`EXERCISE_CATALOG_FULL.filter(e => e.grupo === 'Pernas').length`);
setSelect('cat-grupo', 'Pernas');
check('filtro de grupo', titles().length === nPernas && nPernas > 0 && cards().every(c => c.textContent.includes('Pernas')), titles().length);
setSelect('cat-grupo', '');
const nPolia = ev(`EXERCISE_CATALOG_FULL.filter(e => e.equipamento === 'Polia').length`);
setSelect('cat-equip', 'Polia');
check('filtro de equipamento', titles().length === nPolia && nPolia > 0, titles().length);
setSelect('cat-equip', '');
setSelect('cat-tipo', 'isometria');
check('filtro de tipo de carga (isometria = pranchas)', titles().length === ev(`EXERCISE_CATALOG_FULL.filter(e => e.tipo === 'isometria').length`) && titles().every(t => /prancha/i.test(t)), titles());
setSelect('cat-tipo', '');

const usados = ev(`usageStats().usage`);
const nUsados = Object.keys(usados).filter(k => usados[k] > 0).length;
click(chipIn('cat-presets', 'Já fiz'));
check('preset "Já fiz" liga onlyUsed', ev('searchState.onlyUsed') === true && cards().length === nUsados, [cards().length, nUsados]);
click(chipIn('cat-presets', 'Já fiz'));
check('clicar de novo desliga', ev('searchState.onlyUsed') === false && cards().length === totalEx);
click(chipIn('cat-presets', 'Push'));
check('preset Push marca a tag empurrar', ev('searchState.tags.join()') === 'empurrar' && cards().every(c => c.textContent.includes('Empurrar')));
click(btnIn($('tab-content-busca'), 'Limpar filtros'));
check('Limpar filtros zera tudo', ev('searchState.tags.length') === 0 && ev('searchState.q') === '' && cards().length === totalEx);

setSelect('cat-sort', 'nome');
const sortedNames = titles().slice().sort((a, b) => a.localeCompare(b, 'pt-BR'));
check('ordenação A–Z', titles().join('|') === sortedNames.join('|'), [titles()[0], titles()[titles().length - 1]]);
setSelect('cat-sort', 'uso');
const maxUso = Math.max(...Object.values(usados));
const topNome = titles()[0];
check('ordenação por uso (mais registrado primeiro)', (usados[topNome] || 0) === maxUso, [topNome, usados[topNome], maxUso]);

// ============================ AÇÕES DO RESULTADO ============================
console.log('\n== UI 5. Ações a partir da busca ==');
setInput('cat-q', 'supino reto na maquina');
const card = cards()[0];
check('achou o cartão do supino', card && card.querySelector('h3').textContent === 'Supino Reto na Máquina', card && card.querySelector('h3').textContent);
check('cartão traz tags + faixa + descanso + uso', /Empurrar/.test(card.textContent) && /reps/.test(card.textContent) && /descanso/.test(card.textContent) && /registrado/.test(card.textContent));
// força o modo "série a série" antes: o Registrar precisa voltar pro modo simples
setSelect('mode', 'sets');
click(btnIn(card, 'Registrar'));
check('"⚡ Registrar" volta pro diário', !$('tab-content-diario').classList.contains('hidden') && $('tab-content-busca').classList.contains('hidden'));
check('preenche o exercício', $('log-exercise').value === 'Supino Reto na Máquina');
check('grupo e tipo vêm do catálogo', $('log-muscle').value === 'Peito' && $('type').value === 'carga_total');
check('modo volta para "séries iguais" (carga/reps visíveis)', $('mode').value === 'simple' && !$('simple-box').classList.contains('hidden'));
check('carga e reps da última vez', $('w').value !== '' && $('r').value !== '', [$('w').value, $('r').value]);
check('linha de tags do formulário apareceu', $('log-tags-line').textContent.includes('Empurrar'), $('log-tags-line').textContent);

navTo('busca');
setInput('cat-q', 'remada curvada');
click(btnIn(cards()[0], 'No treino'));
check('"🎯 No treino" abre o Montador e preenche o builder', !$('tab-content-montador').classList.contains('hidden') && $('wb-exercise').value === 'Remada Curvada com Barra');
check('reps alvo pela faixa do catálogo', $('wb-reps').value === '12, 12, 10', $('wb-reps').value);

navTo('busca');
setInput('cat-q', 'agachamento hack');
click(btnIn(cards()[0], 'Evolução'));
check('"📊 Evolução" leva ao gráfico do exercício', !$('tab-content-stats').classList.contains('hidden') && $('ex-chart-select').value === 'Agachamento Hack');

// ============================ SELETOR RÁPIDO (MODAL) ============================
console.log('\n== UI 6. Seletor rápido de exercício ==');
navTo('diario');
click(btnIn($('log-exercise').parentElement, '🔎'));
check('modal abre', !!$('picker-overlay'));
check('modal já abre com o que estava digitado', $('picker-q').value === 'Supino Reto na Máquina', $('picker-q').value);
setInput('picker-q', '');
check('vazio, o modal lista os 40 mais usados', pickerRows().length === 40 && /40 exercício/.test($('picker-count').textContent), $('picker-count').textContent);
check('modal tem os 25 chips de tag', $('picker-tags').querySelectorAll('button').length === 25);
setInput('picker-q', 'terra');
check('busca do modal filtra', pickerRows().length === 1 && $('picker-results').textContent.includes('Levantamento Terra'));
setInput('picker-q', '');
click(chipIn('picker-tags', 'Core'));
check('tag no modal filtra', ev('pickerState.tags.join()') === 'core' && pickerRows().length > 0 && pickerRows().length < 40);
const escolhido = $('picker-results').querySelector('button').getAttribute('data-ex');
click($('picker-results').querySelector('button'));
check('escolher fecha o modal', !$('picker-overlay'));
check('e preenche o exercício escolhido', $('log-exercise').value === escolhido, [$('log-exercise').value, escolhido]);
check('exercício escolhido é de core', ev(`exerciseTags(${JSON.stringify(escolhido)}).includes('core')`) === true);
check('tag line do formulário atualizou', $('log-tags-line').textContent.includes('Core'));
click(btnIn($('wb-exercise').parentElement, '🔎'));
check('modal também abre pelo criador de treino', !!$('picker-overlay') && $('picker-hint').textContent.includes('criador de treino'));
ev('closeExercisePicker()');
check('fecha sem deixar overlay', !$('picker-overlay'));

// ============================ HISTÓRICO ============================
console.log('\n== UI 7. Busca no histórico ==');
navTo('busca');
check('lista todos os registros', histCards().length === ev('logs.length'), histCards().length);
setInput('hist-q', 'supino');
check('texto filtra', histCards().length === ev('searchHistoryLogs().length') && histCards().length > 0 && $('hist-results').textContent.includes('Supino'), histCards().length);
check('resumo traz totais', /registro/.test($('hist-summary').textContent) && /ton/.test($('hist-summary').textContent), $('hist-summary').textContent);
setInput('hist-q', '');
const histMuscleOpts = [...$('hist-muscle').options].map(o => o.value).filter(Boolean);
check('filtro de grupo do histórico lista só valores canônicos', histMuscleOpts.length > 0 && histMuscleOpts.every(v => ev(`normalizeMuscle(${JSON.stringify(v)})`) === v) && !histMuscleOpts.includes('Glúteos'), histMuscleOpts);
setSelect('hist-muscle', 'Pernas');
check('grupo filtra', histCards().length === ev("searchHistoryLogs().length") && $('hist-results').textContent.includes('Agachamento'), histCards().length);
setSelect('hist-muscle', '');
setSelect('hist-period', '7');
check('período 7 dias respeita a data (seed é antigo → poucos registros)', histCards().length <= ev('logs.length'));
setSelect('hist-period', 'todos');
click(chipIn('cat-tags', 'Core'));
const histCore = ev('searchHistoryLogs().length');
check('tags do catálogo também filtram o histórico', histCards().length === histCore && histCards().length > 0, [histCards().length, histCore]);
click(chipIn('cat-tags', 'Core'));
check('tirar a tag traz tudo de volta', histCards().length === ev('logs.length'));
check('cartão do histórico tem editar + ver dia + tags', /Editar/.test($('hist-results').textContent) && /Ver dia/.test($('hist-results').textContent) && /Empurrar|Puxar|Agachar/.test($('hist-results').textContent));

// ============================ REGISTRO COM TAGS ============================
console.log('\n== UI 8. Registro diário com tags ==');
navTo('diario');
$('log-muscle').value = 'Peito';
$('sessao').value = '';
setInput('log-exercise', 'stiff');
check('apelido curto resolve o exercício pelo catálogo', ev("catalogInfo(document.getElementById('log-exercise').value).nome") === 'Stiff com Barra');
check('grupo é autopreenchido com destaque verde', $('log-muscle').value === 'Posterior' && $('log-muscle').className.includes('ring-2') && $('log-muscle').className.includes('ring-emerald-500/70'), [$('log-muscle').value, $('log-muscle').className]);
check('sessão vazia recebe a sugestão do histórico do grupo', $('sessao').value === 'Posterior/Acessórios', $('sessao').value);
setInput('log-exercise', 'mesa flex');
check('prefixo único de 4+ letras completa o exercício', ev("catalogInfo(document.getElementById('log-exercise').value).nome") === 'Mesa Flexora');
setInput('sessao', 'Minha sessão');
setInput('log-exercise', 'terra');
check('autofill troca o grupo junto com o apelido (terra → Costas)', $('log-muscle').value === 'Costas', $('log-muscle').value);
check('sessão digitada nunca é sobrescrita pelo autofill', $('sessao').value === 'Minha sessão', $('sessao').value);
setInput('log-exercise', 'supino inclinado c');
check('prefixo ambíguo não adivinha exercício nem grupo', ev("catalogInfo(document.getElementById('log-exercise').value)") === null && $('log-muscle').value === 'Costas');
setInput('sessao', '');
setInput('log-exercise', 'Rosca Direta com Barra');
fire($('log-exercise'), 'input');
check('digitar mostra as tags do exercício', $('log-tags-line').textContent.includes('Puxar') && $('log-tags-line').textContent.includes('Barra'), $('log-tags-line').textContent);
setInput('w', '45'); setInput('r', '12, 10, 8');
$('advanced-details').open = true;
setInput('n', 'Banco ajustado'); setInput('rir', '2'); setInput('sessao', 'Peito/Tríceps');
setSelect('t', 'Rest-Pause'); setSelect('g', '🎯 Ajustar Execução');
const antes = ev('logs.length');
fire($('workout-form'), 'submit');
check('registro adicionado', ev('logs.length') === antes + 1);
check('campos opcionais em Mais detalhes ficam registrados', ev(`logs[0].notes === 'Banco ajustado' && logs[0].rir === 2 && logs[0].technique === 'Rest-Pause' && logs[0].sessao === 'Peito/Tríceps' && logs[0].nextGoal === '🎯 Ajustar Execução'`));
check('cartão do diário mostra o exercício', $('logs-container').textContent.includes('Rosca Direta com Barra'));
check('busca passa a contar o uso', ev(`usageStats().usage['Rosca Direta com Barra']`) >= 1);

// ============================ ASSISTENTE — FASE 2 (ORDEM) ============================