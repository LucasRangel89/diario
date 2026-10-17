# Análise crítica do relatório técnico — Diário de Cargas

**Data da análise:** 17/10/2026  
**Base examinada:** árvore de trabalho desta branch (`arena/f293030c-diario`), atualmente derivada do commit `b77e908`; o relatório anexado declara ter auditado `main` no commit `2cf6bb39`. Portanto, esta análise confirma achados no código disponível aqui, mas não afirma que cada detalhe corresponde exatamente à revisão citada no anexo.

## Parecer executivo

O relatório tem uma tese central sólida: o app é, antes de tudo, um diário de treino; seus percentuais e recomendações são heurísticas derivadas de dados incompletos, não medições de fadiga, biomecânica ou risco de lesão. A auditoria do código atual confirma quatro problemas concretos com impacto direto na interpretação: ausência de histórico podia virar 100% de prontidão; o cálculo de e1RM podia combinar a carga de um registro com as repetições de outra série; a dupla progressão podia sugerir aumento em kg para exercícios de peso corporal; e o painel lombar usava linguagem prescritiva, além de poder exibir rótulo incompatível com a janela temporal.

Isso não significa que todas as recomendações devam ser implementadas como prescrição de treino. O relatório mistura correções objetivas de lógica e linguagem com propostas de produto, opções de modelagem e questões que exigem revisão profissional. A prioridade P0/P1 é uma classificação de risco plausível, não um resultado medido de impacto ou uma conclusão clínica. Em particular, uma classificação errada de grupo pode distorcer metas e recomendações, mas não demonstra, por si só, que o app causou dano ou que exista risco individual.

**Decisão de produto:** manter o registro, a convenção histórica da planilha, os dados locais e a gamificação; corrigir estados e cálculos enganosos sem reescrever registros antigos; adiar a expansão anatômica e a adaptação do treino até existir modelo versionado, critérios de migração e revisão especializada.

## O que foi confirmado e tratado

| Achado | Avaliação crítica | Decisão nesta etapa |
|---|---|---|
| Sem histórico tratado como prontidão de 100% | Confirmado em `fatigueState`: `null` era substituído por 100. Volume abaixo da meta não é evidência de recuperação. | Corrigido: mapa mostra `SEM DADOS`, sem percentual/barra preenchida; o ranking usa peso neutro e explica a incerteza. A meta semanal continua visível. |
| e1RM inconsistente em séries com cargas diferentes e acima de 12 reps | Confirmado. O PR usava a carga do registro e a melhor contagem de reps; a métrica da planilha já tinha outra regra para >12. | Unificado o cálculo em uma regra Epley limitada a 1–12 reps. Para `sets`, cada estimativa usa carga e reps do mesmo set e ignora aquecimento explicitamente marcado. Fora da faixa, não se extrapola. |
| Progressão em exercício de peso corporal | Confirmado: `weight` pode representar o peso corporal, não carga adicional. Somar automaticamente 2,5 kg pode ser semanticamente incorreto. | Desativada a sugestão automática em perfis/tipos de peso corporal. Uma progressão apropriada requer modelar separadamente carga adicional, assistência ou variante; esse dado ainda não existe no formulário. |
| Alerta lombar com tom de proibição e estado temporal incoerente | Confirmado no código: a classificação decorre principalmente do nome/tags e de janela fixa; o rótulo podia permanecer “muito carregada” mesmo com percentual de 100%. | Linguagem alterada para exposição/janela estimada, sem “evite completamente”; estado agora depende da janela restante, com percentual limitado a 99 enquanto a janela está ativa. Não se declara risco nem recuperação individual. |

Essas alterações são correções de honestidade semântica e consistência do software, não validação científica do algoritmo. A janela por horas, os fatores de sinergia e os limiares continuam heurísticos.

## Achados aceitos, mas adiados

### Taxonomia muscular e sinergias

A crítica à categoria ampla `Posterior` é bem fundamentada para contabilidade: panturrilha, adutores, abdutores, isquiotibiais e glúteos não são intercambiáveis como séries diretas. Porém, o código atual trata essa taxonomia como uma convenção histórica do produto, e os testes também a assumem. Separar grupos afeta metas semanais, registros legados, fraquezas de chefões, XP, sessões salvas, CSV e a forma como o usuário interpreta seu histórico.

**Não mudar por substituição textual nem reclassificar os logs antigos silenciosamente.** Próxima solução segura: perfis versionados de exercício, grupos de UI separados da contabilidade, músculos primários e secundários distintos, status de revisão do perfil e exportação que preserve o dado legado. Um exercício sem perfil revisado continua registrável; apenas não deve alimentar inferências anatômicas que não estão disponíveis.

Os coeficientes atuais de apoio indireto (`SINERGIA`) devem ser chamados de contribuição estimada, não de “séries biológicas equivalentes”. Regex e fatores fixos são úteis como lembretes simples, mas não sustentam uma medida validada de estímulo.

**Atualização (17/10/2026):** a interface e a documentação passaram a usar “contribuição estimada / séries ponderadas”, sem mudar o cálculo. A base versionada de perfis (`js/perfil_exercicios.js`) e o inventário (`docs/TAXONOMIA_EXERCICIOS.md`) foram adicionados na Etapa 2a abaixo, ainda sem classificar exercícios nem alterar metas, XP, chefões ou registros.

### Carga registrada, tonelagem e 1RM

A convenção da planilha (anilhas sem barra/carrinho, halter por unidade, fator/lados) é explícita e tem valor para comparar a própria rotina ao longo do tempo. Não é necessário destruir essa compatibilidade. O cuidado é não chamar a tonelagem de trabalho mecânico, tensão ou esforço interno, nem comparar indiscriminadamente máquinas e exercícios.

O cálculo de 1RM permanece uma **estimativa derivada da carga registrada**. A faixa de até 12 repetições é uma escolha conservadora de produto, não uma fronteira fisiológica universal. Mesmo com cálculo consistente, uma carga de anilhas sem a barra não representa a massa externa total; registros antigos devem conservar sua base original. Uma futura mudança deve rotular as bases e adicionar carga externa estimada somente quando o equipamento for conhecido — sem alterar o valor digitado retroativamente.

### RIR, metas semanais e recomendações

O RIR pode tornar a dupla progressão mais contextual, mas é uma estimativa subjetiva. Não há base para impor um valor-alvo universal ou assumir que RIR vazio equivale a uma intensidade determinada. Primeiro é preciso oferecer configuração optativa e explicar quando o dado foi ou não usado.

A faixa semanal atual é uma meta configurada pelo app, não um mínimo universal nem uma definição de treino bom. Torná-la editável é uma melhoria útil, mas perfis por objetivo, nível, frequência e contexto ampliam bastante a superfície do produto e precisam de validação. O ranking de treinos deve continuar uma sugestão explicável e substituível; não deve ser chamado de “treino ideal”.

### Dados temporais e sinais subjetivos

`date` sem hora implica uma aproximação (hoje o cálculo usa meio-dia local). Guardar `performedAt` pode melhorar a janela horária, mas não converte o cálculo em medida de recuperação. Dor, esforço percebido e disposição também são relatos úteis, não sensores objetivos nem diagnóstico. Coletá-los só faz sentido com finalidade clara, opção de não responder e explicação de como cada sinal altera uma recomendação.

## Limites da evidência do relatório

- O anexo informa que CI e deploy de um commit remoto passaram; isso não foi verificado nesta análise e, mesmo confirmado, valida apenas os checks configurados — não a fisiologia das regras.
- As referências listadas são relevantes ao tipo de discussão, mas não foi feita aqui uma conferência bibliográfica independente do texto integral, população, limitações e correspondência de cada conclusão. Não tratar a lista de referências como validação automática do código.
- A inspeção de código e testes confirma o comportamento implementado, mas não determina a melhor programação para uma pessoa específica, nem avalia técnica, dor, lesão ou risco clínico.
- Testes que verificam números esperados medem regressão/comportamento. Para testar validade de domínio, serão necessários casos revisados por profissionais e critérios previamente definidos.

## Plano incremental

### Etapa 1 — concluída nesta alteração: evitar recomendações enganosas

- [x] Desconhecido separado de pronto no mapa e no ranking.
- [x] Carga/repetições da mesma série na estimativa de 1RM; regra única até 12 reps.
- [x] Sem incremento em kg para exercício de peso corporal sem campo explícito de carga adicional.
- [x] Alerta lombar sem proibição absoluta e com estado alinhado à janela temporal.
- [x] Testes de regressão para os cenários corrigidos.
- [x] Atualização de README, descrição da interface e `docs/RECUPERACAO.md`.

**Critério mantido:** não migrar nem apagar dados históricos nesta etapa. A suíte automatizada completa precisa passar antes de encerrar a etapa.

### Etapa 2a — concluída nesta alteração: base aditiva e inventário

- [x] Schema v1 de perfil (`js/perfil_exercicios.js`), com `nao_revisado`/`revisado`, ID estável derivado do nome canônico e registro vazio de perfis revisados.
- [x] Gate que impede anatomia em perfil não revisado e rejeita “séries equivalentes” no schema.
- [x] Registro revisado só é aceito se mantiver ID, nome canônico e **grupo legado** iguais aos do catálogo; divergência cai para `nao_revisado` sem reclassificar nada.
- [x] Inventário completo da taxonomia atual em `docs/TAXONOMIA_EXERCICIOS.md` (72 exercícios, 11 grupos de catálogo, 12 entradas em `MUSCLE_META`, aliases legados).
- [x] Testes de regressão/compatibilidade para histórico, metas, chefões, CSV e backup JSON; nenhum dado é migrado ou reescrito.
- [ ] Substituir a taxonomia legada por grupos-alvo e usar perfis em metas/recomendações (depende de revisão profissional).

### Etapa 2 — modelo semântico de exercícios e carga

1. Definir identificadores estáveis e perfil de exercício versionado, separando agrupamento visual de grupos-alvo.
2. Revisar músculos primários/secundários e padrões com profissional; perfil não revisado não gera contribuição anatômica presumida.
3. Formalizar modalidades de progressão e unidade do incremento (por halter, por lado, total, pino, assistência, variante, reps ou tempo).
4. Separar `loadEntered` de estimativa de carga externa quando barra, carrinho ou máquina forem identificáveis.
5. Preservar grupo/carga legado no registro e CSV; migrar explicitamente e validar exportação/importação de ida e volta.

**Gate:** migração reversível/explicada, perfis revisados e ausência de alteração silenciosa do histórico, XP ou PRs.

### Etapa 3 — assistente configurável, não “treinador automático”

1. Configurações optativas de objetivo, faixa de séries, descanso, prioridade do exercício e modalidade de progressão.
2. RIR opcional, aplicado somente quando informado e com texto que explique seu uso.
3. Mostrar em cada sugestão quais dados estavam disponíveis, quais faltaram e quais regras influenciaram o ranking.
4. Tornar ordenação e sugestão editáveis/dispensáveis e preferir “correspondência com suas configurações” a “ideal”.
5. Separar sessões/exposições registradas, séries de trabalho diretas e qualquer estimativa de contribuição secundária.

**Gate:** regras determinísticas, explicáveis, sem linguagem de prescrição clínica e com testes para estado desconhecido, dados incompletos e preferências do usuário.

### Etapa 4 — revisão e validação de domínio

- Revisão dos perfis e das mensagens por profissional de Educação Física/biomecânica; questões de dor/saúde devem seguir para profissional apropriado.
- Casos de teste com racional e versão da regra, separados de testes de implementação.
- Piloto voluntário e local-first, com consentimento e métricas definidas antes; não interpretar correlação com desempenho como diagnóstico ou prova de segurança.
- Avaliar falsos alertas, incerteza, recomendações ignoradas e qualidade do registro, sem otimizar apenas a taxa de aceitação.

## Critérios de aceitação que permanecem

- Nenhum histórico direto/indireto: rótulo sem dados, sem 100%, pontuação neutra e explicação.
- Drop set: e1RM usa carga e repetições do mesmo set; aquecimento marcado não define recorde.
- Mais de 12 reps: sem estimativa em histórico/PR/exportação, com linguagem consistente.
- Peso corporal sem carga adicional identificada: sem sugestão de aumento em kg.
- Janela lombar concluída: percentual, estado e `carregada` coerentes; mensagem não proíbe exercício nem afirma risco.
- Panturrilha não conta como série direta de posterior de coxa até que o modelo anatômico versionado exista.
- CSV/JSON antigo continua importável e os dados originalmente registrados não são reescritos silenciosamente.

## Conclusão

O relatório é um bom mapa de riscos semânticos e de evolução, mas várias propostas dependem de escolhas de produto e revisão profissional, não apenas de implementar fórmulas novas. A resposta de menor risco é corrigir primeiro erros confirmados e a linguagem excessiva; depois, evoluir o modelo anatômico e o assistente por migrações explícitas, com validação. A ferramenta deve ajudar a registrar e refletir sobre o treino — não alegar conhecer a fadiga real, a biomecânica individual ou o risco de lesão.
