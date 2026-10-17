# Diário de Cargas // Berzerker Mode

PWA 100% local para registrar cargas, treinos e evolução — com gamificação (XP, patentes,
chefões, missões e temporadas), integração com a planilha de treino e um pool de exercícios
com tags. Sem backend, sem conta, sem nuvem: os dados vivem no IndexedDB do aparelho,
com espelho no `localStorage`, e continuam funcionando **offline na academia**.

**App publicado:** <https://lucasrangel89.github.io/diario/> (GitHub Pages, branch `main`)
**Novidades por versão:** [CHANGELOG.md](CHANGELOG.md)

---

## O que o app tem

### ⚡ Hoje e Montador
A tela **Hoje** abre no registro rápido (data, grupo, exercício, carga e reps). Em **Mais detalhes** continuam disponíveis o registro série a série, tipo de carga, RIR, técnica, meta do próximo treino, sessão, conferência, observações e as ferramentas de aquecimento/anilhas. O registro de cardio fica recolhido até ser necessário; o **Montador** tem tela própria para criar e gerenciar treinos.

O **Treino em Andamento** (▶ Iniciar) mostra cada exercício como cartão compacto com número,
grupo/nome, meta e estado — só a unidade pendente atual abre (abrir outra recolhe a anterior);
na unidade aberta ficam carga, reps e ✔ Registrar, e "Mais detalhes" guarda o resto (inclusive
aquecimento/anilhas calculados pela carga do cartão). Bi-set abre como um bloco com os dois
formulários e registro conjunto. Com a sessão ativa, o Registro rápido ganha **➕ Contar no
treino em andamento**: o registro entra na sequência como item **Extra** concluído (mesmo log
do histórico, sem marcar itens planejados — nome igual pede escolha explícita).

### 📜 Histórico no formato da planilha
Abas **Log · Progresso · Semana a semana · Peso corporal**, com as colunas exatas da
planilha (Data, Sessão, Exercício, Carga registrada, S1–S5, RIR, Conferir?, Unidade,
Fator, Lados, Carga efetiva, Total reps, Volume, Melhor/Menor série, 1RM Epley,
Métrica de progresso). Import/export **CSV multi-aba** (`--- Sheet: ... ---`, `;`,
dd/mm/aaaa) — sem digitação dupla. O arquivo `planilha_diario.exemplo.csv` traz
dados fictícios de exemplo (o histórico real fica só no seu aparelho).

### 🏃 Corridas (última aba de Treino)
A navegação mantém os quatro grupos **Treino · Jogo · Você · Config**. Em **Treino → Corridas**
aparecem **somente Corrida (Rua) e Corrida (Esteira)**: registro/edição com tempo `h:mm:ss`,
pace ao digitar, campos opcionais de tipo, RPE, FC média e tênis; exclusão com confirmação.
O painel mostra totais, resumos por semana ISO/mês/ano, recordes informativos (pace médio da
corrida inteira, não tempo oficial), km por tênis e uma lista filtrável por modalidade/ano.
Nomes antigos de corrida/esteira aparecem com rótulo canônico sem reescrever o registro ao
editar apenas outros campos. Os filtros afetam só a lista; totais e recordes usam todas as
corridas. **Recordes do painel não alteram o PR global de cardio, o XP ou o combate.**
Bike, elíptico e remo continuam no Histórico/CSV Cardio e no formulário de cardio de Hoje,
fora da aba Corridas. Todos os registros permanecem na mesma coleção `logs`; backup JSON
v5/v6, CSV v1/v2/v3 (inclusive D6 e `PR (informativo)`) continuam compatíveis.

### 🏋️ Convenções de registro (nunca mudam)
- **Carga registrada** = o número que você vê (pino; 1 haltere em pares; soma das anilhas
  SEM barra/carrinho; 1 lado da polia no crossover; peso corporal do dia na barra fixa).
- **Carga efetiva** = registrada × **Fator** (2 = par de halteres ou crossover).
- **Volume** = efetiva × total de reps × **Lados** (2 = reps por lado). Prancha = segundos,
  volume 0.
- **1RM Epley** = efetiva × (1 + melhor série ÷ 30), só com melhor série ≤ 12.
- **Sinal da próxima sessão:** menor série da última sessão no topo da faixa → **⬆ Progredir**;
  senão **➡ Manter e buscar reps**.
- "Extra estimado" (barra/carrinho) é informativo e nunca entra nos cálculos.

### 🔎 Buscar — tags acumulativas (Fase 1 do pool de exercícios)
Pool de ~65 exercícios com **25 tags acumulativas** em 6 categorias (padrão de movimento,
equipamento, objetivo, cadeia, nível, contexto) — derivadas por regra, com busca textual
tolerante a acentos/apelidos (`bench press`, `rdl`...), modo **OU/E**, atalhos (em casa,
push, pull, força, já fiz, nunca fiz) e busca no histórico com os mesmos filtros.
Botão 🔎 no registro e no criador de treino abre o seletor rápido com tags.

### 📱 Screenshots

| Retrato (celular) | Paisagem |
|---|---|
| ![Tela no celular](images/screens/screenshot-portrait-1080x1920.webp) | ![Tela em paisagem](images/screens/screenshot-landscape-1920x1080.webp) |

### 💾 Seus dados e backup

- **Onde vivem:** tudo fica no seu aparelho — **IndexedDB** (armazenamento
  principal, via `js/storage.js`) com espelho no `localStorage` durante a
  transição. Nada sai do navegador: sem servidor, sem conta, sem nuvem.
- **Chaves de dados** (`berzerker_*`): `logs` (treinos), `saved_workouts`
  (treinos salvos), `game_saves` (coleções e dados de temporada por tema; XP e patente globais),
  `game_shared` (deload, testes, peso), `story` (Story Card), `settings`,
  `user_bodyweight`, `custom_exercises`, `game_theme`, `last_backup_at`.
  Retratos de chefões e foto de fundo do Story Card são guardados como
  **Blob comprimido no IndexedDB** (nunca base64 no localStorage).
- **Backup:** aba ⚙️ Config → **Exportar Backup (.json)** — exporta tudo,
  inclusive suas imagens. Se o navegador tem File System Access API, o
  arquivo é salvo com um toque; senão cai no download normal. O app avisa
  quando o último backup tem mais de 7 dias. Falhas de gravação no armazenamento
  deixam um aviso persistente com ação direta de exportar backup JSON.
- **Restauração:** **Importar Backup (.json)** na mesma aba restaura tudo
  (restauração de ponta a ponta coberta por teste automatizado).
- **Migração:** na primeira abertura da versão nova, os dados antigos do
  localStorage são copiados para o IndexedDB com validação — o localStorage
  original continua intacto até a migração ser confirmada, e nada é apagado.

### 🤖 Assistente de treinos (Fases 2 e 3)
- **Ordem sugerida do treino (Fase 2):** ao iniciar um treino, o app ordena os exercícios
  por regras — ativação/correção primeiro (manguito, face pull) → compostos multiarticulares
  → isoladores → core/abdômen no fim — sem fatigar um músculo que será apoio de um exercício
  posterior (ex.: antebraço só depois de quem precisa de pegada) e alternando empurrar/puxar
  entre os compostos. Cada exercício mostra **o porquê da posição** (📌) e você reordena à
  vontade com ▲▼ (bi-set anda sempre junto). O botão **✨ Ordenar com o assistente** faz o
  mesmo no criador de treino.
- **Prontidão estimada (Fase 3):** os 10 grupos são **Peito, Costas, Pernas (quadríceps), Posterior
  (isquiotibiais + glúteo), Ombros, Bíceps, Tríceps, Abdômen, Core e Antebraço**. O mapa combina
  **recuperação** (janela 24–72 h) com o **volume direto da semana** (faixa-alvo 10–20 séries por
  grupo) — cada box mostra a prontidão estimada e as séries registradas naquele grupo.
  **Estimativa baseada em tempo desde o último treino e volume semanal; não mede fadiga.**
- **⚠️ Alerta de Lombar:** alerta de carga da região lombar com gradação (leve/moderado/pesado)
  baseado nos exercícios da última sessão: calcula horas de recuperação restantes (estimativa), dá dica prática
  de quais exercícios evitar ou fazer com carga leve, mostra aviso em cada exercício durante a sessão,
  e penaliza treinos que usam lombar na sugestão automática quando a região está carregada.
  **Estimativa baseada no tempo desde a última sessão e no volume; não substitui orientação profissional.**
- **Cardio no histórico:** corridas, bike, elíptico e remo aparecem na aba Histórico
  com distância, tempo, pace e XP, com opção de filtrar por grupo "Cardio". A lista do dia
  e o histórico da Busca também abrem o editor dedicado de corrida, preservando id e tema
  sem misturar campos de musculação. Campos opcionais D6 seguem em `logs`/CSV 3 (JSON 6).
- **Teclado no celular:** campos de data abrem o seletor nativo no Android
  e inputs de texto focam corretamente para abrir o teclado virtual (fonte 16px no mobile evita zoom).
- **Cadastro de exercício manual:** botão "➕ Novo exercício" na aba Buscar permite criar
  seus próprios exercícios (nome, grupo, equipamento, tipo, faixa, descanso, sinônimos, tags extras,
  marcação se carrega lombar), salvos em localStorage, aparecendo na busca e no seletor rápido.
  O formulário tem modo de edição/exclusão (`openCustomExModal(id)`); cada card de exercício
  personalizado na aba Buscar oferece o botão **✏️ Editar** para abrir o mesmo formulário.
- Novos exercícios: Extensão Lombar (Banco Romano), Cadeira Adutora, Desenvolvimento Arnold,
  Swing de Kettlebell, Caminhada do Fazendeiro, Empurrar Trenó, Superman, Agachamento Sumô, Pullover.
- **Co-ativação (sinergia):** puxadas, empurradas e compostos podem sinalizar apoio indireto
  (pegada, braços, ombros, core, abdômen e cadeia posterior). O app aplica fatores parciais só
  como **aviso de recuperação** no mapa; a contribuição estimada (séries ponderadas, não séries
  biológicas equivalentes) não entra na meta semanal, no XP nem no bônus de fraqueza dos chefões.
- **Próximo treino recomendado:** ordena os treinos salvos por heurísticas de janela de recuperação
  estimada e séries da semana, explicando o raciocínio ("Por quê: …"). Grupos sem histórico direto
  ou indireto são tratados como **sem dados** (peso neutro no ranking), não como descansados.
  A sugestão é um apoio revisável, não uma prescrição. Ao terminar a sessão, o app sugere o próximo.
- **Montador livre:** painel "🎯 Estímulo da semana — o que falta" no criador de treino; você
  escolhe exercícios (com tags/busca), o sistema reordena e avisa o que falta — assistente,
  não robô mandando.

### 🧬 Taxonomia e perfis de exercício (base v1)
- Os grupos atuais continuam exatamente os mesmos: **Peito, Costas, Pernas, Posterior, Ombros,
  Bíceps, Tríceps, Abdômen, Core e Antebraço** no mapa, mais **Cardio** no catálogo. Nenhum
  registro foi reclassificado e `muscle` continua o campo legado dos logs, do CSV e do JSON.
- A categoria **Posterior** continua sendo uma convenção de contabilidade que mistura
  isquiotibiais, glúteos, adutores, abdutores e panturrilhas. Separá-la em grupos-alvo é uma
  evolução futura que exige revisão profissional, migração reversível e decisão de produto —
  não uma troca de texto no catálogo.
- `js/perfil_exercicios.js` prepara a base **versionada** (schema 1): ID estável derivado do nome
  canônico, estados `nao_revisado`/`revisado`, validação com revisor/data/versão e proibição de
  "séries equivalentes". **Todos os 72 exercícios seguem `nao_revisado` e sem anatomia**; perfil
  não revisado não gera músculo, padrão de movimento nem recomendação.
- Nenhuma meta, XP, chefão, volume, PR, CSV ou backup consulta o perfil nesta etapa. O inventário
  completo, o mapa de impacto e as pendências estão em
  [`docs/TAXONOMIA_EXERCICIOS.md`](docs/TAXONOMIA_EXERCICIOS.md).

### ⚔️ Gamificação
10 temas — **clássico, Zodíaco, Hércules, Filmes de Ação, Folclore Brasileiro, Mitologia
Nórdica, Roma Antiga, RPG de Mesa, Galáctica, Senhor dos Anéis** — com 10 patentes visuais e
12 chefões por tema. A patente e o XP são globais; cada tema mantém sua coleção de chefões e
retratos. Treino rende 2,5 XP por série efetiva (reps dentro da faixa; RIR ≤ 3 quando informado),
com teto provisório de 20 séries por grupo/semana; kg seguem como estatística. Registros pendentes
em `Conferir?` não pontuam; PR só qualifica após três sessões anteriores do exercício e no máximo
um crítico por exercício/semana. Há missões semanais, temporadas de 4 semanas (com deload na quarta)
e Story Card com moldura temática. O dano novo usa séries efetivas (1 por série válida, teto compartilhado
de 20 por grupo/semana), com fraqueza dinâmica ×2 no grupo de menor volume da semana anterior e PR ×2.
O HP provisório cresce de 100 a 298; o arquivo de exemplo disponível tem somente duas linhas de treino,
insuficientes para ajuste empírico, então essa escala deve ser recalibrada quando houver CSV histórico
representativo. A migração mantém por ID derrotas e HP relativo antigos; registros anteriores à migração
formam a linha de base e apenas novos registros usam a regra convertida. Um chefão marcado como Mestre
(archetype `Ms`) bloqueia dano se algum grupo não cumprir o mínimo semanal, sem cura retroativa (regra confirmada).

#### 🎨 Artes da gamificação (pixel art retrô + retratos temáticos)

| Pasta | Conteúdo | Uso |
|---|---|---|
| `images/bosses/` | 120 retratos WebP; Zodíaco usa as imagens fornecidas dos 12 Cavaleiros | arena, grade de chefões e Card do Chefão |
| `images/patentes/` | 100 emblemas (`tema-01…10`) | modal de patentes, header e cards |
| `images/temas/` | 10 selos | galeria de temas e selo do Story Card |
| `images/cards/` | 10 fundos | plano de fundo dos dois cards gerados em canvas |
| `images/bosses/reserva/` | 35 variações | banco para trocar qualquer retrato sem gerar arte nova |

Os retratos do Zodíaco preservam a proporção das imagens fornecidas e são exibidos sem o
filtro pixelado; os outros temas mantêm o estilo de pixel art. Upload por chefão tem prioridade
sobre a arte padrão, e o `DEFAULT_BOSS_PORTRAITS` aceita
qualquer caminho — inclusive os arquivos de `reserva/`.

---

## Desenvolvimento

```bash
npm ci               # dependências de desenvolvimento (jsdom e Tailwind CLI)
npm run build:css    # regenera vendor/tailwind.css (necessário ao criar classes novas)
npm run serve        # servidor local em http://localhost:8080
npm test             # motor + UI + módulos + Service Worker
```

### Testes

- `node test_engine.js` — runner do motor: carrega os módulos e avalia os trechos de
  `tests/engine/*.js` (volume/1RM/XP, recuperação e temas, catálogo e busca, arte e jogo,
  validação de dados, armazenamento, CSV e backup). Os trechos rodam no mesmo escopo,
  na ordem do nome do arquivo.
- `node test_ui.js` — runner da UI (jsdom): avalia os trechos de `tests/ui/*.js`
  (boot/navegação, busca e registro, assistente/sessão, reservas e card, backup,
  CSV/mapa de recuperação e fluxos da aba Corridas em `tests/ui/90_corridas_aba.js`).
- `node --experimental-vm-modules test_modules.js` — avalia o grafo real de ES modules.
- `node test_sw.js` — Service Worker: instalação, offline, ativação, a regra de versão e o
  precache B5/D8 (as 110 imagens de `images/patentes/*.webp` + `images/cards/*.webp`,
  1.057.982 bytes medidos; falha num item não ativa a versão nova e preserva a anterior).
- Cada runner confere o manifesto das áreas e um piso de checagens (`tests/**/99_fechamento.js`):
  apagar, renomear ou esvaziar um trecho de teste falha em vez de reduzir a cobertura em silêncio.
- `npm run check:docs` — docs e comentários não podem apontar para linha/seção dos runners
  (os checks vivem em `tests/engine/*` e `tests/ui/*`) nem para um arquivo de área inexistente.
- `node scripts/validacao-navegador.js` — validação em navegador real (Service Worker, offline,
  IndexedDB, download do backup, Corridas, layout 412 px). Fora do `npm test`; precisa de
  `npm i --no-save playwright-core` e de um Chrome (`DIARIO_CHROME_PATH`). Sem eles, o
  script local avisa que pulou; na CI o job **Validação em navegador real** exige o Chrome
  do sistema (`DIARIO_EXIGIR_NAVEGADOR=1`) e é bloqueante. Roteiro/limites em
  `docs/VALIDACAO_MANUAL.md`.

- `js/storage.js` — camada única de armazenamento (IndexedDB + espelho no localStorage, migração automática, imagens como Blob)
- `js/app.js` — entry: importa os demais módulos na ordem certa
- `js/actions.js` — despachante central de eventos (delegação data-action)
- `js/catalogo.js` — catálogo + motor de volume/convenções + tags
- `js/gamificacao.js` — temas, patentes, chefões
- `js/assistente.js` — ordem sugerida (Fase 2) + prontidão estimada/próximo treino (Fase 3)
- `js/planilha_data.js` — seed com o histórico real
- `js/historico.js` — aba Histórico + CSV multi-aba
- `js/busca.js` — aba Buscar + seletor rápido
- `js/custom_exercises.js` — exercícios personalizados (cadastro, índice de busca e a janela "➕ Novo exercício")
- `js/datas.js` — regra única de data válida (backup, CSV e recuperação)
- `js/perfil_exercicios.js` — base versionada de perfis de exercício (v1): identidade, estados de revisão e inventário da taxonomia; não é usada por metas, XP ou recomendações
- `js/corridas.js` — funções puras de duração, pace, classificação Rua/Esteira (inclusive nomes legados), resumos ISO e recordes informativos de corrida/km por tênis (logs por parâmetro; sem estado/DOM)
- `js/persistencia.js` — gravação do estado (logs, treinos, ajustes, jogo, Story Card)
- `js/backup.js` — validação do backup JSON, montagem do pacote e parser de CSV
- `js/cartoes.js` — Story Card e Card do Chefão (canvas, arte temática e símbolos)
- `js/calculadoras.js` — aba Cálculos (1RM, aquecimento, anilhas), recordes e medalhas
- `js/sessao.js` — treino ao vivo, cronômetro de descanso, bi-sets e efeitos do boss
- `js/config.js` — migração para o IndexedDB, painel de armazenamento (Config) e seed do primeiro uso
- `js/boss.js` — tela do chefão, retratos (padrão, upload e reservas) e lightbox da arte
- `js/registro.js` — registro, edição/criação de corrida com editor compartilhado, registros do dia, mapa de prontidão, sugestão e cardio
- `js/app.js` — entry: importa os módulos, concentra estado e desenha a aba Corridas a partir de `logs`
