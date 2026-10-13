/* ============================================================
   GAMIFICAÇÃO — patentes, chefões, XP, missões e temporadas
   ============================================================ */

// Patente = XP ACUMULADO. XP vem de volume ajustado (com teto diário por
// grupo), PRs, corridas, chefões, missões semanais e descanso (deload).
const XP_MIN = [0, 150, 500, 1100, 2000, 3300, 5000, 7500, 11000, 16000];
const XP_GROUP_DAY_CAP = 60;        // teto de XP de volume por grupo muscular por dia
const XP_PR = 50;                   // XP por PR automático
const XP_REST_PER_DAY = 25;         // XP de descanso em semana de deload (dias sem treino)
const MISSION_XP = { treinos: 120, biset: 80, pr: 100, corrida: 80, fraco: 90 };

const mkBosses = (list, base, step) => list.map(([name, icon, desc], i) => ({
    id: 'b' + i, name, icon, desc,
    maxHp: base + step * i,
    weak: MUSCULOS_MAPA[i % MUSCULOS_MAPA.length] // cada chefe é fraco a um grupo (×1,25)
}));

const RANKS_CLASSIC = [
    { minXp: 0, level: 1, name: 'Formiga Atômica', icon: '🐜' },
    { minXp: 150, level: 2, name: 'Lobo Solitário', icon: '🐺' },
    { minXp: 500, level: 3, name: 'Urso do Ártico', icon: '🐻' },
    { minXp: 1100, level: 4, name: 'Gorila de Lombo Prateado', icon: '🦍' },
    { minXp: 2000, level: 5, name: 'Rinoceronte Blindado', icon: '🦏' },
    { minXp: 3300, level: 6, name: 'Elefante de Guerra', icon: '🐘' },
    { minXp: 5000, level: 7, name: 'T-Rex Devastador', icon: '🦖' },
    { minXp: 7500, level: 8, name: 'Leviatã dos Mares', icon: '🐉' },
    { minXp: 11000, level: 9, name: 'Behemoth Ancestral', icon: '👹' },
    { minXp: 16000, level: 10, name: 'BERZERKER SUPREMO', icon: '⚡' }
];

const BOSSES_CLASSIC = [
    { id: 'boss1', name: 'Golem de Anilhas', icon: '🗿', maxHp: 8000, desc: 'Monstro de Ferro das Forjas Primordiais.', weak: 'Pernas' },
    { id: 'boss2', name: 'Hydra de Titânio', icon: '🐉', maxHp: 20000, desc: 'Serpente Mítica de Aço temperado.', weak: 'Costas' },
    { id: 'boss3', name: 'Mecagorila Berzerker', icon: '🦍', maxHp: 45000, desc: 'Titan Biomecânico de Alta Pressão.', weak: 'Peito' },
    { id: 'boss4', name: 'Behemoth Devastador', icon: '👹', maxHp: 100000, desc: 'O Guardião Supremo das Cargas Pesadas.', weak: 'Ombros' }
];

const STORAGE_KEY_THEME = 'berzerker_game_theme_v1';

const THEMES = {
    classico: {
        id: 'classico', name: 'Berzerker (clássico)',
        desc: 'Formiga Atômica até Berzerker Supremo, com 4 chefões de ferro.',
        arena: 'Arena de Batalha de Chefão', bossLabel: 'CHEFÃO ATIVO', stageWord: 'ESTÁGIO',
                missionWord: 'Missão', missionWordPlural: 'Missões', frame: 'ferro',
        ranks: RANKS_CLASSIC.map(r => [r.name, r.icon]), bosses: BOSSES_CLASSIC
    },
    zodiaco: {
        id: 'zodiaco', name: 'Cavaleiros do Zodíaco',
        desc: 'Patentes pelo material da armadura; os guardiões das 12 casas e o Grande Mestre são os chefões.',
        arena: 'Santuário — As 12 Casas', bossLabel: 'GUARDIÃO ATIVO', stageWord: 'CASA',
                missionWord: 'Prova de Cosmo', missionWordPlural: 'Provas de Cosmo', frame: 'ouro',
        ranks: [['Aprendiz de Rodório', '🥋'], ['Cavaleiro de Bronze', '🥉'], ['Bronze · Cosmo Ardente', '🔥'], ['Cavaleiro de Prata', '🥈'], ['Prata · Sétimo Sentido', '✨'], ['Cavaleiro de Ouro', '🥇'], ['Ouro · Oitavo Sentido', '🌟'], ['Armadura Divina', '⚔️'], ['Cosmo Supremo', '🌌'], ['Lenda do Santuário', '👑']],
        bosses: mkBosses([
            ['Mu de Áries', '🐏', 'Casa de Áries — o ferreiro que guarda a primeira porta.'],
            ['Aldebarã de Touro', '🐂', 'Casa de Touro — uma muralha de força bruta.'],
            ['Saga de Gêmeos', '👥', 'Casa de Gêmeos — o labirinto de duas faces.'],
            ['Máscara da Morte de Câncer', '🦀', 'Casa de Câncer — a entrada do mundo dos mortos.'],
            ['Aiolia de Leão', '🦁', 'Casa de Leão — o Raio de Plasma.'],
            ['Shaka de Virgem', '🧘', 'Casa de Virgem — o mais próximo de um deus.'],
            ['Dohko de Libra', '⚖️', 'Casa de Libra — o Mestre Ancião de Rozan.'],
            ['Milo de Escorpião', '🦂', 'Casa de Escorpião — a Agulha Escarlate.'],
            ['Aiolos de Sagitário', '🏹', 'Casa de Sagitário — a armadura do herói que salvou Atena.'],
            ['Shura de Capricórnio', '🐐', 'Casa de Capricórnio — a lâmina da Excalibur.'],
            ['Camus de Aquário', '🧊', 'Casa de Aquário — o Mestre do Gelo.'],
            ['Afrodite de Peixes', '🌹', 'Casa de Peixes — a Rosa Sangrenta.'],
            ['Mestre Ares', '👑', 'Sala do Grande Mestre — o último desafio do Santuário.']
        ], 25000, 2000)
    },
    hercules: {
        id: 'hercules', name: '12 Trabalhos de Hércules',
        desc: 'Da condição de mortal ao Olimpo, enfrentando os 12 trabalhos em ordem.',
        arena: 'Os 12 Trabalhos de Hércules', bossLabel: 'DESAFIO ATIVO', stageWord: 'TRABALHO',
                missionWord: 'Trabalho Extra', missionWordPlural: 'Trabalhos Extra', frame: 'marmore',
        ranks: [['Mortal', '🧑'], ['Aprendiz de Quíron', '🐴'], ['Atleta de Atenas', '🏃'], ['Campeão da Arena', '🏟️'], ['Herói de Tebas', '🛡️'], ['Semideus', '💪'], ['Filho de Zeus', '⚡'], ['Olimpiano', '🏛️'], ['Titã', '🌋'], ['Imortal do Olimpo', '👑']],
        bosses: mkBosses([
            ['Leão de Neméia', '🦁', '1º Trabalho — a pele que nenhuma arma fura.'],
            ['Hidra de Lerna', '🐍', '2º Trabalho — corte uma cabeça, nascem duas.'],
            ['Corça de Cerineia', '🦌', '3º Trabalho — a caça mais veloz da Arcádia.'],
            ['Javali de Erimanto', '🐗', '4º Trabalho — a fúria da montanha.'],
            ['Estábulos de Áugias', '🧹', '5º Trabalho — décadas de sujeira em um só dia.'],
            ['Pássaros do Estínfalo', '🐦', '6º Trabalho — o bando de penas de bronze.'],
            ['Touro de Creta', '🐂', '7º Trabalho — a fera que aterrorizava a ilha.'],
            ['Éguas de Diomedes', '🐎', '8º Trabalho — cavalos que se alimentam de carne.'],
            ['Cinturão de Hipólita', '🛡️', '9º Trabalho — a rainha das Amazonas.'],
            ['Rebanho de Gerião', '🐄', '10º Trabalho — o gigante de três corpos.'],
            ['Maçãs das Hespérides', '🍎', '11º Trabalho — o dragão Ladão guarda o pomar.'],
            ['Cérbero', '🐕', '12º Trabalho — o cão de três cabeças do Hades.']
        ], 25000, 2000)
    },
    acao: {
        id: 'acao', name: 'Filmes de Ação',
        desc: 'Patentes de recruta a lenda do cinema; os vilões de cada clássico são os chefões.',
        arena: 'Cine Ação — Vilões em Cena', bossLabel: 'VILÃO ATIVO', stageWord: 'CENA',
        missionWord: 'Missão', missionWordPlural: 'Missões', frame: 'neon',
        ranks: [['Recruta', '🪖'], ['Policial Novato', '👮'], ['Duro de Matar', '🧨'], ['Agente Secreto', '🕵️'], ['Comando de Elite', '🎖️'], ['Lenda de Guerra', '🔫'], ['Herói de Ação', '💥'], ['O Escolhido', '🕶️'], ['Imbatível', '🚀'], ['Lenda do Cinema', '🎬']],
        bosses: mkBosses([
            ['O Esquadrão', '🧨', 'Cena 1 — caos urbano e muita munição.'],
            ['O Sequaz', '🥷', 'Cena 2 — silencioso e mortal.'],
            ['O Chefe do Crime', '🎩', 'Cena 3 — o cérebro por trás de tudo.'],
            ['O Predador', '👽', 'Cena 4 — caça pelo calor da batalha.'],
            ['O Exterminador', '🤖', 'Cena 5 — sem piedade, sem cansaço.'],
            ['O Coringa', '🃏', 'Cena 6 — anarquia pura.'],
            ['O Dragão', '🐲', 'Cena 7 — artes marciais sobrenaturais.'],
            ['O General', '🪖', 'Cena 8 — um exército inteiro atrás dele.'],
            ['O Fantasma', '👤', 'Cena 9 — ninguém escuta a aproximação.'],
            ['O Titã', '🦾', 'Cena 10 — força bruta industrial.'],
            ['O Imperador', '👑', 'Cena 11 — poder galáctico.'],
            ['O Chefe Final', '💀', 'Cena 12 — tudo termina aqui.']
        ], 25000, 2000)
    },
    folclore: {
        id: 'folclore', name: 'Folclore Brasileiro',
        desc: 'Do Novato da Roça à Lenda do Brasil: os seres do sertão encantado são os chefões.',
        arena: 'Sertão Encantado — Lendas do Brasil', bossLabel: 'LENDA ATIVA', stageWord: 'LENDA',
        missionWord: 'Desafio do Sertão', missionWordPlural: 'Desafios do Sertão', frame: 'madeira',
        ranks: [['Novato da Roça', '🌱'], ['Peão de Boiadeiro', '🤠'], ['Violeiro do Sertão', '🪕'], ['Capanga Valente', '⚔️'], ['Domador de Bestas', '🐎'], ['Herói do Arraial', '🎇'], ['Guardião da Mata', '🌿'], ['Caçador de Encantados', '🔥'], ['Mestre do Folclore', '✨'], ['LENDA DO BRASIL', '🇧🇷']],
        bosses: mkBosses([
            ['Saci-Pererê', '🌀', 'A travessura de uma perna só que faz das brasas brinquedo.'],
            ['Curupira', '🦶', 'Guardião da mata — os pés virados enganam quem caça.'],
            ['Caipora', '🐗', 'Senhor dos animais, montado no porco-do-mato, castiga caçadores.'],
            ['Lobisomem', '🐺', 'O sétimo filho condenado a uivar na lua cheia.'],
            ['Cuca', '🐊', 'A bruxa-jacaré que vem dos contos de ninar buscar quem não dorme.'],
            ['Mula-sem-Cabeça', '🐴', 'Fogo pelas guampas e ferraduras que incendeiam a estrada.'],
            ['Iara', '💧', 'A sereia dos rios: canta, encanta e não devolve.'],
            ['Boto Cor-de-Rosa', '🐬', 'O sedutor de chapéu branco das festas juninas.'],
            ['Boitatá', '🔥', 'A serpente de fogo que devora os campos secos.'],
            ['Naiá — Vitória-Régia', '🪷', 'A gigante das águas que arrasta para o fundo.'],
            ['Mapinguari', '👹', 'O gigante de um olho só, cujo rugido congela a floresta.'],
            ['Anhanguera', '😈', 'O senhor do pacto — a última porta do sertão encantado.']
        ], 25000, 2000)
    },
    nordica: {
        id: 'nordica', name: 'Mitologia Nórdica',
        desc: 'Do Escudeiro do Norte ao All-Father: os seres de Midgard e Asgard são os chefões.',
        arena: 'Ragnarök — Trilho dos Nove Mundos', bossLabel: 'AMEAÇA ATIVA', stageWord: 'MUNDO',
        missionWord: 'Prova de Valhalla', missionWordPlural: 'Provas de Valhalla', frame: 'runas',
        ranks: [['Escudeiro do Norte', '🛡️'], ['Guerreiro de Ferro', '⚔️'], ['Berserker', '🐻'], ['Caçador de Trolls', '🏹'], ['Jarl das Terras', '👑'], ['Filho de Thor', '⚡'], ['Escriba das Runas', '🔮'], ['Guerreiro de Valhalla', '🪓'], ['Semideus de Asgard', '🌩️'], ['ALL-FATHER', '🦅']],
        bosses: mkBosses([
            ['Draugr', '🧟', 'O morto que guarda o tesouro dos túmulos.'],
            ['Troll de Gelo', '👹', 'A montanha que se move e devora viajantes.'],
            ['Fenris, o Lobo', '🐺', 'O lobo acorrentado que só cresce.'],
            ['Valquíria Caída', '⚔️', 'A escolhida que virou as costas a Odin.'],
            ['Níðhöggr', '🐍', 'O dragão que rói as raízes de Yggdrasil.'],
            ['Jörmungandr', '🌊', 'A Serpente de Midgard que envolve o mundo.'],
            ['Surtr, o Flamejante', '🔥', 'O gigante de fogo com a espada do crepúsculo.'],
            ['Hela', '🖤', 'A rainha do reino dos mortos.'],
            ['Fafnir', '🐉', 'O anão ganancioso virado dragão guardião do ouro.'],
            ['Sköll, o Devorador de Sol', '🌑', 'O lobo que persegue o sol até devorá-lo.'],
            ['Ymir, o Primeiro', '🧊', 'O gigante primordial de quem o mundo foi feito.'],
            ['Ragnarök', '💀', 'O crepúsculo dos deuses — o fim de todas as coisas.']
        ], 25000, 2000)
    },
    roma: {
        id: 'roma', name: 'Gladiadores de Roma',
        desc: 'Do Escravo da Arena ao Imperador: gladiadores, feras e imperadores são os chefões.',
        arena: 'Coliseu — Areia dos Gladiadores', bossLabel: 'OPONENTE ATIVO', stageWord: 'COMBATE',
        missionWord: 'Prova da Arena', missionWordPlural: 'Provas da Arena', frame: 'louros',
        ranks: [['Escravo da Arena', '⛓️'], ['Novato de Ludus', '🪖'], ['Mirmilão', '⚔️'], ['Retiário', '🔱'], ['Hoplômaco', '🛡️'], ['Campeão do Coliseu', '🏆'], ['Pretoriano', '🦁'], ['Centurião', '📯'], ['General das Legiões', '🦅'], ['IMPERADOR DE ROMA', '👑']],
        bosses: mkBosses([
            ['Provocador da Arena', '🪓', 'O abridor de jogos: fome de sangue e aplausos.'],
            ['Mirmilão Feroz', '⚔️', 'Escudo pesado, gládio curto, sem recuo.'],
            ['Retiário Mestre', '🔱', 'Rede e tridente contra todo o peso.'],
            ['Dupla de Dimachaeri', '🗡️', 'Duas lâminas, um só objetivo.'],
            ['Bestiário & Pantera', '🐆', 'Homem e fera treinados para matar juntos.'],
            ['Carruagem de Guerra', '🐎', 'Ferro e velocidade na areia.'],
            ['Anão da Arena', '👹', 'Pequeno no tamanho, gigante na violência.'],
            ['Leão de Núbia', '🦁', 'O rei das feras, sem jaula.'],
            ['Touro Branco de Aretium', '🐂', 'Chifres de ferro e carga impossível.'],
            ['Cómodo, o Imperador', '🤵', 'O próprio César desce à arena.'],
            ['Capitão dos Pretorianos', '🛡️', 'A última guarda do trono.'],
            ['Máximo Imperator', '👑', 'O homem que derrotou todos os homens.']
        ], 25000, 2000)
    },
    rpg: {
        id: 'rpg', name: 'Fantasia RPG',
        desc: 'Do Aprendiz de Guilda à Lenda do RPG: monstros de masmorra e o Mestre do Jogo.',
        arena: 'Masmorra do Mestre — Andar Final', bossLabel: 'MONSTRO ATIVO', stageWord: 'ANDAR',
        missionWord: 'Missão Secundária', missionWordPlural: 'Missões Secundárias', frame: 'brasao',
        ranks: [['Aprendiz de Guilda', '📜'], ['Aventureiro', '🗡️'], ['Mercenário', '💰'], ['Cavaleiro', '🛡️'], ['Paladino', '⚔️'], ['Mestre de Guerra', '🪓'], ['Arconte Arcano', '🔮'], ['Caçador de Dragões', '🐉'], ['Herói da Profecia', '✨'], ['LENDA DO RPG', '🎲']],
        bosses: mkBosses([
            ['Goblin Chefe', '👺', 'Andar 1 — o bando todo obedece a ele.'],
            ['Ogro da Ponte', '👹', 'Andar 2 — pede pedágio de ossos.'],
            ['Golem de Pedra', '🗿', 'Andar 3 — a masmorra que se defende.'],
            ['Necromante', '💀', 'Andar 4 — o exército já estava enterrado.'],
            ['Hidra do Pântano', '🐍', 'Andar 5 — corte uma cabeça, cobre o preço.'],
            ['Grifo Guardião', '🦅', 'Andar 6 — o voo que ninguém vê chegar.'],
            ['Minotauro da Masmorra', '🐂', 'Andar 7 — o labirinto tem dono.'],
            ['Mago Negro', '🧙', 'Andar 8 — feitiços que dobram a realidade.'],
            ['Dragão Ancião', '🐲', 'Andar 9 — séculos dormindo sobre ouro.'],
            ['Titã de Ferro', '🤖', 'Andar 10 — a armadura vazia que ainda luta.'],
            ['Rei Demônio', '👿', 'Andar 11 — o trono das sombras.'],
            ['Mestre do Jogo', '🎲', 'Andar 12 — o verdadeiro último chefe: quem narra a história.']
        ], 25000, 2000)
    },
    galactica: {
        id: 'galactica', name: 'Comando Galáctico',
        desc: 'Do Cadete ao Supremo da Galáxia: frotas, mutantes e o Imperador no centro da galáxia.',
        arena: 'Setor Omega — Fronteira Estelar', bossLabel: 'ALVO ATIVO', stageWord: 'SETOR',
        missionWord: 'Missão de Patrulha', missionWordPlural: 'Missões de Patrulha', frame: 'espacial',
        ranks: [['Cadete da Academia', '🚀'], ['Piloto Estelar', '🛸'], ['Oficial de Bordo', '⭐'], ['Comandante de Esquadrão', '🪐'], ['Capitão de Cruzador', '🛰️'], ['Almirante de Frota', '🌌'], ['Guardião do Setor', '🛡️'], ['General Galáctico', '⚔️'], ['Lorde das Estrelas', '🌟'], ['SUPREMO DA GALÁXIA', '👽']],
        bosses: mkBosses([
            ['Enxame de Drones', '🛸', 'Setor 1 — barulho de enxame, silêncio de tumba.'],
            ['Pirata Espacial', '🏴‍☠️', 'Setor 2 — a carga que você escolta é o prêmio dele.'],
            ['Androide Rebelde', '🤖', 'Setor 3 — aprendeu a odiar quem o construiu.'],
            ['Mutante das Luas', '👾', 'Setor 4 — radiação que pensa.'],
            ['Rainha dos Insetos', '🦂', 'Setor 5 — a colônia inteira é um só organismo.'],
            ['Colosso Estelar', '🌑', 'Setor 6 — um corpo do tamanho de um planeta.'],
            ['Leviatã do Espaço', '🐙', 'Setor 7 — a coisa que vive no vácuo.'],
            ['Núcleo de IA Rebelde', '🧠', 'Setor 8 — pensa mais rápido que a sua frota.'],
            ['Domínio Sombrio', '👽', 'Setor 9 — a civilização que não deixa sobreviventes.'],
            ['Buraco Negro Vivo', '🕳️', 'Setor 10 — a gravidade como predador.'],
            ['Devorador de Planetas', '🪐', 'Setor 11 — o apetite vem antes da frota.'],
            ['Imperador Galáctico', '👑', 'Setor 12 — o trono no centro da galáxia.']
        ], 25000, 2000)
    }
};

// ============================================================
// UTILITÁRIOS DE SEMANA/DATA
// ============================================================
function isoWeekKey(dateStr) {
    const d = new Date(dateStr + 'T12:00:00');
    const day = (d.getDay() + 6) % 7; // seg=0
    d.setDate(d.getDate() - day + 3); // quinta-feira da semana
    const year = d.getFullYear();
    const jan4 = new Date(year, 0, 4);
    const week = 1 + Math.round(((d - jan4) / 864e5 - 3 + ((jan4.getDay() + 6) % 7)) / 7);
    return `${year}-W${String(week).padStart(2, '0')}`;
}

function weekStartISO(dateStr) {
    const d = new Date(dateStr + 'T12:00:00');
    const day = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - day);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isoWeekRange(dateStr) {
    const start = new Date(weekStartISO(dateStr) + 'T12:00:00');
    const end = new Date(start); end.setDate(end.getDate() + 6);
    return [toLocalISO(start), toLocalISO(end)];
}

// ============================================================
// DANO AO CHEFÃO — 1 kg = 1 DMG, fraqueza ×1,25, PR = crítico ×2
// ============================================================
function logDamageKg(log, bodyweight, boss) {
    if (!log) return 0;
    let dmg;
    if (log.kind === 'corrida') {
        dmg = (Number(log.distanceKm) || 0) * 100 + (Number(log.durationMin) || 0) * 5;
    } else {
        dmg = logVolumeKg(log, bodyweight);
    }
    if (boss && boss.weak && log.muscle === boss.weak) dmg *= 1.25;
    if (log.isPR) dmg *= 2; // golpe crítico no PR
    return dmg;
}

// Percorre os logs em ordem cronológica consumindo o HP de cada estágio.
// Retorna o estado determinístico da progressão dos chefões.
function computeBossProgress(allLogs, bodyweight, bosses) {
    const lista = bosses && bosses.length ? bosses : BOSSES_CLASSIC;
    const crono = [...allLogs].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.id - b.id)));
    let idx = 0, dealt = 0, totalDamage = 0, critCount = 0, weakHits = 0;
    const defeatedAt = {};

    crono.forEach(l => {
        const boss = lista[Math.min(idx, lista.length - 1)];
        let dmg = logDamageKg(l, bodyweight, boss);
        totalDamage += dmg;
        if (l.isPR) critCount++;
        if (boss && boss.weak && l.muscle === boss.weak && dmg > 0) weakHits++;
        while (dmg > 0.0001 && idx < lista.length) {
            const need = lista[idx].maxHp - dealt;
            if (dmg >= need) {
                dmg -= need;
                defeatedAt[lista[idx].id] = l.date;
                dealt = 0;
                idx++;
            } else {
                dealt += dmg;
                dmg = 0;
            }
        }
        if (idx >= lista.length) idx = lista.length - 1, dealt = lista[lista.length - 1].maxHp; // todos derrotados
    });

    const lastIdx = lista.length - 1;
    const allDefeated = crono.length > 0 && Object.keys(defeatedAt).length >= lista.length;
    const currentIdx = allDefeated ? lastIdx : Math.min(idx, lastIdx);
    const current = lista[currentIdx];
    const currentHp = allDefeated ? 0 : Math.max(0, current.maxHp - dealt);
    return {
        current, currentIdx, currentHp,
        hpPercent: current.maxHp > 0 ? Math.min(100, Math.max(0, currentHp / current.maxHp * 100)) : 0,
        totalDamage: Math.round(totalDamage),
        defeatedCount: Object.keys(defeatedAt).length,
        defeatedAt, allDefeated, critCount, weakHits
    };
}

// ============================================================
// XP — com teto diário por grupo, deload e missões
// ============================================================
function isDeloadWeek(dateStr, deloadWeeks) {
    return Array.isArray(deloadWeeks) && deloadWeeks.includes(isoWeekKey(dateStr));
}

function cardioXP(log) {
    const km = Number(log.distanceKm) || 0;
    const min = Number(log.durationMin) || 0;
    return Math.round(km * 8 + min * 0.5);
}

function computeXP(upto, ctx) {
    const c = ctx || {};
    const allLogs = (c.logs || []);
    const bodyweight = c.bodyweight || 0;
    const deloadWeeks = c.deloadWeeks || [];
    const missionsXpTotal = c.missionsXpTotal || 0;
    const bosses = c.bosses || BOSSES_CLASSIC;
    const explicitRestDays = Array.isArray(c.restDays) ? c.restDays : null;
    const cutoff = upto || '9999-12-31';

    let training = 0, cardio = 0, prXP = 0, restXP = 0;
    const byDayGroup = {};
    const daysWithTraining = new Set();

    const activityLogs = Array.isArray(c.activityLogs) ? c.activityLogs : allLogs;
    activityLogs.forEach(l => {
        if (l && l.date && l.date <= cutoff) daysWithTraining.add(l.date);
    });
    allLogs.forEach(l => {
        if (!l || l.date > cutoff) return;
        if (l.kind === 'corrida') {
            cardio += cardioXP(l);
            return;
        }
        if (l.isPR) prXP += XP_PR;
        const v = logVolumeKg(l, bodyweight);
        if (l.type === 'isometria') {
            // XP por tempo sob tensão: 1 XP a cada 20 s (com teto diário)
            const xpRaw = logTstSeconds(l) / 20;
            const key = l.date + '|' + l.muscle;
            const used = byDayGroup[key] || 0;
            const grant = Math.min(xpRaw, Math.max(0, XP_GROUP_DAY_CAP - used));
            byDayGroup[key] = used + grant;
            training += grant * (isDeloadWeek(l.date, deloadWeeks) ? 0.5 : 1);
            return;
        }
        const adj = v * (MUSCLE_WEIGHT[l.muscle] ?? 1);
        let xp = adj / 100;
        if (isDeloadWeek(l.date, deloadWeeks)) xp *= 0.5; // deload: volume rende menos XP
        const key = l.date + '|' + l.muscle;
        const used = byDayGroup[key] || 0;
        const grant = Math.min(xp, Math.max(0, XP_GROUP_DAY_CAP - used));
        byDayGroup[key] = used + grant;
        training += grant;
    });

    // XP de descanso: saves por tema podem fornecer os dias já atribuídos a cada jogo.
    if (explicitRestDays) {
        const activeWeeks = new Set(deloadWeeks);
        [...new Set(explicitRestDays)].forEach(date => {
            if (date <= cutoff && activeWeeks.has(isoWeekKey(date))) restXP += XP_REST_PER_DAY;
        });
    } else {
        // Compatibilidade com consumidores legados: cada dia sem treino no deload rende XP.
        deloadWeeks.forEach(week => {
            const [ws, we] = (() => {
                const [y, wnum] = week.split('-W').map(Number);
                const jan4 = new Date(y, 0, 4);
                const start = new Date(jan4);
                start.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (wnum - 1) * 7);
                const end = new Date(start); end.setDate(end.getDate() + 6);
                return [toLocalISO(start), toLocalISO(end)];
            })();
            const limit = cutoff < we ? cutoff : we;
            for (let d = new Date(ws + 'T12:00:00'); toLocalISO(d) <= limit; d.setDate(d.getDate() + 1)) {
                const ds = toLocalISO(d);
                if (ds > cutoff) break;
                if (!daysWithTraining.has(ds)) restXP += XP_REST_PER_DAY;
            }
        });
    }

    const prog = computeBossProgress(allLogs.filter(l => l.date <= cutoff), bodyweight, bosses);
    const bossXP = prog.defeatedCount > 0
        ? Math.round(bosses.slice(0, prog.defeatedCount).reduce((a, b) => a + b.maxHp / 200, 0))
        : 0;

    const xp = Math.round(training + cardio + prXP + restXP + bossXP + missionsXpTotal);
    return { xp, training: Math.round(training), cardio: Math.round(cardio), prXP, restXP, bossXP, missionXP: missionsXpTotal, prog };
}

function rankFromXP(xp, ranks) {
    const lista = ranks || ANIMAL_RANKS;
    let r = lista[0];
    for (const x of lista) if (xp >= x.minXp) r = x;
    return r;
}

// ============================================================
// MISSÕES SEMANAIS (nome muda com o tema)
// ============================================================
function missionDefs(theme) {
    const w = (theme && theme.missionWord) || 'Missão';
    return [
        { id: 'treinos', icon: '📆', text: '4 treinos na semana', target: 4, xp: MISSION_XP.treinos },
        { id: 'biset', icon: '🔗', text: '1 bi-set registrado', target: 1, xp: MISSION_XP.biset },
        { id: 'pr', icon: '🏆', text: '1 PR automático', target: 1, xp: MISSION_XP.pr },
        { id: 'corrida', icon: '🏃', text: '1 corrida ≥ 2 km', target: 1, xp: MISSION_XP.corrida }
    ].map(m => ({ ...m, title: `${w} · ${m.text}` }));
}

function missionsState(allLogs, theme, refDate) {
    const week = isoWeekKey(refDate);
    const [ws, we] = isoWeekRange(refDate);
    const weekLogs = allLogs.filter(l => l.date >= ws && l.date <= we);
    const defs = missionDefs(theme);
    const state = defs.map(d => {
        let progress = 0;
        switch (d.id) {
            case 'treinos': progress = new Set(weekLogs.map(l => l.date)).size; break;
            case 'biset': progress = weekLogs.filter(l => l.biset).length > 0 ? 1 : 0; break;
            case 'pr': progress = weekLogs.filter(l => l.isPR).length > 0 ? 1 : 0; break;
            case 'corrida': progress = weekLogs.filter(l => l.kind === 'corrida' && (Number(l.distanceKm) || 0) >= 2).length > 0 ? 1 : 0; break;
        }
        return { ...d, progress: Math.min(progress, d.target), done: progress >= d.target };
    });
    return {
        week, range: [ws, we], missions: state,
        allDone: state.every(m => m.done),
        totalXP: state.reduce((a, m) => a + m.xp, 0)
    };
}

// ============================================================
// TEMPORADAS — ciclos de 12 semanas, troféu no fim, XP preservado
// ============================================================
const SEASON_WEEKS = 12;

function seasonState(seasons, todayISO) {
    const s = seasons || { start: todayISO, completed: [] };
    const start = s.start || todayISO;
    const days = Math.floor((new Date(todayISO + 'T12:00:00') - new Date(start + 'T12:00:00')) / 864e5);
    const week = Math.min(SEASON_WEEKS, Math.floor(days / 7) + 1);
    const endsInDays = SEASON_WEEKS * 7 - days;
    return {
        ...s,
        currentWeek: week,
        progressPct: Math.min(100, Math.round(days / (SEASON_WEEKS * 7) * 100)),
        endsInDays: Math.max(0, endsInDays),
        finished: days >= SEASON_WEEKS * 7
    };
}

function completeSeason(seasons, todayISO, xpNow) {
    const s = seasons || { start: todayISO, completed: [] };
    s.completed = s.completed || [];
    s.completed.push({ start: s.start, end: todayISO, xp: xpNow, trophy: '🏆' });
    s.start = todayISO;
    return s;
}
