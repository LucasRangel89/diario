# Recuperação e prontidão estimada — Diário de Cargas

Este documento descreve o que o **Mapa de prontidão muscular** estima, como os
percentuais são calculados e quais são os limites dessa estimativa. A explicação
resumida aparece no próprio app (aba **Hoje**, bloco “🗺️ Mapa de prontidão
muscular”); este arquivo é a versão completa.

## 1. O que o mapa mostra

| Bloco | O que é |
|---|---|
| **Prontidão estimada (%)** | Heurística que combina a janela de tempo desde o registro (24 h a 72 h, conforme o grupo), volume semanal excedente e, quando aplicável, apoio indireto. Sem histórico direto ou indireto, o estado é **Sem dados** e não há percentual. |
| **Barra de séries da semana** | Séries registradas na semana × faixa-alvo do grupo (10–20 séries; Antebraço 4–10). Rótulos: `abaixo da meta`, `na faixa`, `acima da faixa`. |
| **Apoio indireto (🤝)** | Grupos que trabalham de forma indireta (ex.: puxadas para Antebraço/Bíceps, empurradas para Tríceps/Ombros, agachamentos para Posterior). Entra na prontidão com fator 0,3–0,5 e **não** conta para a meta semanal. O número exibido é uma **contribuição estimada** (séries ponderadas), não uma série biológica equivalente. |
| **Painel da Lombar** | Estimativa separada, a partir do tempo desde a última sessão que carrega a região e do volume dela. |

## 2. Como o percentual é calculado

1. **Janela de recuperação do grupo.** `percentual = tempo desde o último treino ÷
   (horas do grupo + 2 h por série acima de 8 na sessão)`, limitado a 2 %–100 %.
   As horas por grupo estão em `MUSCLE_META` (`js/catalogo.js`).
2. **Volume da semana.** Acima da faixa-alvo, cada série excedente reduz a
   prontidão em 2 pontos percentuais (piso de 60 % da recuperação).
3. **Apoio indireto.** Quando há estímulo indireto, vale o menor valor entre o
   direto e o indireto ponderado pelo fator do grupo. Se não houver nenhum dos
   dois, o estado é `SEM DADOS`; o desconhecido não vira 100 % e recebe peso neutro
   no ranking de treinos. O fator é uma heurística de produto: as "séries
   ponderadas" exibidas não são séries biológicas equivalentes nem uma medida de
   estímulo validada.
4. Rótulos com dados: `FADIGA ALTA` (< 33 %), `EM RECUPERAÇÃO` (< 100 %),
   `PRONTO (ESTIMADO)`. `PRONTO (ESTIMADO)` é somente uma saída heurística do
   cálculo temporal, não confirmação de recuperação fisiológica.

## 3. Decisões explícitas (e por quê)

- **Registro com data futura conta como hoje.** O cálculo usa
  `Math.max(0, agora − data do registro)`, então uma data futura tem “tempo desde o
  último treino” igual a zero — o mesmo que um registro de hoje. É deliberado: a
  estimativa é conservadora e **nunca antecipa** a janela de recuperação por causa de
  uma data digitada errada (ex.: `2026` no lugar de `2025`, ou digitar o dia seguinte).
  Mudar isso (tratar data futura como “descansado”) daria sinal verde para treinar o
  mesmo grupo em cima do erro. Coberto por teste de regressão (`tests/engine/50_dados_validacao.js`,
  seção 34).
- **Registro sem data válida é ignorado.** Data vazia, mal formatada (ex.: `31/02`) ou
  inexistente no calendário não entra na estimativa — antes isso gerava `NaN` e o mapa
  exibia “pronto” para dado inválido. A regra de data é única em `js/datas.js`.
- **100 % não é garantia.** Os percentuais são heurísticas de planejamento, calculadas
  só com o que foi registrado no app: não medem fadiga fisiológica, sono, alimentação,
  dor ou lesão, e não substituem orientação profissional.
- **Sem histórico não é recuperação.** Quando não há registro direto ou apoio
  indireto, o mapa exibe `SEM DADOS` e deixa a barra sem preenchimento. O ranking do
  próximo treino usa peso neutro para esse grupo e explica a falta de dados; a meta
  semanal continua visível, mas não é usada para inventar um estado de recuperação.
- **Apoio indireto não é série equivalente.** O fator fixo da tabela `SINERGIA`
  (0,3–0,5) só pondera o aviso de recuperação. Ele não entra na meta semanal, no XP
  nem no dano de chefão e não deve ser lido como "séries que valem o mesmo que uma
  série direta".
- **Não há integração com sensores nem wearables.** Tudo é derivado dos registros
  locais (o app é 100 % offline, sem conta e sem servidor).

## 4. Onde isso vive no código

- Regra de data: `js/datas.js` (`isoDataValida`, `dataDeRegistroValida`, `dataISOValida`).
- Recuperação por grupo: `recoveryState` (`js/catalogo.js`, com o cálculo das horas).
- Prontidão + volume + apoio indireto: `fatigueState`, `sinergiaState`,
  `weeklySetsByMuscle`, `faixaSeriesDoGrupo` (`js/catalogo.js` e `js/assistente.js`).
- Painel da lombar: `regiaoLombarState` (`js/assistente.js`).
- Renderização: `renderRecoveryMap` (`js/registro.js`).
- Taxonomia vigente, perfis versionados e limites: `js/perfil_exercicios.js` e
  `docs/TAXONOMIA_EXERCICIOS.md`. Na v1 todos os perfis estão `nao_revisado` e não
  alteram nenhum cálculo acima.
