# Diário de Cargas // Berzerker Mode

PWA 100% local para registrar cargas, treinos e evolução — com gamificação (XP, patentes,
chefões, missões e temporadas), integração com a planilha de treino e um pool de exercícios
com tags. Sem backend, sem conta, sem nuvem: tudo vive no `localStorage` do aparelho e
continua funcionando **offline na academia**.

**App publicado:** <https://lucasrangel89.github.io/diario/> (GitHub Pages, branch `main`)

---

## O que o app tem

### 📜 Histórico no formato da planilha
Abas **Log · Progresso · Semana a semana · Peso corporal**, com as colunas exatas da
planilha (Data, Sessão, Exercício, Carga registrada, S1–S5, RIR, Conferir?, Unidade,
Fator, Lados, Carga efetiva, Total reps, Volume, Melhor/Menor série, 1RM Epley,
Métrica de progresso). Import/export **CSV multi-aba** (`--- Sheet: ... ---`, `;`,
dd/mm/aaaa) — sem digitação dupla. O arquivo `planilha_diario.csv` traz o histórico real
(28/09–10/10/2026) como ponto de partida.

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

### 🤖 Assistente de treinos (Fases 2 e 3)
- **Ordem sugerida do treino (Fase 2):** ao iniciar um treino, o app ordena os exercícios
  por regras — ativação/correção primeiro (manguito, face pull) → compostos multiarticulares
  → isoladores → core/abdômen no fim — sem fatigar um músculo que será apoio de um exercício
  posterior (ex.: antebraço só depois de quem precisa de pegada) e alternando empurrar/puxar
  entre os compostos. Cada exercício mostra **o porquê da posição** (📌) e você reordena à
  vontade com ▲▼ (bi-set anda sempre junto). O botão **✨ Ordenar com o assistente** faz o
  mesmo no criador de treino.
- **Fadiga real (Fase 3):** o mapa de fadiga combina **recuperação** (janela 24–72 h) com o
  **volume da semana** (faixa-alvo 10–20 séries por grupo) — cada box mostra a prontidão real
  e as séries da semana.
- **Próximo treino recomendado:** sugere o treino salvo cujos grupos estão **mais descansados
  e mais abaixo da meta semanal**, explicando o raciocínio em português simples ("Por quê: …").
  Ao terminar a sessão, o app já empurra a sugestão do próximo.
- **Montador livre:** painel "🎯 Estímulo da semana — o que falta" no criador de treino; você
  escolhe exercícios (com tags/busca), o sistema reordena e avisa o que falta — assistente,
  não robô mandando.

### ⚔️ Gamificação
9 temas — **clássico, Zodíaco, Hércules, Filmes de Ação, Folclore Brasileiro, Mitologia
Nórdica, Roma Antiga, RPG de Mesa, Galáctica** — cada um com 10 patentes e 12 chefões
(retratos originais de IA em `images/bosses/` para clássico e folclore; upload por chefão
tem prioridade). XP, missões semanais, temporadas de 12 semanas, deload e Story Card
com moldura temática.

---

## Desenvolvimento

```bash
npm install          # só o Tailwind CLI (dev)
npm run build:css    # regenera vendor/tailwind.css (necessário ao criar classes novas)
npm run serve        # servidor local em http://localhost:8080
npm test             # testes do motor (node test_engine.js)
```

- `js/catalogo.js` — catálogo + motor de volume/convenções + tags
- `js/gamificacao.js` — temas, patentes, chefões
- `js/assistente.js` — ordem sugerida (Fase 2) + fadiga real/próximo treino (Fase 3)
- `js/planilha_data.js` — seed com o histórico real
- `js/historico.js` — aba Histórico + CSV multi-aba
- `js/busca.js` — aba Buscar + seletor rápido
- `js/app.js` — estado, sessão, UI
