# Changelog — Diário de Cargas // Berzerker Mode

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

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
