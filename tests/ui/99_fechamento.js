/* ============================================================
   RELATÓRIO FINAL DA UI
   ------------------------------------------------------------
   Trecho de test_ui.js, movido sem alterar a lógica dos testes.
   Avaliado pelo runner no MESMO escopo dos demais trechos (ordem do nome).
   ============================================================ */

check('nenhuma checagem foi perdida na divisão por área (mínimo de 380)', globalThis.totalChecks >= 380, globalThis.totalChecks);
    console.log('\n' + (failures === 0 ? '✅ SMOKE TEST DE UI PASSOU' : `❌ ${failures} FALHA(S) DE UI`));
    process.exit(failures === 0 ? 0 : 1);