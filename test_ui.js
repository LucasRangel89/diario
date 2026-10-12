/* ============================================================
   SMOKE TEST DE UI — sobe o app inteiro num DOM falso (jsdom)
   ------------------------------------------------------------
   Roda com: npm run test:ui  (precisa de `npm install` uma vez;
   sem jsdom o teste se despede sem falhar — o engine test cobre a lógica).
   Garante: boot sem erro, navegação, aba 🔎 Buscar (tags acumulativas,
   filtros, presets, ordenação), seletor rápido (modal), chips de tag nos
   cartões do diário, busca no histórico e registro com tags.
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

const dom = new JSDOM(fs.readFileSync('index.html', 'utf8'), {
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
Object.defineProperty(window.navigator, 'vibrate', { value: () => true, configurable: true });
Object.defineProperty(window.navigator, 'serviceWorker', { value: { register: () => Promise.resolve() }, configurable: true });
Object.defineProperty(window.navigator, 'storage', { value: { persist: () => Promise.resolve() }, configurable: true });

// ---------- carrega os módulos na ordem do index.html ----------
// vm.runInContext mantém o escopo léxico global entre scripts (como no navegador),
// então os `const`/`let` de catalogo.js continuam visíveis para app.js.
['js/catalogo.js', 'js/gamificacao.js', 'js/busca.js', 'js/app.js']
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

// ============================ BOOT ============================
console.log('\n== UI 1. Boot ==');
let bootOk = true, bootErr = '';
try { window.onload(); } catch (e) { bootOk = false; bootErr = e.message; }
check('window.onload() roda sem erro', bootOk, bootErr);
check('data de hoje no formulário', $('log-date').value === ev('getTodayLocalISO()'));
check('aba Buscar existe (desktop e mobile)', !!$('tab-content-busca') && !!$('nav-busca') && !!$('m-nav-busca'));
check('seed carregou registros', ev('logs.length') > 0);

// ============================ NAVEGAÇÃO ============================
console.log('\n== UI 2. Navegação ==');
click($('nav-busca'));
check('clique em 🔎 Buscar abre a aba', !$('tab-content-busca').classList.contains('hidden'));
check('e esconde o diário', $('tab-content-diario').classList.contains('hidden'));
check('botão ativo destacado', $('nav-busca').className.includes('bg-berzerker-600'));
check('catálogo inteiro listado', cards().length === ev('EXERCISE_CATALOG_FULL.length'), cards().length);
check('contador de resultados', $('cat-count').textContent === '60 de 60 exercícios', $('cat-count').textContent);
check('selects de filtro populados', $('cat-grupo').options.length > 5 && $('cat-equip').options.length > 3 && $('cat-tipo').options.length > 3);
check('25 chips de tag, agrupados por categoria', $('cat-tags').querySelectorAll('button').length === 25, $('cat-tags').querySelectorAll('button').length);
check('atalhos (presets) renderizados', $('cat-presets').querySelectorAll('button').length === 10, $('cat-presets').querySelectorAll('button').length);
check('histórico renderizado na mesma aba', histCards().length === ev('logs.length'), histCards().length);

// ============================ BUSCA TEXTUAL ============================
console.log('\n== UI 3. Busca textual ==');
setInput('cat-q', 'supino');
check('busca "supino" filtra', titles().length === 5 && titles().every(t => /supino/i.test(t)), titles());
setInput('cat-q', 'bench press');
check('apelido em inglês (bench press)', titles().length === 3 && titles().every(t => /supino/i.test(t)), titles());
setInput('cat-q', 'inclinado halteres');
check('tokens em qualquer ordem', titles().join() === 'Supino Inclinado c/ Halteres', titles());
setInput('cat-q', 'elevacao pelvica');
check('busca sem acento', titles().join() === 'Elevação Pélvica (Hip Thrust)', titles());
setInput('cat-q', 'zzzzz');
check('sem resultado → aviso + botão limpar', $('cat-results').textContent.includes('Nenhum exercício'));
setInput('cat-q', '');
check('limpar o texto volta aos 60', cards().length === 60, cards().length);

// ============================ TAGS + FILTROS ============================
console.log('\n== UI 4. Tags acumulativas e filtros ==');
const casaCount = ev(`EXERCISE_CATALOG_FULL.filter(e => e.tags.includes('casa')).length`);
click(chipIn('cat-tags', 'Em casa'));
check('tag "Em casa" filtra', cards().length === casaCount && casaCount < 60, [cards().length, casaCount]);
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
check('desmarcar tudo volta aos 60', cards().length === 60, cards().length);

setSelect('cat-grupo', 'Pernas');
check('filtro de grupo', titles().length === 11 && cards().every(c => c.textContent.includes('Pernas')), titles().length);
setSelect('cat-grupo', '');
setSelect('cat-equip', 'Polia');
check('filtro de equipamento', titles().length === 10 && cards().every(c => c.textContent.includes('Polia')), titles().length);
setSelect('cat-equip', '');
setSelect('cat-tipo', 'isometria');
check('filtro de tipo de carga', titles().length === 2 && titles().every(t => /prancha/i.test(t)), titles());
setSelect('cat-tipo', '');

click(chipIn('cat-presets', 'Já fiz'));
check('preset "Já fiz" liga onlyUsed', ev('searchState.onlyUsed') === true && cards().length === 6, cards().length);
click(chipIn('cat-presets', 'Já fiz'));
check('clicar de novo desliga', ev('searchState.onlyUsed') === false && cards().length === 60);
click(chipIn('cat-presets', 'Push'));
check('preset Push marca a tag empurrar', ev('searchState.tags.join()') === 'empurrar' && cards().every(c => c.textContent.includes('Empurrar')));
click(btnIn($('tab-content-busca'), 'Limpar filtros'));
check('Limpar filtros zera tudo', ev('searchState.tags.length') === 0 && ev(`searchState.q`) === '' && cards().length === 60);

setSelect('cat-sort', 'nome');
check('ordenação A–Z', titles()[0] === 'Ab Wheel' && titles()[59] === 'Tríceps Testa com Barra W', [titles()[0], titles()[59]]);
setSelect('cat-sort', 'uso');
check('ordenação por uso (mais registrado primeiro)', titles()[0] === 'Agachamento Livre', titles()[0]);

// ============================ AÇÕES DO RESULTADO ============================
console.log('\n== UI 5. Ações a partir da busca ==');
setInput('cat-q', 'supino reto com barra');
const card = cards()[0];
check('achou o cartão do supino', card && card.querySelector('h3').textContent === 'Supino Reto com Barra', card && card.querySelector('h3').textContent);
check('cartão traz tags + faixa + descanso + uso', /Empurrar/.test(card.textContent) && /6–10 reps/.test(card.textContent) && /120s/.test(card.textContent) && /registrado/.test(card.textContent));
// força o modo "série a série" antes: o Registrar precisa voltar pro modo simples
setSelect('mode', 'sets');
click(btnIn(card, 'Registrar'));
check('"⚡ Registrar" volta pro diário', !$('tab-content-diario').classList.contains('hidden') && $('tab-content-busca').classList.contains('hidden'));
check('preenche o exercício', $('log-exercise').value === 'Supino Reto com Barra');
check('grupo e tipo vêm do catálogo', $('log-muscle').value === 'Peito' && $('type').value === 'carga_total');
check('modo volta para "séries iguais" (carga/reps visíveis)', $('mode').value === 'simple' && !$('simple-box').classList.contains('hidden'));
check('carga e reps da última vez', $('w').value !== '' && $('r').value !== '', [$('w').value, $('r').value]);
check('linha de tags do formulário apareceu', $('log-tags').textContent.includes('Empurrar'), $('log-tags').textContent);

click($('nav-busca'));
setInput('cat-q', 'remada curvada');
click(btnIn(cards()[0], 'No treino'));
check('"🎯 No treino" preenche o builder', $('wb-exercise').value === 'Remada Curvada com Barra');
check('reps alvo pela faixa do catálogo', $('wb-reps').value === '10, 10, 8', $('wb-reps').value);
check('tags visíveis no builder', $('wb-tags').textContent.includes('Puxar'), $('wb-tags').textContent);

click($('nav-busca'));
setInput('cat-q', 'agachamento livre');
click(btnIn(cards()[0], 'Evolução'));
check('"📊 Evolução" leva ao gráfico do exercício', !$('tab-content-stats').classList.contains('hidden') && $('ex-chart-select').value === 'Agachamento Livre');

// ============================ SELETOR RÁPIDO (MODAL) ============================
console.log('\n== UI 6. Seletor rápido de exercício ==');
click($('m-nav-diario'));
click(btnIn($('log-exercise').parentElement, '🔎'));
check('modal abre', !!$('picker-overlay'));
check('modal já abre com o que estava digitado', $('picker-q').value === 'Supino Reto com Barra' && pickerRows().length === 2, [$('picker-q').value, pickerRows().length]);
setInput('picker-q', '');
check('vazio, o modal lista os 40 mais usados', pickerRows().length === 40 && /40 exercício/.test($('picker-count').textContent), $('picker-count').textContent);
check('modal tem os 25 chips de tag', $('picker-tags').querySelectorAll('button').length === 25);
setInput('picker-q', 'terra');
check('busca do modal filtra', pickerRows().length === 1 && $('picker-results').textContent.includes('Levantamento Terra'));
setInput('picker-q', '');
click(chipIn('picker-tags', 'Core'));
check('tag no modal filtra', ev(`pickerState.tags.join()`) === 'core' && pickerRows().length > 0 && pickerRows().length < 40);
const escolhido = $('picker-results').querySelector('button').getAttribute('data-ex');
click($('picker-results').querySelector('button'));
check('escolher fecha o modal', !$('picker-overlay'));
check('e preenche o exercício escolhido', $('log-exercise').value === escolhido, [$('log-exercise').value, escolhido]);
check('exercício escolhido é de core', ev(`exerciseTags(${JSON.stringify(escolhido)}).includes('core')`) === true);
check('tag line do formulário atualizou', $('log-tags').textContent.includes('Core'));
click(btnIn($('wb-exercise').parentElement, '🔎'));
check('modal também abre pelo criador de treino', !!$('picker-overlay') && $('picker-hint').textContent.includes('criador de treino'));
ev('closeExercisePicker()');
check('fecha sem deixar overlay', !$('picker-overlay'));

// ============================ HISTÓRICO ============================
console.log('\n== UI 7. Busca no histórico ==');
click($('nav-busca'));
check('lista todos os registros', histCards().length === ev('logs.length'), histCards().length);
setInput('hist-q', 'supino');
check('texto filtra', histCards().length === 2 && $('hist-results').textContent.includes('Supino'), histCards().length);
check('resumo traz totais', /registro/.test($('hist-summary').textContent) && /ton/.test($('hist-summary').textContent), $('hist-summary').textContent);
setInput('hist-q', '');
setSelect('hist-muscle', 'Pernas');
check('grupo filtra', histCards().length === 1 && $('hist-results').textContent.includes('Agachamento'));
setSelect('hist-muscle', '');
setSelect('hist-period', '7');
check('período 7 dias respeita a data', histCards().length <= ev('logs.length'));
setSelect('hist-period', 'todos');
click(chipIn('cat-tags', 'Core'));
check('tags do catálogo também filtram o histórico', histCards().length === 0 && $('hist-results').textContent.includes('Nenhum registro'), histCards().length);
click(chipIn('cat-tags', 'Core'));
check('tirar a tag traz tudo de volta', histCards().length === ev('logs.length'));
check('cartão do histórico tem editar + ver dia + tags', /Editar/.test($('hist-results').textContent) && /Ver dia/.test($('hist-results').textContent) && /Empurrar|Puxar|Agachar/.test($('hist-results').textContent));

// ============================ REGISTRO COM TAGS ============================
console.log('\n== UI 8. Registro diário com tags ==');
click($('m-nav-diario'));
setInput('log-exercise', 'Rosca Direta com Barra');
fire($('log-exercise'), 'input');
check('digitar mostra as tags do exercício', $('log-tags').textContent.includes('Puxar') && $('log-tags').textContent.includes('Barra'), $('log-tags').textContent);
setInput('w', '45'); setInput('r', '12, 10, 8');
const antes = ev('logs.length');
fire($('workout-form'), 'submit');
check('registro adicionado', ev('logs.length') === antes + 1);
check('cartão do diário mostra as tags', $('logs-container').textContent.includes('Rosca Direta com Barra') && $('logs-container').textContent.includes('Puxar'));
check('busca passa a contar o uso', ev(`usageStats().usage['Rosca Direta com Barra']`) >= 1);
click($('nav-busca'));
click(chipIn('cat-presets', 'Já fiz'));
setInput('cat-q', '');
check('preset "Já fiz" inclui o exercício novo', titles().includes('Rosca Direta com Barra'), titles());

// ============================ CONSOLE ============================
console.log('\n== UI 9. Console limpo ==');
const graves = jsErrors.filter(m => !/Not implemented|Could not load|serviceWorker|HTMLCanvasElement/i.test(m));
check('nenhum erro não capturado', graves.length === 0, graves.slice(0, 3));

console.log('\n' + (failures === 0 ? '✅ SMOKE TEST DE UI PASSOU' : `❌ ${failures} FALHA(S) DE UI`));
process.exit(failures === 0 ? 0 : 1);
