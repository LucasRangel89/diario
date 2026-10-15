# Changelog — Diário de Cargas // Berzerker Mode

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

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
