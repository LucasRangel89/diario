/* ============================================================
   BOOT, LIGHTBOX, OVERLAYS E NAVEGAÇÃO
   ------------------------------------------------------------
   Trecho de test_ui.js, movido sem alterar a lógica dos testes.
   Avaliado pelo runner no MESMO escopo dos demais trechos (ordem do nome).
   ============================================================ */

console.log('\n== UI 1. Boot ==');
let bootOk = true, bootErr = '';
try { window.onload(); } catch (e) { bootOk = false; bootErr = e.message; }
check('window.onload() roda sem erro', bootOk, bootErr);
check('data de hoje no formulário', $('log-date').value === ev('getTodayLocalISO()'));
check('aba Buscar aparece no grupo Treino', !!$('tab-content-busca') && !!$('nav-busca') && !$('nav-subnav').classList.contains('hidden'));
check('navegação tem exatamente quatro grupos, sem trilho horizontal', ['treino', 'jogo', 'voce', 'config'].every(g => !!$(`nav-group-${g}`)) && $('nav-groups').children.length === 4 && !$('group-navigation').className.includes('overflow-x-auto'));
check('cabeçalho compacto contém título, tema, data e XP', !!$('header-theme-button') && !!$('header-today-date') && !!$('header-xp-display') && document.querySelector('header').querySelectorAll('h1').length === 1);
check('data curta e XP atualizados no cabeçalho', /^\d{2}\/\d{2}$/.test($('header-today-date').textContent) && $('header-xp-display').textContent.endsWith(' XP'));
check('Perfil Global soma o XP dos doze temas', !!$('global-profile-xp') && $('global-profile-xp').textContent === `${ev('fmtN(getGlobalXPTotal())')} XP`);
navTo('boss');
check('grupo Jogo preserva Boss e Story Card', !$('tab-content-boss').classList.contains('hidden') && !!$('nav-boss') && !!$('nav-story'));
check('Boss mostra a fraqueza semanal dinâmica e o multiplicador dobrado', $('active-boss-card').textContent.includes('Fraqueza da semana') && $('active-boss-card').textContent.includes('×2'));
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
check('registro rápido aparece antes dos painéis longos (sessão ativa primeiro)', $('tab-content-diario').firstElementChild.id === 'active-session-card' && $('tab-content-diario').children[1].id === 'form-card-container');
check('mapa de prontidão e cardio ficam recolhidos por padrão (details sem open)', $('tab-content-diario').querySelector('details:not(#cardio-details) > summary') !== null && !$('tab-content-diario').querySelector('details:not(#cardio-details)').hasAttribute('open') && !$('cardio-details').hasAttribute('open'));
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
check('paleta, moldura e fontes estão vinculadas aos doze temas', ev("Object.keys(THEMES).length === 12 && Object.keys(THEMES).every(id => STORY_CARD_STYLES[id] && STORY_CARD_STYLES[id].palette && STORY_CARD_STYLES[id].fonts && THEME_ICONS[id])") && /THEME\.frame/.test(fonteJs()));
let legacyStoryStyleIgnored = true;
try { ev("safeStorage.set(STORAGE_KEY_STORY, JSON.stringify({ selectedStoryTheme: 'cyberpunk' })); loadStoredData(); generateStoryCard();"); } catch (e) { legacyStoryStyleIgnored = false; }
check('estilo legado salvo é ignorado sem erro', legacyStoryStyleIgnored);
check('selo do tema usa a arte própria (não emoji)', !!$('story-theme-icon').querySelector('img'));
check('emblema de patente aponta para a arte do tema e nível certos', ev("rankEmblemSrc('aneis',10)") === 'images/patentes/aneis-10.webp' && ev("rankEmblemSrc('zodiaco',1)") === 'images/patentes/zodiaco-01.webp' && ev("rankEmblemSrc('tema-inexistente',3)") === 'images/patentes/classico-03.webp');
check('arte própria dos 12 temas tem ícone e fundo de card', ev("THEME_IDS_LIST.every(id => !!THEME_ICON_IMGS[id] && !!THEME_CARD_BGS[id])") && ev("THEME_IDS_LIST.length") === 12);
check('Story Card mostra o tema de jogo atual', $('story-theme-name').textContent === ev('THEME.name') && $('story-theme-icon').querySelector('img').getAttribute('src') === 'images/temas/classico.webp');
click($('header-theme-button'));
ev("showRanksModal('classico');");
check('modal de patentes mostra os dez emblemas próprios', ($('ranks-overlay')?.querySelectorAll('img')?.length || 0) >= 10 && $('ranks-overlay').innerHTML.includes('images/patentes/classico-10.webp'));
ev("document.getElementById('ranks-overlay')?.remove();");
check('botão do tema abre doze cartões com ícone, patente e progresso', !!$('theme-gallery-overlay') && $('theme-gallery-overlay').querySelectorAll('[data-theme-id]').length === 12 && $('theme-gallery-overlay').textContent.includes('Patente global') && $('theme-gallery-overlay').textContent.includes('chefões'));
const galleryIds = ev('THEME_IDS_LIST');
const galleryEmblemSrc = id => ev(`rankEmblemSrc('${id}', rankFromXP(computeGlobalXPCtx().xp, themeRankList(THEMES['${id}'])).level)`);
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
check('Boss do Senhor dos Anéis mostra fraqueza semanal dinâmica', $('active-boss-card').textContent.includes('Goblins de Moria') && $('active-boss-card').textContent.includes('Fraqueza da semana') && $('active-boss-card').textContent.includes('×2'));
navTo('story');
check('Story Card segue o tema Senhor dos Anéis', $('story-theme-name').textContent === 'Senhor dos Anéis' && $('story-theme-icon').querySelector('img').getAttribute('src') === 'images/temas/aneis.webp');
ev("changeGameTheme('classico');");
check('histórico renderizado', !!$('history-content'));
check('CSV multi-aba: Log com 22 colunas v1 + 6 do formato 2 + PR informativo (parser com aspas)', (() => { const r = ev("parseCSVRows(buildPlanilhaCSV().split(/--- Sheet: Log ---/)[1].split(/--- Sheet:/)[0].trim(), ';')"); return r[0].length === 29 && r[1].length === 29; })());
check('todos os 144 chefões têm retrato padrão (Ação, Anéis, ThunderCats e Office inclusive)', ev("Object.keys(THEMES).every(id => THEMES[id].bosses.every(b => !!DEFAULT_BOSS_PORTRAITS[id + ':' + b.id]))"));
check('molduras temáticas (runas/espacial) no código', /frame === 'runas'/.test(fonteJs()) && /frame === 'espacial'/.test(fonteJs()));
const appSrcFrames = fonteJs();
check('molduras de ferro (clássico) e de anel (Senhor dos Anéis) desenhadas à mão', /frame === 'ferro'/.test(appSrcFrames) && /frame === 'anel'/.test(appSrcFrames));
check('clássico usa ferro e Anéis não divide mais o ouro do Zodíaco', ev("THEMES.classico.frame === 'ferro' && THEMES.aneis.frame === 'anel' && THEMES.zodiaco.frame === 'ouro'"));
check('nenhum tema cai no else genérico de drawThemedFrame', ev("[...new Set(Object.values(THEMES).map(t => t.frame))]").every(f => new RegExp(`frame === '${f}'`).test(appSrcFrames)), ev("[...new Set(Object.values(THEMES).map(t => t.frame))]"));
check('moldura de ferro traz rebites e corrente; a de anel traz o Um Anel gravado', /rebites/.test(appSrcFrames) && /corrente/.test(appSrcFrames) && /Um Anel/.test(appSrcFrames));
let framesOk = true, framesErr = '';
try {
    ev("openBossDefeatCard(); window.__themeBackup = THEME; THEME_IDS_LIST.forEach(id => { THEME = THEMES[id]; drawThemedFrame(document.getElementById('story-canvas').getContext('2d'), STORY_CARD_STYLES[id].palette); drawThemedFrame(document.getElementById('boss-card-canvas').getContext('2d'), { borderPrimary: '#dc2626' }); }); generateStoryCard(); generateBossDefeatCard(); THEME = window.__themeBackup; delete window.__themeBackup; document.getElementById('boss-card-overlay')?.remove();");
} catch (e) { framesOk = false; framesErr = e.message; }
check('as doze molduras desenham sem erro (story card + card do chefão)', framesOk && !!ev('THEME'), framesErr);

// ============================ LIGHTBOX DOS CHEFÕES ============================
console.log('\n== UI 1b. Lightbox dos chefões ==');
const key = k => document.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
navTo('boss');
const lbOverlay = () => $('boss-lightbox-overlay');
const lbCard = id => $('bosses-grid').querySelector(`[data-boss-id="${id}"]`);
const lbImg = () => lbOverlay() && lbOverlay().querySelector('#boss-lightbox-img');
const lbDownload = () => lbOverlay() && lbOverlay().querySelector('#boss-lightbox-download');
check('lightbox não existe antes do clique', !lbOverlay());
check('os 12 cards da grade são clicáveis e trazem o id do chefão', $('bosses-grid').querySelectorAll('[data-boss-id]').length === 12 && $('bosses-grid').querySelectorAll('[data-action="openBossLightbox"]').length === 12);
check('miniaturas da grade carregam de forma preguiçosa (lazy + async)', [...$('bosses-grid').querySelectorAll('img')].length === 12 && [...$('bosses-grid').querySelectorAll('img')].every(i => i.getAttribute('loading') === 'lazy' && i.getAttribute('decoding') === 'async'));
const idxAtual = ev('computeBossProgress(logsForTheme(activeGameThemeId), userBodyweight, BOSSES).currentIdx');
const retratoAtivo = $('active-boss-card').querySelector('button[data-action="openBossLightbox"]');
check('retrato do chefão ativo (w-20) também é clicável e aponta para o boss em batalha', !!retratoAtivo && retratoAtivo.className.includes('w-20') && JSON.parse(retratoAtivo.getAttribute('data-args'))[0] === ev('BOSSES[' + idxAtual + '].id'), retratoAtivo && retratoAtivo.getAttribute('data-args'));

const bossAlvo = ev('BOSSES[5].id');
click(lbCard(bossAlvo));
check('clicar no card abre o modal', !!lbOverlay() && lbOverlay().className.includes('z-[60]') && lbOverlay().className.includes('bg-black/80') && lbOverlay().className.includes('backdrop-blur-sm'));
check('arte grande vem do retrato padrão; a pixel art clássica mantém interpolação pixelada', !!lbImg() && lbImg().getAttribute('src') === ev(`DEFAULT_BOSS_PORTRAITS['${ev('activeGameThemeId')}:' + '${bossAlvo}']`) && lbImg().getAttribute('style').includes('image-rendering:pixelated'), lbImg() && lbImg().getAttribute('src'));
check('nome do chefão no cabeçalho do modal', $('boss-lightbox-name').textContent === ev(`BOSSES[5].name`));
check('status do combate no modal (DERROTADO/EM BATALHA/BLOQUEADO)', /DERROTADO 🏆|EM BATALHA ⚔️|BLOQUEADO 🔒/.test($('boss-lightbox-status').textContent));
check('modal traz HP máximo, fraqueza semanal dinâmica, brecha temática e XP de recompensa', lbOverlay().textContent.includes(ev('fmtN(BOSSES[5].maxHp)') + ' HP') && lbOverlay().textContent.includes('Fraqueza semanal ×2') && lbOverlay().textContent.includes(ev('BOSSES[5].weakReason')) && lbOverlay().textContent.includes('+' + ev('fmtN(bossRewardXP(BOSSES[5]))') + ' XP'));
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

const retratosZodiaco = [
    'mu-de-aries.webp', 'aldebaran-de-touro.webp', 'saga-de-gemeos.webp',
    'mascara-da-morte-de-cancer.webp', 'aiolia-de-leao.webp', 'shaka-de-virgem.webp',
    'dohko-de-libra.webp', 'milo-de-escorpiao.webp', 'aiolos-de-sagitario.webp',
    'shura-de-capricornio.webp', 'camus-de-aquario.webp', 'grande-mestre.webp'
].map(nome => `images/bosses/${nome}`);
check('tema Zodíaco aponta os 12 Bosses para as imagens anexadas',
    retratosZodiaco.every((src, i) => ev(`DEFAULT_BOSS_PORTRAITS['zodiaco:b${i}']`) === src), retratosZodiaco);
ev("changeGameTheme('zodiaco');");
navTo('boss');
const retratosZodNaGrade = [...$('bosses-grid').querySelectorAll('img')];
check('retratos do Zodíaco aparecem sem interpolação pixelada na grade',
    retratosZodNaGrade.length === 12 && retratosZodNaGrade.every(img => !img.getAttribute('style').includes('pixelated')));
const retratoZodAtivo = $('active-boss-card').querySelector('img');
check('retrato ativo do Zodíaco também é exibido sem pixelização', !!retratoZodAtivo && !retratoZodAtivo.getAttribute('style').includes('pixelated'));
ev("openBossLightbox(BOSSES[0].id);");
check('lightbox do Zodíaco mantém a imagem sem pixelização', !!lbImg() && !lbImg().getAttribute('style').includes('pixelated'));
const retratoZodPadrao = document.querySelector('#reserva-grid [data-action="resetBossPortraitToDefault"] img');
check('tile padrão do Estúdio mantém o retrato do Zodíaco sem pixelização', !!retratoZodPadrao && !retratoZodPadrao.getAttribute('style').includes('pixelated'));
ev("closeBossLightbox(); changeGameTheme('classico');");
navTo('boss');

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
const appSrcEsc = fonteJs();
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