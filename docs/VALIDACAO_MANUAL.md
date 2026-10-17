# Validação manual — PWA, offline e celular

O `npm test` cobre motor, UI (jsdom), grafo real de módulos e Service Worker simulado.
O que **só um navegador de verdade** (ou um celular) responde está listado aqui. Os
resultados históricos de 2026-10-15 e o gate da B3 são distintos; tocar no aparelho,
instalar e usar PWA/offline em geral continuam exigindo uma pessoa.

> Regra da auditoria: comportamento não validado **não** é declarado validado.

## 0. O que já foi validado automaticamente (navegador real, headless)

`scripts/validacao-navegador.js` serve o app em `http://127.0.0.1:8099` e usa um Chrome/Chromium
de verdade com viewport de celular (412×915, touch, deviceScaleFactor 2.6). Nada é instalado no
projeto: o driver (`playwright-core`) entra com `--no-save` e o navegador vem do sistema.

**Referência histórica (2026-10-15, app em `v39`, antes da B3): 37 checagens, todas
aprovadas** (antes eram 30; a versão do cache é lida do `sw.js`):

- local, fora do repositório: Chromium 153 do `@sparticuz/chromium`;
- **CI na época da PR #17** (job então não bloqueante, `ubuntu-latest`): **Google
  Chrome 155** da imagem do runner — o resultado saiu como anotação na PR
  (`37/37 checagens OK · Chrome do sistema (/usr/bin/google-chrome) · 155.0.8059.39 · cache v39`).

| Área | O que foi checado |
| --- | --- |
| Boot | ES modules reais (manifesto registrado pelas **18** fontes de `js/`), `window.__diarioExports` > 400 símbolos, histórico renderizado, **zero** `pageerror`, zero requisição local falhando |
| Menus | clique em `#nav-diario` abre `#tab-content-diario` (delegação `data-action` funcionando no navegador) |
| Dados | histórico do seed presente, `buildPlanilhaCSV()` com as linhas do seed |
| Storage | `storage.set/get` (IndexedDB + espelho no localStorage) e `saveBlob/getBlob` reais |
| ➕ Novo exercício | o botão da aba Buscar abre o formulário sem erro, cabe nos 412 px e o ESC fecha |
| Treino em Andamento (NAV 2d) | sessão compacta (1 unidade aberta, accordion pelo toque), ✔ Registrar real, exercício Extra pelo Registro rápido com progresso +1/+1 e sem estouro horizontal em 412 px |
| Offline | Service Worker instalado, cache `berzerker-<VERSION>` com > 100 arquivos, **app abre offline** com catálogo e histórico; nenhum arquivo do CORE falha offline |
| Viewport de 412 px (headless) | as 8 telas percorridas na época não estouraram a largura; isso não valida toque/teclado de um celular |
| Instalação | manifest linkado e servido (`display: standalone`, ícones 192/512), `apple-touch-icon`, `theme-color`, SW controlando a página |
| Atualização | cópia com `VERSION` **N+1** (N lido do `sw.js`; na última execução v40 sobre v39): instala, ativa, popula o cache novo e **apaga o cache antigo**; app segue funcionando |
| Backup | `buildBackupPayload` (v6) e `applyImportedBackup` reaplicando; **download real** do `exportJSONBackup` lido do disco pelo navegador |
| Aviso de imagem | com o IndexedDB recusando, o aviso "não confirmou o salvamento" aparece dentro da tela de 412 px, **continua lá depois de 4,5 s**, o botão baixa o backup JSON v6 de verdade (clique real), "Dispensar" fecha e o aviso não volta na mesma sequência |

**B3 (cache v46):** o gate de Chrome do sistema agora também clica na última aba do grupo
Treino, confere D3 com dados sintéticos (Rua, Esteira legada, bike, elíptico e remo), filtra
por modalidade, abre o editor com só duas opções/D6, vê pace ao digitar, cria corrida e
verifica `logs`, backup JSON v6, CSV v3 e PR global de cardio; a rodada de layout em 412 px
inclui Corridas. **Execução local exigida** com `@sparticuz/chromium`
153.0.8010.0 fora do repositório: **44/44**, cache v46, lacuna conhecida em
`/images/cards/classico.webp` na primeira visita offline. O Chrome do sistema
na CI da branch aprovou o gate bloqueante no [run 38918305668](https://github.com/LucasRangel89/diario/actions/runs/38918305668)
(commit `a5bff94`); consultar `docs/RELATORIO_POS_PR17.md` e confirmar a CI do
HEAD da PR. Viewport emulado não valida aparelho físico.

**B5/D8 (cache v47):** as 110 imagens de `images/patentes/*.webp` (100) e
`images/cards/*.webp` (10) — **1.057.982 bytes** medidos — entraram no CORE, fechando a
lacuna conhecida anterior da primeira visita offline. O gate de navegador real agora
confere `patentes = 100` e `cards = 10` no cache e amostras dos dois diretórios
respondendo **offline** por `caches.match`; a atualização simulada v47 → v48 instala,
ativa e apaga o cache antigo. Execução local exigida com `@sparticuz/chromium`
153.0.8010.0 fora do repositório: **46/46**. Isso **não** declara PWA, offline geral
ou uso em celular plenamente validados: são testes headless com viewport emulado.

**Sessão compacta + Extra (cache v48):** o gate ganhou a seção **NAV 2d** — no Chrome
real (412×915, touch) ela inicia um treino salvo pelo clique "▶ Iniciar", confere a
sequência compacta (só a 1ª unidade aberta, meta/estado, `aria-expanded`/`aria-controls`,
alvos de 44 px), alterna cartões pelo toque, registra uma unidade pelo ✔ Registrar,
grava um exercício **Extra** pelo Registro rápido com "Contar no treino em andamento"
(total+1 e concluídos+1, selo Extra) e mede rolagem horizontal com a sessão aberta —
incluindo a faixa **360/390/412/430 px** (emulada), também sem conteúdo estourando
os cartões da sessão/registro.
Execução local exigida com `@sparticuz/chromium` 153.0.8010.0 fora do repositório:
**53/53**, cache v48. Acompanhe a rodada e a CI do HEAD da PR. A simulação de
atualização v48 → v49 instala, ativa e apaga o cache antigo. Isso segue **sem** declarar
PWA, offline geral ou uso em celular plenamente validados.

Reproduzir:

```bash
# CI atual (.github/workflows/ci.yml): navegador real é bloqueante, sem skip
npm ci && npm i --no-save playwright-core
DIARIO_EXIGIR_NAVEGADOR=1 DIARIO_CHROME_PATH="$(command -v google-chrome)" node scripts/validacao-navegador.js

# sandbox sem Chrome (tudo fora do repositório; o Chromium precisa das libs NSS do pacote)
mkdir -p /tmp/realbrowser && cd /tmp/realbrowser && npm i @sparticuz/chromium playwright-core
mkdir -p /tmp/chrlibs && cd /tmp/chrlibs
node -e "const z=require('zlib'),f=require('fs');f.writeFileSync('al2023.tar',z.brotliDecompressSync(f.readFileSync('/tmp/realbrowser/node_modules/@sparticuz/chromium/bin/al2023.tar.br')))"
tar xf al2023.tar                                   # libnss3/libnspr4/libnssutil3/...
cd /home/user/diario
DIARIO_BROWSER_DEPS=/tmp/realbrowser LD_LIBRARY_PATH=/tmp/chrlibs/lib node scripts/validacao-navegador.js
```

Sem driver ou navegador, a execução **local sem** `DIARIO_EXIGIR_NAVEGADOR=1` avisa
"validação em navegador pulada: …". **Isso não é aprovação.** Na CI,
`DIARIO_EXIGIR_NAVEGADOR=1` transforma qualquer pulo em erro e o job é obrigatório.

## 1. Instalação (PWA) — manual

Pré-requisito: servir por **https** ou `localhost` (o app só registra o SW em `http`/`https`).

- [ ] Android/Chrome: abrir o site → menu ⋮ → **Instalar app / Adicionar à tela inicial**.
      Esperado: abre em janela própria (sem barra do navegador), ícone 192/512 correto,
      cor de tema `#0f0f0f`.
- [ ] iOS/Safari: Compartilhar → **Adicionar à Tela de Início**. Esperado: ícone
      (`apple-touch-icon`), abre em tela cheia (iOS não usa o manifest do mesmo jeito).
- [ ] Desktop/Chrome: ícone de instalação na barra de endereço.
- [ ] Depois de instalar: abrir pelo ícone e confirmar que o app carrega dados já
      registrados (mesmo armazenamento do navegador).
- [ ] **Não validado automaticamente**: o prompt de instalação em si (o headless não
      mostra o prompt) — o que foi verificado é que todos os pré-requisitos existem.

## 2. Primeira carga offline — manual

- [ ] Abrir o app **online** e esperar carregar (a primeira visita enche o cache do CORE).
- [ ] Ligar o modo avião / desligar o Wi‑Fi e **recarregar**.
      Esperado: carrega sem erro, com histórico, catálogo e buscas funcionando.
- [ ] Fechar o app, desligar a rede e abrir pelo ícone instalado: deve abrir do cache.
- [ ] Confirmar que nada de novo foi baixado (DevTools → Application → Cache Storage →
      `berzerker-v<VERSION do sw.js>` com o CORE; fora isso, só `vendor/chart.umd.js` é externo).
- [ ] Ficar offline **logo na primeira visita** e conferir o emblema da patente (cabeçalho) e a
      arte do Story Card: desde a B5 (v47) as 110 imagens estão no CORE, então devem carregar;
      o gate headless já confere a presença no cache e amostras offline, mas a conferência
      visual no aparelho continua manual.
- [ ] **Não validado automaticamente**: queda de rede real no meio do uso e
      comportamento em rede instável/lenta.

## 3. Atualização de versão (cache novo) — manual

Automatizado já foi: instalar `VERSION`+1 por cima da versão atual (v48 sobre v47 na execução
da B5) e ver o cache antigo ser apagado. No `test_sw.js` (SW 3b), uma falha simulada numa
imagem de patente reprova a instalação, preserva a versão anterior e, removida a falha, a
atualização completa instala e ativa.

- [ ] Com o app aberto em uma versão antiga, publicar uma versão nova (`sw.js`
      `VERSION` maior) e recarregar duas vezes.
- [ ] DevTools → Application → Service Workers: o SW novo deve ficar **activated and is
      running**, e em Cache Storage deve sobrar **somente** `berzerker-v<novo>`.
- [ ] Recarregar offline: a versão nova é a que responde.
- [ ] **Atenção**: se uma aba antiga continuar aberta, ela pode repovoar o cache antigo
      até ser recarregada/ fechada — conferir depois de fechar todas as abas.

## 4. Uso no celular — manual

- [ ] Tela estreita (360–430 px): todas as 10 seções sem rolagem horizontal
      (9 seções percorridas pelo Chrome headless em 412 px; conferir Montador, 360 px,
      fonte grande do sistema e aparelho físico). A faixa 360–430 px ganhou medição
      **emulada** no gate NAV 2d (inclusive a sessão compacta); **360 px em aparelho
      físico e uso em celular continuam PENDENTES** — não declarados validados.
- [ ] Registrar um treino completo com uma mão: seletor de exercício, séries, tags,
      salvar. Esperado: cartão aparece no histórico e sobrevive a recarregar.
- [ ] Em uma corrida sintética de teste, usar **Editar** tanto na lista do dia quanto no
      histórico da Busca. Esperado: abre o editor de corrida (sem reps/carga), editar e salvar
      mantém o id/tema e a modalidade; conferir a apresentação de PR de distância. Os campos
      opcionais de tipo, RPE, FC média e tênis devem aceitar valores válidos; RPE inválido não
      deve salvar nem alterar o registro. O toque e o teclado virtual do aparelho continuam
      exigindo validação manual.
- [ ] Em **Treino → Corridas**, confirmar que Corridas é a última aba de Treino e que só
      Rua/Esteira aparecem (inclusive um registro antigo chamado apenas "Esteira"). Bike,
      elíptico e remo devem continuar em Histórico → Cardio, nunca no painel Corridas.
      Registrar uma corrida de teste por ali: data, distância, tempo `h:mm:ss`, pace enquanto
      digita, tipo/RPE/FC/tênis; recusar RPE inválido sem criar log. Editar, filtrar por ano e
      modalidade, cancelar/confirmar exclusão e conferir que o Histórico acompanha a mudança.
      Totais e recordes informativos não devem mudar ao aplicar filtro só à lista. Um recorde
      exibido não é um PR do jogo (a regra global de cardio continua incluindo outras modalidades).
- [ ] **Treino em Andamento — sessão compacta (PENDENTE em aparelho físico e em 360 px):**
      iniciar um treino e conferir no aparelho: cartões compactos com número, grupo/nome,
      meta e estado; só a primeira unidade pendente abre; tocar em outra recolhe a anterior
      (estado anunciado); carga, reps e ✔ Registrar fáceis na unidade aberta; "Mais detalhes"
      guarda tipo/modo, séries individuais, RIR, técnica, observações, aquecimento e anilhas
      (o aquecimento da sessão usa a carga do cartão, não o campo global); bi-set abre com os
      dois formulários e registra junto; valores digitados (inclusive série parcial)
      sobrevivem a recolher/reordenar; registro inválido mantém a unidade aberta sem criar
      log; após registrar, a concluída compacta e a próxima pendente abre. A faixa
      **360–430 px** foi medida emulada (Chrome headless, `scripts/validacao-navegador.js`,
      NAV 2d) sem rolagem horizontal; **aparelho físico, teclado do sistema, fonte grande
      e 360 px real continuam PENDENTES** — não validados nesta entrega.
- [ ] **Exercício Extra no treino (PENDENTE em aparelho físico):** com a sessão ativa,
      registrar pelo Registro rápido com "Contar no treino em andamento" e conferir no
      aparelho o item Extra concluído, o selo "Extra", o progresso (ex.: 2/4 → 3/5) e que
      nome igual ao item planejado **não** conclui o planejado (aviso e escolha entre Extra
      distinto ou só histórico); editar/excluir o log do Extra corrige a sessão. **Não
      validado nesta entrega em aparelho físico.**
- [ ] Cronômetro de descanso: som/vibração (Android) e o número regressivo correto
      com a tela bloqueada/bloqueando durante o descanso.
- [ ] Rotação de tela e modo escuro do sistema não quebram layout.
- [ ] Compartilhar/baixar o Story Card e o Card do Chefão (download de PNG).
- [ ] Aba Buscar → **➕ Novo exercício**: a janela abre; Cancelar, ESC e toque fora do
      cartão fecham; criar um exercício faz ele aparecer na busca e no seletor rápido e
      continuar lá depois de recarregar. (Automatizado no jsdom: `tests/ui/60_csv_mapa_delegacao.js`,
      seção `UI 13b`; teclado virtual e toque real só no aparelho.)
- [ ] **Não validado automaticamente**: toque real, teclado do sistema, bloqueio de tela,
      câmera/galeria para a foto do chefão, e armazenamento sob pressão (aba anônima).

## 5. Backup e restauração — manual

Automatizado já foi: exportar (download real de JSON v6), reaplicar, e os caminhos de
falha de gravação do localStorage e da imagem (IndexedDB recusando).

- [ ] Config → **Exportar backup JSON**: baixa o arquivo; abrir e conferir
      `"version": 6` e os `"logs"`.
- [ ] No mesmo aparelho: apagar tudo (Config → limpar dados) → **Importar backup** →
      histórico, treinos salvvos, ajustes, temas e progresso voltam.
- [ ] Em outro aparelho/navegador: importar o mesmo arquivo e conferir o mesmo resultado.
- [ ] Importar um arquivo **antigo** (versão 5) e um **corrompido** (texto qualquer):
      o primeiro deve entrar; o segundo deve ser recusado sem alterar nada.
- [ ] Exportar CSV formato 3 (multi-aba) e reimportar: nada duplica, cardio e metadados
      opcionais voltam; importar também amostras antigas CSV 1 e 2 (ver `docs/FORMATO_CSV.md`).
      A coluna `PR (informativo)` é ignorada na importação de propósito.
- [ ] Exportar JSON v6 com corrida D6 e reimportar; conferir `runType`, `rpe`, `hrAvg` e `shoe`
      dentro de `logs`. Num arquivo sintético separado, corromper cada campo (tipo/valor) e
      confirmar que o backup é recusado sem alterar estado. JSON continua v6; não se validam
      `distanceKm`/`durationMin` de forma mais estrita nesta mudança.
- [ ] **Falha de gravação → aviso com ação de backup**: no DevTools, em Console, guardar
      `const setItemOriginal = Storage.prototype.setItem` e substituir temporariamente
      `Storage.prototype.setItem = function () { throw new DOMException('QuotaExceededError') }`;
      acione uma gravação (ex.: registrar um treino). Esperado: aviso persistente com
      **💾 Exportar backup JSON** e **Dispensar**; clicar exporta um JSON válido. Gravações
      falhas seguidas não empilham avisos; após restaurar o método original e confirmar uma
      gravação bem-sucedida, uma falha nova volta a exibir o aviso. Restaure sempre com
      `Storage.prototype.setItem = setItemOriginal`.
- [ ] **Cota cheia para imagem** (Chrome desktop): DevTools → Application → Storage → marcar
      **Simulate custom storage quota** com um valor pequeno (ex.: 1 MB) e recarregar. Na aba
      Jogo, enviar uma foto grande como retrato de chefão ou fundo do Story Card. Esperado:
      aviso persistente "⚠️ A imagem **não confirmou o salvamento** …", botão **💾 Exportar
      backup JSON** e **Dispensar**; o app segue utilizável. Uma segunda falha não empilha;
      após uma gravação confirmada, a falha volta a avisar. Automatizado com IndexedDB simulado
      em `tests/ui/50_backup_gravacao.js`, seção `UI 12j`.
- [ ] **Não validado automaticamente**: exportação/importação entre aparelhos
      diferentes e cota de armazenamento cheia num navegador real (o item acima é o roteiro).

## 6. Histórico de pendências resolvidas (não são deste checklist)

- ~~`js/custom_exercises.js` chama `openModal`/`closeModal`/`renderSearchTab`, que não
  existem~~ — **resolvido** na manutenção pós-PR #16 (I2): a janela passou a existir no
  próprio módulo (mesmo padrão de overlay do app) e a aba Buscar é redesenhada com
  `renderSearchScreen`. Ver o item "➕ Novo exercício" na seção 4.
- ~~Edição/exclusão de exercício personalizado não tem entrada na interface~~ —
  **resolvido em A2/A3 (pós-PR #17):** `js/busca.js` renderiza **✏️ Editar** nos cards
  personalizados com `data-action="openCustomExModal"` e o id do exercício;
  `js/custom_exercises.js` abre o formulário em modo de edição e oferece **Excluir**
  via `confirmModal`. Ver A2/A3 em `CHANGELOG.md`. Toque no aparelho ainda requer a
  validação manual da seção 4.
- ~~Offline na primeira visita: `images/patentes/*` e `images/cards/*` não estão no CORE do
  `sw.js`~~ — **resolvido na B5/D8** (`sw.js` v47): as 110 imagens (1.057.982 bytes) entraram
  no precache; o custo é esse tamanho a mais na instalação/atualização offline.
