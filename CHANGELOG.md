# Changelog — Diário de Cargas // Berzerker Mode

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

## [Não lançado] — novos temas: direção de arte e lote 1 (selos + 2 fundos)

- **Site em manutenção (provisório, 29/10/2026).** O app sai do ar sem mudar uma linha do código do app: o arquivo `MANUTENCAO` na raiz põe `scripts/build-site.sh` em **modo manutenção** e o artefato publicado passa a ser só a página de aviso (`manutencao.html` autossuficiente, sem JS/CSS externos, `noindex` + `robots.txt` `Disallow: /`), os ícones, um `404.html` com o mesmo aviso e um `sw.js` de passagem (`scripts/manutencao-sw.js`: `CORE = ['./']`, `fetch()` puro, sem pré-cache e **sem apagar** o cache do app) — `index.html`, `js/`, `images/` e `vendor/` ficam de fora (artefato de ~22 MB cai para ~465 KB). O **GitHub Pages foi desligado** (a URL responde 404) e o workflow `Pages` foi desabilitado enquanto durar a manutenção. `docs/MANUTENCAO.md` traz os dois níveis, o que acontece com quem já instalou o PWA (dados intactos no IndexedDB; o cache antigo pode manter o app abrindo offline por um tempo) e o checklist de religação. Nenhum teste, arte ou tema foi alterado.
- **Cadastro dos cinco temas novos + upgrade do Office (v74).** `THEMES` vai a **17 temas** com 10 patentes e 12 chefões cada (curva de HP `100+18i` compartilhada): `avatar` (O Equilíbrio dos Elementos), `vila` (Vila do Barril), `esgoto` (Esgoto de Nova York), `springfield` (Springfield) e `caverna` (Caverna do Dragão), **IDs novos ao fim das listas** (progresso e IDs existentes intocados). `DEFAULT_BOSS_PORTRAITS` **144 → 204** (60 retratos novos), `THEME_IDS_LIST`/`THEME_ICONS`/`STORY_CARD_STYLES` com 17 entradas, e **5 molduras vetoriais** novas em `js/cartoes.js` (`elementos`, `tv`, `bueiro`, `sitcom`, `tocha`).
- **Office (upgrade aprovado):** os 6 desafios de cena viraram **personagens** (Angela, Dwight, Toby, Jan Levinson, Robert California, Jo Bennett) com ids `b3,b4,b5,b7,b8,b9` preservados; o selo memorando e o fundo de Scranton passaram a ser a identidade do tema (`images/temas/office.webp` e `images/cards/office.webp`). Os 6 retratos de cena aposentados ficam como **arte de reserva fora do precache**.
- **Lote 15:** **5 molduras de card + fundo do Office** gerados e derivados (6 arquivos, 321 KB). Em `vila`/`esgoto` o gerador pintou o xadrez de transparência **dentro do vão**: o `scripts/prepare-art-novos-temas.sh` passou a isolar o vão por desfoque + floodfill com sementes claras validadas, preservando a corrente do esgoto. Corrigida a nota do lote 14: o halo rosa da moldura do Office **não se reproduz** na revisão a 1:1. Manifesto com **238 registros**.
- **Precache:** 60 retratos + 50 patentes + 5 selos + 5 fundos novos e 6 personagens do Office; as 6 cenas aposentadas saem. `sw.js` **v73 → v74**; B5 passa a **170 patentes + 17 cards = 187 imagens** (~2,8 MB). Testes de tema/arte/UI/SW e validação em navegador atualizados para **17 temas, 204 chefões e 187 imagens**.
- Seis temas futuros receberam **direção de arte e catálogo adaptado** em `docs/ARTES_NOVOS_TEMAS.md`: O Equilíbrio dos Elementos (`avatar`), Caverna do Dragão (`caverna`), The Office EUA (`office-us`), Springfield (`springfield`), Vila do Barril (`vila`) e Esgoto de Nova York (`esgoto`). Nomes, patentes, chefões (fechados em 12 na curva `100+18i`), fraquezas nos grupos reais, vocabulário de missão/deload/crítico e molduras propostas; tudo é **proposta editorial**, nada cadastrado.
- **Lote 1: 8 peças** em pixel art (6 selos 192×192 + 2 fundos de card 1024×1024, 477 KB) em `images/artes/candidatos/<tema>/temas|cards/`, fora do CORE do SW e sem vínculo com a UI; originais fora do Git em `.cache/artes-originais/novos-temas/`. Manifesto `docs/manifesto-artes.json` vai a **112 registros** e `scripts/prepare-art-novos-temas.sh` (ImageMagick editorial, sem dependência de produção) reproduz recorte, redução e provas.
- Revisão registrada: selos legíveis a 28 px com ressalva para The Office (papel bege) e Avatar (denso); o selo de Springfield veio com cantos pretos fora do disco, divergência anotada para regerar se o tema for aprovado. Fundos ainda **não** testados no canvas 1080×1920/1080×1080.
- **Lote 2:** as **10 patentes de O Equilíbrio dos Elementos** (192×192, 151 KB, candidatas) em `images/artes/candidatos/avatar/patentes/`; manifesto vai a **122 registros**. O tema `avatar` chega a **12/24** arquivos (selo + fundo + patentes); faltam 12 retratos e a moldura.
- **Estratégia de lotes** documentada (`docs/ARTES_NOVOS_TEMAS.md` §8): 132 peças restantes, 10 por sessão, **fechando um tema por vez** para permitir cadastro/teste de cada tema completo; caminho enxuto para 3 temas prontos (Avatar, Vila, Esgoto) em 6 lotes. 8 imagens de folga para regeração.
- **Análise crítica do tema `office` existente × proposta** em `docs/ANALISE_TEMA_OFFICE.md`: o tema atual usa **situações** como desafios (decisão “sem vilões”), tem 12 chefões e patentes de carreira na filial; a proposta troca por **pessoas** como vilões e escada corporativa. Quatro caminhos comparados, recomendação por **upgrade no lugar + vocabulário** (Vendas, Negócio Fechado, Meta Semanal, Trimestre Fiscal, Festa do Comitê) e lista fechada de 6 desafios com personagem se aprovado; **não** criar segundo tema Office.
- **Lote 3:** os **10 primeiros retratos de chefão de O Equilíbrio dos Elementos** (Mercador de Repolhos, Arqueiras Yuyan, Comandante Zhao, Jet, Príncipe Zuko, Long Feng, Koh, Wan Shi Tong, Hama, Homem-Combustão) em 512×512, 580 KB, candidatos; manifesto vai a **132 registros**. O tema `avatar` chega a **22/24** — faltam Azula, Ozai e a moldura `elementos`.
- **The Office: upgrade aprovado pelo usuário.** O tema `office` é mantido (24 artes, regra “sem vilões”), adotando o vocabulário da proposta (dano = Vendas, crítico = Negócio Fechado, missão = Meta Semanal, temporada = Trimestre Fiscal, deload = Festa do Comitê) e 6 desafios com personagem (Angela, Dwight, Toby, Jan, Robert California, Jo Bennett). O tema separado `office-us` está **descartado**; isso remove ~24 artes do plano e reduz o Office a 6 retratos + moldura `memorando`. Implementação na sessão final.
- **Plano de lotes revisado:** ≈101 peças restantes em 11 lotes de 10, fechando um tema por vez (lote 4 fecha Avatar; caminho enxuto para 3 temas no lote 8). `sw.js` **v61 → v62** pela regra de versão de `images/**`.
- **Lote 4:** **Azula e Ozai** (retratos 11–12) + **8 primeiras patentes da Vila do Barril** (Morador do Barril → Herói da Vila), 10 arquivos / 102 KB, candidatos; manifesto vai a **142 registros**. **O tema `avatar` está completo em 24/24** e a Vila chega a 10/24. A família da Vila ganhou identidade própria (medalhões dourados, fundo verde-azulado, scanlines de TV).
- **Molduras saem da fila de geração** (decisão de engenharia): exigem alfa por keying e teste nos canvases 1080×1920/1080×1080, então entram na sessão de implementação junto do código que as desenha. Isso libera as 10 imagens de cada sessão para retratos/patentes e tira ~6 peças do plano. Plano revisado: **89 peças em 9 lotes**, com Avatar pronto hoje e Vila fechando no lote 6. `sw.js` **v62 → v63**.
- **Lote 5:** **patentes 09–10 da Vila** (Defensor dos Fracos, Sanduíche Supremo) e os **8 primeiros retratos** do tema (Quico, Chiquinha, Nhonho, Jaiminho, Prof. Girafales, Dona Florinda, Bruxa do 71, Monstros de TV); 10 arquivos / 450 KB, candidatos; manifesto com **152 registros**. **A Vila do Barril está em 22/24** — só faltam 4 retratos (Seu Barriga, 14 Meses de Aluguel, Bola de Boliche, Cópia do Chapolin). Plano: 79 peças em 8 lotes; `sw.js` **v63 → v64**.
- **Lote 6:** os 4 retratos finais da Vila (Seu Barriga, 14 Meses de Aluguel, Bola de Boliche, Cópia do Chapolin), o **fundo do Esgoto** e as **5 primeiras patentes do Esgoto**; 10 arquivos / 401 KB, candidatos; manifesto com **162 registros**. **A Vila do Barril fecha 24/24** — segundo tema completo, ao lado de O Equilíbrio dos Elementos. Esgoto em 8/24. Plano: 69 peças em 7 lotes; `sw.js` **v64 → v65**.
- **Lote 7:** **patentes 06–10 do Esgoto** (Bandana Azul, Bandana Roxa, Bandana Laranja, Sensei do Esgoto, Mestre Splinter) + **5 primeiros retratos** (Clã do Pé, Baxter Stockman, Bebop, Rocksteady, Rei dos Ratos); 10 arquivos / 360 KB, candidatos; manifesto com **172 registros**. **Esgoto em 18/24** — 10/10 patentes, faltam 7 retratos. Plano: 59 peças em 6 lotes; `sw.js` **v65 → v66**.
- **Lote 8:** os 7 retratos finais do Esgoto (Slash, Leatherhead, Tokka e Rahzar, Traag e Granitor, Krang, Technodrome, Destruidor) + as 3 primeiras patentes de Springfield; 10 arquivos / 520 KB, candidatos; manifesto com **182 registros**. **O Esgoto de Nova York fecha 24/24** — terceiro tema completo. Springfield em 4/24. Plano: 49 peças em 5 lotes; `sw.js` **v66 → v67**.
- **Lote 9:** **patentes 04–10 de Springfield** (Inspetor 7-G, Funcionário do Mês, Supervisor de Turno, Astronauta, Dono da Usina, Prefeito, Jebediah Springfield) + retratos de **Nelson** e **Willie**; 9 arquivos / 207 KB, candidatos; manifesto com **191 registros**. Springfield em **17/24** (patentes 10/10). A 10ª chamada do lote (retrato do Trio Bully) foi **recusada pelo filtro de segurança do provedor de imagem** e será refeita no lote 10 com outra composição — limite externo, registrado. `sw.js` **v67 → v68**.
- **Lote 10:** 7 retratos de Springfield (Trio do Pátio, Chefe Wiggum, Tony Gordo, Krusty, Kang e Kodos, Hank Scorpio, Loja de Conveniência) + **fundo de Springfield**; 8 arquivos / 527 KB, candidatos; manifesto com **199 registros**. **Springfield em 21/24** — faltam os retratos 09 (Sr. Burns), 10 (Bob Sideshow) e 12 (Multidão). O **Trio precisou de 3 tentativas**: as duas primeiras descrições foram recusadas pelo filtro de moderação do provedor e passaram ao descrever “três amigos de escola acenando”; peça renomeada para **Trio do Pátio**. `sw.js` **v68 → v69**.
- **Lote 11:** os 3 retratos finais de Springfield (Sr. Burns, Bob Sideshow, Multidão) + as **7 primeiras patentes da Caverna do Dragão**; 10 arquivos / 295 KB, candidatos; manifesto com **209 registros**. **Springfield fecha 24/24 — quarto tema completo.** Caverna em 8/24. Dica do usuário incorporada: evitar termos de conflito no prompt (o trio passou como “amigos de escola acenando”). Restam 22 peças em 3 lotes; `sw.js` **v69 → v70**.
- **Lote 12:** **patentes 08–10 da Caverna** (Portador do Arco, Herói de Reide, De Volta pra Casa) + os **7 primeiros monstros** (Mímico, Aranha Gigante, Cubo Gelatinoso, Urso-Coruja, Demônio das Sombras, Beholder, Devorador de Mentes); 10 arquivos / 475 KB, candidatos; manifesto com **219 registros**. **Caverna em 18/24** — 10/10 patentes, faltam 5 monstros e o fundo. Restam 12 peças; `sw.js` **v70 → v71**.
- **Lote 13:** **Caverna do Dragão fecha 24/24** (Hidra, Lich, Dragão Vermelho, Tiamat, Vingador + fundo de card) — **quinto tema completo**. Início do **upgrade do Office**: retratos de Angela, Dwight, Toby e Jan Levinson em `images/artes/candidatos/office-us/bosses/`; 10 arquivos / 659 KB, candidatos; manifesto com **229 registros**. Restam Robert California, Jo Bennett, fundo e moldura `memorando`. O script passou a mapear o prefixo `office`; `sw.js` **v71 → v72**.
- **Lote 14 (revisão de Springfield + pendentes finais):** o **selo de Springfield foi regerado** (quadro preenchido, sem os cantos pretos da v1; alternativa em escudo avaliada e descartada) e **4 patentes foram refeitas** por baixo contraste (Aluno, Entregador de Jornal, Funcionário do Mês, Supervisor de Turno). Uma tentativa de patente 03 (banca de frutas) foi descartada por não corresponder ao cargo — o original foi mantido. Os 12 retratos do tema foram preservados após revisão da cartela completa. Também entraram **Robert California** e **Jo Bennett**, fechando **6/6 retratos do upgrade do Office**, e a **moldura `memorando`** (768×1152), gerada com fundo magenta e convertida por keying — tem **halo rosa residual** e proporção 2:3, então **não está aprovada para produção**. Manifesto com **232 registros**; `sw.js` **v72 → v73**.
- Pendências e colisão explícitas: `office` já existe no app (PR #32), então o quarto pedido precisa virar upgrade do tema, tema separado ou ser descartado; faltam 4 fundos, 6 molduras e 132 retratos/patentes (6×12 + 6×10). Nenhuma mudança em `THEMES`, XP, dano, PR, temporadas ou backup; `sw.js` sobe **v60 → v61** só pela regra de versão de `images/**` (nenhum arquivo novo no CORE). Limites de propriedade intelectual dos seis seriados registrados.

## [Não lançado] — artes ThunderCats e The Office (lotes 1–6) + cadastro dos dois temas na galeria

- Primeiro lote de artes para os temas futuros ThunderCats e The Office: **10 peças geradas** em pixel art (aprovadas na sessão) — retratos Mumm-Ra (forma poderosa) e Impressora em pane; patentes Lenda de Thundera e Lenda de Scranton; selos dos dois temas; fundos de card dos dois temas; duas molduras de overlay. **Nenhum tema é cadastrado e nada entra na galeria** (cada tema exige 24 arquivos; ambos têm 4/24).
- Derivados WebP em `images/artes/candidatos/**` (456 KB, fora do CORE do service worker e fora da UI); originais ≈18 MB fora do Git em `.cache/`. Manifesto `docs/manifesto-artes.json` (id, tema, origem, fonte, sha256, recorte, dimensões, transparência, uso futuro, estado, notas); script reproduzível `scripts/prepare-art-lote1.py` (Pillow editorial em venv próprio; não é dependência); provas em `docs/provas-lote1/` (cartela 5×2 montada por código, leitura de patentes a 28 px, molduras sobre card); relatório completo em `docs/ARTES_THUNDERCATS_OFFICE.md`.
- Molduras vieram sem alfa nativo (RGB com xadrez pintado — não é transparência); alfa obtido por *keying* de flood-fill com revisão visual de halos, mestres PNG fora do Git. Pendências registradas: halo leve nas bordas internas, selo ThunderCats de baixa leitura a 28 px, teste das molduras nos canvases 1080×1920/1080×1080 antes de qualquer uso.
- Nenhuma mudança em UI, `THEMES`, XP, chefões, PR, fórmulas, histórico, backup ou cache offline. `sw.js` v58 → v59 (regra de versão para diffs em `images/**`). Plano editorial restante documentado: 92 peças pendentes das 98 aprovadas.
- **Lote 2 (chamadas 11–20, geração individual):** mais 10 retratos de chefões ThunderCats (Jackalman, Monkian, Vultureman, Slithe, Ratar-O, Grune, Safari Joe, Captain Shiner, Hammerhand, The Driller) — cartela 1 fica com 11/12 (falta Mumm-Ra, forma mumificada). ThunderCats chega a 14/24 arquivos de tema; 82 peças pendentes no plano. Manifesto cresce para 20 registros (mescla por id preservando registros sem original no ambiente); provas atualizadas (`cartela-candidatos.webp` com 22 peças).
- **Lote 3 (chamadas 21–30):** fecha as cartelas 1 e 2 do ThunderCats — Mumm-Ra (forma mumificada) + 9 patentes (Sobrevivente de Thundera a Senhor dos ThunderCats). **ThunderCats completa 24/24 arquivos de tema** (12 retratos + 10 patentes + selo + fundo); 26/98 peças do plano concluídas, 72 pendentes. Manifesto com 30 registros. Contraste baixo a 28 px registrado para o selo ThunderCats e a patente 03 (Explorador). Cadastro do tema no app segue pendente de aprovação de interface.
- **Lote 4 (chamadas 31–40):** cartela 4 (desafios The Office) com 10 situações — Reunião que poderia ser um e-mail, Grampeador na gelatina, Inventário do depósito, Guerra das vendas, Comitê de festas, Olimpíadas do escritório, Simulado de incêndio do Dwight, Visita do corporativo, Crise da marca-d’água e Premiação dos Dundies (falta Último expediente). The Office sobe a 13/24 arquivos de tema; 36/98 peças do plano concluídas, 62 pendentes. Manifesto com 40 registros. Sem personagens reais nas cenas; nota de revisão: Premiação dos Dundies com borda clara divergente.
- **Lote 5 (chamadas 41–50):** fecha as cartelas 4 e 5 do The Office — Último expediente + 9 patentes (Recém-contratado a Diretor do Corporativo). **The Office completa 24/24 arquivos de tema** (12 desafios + 10 patentes + selo + fundo); com ThunderCats (24/24), as cartelas 1, 2, 4 e 5 do plano estão completas — 46/98 peças concluídas, 52 pendentes. Manifesto com 50 registros. Família de medalhões dourado/marinho consistente com a Lenda de Scranton; variações registradas (patente 03 em plaqueta quadrada, patente 04 com moldura decorativa). Cadastro dos dois temas no app segue pendente de aprovação de interface.
- **Lote 6 (chamadas 51–60, sessão `arena/9470848b-diario`):** fecha as cartelas 3 (ThunderCats/Identidade) e 6 (The Office/Identidade) — Troféu da Jornada, Espada do Trovão, Olho de Thundera, Fortaleza de Thundera e Símbolo central; Troféu Dundie, Caneca, Beterraba, Grampeador na gelatina (close de identidade) e Cadeira. Derivados 512×512 NEAREST em `images/artes/candidatos/*/identidade/` (≈337 KB com as molduras, fora do CORE e sem vínculo com UI); manifesto com **60 registros** (merge por id). Divergências registradas peça a peça: borda decorativa da Espada, silhueta assimétrica do Símbolo central, fundo claro do Dundie, rabiscos ilegíveis nos post-its da Caneca e leitura fraca da Cadeira a 28 px. Plano: **56/98 peças concluídas, 42 pendentes** (cartelas 7–10); o usuário decidiu gerar as cartelas 7–8 **sem reuso** de ícones.
- **Cadastro dos temas ThunderCats e The Office na galeria (aprovado explicitamente nesta PR):** IDs estáveis novos `thundercats`/`office` ao fim das listas (IDs existentes e progresso salvo intocados); `THEMES` com 10 patentes + 12 chefões/desafios por tema na curva de HP compartilhada e fraquezas nos grupos reais; linguagem do Office aplicada (Arena "Filial de Scranton", Boss "Desafio do expediente", carreira na filial até Lenda de Scranton); 48 arquivos movidos dos candidatos para `images/bosses|patentes|temas|cards`; `DEFAULT_BOSS_PORTRAITS` 120→144; paletas de Story Card e molduras de canvas `garra`/`caderno`; `sw.js` **v59→v60** com os 48 arquivos no CORE (cache offline cresce ≈1,5 MB); testes atualizados (144 retratos, 12 temas, 132 imagens de patentes/cards também na validação em navegador real). Sem mudança em fórmulas de treino/XP/dano/PR/histórico. ThunderCats/The Office são propriedades de terceiros — arte gerada não implica licença comercial.
- **Lote 7 (chamadas 61–70):** cartela 7 (Treino: séries e descanso) com 10 peças candidatas em `images/artes/candidatos/treino/` (Série concluída a Pausa; faltam 2) — lista adotada das funções reais da sessão, sem vínculo com UI e sem regra nova de classificação. Manifesto com **70 registros**; plano **66/98, 32 pendentes**. Validação completa fica para o fechamento da PR (modo de trabalho ajustado a pedido do usuário).
- **Lote 8 (chamadas 71–80):** fecha a cartela 7 (Repetir série, Fim do treino — 12/12) e abre a cartela 8 com 8 equipamentos (Esteira a Polia; faltam 4). Manifesto com **80 registros**; plano **76/98, 22 pendentes**. Sem vínculo com UI; validação completa no fechamento da PR.
- **Lote 9 (chamadas 81–90):** fecha a cartela 8 (Banco, Barra com anilhas, Halteres, Argolas — 12/12) e abre a cartela 9 com 6 troféus de temas (clássico a nórdica; faltam 4). Manifesto com **90 registros**; plano **86/98, 12 pendentes**. Troféus sem vínculo com conquistas/regras; validação completa no fechamento da PR.
- **Lote 10 (chamadas 91–100):** fecha a cartela 9 (Roma, RPG, Galáctica, Anéis — 10/10) e abre a cartela 10 com 6 peças (Diário sem registros a Configurações; faltam 2). Backup/Restauração como pacotes fechados com seta, sem sinal de conclusão (regra da cartela 10). Manifesto com **100 registros**; plano **96/98, 2 pendentes**. Validação completa no fechamento da PR.
- **Lote 11 (final):** fecha a cartela 10 (Calculadora de anilhas, Sem corridas) — **plano editorial 98/98 completo**. Extras fora da contagem: **2 novas molduras candidatas do Card do tema Cavaleiros do Zodíaco** (Ouro do Santuário e Cosmo) em `images/artes/candidatos/zodiaco/molduras/`, com alfa por keying revisado em provas sobre card; seguem fora do CORE e sem vínculo com a UI (a moldura em uso do tema continua a `ouro` desenhada por código). Manifesto com **104 registros** (48 em uso, 56 candidatos).

## [Não lançado] — faixa semanal editável por grupo

- Metas pessoais de séries registradas por grupo editáveis ao lado do mapa. Defaults preservados: 10–20 nos nove grupos restantes e 4–10 em Antebraço; rótulos “abaixo da meta / na faixa / acima da faixa” continuam iguais sem configuração. Campo opcional `settings.weeklySeriesRanges` no armazenamento e backup JSON formato 6; faixa inválida cai no padrão do grupo; backup antigo sem campo restaura os padrões.
- Contagem legada (`muscle`), CSV 3, XP, chefões, histórico e 1RM inalterados; a faixa alimenta só a meta configurável do mapa, montador e assistente. Service Worker v57.

## [Não lançado] — decisões de produto da taxonomia (17/10/2026; somente docs)

- Decisões #1, #5 e #9 registradas em `docs/TAXONOMIA_EXERCICIOS.md` (§6) e na análise crítica: `muscle` é **permanente** como grupo gravado (registros, histórico, CSV 3, backup JSON 6, metas), sem alterar as regras atuais de XP/chefões nem reclassificar registros; apoio indireto segue como aviso de **contribuição estimada / séries ponderadas** (fator 0,3–0,5), nunca “série equivalente”, fora de metas, XP e chefões; exportação de perfis/anatomia fica **fora por enquanto**.
- Formatos inalterados: CSV 3 e backup JSON 6 não recebem campos de perfil/anatomia. Única exceção já existente: `idEstavel`/`versao` opcionais nos itens de `customExercises` do backup (identidade, não anatomia). Nenhum código, dado legado, cálculo ou teste foi alterado; novas inferências anatômicas continuam condicionadas à revisão profissional (§5 da taxonomia).

## [Não lançado] — identidade versionada de exercícios personalizados (idEstavel)

- Exercícios personalizados ganham **identidade versionada** (`js/custom_exercises.js` e `js/perfil_exercicios.js`, decisão #8 da taxonomia): `idEstavel` (`ex-slug`) cunhado **uma única vez** na criação e preservado em renomes e edições (o nome é rótulo; a identidade é o ID) e `versao` (inteiro ≥ 1) que sobe a cada edição. Registros legados sem identidade recebem cunhagem determinística ao carregar/importar (recarregar não recunha). IDs dos 72 exercícios do catálogo são **reservados** — personalizado não pode "personificar" exercício do catálogo — e IDs repetidos no arquivo seguem a regra existente "a 1ª ocorrência mantém" (a seguinte é recunhada). Nada disso é anatomia.
- `perfilDoExercicio`/`idEstavelDoExercicio`/`aliasesDoExercicio` resolvem personalizados **antes** do índice do catálogo (que também recebe os personalizados): perfil `fora_do_catalogo` com `idEstavel` persistido, sinônimos como aliases e grupo do usuário **só** como agrupamento organizacional (limitação `grupo_declarado_pelo_usuario`), sempre `nao_revisado` e sem anatomia. Entrada de perfil revisado para o ID de um personalizado é ignorada (`registro_revisado_invalido`) — sem revisão profissional, nada vira anatomia validada.
- **Compatibilidade preservada:** o backup JSON **continua formato 6** — itens de `customExercises` ganham os campos **opcionais** `idEstavel`/`versao` (válidos fazem ida e volta; ausentes/inválidos são cunhados/ajustados na importação; leitores antigos preservam campos desconhecidos). O CSV **continua formato 3** — aba Catálogo com as 12 colunas de sempre, sem colunas de identidade. `muscle`, registros antigos, metas semanais, XP, chefões e o catálogo principal continuam intactos; nenhum registro é reclassificado.
- UI: o formulário de edição do personalizado mostra a identidade estável (`ex-…` · versão) e lembra que o grupo escolhido é organizacional, não classificação anatômica; o ID não muda ao renomear. `sw.js` sobe de **v55 para v56** (mudanças em `js/**`).
- Testes: `tests/engine/45_perfil_exercicios.js` (seção 18d) cobre cunhagem determinística, renome sem recunhar, colisões com o catálogo, unicidade, perfil sem anatomia e o gate de revisão; `tests/engine/70_csv_backup.js` cobre ida e volta no backup e arquivos antigos sem identidade; `tests/ui/60_csv_mapa_delegacao.js` cobre criar/renomear pela interface. Os harnesses `test_engine.js`/`test_ui.js` passam a avaliar `js/perfil_exercicios.js` antes de `js/custom_exercises.js` (dependência do registro injetado, igual ao grafo real de ES modules).

## [Não lançado] — base versionada de perfis e inventário da taxonomia

- Nova base **aditiva** em `js/perfil_exercicios.js` (schema v1): ID estável derivado do nome canônico, aliases do catálogo e estados `nao_revisado`/`revisado`. O registro de perfis revisados nasce **vazio**: nenhum exercício foi classificado anatomicamente por nome, tag ou regex.
- O schema exige revisor, data ISO, versão, músculos primários, secundários com `papel: secundario`/`contribuicao: estimada` e padrão de movimento para um perfil revisado. Perfil não revisado não pode carregar anatomia; campos de "séries equivalentes" são rejeitados. Um registro revisado que tente mudar o grupo legado do catálogo é ignorado (`registro_revisado_invalido`) e não reclassifica nada.
- Inventário completo em `docs/TAXONOMIA_EXERCICIOS.md`: 72 exercícios, 11 grupos de catálogo (10 no mapa + Cardio), 12 entradas em `MUSCLE_META` (inclui Geral), aliases legados `Pescoço → Ombros` e `Glúteos → Posterior`, fontes divergentes de grupo e mapa de impacto em histórico, metas, XP, chefões, CSV e JSON. O CSV de referência da raiz (64 linhas) e o catálogo de runtime (72) foram documentados sem alteração.
- **Nenhuma mudança de comportamento:** `muscle`, registros, CSV formato 3, backup JSON formato 6, metas, XP, chefões, PR/1RM, volume e recomendações continuam iguais. Testes novos comparam grupo legado, séries semanais, dano de chefão, CSV round-trip, JSON e `migrateLog` (incluindo Panturrilha em Posterior).
- Apoio indireto deixa de ser chamado de "séries equivalentes" na interface, README e testes; passa a "contribuição estimada / séries ponderadas", sem alterar o cálculo de 0,3–0,5. `docs/RECUPERACAO.md` e a análise crítica registram a mudança.
- `sw.js` sobe de **v54 para v55** (novo módulo no CORE). Testes do motor, UI, módulos ES, Service Worker, ponteiros de docs e build do CSS executados; nenhum dado legado é migrado ou reescrito.

## [Não lançado] — confiabilidade e linguagem do assistente de treino

- Estado sem histórico agora aparece como **Sem dados**, sem percentual de prontidão fabricado; no ranking, prontidão desconhecida recebe peso neutro e é explicada. Volume semanal permanece separado e visível.
- Estimativa Epley compartilhada por histórico, PR e calculadora: carga e reps da mesma série, limite explícito de 1–12 reps e sem extrapolação acima desse intervalo. Séries marcadas como aquecimento não definem e1RM.
- Dupla progressão deixa de sugerir incremento em kg para peso corporal sem carga adicional identificada.
- Alerta lombar passa a descrever exposição/janela temporal heurística, remove proibição absoluta e mantém rótulo, percentual e flag alinhados. Não representa recuperação ou risco individual.
- Nova análise crítica e plano incremental em `docs/ANALISE_CRITICA_RELATORIO_CARGAS.md`; explicação atualizada em `docs/RECUPERACAO.md`, README e interface. `sw.js` sobe de **v53 para v54** para renovar o cache offline.
- Testes do motor, UI, módulos ES e Service Worker passaram; nenhum dado legado foi migrado ou reescrito.

## [Não lançado] — retratos dos 12 Cavaleiros do Zodíaco

- Atualizados os 12 retratos padrão do tema Zodíaco com as imagens fornecidas, convertidas para WebP e limitadas a 512 px no lado maior, preservando a proporção original.
- Retratos de anime aparecem sem interpolação pixelada; o Card do Chefão mantém o enquadramento circular sem deformar as imagens. Os demais temas preservam o estilo pixel art.
- Testes UI cobrem o mapeamento dos 12 arquivos, a renderização suave e a proporção no canvas. `sw.js` sobe de **v52 para v53** para renovar o cache offline dos ativos.

## [Não lançado] — preparação e integração de artes anexadas

- Inventário dos 17 anexos desta sessão em `docs/CATALOGO_ARTES.md`, com conteúdo visual, formato, dimensões, bytes e decisões; manifesto `docs/artes-derivadas.json` registra origens, hashes, caixas de recorte e derivados. Nenhuma imagem externa/gerada nem original PNG grande incluído.
- Preparados **38 recortes** revisados (8 equipamentos, 10 anatomia, 8 símbolos, **12 insígnias**, apesar do nome da cartela) e 1 miniatura: **39 WebP / 149.642 bytes**. Quatro decorações em uso (Registro rápido, treino, descanso e calculadora de anilhas); 35 recortes candidatos sem associação inventada a músculos/conquistas. Redução proporcional, nearest-neighbor e fundos opacos preservados.
- Mapas, arena, moldura opaca, texturas sem continuidade comprovada e imagens redundantes ficam documentados como candidatos, sem substituir arte temática, fotos ou indicadores reais. `js/cartoes.js` e todas as regras de XP/PR/progresso, backup e CSV preservados.
- Fallback delegado oculta somente decoração indisponível, inclusive quando a imagem falha antes do módulo de eventos carregar; textos e controles continuam presentes. Testes UI e gate bloqueante de Chromium cobrem caminhos/dimensões, falhas reais de rede e enquadramento em 360/390/412/430 px.
- SW inicialmente **v47 → v48** sobre `3f22de7`; após integrar a PR #23 já mesclada em `origin/main` (`0f2cb73`, v49), versão final **v49 → v50**. **0 imagens novas / 0 bytes de imagens no CORE**, que permanece com 285 entradas; +2.747 bytes no shell precacheado. Quatro decorações podem faltar no primeiro uso offline e possuem fallback. Sem dependências de produção novas. Catálogo detalha limites de validação e pendências; sem alegação de aparelho físico/PWA instalada/offline geral validados.

## [Não lançado] — Treino em Andamento mobile-first + exercício Extra (branch `arena/2822dcb0-diario`)

### ADICIONADO
- **Sequência compacta da sessão (Objetivo 1):** cada exercício pendente vira cartão compacto com número, grupo/nome, meta (🎯) e estado (⏳/✔). Abre inicialmente só a primeira unidade pendente; abrir outra recolhe a anterior (accordion com `aria-expanded`/`aria-controls` anunciados e alvos de toque de 44 px). Exercícios concluídos ficam compactos e mantêm **✏️ Editar**. Na unidade aberta, carga, reps e **✔ Registrar** ficam à vista; tipo/modo, séries individuais, RIR, técnica, observações, aquecimento e anilhas vão sob **Mais detalhes**, sem perder nenhum campo. Bi-set é **uma** unidade expansível com os dois formulários e registro conjunto (descanso só depois do par).
- **Estado de expansão por unidade (uid estável):** recolher/abrir só alterna classes — o DOM dos campos **não** é desmontado ( `readFields()`/`snapshotDrafts()` dependem dele), e valores digitados (inclusive uma série parcialmente preenchida) sobrevivem a recolher, reordenar e redesenhar. `snapshotDrafts()` passou a guardar as linhas cruas do editor série a série (`readSetRowsRaw`), e `addSetRow`/`removeSetRow` sincronizam o estado com o DOM antes de redesenhar.
- **Após registro válido** a unidade concluída compacta e a próxima pendente abre; **em erro de validação** a unidade afetada fica/abre, sem criar log, sem avançar progresso e sem iniciar descanso. Aquecimento e anilhas da unidade usam os handlers da sessão (`showWarmupFor`/`showPlatesFor`, carga `s${i}-w`) via `fieldsHTML(..., { quickCapture: true, warmupTools })` — o modo global do Registro rápido (campo `w`) não é ativado cegamente na sessão.
- **Exercício Extra no progresso (Objetivo 2):** com sessão ativa, o Registro rápido mostra **➕ Contar no treino em andamento**. Salvo com a opção, o registro entra na sequência como item **Extra** concluído, ligado ao **id do log recém-criado** (nunca um segundo log), e o resumo atualiza total/concluídos/barra (ex.: 2/4 → 3/5). O item é identificado pelo selo **Extra**; editar seu log atualiza o resumo sem aumentar a contagem; excluir seu log remove o extra da sessão e corrige o progresso (excluir log de item planejado mantém o comportamento anterior: volta a pendente). O mesmo `logId` nunca é anexado duas vezes. Nome igual ao de item planejado pendente **não** vira vínculo: um aviso explica que o registro não conclui o planejado e permite escolher Extra distinto ou deixá-lo só no histórico (opção desmarcada/registro inválido não altera o progresso). Sem sessão ativa o Registro rápido continua igual; treinos salvos, ordem original e backup não são tocados pela inclusão pontual; a sessão segue sem persistência própria.

### CORRIGIDO
- **Meta do cartão estourando o cabeçalho em telas muito estreitas:** em 360–390 px o texto `🎯 carga × (reps)` com `whitespace-nowrap` era mais largo que o espaço do cabeçalho (ao lado de ▲▼) e podia invadir os controles. O meta passa a quebrar linha abaixo de 640 px (`sm:whitespace-nowrap`); medido em 360/390/412/430 px sem rolagem horizontal e sem conteúdo estourando a sessão/registro.
- **Rascunho embaralhado ao reordenar a sessão:** `renderSession()` re-snapshottava os campos com os índices já trocados depois de `moveSessionUnit`, misturando os drafts entre exercícios. A reordenação agora captura os rascunhos antes da troca e re-renderiza com `renderSession({ skipSnapshot: true })`.

### TESTES E VALIDAÇÃO
- `tests/ui/30_assistente_sessao.js` ganhou as seções **UI 10c–10f** (44 checagens novas; as existentes preservadas): cartões/alternância, rascunhos e séries incompletas, bi-set, reordenação, registro inválido/válido, extra uma única vez por `logId`, opção desmarcada, nome igual a item planejado, edição/exclusão de extra, handlers de aquecimento da sessão, acessibilidade e Registro rápido sem sessão. Antes da mudança, o Registro rápido com sessão ativa criava o log sem tocar em `activeSession.exercises` nem no progresso (comportamento preservado com a opção desmarcada).
- `scripts/validacao-navegador.js` ganhou a seção **NAV 2d**: no Chrome real (412 px) percorre a sessão compacta, registra um extra pelo Registro rápido e confere progresso, selo "Extra" e layout sem rolagem horizontal — incluindo a faixa **360/390/412/430 px** (emulada), também sem conteúdo estourando os cartões. Execução local com `@sparticuz/chromium` 153.0.8010.0: **53/53 checagens**.
- **Limitação explícita:** aparelho físico (incl. 360 px real, teclado do sistema e fonte grande) **não** foi validado nesta entrega — a faixa 360–430 px tem apenas medição **emulada**; pendência registrada em `docs/VALIDACAO_MANUAL.md` (seções 0 e 4). Não se declara uso em celular, PWA ou offline geral validados.
- Cache offline: `sw.js` **v47 → v49** (js/** mudou nos dois commits da branch). `vendor/tailwind.css` regenerado com as classes novas. Regras de XP, PR, volume, CSV e cardio inalteradas; sem novas dependências.

## [Não lançado] — B5: precache das imagens de patentes e cards (D8)

- **D8:** o CORE do Service Worker passa a incluir as **110 imagens** previstas de `images/patentes/*.webp` (100) e `images/cards/*.webp` (10), total medido de **1.057.982 bytes** (≈1,06 MB; ≈1,01 MiB) em `44659fe` (main com a PR #19/B3 mesclada). Nenhuma outra imagem foi acrescentada. O CORE sobe de 175 para **285** arquivos locais.
- Falha em qualquer item do precache continua rejeitando a instalação (sem `skipWaiting`): a versão anterior funcional permanece disponível, e removida a falha a instalação completa e a ativação funcionam. Testes novos no `test_sw.js` (seção SW 3b, usando uma imagem de patente real) e checks de cobertura/tamanho da B5; gate de navegador real confere as 110 imagens no cache e amostras offline.
- Cache offline: `sw.js` **v46 → v47** (o conteúdo do CORE mudou; nenhum arquivo de `images/**` ou `js/**` foi editado). Sem novas dependências de produção.
- **Merge da B5:** PR [#20](https://github.com/LucasRangel89/diario/pull/20) mesclada em `main` em **2026-10-16**; commit B5 `f9ad635694b2db1e14cda2a56588e01e4e510d1c`, merge commit `5bd9186a5e77864ff567740f23d22cf4445448c9`. Fechamento B0–B5 em `docs/RELATORIO_POS_PR17.md`.

## [Não lançado] — B3: interface de corridas (branch `arena/7d08417f-diario`)

- **D2:** quatro grupos existentes preservados (Treino, Jogo, Você, Config); Corridas é a última aba de Treino, com tela própria e sem nova coleção.
- **D3:** só Rua/Esteira na aba e no fluxo de criação/edição iniciado nela. Lista por ano/modalidade, totais, semanas ISO/meses/anos, recordes informativos e km por tênis usam os utilitários puros e `logs`; bike, elíptico e remo seguem em Histórico/CSV Cardio e no formulário de Hoje. Nomes legados são exibidos como Rua/Esteira, sem rebatismo ao editar outros campos.
- O editor de B2 é reutilizado para criar corridas com D6 e validação antes da gravação; PR segue a regra global de cardio. Pace atualiza ao mudar distância ou tempo. Tênis cujo nome coincide com propriedade nativa de objeto tem km contabilizados corretamente.
- JSON v5/v6, CSV v1/v2/v3 (D6 e `PR (informativo)`), XP, dano, combate, volume e 1RM continuam inalterados. Testes sintéticos do motor/UI/ESM e do Chrome real (gate da CI) cobrem os fluxos. Cache offline: `sw.js` **v46**. **B5 não incluído.**

## [Não lançado] — manutenção pós-PR #17 (branch `arena/1c7fe137-diario`)

### CI
- Atualizadas as Actions para as versões estáveis atuais consultadas em `repos/actions/*/releases/latest` em 2026-10-16: checkout v7.0.1, setup-node v7.1.0, upload-artifact v7.0.2, configure-pages v6.0.0, upload-pages-artifact v5.0.0 e deploy-pages v5.0.1. Os workflows usam Node 24 e mantêm `ubuntu-latest` e os nomes dos quatro checks obrigatórios. O CI também executa em pushes `arena/**`; o job de navegador real passou a ser bloqueante e exige Chrome (sem caminho de skip).

### CORRIGIDO
- **Edição de exercício personalizado alcançável (A2):** medição na base `90805e3` confirmou que a única entrada de UI era “➕ Novo exercício”; nenhum card personalizado reabria o formulário. Os cards da aba Buscar agora têm **✏️ Editar**, com alvo mínimo de 44 px. O teste criar → editar → salvar também revelou que o modo de edição não preenchia `dataset.editingId`, então o submit criava um novo em vez de atualizar; a abertura agora define esse vínculo. Teste UI cobre o fluxo real sem duplicar. `sw.js` sobe para v40.
- **Exclusão de exercício personalizado sem `confirm()` nativo (A3):** o botão Excluir, alcançado pelo card de A2, agora usa `confirmModal`. Teste real cobre Cancelar (não exclui), Confirmar (remove) e verifica que `window.confirm` nunca é chamado. `sw.js` sobe para v41.
- **Falha de gravação no localStorage com aviso persistente (A4):** `notifyStorageFailure` reaproveita `showBlobFailureWarning`, com aviso dispensável e botão que exporta o backup JSON real. Continua sendo um aviso por sequência, rearma depois de gravação confirmada e não empilha com o aviso de imagem. Os textos de sucesso dos fluxos não mudaram. Testes sintéticos cobrem o download, sequência/rearme, dispensar e o caminho de imagem I5. `sw.js` sobe para v42.
- **B0 — defeitos de edição/CSV de corrida medidos na base:** arquivo `docs/RELATORIO_POS_PR17.md` registra os cinco achados com SHA `90805e3`; o script sintético `scripts/repro-b0-corrida.js` reproduz ambos os pontos de entrada, poluição do registro, conflito CSV, selo 1RM indevido, mistura do recorde cardio e ausência de teste de UI.
- **B1 — módulo puro `js/corridas.js`:** conversão de duração e pace, identificação conservadora de corrida (sem bike/elíptico/remo), resumos por semana ISO/mês/ano e recordes informativos por distância e tênis. Pace médio dos resumos usa duração total ÷ distância total; o rótulo dos recordes deixa claro que é o pace médio da corrida inteira, não tempo oficial. Incluído no entry, CORE do SW, manifestos e fontes dos runners. `sw.js` sobe para v43.
- **B2 — edição dedicada de corridas:** os botões Editar da lista do dia e do histórico da Busca agora abrem formulário próprio com tempo `h:mm:ss`, pace ao digitar e campos D6; salvar preserva id/tema, recalcula o PR com o mesmo `detectAutoPR`, e remove apenas campos conhecidos de musculação deixados pelo editor antigo. Corridas migram com `type: corrida`; a impressão digital CSV usa só campos de corrida e deixa metadados D6 fora da identidade. Selo de corrida é “🏆 PR de distância”; musculação mantém o selo 1RM. `sw.js` sobe para v44.
- **B4 — persistência e compatibilidade D6:** validação JSON aceita `runType`, RPE inteiro 1–10, FC média numérica positiva e tênis textual dentro de `logs`, sem alterar o formato de backup 6 nem apertar a validação preexistente de `distanceKm`/`durationMin`; inválidos rejeitam o backup antes de qualquer mudança. Exportação CSV passa para formato 3 com as quatro colunas novas no fim de `Cardio`; leitura continua aceitando formatos 1 e 2, com round-trip e fingerprint compatível para arquivos antigos. `sw.js` sobe para v45.

## [Não lançado] — manutenção pós-PR #16 (branch `arena/ffba3b1d-diario`)

### CORRIGIDO
- **"➕ Novo exercício" voltou a abrir (I2):** `js/custom_exercises.js` chamava `openModal`,
  `closeModal` e `renderSearchTab`, que nunca existiram em nenhum commit (desde `a6c8735`): o
  botão da aba Buscar lançava `ReferenceError` e nada abria. A janela agora é criada no próprio
  módulo com o padrão de overlay do app (mesmas classes do modal de edição de registro), fecha
  no Cancelar, no clique fora e no ESC (`custom-ex-overlay` entrou em `OVERLAY_CLOSE_ORDER`), e
  a aba Buscar é redesenhada com `renderSearchScreen` (de `js/busca.js`). Nenhuma tela nova: o
  formulário (`customExerciseFormHTML`) e o cadastro já existiam. Teste novo de ponta a ponta em
  `tests/ui/60_csv_mapa_delegacao.js` (seção `UI 13b`). `sw.js` sobe para `v37`.

### ALTERADO
- **Aviso de imagem não confirmada com ação de backup (I5, evolução do P3):** quando o IndexedDB
  não confirma a gravação de um retrato/fundo, o aviso deixou de ser um `alertModal` que some em
  ~4 s: agora fica no topo da tela até ser dispensado (`#blob-save-warning`, `role="alert"`),
  mantém o texto "não confirmou o salvamento" e traz o botão **💾 Exportar backup JSON**, ligado
  ao mesmo `exportJSONBackup` de Config. Semântica igual: um aviso por sequência de falhas,
  rearmado só depois de uma gravação confirmada, nunca "salvo" sem confirmação, e o app segue
  utilizável (não é modal). Checks novos em `tests/ui/50_backup_gravacao.js` (seção `UI 12j`);
  roteiro manual de cota cheia em `docs/VALIDACAO_MANUAL.md`. `vendor/tailwind.css` regenerado
  (posição do aviso). `sw.js` sobe para `v38`.

### ESTRUTURA (sem mudança de comportamento)
- **`js/app.js` dividido de novo (R2, rodada 2 — I1):** saíram 57 declarações para três módulos
  novos, carregados pelo entry: `js/config.js` (migração para o IndexedDB, painel de
  armazenamento e seed do primeiro uso), `js/boss.js` (tela do chefão, retratos padrão/upload/
  reservas e lightbox) e `js/registro.js` (formulário de registro, última vez/repetir, edição,
  registros do dia, mapa de prontidão, sugestão do dia e cardio). `js/app.js`: 3.304 → 2.131
  linhas (`wc -l`; 3.282 no `origin/main` antes desta branch). Os corpos foram recortados e
  colados por script e comparados com o snapshot pré-movimentação: **byte a byte idênticos**;
  as 155 instruções que ficaram no app também são idênticas, e nenhum módulo reatribui binding
  importado. Funções que **reatribuem estado de topo** (`logs = …`, `seasons = …`,
  `lastBackupAt = …`, instâncias de gráfico etc.) ficaram no app de propósito — movê-las exigiria
  reescrever a atribuição como setter (ver o relatório da PR). Testes que liam arquivos fixos
  passaram a varrer todo `js/` (cobertura da delegação volta a 97 ações; antes da rodada eram 86
  e a lista fixa cairia para 72). `sw.js` sobe para `v39` e inclui os módulos no CORE.

### DOCUMENTADO
- **Ponteiros de teste atualizados (I4):** `docs/FORMATO_CSV.md`, `docs/RECUPERACAO.md`,
  `DIAGNOSTICO.md`, `js/datas.js`, `js/assistente.js` e `test_modules.js` apontavam para
  linhas/seções de `test_engine.js`/`test_ui.js`, que desde a R3 são só runners. Agora citam o
  arquivo de área (`tests/engine/50_dados_validacao.js` §32/§34, `tests/ui/50_backup_gravacao.js`
  seção `UI 12i`, etc.). `DIAGNOSTICO.md` ganhou cabeçalho de **documento histórico** (retrato da
  Etapa 0, `ffee7c2`/`v25`, com notas até `3a6c2e9`/`v32`).

### CI E TESTES
- **`scripts/check-docs-paths.js` (`npm run check:docs`):** reprova ponteiro com número de linha
  ou seção apontando para os runners finos e menção a `tests/<área>/*.js` inexistente. Roda no
  job "Testes (motor + UI)".
- `sw.js` sobe para `v36` (comentários em `js/datas.js` e `js/assistente.js` mudaram).
- **Validação em navegador real na CI (I3):** job novo `navegador` ("Validação em navegador real
  (não bloqueia)", `continue-on-error`) roda `scripts/validacao-navegador.js` com o Chrome da imagem
  do runner (`DIARIO_CHROME_PATH`) e o driver instalado com `npm i --no-save playwright-core` — sem
  tocar no `package.json`/`package-lock.json` (o job confere com `git diff --exit-code`). O script
  agora: prefere o Chrome do sistema (`DIARIO_CHROME_PATH`/`DIARIO_CHROME_CHANNEL`) ao
  `@sparticuz/chromium` (que passou a ser ESM e quebrava o script); **sai com sucesso** e mensagem
  clara quando faltam driver/navegador ("validação em navegador pulada", `::warning::` na CI;
  `DIARIO_EXIGIR_NAVEGADOR=1` exige); lê o `VERSION` do `sw.js` (antes fixo em v35→v36, quebraria a
  cada versão) e o número de módulos de `js/`; grava o relatório em `DIARIO_REPORT`; e ganhou 7
  checagens (➕ Novo exercício, aviso persistente com download real, falhas de rede separadas entre
  "rede ligada", "CORE offline" e a lacuna conhecida de imagens fora do CORE). Na CI o resultado
  vira anotação na PR (primeira execução: 37/37 com o Google Chrome 155 do runner). Nada disso
  entra no `npm test` nem no artefato do Pages.
- **Piso de checagens da UI** sobe de 326 para 353 (`tests/ui/99_fechamento.js`): apagar um
  dos blocos novos (`UI 12j`, `UI 13b`) reprova a suíte em vez de reduzir a cobertura em silêncio.
- `VERSION` do `sw.js` subiu um passo a cada item que mexeu em `js/**` (v36 I4, v37 I2, v38 I5,
  v39 I1): o PR inteiro vai de `v35` para `v39`.

## [Não lançado] — correções da auditoria (branch `arena/35b569b7-diario`)

### CORRIGIDO
- **Service Worker com erro de sintaxe:** faltava vírgula entre as entradas de conquistas
  no array `CORE` do `sw.js` (`SyntaxError: Unexpected string`). O app offline não
  não compilava, então nenhum cache offline novo era instalado. `VERSION` sobe para `v33`.
- **Restauração de backup:** os treinos salvos do arquivo não eram atribuídos (a
  normalização rodava sobre a lista atual). Agora são restaurados e normalizados.
- **Backup inválido** não altera mais nenhum dado; falhas na aplicação restauram o estado anterior.
- **Exercícios personalizados** entram no backup (formato 6) e são restaurados com índices
  de busca reconstruídos; reimportar não duplica.
- **CSV:** campos com `;`, aspas e quebras de linha são serializados corretamente; séries
  individualizadas (drop-set) e reps decimais são preservadas; cardio sai na aba `Cardio`
  (antes era descartado); importação valida tudo antes de gravar; reimportar o mesmo
  arquivo não duplica (ver `docs/FORMATO_CSV.md`).
- **Gravação falha de forma observável:** `safeStorage.set` devolve `false` e avisa o usuário
  (um aviso por sequência de falhas).
- **Recuperação:** registro com data inválida (ou inexistente, como 31/02) não gera mais "100% pronto".
- **Service Worker:** `test_ui.js` sem jsdom agora falha em vez de aprovar.

### ALTERADO
- Rótulos do mapa de recuperação: "100% PRONTO" → "PRONTO (ESTIMADO)", "EXAUSTO" → "FADIGA ALTA",
  "RECUPERANDO" → "EM RECUPERAÇÃO", "Lombar 100% — livre" → "Lombar sem alerta estimado".
  A explicação agora diz que os percentuais são heurísticas de planejamento.
- Formato CSV 2 (colunas novas no fim da aba `Log`; abas `Cardio` e `Formato`). Arquivos antigos continuam importáveis.
- Formato de backup 6 (`customExercises`).

### CI
- `node --check sw.js` e `npm run check:sw-core` antes dos testes.
- `scripts/check-sw.js`: sintaxe, CORE existente, sem duplicados; roda no repositório e no artefato do Pages.
- Novo job `pages-artefato` valida o mesmo `_site` que o Pages publica (`scripts/build-site.sh`).
- `test_sw.js`: instalação, falha de cache observável, ativação, estratégia offline e regra de versão.

## [Não lançado] — refatorações da auditoria (branch `arena/f549f63d-diario`)

### NOVO
- **`js/datas.js` — regra única de data (R1):** `dataISOValida`, `isoDataValida` e
  `dataDeRegistroValida` passam a viver num só módulo, importado por `js/app.js`,
  `js/historico.js` e `js/planilha_data.js`. Um teste varre `js/` e falha se a regra
  voltar a ser duplicada; 43 vetores sintéticos confirmam que a regra do app e a do
  registro continuam equivalentes (mesma decisão para 2026-02-31, 2028-02-29, vazio, etc.).
- **Testes por área (R3):** `test_engine.js` e `test_ui.js` viraram runners finos; os
  trechos vivem em `tests/engine/*.js` e `tests/ui/*.js`, na ordem do nome (síncronos um a
  um, assíncronos num único wrapper — o mesmo escopo de antes). O texto das checagens é
  idêntico ao do arquivo único. Cada runner valida o manifesto das áreas e exige um piso
  de checagens, então apagar/renomear/esvaziar um trecho falha em vez de reduzir cobertura
  em silêncio.

- **`js/app.js` dividido em módulos (R2):** o núcleo tinha ~4.770 linhas. Saíram
  para arquivos próprios, carregados pelo entry na ordem do grafo:
  `js/persistencia.js` (gravação do estado: logs, treinos, ajustes, jogo, Story Card),
  `js/backup.js` (validação do backup JSON, montagem do pacote, parser de CSV),
  `js/cartoes.js` (Story Card e Card do Chefão: canvas, arte temática, emblemas),
  `js/calculadoras.js` (aba Cálculos, recordes e medalhas) e `js/sessao.js`
  (treino ao vivo, cronômetro de descanso, bi-sets e efeitos do boss). `js/app.js`
  ficou com 3.283 linhas (estado, sessão e UI de núcleo) e passa a importar essas
  funções — de 4.768 no começo (‑31%). Nenhuma linha de lógica foi reescrita: os corpos das 67 declarações movidas foram
  comparados e são byte a byte iguais aos originais, e nenhuma função movida
  reatribui estado do app (estado continua sendo escrito por quem o possui).
  `sw.js` sobe para `v35` e inclui os novos módulos no CORE.

### ALTERADO
- **`PR` no CSV é informativa (R4):** a coluna continua sendo exportada (agora como
  `PR (informativo)`) e a importação **ignora** o valor do arquivo — quem decide PR
  continua sendo a regra do app, e o XP não muda por causa da planilha. O documento
  `docs/FORMATO_CSV.md` explica a decisão.
- **Data futura no mapa de recuperação (P2):** documentado (não é bug) — registro com
  data no futuro conta como **hoje** para recuperação e fadiga. A regra está em
  `docs/RECUPERACAO.md` e na explicação do mapa no `index.html`, com teste de regressão.

### DOCUMENTADO / VALIDADO
- **`docs/VALIDACAO_MANUAL.md`:** checklist de instalação, primeira carga offline,
  atualização de versão, uso no celular e backup/restauração — com o que já foi
  validado automaticamente em Chromium headless (30 checagens: boot em ES modules,
  Service Worker + offline, IndexedDB, download real do backup, atualização v35→v36
  apagando o cache antigo, 8 abas sem estouro em 412 px) e o que continua exigindo
  validação manual (prompt de instalação, rede real, toque/galeria, cota cheia).

### CORRIGIDO
- **Falha de gravação no IndexedDB (P3):** antes, um `put` recusado (cota, aba anônima,
  transação abortada) era silencioso — e o app ainda podia dizer "Retrato do chefão
  atualizado!". Agora a gravação de imagem passa por `saveBlobChecked`, que só confirma
  quando o IndexedDB confirma; sem confirmação o usuário vê "não confirmou o salvamento"
  (um aviso por sequência de falhas, rearmado após um sucesso), a imagem legada em dataURL
  é preservada e a importação de backup não anuncia "sucesso" quando alguma imagem não foi
  gravada.

## [2.1.0] — 2026-10-15

### NOVO
- **ES modules nativos:** os 10 scripts viraram módulos (`<script type="module">`,
  sem bundler); handlers inline saíram em favor da delegação central
  (`js/actions.js`); CI linka e avalia o grafo de módulos a cada push.
- **Armazenamento durável (IndexedDB):** nova camada única em `js/storage.js`;
  migração automática do localStorage com validação e cópia antiga preservada;
  recuperação automática se o navegador limpar o localStorage.
- **Imagens como Blob:** retratos de chefões e fundo do Story Card deixam de
  ser base64 no localStorage (máx. ~1080 px, WebP/JPEG comprimido).
- **Backup melhorado:** exportação com um toque via File System Access API
  (quando o navegador tem), imagens incluídas no backup e restauração de ponta
  a ponta coberta por teste.
- **Painel "Armazenamento" em Config:** estado de persistência e uso/quota.
- **Usabilidade na academia:** botões de treino com alvo mínimo de 44×44 px
  (descanso, ✔ Registrar, navegação, ▲▼), textos ≥ 12 px na aba Treino,
  labels associados aos inputs e aria-label nos botões só com emoji.
- **Aba Hoje reordenada:** sessão ativa e registro rápido primeiro; mapa de
  prontidão e cardio recolhidos por padrão.

### CORRIGIDO
- "Fadiga real"/"Prontidão real" → **"Prontidão estimada"**, com aviso visível
  de que é estimativa (tempo desde o último treino + volume semanal).
- Alerta de Lombar com aviso de estimativa e "não substitui orientação
  profissional"; horas de recuperação apresentadas como aproximação.
- Importação de backup não restaurava os treinos salvos.
- Janelas de recuperação e faixas de séries centralizadas em
  `RECOVERY_CONSTANTS` (js/catalogo.js).

### REMOVIDO
- `planilha_diario.csv` (dados reais) saiu do repositório; entrou
  `planilha_diario.exemplo.csv` com dados fictícios.

## [2.0.0] e anteriores
Veja o histórico no README e nos commits do repositório.
