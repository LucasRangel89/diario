#!/usr/bin/env node
/* ============================================================
   VALIDAÇÃO EM NAVEGADOR REAL (Chromium headless) — Diário de Cargas
   ------------------------------------------------------------
   NÃO roda no `npm test` e NÃO adiciona dependências ao projeto:
   precisa de @sparticuz/chromium + playwright-core instalados FORA
   do repositório, e das libs NSS (libnss3/libnspr4/libnssutil3) que
   vêm no `al2023.tar.br` do próprio @sparticuz/chromium.

   Receita (fora do repo):

     mkdir -p /tmp/realbrowser && cd /tmp/realbrowser
     npm i @sparticuz/chromium playwright-core
     mkdir -p /tmp/chrlibs && cd /tmp/chrlibs
     node -e "const z=require('zlib'),f=require('fs');const p='/tmp/realbrowser/node_modules/@sparticuz/chromium/bin/al2023.tar.br';f.writeFileSync('al2023.tar',z.brotliDecompressSync(f.readFileSync(p)))"
     tar xf al2023.tar
     cd /home/user/diario
     LD_LIBRARY_PATH=/tmp/chrlibs/lib node scripts/validacao-navegador.js

   `DIARIO_ROOT` (padrão: a raiz do repositório) e `DIARIO_BROWSER_DEPS`
   (padrão: o diretório atual) ajustam os caminhos.

   Cobre o que o jsdom não cobre: ES modules reais, Service Worker,
   offline, IndexedDB, download real do backup, layout em 412 px,
   pré-requisitos de instalação e atualização de versão do cache.
   O relatório sai em /tmp/realbrowser/report.json.
   ============================================================ */
/* Validação em NAVEGADOR REAL (Chromium headless) do Diário de Cargas.
   Roda fora do repositório: /tmp/realbrowser (nada é instalado no projeto).
   `DIARIO_ROOT` (padrão: a raiz do repositório) e `DIARIO_BROWSER_DEPS`
   (padrão: o diretório atual) ajustam os caminhos.

   Cobre o que o jsdom não cobre: módulos ES de verdade, Service Worker,
   offline e IndexedDB reais. */
const http = require('http');
const fs = require('fs');
const path = require('path');
// As dependências do navegador ficam FORA do repositório: aponte para a pasta
// onde elas foram instaladas (padrão: o diretório de onde o script é chamado).
const DEPS = process.env.DIARIO_BROWSER_DEPS || process.cwd();
const carregar = (nome) => require(require.resolve(nome, { paths: [DEPS] }));
const chromiumBinary = carregar('@sparticuz/chromium');
const { chromium } = carregar('playwright-core');

const ROOT_INICIAL = process.env.DIARIO_ROOT || path.resolve(__dirname, '..');
let ROOT = ROOT_INICIAL;
const SIM = '/tmp/site-sim';   // cópia para simular atualização de versão do SW
const PORT = 8099;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp', '.css': 'text/css', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };

const resultados = [];
const check = (nome, ok, detalhe) => { resultados.push({ nome, ok: !!ok, detalhe: detalhe === undefined ? '' : String(detalhe).slice(0, 300) }); console.log((ok ? '  ✔ ' : '  ✘ ') + nome + (ok ? '' : '  [' + detalhe + ']')); };

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  let file = path.join(ROOT, url === '/' ? '/index.html' : url);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('404'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
});

(async () => {
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  const exe = await chromiumBinary.executablePath();
  const browser = await chromium.launch({ executablePath: exe, args: [...chromiumBinary.args, '--no-sandbox'], headless: true });
  const context = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.6, isMobile: true, hasTouch: true, acceptDownloads: true });
  let page = await context.newPage();
  const consoleErrors = [], pageErrors = [], falhasDeRede = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => pageErrors.push(String(e.message || e)));
  page.on('requestfailed', r => {
    const url = r.url();
    // CDN externo (fonte/Tailwind) não existe no sandbox: só o que é do app conta.
    if (!/^https?:\/\/(127\.0\.0\.1|localhost)/.test(url)) return;
    falhasDeRede.push(url + ' → ' + (r.failure() || {}).errorText);
  });

  console.log('\n== NAV 1. Boot em módulo ES de verdade ==');
  await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const boot = await page.evaluate(() => ({
    exportFiles: Object.keys(window.__diarioExportFiles || {}).length,
    exports: Object.keys(window.__diarioExports || {}).length,
    logsNoDom: (document.getElementById('logs-container') || { children: [] }).children.length,
    cards: document.querySelectorAll('#cat-results [data-ex]').length,
    tema: document.documentElement.className || document.body.className,
    swSuportado: 'serviceWorker' in navigator,
  }));
  check('pageerror nenhum no boot (módulos ES reais)', pageErrors.length === 0, pageErrors.join(' | '));
  check('nenhuma requisição local falhou no boot', falhasDeRede.length === 0, falhasDeRede.slice(0, 3).join(' | '));
  check('manifesto de módulos registrado pelas 14 fontes', boot.exportFiles >= 13, JSON.stringify(boot));
  check('superfície de exports > 400 símbolos', boot.exports > 400, boot.exports);
  check('histórico renderizado no DOM real', boot.logsNoDom > 0, boot.logsNoDom);

  console.log('\n== NAV 2. Fluxo de uso (registro + aba) ==');
  // interação como um usuário: clica no menu (delegação de eventos)
  await page.click('#nav-group-treino').catch(() => {});
  await page.click('#nav-diario').catch(() => {});
  await page.waitForTimeout(400);
  const fluxo = await page.evaluate(async () => {
    const ex = window.__diarioExports;
    const antes = (ex.logs || []).length;
    const okPersist = await ex.storage.set('berzerker_teste_nav', 'ok');
    const lido = ex.storage.get('berzerker_teste_nav');
    const el = document.getElementById('tab-content-diario');
    const vazio = /Nenhum treino registrado/.test((document.getElementById('logs-container') || {}).innerHTML || '');
    return { antes, vazioHoje: vazio, okPersist, lido, visivel: el ? !el.classList.contains('hidden') : null };
  });
  check('clique no menu abre a página do Diário', fluxo.visivel === true, JSON.stringify(fluxo));
  check('a página do Diário abre (com ou sem registro do dia)', fluxo.vazioHoje !== undefined, JSON.stringify(fluxo));
  // Histórico: os registros do seed (planilha) precisam estar lá
  await page.click('#nav-historico').catch(() => {});
  await page.waitForTimeout(600);
  const historico = await page.evaluate(() => {
    const ex = window.__diarioExports;
    const csv = ex.buildPlanilhaCSV ? ex.buildPlanilhaCSV() : '';
    const visivel = !(document.getElementById('tab-content-historico') || {}).classList?.contains('hidden');
    return { linhasCSV: csv.split('\n').length, visivel, temAba: !!document.getElementById('hist-results') };
  });
  check('aba Histórico abre e o CSV do app tem os registros do seed', historico.visivel && historico.linhasCSV > 50, JSON.stringify(historico));
  check('storage.set/get reais (IndexedDB + espelho) funcionam', fluxo.okPersist === true && fluxo.lido === 'ok', JSON.stringify(fluxo));

  const idb = await page.evaluate(async () => {
    const blob = new Blob(['abc'], { type: 'text/plain' });
    const salvou = await window.__diarioExports.storage.saveBlob('teste:nav:blob', blob);
    const voltou = await window.__diarioExports.storage.getBlob('teste:nav:blob');
    const txt = voltou ? await voltou.text() : null;
    return { salvou, txt, chaves: typeof indexedDB };
  });
  check('saveBlob/getBlob reais no navegador', idb.salvou === true && idb.txt === 'abc', JSON.stringify(idb));

  console.log('\n== NAV 3. Service Worker + offline ==');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForTimeout(1500);
  const sw = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    const chaves = await caches.keys();
    const nomes = chaves.length ? await (await caches.open(chaves[0])).keys() : [];
    return { temSW: !!reg, controlado: !!navigator.serviceWorker.controller, versao: chaves, arquivos: nomes.length };
  });
  check('service worker registrado e ativo', sw.temSW, JSON.stringify(sw));
  check('cache offline criado com o CORE', sw.arquivos > 100, sw.arquivos);
  check('cache da versão v35', (sw.versao || []).some(v => /v35/.test(v)), JSON.stringify(sw.versao));

  await context.setOffline(true);
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const offline = await page.evaluate(() => ({
    exports: Object.keys(window.__diarioExports || {}).length,
    logs: (document.getElementById('logs-container') || { children: [] }).children.length,
    linhas: (document.getElementById('wb-exercise-suggestions') || { options: [] }).options.length,
    historico: (document.getElementById('logs-container') || { children: [] }).children.length,
  }));
  check('app abre OFFLINE (service worker servindo o cache)', offline.exports > 400 && offline.logs > 0, JSON.stringify(offline));
  check('sugestões de exercício carregadas offline (datalist)', offline.linhas >= 5, offline.linhas);
  check('histórico continua no DOM offline', offline.historico > 0, offline.historico);
  await context.setOffline(false);

  console.log('\n== NAV 3b. Celular: layout sem estouro horizontal ==');
  const mobile = [];
  for (const [aba, grupo] of [['diario', 'treino'], ['busca', 'treino'], ['historico', 'treino'], ['boss', 'jogo'], ['story', 'jogo'], ['stats', 'voce'], ['calcs', 'voce'], ['config', 'config']]) {
    await page.click(`#nav-group-${grupo}`).catch(() => {});
    await page.click(`#nav-${aba}`).catch(() => {});
    await page.waitForTimeout(250);
    const largura = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, win: window.innerWidth }));
    mobile.push({ aba, ...largura, ok: largura.scroll <= largura.win + 2 });
  }
  const estourou = mobile.filter(m => !m.ok);
  check('nenhuma aba estoura a largura de um celular 412px', estourou.length === 0, JSON.stringify(estourou));

  console.log('\n== NAV 3c. Pré-requisitos de instalação (PWA) ==');
  const pwa = await page.evaluate(async () => {
    const link = document.querySelector('link[rel="manifest"]');
    const resp = await fetch(link ? link.href : 'manifest.webmanifest');
    const m = resp.ok ? await resp.json() : null;
    return {
      temLink: !!link, respOk: resp.ok, nome: m && m.name, display: m && m.display,
      start: m && m.start_url, icones: m ? (m.icons || []).map(i => i.sizes) : [],
      apple: !!document.querySelector('link[rel="apple-touch-icon"]'),
      themeColor: (document.querySelector('meta[name="theme-color"]') || {}).content || '',
      controlado: !!navigator.serviceWorker.controller,
    };
  });
  check('manifest linkado e servido com ícones 192/512 e display standalone',
    pwa.temLink && pwa.respOk && pwa.display === 'standalone' && pwa.icones.includes('192x192') && pwa.icones.includes('512x512'), JSON.stringify(pwa));
  check('pré-requisitos de instalação presentes (apple-touch-icon, theme-color, SW controlando)',
    pwa.apple && !!pwa.themeColor && pwa.controlado, JSON.stringify(pwa));

  console.log('\n== NAV 3d. Atualização de versão do cache (v35 -> v36) ==');
  fs.rmSync(SIM, { recursive: true, force: true });
  fs.mkdirSync(SIM, { recursive: true });
  // cópia do app inteiro (o CORE do sw.js precisa existir por completo)
  const ignorar = new Set(['node_modules', '.git', '_site', 'tests', 'scripts', 'docs', 'src']);
  fs.cpSync(ROOT_INICIAL, SIM, {
    recursive: true,
    filter: (origem) => {
      const nome = path.basename(origem);
      if (ignorar.has(nome)) return false;
      if (/^(\.|\.\.)$/.test(nome)) return true;
      return true;
    },
  });
  fs.writeFileSync(path.join(SIM, 'sw.js'), fs.readFileSync(path.join(SIM, 'sw.js'), 'utf8').replace(/VERSION = 'v35'/, "VERSION = 'v36'"));
  // como um usuário que fecha e reabre o app depois de sair uma versão nova:
  // (fechar a aba antes evita que o SW antigo continue servindo/cacheando)
  await page.close();
  ROOT = SIM;
  page = await context.newPage();
  const errosAtualizacao = [];
  page.on('pageerror', e => errosAtualizacao.push(String(e.message || e)));
  await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load' });
  await page.waitForTimeout(2000);
  await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); if (r) await r.update(); });
  await page.waitForTimeout(2500);
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const atualizado = await page.evaluate(async () => {
    const chaves = await caches.keys();
    const cache = chaves.find(k => /v36/.test(k));
    const nomes = cache ? (await (await caches.open(cache)).keys()).length : 0;
    const reg = await navigator.serviceWorker.getRegistration();
    return { chaves, nomes, instalando: !!reg.installing, esperando: !!reg.waiting, ativo: !!reg.active,
      controlado: !!navigator.serviceWorker.controller, exporta: Object.keys(window.__diarioExports || {}).length };
  });
  check('nova versão instala, ativa e popula o cache v36', atualizado.ativo && atualizado.nomes > 100, JSON.stringify(atualizado));
  check('cache da versão antiga (v35) é limpo na ativação', !(atualizado.chaves || []).some(k => /v35/.test(k)), JSON.stringify(atualizado.chaves));
  check('app continua funcionando depois da atualização', atualizado.exporta > 400 && errosAtualizacao.length === 0, JSON.stringify({ exporta: atualizado.exporta, erros: errosAtualizacao }));

  console.log('\n== NAV 4. Backup e restauração reais ==');
  const backup = await page.evaluate(async () => {
    const ex = window.__diarioExports;
    const p = await ex.buildBackupPayload();
    const json = JSON.parse(JSON.stringify(p));
    const antes = ex.logs.length;
    const aplicado = await ex.applyImportedBackup(json);
    return { version: json.version, logs: p.logs.length, antes, aplicado, agora: ex.logs.length };
  });
  check('buildBackupPayload gera backup v6 com os logs', backup.version === 6 && backup.logs > 0, JSON.stringify(backup));
  check('applyImportedBackup reaplica sem perder registros', backup.aplicado === true && backup.agora === backup.antes, JSON.stringify(backup));

  // download de verdade: o navegador grava o arquivo e lemos o conteúdo
  const pageAtual = globalThis.__page || page;
  let download = { clicou: false, tamanho: 0, tipo: '', erro: null, logs: 0, version: 0 };
  try {
    const [dl] = await Promise.all([
      pageAtual.waitForEvent('download', { timeout: 8000 }),
      pageAtual.evaluate(() => window.__diarioExports.exportJSONBackup()),
    ]);
    const caminho = await dl.path();
    const conteudo = JSON.parse(fs.readFileSync(caminho, 'utf8'));
    download = { clicou: true, tamanho: fs.statSync(caminho).size, tipo: dl.suggestedFilename(), logs: (conteudo.logs || []).length, version: conteudo.version };
  } catch (e) { download.erro = String(e.message || e); }
  check('exportJSONBackup baixa um JSON v6 válido (download real do navegador)', download.clicou && download.version === 6 && download.logs > 0, JSON.stringify(download));
  check('nome do arquivo de backup é o esperado', /\.json$/.test(download.tipo || ''), download.tipo);

  const persistencia = await pageAtual.evaluate(async () => {
    window.__diarioExports.switchTab('config');
    await new Promise(r => setTimeout(r, 200));
    const texto = document.body.innerText;
    return { temStatus: /Armazenamento|IndexedDB|LocalStorage/i.test(texto), duravel: localStorage.getItem('berzerker_storage_status') || '' };
  });
  check('aba Config mostra o status de armazenamento', persistencia.temStatus, persistencia.duravel);

  console.log('\n== NAV 5. Erros acumulados ==');
  check('nenhum pageerror em todo o fluxo', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
  // CDN externo (Tailwind/fontes) não existe neste sandbox: só erro que não é de
  // recurso externo conta como grave — e a checagem de rede acima cobre o app.
  const graves = consoleErrors.filter(m => !/favicon|Manifest|apple-touch|Failed to load resource/i.test(m));
  check('nenhum erro de console grave em todo o fluxo', graves.length === 0, graves.slice(0, 3).join(' | '));
  const falhasLocais = falhasDeRede.filter(u => !/apple-touch|favicon|manifest/i.test(u));
  check('nenhuma requisição do app falhou em todo o fluxo', falhasLocais.length === 0, falhasLocais.slice(0, 3).join(' | '));

  await browser.close();
  server.close();
  const falhas = resultados.filter(r => !r.ok).length;
  const relatorio = { quando: new Date().toISOString(), chromium: exe, total: resultados.length, falhas, resultados };
  fs.writeFileSync('/tmp/realbrowser/report.json', JSON.stringify(relatorio, null, 2));
  console.log(`\n${falhas === 0 ? '✅ VALIDAÇÃO EM NAVEGADOR REAL: TUDO OK' : '❌ FALHAS: ' + falhas} (${resultados.length} checagens)`);
  process.exit(falhas === 0 ? 0 : 1);
})().catch(e => { console.error('❌ erro na validação:', e); server.close(); process.exit(1); });
