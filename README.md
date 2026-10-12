# Diário de Cargas // Berzerker Mode

PWA 100% local para registrar cargas, treinos e evolução — com gamificação (XP, patentes,
chefões, missões e temporadas). Sem backend, sem conta, sem nuvem: tudo vive no
`localStorage` do aparelho e continua funcionando **offline na academia**.

**App publicado:** <https://lucasrangel89.github.io/diario/> (GitHub Pages, branch `main`)

---

## Fase 1 — Tags acumulativas + Busca/Filtros ✅

O pool de exercícios (60 entradas) agora carrega **25 tags acumulativas** — em média
7,4 tags por exercício — e existe uma **aba 🔎 Buscar** dedicada a achar qualquer coisa
em segundos, inclusive no histórico.

| Categoria | Tags |
|---|---|
| Padrão de movimento | `↗️ Empurrar` · `↙️ Puxar` · `⬇️ Agachar` · `📐 Dobradiça` · `🏋️ Composto` · `🔬 Isolado` · `↔️ Unilateral` |
| Equipamento | `🔩 Barra` · `💪 Halteres` · `🔗 Polia / cabo` · `⚙️ Máquina` · `🤸 Peso corporal` |
| Objetivo / estímulo | `🦍 Força` · `📈 Hipertrofia` · `🔥 Resistência` · `🏃 Condicionamento` |
| Cadeia / região | `🧱 Core` · `🍑 Cadeia posterior` · `🦵 Cadeia anterior` |
| Nível | `🟢 Iniciante` · `🟡 Intermediário` · `🔴 Avançado` |
| Contexto | `🏢 Academia` · `🏠 Em casa` · `🌳 Ao ar livre` |

As tags são **derivadas por regra** (`deriveTags()` em `js/catalogo.js`): nome + grupo +
equipamento + tipo de carga + faixa de reps. Só os casos especiais entram em
`TAG_OVERRIDES`. Isso significa que:

- adicionar um exercício novo ao catálogo já o deixa etiquetado sozinho;
- exercício **digitado à mão** (fora do catálogo) também ganha tags por inferência de nome
  (`Agachamento Búlgaro c/ Halteres` → `unilateral`, `halter`, `casa`...), então os filtros
  nunca ficam cegos;
- o histórico inteiro é filtrável por tag, mesmo com registros antigos.

### O que a aba 🔎 Buscar faz

- **Busca textual tolerante:** sem acento, com tokens em qualquer ordem e com apelidos em
  inglês (`bench press`, `rdl`, `lat pulldown`, `skull crusher`, `plank`...).
- **Chips de tag por categoria**, com contagem de resultados e modo **OU / E**
  (qualquer tag × todas as tags). O cartão do resultado **destaca as tags que bateram**,
  para você ver por que ele entrou na lista.
- **Filtros combináveis:** grupo muscular, equipamento, tipo de carga e ordenação
  (mais usados · usados há menos tempo · A–Z · grupo).
- **Atalhos prontos:** 🏠 Em casa · 🤸 Sem equipamento · ↗️ Push · ↙️ Pull · ⬇️ Pernas ·
  🧱 Core · 🦍 Força · 💪 Só halteres · 🕐 Já fiz · ✨ Nunca faz.
- **Ações direto do resultado:** ⚡ Registrar (preenche o formulário do dia com a carga da
  última vez e a sugestão da dupla progressão) · 🎯 No treino (manda pro criador de treino
  com as reps alvo pela faixa) · 📊 Evolução (abre o gráfico do exercício) · ↻ Repetir última.
- **Busca no histórico:** texto (exercício, observações, técnica, data), grupo, período
  (7/30/90/365 dias ou tudo) **e as mesmas tags** — com resumo de registros, dias,
  tonelagem e PRs. Dali dá para editar o registro ou pular para o dia.
- **Seletor rápido (🔎)** ao lado do campo de exercício, tanto no registro diário quanto no
  criador de treino: o mesmo motor num modal, e as tags do exercício digitado aparecem
  embaixo do campo como conferência.

### Arquivos

| Arquivo | Papel |
|---|---|
| `js/catalogo.js` | Catálogo tipado + **pool de tags**, derivação, índice de busca e `searchCatalog()` |
| `js/busca.js` | **Fase 1:** aba Buscar, filtros, presets, histórico filtrado e seletor rápido |
| `js/app.js` | Núcleo: estado, registro, sessão, cronômetro, gráficos, backup |
| `js/gamificacao.js` | XP, patentes, chefões, missões, temporadas, temas |
| `catalogo_exercicios.csv` | Catálogo exportado (inclui a coluna `tags`) |
| `vendor/` | Tailwind e Chart.js locais — o app não depende de CDN |

---

## Desenvolvimento

Não existe build em produção: é HTML + JS puro, servido como estático. As ferramentas
abaixo são só de desenvolvimento.

```bash
npm install          # tailwindcss (build do CSS) + jsdom (smoke test de UI)
npm run serve        # http://localhost:8080
npm test             # motor + UI
npm run test:engine  # só a lógica (node puro, sem dependências)
npm run test:ui      # só o smoke test de UI (jsdom: boot, abas, filtros, modal, registro)
npm run build:css    # regenera vendor/tailwind.css depois de criar classes novas
```

> **Importante:** o Tailwind é pré-compilado em `vendor/tailwind.css` (o app é offline).
> Usou uma classe nova em `index.html` ou `js/*.js`? Rode `npm run build:css`.
> Ao mudar arquivos locais, troque também o `VERSION` do `sw.js` para o cache da PWA atualizar.

## Dados

Tudo fica no `localStorage` do navegador. Use **⚙️ Config → Exportar backup (JSON)** —
o app lembra você a cada 7 dias. Também há export/import CSV no formato da planilha.

## Roadmap

Implementação em fases, para ir aos poucos:

- **Fase 1 — Tags + Filtros** ✅ *pool de 25 tags acumulativas + tela de busca/filtros
  (catálogo e histórico) + seletor rápido no registro diário.*
- **Próximas fases** — a base de tags já está pronta para ser reaproveitada
  (sugestões de treino por tag, modelos de treino, estatísticas agrupadas por tag,
  tags próprias do usuário nos registros).
