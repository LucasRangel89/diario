#!/usr/bin/env node
/* ============================================================
   CHECAGEM DO GRAFO DE ES MODULES
   ------------------------------------------------------------
   O jsdom não executa <script type="module">, então os testes
   clássicos removem import/export e rodam o código concatenado —
   o que esconderia imports quebrados. Este script linka e avalia
   o GRAFO REAL dos módulos em Node (com stubs de DOM), pegando:
   - import de símbolo que o módulo não exporta (erro de link);
   - import relativo que não aponta para arquivo conhecido;
   - violações de strict mode/TDZ na avaliação (top-level).
   Uso: node --experimental-vm-modules scripts/check-modules.js
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

if (!process.execArgv.some(a => a.includes('experimental-vm-modules'))) {
    console.error('❌ rode com: node --experimental-vm-modules scripts/check-modules.js');
    process.exit(1);
}

const FILES = [
    'js/actions.js', 'js/storage.js', 'js/catalogo.js', 'js/gamificacao.js',
    'js/assistente.js', 'js/planilha_data.js', 'js/historico.js', 'js/busca.js',
    'js/custom_exercises.js', 'js/datas.js', 'js/perfil_exercicios.js', 'js/corridas.js', 'js/cartoes.js', 'js/calculadoras.js', 'js/backup.js', 'js/persistencia.js', 'js/sessao.js', 'js/config.js', 'js/boss.js', 'js/registro.js', 'js/app.js'
];
const ROOT = path.resolve(__dirname, '..');

// ---------- stubs mínimos de DOM/storage ----------
const noop = () => { };
const lsData = new Map();
const localStorageStub = {
    getItem: k => (lsData.has(k) ? lsData.get(k) : null),
    setItem: (k, v) => { lsData.set(k, String(v)); },
    removeItem: k => { lsData.delete(k); },
    clear: () => { lsData.clear(); },
    get length() { return lsData.size; },
    key(i) { return [...lsData.keys()][i] ?? null; }
};
const windowStub = {
    localStorage: localStorageStub,
    addEventListener: noop,
    removeEventListener: noop,
    navigator: { vibrate: noop },
    Image: class { set src(v) { } },
    requestAnimationFrame: noop,
};
windowStub.window = windowStub;
const documentStub = {
    addEventListener: noop,
    removeEventListener: noop,
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => ({
        classList: { add: noop, remove: noop, toggle: noop },
        style: {}, setAttribute: noop, appendChild: noop, remove: noop,
        click: noop, getContext: () => null, removeAttribute: noop
    }),
    body: { appendChild: noop, classList: { add: noop, remove: noop } }
};

const context = vm.createContext({
    window: windowStub,
    document: documentStub,
    navigator: windowStub.navigator,
    localStorage: localStorageStub,
    console,
    setTimeout, clearTimeout,
    setInterval: () => 0, clearInterval: noop,
    requestAnimationFrame: noop,
    URL: { createObjectURL: () => 'blob:stub', revokeObjectURL: noop },
    Blob: class BlobStub { },
    FileReader: class FileReaderStub { readAsDataURL() { } },
    fetch: () => Promise.resolve({ ok: false, json: () => Promise.resolve(null) }),
    alert: noop,
    confirm: () => false,
    Chart: undefined
});

const sources = new Map(FILES.map(f => [f, fs.readFileSync(path.join(ROOT, f), 'utf8')]));
const modules = new Map();
for (const f of FILES) {
    modules.set(f, new vm.SourceTextModule(sources.get(f), { identifier: f, context }));
}

function resolveFile(specifier, referrer) {
    const clean = specifier.replace(/^\.\//, '');
    const p = 'js/' + clean;
    if (sources.has(p)) return modules.get(p);
    return null;
}

(async () => {
    // 1) link: valida que todo import nomeado existe no módulo de destino.
    //    O link do entry já propagou para todo o grafo; iterar de novo em
    //    módulos já linkados lança "Module has already been linked".
    const linking = new Set();
    for (const [f, m] of modules) {
        if (linking.has(f)) continue;
        linking.add(f);
        try {
            await m.link((specifier, referrer) => {
                const target = resolveFile(specifier, referrer);
                if (!target) throw new Error(`import não resolvido: '${specifier}' (em ${referrer && referrer.identifier})`);
                linking.add([...modules.entries()].find(([, mm]) => mm === target)[0]);
                return target;
            });
        } catch (e) {
            if (!/already been linked/.test(e.message)) throw e;
        }
    }
    // 2) avaliação: entry app.js puxa o grafo na ordem dos imports
    await modules.get('js/app.js').evaluate();
    // 3) sanidade: símbolos-chave nos namespaces
    const app = modules.get('js/app.js').namespace;
    const catalogo = modules.get('js/catalogo.js').namespace;
    const perfis = modules.get('js/perfil_exercicios.js').namespace;
    const storageNs = modules.get('js/storage.js').namespace;
    const checagens = [
        ['app.renderSession', typeof app.renderSession === 'function'],
        ['app.loadStoredData', typeof app.loadStoredData === 'function'],
        ['app.setLogs', typeof app.setLogs === 'function'],
        ['catalogo.catalogInfo', typeof catalogo.catalogInfo === 'function'],
        ['catalogo.allExercisesList', typeof catalogo.allExercisesList === 'function'],
        ['perfil.perfilDoExercicio', typeof perfis.perfilDoExercicio === 'function'],
        ['perfil.inventarioTaxonomia', typeof perfis.inventarioTaxonomia === 'function'],
        ['storage.storage.migrate', storageNs && typeof storageNs.storage.migrate === 'function']
    ];
    const faltando = checagens.filter(([, ok]) => !ok).map(([n]) => n);
    if (faltando.length) throw new Error('símbolos ausentes nos namespaces: ' + faltando.join(', '));
    console.log(`✅ grafo de ES modules linkou e avaliou (${FILES.length} arquivos, ${checagens.length} símbolos conferidos)`);
    process.exit(0);
})().catch(e => {
    console.error('❌ grafo de módulos quebrou:', e.message);
    if (e.stack) console.error(e.stack.split('\n').slice(0, 4).join('\n'));
    process.exit(1);
});
