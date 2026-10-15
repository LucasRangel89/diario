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
// fetch mínimo para o Estúdio de Reservas (lê o index.json do disco)
window.fetch = url => {
    const file = String(url).replace(/^\.?\//, '');
    if (fs.existsSync(file)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(JSON.parse(fs.readFileSync(file, 'utf8'))) });
    }
    return Promise.resolve({ ok: false, json: () => Promise.resolve(null) });
};

// ---------- carrega os módulos na ordem do index.html ----------
// vm.runInContext mantém o escopo léxico global entre scripts (como no navegador),
// então os `const`/`let` de catalogo.js continuam visíveis para app.js.
['js/storage.js', 'js/catalogo.js', 'js/gamificacao.js', 'js/assistente.js', 'js/planilha_data.js', 'js/historico.js', 'js/busca.js', 'js/app.js']
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
check('Perfil Global soma o XP dos dez temas', !!$('global-profile-xp') && $('global-profile-xp').textContent === `${ev('fmtN(getGlobalXPTotal())')} XP`);
navTo('boss');
check('grupo Jogo preserva Boss e Story Card', !$('tab-content-boss').classList.contains('hidden') && !!$('nav-boss') && !!$('nav-story'));
check('Boss explica a brecha tática por trás da fraqueza', $('active-boss-card').textContent.includes(ev('computeBossProgress(logsForTheme(activeGameThemeId), userBodyweight, BOSSES).current.weakReason')));
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
check('seletores têm grupos na ordem certa + Cardio no histórico, sem Glúteos', !!$('log-muscle') && $('log-muscle').options.length === 11 && $('wb-muscle').options.length === 11 && $('log-muscle').options[3].value === 'Posterior' && $('wb-muscle').options[3].value === 'Posterior' && $('hist-grupo').options.length === 13 && $('hist-grupo').options[4].textContent === 'Posterior' && [...$('log-muscle').options, ...$('wb-muscle').options, ...$('hist-grupo').options].every(o => o.value !== 'Glúteos' && o.textContent !== 'Glúteos'));
check('nenhum log ou treino salvo mantém Pescoço ou Glúteos', !ev("logs.some(l => l.muscle === 'Pescoço' || l.muscle === 'Glúteos')") && !ev("savedWorkouts.some(w => (w.exercises || []).some(e => e.muscle === 'Pescoço' || e.muscle === 'Glúteos'))"));
check('cervical do seed aparece como Ombros', ev("savedWorkouts.some(w => (w.exercises || []).some(e => e.exercise === 'Extensão Cervical' && e.muscle === 'Ombros'))"));
check('Hip Thrust do seed migra para Posterior em logs e treino salvo', ev("logs.some(l => l.exercise === 'Elevação Pélvica (Hip Thrust)' && l.muscle === 'Posterior') && savedWorkouts.some(w => (w.exercises || []).some(e => e.exercise === 'Elevação Pélvica (Hip Thrust)' && e.muscle === 'Posterior'))"));
check('Mesa Flexora do seed volta para Posterior no treino salvo (catálogo manda)', ev("savedWorkouts.some(w => (w.exercises || []).some(e => e.exercise === 'Mesa Flexora' && e.muscle === 'Posterior')) && !savedWorkouts.some(w => (w.exercises || []).some(e => e.exercise === 'Mesa Flexora' && e.muscle === 'Pernas'))"));
check('IDs e retratos (webp) dos quatro chefões clássicos preservados', ev("THEMES.classico.bosses.slice(0, 4).map(b => b.id).join() === 'boss1,boss2,boss3,boss4' && DEFAULT_BOSS_PORTRAITS['classico:boss1'].endsWith('golem-anilhas.webp') && DEFAULT_BOSS_PORTRAITS['classico:boss2'].endsWith('hidra-titanio.webp') && DEFAULT_BOSS_PORTRAITS['classico:boss3'].endsWith('mecagorila.webp') && DEFAULT_BOSS_PORTRAITS['classico:boss4'].endsWith('behemoth.webp') && THEMES.classico.bosses.length === 12"));
check('seletor antigo de tema foi removido de Config', !$('game-theme-select') && !$('game-theme-desc'));
check('Story Card remove paletas antigas', !$('btn-theme-berzerker') && !$('btn-theme-cyberpunk') && !$('btn-theme-minimal') && !/Cyberpunk|Minimalist|Berzerker Red/.test($('tab-content-story').textContent));
check('Story Card preserva upload e controle de escurecimento', !!$('bg-image-input') && !!$('bg-overlay-opacity') && $('bg-overlay-opacity').type === 'range');
check('paleta, moldura e fontes estão vinculadas aos dez temas', ev("Object.keys(THEMES).length === 10 && Object.keys(THEMES).every(id => STORY_CARD_STYLES[id] && STORY_CARD_STYLES[id].palette && STORY_CARD_STYLES[id].fonts && THEME_ICONS[id])") && /THEME\.frame/.test(fs.readFileSync('js/app.js', 'utf8')));
let legacyStoryStyleIgnored = true;
try { ev("safeStorage.set(STORAGE_KEY_STORY, JSON.stringify({ selectedStoryTheme: 'cyberpunk' })); loadStoredData(); generateStoryCard();"); } catch (e) { legacyStoryStyleIgnored = false; }
check('estilo legado salvo é ignorado sem erro', legacyStoryStyleIgnored);
check('selo do tema usa a arte própria (não emoji)', !!$('story-theme-icon').querySelector('img'));
check('emblema de patente aponta para a arte do tema e nível certos', ev("rankEmblemSrc('aneis',10)") === 'images/patentes/aneis-10.webp' && ev("rankEmblemSrc('zodiaco',1)") === 'images/patentes/zodiaco-01.webp' && ev("rankEmblemSrc('tema-inexistente',3)") === 'images/patentes/classico-03.webp');
check('arte própria dos 10 temas tem ícone e fundo de card', ev("THEME_IDS_LIST.every(id => !!THEME_ICON_IMGS[id] && !!THEME_CARD_BGS[id])") && ev("THEME_IDS_LIST.length") === 10);
check('Story Card mostra o tema de jogo atual', $('story-theme-name').textContent === ev('THEME.name') && $('story-theme-icon').querySelector('img').getAttribute('src') === 'images/temas/classico.webp');
click($('header-theme-button'));
ev("showRanksModal('classico');");
check('modal de patentes mostra os dez emblemas próprios', ($('ranks-overlay')?.querySelectorAll('img')?.length || 0) >= 10 && $('ranks-overlay').innerHTML.includes('images/patentes/classico-10.webp'));
ev("document.getElementById('ranks-overlay')?.remove();");
check('botão do tema abre dez cartões com ícone, patente e progresso', !!$('theme-gallery-overlay') && $('theme-gallery-overlay').querySelectorAll('[data-theme-id]').length === 10 && $('theme-gallery-overlay').textContent.includes('Patente atual') && $('theme-gallery-overlay').textContent.includes('chefões'));
const galleryIds = ev('THEME_IDS_LIST');
const galleryEmblemSrc = id => ev(`rankEmblemSrc('${id}', rankFromXP(computeThemeXPCtx('${id}').xp, themeRankList(THEMES['${id}'])).level)`);
check('galeria de temas mostra emblema de patente em vez de emoji residual',
    galleryIds.every(id => {
        const card = $('theme-gallery-overlay').querySelector(`[data-theme-id="${id}"]`);
        const img = card && card.querySelector('img[src^="images/patentes/"]');
        return !!img && img.getAttribute('src') === galleryEmblemSrc(id);
    }),
    galleryIds.map(id => (id + ':' + ($('theme-gallery-overlay').querySelector(`[data-theme-id="${id}"] img[src^="images/patentes/"]`) || {}).getAttribute?.('src'))));
check('nenhum cartão da galeria repete o emoji da patente no texto',
    galleryIds.every(id => {
        const card = $('theme-gallery-overlay').querySelector(`[data-theme-id="${id}"]`);
        const emoji = ev(`rankFromXP(computeThemeXPCtx('${id}').xp, themeRankList(THEMES['${id}'])).icon`);
        return !!card && !card.textContent.includes(emoji);
    }));
check('galeria traz o Senhor dos Anéis (💍) com patentes próprias', !!$('theme-gallery-overlay').querySelector('[data-theme-id="aneis"]') && $('theme-gallery-overlay').textContent.includes('Senhor dos Anéis') && ev("THEME_ICONS.aneis === '💍' && THEMES.aneis.ranks[9][0] === 'LENDA DA TERRA MÉDIA'"));
click($('theme-gallery-overlay').querySelector('[data-theme-id="roma"]'));
check('troca pede confirmação pelo nome Roma Antiga', !!$('confirm-modal-overlay') && $('confirm-modal-overlay').textContent.includes('Trocar para Roma Antiga?') && ev("THEME.id === 'classico'"));
click($('confirm-modal-no'));
check('cancelar mantém o tema atual', ev("THEME.id === 'classico'") && !$('confirm-modal-overlay'));
click($('header-theme-button'));
click($('theme-gallery-overlay').querySelector('[data-theme-id="roma"]'));
click($('confirm-modal-yes'));
check('confirmar troca atualiza tema, ícone e Story Card', ev("THEME.id === 'roma'") && $('header-theme-icon').querySelector('img').getAttribute('src') === 'images/temas/roma.webp' && $('story-theme-name').textContent === ev('THEME.name'));
ev("changeGameTheme('classico');");
click($('header-theme-button'));
click($('theme-gallery-overlay').querySelector('[data-theme-id="aneis"]'));
click($('confirm-modal-yes'));
navTo('boss');
check('Senhor dos Anéis aplica tema, ícone, arena e jornadas no Boss', ev("THEME.id === 'aneis'") && $('header-theme-icon').querySelector('img').getAttribute('src') === 'images/temas/aneis.webp' && $('arena-title').textContent === 'Jornada até o Monte da Perdição' && $('tab-content-boss').textContent.includes('DESAFIO ATIVO — JORNADA 1/12'), ev('THEME.id'));
check('Boss do Senhor dos Anéis explica a fraqueza e o porquê', $('active-boss-card').textContent.includes('Goblins de Moria') && $('active-boss-card').textContent.includes('passos ágeis'));
navTo('story');
check('Story Card segue o tema Senhor dos Anéis', $('story-theme-name').textContent === 'Senhor dos Anéis' && $('story-theme-icon').querySelector('img').getAttribute('src') === 'images/temas/aneis.webp');
ev("changeGameTheme('classico');");
check('histórico renderizado', !!$('history-content'));
check('CSV multi-aba com 22 colunas no Log', ev('buildPlanilhaCSV()').split(/--- Sheet: Log ---/)[1].split('\n')[1].split(';').length === 22);
check('todos os 120 chefões têm retrato padrão (Ação e Anéis inclusive)', ev("Object.keys(THEMES).every(id => THEMES[id].bosses.every(b => !!DEFAULT_BOSS_PORTRAITS[id + ':' + b.id]))"));
check('molduras temáticas (runas/espacial) no código', /frame === 'runas'/.test(fs.readFileSync('js/app.js', 'utf8')) && /frame === 'espacial'/.test(fs.readFileSync('js/app.js', 'utf8')));
const appSrcFrames = fs.readFileSync('js/app.js', 'utf8');
check('molduras de ferro (clássico) e de anel (Senhor dos Anéis) desenhadas à mão', /frame === 'ferro'/.test(appSrcFrames) && /frame === 'anel'/.test(appSrcFrames));
check('clássico usa ferro e Anéis não divide mais o ouro do Zodíaco', ev("THEMES.classico.frame === 'ferro' && THEMES.aneis.frame === 'anel' && THEMES.zodiaco.frame === 'ouro'"));
check('nenhum tema cai no else genérico de drawThemedFrame', ev("[...new Set(Object.values(THEMES).map(t => t.frame))]").every(f => new RegExp(`frame === '${f}'`).test(appSrcFrames)), ev("[...new Set(Object.values(THEMES).map(t => t.frame))]"));
check('moldura de ferro traz rebites e corrente; a de anel traz o Um Anel gravado', /rebites/.test(appSrcFrames) && /corrente/.test(appSrcFrames) && /Um Anel/.test(appSrcFrames));
let framesOk = true, framesErr = '';
try {
    ev("openBossDefeatCard(); window.__themeBackup = THEME; THEME_IDS_LIST.forEach(id => { THEME = THEMES[id]; drawThemedFrame(document.getElementById('story-canvas').getContext('2d'), STORY_CARD_STYLES[id].palette); drawThemedFrame(document.getElementById('boss-card-canvas').getContext('2d'), { borderPrimary: '#dc2626' }); }); generateStoryCard(); generateBossDefeatCard(); THEME = window.__themeBackup; delete window.__themeBackup; document.getElementById('boss-card-overlay')?.remove();");
} catch (e) { framesOk = false; framesErr = e.message; }
check('as dez molduras desenham sem erro (story card + card do chefão)', framesOk && !!ev('THEME'), framesErr);

// ============================ LIGHTBOX DOS CHEFÕES ============================
console.log('\n== UI 1b. Lightbox dos chefões ==');
const key = k => document.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
navTo('boss');
const lbOverlay = () => $('boss-lightbox-overlay');
const lbCard = id => $('bosses-grid').querySelector(`[data-boss-id="${id}"]`);
const lbImg = () => lbOverlay() && lbOverlay().querySelector('#boss-lightbox-img');
const lbDownload = () => lbOverlay() && lbOverlay().querySelector('#boss-lightbox-download');
check('lightbox não existe antes do clique', !lbOverlay());
check('os 12 cards da grade são clicáveis e trazem o id do chefão', $('bosses-grid').querySelectorAll('[data-boss-id]').length === 12 && $('bosses-grid').querySelectorAll('[onclick^="openBossLightbox("]').length === 12);
check('miniaturas da grade carregam de forma preguiçosa (lazy + async)', [...$('bosses-grid').querySelectorAll('img')].length === 12 && [...$('bosses-grid').querySelectorAll('img')].every(i => i.getAttribute('loading') === 'lazy' && i.getAttribute('decoding') === 'async'));
const idxAtual = ev('computeBossProgress(logsForTheme(activeGameThemeId), userBodyweight, BOSSES).currentIdx');
const retratoAtivo = $('active-boss-card').querySelector('button[onclick^="openBossLightbox("]');
check('retrato do chefão ativo (w-20) também é clicável e aponta para o boss em batalha', !!retratoAtivo && retratoAtivo.className.includes('w-20') && retratoAtivo.getAttribute('onclick') === `openBossLightbox('${ev('BOSSES[' + idxAtual + '].id')}')`, retratoAtivo && retratoAtivo.getAttribute('onclick'));

const bossAlvo = ev('BOSSES[5].id');
click(lbCard(bossAlvo));
check('clicar no card abre o modal', !!lbOverlay() && lbOverlay().className.includes('z-[60]') && lbOverlay().className.includes('bg-black/80') && lbOverlay().className.includes('backdrop-blur-sm'));
check('arte grande vem do retrato padrão do tema (512×512, pixelado)', !!lbImg() && lbImg().getAttribute('src') === ev(`DEFAULT_BOSS_PORTRAITS['${ev('activeGameThemeId')}:' + '${bossAlvo}']`) && lbImg().getAttribute('style').includes('image-rendering:pixelated'), lbImg() && lbImg().getAttribute('src'));
check('nome do chefão no cabeçalho do modal', $('boss-lightbox-name').textContent === ev(`BOSSES[5].name`));
check('status do combate no modal (DERROTADO/EM BATALHA/BLOQUEADO)', /DERROTADO 🏆|EM BATALHA ⚔️|BLOQUEADO 🔒/.test($('boss-lightbox-status').textContent));
check('modal traz HP máximo, fraqueza, brecha tática e XP de recompensa', lbOverlay().textContent.includes(ev('fmtN(BOSSES[5].maxHp)') + ' HP') && lbOverlay().textContent.includes(ev('BOSSES[5].weak')) && lbOverlay().textContent.includes(ev('BOSSES[5].weakReason')) && lbOverlay().textContent.includes('+' + ev('fmtN(Math.round(BOSSES[5].maxHp / 200))') + ' XP'));
check('botão de baixar a imagem usa o atributo download', !!lbDownload() && lbDownload().getAttribute('download').endsWith('.webp') && lbDownload().getAttribute('href') === lbImg().getAttribute('src'));

click(btnIn(lbOverlay(), '›') || lbOverlay().querySelector('[aria-label="Próximo chefão"]'));
check('› avança para o chefão seguinte', $('boss-lightbox-name').textContent === ev('BOSSES[6].name') && lbImg().getAttribute('src') === ev(`DEFAULT_BOSS_PORTRAITS['${ev('activeGameThemeId')}:' + BOSSES[6].id]`), $('boss-lightbox-name').textContent);
key('ArrowRight');
check('seta → do teclado também avança', $('boss-lightbox-name').textContent === ev('BOSSES[7].name'));
key('ArrowLeft'); key('ArrowLeft');
check('seta ← do teclado volta', $('boss-lightbox-name').textContent === ev('BOSSES[5].name'));
lbOverlay().querySelector('[aria-label="Chefão anterior"]').click();
check('‹ volta e dá a volta no fim da lista (b11 → b0)', $('boss-lightbox-name').textContent === ev('BOSSES[4].name'));
ev("bossLightboxIdx = 0; renderBossLightbox(); navBossLightbox(-1);");
check('navegação é circular (antes do 1º volta ao último)', $('boss-lightbox-name').textContent === ev('BOSSES[11].name'));
key('Escape');
check('ESC fecha o lightbox', !lbOverlay());

ev("openBossLightbox(BOSSES[3].id);");
check('openBossLightbox(id) abre já no chefão certo', !!lbOverlay() && $('boss-lightbox-name').textContent === ev('BOSSES[3].name'));
lbOverlay().dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
check('clique no fundo fecha o modal', !lbOverlay());

click(retratoAtivo);
check('retrato do card ativo abre o modal já no boss em batalha', !!lbOverlay() && $('boss-lightbox-name').textContent === ev('BOSSES[' + idxAtual + '].name') && /EM BATALHA ⚔️/.test($('boss-lightbox-status').textContent), $('boss-lightbox-name').textContent);
btnIn(lbOverlay(), '✕').click();
check('botão ✕ fecha o lightbox', !lbOverlay());
check('lightbox fecha sem deixar rastro no DOM', !document.body.querySelector('#boss-lightbox-overlay'));

// ============================ ESC + WEBFONTS ============================
console.log('\n== UI 1c. ESC fecha todos os overlays + webfonts antes do canvas ==');
click($('header-theme-button'));
check('galeria de temas aberta para o teste de ESC', !!$('theme-gallery-overlay'));
key('Escape');
check('ESC fecha a galeria de temas', !$('theme-gallery-overlay'));
ev("showRanksModal('classico');");
check('modal de patentes aberto para o teste de ESC', !!$('ranks-overlay'));
key('Escape');
check('ESC fecha o modal de patentes', !$('ranks-overlay'));
ev("confirmModal('Trocar de tema?', () => { window.__confirmRodou = true; });");
check('confirmação aberta para o teste de ESC', !!$('confirm-modal-overlay'));
key('Escape');
check('ESC fecha a confirmação sem executar o callback', !$('confirm-modal-overlay') && !ev('window.__confirmRodou'));
ev("openExercisePicker('log');");
check('seletor rápido aberto para o teste de ESC', !!$('picker-overlay'));
key('Escape');
check('ESC fecha o seletor rápido', !$('picker-overlay'));
ev("openBossDefeatCard(); openBossLightbox(BOSSES[0].id);");
check('Card do Chefão + lightbox empilhados', !!$('boss-card-overlay') && !!$('boss-lightbox-overlay'));
key('Escape');
check('com dois overlays, ESC fecha só o de cima (lightbox)', !$('boss-lightbox-overlay') && !!$('boss-card-overlay'));
key('Escape');
check('segundo ESC fecha o Card do Chefão', !$('boss-card-overlay'));
const corpoAntes = document.body.children.length;
key('Escape');
check('ESC sem overlay aberto não remove nada nem quebra', document.body.children.length === corpoAntes);
const appSrcEsc = fs.readFileSync('js/app.js', 'utf8');
check('um único handler de ESC cobre todos os overlays na ordem de empilhamento', /OVERLAY_CLOSE_ORDER/.test(appSrcEsc) && /closeTopOverlay/.test(appSrcEsc));
check('cards em canvas esperam document.fonts.ready antes do traço definitivo', /withWebFonts\(generateStoryCard\)/.test(appSrcEsc) && /withWebFonts\(generateBossDefeatCard\)/.test(appSrcEsc) && /fonts\.ready\.then/.test(appSrcEsc));
check('redraw de fontes é agendado uma vez só (sem loop com os onload de imagem)', (appSrcEsc.match(/_fontsRedrawScheduled = true/g) || []).length === 1);

// vistas do histórico
try {
    ev("switchHistoryView('progresso')"); ev("switchHistoryView('semanas')");
    ev("switchHistoryView('peso')"); ev("switchHistoryView('log')");
    check('4 vistas do histórico alternam sem erro', true);
    const cabecalhoLog = [...$('history-content').querySelectorAll('thead th')].map(th => th.textContent.trim());
    const primeiraLinha = $('history-content').querySelector('tbody tr');
    check('tabela do histórico troca a coluna Sessão pela coluna Grupo',
        cabecalhoLog[1] === 'Grupo' && !cabecalhoLog.includes('Sessão'), cabecalhoLog.slice(0, 3));
    check('grupo da linha é um chip com o valor canônico',
        !!primeiraLinha.querySelectorAll('td')[1].querySelector('span')
        && ev(`normalizeMuscle(${JSON.stringify(primeiraLinha.querySelectorAll('td')[1].textContent.trim())})`) === primeiraLinha.querySelectorAll('td')[1].textContent.trim());
    check('sessão continua visível como detalhe discreto sob o exercício',
        !!primeiraLinha.querySelectorAll('td')[2].querySelector('span')
        && /Peito\/Tríceps\/Ombro|Bíceps\/Costas|Pernas\/Abdômen|Posterior\/Acessórios|Full Body/.test(primeiraLinha.querySelectorAll('td')[2].textContent),
        primeiraLinha.querySelectorAll('td')[2].textContent);
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
const recoveryBoxes = [...$('recovery-status-grid').children];
const posteriorBox = recoveryBoxes.find(box => box.querySelector('.font-oswald')?.textContent.trim() === 'Posterior');
const apoioPosterior = posteriorBox && [...posteriorBox.querySelectorAll('div')].find(div => div.classList.contains('text-cyan-400/80'));
const seriesDiretasPosterior = ev('weeklySetsByMuscle(logs, getTodayLocalISO()).Posterior || 0');
const apoioEquivalenteSeed = { Posterior: '~4,0', Ombros: '~5,6', Bíceps: '~7,5', Tríceps: '~7,0', Abdômen: '~3,0', Core: '~8,0', Antebraço: '~7,5' };
const apoiosSeedCorretos = Object.entries(apoioEquivalenteSeed).every(([muscle, esperado]) => {
    const box = recoveryBoxes.find(el => el.querySelector('.font-oswald')?.textContent.trim() === muscle);
    const aviso = box && [...box.querySelectorAll('div')].find(div => div.classList.contains('text-cyan-400/80'));
    return aviso && aviso.textContent.includes(`${esperado} séries equivalentes`);
});
check('mapa mostra Posterior (não Glúteos), tooltip e equivalentes corretos do seed', !!posteriorBox && !recoveryBoxes.some(box => box.querySelector('.font-oswald')?.textContent.trim() === 'Glúteos') && apoioPosterior && /apoio em .*séries equivalentes/.test(apoioPosterior.textContent) && apoioPosterior.title.includes('Agachamento Hack') && apoioPosterior.title.includes('Leg Press 45°') && apoiosSeedCorretos);
check('séries equivalentes ficam fora da meta semanal do box Posterior', !!posteriorBox && posteriorBox.textContent.includes(`${seriesDiretasPosterior}/10–20 séries`) && seriesDiretasPosterior === 0 && ev("weeklyGaps(logs, getTodayLocalISO()).find(g => g.muscle === 'Posterior').series === 0"), { seriesDiretasPosterior, text: posteriorBox && posteriorBox.textContent });
check('painel do montador: o que falta na semana', $('builder-week-gaps').textContent.includes('Estímulo da semana') && /séries/.test($('builder-week-gaps').textContent), $('builder-week-gaps').textContent.slice(0, 120));
check('painel anuncia a faixa própria do Antebraço', $('builder-week-gaps').textContent.includes('Antebraço 4–10'), $('builder-week-gaps').textContent.slice(0, 160));
const boxAntebraco = recoveryBoxes.find(el => el.querySelector('.font-oswald')?.textContent.trim() === 'Antebraço');
check('box do Antebraço cobra 4–10 séries (não 10–20)', !!boxAntebraco && boxAntebraco.textContent.includes('/4–10 séries'), boxAntebraco && boxAntebraco.textContent.match(/\d+\/\d+–\d+ séries/));
const lombarLivre = $('lombar-alert-panel').textContent;
check('lombar livre vira linha verde compacta (sem painel de alerta)',
    lombarLivre.includes('✅ Lombar 100% — livre') && !lombarLivre.includes('Recuperação da região') && !lombarLivre.includes('⚠️ Lombar'),
    lombarLivre.slice(0, 140));
ev(`window.__lombarBackup = logs; logs = [{ id: -7, kind: 'peso', muscle: 'Costas', date: getTodayLocalISO(), exercise: 'Levantamento Terra', reps: [5, 5, 5] }]; renderRecoveryMap();`);
const lombarCarregada = $('lombar-alert-panel').textContent;
check('lombar carregada mostra o painel completo, com o ícone do estado no título',
    lombarCarregada.includes('Recuperação da região') && /Lombar\s*⚠️/.test(lombarCarregada)
    && lombarCarregada.includes('MUITO CARREGADA') && !lombarCarregada.includes('✅ Lombar 100%'),
    lombarCarregada.slice(0, 140));
ev('logs = window.__lombarBackup; delete window.__lombarBackup; renderRecoveryMap();');
check('voltar aos registros reais devolve a linha compacta', $('lombar-alert-panel').textContent.includes('✅ Lombar 100% — livre'));
ev(`window.__gapsBackup = logs; logs = [{ id: -1, kind: 'peso', muscle: 'Costas', date: getTodayLocalISO(), exercise: 'Remada Baixa na Polia', reps: [10, 10, 10] }]; renderWeekGaps();`);
check('chip mostra o apoio indireto da semana sem abater a meta',
    $('builder-week-gaps').textContent.includes('Antebraço: 0/4 min · faltam 4 · 🤝 +1,5 indiretos'),
    $('builder-week-gaps').textContent.match(/Antebraço:[^·]*·[^·]*·[^·]*/));
check('painel explica que 🤝 é informativo', $('builder-week-gaps').textContent.includes('não abate a meta'));
ev('logs = window.__gapsBackup; delete window.__gapsBackup; renderWeekGaps();');
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

// ============================ TEMPORADA ============================
console.log('\n== UI 11b. Temporada de 4 semanas e deload automático ==');
const isoLocal = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const inicioTemporadaTeste = new Date();
inicioTemporadaTeste.setDate(inicioTemporadaTeste.getDate() - 22);   // dia 22 → semana 4
ev(`window.__seasonBackup = JSON.stringify(seasons || null);`);
ev(`seasons = { start: getTodayLocalISO(), completed: [] }; renderSeason();`);
check('painel anuncia o ciclo curto de 4 semanas', ev('SEASON_WEEKS') === 4 && $('season-content').textContent.includes('Semana 1/4'), $('season-content').textContent.slice(0, 120));
check('painel explica o deload automático da semana 4', $('season-content').textContent.includes('🌙 Semana 4 = deload automático') && /50% do XP/.test($('season-content').textContent), ($('season-content').textContent.match(/🌙 Semana[^.]*/) || [])[0]);
check('fora da semana 4 o painel não marca deload ativo', !$('season-content').textContent.includes('· 🌙 deload'), $('season-content').textContent.slice(0, 120));
ev(`seasons = { start: '${isoLocal(inicioTemporadaTeste)}', completed: [] }; renderSeason();`);
check('na semana 4 o cabeçalho marca "· 🌙 deload"', /Semana 4\/4 · termina em \d+ dias · 🌙 deload/.test($('season-content').textContent) && $('season-content').textContent.includes('(você está nele)'), ($('season-content').textContent.match(/Semana 4[^·]*·[^·]*·[^.]*/) || [])[0]);
check('semana de deload automático entra no deload efetivo do tema', ev('deloadWeeksEfetivos().includes(autoDeloadWeekKeys(seasons)[0])') === true, ev('deloadWeeksEfetivos()'));
check('deload automático vale mesmo sem nenhuma semana marcada à mão', ev('deloadWeeks.length') === 0 || ev('deloadWeeksEfetivos().length >= deloadWeeks.length'), ev('deloadWeeks'));
ev('seasons = window.__seasonBackup ? JSON.parse(window.__seasonBackup) : null; delete window.__seasonBackup; renderSeason();');

// ============================ BADGES ============================
console.log('\n== UI 12b. Badges com arte própria ==');
navTo('stats');
ev('renderBadgesAndStreak();');
const badgeCards = [...$('badges-grid').children];
const badgeSlugs = ev('Object.keys(BADGE_ART)');
check('grade de conquistas tem 16 badges', badgeCards.length === 16 && badgeSlugs.length === 16, badgeCards.length);
check('contador de desbloqueios acompanha os 16', $('stat-unlocked-badges').textContent.endsWith('/ 16'), $('stat-unlocked-badges').textContent);
check('todo badge com arte própria renderiza <img> da série', badgeCards.length === 16 && badgeCards.every(c => !!c.querySelector('img[src^="images/badges/"]')), badgeCards.filter(c => !c.querySelector('img')).length);
check('cada <img> de badge aponta para um arquivo que existe no disco', badgeSlugs.every(slug => fs.existsSync(ev(`BADGE_ART['${slug}']`))), badgeSlugs.filter(slug => !fs.existsSync(ev(`BADGE_ART['${slug}']`))));
check('img de badge carrega preguiçosa e com fallback de emoji no onerror', badgeCards.every(c => { const i = c.querySelector('img'); return i && i.getAttribute('loading') === 'lazy' && i.getAttribute('onerror') === 'badgeArtFallback(this)' && !!i.getAttribute('data-fallback'); }));
const imgSemArquivo = document.createElement('img');
imgSemArquivo.setAttribute('data-fallback', '🐘');
document.body.appendChild(imgSemArquivo);
ev('badgeArtFallback')(imgSemArquivo);
const spanFallback = [...document.body.children].find(el => el.tagName === 'SPAN' && el.textContent === '🐘');
check('onerror devolve o emoji quando a arte não existe', !document.body.contains(imgSemArquivo) && !!spanFallback);
if (spanFallback) spanFallback.remove();
check('badge sem slug de arte cai direto no emoji', ev("badgeArtImg('slug-inexistente', '🎯', true)").includes('🎯') && !ev("badgeArtImg('slug-inexistente', '🎯', true)").includes('<img'));

// ============================ ESTÚDIO DE RESERVAS ============================
// (async de propósito: o manifesto chega por fetch, então o bloco espera o
//  event loop antes de conferir a grade — e só então fecha o processo)
(async () => {
    console.log('\n== UI 12c. Estúdio de reservas ==');
    navTo('boss');
    await new Promise(r => setTimeout(r, 0));
    check('manifesto das reservas carregou pelo index.json (35 artes)', ev('reservaManifest && reservaManifest.total') === 35, ev('reservaManifest && reservaManifest.total'));
    check('seletor do estúdio lista os 12 chefões do tema', $('reserva-boss-select').options.length === 12, $('reserva-boss-select').options.length);
    const nReservas = ev("reservaGroups(THEME.id).reduce((n, g) => n + g.itens.length, 0)");
    check('grade do estúdio = padrão + as reservas do tema', $('reserva-grid').querySelectorAll('button').length === nReservas + 1 && nReservas > 0, { tiles: $('reserva-grid').querySelectorAll('button').length, nReservas });
    check('todo tile de reserva aponta para arquivo que existe no disco', ev("reservaGroups(THEME.id).flatMap(g => g.itens.map(i => i.file))").every(f => fs.existsSync(f)));
    check('tile do padrão usa o retrato oficial do tema', $('reserva-grid').querySelector('img').getAttribute('src') === ev("DEFAULT_BOSS_PORTRAITS[THEME.id + ':' + reservaBossId]"));

    const alvo = ev("reservaGroups(THEME.id)[0].itens[0].file");
    ev(`applyReservaPortrait('${alvo}')`);
    const bossAlvo = ev('reservaBossId');
    check('escolher reserva grava em bossPortraits (mesmo mecanismo do upload)', ev('bossPortraits[reservaBossId]') === alvo, ev('bossPortraits[reservaBossId]'));
    check('a grade do Boss passa a mostrar a reserva escolhida', $('bosses-grid').querySelector(`[data-boss-id="${bossAlvo}"] img`).getAttribute('src') === alvo);
    check('select marca o chefão personalizado com 🎨', [...$('reserva-boss-select').options].some(o => o.value === bossAlvo && o.textContent.includes('🎨')));
    check('tile da reserva ativa fica destacado', [...$('reserva-grid').querySelectorAll('button')].some(b => b.getAttribute('onclick') === `applyReservaPortrait('${alvo}')` && b.className.includes('ring-1')));
    ev('resetBossPortraitToDefault()');
    check('voltar ao padrão limpa o bossPortraits e restaura a arte oficial', ev('bossPortraits[reservaBossId]') === undefined && $('bosses-grid').querySelector(`[data-boss-id="${bossAlvo}"] img`).getAttribute('src') === ev(`DEFAULT_BOSS_PORTRAITS[THEME.id + ':' + reservaBossId]`));

    ev("window.__manifestBackup = JSON.stringify(reservaManifest); reservaManifest = { total: 1, temas: { zodiaco: [{ file: 'images/bosses/reserva/zodiaco-saga2.webp', slug: 'saga2', label: 'Saga 2' }] } }; renderReservaStudio();");
    check('tema sem reserva própria empresta os grupos dos outros temas', $('reserva-grid').querySelectorAll('button').length === 2 && $('reserva-grid').textContent.includes('Saga 2'), $('reserva-grid').querySelectorAll('button').length);
    ev("reservaManifest = JSON.parse(window.__manifestBackup); delete window.__manifestBackup; renderReservaStudio();");
    check('trocar de chefão no select redesenha a grade do estúdio', (ev("selectReservaBoss(BOSSES[3].id)"), ev('reservaBossId')) === ev('BOSSES[3].id') && $('reserva-boss-select').value === ev('BOSSES[3].id'));

    // ============================ CARD DO CHEFÃO ============================
    console.log('\n== UI 12d. Card do Chefão: moldura escalável e brecha tática ==');
    navTo('boss');
    ev('openBossDefeatCard()');
    const canvasCard = $('boss-card-canvas');
    check('canvas do card é 1080×1080 (o botão anuncia o tamanho real)',
        canvasCard.width === 1080 && canvasCard.height === 1080 && /1080×1080/.test(document.body.textContent),
        [canvasCard.width, canvasCard.height]);

    // Gravador de desenho: o ctx padrão do teste engole tudo, então aqui o
    // canvas recebe um ctx que anota fillText/scale/save/restore e devolve um
    // encadeamento vazio para o resto (gradientes, arcos, recortes).
    const chamadasCard = [];
    const noopChain = () => new Proxy(function () { }, { get: (t, k) => (k === 'width' ? 0 : noopChain()), set: () => true, apply: () => noopChain() });
    const alvoCtx = {
        canvas: canvasCard,
        save: () => chamadasCard.push(['save']),
        restore: () => chamadasCard.push(['restore']),
        scale: (x, y) => chamadasCard.push(['scale', x, y]),
        fillText: (t, x, y) => chamadasCard.push(['fillText', String(t), x, y]),
        measureText: t => ({ width: String(t).length * 12 })
    };
    canvasCard.getContext = () => new Proxy(alvoCtx, { get: (t, k) => (k in t ? t[k] : noopChain()), set: () => true });
    ev('generateBossDefeatCard()');

    const escalasCard = chamadasCard.filter(c => c[0] === 'scale');
    check('moldura é escalada para o canvas real (1080/1080 × 1080/1920)',
        escalasCard.some(c => c[1] === 1 && Math.abs(c[2] - 1080 / 1920) < 1e-9), escalasCard.slice(0, 3));
    check('save/restore envolvem a moldura (o resto do card não herda a escala)',
        chamadasCard.some(c => c[0] === 'save') && chamadasCard.some(c => c[0] === 'restore'));
    const textosCard = chamadasCard.filter(c => c[0] === 'fillText').map(c => c[1]);
    const brechasCard = chamadasCard.filter(c => c[0] === 'fillText' && String(c[1]).startsWith('Brecha tática:'));
    check('card desenha a brecha tática do chefão', brechasCard.length > 0, textosCard.slice(0, 5));
    check('brecha cabe em até 2 linhas (782 e 812)', brechasCard.length <= 2 && brechasCard.every(c => c[3] === 782 || c[3] === 812), brechasCard.map(c => c[3]));
    const ysCard = chamadasCard.filter(c => c[0] === 'fillText').map(c => c[3]);
    check('layout reequilibrado: nome 688 · HP 736 · DMG 880 · patente 940 · data 990',
        [688, 736, 880, 940, 990].every(y => ysCard.includes(y)), ysCard);
    check('card continua com título, HP e patente', textosCard.some(t => /CHEFÃO DERROTADO|EM BATALHA/.test(t)) && textosCard.some(t => /HP · fraco a/.test(t)) && textosCard.some(t => /Nível/.test(t)), textosCard.slice(0, 4));
    ev("document.getElementById('boss-card-overlay')?.remove()");

    // ============================ GRADES NO CELULAR ============================
    console.log('\n== UI 12e. Grades estáveis e legíveis no celular ==');
    const appSrcMobile = fs.readFileSync('js/app.js', 'utf8');
    navTo('boss');
    ev('renderBossBattleUI(); renderBadgesAndStreak(); showThemeGallery();');
    const thumbBosses = [...document.querySelectorAll('#bosses-grid img')];
    check('grade de chefões tem retrato nos 12 tiles', thumbBosses.length === 12, thumbBosses.length);
    check('thumbs de chefões nascem com 40×40 intrínseco e não encolhem',
        thumbBosses.every(i => i.getAttribute('width') === '40' && i.getAttribute('height') === '40'
            && /width:40px;height:40px/.test(i.getAttribute('style') || '') && i.className.includes('shrink-0')),
        (thumbBosses[0] || {}).outerHTML);
    const cardHTML = ($('active-boss-card') || {}).innerHTML || '';
    check('cabeçalho do card do chefão quebra em tela estreita e não corta a meta',
        /flex-wrap/.test(cardHTML) && /whitespace-nowrap/.test(cardHTML), (cardHTML.match(/<span class="flex[^>]*>/) || [])[0]);
    check('nome, descrição, brecha e fraqueza do chefão quebram palavra por palavra',
        /leading-tight break-words/.test(cardHTML) && (cardHTML.match(/break-words/g) || []).length >= 3
        && /text-\[11px\][^"]*break-words/.test(cardHTML), (cardHTML.match(/break-words/g) || []).length);
    check('descrições do card e dos tiles em 11px (10px some no celular)', (cardHTML.match(/text-\[11px\]/g) || []).length >= 3
        && !/text-\[9px\]/.test(appSrcMobile));
    const imgsGaleria = [...document.querySelectorAll('#theme-gallery-overlay img')];
    check('galeria de temas renderiza ícones e emblemas de patente', imgsGaleria.length >= 20, imgsGaleria.length);
    check('ícones de tema e emblemas têm largura/altura intrínsecas (sem pulo da grade)',
        imgsGaleria.every(i => /^\d+$/.test(i.getAttribute('width') || '') && Number(i.getAttribute('width')) > 0
            && new RegExp(`width:${i.getAttribute('width')}px;height:${i.getAttribute('width')}px`).test(i.getAttribute('style') || '')
            && i.className.includes('shrink-0') && i.getAttribute('loading') === 'lazy'),
        imgsGaleria.slice(0, 2).map(i => i.outerHTML.slice(0, 140)));
    const imgsBadges = [...document.querySelectorAll('#badges-grid img')];
    check('arte das conquistas tem 48×48 fixo e não encolhe',
        imgsBadges.length === 16 && imgsBadges.every(i => i.getAttribute('width') === '48' && i.getAttribute('height') === '48'
            && /width:48px;height:48px/.test(i.getAttribute('style') || '') && i.className.includes('shrink-0')),
        (imgsBadges[0] || {}).outerHTML);
    check('rótulos dos tiles de reserva legíveis (10px) e arte com tamanho fixo',
        /block truncate text-\[10px\][^"]*leading-tight/.test(appSrcMobile)
        && /width="40" height="40"[^>]*shrink-0/.test(appSrcMobile));
    ev('closeTopOverlay();');

    // ============================ BACKUP PONTA A PONTA ============================
    console.log('\n== UI 12b. Backup: exportar → apagar → importar → comparar ==');
    const logsIDsAntes = ev('JSON.stringify(logs.map(l => l.id))');
    const settingsAntes = ev('JSON.stringify(settings)');
    const treinosAntes = ev('JSON.stringify(savedWorkouts.map(w => w.id || w.name))');
    check('há dados do seed para o teste de backup', ev('logs.length') > 0 && ev('savedWorkouts.length') > 0);
    const payloadStr = await ev('buildBackupPayload().then(p => JSON.stringify(p))');
    const payload = JSON.parse(payloadStr);
    check('backup contém logs, treinos, configurações e tema',
        Array.isArray(payload.logs) && payload.logs.length === ev('logs.length')
        && Array.isArray(payload.savedWorkouts) && payload.settings && !!payload.gameTheme, { v: payload.version, logs: payload.logs && payload.logs.length });
    check('backup sem base64 de retrato no save (marcadores idb: ou arte padrão)',
        Object.values((payload.themeGameSaves && payload.themeGameSaves.classico && payload.themeGameSaves.classico.bossPortraits) || {}).every(v => typeof v === 'string' && !v.startsWith('data:')));
    // simula a perda total: estado em memória zerado e localStorage esvaziado
    ev('logs = []; savedWorkouts = []; settings = { weeklyGoal: 3, restDefault: 90, barWeight: DEFAULT_BAR_WEIGHT, sledWeight: DEFAULT_SLED_WEIGHT }; themeGameSaves = {};');
    window.localStorage.clear();
    const restaurou = await ev(`applyImportedBackup(JSON.parse(${JSON.stringify(payloadStr)}))`);
    check('importação do backup conclui', restaurou === true);
    check('logs restaurados idênticos (ids na mesma ordem)', ev('JSON.stringify(logs.map(l => l.id))') === logsIDsAntes);
    check('configurações restauradas idênticas', ev('JSON.stringify(settings)') === settingsAntes);
    check('treinos salvos restaurados idênticos', ev('JSON.stringify(savedWorkouts.map(w => w.id || w.name))') === treinosAntes);
    check('estado do jogo restaurado (saves por tema recriados)', ev("Object.keys(themeGameSaves).length") === Object.keys(payload.themeGameSaves || {}).length);

    // ============================ CONSOLE ============================
    console.log('\n== UI 12. Console limpo ==');
    const graves = jsErrors.filter(m => !/Not implemented|Could not load|serviceWorker|HTMLCanvasElement/i.test(m));
    check('nenhum erro não capturado', graves.length === 0, graves.slice(0, 3));

    console.log('\n' + (failures === 0 ? '✅ SMOKE TEST DE UI PASSOU' : `❌ ${failures} FALHA(S) DE UI`));
    process.exit(failures === 0 ? 0 : 1);
})();
