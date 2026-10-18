# Artes ThunderCats e The Office — produção individual (preparação editorial)

Sessão Arena `arena/dc4e2d49-diario` · 18/10/2026 · base `e66cec5` (main) · nenhuma alteração preexistente no checkout.

Aprovações registradas nesta sessão (antes da produção em lote): lote completo das 10 chamadas **sem** etapa intermediária de direção; linguagem visual **pixel art** para os dois temas (uma só linguagem, sem misturar); **listas do plano editorial aprovadas como escritas** (contagem real: **98 peças** — ver §5). Depois da confirmação de que a ferramenta não gera cartelas, a produção segue por **peças individuais** (lote 2 em diante). Nenhum tema foi cadastrado e nenhuma interface foi alterada.

## 1. Capacidade da ferramenta de geração

- **1 chamada = 1 imagem única e independente.** O contrato da ferramenta proíbe grade, colagem, contact sheet, montagem ou várias peças/variações numa mesma imagem: **cartelas com múltiplos assets não são geráveis** e não foram simuladas como imagem única.
- `offer_options` serve para escolher entre 2 candidatos **da mesma peça**, não para empacotar peças.
- Saída `.jpg/.jpeg/.png`, resolução definida pelo modelo (1024×1024 aqui; molduras saíram 768×1376), **sem garantia de canal alfa**.
- Orçamento inicial de 10 chamadas consumido no lote 1; lotes 2 e 3 (chamadas 11–30) autorizados para geração individual. Cada chamada = 1 peça. Não há como produzir 94–98 peças em poucas chamadas; a cartela passa a ser **montagem por código** (§3) ou cartela externa fornecida pelo usuário para recorte pelo `scripts/prepare-art.py`.

## 2. Inventário do lote — separação por origem

### 2.1 Imagens realmente geradas (30 originais, **fora do Git**)

Originais grandes em `.cache/artes-originais/lote*.png` (≈2 MB cada; `.cache/` é ignorado **e volátil** — entre turnos do sandbox os originais do lote 1 deixaram de existir; o registro durável são os SHA-256 no manifesto e os derivados versionados). Reprodução futura: conservar os originais externamente ou reenviar.

**Lote 1 (chamadas 1–10):**

| # | Peça | Original (cache) | Conteúdo revisado |
|---|---|---|---|
| 1 | Mumm-Ra, forma poderosa | `lote1-mumm-ra-poderoso.png` | Feiticeiro-múmia em forma musculosa, olhos e aura vermelhos, câmara de pedra/tecnologia ancestral |
| 2 | Patente Lenda de Thundera | `lote1-lenda-de-thundera.png` | Medalhão de ferro com espadas cruzadas e olho felino luminoso |
| 3 | Selo ThunderCats | `lote1-selo-thundercats.png` | Placa de ferro com cabeça felina e espadas cruzadas, rubis vermelhos |
| 4 | Fundo ThunderCats | `lote1-fundo-thundercats.png` | Salão de fortaleza com estátuas de gato e espada de cristal vermelho no altar |
| 5 | Impressora em pane | `lote1-impressora-em-pane.png` | Impressora atolada com folhas voando, fumaça cômica, escritório em cores discretas |
| 6 | Patente Lenda de Scranton | `lote1-lenda-de-scranton.png` | Medalhão dourado com louros e troféu de comédia no centro |
| 7 | Selo The Office | `lote1-selo-office.png` | Carimbo de papel com caneca e beterraba cruzados, grampeadores laterais |
| 8 | Fundo The Office | `lote1-fundo-office.png` | Escritório aberto ao anoitecer, sem pessoas |
| 9 | Moldura ThunderCats | `lote1-moldura-thundercats.png` | Moldura de ferro com rubis nos cantos e espada no topo |
| 10 | Moldura The Office | `lote1-moldura-office.png` | Moldura de papel/caderno com grampeador e anel de café |

**Lote 2 (chamadas 11–20) — chefões ThunderCats, cartela 1 em ordem editorial:**

| # | Peça | Original (cache) | Conteúdo revisado |
|---|---|---|---|
| 11 | Jackalman | `lote2-jackalman.png` | Canídeo saqueador agachado, armadura improvisada, clava |
| 12 | Monkian | `lote2-monkian.png` | Bruto símio com clava de pedra e escudo |
| 13 | Vultureman | `lote2-vultureman.png` | Inventor abutre com óculos e asas mecânicas, oficina |
| 14 | Slithe | `lote2-slithe.png` | Comandante reptiliano verde com machado |
| 15 | Ratar-O | `lote2-ratar-o.png` | Senhor da guerra murino com manoplas de poder |
| 16 | Grune | `lote2-grune.png` | Guerreiro felino de presas com maça; **borda decorativa interna** divergente dos demais (registrada; invisível no enquadramento circular do card) |
| 17 | Safari Joe | `lote2-safari-joe.png` | Caçador de alto tecnologismo com viseira e blaster |
| 18 | Captain Shiner | `lote2-captain-shiner.png` | Capitão espacial em uniforme naval escuro, corredor de nave |
| 19 | Hammerhand | `lote2-hammerhand.png` | Pirata ciborgue com antebraço-martelo, convés com correntes |
| 20 | The Driller | `lote2-the-driller.png` | Fera subterrânea com chifre-furadeira rompendo parede de pedra |

**Lote 3 (chamadas 21–30) — fecha as cartelas 1 e 2 do ThunderCats:**

| # | Peça | Original (cache) | Conteúdo revisado |
|---|---|---|---|
| 21 | Mumm-Ra, forma mumificada | `lote3-mumm-ra-mumificada.png` | Múmia feiticeira mirrada com cajado e facho vermelho, câmara de sarcófago (composição distinta da forma poderosa) |
| 22 | Patente Sobrevivente de Thundera | `lote3-patente-01.png` | Fragmento de cristal vermelho em anel de ferro simples (**plaqueta quadrada** — progressão do fragmento ao brasão) |
| 23 | Patente Aprendiz da Terceira Terra | `lote3-patente-02.png` | Insígnia felina em medalhão de bronze |
| 24 | Patente Explorador da Terceira Terra | `lote3-patente-03.png` | Bússola tecnológica com marcas de garras |
| 25 | Patente Sentinela da Toca dos Gatos | `lote3-patente-04.png` | Silhueta de fortaleza em relevo |
| 26 | Patente Guerreiro de Thundera | `lote3-patente-05.png` | Escudo com duas lâminas cruzadas e rubis |
| 27 | Patente Guardião do Código | `lote3-patente-06.png` | Medalhão luminoso com glifo espiral abstrato (sem letras) |
| 28 | Patente Portador da Espada Justiceira | `lote3-patente-07.png` | Espada ereta com raios e rubi no punho |
| 29 | Patente Protetor do Olho de Thundera | `lote3-patente-08.png` | Olho de metal ornamentado com íris de rubi |
| 30 | Patente Senhor dos ThunderCats | `lote3-patente-09.png` | Brasão felino com espadas e energia vermelha |

Runas/marcas decorativas nos salões e placas são abstratas, **sem nomes, números ou legendas legíveis** (conforme especificação).

### 2.2 Imagens fornecidas pelo usuário

**Nenhuma nesta sessão.** (Uma cartela externa sua pode acelerar as 88 peças pendentes: recorte/otimização seguem pelo `scripts/prepare-art.py`, com caixas manuais revisadas.)

### 2.3 Recortes/derivados versionados (30 WebP)

`images/artes/candidatos/` — **candidatos, fora do CORE do service worker, não carregados pela UI** (cache offline não cresce). Total **≈1,1 MB**. Campos completos (id, tema/categoria, origem, fonte, sha256, recorte, dimensões, formato, transparência, local de uso futuro, estado, notas de revisão) em [`manifesto-artes.json`](manifesto-artes.json).

| Derivado | Alvo | Método | Estado | Uso futuro (ao cadastrar o tema) |
|---|---|---|---|---|
| `thundercats/bosses/mumm-ra-poderoso.webp` | 512×512 | NEAREST 2:1 | candidato | `images/bosses/mumm-ra-poderoso.webp` |
| `thundercats/patentes/thundercats-10.webp` | 192×192 | LANCZOS | candidato | `images/patentes/thundercats-10.webp` |
| `thundercats/temas/thundercats.webp` | 192×192 | LANCZOS | candidato | `images/temas/thundercats.webp` |
| `thundercats/cards/thundercats.webp` | 1024×1024 | sem redimensionar | candidato | `images/cards/thundercats.webp` |
| `office/bosses/impressora-em-pane.webp` | 512×512 | NEAREST 2:1 | candidato | `images/bosses/impressora-em-pane.webp` |
| `office/patentes/office-10.webp` | 192×192 | LANCZOS | candidato | `images/patentes/office-10.webp` |
| `office/temas/office.webp` | 192×192 | LANCZOS | candidato | `images/temas/office.webp` |
| `office/cards/office.webp` | 1024×1024 | sem redimensionar | candidato | `images/cards/office.webp` |
| `thundercats/molduras/moldura-thundercats.webp` | 768×1376 | keying + mediana | candidato | overlay do Card (referência 1080×1920) |
| `office/molduras/moldura-office.webp` | 768×1376 | keying + mediana | candidato | overlay do Card (referência 1080×1920) |

**Lote 2 (chefões ThunderCats; todos 512×512 NEAREST 2:1, `candidato`, uso futuro `images/bosses/<arquivo>.webp`):** `thundercats/bosses/jackalman.webp` (36 KB) · `monkian.webp` (43 KB) · `vultureman.webp` (59 KB) · `slithe.webp` (67 KB) · `ratar-o.webp` (53 KB) · `grune.webp` (55 KB) · `safari-joe.webp` (42 KB) · `captain-shiner.webp` (42 KB) · `hammerhand.webp` (74 KB) · `the-driller.webp` (57 KB).

**Lote 3 (fecha as cartelas 1–2 do ThunderCats):** `thundercats/bosses/mumm-ra-mumificada.webp` (512×512 NEAREST) · `thundercats/patentes/thundercats-01…09.webp` (192×192 LANCZOS; 01 em plaqueta quadrada, 02–09 em medalhão). Detalhes por peça em `docs/manifesto-artes.json` (30 registros).

**Método de redução por alvo (revisado peça a peça):** a arte gerada combina blocos pixelados com brilhos suaves — não é pixel grid nativo estrito. NEAREST só onde a escala é exata 2:1 (512); LANCZOS onde a escala é não inteira (192) para não granular os brilhos (comparação NEAREST×LANCZOS com leitura a 28 px na prova). Nada foi esticado.

**Molduras — transparência (decisão crítica):** as duas vieram **RGB com xadrez desenhado pintado no fundo — xadrez não é alfa**. O alfa foi obtido por *keying* (flood-fill dos neutros em faixas de luminância + mediana 3 no alfa), **revisado visualmente** sobre card real: janelas limpas, arte íntegra (espada, rubis, grampeador, anel do café), halo leve nas bordas internas aceito e registrado. Mestres PNG sem perda ficam em `.cache/artes-originais/derivados/` (fora do Git; o script regenera). **Nenhuma moldura está em uso**: antes de qualquer overlay real, falta testar nos canvases (Story 1080×1920; Card do Chefão 1080×1080; moldura desenhada hoje em código em `js/cartoes.js` com quadro de referência 1080×1920) e as áreas de texto (x≥70 px), retrato circular e foto full-bleed.

### 2.4 Artes ainda pendentes

**72 peças do plano editorial** (98 − 26 concluídas como candidatas) + completude de tema: cada tema novo exige **24 arquivos** para a galeria (12 retratos + 10 patentes + 1 selo + 1 fundo). **ThunderCats está com 24/24 completos** (12/12 retratos, 10/10 patentes, selo e fundo — mais a moldura como infraestrutura); **The Office tem 4/24**. Ainda assim, **nenhum tema entra na galeria nesta PR**: o cadastro em `THEMES`/UI exige sua aprovação (§6). As duas molduras são infraestrutura fora da contagem; os dois fundos também (completude de tema, não constavam nas 98).

## 3. Provas visuais (`docs/provas-lote1/`, montadas por código)

| Arquivo | O que mostra |
|---|---|
| `cartela-candidatos.webp` | Cartela montada por código com **todos os candidatos** — grade regular, margens generosas, sem legendas, nenhuma peça encostando na vizinha (é a "cartela" no seu sentido: imagem única com várias peças; a ferramenta de geração não produz isso, a montagem é por código) |
| `leitura-patentes-28px.webp` | Patentes e selos a 80/28/56 px (linhas). Patentes 02–10 legíveis a 28 px; **selo ThunderCats e patente 03 (Explorador) leem-se escuros em tamanho pequeno** — pendência de contraste registrada |
| `moldura-thundercats-sobre-card.webp` | Keying da moldura TC sobre `images/cards/classico.webp` |
| `moldura-office-sobre-card.webp` | Keying da moldura Office sobre o mesmo card (anel do café limpo) |

Não há captura de tela do app porque **nada foi integrado à interface** nesta PR.

## 4. Como reproduzir o processamento editorial

```bash
python3 -m venv .venv-artes          # Pillow fora do repositório
.venv-artes/bin/pip install Pillow
.venv-artes/bin/python scripts/prepare-art-lote1.py .cache/artes-originais
```

O script (`scripts/prepare-art-lote1.py`) regenera derivados, provas e `docs/manifesto-artes.json` (mesclando por id: sem o original no ambiente, o registro anterior é preservado e o derivado no disco não é tocado — o `.cache/` é volátil). Pillow é ferramenta editorial opcional — **não** é dependência de produção e não entra em `package.json`. Para as cartelas externas futuras, o recorte por caixas manuais continua em `scripts/prepare-art.py`.

## 5. Plano editorial — 10 cartelas, 98 peças (nomes aprovados como escritos)

As listas enviadas somam **98** (o rótulo "94" do pedido não fecha com as listas; vale a contagem real das listas aprovadas). A ordem das peças é editorial, não escala canônica de força. Patentes ThunderCats/Office são hierarquias originais do app, não da série.

| # | Cartela | Peças | Concluídas (candidatas) | Pendentes |
|---|---|---:|---:|---:|
| 1 | ThunderCats — Bosses | 12 | **12 (completa)** | 0 |
| 2 | ThunderCats — Patentes | 10 | **10 (completa)** | 0 |
| 3 | ThunderCats — Identidade | 6 | 1 (Selo) | 5 (troféu, espada, olho, fortaleza, símbolo) |
| 4 | The Office — Desafios | 12 | 1 (Impressora em pane) | 11 |
| 5 | The Office — Patentes | 10 | 1 (Lenda de Scranton) | 9 |
| 6 | The Office — Identidade | 6 | 1 (Selo) | 5 (troféu Dundie, caneca, beterraba, grampeador na gelatina, cadeira) |
| 7 | Treino — séries e descanso | 12 | 0 | 12 |
| 8 | Cardio e equipamentos | 12 | 0 | 12 |
| 9 | Troféus dos temas existentes | 10 | 0 | 10 |
| 10 | Estados vazios e utilitários | 8 | 0 | 8 |

Notas editoriais mantidas do pedido: The Office trata situações como **desafios** (não personagens como vilões), sem violência gráfica; linguagem do tema proposta (Arena: Filial de Scranton; Boss: Desafio do expediente; Vitória: Problema resolvido; Patentes: Carreira na filial) segue para aprovação no cadastro. Cartela 10: ilustrações de backup/restauração **nunca** podem sugerir que a operação aconteceu sem confirmação do sistema. Cartelas 7–8 podem **reaproveitar** ícones existentes (`images/artes/icones/sessao/`: check, cronômetro, adicionar, troféu; `icones/equipamentos/`: esteira, polia…), o que explicaria a contagem "94" do pedido — confirmar quais itens seriam reutilizações antes da produção. Os símbolos cíclicos `simbolo-ciclo-01/02` continuam ambíguos e **não** equivalem a bi-set/drop-set. Nada de regra nova de classificação de séries, conquistas ou condições de desbloqueio por causa de imagens.

## 6. Integração futura (não feita nesta PR)

- **ThunderCats está com os 24/24 arquivos prontos** (12 retratos + 10 patentes + selo + fundo, todos candidatos versionados). O passo de cadastro (`THEMES`, galeria, testes) é mudança de interface e **aguarda sua aprovação explícita**.
- **IDs estáveis provisórios:** `thundercats`, `office` (definitivos só no cadastro aprovado). Nada de remapear progresso por posição de array; IDs de temas/bosses existentes intocados.
- Cadastro completo de um tema exige: entrada em `THEMES` (`js/gamificacao.js`, com ranks, chefões e grupos fracos mapeados aos grupos reais do app — os nomes de patente/chefão já aprovados), `THEME_IDS_LIST` (`js/app.js`), retratos em `DEFAULT_BOSS_PORTRAITS` (`js/boss.js`), arquivos nos caminhos finais do manifesto, CORE do `sw.js` + bump de versão, e atualização do teste `tests/engine/40_arte_jogo.js` (120→144 retratos, lista de temas) — **com aprovação sua**.
- Fallback de imagem (onerror → emoji/texto), `alt=""` em decoração, descrição em imagem informativa, legibilidade de dados e fotos sob fundos/molduras, validação offline: verificação obrigatória antes de virar "em uso".
- **Licença:** ThunderCats e The Office são propriedades de terceiros; a geração de imagem **não confere licença comercial**. Uso editorial/interno é decisão sua; registrado aqui e no manifesto.

## 7. O que esta PR não contém

Sem originais pesados (só derivados ≤117 KB e provas leves ≤300 KB), sem mudanças em fórmulas de treino/XP/dano/PR/histórico, sem temas na galeria, sem alteração de UI, sem dependência nova de produção, sem crescimento do cache offline (candidatos fora do CORE; `sw.js` sobe v58→v59 apenas pela regra de versão para diff em `images/**`).
