/* ============================================================
   TESTES DO SERVICE WORKER (sw.js) — sem navegador
   ------------------------------------------------------------
   Executa o sw.js de verdade num ambiente com caches, fetch e
   eventos FALSOS, e confere: sintaxe, lista CORE, instalação, falha
   de cache na instalação (observável), ativação/limpeza de caches
   antigos, estratégia de rede com fallback offline, e a regra que
   exige VERSION nova quando js/ ou images/ mudam.
   Rode com: node test_sw.js
   ============================================================ */
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { execFileSync, spawnSync } = require('child_process');

const REPO = __dirname;
const SW_SRC = fs.readFileSync(path.join(REPO, 'sw.js'), 'utf8');
const BASE = 'https://app.test/diario/';

let failures = 0;
function check(name, cond, extra) {
    if (cond) console.log('  ✔', name);
    else { failures++; console.log('  ✘', name, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : ''); }
}

// ---------- mocks de Cache, Request, Response, fetch ----------
class FakeRequest {
    constructor(url, init = {}) { this.url = new URL(String(url && url.url ? url.url : url), BASE).href; this.method = init.method || (url && url.method) || 'GET'; this.mode = init.mode || (url && url.mode) || 'cors'; }
}
class FakeResponse {
    constructor(body = 'ok', { status = 200, type = 'basic' } = {}) { this.body = body; this.status = status; this.ok = status >= 200 && status < 300; this.type = type; }
    clone() { return new FakeResponse(this.body, { status: this.status, type: this.type }); }
    static error() { return new FakeResponse('', { status: 0, type: 'error' }); }
}
let netDown = false;
const netFailUrls = new Set();     // URLs que falham (404) na rede
const netLog = [];
async function fakeFetch(req) {
    const r = req instanceof FakeRequest ? req : new FakeRequest(req);
    netLog.push(r.url);
    if (netDown) throw new TypeError('offline');
    if (netFailUrls.has(r.url)) return new FakeResponse('nf', { status: 404 });
    if (r.mode === 'no-cors') return new FakeResponse('opaque', { status: 0, type: 'opaque' });
    return new FakeResponse('net:' + r.url);
}
class FakeCache {
    constructor() { this.m = new Map(); }
    key(req) { return new FakeRequest(req).url; }
    async put(req, res) { this.m.set(this.key(req), res); }
    async match(req, opts = {}) {
        const k = this.key(req);
        if (this.m.has(k)) return this.m.get(k);
        if (opts.ignoreSearch) { const sem = k.split('?')[0]; for (const [kk, v] of this.m) if (kk.split('?')[0] === sem) return v; }
        return undefined;
    }
    async addAll(list) {
        for (const u of list) {
            const r = await fakeFetch(new FakeRequest(u));
            if (!r.ok) throw new TypeError(`addAll falhou em ${u} (HTTP ${r.status})`);
            this.m.set(this.key(u), r);
        }
    }
}
class FakeCaches {
    constructor() { this.store = new Map(); }
    async open(name) { if (!this.store.has(name)) this.store.set(name, new FakeCache()); return this.store.get(name); }
    async keys() { return [...this.store.keys()]; }
    async delete(name) { return this.store.delete(name); }
}

// ---------- carrega o sw.js num contexto isolado ----------
function carregarSW(extra = {}) {
    const listeners = {};
    const caches = new FakeCaches();
    const clients = { claimed: false, claim() { this.claimed = true; return Promise.resolve(); } };
    let skipWaiting = 0;
    const self = {
        addEventListener: (t, fn) => { listeners[t] = fn; },
        skipWaiting: () => { skipWaiting++; return Promise.resolve(); },
        clients
    };
    const ctx = vm.createContext({
        self, caches, clients, location: new URL('sw.js', BASE), Request: FakeRequest, Response: FakeResponse,
        fetch: fakeFetch, URL, AbortController, setTimeout, clearTimeout, console, Promise, ...extra
    });
    vm.runInContext(SW_SRC, ctx, { filename: 'sw.js' });
    return {
        listeners, caches, clients, ctx,
        get skipWaitingCalls() { return skipWaiting; },
        CORE: vm.runInContext('CORE', ctx), CACHE: vm.runInContext('CACHE', ctx), EXTERNAL: vm.runInContext('EXTERNAL', ctx)
    };
}
// Dispara um evento de ciclo de vida e aguarda todas as promessas de waitUntil.
async function dispararCiclo(sw, tipo) {
    const promessas = [];
    sw.listeners[tipo]({ waitUntil: p => promessas.push(Promise.resolve(p)) });
    return Promise.allSettled(promessas);
}
// Dispara fetch e devolve a resposta (ou undefined se o SW não interceptou).
async function disparaFetch(sw, url, { method = 'GET', mode = 'cors' } = {}) {
    let resposta;
    let interceptou = false;
    sw.listeners.fetch({
        request: new FakeRequest(url, { method, mode }),
        respondWith(p) { interceptou = true; resposta = Promise.resolve(p); }
    });
    if (!interceptou) return { interceptou: false };
    return { interceptou: true, res: await resposta };
}

(async () => {
    console.log('\n== SW 1. Sintaxe e lista de cache ==');
    let sintaxeOk = true, sintaxeErr = '';
    try { new vm.Script(SW_SRC, { filename: 'sw.js' }); } catch (e) { sintaxeOk = false; sintaxeErr = e.message; }
    check('sw.js compila (node --check equivalente)', sintaxeOk, sintaxeErr);

    const sw = carregarSW();
    check('CORE e VERSION carregam sem erro', Array.isArray(sw.CORE) && sw.CORE.length > 100, sw.CORE && sw.CORE.length);
    const dup = sw.CORE.filter((x, i) => sw.CORE.indexOf(x) !== i);
    check('CORE sem entradas duplicadas', dup.length === 0, dup);
    check('todo caminho de CORE é relativo "./"', sw.CORE.every(p => p.startsWith('./')), sw.CORE.filter(p => !p.startsWith('./')));
    const ausentes = sw.CORE.filter(p => p !== './' && !fs.existsSync(path.join(REPO, p.slice(2))));
    check('todo arquivo de CORE existe no repositório', ausentes.length === 0, ausentes);
    // Regressão: as conquistas estavam sem vírgula no array (SyntaxError que derrubava o SW inteiro).
    const badgesDisco = fs.readdirSync(path.join(REPO, 'images', 'badges')).filter(f => f.endsWith('.webp')).map(f => './images/badges/' + f);
    check('todas as conquistas (badges) do disco estão no CORE', badgesDisco.length > 0 && badgesDisco.every(b => sw.CORE.includes(b)), badgesDisco.filter(b => !sw.CORE.includes(b)));
    // B5/D8: exatamente as imagens de patentes e cards previstas entram no precache.
    const patentesDisco = fs.readdirSync(path.join(REPO, 'images', 'patentes')).filter(f => f.endsWith('.webp')).sort().map(f => './images/patentes/' + f);
    const cardsDisco = fs.readdirSync(path.join(REPO, 'images', 'cards')).filter(f => f.endsWith('.webp')).sort().map(f => './images/cards/' + f);
    const b5Disco = [...patentesDisco, ...cardsDisco];
    const b5Bytes = b5Disco.reduce((soma, p) => soma + fs.statSync(path.join(REPO, p.slice(2))).size, 0);
    check('B5: disco tem 100 patentes + 10 cards = 110 imagens .webp', patentesDisco.length === 100 && cardsDisco.length === 10 && b5Disco.length === 110, [patentesDisco.length, cardsDisco.length]);
    check('B5: todas as 110 imagens de patentes/cards estão no CORE (sem extras desses diretórios)', b5Disco.every(b => sw.CORE.includes(b)) && sw.CORE.filter(p => /^\.\/images\/(patentes|cards)\//.test(p)).length === 110, sw.CORE.filter(p => /^\.\/images\/(patentes|cards)\//.test(p)).length);
    check('B5: tamanho total das 110 imagens fica na faixa esperada (~1,2 MB)', b5Bytes > 1_000_000 && b5Bytes < 1_300_000, b5Bytes);

    console.log('\n== SW 2. Instalação ==');
    const r1 = await dispararCiclo(sw, 'install');
    check('instalação conclui sem erro', r1.every(x => x.status === 'fulfilled'), r1);
    const cache = await sw.caches.open(sw.CACHE);
    check('todos os arquivos de CORE foram gravados no cache da versão', sw.CORE.every(p => cache.m.has(new FakeRequest(p).url)), sw.CORE.filter(p => !cache.m.has(new FakeRequest(p).url)));
    check('instalação chama skipWaiting (atualização imediata)', sw.skipWaitingCalls === 1, sw.skipWaitingCalls);
    check('fontes externas tentadas no install (falha não bloqueia)', netLog.some(u => u.startsWith('https://fonts.googleapis.com')));

    console.log('\n== SW 3. Falha de cache na instalação é observável ==');
    const swFalha = carregarSW();
    const urlRuim = new FakeRequest(swFalha.CORE[5]).url;
    netFailUrls.add(urlRuim);
    const r2 = await dispararCiclo(swFalha, 'install');
    netFailUrls.delete(urlRuim);
    check('CORE com arquivo faltando REJEITA a instalação (não ativa versão incompleta)', r2.some(x => x.status === 'rejected'), r2.map(x => x.status));
    const motivo = r2.find(x => x.status === 'rejected');
    check('o erro de instalação nomeia o arquivo que falhou', !!motivo && String(motivo.reason && motivo.reason.message).includes(swFalha.CORE[5]), motivo && motivo.reason && motivo.reason.message);
    check('skipWaiting NÃO é chamado quando a instalação falha', swFalha.skipWaitingCalls === 0, swFalha.skipWaitingCalls);

    console.log('\n== SW 3b. B5: falha num item do precache não aposenta a versão anterior; corrigida, a atualização completa ==');
    const swB5 = carregarSW();
    const cacheAntigo = await swB5.caches.open('berzerker-v46');
    await cacheAntigo.put('./index.html', new FakeResponse('versao-anterior'));
    const alvoB5 = './images/patentes/classico-01.webp';
    netFailUrls.add(new FakeRequest(alvoB5).url);
    const rB5falha = await dispararCiclo(swB5, 'install');
    check('B5: falha numa imagem de patente REJEITA a instalação da nova versão', rB5falha.some(x => x.status === 'rejected'), rB5falha.map(x => x.status));
    check('B5: skipWaiting não é chamado com o precache incompleto', swB5.skipWaitingCalls === 0, swB5.skipWaitingCalls);
    // Sem ativação da versão incompleta, o cache da versão anterior segue intacto e servível.
    const nomesAposFalha = await swB5.caches.keys();
    const anterior = nomesAposFalha.includes('berzerker-v46') ? await (await swB5.caches.open('berzerker-v46')).match('./index.html') : undefined;
    check('B5: versão anterior funcional permanece disponível após a falha', !!anterior && anterior.body === 'versao-anterior', nomesAposFalha);
    netFailUrls.delete(new FakeRequest(alvoB5).url);
    const rB5ok = await dispararCiclo(swB5, 'install');
    const cacheNovoB5 = await swB5.caches.open(swB5.CACHE);
    check('B5: removida a falha, a instalação completa é aprovada', rB5ok.every(x => x.status === 'fulfilled'), rB5ok.map(x => x.status));
    check('B5: após a recuperação, todas as 110 imagens estão no cache novo', b5Disco.every(p => cacheNovoB5.m.has(new FakeRequest(p).url)), b5Disco.filter(p => !cacheNovoB5.m.has(new FakeRequest(p).url)).slice(0, 3));
    const rB5ativa = await dispararCiclo(swB5, 'activate');
    const nomesAposAtiva = await swB5.caches.keys();
    check('B5: só após a instalação completa a ativação troca para a nova versão', rB5ativa.every(x => x.status === 'fulfilled') && nomesAposAtiva.includes(swB5.CACHE) && !nomesAposAtiva.includes('berzerker-v46'), nomesAposAtiva);

    console.log('\n== SW 4. Ativação limpa caches antigos ==');
    const sw4 = carregarSW();
    await sw4.caches.open('berzerker-v1');
    await sw4.caches.open('outro-app-cache');
    await sw4.caches.open(sw4.CACHE);
    const r3 = await dispararCiclo(sw4, 'activate');
    const nomes = await sw4.caches.keys();
    check('ativação conclui', r3.every(x => x.status === 'fulfilled'));
    check('caches de versões antigas são apagados', !nomes.includes('berzerker-v1') && !nomes.includes('outro-app-cache'), nomes);
    check('cache da versão atual é preservado', nomes.includes(sw4.CACHE), nomes);
    check('ativação assume os clientes abertos (clients.claim)', sw4.clients.claimed === true);

    console.log('\n== SW 5. Estratégia de rede com fallback offline ==');
    const sw5 = carregarSW();
    await dispararCiclo(sw5, 'install');
    netDown = false;
    const online = await disparaFetch(sw5, './js/app.js');
    check('online: arquivo do app vem da rede (rede primeiro)', online.res.body === 'net:' + new FakeRequest('./js/app.js').url, online.res && online.res.body);
    netDown = true;
    const offline = await disparaFetch(sw5, './js/actions.js');
    check('offline: arquivo do app vem do cache instalado (fallback, status 200)', !!offline.res && offline.res.ok === true && offline.res.type === 'basic', offline.res && [offline.res.status, offline.res.type]);
    const nav = await disparaFetch(sw5, './rota-inexistente/', { mode: 'navigate' });
    check('offline: navegação cai no index.html em cache', nav.res && ok200(nav.res) && (nav.res.body === 'ok' || String(nav.res.body).includes('index.html')), nav.res && nav.res.body);
    const naoNav = await disparaFetch(sw5, './nao-existe.json');
    check('offline sem cache e sem navegação: erro de rede (Response.error)', naoNav.res && naoNav.res.type === 'error', naoNav.res && naoNav.res.type);
    const post = await disparaFetch(sw5, './js/app.js', { method: 'POST' });
    check('requisições que não são GET não são interceptadas', post.interceptou === false);
    netDown = false;
    const externo = await disparaFetch(sw5, 'https://fonts.googleapis.com/css2?family=Inter');
    check('externos usam cache primeiro (cacheFirst)', externo.interceptou === true);
    netDown = false;

    console.log('\n== SW 6. Regra de versão do cache (scripts/check-sw-version.js) ==');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-version-'));
    const git = args => execFileSync('git', args, { cwd: tmp, stdio: 'pipe', encoding: 'utf8' });
    // Repositório temporário com branch "main" (base) e branch de trabalho: a checagem real
    // compara com main. Se a checagem pular (base não encontrada), o teste FALHA.
    const checar = () => spawnSync(process.execPath, [path.join(REPO, 'scripts', 'check-sw-version.js')], { cwd: tmp, encoding: 'utf8' });
    const avaliado = r => !/checagem pulada/.test(r.stdout + r.stderr);
    try {
        git(['init', '-q', '-b', 'main']); git(['config', 'user.email', 't@t']); git(['config', 'user.name', 't']);
        fs.mkdirSync(path.join(tmp, 'js')); fs.writeFileSync(path.join(tmp, 'js', 'a.js'), 'x=1');
        fs.writeFileSync(path.join(tmp, 'sw.js'), "const VERSION = 'v10';\n");
        git(['add', '-A']); git(['commit', '-qm', 'base']);
        git(['checkout', '-q', '-b', 'feat']);
        fs.writeFileSync(path.join(tmp, 'js', 'a.js'), 'x=2');
        git(['add', '-A']); git(['commit', '-qm', 'muda js sem bump']);
        const semBump = checar();
        check('a checagem de versão foi de fato executada (não pulada)', avaliado(semBump), semBump.stdout + semBump.stderr);
        check('mudança em js/ sem subir VERSION é REPROVADA', semBump.status !== 0, semBump.stdout + semBump.stderr);
        fs.writeFileSync(path.join(tmp, 'sw.js'), "const VERSION = 'v11';\n");
        git(['add', '-A']); git(['commit', '-qm', 'bump']);
        const comBump = checar();
        check('mesma mudança com VERSION v11 é APROVADA', comBump.status === 0 && avaliado(comBump), comBump.stdout + comBump.stderr);
        git(['checkout', '-q', '-b', 'so-img', 'main']);
        fs.mkdirSync(path.join(tmp, 'images')); fs.writeFileSync(path.join(tmp, 'images', 'x.webp'), 'img');
        git(['add', '-A']); git(['commit', '-qm', 'imagem nova']);
        const imgSemBump = checar();
        check('mudança em images/ também exige bump', imgSemBump.status !== 0 && avaliado(imgSemBump), imgSemBump.stdout + imgSemBump.stderr);
    } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
    }

    console.log('\n== SW 7. Checagem de sintaxe pega um erro introduzido ==');
    const tmp2 = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-syntax-'));
    try {
        const quebrado = SW_SRC.replace("'./images/badges/primeiro-sangue.webp'", "'./images/badges/primeiro-sangue.webp' './images/badges/ofensiva-semanal.webp'");
        fs.writeFileSync(path.join(tmp2, 'sw.js'), quebrado);
        const r = spawnSync(process.execPath, ['--check', path.join(tmp2, 'sw.js')], { encoding: 'utf8' });
        check('node --check reprova entrada sem vírgula (SyntaxError)', r.status !== 0 && /SyntaxError/.test(r.stderr), r.stderr.slice(0, 200));
        const r2 = spawnSync(process.execPath, [path.join(REPO, 'scripts', 'check-sw.js'), tmp2], { encoding: 'utf8' });
        check('scripts/check-sw.js reprova o mesmo sw.js com diagnóstico de linha', r2.status !== 0 && /sintaxe/i.test(r2.stderr) && /linha \d+/.test(r2.stderr), r2.stderr.slice(0, 300));
        const faltando = SW_SRC.replace("'./icon-192.png',", "'./icon-192-nao-existe.png',");
        fs.writeFileSync(path.join(tmp2, 'sw.js'), faltando);
        const r3 = spawnSync(process.execPath, [path.join(REPO, 'scripts', 'check-sw.js'), REPO.toString() && tmp2], { encoding: 'utf8' });
        check('check-sw.js reprova CORE apontando para arquivo inexistente', r3.status !== 0 && /icon-192-nao-existe/.test(r3.stderr), r3.stderr.slice(0, 300));
    } finally {
        fs.rmSync(tmp2, { recursive: true, force: true });
    }

    console.log('\n' + (failures === 0 ? '✅ TESTES DO SERVICE WORKER PASSARAM' : `❌ ${failures} FALHA(S) NO SERVICE WORKER`));
    process.exit(failures === 0 ? 0 : 1);
})().catch(e => { console.error('❌ erro inesperado nos testes do SW:', e); process.exit(1); });

function ok200(res) { return res && res.ok === true; }
