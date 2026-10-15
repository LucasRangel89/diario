/* ============================================================
   ARTE PRÓPRIA, BADGES, MANIFEST, RESERVAS, SESSÃO E ALERTA DE LOMBAR
   ------------------------------------------------------------
   Trecho de test_engine.js, movido sem alterar a lógica dos testes.
   Avaliado pelo runner no MESMO escopo dos demais trechos (ordem do nome).
   ============================================================ */

console.log('\n== 22. Arte própria: emblemas de patente, selos, cards e retratos ==');
{
    const THEME_IDS = ['classico','zodiaco','hercules','acao','folclore','nordica','roma','rpg','galactica','aneis'];
    const missing = [];
    let heavy = [];
    for (const t of THEME_IDS) {
        for (let lvl = 1; lvl <= 10; lvl++) {
            const f = `images/patentes/${t}-${String(lvl).padStart(2,'0')}.webp`;
            if (!fs.existsSync(f)) missing.push(f);
            else if (fs.statSync(f).size > 60 * 1024) heavy.push(f);
        }
        for (const f of [`images/temas/${t}.webp`, `images/cards/${t}.webp`]) if (!fs.existsSync(f)) missing.push(f);
    }
    check('100 emblemas de patente + 10 selos + 10 fundos de card existem', missing.length === 0, missing.slice(0, 6));
    check('emblemas de patente ficam leves (<= 60 KB cada)', heavy.length === 0, heavy.slice(0, 4));
    const appSrc = fonteJs();
    const s0 = appSrc.indexOf('const DEFAULT_BOSS_PORTRAITS');
    const block = appSrc.slice(s0, appSrc.indexOf('};', s0));
    const entries = [...block.matchAll(/'([a-z]+):([a-zA-Z0-9]+)':\s*'([^']+)'/g)];
    check('120 retratos mapeados, um por chefão, e todos existem no disco',
        entries.length === 120 && entries.every(([, t, id, file]) => !!api.THEMES[t] && !!api.THEMES[t].bosses.find(b => b.id === id) && fs.existsSync(file)),
        { encontrados: entries.length });
    check('cada tema cobre os 12 chefões com retrato próprio',
        THEME_IDS.every(t => entries.filter(([, th]) => th === t).length === 12),
        THEME_IDS.map(t => `${t}:${entries.filter(([, th]) => th === t).length}`));
}

console.log('\n== 23. Badges: 16 medalhões de arte própria ==');
{
    const BADGE_SLUGS = ['primeiro-sangue','ofensiva-semanal','mover-titan','cacador-de-prs',
        'maratonista','tanque-de-guerra','berzerker-master','cacador-de-chefoes',
        'primeiro-deload','semana-completa','colecionador','mestre-dos-chefoes',
        'mes-de-ferro','corredor','sequencia-de-aco','nivel-10'];
    const missing = BADGE_SLUGS.filter(s => !fs.existsSync(`images/badges/${s}.webp`));
    const heavy = BADGE_SLUGS.filter(s => fs.existsSync(`images/badges/${s}.webp`) && fs.statSync(`images/badges/${s}.webp`).size > 60 * 1024);
    check('16 medalhões de badge existem no disco e ficam leves (<= 60 KB)', missing.length === 0 && heavy.length === 0, { missing, heavy });
    const swSrc = fs.readFileSync('sw.js', 'utf8');
    check('os 16 badges entram no CORE do service worker', BADGE_SLUGS.every(s => swSrc.includes(`'./images/badges/${s}.webp'`)));
    const appSrc = fonteJs();
    const m = appSrc.match(/const BADGE_ART = [\s\S]*?\]\)/);
    check('BADGE_ART do app lista exatamente os 16 slugs com arte', !!m && BADGE_SLUGS.every(s => m[0].includes(`'${s}'`)) && (m[0].match(/'[a-z0-9-]+'/g) || []).length === 16, m && (m[0].match(/'[a-z0-9-]+'/g) || []).length);
    check('badge sem arquivo volta pro emoji (fallback no onerror)', /badgeArtFallback/.test(appSrc) && /data-fallback/.test(appSrc));
}

// Dimensões de um WebP lendo o cabeçalho (VP8/VP8L/VP8X) — sem depender de
// ImageMagick, que não existe no runner do CI.
function webpSize(file) {
    const b = fs.readFileSync(file);
    if (b.length < 16 || b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') return null;
    let off = 12;
    while (off + 8 <= b.length) {
        const fourcc = b.toString('ascii', off, off + 4);
        const size = b.readUInt32LE(off + 4);
        const data = b.subarray(off + 8, off + 8 + size);
        if (fourcc === 'VP8X') return { w: 1 + data.readUIntLE(4, 3), h: 1 + data.readUIntLE(7, 3) };
        if (fourcc === 'VP8 ') return { w: data.readUInt16LE(6) & 0x3fff, h: data.readUInt16LE(8) & 0x3fff };
        if (fourcc === 'VP8L') {
            const bits = data.readUInt32LE(1);
            return { w: 1 + (bits & 0x3fff), h: 1 + ((bits >>> 14) & 0x3fff) };
        }
        off += 8 + size + (size % 2);
    }
    return null;
}

console.log('\n== 24. Manifest com screenshots (prompt de instalação rico) ==');
{
    const manifest = JSON.parse(fs.readFileSync('manifest.webmanifest', 'utf8'));
    const shots = manifest.screenshots || [];
    const dims = { 'narrow': '1080x1920', 'wide': '1920x1080' };
    check('manifest declara 2 screenshots (retrato + paisagem)', shots.length === 2 && shots.every(s => fs.existsSync(s.src)), shots.map(s => s.src));
    check('screenshots têm o form_factor e o tamanho certos no disco',
        shots.every(s => {
            const want = dims[s.form_factor];
            if (!want || s.sizes !== want) return false;
            const dim = webpSize(s.src);
            return !!dim && `${dim.w}x${dim.h}` === want;
        }), shots.map(s => `${s.form_factor}:${s.sizes}`));
    check('screenshots ficam leves para o prompt de instalação', shots.every(s => fs.statSync(s.src).size <= 400 * 1024), shots.map(s => fs.statSync(s.src).size));
}

console.log('\n== 25. Estúdio de reservas: manifesto e integração ==');
{
    const idx = JSON.parse(fs.readFileSync('images/bosses/reserva/index.json', 'utf8'));
    const itens = Object.values(idx.temas).flat();
    check('index.json lista as 35 reservas e todas existem no disco', idx.total === 35 && itens.length === 35 && itens.every(i => fs.existsSync(i.file)), itens.length);
    check('cada reserva cai no tema certo pelo prefixo do arquivo', Object.entries(idx.temas).every(([t, lista]) => lista.every(i => i.file.includes(`/reserva/${t}-`) && i.label && i.slug)));
    const appSrc25 = fonteJs();
    check('app lê o manifesto e reaproveita bossPortraits (upload por chefão)', /loadReservaManifest\(\)/.test(appSrc25) && /function applyReservaPortrait/.test(appSrc25) && /bossPortraits\[reservaBossId\] = src/.test(appSrc25) && /delete bossPortraits\[reservaBossId\]/.test(appSrc25));
    check('index.json das reservas entra no CORE do service worker', fs.readFileSync('sw.js', 'utf8').includes("'./images/bosses/reserva/index.json'"));
}

console.log('\n== 26. Grupos canônicos no estímulo semanal ==');
check('normalizeMuscle tolera plural, acento e caixa',
    api.normalizeMuscle('posteriores') === 'Posterior' && api.normalizeMuscle('POSTERIOR') === 'Posterior'
    && api.normalizeMuscle('Biceps') === 'Bíceps' && api.normalizeMuscle('bíceps') === 'Bíceps'
    && api.normalizeMuscle('  ombros  ') === 'Ombros' && api.normalizeMuscle('ANTEBRACO') === 'Antebraço'
    && api.normalizeMuscle('abdomen') === 'Abdômen' && api.normalizeMuscle('triceps') === 'Tríceps',
    ['posteriores', 'Biceps', 'ANTEBRACO', 'abdomen'].map(api.normalizeMuscle));
check('grupos extintos continuam remapeados', api.normalizeMuscle('Glúteos') === 'Posterior' && api.normalizeMuscle('Pescoço') === 'Ombros');
check('vazio cai em Geral e grupo fora do vocabulário passa adiante', api.normalizeMuscle('') === 'Geral' && api.normalizeMuscle('Panturrilha') === 'Panturrilha');

const logsVariantes = [
    { id: 1, kind: 'peso', muscle: 'Posterior', date: '2026-10-13', exercise: 'Mesa Flexora', reps: [15, 15] },
    { id: 2, kind: 'peso', muscle: 'posteriores', date: '2026-10-14', exercise: 'Stiff com Barra', reps: [10, 10, 10] },
    { id: 3, kind: 'peso', muscle: 'Glúteos', date: '2026-10-14', exercise: 'Elevação Pélvica (Hip Thrust)', sets: [{}, {}, {}] }
];
const semCanonica = api.weeklySetsByMuscle(logsVariantes, '2026-10-14');
check('variantes do mesmo grupo somam numa chave só (Posterior = 8)',
    semCanonica['Posterior'] === 8 && Object.keys(semCanonica).length === 1, semCanonica);
check('weeklyGaps enxerga as 8 séries canônicas de Posterior',
    api.weeklyGaps(logsVariantes, '2026-10-14').some(g => g.muscle === 'Posterior' && g.series === 8 && g.faltam === 2));
check('apoio indireto não confunde variante do próprio grupo com outro grupo',
    api.sinergiaLogs('Posterior', [{ id: 4, kind: 'peso', muscle: 'posteriores', date: '2026-10-14', exercise: 'Agachamento Livre', reps: [8, 8] }]).length === 0
    && api.sinergiaLogs('Posterior', [{ id: 5, kind: 'peso', muscle: 'Pernas', date: '2026-10-14', exercise: 'Agachamento Livre', reps: [8, 8] }]).length === 1);

api.savedWorkouts = [{
    id: 1, name: 'Posterior/Acessórios', exercises: [
        { muscle: 'Pernas', exercise: 'Mesa Flexora' },
        { muscle: 'Glúteos', exercise: 'Elevação Pélvica (Hip Thrust)' },
        { muscle: 'Pernas', exercise: 'Leg Press 45°' },
        { muscle: 'Costas', exercise: 'Exercício inventado pelo usuário' }
    ]
}];
api.normalizeSavedWorkouts();
check('treino salvo rederiva o grupo pelo catálogo (Mesa Flexora → Posterior)',
    api.savedWorkouts[0].exercises.map(e => e.muscle).join('|') === 'Posterior|Posterior|Pernas|Costas',
    api.savedWorkouts[0].exercises.map(e => e.muscle));
api.savedWorkouts = [];

console.log('\n== 27. Autofill flexível: apelidos, prefixo único e sessão sugerida ==');
check('apelidos falados caem no exercício certo',
    api.catalogInfo('stiff').nome === 'Stiff com Barra'
    && api.catalogInfo('TERRA').nome === 'Levantamento Terra'
    && api.catalogInfo('supino').nome === 'Supino Reto na Máquina'
    && api.catalogInfo('hip thrust').grupo === 'Posterior'
    && api.catalogInfo('serrote').nome === 'Remada Unilateral c/ Halter'
    && api.catalogInfo('hack').nome === 'Agachamento Hack',
    ['stiff', 'TERRA', 'supino', 'hip thrust', 'serrote', 'hack'].map(n => (api.catalogInfo(n) || {}).nome));
check('apelidos ignoram acento e caixa', api.catalogInfo('ELEVAÇÃO PELVICA').nome === 'Elevação Pélvica (Hip Thrust)' && api.catalogInfo('Búlgaro').nome === 'Afundo Búlgaro');
check('apelidos antigos de migração continuam valendo', api.catalogInfo('agachamento búlgaro').nome === 'Afundo Búlgaro' && api.catalogInfo('prancha isometrica').nome === 'Prancha Isométrica' && api.catalogInfo('tríceps francês c/ halter').nome === 'Tríceps Francês na Polia');
check('catálogo tem ~30 apelidos novos além dos 6 de migração', Object.keys(api.CATALOG_ALIASES).length >= 36, Object.keys(api.CATALOG_ALIASES).length);
check('prefixo único de 4+ caracteres completa o nome', api.catalogInfo('mesa flex').nome === 'Mesa Flexora' && api.catalogInfo('cadeira ext').nome === 'Cadeira Extensora');
check('prefixo ambíguo ou curto demais não adivinha', api.catalogInfo('supino inclinado c') === null && api.catalogInfo('mes') === null && api.catalogInfo('exercício inexistente') === null && api.catalogInfo('') === null);
check('nome exato do catálogo continua tendo prioridade', api.catalogInfo('Supino Inclinado com Barra').nome === 'Supino Inclinado com Barra');

api.setLogs([
    { id: 1, date: '2026-10-06', kind: 'peso', muscle: 'Bíceps', exercise: 'Rosca Martelo', sessao: 'Bíceps/Costas' },
    { id: 2, date: '2026-10-06', kind: 'peso', muscle: 'Biceps', exercise: 'Rosca Direta com Barra', sessao: 'Bíceps/Costas' },
    { id: 3, date: '2026-10-10', kind: 'peso', muscle: 'Bíceps', exercise: 'Rosca Martelo', sessao: 'Full Body' },
    { id: 4, date: '2026-10-09', kind: 'peso', muscle: 'Posterior', exercise: 'Mesa Flexora', sessao: 'Posterior/Acessórios' },
    { id: 5, date: '2026-10-10', kind: 'corrida', muscle: 'Cardio', exercise: 'Corrida (Rua)', sessao: 'Cardio leve' }
]);
check('sessão sugerida = a mais repetida no histórico do grupo', api.suggestSessaoFor('Bíceps') === 'Bíceps/Costas', api.suggestSessaoFor('Bíceps'));
check('variante do grupo cai na mesma sugestão', api.suggestSessaoFor('biceps') === 'Bíceps/Costas' && api.suggestSessaoFor('posteriores') === 'Posterior/Acessórios');
check('grupo deriva do catálogo quando só o exercício é informado', api.suggestSessaoFor('', 'Mesa Flexora') === 'Posterior/Acessórios' && api.suggestSessaoFor(null, 'stiff') === 'Posterior/Acessórios');
check('Cardio e grupo sem histórico não sugerem sessão', api.suggestSessaoFor('Cardio') === '' && api.suggestSessaoFor('Antebraço') === '' && api.suggestSessaoFor('Geral') === '');
api.setLogs([...api.logsArr, { id: 6, date: '2026-10-11', kind: 'peso', muscle: 'Bíceps', exercise: 'Rosca Scott', sessao: 'Full Body' }]);
check('empate de uso desempata pela sessão mais recente', api.suggestSessaoFor('Bíceps') === 'Full Body', api.suggestSessaoFor('Bíceps'));
api.setLogs([]);

console.log('\n== 28. Meta de séries por grupo + apoio indireto visível ==');
check('Antebraço tem faixa própria (4–10)', api.FAIXA_SERIES_POR_GRUPO['Antebraço'].min === 4 && api.FAIXA_SERIES_POR_GRUPO['Antebraço'].max === 10);
check('faixaSeriesDoGrupo devolve a exceção e o padrão 10–20',
    api.faixaSeriesDoGrupo('Antebraço') === api.FAIXA_SERIES_POR_GRUPO['Antebraço']
    && api.faixaSeriesDoGrupo('antebraco') === api.FAIXA_SERIES_POR_GRUPO['Antebraço']
    && api.faixaSeriesDoGrupo('Peito') === api.FAIXA_SERIES_SEMANAIS
    && api.faixaSeriesDoGrupo('') === api.FAIXA_SERIES_SEMANAIS);
const fAntebraco = api.fatigueState('Antebraço', [], 6, Date.now());
check('fatigueState cobra a faixa do grupo: 6 séries de antebraço estão na faixa',
    fAntebraco.volumeStatus === 'na-faixa' && fAntebraco.faltam === 0 && fAntebraco.excesso === 0
    && fAntebraco.metaMin === 4 && fAntebraco.metaMax === 10 && fAntebraco.volText.includes('6/4–10 séries'), fAntebraco.volText);
const fPeitoMeta = api.fatigueState('Peito', [], 6, Date.now());
check('grupo sem exceção segue o padrão: 6 séries de peito = faltam 4',
    fPeitoMeta.metaMin === 10 && fPeitoMeta.metaMax === 20 && fPeitoMeta.faltam === 4, fPeitoMeta);

const logsMetaGrupo = [
    { id: 1, kind: 'peso', muscle: 'Antebraço', date: '2026-10-14', exercise: 'Flexão de Punho', reps: [12, 12] },
    { id: 2, kind: 'peso', muscle: 'Costas', date: '2026-10-14', exercise: 'Remada Baixa na Polia', reps: [10, 10, 10] }
];
const gapAntebraco = api.weeklyGaps(logsMetaGrupo, '2026-10-14').find(g => g.muscle === 'Antebraço');
check('gap traz a faixa do grupo (min/max) junto de series e faltam',
    gapAntebraco.min === 4 && gapAntebraco.max === 10 && gapAntebraco.series === 2 && gapAntebraco.faltam === 2 && gapAntebraco.status === 'abaixo', gapAntebraco);
check('gap soma o apoio indireto da semana (3 séries de remada × 0,5 = 1,5)', gapAntebraco.indiretas === 1.5, gapAntebraco.indiretas);
check('indiretas NÃO entram em series nem abatem faltam', gapAntebraco.series === 2 && gapAntebraco.faltam === 2);
check('grupo sem regra de sinergia vem com indiretas zeradas',
    api.weeklyGaps(logsMetaGrupo, '2026-10-14').find(g => g.muscle === 'Peito').indiretas === 0);
check('apoio de fora da semana não conta como indireto',
    api.weeklyGaps([{ id: 3, kind: 'peso', muscle: 'Costas', date: '2026-10-01', exercise: 'Remada Baixa na Polia', reps: [10, 10, 10] }], '2026-10-14')
        .find(g => g.muscle === 'Bíceps').indiretas === 0);
check('seriesIndiretasSemana é puro: mesmo vetor fora da semana = 0',
    api.seriesIndiretasSemana('Bíceps', [{ id: 4, kind: 'peso', muscle: 'Costas', date: '2026-10-14', exercise: 'Remada Baixa na Polia', reps: [10, 10, 10] }]) === 1.5
    && api.seriesIndiretasSemana('Peito', [{ id: 5, kind: 'peso', muscle: 'Costas', date: '2026-10-14', exercise: 'Remada Baixa na Polia', reps: [10, 10, 10] }]) === 0);
const gapAntebracoAcima = api.weeklyGaps(
    [{ id: 6, kind: 'peso', muscle: 'Antebraço', date: '2026-10-14', exercise: 'Flexão de Punho', sets: Array.from({ length: 12 }, () => ({})) }],
    '2026-10-14').find(g => g.muscle === 'Antebraço');
check('acima da faixa do grupo: 12 séries de antebraço = +2 sobre o máximo 10',
    gapAntebracoAcima.status === 'acima' && gapAntebracoAcima.excesso === 2 && gapAntebracoAcima.max === 10, gapAntebracoAcima);
check('gaps continuam ordenados pela maior falta', (() => {
    const g = api.weeklyGaps(logsMetaGrupo, '2026-10-14');
    return g.every((x, i) => i === 0 || g[i - 1].faltam >= x.faltam);
})());

console.log('\n== 29. Card do Chefão: moldura escalável e quebra da brecha tática ==');
// ctx de mentira que mede 10 px por caractere — suficiente para testar a quebra
const ctxMedidor = { measureText: s => ({ width: String(s).length * 10 }) };
check('wrapCanvasText quebra palavra a palavra pela largura',
    api.wrapCanvasText(ctxMedidor, 'aaa bbb ccc ddd', 100, 2).join('|') === 'aaa bbb|ccc ddd',
    api.wrapCanvasText(ctxMedidor, 'aaa bbb ccc ddd', 100, 2));
check('o que não cabe na última linha é cortado com reticências',
    api.wrapCanvasText(ctxMedidor, 'aaa bbb ccc ddd eee', 70, 2).join('|') === 'aaa bbb|ccc dd…',
    api.wrapCanvasText(ctxMedidor, 'aaa bbb ccc ddd eee', 70, 2));
check('maxLinhas 1 devolve uma linha só, cortada',
    api.wrapCanvasText(ctxMedidor, 'aaa bbb ccc', 70, 1).join('|') === 'aaa bb…',
    api.wrapCanvasText(ctxMedidor, 'aaa bbb ccc', 70, 1));
check('texto curto não quebra nem ganha reticências',
    api.wrapCanvasText(ctxMedidor, 'Brecha tática: curta', 880, 2).join('|') === 'Brecha tática: curta');
check('medida não-numérica vira 0 (texto inteiro numa linha, sem loop)',
    api.wrapCanvasText({ measureText: () => ({ width: NaN }) }, 'Brecha tática: texto longo que ninguém consegue medir aqui', 880, 2).length === 1
    && api.wrapCanvasText({}, 'a b c d', 880, 2).length === 1);
check('texto vazio devolve lista vazia', api.wrapCanvasText(ctxMedidor, '', 880, 2).length === 0 && api.wrapCanvasText(ctxMedidor, null, 880, 2).length === 0);

const appSrcCard = fonteJs();
check('drawThemedFrame lê o canvas real e escala a arte 1080×1920',
    /function drawThemedFrame\(ctx, palette\)[\s\S]{0,420}ctx\.scale\(W \/ 1080, H \/ 1920\)/.test(appSrcCard)
    && /canvasMeasure\(ctx && ctx\.canvas && ctx\.canvas\.width, 1080\)/.test(appSrcCard)
    && /canvasMeasure\(ctx && ctx\.canvas && ctx\.canvas\.height, 1920\)/.test(appSrcCard));
check('moldura continua desenhada entre save() e restore()',
    /ctx\.save\(\);\s*ctx\.scale\(W \/ 1080, H \/ 1920\);\s*drawThemedFrameArt\(ctx, palette\);\s*ctx\.restore\(\);/.test(appSrcCard));
check('card do chefão desenha a brecha tática em até 2 linhas de 880 px',
    /wrapCanvasText\(ctx, `Brecha tática: \$\{boss\.weakReason \|\| 'Ataque temático\.'\}`, 880, 2\)/.test(appSrcCard));
check('layout do card reequilibrado (688 · 736 · 782 · 880 · 940 · 990)',
    [688, 736, 782, 880, 940, 990].every(y => appSrcCard.includes(`, 540, ${y}`)),
    [688, 736, 782, 880, 940, 990].filter(y => !appSrcCard.includes(`, 540, ${y}`)));

console.log('\n== 30. Temporada de 4 semanas e deload automático ==');
const deslocaDia = (iso, dias) => {
    const d = new Date(`${iso}T12:00:00`);
    d.setDate(d.getDate() + dias);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const hojeSeason = api.getTodayLocalISO();
check('temporada tem 4 semanas (ciclo curto, troféu chega logo)', api.SEASON_WEEKS === 4);
check('seasonState: dia 22 está na semana 4, sem terminar', (() => {
    const s = api.seasonState({ start: deslocaDia(hojeSeason, -22), completed: [] }, hojeSeason);
    return s.currentWeek === 4 && s.finished === false && s.progressPct === 79;
})(), api.seasonState({ start: deslocaDia(hojeSeason, -22), completed: [] }, hojeSeason));
check('seasonState: a temporada termina no dia 28', api.seasonState({ start: deslocaDia(hojeSeason, -28), completed: [] }, hojeSeason).finished === true);

const [wsHoje] = api.isoWeekRange(hojeSeason);
const semanaAtual = api.isoWeekKey(hojeSeason);
check('4ª semana = dias 21 a 27 da temporada', api.autoDeloadWeekKeys({ start: deslocaDia(wsHoje, -21), completed: [] }).join() === semanaAtual, api.autoDeloadWeekKeys({ start: deslocaDia(wsHoje, -21), completed: [] }));
check('temporada em andamento e concluídas geram as próprias semanas', (() => {
    const keys = api.autoDeloadWeekKeys({ start: '2026-10-05', completed: [{ start: '2026-09-07', end: '2026-10-05', xp: 100, trophy: '🏆' }] });
    return keys.length === 2 && keys.includes(api.isoWeekKey('2026-10-26')) && keys.includes(api.isoWeekKey('2026-09-28'));
})(), api.autoDeloadWeekKeys({ start: '2026-10-05', completed: [{ start: '2026-09-07' }] }));
check('temporadas repetidas não duplicam a chave', api.autoDeloadWeekKeys({ start: '2026-10-05', completed: [{ start: '2026-10-05' }] }).length === 1);
check('sem temporada não há deload automático', api.autoDeloadWeekKeys(null).length === 0 && api.autoDeloadWeekKeys({}).length === 0 && api.autoDeloadWeekKeys({ start: 'data inválida' }).length === 0);

api.setDeloadWeeks([api.isoWeekKey(deslocaDia(hojeSeason, -14))]);
api.setSeasons(null);
check('deload efetivo = manual ∪ automático (sem duplicar a mesma semana)', (() => {
    const efetivas = api.deloadWeeksEfetivos({ start: deslocaDia(wsHoje, -21), completed: [] });
    return efetivas.length === 2 && efetivas.includes(semanaAtual) && efetivas.includes(api.isoWeekKey(deslocaDia(hojeSeason, -14)));
})(), api.deloadWeeksEfetivos({ start: deslocaDia(wsHoje, -21), completed: [] }));
api.setDeloadWeeks([semanaAtual]);
check('deload manual e automático na mesma semana não duplicam a chave',
    api.deloadWeeksEfetivos({ start: deslocaDia(wsHoje, -21), completed: [] }).length === 1,
    api.deloadWeeksEfetivos({ start: deslocaDia(wsHoje, -21), completed: [] }));
api.setDeloadWeeks([]);
check('com a semana 4 da temporada o deload vale sem marcar nada em Config',
    api.deloadWeeksEfetivos({ start: deslocaDia(wsHoje, -21), completed: [] }).join() === semanaAtual, api.deloadWeeksEfetivos({ start: deslocaDia(wsHoje, -21) }));

// dias de descanso: só até hoje (XP de descanso não pode ser antecipado)
api.setLogs([]);
api.setActiveTheme('classico');
api.setDeloadWeeks([semanaAtual]);
api.setSeasons(null);
api.themeSaves.classico = { missionsXpTotal: 0, missionsClaimed: {}, seasons: null, bossPortraits: {}, deloadRestDays: [] };
api.ensureDeloadRestAwards();
const diasAtribuidos = api.themeSaves.classico.deloadRestDays;
const diasEsperados = [];
for (let d = wsHoje; d <= hojeSeason; d = deslocaDia(d, 1)) diasEsperados.push(d);
check('dias de descanso vão de segunda até HOJE', diasAtribuidos.join() === diasEsperados.join(), { diasAtribuidos, diasEsperados });
check('nenhum dia futuro é atribuído (sem XP antecipado)', !diasAtribuidos.some(d => d > hojeSeason) && !diasAtribuidos.includes(deslocaDia(hojeSeason, 1)), diasAtribuidos);
check('dia com treino não vira dia de descanso', (() => {
    api.setLogs([{ id: 1, date: hojeSeason, kind: 'peso', muscle: 'Peito', exercise: 'Supino Reto na Máquina', reps: [10] }]);
    api.themeSaves.classico.deloadRestDays = [];
    api.ensureDeloadRestAwards();
    return !api.themeSaves.classico.deloadRestDays.includes(hojeSeason);
})(), api.themeSaves.classico.deloadRestDays);
api.setLogs([]);
api.setDeloadWeeks([]);
api.setSeasons({ start: deslocaDia(wsHoje, -21), completed: [] });
api.themeSaves.classico.deloadRestDays = [];
api.ensureDeloadRestAwards();
check('deload automático da 4ª semana também atribui os dias de descanso',
    api.themeSaves.classico.deloadRestDays.join() === diasEsperados.join(), api.themeSaves.classico.deloadRestDays);

const logSemana4 = { id: 2, date: deslocaDia(hojeSeason, -1), kind: 'peso', muscle: 'Peito', exercise: 'Supino Reto na Máquina', type: 'carga_total', weight: 100, reps: [10] };
const semanaDoLog = api.isoWeekKey(logSemana4.date);
const xpDeload = api.computeXP(hojeSeason, { logs: [logSemana4], bodyweight: 80, deloadWeeks: [semanaDoLog], missionsXpTotal: 0, bosses: [], restDays: [] }).training;
const xpNormal = api.computeXP(hojeSeason, { logs: [logSemana4], bodyweight: 80, deloadWeeks: [], missionsXpTotal: 0, bosses: [], restDays: [] }).training;
check('semana de deload rende metade do XP de volume', xpDeload === 5 && xpNormal === 10, { xpDeload, xpNormal });
const xpDescanso = api.computeXP(hojeSeason, { logs: [], bodyweight: 80, deloadWeeks: [semanaDoLog], missionsXpTotal: 0, bosses: [], restDays: [deslocaDia(hojeSeason, -1)] }).restXP;
check('dia de descanso na semana de deload rende +25 XP', xpDescanso === api.XP_REST_PER_DAY && xpDescanso === 25, xpDescanso);
api.setSeasons(null);
api.setDeloadWeeks([]);
api.themeSaves.classico.deloadRestDays = [];

console.log('\n== 31. Folclore Tupi-Guarani ==');
const folclore = api.THEMES.folclore;
const ranksFolclore = folclore.ranks.map(r => r[0]);
check('patentes do folclore seguem a raiz tupi-guarani',
    ranksFolclore.join('|') === ['Andarilho da Mata', 'Caçador de Encantados', 'Amigo do Uirapuru', 'Filho de Jaci', 'Filho de Guaraci', 'Guardião do Anhangá', 'Herdeiro de Boitatá', 'Guerreiro de Tupã', 'Maíra Imortal', 'LENDA DO BRASIL'].join('|'),
    ranksFolclore);
check('arena é a Mata Encantada', folclore.arena === 'Mata Encantada — Lendas do Brasil', folclore.arena);
check('missões viram Desafio(s) da Mata', folclore.missionWord === 'Desafio da Mata' && folclore.missionWordPlural === 'Desafios da Mata');
check('descrição do tema cita a tradição tupi-guarani', /tupi-guarani/i.test(folclore.desc), folclore.desc);
check('as patentes do sertão genérico saíram do tema', !ranksFolclore.some(n => /Sertão|Roça|Boiadeiro|Violeiro|Capanga|Arraial/.test(n)), ranksFolclore);
check('tema mantém 10 patentes com ícone, 12 chefões e moldura de madeira',
    folclore.ranks.length === 10 && folclore.ranks.every(r => r.length === 2 && !!r[1]) && folclore.bosses.length === 12 && folclore.frame === 'madeira');
check('título das missões usa o nome novo do tema',
    api.missionsState([], folclore, '2026-10-14').missions.every(m => m.title.startsWith('Desafio da Mata · ')),
    api.missionsState([], folclore, '2026-10-14').missions.map(m => m.title));
check('os 12 chefões continuam com fraqueza e brecha tática', folclore.bosses.every(b => !!b.weak && !!b.weakReason && b.maxHp > 0));
check('curva de HP e IDs dos chefões do folclore intactos',
    folclore.bosses.map(b => b.maxHp).join() === Array.from({ length: 12 }, (_, i) => 25000 + 2000 * i).join()
    && folclore.bosses.map(b => b.id).join() === Array.from({ length: 12 }, (_, i) => `b${i}`).join());


console.log('\n== 3.5. Alerta de lombar (assistente) ==');
const lombarLivre = api.regiaoLombarState([], Date.now());
check('sem carga: lombar livre 100%', lombarLivre.pct === 100 && lombarLivre.carregada === false, lombarLivre);
const lombarLogs = [{ id: 1, date: '2026-10-14', exercise: 'Levantamento Terra', muscle: 'Costas', reps: [5,5,5], kind: 'peso' }];
const lombarCarregada = api.regiaoLombarState(lombarLogs, new Date('2026-10-14T12:00:00').getTime());
check('terra carrega lombar (nivel 3)', api.nivelCargaLombar('Levantamento Terra') === 3);
check('lombar carregada apresenta horas restantes aproximadas', lombarCarregada.carregada === true && lombarCarregada.horasRestantes >= 0, lombarCarregada);

// ============================================================
// 32. Validação de data unificada (js/datas.js)
// A regra era duplicada (isoDataValida em app.js, dataDeRegistroValida em
// catalogo.js). Agora existe uma só. Este bloco FALHA se as duas voltarem a
// divergir, se alguém reintroduzir uma cópia da regra em outro arquivo ou se
// o CSV deixar de usar a mesma conferência de calendário.
// ============================================================