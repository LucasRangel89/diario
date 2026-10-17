/* ============================================================
   ASSISTENTE, SAVES POR TEMA, TEMPORADA E BADGES
   ------------------------------------------------------------
   Trecho de test_ui.js, movido sem alterar a lógica dos testes.
   Avaliado pelo runner no MESMO escopo dos demais trechos (ordem do nome).
   ============================================================ */

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
check('mapa de prontidão mostra "Prontidão estimada" (renomeado de "Fadiga real")', $('recovery-status-grid').textContent.includes('Prontidão estimada') && !$('recovery-status-grid').textContent.includes('Prontidão real'));
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
    lombarLivre.includes('✅ Lombar sem alerta estimado') && !lombarLivre.includes('Prontidão estimada da região') && !lombarLivre.includes('⚠️ Lombar'),
    lombarLivre.slice(0, 140));
ev(`window.__lombarBackup = logs; logs = [{ id: -7, kind: 'peso', muscle: 'Costas', date: getTodayLocalISO(), exercise: 'Levantamento Terra', reps: [5, 5, 5] }]; renderRecoveryMap();`);
const lombarCarregada = $('lombar-alert-panel').textContent;
check('lombar carregada mostra o painel completo, com o ícone do estado no título',
    lombarCarregada.includes('Prontidão estimada da região') && /Lombar\s*⚠️/.test(lombarCarregada)
    && lombarCarregada.includes('MUITO CARREGADA') && !lombarCarregada.includes('✅ Lombar sem alerta estimado'),
    lombarCarregada.slice(0, 140));
ev('logs = window.__lombarBackup; delete window.__lombarBackup; renderRecoveryMap();');
check('voltar aos registros reais devolve a linha compacta', $('lombar-alert-panel').textContent.includes('✅ Lombar sem alerta estimado'));
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
check('img de badge carrega preguiçosa e com fallback de emoji delegado (data-error-action)', badgeCards.every(c => { const i = c.querySelector('img'); return i && i.getAttribute('loading') === 'lazy' && i.getAttribute('data-error-action') === 'badgeArtFallback' && !!i.getAttribute('data-fallback'); }));
const imgSemArquivo = document.createElement('img');
imgSemArquivo.setAttribute('data-fallback', '🐘');
document.body.appendChild(imgSemArquivo);
ev('badgeArtFallback')(imgSemArquivo);
const spanFallback = [...document.body.children].find(el => el.tagName === 'SPAN' && el.textContent === '🐘');
check('onerror devolve o emoji quando a arte não existe', !document.body.contains(imgSemArquivo) && !!spanFallback);
if (spanFallback) spanFallback.remove();
check('badge sem slug de arte cai direto no emoji', ev("badgeArtImg('slug-inexistente', '🎯', true)").includes('🎯') && !ev("badgeArtImg('slug-inexistente', '🎯', true)").includes('<img'));
// ============================ SESSÃO COMPACTA + EXTRA (PR mobile-first) ============================
// Objetivo 1 — sequência compacta: cartões/alternância, rascunhos (inclusive
// série parcial), bi-set, reordenação, registro inválido/válido, handlers de
// aquecimento da sessão e acessibilidade. Objetivo 2 — exercício EXTRA no
// progresso da sessão via "Contar no treino em andamento" no Registro rápido:
// um único log por logId, nome igual ao item planejado nunca marca o planejado,
// edição/exclusão do extra e o Registro rápido sem sessão ativa.

console.log('\n== UI 10c. Treino em Andamento: sequência compacta (Objetivo 1) ==');
ev('window.__sessaoCompactaLogsBackup = logs.slice(); stopSessionTimer();');
const sessaoHeaders = () => [...$('session-exercises-list').querySelectorAll('[data-action="toggleSessionUnit"]')];
const sessaoCards = () => [...$('session-exercises-list').querySelectorAll('[data-unit-uid]')];
const sessaoBody = uid => document.getElementById('sunit-' + uid);
ev(`activeSession = {
    workoutId: 999001, name: 'Sessão Sintética UI', ordenado: false,
    exercises: [
        { muscle: 'Peito', exercise: 'Supino Reto com Barra', type: 'carga_total', weight: 60, repsText: '10, 10', technique: 'Convencional', biset: false, done: false, logId: null, draft: null, extra: false, loggedWeight: null, loggedReps: null, loggedPR: false, orderReason: '' },
        { muscle: 'Bíceps', exercise: 'Rosca Direta com Barra', type: 'barra', weight: 20, repsText: '12, 12', technique: 'Convencional', biset: false, done: false, logId: null, draft: null, extra: false, loggedWeight: null, loggedReps: null, loggedPR: false, orderReason: '' },
        { muscle: 'Costas', exercise: 'Remada Curvada com Barra', type: 'barra', weight: 40, repsText: '10, 10', technique: 'Convencional', biset: false, done: false, logId: null, draft: null, extra: false, loggedWeight: null, loggedReps: null, loggedPR: false, orderReason: '' }
    ]
};
document.getElementById('active-session-card').classList.remove('hidden');
renderSession();`);
check('progresso e barra abrem zerados com o total do cenário',
    $('session-progress-text').textContent === '0 / 3 exercícios' && parseFloat($('session-progress-bar').style.width) === 0, $('session-progress-text').textContent);
check('cada pendente é cartão compacto com número, grupo/nome, meta e estado',
    sessaoHeaders().length === 3 && sessaoHeaders()[0].querySelector('span').textContent === '1'
    && sessaoHeaders()[0].textContent.includes('Peito') && sessaoHeaders()[0].textContent.includes('Supino Reto com Barra')
    && sessaoHeaders()[0].textContent.includes('🎯') && sessaoHeaders()[0].textContent.includes('Pendente'),
    sessaoHeaders().map(b => b.textContent).join(' | ').slice(0, 160));
check('aberta inicialmente só a 1ª unidade pendente (aria-expanded anuncia o estado)',
    sessaoHeaders().filter(b => b.getAttribute('aria-expanded') === 'true').length === 1
    && sessaoHeaders()[0].getAttribute('aria-expanded') === 'true'
    && sessaoHeaders()[0].getAttribute('aria-controls') === sessaoBody(sessaoCards()[0].getAttribute('data-unit-uid')).id
    && !sessaoBody(sessaoCards()[0].getAttribute('data-unit-uid')).classList.contains('hidden')
    && sessaoBody(sessaoCards()[1].getAttribute('data-unit-uid')).classList.contains('hidden'));
const sessaoWRef = $('s0-w');
click(sessaoHeaders()[1]);
check('abrir outra unidade recolhe a anterior (accordion)',
    sessaoHeaders()[0].getAttribute('aria-expanded') === 'false' && sessaoHeaders()[1].getAttribute('aria-expanded') === 'true'
    && sessaoBody(sessaoCards()[0].getAttribute('data-unit-uid')).classList.contains('hidden')
    && !sessaoBody(sessaoCards()[1].getAttribute('data-unit-uid')).classList.contains('hidden'));
click(sessaoHeaders()[1]);
check('tocar de novo no cartão aberto recolhe tudo (estado guardado por unidade)',
    sessaoHeaders().every(b => b.getAttribute('aria-expanded') === 'false'));
click(sessaoHeaders()[0]);
check('recolher/abrir não recria o DOM dos campos (readFields/snapshotDrafts dependem dele)',
    $('s0-w') === sessaoWRef);
$('s0-w').value = '77'; $('s0-r').value = '8, 8';
click(sessaoHeaders()[0]);
check('valores digitados sobrevivem ao recolher, mesmo com o corpo escondido',
    $('s0-w').value === '77' && $('s0-r').value === '8, 8' && sessaoBody(sessaoCards()[0].getAttribute('data-unit-uid')).classList.contains('hidden'));
click(sessaoHeaders()[0]);
check('reabrir devolve a unidade montada e com os mesmos valores',
    $('s0-w') === sessaoWRef && $('s0-w').value === '77' && $('s0-r').value === '8, 8');
setSelect('s0-mode', 'sets');
check('séries individuais abrem sob "Mais detalhes" da unidade (sem perder os campos)',
    $('s0-advanced-details').open && !$('s0-sets-box').classList.contains('hidden') && !!$('s0-t') && !!$('s0-n') && !!$('s0-rir'));
const sessaoSetW = (idx, row, v) => { document.querySelector(`[data-setw="s${idx}-${row}"]`).value = v; };
const sessaoSetR = (idx, row, v) => { document.querySelector(`[data-setr="s${idx}-${row}"]`).value = v; };
sessaoSetW(0, 0, '30');   // série parcialmente preenchida: só a carga
sessaoSetR(0, 0, '');
click([...$('s0-sets-box').querySelectorAll('button')].find(b => b.textContent.includes('+ série')));
sessaoSetW(0, 1, '30');
sessaoSetR(0, 1, '10');
const sessaoUidAbertaAntes = ev('activeSession.openUid');
ev('moveSessionUnit(0, 1)');
const sessaoIdxSupino = ev("activeSession.exercises.findIndex(e => e.exercise === 'Supino Reto com Barra')");
check('▲▼ reordena e a unidade aberta anda com o exercício (uid estável, não índice)',
    sessaoIdxSupino === 1 && ev('activeSession.openUid') === sessaoUidAbertaAntes
    && sessaoHeaders().some(b => b.getAttribute('aria-expanded') === 'true' && b.textContent.includes('Supino')));
check('rascunho sobrevive à reordenação, inclusive a série parcialmente preenchida',
    document.querySelector(`[data-setw="s${sessaoIdxSupino}-0"]`).value === '30'
    && document.querySelector(`[data-setr="s${sessaoIdxSupino}-0"]`).value === ''
    && document.querySelector(`[data-setr="s${sessaoIdxSupino}-1"]`).value === '10'
    && $(`s${sessaoIdxSupino}-w`).value === '77' && $(`s${sessaoIdxSupino}-mode`).value === 'sets',
    { idx: sessaoIdxSupino });

console.log('\n== UI 10d. Sessão: bi-set e registro inválido/válido ==');
ev(`activeSession = {
    workoutId: 999002, name: 'Bi-set Sintético UI', ordenado: false,
    exercises: [
        { muscle: 'Peito', exercise: 'Supino Reto com Barra', type: 'carga_total', weight: 60, repsText: '10, 10', technique: 'Convencional', biset: false, done: false, logId: null, draft: null, extra: false, loggedWeight: null, loggedReps: null, loggedPR: false, orderReason: '' },
        { muscle: 'Bíceps', exercise: 'Rosca Direta com Barra', type: 'barra', weight: 20, repsText: '12, 12', technique: 'Convencional', biset: true, done: false, logId: null, draft: null, extra: false, loggedWeight: null, loggedReps: null, loggedPR: false, orderReason: '' },
        { muscle: 'Costas', exercise: 'Remada Curvada com Barra', type: 'barra', weight: 40, repsText: '10, 10', technique: 'Convencional', biset: false, done: false, logId: null, draft: null, extra: false, loggedWeight: null, loggedReps: null, loggedPR: false, orderReason: '' }
    ]
};
renderSession();`);
check('bi-set vira UMA unidade expansível com os dois formulários e o rótulo do par',
    sessaoHeaders().length === 2 && !!$('s0-w') && !!$('s1-w') && !!$('s2-w')
    && $('session-exercises-list').textContent.includes('BI-SET') && sessaoHeaders()[0].textContent.includes('1+2'));
check('registro conjunto do bi-set num só botão',
    !!btnIn($('session-exercises-list'), 'Registrar Bi-set') && ($('session-exercises-list').innerHTML.match(/registerSessionUnit/g) || []).length === 2);
ev('stopSessionTimer();');
$('s0-r').value = ''; $('s1-r').value = '';
const sessaoLogsAntesInvalido = ev('logs.length');
click(btnIn($('session-exercises-list'), 'Registrar'));
check('registro inválido não cria log nem avança o progresso',
    ev('logs.length') === sessaoLogsAntesInvalido && $('session-progress-text').textContent === '0 / 3 exercícios');
check('registro inválido mantém/abre a unidade afetada e não inicia descanso',
    sessaoHeaders()[0].getAttribute('aria-expanded') === 'true' && ev('timer.running') === false && $('session-timer-display').textContent === '00:00');
$('s0-w').value = '60'; $('s0-r').value = '10, 8';
$('s1-w').value = '20'; $('s1-r').value = '12, 12';
const sessaoLogsAntesPar = ev('logs.length');
click(btnIn($('session-exercises-list'), 'Registrar Bi-set'));
check('bi-set válido registra os dois juntos (2 logs marcados como bi-set)',
    ev('logs.length') === sessaoLogsAntesPar + 2 && ev('logs[0].biset === true && logs[1].biset === true'));
check('unidade concluída fica compacta (com ✏️ Editar) e a próxima pendente abre',
    $('session-progress-text').textContent === '2 / 3 exercícios' && sessaoHeaders().length === 1
    && sessaoHeaders()[0].textContent.includes('Remada') && sessaoHeaders()[0].getAttribute('aria-expanded') === 'true'
    && ($('session-exercises-list').innerHTML.match(/✏️ Editar/g) || []).length === 2);
check('o descanso do par começa depois do registro conjunto',
    $('session-timer-display').textContent !== '00:00', $('session-timer-display').textContent);
$('s2-w').value = '40'; $('s2-r').value = '10, 10';
click(btnIn($('session-exercises-list'), 'Registrar'));
check('último registro fecha o progresso 3/3 e o resumo de treino completo aparece',
    $('session-progress-text').textContent === '3 / 3 exercícios' && !$('session-next-hint').classList.contains('hidden'));

console.log('\n== UI 10e. Registro rápido: Extra no treino em andamento (Objetivo 2) ==');
ev(`activeSession = {
    workoutId: 999003, name: 'Extra Sintético UI', ordenado: false,
    exercises: [
        { muscle: 'Peito', exercise: 'Supino Reto com Barra', type: 'carga_total', weight: 60, repsText: '10, 10', technique: 'Convencional', biset: false, done: false, logId: null, draft: null, extra: false, loggedWeight: null, loggedReps: null, loggedPR: false, orderReason: '' },
        { muscle: 'Bíceps', exercise: 'Rosca Direta com Barra', type: 'barra', weight: 20, repsText: '12, 12', technique: 'Convencional', biset: false, done: false, logId: null, draft: null, extra: false, loggedWeight: null, loggedReps: null, loggedPR: false, orderReason: '' }
    ]
};
renderSession();`);
check('com sessão ativa a opção "Contar no treino em andamento" aparece no Registro rápido',
    !$('log-session-extra-wrap').classList.contains('hidden') && $('log-session-extra-wrap').textContent.includes('Contar no treino em andamento'));
setSelect('mode', 'simple');
setInput('log-exercise', 'Puxada Frontal');
setInput('w', '50'); setInput('r', '10, 10');
const sessaoLogsAntesOpcaoOff = ev('logs.length');
fire($('workout-form'), 'submit');
check('opção desmarcada: cria o log no histórico e NÃO altera o progresso (comportamento anterior)',
    ev('logs.length') === sessaoLogsAntesOpcaoOff + 1 && $('session-progress-text').textContent === '0 / 2 exercícios'
    && ev('activeSession.exercises.length') === 2 && !ev('activeSession.exercises.some(e => e.extra)'));
$('log-count-in-session').checked = true;
setInput('log-exercise', 'Crucifixo Inclinado com Halteres');
setInput('w', '14'); setInput('r', '12, 12');
const sessaoLogsAntesContado = ev('logs.length');
fire($('workout-form'), 'submit');
const sessaoExtraInfo = ev("(() => { const e = activeSession.exercises.find(x => x.extra); return e ? { total: activeSession.exercises.length, done: activeSession.exercises.filter(x => x.done).length, logId: e.logId, logsDoId: logs.filter(l => l.id === e.logId).length } : null; })()");
check('com a opção marcada, o registro vira item EXTRA CONCLUÍDO ligado ao id do log, sem 2º log',
    ev('logs.length') === sessaoLogsAntesContado + 1 && !!sessaoExtraInfo
    && sessaoExtraInfo.total === 3 && sessaoExtraInfo.done === 1 && sessaoExtraInfo.logsDoId === 1, sessaoExtraInfo);
check('total, concluídos, barra e resumo atualizam (0/2 → 1/3)',
    $('session-progress-text').textContent === '1 / 3 exercícios'
    && parseFloat($('session-progress-bar').style.width) > 33 && parseFloat($('session-progress-bar').style.width) < 34);
check('item extra identificado visualmente com o selo "Extra"',
    $('session-exercises-list').innerHTML.includes('>Extra</span>'));
check('o mesmo logId não é anexado duas vezes',
    ev(`appendSessionExtra(logs.find(l => l.id === ${sessaoExtraInfo.logId}))`) === false
    && ev('activeSession.exercises.filter(e => e.extra).length') === 1);
$('log-count-in-session').checked = true;
setInput('log-exercise', 'Supino Reto com Barra');
check('nome igual ao de item planejado pendente mostra o aviso antes de salvar',
    !$('log-session-match-note').classList.contains('hidden') && $('log-session-match-note').textContent.includes('NÃO conclui o item planejado'));
setInput('w', '62'); setInput('r', '8, 8');
const sessaoLogsAntesIgual = ev('logs.length');
fire($('workout-form'), 'submit');
check('nome igual com opção marcada: extra DISTINTO entra e o planejado continua pendente',
    ev('logs.length') === sessaoLogsAntesIgual + 1
    && ev('activeSession.exercises[0].done === false && activeSession.exercises[0].logId === null')
    && ev('activeSession.exercises.filter(e => e.extra).length') === 2);
check('progresso conta o extra sem concluir o planejado (2/4)',
    $('session-progress-text').textContent === '2 / 4 exercícios');
$('log-count-in-session').checked = false;
setInput('log-exercise', 'Rosca Direta com Barra');
setInput('w', '22'); setInput('r', '12');
const sessaoLogsAntesSoHist = ev('logs.length');
fire($('workout-form'), 'submit');
check('nome igual com opção desmarcada: fica só no histórico, sem tocar no progresso',
    ev('logs.length') === sessaoLogsAntesSoHist + 1 && $('session-progress-text').textContent === '2 / 4 exercícios'
    && ev('activeSession.exercises[1].done === false && activeSession.exercises[1].logId === null')
    && ev('activeSession.exercises.filter(e => e.extra).length') === 2);
const sessaoExtraLogId = ev('activeSession.exercises.filter(e => e.extra)[1].logId');
ev(`editLog(${sessaoExtraLogId})`);
check('✏️ Editar do item extra abre o editor de registro pelo log associado',
    !!$('edit-log-overlay') && $('edit-log-overlay').textContent.includes('Editar registro'));
$('el-e').value = 'Supino Reto Editado no Extra';
ev(`saveEditedLog(${sessaoExtraLogId})`);
check('editar o log do extra atualiza o resumo sem aumentar a contagem',
    ev('activeSession.exercises.length') === 4
    && ev(`activeSession.exercises.find(e => e.logId === ${sessaoExtraLogId}).exercise`) === 'Supino Reto Editado no Extra'
    && $('session-progress-text').textContent === '2 / 4 exercícios');
ev(`deleteLog(${sessaoExtraLogId})`);
click($('confirm-modal-yes'));
check('excluir o log do extra remove o item da sessão e corrige o progresso',
    ev(`activeSession.exercises.every(e => e.logId !== ${sessaoExtraLogId})`) && ev('activeSession.exercises.length') === 3
    && $('session-progress-text').textContent === '1 / 3 exercícios');
click(btnIn($('session-exercises-list'), 'Registrar'));
const sessaoPlannedLogId = ev('activeSession.exercises[0].logId');
check('registrar o planejado pelo cartão conclui o item', sessaoPlannedLogId != null && ev('activeSession.exercises[0].done') === true && $('session-progress-text').textContent === '2 / 3 exercícios');
ev(`deleteLog(${sessaoPlannedLogId})`);
click($('confirm-modal-yes'));
check('excluir log de exercício planejado mantém o comportamento anterior (volta a pendente)',
    ev('activeSession.exercises[0].done') === false && ev('activeSession.exercises[0].logId') === null
    && $('session-progress-text').textContent === '1 / 3 exercícios');

console.log('\n== UI 10f. Sessão: aquecimento próprio, acessibilidade e Registro rápido sem sessão ==');
ev(`activeSession = {
    workoutId: 999004, name: 'Ferramentas Sintéticas UI', ordenado: false,
    exercises: [
        { muscle: 'Ombros', exercise: 'Elevação Lateral', type: 'halter_par', weight: 10, repsText: '15, 15', technique: 'Convencional', biset: false, done: false, logId: null, draft: null, extra: false, loggedWeight: null, loggedReps: null, loggedPR: false, orderReason: '' }
    ]
};
renderSession();`);
setInput('w', '100');   // campo GLOBAL do Registro rápido (não pode entrar no cálculo da sessão)
$('s0-w').value = '60';
const sessaoWarmBtn = $('session-exercises-list').querySelector('[data-action="showWarmupFor"]');
const sessaoPlatesBtn = $('session-exercises-list').querySelector('[data-action="showPlatesFor"]');
check('unidade usa os handlers da sessão (showWarmupFor/showPlatesFor) em vez do quickCapture global',
    !!sessaoWarmBtn && !!sessaoPlatesBtn && !!$('form-card-container').querySelector('[data-action="calculateWarmupFromForm"]'));
click(sessaoWarmBtn);
check('aquecimento da unidade calcula pela carga s0-w, ignorando o campo global w',
    $('s0-warmup-quick-box') && !$('s0-warmup-quick-box').classList.contains('hidden')
    && $('s0-warmup-quick-content').textContent.includes('60 kg') && !$('s0-warmup-quick-content').textContent.includes('para 100 kg'));
check('estado expandido anunciado (aria-expanded + aria-controls) e toque mínimo de 44 px no cabeçalho',
    sessaoHeaders().every(b => b.getAttribute('aria-expanded') === 'true' || b.getAttribute('aria-expanded') === 'false')
    && sessaoHeaders().every(b => b.hasAttribute('aria-controls') && b.classList.contains('min-h-[44px]')));
check('▲▼, ✔ Registrar e ✏️ Editar têm alvo mínimo de 44 px',
    [...$('session-exercises-list').querySelectorAll('button')]
        .filter(b => /▲|▼|Registrar|Editar/.test(b.textContent))
        .every(b => b.classList.contains('min-h-[44px]')));
check('todo controle da sequência é elemento nativo de botão (toque e teclado)',
    [...$('session-exercises-list').querySelectorAll('[data-action]')].every(el => el.tagName === 'BUTTON'));
ev('activeSession.exercises.forEach(e => { e.done = true; }); renderSession(); endSession();');
check('sem sessão ativa a opção de extra some e o appendSessionExtra não faz nada',
    $('log-session-extra-wrap').classList.contains('hidden') && ev('appendSessionExtra({ id: 987654321 })') === false);
setInput('log-exercise', 'Rosca Scott');
setInput('w', '18'); setInput('r', '12, 12');
const sessaoLogsSemSessao = ev('logs.length');
fire($('workout-form'), 'submit');
check('Registro rápido sem sessão ativa continua igual (cria o log, sem tocar em sessão)',
    ev('logs.length') === sessaoLogsSemSessao + 1 && ev('activeSession') === null);
ev('logs = window.__sessaoCompactaLogsBackup; delete window.__sessaoCompactaLogsBackup; saveLogsToStorage(); refreshAll();');
ev('activeSession = null; document.getElementById("active-session-card").classList.add("hidden"); updateSessionExtraHint(); stopSessionTimer();');
