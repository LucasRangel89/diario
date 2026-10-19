# Análise crítica — tema `office` existente × proposta “The Office (EUA)”

Sessão `arena/a088cf10-diario` · 19/10/2026 · base `7a6b218` + lote 1/2 dos novos temas.

Escopo: comparar o tema **já cadastrado** no app (`office`, PR #32, 24 artes em uso) com a proposta trazida no pedido (10 patentes corporativas, 10 chefões-personagem, dano = Vendas, crítico = Negócio Fechado) e indicar possibilidades. **Nada foi alterado no app**: este documento é decisão editorial.

## 1. O que já existe (`js/gamificacao.js` → `THEMES.office`)

| Dimensão | Estado atual |
|---|---|
| Nome / id | **The Office** · `office` |
| Arena | Filial de Scranton |
| Rótulo de chefão | **“Desafio do expediente”** |
| Estágio | EXPEDIENTE |
| Missão | “Tarefa do expediente” |
| Moldura do card | `caderno` |
| Patentes (10) | Recém-contratado → Assistente Administrativo → Representante de Vendas → Vendedor do Mês → Supervisor da Filial → Assistente do Gerente Regional → Assistente Gerente Regional → Gerente Regional → Diretor do Corporativo → **Lenda de Scranton** |
| Chefões (12) | **Situações**, não pessoas: Impressora em pane, Reunião que poderia ser um e-mail, Grampeador na gelatina, Inventário do depósito, Guerra das vendas, Comitê de festas, Olimpíadas do escritório, Simulado de incêndio do Dwight, Visita do corporativo, Crise da marca-d’água, Premiação dos Dundies, Último expediente |
| Fraquezas | Mapeadas nos 10 grupos reais do app, com justificativa por peça |
| Arte | 12 retratos de **cena** (mesa, sala, depósito), 10 patentes em medalhão **dourado/marinho**, 1 selo (resma com beterraba e caneca), 1 fundo de card (escritório ao anoitecer) |

Duas decisões editoriais explícitas no tema atual: **sem vilões e sem violência** (situações viram desafios) e **carreira na filial**, com “Lenda de Scranton” como topo em vez de “Proprietário”.

## 2. O que a proposta pede

| Dimensão | Proposta |
|---|---|
| Patentes | Estagiário → Temporário → Recepcionista → Vendedor → Func. do Mês → Assist. Gerente → Chefe de Setor → Gerente Regional → Vice-Presidente → **Proprietário** |
| Chefões | **Pessoas**: Toby, Gabe, Todd Packer, Angela, Dwight, Jan, Robert California, Jo Bennett + situações (Simulação de Incêndio, Reunião sem Pauta) |
| Vocabulário | dano = **Vendas** · crítico = **Negócio Fechado** · conquistas = **Prêmios Dundie** · deload = **Festa do Comitê** · missão = **Meta Semanal** · temporada = **Trimestre Fiscal** |
| Visual | Bege/cinza, azul Dunder Mifflin, luz fluorescente esverdeada; o card “parece um memorando” |

## 3. Comparação ponto a ponto

| Ponto | Atual | Proposta | Diagnóstico |
|---|---|---|---|
| **Vilões** | Situações impessoais | Funcionários reais como chefões | **Conflito de tom.** Transformar colegas em “vilões” contradiz a decisão registrada do tema (sem vilões). Além disso são **8 pessoas para 12 vagas** — faltariam 4. |
| **Patentes** | Carreira na filial, topo “Lenda de Scranton” | Escada corporativa, topo “Proprietário” | Ambas funcionam. A troca é **só de rótulo** (patente = nível de XP global), não remapeia progresso salvo. Mas “Proprietário” fecha a escada e mata a piada; “Lenda de Scranton” é mais temática. |
| **Dano = Vendas** | “dano” genérico da UI | Vocabulário novo | **Ganho real de sabor** e baixo custo: é rótulo, não mecânica. O motor não tem campo de “dano” por tema hoje. |
| **Crítico = Negócio Fechado** | não tem rótulo por tema | idem | Mesmo caso: ganho de sabor, custo de UI. |
| **Conquistas = Dundies** | badges globais (16) | nome temático | Hoje conquistas são **globais**, não por tema. Só vira nome se as badges ganharem rótulo temático — mudança maior, não necessária agora. |
| **Deload = Festa do Comitê** | deload genérico | nome temático | Barato e divertido; mesmo caso de rótulo. |
| **Missão = Meta Semanal** | “Tarefa do expediente” | “Meta Semanal” | **Equivalente**; “Meta” casa melhor com “Vendas”. |
| **Temporada = Trimestre Fiscal** | 12 semanas | 12 semanas | **Encaixe perfeito**, zero mecânica nova. |
| **Card memorando** | fundo ilustrado + moldura `caderno` | estética de memorando | Já existe moldura `caderno`; falta só um tratamento de papel/pauta, não um tema novo. |
| **Arte** | Medalhões dourado/marinho + cenas | (não definida na proposta) | O selo novo do lote 1 (resma bege com faixa azul) é de **outra família** que os medalhões atuais. Se for upgrade, precisa harmonizar ou virar “identidade alternativa”. |

## 4. Possibilidades (com custo)

**A. Upgrade no lugar (recomendada).** Mantém `office`, as 24 artes e a lógica “sem vilões”. Adota o vocabulário da proposta (Vendas, Negócio Fechado, Meta Semanal, Trimestre Fiscal, Festa do Comitê) e, se você quiser personagens, converte **6 das 12 situações** em “situações com personagem” — por exemplo *Avaliação com a Angela*, *Inspeção do Dwight*, *Reunião com o Toby* — mantendo o enquadramento de desafio, não de vilão. Custo: 1 sessão de implementação + 6 retratos novos. Riscos: quase nenhum; nenhum progresso salvo é remapeado.

**B. Tema separado `office-us` (“Segundo Turno”).** Cadastra a escada corporativa e os personagens como um segundo tema. Custo: +24 artes e um tema duplicado na galeria, dividindo o XP do usuário entre duas versões da mesma série. **Não recomendo**: duplica franquia sem ganho de jogo.

**C. Substituição completa.** Troca os 12 desafios pelos personagens (completando com 4 situações) e renomeia todas as patentes. Custo: 12 retratos novos + risco de perder a decisão “sem vilões”. É a proposta original crua; só vale se o tom atual não te agradar.

**D. Só vocabulário (mínimo).** Nenhuma arte nova; aplica apenas os rótulos e o tratamento de memorando no card. Custo: 1 sessão curta, sem geração de imagem. É o melhor **custo-benefício** se o objetivo é só “sentir” a proposta.

**Recomendação:** **A**, com o vocabulário de **D** aplicado primeiro. O selo do lote 1 vira a identidade “memorando” do card; os medalhões atuais continuam nas patentes. Se em algum momento você quiser os personagens, o caminho é A com 6 retratos novos, nunca B.

## 5. Se A for aprovada — lista fechada (12 desafios)

| # | Desafio | Fraqueza | Personagem? |
|---:|---|---|---|
| 1 | Impressora em pane | Antebraço | não (mantido) |
| 2 | Reunião que poderia ser um e-mail | Core | não (mantido) |
| 3 | Grampeador na gelatina | Antebraço | não (mantido) |
| 4 | **Avaliação com a Angela** | Costas | sim (novo) |
| 5 | **Inspeção do Dwight** | Ombros | sim (novo) |
| 6 | **Reunião com o Toby** | Peito | sim (novo) |
| 7 | Olimpíadas do escritório | Pernas | não (mantido) |
| 8 | **Visita da Jan** | Abdômen | sim (novo) |
| 9 | **Discurso do Robert California** | Core | sim (novo) |
| 10 | **Aperto de mão da Jo Bennett** | Ombros | sim (novo) |
| 11 | Premiação dos Dundies | Bíceps | não (mantido) |
| 12 | Último expediente | Costas | não (mantido) |

Custo de arte de A: **6 retratos** (Angela, Dwight, Toby, Jan, Robert California, Jo Bennett) em vez de 12.

## 6. O que este documento não decide

Nada aqui foi implementado. `THEMES.office`, os 24 arquivos em uso, o vocabulário da UI e o `sw.js` seguem como estavam (exceto o bump de versão do lote 2, por causa de imagens novas em `images/**`). A escolha A/B/C/D fica com você; a opção escolhida entra no lote de implementação final.
