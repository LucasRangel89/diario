# Formato CSV e backup JSON — Diário de Cargas

Este documento descreve o que o CSV (planilha) e o backup JSON carregam, o que é
importável, o que é calculado, e como os registros são identificados para não
duplicar dados em importações repetidas.

## 1. CSV (planilha multi-aba, separador `;`)

Versão do formato exportado: **3** (aba `Formato`). Arquivos sem a aba `Formato` são o
**formato 1**; CSV com `Versão do formato;2` continua importável. Os formatos 1 e 2 são
legados compatíveis; o atual é o 3.

| Aba | Conteúdo | Importável? |
|---|---|---|
| `Log` | Um registro de musculação por linha (22 colunas do formato 1 + 6 do formato 2) | **Sim** |
| `Cardio` | Corrida e cardio (distância, duração, modalidade; no formato 3 também tipo, RPE, FC média e tênis) — fora do volume | **Sim** |
| `Peso corporal` | Pesagens (data, peso, observação) | **Sim** |
| `Semana a semana` | Início da semana 1 (linha `Início da semana 1…`) | **Sim** (só a data) |
| `Formato` | `Versão do formato;3` (exportação atual) | Lida (valida as versões 1, 2 e 3) |
| `Catálogo` | Catálogo principal + exercícios personalizados (referência) | Não (informativa) |
| `Progresso` | Resumo por exercício | Não (calculada) |
| `Semana a semana` (demais linhas) | Volume e carga máxima por semana | Não (calculada) |

### Colunas da aba `Log`

- **Importáveis:** `Data`, `Sessão`, `Exercício`, `Carga registrada (kg)`, `S1`–`S5`,
  `RIR`, `Conferir?`, `Observações` (com quebras de linha) e, no formato 2:
  `ID do registro`, `Tipo de exercício`, `Grupo do registro`, `Técnica`,
  `Meta da próxima sessão`, `Séries (JSON)`.
- **Séries (JSON):** `{"modo":"sets"|"simples","series":[{"weight":…,"reps":…}]}`.
  É a fonte **completa** das séries: drop-sets com cargas diferentes, reps decimais
  (isometria em segundos) e qualquer quantidade de séries. Quando a coluna existe e
  está preenchida, ela prevalece sobre `S1`–`S5`.
- **Calculadas (ignoradas na importação; o app recalcula):** `Unidade`, `Fator`,
  `Lados`, `Carga efetiva (kg)`, `Total reps (ou segundos)`, `Volume (kg)`,
  `Melhor série`, `Menor série`, `1RM Epley (kg)`, `Métrica de progresso`.
- **Informativa (não decide PR, XP nem gamificação na importação):** `PR (informativo)`
  — última coluna da aba `Log`, com `Sim`/`Não` conforme o app marcou o recorde. Na
  importação o valor é **ignorado**: os registros entram com `isPR = false` e o PR
  volta a ser decidido pelo app (`detectAutoPR`, no momento de registrar) ou pelo flag
  manual do formulário. Motivo: PR multiplica o dano no chefão por 2, soma `XP_PR` e
  cumpre missão semanal — aceitar `PR = Sim` de um arquivo daria XP e gamificação sem
  treino. A coluna é exportada para leitura humana na planilha; versões anteriores do
  app simplesmente ignoram a coluna (a aba `Log` preserva as colunas do formato 2; a versão global atual é 3).
- **Perfis de exercício (v1):** não há coluna nova. `Grupo do registro` continua sendo
  o grupo legado do log, e a importação de um exercício conhecido usa o grupo do
  catálogo (comportamento preexistente). A base `js/perfil_exercicios.js` é somente
  leitura e não é importada nem exportada; uma exportação futura de perfis exigirá
  versão nova de formato, mantendo os arquivos 1–3 importáveis. Ver
  `docs/TAXONOMIA_EXERCICIOS.md`.

### Colunas da aba `Cardio` (formato 3)

Ordem exportada: `Data`, `Modalidade`, `Distância (km)`, `Duração (min)`,
`Observações`, `ID do registro`, `Tipo de corrida`, `RPE`, `FC média (bpm)`, `Tênis`.
Os quatro campos D6 são opcionais e ficam no fim da aba. Formatos 1 e 2, que não
trazem essas colunas, continuam importáveis; os campos ausentes ficam ausentes no log.
`RPE` aceita inteiro de 1 a 10, `FC média` deve ser maior que zero e `Tipo de corrida`
precisa estar na lista suportada.

A aba **Corridas** do app filtra somente Corrida (Rua) e Corrida (Esteira); isso não
muda o esquema nem a aba `Cardio` do CSV, que continua transportando também bike,
elíptico e remo. O filtro é de apresentação, não de importação/exportação.

### Regras de escrita

- Campos com `;`, `"` ou quebra de linha vão entre aspas; aspas internas são dobradas (`""`).
- Acentos e Unicode são gravados como estão (UTF-8, com BOM ao exportar).
- Números usam ponto decimal na exportação; a importação aceita vírgula decimal.
- Datas são `dd/mm/aaaa` (importação também aceita `aaaa-mm-dd`). Datas inexistentes (ex.: 31/02) são rejeitadas.

### Regras de leitura (validação)

A importação **não grava nada se houver qualquer problema**. O usuário recebe a lista
de erros com a aba e o número do registro. Problemas verificados:

- cabeçalho sem as colunas obrigatórias (`Data`, `Exercício`, `Carga registrada (kg)`);
- linha com mais colunas que o cabeçalho (geralmente `;` sem aspas);
- data inválida ou inexistente; carga não numérica; repetição não numérica ou ≤ 0;
  RIR negativo; `Séries (JSON)` malformado;
- cardio sem distância nem duração; peso corporal ≤ 0;
- versão de formato superior à suportada.

Linhas totalmente vazias são ignoradas. Campos vazios opcionais (sessão, RIR,
observações) voltam vazios/nulos, nunca viram zero.

## 2. Identidade e deduplicação

Cada registro exportado tem um **ID do registro** (`L` + id local). Ao importar:

1. **Registro com ID:** o ID é a identidade.
   - ID conhecido e **conteúdo igual** → *já existente* (ignorado).
   - ID conhecido e **conteúdo diferente** → *conflito*: o registro do app é mantido e o
     conflito é informado. Nada é sobrescrito em silêncio.
   - ID novo → importado (recebe um id local novo, e o ID externo fica guardado).
2. **Registro sem ID** (formato 1, ou planilha feita à mão): a identidade é o **conteúdo**
   (data, exercício, sessão, cargas, reps, séries, RIR, observações…). Como dois treinos
   idênticos podem ser legítimos, conta-se a **ocorrência**: se o arquivo traz dois
   idênticos e o app já tem dois, nenhum é importado; se o app tem um, importa-se o outro.

Consequência: reimportar o mesmo arquivo não duplica nada, e dois treinos iguais
registrados de propósito continuam sendo dois.

**Corrida:** a impressão digital usa modalidade, data, distância, duração e observações;
campos de musculação nunca participam. Os campos adicionais de corrida (tipo, RPE, FC média
e tênis) também são metadados, não identidade: omiti-los da impressão digital permite que um
CSV formato 2 antigo reimportado em uma versão nova seja reconhecido como igual, sem conflito
falso nem duplicata. (Formato 3 os transporta como colunas, mas a versão do formato não muda
a identidade do registro.)

A coluna `PR (informativo)` **não entra** na identidade do registro: dois treinos com o
mesmo conteúdo continuam sendo o mesmo registro, com ou sem PR.

Limitação conhecida: o ID é local ao aparelho. Dois aparelhos que gerarem o mesmo ID
para registros diferentes produzirão um *conflito* (informado, não sobrescrito).

Peso corporal: uma pesagem por data (como antes). Se a data já tem pesagem com valor
diferente, a pesagem é **substituída** e a substituição é contada na mensagem.

## 3. Backup JSON

Versão do formato: **6**. Acrescenta `customExercises` (exercícios personalizados completos).

| Campo | Restauração |
|---|---|
| `logs` (histórico, inclusive de exercícios personalizados) | Substitui o histórico. Obrigatório. |
| `savedWorkouts` (treinos salvos) | Substitui. Se **ausente** (backups antigos), mantém os atuais. |
| `customExercises` | Substitui a lista. Se **ausente** (formato ≤ 5), mantém os atuais. |
| `settings` (configurações, semana 1) | Mescla sobre as atuais. |
| `userBodyweight` | Substitui. |
| `sharedGameState` / `deloadWeeks`, `tests`, `weightLog` | Substitui (formato antigo: campos no topo). |
| `themeGameSaves` (progresso, temporadas, retratos por tema) | Substitui; backups antigos migram o progresso para o tema exportado. |
| `portraitImages`, `storyBgImageData` | Gravados como Blob no IndexedDB. |

Regras:

- **Validação antes de qualquer alteração.** Estrutura, datas, tipos, cargas, séries,
  `savedWorkouts`, `customExercises`, `weightLog` e `userBodyweight` são verificados. Um
  problema rejeita o backup inteiro e informa o motivo; nada é alterado.
- Campos opcionais de corrida (`runType`, `rpe`, `hrAvg`, `shoe`) viajam no próprio objeto
  de `logs`; o formato JSON permanece **6**. Se presentes, `runType` deve ser um dos valores
  aceitos, `rpe` inteiro 1–10, `hrAvg` número > 0 e `shoe` texto. Tipo inválido rejeita o
  backup inteiro antes de alterar estado. `distanceKm` e `durationMin` mantêm a política de
  validação preexistente: não foram endurecidos nesta versão.
- **Aplicação tudo-ou-nada na memória.** Se algo lançar exceção no meio da aplicação, o
  estado anterior é restaurado.
- **Falha de gravação é informada.** Se o navegador recusar a gravação, o app mantém os
  dados na tela mas avisa que o salvamento não foi confirmado, e não exibe "sucesso".
- **Exercícios personalizados (regras de conflito, determinísticas):**
  - nome igual ao de um exercício do **catálogo principal** → não importado e informado (o catálogo nunca muda);
  - nome repetido **dentro do arquivo** (sem diferenciar maiúsculas) → vale a primeira ocorrência;
  - tipo de carga desconhecido ou fator/lados/descanso/faixa inválidos → erro (rejeita o backup).
- Registros históricos de um exercício personalizado **não são apagados** quando a definição é excluída.
- **Perfis de exercício (v1):** o formato continua **6** e nenhum campo de perfil é
  gravado em `logs`, `savedWorkouts` ou no topo do arquivo. `logs[].muscle` preserva o
  grupo legado (com os aliases históricos `Pescoço` → `Ombros` e `Glúteos` →
  `Posterior` já aplicados na carga). A base descrita em `docs/TAXONOMIA_EXERCICIOS.md`
  não altera a restauração e não reclassifica dados antigos.

## 4. Limitações

- A imagem de fundo e os retratos dependem do IndexedDB. O **caminho de falha** é coberto por teste de UI
  com IndexedDB simulado que recusa a gravação (`tests/ui/50_backup_gravacao.js`, seção
  `UI 12i. Falha de gravação no IndexedDB (imagens e fundo) é observável` — checks de `saveBlobChecked`:
  erro no `put`, transação abortada, aviso único por sequência, rearme após sucesso e mensagem de
  importação sem "sucesso"; a seção `UI 12j` cobre o aviso persistente com o botão de exportar backup).
  O comportamento num navegador real (cota, aba anônima, troca de aparelho) segue dependendo de
  validação manual — checklist em `docs/VALIDACAO_MANUAL.md`.
- `deloadRestDays` é um campo derivado (recalculado a partir dos registros e da data de hoje); não é comparado como dado de origem.
