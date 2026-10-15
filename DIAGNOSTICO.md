> **Documento histórico.** Retrato do estado na Etapa 0 (commit `ffee7c2`, `sw.js` em `v25`),
> com as notas de progresso da migração para ES modules acrescentadas até o commit `3a6c2e9`
> (etapa 5.1, sub-etapa 4, `sw.js` em `v32`). Números de linha, versões e bloqueios abaixo
> descrevem aquele momento — vários já foram resolvidos (migração ESM concluída, setters criados,
> `regiaoLombarState` exportada e testada, suíte dividida em `tests/engine/*` e `tests/ui/*`,
> `js/app.js` repartido em módulos). Ver `CHANGELOG.md` para o que mudou depois. Só os ponteiros
> para arquivos de teste foram atualizados para os caminhos atuais.

# Diagnóstico — Diário de Cargas // Berzerker Mode

Gerado na Etapa 0 (sem alterações de código). Referências no formato `arquivo:linha`.

## a) Chaves do localStorage, tamanhos típicos e base64

Chaves (todas em `js/app.js`, bloco de constantes `STORAGE_KEY_*`, linhas 47–56):
- `berzerker_diario_cargas_logs_v2` (logs) — array de registros de treino; cresce com o uso (estimativa: dezenas a centenas de KB; cada log com séries/reps).
- `berzerker_saved_workouts_v1` (treinos salvos) — dezenas de KB.
- `berzerker_game_saves_v2` (progresso de jogo por tema, incluindo `bossPortraits`) — pode conter retratos de chefões em base64 (`bossPortraits: { bossId: dataURL }`), risco alto de estourar ~5 MB. `js/app.js:476`.
- `berzerker_game_shared_v1` (deloadWeeks, tests, weightLog) — pequeno.
- `berzerker_story_v1` (foto de fundo do Story Card) — salva `bgImageData` como dataURL base64. `js/app.js:480`, `js/app.js:441`. Risco alto.
- `berzerker_settings_v1`, `berzerker_user_bodyweight`, `berzerker_seeded_v2`, `berzerker_game_theme_v1`, `berzerker_last_backup_at` — pequenos.
- `berzerker_custom_exercises_v1` (em `js/custom_exercises.js:9`) — pequeno.

`safeStorage` (`js/app.js:58–61`) é a única camada de acesso ao `window.localStorage`; não há camada para IndexedDB. Imagens de usuário (retratos de chefões e fundo do Story Card) são persistidas como base64 em localStorage (`js/app.js:476`, `js/app.js:480`), risco de estourar o limite de ~5 MB.

## b) Campo de versão de esquema

Não existe `schemaVersion` nos dados. A única "versão" é a do cache do service worker (`sw.js:7`, `VERSION = 'v25'`). Migrações são feitas por chaves com sufixo `_v1`/`_v2` e lógica ad-hoc (`loadGameProgressFromStorage`, `js/app.js:380`).

## c) Sinal "Progredir / Manter" e uso do RIR

`js/catalogo.js:477` `sinalProximaSessao(log)` → `duplaProgressao(log)` (`js/catalogo.js:464`): menor série da última sessão ≥ topo da faixa de reps → "⬆ Progredir", senão "➡ Manter e buscar reps". O RIR **não** é usado no sinal (não aparece em `duplaProgressao`). Convenção documentada no README (seção "Convenções de registro").

## d) Funções do assistente: cobertura de testes

Testadas (caminhos atuais) em `tests/engine/30_catalogo_busca.js` (§17 ordenação, §18 fadiga + séries semanais, §19 sugestão, lacunas e dias desde o último treino), com casos extras em `tests/engine/20_recuperacao_temas.js` (§12c, co-ativação) e `tests/engine/40_arte_jogo.js` (§26 e §28): `orderWorkoutExercises`, `weeklySetsByMuscle`, `fatigueState`, `suggestNextWorkout`, `weeklyGaps`, `diasDesdeUltimoTreino`. `regiaoLombarState` não era exportada nem testada neste retrato (hoje: `tests/engine/40_arte_jogo.js`, §3.5). UI testada em `tests/ui/30_assistente_sessao.js` (seção `UI 10`: mapa de prontidão, lombar). Não havia teste automatizado de `regiaoLombarState` no motor nem de persistência/migração.

## e) Estratégia de cache do sw.js e versão

`sw.js`: `VERSION = 'v25'`, cache `berzerker-v25`. CORE pré-cacheado no install; estratégia rede-primeiro para origem própria, cache-primeiro para externos. Ativação apaga caches antigos. Versão atualizada manualmente; CI (`scripts/check-sw-version.js`) exige bump quando `js/**` ou `images/**` mudam.

## f) .github/workflows

- `ci.yml`: roda `npm ci` e `npm test` em push/PR para `main`; job `cache-offline` verifica bump do VERSION do sw.js.
- `pages.yml`: build estático (copia arquivos) e deploy no GitHub Pages.
- Falta: `npm run build:css` e `npm run check:sw` no CI (5.2).

## Proposta RIR (Etapa 3.4) — NÃO implementada

Restrição 3 proíbe alterar o sinal de progressão sem aprovação. Usar RIR para
mudar "⬆ Progredir" violaria a convenção documentada. Proposta (apenas se
aprovado pelo dono): manter o sinal atual como padrão; adicionar modo opcional
"progressão assistida por RIR" onde topo da faixa com RIR ≥ 3 sugere incremento
maior e RIR 0 sugere manter, sem alterar o cálculo base. Requer aprovação
explícita antes de implementar.

## Plano para a Etapa 5.1 (ES modules) — aguardando aprovação do dono

A migração para `<script type="module">` exige reescrever os 8 scripts de uma
vez: hoje os arquivos compartilham variáveis globais entre si (o motor de
volume, o catálogo e a UI trocam dezenas de símbolos sem import/export), os
testes dependem desse escopo compartilhado (`vm.runInContext` soma os arquivos)
e o sw.js pré-cacheia cada arquivo. Plano proposto em 4 sub-etapas, cada uma
com PR e testes próprios:

1. Introduzir imports/exports mantendo o carregamento clássico (ESM dual):
   arquivos passam a declarar exports e um bundle de compatibilidade os expõe
   no escopo global. Nada muda para o usuário.
2. Trocar para `<script type="module">` com um único entry point; testes
   passam a importar os módulos em vez de concatenar fontes.
3. Delegação de eventos: substituir `onclick="..."` inline por
   `addEventListener`/delegação, um arquivo por PR (app.js é o maior).
4. Revisar o CORE do sw.js (modules são cacheados igualmente, mas o entry
   point muda) e bumpar o VERSION.

Não foi implementada nesta rodada para não arriscar a estabilidade offline de
quem já usa (restrição 4) num golpe só.

### Progresso — sub-etapa 1 concluída

Cada um dos 9 arquivos declara agora um manifesto explícito de exports
(bloco `__diarioExports` no fim do arquivo) e há teste automatizado que
valida os símbolos críticos. Este manifesto é a fonte para gerar os
`import`/`export` da sub-etapa 2.

### Bloqueios mapeados para a sub-etapa 2 (descobertos na análise)

1. **jsdom não executa `<script type="module">`** — o smoke test de UI
   (`test_ui.js`, hoje o runner dos trechos em `tests/ui/*.js`) sobe o app
   inteiro com `runScripts: 'dangerously'`, que só roda scripts clássicos. A sub-etapa 2 exige reescrever o harness de
   testes (ex.: gerar bundle clássico em runtime tirando import/export, ou
   migrar para um runner com navegador de verdade).
2. **Escritas cross-file**: `planilha_data.js`, `historico.js`,
   `gamificacao.js` e `assistente.js` ATRIBUEM variáveis declaradas em
   `app.js` (`logs`, `weightLog`, `userBodyweight`, `savedWorkouts`,
   `deloadWeeks`, `missionsXpTotal`, `histVolChartInstance`). Em módulos ES,
   imports são somente leitura → essas ~13 atribuições precisam virar
   setters exportados pelo app.
3. **Monkey-patch entre arquivos**: `custom_exercises.js` SOBRESCREVE
   `allExercisesList()` do `catalogo.js` (o catálogo passa a enxergar
   exercícios customizados). Em módulos cada arquivo tem escopo próprio —
   esse override precisa virar injeção explícita, senão o catálogo volta a
   ignorar exercícios personalizados em silêncio.
4. **Handlers inline**: os `onclick="..."` (index.html + HTML gerado em
   app.js) resolvem funções pelo escopo global, que módulos não populam.
   A sub-etapa 3 (delegação de eventos) tem que vir ANTES da troca para
   `type="module"`, ou cada função referenciada precisa ser exposta em
   `window` temporariamente.

Ordem corrigida da migração: 1 (manifestos) → 3 (delegação de eventos) →
2 (módulos + setters + harness novo) → 4 (sw/cache).

### Progresso — sub-etapa 3 concluída (delegação de eventos)

- `js/actions.js`: despachante central (click/keydown/change/input/submit +
  error em captura), com `data-args` (JSON, token `$event`),
  `data-attr-args` e `data-value-attr`.
- index.html, app.js, busca.js, historico.js e custom_exercises.js estão
  100% sem handlers inline (guarda no motor: 0 ocorrências permitidas).
- 97 ações registradas pelos manifestos; teste garante que toda
  `data-*` declarada tem handler registrado.
- Teclado: Enter/Espaço dispara `data-action` em elementos não nativos
  (substituiu o onkeydown do grid de chefões com a11y equivalente).
- `overlay.onclick` programático (lightbox) permanece — não é atributo
  inline e funciona em módulos sem alteração.
- Restante para a sub-etapa 2 (módulos): reescrever o harness jsdom
  (não executa `type="module"`), converter as ~13 escritas cross-file em
  setters e tornar explícita a injeção do `allExercisesList` customizado.

### Progresso — sub-etapa 2 concluída (módulos de verdade)

- Os 10 arquivos são ES modules válidos; `index.html` carrega só o entry
  `<script type="module" src="js/app.js">`, que importa os demais na ordem
  actions → storage → catálogo → gamificação → assistente → planilha →
  histórico → busca → custom.
- Escritas cross-file viraram setters exportados pelo app
  (setLogs/setSavedWorkouts/setUserBodyweight/setWeightLog/
  setHistVolChartInstance) — 10 pontos convertidos.
- Ciclos resolvidos: catálogo↔custom_exercises via injeção
  (`setCustomExercisesRef`); fallbacks mortos de `typeof X !== 'function'`
  removidos (imports diretos).
- Harnesses (motor + UI) removem import/export e rodam o mesmo código
  concatenado; `scripts/check-modules.js` LINKA E AVALIA o grafo real em
  Node (`npm run check:modules`, no CI) — pega import quebrado, TDZ e
  violação de strict mode.
- `allExercisesList` segue mesclando exercícios customizados (a verificação
  de merge continua coberta pelos testes de busca).

### Progresso — sub-etapa 4 concluída (sw/cache)

- sw.js CORE pré-cacheia os 10 arquivos de js/ (teste novo impede que um
  módulo novo fique fora do cache offline) e o VERSION subiu a cada etapa
  (v32). O handler de fetch já cobre requisições de módulo (mesma origem,
  rede-primeiro com reserva em cache).
