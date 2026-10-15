/* ============================================================
   DESPACHANTE CENTRAL DE EVENTOS — Diário de Cargas
   ------------------------------------------------------------
   Etapa 5.1 (sub-etapa 3): substitui os handlers inline
   (onclick/onchange/oninput/onsubmit/onkeydown) por delegação.
   Os templates declaram data-action (+ data-args/data-attr-args/
   data-value-attr) e este arquivo roteia o evento para a função
   registrada por cada módulo (via registerDiarioActions, chamado
   pelo bloco de manifest no fim de cada js/*.js).

   Por que delegação: funções globais acessadas por atributos
   inline quebram em <script type="module"> (escopo próprio) e
   poluem o escopo global. Com data-* + um único listener o HTML
   declarativo continua funcionando, inclusive para conteúdo
   gerado depois (grid de chefões, sessão, modais).
   ============================================================ */

(function (g) {
    'use strict';

    const registry = (g.__diarioActions = g.__diarioActions || {});

    // Registra (ou substitui) uma ação. Chamado pelos manifestos de cada módulo.
    g.registerDiarioAction = function (name, fn) { registry[name] = fn; };
    g.registerDiarioActions = function (map) {
        if (!map) return;
        Object.keys(map).forEach(name => { registry[name] = map[name]; });
    };
    g.getDiarioAction = function (name) { return registry[name]; };

    // Monta a lista de argumentos a partir dos atributos data-* do elemento:
    //   data-args      → JSON (o token "$event" vira o próprio evento)
    //   data-attr-args → nomes de atributos separados por vírgula cujos
    //                    valores entram como argumentos (ex.: "data-ex")
    //   data-value-attr→ atributo cujo valor entra como último argumento
    //                    ("value" = .value do elemento; ex.: selects)
    function resolveArgs(el, evt) {
        let args = [];
        const raw = el.getAttribute('data-args');
        if (raw != null && raw !== '') {
            try {
                args = JSON.parse(raw);
                if (!Array.isArray(args)) args = [args];
            } catch (e) {
                args = [raw]; // argumento textual simples sem JSON
            }
            args = args.map(a => (a === '$event' ? evt : a));
        }
        const attrArgs = el.getAttribute('data-attr-args');
        if (attrArgs) {
            attrArgs.split(',').forEach(name => {
                const v = el.getAttribute(name.trim());
                if (v != null) args.push(v);
            });
        }
        const valueAttr = el.getAttribute('data-value-attr');
        if (valueAttr) args.push(valueAttr === 'value' ? el.value : el.getAttribute(valueAttr));
        return args;
    }

    function run(el, attrName, evt, extraArgs) {
        const name = el.getAttribute(attrName);
        if (!name) return;
        const fn = registry[name];
        if (typeof fn !== 'function') {
            if (typeof console !== 'undefined' && console.error) console.error('[ações] handler não registrado: ' + name);
            return;
        }
        const args = resolveArgs(el, evt);
        if (extraArgs) args.push(...extraArgs);
        fn.apply(el, args);
    }

    const hasDOM = (typeof document !== 'undefined' && !!document.addEventListener);
    if (hasDOM) {
        // clique: qualquer elemento com data-action (botões, cards, tiles)
        document.addEventListener('click', function (evt) {
            const el = evt.target && evt.target.closest ? evt.target.closest('[data-action]') : null;
            if (el) run(el, 'data-action', evt);
        });

        // teclado: Enter/Espaço dispara a ação em elementos NÃO nativos
        // (div[role=button] etc.). Botões/links/inputs têm comportamento
        // nativo de click e não podem disparar duas vezes.
        document.addEventListener('keydown', function (evt) {
            if (evt.key !== 'Enter' && evt.key !== ' ' && evt.key !== 'Spacebar') return;
            const el = evt.target && evt.target.closest ? evt.target.closest('[data-action]') : null;
            if (!el) return;
            const tag = (el.tagName || '').toLowerCase();
            if (tag === 'button' || tag === 'a' || tag === 'input' || tag === 'select' || tag === 'textarea') return;
            evt.preventDefault();
            run(el, 'data-action', evt);
        });

        // change / input: selects, inputs e arquivos (data-change-action, data-input-action)
        document.addEventListener('change', function (evt) {
            const el = evt.target && evt.target.closest ? evt.target.closest('[data-change-action]') : null;
            if (el) run(el, 'data-change-action', evt);
        });
        document.addEventListener('input', function (evt) {
            const el = evt.target && evt.target.closest ? evt.target.closest('[data-input-action]') : null;
            if (el) run(el, 'data-input-action', evt);
        });

        // submit: formulários com data-submit-action (o handler chama preventDefault)
        document.addEventListener('submit', function (evt) {
            const el = evt.target && evt.target.closest ? evt.target.closest('[data-submit-action]') : null;
            if (el) run(el, 'data-submit-action', evt);
        });

        // error não borbulha: delegação em fase de captura (ex.: data-error-action em <img>)
        document.addEventListener('error', function (evt) {
            const el = evt.target && evt.target.closest ? evt.target.closest('[data-error-action]') : null;
            if (el) run(el, 'data-error-action', evt, [el]);
        }, true);
    }
})(typeof window !== 'undefined' ? window : globalThis);
export {  };
