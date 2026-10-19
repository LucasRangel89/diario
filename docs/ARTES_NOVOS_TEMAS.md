# Novos temas — direção de arte e catálogo adaptado (lote 1)

Sessão `arena/a088cf10-diario` · 19/10/2026 · base `7a6b218` (main) · nenhuma alteração preexistente no checkout.

Lote 1 autorizado pelo pedido do usuário: “gerar algumas novas imagens para alguns temas (ignore a numeração). Tenha liberdade criativa para alterar nomes e itens.” Foram produzidas **8 peças** (6 selos + 2 fundos de card) em **10 chamadas de geração** (o limite por turno da ferramenta é 10; duas chamadas extras foram revisões). Nenhum tema foi cadastrado no app, nenhuma fórmula/regra foi alterada.

**Lote 2 (mesma sessão):** as **10 patentes de O Equilíbrio dos Elementos** (`avatar-01…10`), fechando a família de emblemas do tema mais adiantado. Estratégia de lotes definida com o usuário: gerar o máximo por sessão (10 imagens) e deixar revisão longa, cadastro e testes para a sessão final. Ver §8.

**Análise do tema `office` existente × proposta:** `docs/ANALISE_TEMA_OFFICE.md` (recomendação: upgrade no lugar + vocabulário; **não** criar segundo tema). **Decisão do usuário (19/10): adotar o upgrade** — aprovado o caminho A, com a lista de 12 desafios e os 6 retratos de personagem do §5 daquele documento. Nada implementado ainda; ver §10.

**Lote 3 (mesma sessão):** os **10 primeiros retratos de chefão de O Equilíbrio dos Elementos** (Mercador de Repolhos → Homem-Combustão). Ver §8.

**Lote 4 (mesma sessão):** **Azula, Ozai** e as **8 primeiras patentes da Vila do Barril**. Ver §9.

**Lote 5 (mesma sessão):** patentes **09–10 da Vila** e os **8 primeiros retratos** (Quico → Monstros de TV). Ver §10.

**Lote 6 (mesma sessão):** 4 retratos finais da Vila + **fundo do Esgoto** + 5 patentes do Esgoto. **Vila do Barril fecha 24/24.** Ver §11.

**Lote 7 (mesma sessão):** patentes **06–10 do Esgoto** e os **5 primeiros retratos** (Clã do Pé → Rei dos Ratos). Ver §12.

**Decisão de engenharia (19/10):** as **molduras saem da fila de geração** e vão para a sessão de implementação. Motivo: moldura exige alfa por *keying* do xadrez pintado, revisão de halo e teste nos canvases 1080×1920/1080×1080 — trabalho que só faz sentido junto do código que vai desenhá-la. Isso libera as 10 imagens de cada sessão para arte de jogo (retratos e patentes) e **elimina ~6 imagens do plano**.

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

## 7. Lote 2 — patentes de O Equilíbrio dos Elementos

| # | Patente | Motivo do emblema | Bytes |
|---:|---|---|---:|
| 01 | Civil da Aldeia | tigela de arroz, chapéu de palha e cabana de pedra | 14.480 |
| 02 | Noviço do Templo | contas de oração, sino e incenso | 15.108 |
| 03 | Dobrador de Água | onda em espiral, lua crescente | 15.222 |
| 04 | Dobrador de Terra | pilha de pedras com broto | 13.578 |
| 05 | Dobrador de Fogo | chama de três línguas em braseiro | 13.760 |
| 06 | Dobrador de Ar | espiral de vento e sino de vento | 14.650 |
| 07 | Lótus Branco | lótus branco em água escura | 16.208 |
| 08 | Mestre Dobrador | quatro símbolos ao redor do cajado | 14.756 |
| 09 | Espírito de Luz | espírito luminoso em forma de pipa-manta | 16.702 |
| 10 | AVATAR | quatro orbes e lótus com motivo de flecha | 16.222 |

Total do lote: **10 arquivos, 150.686 bytes**. Todos 192×192, Lanczos, opacos, `estado: candidato`. Prova de leitura em `docs/provas-novos-temas/leitura-patentes-avatar.webp`. O tema `avatar` passa a ter **selo + fundo + 10 patentes** = 12/24 arquivos; faltam os 12 retratos e a moldura.

## 8. Lote 3 — retratos de chefão de O Equilíbrio dos Elementos

| # | Retrato | Arquétipo | Fraqueza | Bytes |
|---:|---|---|---|---:|
| 01 | Mercador de Repolhos | En | Pernas | 65.294 |
| 02 | Arqueiras Yuyan | En | Ombros | 52.486 |
| 03 | Comandante Zhao | Tq | Peito | 61.494 |
| 04 | Jet | Vl | Pernas | 65.436 |
| 05 | Príncipe Zuko | Vl | Ombros | 50.174 |
| 06 | Long Feng | En | Costas | 50.744 |
| 07 | Koh, o Ladrão de Rostos | Cl | Core | 43.068 |
| 08 | Wan Shi Tong | Tq | Core | 78.766 |
| 09 | Hama | Cl | Antebraço | 51.214 |
| 10 | Homem-Combustão | Cl | Peito | 61.270 |

Total do lote: **10 arquivos, 579.946 bytes**. Todos 512×512, Lanczos 1254→512, opacos, `estado: candidato`. Fundo de pedra azul-escura com a mesma moldura geométrica nos dez, o que mantém a família coesa no card circular. Prova em `docs/provas-novos-temas/retratos-avatar.webp`.

Com o lote 3, o tema `avatar` tem **22/24 arquivos** (selo, fundo, 10 patentes, 10 retratos). Faltam **Azula**, **Ozai**, a moldura `elementos` — o lote 4 fecha o tema.

## 9. Lote 4 — fecha os retratos de Avatar e abre as patentes da Vila

| Peça | Arquivo | Dimensões | Bytes | Fraqueza/observação |
|---|---|---:|---:|---|
| Azula | `avatar/bosses/avatar-b11.webp` | 512×512 | 66.240 | Ombros |
| Ozai, o Senhor do Fogo | `avatar/bosses/avatar-b12.webp` | 512×512 | 62.282 | Peito (chefe Ms) |
| Patente 01 — Morador do Barril | `vila/patentes/vila-01.webp` | 192×192 | 8.796 | barril, varal e antena |
| Patente 02 — Órfão da Vila | `vila/patentes/vila-02.webp` | 192×192 | 8.510 | boné remendado e caneca |
| Patente 03 — Freguês da Vila | `vila/patentes/vila-03.webp` | 192×192 | 9.202 | balcão, sino e moedas |
| Patente 04 — Fã do Chapolin | `vila/patentes/vila-04.webp` | 192×192 | 8.948 | fantasia no cabide |
| Patente 05 — Antenas de Vinil | `vila/patentes/vila-05.webp` | 192×192 | 10.310 | discos e hastes |
| Patente 06 — Marreta Biônica | `vila/patentes/vila-06.webp` | 192×192 | 9.612 | marreta com molas |
| Patente 07 — Chapolin Colorado | `vila/patentes/vila-07.webp` | 192×192 | 9.676 | herói de costas |
| Patente 08 — Herói da Vila | `vila/patentes/vila-08.webp` | 192×192 | 8.714 | medalha com barril |

Total do lote: **10 arquivos, 102.290 bytes**. Todos candidatos.

- **`avatar` chega a 24/24** (selo, fundo, 10 patentes, 12 retratos) e fica pronto para cadastro na sessão final.
- **`vila` está em 10/24** (selo, fundo, 8 patentes); faltam 2 patentes e 12 retratos.
- A família da Vila ganhou identidade própria: medalhões dourados, fundo verde-azulado, scanlines de TV de tubo e granulado de fita — distinta dos selos e do fundo já aprovados no lote 1, mas da mesma paleta.

## 10. Lote 5 — Vila do Barril: patentes fechadas, retratos pela metade

| Peça | Arquivo | Dimensões | Bytes | Nota |
|---|---|---:|---:|---|
| Patente 09 — Defensor dos Fracos | `vila/patentes/vila-09.webp` | 192×192 | 12.128 | escudo, marreta e capa cruzadas |
| Patente 10 — Sanduíche Supremo | `vila/patentes/vila-10.webp` | 192×192 | 13.748 | a piada que nunca se resolve |
| Retrato — Quico | `vila/bosses/vila-b01.webp` | 512×512 | 58.570 | En · Peito |
| Retrato — Chiquinha | `vila/bosses/vila-b02.webp` | 512×512 | 54.246 | Vl · Pernas |
| Retrato — Nhonho | `vila/bosses/vila-b03.webp` | 512×512 | 52.022 | Tq · Abdômen |
| Retrato — Jaiminho | `vila/bosses/vila-b04.webp` | 512×512 | 50.342 | Vl · Costas |
| Retrato — Prof. Girafales | `vila/bosses/vila-b05.webp` | 512×512 | 49.360 | Tq · Ombros |
| Retrato — Dona Florinda | `vila/bosses/vila-b06.webp` | 512×512 | 49.514 | Cl · Antebraço |
| Retrato — Bruxa do 71 | `vila/bosses/vila-b07.webp` | 512×512 | 55.680 | Cl · Costas |
| Retrato — Monstros de TV | `vila/bosses/vila-b08.webp` | 512×512 | 54.002 | En · Core |

Total do lote: **10 arquivos, 449.612 bytes**. Todos candidatos.

- **`vila` está em 22/24**: selo, fundo, **10/10 patentes** e **8/12 retratos**. Faltam Seu Barriga, 14 Meses de Aluguel, Bola de Boliche da Vila e Cópia do Chapolin — o lote 6 fecha o tema.
- A família de retratos manteve a paleta de vila de TV (amarelo-mostarda, vinho, verde-azulado) com scanlines e granulado, coerente com selo, fundo e patentes.

## 11. Lote 6 — Vila do Barril completa; Esgoto abre identidade

| Peça | Arquivo | Dimensões | Bytes | Nota |
|---|---|---:|---:|---|
| Retrato — Seu Barriga | `vila/bosses/vila-b09.webp` | 512×512 | 58.488 | Tq · Pernas |
| Retrato — 14 Meses de Aluguel | `vila/bosses/vila-b10.webp` | 512×512 | 66.194 | Ms · Core |
| Retrato — Bola de Boliche da Vila | `vila/bosses/vila-b11.webp` | 512×512 | 60.556 | En · Ombros |
| Retrato — Cópia do Chapolin | `vila/bosses/vila-b12.webp` | 512×512 | 57.248 | Vl · Antebraço |
| Fundo — Esgoto de Nova York | `esgoto/cards/esgoto.webp` | 1024×1024 | 103.640 | centro aberto, sem pessoas |
| Patente 01 — Filhote do Esgoto | `esgoto/patentes/esgoto-01.webp` | 192×192 | 10.574 | ovo e grade |
| Patente 02 — Aprendiz do Mestre | `esgoto/patentes/esgoto-02.webp` | 192×192 | 10.778 | boneco de treino |
| Patente 03 — Ninja das Galerias | `esgoto/patentes/esgoto-03.webp` | 192×192 | 11.310 | galeria e shuriken |
| Patente 04 — Vigia dos Telhados | `esgoto/patentes/esgoto-04.webp` | 192×192 | 10.448 | bueiro e skyline |
| Patente 05 — Bandana Vermelha | `esgoto/patentes/esgoto-05.webp` | 192×192 | 12.022 | sai e casco |

Total do lote: **10 arquivos, 401.238 bytes**. Todos candidatos.

- **`vila` está em 24/24** — selo, fundo, 10 patentes e 12 retratos. **Segundo tema completo.**
- **`esgoto` está em 8/24**: selo, fundo e 5 patentes. Faltam 5 patentes e 12 retratos.
- A família do Esgoto ganhou aro de aço com pátina sobre tijolo verde, com os quatro rebites das bandanas — distinta da Vila (dourada) e do Avatar (bronze).

## 12. Lote 7 — patentes do Esgoto fechadas, retratos abertos

| Peça | Arquivo | Dimensões | Bytes | Nota |
|---|---|---:|---:|---|
| Patente 06 — Bandana Azul | `esgoto/patentes/esgoto-06.webp` | 192×192 | 12.696 | katanas |
| Patente 07 — Bandana Roxa | `esgoto/patentes/esgoto-07.webp` | 192×192 | 10.976 | bastão bo |
| Patente 08 — Bandana Laranja | `esgoto/patentes/esgoto-08.webp` | 192×192 | 14.342 | nunchaku |
| Patente 09 — Sensei do Esgoto | `esgoto/patentes/esgoto-09.webp` | 192×192 | 11.702 | cajado e vela |
| Patente 10 — Mestre Splinter | `esgoto/patentes/esgoto-10.webp` | 192×192 | 13.268 | meditação e as 4 fitas |
| Retrato — Clã do Pé | `esgoto/bosses/esgoto-b01.webp` | 512×512 | 51.486 | En · Pernas |
| Retrato — Baxter Stockman | `esgoto/bosses/esgoto-b02.webp` | 512×512 | 63.466 | Vl · Antebraço |
| Retrato — Bebop | `esgoto/bosses/esgoto-b03.webp` | 512×512 | 60.958 | Tq · Ombros |
| Retrato — Rocksteady | `esgoto/bosses/esgoto-b04.webp` | 512×512 | 60.654 | Cl · Abdômen |
| Retrato — Rei dos Ratos | `esgoto/bosses/esgoto-b05.webp` | 512×512 | 60.510 | Vl · Core |

Total do lote: **10 arquivos, 360.058 bytes**. Todos candidatos.

- **`esgoto` está em 18/24**: selo, fundo, **10/10 patentes** e **5/12 retratos**. Faltam 7 retratos (Slash, Leatherhead, Tokka e Rahzar, Traag e Granitor, Krang, Technodrome, Destruidor).
- As quatro bandanas (05–08) já estão todas no jogo, na ordem vermelha → azul → roxa → laranja.

## 13. Estratégia de lotes (10 imagens por sessão)

Regra: **fechar um tema por vez**. Um tema completo pode ser cadastrado e testado de ponta a ponta mesmo que os lotes seguintes atrasem.

Situação após o lote 7: **avatar 24/24**, **vila 24/24**, **esgoto 18/24**, springfield e caverna 1/24, 6 retratos do Office pendentes. Restam **59 peças** em **6 lotes** + **5 molduras** na sessão final:

| Lote | Conteúdo | Fecha |
|---:|---|---|
| 8 | 7 retratos esgoto + 3 patentes springfield | **esgoto 24/24** |
| 9 | patentes springfield 04–10 + retratos springfield 01–03 | springfield 13/24 |
| 10 | retratos springfield 04–12 + fundo springfield | **springfield 24/24** |
| 11 | 10 patentes caverna | caverna 11/24 |
| 12 | 10 retratos caverna | caverna 21/24 |
| 13 | 2 retratos caverna + fundo caverna + 6 retratos Office + 1 folga | **caverna 24/24** e **Office** |

- **Caminho enxuto**: com Avatar e Vila completos **agora**, a PR já pode ser aberta e revisada; os lotes seguintes entram como commits incrementais. Parar no lote 8 entrega **3 temas** (Avatar, Vila, Esgoto).
- Cada lote termina com derivação (`scripts/prepare-art-novos-temas.sh`), manifesto e commit; o `sw.js` sobe a cada commit que toca `images/**` (neste lote, **v62 → v63**), mesmo sem CORE novo.
- **Molduras** (`elementos`, `tv`, `tocha`, `memorando`, `sitcom`, `bueiro`) e **4 fundos de card** entram na sessão de implementação, junto do código que os usa: precisam de keying de alfa e teste nos canvases. Planejar 1 imagem por moldura **fora dos lotes de 10**.
- Na sessão final o trabalho é: entradas em `THEMES`, `THEME_IDS_LIST`/`THEME_ICONS`/`STORY_CARD_STYLES`, molduras em `js/cartoes.js`, `DEFAULT_BOSS_PORTRAITS` 144 → 192, CORE do `sw.js`, testes de arte/tema e validação em navegador real.

## 14. Pendências e decisões

1. **The Office**: **upgrade aprovado pelo usuário em 19/10** (`docs/ANALISE_TEMA_OFFICE.md`, caminho A). Mantém o tema `office`, as 24 artes e a regra “sem vilões”; adota o vocabulário (Vendas, Negócio Fechado, Meta Semanal, Trimestre Fiscal, Festa do Comitê) e os 6 desafios com personagem da §5 daquele documento. O selo `office-us` do lote 1 passa a ser **identidade alternativa** do card, não um tema novo; o `office-us` como tema separado está **descartado**. Implementação fica para a sessão final (lote 14 + código).
2. **Regerar depois**: cantos pretos do selo de Springfield e, se a leitura a 28 px incomodar, o selo de The Office (papel bege com pouco contraste).
3. **Testes de canvas**: os 2 fundos e as molduras propostas ainda não foram testados em 1080×1920/1080×1080 do `js/cartoes.js`. Fica para a sessão final, quando houver moldura implementada.
4. **Licença**: as seis séries são propriedades de terceiros. A geração de imagem não confere licença comercial; uso editorial/interno é decisão do usuário. Registrado também no manifesto.
