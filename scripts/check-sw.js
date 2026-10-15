#!/usr/bin/env node
/* ============================================================
   CHECAGEM DO SERVICE WORKER (sintaxe + lista de cache)
   ------------------------------------------------------------
   1) Sintaxe: compila o sw.js (equivalente a `node --check sw.js`) e mostra linha/erro.
   2) Executa o sw.js num ambiente falso (só registra os listeners) e lê VERSION e CORE.
   3) CORE: cada caminho local precisa existir na RAIZ informada. Rodando com o artefato
      publicado (`node scripts/check-sw.js _site`), valida o que o GitHub Pages realmente serve.
   4) CORE não pode ter duplicados nem entradas fora do formato './caminho'.

   Uso:
     node scripts/check-sw.js            # raiz = repositório
     node scripts/check-sw.js _site      # raiz = artefato publicado
   ============================================================ */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const REPO = path.resolve(__dirname, '..');
const ROOT = path.resolve(process.argv[2] || REPO);
const SW_FILE = path.join(ROOT, 'sw.js');
const erros = [];
const falha = msg => erros.push(msg);

if (!fs.existsSync(SW_FILE)) {
    console.error(`❌ sw.js não encontrado em ${SW_FILE}`);
    process.exit(1);
}
const src = fs.readFileSync(SW_FILE, 'utf8');

// 1) sintaxe
try {
    new vm.Script(src, { filename: 'sw.js' });
} catch (e) {
    const linha = (String(e.stack || '').match(/sw\.js:(\d+)/) || [])[1];
    console.error(`❌ Erro de sintaxe no sw.js${linha ? ` (linha ${linha})` : ''}: ${e.message}`);
    console.error('   Causa comum: entradas consecutivas num array sem vírgula entre elas.');
    process.exit(1);
}

// 2) executa o SW num ambiente mínimo e lê as constantes de topo
const listeners = {};
const ctx = vm.createContext({
    self: { addEventListener: (t, fn) => { listeners[t] = fn; } },
    console
});
vm.runInContext(src, ctx, { filename: 'sw.js' });
let VERSION, CORE, EXTERNAL;
try {
    VERSION = vm.runInContext('VERSION', ctx);
    CORE = vm.runInContext('CORE', ctx);
    EXTERNAL = vm.runInContext('EXTERNAL', ctx);
} catch (e) {
    console.error(`❌ Não foi possível ler VERSION/CORE do sw.js: ${e.message}`);
    process.exit(1);
}

if (!/^v\d+$/.test(String(VERSION))) falha(`VERSION "${VERSION}" fora do formato vNN`);
if (!Array.isArray(CORE) || CORE.length === 0) falha('CORE não é uma lista não vazia');

// 3) e 4) caminhos locais
const vistos = new Set();
const ausentes = [];
const repetidos = [];
const invalidos = [];
(Array.isArray(CORE) ? CORE : []).forEach(entrada => {
    if (typeof entrada !== 'string') { invalidos.push(String(entrada)); return; }
    if (!entrada.startsWith('./') && entrada !== './') { invalidos.push(entrada); return; }
    if (vistos.has(entrada)) { repetidos.push(entrada); return; }
    vistos.add(entrada);
    const rel = entrada === './' ? 'index.html' : entrada.slice(2);   // './' = página inicial
    const alvo = path.join(ROOT, rel);
    let ok = false;
    try { ok = fs.statSync(alvo).isFile(); } catch (e) { ok = false; }
    if (!ok) ausentes.push(entrada);
});
if (invalidos.length) falha(`entradas inválidas em CORE (use './caminho'): ${invalidos.join(', ')}`);
if (repetidos.length) falha(`entradas repetidas em CORE: ${repetidos.join(', ')}`);
if (ausentes.length) falha(`arquivos de CORE ausentes em ${path.relative(REPO, ROOT) || '.'}: ${ausentes.join(', ')}`);

const externosInvalidos = (Array.isArray(EXTERNAL) ? EXTERNAL : []).filter(u => !/^https:\/\//.test(u));
if (externosInvalidos.length) falha(`EXTERNAL deve conter apenas https://: ${externosInvalidos.join(', ')}`);

if (erros.length) {
    console.error('❌ Checagem do Service Worker falhou:');
    erros.forEach(e => console.error('   - ' + e));
    process.exit(1);
}
console.log(`✅ sw.js: sintaxe OK · ${VERSION} · ${vistos.size} arquivos locais de CORE existem em ${path.relative(REPO, ROOT) || '.'} · ${(EXTERNAL || []).length} externo(s)`);
