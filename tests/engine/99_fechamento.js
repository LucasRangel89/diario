/* ============================================================
   RELATÓRIO FINAL DO MOTOR
   ------------------------------------------------------------
   Trecho de test_engine.js, movido sem alterar a lógica dos testes.
   Avaliado pelo runner no MESMO escopo dos demais trechos (ordem do nome).
   ============================================================ */

check('nenhuma checagem foi perdida na divisão por área (mínimo de 450)', globalThis.totalChecks >= 450, globalThis.totalChecks);
    console.log('\n' + (failures === 0 ? '✅ TESTES DE CSV, RECUPERAÇÃO E BACKUP (MOTOR) PASSARAM' : `❌ ${failures} FALHA(S)`));

    console.log('\n' + (failures === 0 ? '✅ TODOS OS TESTES PASSARAM' : `❌ ${failures} FALHA(S)`));
    process.exit(failures === 0 ? 0 : 1);