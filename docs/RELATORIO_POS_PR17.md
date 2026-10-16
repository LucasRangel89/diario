# Relatório técnico — manutenção pós-PR #17 e registro de corridas

> As seções A1–B4 abaixo documentam a branch da PR #18 antes de seu merge; o
> resultado **B3 após o merge** e a nova base `main` estão na seção final deste arquivo.

## Base e método

- `git fetch origin` foi executado antes de qualquer edição.
- SHA medido: `origin/main = 90805e3e79130e4083757528c5740ce174040051` (sem commits posteriores).
- A medição de base foi feita sobre um arquivo extraído desse SHA com `git archive`, sem trocar de branch. Reproduções e testes usam somente registros sintéticos.
- Baseline `npm test`: motor **412**, UI **354**, módulos **13**, Service Worker **30** = **809 checagens aprovadas**, **0 reprovadas**. Pisos originais: motor 411 e UI 353.

## B0 — reprodução dos defeitos de corrida na base

Script: `scripts/repro-b0-corrida.js`; execução real:

```bash
mkdir -p /tmp/diario-main-base
git archive origin/main | tar -x -C /tmp/diario-main-base
node scripts/repro-b0-corrida.js /tmp/diario-main-base
```

Resultado no fixture sintético `Corrida (Rua)`, 10 km / 50 min, id `990001`:

1. **Lista do dia → Editar** e **Buscar → histórico → Editar** abrem o mesmo editor genérico: `type` = `carga_total`, reps vazio e nenhum campo de distância. Com reps = 1 e salvar, o registro continua `kind: corrida`, distância/tempo/`xpTheme` não mudam, mas recebe `type: carga_total`, `reps: [1]`, `weight: 0`, `mode: simple`, `perSide: false`, `rir: null`, `sessao: ""`, `conferir: false`, `sets: null` e `repsText: "1"`.
2. Exportar o CSV e planejar a reimportação do mesmo ID dá **0 iguais / 1 conflito / 0 novos**: o fingerprint compara campos de musculação mesmo para corrida.
3. O card diário mostra **🏆 PR (1RM auto)** numa corrida marcada sinteticamente `isPR: true`.
4. `detectAutoPR` compara as modalidades cardio juntas: bike de 20 km seguida de corrida de 10 km retorna `false` para PR. Isso permanece deliberado pelo D4; os recordes informativos da aba não alteram o jogo.
5. Nenhum teste existente de UI registra ou edita `kind: corrida` (busca literal na pasta `tests/ui`: 0 ocorrências).

## A1 — compatibilidade da CI

Versões consultadas em 2026-10-16 via `gh api repos/actions/<ação>/releases/latest`:

| Action | Release latest consultada |
|---|---|
| checkout | v7.0.1 |
| setup-node | v7.1.0 |
| upload-artifact | v7.0.2 |
| configure-pages | v6.0.0 |
| upload-pages-artifact | v5.0.0 |
| deploy-pages | v5.0.1 |

`ci.yml` e `pages.yml` foram atualizados para esses majors e Node 24, preservando `ubuntu-latest` e os nomes dos quatro checks obrigatórios. O CI também roda em pushes `arena/**`; o navegador real é bloqueante e exige Chrome. Na execução da branch em 2026-10-16, os cinco jobs passaram; o navegador reportou 37/37 com Chrome do sistema 155.0.8059.39 (run [38905951781](https://github.com/LucasRangel89/diario/actions/runs/38905951781)).

## Implementação e validação por item

| Item | Situação nesta branch | Commit |
|---|---|---|
| A1 | Actions atuais e workflows em Node 24; CI remoto aprovado, navegador 37/37 com Chrome do sistema | `927a9e6` + `3eba104` |
| A2 | Editar nos cards personalizados da Busca; fluxo criar → editar → salvar coberto | `ba0f451` |
| A3 | Exclusão usa `confirmModal`; Cancelar/Confirmar e ausência de `window.confirm` cobertos | `dca57d0` |
| A4 | Falha de localStorage usa aviso persistente com exportação JSON; rearme, dispensar e convivência com aviso de imagem cobertos | `cfdcde1` |
| B0 | Achados e script acima; sem mudança de comportamento | `793acdd` |
| B1 | `js/corridas.js` puro: parse/formatação de tempo, pace, filtro corrida, semanas ISO/mês/ano, recordes e km por tênis; teste de 25 casos sintéticos | `877e0dd` |
| B2 | Editor específico nos dois pontos de entrada, fórmulas/PR, limpeza de campos de musculação no save, migração e fingerprint corrida; D6 opcional no registro | `b2f6ff9` |
| B4 | Validação D6 em backup JSON v6 e CSV v3 aditivo; leitor v1/v2 compatível; testes sintéticos de round-trip/atomicidade | commit desta etapa |

## B4 — compatibilidade e validação dos campos D6

Os quatro campos opcionais permanecem no objeto de cada corrida sob `logs`; não foi criada
chave/coleção, e o backup JSON segue na versão 6. `validarBackupJSON` verifica somente os
campos presentes: `runType` pertence à enumeração da UI, `rpe` é inteiro 1–10, `hrAvg` é
numérico finito e positivo e `shoe` é texto. Backup inválido é rejeitado antes de mutar o
estado. O editor também interrompe o salvamento antes de alterar o log quando RPE/FC/tipo são
inválidos. As regras anteriores de `distanceKm` e `durationMin` não foram apertadas; fixtures
sintéticos v5 e v6 com valores legados atípicos continuam aceitos.

A exportação CSV agora declara formato 3; `Cardio` mantém as seis colunas anteriores e recebe
`Tipo de corrida`, `RPE`, `FC média (bpm)` e `Tênis` depois de `ID do registro`. A leitura de v1
e v2 continua ativa, metadados ausentes não geram erro, e a impressão digital continua
ignorando D6: reimportar arquivo antigo para log enriquecido conta como igual, não conflito.
`PR (informativo)` e as abas existentes permanecem. Cobertura sintética: `tests/engine/75_corridas_backup_csv.js` e `tests/ui/80_corridas_backup.js`; o teste de editor em `tests/ui/70_corridas_editor.js` também verifica que RPE 11 não grava nem altera o log.

### Reverts controlados B4

- **B4 / JSON:** retirei temporariamente as quatro validações D6 de `js/backup.js` e rodei `node test_engine.js`; falharam exatamente as quatro checagens de rejeição para `runType`, RPE, FC e tênis. A checagem de compatibilidade de valores antigos de `distanceKm`/`durationMin` continuou passando. Restaurei a validação; a suíte do motor passou.
- **B4 / editor:** retirei temporariamente a validação de RPE em `js/registro.js` e rodei `node test_ui.js`; falhou a checagem de RPE inválido não salvar/não alterar (o caminho subsequente também acusou overlay ausente e o piso falhou, por cascata). Restaurei; `node test_ui.js` passou com 381 checagens.
- **B4 / exportação CSV 3:** reverti temporariamente versão, cabeçalho e linha exportada para seis colunas; `node test_engine.js` falhou em quatro checagens (declaração/cabeçalho v3, round-trip D6 e rejeições de RPE/tipo). Restaurei; o teste do motor passou.
- **B4 / legado CSV 1/2:** alterei temporariamente o leitor para exigir só v3; `node test_engine.js` falhou em cinco checagens de compatibilidade, incluindo fixtures v1 e v2. Restaurei; o teste do motor passou.

### Gates locais após B4

- `npm ci && npm test`: **875 aprovações, 0 falhas** — motor 451, UI 381, módulos 13, SW 30. Pisos atuais: motor 450 e UI 380.
- `node --check sw.js && npm run check:sw-core`: passou; SW **v45**, 175 arquivos locais no CORE.
- `npm run check:modules`: passou (grafo de 20 módulos).
- `npm run check:docs`: passou (60 arquivos documentais/fontes/testes/scripts/workflows).
- `npm run build:css && git diff --exit-code -- vendor/tailwind.css`: passou; nenhum diff gerado em `vendor/tailwind.css`.
- `node scripts/check-sw-version.js origin/main`: passou, v39 → v45, 7 arquivos JS/ativos no diff.
- `npm ci` reportou 7 vulnerabilidades já presentes no lockfile (2 moderadas, 5 altas); dependências não foram atualizadas.
- CI remoto do push `3eba104` finalizou com sucesso nos cinco jobs: `Testes (motor + UI)`, `Artefato do GitHub Pages contém o CORE do Service Worker`, `vendor/tailwind.css atualizado`, `Versão do cache offline` e `Validação em navegador real`. Navegador: **37/37**, Chrome do sistema `/usr/bin/google-chrome`, versão `155.0.8059.39`; artefato e relatório disponíveis na [execução 38905951781](https://github.com/LucasRangel89/diario/actions/runs/38905951781).
- Nenhum PR foi aberto ou mesclado. O resultado é validação do gate de CI e do harness de navegador; não declara PWA/offline em geral nem uso em celular como validados.

### Reverts controlados A1–B2

- **A2:** removi temporariamente a atribuição de `dataset.editingId` e rodei `npm run test:ui`; o teste falhou em “Editar no card abre…” e “criar → editar → salvar…”. Restaurei a correção e a suíte passou.
- **A3:** reverti temporariamente `submitDeleteCustomEx` ao `confirm()` nativo; `npm run test:ui` falhou na checagem de abertura de `confirmModal`. Restaurei a correção e a suíte passou.
- **A4:** reverti temporariamente `notifyStorageFailure` a `alertModal`; `npm run test:ui` reprovou as checagens do aviso persistente, download e rearme para localStorage, enquanto as checagens do aviso I5 permaneceram aprovadas. Restaurei a correção e a suíte passou.
- **B1:** substituí temporariamente `formatRunPace` por retorno vazio; `npm run test:engine` falhou nos testes do arredondamento 4:55/km, pace do resumo semanal e recorde de pace. Restaurei a função e os testes passaram.
- **B2 / editor:** retirei temporariamente o desvio de `editLog` para o editor de corrida; `npm run test:ui` falhou no caminho do dia e no formulário específico. Restaurei e passou.
- **B2 / migração:** retirei temporariamente `type = 'corrida'` de `migrateLog`; o teste sintético de migração/idempotência falhou. Restaurei e passou.
- **B2 / CSV:** reverti temporariamente o ramo de fingerprint de corrida ao fingerprint genérico; o round-trip deixou de ser igual e o teste de fingerprint falhou. Restaurei e passou.

Resultados de referência após B2: `npm test` aprovado — motor **437**, UI **377**, módulos **13**, SW **30** = **857 aprovações**, 0 falhas; pisos motor 436 e UI 376. `npm run check:modules`, `npm run check:sw-core`, `npm run check:docs` e `node --check sw.js` também passaram com v44 e 175 arquivos locais no CORE.

## B3 — interface de Corridas após o merge da PR #18

### Base verificada, escopo e decisões

- Em 2026-10-16, **antes de editar**: `main`, `origin/main`, `HEAD` da branch
  `arena/7d08417f-diario` e `git ls-remote origin refs/heads/main` apontavam todos para
  `59456894359414d79c1e5197f75d25bea8a02602` (merge da PR #18); árvore limpa.
  Nenhuma troca de branch, edição de `main` ou uso de branch antiga. Baseline local
  `npm ci && npm test`: **875/875**, motor 451, UI 381, módulos 13 e SW 30.
- **D2 explicitado em `NAV_GROUPS`/`index.html`:** Treino (Hoje, Histórico, Buscar,
  Meus treinos), Jogo (Boss, Story Card), Você (Stats, Calcs), Config (Config).
  Corridas entra **no fim** de Treino; os quatro grupos continuam exatamente esses.
- **D3:** somente Corrida (Rua) e Corrida (Esteira) no painel e no editor iniciado
  nele; nomes legados de corrida/esteira recebem rótulo canônico **só na UI**. Bike,
  elíptico e remo seguem nos mesmos `logs`, no Histórico/CSV Cardio e no formulário
  de cardio de Hoje. **D4:** `detectAutoPR` permanece global para cardio (bike pode
  impedir o PR de uma corrida); recordes da aba são informativos e não alimentam jogo.
- Reutilizado o editor B2 para criar/editar (tempo `h:mm:ss`, pace ao alterar tempo
  **ou** distância, D6 validado antes de gravar); id/tema preservados ao editar,
  sem coleção/chave nova. Dados textuais escapados; nomes legados não são
  rebatizados ao editar apenas outros campos. Resumos semana ISO/mês/ano, recordes,
  total e km por tênis leem os helpers puros; nomes de tênis como `__proto__` e
  `toString` são contados por `Map`, não por propriedades herdadas de objeto.
- **Fora de escopo:** B5, gamificação, fórmulas de XP/dano/combate/volume/1RM, PR
  global e esquemas de backup/CSV. JSON v5/v6, CSV v1/v2/v3, D6 e a coluna
  `PR (informativo)` seguem cobertos pelos testes existentes, sem alteração nos
  respectivos módulos. Sem nova dependência de produção, módulo JS ou overlay
  (o `edit-log-overlay` já está em `OVERLAY_CLOSE_ORDER`); SW `v45` → `v46`.

### Testes sintéticos e reverts controlados

- `tests/engine/55_corridas.js`: rótulos Rua/Esteira/legados, exclusão de outros
  cardios e km por tênis com nomes reservados. `tests/ui/90_corridas_aba.js`:
  navegação, isolamento, resumos/recordes, filtros, escape, legacy edit, registro
  D6/validação/pace, fórmulas preservadas, PR global, JSON/CSV, edição, exclusão e
  estado vazio (try/catch/finally, estado sintético restaurado).
  `test_modules.js` cobre o mesmo fluxo em módulos ESM reais; o harness
  `scripts/validacao-navegador.js` acrescenta checks bloqueantes no Chrome do
  sistema com viewport emulado de 412 px, inclusive layout da nova aba.
- **Red antes do código:** `node test_ui.js` reprovou 2 checagens (D2 ausente e
  navegação para Corridas impossível); `node test_engine.js` reprovou 1 checagem
  de `runModality` ausente. Depois, antes de corrigir os casos descobertos,
  editar notas num nome legado reprovou 1 checagem (rebatismo); tênis com nome
  reservado reprovou 1 checagem (perda de km). Todos passaram após correção.
- **Reverts controlados, com cópia de segurança fora do repo + `trap` de
  restauração:** ampliar o filtro a todo `kind: corrida` → UI reprovou D3
  (4 falhas ao todo); remover whitelist da modalidade criada → UI reprovou
  a recusa de bike forjada (2 falhas, incluindo cascata de overlay); suprimir
  redesenho em `refreshAll` → UI reprovou atualização da lista após criar
  (2 falhas, incluindo cascata); retirar preservação do nome legado → UI
  reprovou edição de notas (1); retirar listener de distância → UI reprovou
  atualização do pace (1); interpolar notas sem escape → UI reprovou
  segurança do HTML (1); trocar `Map` por objeto de tênis → motor reprovou
  nomes reservados (1). **Após cada restauração**, a respectiva suíte
  `node test_ui.js` ou `node test_engine.js` voltou a passar. Nenhum revert
  temporário permanece no diff.

### Gates e limitações da B3

- `npm ci && npm test`: **904/904 aprovações**, 0 falhas (motor **453**, UI **407**,
  módulos reais **14**, Service Worker **30**). O `npm ci` relatou as mesmas
  **7 vulnerabilidades preexistentes** do lockfile (2 moderadas, 5 altas);
  dependências não foram alteradas.
- `node --check sw.js && npm run check:sw-core`: OK, `v46`, **175** arquivos
  locais no CORE; `npm run check:modules`: OK, grafo de **20** módulos;
  `npm run check:docs`: OK, **61** arquivos verificados.
- `npm run build:css` gerou diferenças esperadas pelas classes novas da aba;
  `vendor/tailwind.css` regenerado e incluído no commit B3.
  `npm run build:css && git diff --exit-code -- vendor/tailwind.css` passou
  após staging do CSS e será repetido após o commit.
- Navegador local **real e exigido** (`DIARIO_EXIGIR_NAVEGADOR=1`), com driver e
  `@sparticuz/chromium` **153.0.8010.0** instalados só em `/tmp`, fora do repo:
  **44/44 aprovações**, 0 falhas, cache v46, viewport emulado 412 px. O
  harness apontou a lacuna preexistente `/images/cards/classico.webp` fora
  do CORE na primeira visita offline (não reprovante). **Isso não substitui
  Chrome do sistema na CI nem teste em celular.**
- Na primeira execução local do novo harness, **4/44 reprovaram**: o teste
  lia `window.__diarioExports.logs` (snapshot do boot), em vez do binding vivo
  após `setLogs`; restaurava `[]` e causava três falhas de backup em cascata.
  O teste passou a ler os logs pelo `buildBackupPayload()` existente antes e
  depois do fluxo, restaurou o seed no `finally` e voltou a **44/44**.
- `node scripts/check-sw-version.js origin/main`: aguardando commit B3 para
  comparar `origin/main` com `HEAD` (o script não considera alterações soltas).
- CI da branch/**Chrome do sistema** e PR: a registrar **após gates verdes**, sem
  abrir PR antecipadamente. Os quatro checks obrigatórios mantêm os nomes
  `Testes (motor + UI)`, `vendor/tailwind.css atualizado`, `Versão do cache offline`
  e `Artefato do GitHub Pages contém o CORE do Service Worker`; o quinto job,
  `Validação em navegador real`, é **bloqueante** e não pode ser pulado.

Navegador headless em 412 px **não** é validação de toque, teclado virtual,
instalação em aparelho nem PWA/offline geral. A lacuna preexistente de imagens
fora do CORE na primeira visita offline continua; checagem manual de
Android/iOS, tela de 360 px, restauração entre aparelhos e queda de rede real
segue pendente (`docs/VALIDACAO_MANUAL.md`). Nenhuma foto/dado pessoal foi usado.
