#!/usr/bin/env node
/* ============================================================
   CHECAGEM DE VERSÃO DO SERVICE WORKER
   ------------------------------------------------------------
   O app é 100% offline: tudo que muda em js/** ou images/** precisa
   renovar o cache, ou o usuário continua com a versão antiga presa
   no service worker. Esta checagem exige que o VERSION do sw.js tenha
   sido incrementado quando o diff mexeu nesses caminhos.

   Uso:
     node scripts/check-sw-version.js                # base = merge-base com origin/main
     node scripts/check-sw-version.js <ref-ou-sha>   # base explícita (CI passa o SHA)
   ============================================================ */
const { execFileSync } = require('child_process');
const fs = require('fs');

// Caminhos que obrigam o bump do cache offline
const WATCHED = [/^js\//, /^images\//];

function git(args) {
    try {
        return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    } catch (e) {
        return '';
    }
}

function versionFrom(src) {
    const m = /const\s+VERSION\s*=\s*['"]([^'"]+)['"]/.exec(src || '');
    return m ? m[1] : null;
}

// 'v18' -> 18 (aceita também '18' ou '1.2.3' pegando o último número)
function versionNumber(v) {
    const m = /(\d+)(?!.*\d)/.exec(String(v || ''));
    return m ? Number(m[1]) : NaN;
}

function fail(msg) { console.error(`❌ ${msg}`); process.exit(1); }
function ok(msg) { console.log(`✅ ${msg}`); process.exit(0); }
function skip(msg) { console.log(`⏭️  ${msg}`); process.exit(0); }

// ---------- 1) descobre a base do diff ----------
let base = String(process.argv[2] || '').trim();
if (/^0+$/.test(base)) base = '';                       // push de branch nova: GitHub manda SHA zerado
if (!base) base = git(['merge-base', 'HEAD', 'origin/main']);
if (!base) base = git(['merge-base', 'HEAD', 'main']);
if (!base) skip('base do diff não encontrada (repositório sem origin/main) — checagem pulada.');
if (!git(['rev-parse', '--verify', '-q', `${base}^{commit}`])) skip(`base ${base} não existe neste clone — checagem pulada.`);

// ---------- 2) arquivos mudados ----------
const changed = git(['diff', '--name-only', base, 'HEAD']).split('\n').map(s => s.trim()).filter(Boolean);
const watched = changed.filter(f => WATCHED.some(re => re.test(f)));
if (!watched.length) ok(`nenhum arquivo de js/** ou images/** mudou desde ${base.slice(0, 7)} — cache não precisa renovar.`);

// ---------- 3) versões antes/depois ----------
const headSrc = fs.existsSync('sw.js') ? fs.readFileSync('sw.js', 'utf8') : '';
const baseSrc = git(['show', `${base}:sw.js`]);   // '' se o sw.js não existia na base
const headVer = versionFrom(headSrc);
const baseVer = versionFrom(baseSrc);

if (!headVer) fail('sw.js não declara `const VERSION = "vNN"`.');
if (!baseVer) ok(`sw.js não existia em ${base.slice(0, 7)} — nada a comparar (${headVer}).`);

const headNum = versionNumber(headVer);
const baseNum = versionNumber(baseVer);
console.log(`📦 sw.js VERSION: ${baseVer} (${base.slice(0, 7)}) → ${headVer} (HEAD)`);
console.log(`📝 ${watched.length} arquivo(s) assistido(s) no diff: ${watched.slice(0, 6).join(', ')}${watched.length > 6 ? '…' : ''}`);

if (Number.isNaN(headNum) || Number.isNaN(baseNum)) fail(`não deu para comparar ${baseVer} com ${headVer} — use o formato vNN.`);
if (headNum <= baseNum) fail(`js/** ou images/** mudou, mas o VERSION do sw.js não subiu (${baseVer} → ${headVer}). Incremente o cache offline em sw.js.`);

ok(`VERSION do sw.js incrementado (${baseVer} → ${headVer}) para ${watched.length} arquivo(s) de js/images.`);
