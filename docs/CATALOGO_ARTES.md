# Catálogo das artes anexadas — PR de preparação e apresentação

Base inspecionada: `origin/main` = `3f22de7` (PR #21), branch exclusiva `arena/182dddf1-diario`. Inventário realizado antes da edição. Nenhuma alteração local preexistente encontrada. Somente anexos desta conversa foram usados; nenhuma arte gerada ou buscada na rede.

## Inventário recebido (17 arquivos)

Os nomes a seguir são os nomes efetivamente recebidos, não nomes presumidos de conversas anteriores. Todos os anexos puderam ser abertos. São **24.317.640 bytes** de fontes (o total medido abaixo é a referência). RGB não tem transparência; nos três PNGs RGBA o alfa é 255 em todos os pixels. Nenhum original grande foi copiado para o Git.

| Anexo de origem | Formato / dimensões / canais | Bytes | Conteúdo visual | Estado / decisão |
|---|---|---:|---|---|
| `3j2TNVHjRGtO2jE8dW69Z4uAUjuq_PH2TkJwI9C4tkY.webp` | WEBP / 1024×572 / RGB | 62332 | Caminho de montanha com estações de treino | **candidato** — Sem correspondência com as 12 semanas/chefões; não é indicador de progresso. |
| `6lSk9TZrzdrBodYhBCJdZOJTaU-SmmZvs_nwTunrq5A.webp` | WEBP / 1024×1024 / RGB | 64968 | Escudo com cruz e barra | **candidato** — Nenhuma conquista inequívoca associada; não substituir emblemas temáticos. |
| `Grade de Músculos em Pixel Art.png` | PNG / 1774×887 / RGB | 1448243 | 10 desenhos anatômicos em duas linhas | **candidato** — 10 recortes neutros; nenhuma tabela de grupos musculares inventada. |
| `MIwDcaE9a9EePRb9LR3OIobxoDTayEmP1j7shLzmUxs.webp` | WEBP / 1024×1024 / RGB | 27628 | Textura escura com marcas circulares | **candidato** — Emenda perceptível no ensaio; não usar como seamless. |
| `OUlnpL1x4oFbYll0R7Rg3FadH2b3sWlps5vUF_tV9Xg.webp` | WEBP / 1024×512 / RGB | 10144 | Torso com peitoral destacado | **candidato** — Não ligado a grupo muscular; depende de revisão anatômica/consistência da família. |
| `Oito_insgnias_para_conquistas_de_treino_em_uma_cartela_42_pr.webp` | WEBP / 1248×832 / RGB | 328262 | 12 insígnias (4 colunas × 3 linhas) | **candidato** — Contagem visual confirma 12 apesar de Oito no nome. Sem associação a conquistas/patentes. |
| `VM2zmr2uLOpVGl_OVwWonLBPdZXbESGvrDj4__d8kEE.webp` | WEBP / 1024×576 / RGB | 24478 | Barra com anilhas ciano | **candidato** — Ilustração opaca; não representa carga real. Redundante com recorte de equipamento. |
| `barbell_plates_technical_pixel_art.png` | PNG / 2560×1440 / RGBA | 4973796 | Barra com anilhas ciano/dourado no piso | **candidato** — Ilustração opaca; não é cálculo visual de anilhas reais. Não exportada por redundância. |
| `fitness_training_roadmap_pixel_art.png` | PNG / 2560×1440 / RGBA | 7739225 | Montanhas ao pôr do sol, quatro portais | **candidato** — Quatro portais não correspondem às 12 semanas/chefões; somente cenário, sem mapeamento de progresso. |
| `hcK8uRaJg_PTjicyt6iKanZynkGThSLsxHs9VOW5E2c.webp` | WEBP / 1024×683 / RGB | 10120 | Kettlebell em fundo escuro | **candidato** — Redundante com equipamento recortado; não exportado. |
| `imfwLUwwAgg1MRGNfrgp-xm-zSHsRfhypV71Nu_oDSM.webp` | WEBP / 768×1376 / RGB | 45820 | Moldura vertical metálica com centro escuro | **candidato** — Centro opaco; não serve como overlay de foto/estatísticas. Canvas tem moldura temática própria. |
| `lVHrN00vYebRObERwahc3FuKtjPo_7jmbAmgE94gXu8.webp` | WEBP / 1024×765 / RGB | 36134 | Caderno laranja, barra e magnésio | **em uso** — Miniatura decorativa no Registro rápido. |
| `oTcAfGAtQmVMv4rWpYq90l3NC4XH_UDzHSyjLsVsrns.webp` | WEBP / 1024×1024 / RGB | 91552 | Arena vazia, luzes laranja e ciano | **candidato** — Fundo opaco; evitar cobrir retratos, dados e arte temática existente. |
| `p_CZi_mIhfpjwFbvr2mVtqm0UC0uEsfvPXHqz7e_On8.webp` | WEBP / 1024×683 / RGB | 8238 | Medalhão com check ciano | **candidato** — Não deve sugerir conclusão inexistente; sem vínculo funcional. |
| `seamless_dark_gym_texture.png` | PNG / 1920×1920 / RGBA | 6854726 | Textura escura com marcas e pontos | **candidato** — Nome não comprova continuidade: ensaio 2×2 revelou emenda; não integrada. |
| `Ícones Fitness Pixelados em Laranja e Ciano.png` | PNG / 1536×1024 / RGB | 1194594 | 8 símbolos laranja/ciano | **em uso** — 8 recortes; halter e cronômetro em uso. Símbolos cíclicos ambíguos permanecem neutros. |
| `Ícones Pixelados de Equipamentos de Academia.png` | PNG / 1536×1024 / RGB | 1397380 | 8 equipamentos em duas linhas | **em uso** — 8 recortes revisados; barra em uso, outros candidatos. |

Total exato das fontes: **24.317.640 bytes**.

## Inspeção e mapeamento

- `images/**`: preservados os 16 badges, 100 patentes, 10 cards, temas, chefões e reservas existentes. A nova família fica em `images/artes/`, sem rebatizar/conflitar com conquistas temáticas.
- `index.html`: quatro usos decorativos ao lado de textos existentes — Registro rápido, treino em andamento, descanso e calculadora de anilhas. `alt=""` pois os textos já transmitem toda a informação; dimensões explícitas, proporção mantida, `image-rendering: pixelated`. Nenhuma imagem foi apresentada como progresso ou carga real.
- `js/**`: inspecionados os renderizadores de sessão, registro, busca, chefões, conquistas, temas, temporadas e cartões. Só `js/actions.js` mudou na produção, para ocultar decoração indisponível via erro delegado e varredura no boot (inclusive erro anterior à carga do módulo). Títulos, controles e indicadores reais continuam funcionando sem artes.
- `js/cartoes.js`: composição via canvas usa fundos, retratos e moldura por tema. Não foi alterado: a moldura anexada tem centro opaco, sem composição segura como overlay. Fotos e estatísticas permanecem intactas.
- `sw.js`: base v47 → v48; CORE explícito preservado, sem biblioteca adicionada automaticamente.
- `scripts/build-site.sh`: já copia `images/**` recursivamente; não precisou mudar. Scripts/fontes editoriais e docs não entram no Pages.
- Sem alterações em XP, PR, fórmulas, progresso de exercícios extras, backup, CSV ou comportamento da sessão. Sem dependência de produção nova.

## Recorte, redução e revisão

As caixas `[left, top, right, bottom)` em pixels da fonte estão no manifesto `docs/artes-derivadas.json`, junto de SHA-256 da origem, bytes e dimensões. Foram escolhidas visualmente por peça, não por divisão uniforme: margens de cartela, contornos, brilho e sombras foram considerados. **38 recortes** revisados individualmente em provas rotuladas: 8 equipamentos, 10 anatomia, 8 sessão e 12 insígnias; mais 1 miniatura da cena inteira (39 WebP). Nenhum vizinho/borda cortada foi identificado nas provas finais.

Equipamentos têm nomes descritivos apenas daquilo que se vê. Os desenhos anatômicos recebem `desenho-01…10` (ordem de leitura) e as insígnias `insignia-01…12`; não há inferência de regra/grupo/conquista. Nos símbolos, `simbolo-ciclo-01` (setas com barras) e `simbolo-ciclo-02` (elos/setas) continuam ambíguos, não equivalem automaticamente a repetições, pausa ou bi-set.

Redução proporcional com nearest-neighbor, WebP qualidade 84/método 6, sem esticar, suavizar ou tentar remover automaticamente os fundos escuros. Os fundos opacos são parte das peças, exibidos em área própria e nunca sobre fotos/dados. Candidatos reduzidos são mantidos como produto da preparação desta PR, para revisão posterior sem importar cartelas grandes. Não são carregados pela UI.

Reprodução editorial opcional (não participa de npm/build/CI): Python 3 + Pillow 13.0.0, executar `python scripts/prepare-art.py DIRETORIO_DOS_ANEXOS` na raiz. Exige os anexos listados; não tenta buscá-los em outra conversa. Para reproduzir no futuro, conservar as fontes fora do Git ou solicitar reenvio. Fontes originais não têm licença inferida; procedência é o fornecimento pelo usuário nesta tarefa.

### Derivados e locais de uso

| Derivado (sob `images/artes/`) | Fonte | Dimensões | Bytes | Estado | Local de uso / pendência |
|---|---|---|---:|---|---|
| `icones/equipamentos/barra-anilhas.webp` | Equipamentos | 127×128 | 2922 | em uso | Título da calculadora de anilhas |
| `icones/equipamentos/halteres.webp` | Equipamentos | 128×128 | 2762 | candidato | Sem vínculo com UI; preparação para revisão futura |
| `icones/equipamentos/kettlebell.webp` | Equipamentos | 128×128 | 2492 | candidato | Sem vínculo com UI; preparação para revisão futura |
| `icones/equipamentos/banco.webp` | Equipamentos | 128×128 | 2782 | candidato | Sem vínculo com UI; preparação para revisão futura |
| `icones/equipamentos/polia.webp` | Equipamentos | 127×128 | 2412 | candidato | Sem vínculo com UI; preparação para revisão futura |
| `icones/equipamentos/esteira.webp` | Equipamentos | 128×128 | 3366 | candidato | Sem vínculo com UI; preparação para revisão futura |
| `icones/equipamentos/remo.webp` | Equipamentos | 128×128 | 2808 | candidato | Sem vínculo com UI; preparação para revisão futura |
| `icones/equipamentos/argolas.webp` | Equipamentos | 128×128 | 3018 | candidato | Sem vínculo com UI; preparação para revisão futura |
| `icones/anatomia/desenho-01.webp` | Anatomia | 128×122 | 3712 | candidato | Sem vínculo com UI; preparação para revisão futura |
| `icones/anatomia/desenho-02.webp` | Anatomia | 128×122 | 4102 | candidato | Sem vínculo com UI; preparação para revisão futura |
| `icones/anatomia/desenho-03.webp` | Anatomia | 128×122 | 4332 | candidato | Sem vínculo com UI; preparação para revisão futura |
| `icones/anatomia/desenho-04.webp` | Anatomia | 128×122 | 3938 | candidato | Sem vínculo com UI; preparação para revisão futura |
| `icones/anatomia/desenho-05.webp` | Anatomia | 128×122 | 3974 | candidato | Sem vínculo com UI; preparação para revisão futura |
| `icones/anatomia/desenho-06.webp` | Anatomia | 128×122 | 3420 | candidato | Sem vínculo com UI; preparação para revisão futura |
| `icones/anatomia/desenho-07.webp` | Anatomia | 128×122 | 2860 | candidato | Sem vínculo com UI; preparação para revisão futura |
| `icones/anatomia/desenho-08.webp` | Anatomia | 128×122 | 3578 | candidato | Sem vínculo com UI; preparação para revisão futura |
| `icones/anatomia/desenho-09.webp` | Anatomia | 128×122 | 3374 | candidato | Sem vínculo com UI; preparação para revisão futura |
| `icones/anatomia/desenho-10.webp` | Anatomia | 128×122 | 3394 | candidato | Sem vínculo com UI; preparação para revisão futura |
| `icones/sessao/halter.webp` | Fitness | 96×60 | 1474 | em uso | Título do treino em andamento |
| `icones/sessao/simbolo-ciclo-01.webp` | Fitness | 96×90 | 1942 | candidato | Sem vínculo com UI; preparação para revisão futura |
| `icones/sessao/cronometro.webp` | Fitness | 86×96 | 2140 | em uso | Título do descanso da sessão |
| `icones/sessao/adicionar.webp` | Fitness | 96×91 | 1252 | candidato | Sem vínculo com UI; preparação para revisão futura |
| `icones/sessao/check.webp` | Fitness | 96×95 | 2270 | candidato | Sem vínculo com UI; preparação para revisão futura |
| `icones/sessao/simbolo-ciclo-02.webp` | Fitness | 96×68 | 1590 | candidato | Sem vínculo com UI; preparação para revisão futura |
| `icones/sessao/trofeu.webp` | Fitness | 96×91 | 2272 | candidato | Sem vínculo com UI; preparação para revisão futura |
| `icones/sessao/alerta.webp` | Fitness | 96×89 | 1706 | candidato | Sem vínculo com UI; preparação para revisão futura |
| `insignias/insignia-01.webp` | Insígnias | 155×160 | 6330 | candidato | Sem vínculo com UI; preparação para revisão futura |
| `insignias/insignia-02.webp` | Insígnias | 158×160 | 6444 | candidato | Sem vínculo com UI; preparação para revisão futura |
| `insignias/insignia-03.webp` | Insígnias | 160×159 | 6562 | candidato | Sem vínculo com UI; preparação para revisão futura |
| `insignias/insignia-04.webp` | Insígnias | 153×160 | 6938 | candidato | Sem vínculo com UI; preparação para revisão futura |
| `insignias/insignia-05.webp` | Insígnias | 160×156 | 6324 | candidato | Sem vínculo com UI; preparação para revisão futura |
| `insignias/insignia-06.webp` | Insígnias | 158×160 | 6090 | candidato | Sem vínculo com UI; preparação para revisão futura |
| `insignias/insignia-07.webp` | Insígnias | 160×152 | 5958 | candidato | Sem vínculo com UI; preparação para revisão futura |
| `insignias/insignia-08.webp` | Insígnias | 160×158 | 5332 | candidato | Sem vínculo com UI; preparação para revisão futura |
| `insignias/insignia-09.webp` | Insígnias | 133×160 | 4000 | candidato | Sem vínculo com UI; preparação para revisão futura |
| `insignias/insignia-10.webp` | Insígnias | 160×142 | 5420 | candidato | Sem vínculo com UI; preparação para revisão futura |
| `insignias/insignia-11.webp` | Insígnias | 153×160 | 5496 | candidato | Sem vínculo com UI; preparação para revisão futura |
| `insignias/insignia-12.webp` | Insígnias | 160×152 | 6170 | candidato | Sem vínculo com UI; preparação para revisão futura |
| `cenarios/caderno-barra.webp` | lVHr… (caderno) | 240×179 | 4686 | em uso | Ilustração junto ao título Registro rápido |

As abreviações de fonte nesta tabela referem-se aos nomes completos do inventário; o manifesto associa cada derivado ao nome completo e hash.

## Texturas: ensaio real de repetição

Foram montadas provas 2×2 das duas texturas, reduzidas a 384×384 com nearest e iluminadas ×4 somente para inspeção das emendas. As junções mostram descontinuidade de grão/luminosidade e motivos que não se conectam: nenhuma foi aprovada como seamless. Diferença RGB média entre as bordas opostas na amostra reduzida: PNG ≈4,12 (horizontal) / 2,98 (vertical), WebP ≈1,94 / 1,86 por canal (0–255). A medição complementa, não substitui, a inspeção visual. Não há textura repetida aplicada ao app nem exportação dessas candidatas nesta PR.

## Orçamento e cache

- **39 arquivos WebP novos: 149.642 bytes**; 4 em uso (11.222 bytes). 35 candidatos (138.420 bytes).
- **CORE: 285 entradas locais antes e depois; +0 arquivos / +0 bytes de imagens no precache inicial.** O total do shell muda apenas pelo HTML/JS já presentes no CORE (medição final na seção de validação). Não se adicionou nenhuma imagem nova ao CORE porque todas são decorativas e os textos são suficientes no primeiro uso offline.
- Cache runtime existente guarda imagens visitadas sob controle do SW. Primeiro acesso offline pode omitir as quatro decorações se ainda não passaram por esse cache; fallback oculta a peça e preserva informação/ações. Não é promessa de biblioteca inteira offline.

## Validação e limites

- `npm ci && npm test`: motor, UI/jsdom, módulos reais e SW passaram; nenhum teste removido. Testes de UI acrescentados em `tests/ui/60_csv_mapa_delegacao.js`.
- `node --check sw.js`, `npm run check:sw-core`, `npm run check:modules`, `npm run check:docs` e `git diff --check`: passaram.
- `npm run build:css`: gerou **+27 bytes**, só a utilidade `.flex-shrink` detectada pelo scanner no CSS editorial do HTML; resultado incluído no commit e nova geração comparada byte a byte. Sem atualização de dependências/Browserslist. `npm ci` reportou 7 vulnerabilidades preexistentes; **não** foi executado `npm audit fix`.
- `node scripts/check-sw-version.js origin/main`: passou após o commit (40 arquivos assistidos em JS/imagens; v47 → v48). Esse verificador compara base com HEAD, não com working tree.
- Pages construído com `scripts/build-site.sh` fora da árvore do Git: todos os 39 derivados copiados e comparados byte a byte; nenhum original PNG, doc ou script editorial publicado. CORE conferido também contra esse artefato.
- CORE total, somando as 285 entradas (inclui `./` e `./index.html` como no verificador): **5.216.959 → 5.219.706 bytes**, **+2.747 bytes** de HTML/JS/CSS já precacheados; **0 bytes de imagens novas no CORE**. O conjunto de caminhos do CORE é idêntico à base.
- Chromium headless **153.0.8010.0** real via Playwright, **49/49 checagens**, sem skip. As três novas checagens verificam os 39 WebP/dimensões, renderização em 360/390/412/430 px e fallback com rede deliberadamente abortada em contexto isolado sem SW. Nenhuma requisição local falhou no fluxo normal com rede; falhas offline das quatro decorações ainda não cacheadas são registradas explicitamente, sem alegar biblioteca offline.
- Revisão visual das provas dos **38 recortes**, da miniatura do caderno, das junções 2×2 e de screenshots reais de Hoje/painel de sessão/descanso e calculadoras em **360, 390, 412 e 430 px**: imagens contidas, proporção preservada, fundos escuros próprios e texto/controles legíveis. Painel de sessão exposto pelo teste só para enquadramento, sem mudar dados/regras nem incluir exercícios no progresso.
- Sandbox sem fontes externas: a interface usa fontes de fallback e alguns emojis legados podem aparecer como glifos ausentes. Nenhuma arte substituta foi gerada. Instalação PWA, desempenho/toque em aparelho físico, Safari/iOS e offline geral **não foram validados**; os testes offline automatizados cobrem apenas os fluxos listados pelo gate existente. Não confundir pré-requisitos de instalação com instalação real.
- Pendências editoriais: aprovação dos 35 recortes candidatos, revisão anatômica/semântica antes de ligar qualquer desenho a grupos musculares, regras explícitas antes de associar as 12 insígnias a conquistas. Mapas/moldura/texturas e individuais redundantes permanecem apenas no inventário (fontes fora do Git); pedir reenvio se indisponíveis em outra sessão.
- CI do push e os cinco checks da PR devem ser confirmados na entrega; esta PR não autoriza merge.
