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