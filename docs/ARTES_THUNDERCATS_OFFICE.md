# Artes ThunderCats e The Office — produção individual (preparação editorial)

Sessão Arena `arena/dc4e2d49-diario` · 18/10/2026 · base `e66cec5` (main) · nenhuma alteração preexistente no checkout.

Aprovações registradas nesta sessão (antes da produção em lote): lote completo das 10 chamadas **sem** etapa intermediária de direção; linguagem visual **pixel art** para os dois temas (uma só linguagem, sem misturar); **listas do plano editorial aprovadas como escritas** (contagem real: **98 peças** — ver §5). Depois da confirmação de que a ferramenta não gera cartelas, a produção segue por **peças individuais** (lote 2 em diante). Nenhum tema foi cadastrado e nenhuma interface foi alterada.

**Continuação — sessão `arena/9470848b-diario` (a partir do merge `8376f01`, PR #32):** o usuário autorizou explicitamente, nesta PR, (1) o **Lote 6** (10 chamadas: cartelas 3 e 6 completas), (2) o **cadastro dos dois temas na galeria** (§6) e (3) que as cartelas 7 e 8 sejam **geração nova, sem reuso** de ícones existentes (decisão registrada; a produção dessas cartelas aguarda os próximos lotes autorizados).

## 1. Capacidade da ferramenta de geração

- **1 chamada = 1 imagem única e independente.** O contrato da ferramenta proíbe grade, colagem, contact sheet, montagem ou várias peças/variações numa mesma imagem: **cartelas com múltiplos assets não são geráveis** e não foram simuladas como imagem única.
- `offer_options` serve para escolher entre 2 candidatos **da mesma peça**, não para empacotar peças.
- Saída `.jpg/.jpeg/.png`, resolução definida pelo modelo (1024×1024 aqui; molduras saíram 768×1376), **sem garantia de canal alfa**.
- Orçamento inicial de 10 chamadas consumido no lote 1; lotes 2 a 5 (chamadas 11–50) autorizados para geração individual. Cada chamada = 1 peça. Não há como produzir 94–98 peças em poucas chamadas; a cartela passa a ser **montagem por código** (§3) ou cartela externa fornecida pelo usuário para recorte pelo `scripts/prepare-art.py`.

## 2. Inventário do lote — separação por origem

### 2.1 Imagens realmente geradas (50 originais, **fora do Git**)

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

**Lote 4 (chamadas 31–40) — cartela 4: desafios The Office (itens 2–11; falta Último expediente):**

| # | Peça | Original (cache) | Conteúdo revisado |
|---|---|---|---|
| 31 | Reunião que poderia ser um e-mail | `lote4-reuniao-que-poderia-ser-um-email.png` | Sala de reunião vazia, quadro de rabiscos, tela em branco |
| 32 | Grampeador na gelatina | `lote4-grampeador-na-gelatina.png` | Grampeador preso em gelatina verde na mesa (clássico reconhecível) |
| 33 | Inventário do depósito | `lote4-inventario-do-deposito.png` | Depósito com caixas, prateleiras e carrinho de mão |
| 34 | Guerra das vendas | `lote4-guerra-das-vendas.png` | Duas mesas frente a frente com fones erguidos como bandeiras |
| 35 | Comitê de festas | `lote4-comite-de-festas.png` | Mesa de festa com balões, chapéus e bandeirolas sem letras |
| 36 | Olimpíadas do escritório | `lote4-olimpiadas-do-escritorio.png` | Corredor com fita de chegada de papel e cadeiras de escritório |
| 37 | Simulado de incêndio do Dwight | `lote4-simulado-de-incendio-do-dwight.png` | Alarme vermelho com fumaça falsa estilizada sobre as mesas (sem violência) |
| 38 | Visita do corporativo | `lote4-visita-do-corporativo.png` | Crachás de visitante e maletas na recepção |
| 39 | Crise da marca-d’água | `lote4-crise-da-marca-dagua.png` | Pôster arruinado por borrão de marca-d’água gigante |
| 40 | Premiação dos Dundies | `lote4-premiacao-dos-dundies.png` | Troféu dourado em mesa com cortina de papel; **borda clara tipo moldura de foto** divergente (registrada; invisível no enquadramento circular do card) |

**Lote 5 (chamadas 41–50) — fecha as cartelas 4 e 5 do The Office:**

| # | Peça | Original (cache) | Conteúdo revisado |
|---|---|---|---|
| 41 | Último expediente | `lote5-ultimo-expediente.png` | Escritório noturno com uma luminária acesa e rodo à porta |
| 42 | Patente Recém-contratado | `lote5-patente-01.png` | Crachá em branco em anel de bronze simples |
| 43 | Patente Assistente Administrativo | `lote5-patente-02.png` | Clipe sobre bloco em medalhão de corda |
| 44 | Patente Representante de Vendas | `lote5-patente-03.png` | Telefone de mesa clássico em **plaqueta quadrada** (variação da família, registrada) |
| 45 | Patente Vendedor do Mês | `lote5-patente-04.png` | Medalha sobre pergaminho com fitas (**moldura decorativa** divergente, registrada) |
| 46 | Patente Supervisor da Filial | `lote5-patente-05.png` | Prancheta e chaveiro em medalhão dourado/marinho |
| 47 | Patente Assistente do Gerente Regional | `lote5-patente-06.png` | Crachá e beterraba com louros (a piada correndo) |
| 48 | Patente Assistente Gerente Regional | `lote5-patente-07.png` | Brasão/placa de mesa **em branco** (sem letras), distinto do item 47 |
| 49 | Patente Gerente Regional | `lote5-patente-08.png` | Caneca fumegante diante de cadeira executiva |
| 50 | Patente Diretor do Corporativo | `lote5-patente-09.png` | Pasta diante de torre corporativa em medalhão ornado |

**Lote 6 (chamadas 51–60) — fecha as cartelas 3 (ThunderCats/Identidade) e 6 (The Office/Identidade):**

| # | Peça | Original (cache) | Conteúdo revisado |
|---|---|---|---|
| 51 | Troféu da Jornada | `lote6-trofeu-da-jornada.png` | Taça dourada alada com olho felino vermelho na haste, em pedestal de pedra |
| 52 | Espada do Trovão | `lote6-espada-do-trovao.png` | Espada ereta com olho vermelho na guarda e raios vermelhos; **borda decorativa interna** divergente (registrada) |
| 53 | Olho de Thundera | `lote6-olho-de-thundera.png` | Amuleto-olho ornado de ouro/ferro com íris felina vermelha sobre altar |
| 54 | Fortaleza de Thundera | `lote6-fortaleza-de-thundera.png` | Fortaleza de pedra em forma de gato agachado, bandeiras e janelas vermelhas ao entardecer |
| 55 | Símbolo central | `lote6-simbolo-central.png` | Cabeça felina preta em anel vermelho sobre placa de ferro; **silhueta assimétrica** (bigodes só à esquerda, registrada) |
| 56 | Troféu Dundie | `lote6-trofeu-dundie.png` | Estatueta dourada de terno em base com placa em branco; **fundo claro tipo papel** divergente (registrado) |
| 57 | Caneca | `lote6-caneca.png` | Caneca branca fumegante em mesa de escritório; **post-its com rabiscos abstratos ilegíveis** ao fundo (registrado) |
| 58 | Beterraba | `lote6-beterraba.png` | Beterraba roxa com folhas em caixote de fazenda sob luminária |
| 59 | Grampeador na gelatina (identidade) | `lote6-grampeador-na-gelatina-identidade.png` | Close do grampeador vermelho na gelatina verde em prato (distinto da cena-desafio do lote 4) |
| 60 | Cadeira | `lote6-cadeira.png` | Cadeira de escritório preta sob luminária à noite; **leitura fraca a 28 px** registrada no manifesto |

**Lote 7 (chamadas 61–70) — cartela 7 (Treino: séries e descanso), itens 1–10:** Série concluída, Descanso, Adicionar série, Troféu da sessão, Alerta, Próxima série, Aquecimento, Bi-set, Drop-set e Pausa. A cartela aprovada só trazia título/contagem no repo; a lista de 12 foi adotada nesta sessão a partir das funções reais da sessão (faltam Repetir série e Fim do treino), **sem vínculo com UI e sem nenhuma regra nova** de classificação de séries — Bi-set/Drop-set são apenas arte candidata. Derivados 512×512 NEAREST em `images/artes/candidatos/treino/`; divergências registradas por peça no manifesto (margem cinza do Descanso, cruz verde ambígua do Adicionar série, pictograma extra na Próxima série, Bi-set como halter ligado por elo, halteres cruzados do Aquecimento). Modo de trabalho ajustado a pedido do usuário: lotes em sequência na mesma PR, com revisão visual + pipeline por lote e **validação completa só no fechamento da PR**.

**Lote 8 (chamadas 71–80) — fecha a cartela 7 e abre a cartela 8:** Repetir série e Fim do treino (cartela 7 completa, 12/12); Esteira, Bicicleta ergométrica, Elíptico, Remo, Escada ergométrica, Corda de pular, Kettlebell e Polia (cartela 8, 8/12; lista adotada de 12, faltam Banco, Barra com anilhas, Halteres e Argolas). Derivados 512×512 NEAREST em `images/artes/candidatos/treino/` e `.../equipamentos/`; divergências por peça no manifesto (molduras/contornos de adesivo em Fim do treino, Esteira, Elíptico e Kettlebell; marca abstrata ilegível na Polia).

**Lote 9 (chamadas 81–90) — fecha a cartela 8 e abre a cartela 9:** Banco, Barra com anilhas, Halteres e Argolas (cartela 8 completa, 12/12); Troféu Berzerker (clássico), Troféu Cavaleiros do Zodíaco, Troféu 12 Trabalhos de Hércules, Troféu Filmes de Ação, Troféu Folclore Brasileiro e Troféu Mitologia Nórdica (cartela 9, 6/10; faltam Roma, RPG, Galáctica e Anéis). Troféus são apenas arte candidata — **nenhuma conquista, desbloqueio ou regra nova** associada. Divergências por peça no manifesto (molduras decorativas recorrentes, glifos abstratos, neon pseudo-texto ilegível no troféu de Ação).

Runas/marcas decorativas nos salões e placas são abstratas, **sem nomes, números ou legendas legíveis** (conforme especificação).

### 2.2 Imagens fornecidas pelo usuário

**Nenhuma nesta sessão.** (Uma cartela externa sua pode acelerar as 42 peças pendentes: recorte/otimização seguem pelo `scripts/prepare-art.py`, com caixas manuais revisadas.)

### 2.3 Recortes/derivados versionados (60 WebP)

Nos lotes 1–5, os derivados nasceram em `images/artes/candidatos/` (fora do CORE, não carregados pela UI). **Nesta PR, com o cadastro aprovado, os 48 arquivos de tema (24 + 24) foram movidos para os caminhos finais** (`images/bosses|patentes|temas|cards`, ≈1,5 MB, agora no CORE v60) e estão `em uso` no manifesto; restam em `images/artes/candidatos/` apenas as 10 peças de identidade do lote 6 e as 2 molduras (≈337 KB, fora do CORE). Campos completos (id, tema/categoria, origem, fonte, sha256, recorte, dimensões, formato, transparência, local de uso, estado, notas de revisão) em [`manifesto-artes.json`](manifesto-artes.json). A tabela abaixo é o registro histórico do lote 1 (o estado atual de cada peça está no manifesto).

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

**Lote 3 (fecha as cartelas 1–2 do ThunderCats):** `thundercats/bosses/mumm-ra-mumificada.webp` (512×512 NEAREST) · `thundercats/patentes/thundercats-01…09.webp` (192×192 LANCZOS; 01 em plaqueta quadrada, 02–09 em medalhão).

**Lote 4 (desafios The Office; 512×512 NEAREST 2:1, `candidato`, uso futuro `images/bosses/<arquivo>.webp`):** `office/bosses/reuniao-que-poderia-ser-um-email.webp` · `grampeador-na-gelatina.webp` · `inventario-do-deposito.webp` · `guerra-das-vendas.webp` · `comite-de-festas.webp` · `olimpiadas-do-escritorio.webp` · `simulado-de-incendio-do-dwight.webp` · `visita-do-corporativo.webp` · `crise-da-marca-dagua.webp` · `premiacao-dos-dundies.webp`.

**Lote 5 (fecha as cartelas 4–5 do The Office):** `office/bosses/ultimo-expediente.webp` (512×512 NEAREST) · `office/patentes/office-01…09.webp` (192×192 LANCZOS; família de medalhões dourado/marinho, 03 em plaqueta quadrada). Detalhes por peça em `docs/manifesto-artes.json` (50 registros).

**Método de redução por alvo (revisado peça a peça):** a arte gerada combina blocos pixelados com brilhos suaves — não é pixel grid nativo estrito. NEAREST só onde a escala é exata 2:1 (512); LANCZOS onde a escala é não inteira (192) para não granular os brilhos (comparação NEAREST×LANCZOS com leitura a 28 px na prova). Nada foi esticado.

**Molduras — transparência (decisão crítica):** as duas vieram **RGB com xadrez desenhado pintado no fundo — xadrez não é alfa**. O alfa foi obtido por *keying* (flood-fill dos neutros em faixas de luminância + mediana 3 no alfa), **revisado visualmente** sobre card real: janelas limpas, arte íntegra (espada, rubis, grampeador, anel do café), halo leve nas bordas internas aceito e registrado. Mestres PNG sem perda ficam em `.cache/artes-originais/derivados/` (fora do Git; o script regenera). **Nenhuma moldura está em uso**: antes de qualquer overlay real, falta testar nos canvases (Story 1080×1920; Card do Chefão 1080×1080; moldura desenhada hoje em código em `js/cartoes.js` com quadro de referência 1080×1920) e as áreas de texto (x≥70 px), retrato circular e foto full-bleed.

**Lote 6 (cartelas 3 e 6 — identidade; todos 512×512 NEAREST 2:1, `candidato`, sem vínculo com UI):** `thundercats/identidade/trofeu-da-jornada.webp` · `espada-do-trovao.webp` · `olho-de-thundera.webp` · `fortaleza-de-thundera.webp` · `simbolo-central.webp` · `office/identidade/trofeu-dundie.webp` · `caneca.webp` · `beterraba.webp` · `grampeador-na-gelatina.webp` · `cadeira.webp`. Divergências e a leitura a 28 px (Cadeira fraca em tamanho pequeno) estão nas notas de cada registro do manifesto (60 registros).

### 2.4 Artes ainda pendentes

**12 peças do plano editorial** (98 − 86 concluídas) + completude de tema: cada tema novo exige **24 arquivos** para a galeria (12 retratos + 10 patentes + 1 selo + 1 fundo). **ThunderCats (24/24) e The Office (24/24) foram cadastrados na galeria nesta PR** com aprovação explícita do usuário (§6): os 48 arquivos saíram de `images/artes/candidatos/` para os caminhos finais e os registros correspondentes do manifesto estão `em uso` (ids preservados). Restam como candidatos as 10 peças de identidade do lote 6, as 12 de treino (cartela 7), as 12 de cardio/equipamentos (cartela 8), os 6 troféus do lote 9 e as 2 molduras (infraestrutura fora da contagem; os fundos são completude de tema, não constavam nas 98).

## 3. Provas visuais (`docs/provas-lote1/`, montadas por código)

| Arquivo | O que mostra |
|---|---|
| `cartela-candidatos.webp` | Cartela montada por código com **todos os derivados** (candidatos + arquivos finais dos temas cadastrados) — grade regular, margens generosas, sem legendas, nenhuma peça encostando na vizinha (é a "cartela" no seu sentido: imagem única com várias peças; a ferramenta de geração não produz isso, a montagem é por código) |
| `leitura-patentes-28px.webp` | Patentes, selos e peças de identidade a 80/28/56 px (linhas). Patentes 02–10 legíveis a 28 px; **selo ThunderCats e patente 03 (Explorador) leem-se escuros em tamanho pequeno** — pendência de contraste registrada. No lote 6, 9/10 peças leem-se a 28 px; a **Cadeira** (cena noturna) é a exceção registrada |
| `moldura-thundercats-sobre-card.webp` | Keying da moldura TC sobre `images/cards/classico.webp` |
| `moldura-office-sobre-card.webp` | Keying da moldura Office sobre o mesmo card (anel do café limpo) |

A integração dos temas nesta PR é validada pela suíte de UI (jsdom) e pela validação em navegador real do CI; a galeria passa a listar 12 temas.

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
| 3 | ThunderCats — Identidade | 6 | **6 (completa: Selo + lote 6)** | 0 |
| 4 | The Office — Desafios | 12 | **12 (completa)** | 0 |
| 5 | The Office — Patentes | 10 | **10 (completa)** | 0 |
| 6 | The Office — Identidade | 6 | **6 (completa: Selo + lote 6)** | 0 |
| 7 | Treino — séries e descanso | 12 | **12 (completa)** | 0 |
| 8 | Cardio e equipamentos | 12 | **12 (completa)** | 0 |
| 9 | Troféus dos temas existentes | 10 | 6 (lote 9) | 4 (Roma, RPG, Galáctica, Anéis) |
| 10 | Estados vazios e utilitários | 8 | 0 | 8 |

Notas editoriais mantidas do pedido: The Office trata situações como **desafios** (não personagens como vilões), sem violência gráfica; linguagem do tema proposta (Arena: Filial de Scranton; Boss: Desafio do expediente; Vitória: Problema resolvido; Patentes: Carreira na filial) foi **aprovada e aplicada no cadastro** (§6). Cartela 10: ilustrações de backup/restauração **nunca** podem sugerir que a operação aconteceu sem confirmação do sistema. Cartelas 7–8: o usuário decidiu **gerar tudo novo, sem reuso** dos ícones existentes (a contagem "94" fica superada; valem as 98 gerações). Os símbolos cíclicos `simbolo-ciclo-01/02` continuam ambíguos e **não** equivalem a bi-set/drop-set. Nada de regra nova de classificação de séries, conquistas ou condições de desbloqueio por causa de imagens.

## 6. Integração na galeria (feita nesta PR, com aprovação explícita)

- **ThunderCats e The Office cadastrados** (`thundercats`, `office` — IDs novos acrescentados ao fim das listas; nenhum ID existente foi alterado nem progresso salvo é remapeado por posição): `THEMES` em `js/gamificacao.js` (10 patentes + 12 chefões/desafios por tema, fraquezas mapeadas aos grupos reais do app, HP na curva compartilhada `100+18i` via `mkBosses`), `THEME_IDS_LIST`/`THEME_ICONS`/`STORY_CARD_STYLES` em `js/app.js`, 24 retratos em `DEFAULT_BOSS_PORTRAITS` (`js/boss.js`, 120→144), molduras de canvas novas `garra`/`caderno` em `js/cartoes.js` (nenhum tema cai no `else` genérico), arquivos nos caminhos finais (`images/bosses|patentes|temas|cards`), CORE do `sw.js` + bump **v59→v60** e testes atualizados (`tests/engine/40_arte_jogo.js` 120→144, `tests/engine/20_recuperacao_temas.js` 10→12 temas, `tests/ui/10_boot_navegacao.js`, `test_sw.js` e `scripts/validacao-navegador.js` 110→132 imagens de patentes/cards). O CORE offline cresce ≈1,5 MB (48 arquivos dos dois temas) — consequência esperada e aprovada do cadastro.
- **Linguagem do Office aplicada como aprovada:** Arena "Filial de Scranton", Boss (`bossLabel`) "Desafio do expediente", Patentes = carreira na filial (Recém-contratado → Lenda de Scranton); "Problema resolvido" é a linguagem de vitória do tema (registrada na descrição da Premiação dos Dundies; não há campo de "vitória" por tema no motor — o selo de derrota segue o padrão global da UI).
- Fallback de imagem preservado (retrato ausente → emoji do chefão; selo ausente → emoji do tema), `alt` descritivo nos retratos e vazio na decoração, validação offline pelo CORE do SW (testes B5 do `test_sw.js` cobrem as 132 imagens).
- **Licença:** ThunderCats e The Office são propriedades de terceiros; a geração de imagem **não confere licença comercial**. Uso editorial/interno é decisão sua; registrado aqui e no manifesto.

## 7. O que esta PR não contém

Sem originais pesados (originais do lote 6 fora do Git em `.cache/`), sem mudanças em fórmulas de treino/XP/dano/PR/histórico (os chefões novos usam a mesma curva de HP e as mesmas regras de dano/XP de todos os temas), sem regra nova de classificação de séries/conquistas/desbloqueio por causa de arte, sem dependência nova de produção. As peças de identidade do lote 6 e as molduras seguem **candidatas fora do CORE** e sem vínculo com a UI; as cartelas 7–10 (42 peças) aguardam os próximos lotes autorizados de 10 chamadas.
