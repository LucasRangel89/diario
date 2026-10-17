/* ============================================================
   BOSS — batalha, retratos dos chefões, lightbox e estúdio de reservas
   ------------------------------------------------------------
   Tela do chefão (grade, card ativo, dano do dia), retratos (padrão,
   upload do usuário em Blob e reservas de images/bosses/reserva/) e o
   lightbox da arte grande — estavam em js/app.js. Os listeners de teclado
   (setas do lightbox e o ESC único de OVERLAY_CLOSE_ORDER) continuam no
   app, na mesma ordem de registro de antes.

   Dividido de js/app.js na refatoração R2 (rodada 2) — as declarações
   foram movidas sem alterar uma linha de lógica (corpos byte a byte
   idênticos). O estado de topo continua em js/app.js e é lido aqui por
   import (binding vivo); nenhuma função deste arquivo reatribui binding
   importado.
   ============================================================ */

import { THEMES, bossRewardXP, computeBossProgress, effectiveSetAllocations, logDamageKg, weaknessGroupForWeek } from './gamificacao.js';
import { qualifyingPRLogs } from './catalogo.js';
import { logsForTheme, saveGameState } from './persistencia.js';
import { getAnimalRankForSession } from './sessao.js';
import { BOSSES, THEME, activeGameThemeId, alertModal, bossPortraits, ensureThemeGameSave, escapeHtml, fmtN, getTodayLocalISO, mensagemImagemSalva, portraitObjectURLs, saveBlobChecked, userBodyweight } from './app.js';

// ============================ BOSS BATTLE ============================
function activeBossProgress() {
    const save = ensureThemeGameSave(activeGameThemeId);
    const progress = computeBossProgress(logsForTheme(activeGameThemeId), userBodyweight, BOSSES, save.bossProgress);
    if (JSON.stringify(save.bossProgress) !== JSON.stringify(progress.combatState)) {
        save.bossProgress = progress.combatState;
        saveGameState();
    }
    return progress;
}

// Retratos padrão dos chefões (arte original embutida no app).
// O upload do usuário (bossPortraits) tem prioridade sobre estes.
// Os 120 chefões têm retrato em pixel art retrô (grade 160, paleta de 64 cores) em WebP lossless.
// Reservas/variações ficam em images/bosses/reserva/ e podem ser ligadas trocando o caminho aqui.
const DEFAULT_BOSS_PORTRAITS = {
    // classico
    'classico:boss1': 'images/bosses/golem-anilhas.webp',
    'classico:boss2': 'images/bosses/hidra-titanio.webp',
    'classico:boss3': 'images/bosses/mecagorila.webp',
    'classico:boss4': 'images/bosses/behemoth.webp',
    'classico:boss5': 'images/bosses/cavaleiro-de-ferro.webp',
    'classico:boss6': 'images/bosses/ogro-da-bigorna.webp',
    'classico:boss7': 'images/bosses/quimera-blindada.webp',
    'classico:boss8': 'images/bosses/dragao-de-aco.webp',
    'classico:boss9': 'images/bosses/minotauro-das-forjas.webp',
    'classico:boss10': 'images/bosses/leviatan-de-ferro.webp',
    'classico:boss11': 'images/bosses/tita-de-escorcia.webp',
    'classico:boss12': 'images/bosses/colosso-das-forjas.webp',
    // zodiaco
    'zodiaco:b0': 'images/bosses/mu-de-aries.webp',
    'zodiaco:b1': 'images/bosses/aldebaran-de-touro.webp',
    'zodiaco:b2': 'images/bosses/saga-de-gemeos.webp',
    'zodiaco:b3': 'images/bosses/mascara-da-morte-de-cancer.webp',
    'zodiaco:b4': 'images/bosses/aiolia-de-leao.webp',
    'zodiaco:b5': 'images/bosses/shaka-de-virgem.webp',
    'zodiaco:b6': 'images/bosses/dohko-de-libra.webp',
    'zodiaco:b7': 'images/bosses/milo-de-escorpiao.webp',
    'zodiaco:b8': 'images/bosses/aiolos-de-sagitario.webp',
    'zodiaco:b9': 'images/bosses/shura-de-capricornio.webp',
    'zodiaco:b10': 'images/bosses/camus-de-aquario.webp',
    'zodiaco:b11': 'images/bosses/grande-mestre.webp',
    // hercules
    'hercules:b0': 'images/bosses/leao-de-nemeia.webp',
    'hercules:b1': 'images/bosses/hidra-de-lerna.webp',
    'hercules:b2': 'images/bosses/corca-de-cerineia.webp',
    'hercules:b3': 'images/bosses/javali-de-erimanto.webp',
    'hercules:b4': 'images/bosses/estabulos-de-augias.webp',
    'hercules:b5': 'images/bosses/passaros-do-estinfalo.webp',
    'hercules:b6': 'images/bosses/touro-de-crete.webp',
    'hercules:b7': 'images/bosses/eguas-de-diomedes.webp',
    'hercules:b8': 'images/bosses/cinturao-de-hipolita.webp',
    'hercules:b9': 'images/bosses/rebanho-de-geriao.webp',
    'hercules:b10': 'images/bosses/macas-das-hesperides.webp',
    'hercules:b11': 'images/bosses/cerbero.webp',
    // acao
    'acao:b0': 'images/bosses/o-predador.webp',
    'acao:b1': 'images/bosses/o-exterminador.webp',
    'acao:b2': 'images/bosses/tubarao.webp',
    'acao:b3': 'images/bosses/hans-gruber.webp',
    'acao:b4': 'images/bosses/ivan-drago.webp',
    'acao:b5': 'images/bosses/chucky.webp',
    'acao:b6': 'images/bosses/o-coringa.webp',
    'acao:b7': 'images/bosses/freddy-krueger.webp',
    'acao:b8': 'images/bosses/agent-smith.webp',
    'acao:b9': 'images/bosses/pennywise.webp',
    'acao:b10': 'images/bosses/thanos.webp',
    'acao:b11': 'images/bosses/darth-vader.webp',
    // folclore
    'folclore:b0': 'images/bosses/saci.webp',
    'folclore:b1': 'images/bosses/curupira.webp',
    'folclore:b2': 'images/bosses/caipora.webp',
    'folclore:b3': 'images/bosses/lobisomem.webp',
    'folclore:b4': 'images/bosses/cuca.webp',
    'folclore:b5': 'images/bosses/mula-sem-cabeca.webp',
    'folclore:b6': 'images/bosses/iara.webp',
    'folclore:b7': 'images/bosses/boto.webp',
    'folclore:b8': 'images/bosses/boitata.webp',
    'folclore:b9': 'images/bosses/naia.webp',
    'folclore:b10': 'images/bosses/mapinguari.webp',
    'folclore:b11': 'images/bosses/anhanguera.webp',
    // nordica
    'nordica:b0': 'images/bosses/draugr.webp',
    'nordica:b1': 'images/bosses/troll-jovem-de-gelo.webp',
    'nordica:b2': 'images/bosses/nokk-do-fiorde.webp',
    'nordica:b3': 'images/bosses/huldra-da-floresta.webp',
    'nordica:b4': 'images/bosses/fenrir.webp',
    'nordica:b5': 'images/bosses/jormungandr.webp',
    'nordica:b6': 'images/bosses/surtr.webp',
    'nordica:b7': 'images/bosses/fafnir.webp',
    'nordica:b8': 'images/bosses/nidhogg.webp',
    'nordica:b9': 'images/bosses/skoll.webp',
    'nordica:b10': 'images/bosses/ymir.webp',
    'nordica:b11': 'images/bosses/ragnarok.webp',
    // roma
    'roma:b0': 'images/bosses/provocador-da-arena.webp',
    'roma:b1': 'images/bosses/mirmilao-feroz.webp',
    'roma:b2': 'images/bosses/retiario-mestre.webp',
    'roma:b3': 'images/bosses/dupla-de-dimachaeri.webp',
    'roma:b4': 'images/bosses/hoplomaco.webp',
    'roma:b5': 'images/bosses/bestiario-e-pantera.webp',
    'roma:b6': 'images/bosses/venator-e-urso.webp',
    'roma:b7': 'images/bosses/leao-da-numidia.webp',
    'roma:b8': 'images/bosses/touro-da-arena.webp',
    'roma:b9': 'images/bosses/capitao-dos-pretorianos.webp',
    'roma:b10': 'images/bosses/comodo-o-imperador.webp',
    'roma:b11': 'images/bosses/maximo-o-gladiador.webp',
    // rpg
    'rpg:b0': 'images/bosses/goblin-chefe.webp',
    'rpg:b1': 'images/bosses/ogro-da-ponte.webp',
    'rpg:b2': 'images/bosses/golem-de-pedra.webp',
    'rpg:b3': 'images/bosses/necromante.webp',
    'rpg:b4': 'images/bosses/hidra-do-pantano.webp',
    'rpg:b5': 'images/bosses/grifo-guardiao.webp',
    'rpg:b6': 'images/bosses/minotauro-da-masmorra.webp',
    'rpg:b7': 'images/bosses/mago-negro.webp',
    'rpg:b8': 'images/bosses/dragao-anciao.webp',
    'rpg:b9': 'images/bosses/tita-de-ferro.webp',
    'rpg:b10': 'images/bosses/rei-demonio.webp',
    'rpg:b11': 'images/bosses/mestre-do-jogo.webp',
    // galactica
    'galactica:b0': 'images/bosses/enxame-de-drones.webp',
    'galactica:b1': 'images/bosses/pirata-espacial.webp',
    'galactica:b2': 'images/bosses/androide-rebelde.webp',
    'galactica:b3': 'images/bosses/mutante-das-luas.webp',
    'galactica:b4': 'images/bosses/rainha-dos-insetos.webp',
    'galactica:b5': 'images/bosses/colosso-estelar.webp',
    'galactica:b6': 'images/bosses/leviatan-do-espaco.webp',
    'galactica:b7': 'images/bosses/nucleo-de-ia-rebelde.webp',
    'galactica:b8': 'images/bosses/dominio-sombrio.webp',
    'galactica:b9': 'images/bosses/buraco-negro-vivo.webp',
    'galactica:b10': 'images/bosses/devorador-de-planetas.webp',
    'galactica:b11': 'images/bosses/imperador-galactico.webp',
    // aneis
    'aneis:b0': 'images/bosses/goblins-de-moria.webp',
    'aneis:b1': 'images/bosses/espectros-do-anel.webp',
    'aneis:b2': 'images/bosses/balrog-de-morgoth.webp',
    'aneis:b3': 'images/bosses/lurtz-o-uruk-hai.webp',
    'aneis:b4': 'images/bosses/wargs-das-terras-bravias.webp',
    'aneis:b5': 'images/bosses/uruk-hai-do-abismo-de-helm.webp',
    'aneis:b6': 'images/bosses/saruman-o-branco.webp',
    'aneis:b7': 'images/bosses/espectros-de-dunharrow.webp',
    'aneis:b8': 'images/bosses/laracna.webp',
    'aneis:b9': 'images/bosses/rei-bruxo-de-angmar.webp',
    'aneis:b10': 'images/bosses/gollum-o-portador-caido.webp',
    'aneis:b11': 'images/bosses/sauron-o-senhor-do-anel.webp'
};

function bossPortraitSrc(bossId) {
    if (bossPortraits[bossId]) return resolvePortraitSrc(bossId); // upload do usuário (dataURL legado ou Blob no IndexedDB)
    return DEFAULT_BOSS_PORTRAITS[(THEME ? THEME.id : 'classico') + ':' + bossId] || null;
}

// Marcador 'idb:portrait:<tema>:<chefe>' → objectURL do Blob carregado nesta sessão.
// Enquanto o Blob não carregar, devolve null (arte padrão aparece e a UI re-renderiza).
function resolvePortraitSrc(bossId) {
    const v = bossPortraits[bossId];
    if (!v) return null;
    if (typeof v === 'string' && v.startsWith('idb:')) return portraitObjectURLs[v] || null;
    return v;
}

// Converte dataURLs legados de bossPortraits para Blobs no IndexedDB e hidrata
// os objectURLs dos marcadores. Idempotente: dataURL já migrado vira marcador.
async function hydratePortraitBlobs() {
    if (!window.storage || typeof window.storage.saveBlob !== 'function') return;
    const ids = Object.keys(bossPortraits || {});
    let mudou = false;
    for (const bossId of ids) {
        const v = bossPortraits[bossId];
        if (!v) continue;
        if (typeof v === 'string' && v.startsWith('idb:')) {
            if (!portraitObjectURLs[v]) {
                try {
                    const blob = await window.storage.getBlob(v.slice(4));
                    if (blob) portraitObjectURLs[v] = URL.createObjectURL(blob);
                } catch (e) { /* sem IndexedDB: segue */ }
            }
            continue;
        }
        // legado: dataURL → Blob (512 px quadrado, WebP)
        try {
            const blob = await window.storage.compressImage(v, 512, 0.82, 'image/webp', { square: true });
            const key = 'portrait:' + activeGameThemeId + ':' + bossId;
            // IndexedDB indisponível: mantém o dataURL (sem perda) e avisa uma vez.
            const ok = await saveBlobChecked(key, blob);
            if (!ok) continue;
            const marker = 'idb:' + key;
            portraitObjectURLs[marker] = URL.createObjectURL(blob);
            bossPortraits[bossId] = marker;
            mudou = true;
        } catch (e) { /* imagem inválida: mantém o dataURL */ }
    }
    if (mudou) { saveGameState(); renderBossBattleUI(); }
    else if (ids.some(id => bossPortraits[id] && String(bossPortraits[id]).startsWith('idb:') && portraitObjectURLs[bossPortraits[id]])) {
        renderBossBattleUI();
    }
}

// Cache de imagens para desenho em canvas (o canvas precisa de HTMLImageElement)
const _bossImgCache = {};

function getBossImg(src) {
    if (!src) return null;
    if (_bossImgCache[src]) return _bossImgCache[src];
    const img = new Image();
    img.src = src;
    _bossImgCache[src] = img;
    return img;
}

function renderBossBattleUI() {
    const prog = activeBossProgress();
    const filterDate = document.getElementById('filter-date').value || getTodayLocalISO();
    const rank = getAnimalRankForSession(filterDate);
    const gameLogs = logsForTheme(activeGameThemeId);
    const qualifiedPRs = qualifyingPRLogs(gameLogs, userBodyweight);
    const effectiveCredits = effectiveSetAllocations(gameLogs);
    const activeWeakness = weaknessGroupForWeek(gameLogs, filterDate, effectiveCredits);
    const todayDmg = Math.round(rank.dayLogs.filter(l => l.xpTheme === activeGameThemeId).reduce((a, l) => a + logDamageKg({ ...l, isPR: qualifiedPRs.has(l) }, userBodyweight, prog.current, effectiveCredits.get(l) || 0, activeWeakness), 0));

    document.getElementById('boss-today-dmg-display').textContent = `${todayDmg.toLocaleString()} DMG`;
    document.getElementById('stat-boss-dmg').textContent = `${todayDmg.toLocaleString()} DMG`;

    const currentBoss = prog.current;
    const portrait = bossPortraitSrc(currentBoss.id);
    const activeCard = document.getElementById('active-boss-card');
    if (activeCard) {
        activeCard.innerHTML = `
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <div class="flex items-start gap-3 sm:gap-4 min-w-0">
                    <button type="button" data-action="openBossLightbox" data-args='["${currentBoss.id}"]' title="Ampliar retrato de ${escapeHtml(currentBoss.name)}" aria-label="Ampliar retrato de ${escapeHtml(currentBoss.name)}" class="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 p-1 bg-berzerker-border/50 rounded-2xl border border-berzerker-border overflow-hidden flex items-center justify-center shrink-0 cursor-pointer transition-colors hover:border-berzerker-500 focus:outline-none focus:ring-2 focus:ring-berzerker-500">
                        ${portrait ? `<img src="${portrait}" class="w-full h-full object-cover rounded-xl shrink-0" style="image-rendering:pixelated" alt="retrato de ${escapeHtml(currentBoss.name)}">` : `<span class="text-5xl sm:text-6xl leading-none">${currentBoss.icon}</span>`}
                    </button>
                    <div class="min-w-0 flex-1">
                        <span class="flex flex-wrap items-center gap-x-1.5 whitespace-nowrap text-xs font-bold text-red-400 uppercase tracking-wider">${THEME.bossLabel} <span aria-hidden="true">—</span> ${THEME.stageWord} ${prog.currentIdx + 1}/${BOSSES.length}</span>
                        <h3 class="font-oswald text-2xl sm:text-3xl font-bold text-white uppercase leading-tight break-words">${escapeHtml(currentBoss.name)}</h3>
                        <p class="text-[11px] leading-snug text-gray-400 mt-0.5 break-words">${escapeHtml(currentBoss.desc)}</p>
                        <p class="text-[11px] leading-snug text-purple-200/80 mt-1 break-words"><strong>Brecha tática semanal:</strong> ${escapeHtml(activeWeakness)} recebe dano ×2 pelo grupo menos estimulado na semana anterior.</p>
                        <div class="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1.5">
                            <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-700 uppercase leading-tight break-words">💢 Fraqueza da semana: ${escapeHtml(activeWeakness)} ×2</span>
                            <label class="text-[10px] font-bold px-2 py-0.5 rounded bg-berzerker-border text-gray-300 cursor-pointer hover:bg-gray-700">🖼️ Retrato
                                <input type="file" accept="image/*" class="hidden" data-change-action="uploadBossPortrait" data-args='["$event","${currentBoss.id}"]'>
                            </label>
                            <button data-action="openBossDefeatCard" class="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-900/40 text-amber-300 border border-amber-700/50 hover:bg-amber-900/70">📸 Card do Chefão</button>
                        </div>
                    </div>
                </div>
                <div class="min-w-0 shrink-0 text-right w-full sm:w-auto">
                    <span class="text-xs text-gray-400 font-bold uppercase block">Vida do Boss (HP)</span>
                    <div class="font-oswald text-2xl sm:text-3xl font-bold text-red-500 leading-tight">${fmtN(prog.currentHp)} / ${fmtN(currentBoss.maxHp)} HP</div>
                    <div class="text-[11px] text-gray-500 font-mono mt-0.5 leading-snug">${prog.critCount} golpes críticos (PR ×2) · ${prog.weakHits} acertos na fraqueza</div>
                </div>
            </div>
            <div class="space-y-1">
                <div class="w-full bg-berzerker-border h-5 rounded-full overflow-hidden p-0.5 border border-red-900/50">
                    <div class="bg-gradient-to-r from-red-700 via-berzerker-500 to-amber-500 h-full rounded-full transition-all duration-500" style="width: ${prog.hpPercent}%"></div>
                </div>
                <div class="flex justify-between text-[11px] font-mono text-gray-400">
                    <span>Dano total acumulado: ${fmtN(prog.totalDamage)} DMG (PRs = crítico ×2)</span>
                    <span>${prog.hpPercent.toFixed(1)}% HP Restante</span>
                </div>
            </div>`;
    }

    const grid = document.getElementById('bosses-grid');
    if (grid) {
        grid.innerHTML = BOSSES.map((b, idx) => {
            const defeated = idx < prog.defeatedCount;
            const thumb = bossPortraitSrc(b.id);
            return `
                <div role="button" tabindex="0" data-boss-id="${escapeHtml(b.id)}" data-action="openBossLightbox" data-args='["${b.id}"]' title="Ampliar retrato de ${escapeHtml(b.name)}" class="p-4 rounded-xl border cursor-pointer transition-colors hover:border-berzerker-500 focus:outline-none focus:ring-2 focus:ring-berzerker-500 ${defeated ? 'bg-emerald-950/20 border-emerald-500/50' : (idx === prog.currentIdx ? 'bg-berzerker-dark border-red-500' : 'bg-berzerker-dark/40 border-berzerker-border opacity-50')} space-y-2">
                    <div class="flex items-center justify-between gap-2">
                        ${thumb ? `<img src="${thumb}" alt="${escapeHtml(b.name)}" width="40" height="40" style="width:40px;height:40px;image-rendering:pixelated" loading="lazy" decoding="async" class="w-10 h-10 shrink-0 rounded-lg object-cover border border-berzerker-border">` : `<span class="text-2xl shrink-0 leading-none">${b.icon}</span>`}
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded leading-tight ${defeated ? 'bg-emerald-500 text-black' : 'bg-berzerker-border text-gray-400'} uppercase">
                            ${defeated ? 'DERROTADO 🏆' : (idx === prog.currentIdx ? 'EM BATALHA ⚔️' : 'BLOQUEADO 🔒')}
                        </span>
                    </div>
                    <h4 class="font-oswald font-bold text-white text-base sm:text-lg leading-tight break-words">${escapeHtml(b.name)}</h4>
                    <span class="text-[11px] font-mono text-purple-300 block leading-snug break-words">💢 fraqueza semanal dinâmica ×2</span>
                    <span class="text-[11px] leading-snug text-gray-500 block break-words">${escapeHtml(b.weakReason || 'Ataque temático.')}</span>
                    <span class="text-xs font-mono text-gray-400 block">${fmtN(b.maxHp)} HP · ${defeated ? '✔' : '🎁'} +${bossRewardXP(b)} XP</span>
                </div>`;
        }).join('');
    }
    renderReservaStudio();
}

// ============================ LIGHTBOX DOS CHEFÕES ============================
// Os retratos já são 512×512 e já estão no cache offline: clicar em qualquer card
// da grade (ou no retrato do chefão ativo) abre a arte grande com os dados do
// combate. Navegação por setas (botão ou teclado), ESC fecha, clique no fundo fecha.
const BOSS_LIGHTBOX_ID = 'boss-lightbox-overlay';

let bossLightboxIdx = 0;

function bossStatusLabel(idx, prog) {
    if (idx < prog.defeatedCount) return 'DERROTADO 🏆';
    if (idx === prog.currentIdx) return 'EM BATALHA ⚔️';
    return 'BLOQUEADO 🔒';
}

function bossStatusClass(idx, prog) {
    if (idx < prog.defeatedCount) return 'bg-emerald-500 text-black border-emerald-400';
    if (idx === prog.currentIdx) return 'bg-berzerker-600 text-white border-berzerker-500';
    return 'bg-berzerker-border text-gray-300 border-gray-600';
}

// Nome de arquivo do download: tema + id + nome do chefão (data URL de upload vira .jpg)
function bossPortraitDownloadName(boss, src) {
    const ext = /^data:image\/(png|webp|jpeg|jpg)/i.test(String(src)) ? (RegExp.$1 === 'jpeg' ? 'jpg' : RegExp.$1.toLowerCase()) : 'webp';
    const slug = String(boss.name || boss.id).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `${(THEME ? THEME.id : 'berzerker')}-${boss.id}-${slug}.${ext}`;
}

function openBossLightbox(bossId) {
    if (!Array.isArray(BOSSES) || !BOSSES.length) return;
    const found = BOSSES.findIndex(b => b.id === bossId);
    bossLightboxIdx = found >= 0 ? found : 0;
    renderBossLightbox();
}

function closeBossLightbox() {
    const overlay = document.getElementById(BOSS_LIGHTBOX_ID);
    if (!overlay) return false;
    overlay.remove();
    return true;
}

function navBossLightbox(delta) {
    if (!Array.isArray(BOSSES) || !BOSSES.length) return;
    const step = Number(delta) || 0;
    bossLightboxIdx = ((bossLightboxIdx + step) % BOSSES.length + BOSSES.length) % BOSSES.length;
    renderBossLightbox();
}

function renderBossLightbox() {
    if (!Array.isArray(BOSSES) || !BOSSES.length) return;
    const idx = Math.min(Math.max(0, bossLightboxIdx), BOSSES.length - 1);
    bossLightboxIdx = idx;
    const b = BOSSES[idx];
    if (!b) return;
    const prog = activeBossProgress();
    const src = bossPortraitSrc(b.id);
    const xpReward = bossRewardXP(b);
    const activeWeakness = weaknessGroupForWeek(logsForTheme(activeGameThemeId), getTodayLocalISO(), effectiveSetAllocations(logsForTheme(activeGameThemeId)));

    document.getElementById(BOSS_LIGHTBOX_ID)?.remove();
    const overlay = document.createElement('div');
    overlay.id = BOSS_LIGHTBOX_ID;
    overlay.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-3 overflow-y-auto';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', `Retrato de ${b.name}`);
    overlay.onclick = ev => { if (ev.target === overlay) closeBossLightbox(); };
    overlay.innerHTML = `
        <div class="my-auto w-full max-w-2xl bg-berzerker-card border border-berzerker-border rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4">
            <div class="flex items-start justify-between gap-3 border-b border-berzerker-border pb-3">
                <div class="min-w-0">
                    <h3 id="boss-lightbox-name" class="font-oswald text-xl sm:text-2xl font-bold text-white uppercase tracking-wider leading-tight">${escapeHtml(b.name)}</h3>
                    <p class="text-[10px] font-bold uppercase tracking-wider text-gray-500 mt-0.5">${escapeHtml(THEME ? THEME.name : '')} · ${escapeHtml(THEME ? THEME.bossLabel : 'CHEFÃO')} ${idx + 1}/${BOSSES.length}</p>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                    <span id="boss-lightbox-status" class="text-[10px] font-bold uppercase px-2 py-1 rounded border ${bossStatusClass(idx, prog)}">${bossStatusLabel(idx, prog)}</span>
                    <button type="button" data-action="closeBossLightbox" aria-label="Fechar (ESC)" title="Fechar (ESC)" class="px-2.5 py-1.5 bg-berzerker-border hover:bg-gray-700 text-white text-[10px] font-bold uppercase rounded-lg transition-colors">✕</button>
                </div>
            </div>
            <div class="flex items-center justify-center gap-2 sm:gap-4">
                <button type="button" data-action="navBossLightbox" data-args="[-1]" aria-label="Chefão anterior" title="Anterior (←)" class="shrink-0 w-10 h-16 sm:w-12 sm:h-24 rounded-xl border border-berzerker-border bg-berzerker-dark text-2xl text-gray-300 hover:text-white hover:border-berzerker-500 transition-colors">‹</button>
                <div class="w-56 h-56 sm:w-72 sm:h-72 rounded-2xl border border-berzerker-border bg-black/60 overflow-hidden flex items-center justify-center">
                    ${src
                        ? `<img id="boss-lightbox-img" src="${escapeHtml(src)}" alt="Retrato de ${escapeHtml(b.name)}" class="w-full h-full object-contain" style="image-rendering:pixelated">`
                        : `<span id="boss-lightbox-icon" class="text-8xl">${b.icon || '👹'}</span>`}
                </div>
                <button type="button" data-action="navBossLightbox" data-args="[1]" aria-label="Próximo chefão" title="Próximo (→)" class="shrink-0 w-10 h-16 sm:w-12 sm:h-24 rounded-xl border border-berzerker-border bg-berzerker-dark text-2xl text-gray-300 hover:text-white hover:border-berzerker-500 transition-colors">›</button>
            </div>
            <div class="grid grid-cols-3 gap-2 text-center">
                <div class="bg-berzerker-dark border border-berzerker-border rounded-xl px-2 py-2.5">
                    <span class="block text-[10px] font-bold uppercase tracking-wider text-gray-500">Vida máxima</span>
                    <span class="block font-oswald text-lg font-bold text-red-400">${fmtN(b.maxHp)} HP</span>
                </div>
                <div class="bg-berzerker-dark border border-berzerker-border rounded-xl px-2 py-2.5">
                    <span class="block text-[10px] font-bold uppercase tracking-wider text-gray-500">💢 Fraqueza semanal ×2</span>
                    <span class="block font-oswald text-lg font-bold text-purple-300">${escapeHtml(activeWeakness)}</span>
                </div>
                <div class="bg-berzerker-dark border border-berzerker-border rounded-xl px-2 py-2.5">
                    <span class="block text-[10px] font-bold uppercase tracking-wider text-gray-500">Recompensa</span>
                    <span class="block font-oswald text-lg font-bold text-amber-300">+${fmtN(xpReward)} XP</span>
                </div>
            </div>
            <p class="text-[11px] leading-relaxed text-purple-200/80"><strong class="uppercase tracking-wider text-gray-400">Brecha tática:</strong> ${escapeHtml(b.weakReason || 'Ataque temático.')}</p>
            ${b.desc ? `<p class="text-[11px] leading-relaxed text-gray-500">${escapeHtml(b.desc)}</p>` : ''}
            <div class="flex flex-wrap items-center gap-2">
                ${src ? `<a id="boss-lightbox-download" href="${escapeHtml(src)}" download="${escapeHtml(bossPortraitDownloadName(b, src))}" class="flex-1 text-center px-3 py-2.5 bg-berzerker-dark border border-berzerker-border hover:border-berzerker-500 text-gray-200 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors">⬇️ Baixar retrato</a>` : ''}
                <button type="button" data-action="navBossLightbox" data-args="[-1]" class="px-3 py-2.5 bg-berzerker-dark border border-berzerker-border hover:border-berzerker-500 text-gray-300 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors">‹ Anterior</button>
                <button type="button" data-action="navBossLightbox" data-args="[1]" class="px-3 py-2.5 bg-berzerker-dark border border-berzerker-border hover:border-berzerker-500 text-gray-300 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors">Próximo ›</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
}

// ============================ UPLOAD DE RETRATO DO CHEFÃO ============================
async function uploadBossPortrait(event, bossId) {
    const file = event.target.files[0];
    if (!file) return;
    // Caminho novo: Blob comprimido (512 px quadrado, WebP) direto no IndexedDB —
    // nada de base64 no localStorage. Se algo falhar (sem IndexedDB/canvas),
    // cai no caminho antigo em dataURL para não perder o upload.
    try {
        if (window.storage && typeof window.storage.compressImage === 'function' && typeof window.storage.saveBlob === 'function') {
            const blob = await window.storage.compressImage(file, 512, 0.82, 'image/webp', { square: true });
            const key = 'portrait:' + activeGameThemeId + ':' + bossId;
            const ok = await saveBlobChecked(key, blob, { silencioso: true });
            if (ok) {
                const marker = 'idb:' + key;
                if (portraitObjectURLs[marker]) URL.revokeObjectURL(portraitObjectURLs[marker]);
                portraitObjectURLs[marker] = URL.createObjectURL(blob);
                bossPortraits[bossId] = marker;
                saveGameState();
                renderBossBattleUI();
                alertModal('🖼️ Retrato do chefão atualizado!');
                return;
            }
        }
    } catch (e) { /* cai para o caminho legado */ }
    const reader = new FileReader();
    reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
            // Redimensiona para 512px para não estourar o storage
            const c = document.createElement('canvas');
            const s = Math.min(img.width, img.height);
            c.width = 512; c.height = 512;
            const ctx = c.getContext('2d');
            ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 512, 512);
            bossPortraits[bossId] = c.toDataURL('image/jpeg', 0.8);
            // Caminho reserva (dataURL no localStorage): a mensagem só afirma "atualizado"
            // quando essa gravação também foi confirmada.
            const salvoNoLegado = saveGameState();
            renderBossBattleUI();
            alertModal(mensagemImagemSalva(salvoNoLegado, '🖼️ Retrato do chefão atualizado!'));
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// ============================ ESTÚDIO DE RESERVAS ============================
// Troca a arte de qualquer chefão pelas reservas de images/bosses/reserva/
// (35 artes prontas, agrupadas por tema no index.json) reaproveitando o
// mecanismo de upload por chefão (bossPortraits no save do tema).
let reservaManifest = null;

let reservaBossId = null;

function loadReservaManifest() {
    if (reservaManifest) return Promise.resolve(reservaManifest);
    return fetch('images/bosses/reserva/index.json')
        .then(r => (r && r.ok ? r.json() : null))
        .then(j => { reservaManifest = (j && j.temas) ? j : null; return reservaManifest; })
        .catch(() => null);
}

function reservaGroups(themeId) {
    const temas = (reservaManifest && reservaManifest.temas) || {};
    const doTema = temas[themeId] || [];
    // tema sem reserva própria (ex.: clássico) ainda pode emprestar as outras
    if (doTema.length) return [{ tema: themeId, itens: doTema }];
    return Object.keys(temas).sort().map(t => ({ tema: t, itens: temas[t] })).filter(g => g.itens.length);
}

function selectReservaBoss(bossId) {
    reservaBossId = bossId;
    renderReservaStudio();
}

function applyReservaPortrait(src) {
    if (!reservaBossId || !src) return;
    bossPortraits[reservaBossId] = src;
    saveGameState();
    renderBossBattleUI();
    renderReservaStudio();
    alertModal('🎨 Retrato trocado! Vale para este chefe neste aparelho.');
}

function resetBossPortraitToDefault() {
    if (!reservaBossId) return;
    const antigo = bossPortraits[reservaBossId];
    if (typeof antigo === 'string' && antigo.startsWith('idb:')) {
        if (window.storage && typeof window.storage.removeBlob === 'function') window.storage.removeBlob(antigo.slice(4));
        if (portraitObjectURLs[antigo]) { URL.revokeObjectURL(portraitObjectURLs[antigo]); delete portraitObjectURLs[antigo]; }
    }
    delete bossPortraits[reservaBossId];
    saveGameState();
    renderBossBattleUI();
    renderReservaStudio();
    alertModal('↩ Retrato padrão restaurado.');
}

function renderReservaStudio() {
    const sel = document.getElementById('reserva-boss-select');
    const grid = document.getElementById('reserva-grid');
    const status = document.getElementById('reserva-status');
    if (!sel || !grid) return;
    if (!Array.isArray(BOSSES) || !BOSSES.length) return;
    // o manifesto chega por fetch: desenha o seletor já e completa no redraw
    if (!reservaManifest && !renderReservaStudio._carregando) {
        renderReservaStudio._carregando = true;
        loadReservaManifest().then(m => { renderReservaStudio._carregando = false; if (m) renderReservaStudio(); });
    }
    if (!reservaBossId || !BOSSES.some(b => b.id === reservaBossId)) {
        const prog = activeBossProgress();
        reservaBossId = (prog.current && prog.current.id) || BOSSES[0].id;
    }
    sel.innerHTML = BOSSES.map(b =>
        `<option value="${escapeHtml(b.id)}"${b.id === reservaBossId ? ' selected' : ''}>${escapeHtml(b.name)}${bossPortraits[b.id] ? ' · 🎨' : ''}</option>`).join('');

    const atual = bossPortraits[reservaBossId] || null;
    const padrao = DEFAULT_BOSS_PORTRAITS[(THEME ? THEME.id : 'classico') + ':' + reservaBossId] || null;
    const tileCls = on => `text-left rounded-xl border p-1.5 transition-colors ${on ? 'border-berzerker-500 bg-berzerker-600/15 ring-1 ring-berzerker-500/40' : 'border-berzerker-border bg-berzerker-dark hover:border-gray-500'}`;

    let html = padrao ? `
        <button type="button" data-action="resetBossPortraitToDefault" title="Retrato padrão do tema" class="${tileCls(!atual)}">
            <img src="${padrao}" alt="retrato padrão" loading="lazy" decoding="async" class="w-full aspect-square object-cover rounded-lg border border-berzerker-border" style="image-rendering:pixelated">
            <span class="block text-[10px] font-bold uppercase tracking-wide leading-tight mt-1 ${!atual ? 'text-berzerker-300' : 'text-gray-500'}">Padrão</span>
        </button>` : '';

    const grupos = reservaGroups(THEME ? THEME.id : 'classico');
    if (!grupos.length) {
        html += `<div class="col-span-full text-center text-[11px] text-gray-500 border border-dashed border-berzerker-border rounded-xl py-6">Sem reservas por enquanto — o index.json ainda não carregou.</div>`;
    }
    grupos.forEach(g => {
        if (grupos.length > 1) html += `<div class="col-span-full text-[10px] font-bold uppercase tracking-wider text-gray-500 pt-1">${escapeHtml((THEMES[g.tema] || {}).name || g.tema)}</div>`;
        g.itens.forEach(item => {
            html += `
            <button type="button" data-action="applyReservaPortrait" data-args='["${escapeHtml(item.file)}"]' title="${escapeHtml(item.label)}" class="${tileCls(atual === item.file)}">
                <img src="${escapeHtml(item.file)}" alt="${escapeHtml(item.label)}" loading="lazy" decoding="async" class="w-full aspect-square object-cover rounded-lg border border-berzerker-border" style="image-rendering:pixelated">
                <span class="block truncate text-[10px] font-bold uppercase tracking-wide leading-tight mt-1 ${atual === item.file ? 'text-berzerker-300' : 'text-gray-400'}">${escapeHtml(item.label)}</span>
            </button>`;
        });
    });
    grid.innerHTML = html;
    if (status) status.textContent = atual
        ? `🎨 arte personalizada neste chefe`
        : 'usando o retrato padrão do tema';
}

// ============================================================
// Manifesto de exports (mesmo padrão dos outros módulos em js/).
// ============================================================
(function (g) {
    const exports_ = {
        DEFAULT_BOSS_PORTRAITS,
        bossPortraitSrc,
        resolvePortraitSrc,
        hydratePortraitBlobs,
        _bossImgCache,
        getBossImg,
        renderBossBattleUI,
        BOSS_LIGHTBOX_ID,
        bossLightboxIdx,
        bossStatusLabel,
        bossStatusClass,
        bossPortraitDownloadName,
        openBossLightbox,
        closeBossLightbox,
        navBossLightbox,
        renderBossLightbox,
        uploadBossPortrait,
        reservaManifest,
        reservaBossId,
        loadReservaManifest,
        reservaGroups,
        selectReservaBoss,
        applyReservaPortrait,
        resetBossPortraitToDefault,
        renderReservaStudio,
    };
    g.__diarioExports = Object.assign(g.__diarioExports || {}, exports_);
    // Ações delegáveis (js/actions.js): toda função pública do módulo fica
    // disponível para os atributos data-action dos templates.
    const actionFns = {};
    Object.keys(exports_).forEach(k => { if (typeof exports_[k] === 'function') actionFns[k] = exports_[k]; });
    g.registerDiarioActions(actionFns);
    g.__diarioExportFiles = Object.assign(g.__diarioExportFiles || {}, { "js/boss.js": Object.keys(exports_).length });
})(typeof window !== 'undefined' ? window : globalThis);

export { DEFAULT_BOSS_PORTRAITS, bossPortraitSrc, resolvePortraitSrc, hydratePortraitBlobs, _bossImgCache, getBossImg, renderBossBattleUI, BOSS_LIGHTBOX_ID, bossLightboxIdx, bossStatusLabel, bossStatusClass, bossPortraitDownloadName, openBossLightbox, closeBossLightbox, navBossLightbox, renderBossLightbox, uploadBossPortrait, reservaManifest, reservaBossId, loadReservaManifest, reservaGroups, selectReservaBoss, applyReservaPortrait, resetBossPortraitToDefault, renderReservaStudio };
