#!/usr/bin/env node
/* ============================================================
   CHECAGEM DE PONTEIROS PARA TESTES EM DOCS E COMENTÁRIOS
   ------------------------------------------------------------
   Desde a R3 (PR #16) os checks vivem em tests/engine/*.js e
   tests/ui/*.js; test_engine.js e test_ui.js são só runners finos.
   Um ponteiro do tipo `test_ui.js:518`, "test_engine.js (linhas 332–489)"
   ou "(test_engine.js, seção 34)" aponta para um lugar que não contém
   mais o teste — e envelhece em silêncio. Esta checagem reprova:

   1) ponteiro com número de linha ou seção para os runners
      (test_engine.js / test_ui.js) — o alvo certo é o arquivo de área;
   2) menção a tests/engine/<arquivo>.js ou tests/ui/<arquivo>.js que
      não existe no repositório.

   Menções aos runners SEM linha/seção (ex.: "`node test_ui.js` — runner
   da UI") continuam válidas: os arquivos existem e fazem isso.

   Uso: node scripts/check-docs-paths.js   (npm run check:docs)
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SELF = path.relative(ROOT, __filename);

// Onde procurar: documentação + comentários de código/testes/scripts.
function listar(dir, filtro) {
    const abs = path.join(ROOT, dir);
    if (!fs.existsSync(abs)) return [];
    return fs.readdirSync(abs, { withFileTypes: true })
        .filter(d => d.isFile() && filtro(d.name))
        .map(d => path.join(dir, d.name));
}
const ALVOS = [
    ...listar('.', n => n.endsWith('.md') || /^test_.*\.js$/.test(n)),
    ...listar('docs', n => n.endsWith('.md')),
    ...listar('js', n => n.endsWith('.js')),
    ...listar('tests/engine', n => n.endsWith('.js')),
    ...listar('tests/ui', n => n.endsWith('.js')),
    ...listar('scripts', n => n.endsWith('.js') || n.endsWith('.sh')),
    ...listar('.github/workflows', n => n.endsWith('.yml'))
].map(f => path.normalize(f)).filter(f => f !== SELF);

// 1) ponteiro com linha/seção para os runners. `\s` cobre a quebra de linha
//    de comentários longos ("test_engine.js,\n   seção 32").
const PONTEIRO_VELHO = /`?test_(engine|ui)\.js`?(?::\s*\d|\s*\(\s*linhas?\s+\d|\s*,\s*se[çc](?:ão|ões|ao|oes)\b|\s+se[çc](?:ão|ao)\s+[`'"]?(?:UI\s*)?\d)/gi;
// 2) caminhos de arquivo de área
const CAMINHO_AREA = /tests\/(engine|ui)\/([A-Za-z0-9_\-]+\.js)/g;

const linhaDe = (src, idx) => src.slice(0, idx).split('\n').length;
const problemas = [];
for (const rel of ALVOS) {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    let m;
    PONTEIRO_VELHO.lastIndex = 0;
    while ((m = PONTEIRO_VELHO.exec(src))) {
        problemas.push(`${rel}:${linhaDe(src, m.index)} — ponteiro para o runner com linha/seção: "${m[0].replace(/\s+/g, ' ')}" (aponte para tests/${m[1]}/<área>.js)`);
    }
    CAMINHO_AREA.lastIndex = 0;
    while ((m = CAMINHO_AREA.exec(src))) {
        const alvo = path.join(ROOT, 'tests', m[1], m[2]);
        if (!fs.existsSync(alvo)) problemas.push(`${rel}:${linhaDe(src, m.index)} — arquivo de teste inexistente: tests/${m[1]}/${m[2]}`);
    }
}

if (problemas.length) {
    console.error(`❌ ${problemas.length} ponteiro(s) de teste desatualizado(s):`);
    problemas.forEach(p => console.error('   - ' + p));
    process.exit(1);
}
console.log(`✅ ponteiros de teste em dia (${ALVOS.length} arquivos verificados: docs, js/, tests/, scripts/, workflows)`);
