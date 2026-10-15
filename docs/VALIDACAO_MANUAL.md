# Validação manual — PWA, offline e celular

O `npm test` cobre motor, UI (jsdom), grafo real de módulos e Service Worker simulado.
O que **só um navegador de verdade** (ou um celular) responde está listado aqui, com o
que já foi validado automaticamente em 2026-10-15 e o que continua exigindo uma pessoa.

> Regra da auditoria: comportamento não validado **não** é declarado validado.

## 0. O que já foi validado automaticamente (navegador real, headless)

`scripts/validacao-navegador.js` serve o app em `http://127.0.0.1:8099` e usa um Chrome/Chromium
de verdade com viewport de celular (412×915, touch, deviceScaleFactor 2.6). Nada é instalado no
projeto: o driver (`playwright-core`) entra com `--no-save` e o navegador vem do sistema.

**Última execução local (2026-10-15, Chromium 153 do `@sparticuz/chromium`, app em `v39`):
37 checagens, todas aprovadas** (antes eram 30; a versão do cache agora é lida do `sw.js`):

| Área | O que foi checado |
| --- | --- |
| Boot | ES modules reais (manifesto registrado pelas **18** fontes de `js/`), `window.__diarioExports` > 400 símbolos, histórico renderizado, **zero** `pageerror`, zero requisição local falhando |
| Menus | clique em `#nav-diario` abre `#tab-content-diario` (delegação `data-action` funcionando no navegador) |
| Dados | histórico do seed presente, `buildPlanilhaCSV()` com as linhas do seed |
| Storage | `storage.set/get` (IndexedDB + espelho no localStorage) e `saveBlob/getBlob` reais |
| ➕ Novo exercício | o botão da aba Buscar abre o formulário sem erro, cabe nos 412 px e o ESC fecha |
| Offline | Service Worker instalado, cache `berzerker-<VERSION>` com > 100 arquivos, **app abre offline** com catálogo e histórico; nenhum arquivo do CORE falha offline |
| Celular | nenhuma das 8 abas estoura a largura de 412 px |
| Instalação | manifest linkado e servido (`display: standalone`, ícones 192/512), `apple-touch-icon`, `theme-color`, SW controlando a página |
| Atualização | cópia com `VERSION` **N+1** (N lido do `sw.js`; na última execução v40 sobre v39): instala, ativa, popula o cache novo e **apaga o cache antigo**; app segue funcionando |
| Backup | `buildBackupPayload` (v6) e `applyImportedBackup` reaplicando; **download real** do `exportJSONBackup` lido do disco pelo navegador |
| Aviso de imagem | com o IndexedDB recusando, o aviso "não confirmou o salvamento" aparece dentro da tela de 412 px, **continua lá depois de 4,5 s**, o botão baixa o backup JSON v6 de verdade (clique real), "Dispensar" fecha e o aviso não volta na mesma sequência |

**Lacuna conhecida (achado, não corrigido):** na **primeira visita**, as imagens que ficam fora do
CORE (`images/patentes/*.webp`, `images/cards/*.webp` — 110 arquivos, ~1,2 MB) são pedidas antes
de o Service Worker controlar a página e não entram no cache em runtime; se a pessoa ficar offline
logo depois, o emblema da patente e a arte do Story Card não carregam (o resto do app funciona). O
harness lista isso como "lacuna conhecida" sem reprovar; numa segunda visita online as imagens já
passam pelo cache em runtime. Ver a seção 6.

Reproduzir:

```bash
# CI (job "navegador" em .github/workflows/ci.yml, ainda não bloqueia a PR)
npm ci && npm i --no-save playwright-core
DIARIO_CHROME_PATH="$(command -v google-chrome)" node scripts/validacao-navegador.js

# sandbox sem Chrome (tudo fora do repositório; o Chromium precisa das libs NSS do pacote)
mkdir -p /tmp/realbrowser && cd /tmp/realbrowser && npm i @sparticuz/chromium playwright-core
mkdir -p /tmp/chrlibs && cd /tmp/chrlibs
node -e "const z=require('zlib'),f=require('fs');f.writeFileSync('al2023.tar',z.brotliDecompressSync(f.readFileSync('/tmp/realbrowser/node_modules/@sparticuz/chromium/bin/al2023.tar.br')))"
tar xf al2023.tar                                   # libnss3/libnspr4/libnssutil3/...
cd /home/user/diario
DIARIO_BROWSER_DEPS=/tmp/realbrowser LD_LIBRARY_PATH=/tmp/chrlibs/lib node scripts/validacao-navegador.js
```

Sem driver ou sem navegador o script **não falha**: imprime "validação em navegador pulada: …"
(na CI, também um `::warning::`). `DIARIO_EXIGIR_NAVEGADOR=1` transforma o pulo em erro.

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
      arte do Story Card: hoje eles podem faltar (lacuna conhecida da seção 0 — imagens fora do
      CORE); numa segunda visita online elas já ficam no cache.
- [ ] **Não validado automaticamente**: queda de rede real no meio do uso e
      comportamento em rede instável/lenta.

## 3. Atualização de versão (cache novo) — manual

Automatizado já foi: instalar `VERSION`+1 por cima da versão atual (v40 sobre v39 na última
execução) e ver o cache antigo ser apagado.

- [ ] Com o app aberto em uma versão antiga, publicar uma versão nova (`sw.js`
      `VERSION` maior) e recarregar duas vezes.
- [ ] DevTools → Application → Service Workers: o SW novo deve ficar **activated and is
      running**, e em Cache Storage deve sobrar **somente** `berzerker-v<novo>`.
- [ ] Recarregar offline: a versão nova é a que responde.
- [ ] **Atenção**: se uma aba antiga continuar aberta, ela pode repovoar o cache antigo
      até ser recarregada/ fechada — conferir depois de fechar todas as abas.

## 4. Uso no celular — manual

- [ ] Tela estreita (360–430 px): todas as 8 abas sem rolagem horizontal
      (automatizado em 412 px; conferir 360 px e fonte grande do sistema).
- [ ] Registrar um treino completo com uma mão: seletor de exercício, séries, tags,
      salvar. Esperado: cartão aparece no histórico e sobrevive a recarregar.
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

Automatizado já foi: exportar (download real de JSON v6), reaplicar, e o caminho de
falha de gravação de imagem (IndexedDB recusando).

- [ ] Config → **Exportar backup JSON**: baixa o arquivo; abrir e conferir
      `"version": 6` e os `"logs"`.
- [ ] No mesmo aparelho: apagar tudo (Config → limpar dados) → **Importar backup** →
      histórico, treinos salvvos, ajustes, temas e progresso voltam.
- [ ] Em outro aparelho/navegador: importar o mesmo arquivo e conferir o mesmo resultado.
- [ ] Importar um arquivo **antigo** (versão 5) e um **corrompido** (texto qualquer):
      o primeiro deve entrar; o segundo deve ser recusado sem alterar nada.
- [ ] Exportar CSV (multi-aba) e reimportar: nada duplica, cardio e personalizados
      voltam (ver `docs/FORMATO_CSV.md`; a coluna `PR (informativo)` é ignorada na
      importação de propósito).
- [ ] **Cota cheia → aviso com ação de backup** (Chrome desktop): DevTools → Application →
      Storage → marcar **Simulate custom storage quota** com um valor pequeno (ex.: 1 MB) e
      recarregar. Na aba Jogo, enviar uma foto grande como retrato de chefão ou como fundo do
      Story Card. Esperado: aparece no topo o aviso "⚠️ A imagem **não confirmou o
      salvamento** …" que **não some sozinho**, com **💾 Exportar backup JSON** (baixa o
      `berzerker-diario-backup-AAAA-MM-DD.json`) e **Dispensar**; o app segue utilizável
      (registrar um treino com o aviso na tela funciona). Uma segunda falha logo em seguida
      **não** traz o aviso de volta depois de dispensado. Desmarcar a simulação, enviar de
      novo (mensagem "Retrato do chefão atualizado!", sem aviso) e repetir a falha: o aviso
      volta. (Automatizado no jsdom com IndexedDB simulado: `tests/ui/50_backup_gravacao.js`,
      seção `UI 12j`.)
- [ ] **Não validado automaticamente**: exportação/importação entre aparelhos
      diferentes e cota de armazenamento cheia num navegador real (o item acima é o roteiro).

## 6. Pendências conhecidas (não são deste checklist)

- ~~`js/custom_exercises.js` chama `openModal`/`closeModal`/`renderSearchTab`, que não
  existem~~ — **resolvido** na manutenção pós-PR #16 (I2): a janela passou a existir no
  próprio módulo (mesmo padrão de overlay do app) e a aba Buscar é redesenhada com
  `renderSearchScreen`. Ver o item "➕ Novo exercício" na seção 4.
- Edição/exclusão de exercício personalizado: o formulário tem esse modo
  (`openCustomExModal(id)`), mas nenhum botão da interface o abre hoje.
- Offline na primeira visita: `images/patentes/*` e `images/cards/*` não estão no CORE do
  `sw.js` (seção 0). Corrigir é decisão de produto (≈1,2 MB a mais na instalação offline).
