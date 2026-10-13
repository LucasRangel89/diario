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

const BOSS_HP_BASE = 25000;
const BOSS_HP_STEP = 2000;

// HP e IDs são determinísticos para manter a mesma curva nos dez jogos.
// O clássico usa boss1…boss12 para preservar os retratos originais boss1…boss4.
const mkBosses = (list, idPrefix = 'b', idStart = 0) => list.map(([name, icon, desc, weak, weakReason], i) => ({
    id: `${idPrefix}${idStart + i}`, name, icon,
    maxHp: BOSS_HP_BASE + BOSS_HP_STEP * i,
    desc, weak, weakReason
}));

const RANKS_CLASSIC = [
    { minXp: 0, level: 1, name: 'Formiga Atômica', icon: '🐜' },
    { minXp: 150, level: 2, name: 'Lobo Solitário', icon: '🐺' },
    { minXp: 500, level: 3, name: 'Urso do Ártico', icon: '🐻' },
    { minXp: 1100, level: 4, name: 'Pantera de Guerra', icon: '🐆' },
    { minXp: 2000, level: 5, name: 'Rinoceronte Blindado', icon: '🦏' },
    { minXp: 3300, level: 6, name: 'Elefante de Guerra', icon: '🐘' },
    { minXp: 5000, level: 7, name: 'T-Rex Devastador', icon: '🦖' },
    { minXp: 7500, level: 8, name: 'Kraken dos Abismos', icon: '🐙' },
    { minXp: 11000, level: 9, name: 'Fênix Imortal', icon: '🔥' },
    { minXp: 16000, level: 10, name: 'BERZERKER SUPREMO', icon: '⚡' }
];

const BOSSES_CLASSIC = mkBosses([
    ['Golem de Anilhas', '🗿', 'Sentinela de placas de ferro forjada para proteger a arena.', 'Core', 'O núcleo instável concentra o peso das placas no centro.'],
    ['Hydra de Titânio', '🐉', 'Serpente mecânica de várias cabeças, unidas por juntas de titânio.', 'Ombros', 'As juntas que unem as cabeças giram como ombros da estrutura; travá-las imobiliza o conjunto.'],
    ['Mecagorila Berzerker', '🦍', 'Colosso biomecânico com servos de alta pressão nas costas.', 'Costas', 'O servo dorsal exposto coordena os braços mecânicos.'],
    ['Behemoth Devastador', '👹', 'Fera colossal cuja armadura depende de quatro pernas de sustentação.', 'Pernas', 'A base carrega toda a massa; quebrar o passo derruba a investida.'],
    ['Cavaleiro de Ferro', '🛡️', 'Guerreiro encantado protegido por uma couraça pesada.', 'Peito', 'A emenda do peitoral abre quando a guarda frontal cede.'],
    ['Ogro da Bigorna', '👹', 'Ogro ferreiro que transforma uma bigorna em arma de guerra.', 'Antebraço', 'A maça depende de uma pegada firme; cansar o antebraço quebra o balanço.'],
    ['Quimera Blindada', '🐲', 'Fera de três aspectos, coberta por placas montadas sobre um só tronco.', 'Abdômen', 'A junção das placas deixa o centro do corpo menos protegido.'],
    ['Dragão de Aço', '🐲', 'Dragão de forja com asas articuladas e escamas metálicas.', 'Ombros', 'As dobradiças das asas convergem nas articulações dos ombros.'],
    ['Minotauro das Forjas', '🐂', 'Monstro encouraçado que investe pelos corredores incandescentes.', 'Glúteos', 'A investida nasce do quadril; mudar seu eixo retira o impulso.'],
    ['Leviatã de Ferro', '🐋', 'Serpente abissal de placas, capaz de esmagar muralhas com o corpo.', 'Costas', 'Ao desenrolar o dorso para atacar, expõe as placas da coluna.'],
    ['Titã de Escória', '🗿', 'Gigante de metal vulcânico que ergue um martelo maior que a arena.', 'Bíceps', 'Os golpes do martelo dependem da força dos braços que o sustentam.'],
    ['Colosso das Forjas', '🔥', 'Guardião final: um núcleo incandescente envolto em armadura de ferro.', 'Peito', 'A abertura do forno no tórax revela o núcleo durante cada descarga.']
], 'boss', 1);

const STORAGE_KEY_THEME = 'berzerker_game_theme_v1';

const THEMES = {
    classico: {
        id: 'classico', name: 'Berzerker (clássico)',
        desc: 'Dez patentes até o Berzerker Supremo e doze monstros de fantasia pesada e ferro.',
        arena: 'Arena de Batalha de Chefão', bossLabel: 'CHEFÃO ATIVO', stageWord: 'ESTÁGIO',
        missionWord: 'Missão', missionWordPlural: 'Missões', frame: 'ferro',
        ranks: RANKS_CLASSIC.map(r => [r.name, r.icon]), bosses: BOSSES_CLASSIC
    },
    zodiaco: {
        id: 'zodiaco', name: 'Cavaleiros do Zodíaco',
        desc: 'Dez patentes de domínio do Cosmo; as doze Casas culminam no confronto com o Grande Mestre.',
        arena: 'Santuário — As 12 Casas', bossLabel: 'GUARDIÃO ATIVO', stageWord: 'CASA',
        missionWord: 'Prova de Cosmo', missionWordPlural: 'Provas de Cosmo', frame: 'ouro',
        ranks: [['Aprendiz do Dojo', '🥋'], ['Cavaleiro de Bronze', '🥉'], ['Bronze · Cosmo Ardente', '🔥'], ['Cavaleiro de Prata', '🥈'], ['Prata · Sétimo Sentido', '✨'], ['Cavaleiro de Ouro', '🥇'], ['Ouro · Oitavo Sentido', '🌟'], ['Armadura Divina', '⚔️'], ['Cosmo Supremo', '🌌'], ['Lenda do Santuário', '👑']],
        bosses: mkBosses([
            ['Mu de Áries', '🐏', 'Guardião de Áries e reparador de Armaduras; sua Casa abre o caminho.', 'Antebraço', 'A defesa de Cristal depende de precisão e controle das mãos.'],
            ['Aldebaran de Touro', '🐂', 'Guardião de Touro, conhecido pela força e pelo Grande Chifre.', 'Core', 'O Grande Chifre exige uma base frontal estável; romper o equilíbrio abre a guarda.'],
            ['Saga de Gêmeos', '👥', 'Guardião de Gêmeos; ilusões e ataques dimensionais confundem o Santuário.', 'Peito', 'A troca entre defesa e ataque abre uma janela na guarda frontal.'],
            ['Máscara da Morte de Câncer', '🦀', 'Guardião de Câncer, ligado à passagem de Yomotsu Hirasaka.', 'Pernas', 'A luta depende de controlar o terreno e as passagens entre os mundos.'],
            ['Aiolia de Leão', '🦁', 'Guardião de Leão e autor do Relâmpago de Plasma.', 'Ombros', 'A sequência de golpes velozes depende da articulação dos braços.'],
            ['Shaka de Virgem', '🧘', 'Guardião de Virgem, célebre por lutar com os sentidos recolhidos.', 'Abdômen', 'A postura imóvel de meditação depende de um centro corporal firme.'],
            ['Dohko de Libra', '⚖️', 'Guardião de Libra e Mestre Ancião de Rozan.', 'Costas', 'Os giros das armas de Libra deixam a linha dorsal exposta.'],
            ['Milo de Escorpião', '🦂', 'Guardião de Escorpião; sua técnica é a Agulha Escarlate.', 'Bíceps', 'A precisão dos golpes sucessivos depende do braço que dispara as agulhas.'],
            ['Aiolos de Sagitário', '🏹', 'Guardião de Sagitário, lembrado por proteger Atena e sua Armadura.', 'Tríceps', 'A extensão do braço que conduz o arco fica vulnerável durante o disparo.'],
            ['Shura de Capricórnio', '🐐', 'Guardião de Capricórnio, cuja técnica é a Excalibur.', 'Antebraço', 'A lâmina de Cosmo se manifesta pelo braço e exige firmeza do antebraço.'],
            ['Camus de Aquário', '🧊', 'Guardião de Aquário e mestre das técnicas de gelo.', 'Ombros', 'A gola da Armadura de Aquário deixa as articulações dos ombros expostas durante a execução das técnicas.'],
            ['Grande Mestre', '👑', 'A Casa de Peixes, protegida por Afrodite, antecede o duelo final na Sala do Grande Mestre.', 'Core', 'A sequência de rosas e ilusões exige equilíbrio; romper o centro da postura abre a defesa.']
        ])
    },
    hercules: {
        id: 'hercules', name: '12 Trabalhos de Hércules',
        desc: 'De mortal a herói do Olimpo, enfrentando os doze trabalhos na ordem tradicional.',
        arena: 'Os 12 Trabalhos de Hércules', bossLabel: 'DESAFIO ATIVO', stageWord: 'TRABALHO',
        missionWord: 'Trabalho Extra', missionWordPlural: 'Trabalhos Extra', frame: 'marmore',
        ranks: [['Mortal', '🧑'], ['Aprendiz de Quíron', '🐴'], ['Atleta de Atenas', '🏃'], ['Campeão da Arena', '🏟️'], ['Herói de Tebas', '🛡️'], ['Semideus', '💪'], ['Filho de Zeus', '⚡'], ['Olimpiano', '🏛️'], ['Titã', '🌋'], ['Imortal do Olimpo', '👑']],
        bosses: mkBosses([
            ['Leão de Neméia', '🦁', 'Sua pele era impenetrável; Hércules o venceu estrangulando-o.', 'Ombros', 'O estrangulamento trava a juba com os braços: a força que sustenta o aperto nasce dos ombros.'],
            ['Hidra de Lerna', '🐍', 'Hércules cauterizou os pescoços após cortá-los, com ajuda de Iolau.', 'Core', 'Segurar as cabeças e manter a posição para cauterizar exige um tronco estável.'],
            ['Corça de Cerineia', '🦌', 'Corça consagrada a Ártemis; Hércules a perseguiu e capturou sem feri-la.', 'Pernas', 'A prova é uma perseguição de resistência e controle dos passos.'],
            ['Javali de Erimanto', '🐗', 'Hércules capturou vivo o javali após persegui-lo até a neve profunda.', 'Glúteos', 'A subida e a mudança de direção dependem da força do quadril.'],
            ['Estábulos de Áugias', '🧹', 'Hércules desviou os rios Alfeu e Peneu para limpar os estábulos em um dia.', 'Abdômen', 'A tarefa de abrir e sustentar o novo curso dos rios exige centro firme.'],
            ['Pássaros do Estínfalo', '🐦', 'Hércules os espantou com címbalos de Atena e usou o arco contra as aves.', 'Ombros', 'As asas de bronze precisam ser mantidas abertas para o voo.'],
            ['Touro de Creta', '🐂', 'O sétimo trabalho consistia em capturar vivo o touro de Creta.', 'Ombros', 'Segurar os chifres na investida baixa transfere toda a força do animal para os ombros.'],
            ['Éguas de Diomedes', '🐎', 'As éguas antropófagas pertenciam a Diomedes, rei da Trácia.', 'Bíceps', 'Conter as rédeas e dominar a arrancada exige uma pegada forte.'],
            ['Cinturão de Hipólita', '🛡️', 'Hipólita era rainha das Amazonas; as versões divergem sobre o encontro pelo cinturão.', 'Tríceps', 'A prova exige afastar a guarda armada para alcançar o cinturão.'],
            ['Rebanho de Gerião', '🐄', 'O décimo trabalho era levar o gado de Gerião, descrito como gigante de três corpos.', 'Peito', 'Os três corpos protegem o flanco; abrir a guarda frontal interrompe a formação.'],
            ['Maçãs das Hespérides', '🍎', 'Ladão guardava o pomar; em uma versão, Atlas ajuda Hércules a obter as maçãs.', 'Antebraço', 'A prova termina com a retirada cuidadosa das maçãs guardadas no pomar.'],
            ['Cérbero', '🐕', 'Hércules levou o cão de três cabeças do Hades à superfície e o devolveu.', 'Core', 'Subjugar três cabeças sem armas depende de controle do tronco e equilíbrio.']
        ])
    },
    acao: {
        id: 'acao', name: 'Filmes de Ação',
        desc: 'Do Sobrevivente à LENDA DO CINEMA: você encarna os heróis e enfrenta doze vilões famosos, em ordem de ameaça.',
        arena: 'Cine Ação — Vilões em Cena', bossLabel: 'VILÃO ATIVO', stageWord: 'CENA',
        missionWord: 'Missão', missionWordPlural: 'Missões', frame: 'neon',
        ranks: [['John McClane, o Sobrevivente', '🧨'], ['Rocky Balboa, o Lutador', '🥊'], ['Indiana Jones, o Aventureiro', '🎩'], ['O Dragão, o Mestre', '🐲'], ['Mad Max, o Guerreiro da Estrada', '🚗'], ['Rambo, a Máquina de Guerra', '🎖️'], ['007, o Agente Secreto', '🍸'], ['John Wick, o Baba-Yaga', '🐶'], ['Neo, o Escolhido', '🕶️'], ['A LENDA DO CINEMA', '🏆']],
        // IDs b0…b11 preservados de propósito: o dano já registrado em cada cena continua valendo.
        bosses: mkBosses([
            ['O Predador', '👽', 'Caçador alienígena que rastreia calor e escolhe a presa pela mira térmica.', 'Pernas', 'Mudanças de posição quebram a mira térmica.'],
            ['O Exterminador', '🤖', 'Andróide implacável que persegue o alvo sem pausa nem cansaço.', 'Peito', 'O reator fica atrás da placa frontal.'],
            ['Tubarão', '🦈', 'Predador das águas que ronda o casco antes de subir à superfície.', 'Costas', 'Quem circula por trás do barco escolhe o momento.'],
            ['Hans Gruber', '🤵', 'Ladrão sofisticado que toma o prédio e dita as regras do próprio plano.', 'Core', 'O plano desmorona quando o centro se rompe.'],
            ['Ivan Drago', '🥊', 'Pugilista frio, preparado para decidir a luta nos rounds finais.', 'Glúteos', 'Os rounds finais: a base que sustenta a trocação.'],
            ['Chucky', '🪆', 'Boneco possuído que ataca de onde ninguém espera.', 'Abdômen', 'As costuras do boneco: o centro costurado cede.'],
            ['O Coringa', '🃏', 'Criminoso imprevisível que transforma a cidade em armadilha e piada.', 'Ombros', 'Esquivar de armadilhas e piadas letais exige guarda móvel.'],
            ['Freddy Krueger', '🧤', 'Pesadelo de luva de lâminas que ataca enquanto as vítimas dormem.', 'Tríceps', 'A luva de lâminas exige a extensão do braço.'],
            ['Agent Smith', '🕴️', 'Agente capaz de se multiplicar em cópias idênticas de si mesmo.', 'Bíceps', 'A cópia perfeita repete o golpe; o braço que segura a gravata cede.'],
            ['Pennywise', '🎈', 'Criatura do balão vermelho, que usa o medo como isca.', 'Antebraço', 'A mão que segura o balão e oferece o medo.'],
            ['Thanos', '👊', 'Titã que reúne as Jóias do Infinito para impor a própria ordem.', 'Peito', 'A couraça abre quando o braço das Jóias se ergue.'],
            ['Darth Vader', '⚔️', 'Lorde Sith que aperta à distância com a Força.', 'Antebraço', 'A mão da Força que sufoca à distância.']
        ])
    },
    folclore: {
        id: 'folclore', name: 'Folclore Brasileiro',
        desc: 'Do Novato da Roça à Lenda do Brasil: lendas, encantados e figuras da tradição popular.',
        arena: 'Sertão Encantado — Lendas do Brasil', bossLabel: 'LENDA ATIVA', stageWord: 'LENDA',
        missionWord: 'Desafio do Sertão', missionWordPlural: 'Desafios do Sertão', frame: 'madeira',
        ranks: [['Novato da Roça', '🌱'], ['Peão de Boiadeiro', '🤠'], ['Violeiro do Sertão', '🪕'], ['Capanga Valente', '⚔️'], ['Domador de Bestas', '🐎'], ['Herói do Arraial', '🎇'], ['Guardião da Mata', '🌿'], ['Caçador de Encantados', '🔥'], ['Mestre do Folclore', '✨'], ['LENDA DO BRASIL', '🇧🇷']],
        bosses: mkBosses([
            ['Saci-Pererê', '🌀', 'Travesso de uma perna só, costuma surgir em redemoinhos e pregar peças.', 'Pernas', 'Seu salto e seus redemoinhos dependem de uma única perna de apoio.'],
            ['Curupira', '🦶', 'Guardião das matas; os pés virados confundem quem segue suas pegadas.', 'Pernas', 'Os rastros invertidos dependem de passos rápidos e mudanças de direção.'],
            ['Caipora', '🐗', 'Protetora da caça e dos animais; em muitas versões, cavalga um porco-do-mato.', 'Core', 'Manter o equilíbrio sobre o porco-do-mato é o ponto vulnerável da investida.'],
            ['Lobisomem', '🐺', 'Figura de tradição popular; a origem e as condições da transformação variam entre regiões.', 'Peito', 'A investida frontal expõe o tórax quando a criatura muda de direção.'],
            ['Cuca', '🐊', 'Personagem de contos populares, muitas vezes representada como bruxa com traços de jacaré.', 'Antebraço', 'As garras e os feitiços dependem dos braços que ela mantém erguidos.'],
            ['Mula-sem-Cabeça', '🐴', 'Encantado que galopa em chamas; detalhes da lenda mudam conforme a região.', 'Glúteos', 'O galope e as arrancadas dependem do impulso do quadril.'],
            ['Iara', '💧', 'Encantada das águas cujo canto atrai pessoas para os rios, segundo a lenda.', 'Ombros', 'As ondas e os movimentos de nado dependem da força dos ombros.'],
            ['Boto Cor-de-Rosa', '🐬', 'Na lenda amazônica, o boto assume forma humana e aparece em festas ribeirinhas.', 'Bíceps', 'A dança e a fuga dependem dos braços usados para abrir caminho na multidão.'],
            ['Boitatá', '🔥', 'Serpente de fogo que, em versões da lenda, protege os campos e as matas.', 'Costas', 'O corpo em espiral expõe a linha dorsal quando a serpente se desenrola.'],
            ['Naiá — Vitória-Régia', '🪷', 'Na lenda amazônica, Jaci transforma Naiá na flor vitória-régia, que se abre ao luar.', 'Core', 'As raízes que prendem o terreno cedem quando o centro da flor é deslocado.'],
            ['Mapinguari', '👹', 'Criatura amazônica enorme e peluda; relatos variam, e algumas versões citam uma boca no ventre.', 'Ombros', 'A massa dos braços protege a frente, mas deixa as articulações dos ombros expostas.'],
            ['Anhanguera', '🔥', 'Figura histórica: Bartolomeu Bueno da Silva. A tradição sobre o apelido conta que usou aguardente em chamas para intimidar povos indígenas; os relatos variam.', 'Antebraço', 'O truque da chama depende da mão que sustenta a tigela e pode ser interrompido.']
        ])
    },
    nordica: {
        id: 'nordica', name: 'Mitologia Nórdica',
        desc: 'De criaturas menores do folclore escandinavo aos gigantes e serpentes do Ragnarök.',
        arena: 'Ragnarök — Trilho dos Nove Mundos', bossLabel: 'AMEAÇA ATIVA', stageWord: 'MUNDO',
        missionWord: 'Prova de Valhalla', missionWordPlural: 'Provas de Valhalla', frame: 'runas',
        ranks: [['Escudeiro do Norte', '🛡️'], ['Guerreiro de Ferro', '⚔️'], ['Berserker', '🐻'], ['Caçador de Trolls', '🏹'], ['Jarl das Terras', '👑'], ['Herói de Valhalla', '🪓'], ['Mestre das Runas', '🔮'], ['Guardião dos Nove Mundos', '🌌'], ['Semideus de Asgard', '🌩️'], ['ODIN, O PAI DE TODOS', '🦅']],
        bosses: mkBosses([
            ['Draugr', '🧟', 'Morto-vivo das sagas, associado a túmulos e tesouros guardados.', 'Costas', 'A armadura antiga deixa a retaguarda menos protegida.'],
            ['Troll Jovem de Gelo', '👹', 'Troll menor criado para este desafio, inspirado no folclore nórdico.', 'Pernas', 'O tamanho reduzido permite avançar depressa, mas torna a base instável.'],
            ['Nøkk do Fiorde', '🌊', 'Espírito aquático do folclore escandinavo, capaz de mudar de forma e atrair viajantes.', 'Ombros', 'Os movimentos de nado e as ondas dependem das articulações dos ombros.'],
            ['Huldra da Floresta', '🌲', 'Figura do folclore escandinavo: espírito da floresta que pode ocultar uma cauda de animal.', 'Core', 'A troca de forma torce o tronco; romper o centro interrompe o disfarce.'],
            ['Fenrir, o Lobo', '🐺', 'Lobo monstruoso, filho de Loki e Angrboða; os deuses o prenderam com Gleipnir.', 'Ombros', 'As correntes de Gleipnir travam os membros dianteiros; sem ombros livres, a mordida não alcança.'],
            ['Jörmungandr', '🌊', 'Serpente de Midgard que, segundo o mito, circunda o mundo e enfrenta Thor no Ragnarök.', 'Abdômen', 'Ao apertar o próprio corpo em espiral, expõe a parte inferior das escamas.'],
            ['Surtr, o Gigante de Fogo', '🔥', 'Jötunn de Múspell que empunha uma espada flamejante no Ragnarök.', 'Core', 'A chama se concentra no centro do corpo quando ele prepara o golpe.'],
            ['Fafnir, o Dragão', '🐉', 'Na saga dos Volsungos, Fafnir transforma-se em dragão e guarda ouro amaldiçoado.', 'Peito', 'O peito fica exposto quando se ergue para proteger o tesouro.'],
            ['Níðhöggr', '🐍', 'Serpente ou dragão que, nos poemas nórdicos, rói uma raiz de Yggdrasil.', 'Costas', 'O dorso se revela enquanto a criatura se curva para roer a raiz.'],
            ['Sköll, Devorador do Sol', '🌑', 'Lobo que persegue Sól, a personificação do Sol; Hati persegue Máni, a personificação da Lua.', 'Pernas', 'A perseguição constante torna as pernas a base de sua velocidade.'],
            ['Ymir, o Primeiro', '🧊', 'Gigante primordial; em um relato da criação, Odin, Vili e Vé formam o mundo de seu corpo.', 'Peito', 'O tórax é o núcleo da massa colossal que sustenta o corpo primordial.'],
            ['Ragnarök', '💀', 'Confronto profetizado que encerra a ordem antiga e dá lugar a um mundo renovado.', 'Core', 'A batalha final alterna ondas de gigantes e serpentes; manter o centro firme abre a brecha.']
        ])
    },
    roma: {
        id: 'roma', name: 'Gladiadores de Roma',
        desc: 'Da vida no ludus ao IMPERADOR DE ROMA, entre tipos de gladiador, feras e rivais da arena.',
        arena: 'Coliseu — Areia dos Gladiadores', bossLabel: 'OPONENTE ATIVO', stageWord: 'COMBATE',
        missionWord: 'Prova da Arena', missionWordPlural: 'Provas da Arena', frame: 'louros',
        ranks: [['Escravo da Arena', '⛓️'], ['Recruta do Ludus', '🪖'], ['Gladiador Disciplinado', '⚔️'], ['Veterano da Arena', '🛡️'], ['Campeão do Coliseu', '🏆'], ['Instrutor do Ludus', '📯'], ['Tribuno Militar', '🦁'], ['Centurião', '📜'], ['Legado das Legiões', '🦅'], ['IMPERADOR DE ROMA', '👑']],
        bosses: mkBosses([
            ['Provocador da Arena', '🪓', 'Provocator: tipo de gladiador equipado para enfrentar um rival de classe semelhante.', 'Peito', 'O escudo protege a frente; romper a guarda abre o peitoral.'],
            ['Mirmilão Feroz', '⚔️', 'Murmillo: gladiador de elmo, escudo e espada curta.', 'Antebraço', 'A espada e o escudo dependem da pegada do antebraço.'],
            ['Retiário Mestre', '🔱', 'Retiarius: combatia com rede e tridente contra adversários mais protegidos.', 'Bíceps', 'Lançar e recolher a rede exige força e controle dos braços.'],
            ['Dupla de Dimachaeri', '🗡️', 'Dois dimachaeri lutam com uma lâmina em cada mão.', 'Costas', 'A dupla ataca dos dois lados e deixa a retaguarda aberta ao girar.'],
            ['Hoplômaco', '🛡️', 'Hoplomachus: gladiador de lança e escudo, com equipamento de inspiração grega.', 'Pernas', 'A lança mantém distância, mas exige passos curtos e uma base móvel.'],
            ['Bestiário & Pantera', '🐆', 'Bestiário (bestiarius) treinado para enfrentar uma fera em uma caçada de arena.', 'Core', 'Manter-se em pé diante da pantera depende do equilíbrio do tronco.'],
            ['Venator & Urso', '🐻', 'Venator: caçador de animais apresentado nas venationes, os espetáculos com feras.', 'Glúteos', 'A esquiva e a mudança de direção dependem do impulso do quadril.'],
            ['Leão da Numídia', '🦁', 'Fera trazida para uma venatio; não era uma classe de gladiador.', 'Pernas', 'A fera salta apoiada nas patas dianteiras; quebrar a base derruba o ataque.'],
            ['Touro da Arena', '🐂', 'Animal de uma venatio, desafio de esquiva e controle do espaço.', 'Glúteos', 'A investida depende do quadril; uma mudança lateral interrompe o avanço.'],
            ['Capitão dos Pretorianos', '🛡️', 'Oficial fictício da guarda imperial, incluído como rival dramático da arena.', 'Ombros', 'A armadura e o escudo deixam as articulações dos ombros como ponto móvel.'],
            ['Cômodo, o Imperador', '🤵', 'O imperador Cômodo participou de combates encenados na arena, em condições controladas.', 'Peito', 'A couraça imperial protege a frente, mas abre no centro ao avançar.'],
            ['Máximo, o Gladiador', '👑', 'Rival final inspirado no protagonista fictício de Gladiador; não é uma pessoa histórica.', 'Core', 'O duelo prolongado exige estabilidade do tronco e revela a guarda nas rotações.']
        ])
    },
    rpg: {
        id: 'rpg', name: 'Fantasia RPG',
        desc: 'Do Aprendiz de Guilda à Lenda do RPG, vencendo monstros de masmorra e o Mestre do Jogo.',
        arena: 'Masmorra do Mestre — Andar Final', bossLabel: 'MONSTRO ATIVO', stageWord: 'ANDAR',
        missionWord: 'Missão Secundária', missionWordPlural: 'Missões Secundárias', frame: 'brasao',
        ranks: [['Aprendiz de Guilda', '📜'], ['Aventureiro', '🗡️'], ['Mercenário', '💰'], ['Cavaleiro', '🛡️'], ['Paladino', '⚔️'], ['Mestre de Guerra', '🪓'], ['Arconte Arcano', '🔮'], ['Caçador de Dragões', '🐉'], ['Herói da Profecia', '✨'], ['LENDA DO RPG', '🎲']],
        bosses: mkBosses([
            ['Goblin Chefe', '👺', 'O líder de um bando que tomou a entrada da masmorra.', 'Pernas', 'Sua rapidez é também seu ponto fraco: um passo em falso derruba a investida.'],
            ['Ogro da Ponte', '👹', 'Brutamontes que bloqueia a passagem e exige pedágio de ossos.', 'Core', 'O peso da clava deixa o centro do corpo exposto no contragolpe.'],
            ['Golem de Pedra', '🗿', 'Construto antigo que desperta quando alguém invade a masmorra.', 'Tríceps', 'A articulação do braço que ergue os blocos é o ponto móvel.'],
            ['Necromante', '💀', 'Feiticeiro que comanda mortos-vivos das criptas.', 'Ombros', 'Os gestos que sustentam os feitiços deixam os braços expostos.'],
            ['Hidra do Pântano', '🐍', 'Serpente de várias cabeças que se esconde entre as águas turvas.', 'Ombros', 'As cabeças se erguem por juntas estreitas que trabalham como ombros da serpente.'],
            ['Grifo Guardião', '🦅', 'Criatura alada que vigia o salão superior da masmorra.', 'Costas', 'As asas dependem de articulações dorsais que se abrem durante o voo.'],
            ['Minotauro da Masmorra', '🐂', 'Guardião de um labirinto subterrâneo, sempre pronto para investir.', 'Glúteos', 'A força da arrancada vem do quadril e pode ser desviada.'],
            ['Mago Negro', '🧙', 'Conjurador que usa um cajado para canalizar magia sombria.', 'Antebraço', 'O controle do cajado e dos feitiços depende da firmeza das mãos.'],
            ['Dragão Ancião', '🐲', 'Dragão que repousa sobre tesouros acumulados durante séculos.', 'Peito', 'A chama começa no tórax, onde a couraça se abre antes do sopro.'],
            ['Titã de Ferro', '🤖', 'Autômato colossal cuja armadura continua lutando mesmo sem piloto.', 'Core', 'A junta do centro de massa controla os movimentos do autômato.'],
            ['Rei Demônio', '👿', 'Soberano das sombras que comanda o último exército da masmorra.', 'Costas', 'As asas e a capa ocultam uma articulação dorsal vulnerável.'],
            ['Mestre do Jogo', '🎲', 'A voz por trás da campanha entra na arena como desafio final.', 'Bíceps', 'A mão que controla os dados precisa manter a mesa; quebrar a pegada muda o jogo.']
        ])
    },
    galactica: {
        id: 'galactica', name: 'Comando Galáctico',
        desc: 'Da Academia ao Supremo da Galáxia, enfrentando ameaças de frotas e mundos distantes.',
        arena: 'Setor Omega — Fronteira Estelar', bossLabel: 'ALVO ATIVO', stageWord: 'SETOR',
        missionWord: 'Missão de Patrulha', missionWordPlural: 'Missões de Patrulha', frame: 'espacial',
        ranks: [['Cadete da Academia', '🚀'], ['Piloto Estelar', '🛸'], ['Oficial de Bordo', '⭐'], ['Comandante de Esquadrão', '🪐'], ['Capitão de Cruzador', '🛰️'], ['Almirante de Frota', '🌌'], ['General Galáctico', '⚔️'], ['Marechal Estelar', '🛡️'], ['Lorde das Estrelas', '🌟'], ['SUPREMO DA GALÁXIA', '👽']],
        bosses: mkBosses([
            ['Enxame de Drones', '🛸', 'Nuvem de máquinas leves que satura os sensores de uma nave.', 'Tríceps', 'Os propulsores expostos podem ser desativados por golpes sustentados.'],
            ['Pirata Espacial', '🏴‍☠️', 'Corsário que ataca cargueiros para roubar a carga e fugir.', 'Antebraço', 'A arma e o gancho de abordagem dependem da força da pegada.'],
            ['Androide Rebelde', '🤖', 'Máquina que se voltou contra seus construtores e protege seu núcleo.', 'Peito', 'O reator está atrás da placa frontal do tórax.'],
            ['Mutante das Luas', '👾', 'Ser mutante ficcional, alterado pela radiação de luas distantes.', 'Costas', 'As mutações dorsais ficam expostas quando a criatura se curva.'],
            ['Rainha dos Insetos', '🦂', 'Líder de uma colônia extraterrestre que age como um só organismo.', 'Ombros', 'As asas e patas dianteiras dependem das articulações dos ombros.'],
            ['Colosso Estelar', '🌑', 'Organismo ficcional de escala planetária que se move pelo espaço.', 'Pernas', 'As pernas colossais sustentam o corpo e alteram sua órbita ao serem atingidas.'],
            ['Leviatã do Espaço', '🐙', 'Criatura tentacular que se desloca pelo vácuo entre as naves.', 'Abdômen', 'A carapaça ventral fica exposta quando se enrola ao redor da presa.'],
            ['Núcleo de IA Rebelde', '🧠', 'Inteligência artificial distribuída que comanda uma estação automatizada.', 'Core', 'O núcleo físico que alimenta a estação é o ponto de falha central.'],
            ['Domínio Sombrio', '👽', 'Frota de uma civilização hostil que avança sem anunciar suas intenções.', 'Costas', 'A retaguarda da frota depende de linhas de suprimento vulneráveis.'],
            ['Buraco Negro Vivo', '🕳️', 'Anomalia ficcional que altera a gravidade e puxa objetos para o horizonte.', 'Core', 'A energia se concentra no centro da anomalia, alvo do ataque coordenado.'],
            ['Devorador de Planetas', '🪐', 'Entidade ficcional que consome mundos e deixa órbitas vazias.', 'Glúteos', 'A criatura precisa se ancorar ao planeta; romper sua base interrompe a sucção.'],
            ['Imperador Galáctico', '👑', 'Comandante supremo que reúne as forças inimigas no centro da galáxia.', 'Bíceps', 'O cetro de comando depende da mão que o ergue; quebrar a força do braço interrompe as ordens.']
        ])
    },
    aneis: {
        id: 'aneis', name: 'Senhor dos Anéis',
        desc: 'Do Condado ao Monte da Perdição: a Sociedade, as forças de Sauron e a jornada do Anel.',
        arena: 'Jornada até o Monte da Perdição', bossLabel: 'DESAFIO ATIVO', stageWord: 'JORNADA',
        missionWord: 'Prova da Sociedade', missionWordPlural: 'Provas da Sociedade', frame: 'ouro',
        ranks: [['Hobbit do Condado', '🍀'], ['Andarilho do Norte', '🌲'], ['Companheiro da Sociedade', '🧭'], ['Guardião de Gondor', '🛡️'], ['Cavaleiro de Rohan', '🐴'], ['Caçador de Orcs', '🏹'], ['Herói do Abismo de Helm', '⚔️'], ['Portador do Anel', '💍'], ['Rei de Gondor', '👑'], ['LENDA DA TERRA MÉDIA', '🌟']],
        bosses: mkBosses([
            ['Goblins de Moria', '🗡️', 'Horda que guarda as galerias escuras de Khazad-dûm, acordada pelo barulho na ponte.', 'Pernas', 'Corredores e pontes estreitas vencem-se com passos ágeis.'],
            ['Espectros do Anel', '👻', 'Os Nove servos do Anel, que farejam o portador dia e noite.', 'Costas', 'Quem caça o portador nunca vê a retaguarda.'],
            ['Balrog de Morgoth', '🔥', 'O Flagelo de Durin: sombra e chama acordadas no fundo das minas.', 'Peito', 'Sob as chamas, o peito de sombra é o alvo.'],
            ['Lurtz, o Uruk-hai', '🏹', 'Primeiro dos Uruk-hai de Saruman e líder da caçada à Sociedade.', 'Antebraço', 'Arco, adaga e escudo dependem do braço.'],
            ['Wargs das Terras Bravias', '🐺', 'Lobos selvagens montados por orcs, usados para cortar a estrada.', 'Tríceps', 'As patas dianteiras que derrubam a presa exigem extensão de braço.'],
            ['Uruk-hai do Abismo de Helm', '⚔️', 'Batalhão que marcha sobre o Forte da Trombeta com escadas e martelos.', 'Ombros', 'Escudos, escadas e martelos carregados nos ombros.'],
            ['Saruman, o Branco', '🧙', 'Chefe da Ordem dos Istari, corrompido pelo desejo do Anel.', 'Bíceps', 'A mão do cajado conduz os encantamentos.'],
            ['Espectros de Dunharrow', '💀', 'Os mortos do juramento quebrado, presos entre as montanhas.', 'Core', 'O medo congela o centro; firmeza abre caminho entre os mortos.'],
            ['Laracna (Shelob)', '🕸️', 'A aranha colossal que vigia a passagem de Cirith Ungol.', 'Abdômen', 'O ponto brando sob a carapaça, por onde Sam fincou a lâmina.'],
            ['Rei-Bruxo de Angmar', '👑', 'Senhor dos Nazgûl e comandante das forças que cercam Minas Tirith.', 'Pernas', 'A dobra do joelho, onde Merry fincou a lâmina de Dúnedain.'],
            ['Gollum, o Portador Caído', '💍', 'Sméagol, consumido pelo Anel, guia os hobbits até Mordor.', 'Glúteos', 'O impulso agachado na borda do Monte da Perdição.'],
            ['Sauron, o Senhor do Anel', '👁️', 'O poder de Barad-dûr: quem forjou o Um Anel e procura o portador.', 'Antebraço', 'A mão que porta o Um Anel é o elo que sustenta o poder.']
        ])
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
