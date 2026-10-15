# Validação manual — PWA, offline e celular

O `npm test` cobre motor, UI (jsdom), grafo real de módulos e Service Worker simulado.
O que **só um navegador de verdade** (ou um celular) responde está listado aqui, com o
que já foi validado automaticamente em 2026-10-15 e o que continua exigindo uma pessoa.

> Regra da auditoria: comportamento não validado **não** é declarado validado.

## 0. O que já foi validado automaticamente (Chromium 131 real, headless)

Execução fora do repositório (nada foi instalado no projeto), com o app servido em
`http://127.0.0.1:8099` e viewport de celular (412×915, touch, deviceScaleFactor 2.6).
**30 checagens, todas aprovadas:**

| Área | O que foi checado |
| --- | --- |
| Boot | ES modules reais (14 arquivos), `window.__diarioExports` > 400 símbolos, histórico renderizado, **zero** `pageerror`, zero requisição local falhando |
| Menus | clique em `#nav-diario` abre `#tab-content-diario` (delegação `data-action` funcionando no navegador) |
| Dados | histórico do seed presente, `buildPlanilhaCSV()` com as linhas do seed |
| Storage | `storage.set/get` (IndexedDB + espelho no localStorage) e `saveBlob/getBlob` reais |
| Offline | Service Worker instalado, cache do CORE com > 100 arquivos, **app abre offline** com catálogo e histórico |
| Celular | nenhuma das 8 abas estoura a largura de 412 px |
| Instalação | manifest linkado e servido (`display: standalone`, ícones 192/512), `apple-touch-icon`, `theme-color`, SW controlando a página |
| Atualização | cópia com `VERSION` v36: instala, ativa, popula o cache novo e **apaga o cache antigo (v35)**; app segue funcionando |
| Backup | `buildBackupPayload` (v6) e `applyImportedBackup` reaplicando; **download real** do `exportJSONBackup` lido do disco pelo navegador |

Reproduzir (Chromium precisa das libs NSS, que não existem nesta imagem):

```bash
# fora do repositório
mkdir -p /tmp/realbrowser && cd /tmp/realbrowser
npm i @sparticuz/chromium playwright-core          # binário do Chromium
node -e "const z=require('zlib'),f=require('fs');['al2023.tar.br'].forEach(n=>f.writeFileSync('/tmp/chrlibs/'+n.replace('.br',''),z.brotliDecompressSync(f.readFileSync('node_modules/@sparticuz/chromium/bin/'+n))))"
cd /tmp/chrlibs && tar xf al2023.tar                # libnss3/libnspr4/libnssutil3/...
LD_LIBRARY_PATH=/tmp/chrlibs/lib node scripts/validacao-navegador.js
```

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
      `berzerker-v35` com o CORE; fora isso, só `vendor/chart.umd.js` é externo).
- [ ] **Não validado automaticamente**: queda de rede real no meio do uso e
      comportamento em rede instável/lenta.

## 3. Atualização de versão (cache novo) — manual

Automatizado já foi: instalar v36 por cima de v35 e ver o cache antigo ser apagado.

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
- [ ] **Não validado automaticamente**: exportação/importação entre aparelhos
      diferentes e cota de armazenamento cheia.

## 6. Pendências conhecidas (não são deste checklist)

- `js/custom_exercises.js` chama `openModal`/`closeModal`/`renderSearchTab`, que **não
  existem** em nenhum módulo: o botão "➕ Novo exercício" (`index.html`) lança
  `ReferenceError` ao ser clicado. Achado registrado no relatório da auditoria;
  não foi corrigido nesta rodada.
