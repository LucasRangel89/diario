# Recuperação e prontidão estimada — Diário de Cargas

Este documento descreve o que o **Mapa de prontidão muscular** estima, como os
percentuais são calculados e quais são os limites dessa estimativa. A explicação
resumida aparece no próprio app (aba **Hoje**, bloco “🗺️ Mapa de prontidão
muscular”); este arquivo é a versão completa.

## 1. O que o mapa mostra

| Bloco | O que é |
|---|---|
| **Prontidão estimada (%)** | Combinação da janela de recuperação do grupo (24 h a 72 h, conforme o grupo) com o volume já feito na semana. |
| **Barra de séries da semana** | Séries registradas na semana × faixa-alvo do grupo (10–20 séries; Antebraço 4–10). Rótulos: `abaixo da meta`, `na faixa`, `acima da faixa`. |
| **Apoio indireto (🤝)** | Grupos que trabalham de forma indireta (ex.: puxadas para Antebraço/Bíceps, empurradas para Tríceps/Ombros, agachamentos para Posterior). Entra na prontidão com fator 0,3–0,5 e **não** conta para a meta semanal. |
| **Painel da Lombar** | Estimativa separada, a partir do tempo desde a última sessão que carrega a região e do volume dela. |

## 2. Como o percentual é calculado

1. **Janela de recuperação do grupo.** `percentual = tempo desde o último treino ÷
   (horas do grupo + 2 h por série acima de 8 na sessão)`, limitado a 2 %–100 %.
   As horas por grupo estão em `MUSCLE_META` (`js/catalogo.js`).
2. **Volume da semana.** Acima da faixa-alvo, cada série excedente reduz a
   prontidão em 2 pontos percentuais (piso de 60 % da recuperação).
3. **Apoio indireto.** Quando há estímulo indireto, vale o menor valor entre o
   direto e o indireto ponderado pelo fator do grupo.
4. Rótulos: `FADIGA ALTA` (< 33 %), `EM RECUPERAÇÃO` (< 100 %), `PRONTO (ESTIMADO)`.

## 3. Decisões explícitas (e por quê)

- **Registro com data futura conta como hoje.** O cálculo usa
  `Math.max(0, agora − data do registro)`, então uma data futura tem “tempo desde o
  último treino” igual a zero — o mesmo que um registro de hoje. É deliberado: a
  estimativa é conservadora e **nunca antecipa** a janela de recuperação por causa de
  uma data digitada errada (ex.: `2026` no lugar de `2025`, ou digitar o dia seguinte).
  Mudar isso (tratar data futura como “descansado”) daria sinal verde para treinar o
  mesmo grupo em cima do erro. Coberto por teste de regressão (`test_engine.js`,
  seção 34).
- **Registro sem data válida é ignorado.** Data vazia, mal formatada (ex.: `31/02`) ou
  inexistente no calendário não entra na estimativa — antes isso gerava `NaN` e o mapa
  exibia “pronto” para dado inválido. A regra de data é única em `js/datas.js`.
- **100 % não é garantia.** Os percentuais são heurísticas de planejamento, calculadas
  só com o que foi registrado no app: não medem fadiga fisiológica, sono, alimentação,
  dor ou lesão, e não substituem orientação profissional.
- **Não há integração com sensores nem wearables.** Tudo é derivado dos registros
  locais (o app é 100 % offline, sem conta e sem servidor).

## 4. Onde isso vive no código

- Regra de data: `js/datas.js` (`isoDataValida`, `dataDeRegistroValida`, `dataISOValida`).
- Recuperação por grupo: `recoveryState` (`js/catalogo.js`, com o cálculo das horas).
- Prontidão + volume + apoio indireto: `fatigueState`, `sinergiaState`,
  `weeklySetsByMuscle`, `faixaSeriesDoGrupo` (`js/catalogo.js` e `js/assistente.js`).
- Painel da lombar: `regiaoLombarState` (`js/assistente.js`).
- Renderização: `renderRecoveryMap` (`js/app.js`).
