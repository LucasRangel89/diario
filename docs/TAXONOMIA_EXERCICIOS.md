# Taxonomia de exercícios — inventário e contrato de compatibilidade

**Data:** 17/10/2026  
**Base:** `main` com a PR #26 incorporada (`66e4803`)  
**Escopo desta etapa:** documentar a taxonomia vigente e preparar uma base
aditiva/versionada de perfis. **Não** criar grupos novos, **não** reclassificar
registros e **não** usar perfis em recomendações, metas, XP ou chefões.

## 1. O que a taxonomia é hoje

O app usa duas noções diferentes, ambas legadas:

| Noção | Onde vive | O que significa |
|---|---|---|
| **Grupo do registro** (`muscle`) | cada item de `logs`, CSV (`Grupo do registro`) e backup JSON (`logs[].muscle`) | Grupo de contabilidade/UI gravado no registro. É o campo que o histórico, o mapa de prontidão e as metas semanais leem. |
| **Grupo do catálogo** (`grupo`) | `EXERCISE_CATALOG_FULL` em `js/catalogo.js`, exercícios personalizados e aba `Catálogo` do CSV | Grupo sugerido pelo catálogo para o exercício. Em registros antigos pode divergir do `muscle` gravado. |

O catálogo de runtime em `js/catalogo.js` é a fonte usada pelo app: **72 exercícios**
em **11 grupos** (`Peito`, `Costas`, `Pernas`, `Posterior`, `Ombros`, `Bíceps`,
`Tríceps`, `Abdômen`, `Core`, `Antebraço`, `Cardio`). O arquivo
`catalogo_exercicios.csv` da raiz é uma referência histórica com **64 linhas**;
ele não inclui oito entradas do runtime (Agachamento Sumô, Cadeira Adutora,
Swing de Kettlebell e as cinco modalidades de cardio). Nenhum dos dois foi
alterado nesta etapa.

Além dos 11 grupos do catálogo, `MUSCLE_META` tem **12 entradas** porque inclui
`Geral` (fallback para registros sem grupo reconhecido). O mapa de recuperação,
as metas e as fraquezas dos chefões usam **10 grupos** (`MUSCULOS_MAPA`):
`Geral` e `Cardio` ficam fora do mapa muscular.

### 1.1 Grupos, janelas e faixas

Os valores abaixo são os que o código aplica hoje. `xpWeight` é declarado em
`MUSCLE_META`; o rank da sessão usa `MUSCLE_WEIGHT` (0,5 para `Pernas` e
`Posterior`). Nada disso foi alterado.

| Grupo | No mapa? | Recuperação base | `xpWeight` | Faixa semanal | Exercícios |
|---|---|---:|---:|---|---:|
| Peito | sim | 48 h | 1,0 | 10–20 | 10 |
| Costas | sim | 48 h | 1,0 | 10–20 | 9 |
| Pernas | sim | 72 h | 0,5 | 10–20 | 7 |
| Posterior | sim | 48 h | 0,5 | 10–20 | 8 |
| Ombros | sim | 36 h | 1,0 | 10–20 | 9 |
| Bíceps | sim | 36 h | 1,0 | 10–20 | 6 |
| Tríceps | sim | 36 h | 1,0 | 10–20 | 7 |
| Abdômen | sim | 24 h | 1,0 | 10–20 | 7 |
| Core | sim | 24 h | 1,0 | 10–20 | 2 |
| Antebraço | sim | 24 h | 1,0 | **4–10** | 2 |
| Geral | não | 24 h | 1,0 | — | 0 |
| Cardio | não | 12 h | 1,0 | — | 5 |

A faixa de 10–20 séries é uma **meta configurada pelo app**, não um mínimo
universal nem uma definição de treino adequado. A exceção do antebraço (4–10)
evita cobrar volume direto que o grupo não costuma receber.

### 1.2 O caso `Posterior`

`Posterior` é uma convenção de produto, não um músculo nem um grupo anatômico
único. Ela reúne exercícios que envolvem isquiotibiais, glúteos, adutores,
abdutores e panturrilhas — regiões que não são intercambiáveis como séries
diretas. A própria análise crítica registra a mistura e recomenda não
reclassificar por substituição textual.

Nesta etapa **nenhuma decomposição por exercício foi declarada**. Dizer que
"Panturrilha em Pé é tríceps sural" ou que "Abdutor é glúteo médio" seria uma
classificação anatômica que ainda não passou por revisão profissional; os
comentários `obs` do catálogo e as tags de busca não são esse perfil. Por isso,
todos os 72 exercícios continuam `nao_revisado` e sem músculos primários ou
secundários no modelo novo.

Aliases musculares legados preservados:

- `Pescoço` → `Ombros` (a cervical está em Ombros desde a remoção do grupo).
- `Glúteos` → `Posterior`.

Esses aliases são aplicados por `normalizeMuscle`/`migrateLog` na carga e na
importação. Eles não são uma taxonomia nova e não serão removidos sem migração
explícita.

## 2. Onde o grupo é usado (mapa de impacto)

| Consumidor | Fonte do grupo | Efeito |
|---|---|---|
| Histórico e filtro por grupo | `normalizeMuscle(l.muscle)` | Filtro e badge do registro. |
| Mapa de prontidão | `normalizeMuscle(l.muscle)` + `MUSCLE_META` | Janela de recuperação, prontidão, volume semanal e apoio indireto. |
| Metas semanais | `weeklySetsByMuscle` (lê `l.muscle`) + `faixaSeriesDoGrupo` | Séries por grupo e “o que falta” no montador. |
| XP por série efetiva | catálogo primeiro (`catalogInfo(log.exercise)?.grupo`), senão `l.muscle`; exige grupo em `MUSCULOS_MAPA` | `effectiveSetAllocations` decide se a série conta. |
| Dano de chefão | catálogo primeiro, senão `l.muscle` (`logDamageKg`) | Fraqueza semanal e dano; `THEMES.bosses[].weak` precisa estar em `MUSCULOS_MAPA`. |
| Rank da sessão | `MUSCLE_WEIGHT[l.muscle]` | Ajuste de tonelagem para Pernas/Posterior (0,5). |
| CSV | `l.muscle` exportado em `Grupo do registro`; `c.grupo` na aba Catálogo | Importação de exercício conhecido usa o **grupo do catálogo**, não a coluna do arquivo; desconhecido usa a coluna ou `Geral`. |
| Backup JSON | `logs[].muscle` (normalizado por `migrateLog`); `savedWorkouts[].exercises[].muscle` normalizado pelo catálogo em `normalizeSavedWorkouts` | Formato 6 preservado; nenhum campo de perfil é exportado. |
| Treinos salvos | `normalizeSavedWorkouts` | Se o exercício existe no catálogo, o grupo do catálogo prevalece; senão, mantém o grupo salvo. |
| Busca e tags | `deriveTags` (nome + grupo + equipamento + tipo) | Facetas e busca. Tags são heurísticas de descoberta, não perfil anatômico. |
| Apoio indireto (`SINERGIA`) | regex sobre o nome do exercício + fator fixo | Só informa a prontidão; **não** entra em metas, XP, dano ou fraqueza. |
| Lombar | `LOMBAR_NIVEL`/regex e volume lombar | Região de carga separada; não é grupo muscular nem meta semanal. |

Observação importante: o grupo tem mais de uma fonte histórica (registro,
catálogo e treino salvo). Uma evolução para perfis precisa escolher uma regra
explícita e testável — não pode trocar a fonte em silêncio. Esta etapa não troca
nenhuma delas.

## 3. Contrato de compatibilidade da v1

O módulo novo é `js/perfil_exercicios.js`. Ele é carregado pelo entry
(`import './perfil_exercicios.js'`), registra seu manifesto e **não é consultado
por nenhuma regra de treino, meta, XP, chefão, CSV ou backup**.

Garantias:

1. **`muscle` continua autoritativo.** Nenhum registro é reescrito, migrado ou
   apagado. Os únicos remapeamentos continuam sendo os aliases legados já
   existentes (`Pescoço` → `Ombros`, `Glúteos` → `Posterior`).
2. **`grupo` do catálogo continua igual.** Não há novos grupos, nem renomeação
   de exercícios, nesta etapa.
3. **CSV não ganha colunas.** O formato continua 3, com as 22 colunas v1 + as
   colunas do formato 2; `Grupo do registro` continua sendo o grupo legado.
   Arquivos antigos continuam importáveis.
4. **JSON não ganha campos de perfil.** O backup continua formato 6;
   `logs[].muscle` é preservado e não há exportação de perfis. (Atualização
   17/10/2026 — seção 3.3: itens de `customExercises` ganharam os campos
   **opcionais de identidade** `idEstavel` e `versao`; arquivos antigos
   continuam importáveis e a identidade é cunhada na importação.)
5. **Metas, XP e chefões não mudam.** Nenhuma função de cálculo importa o
   módulo de perfis.
6. **Perfil não revisado não tem anatomia.** `perfilDoExercicio()` devolve
   `anatomia: null`, `padraoMovimento: null` e `revisao: null` para todos os 72
   exercícios. `contribuicaoAnatomica()` devolve `null`. Nome fora do catálogo
   também gera um perfil válido: **sem ID, grupo ou anatomia** quando é um nome
   solto (`origem: 'fora_do_catalogo'`, `idEstavel: null`), e — atualização da
   seção 3.3 — com `idEstavel` persistido quando é um exercício personalizado
   registrado (anatomia e revisão continuam `null` nos dois casos). Sem ID, o
   perfil não pode entrar em `PERFIS_REVISADOS` e nunca vira classificação;
   com ID de personalizado, o registro revisado também não é aceito (3.3).
7. **Perfil revisado é opt-in e auditável.** O registro
   `PERFIS_REVISADOS` está vazio na v1. Uma entrada precisa declarar revisor,
   data ISO, versão, músculos primários, secundários com
   `papel: 'secundario'`/`contribuicao: 'estimada'` e um padrão de movimento.
8. **Divergência não reclassifica.** Se um perfil revisado tentar mudar o ID,
   o nome canônico ou o **grupo legado** do catálogo, ele é ignorado: o perfil
   resultante volta a `nao_revisado` com a limitação
   `registro_revisado_invalido`. Não existe caminho em que um perfil novo mude
   o grupo de um registro antigo.
9. **“Séries equivalentes” é proibido no schema.** Campos como
   `seriesEquivalentes` e `seriesBiologicas` são rejeitados na validação. A
   contribuição secundária é uma estimativa, não uma série biológica
   equivalente.

### 3.1 Estados do perfil

| Estado | O que significa | O que o app pode fazer |
|---|---|---|
| `nao_revisado` | O padrão de todos os 72 exercícios. Só há identidade, aliases e grupo legado. | Exibir/registrar o exercício pelo grupo legado. **Não** inferir músculos, padrão, contribuição secundária ou recomendação anatômica. |
| `revisado` | Existe revisão profissional registrada (revisor, data, versão) e anatomia declarada. | Usar a anatomia **somente** em uma etapa que implemente essa leitura com migração e testes. Nesta PR, nada lê o perfil. |

### 3.2 API da base

- `PERFIL_SCHEMA_VERSION` / `PERFIL_STATUS` / `PERFIL_ORIGEM`: versão e estados.
- `idEstavelDoExercicio(nome)`: ID `ex-slug` derivado do nome canônico;
  aliases resolvem para o mesmo ID. Para exercício personalizado registrado,
  devolve o `idEstavel` **persistido** (seção 3.3); para nome solto, `null`.
- `aliasesDoExercicio(nome)`: apelidos do catálogo (identidade, não anatomia);
  para personalizado, os sinônimos declarados pelo usuário.
- `perfilDoExercicio(nome)`: perfil não revisado por padrão; aceita um registro
  injetado apenas para testes/migrações explícitas. Resolve personalizado
  registrado antes do catálogo (seção 3.3).
- `contribuicaoAnatomica(nome)`: `null` até existir perfil revisado.
- `validarPerfilExercicio` / `validarRegistroPerfis`: gates do schema.
  `idEstavel` é obrigatório no formato `ex-slug` para perfil de catálogo; para
  perfil fora do catálogo só `null` ou um `ex-slug` são aceitos.
- `inventarioTaxonomia()`: inventário somente leitura usado nesta documentação
  e em `tests/engine/45_perfil_exercicios.js`.
- (17/10/2026) `idEstavelDeNomePersonalizado` / `idEstavelValido` /
  `idsEstaveisDoCatalogo` / `perfilDePersonalizado` /
  `setExerciciosPersonalizadosRef`: identidade versionada de personalizados
  (seção 3.3). A lista de personalizados entra por injeção de referência
  (mesmo padrão de `setCustomExercisesRef`), sem ciclo de import.

### 3.3 Identidade versionada de exercícios personalizados (17/10/2026)

Exercício personalizado é definido pelo **usuário** e nunca passou por revisão
profissional. A identidade dele foi versionada (decisão #8) sem abrir porta
para anatomia inventada:

- **`idEstavel` (`ex-slug`) cunhado uma única vez** (na criação, ou na
  importação/carga de arquivo antigo) e **preservado em renomes e edições**:
  o nome é rótulo, a identidade é o ID. A cunhagem é determinística (mesma
  lista → mesmos IDs; recarregar sem salvar não recunha).
- **IDs do catálogo são reservados**: um personalizado não pode cunhar nem
  preservar (vindo de arquivo) um ID igual ao de um dos 72 exercícios — a
  chave de `PERFIS_REVISADOS` é o ID e identidade trocada seria impessoação.
  Colisão entre personalizados segue "a 1ª ocorrência mantém".
- **`versao` (inteiro ≥ 1)** versiona a **definição** do exercício: começa em 1
  e sobe a cada edição. É metadado de identidade, não revisão anatômica.
- **Perfil sempre `nao_revisado`.** `perfilDoExercicio()` devolve
  `origem: 'fora_do_catalogo'` com o ID persistido, os sinônimos como aliases e
  o grupo declarado pelo usuário apenas como agrupamento organizacional
  (limitações `grupo_declarado_pelo_usuario` e, quando aplicável,
  `sem_id_estavel`). `anatomia`, `padraoMovimento` e `revisao` ficam `null`;
  `contribuicaoAnatomica()` devolve `null`.
- **Revisão de personalizado continua bloqueada.** Se `PERFIS_REVISADOS` (ou um
  registro injetado) tiver uma entrada para o ID de um personalizado, ela é
  ignorada e o perfil mantém `registro_revisado_invalido` — a decisão de como
  revisar personalizados (quem revisa, com qual fluxo de opt-in) continua
  pendente. O grupo do usuário **nunca** é lido como anatomia validada.
- **Formatos preservados.** Os campos vivem nos itens de `customExercises` do
  backup JSON (formato **6**, campos opcionais: antigos importam e recebem
  identidade cunhada; leitores antigos preservam campos desconhecidos) e no
  `localStorage` do módulo. O CSV formato 3 **não** ganha colunas; a aba
  Catálogo continua com as 12 colunas de sempre.
- **Registros não são tocados.** `logs[].exercise` continua sendo o nome
  gravado; renomear o personalizado não reescreve registros antigos nem muda
  metas, XP, chefões ou histórico (`muscle` segue autoritativo).

Garantido por `garantirIdentidadeVersionada` (`js/custom_exercises.js`) e testes
em `tests/engine/45_perfil_exercicios.js` (18d), `tests/engine/70_csv_backup.js`
e `tests/ui/60_csv_mapa_delegacao.js`.

## 4. O que esta etapa não faz

- Não cria grupos como `Panturrilha`, `Glúteo`, `Adutores` ou `Isquiotibiais`.
- Não muda o `muscle` de nenhum exercício ou registro.
- Não converte `grupo` em “músculo-alvo” nem cria metas por músculo.
- Não usa nome, tag, prefixo ou regex como classificação anatômica.
- Não transforma o fator de apoio indireto em série equivalente.
- Não usa perfil em recomendação, ranking, XP, chefão, PR, 1RM ou volume.
- Não define modalidade de progressão, unidade de incremento ou carga externa.
- Não cria perfil **anatômico** para exercício personalizado do usuário. (A
  identidade versionada — `idEstavel`/`versao`, sem anatomia — foi acrescentada
  em 17/10/2026 e está descrita na seção 3.3.)
- Não exporta perfil em CSV nem em JSON.

## 5. Mudanças futuras que exigem revisão profissional

| Mudança | Exige revisão? | Por quê | Gate adicional |
|---|---|---|---|
| Separar `Posterior`/`Pernas` em grupos-alvo | **Sim** (Educação Física/biomecânica) + decisão de produto | A escolha de grupos e a atribuição de exercícios não são dedutíveis de nome/tag. | Migração reversível, histórico preservado, dry-run e aprovação explícita. |
| Declarar músculos primários/secundários por exercício | **Sim** | Envolve técnica, variante, amplitude e execução; o catálogo não tem esses dados. | Revisor, data, versão, vocabulário e casos revisados. |
| Usar perfis em metas semanais, XP, chefões ou ranking | **Sim** + produto | Muda contabilidade e gamificação de dados já existentes. | Perfis revisados, explicação na UI, testes de dados legados e ausência de reclassificação silenciosa. |
| Alterar fatores de `SINERGIA` ou tratá-los como estímulo | **Sim** | Fator fixo não mede estímulo; “série equivalente” não é unidade biológica. | Manter rótulo de estimativa e testar estados desconhecidos. |
| Modelar carga externa (barra/carrinho/máquina), 1RM > 12 reps | **Sim** + engenharia/produto | A convenção da planilha é explícita e não representa a massa externa total. | Rótulo de base, valor digitado preservado, nenhuma conversão retroativa. |
| Mensagens de dor, lesão, RIR ou prontidão individual | **Sim** (profissional de saúde apropriado) | O app registra relatos, não mede fisiologia nem diagnostica. | Linguagem não prescritiva, opt-in e limites documentados. |
| Revisar exercício personalizado do usuário | **Sim**, se for gerar anatomia | O grupo declarado pelo usuário é organizacional, não validado. | Fluxo de revisão/opt-in ou manter `nao_revisado`. |
| Renomear exercício do catálogo / manter ID antigo | Não é clínico | É governança de identidade e compatibilidade. | Alias/migração explícita e teste de round-trip. |
| Acrescentar campos ao CSV/JSON | Não é clínico | É compatibilidade de formato. | Nova versão de formato, leitura dos arquivos antigos e round-trip. |

## 6. Decisões de produto (decididas e pendentes)

1. **DECIDIDA em 17/10/2026 — `muscle` é PERMANENTE.** Não vira campo
   legado: permanece autoritativo como grupo gravado nos registros, no CSV
   formato 3, no backup JSON formato 6, nas metas semanais e no histórico,
   preservando a contabilidade existente de XP e chefões. As regras atuais
   que consultam primeiro o grupo do catálogo para XP/chefões (seção 2)
   continuam intactas; esta decisão não as substitui nem reclassifica logs.
   Uma eventual visão anatômica derivada não substitui `muscle` nem reescreve
   registros antigos.
2. **PENDENTE — Separar só no cálculo ou também na UI?** Criar grupos visuais novos muda
   filtros, metas e a forma como o usuário lê o histórico; pode ser pior para
   quem já usa `Posterior` há meses.
3. **PENDENTE — O que fazer com registros antigos em uma eventual visão derivada?**
   Definir se e como oferecer mapeamento versionado com consentimento,
   preservando sempre o `muscle` original (decisão #1). Reescrita silenciosa
   está descartada.
4. **PENDENTE — Vocabulário anatômico.** Definir IDs/rótulos de músculos, o que é
   primário/secundário/estabilizador e como variantes de execução entram no
   perfil. A base aceita texto, mas não define uma taxonomia anatômica própria.
5. **DECIDIDA em 17/10/2026 — apoio indireto permanece aviso heurístico.**
   Exibir como “contribuição estimada / séries ponderadas” (fator fixo
   0,3–0,5), **nunca** como “série equivalente” ou medida validada de
   estímulo. Não conta em metas semanais, XP nem chefões; não serve para
   inferir anatomia de exercício não revisado. Alterar fatores ou transformar
   isso em estímulo exige revisão profissional (seção 5).
6. **PENDENTE — Progressão.** Definir modalidades (carga externa, peso corporal, assistência,
   variante, reps, tempo) e unidade do incremento (por haltere, por lado, total,
   pino). A base v1 não tem esses campos.
7. **PENDENTE — Carga externa.** Quando barra/carrinho/máquina forem identificáveis,
   separar `loadEntered` de estimativa externa sem alterar o valor digitado.
8. **PENDENTE — Exercícios personalizados.** Quem revisa, como versionar e como evitar que
   um grupo declarado pelo usuário seja lido como anatomia validada.
   **Atualização (17/10/2026):** o versionamento de identidade está resolvido
   (seção 3.3: `idEstavel` estável em renomes + `versao` da definição, com o
   grupo do usuário restrito a agrupamento organizacional). Seguem pendentes:
   **quem** revisa personalizados e **qual fluxo de opt-in** permitiria, um dia,
   anatomia revisada para um exercício do usuário — até lá, o perfil fica
   sempre `nao_revisado` e revisões para o ID são ignoradas.
9. **DECIDIDA em 17/10/2026 — exportação de perfil fica FORA por enquanto.**
   CSV formato 3 e backup JSON formato 6 não ganham campos/colunas de
   perfil ou anatomia. **Única exceção já existente:** itens de
   `customExercises` no backup podem conter `idEstavel`/`versao` opcionais
   de identidade (seção 3.3), não de anatomia. Arquivos antigos continuam
   importáveis; exportar perfis no futuro exige nova decisão de produto e
   compatibilidade de formato, sem perder `muscle`.
10. **PENDENTE — Governança da revisão.** Quem assina, com quais fontes, por quanto tempo a
    revisão vale e como registrar uma revisão substituída.

## 7. Critérios de aceitação para a próxima etapa

- Perfis revisados com revisor, data, versão e vocabulário acordado.
- Nenhum `muscle` histórico reescrito sem migração explícita, reversível e
  comunicada.
- CSV/JSON antigos continuam importáveis; exportação de ida e volta coberta.
- Metas, XP, chefões e ranking têm testes antes/depois com dados legados.
- Perfil não revisado ou inválido não gera anatomia nem contribuição.
- UI explica o que é estimativa e não chama heurística de medida ou prescrição.
- Decisões de produto registradas antes de ligar o perfil a recomendações.

## 8. Onde isso vive

- Runtime: `js/catalogo.js` (catálogo, grupos, recuperação, `SINERGIA`).
- Base de perfis: `js/perfil_exercicios.js`.
- Exercícios personalizados e identidade versionada: `js/custom_exercises.js`
  (`garantirIdentidadeVersionada`) e `js/perfil_exercicios.js` (seção 3.3).
- Registro/migração de log: `js/persistencia.js` (`migrateLog`,
  `normalizeSavedWorkouts`).
- Metas/recuperação: `js/assistente.js`.
- XP/chefões: `js/gamificacao.js`.
- CSV: `js/historico.js`; JSON: `js/backup.js`.
- Testes: `tests/engine/45_perfil_exercicios.js` e os testes existentes de
  recuperação, CSV, backup, XP e gamificação.

## Apêndice — inventário completo por grupo

Os nomes abaixo são exatamente os do catálogo de runtime. A ordem é a de
declaração em `js/catalogo.js`.

### Peito (10)

Supino Reto na Máquina · Supino Reto com Barra · Supino Inclinado c/ Halteres ·
Supino Inclinado com Barra · Supino Reto com Halteres · Crossover na Polia Alta ·
Crucifixo na Máquina · Peck Deck · Flexão de Braço · Paralelas (foco peito)

### Costas (9)

Barra Fixa (Pull-up) · Puxada Frontal na Polia · Remada Curvada com Barra ·
Remada Unilateral c/ Halter · Remada Baixa na Polia · Voador Inverso ·
Levantamento Terra · Pulldown na Polia · Remada Cavalinho

### Pernas (7)

Leg Press 45° · Agachamento Hack · Agachamento Livre · Cadeira Extensora ·
Afundo Búlgaro · Afundo c/ Halteres · Agachamento Sumô

### Posterior (8)

Mesa Flexora · Stiff com Barra · Elevação Pélvica (Hip Thrust) · Abdutor ·
Cadeira Adutora · Panturrilha em Pé · Panturrilha Sentado · Swing de Kettlebell

### Ombros (9)

Desenvolvimento Militar · Desenvolvimento c/ Halteres ·
Elevação Lateral c/ Halteres · Elevação Frontal c/ Halter · Face Pull ·
Remada Alta na Polia · Encolhimento de Ombros · Manguito Rotador ·
Extensão Cervical

### Bíceps (6)

Rosca Direta com Barra · Rosca Martelo · Rosca Alternada c/ Halteres ·
Rosca Scott · Rosca na Polia Baixa · Rosca Concentrada

### Tríceps (7)

Tríceps Corda na Polia · Tríceps na Polia Alta ·
Tríceps Unilateral (francês/testa) · Tríceps Francês na Polia ·
Tríceps Testa com Barra W · Paralelas (foco tríceps) · Supino Reto Pegada Fechada

### Abdômen (7)

Abdominal na Polia Alta · Rotação na Polia · Abdominal Supra no Solo ·
Elevação de Pernas · Abdominal Bicicleta · Russian Twist · Ab Wheel

### Core (2)

Prancha Isométrica · Prancha Lateral

### Antebraço (2)

Extensão de Punho · Flexão de Punho

### Cardio (5)

Corrida (Esteira) · Corrida (Rua) · Bike / Ergométrico · Elíptico ·
Remo (Ergômetro)

### Geral (0)

Nenhum exercício do catálogo. É o fallback de grupo para registros sem grupo
reconhecido e não entra no mapa muscular.
