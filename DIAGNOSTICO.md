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

Testadas em `test_engine.js` (linhas 332–489 e 590–671): `orderWorkoutExercises`, `weeklySetsByMuscle`, `fatigueState`, `suggestNextWorkout`, `weeklyGaps`, `diasDesdeUltimoTreino`. `regiaoLombarState` não é exportada nem testada. UI testada em `test_ui.js:518–547` (mapa de prontidão, lombar). Não há teste automatizado de `regiaoLombarState` no motor nem de persistência/migração.

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
