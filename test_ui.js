/* ============================================================
   SMOKE TEST DE UI — sobe o app inteiro num DOM falso (jsdom)
   ------------------------------------------------------------
   Roda com: npm run test:ui  (precisa de `npm install` uma vez).
   Garante: boot sem erro, navegação, aba 🔎 Buscar (tags acumulativas,
   filtros, presets, ordenação), seletor rápido (modal), busca no histórico,
   registro com tags — testes adaptados da PR #2 — e o Assistente de Treinos
   (Fase 2: ordem sugerida · Fase 3: fadiga real + próximo treino + montador).
   ============================================================ */
let JSDOM, VirtualConsole;
try { ({ JSDOM, VirtualConsole } = require('jsdom')); } catch (e) {
    console.log('\n⚠️  jsdom não instalado — rode `npm install` para o smoke test de UI.');
    process.exit(0);
}
const fs = require('fs');
const vm = require('vm');

// ---------- console virtual: erro não capturado vira falha ----------
const jsErrors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', e => jsErrors.push(String(e.message || e)));
virtualConsole.on('error', (...a) => jsErrors.push(a.join(' ')));

let html = fs.readFileSync('index.html', 'utf8');
// remove scripts externos (fontes/tailwind CDN não existem aqui)
html = html.replace(/<script src="https:\/\/[^"]+"><\/script>/g, '');
const dom = new JSDOM(html, {
    runScripts: 'dangerously',        // necessário para os onclick="" inline
    pretendToBeVisual: true,
    url: 'http://localhost/',
    virtualConsole
});
const { window } = dom;
const document = window.document;
const ctx = dom.getInternalVMContext();

// ---------- stubs de browser ----------
// Canvas sem implementação real: objeto "auto-semelhante" que aceita qualquer
// chamada/propriedade (o Story Card desenha à vontade sem quebrar).
const makeCtx = () => new Proxy(function () { }, {
    get: (t, k) => (k === 'canvas' ? { width: 1080, height: 1920 } : makeCtx()),
    set: () => true,
    apply: () => makeCtx()
});
window.HTMLCanvasElement.prototype.getContext = () => makeCtx();
window.Chart = class { constructor() { return { destroy() { }, resize() { }, update() { } }; } };
window.Element.prototype.scrollIntoView = function () { };
window.scrollTo = () => { };
window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() { }, removeListener() { } }));
window.alert = () => { };
Object.defineProperty(window.navigator, 'vibrate', { value: () => true, configurable: true });
Object.defineProperty(window.navigator, 'serviceWorker', { value: { register: () => Promise.resolve() }, configurable: true });
Object.defineProperty(window.navigator, 'storage', { value: { persist: () => Promise.resolve() }, configurable: true });

// ---------- carrega os módulos na ordem do index.html ----------
// vm.runInContext mantém o escopo léxico global entre scripts (como no navegador),
// então os `const`/`let` de catalogo.js continuam visíveis para app.js.
['js/catalogo.js', 'js/gamificacao.js', 'js/assistente.js', 'js/planilha_data.js', 'js/historico.js', 'js/busca.js', 'js/app.js']
    .forEach(f => vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f }));

// ---------- helpers ----------
let failures = 0;
function check(name, cond, extra) {
    if (cond) console.log('  ✔', name);
    else { failures++; console.log('  ✘', name, extra !== undefined ? JSON.stringify(extra) : ''); }
}
const ev = expr => vm.runInContext(expr, ctx);
const $ = id => document.getElementById(id);
const fire = (el, type) => el && el.dispatchEvent(new window.Event(type, { bubbles: true, cancelable: true }));
const click = el => { if (!el) throw new Error('elemento não encontrado para clique'); return el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })); };
const setInput = (id, value) => { const el = $(id); el.value = value; fire(el, 'input'); };
const setSelect = (id, value) => { const el = $(id); el.value = value; fire(el, 'change'); };
const chipIn = (containerId, label) => [...$(containerId).querySelectorAll('button')].find(b => b.textContent.includes(label));
const btnIn = (el, label) => [...el.querySelectorAll('button')].find(b => b.textContent.includes(label));
const cards = () => [...$('cat-results').children].filter(c => c.dataset.ex);   // ignora o "vazio"
const titles = () => cards().map(c => (c.querySelector('h3') || {}).textContent || '');
const histCards = () => [...$('hist-results').querySelectorAll('[data-log-id]')];
const pickerRows = () => [...$('picker-results').querySelectorAll('button[data-ex]')];
const navGroupFor = tab => ({ diario: 'treino', montador: 'treino', historico: 'treino', busca: 'treino', boss: 'jogo', story: 'jogo', stats: 'voce', calcs: 'voce', config: 'config' })[tab];
function navTo(tab) {
    const group = navGroupFor(tab);
    if (group) click($(`nav-group-${group}`));
    const button = $(`nav-${tab}`);
    if (button) click(button);
    else if (tab === 'config') ev("switchTab('config')");
    else throw new Error(`navegação não encontrada para ${tab}`);
}

// ============================ BOOT ============================
console.log('\n== UI 1. Boot ==');
let bootOk = true, bootErr = '';
try { window.onload(); } catch (e) { bootOk = false; bootErr = e.message; }
check('window.onload() roda sem erro', bootOk, bootErr);
check('data de hoje no formulário', $('log-date').value === ev('getTodayLocalISO()'));
check('aba Buscar aparece no grupo Treino', !!$('tab-content-busca') && !!$('nav-busca') && !$('nav-subnav').classList.contains('hidden'));
check('navegação tem exatamente quatro grupos, sem trilho horizontal', ['treino', 'jogo', 'voce', 'config'].every(g => !!$(`nav-group-${g}`)) && $('nav-groups').children.length === 4 && !$('group-navigation').className.includes('overflow-x-auto'));
check('cabeçalho compacto contém título, tema, data e XP', !!$('header-theme-button') && !!$('header-today-date') && !!$('header-xp-display') && document.querySelector('header').querySelectorAll('h1').length === 1);
check('data curta e XP atualizados no cabeçalho', /^\d{2}\/\d{2}$/.test($('header-today-date').textContent) && $('header-xp-display').textContent.endsWith(' XP'));
check('Perfil Global soma o XP dos nove temas', !!$('global-profile-xp') && $('global-profile-xp').textContent === `${ev('fmtN(getGlobalXPTotal())')} XP`);
navTo('boss');
check('grupo Jogo preserva Boss e Story Card', !$('tab-content-boss').classList.contains('hidden') && !!$('nav-boss') && !!$('nav-story'));
navTo('story');
check('Story Card abre pelo grupo Jogo', !$('tab-content-story').classList.contains('hidden'));
navTo('stats');
check('grupo Você preserva Stats e Calcs', !$('tab-content-stats').classList.contains('hidden') && !!$('nav-stats') && !!$('nav-calcs'));
navTo('calcs');
check('Calcs abre pelo grupo Você', !$('tab-content-calcs').classList.contains('hidden'));
navTo('config');
check('Config continua acessível como quarto grupo', !$('tab-content-config').classList.contains('hidden') && $('nav-subnav').classList.contains('hidden'));
navTo('diario');
check('Meus treinos tem tela e navegação próprias', !!$('tab-content-montador') && !!$('nav-montador') && $('nav-montador').textContent.includes('Meus treinos'));
check('registro rápido aparece antes dos painéis longos', $('tab-content-diario').firstElementChild.id === 'form-card-container');
check('detalhes do registro começam recolhidos, sem perder campos', !!$('advanced-details') && !$('advanced-details').open && !!$('mode') && !!$('sets-box') && !!$('t') && !!$('n') && !!$('warmup-quick-box'));
check('cardio compacto começa recolhido e conserva formulário', !!$('cardio-details') && !$('cardio-details').open && !!$('cardio-distance') && !!$('cardio-duration') && !!$('cardio-notes'));
setSelect('mode', 'sets');
check('selecionar série a série abre os detalhes e mostra as linhas', $('advanced-details').open && !$('sets-box').classList.contains('hidden') && $('simple-box').classList.contains('hidden'));
setSelect('mode', 'simple');
$('advanced-details').open = false;
check('voltar ao modo simples restaura carga/reps rápidos', !$('simple-box').classList.contains('hidden'));
check('seed carregou registros', ev('logs.length') > 0, ev('logs.length'));
check('seed real: 44 logs + 5 sessões salvas', ev('logs.length') === 44 && ev('savedWorkouts.length') === 5);
check('seletor antigo de tema foi removido de Config', !$('game-theme-select') && !$('game-theme-desc'));
check('Story Card remove paletas antigas', !$('btn-theme-berzerker') && !$('btn-theme-cyberpunk') && !$('btn-theme-minimal') && !/Cyberpunk|Minimalist|Berzerker Red/.test($('tab-content-story').textContent));
check('Story Card preserva upload e controle de escurecimento', !!$('bg-image-input') && !!$('bg-overlay-opacity') && $('bg-overlay-opacity').type === 'range');
check('paleta, moldura e fontes estão vinculadas aos nove temas', ev("Object.keys(THEMES).length === 9 && Object.keys(THEMES).every(id => STORY_CARD_STYLES[id] && STORY_CARD_STYLES[id].palette && STORY_CARD_STYLES[id].fonts)") && /THEME\.frame/.test(fs.readFileSync('js/app.js', 'utf8')));
let legacyStoryStyleIgnored = true;
try { ev("safeStorage.set(STORAGE_KEY_STORY, JSON.stringify({ selectedStoryTheme: 'cyberpunk' })); loadStoredData(); generateStoryCard();"); } catch (e) { legacyStoryStyleIgnored = false; }
check('estilo legado salvo é ignorado sem erro', legacyStoryStyleIgnored);
check('Story Card mostra o tema de jogo atual', $('story-theme-name').textContent === ev('THEME.name') && $('story-theme-icon').textContent === '🦍');
click($('header-theme-button'));
check('botão do tema abre nove cartões com ícone, patente e progresso', !!$('theme-gallery-overlay') && $('theme-gallery-overlay').querySelectorAll('[data-theme-id]').length === 9 && $('theme-gallery-overlay').textContent.includes('Patente atual') && $('theme-gallery-overlay').textContent.includes('chefões'));
click($('theme-gallery-overlay').querySelector('[data-theme-id="roma"]'));
check('troca pede confirmação pelo nome Roma Antiga', !!$('confirm-modal-overlay') && $('confirm-modal-overlay').textContent.includes('Trocar para Roma Antiga?') && ev("THEME.id === 'classico'"));
click($('confirm-modal-no'));
check('cancelar mantém o tema atual', ev("THEME.id === 'classico'") && !$('confirm-modal-overlay'));
click($('header-theme-button'));
click($('theme-gallery-overlay').querySelector('[data-theme-id="roma"]'));
click($('confirm-modal-yes'));
check('confirmar troca atualiza tema, ícone e Story Card', ev("THEME.id === 'roma'") && $('header-theme-icon').textContent === '🏛️' && $('story-theme-name').textContent === ev('THEME.name'));
ev("changeGameTheme('classico');");
check('histórico renderizado', !!$('history-content'));
check('CSV multi-aba com 22 colunas no Log', ev('buildPlanilhaCSV()').split(/--- Sheet: Log ---/)[1].split('\n')[1].split(';').length === 22);
check('molduras temáticas (runas/espacial) no código', /frame === 'runas'/.test(fs.readFileSync('js/app.js', 'utf8')) && /frame === 'espacial'/.test(fs.readFileSync('js/app.js', 'utf8')));

// vistas do histórico
try {
    ev("switchHistoryView('progresso')"); ev("switchHistoryView('semanas')");
    ev("switchHistoryView('peso')"); ev("switchHistoryView('log')");
    check('4 vistas do histórico alternam sem erro', true);
} catch (e) { failures++; console.log('  ✘ vistas do histórico:', e.message); }

// ============================ NAVEGAÇÃO ============================
console.log('\n== UI 2. Navegação ==');
navTo('busca');
check('clique em 🔎 Buscar abre a aba', !$('tab-content-busca').classList.contains('hidden'));
check('e esconde o diário', $('tab-content-diario').classList.contains('hidden'));
check('botão ativo destacado', $('nav-busca').className.includes('bg-berzerker-600'));
navTo('montador');
check('Montador abre em tela própria e esconde Hoje', !$('tab-content-montador').classList.contains('hidden') && $('tab-content-diario').classList.contains('hidden'));
check('botão Montador fica destacado', $('nav-montador').className.includes('bg-berzerker-600'));
navTo('busca');
const totalEx = ev('EXERCISE_CATALOG_FULL.length');
check('catálogo inteiro listado', cards().length === totalEx, cards().length);
check('contador de resultados dinâmico', $('cat-count').textContent === `${totalEx} de ${totalEx} exercícios`, $('cat-count').textContent);
check('selects de filtro populados', $('cat-grupo').options.length > 5 && $('cat-equip').options.length > 3 && $('cat-tipo').options.length > 3);
check('25 chips de tag, agrupados por categoria', $('cat-tags').querySelectorAll('button').length === 25, $('cat-tags').querySelectorAll('button').length);
check('atalhos (presets) renderizados', $('cat-presets').querySelectorAll('button').length === ev('SEARCH_PRESETS.length'), $('cat-presets').querySelectorAll('button').length);
check('histórico renderizado na mesma aba', histCards().length === ev('logs.length'), histCards().length);

// ============================ BUSCA TEXTUAL ============================
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
console.log('\n== UI 9. Assistente: ordem sugerida (Fase 2) ==');
ev(`window.__orderLogsBackup = logs;
logs = [{ id: -99, kind: 'peso', muscle: 'Pernas', date: getTodayLocalISO(), exercise: 'Leg Press 45°', reps: Array(10).fill(10) }];
draftExercises = [
    { muscle: 'Pernas', exercise: 'Leg Press 45°', weight: 100, repsText: '10, 10', technique: 'Convencional', type: 'carga_total' },
    { muscle: 'Bíceps', exercise: 'Rosca Martelo', weight: 8, repsText: '10, 10', technique: 'Convencional', type: 'halter_par' },
    { muscle: 'Costas', exercise: 'Remada Curvada com Barra', weight: 30, repsText: '10, 10', technique: 'Convencional', type: 'carga_total' },
    { muscle: 'Peito', exercise: 'Supino Reto na Máquina', weight: 60, repsText: '8, 8', technique: 'Convencional', type: 'carga_total' },
    { muscle: 'Ombros', exercise: 'Manguito Rotador', weight: 20, repsText: '15, 15', technique: 'Convencional', type: 'carga_total' }
]; renderDraftList();`);
check('rascunho montado com 5 exercícios', $('draft-count').textContent === '5', $('draft-count').textContent);
check('botão "Ordenar com o assistente" existe no Montador', !!btnIn($('tab-content-montador'), 'Ordenar com o assistente'));
click(btnIn($('tab-content-montador'), 'Ordenar com o assistente'));
check('ordem aplicada: manguito (ativação) primeiro', ev('draftExercises[0].exercise') === 'Manguito Rotador', ev('draftExercises.map(e => e.exercise)'));
check('composto (remada) antes do isolador (rosca)', ev("draftExercises.findIndex(e => e.exercise === 'Remada Curvada com Barra')") < ev("draftExercises.findIndex(e => e.exercise === 'Rosca Martelo')"));
check('entre compostos, o grupo mais pronto e abaixo da meta sobe', ev("draftExercises.findIndex(e => e.exercise === 'Supino Reto na Máquina')") < ev("draftExercises.findIndex(e => e.exercise === 'Leg Press 45°')"), ev('draftExercises.map(e => e.exercise)'));
check('ajuste semanal explica o motivo da posição', /prontidão|séries/.test(ev("draftExercises.find(e => e.exercise === 'Supino Reto na Máquina').orderReason")));
check('cada item do rascunho mostra o porquê (📌)', $('draft-exercises-list').innerHTML.split('📌').length - 1 >= 5);
check('descrição do porquê em linguagem simples', /Ativação|Composto|Isolador|apoio|Core/i.test($('draft-exercises-list').textContent));
ev('logs = window.__orderLogsBackup; delete window.__orderLogsBackup; renderRecoveryMap(); renderDaySuggestion(); renderWeekGaps();');
const antesOrdem = ev('draftExercises.map(e => e.exercise).join()');
ev('moveDraftExercise(0, 1)');
check('▲▼ continua funcionando (liberdade total)', ev('draftExercises.map(e => e.exercise).join()') !== antesOrdem);

// ============================ ASSISTENTE — FASE 3 ============================
console.log('\n== UI 10. Assistente: fadiga real + próximo treino (Fase 3) ==');
check('mapa de fadiga mostra prontidão real', $('recovery-status-grid').textContent.includes('Prontidão real'));
check('mapa traz séries da semana × faixa 10–20', /séries/.test($('recovery-status-grid').textContent) && /abaixo da meta|na faixa|acima da faixa/.test($('recovery-status-grid').textContent));
check('painel do montador: o que falta na semana', $('builder-week-gaps').textContent.includes('Estímulo da semana') && /séries/.test($('builder-week-gaps').textContent), $('builder-week-gaps').textContent.slice(0, 120));
check('sugestão do dia em linguagem simples', $('suggestion-content').textContent.includes('Próximo treino recomendado') && $('suggestion-content').textContent.includes('Por quê:'));
check('sugestão explica recuperação e/ou meta semanal', /descansad|séries|faltam|recuper/i.test($('suggestion-content').textContent));

const sugBtn = btnIn($('suggestion-content'), 'Treinar esta sugestão');
click(sugBtn);
check('▶ treinar sugestão abre a sessão', !$('active-session-card').classList.contains('hidden'));
check('sessão abre na ordem sugerida (✨)', $('session-exercises-list').textContent.includes('Ordem sugerida aplicada'));
check('cada exercício da sessão explica a posição (📌)', ($('session-exercises-list').innerHTML.match(/📌/g) || []).length >= 2);
check('sessão mostra descanso do catálogo', /Descanso do catálogo/.test($('session-exercises-list').textContent));
check('setas ▲▼ de reordenação na sessão', !!btnIn($('session-exercises-list'), '▲') && !!btnIn($('session-exercises-list'), '▼'));
check('banner de próximo treino escondido (sessão aberta)', $('session-next-hint').classList.contains('hidden'));
const exAntes = ev('activeSession.exercises[0].exercise');
ev('moveSessionUnit(0, 1)');
check('trocar ordem na sessão funciona (bloco anda)', ev('activeSession.exercises[0].exercise') !== exAntes, [exAntes, ev('activeSession.exercises[0].exercise')]);
ev('activeSession.exercises.forEach(e => e.done = true); renderSession();');
check('sessão completa → sugestão do próximo treino', !$('session-next-hint').classList.contains('hidden') && $('session-next-hint').textContent.includes('Próximo treino sugerido'), $('session-next-hint').textContent.slice(0, 120));
check('banner traz o porquê em linguagem simples', /Por quê:/.test($('session-next-hint').textContent));
ev('endSession()');
check('finalizar sessão recolhe o card e atualiza a sugestão', $('active-session-card').classList.contains('hidden') && $('suggestion-content').textContent.includes('Próximo treino recomendado'));
navTo('montador');
click(btnIn($('saved-workouts-list'), 'Iniciar'));
check('iniciar um treino salvo no Montador leva à sessão em Hoje', !$('tab-content-diario').classList.contains('hidden') && $('active-session-card').textContent.includes('Treino em Andamento'));

// ============================ SAVES POR TEMA + MIGRAÇÃO ============================
console.log('\n== UI 11. Saves por tema e migração ==');
const storedBeforeMigrationTest = {};
for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    storedBeforeMigrationTest[key] = window.localStorage.getItem(key);
}
window.localStorage.clear();
window.localStorage.setItem('berzerker_game_theme_v1', 'roma');
window.localStorage.setItem('berzerker_diario_cargas_logs_v2', JSON.stringify([
    { id: 91, date: '2026-10-01', kind: 'peso', muscle: 'Peito', exercise: 'Supino', type: 'carga_total', weight: 100, reps: [10], isPR: false }
]));
window.localStorage.setItem('berzerker_game_state_v1', JSON.stringify({
    deloadWeeks: ['2026-W41'], missionsXpTotal: 123, missionsClaimed: { '2026-W41': true },
    tests: [{ id: 'shared-test', name: 'Teste compartilhado', unit: 'kg', goal: 100, records: [] }],
    seasons: { start: '2026-10-01', completed: [] }, bossPortraits: { b0: 'data:image/jpeg;base64,roma' },
    weightLog: [{ date: '2026-10-10', peso: 94, obs: 'compartilhado' }]
}));
let migrationLoadOk = true;
try { ev('loadStoredData(); applyTheme(activeGameThemeId);'); } catch (e) { migrationLoadOk = false; }
check('migração do save legado roda sem erro', migrationLoadOk);
check('logs e progresso antigo migram para o tema que estava ativo', ev("activeGameThemeId === 'roma' && logs.length === 1 && logs[0].xpTheme === 'roma' && missionsXpTotal === 123 && themeGameSaves.roma.missionsClaimed['2026-W41'] === true && themeGameSaves.roma.bossPortraits.b0.includes('roma')"));
check('testes, peso e deload são carregados como dados compartilhados', ev("tests[0].name === 'Teste compartilhado' && weightLog[0].peso === 94 && deloadWeeks.join() === '2026-W41'"));
const legacyRomaXP = ev("computeThemeXPCtx('roma').xp");
check('XP de treino, missão e descanso fica somente no tema migrado', legacyRomaXP > 0 && ev("computeThemeXPCtx('classico').xp === 0") && ev("themeGameSaves.roma.deloadRestDays.length === 7"), legacyRomaXP);
const romaSaveBeforeSwitch = ev('JSON.stringify(themeGameSaves.roma)');
ev("changeGameTheme('classico'); missionsXpTotal = 999; missionsClaimed = { '2026-W42': true }; seasons = { start: '2026-10-12', completed: [] }; bossPortraits = { classicoOnly: 'classico' }; saveGameState();");
check('trocar para outro jogo não altera o save de Roma', ev('JSON.stringify(themeGameSaves.roma)') === romaSaveBeforeSwitch);
check('tema novo tem save independente e dados compartilhados intactos', ev("themeGameSaves.classico.missionsXpTotal === 999 && missionsXpTotal === 999 && tests[0].name === 'Teste compartilhado' && weightLog[0].peso === 94 && deloadWeeks.join() === '2026-W41'"));
ev("changeGameTheme('roma');");
check('voltar ao tema restaura XP, missão, temporada e retrato próprios', ev("missionsXpTotal === 123 && missionsClaimed['2026-W41'] === true && seasons.start === '2026-10-01' && bossPortraits.b0.includes('roma')"));
check('XP global soma os jogos sem duplicar o save migrado', ev('getGlobalXPTotal() === Object.keys(THEMES).reduce((total, id) => total + computeThemeXPCtx(id).xp, 0)') && $('header-xp-display').textContent === `${ev('fmtN(getGlobalXPTotal())')} XP` && $('global-profile-xp').textContent === `${ev('fmtN(getGlobalXPTotal())')} XP`);
window.localStorage.clear();
Object.entries(storedBeforeMigrationTest).forEach(([key, value]) => window.localStorage.setItem(key, value));
ev("loadStoredData(); loadWorkoutsFromStorage(); applyTheme(activeGameThemeId); refreshAll();");

// ============================ CONSOLE ============================
console.log('\n== UI 12. Console limpo ==');
const graves = jsErrors.filter(m => !/Not implemented|Could not load|serviceWorker|HTMLCanvasElement/i.test(m));
check('nenhum erro não capturado', graves.length === 0, graves.slice(0, 3));

console.log('\n' + (failures === 0 ? '✅ SMOKE TEST DE UI PASSOU' : `❌ ${failures} FALHA(S) DE UI`));
process.exit(failures === 0 ? 0 : 1);
