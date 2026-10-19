import { MUSCULOS_MAPA, catalogInfo, faixaSeriesDoGrupo, normalizeMuscle, logVolumeKg, qualifyingPRLogs } from './catalogo.js';
import { ANIMAL_RANKS, logs, toLocalISO } from './app.js';
/* ============================================================
   GAMIFICAÇÃO — patentes, chefões, XP, missões e temporadas
   ============================================================ */

// Patente = XP GLOBAL ACUMULADO. XP de treino vem de séries efetivas com teto
// semanal por grupo; kg seguem como estatística. PRs, corridas, chefões, missões
// e descanso (deload) continuam como fontes separadas de XP.
const XP_MIN = [0, 150, 500, 1100, 2000, 3300, 5000, 7500, 11000, 16000];
const XP_GROUP_DAY_CAP = 60;        // compatibilidade com backups/consumidores antigos
const XP_GROUP_WEEK_CAP = 20;        // teto semanal provisório de séries efetivas por grupo
const XP_PER_EFFECTIVE_SET = 2.5;    // calibração inicial; revisável com histórico adicional
const XP_PR = 50;                   // XP por PR automático
const XP_REST_PER_DAY = 25;         // XP de descanso em semana de deload (dias sem treino)
const MISSION_XP = { treinos: 120, biset: 80, pr: 100, corrida: 80, fraco: 90 };

const BOSS_HP_BASE = 100;          // aproximadamente 1 semana no volume observado (≈90 séries)
const BOSS_HP_STEP = 18;            // chefão 12 ≈ 3 semanas de dano efetivo

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
    ['Minotauro das Forjas', '🐂', 'Monstro encouraçado que investe pelos corredores incandescentes.', 'Posterior', 'A investida nasce do quadril; mudar seu eixo retira o impulso.'],
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
            ['Javali de Erimanto', '🐗', 'Hércules capturou vivo o javali após persegui-lo até a neve profunda.', 'Posterior', 'A subida e a mudança de direção dependem da força do quadril.'],
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
        desc: 'De Indiana Jones a CHUCK NORRIS: você encarna os heróis e enfrenta doze vilões famosos, em ordem de ameaça.',
        arena: 'Cine Ação — Vilões em Cena', bossLabel: 'VILÃO ATIVO', stageWord: 'CENA',
        missionWord: 'Missão', missionWordPlural: 'Missões', frame: 'neon',
        ranks: [['Indiana Jones, o Explorador', '🎩'], ['007, o Agente Secreto', '🍸'], ['John McClane, o Sobrevivente', '🧨'], ['Rocky Balboa, o Lutador', '🥊'], ['Frank Dux, o Guerreiro do Kumite', '🥋'], ['Mad Max, o Guerreiro da Estrada', '🚗'], ['Rambo, a Máquina de Guerra', '🎖️'], ['John Wick, o Baba-Yaga', '🐶'], ['Neo, o Escolhido', '🕶️'], ['CHUCK NORRIS, O INVENCÍVEL', '💪']],
        // IDs b0…b11 preservados de propósito: o dano já registrado em cada cena continua valendo.
        bosses: mkBosses([
            ['O Predador', '👽', 'Caçador alienígena que rastreia calor e escolhe a presa pela mira térmica.', 'Pernas', 'Mudanças de posição quebram a mira térmica.'],
            ['O Exterminador', '🤖', 'Andróide implacável que persegue o alvo sem pausa nem cansaço.', 'Peito', 'O reator fica atrás da placa frontal.'],
            ['Tubarão', '🦈', 'Predador das águas que ronda o casco antes de subir à superfície.', 'Costas', 'Quem circula por trás do barco escolhe o momento.'],
            ['Hans Gruber', '🤵', 'Ladrão sofisticado que toma o prédio e dita as regras do próprio plano.', 'Core', 'O plano desmorona quando o centro se rompe.'],
            ['Ivan Drago', '🥊', 'Pugilista frio, preparado para decidir a luta nos rounds finais.', 'Posterior', 'Os rounds finais: a base que sustenta a trocação.'],
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
        desc: 'Do Andarilho da Mata à LENDA DO BRASIL: patentes e desafios inspirados na tradição tupi-guarani e nos encantados das matas.',
        arena: 'Mata Encantada — Lendas do Brasil', bossLabel: 'LENDA ATIVA', stageWord: 'LENDA',
        missionWord: 'Desafio da Mata', missionWordPlural: 'Desafios da Mata', frame: 'madeira',
        // Patentes tupi-guarani: Jaci (lua) e Guaraci (sol), Anhangá e Boitatá
        // (encantados), Tupã (trovão) e Maíra (herói criador) — a mesma raiz
        // dos chefões do tema, em vez de figuras do sertão genérico.
        ranks: [['Andarilho da Mata', '🌱'], ['Caçador de Encantados', '🏹'], ['Amigo do Uirapuru', '🐦'], ['Filho de Jaci', '🌙'], ['Filho de Guaraci', '☀️'], ['Guardião do Anhangá', '🔥'], ['Herdeiro de Boitatá', '🐍'], ['Guerreiro de Tupã', '⚡'], ['Maíra Imortal', '✨'], ['LENDA DO BRASIL', '🇧🇷']],
        bosses: mkBosses([
            ['Saci-Pererê', '🌀', 'Travesso de uma perna só, costuma surgir em redemoinhos e pregar peças.', 'Pernas', 'Seu salto e seus redemoinhos dependem de uma única perna de apoio.'],
            ['Curupira', '🦶', 'Guardião das matas; os pés virados confundem quem segue suas pegadas.', 'Pernas', 'Os rastros invertidos dependem de passos rápidos e mudanças de direção.'],
            ['Caipora', '🐗', 'Protetora da caça e dos animais; em muitas versões, cavalga um porco-do-mato.', 'Core', 'Manter o equilíbrio sobre o porco-do-mato é o ponto vulnerável da investida.'],
            ['Lobisomem', '🐺', 'Figura de tradição popular; a origem e as condições da transformação variam entre regiões.', 'Peito', 'A investida frontal expõe o tórax quando a criatura muda de direção.'],
            ['Cuca', '🐊', 'Personagem de contos populares, muitas vezes representada como bruxa com traços de jacaré.', 'Antebraço', 'As garras e os feitiços dependem dos braços que ela mantém erguidos.'],
            ['Mula-sem-Cabeça', '🐴', 'Encantado que galopa em chamas; detalhes da lenda mudam conforme a região.', 'Posterior', 'O galope e as arrancadas dependem do impulso do quadril.'],
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
            ['Venator & Urso', '🐻', 'Venator: caçador de animais apresentado nas venationes, os espetáculos com feras.', 'Posterior', 'A esquiva e a mudança de direção dependem do impulso do quadril.'],
            ['Leão da Numídia', '🦁', 'Fera trazida para uma venatio; não era uma classe de gladiador.', 'Pernas', 'A fera salta apoiada nas patas dianteiras; quebrar a base derruba o ataque.'],
            ['Touro da Arena', '🐂', 'Animal de uma venatio, desafio de esquiva e controle do espaço.', 'Posterior', 'A investida depende do quadril; uma mudança lateral interrompe o avanço.'],
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
            ['Minotauro da Masmorra', '🐂', 'Guardião de um labirinto subterrâneo, sempre pronto para investir.', 'Posterior', 'A força da arrancada vem do quadril e pode ser desviada.'],
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
            ['Devorador de Planetas', '🪐', 'Entidade ficcional que consome mundos e deixa órbitas vazias.', 'Posterior', 'A criatura precisa se ancorar ao planeta; romper sua base interrompe a sucção.'],
            ['Imperador Galáctico', '👑', 'Comandante supremo que reúne as forças inimigas no centro da galáxia.', 'Bíceps', 'O cetro de comando depende da mão que o ergue; quebrar a força do braço interrompe as ordens.']
        ])
    },
    aneis: {
        id: 'aneis', name: 'Senhor dos Anéis',
        desc: 'Do Condado ao Monte da Perdição: a Sociedade, as forças de Sauron e a jornada do Anel.',
        arena: 'Jornada até o Monte da Perdição', bossLabel: 'DESAFIO ATIVO', stageWord: 'JORNADA',
        missionWord: 'Prova da Sociedade', missionWordPlural: 'Provas da Sociedade', frame: 'anel',
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
            ['Gollum, o Portador Caído', '💍', 'Sméagol, consumido pelo Anel, guia os hobbits até Mordor.', 'Posterior', 'O impulso agachado na borda do Monte da Perdição.'],
            ['Sauron, o Senhor do Anel', '👁️', 'O poder de Barad-dûr: quem forjou o Um Anel e procura o portador.', 'Antebraço', 'A mão que porta o Um Anel é o elo que sustenta o poder.']
        ])
    },
    thundercats: {
        id: 'thundercats', name: 'ThunderCats',
        desc: 'Da Terceira Terra à Lenda de Thundera: os inimigos dos ThunderCats e o Olho de Thundera. Patentes originais do app, sem escala canônica da série.',
        arena: 'Terceira Terra — Toca dos Gatos', bossLabel: 'INIMIGO ATIVO', stageWord: 'DESAFIO',
        missionWord: 'Missão de Thundera', missionWordPlural: 'Missões de Thundera', frame: 'garra',
        ranks: [['Sobrevivente de Thundera', '🐾'], ['Aprendiz da Terceira Terra', '🧭'], ['Explorador da Terceira Terra', '🗺️'], ['Sentinela da Toca dos Gatos', '🏰'], ['Guerreiro de Thundera', '⚔️'], ['Guardião do Código', '📜'], ['Portador da Espada Justiceira', '🗡️'], ['Protetor do Olho de Thundera', '👁️'], ['Senhor dos ThunderCats', '🦁'], ['Lenda de Thundera', '👑']],
        bosses: mkBosses([
            ['Jackalman', '🐺', 'Canídeo saqueador que ataca agachado e some depressa com o espólio.', 'Pernas', 'A fuga e o ataque agachado dependem das pernas rápidas.'],
            ['Monkian', '🦍', 'Bruto símio de clava de pedra e escudo improvisado.', 'Ombros', 'A clava pesada gira a partir dos ombros a cada golpe.'],
            ['Vultureman', '🦅', 'Inventor de asas mecânicas que ataca a partir da oficina voadora.', 'Costas', 'As asas mecânicas se prendem à estrutura das costas.'],
            ['Slithe', '🦎', 'Comandante reptiliano que avança de machado em punho na linha de frente.', 'Peito', 'A investida frontal expõe o peito quando o machado desce.'],
            ['Ratar-O', '🐀', 'Senhor da guerra murino com manoplas de poder brilhantes.', 'Bíceps', 'As manoplas canalizam a força dos braços a cada disparo.'],
            ['Grune', '🦁', 'Guerreiro felino de presas enormes que empunha uma maça brutal.', 'Antebraço', 'A pegada da maça depende da firmeza do antebraço.'],
            ['Safari Joe', '🎯', 'Caçador de alta tecnologia com viseira de mira e blaster preciso.', 'Antebraço', 'A mira do blaster depende da mão firme que o sustenta.'],
            ['Captain Shiner', '🚀', 'Capitão espacial de uniforme naval escuro no corredor da nave.', 'Core', 'A postura de comando se sustenta no centro do corpo.'],
            ['Hammerhand', '🔨', 'Pirata ciborgue cujo antebraço-martelo esmaga o convés.', 'Tríceps', 'O martelo desce pela extensão completa do braço.'],
            ['The Driller', '🌀', 'Fera subterrânea de chifre-furadeira que rompe paredes de pedra.', 'Posterior', 'O avanço escavando nasce do impulso do quadril.'],
            ['Mumm-Ra, forma mumificada', '🧟', 'Múmia feiticeira mirrada de cajado e facho vermelho na câmara do sarcófago.', 'Abdômen', 'O corpo mirrado concentra o poder no centro do tronco.'],
            ['Mumm-Ra, forma poderosa', '💀', 'A forma musculosa do feiticeiro-múmia, de olhos e aura vermelhos. Desafio final do tema.', 'Core', 'A aura vermelha pulsa a partir do centro do corpo.']
        ])
    },
    office: {
        id: 'office', name: 'The Office',
        desc: 'Da contratação à Lenda de Scranton: situações do expediente viram desafios, sem vilões e sem violência. Patentes de carreira originais do app.',
        arena: 'Filial de Scranton', bossLabel: 'Desafio do expediente', stageWord: 'EXPEDIENTE',
        missionWord: 'Tarefa do expediente', missionWordPlural: 'Tarefas do expediente', frame: 'caderno',
        ranks: [['Recém-contratado', '🪪'], ['Assistente Administrativo', '📎'], ['Representante de Vendas', '📞'], ['Vendedor do Mês', '🏅'], ['Supervisor da Filial', '🗂️'], ['Assistente do Gerente Regional', '📋'], ['Assistente Gerente Regional', '💼'], ['Gerente Regional', '☕'], ['Diretor do Corporativo', '🏢'], ['Lenda de Scranton', '👑']],
        bosses: mkBosses([
            ['Impressora em pane', '🖨️', 'Impressora atolada com folhas voando e fumaça cômica no meio do escritório.', 'Antebraço', 'Desatolar papel e trocar o toner pedem mãos firmes e repetidas.'],
            ['Reunião que poderia ser um e-mail', '📧', 'Sala de reunião vazia, quadro de rabiscos e uma tela em branco esperando.', 'Core', 'Horas sentado na mesma postura cobram o centro do corpo.'],
            ['Grampeador na gelatina', '🍮', 'O clássico grampeador preso na gelatina verde sobre a mesa do colega.', 'Antebraço', 'Tirar o grampeador da gelatina pede pegada firme e paciência.'],
            ['Inventário do depósito', '📦', 'Depósito com caixas, prateleiras e carrinho de mão para conferir tudo.', 'Costas', 'Levantar e empilhar caixas o dia inteiro carrega as costas.'],
            ['Guerra das vendas', '📞', 'Duas mesas frente a frente com fones erguidos como bandeiras de batalha.', 'Ombros', 'Fone erguido e gestos de comemoração repetem-se nos ombros.'],
            ['Comitê de festas', '🎉', 'Mesa de festa com balões, chapéus e bandeirolas sem letras na sala.', 'Abdômen', 'Montar, desmontar e rir da festa trabalham o centro do corpo.'],
            ['Olimpíadas do escritório', '🏅', 'Corredor com fita de chegada de papel e cadeiras prontas para a prova.', 'Pernas', 'Corrida de cadeiras e provas no corredor vivem das pernas.'],
            ['Simulado de incêndio do Dwight', '🚨', 'Alarme vermelho com fumaça falsa estilizada sobre as mesas, sem violência.', 'Posterior', 'Evacuar depressa, agachando entre as mesas, nasce do quadril.'],
            ['Visita do corporativo', '🪪', 'Crachás de visitante e maletas alinhadas na recepção para a inspeção.', 'Peito', 'Postura aberta e apresentação firme começam pelo peito.'],
            ['Crise da marca-d’água', '💧', 'Pôster arruinado por um borrão gigante de marca-d’água no meio da arte.', 'Tríceps', 'Erguer e estender pôsteres novos até o alto da parede.'],
            ['Premiação dos Dundies', '🏆', 'Troféu dourado em mesa com cortina de papel para a grande noite. Vitória: problema resolvido.', 'Bíceps', 'Erguer o troféu no palco pede o braço inteiro, do ombro à mão.'],
            ['Último expediente', '🌙', 'Escritório noturno com uma luminária acesa e o rodo encostado à porta.', 'Costas', 'Fechar a filial, arrastar móveis e limpar o salão carregam as costas.']
        ])
    }
    ,
    avatar: {
        id: 'avatar', name: 'O Equilíbrio dos Elementos',
        desc: 'Do civil da Aldeia ao Avatar: dez patentes de domínio dos quatro elementos e doze adversários no Templo dos Quatro Ventos.',
        arena: 'Templo dos Quatro Ventos', bossLabel: 'ADVERSÁRIO ATIVO', stageWord: 'CAPÍTULO',
        missionWord: 'Missão do Equilíbrio', missionWordPlural: 'Missões do Equilíbrio', frame: 'elementos',
        ranks: [['Civil da Aldeia', '🏘️'], ['Noviço do Templo', '📜'], ['Dobrador de Água', '💧'], ['Dobrador de Terra', '🪨'], ['Dobrador de Fogo', '🔥'], ['Dobrador de Ar', '🌬️'], ['Lótus Branco', '🌸'], ['Mestre Dobrador', '🧘'], ['Espírito de Luz', '✨'], ['AVATAR', '🌟']],
        bosses: mkBosses([
            ['Mercador de Repolhos', '🥬', 'Vendedor ambulante cuja carroça de repolhos atravessa o pátio do templo.', 'Pernas', 'A carroça foge do controle e ele tropeça; a base decide a fuga.'],
            ['Arqueiras Yuyan', '🏹', 'Atiradoras de elite que guardam os telhados do templo em posição de tiro.', 'Ombros', 'A posição de tiro expõe a articulação que sustenta o arco.'],
            ['Comandante Zhao', '⛵', 'Oficial da Marinha do Fogo que avança com a couraça cerimonial completa.', 'Peito', 'A couraça da Marinha abre no peitoral quando ele avança.'],
            ['Jet', '🛹', 'Lutador ágil que ataca por ganchos e telhados, sempre em movimento.', 'Pernas', 'Ganchos e telhados dependem de impulso e pouso.'],
            ['Príncipe Zuko', '🗡️', 'Príncipe exilado que luta com espadas duplas e fogo curto e preciso.', 'Ombros', 'As espadas duplas giram pelo ombro; travar o giro abre a guarda.'],
            ['Long Feng', '🐍', 'Conselheiro que controla a cidade por dentro e nunca vira as costas.', 'Costas', 'Conselheiro que nunca vira as costas — até precisar fugir.'],
            ['Koh, o Ladrão de Rostos', '🎭', 'Espírito que rouba a face de quem demonstra medo diante dele.', 'Core', 'A face muda, mas o centro do corpo permanece.'],
            ['Wan Shi Tong', '🦉', 'Coruja-espírito que guarda a biblioteca proibida do deserto.', 'Core', 'A biblioteca se apoia num eixo; deslocar o centro derruba as estantes.'],
            ['Hama', '🌊', 'Mestre da dobra de sangue, que precisa de gestos longos e precisos.', 'Antebraço', 'A dobra exige mãos firmes e prolongadas.'],
            ['Homem-Combustão', '💥', 'Atirador que dispara explosões com a respiração e o tórax.', 'Peito', 'A explosão nasce da respiração e do tórax.'],
            ['Azula', '⚡', 'Princesa do Fogo que dispara raios com um gesto de ombro.', 'Ombros', 'O raio é disparado pelo ombro; interromper o gesto desvia a descarga.'],
            ['Ozai, o Senhor do Fogo', '🔥', 'O Senhor do Fogo em pessoa, no auge do poder durante o cometa. Desafio final do tema.', 'Peito', 'O núcleo do poder está no peito; o Estado Avatar atinge o centro.']
        ])
    },
    vila: {
        id: 'vila', name: 'Vila do Barril',
        desc: 'Do morador do barril ao Sanduíche Supremo: dez patentes de vizinhança e doze encrencas da vila mais famosa da TV.',
        arena: 'Vila do Barril', bossLabel: 'ENCRENCA ATIVA', stageWord: 'ANO LETIVO',
        missionWord: 'Plano do Chapolin', missionWordPlural: 'Planos do Chapolin', frame: 'tv',
        ranks: [['Morador do Barril', '🛢️'], ['Órfão da Vila', '🧒'], ['Freguês da Vila', '🛒'], ['Fã do Chapolin', '📺'], ['Portador das Antenas de Vinil', '📡'], ['Portador da Marreta Biônica', '🔨'], ['Chapolin Colorado', '🦗'], ['Herói da Vila', '🦸'], ['Defensor dos Fracos', '🛡️'], ['Sanduíche Supremo', '🥪']],
        bosses: mkBosses([
            ['Quico', '🪣', 'O menino do barril que transforma qualquer desaforo em chilique.', 'Peito', 'O orgulho estufa o peito antes do chilique.'],
            ['Chiquinha', '😈', 'Esperta da vila, sempre com um plano para escapar da lição.', 'Pernas', 'A esperteza foge pelas pernas quando dá errado.'],
            ['Nhonho', '🍰', 'Filho do Seu Barriga, dono de um apetite lendário.', 'Abdômen', 'O peso concentra tudo no centro.'],
            ['Jaiminho', '✉️', 'Carteiro que carrega a mala cheia e evita a fadiga.', 'Costas', 'O carteiro carrega a mala nas costas.'],
            ['Prof. Girafales', '☂️', 'Professor de postura ereta, chapéu e guarda-chuva sempre impecáveis.', 'Ombros', 'A postura ereta e o chapéu dependem dos ombros.'],
            ['Dona Florinda', '👛', 'Mãe do Quico e dona de uma bolsa que pesa como um tijolo.', 'Antebraço', 'A bolsa e a mão pesada vivem do antebraço.'],
            ['Bruxa do 71', '🧹', 'Vizinha que ronda o barril com vassoura e maldições de brincadeira.', 'Costas', 'A vassoura e o balcão exigem dorsais.'],
            ['Monstros de TV', '📺', 'Criaturas de programa de terror que assustam a vila na hora da novela.', 'Core', 'O susto passa pelo centro antes de virar coragem.'],
            ['Seu Barriga', '🔑', 'Locador que sobe escadas cobrando aluguel atrás de aluguel.', 'Pernas', 'Subir escadas cobrando aluguel é trabalho de pernas.'],
            ['14 Meses de Aluguel', '📄', 'A dívida acumulada do Chapolin vira desafio físico na porta da vila.', 'Core', 'A dívida imobiliza o centro; o herói precisa de base para carregar o peso.'],
            ['Bola de Boliche da Vila', '🎳', 'Bola desgovernada que rola pela vila derrubando tudo na frente.', 'Ombros', 'O arremesso gira pelo ombro.'],
            ['Cópia do Chapolin', '🦗', 'Sósia atrapalhado que tenta imitar a marreta e erra o golpe.', 'Antebraço', 'O sósia erra a marreta por falta de pulso.']
        ])
    },
    esgoto: {
        id: 'esgoto', name: 'Esgoto de Nova York',
        desc: 'Do filhote do esgoto ao Mestre Splinter: dez patentes de ninjutsu e doze vilões das galerias e dos telhados.',
        arena: 'Esgoto de Nova York', bossLabel: 'VILÃO ATIVO', stageWord: 'TEMPORADA',
        missionWord: 'Missão do Esgoto', missionWordPlural: 'Missões do Esgoto', frame: 'bueiro',
        ranks: [['Filhote do Esgoto', '🐢'], ['Aprendiz do Mestre', '🥋'], ['Ninja das Galerias', '🥷'], ['Vigia dos Telhados', '👀'], ['Bandana Vermelha', '🧣'], ['Bandana Azul', '🧣'], ['Bandana Roxa', '🧣'], ['Bandana Laranja', '🧣'], ['Sensei do Esgoto', '🧘'], ['Mestre Splinter', '🐀']],
        bosses: mkBosses([
            ['Clã do Pé', '🥷', 'Ninjas de rua que atacam em silêncio nos becos e nas galerias.', 'Pernas', 'O ninjutsu de rua depende de passos silenciosos.'],
            ['Baxter Stockman', '🪰', 'Cientista que controla máquinas e moscas mecânicas pela luva.', 'Antebraço', 'O controle das máquinas passa pelas mãos.'],
            ['Bebop', '🐗', 'Mutante javali de visual punk que carrega o próprio peso no ataque.', 'Ombros', 'O mutante carrega o peso do corpo nos ombros.'],
            ['Rocksteady', '🦏', 'Rinoceronte mutante com couraça pesada e investida teimosa.', 'Abdômen', 'A couraça de rinoceronte deixa o centro exposto.'],
            ['Rei dos Ratos', '🐀', 'Flautista que comanda o enxame com uma cadência hipnótica.', 'Core', 'O flautista controla pelo centro; quebrar a cadência desorganiza o enxame.'],
            ['Slash', '🐢', 'Tartaruga sombria de casco rachado e força desmedida.', 'Costas', 'O casco rachado expõe o dorso na investida.'],
            ['Leatherhead', '🐊', 'Jacaré mutante que luta corpo a corpo com cauda e força bruta.', 'Pernas', 'O jacaré apoia o corpo nas pernas curtas.'],
            ['Tokka e Rahzar', '🐢', 'A dupla de mutantes que ataca em pinça, um pela frente e outro por trás.', 'Ombros', 'A dupla ataca em pinça; os ombros coordenam o bote.'],
            ['Traag e Granitor', '🪨', 'Gigantes de pedra que avançam devagar e não sentem os golpes.', 'Abdômen', 'Os gigantes de pedra têm o núcleo no tronco.'],
            ['Krang', '🧠', 'Cérebro alienígena que pilota um corpo-robô a partir do Technodrome.', 'Core', 'O cérebro-robô depende de um único centro.'],
            ['Technodrome', '🛸', 'Fortaleza móvel do esgoto, com canhões e um ponto cego atrás.', 'Costas', 'A fortaleza móvel tem o ponto cego atrás.'],
            ['Destruidor', '⚔️', 'Líder do Clã do Pé com armadura completa e lâminas retráteis. Desafio final do tema.', 'Peito', 'A armadura do Destruidor abre no peitoral sob o ímpeto.']
        ])
    },
    springfield: {
        id: 'springfield', name: 'Springfield',
        desc: 'Do aluno da escola ao Jebediah: dez patentes da cidade amarela e doze confusões que sempre acabam no sofá.',
        arena: 'Praça de Springfield', bossLabel: 'VILÃO DE SPRINGFIELD', stageWord: 'TEMPORADA',
        missionWord: 'Missão do Dia', missionWordPlural: 'Missões do Dia', frame: 'sitcom',
        ranks: [['Aluno de Springfield', '🎒'], ['Entregador de Jornal', '🚲'], ['Estagiário da Usina', '⚡'], ['Inspetor 7-G', '📋'], ['Funcionário do Mês', '🏅'], ['Supervisor de Turno', '⏰'], ['Astronauta', '🚀'], ['Dono da Usina', '💼'], ['Prefeito de Springfield', '🎩'], ['Jebediah Springfield', '🗿']],
        bosses: mkBosses([
            ['Nelson', '🥊', 'Menino de riso debochado que aponta o dedo para todo mundo.', 'Peito', 'O riso debochado expõe o peito antes do soco.'],
            ['Trio do Pátio', '🚲', 'Três garotos de bicicleta que perseguem qualquer um pelo pátio.', 'Pernas', 'A perseguição de bicicleta vive das pernas.'],
            ['Willie', '🧹', 'Zelador da escola com ancinho e sotaque carregado.', 'Costas', 'O ancinho puxa pelas costas; o zelador vira junto.'],
            ['Chefe Wiggum', '🚓', 'Chefe de polícia que corre atrás do crime — quando o fôlego deixa.', 'Abdômen', 'A farda aperta o centro; o fôlego acaba antes da corrida.'],
            ['Tony Gordo', '🕴️', 'Chefe do crime de terno largo e sotaque de Chicago.', 'Ombros', 'O terno largo carrega a autoridade nos ombros.'],
            ['Krusty', '🤡', 'Palhaço de TV que vive da pose de palco e de um cigarro apagado.', 'Ombros', 'A pose de palco se sustenta nos ombros.'],
            ['Kang e Kodos', '👽', 'Irmãos alienígenas que chegam com tecnologia e planos de dominação.', 'Core', 'A tecnologia alienígena se equilibra num núcleo único.'],
            ['Hank Scorpio', '🌴', 'Empresário carismático que discursa enquanto o mundo pega fogo.', 'Peito', 'O chefe carismático abre a guarda ao discursar.'],
            ['Sr. Burns', '💰', 'Bilionário dono da usina, de coluna frágil e coração mais frágil ainda.', 'Costas', 'A coluna frágil é o ponto do bilionário.'],
            ['Bob Sideshow', '🎪', 'Palhaço invejoso que arma laços e truques contra o rival.', 'Antebraço', 'O laço e os truques dependem de pulsos treinados.'],
            ['Loja de Conveniência', '🏪', 'A loja que engole o cliente e não deixa ninguém sair sem comprar.', 'Abdômen', 'O caixa trava o centro de quem tenta sair.'],
            ['Multidão de Springfield', '👥', 'A cidade inteira em marcha, com tochas e pressa. Desafio final do tema.', 'Pernas', 'A turba se move pelas pernas; parar a marcha dispersa o grupo.']
        ])
    },
    caverna: {
        id: 'caverna', name: 'Caverna do Dragão',
        desc: 'Do visitante do parque a De Volta pra Casa: dez patentes de herói de reide e doze monstros da masmorra.',
        arena: 'Masmorra de Reide', bossLabel: 'MONSTRO ATIVO', stageWord: 'SALA',
        missionWord: 'Quest do Mestre', missionWordPlural: 'Quests do Mestre', frame: 'tocha',
        ranks: [['Visitante do Parque', '🎟️'], ['Viajante Perdido', '🧭'], ['Portador da Clava', '🪵'], ['Portador da Capa', '🧥'], ['Portador do Chapéu', '🎩'], ['Portador do Bastão', '🪄'], ['Portador do Escudo', '🛡️'], ['Portador do Arco', '🏹'], ['Herói de Reide', '⚔️'], ['De Volta pra Casa', '🏠']],
        bosses: mkBosses([
            ['Mímico', '🧰', 'Baú de tesouro que se fecha sobre a mão de quem o abre.', 'Peito', 'A tampa-tórax abre para morder; acertar a abertura encerra o disfarce.'],
            ['Aranha Gigante', '🕷️', 'Aranha do tamanho de um cavalo que tece teias entre as estalagmites.', 'Pernas', 'A teia depende das oito bases; cortar o apoio derruba o corpo.'],
            ['Cubo Gelatinoso', '🟩', 'Massa translúcida que absorve golpes e engole o que encontra.', 'Abdômen', 'A massa absorve golpes, mas o núcleo no centro é instável.'],
            ['Urso-Coruja', '🦉', 'Fera de penas e garras que vira devagar por causa do peso.', 'Costas', 'O corpo pesado vira devagar; o dorso fica exposto na curva.'],
            ['Demônio das Sombras', '👤', 'Sombra viva que se refaz enquanto tiver um centro ao qual voltar.', 'Core', 'A sombra se refaz enquanto tiver um centro ao qual retornar.'],
            ['Beholder', '👁️', 'Olho flutuante de pedúnculos mágicos que disparam em todas as direções.', 'Ombros', 'Os olhos-tentáculo se articulam pelos ombros; travar a base dos pedúnculos cega o conjunto.'],
            ['Devorador de Mentes', '🧠', 'Criatura que ataca a mente e depende de concentração para existir.', 'Core', 'A mente devorada exige concentração; o centro do corpo paga o preço.'],
            ['Hidra', '🐍', 'Serpente de várias cabeças sobre um tronco comum.', 'Ombros', 'Cada cabeça nasce de um tronco comum; cansar a base dos pescoços limita os ataques.'],
            ['Lich', '💀', 'Mago morto-vivo que guarda a filactéria no tronco.', 'Abdômen', 'A filactéria fica no tronco; o centro sustenta a magia.'],
            ['Dragão Vermelho', '🐲', 'Dragão de escamas vermelhas que ergue o corpo antes do sopro.', 'Peito', 'As escamas do peitoral abrem quando ele ergue o corpo para o sopro.'],
            ['Tiamat', '🐉', 'Rainha dos dragões, com cinco cabeças e um dorso sempre acessível.', 'Costas', 'As cinco cabeças protegem a frente; o dorso permanece acessível.'],
            ['Vingador', '⚔️', 'O vilão final da masmorra, com poder concentrado no tórax. Desafio final do tema.', 'Peito', 'O Vingador concentra o poder no tórax; o 20 natural encontra a fenda.']
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
// DANO AO CHEFÃO — séries efetivas, fraqueza semanal ×2 e PR crítico ×2
// ============================================================
function legacyLogDamageKg(log, bodyweight, boss) {
    if (!log) return 0;
    let dmg = log.kind === 'corrida'
        ? (Number(log.distanceKm) || 0) * 100 + (Number(log.durationMin) || 0) * 5
        : logVolumeKg(log, bodyweight);
    if (boss && boss.weak && log.muscle === boss.weak) dmg *= 1.25;
    if (log.isPR) dmg *= 2;
    return dmg;
}

function bossRewardXP(boss) {
    const stage = Math.max(0, Math.round(((Number(boss?.maxHp) || BOSS_HP_BASE) - BOSS_HP_BASE) / BOSS_HP_STEP));
    // Mantém a recompensa histórica aproximada (125–235 XP) apesar da nova escala de HP.
    return Math.max(1, 125 + stage * 10);
}

function logDamageKg(log, bodyweight, boss, effectiveSets, weakGroup) {
    if (!log) return 0;
    let dmg;
    if (log.kind === 'corrida') {
        // Conversão conservadora: cardio permanece em pontos próprios, sem kg de treino.
        dmg = (Number(log.distanceKm) || 0) * 2 + (Number(log.durationMin) || 0) / 5;
        if (boss?.archetype === 'Vl') dmg *= 1.5;
    } else {
        const count = Number.isFinite(effectiveSets) ? effectiveSets : (effectiveSetAllocations([log]).get(log) || 0);
        dmg = count;
        const group = normalizeMuscle(catalogInfo(log.exercise)?.grupo || log.muscle || 'Geral');
        if (weakGroup && group === weakGroup) dmg *= 2;
    }
    if (log.isPR) dmg *= 2;
    return dmg;
}

function weaknessGroupForWeek(allLogs, date, credits) {
    const start = new Date(`${weekStartISO(date)}T12:00:00`);
    start.setDate(start.getDate() - 7);
    const previousWeek = isoWeekKey(toLocalISO(start));
    const totals = new Map(MUSCULOS_MAPA.map(group => [group, 0]));
    (allLogs || []).forEach(log => {
        if (!log || log.date == null || isoWeekKey(log.date) !== previousWeek) return;
        const group = normalizeMuscle(catalogInfo(log.exercise)?.grupo || log.muscle || 'Geral');
        if (totals.has(group)) totals.set(group, totals.get(group) + (credits.get(log) || 0));
    });
    return MUSCULOS_MAPA.reduce((weakest, group) => totals.get(group) < totals.get(weakest) ? group : weakest, MUSCULOS_MAPA[0]);
}

function allGroupsMetForWeek(allLogs, date, credits) {
    const week = isoWeekKey(date);
    const totals = new Map(MUSCULOS_MAPA.map(group => [group, 0]));
    (allLogs || []).forEach(log => {
        if (!log || log.date == null || isoWeekKey(log.date) !== week) return;
        const group = normalizeMuscle(catalogInfo(log.exercise)?.grupo || log.muscle || 'Geral');
        if (totals.has(group)) totals.set(group, totals.get(group) + (credits.get(log) || 0));
    });
    return MUSCULOS_MAPA.every(group => totals.get(group) >= Number(faixaSeriesDoGrupo(group)?.min || 0));
}

// Percorre os logs em ordem cronológica consumindo o HP de cada estágio.
// Retorna o estado determinístico da progressão dos chefões.
function computeBossProgressLegacy(allLogs, bodyweight, bosses) {
    const lista = bosses && bosses.length ? bosses : BOSSES_CLASSIC;
    const crono = [...allLogs].filter(l => l && l.conferir !== true && String(l.conferir).toLowerCase() !== 'sim').sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.id - b.id)));
    let idx = 0, dealt = 0, totalDamage = 0, critCount = 0, weakHits = 0;
    const defeatedAt = {};

    crono.forEach(l => {
        const boss = lista[Math.min(idx, lista.length - 1)];
        const critical = !!l.isPR;
        let dmg = legacyLogDamageKg({ ...l, isPR: critical }, bodyweight, boss);
        totalDamage += dmg;
        if (critical) critCount++;
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
        defeatedAt, allDefeated, critCount, weakHits,
        damageById: Object.fromEntries(lista.map((boss, i) => [boss.id, defeatedAt[boss.id] ? boss.maxHp : (i === currentIdx ? Math.max(0, boss.maxHp - currentHp) : 0)]))
    };
}

function computeBossProgressV1(crono, bodyweight, bosses, savedState) {
    const baselineIds = new Set((savedState.baselineLogIds || []).map(String));
    const qualifyingPRs = qualifyingPRLogs(crono, bodyweight);
    const damageById = Object.fromEntries(bosses.map((boss, index) => {
        const legacyMaxHp = 25000 + 2000 * index;
        const saved = savedState.baselineById[boss.id];
        return [boss.id, saved ? Math.min(legacyMaxHp, Math.max(0, Number(saved.ratio) || 0) * legacyMaxHp) : 0];
    }));
    const defeatedAt = Object.fromEntries(bosses.filter(boss => savedState.baselineById[boss.id]?.defeatedAt)
        .map(boss => [boss.id, savedState.baselineById[boss.id].defeatedAt]));
    let totalDamage = Number(savedState.baselineTotalDamage) || 0;
    let critCount = Number(savedState.baselineCritCount) || 0;
    let weakHits = Number(savedState.baselineWeakHits) || 0;
    crono.filter(log => !baselineIds.has(String(log.id))).forEach(log => {
        const isPR = qualifyingPRs.has(log);
        let damage = legacyLogDamageKg({ ...log, isPR }, bodyweight);
        if (isPR) critCount++;
        const targets = Array.isArray(savedState.assignments?.[String(log.id)]) ? [...savedState.assignments[String(log.id)]] : [];
        let targetIndex = 0;
        let boss = targets.length ? bosses.find(item => item.id === targets[0]) : null;
        if (!boss) {
            const available = bosses.findIndex(item => damageById[item.id] < item.maxHp);
            boss = bosses[available < 0 ? bosses.length - 1 : available];
            if (boss) targets.push(boss.id);
        }
        if (boss?.weak && log.muscle === boss.weak) damage *= 1.25;
        totalDamage += damage;
        while (damage > 0.0001 && boss) {
            const applied = Math.min(damage, Math.max(0, boss.maxHp - (damageById[boss.id] || 0)));
            if (applied > 0) {
                damageById[boss.id] = (damageById[boss.id] || 0) + applied;
                if (boss.weak && log.muscle === boss.weak) weakHits++;
                if (damageById[boss.id] >= boss.maxHp) defeatedAt[boss.id] = defeatedAt[boss.id] || log.date;
                damage -= applied;
            }
            if (damage > 0.0001) {
                targetIndex++;
                boss = bosses.find(item => item.id === targets[targetIndex]);
                if (!boss) {
                    const next = bosses.findIndex(item => damageById[item.id] < item.maxHp);
                    boss = bosses[next < 0 ? bosses.length - 1 : next];
                    if (boss) targets.push(boss.id);
                }
            }
        }
    });
    return { damageById, defeatedAt, totalDamage, critCount, weakHits };
}

function computeBossProgress(allLogs, bodyweight, bosses, savedState = null) {
    const lista = bosses && bosses.length ? bosses : BOSSES_CLASSIC;
    const crono = [...(allLogs || [])].filter(l => l && l.conferir !== true && String(l.conferir).toLowerCase() !== 'sim')
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : String(a.id).localeCompare(String(b.id))));
    const logKey = log => String(log.id ?? `${log.date}|${log.exercise}|${JSON.stringify(log.sets || log.reps || [])}|${crono.indexOf(log)}`);
    const stateIsValid = savedState && savedState.version === 2 && savedState.baselineById && typeof savedState.baselineById === 'object';
    if (!stateIsValid) {
        const legacyLista = lista.map((boss, index) => ({ ...boss, maxHp: 25000 + 2000 * index }));
        const legacy = savedState?.version === 1 && savedState.baselineById
            ? computeBossProgressV1(crono, bodyweight, legacyLista, savedState)
            : computeBossProgressLegacy(crono, bodyweight, legacyLista);
        const baselineById = Object.fromEntries(lista.map((boss, index) => [boss.id, {
            ratio: legacyLista[index].maxHp > 0 ? Math.min(1, (legacy.damageById[boss.id] || 0) / legacyLista[index].maxHp) : 0,
            defeatedAt: legacy.defeatedAt[boss.id] || null
        }]));
        const combatState = {
            version: 2,
            baselineById,
            baselineLogIds: crono.map(logKey),
            baselineTotalDamage: 0, // unidades antigas de kg não são somáveis às séries efetivas
            baselineCritCount: legacy.critCount,
            baselineWeakHits: 0, // fraqueza fixa antiga não corresponde à dinâmica semanal
            assignments: {}
        };
        return computeBossProgress(crono, bodyweight, lista, combatState);
    }

    const combatState = {
        ...savedState,
        baselineById: { ...savedState.baselineById },
        baselineLogIds: [...new Set((savedState.baselineLogIds || []).map(String))],
        assignments: { ...(savedState.assignments || {}) }
    };
    const baselineIds = new Set(combatState.baselineLogIds);
    const qualifyingPRs = qualifyingPRLogs(crono, bodyweight);
    const effectiveCredits = effectiveSetAllocations(crono);
    const damageById = Object.fromEntries(lista.map(boss => {
        const saved = combatState.baselineById[boss.id];
        return [boss.id, saved ? Math.min(boss.maxHp, Math.max(0, Number(saved.ratio) || 0) * boss.maxHp) : 0];
    }));
    const defeatedAt = Object.fromEntries(lista.filter(boss => combatState.baselineById[boss.id]?.defeatedAt).map(boss => [boss.id, combatState.baselineById[boss.id].defeatedAt]));
    let totalDamage = Number(combatState.baselineTotalDamage) || 0;
    let critCount = Number(combatState.baselineCritCount) || 0;
    let weakHits = Number(combatState.baselineWeakHits) || 0;

    crono.filter(log => !baselineIds.has(logKey(log))).forEach(log => {
        const key = logKey(log);
        const isPR = qualifyingPRs.has(log);
        const weekWeakness = weaknessGroupForWeek(crono, log.date, effectiveCredits);
        const group = normalizeMuscle(catalogInfo(log.exercise)?.grupo || log.muscle || 'Geral');
        const bossBefore = lista.find(boss => (damageById[boss.id] || 0) < boss.maxHp) || lista[lista.length - 1];
        const masterBlocked = bossBefore?.archetype === 'Ms' && !allGroupsMetForWeek(crono, log.date, effectiveCredits);
        let damage = masterBlocked ? 0 : logDamageKg({ ...log, isPR }, bodyweight, bossBefore, effectiveCredits.get(log) || 0, weekWeakness);
        if (isPR) critCount++;
        const targets = (Array.isArray(combatState.assignments[key]) ? [...combatState.assignments[key]] : [])
            .filter(id => lista.some(boss => boss.id === id));
        let targetPos = 0;
        let firstTarget = targets.length ? lista.find(b => b.id === targets[0]) : null;
        if (!firstTarget) {
            const firstAvailable = lista.findIndex(boss => (damageById[boss.id] || 0) < boss.maxHp);
            firstTarget = lista[firstAvailable < 0 ? lista.length - 1 : firstAvailable];
            if (firstTarget && !targets.includes(firstTarget.id)) targets.push(firstTarget.id);
        }
        totalDamage += damage;

        while (damage > 0.0001) {
            let boss = targets[targetPos] ? lista.find(b => b.id === targets[targetPos]) : null;
            if (!boss) {
                const lastId = targets[targets.length - 1];
                const lastIdx = lista.findIndex(b => b.id === lastId);
                const nextIdx = lastId ? lastIdx + 1 : lista.findIndex(b => (damageById[b.id] || 0) < b.maxHp);
                boss = lista[Math.max(0, nextIdx)];
                if (!boss) break;
                targets.push(boss.id);
            }
            const applied = Math.min(damage, Math.max(0, boss.maxHp - (damageById[boss.id] || 0)));
            if (applied > 0) {
                damageById[boss.id] = (damageById[boss.id] || 0) + applied;
                if (weekWeakness && group === weekWeakness) weakHits++;
                if (damageById[boss.id] >= boss.maxHp) defeatedAt[boss.id] = defeatedAt[boss.id] || log.date;
                damage -= applied;
            }
            if (damage > 0.0001) targetPos++;
        }
        combatState.assignments[key] = damage > 0 ? targets : [];
    });

    const allDefeated = lista.every(boss => (damageById[boss.id] || 0) >= boss.maxHp);
    const currentIdx = allDefeated ? lista.length - 1 : Math.max(0, lista.findIndex(boss => (damageById[boss.id] || 0) < boss.maxHp));
    const current = lista[currentIdx];
    const currentHp = current ? Math.max(0, current.maxHp - (damageById[current.id] || 0)) : 0;
    const defeatedCount = lista.filter(boss => (damageById[boss.id] || 0) >= boss.maxHp).length;
    return {
        current, currentIdx, currentHp,
        hpPercent: current?.maxHp > 0 ? Math.min(100, Math.max(0, currentHp / current.maxHp * 100)) : 0,
        totalDamage: Math.round(totalDamage), defeatedCount, defeatedAt, allDefeated,
        critCount, weakHits, damageById, combatState
    };
}

// ============================================================
// XP — séries efetivas com teto semanal, deload e missões
// ============================================================
function isDeloadWeek(dateStr, deloadWeeks) {
    return Array.isArray(deloadWeeks) && deloadWeeks.includes(isoWeekKey(dateStr));
}

function cardioXP(log) {
    const km = Number(log.distanceKm) || 0;
    const min = Number(log.durationMin) || 0;
    return Math.round(km * 8 + min * 0.5);
}

function effectiveSetAllocations(allLogs, cutoff = '9999-12-31', weeklyCap = XP_GROUP_WEEK_CAP) {
    const credits = new Map();
    const usedByWeekGroup = new Map();
    const ordered = (allLogs || []).map((log, index) => ({ log, index }))
        .filter(({ log }) => log && log.date && log.date <= cutoff && log.kind !== 'corrida')
        .sort((a, b) => a.log.date.localeCompare(b.log.date) || String(a.log.id ?? a.index).localeCompare(String(b.log.id ?? b.index)) || a.index - b.index);

    ordered.forEach(({ log }) => {
        if (log.conferir === true || String(log.conferir).toLowerCase() === 'sim') return;
        const exercise = catalogInfo(log.exercise);
        const muscle = normalizeMuscle(exercise?.grupo || log.muscle || 'Geral');
        if (!MUSCULOS_MAPA.includes(muscle)) return;
        const faixa = exercise?.faixa;
        if (!Array.isArray(faixa) || faixa.length < 2) return;
        const sets = Array.isArray(log.sets) && log.sets.length
            ? log.sets
            : (Array.isArray(log.reps) ? log.reps.map(reps => ({ reps })) : []);
        const week = isoWeekKey(log.date);
        const key = `${week}|${muscle}`;
        let used = usedByWeekGroup.get(key) || 0;
        let credit = 0;
        sets.forEach(set => {
            const reps = Number(typeof set === 'object' ? set.reps : set);
            const rirRaw = typeof set === 'object' && set.rir != null && set.rir !== '' ? set.rir : log.rir;
            const rirKnown = rirRaw != null && rirRaw !== '' && Number.isFinite(Number(rirRaw));
            if (!Number.isFinite(reps) || reps < Number(faixa[0]) || reps > Number(faixa[1])) return;
            if (rirKnown && Number(rirRaw) > 3) return;
            if (used >= weeklyCap) return;
            used++;
            credit++;
        });
        usedByWeekGroup.set(key, used);
        if (credit) credits.set(log, credit);
    });
    return credits;
}

function computeXP(upto, ctx) {
    const c = ctx || {};
    const allLogs = (c.logs || []);
    const bodyweight = c.bodyweight || 0;
    const deloadWeeks = c.deloadWeeks || [];
    const missionsXpTotal = c.missionsXpTotal || 0;
    const bosses = Object.prototype.hasOwnProperty.call(c, 'bosses')
        ? (Array.isArray(c.bosses) ? c.bosses : [])
        : BOSSES_CLASSIC;
    const explicitRestDays = Array.isArray(c.restDays) ? c.restDays : null;
    const cutoff = upto || '9999-12-31';

    let training = 0, cardio = 0, prXP = 0, restXP = 0;
    const daysWithTraining = new Set();

    const activityLogs = Array.isArray(c.activityLogs) ? c.activityLogs : allLogs;
    activityLogs.forEach(l => {
        if (l && l.date && l.date <= cutoff) daysWithTraining.add(l.date);
    });
    const effectiveSets = effectiveSetAllocations(allLogs, cutoff);
    const qualifyingPRs = qualifyingPRLogs(allLogs.filter(l => l && l.date <= cutoff), bodyweight);
    allLogs.forEach(l => {
        if (!l || l.date > cutoff) return;
        const aguardandoConferencia = l.conferir === true || String(l.conferir).toLowerCase() === 'sim';
        if (aguardandoConferencia) return;
        if (l.kind === 'corrida') {
            cardio += cardioXP(l);
            return;
        }
        if (qualifyingPRs.has(l)) prXP += XP_PR;
        const count = effectiveSets.get(l) || 0;
        if (count > 0) training += count * XP_PER_EFFECTIVE_SET * (isDeloadWeek(l.date, deloadWeeks) ? 0.5 : 1);
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

    const prog = bosses.length
        ? computeBossProgress(allLogs.filter(l => l && l.date <= cutoff && l.conferir !== true && String(l.conferir).toLowerCase() !== 'sim'), bodyweight, bosses, c.bossState || null)
        : { current: null, currentIdx: 0, currentHp: 0, hpPercent: 0, totalDamage: 0, defeatedCount: 0, defeatedAt: {}, allDefeated: false, critCount: 0, weakHits: 0 };
    const bossXP = prog.defeatedCount > 0
        ? bosses.slice(0, prog.defeatedCount).reduce((a, b) => a + bossRewardXP(b), 0)
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
// TEMPORADAS — ciclos de 4 semanas, troféu no fim, XP preservado
// ============================================================
// 4 semanas (28 dias): ciclo curto o bastante para o troféu chegar logo e para
// a última semana funcionar como deload programado (veja autoDeloadWeekKeys).
const SEASON_WEEKS = 4;

/* Chaves ISO da semana de DELOAD AUTOMÁTICO: a 4ª semana (dias 21–27) de cada
   temporada — a atual e as já concluídas. O deload deixa de depender de o
   usuário lembrar de marcá-lo em Config: quem fecha a temporada descansa. */
function autoDeloadWeekKeys(seasons) {
    const s = seasons && typeof seasons === 'object' ? seasons : {};
    const inicios = [s.start, ...((Array.isArray(s.completed) ? s.completed : []).map(c => c && c.start))]
        .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(String(d || '')));
    return [...new Set(inicios.map(inicio => {
        const d = new Date(`${inicio}T12:00:00`);
        d.setDate(d.getDate() + (SEASON_WEEKS - 1) * 7);   // dia 21 = abertura da 4ª semana
        return isoWeekKey(toLocalISO(d));
    }))];
}

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

// ============================================================
// ETAPA 5.1 — manifesto de exports (fundação para ES modules)
// Cada arquivo declara explicitamente a sua superfície pública.
// No carregamento clássico os globais continuam valendo; quando a
// migração para <script type="module"> acontecer, este bloco vira
// `export { ... }`.
// ============================================================
(function (g) {
    const exports_ = {
        XP_MIN,
    XP_GROUP_DAY_CAP,
    XP_GROUP_WEEK_CAP,
    XP_PER_EFFECTIVE_SET,
    effectiveSetAllocations,
    XP_PR,
    XP_REST_PER_DAY,
    MISSION_XP,
    BOSS_HP_BASE,
    BOSS_HP_STEP,
    mkBosses,
    RANKS_CLASSIC,
    BOSSES_CLASSIC,
    STORAGE_KEY_THEME,
    THEMES,
    isoWeekKey,
    weekStartISO,
    isoWeekRange,
    logDamageKg,
    bossRewardXP,
    weaknessGroupForWeek,
    allGroupsMetForWeek,
    computeBossProgress,
    isDeloadWeek,
    cardioXP,
    computeXP,
    rankFromXP,
    missionDefs,
    missionsState,
    SEASON_WEEKS,
    autoDeloadWeekKeys,
    seasonState,
    completeSeason
    };
    g.__diarioExports = Object.assign(g.__diarioExports || {}, exports_);
    // Ações delegáveis (js/actions.js): toda função pública do módulo fica
    // disponível para os atributos data-action dos templates.
    const actionFns = {};
    Object.keys(exports_).forEach(k => { if (typeof exports_[k] === 'function') actionFns[k] = exports_[k]; });
    g.registerDiarioActions(actionFns);
    g.__diarioExportFiles = Object.assign(g.__diarioExportFiles || {}, { "js/gamificacao.js": Object.keys(exports_).length });
})(typeof window !== 'undefined' ? window : globalThis);
export { XP_MIN, XP_GROUP_DAY_CAP, XP_GROUP_WEEK_CAP, XP_PER_EFFECTIVE_SET, effectiveSetAllocations, XP_PR, XP_REST_PER_DAY, MISSION_XP, BOSS_HP_BASE, BOSS_HP_STEP, mkBosses, RANKS_CLASSIC, BOSSES_CLASSIC, STORAGE_KEY_THEME, THEMES, isoWeekKey, weekStartISO, isoWeekRange, logDamageKg, bossRewardXP, weaknessGroupForWeek, allGroupsMetForWeek, computeBossProgress, isDeloadWeek, cardioXP, computeXP, rankFromXP, missionDefs, missionsState, SEASON_WEEKS, autoDeloadWeekKeys, seasonState, completeSeason };
