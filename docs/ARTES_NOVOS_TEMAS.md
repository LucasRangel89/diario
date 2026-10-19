# Novos temas — direção de arte e catálogo adaptado (lote 1)

Sessão `arena/a088cf10-diario` · 19/10/2026 · base `7a6b218` (main) · nenhuma alteração preexistente no checkout.

Lote 1 autorizado pelo pedido do usuário: “gerar algumas novas imagens para alguns temas (ignore a numeração). Tenha liberdade criativa para alterar nomes e itens.” Foram produzidas **8 peças** (6 selos + 2 fundos de card) em **10 chamadas de geração** (o limite por turno da ferramenta é 10; duas chamadas extras foram revisões). Nenhum tema foi cadastrado no app, nenhuma fórmula/regra foi alterada.

## 1. Capacidade e método

- **1 chamada = 1 imagem única.** A ferramenta não produz cartelas; as provas deste lote são montagens por código (`scripts/prepare-art-novos-temas.sh`).
- Saída revisada: 1254×1254, RGB **sem alfa**. Selos reduzidos a **192×192** (LANCZOS) e fundos mantidos em **1024×1024**, ambos em WebP qualidade 84/80, método 6.
- Originais grandes ficam fora do Git (`.cache/artes-originais/novos-temas/`, ignorado e volátil). O registro durável são os derivados versionados + `docs/manifesto-artes.json` (8 registros novos, `estado: candidato`).
- Linguagem única da casa: **pixel art** com contorno grosso, como nas famílias ThunderCats/Office, mas cada tema tem seu dialeto (paleta, traço e motivo).

## 2. Identidade visual por tema

| Tema (id proposto) | Nome proposto | Selo | Fundo de card | Dialeto |
|---|---|---|---|---|
| `avatar` | **O Equilíbrio dos Elementos** | Mandala de bronze com quatro elementos girando ao redor de um lótus branco | Pátio de templo ao entardecer, quatro santuários elementais e praça de meditação | Azul-gelo, verde-terra, laranja-fogo, branco-ar; traço limpo de animação convertido em pixel |
| `caverna` | **Caverna do Dragão** | Cabeça de dragão vermelho sobre pentagrama de bronze, com d20 | Câmara de masmorra violeta com tochas, estalagmites e portal do dragão | Violeta e ocre de masmorra, luz de tocha, contorno grosso dos anos 80 |
| `office-us` | **The Office (EUA)** — ver §7 | Resma de papel com faixa azul, clipe, anel de café e carimbo geométrico | (pendente) | Bege e cinza de escritório, azul-Dunder Mifflin, luz fluorescente esverdeada |
| `springfield` | **Springfield** | Rosquinha dourada com cobertura rosa sobre sofá e TV, em disco amarelo | (pendente) | Amarelo-Simpson, céu azul com nuvens, contorno preto grosso, estilo beat ’em up |
| `vila` | **Vila do Barril** | Barril com sanduíche de presunto dentro de moldura de TV de tubo | Pátio da vila ao entardecer, barril, vara de roupa, portas coloridas | Cores saturadas de vila de TV, granulado de fita e scanlines |
| `esgoto` | **Esgoto de Nova York** | Tampa de bueiro com concha, quatro rebites nas cores das bandanas | (pendente) | Verde-esgoto, neon e vapor, quatro cores de bandana, beat ’em up |

Nomes, arenas e rótulos ficam como **proposta** até aprovação; nada foi ligado ao motor.

## 3. Catálogo adaptado (vocabulário do app)

O motor usa sempre **10 patentes**, **12 chefões** na curva `100 + 18i`, **12 semanas** por temporada e os mesmos grupos musculares (`Peito, Costas, Pernas, Posterior, Ombros, Bíceps, Tríceps, Abdômen, Core, Antebraço`). Por isso as listas abaixo fecham em 12 chefões (as do pedido tinham 10–11) e mantêm as 10 patentes. **A ordem é editorial, não escala canônica de força.**

### 3.1 O Equilíbrio dos Elementos (`avatar`)

- Arena: **Templo dos Quatro Ventos** · Chefão: **ADVERSÁRIO ATIVO** · Estágio: **CAPÍTULO** · Missão: **Missão do Equilíbrio** / **Missões do Equilíbrio**
- Deload: **Meditação no Templo** · Crítico (PR): **Estado Avatar** · Conquistas: **Peças de Pai Sho**
- Missão fixa: **Equilíbrio dos Quatro Elementos**
- Moldura de card: `elementos` (mandala de quatro cores nos cantos) — a implementar em `js/cartoes.js`
- **Famílias de grupo por elemento:** Terra = pernas; Água = costas; Fogo = peito/ombros; Ar = core/cardio (usado como fraqueza dos chefões)

| # | Patente | | # | Chefão (arquétipo) | Fraqueza | Justificativa |
|---:|---|---|---:|---|---|---|
| 1 | Civil da Aldeia | | 1 | Mercador de Repolhos (En) | Pernas | A carroça foge do controle e ele tropeça; a base decide a fuga. |
| 2 | Noviço do Templo | | 2 | Arqueiras Yuyan (En) | Ombros | A posição de tiro expõe a articulação que sustenta o arco. |
| 3 | Dobrador de Água | | 3 | Comandante Zhao (Tq) | Peito | A couraça da Marinha abre no peitoral quando ele avança. |
| 4 | Dobrador de Terra | | 4 | Jet (Vl) | Pernas | Ganchos e telhados dependem de impulso e pouso. |
| 5 | Dobrador de Fogo | | 5 | Príncipe Zuko (Vl) | Ombros | As espadas duplas giram pelo ombro; travar o giro abre a guarda. |
| 6 | Dobrador de Ar | | 6 | Long Feng (En) | Costas | Conselheiro que nunca vira as costas — até precisar fugir. |
| 7 | Lótus Branco | | 7 | Koh, o Ladrão de Rostos (Cl) | Core | A face muda, mas o centro do corpo permanece. |
| 8 | Mestre Dobrador | | 8 | Wan Shi Tong (Tq) | Core | A biblioteca se apoia num eixo; deslocar o centro derruba as estantes. |
| 9 | Espírito de Luz | | 9 | Hama (Cl) | Antebraço | A dobra de sangue exige mãos firmes e prolongadas. |
| 10 | **AVATAR** | | 10 | Homem-Combustão (Cl) | Peito | A explosão nasce da respiração e do tórax. |
| | | | 11 | Azula (Vl) | Ombros | O raio é disparado pelo ombro; interromper o gesto desvia a descarga. |
| | | | 12 | Ozai, o Senhor do Fogo (Ms) | Peito | O núcleo do poder está no peito; o Estado Avatar atinge o centro. |

*Mudanças criativas:* “Espírito Raava” virou **Espírito de Luz** (evita nome próprio literal); entraram **Arqueiras Yuyan** para fechar 12. O Estado Avatar é o PR crítico (o “crítico” dispara o efeito, não uma regra nova de dano).

### 3.2 Caverna do Dragão (`caverna`)

- Arena: **Masmorra de Reide** · Chefão: **MONSTRO ATIVO** · Estágio: **SALA** · Missão: **Quest do Mestre** / **Quests do Mestre**
- Deload: **Descanso na Taverna** · Crítico: **20 natural** · Conquistas: **Itens Mágicos**
- NPC de missão: **Mestre dos Magos**; mascote do deload: **Uni**
- Moldura de card: `tocha`
- **Detalhe:** o PR dispara animação de d20; a escolha de classe muda só o avatar e o item de patente.

| # | Patente | | # | Monstro (arquétipo) | Fraqueza | Justificativa |
|---:|---|---|---:|---|---|---|
| 1 | Visitante do Parque | | 1 | Mímico (En) | Peito | A tampa-tórax abre para morder; acertar a abertura encerra o disfarce. |
| 2 | Viajante Perdido | | 2 | Aranha Gigante (Vl) | Pernas | A teia depende das oito bases; cortar o apoio derruba o corpo. |
| 3 | Portador da Clava | | 3 | Cubo Gelatinoso (Tq) | Abdômen | A massa absorve golpes, mas o núcleo no centro é instável. |
| 4 | Portador da Capa | | 4 | Urso-Coruja (Cl) | Costas | O corpo pesado vira devagar; o dorso fica exposto na curva. |
| 5 | Portador do Chapéu | | 5 | Demônio das Sombras (Vl) | Core | A sombra se refaz enquanto tiver um centro ao qual retornar. |
| 6 | Portador do Bastão | | 6 | Beholder (En) | Ombros | Os olhos-tentáculo se articulam pelos ombros; travar a base dos pedúnculos cega o conjunto. |
| 7 | Portador do Escudo | | 7 | Devorador de Mentes (Vl) | Core | A mente devorada exige concentração; o centro do corpo paga o preço. |
| 8 | Portador do Arco | | 8 | Hidra (Cl) | Ombros | Cada cabeça nasce de um tronco comum; cansar a base dos pescoços limita os ataques. |
| 9 | Herói de Reide | | 9 | Lich (Tq) | Abdômen | A filactéria fica no tronco; o centro sustenta a magia. |
| 10 | **De Volta pra Casa** | | 10 | Dragão Vermelho (Cl) | Peito | As escamas do peitoral abrem quando ele ergue o corpo para o sopro. |
| | | | 11 | Tiamat (Tq) | Costas | As cinco cabeças protegem a frente; o dorso permanece acessível. |
| | | | 12 | Vingador (Ms) | Peito | O Vingador concentra o poder no tórax; o 20 natural encontra a fenda. |

*Mudanças criativas:* **Aranha Gigante** entrou para fechar 12; nomes como “Demônio Sombras” foram escritos por extenso.

### 3.3 The Office (EUA) (`office-us`) — ver §7 antes de produzir mais

- Arena: **Filial de Scranton** · Chefão: **CHEFE ATIVO** · Estágio: **TRIMESTRE** · Missão: **Meta Semanal** / **Metas Semanais**
- Deload: **Festa do Comitê** · Crítico: **Negócio Fechado** · Conquistas: **Prêmios Dundie**
- Dano = **Vendas**; HP do chefão = **meta do trimestre**
- Moldura de card: `memorando`
- **Detalhe:** o trimestre fiscal casa com a temporada de 12 semanas; subir de patente troca o enquadramento como um memorando assinado.

| # | Patente | | # | Chefe (arquétipo) | Fraqueza | Justificativa |
|---:|---|---|---:|---|---|---|
| 1 | Estagiário | | 1 | Toby (En) | Costas | RH constrangido trabalha curvado; a postura custa caro. |
| 2 | Temporário | | 2 | Simulação de Incêndio (Vl) | Core | O pânico desorganiza o centro; respirar fundo organiza a saída. |
| 3 | Recepcionista | | 3 | Gabe Lewis (En) | Peito | A fala monótona prende a atenção; a guarda frontal cede primeiro. |
| 4 | Vendedor | | 4 | Todd Packer (Vl) | Abdômen | O riso fácil esconde a falta de base; o centro não sustenta a piada. |
| 5 | Funcionário do Mês | | 5 | Reunião sem Pauta (Tq) | Core | Sem pauta, o tempo escorre pelo centro da sala. |
| 6 | Assistente Gerente | | 6 | Angela (Cl) | Costas | O controle rígido das costas alheias ignora as próprias. |
| 7 | Chefe de Setor | | 7 | Dwight (Cl) | Ombros | A rigidez militar carrega o peso nos ombros. |
| 8 | Gerente Regional | | 8 | Jan Levinson (Tq) | Peito | A apresentação ensaiada vive do peitoral projetado. |
| 9 | Vice-Presidente | | 9 | Robert California (Cl) | Core | O discurso hipnótico perde força quando o centro relaxa. |
| 10 | **Proprietário** | | 10 | Jo Bennett (Ms) | Ombros | A autoridade se impõe pelos ombros; ceder espaço desarma a chefe. |
| | | | 11 | Auditoria do Corporativo (Tq) | Costas | A auditoria ataca pelas costas do processo. |
| | | | 12 | Café Acabou (Vl) | Abdômen | A queda de energia do escritório passa pelo estômago. |

*Mudanças criativas:* **Auditoria do Corporativo** e **Café Acabou** completam 12; “Reunião sem Pauta” e “Simulação de Incêndio” foram mantidas como situações, não pessoas.

### 3.4 Springfield (`springfield`)

- Arena: **Praça de Springfield** · Chefão: **VILÃO DE SPRINGFIELD** · Estágio: **TEMPORADA** · Missão: **Missão do Dia** / **Missões do Dia**
- Deload: **Dia de Sofá** · Crítico: **Rosquinha Dourada** · Conquistas: **Rosquinhas**
- Moldura de card: `sitcom`
- **Detalhe:** cada patente mostra uma cena de sofá diferente; o Dia de Sofá é o deload (+25 XP), coerente com o bônus de descanso já existente.

| # | Patente | | # | Vilão (arquétipo) | Fraqueza | Justificativa |
|---:|---|---|---:|---|---|---|
| 1 | Aluno de Springfield | | 1 | Nelson (Vl) | Peito | O riso debochado expõe o peito antes do soco. |
| 2 | Entregador de Jornal | | 2 | Trio Bully (En) | Pernas | A perseguição de bicicleta vive das pernas. |
| 3 | Estagiário da Usina | | 3 | Willie (Cl) | Costas | O ancinho puxa pelas costas; o zelador vira junto. |
| 4 | Inspetor 7-G | | 4 | Chefe Wiggum (En) | Abdômen | A farda aperta o centro; o fôlego acaba antes da corrida. |
| 5 | Funcionário do Mês | | 5 | Tony Gordo (Tq) | Ombros | O terno largo carrega a autoridade nos ombros. |
| 6 | Supervisor de Turno | | 6 | Bob Sideshow (Vl) | Antebraço | O laço e os truques dependem de pulsos treinados. |
| 7 | Astronauta | | 7 | Kang e Kodos (Cl) | Core | A tecnologia alienígena se equilibra num núcleo único. |
| 8 | Dono da Usina | | 8 | Hank Scorpio (Tq) | Peito | O chefe carismático abre a guarda ao discursar. |
| 9 | Prefeito de Springfield | | 9 | Krusty (En) | Ombros | A pose de palco se sustenta nos ombros. |
| 10 | **Jebediah Springfield** | | 10 | Sr. Burns (Ms) | Costas | A coluna frágil é o ponto do bilionário. |
| | | | 11 | Loja de Conveniência (Tq) | Abdômen | O caixa trava o centro de quem tenta sair. |
| | | | 12 | Multidão de Springfield (Cl) | Pernas | A turba se move pelas pernas; parar a marcha dispersa o grupo. |

*Mudanças criativas:* a lista do pedido tinha 9 nomes (um deles com hífen). Virou 10 patentes com **Estagiário da Usina** separado; **Loja de Conveniência** e **Multidão de Springfield** completam 12 chefões.

### 3.5 Vila do Barril (`vila`)

- Arena: **Vila do Barril** · Chefão: **ENCRENCA ATIVA** · Estágio: **ANO LETIVO** · Missão: **Plano do Chapolin** / **Planos do Chapolin**
- Deload: **Soneca no Barril** · Crítico: **Astúcia Colorada** · Conquistas: **Medalhas da Vila**
- Dano = **Marretada**
- Moldura de card: `tv`
- **Detalhe:** o sanduíche de presunto é a última patente, referência à piada que nunca se resolve.

| # | Patente | | # | Encrenca (arquétipo) | Fraqueza | Justificativa |
|---:|---|---|---:|---|---|---|
| 1 | Morador do Barril | | 1 | Quico (En) | Peito | O orgulho estufa o peito antes do chilique. |
| 2 | Órfão da Vila | | 2 | Chiquinha (Vl) | Pernas | A esperteza foge pelas pernas quando dá errado. |
| 3 | Freguês da Vila | | 3 | Nhonho (Tq) | Abdômen | O peso concentra tudo no centro. |
| 4 | Fã do Chapolin | | 4 | Jaiminho (Vl) | Costas | O carteiro carrega a mala nas costas. |
| 5 | Portador das Antenas de Vinil | | 5 | Prof. Girafales (Tq) | Ombros | A postura ereta e o chapéu dependem dos ombros. |
| 6 | Portador da Marreta Biônica | | 6 | Dona Florinda (Cl) | Antebraço | A bolsa e a mão pesada vivem do antebraço. |
| 7 | Chapolin Colorado | | 7 | Bruxa do 71 (Cl) | Costas | A vassoura e o balcão exigem dorsais. |
| 8 | Herói da Vila | | 8 | Monstros de TV (En) | Core | O susto passa pelo centro antes de virar coragem. |
| 9 | Defensor dos Fracos | | 9 | Seu Barriga (Tq) | Pernas | Subir escadas cobrando aluguel é trabalho de pernas. |
| 10 | **Sanduíche Supremo** | | 10 | 14 Meses de Aluguel (Ms) | Core | A dívida imobiliza o centro; o herói precisa de base para carregar o peso. |
| | | | 11 | Bola de Boliche da Vila (En) | Ombros | O arremesso gira pelo ombro. |
| | | | 12 | Cópia do Chapolin (Vl) | Antebraço | O sósia erra a marreta por falta de pulso. |

*Mudanças criativas:* “Pastilha Encolhedora” e “Antenas de Vinil” viraram **Freguês da Vila** e **Portador das Antenas de Vinil** (objetos não funcionam bem como patente); **Bola de Boliche da Vila** e **Cópia do Chapolin** completam 12.

### 3.6 Esgoto de Nova York (`esgoto`)

- Arena: **Esgoto de Nova York** · Chefão: **VILÃO ATIVO** · Estágio: **TEMPORADA** · Missão: **Missão do Esgoto** / **Missões do Esgoto**
- Deload: **Dia de Pizza** · Crítico: **Cowabunga!** · Conquistas: **Fatias de Pizza**
- Moldura de card: `bueiro`
- **Detalhe:** a escolha da tartaruga muda só a cor da bandana e a arma do avatar.

| # | Patente | | # | Vilão (arquétipo) | Fraqueza | Justificativa |
|---:|---|---|---:|---|---|---|
| 1 | Filhote do Esgoto | | 1 | Clã do Pé (En) | Pernas | O ninjutsu de rua depende de passos silenciosos. |
| 2 | Aprendiz do Mestre | | 2 | Baxter Stockman (Vl) | Antebraço | O controle das máquinas passa pelas mãos. |
| 3 | Ninja das Galerias | | 3 | Bebop (Tq) | Ombros | Omutante carrega o peso do corpo nos ombros. |
| 4 | Vigia dos Telhados | | 4 | Rocksteady (Cl) | Abdômen | A couraça de rinoceronte deixa o centro exposto. |
| 5 | Bandana Vermelha | | 5 | Rei dos Ratos (Vl) | Core | O flautista controla pelo centro; quebrar a cadência desorganiza o enxame. |
| 6 | Bandana Azul | | 6 | Slash (Vl) | Costas | O casco rachado expõe o dorso na investida. |
| 7 | Bandana Roxa | | 7 | Leatherhead (Tq) | Pernas | O jacaré apoia o corpo nas pernas curtas. |
| 8 | Bandana Laranja | | 8 | Tokka e Rahzar (En) | Ombros | A dupla ataca em pinça; os ombros coordenam o bote. |
| 9 | Sensei do Esgoto | | 9 | Traag e Granitor (Cl) | Abdômen | Os gigantes de pedra têm o núcleo no tronco. |
| 10 | **Mestre Splinter** | | 10 | Krang (Cl) | Core | O cérebro-robô depende de um único centro. |
| | | | 11 | Technodrome (Tq) | Costas | A fortaleza móvel tem o ponto cego atrás. |
| | | | 12 | Destruidor (Ms) | Peito | A armadura do Destruidor abre no peitoral sob o ímpeto. |

*Mudanças criativas:* “Genin/Chunin” (termos de outra franquia) viraram **Ninja das Galerias** e **Vigia dos Telhados**; **Rei dos Ratos** completa 12. As quatro bandanas continuam sendo as patentes 5–8.

## 4. Peças produzidas (lote 1)

| Peça | Origem (fora do Git) | Derivado (versionado) | Dimensões | Bytes | Estado |
|---|---|---|---|---:|---|
| Selo O Equilíbrio dos Elementos | `selo-aang.png` | `images/artes/candidatos/avatar/temas/avatar.webp` | 192×192 | 14.534 | candidato |
| Selo Caverna do Dragão | `selo-caverna.png` | `images/artes/candidatos/caverna/temas/caverna.webp` | 192×192 | 13.946 | candidato |
| Selo The Office (EUA) | `selo-scranton.png` | `images/artes/candidatos/office-us/temas/office-us.webp` | 192×192 | 10.040 | candidato |
| Selo Springfield | `selo-springfield.png` | `images/artes/candidatos/springfield/temas/springfield.webp` | 192×192 | 12.600 | candidato |
| Selo Vila do Barril | `selo-vila.png` | `images/artes/candidatos/vila/temas/vila.webp` | 192×192 | 11.530 | candidato |
| Selo Esgoto de Nova York | `selo-esgoto.png` | `images/artes/candidatos/esgoto/temas/esgoto.webp` | 192×192 | 12.948 | candidato |
| Fundo O Equilíbrio dos Elementos | `fundo-aang.png` | `images/artes/candidatos/avatar/cards/avatar.webp` | 1024×1024 | 177.730 | candidato |
| Fundo Vila do Barril | `fundo-vila.png` | `images/artes/candidatos/vila/cards/vila.webp` | 1024×1024 | 223.240 | candidato |

Total derivado: **8 arquivos, 476.568 bytes** (0 bytes no CORE do SW — nada está em uso).

### Revisão visual

- Selos legíveis a **192, 56 e 28 px** (`docs/provas-novos-temas/leitura-selos.webp`). A 28 px o selo de **The Office** é o mais fraco (papel bege sobre fundo claro) e o de **Avatar** o mais denso; ambos continuam reconhecíveis pela silhueta. Nenhum foi alterado por isso.
- **Divergência registrada:** o selo de Springfield veio com cantos pretos fora do disco amarelo. Em 192 px com `rounded-lg` sobre fundo escuro o efeito é aceitável, mas não é o mesmo enquadramento dos demais; pode ser regerado com fundo que preencha o quadrado se você preferir.
- Fundos conferidos em prova 512×512 (`docs/provas-novos-temas/fundos-cards.webp`): centro calmo, sem texto, sem pessoas, compatível com retrato circular + texto do Story/Card. Ainda **não** foram testados no canvas real 1080×1920/1080×1080 do `js/cartoes.js`.
- A moldura escura das provas é só de conferência; não faz parte do derivado.

## 5. Como reproduzir

```bash
scripts/prepare-art-novos-temas.sh            # lê .cache/artes-originais/novos-temas
```

O script só **deriva** (recorte/redução/prova); não gera arte. Se os originais não existirem mais no sandbox, ele avisa e preserva os derivados existentes. ImageMagick é ferramenta editorial opcional — não entra em `package.json` e não é requisitada pelo app.

## 6. O que este lote não contém

- Nenhum tema cadastrado: `THEMES`, `THEME_IDS_LIST`, `THEME_ICONS`, `STORY_CARD_STYLES`, `DEFAULT_BOSS_PORTRAITS`, molduras novas e CORE do `sw.js` seguem intocados.
- Nenhuma regra de XP, dano, PR, temporada, deload ou conquista foi alterada. As fraquezas e os nomes de “dano/crítico” acima são vocabulário de apresentação, não mecânica.
- Nenhum retrato de chefão, patente ou fundo pendente foi gerado ainda (§7).

## 7. Pendências e decisões

1. **The Office já existe no app** (`office`, cadastrado na PR #32, 24 artes em uso). O quarto item do pedido colide com ele. Três saídas possíveis: (a) tratar este lote como **pacote de upgrade** do tema existente; (b) cadastrar um tema separado `office-us` (“The Office EUA — Segundo Turno”); (c) descartar o tema. O selo `office-us` foi produzido para viabilizar (a) ou (b).
2. **Completar a identidade** dos seis temas: faltam 4 fundos de card (`caverna`, `office-us`, `springfield`, `esgoto`) e 6 molduras de canvas (`elementos`, `tocha`, `memorando`, `sitcom`, `tv`, `bueiro`).
3. **Retratos de chefão:** 6 × 12 = **72 peças**; **patentes:** 6 × 10 = **60 peças**. No limite de 10 imagens por turno, são **14 lotes** só de retratos + patentes, sem contar extras. Vale escolher a ordem (um tema completo por vez ou uma família por vez em todos os temas).
4. **Licença:** as seis séries são propriedades de terceiros. A geração de imagem não confere licença comercial; uso editorial/interno é decisão do usuário. Registrado também no manifesto.
