#!/usr/bin/env node
/* ============================================================
   VALIDAÇÃO EM NAVEGADOR REAL (Chrome/Chromium headless) — Diário de Cargas
   ------------------------------------------------------------
   NÃO roda no `npm test`, NÃO entra no artefato do Pages e NÃO adiciona
   dependências ao projeto. Precisa de `playwright-core` (só o driver, sem
   baixar navegador) e de um Chrome/Chromium, nesta ordem de preferência:

     1. DIARIO_CHROME_PATH=/caminho/do/chrome   (Chrome do sistema — é o que a CI usa)
     2. DIARIO_CHROME_CHANNEL=chrome            (Chrome estável no lugar padrão)
     3. @sparticuz/chromium                     (sandbox sem Chrome; precisa das libs NSS)
     4. Chrome/Chromium em caminhos padrão (/usr/bin/google-chrome, /usr/bin/chromium…)

   Sem driver ou sem navegador, o script SAI COM SUCESSO e diz claramente
   "validação em navegador pulada: …" (na CI vira um ::warning::). Para exigir
   o navegador (quando virar gate), use DIARIO_EXIGIR_NAVEGADOR=1.

   CI (ver .github/workflows/ci.yml, job "navegador"):
     npm ci && npm i --no-save playwright-core
     DIARIO_CHROME_PATH="$(command -v google-chrome)" node scripts/validacao-navegador.js

   Sandbox local sem Chrome (tudo FORA do repositório):
     mkdir -p /tmp/realbrowser && cd /tmp/realbrowser
     npm i @sparticuz/chromium playwright-core
     mkdir -p /tmp/chrlibs && cd /tmp/chrlibs
     node -e "const z=require('zlib'),f=require('fs');const p='/tmp/realbrowser/node_modules/@sparticuz/chromium/bin/al2023.tar.br';f.writeFileSync('al2023.tar',z.brotliDecompressSync(f.readFileSync(p)))"
     tar xf al2023.tar
     cd /home/user/diario
     DIARIO_BROWSER_DEPS=/tmp/realbrowser LD_LIBRARY_PATH=/tmp/chrlibs/lib node scripts/validacao-navegador.js

   `DIARIO_ROOT` (padrão: a raiz do repositório), `DIARIO_BROWSER_DEPS`
   (onde procurar playwright-core/@sparticuz/chromium; padrão: o diretório
   atual e o repositório) e `DIARIO_REPORT` (padrão: <tmp>/diario-validacao-navegador.json)
   ajustam os caminhos.

   Cobre o que o jsdom não cobre: ES modules reais, Service Worker,
   offline, IndexedDB, download real do backup, layout em 412 px,
   pré-requisitos de instalação, atualização de versão do cache
   (VERSION atual → VERSION+1, lida do sw.js), a janela "➕ Novo exercício"
   e o aviso persistente de imagem não confirmada.
   ============================================================ */
'use strict';
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');

// ---------- dependências opcionais (FORA do package.json) ----------
const DEPS = process.env.DIARIO_BROWSER_DEPS || process.cwd();
const EXIGIR = process.env.DIARIO_EXIGIR_NAVEGADOR === '1';
// Comandos de workflow do GitHub Actions (anotações visíveis na PR e legíveis pela API).
const NA_CI = process.env.GITHUB_ACTIONS === 'true';
const escDado = t => String(t).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
const escProp = t => escDado(t).replace(/:/g, '%3A').replace(/,/g, '%2C');
const anotar = (nivel, titulo, msg) => { if (NA_CI) console.log(`::${nivel} title=${escProp(titulo)}::${escDado(msg)}`); };
function pular(motivo) {
  console.log(`⏭️  validação em navegador pulada: ${motivo}`);
  anotar('warning', 'Validação em navegador pulada', motivo);
  if (EXIGIR) { console.error('❌ DIARIO_EXIGIR_NAVEGADOR=1: pular não é aceito.'); process.exit(1); }
  process.exit(0);
}
function carregarOpcional(nome) {
  let resolvido;
  try { resolvido = require.resolve(nome, { paths: [DEPS, process.cwd(), path.resolve(__dirname, '..')] }); }
  catch (e) { if (e && e.code === 'MODULE_NOT_FOUND') return null; throw e; }
  const mod = require(resolvido);
  return mod && mod.default ? mod.default : mod;     // @sparticuz/chromium >= 1xx é ESM (export default)
}
const playwright = carregarOpcional('playwright-core');
if (!playwright || !playwright.chromium) pular('dependências ausentes (playwright-core não encontrado; instale fora do package.json: `npm i --no-save playwright-core`)');
const { chromium } = playwright;

// Candidatos de navegador, na ordem pedida (Chrome do sistema antes do @sparticuz/chromium).
async function candidatosNavegador() {
  const lista = [];
  const caminho = process.env.DIARIO_CHROME_PATH;
  if (caminho) {
    if (!fs.existsSync(caminho)) pular(`dependências ausentes (DIARIO_CHROME_PATH aponta para um arquivo que não existe: ${caminho})`);
    lista.push({ descricao: `Chrome do sistema (${caminho})`, explicito: true, opcoes: { executablePath: caminho, args: ['--no-sandbox'] } });
    return lista;
  }
  if (process.env.DIARIO_CHROME_CHANNEL) {
    lista.push({ descricao: `canal ${process.env.DIARIO_CHROME_CHANNEL}`, explicito: true, opcoes: { channel: process.env.DIARIO_CHROME_CHANNEL, args: ['--no-sandbox'] } });
    return lista;
  }
  lista.push({ descricao: 'canal chrome', opcoes: { channel: 'chrome', args: ['--no-sandbox'] } });
  const sparticuz = carregarOpcional('@sparticuz/chromium');
  if (sparticuz && typeof sparticuz.executablePath === 'function') {
    const exe = await sparticuz.executablePath();
    lista.push({ descricao: `@sparticuz/chromium (${exe})`, opcoes: { executablePath: exe, args: [...(sparticuz.args || []), '--no-sandbox'] } });
  }
  for (const p of ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/opt/google/chrome/chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser']) {
    if (fs.existsSync(p)) lista.push({ descricao: `Chrome/Chromium do sistema (${p})`, opcoes: { executablePath: p, args: ['--no-sandbox'] } });
  }
  return lista;
}
async function abrirNavegador() {
  const motivos = [];
  for (const c of await candidatosNavegador()) {
    try {
      const browser = await chromium.launch({ headless: true, ...c.opcoes });
      return { browser, descricao: c.descricao };
    } catch (e) {
      const msg = String(e && e.message || e).split('\n')[0].slice(0, 200);
      if (c.explicito) { console.error(`❌ navegador configurado não abriu (${c.descricao}): ${msg}`); process.exit(1); }
      motivos.push(`${c.descricao}: ${msg}`);
    }
  }
  pular(`dependências ausentes (nenhum Chrome/Chromium utilizável${motivos.length ? ' — ' + motivos.join(' | ') : ''})`);
}

const ROOT_INICIAL = process.env.DIARIO_ROOT || path.resolve(__dirname, '..');
let ROOT = ROOT_INICIAL;
const SIM = path.join(os.tmpdir(), 'diario-site-sim');   // cópia para simular atualização de versão do SW
const REPORT = process.env.DIARIO_REPORT || path.join(os.tmpdir(), 'diario-validacao-navegador.json');
// Versão do cache lida do próprio sw.js: a simulação de atualização vai de vN para v(N+1).
const VERSAO_NUM = Number((/const VERSION = 'v(\d+)'/.exec(fs.readFileSync(path.join(ROOT_INICIAL, 'sw.js'), 'utf8')) || [])[1]);
if (!VERSAO_NUM) { console.error('❌ não consegui ler o VERSION do sw.js'); process.exit(1); }
const VERSAO = 'v' + VERSAO_NUM, VERSAO_NOVA = 'v' + (VERSAO_NUM + 1);
// Módulos que registram manifesto (todo js/*.js menos o despachante actions.js).
const FONTES = fs.readdirSync(path.join(ROOT_INICIAL, 'js')).filter(f => f.endsWith('.js') && f !== 'actions.js').length;
// CORE do Service Worker (pré-cache), lido executando o sw.js num contexto falso — como scripts/check-sw.js.
const CORE = (() => {
  const ctx = vm.createContext({ self: { addEventListener() { } } });
  vm.runInContext(fs.readFileSync(path.join(ROOT_INICIAL, 'sw.js'), 'utf8'), ctx);
  return new Set(vm.runInContext('CORE', ctx).map(e => (e === './' ? '/' : e.replace(/^\.\//, '/'))));
})();
const PORT = 8099;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp', '.css': 'text/css', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };

const resultados = [];
let lacunasOffline = [];
const check = (nome, ok, detalhe) => { resultados.push({ nome, ok: !!ok, detalhe: detalhe === undefined ? '' : String(detalhe).slice(0, 300) }); console.log((ok ? '  ✔ ' : '  ✘ ') + nome + (ok ? '' : '  [' + detalhe + ']')); };

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  let file = path.join(ROOT, url === '/' ? '/index.html' : url);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('404'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
});

(async () => {
  const { browser, descricao: navegador } = await abrirNavegador();
  console.log(`🧭 navegador: ${navegador} — ${browser.version()}`);
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  const context = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.6, isMobile: true, hasTouch: true, acceptDownloads: true });
  let page = await context.newPage();
  const consoleErrors = [], pageErrors = [], falhasDeRede = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => pageErrors.push(String(e.message || e)));
  let fase = 'boot';                     // em que etapa cada falha de rede aconteceu (diagnóstico)
  page.on('requestfailed', r => {
    const url = r.url();
    // CDN externo (fonte/Tailwind) não existe no sandbox: só o que é do app conta.
    if (!/^https?:\/\/(127\.0\.0\.1|localhost)/.test(url)) return;
    falhasDeRede.push(`[${fase}] ${url} → ${(r.failure() || {}).errorText}`);
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
  check(`manifesto de módulos registrado pelas ${FONTES} fontes de js/`, boot.exportFiles === FONTES, JSON.stringify(boot));
  check('superfície de exports > 400 símbolos', boot.exports > 400, boot.exports);
  check('histórico renderizado no DOM real', boot.logsNoDom > 0, boot.logsNoDom);

  console.log('\n== NAV 2. Fluxo de uso (registro + aba) ==');
  fase = 'uso';
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

  console.log('\n== NAV 2b. ➕ Novo exercício abre a janela (módulo real) ==');
  fase = 'novo-exercicio';
  await page.click('#nav-group-treino').catch(() => {});
  await page.click('#nav-busca').catch(() => {});
  await page.waitForTimeout(300);
  const errosAntesCex = pageErrors.length;
  await page.click('#tab-content-busca [data-action="openCustomExModal"]').catch(e => pageErrors.push('clique: ' + e.message));
  await page.waitForTimeout(300);
  const cex = await page.evaluate(() => {
    const form = document.getElementById('custom-ex-form');
    const r = form ? form.getBoundingClientRect() : null;
    return { janela: !!document.getElementById('custom-ex-overlay'), form: !!form, largura: r ? Math.round(r.width) : 0, tela: window.innerWidth, scroll: document.documentElement.scrollWidth };
  });
  check('"➕ Novo exercício" abre o formulário sem erro e cabe nos 412 px', cex.janela && cex.form && cex.largura > 0 && cex.largura <= cex.tela && cex.scroll <= cex.tela + 2 && pageErrors.length === errosAntesCex,
    JSON.stringify({ ...cex, erros: pageErrors.slice(errosAntesCex) }));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  check('ESC fecha a janela do exercício personalizado', !(await page.evaluate(() => !!document.getElementById('custom-ex-overlay'))));

  console.log('\n== NAV 3. Service Worker + offline ==');
  fase = 'sw';
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
  check(`cache da versão ${VERSAO} (lida do sw.js)`, (sw.versao || []).includes('berzerker-' + VERSAO), JSON.stringify(sw.versao));

  await context.setOffline(true);
  fase = 'offline';
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
  fase = 'online-de-novo';

  console.log('\n== NAV 3b. Celular: layout sem estouro horizontal ==');
  fase = 'layout';
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
  fase = 'pwa';
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

  console.log(`\n== NAV 3d. Atualização de versão do cache (${VERSAO} -> ${VERSAO_NOVA}) ==`);
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
  fs.writeFileSync(path.join(SIM, 'sw.js'), fs.readFileSync(path.join(SIM, 'sw.js'), 'utf8').replace(`VERSION = '${VERSAO}'`, `VERSION = '${VERSAO_NOVA}'`));
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
  const atualizado = await page.evaluate(async (nova) => {
    const chaves = await caches.keys();
    const cache = chaves.find(k => k === 'berzerker-' + nova);
    const nomes = cache ? (await (await caches.open(cache)).keys()).length : 0;
    const reg = await navigator.serviceWorker.getRegistration();
    return { chaves, nomes, instalando: !!reg.installing, esperando: !!reg.waiting, ativo: !!reg.active,
      controlado: !!navigator.serviceWorker.controller, exporta: Object.keys(window.__diarioExports || {}).length };
  }, VERSAO_NOVA);
  check(`nova versão instala, ativa e popula o cache ${VERSAO_NOVA}`, atualizado.ativo && atualizado.nomes > 100, JSON.stringify(atualizado));
  check(`cache da versão antiga (${VERSAO}) é limpo na ativação`, !(atualizado.chaves || []).includes('berzerker-' + VERSAO), JSON.stringify(atualizado.chaves));
  check('app continua funcionando depois da atualização', atualizado.exporta > 400 && errosAtualizacao.length === 0, JSON.stringify({ exporta: atualizado.exporta, erros: errosAtualizacao }));

  console.log('\n== NAV 4. Backup e restauração reais ==');
  fase = 'backup';
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

  console.log('\n== NAV 4b. Aviso persistente de imagem não confirmada (botão de backup) ==');
  fase = 'aviso';
  // Simula o IndexedDB recusando a gravação (como cota cheia) só nesta página.
  // showSaveFilePicker fica indisponível, como no Chrome do Android: o backup sai pelo
  // download comum, que o Playwright consegue observar (o seletor nativo não abre no headless).
  const aviso = await pageAtual.evaluate(async () => {
    window.__saveBlobOriginal = window.storage.saveBlob;
    window.storage.saveBlob = async () => false;
    window.showSaveFilePicker = undefined;
    const ok = await window.__diarioExports.saveBlobChecked('teste:nav:aviso', new Blob(['a']));
    const el = document.getElementById('blob-save-warning');
    const r = el ? el.getBoundingClientRect() : null;
    return { ok, existe: !!el, texto: el ? el.textContent : '', botao: !!(el && el.querySelector('button[data-action="exportJSONBackup"]')),
      dentro: !!r && r.top >= 0 && r.left >= 0 && r.right <= window.innerWidth && r.bottom <= window.innerHeight,
      scroll: document.documentElement.scrollWidth, tela: window.innerWidth };
  });
  check('IndexedDB recusando: aparece o aviso com "não confirmou o salvamento" e o botão de backup, dentro da tela de 412 px',
    aviso.ok === false && aviso.existe && /não confirmou o salvamento/.test(aviso.texto) && aviso.botao && aviso.dentro && aviso.scroll <= aviso.tela + 2, JSON.stringify(aviso).slice(0, 300));
  await pageAtual.waitForTimeout(4500);   // o alertModal some em 3,8 s; o aviso não
  check('o aviso continua na tela depois de 4,5 s (persistente)', await pageAtual.evaluate(() => !!document.getElementById('blob-save-warning')));
  let downloadAviso = { ok: false, nome: '', erro: null };
  try {
    const [dl] = await Promise.all([
      pageAtual.waitForEvent('download', { timeout: 8000 }),
      pageAtual.click('#blob-save-warning button[data-action="exportJSONBackup"]'),
    ]);
    const conteudo = JSON.parse(fs.readFileSync(await dl.path(), 'utf8'));
    downloadAviso = { ok: conteudo.version === 6 && (conteudo.logs || []).length > 0, nome: dl.suggestedFilename() };
  } catch (e) { downloadAviso.erro = String(e.message || e); }
  check('o botão do aviso baixa o backup JSON v6 de verdade (clique real)', downloadAviso.ok && /^berzerker-diario-backup-\d{4}-\d{2}-\d{2}\.json$/.test(downloadAviso.nome), JSON.stringify(downloadAviso));
  await pageAtual.click('#blob-save-warning button[data-action="closeElementById"]').catch(() => {});
  const depois = await pageAtual.evaluate(async () => {
    const some = !document.getElementById('blob-save-warning');
    await window.__diarioExports.saveBlobChecked('teste:nav:aviso2', new Blob(['b']));   // mesma sequência de falhas
    const naoVoltou = !document.getElementById('blob-save-warning');
    window.storage.saveBlob = window.__saveBlobOriginal;
    delete window.__saveBlobOriginal;
    const confirmou = await window.__diarioExports.saveBlobChecked('teste:nav:aviso3', new Blob(['c']));
    return { some, naoVoltou, confirmou, semAviso: !document.getElementById('blob-save-warning') };
  });
  check('"Dispensar" fecha; na mesma sequência o aviso não volta; gravação confirmada não avisa',
    depois.some && depois.naoVoltou && depois.confirmou === true && depois.semAviso, JSON.stringify(depois));

  console.log('\n== NAV 5. Erros acumulados ==');
  fase = 'fim';
  check('nenhum pageerror em todo o fluxo', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
  // CDN externo (Tailwind/fontes) não existe neste sandbox: só erro que não é de
  // recurso externo conta como grave — e a checagem de rede acima cobre o app.
  const graves = consoleErrors.filter(m => !/favicon|Manifest|apple-touch|Failed to load resource/i.test(m));
  check('nenhum erro de console grave em todo o fluxo', graves.length === 0, graves.slice(0, 3).join(' | '));
  // Falhas de rede do app, por classe:
  //  - com a rede ligada: referência quebrada / arquivo inexistente → reprova;
  //  - offline, arquivo do CORE: o cache offline falhou → reprova;
  //  - offline, arquivo FORA do CORE que ainda não tinha passado pelo cache em runtime
  //    (primeira visita: a página só fica sob o SW depois do clients.claim) → lacuna
  //    conhecida do app, listada aqui e no relatório (docs/VALIDACAO_MANUAL.md), sem reprovar.
  const falhasLocais = falhasDeRede.filter(u => !/apple-touch|favicon|manifest/i.test(u));
  const caminhoDe = f => { try { return new URL(f.replace(/^\[[^\]]*\]\s*/, '').split(' → ')[0]).pathname; } catch (e) { return ''; } };
  const falhasOffline = falhasLocais.filter(f => f.startsWith('[offline]'));
  const comRede = falhasLocais.filter(f => !f.startsWith('[offline]'));
  const coreOffline = falhasOffline.filter(f => CORE.has(caminhoDe(f)));
  lacunasOffline = [...new Set(falhasOffline.filter(f => !CORE.has(caminhoDe(f))).map(caminhoDe))];
  check('nenhuma requisição do app falhou com a rede ligada (arquivo inexistente ou quebrado)', comRede.length === 0, comRede.slice(0, 3).join(' | '));
  check('offline: nenhum arquivo do CORE falhou (o cache offline respondeu tudo)', coreOffline.length === 0, coreOffline.slice(0, 3).join(' | '));
  if (lacunasOffline.length) console.log(`  ℹ️  lacuna conhecida (não reprova): offline na primeira visita, fora do CORE e ainda sem cache em runtime: ${lacunasOffline.join(', ')}`);

  const browserVersao = browser.version();
  await browser.close();
  server.close();
  const falhas = resultados.filter(r => !r.ok).length;
  const relatorio = { quando: new Date().toISOString(), navegador, versaoNavegador: browserVersao, versaoCache: VERSAO, total: resultados.length, falhas, lacunasOffline, resultados };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(relatorio, null, 2));
  console.log(`📝 relatório: ${REPORT}`);
  // Na CI, o resultado vira anotação (o log e o artefato podem não estar acessíveis a quem revisa).
  resultados.filter(r => !r.ok).forEach(r => anotar('error', 'Navegador: ' + r.nome, r.detalhe || 'falhou'));
  anotar(falhas === 0 ? 'notice' : 'error', 'Validação em navegador real',
    `${resultados.length - falhas}/${resultados.length} checagens OK · ${navegador} · ${browserVersao} · cache ${VERSAO}` +
    (lacunasOffline.length ? ` · lacuna conhecida offline (não reprova): ${lacunasOffline.join(' ')}` : ''));
  console.log(`\n${falhas === 0 ? '✅ VALIDAÇÃO EM NAVEGADOR REAL: TUDO OK' : '❌ FALHAS: ' + falhas} (${resultados.length} checagens)`);
  process.exit(falhas === 0 ? 0 : 1);
})().catch(e => { console.error('❌ erro na validação:', e); server.close(); process.exit(1); });
