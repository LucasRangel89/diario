/* ============================================================
   CARTÕES — Story Card do treino e Card do Chefão derrotado
   ------------------------------------------------------------
   Canvas + arte temática que estavam no meio de js/app.js:
   helpers de imagem (medidas, emblemas, retratos), moldura temática
   e os dois cards gerados em canvas (treino e vitória sobre o chefão).

   Dividido de js/app.js na refatoração R2 — as funções foram movidas
   sem alterar uma linha de lógica (mesmos corpos, mesmos nomes).
   Recebe do app o estado que só lê (tema ativo, logs, chefões,
   retratos, missões) por import; quem escreve estado continua no app.
   ============================================================ */

import { computeBossProgress, rankFromXP } from './gamificacao.js';
import { formatLoadText, formatRepsText } from './catalogo.js';
import { BOSSES, STORY_CARD_STYLES, TAILWIND_SPACING_PX, THEME, THEME_CARD_BGS, THEME_ICONS, THEME_ICON_IMGS, _cardImgCache, activeGameThemeId, bossPortraitSrc, computeXPCtx, customBgImageData, fmtN, getAnimalRankForSession, getBossImg, getTodayLocalISO, logsForTheme, themeGameSaves, userBodyweight } from './app.js';
// O Story Card e o Card do Chefão escrevem em Oswald/Teko/Inter. Se o webfont
// ainda está baixando, o primeiro traço sai com a fonte de fallback do sistema.
// document.fonts.ready resolve UMA vez quando o loading termina, então agendar
// um único redraw aqui não entra em loop com os onload de imagem já existentes.
// (R2: veio do js/app.js, que só lê esta flag; quem escreve é este módulo.)
let _fontsRedrawScheduled = false;


function imgSizeAttrs(cls, fallback = 24) {
    const m = /(?:^|\s)[wh]-(\d+)(?=\s|$)/.exec(String(cls || ''));
    const px = (m && TAILWIND_SPACING_PX[Number(m[1])]) || fallback;
    return `width="${px}" height="${px}" style="width:${px}px;height:${px}px"`;
}
function themeIconImg(themeId, cls = 'h-6 w-6 rounded-md') {
    const src = THEME_ICON_IMGS[themeId];
    return src ? `<img src="${src}" alt="" ${imgSizeAttrs(cls)} loading="lazy" decoding="async" class="shrink-0 ${cls}">` : `<span class="text-2xl shrink-0">${THEME_ICONS[themeId] || '🎭'}</span>`;
}


// Emblema de patente desenhado em arte própria (círculo de ferro + símbolo).
function rankEmblemSrc(themeId, level) {
    const t = THEME_ICON_IMGS[themeId] ? themeId : 'classico';
    const lvl = Math.min(10, Math.max(1, Number(level) || 1));
    return `images/patentes/${t}-${String(lvl).padStart(2, '0')}.webp`;
}
function rankEmblemImg(themeId, level, cls = 'h-7 w-7 rounded-full') {
    return `<img src="${rankEmblemSrc(themeId, level)}" alt="" ${imgSizeAttrs(cls, 28)} loading="lazy" decoding="async" class="shrink-0 ${cls}">`;
}
function getCardImg(src) {
    if (!src) return null;
    if (_cardImgCache[src]) return _cardImgCache[src];
    const img = new Image();
    img.src = src;
    _cardImgCache[src] = img;
    return img;
}
function drawCoverImg(ctx, img, w, h) {
    // Desenha preenchendo o quadro mantendo o enquadramento (crop central).
    const iw = img.naturalWidth, ih = img.naturalHeight;
    if (!iw || !ih) return false;
    const scale = Math.max(w / iw, h / ih);
    const dw = iw * scale, dh = ih * scale;
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    return true;
}
function wrapCanvasText(ctx, texto, maxLargura, maxLinhas) {
    const palavras = String(texto ?? '').split(/\s+/).filter(Boolean);
    const limiteLinhas = Math.max(1, Number(maxLinhas) || 1);
    if (!palavras.length) return [];
    const largura = s => {
        if (!ctx || typeof ctx.measureText !== 'function') return 0;
        let n;
        try { n = Number(ctx.measureText(s)?.width); } catch (e) { return 0; }
        return Number.isFinite(n) ? n : 0;
    };
    const limite = Number(maxLargura) > 0 ? Number(maxLargura) : Infinity;
    const linhas = [];
    let atual = '';
    let i = 0;
    while (i < palavras.length) {
        const candidata = atual ? `${atual} ${palavras[i]}` : palavras[i];
        // A primeira palavra entra sempre, mesmo maior que o limite (senão o
        // laço não anda).
        if (!atual || largura(candidata) <= limite) { atual = candidata; i++; continue; }
        if (linhas.length + 1 >= limiteLinhas) break;   // não há próxima linha: o resto vira "…"
        linhas.push(atual);
        atual = '';
    }
    if (i < palavras.length) {
        let corte = atual;
        while (corte && largura(`${corte}…`) > limite) corte = corte.slice(0, -1).replace(/\s+$/, '');
        atual = `${corte}…`;
    }
    if (atual) linhas.push(atual);
    return linhas.slice(0, limiteLinhas);
}


// A arte da moldura é desenhada num quadro de referência 1080×1920 (o formato
// do Story Card). drawThemedFrame escala esse desenho para o canvas real, senão
// o Card do Chefão (1080×1080) perdia três lados da moldura — o traço caía
// fora da área visível e o card saía "sem tema".
// Medida numérica defensiva: canvas sem implementação (teste de UI) pode
// devolver objeto no lugar de número — e a moldura não pode quebrar por isso.
function canvasMeasure(v, fallback) {
    let n;
    try { n = Number(v); } catch (e) { return fallback; }
    return Number.isFinite(n) && n > 0 ? n : fallback;
}
function drawThemedFrame(ctx, palette) {
    const W = canvasMeasure(ctx && ctx.canvas && ctx.canvas.width, 1080);
    const H = canvasMeasure(ctx && ctx.canvas && ctx.canvas.height, 1920);
    ctx.save();
    ctx.scale(W / 1080, H / 1920);
    drawThemedFrameArt(ctx, palette);
    ctx.restore();
}
function drawThemedFrameArt(ctx, palette) {
    // Moldura acompanhando o tema de gamificação
    const frame = (THEME && THEME.frame) || 'ferro';
    if (frame === 'ouro') {
        const g = ctx.createLinearGradient(0, 0, 1080, 1920);
        g.addColorStop(0, '#7a5c1e'); g.addColorStop(0.5, '#f5d67a'); g.addColorStop(1, '#8a6a20');
        ctx.strokeStyle = g; ctx.lineWidth = 18; ctx.strokeRect(22, 22, 1036, 1876);
        ctx.strokeStyle = '#f8e7b0'; ctx.lineWidth = 3; ctx.strokeRect(48, 48, 984, 1824);
        // ornamentos de canto
        [[70, 70], [1010, 70], [70, 1850], [1010, 1850]].forEach(([x, y]) => {
            ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4);
            ctx.fillStyle = '#f5d67a'; ctx.fillRect(-14, -14, 28, 28);
            ctx.restore();
        });
    } else if (frame === 'marmore') {
        ctx.strokeStyle = '#d9d2c5'; ctx.lineWidth = 22; ctx.strokeRect(20, 20, 1040, 1880);
        ctx.strokeStyle = '#8f877a'; ctx.lineWidth = 2; ctx.strokeRect(38, 38, 1004, 1844);
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.strokeStyle = '#6b6156'; ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
            ctx.beginPath();
            const y0 = 120 + i * 230;
            ctx.moveTo(30, y0);
            ctx.bezierCurveTo(300, y0 - 40, 700, y0 + 60, 1050, y0 - 20);
            ctx.stroke();
        }
        ctx.restore();
    } else if (frame === 'neon') {
        ctx.shadowColor = '#00ffcc'; ctx.shadowBlur = 28;
        ctx.strokeStyle = '#00ffcc'; ctx.lineWidth = 6; ctx.strokeRect(28, 28, 1024, 1864);
        ctx.shadowColor = '#ff0055';
        ctx.strokeStyle = '#ff0055'; ctx.lineWidth = 3; ctx.strokeRect(48, 48, 984, 1824);
        ctx.shadowBlur = 0;
    } else if (frame === 'madeira') {
        // Folclore Brasileiro: moldura de madeira entalhada com tachas douradas
        const g = ctx.createLinearGradient(0, 0, 1080, 1920);
        g.addColorStop(0, '#3e2510'); g.addColorStop(0.5, '#8a5a28'); g.addColorStop(1, '#3e2510');
        ctx.strokeStyle = g; ctx.lineWidth = 20; ctx.strokeRect(21, 21, 1038, 1878);
        ctx.strokeStyle = '#d9a441'; ctx.lineWidth = 3; ctx.strokeRect(44, 44, 992, 1832);
        [[64, 64], [1016, 64], [64, 1856], [1016, 1856]].forEach(([x, y]) => {
            ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2);
            ctx.fillStyle = '#d9a441'; ctx.fill();
            ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2);
            ctx.fillStyle = '#6b431c'; ctx.fill();
        });
    } else if (frame === 'runas') {
        // Nórdica: moldura de pedra gelada com runas gravadas
        const g = ctx.createLinearGradient(0, 0, 1080, 1920);
        g.addColorStop(0, '#16202e'); g.addColorStop(0.5, '#5c7285'); g.addColorStop(1, '#16202e');
        ctx.strokeStyle = g; ctx.lineWidth = 18; ctx.strokeRect(22, 22, 1036, 1876);
        ctx.strokeStyle = '#a8d8e8'; ctx.lineWidth = 2; ctx.strokeRect(46, 46, 988, 1828);
        ctx.save();
        ctx.strokeStyle = '#a8d8e8'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        // runas geométricas (ᚠ-like: haste + traços) ao longo das laterais
        for (let y = 160; y < 1800; y += 170) {
            [[34, y], [1046, y]].forEach(([x, ry]) => {
                ctx.beginPath();
                ctx.moveTo(x, ry - 22); ctx.lineTo(x, ry + 22);
                ctx.moveTo(x, ry - 10); ctx.lineTo(x + 12, ry - 22);
                ctx.moveTo(x, ry + 6); ctx.lineTo(x + 12, ry + 18);
                ctx.stroke();
            });
        }
        ctx.restore();
    } else if (frame === 'louros') {
        // Roma: moldura dourada com louros nos cantos
        const g = ctx.createLinearGradient(0, 0, 1080, 1920);
        g.addColorStop(0, '#7a5c1e'); g.addColorStop(0.5, '#e8c86a'); g.addColorStop(1, '#7a5c1e');
        ctx.strokeStyle = g; ctx.lineWidth = 14; ctx.strokeRect(24, 24, 1032, 1872);
        ctx.strokeStyle = '#8a2c2c'; ctx.lineWidth = 2; ctx.strokeRect(46, 46, 988, 1828);
        ctx.save();
        ctx.fillStyle = '#e8c86a';
        // folhas de louro em arcos nos 4 cantos
        [[70, 70, 1], [1010, 70, -1], [70, 1850, 1], [1010, 1850, -1]].forEach(([x, y, dir]) => {
            for (let i = 0; i < 5; i++) {
                const a = (i / 5) * Math.PI / 2;
                const lx = x + dir * Math.cos(a) * 46, ly = y + Math.sin(a) * 46 * (y < 960 ? 1 : -1);
                ctx.save(); ctx.translate(lx, ly); ctx.rotate(a * dir);
                ctx.beginPath(); ctx.ellipse(0, 0, 12, 5, 0, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            }
            ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
        });
        ctx.restore();
    } else if (frame === 'brasao') {
        // RPG: brasão heráldico — borda dupla vermelha/dourada + escudo no topo
        ctx.strokeStyle = '#8a2c2c'; ctx.lineWidth = 16; ctx.strokeRect(24, 24, 1032, 1872);
        ctx.strokeStyle = '#e8c86a'; ctx.lineWidth = 3; ctx.strokeRect(48, 48, 984, 1824);
        // escudo central do topo
        ctx.save();
        ctx.translate(540, 96);
        ctx.beginPath();
        ctx.moveTo(-34, -34); ctx.lineTo(34, -34); ctx.lineTo(34, 10);
        ctx.quadraticCurveTo(34, 44, 0, 58); ctx.quadraticCurveTo(-34, 44, -34, 10);
        ctx.closePath();
        ctx.fillStyle = '#8a2c2c'; ctx.fill();
        ctx.strokeStyle = '#e8c86a'; ctx.lineWidth = 3; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-34, -12); ctx.lineTo(34, -12); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -34); ctx.lineTo(0, 58); ctx.stroke();
        ctx.restore();
        // losangos nos cantos
        [[64, 64], [1016, 64], [64, 1856], [1016, 1856]].forEach(([x, y]) => {
            ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4);
            ctx.fillStyle = '#e8c86a'; ctx.fillRect(-10, -10, 20, 20);
            ctx.fillStyle = '#8a2c2c'; ctx.fillRect(-5, -5, 10, 10);
            ctx.restore();
        });
    } else if (frame === 'espacial') {
        // Galáctica: moldura espacial com estrelas e circuito luminoso
        const g = ctx.createLinearGradient(0, 0, 1080, 1920);
        g.addColorStop(0, '#0b1030'); g.addColorStop(0.5, '#2a3a8a'); g.addColorStop(1, '#0b1030');
        ctx.strokeStyle = g; ctx.lineWidth = 18; ctx.strokeRect(22, 22, 1036, 1876);
        ctx.shadowColor = '#66e0ff'; ctx.shadowBlur = 12;
        ctx.strokeStyle = '#66e0ff'; ctx.lineWidth = 2; ctx.strokeRect(46, 46, 988, 1828);
        ctx.shadowBlur = 0;
        // estrelas na moldura
        for (let i = 0; i < 42; i++) {
            const edge = i % 4;
            const t = ((i * 97) % 100) / 100;
            let x, y;
            if (edge === 0) { x = 30 + t * 1020; y = 30; }
            else if (edge === 1) { x = 30 + t * 1020; y = 1888; }
            else if (edge === 2) { x = 30; y = 30 + t * 1858; }
            else { x = 1050; y = 30 + t * 1858; }
            const r = 1 + ((i * 13) % 3);
            ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fillStyle = i % 3 ? '#9ad8ff' : '#ffffff'; ctx.fill();
        }
    } else if (frame === 'anel') {
        // Senhor dos Anéis: ouro envelhecido com o Um Anel gravado no topo,
        // a inscrição da Língua Negra correndo pelas laterais e a brasa de
        // Orodruin fechando a base. (Antes dividia a moldura 'ouro' do Zodíaco.)
        const g = ctx.createLinearGradient(0, 0, 1080, 1920);
        g.addColorStop(0, '#4a3a12'); g.addColorStop(0.5, '#c9a227'); g.addColorStop(1, '#4a3a12');
        ctx.strokeStyle = g; ctx.lineWidth = 16; ctx.strokeRect(24, 24, 1032, 1872);
        ctx.strokeStyle = '#2b2110'; ctx.lineWidth = 2; ctx.strokeRect(44, 44, 992, 1832);
        // o Um Anel: aro duplo com a inscrição gravada entre os dois círculos
        ctx.save();
        ctx.translate(540, 92);
        ctx.strokeStyle = '#e2c46e'; ctx.lineWidth = 7;
        ctx.beginPath(); ctx.arc(0, 0, 46, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#8a6a20'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, 33, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#f0d98a'; ctx.lineWidth = 2; ctx.lineCap = 'round';
        for (let i = 0; i < 20; i++) {
            const a = (i / 20) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * 35, Math.sin(a) * 35);
            ctx.lineTo(Math.cos(a) * 44, Math.sin(a) * 44);
            ctx.stroke();
        }
        ctx.restore();
        // inscrição gravada nas laterais (glifos ondulados, traço fino)
        ctx.save();
        ctx.strokeStyle = '#c9a227'; ctx.lineWidth = 2; ctx.lineCap = 'round';
        for (let y = 200; y < 1800; y += 74) {
            [[34, y], [1046, y]].forEach(([x, ry]) => {
                ctx.beginPath();
                ctx.moveTo(x - 6, ry);
                ctx.quadraticCurveTo(x, ry - 9, x + 6, ry);
                ctx.quadraticCurveTo(x, ry + 9, x - 6, ry);
                ctx.stroke();
            });
        }
        ctx.restore();
        // anéis menores nos cantos e brasa do Monte da Perdição na base
        [[64, 64], [1016, 64], [64, 1856], [1016, 1856]].forEach(([x, y]) => {
            ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2);
            ctx.strokeStyle = '#e2c46e'; ctx.lineWidth = 4; ctx.stroke();
            ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#8a2c2c'; ctx.fill();
        });
        ctx.save();
        ctx.shadowColor = '#ff4500'; ctx.shadowBlur = 26;
        ctx.strokeStyle = '#c2410c'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(60, 1886); ctx.lineTo(1020, 1886); ctx.stroke();
        ctx.restore();
    } else if (frame === 'ferro') {
        // Berzerker (clássico): ferro forjado rebitado, com corrente nos cantos
        // e sangria carmesim por dentro da ferragem. Antes caía no else genérico.
        const g = ctx.createLinearGradient(0, 0, 1080, 1920);
        g.addColorStop(0, '#161618'); g.addColorStop(0.35, '#4c4c52'); g.addColorStop(0.65, '#3a3a3f'); g.addColorStop(1, '#161618');
        ctx.strokeStyle = g; ctx.lineWidth = 24; ctx.strokeRect(19, 19, 1042, 1882);
        ctx.strokeStyle = '#7f1d1d'; ctx.lineWidth = 5; ctx.strokeRect(38, 38, 1004, 1844);
        ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 2; ctx.strokeRect(48, 48, 984, 1824);
        // rebites ao longo dos quatro lados (esfera + ponto de luz)
        ctx.save();
        for (let i = 0; i < 26; i++) {
            const t = i / 25;
            [[31 + t * 1018, 31], [31 + t * 1018, 1889], [31, 31 + t * 1858], [1049, 31 + t * 1858]].forEach(([x, y]) => {
                ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2);
                ctx.fillStyle = '#5f5f66'; ctx.fill();
                ctx.beginPath(); ctx.arc(x - 2, y - 2, 2.5, 0, Math.PI * 2);
                ctx.fillStyle = '#a3a3ab'; ctx.fill();
            });
        }
        ctx.restore();
        // elos de corrente saindo dos quatro cantos
        ctx.save();
        ctx.strokeStyle = '#8a1f1f'; ctx.lineWidth = 4;
        [[68, 68, 1, 1], [1012, 68, -1, 1], [68, 1852, 1, -1], [1012, 1852, -1, -1]].forEach(([x, y, dx, dy]) => {
            for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                ctx.ellipse(x + dx * i * 20, y + dy * i * 20, 11, 6, dx === dy ? Math.PI / 4 : -Math.PI / 4, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2);
            ctx.fillStyle = '#2a2a2e'; ctx.fill();
            ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 2; ctx.stroke();
            ctx.strokeStyle = '#8a1f1f'; ctx.lineWidth = 4;
        });
        ctx.restore();
    } else if (frame === 'garra') {
        // ThunderCats: ferro escuro com filete vermelho e marcas de garra nos cantos
        const g = ctx.createLinearGradient(0, 0, 1080, 1920);
        g.addColorStop(0, '#171114'); g.addColorStop(0.5, '#4a2326'); g.addColorStop(1, '#171114');
        ctx.strokeStyle = g; ctx.lineWidth = 20; ctx.strokeRect(21, 21, 1038, 1878);
        ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 3; ctx.strokeRect(46, 46, 988, 1828);
        ctx.save();
        ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 5; ctx.lineCap = 'round';
        [[84, 84, 1, 1], [996, 84, -1, 1], [84, 1836, 1, -1], [996, 1836, -1, -1]].forEach(([x, y, dx, dy]) => {
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.moveTo(x + dx * i * 18, y);
                ctx.lineTo(x + dx * (i * 18 + 30), y + dy * 46);
                ctx.stroke();
            }
        });
        ctx.restore();
        // olho felino no topo
        ctx.save();
        ctx.translate(540, 92);
        ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2);
        ctx.fillStyle = '#7f1d1d'; ctx.fill();
        ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 4; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(0, 0, 6, 18, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#fecaca'; ctx.fill();
        ctx.restore();
    } else if (frame === 'caderno') {
        // The Office: papel de caderno — borda creme, pauta azul, linha de
        // margem vermelha e furos de espiral na lateral esquerda
        ctx.strokeStyle = '#e8dfc8'; ctx.lineWidth = 22; ctx.strokeRect(20, 20, 1040, 1880);
        ctx.strokeStyle = '#93b8d8'; ctx.lineWidth = 2;
        for (let y = 120; y < 1840; y += 64) {
            ctx.beginPath(); ctx.moveTo(44, y); ctx.lineTo(1036, y); ctx.stroke();
        }
        ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(96, 32); ctx.lineTo(96, 1888); ctx.stroke();
        ctx.save();
        for (let y = 110; y < 1840; y += 150) {
            ctx.beginPath(); ctx.arc(34, y, 11, 0, Math.PI * 2);
            ctx.fillStyle = '#0b1220'; ctx.fill();
            ctx.strokeStyle = '#9ca3af'; ctx.lineWidth = 3; ctx.stroke();
        }
        ctx.restore();
        // grampeador simples no topo (retângulo + base, sem texto)
        ctx.save();
        ctx.translate(540, 88);
        ctx.fillStyle = '#b91c1c'; ctx.fillRect(-52, -14, 104, 18);
        ctx.fillStyle = '#6b7280'; ctx.fillRect(-52, 10, 104, 8);
        ctx.restore();
    } else {
        ctx.strokeStyle = palette.borderPrimary;
        ctx.lineWidth = 10;
        ctx.strokeRect(30, 30, 1020, 1860);
    }
}
function generateStoryCard() {
    const canvas = document.getElementById('story-canvas');
    if (!canvas) return;
    withWebFonts(generateStoryCard);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const targetDate = document.getElementById('filter-date').value || getTodayLocalISO();
    const rank = getAnimalRankForSession(targetDate);
    const dayLogs = [...rank.dayLogs].sort((a, b) => a.id - b.id);

    const musicVibe = document.getElementById('vibe-music')?.value.trim() || '';
    const weatherVibe = document.getElementById('vibe-weather')?.value.trim() || '';

    const storyStyle = STORY_CARD_STYLES[THEME?.id] || STORY_CARD_STYLES.classico;
    const palette = storyStyle.palette;
    const fonts = storyStyle.fonts;

    const hasDayPhoto = customBgImageData && customBgImageData.storyDate === targetDate;
    const photoHint = document.getElementById('story-photo-hint');
    if (photoHint) photoHint.textContent = hasDayPhoto
        ? 'Foto deste treino. Editar os exercícios não altera a foto.'
        : 'Adicione uma foto deste treino. A foto anterior é preservada até ser substituída.';
    if (hasDayPhoto) {
        ctx.drawImage(customBgImageData, 0, 0, 1080, 1920);
        const opacity = parseFloat(document.getElementById('bg-overlay-opacity').value) || 0.6;
        ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
        ctx.fillRect(0, 0, 1080, 1920);
    } else {
        const grad = ctx.createLinearGradient(0, 0, 0, 1920);
        grad.addColorStop(0, palette.bgStart);
        grad.addColorStop(1, palette.bgEnd);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1080, 1920);
        // fundo de arte do tema (com véu escuro para o texto continuar legível)
        const bgImg = getCardImg(THEME_CARD_BGS[THEME?.id]);
        if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
            ctx.save(); ctx.globalAlpha = 0.5; drawCoverImg(ctx, bgImg, 1080, 1920); ctx.restore();
            const veil = ctx.createLinearGradient(0, 0, 0, 1920);
            veil.addColorStop(0, 'rgba(0,0,0,.55)'); veil.addColorStop(0.5, 'rgba(0,0,0,.35)'); veil.addColorStop(1, 'rgba(0,0,0,.6)');
            ctx.fillStyle = veil; ctx.fillRect(0, 0, 1080, 1920);
        } else if (bgImg && !bgImg.complete) {
            bgImg.onload = () => generateStoryCard();
        }
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 2;
        for (let x = 60; x < 1080; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 1920); ctx.stroke(); }
        for (let y = 60; y < 1920; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1080, y); ctx.stroke(); }
    }

    function drawRoundedRect(x, y, w, h, r, fillColor, strokeColor, strokeWidth = 1) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        if (fillColor) { ctx.fillStyle = fillColor; ctx.fill(); }
        if (strokeColor) { ctx.strokeStyle = strokeColor; ctx.lineWidth = strokeWidth; ctx.stroke(); }
    }

    drawThemedFrame(ctx, palette);

    ctx.fillStyle = palette.borderPrimary;
    ctx.fillRect(70, 75, 14, 85);
    ctx.fillStyle = palette.titleColor;
    ctx.font = `bold 62px ${fonts.display}`;
    ctx.textAlign = 'left';
    ctx.fillText('DIÁRIO DE CARGAS', 100, 130);
    ctx.fillStyle = palette.accentColor;
    ctx.font = `34px ${fonts.accent}`;
    ctx.fillText(`// ${THEME ? THEME.name.toUpperCase() : 'BERZERKER MODE'} · ${targetDate}`, 100, 168);

    drawRoundedRect(70, 200, 940, 150, 12, palette.cardBg, palette.accentColor, 2);
    ctx.font = `72px ${fonts.display}`;
    const rankImg = getCardImg(rankEmblemSrc(THEME?.id, rank.level));
    if (rankImg && rankImg.complete && rankImg.naturalWidth > 0) {
        ctx.save();
        ctx.beginPath(); ctx.arc(150, 275, 52, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
        ctx.drawImage(rankImg, 98, 223, 104, 104);
        ctx.restore();
    } else {
        ctx.fillText(rank.icon, 100, 300);
        if (rankImg && !rankImg.complete) rankImg.onload = () => generateStoryCard();
    }
    ctx.fillStyle = palette.accentColor;
    ctx.font = `bold 22px ${fonts.body}`;
    ctx.fillText(`PATENTE — NÍVEL ${rank.level}/10 · ${fmtN(rank.xp)} XP`, 200, 245);
    ctx.fillStyle = palette.titleColor;
    ctx.font = `bold 42px ${fonts.display}`;
    ctx.fillText(rank.name.toUpperCase(), 200, 305);

    drawRoundedRect(70, 370, 455, 150, 12, palette.cardBg, palette.cardBorder, 1);
    drawRoundedRect(555, 370, 455, 150, 12, palette.cardBg, palette.cardBorder, 1);
    ctx.fillStyle = palette.borderPrimary;
    ctx.font = `bold 64px ${fonts.numeric}`;
    ctx.fillText(`${(rank.sessionTonnage / 1000).toFixed(2)} TON`, 95, 445);
    ctx.fillStyle = palette.textDim;
    ctx.font = `bold 20px ${fonts.body}`;
    ctx.fillText('VOLUME TOTAL MOVIDO', 95, 485);
    ctx.fillStyle = palette.prColor;
    ctx.font = `bold 64px ${fonts.numeric}`;
    ctx.fillText(`${rank.relativeRatio.toFixed(1)}× BW`, 580, 445);
    ctx.fillStyle = palette.textDim;
    ctx.font = `bold 20px ${fonts.body}`;
    ctx.fillText(`RAZÃO FORÇA (${userBodyweight}kg BW)`, 580, 485);

    let currentY = 540;
    if (musicVibe || weatherVibe) {
        drawRoundedRect(70, currentY, 940, 70, 8, palette.badgeBg, palette.cardBorder, 1);
        ctx.fillStyle = palette.titleColor;
        ctx.font = `22px ${fonts.body}`;
        let vibeText = '';
        if (musicVibe) vibeText += `🎵 ${musicVibe}  `;
        if (weatherVibe) vibeText += `🌩️ ${weatherVibe}`;
        ctx.fillText(vibeText, 90, currentY + 42);
        currentY += 90;
    }

    ctx.fillStyle = palette.titleColor;
    ctx.font = `bold 34px ${fonts.display}`;
    ctx.fillText('EXERCÍCIOS & SÉRIES DA SESSÃO:', 70, currentY + 30);
    currentY += 50;

    if (dayLogs.length === 0) {
        drawRoundedRect(70, currentY, 940, 100, 12, palette.cardBg, palette.cardBorder, 1);
        ctx.fillStyle = palette.textDim;
        ctx.font = `28px ${fonts.body}`;
        ctx.fillText('Nenhum treino registrado nesta data.', 100, currentY + 60);
    } else {
        const grouped = [];
        dayLogs.forEach(l => {
            const last = grouped[grouped.length - 1];
            if (last && last[0] === l.muscle) last[1].push(l);
            else grouped.push([l.muscle, [l]]);
        });
        const room = 1800 - currentY - grouped.length * 45;
        let cardSpacing = Math.min(75, Math.max(58, Math.floor(room / dayLogs.length)));
        let cardHeight = cardSpacing - 10;

        for (const [muscleGroup, groupLogs] of grouped) {
            if (currentY + 100 > 1800) break;
            ctx.fillStyle = palette.borderPrimary;
            ctx.font = `bold 28px ${fonts.display}`;
            ctx.fillText(`⚔️ ${muscleGroup.toUpperCase()}`, 70, currentY + 25);
            currentY += 35;
            groupLogs.forEach(l => {
                if (currentY + cardHeight > 1800) return;
                drawRoundedRect(70, currentY, 940, cardHeight, 8, palette.cardBg, palette.cardBorder, 1);
                ctx.fillStyle = palette.titleColor;
                ctx.font = `bold 24px ${fonts.body}`;
                ctx.fillText(`${l.biset ? '🔗' : '•'} ${l.exercise}`, 90, currentY + 40);
                ctx.fillStyle = l.isPR ? palette.prColor : palette.accentColor;
                ctx.font = `bold 22px ${fonts.numeric}`;
                let detailStr = l.kind === 'corrida'
                    ? `${String(l.distanceKm ?? 0).replace('.', ',')} km · ${l.durationMin ?? 0} min`
                    : `${formatLoadText(l)} × ${formatRepsText(l)}`;
                if (l.isPR) detailStr += ` 🏆 PR`;
                ctx.textAlign = 'right';
                ctx.fillText(detailStr, 990, currentY + 40);
                ctx.textAlign = 'left';
                currentY += cardSpacing;
            });
            currentY += 10;
        }
    }

    const footerY = 1850;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(70, footerY - 30); ctx.lineTo(1010, footerY - 30); ctx.stroke();
    ctx.fillStyle = palette.borderPrimary;
    ctx.font = `italic bold 40px ${fonts.display}`;
    ctx.textAlign = 'center';
    ctx.fillText('@BerzerkerMode // DIÁRIO DE CARGAS', 540, footerY);
    ctx.textAlign = 'left';
}
function downloadStoryCard() {
    const canvas = document.getElementById('story-canvas');
    if (!canvas) return;
    const targetDate = document.getElementById('filter-date').value || 'treino';
    const link = document.createElement('a');
    link.download = `berzerker-story-${targetDate}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}


// ---------- Card compartilhável de chefão derrotado ----------
function openBossDefeatCard() {
    const overlay = document.createElement('div');
    overlay.id = 'boss-card-overlay';
    overlay.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 overflow-y-auto';
    overlay.onclick = ev => { if (ev.target === overlay) overlay.remove(); };
    overlay.innerHTML = `
        <div class="bg-berzerker-card border border-berzerker-border rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-3">
            <div class="flex items-center justify-between"><h3 class="font-oswald text-lg font-bold text-white uppercase">📸 Card do Chefão</h3>
            <button aria-label="Fechar card do chefão" data-action="closeElementById" data-args='["boss-card-overlay"]'  class="text-gray-400 hover:text-white">✕</button></div>
            <canvas id="boss-card-canvas" width="1080" height="1080" class="w-full rounded-xl border border-berzerker-border"></canvas>
            <button data-action="downloadBossDefeatCard" class="w-full py-3 bg-gradient-to-r from-amber-600 to-berzerker-600 text-white font-bold text-xs uppercase tracking-widest rounded-xl">⬇️ Baixar Card (1080×1080)</button>
        </div>`;
    document.body.appendChild(overlay);
    generateBossDefeatCard();
}
function generateBossDefeatCard() {
    const canvas = document.getElementById('boss-card-canvas');
    if (!canvas) return;
    withWebFonts(generateBossDefeatCard);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const prog = computeBossProgress(logsForTheme(activeGameThemeId), userBodyweight, BOSSES, themeGameSaves[activeGameThemeId]?.bossProgress);
    const boss = prog.defeatedCount > 0 ? BOSSES[Math.min(prog.defeatedCount, BOSSES.length) - 1] : prog.current;
    const derrotado = prog.defeatedCount > 0;
    const portrait = bossPortraitSrc(boss.id);
    const portraitImg = getBossImg(portrait);
    const rank = rankFromXP(computeXPCtx().xp);

    const g = ctx.createLinearGradient(0, 0, 0, 1080);
    g.addColorStop(0, '#14080a'); g.addColorStop(1, '#08080a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1080, 1080);
    const bossBg = getCardImg(THEME_CARD_BGS[activeGameThemeId || THEME?.id]);
    if (bossBg && bossBg.complete && bossBg.naturalWidth > 0) {
        ctx.save(); ctx.globalAlpha = 0.45; drawCoverImg(ctx, bossBg, 1080, 1080); ctx.restore();
        const veil = ctx.createLinearGradient(0, 0, 0, 1080);
        veil.addColorStop(0, 'rgba(0,0,0,.6)'); veil.addColorStop(0.55, 'rgba(0,0,0,.35)'); veil.addColorStop(1, 'rgba(0,0,0,.7)');
        ctx.fillStyle = veil; ctx.fillRect(0, 0, 1080, 1080);
    } else if (bossBg && !bossBg.complete) {
        bossBg.onload = () => generateBossDefeatCard();
    }

    drawThemedFrame(ctx, { borderPrimary: '#dc2626' });

    ctx.textAlign = 'center';
    ctx.fillStyle = derrotado ? '#fbbf24' : '#ef4444';
    ctx.font = 'bold 64px Oswald, sans-serif';
    ctx.fillText(derrotado ? 'CHEFÃO DERROTADO' : 'EM BATALHA', 540, 160);

    // Retrato/ícone
    ctx.save();
    ctx.beginPath();
    ctx.arc(540, 420, 190, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    if (portraitImg && portraitImg.complete && portraitImg.naturalWidth > 0) {
        if (THEME && THEME.id === 'zodiaco') {
            // Retratos em proporção variável: preencher o círculo sem deformar e suavizar.
            ctx.imageSmoothingEnabled = true;
            const escala = Math.max(380 / portraitImg.naturalWidth, 380 / portraitImg.naturalHeight);
            const largura = portraitImg.naturalWidth * escala;
            const altura = portraitImg.naturalHeight * escala;
            ctx.drawImage(portraitImg, 540 - largura / 2, 420 - altura / 2, largura, altura);
        } else {
            ctx.imageSmoothingEnabled = false; // mantém os pixels da arte retrô nítidos
            ctx.drawImage(portraitImg, 350, 230, 380, 380);
        }
    } else {
        ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(350, 230, 380, 380);
        ctx.font = '180px Inter, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(boss.icon, 540, 480);
        // quando a imagem carregar, redesenha o card
        if (portraitImg && !portraitImg.complete) {
            portraitImg.onload = () => generateBossDefeatCard();
        }
    }
    ctx.restore();
    ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.arc(540, 420, 195, 0, Math.PI * 2); ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 56px Oswald, sans-serif';
    ctx.fillText(boss.name.toUpperCase(), 540, 688);
    ctx.fillStyle = '#9ca3af';
    ctx.font = '28px Inter, sans-serif';
    ctx.fillText(`${fmtN(boss.maxHp)} HP · fraco a ${boss.weak}`, 540, 736);

    // Brecha tática: o "porquê" do ponto fraco entra no card (até 2 linhas de
    // 880 px) — antes o card só dizia "fraco a X" e perdia a dica de treino.
    ctx.fillStyle = '#c4b5fd';
    ctx.font = '24px Inter, sans-serif';
    wrapCanvasText(ctx, `Brecha tática: ${boss.weakReason || 'Ataque temático.'}`, 880, 2)
        .forEach((linha, i) => ctx.fillText(linha, 540, 782 + i * 30));

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 44px Oswald, sans-serif';
    ctx.fillText(`${fmtN(prog.totalDamage)} DMG ACUMULADOS`, 540, 880);

    ctx.fillStyle = '#9ca3af';
    ctx.font = '26px Inter, sans-serif';
    const rankImg = getCardImg(rankEmblemSrc(activeGameThemeId || THEME?.id, rank.level));
    if (rankImg && rankImg.complete && rankImg.naturalWidth > 0) {
        ctx.save();
        ctx.beginPath(); ctx.arc(360, 932, 26, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
        ctx.drawImage(rankImg, 334, 906, 52, 52);
        ctx.restore();
    }
    ctx.fillText(`${rank.name} · Nível ${rank.level}`, 540, 940);
    ctx.font = '22px Inter, sans-serif';
    ctx.fillText(`Diário de Cargas · ${getTodayLocalISO()}`, 540, 990);
    ctx.textAlign = 'left';
}
function downloadBossDefeatCard() {
    const canvas = document.getElementById('boss-card-canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `berzerker-chefao-${getTodayLocalISO()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}
function withWebFonts(redraw) {
    const fonts = document.fonts;
    if (!fonts || _fontsRedrawScheduled || fonts.status === 'loaded') return;
    _fontsRedrawScheduled = true;
    const run = () => { _fontsRedrawScheduled = false; redraw(); };
    fonts.ready.then(run, run);
}

// ============================================================
// Manifesto de exports (mesmo padrão dos outros módulos em js/).
// ============================================================
(function (g) {
    const exports_ = {
        imgSizeAttrs,
        themeIconImg,
        rankEmblemSrc,
        rankEmblemImg,
        getCardImg,
        drawCoverImg,
        wrapCanvasText,
        canvasMeasure,
        drawThemedFrame,
        drawThemedFrameArt,
        generateStoryCard,
        downloadStoryCard,
        openBossDefeatCard,
        generateBossDefeatCard,
        downloadBossDefeatCard,
        withWebFonts,
    };
    g.__diarioExports = Object.assign(g.__diarioExports || {}, exports_);
    // Ações delegáveis (js/actions.js): toda função pública do módulo fica
    // disponível para os atributos data-action dos templates.
    const actionFns = {};
    Object.keys(exports_).forEach(k => { if (typeof exports_[k] === 'function') actionFns[k] = exports_[k]; });
    g.registerDiarioActions(actionFns);
    g.__diarioExportFiles = Object.assign(g.__diarioExportFiles || {}, { "js/cartoes.js": Object.keys(exports_).length });
})(typeof window !== 'undefined' ? window : globalThis);

export { _fontsRedrawScheduled, imgSizeAttrs, themeIconImg, rankEmblemSrc, rankEmblemImg, getCardImg, drawCoverImg, wrapCanvasText, canvasMeasure, drawThemedFrame, drawThemedFrameArt, generateStoryCard, downloadStoryCard, openBossDefeatCard, generateBossDefeatCard, downloadBossDefeatCard, withWebFonts };
