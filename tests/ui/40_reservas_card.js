/* ============================================================
   ESTÚDIO DE RESERVAS, CARD DO CHEFÃO E GRADES DO CELULAR
   ------------------------------------------------------------
   Trecho de test_ui.js, movido sem alterar a lógica dos testes.
   Avaliado pelo runner no MESMO escopo dos demais trechos (ordem do nome).
   ============================================================ */

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
    check('tile da reserva ativa fica destacado', [...$('reserva-grid').querySelectorAll('button')].some(b => b.getAttribute('data-action') === 'applyReservaPortrait' && JSON.parse(b.getAttribute('data-args') || '[]')[0] === alvo && b.className.includes('ring-1')));
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