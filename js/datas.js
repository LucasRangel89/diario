/* ============================================================
   DATAS — validação única compartilhada
   ------------------------------------------------------------
   Antes existiam DUAS cópias da mesma regra: `isoDataValida`
   (js/app.js, validação de backup e de pesagens) e
   `dataDeRegistroValida` (js/catalogo.js, recuperação muscular).
   As duas foram comparadas caso a caso — 35 datas sintéticas
   (ISO válida, 31/02, 13/01, bissexto 2028-02-29, 2027-02-29,
   vazios, com hora, ano 0000/0100/9999, não-string) e 8 entradas
   que não são registro — e são EQUIVALENTES. Esta é a regra única:
   qualquer divergência futura é pega por teste (test_engine.js,
   seção 32).

   Regra (a mais conservadora das duas, que é a mesma):
   - precisa ser string no formato estrito `aaaa-mm-dd`;
   - precisa existir no calendário (31/02 e 29/02 de ano não bissexto
     são rejeitados; `new Date('2026-02-31')` "rolaria" para 03/03,
     por isso a conferência de ano/mês/dia).
   Nada que hoje é aceito em backups (`logs`, `weightLog`) ou em CSV
   passa a ser rejeitado — e vice-versa.

   Este módulo não depende de nada (nem de DOM, nem de storage).
   ============================================================ */

// Confere se (ano, mês, dia) formam uma data que existe no calendário.
// Números (não string): usada também pelo parse de data do CSV, que monta
// a data a partir de `dd/mm/aaaa` ou `aaaa-mm-dd`.
function dataISOValida(ano, mes, dia) {
    const y = Number(ano), m = Number(mes), d = Number(dia);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

// `aaaa-mm-dd` estrito e existente no calendário.
function isoDataValida(s) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const [y, m, d] = s.split('-').map(Number);
    return dataISOValida(y, m, d);
}

// A mesma regra aplicada a um registro ({ date }). Registro sem data válida
// (vazio, mal formatado ou inexistente) não entra na estimativa de recuperação:
// antes a contagem gerava NaN e o mapa devolvia "pronto" para dado inválido.
function dataDeRegistroValida(l) {
    return !!l && typeof l.date === 'string' && isoDataValida(l.date);
}

// ============================================================
// Manifesto de exports (mesmo padrão dos outros módulos em js/).
// ============================================================
(function (g) {
    const exports_ = {
        dataISOValida,
        isoDataValida,
        dataDeRegistroValida
    };
    g.__diarioExports = Object.assign(g.__diarioExports || {}, exports_);
    const actionFns = {};
    Object.keys(exports_).forEach(k => { if (typeof exports_[k] === 'function') actionFns[k] = exports_[k]; });
    g.registerDiarioActions(actionFns);
    g.__diarioExportFiles = Object.assign(g.__diarioExportFiles || {}, { "js/datas.js": Object.keys(exports_).length });
})(typeof window !== 'undefined' ? window : globalThis);
export { dataISOValida, isoDataValida, dataDeRegistroValida };
