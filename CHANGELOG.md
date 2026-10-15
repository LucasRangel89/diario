# Changelog — Diário de Cargas // Berzerker Mode

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

## [Não lançado] — manutenção pós-PR #16 (branch `arena/ffba3b1d-diario`)

### DOCUMENTADO
- **Ponteiros de teste atualizados (I4):** `docs/FORMATO_CSV.md`, `docs/RECUPERACAO.md`,
  `DIAGNOSTICO.md`, `js/datas.js`, `js/assistente.js` e `test_modules.js` apontavam para
  linhas/seções de `test_engine.js`/`test_ui.js`, que desde a R3 são só runners. Agora citam o
  arquivo de área (`tests/engine/50_dados_validacao.js` §32/§34, `tests/ui/50_backup_gravacao.js`
  seção `UI 12i`, etc.). `DIAGNOSTICO.md` ganhou cabeçalho de **documento histórico** (retrato da
  Etapa 0, `ffee7c2`/`v25`, com notas até `3a6c2e9`/`v32`).

### CI
- **`scripts/check-docs-paths.js` (`npm run check:docs`):** reprova ponteiro com número de linha
  ou seção apontando para os runners finos e menção a `tests/<área>/*.js` inexistente. Roda no
  job "Testes (motor + UI)".
- `sw.js` sobe para `v36` (comentários em `js/datas.js` e `js/assistente.js` mudaram).

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
