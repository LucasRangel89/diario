#!/usr/bin/env python3
"""Deriva as artes ThunderCats e The Office (lotes individuais; sem cartelas).

Uso: python3 prepare-art-lote1.py [DIRETORIO_DOS_ORIGINAIS]
Padrão: .cache/artes-originais (originais grandes FORA do Git; .cache/ é volátil
e ignorado — o registro durável é o manifesto + derivados versionados).

Ferramenta editorial opcional: Pillow (venv próprio). Não é dependência do
app/build e não entra em package.json.

O manifesto docs/manifesto-artes.json é mesclado por id: peças cujo original já
não existe no ambiente mantêm o registro anterior (e o derivado no disco não é
tocado). As gerações são individuais — a ferramenta NÃO produz cartelas; as
cartelas de revisão são montadas aqui por código apenas para conferência.

Regras aplicadas por peça (decisões revisadas uma a uma, não grade automática):
- Bosses 512×512: NEAREST (2:1 exato; a arte é pixel art com brilhos).
- Patentes/selos 192×192: LANCZOS (escala não inteira; NEAREST granula os
  brilhos suaves e piora a leitura a 28 px).
- Fundos 1024×1024: sem redimensionar, só WebP.
- Molduras: o gerador devolveu RGB com xadrez PINTADO (não é alfa). O xadrez
  é removido por flood-fill de neutros em faixas de luminância + mediana 3 no
  alfa, COM revisão visual das provas em docs/provas-lote1/. Qualquer resíduo
  fica documentado no manifesto; nada é apresentado como alfa nativo.
"""
import hashlib
import json
import math
import os
import sys
from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / '.cache' / 'artes-originais'
OUT_CAND = ROOT / 'images' / 'artes' / 'candidatos'
OUT_PROVAS = ROOT / 'docs' / 'provas-lote1'
MANIFESTO = ROOT / 'docs' / 'manifesto-artes.json'

# id, peça, tema, categoria, arquivo-fonte, saída relativa, alvo, método, uso futuro
PECAS = [
    ('tc-boss-mumm-ra-poderoso', 'Mumm-Ra, forma poderosa', 'thundercats', 'bosses',
     'lote1-mumm-ra-poderoso.png', 'thundercats/bosses/mumm-ra-poderoso.webp',
     (512, 512), 'nearest', 'images/bosses/mumm-ra-poderoso.webp (retrato do chefe ao cadastrar o tema)'),
    ('tc-patente-lenda-de-thundera', 'Patente Lenda de Thundera', 'thundercats', 'patentes',
     'lote1-lenda-de-thundera.png', 'thundercats/patentes/thundercats-10.webp',
     (192, 192), 'lanczos', 'images/patentes/thundercats-10.webp (patente 10/10 ao cadastrar o tema)'),
    ('tc-selo', 'Selo ThunderCats', 'thundercats', 'temas',
     'lote1-selo-thundercats.png', 'thundercats/temas/thundercats.webp',
     (192, 192), 'lanczos', 'images/temas/thundercats.webp (selo do tema ao cadastrá-lo)'),
    ('tc-fundo', 'Fundo ThunderCats', 'thundercats', 'cards',
     'lote1-fundo-thundercats.png', 'thundercats/cards/thundercats.webp',
     (1024, 1024), 'none', 'images/cards/thundercats.webp (fundo do Story/Card do Chefão ao cadastrar o tema)'),
    ('to-boss-impressora-em-pane', 'Impressora em pane', 'office', 'desafios',
     'lote1-impressora-em-pane.png', 'office/bosses/impressora-em-pane.webp',
     (512, 512), 'nearest', 'images/bosses/impressora-em-pane.webp (retrato do desafio ao cadastrar o tema)'),
    ('to-patente-lenda-de-scranton', 'Patente Lenda de Scranton', 'office', 'patentes',
     'lote1-lenda-de-scranton.png', 'office/patentes/office-10.webp',
     (192, 192), 'lanczos', 'images/patentes/office-10.webp (patente 10/10 ao cadastrar o tema)'),
    ('to-selo', 'Selo The Office', 'office', 'temas',
     'lote1-selo-office.png', 'office/temas/office.webp',
     (192, 192), 'lanczos', 'images/temas/office.webp (selo do tema ao cadastrá-lo)'),
    ('to-fundo', 'Fundo The Office', 'office', 'cards',
     'lote1-fundo-office.png', 'office/cards/office.webp',
     (1024, 1024), 'none', 'images/cards/office.webp (fundo do Story/Card do Chefão ao cadastrar o tema)'),
    # Lote 2 — chefões ThunderCats (cartela 1, ordem editorial)
    ('tc-boss-jackalman', 'Jackalman', 'thundercats', 'bosses',
     'lote2-jackalman.png', 'thundercats/bosses/jackalman.webp',
     (512, 512), 'nearest', 'images/bosses/jackalman.webp (retrato do chefe ao cadastrar o tema)'),
    ('tc-boss-monkian', 'Monkian', 'thundercats', 'bosses',
     'lote2-monkian.png', 'thundercats/bosses/monkian.webp',
     (512, 512), 'nearest', 'images/bosses/monkian.webp (retrato do chefe ao cadastrar o tema)'),
    ('tc-boss-vultureman', 'Vultureman', 'thundercats', 'bosses',
     'lote2-vultureman.png', 'thundercats/bosses/vultureman.webp',
     (512, 512), 'nearest', 'images/bosses/vultureman.webp (retrato do chefe ao cadastrar o tema)'),
    ('tc-boss-slithe', 'Slithe', 'thundercats', 'bosses',
     'lote2-slithe.png', 'thundercats/bosses/slithe.webp',
     (512, 512), 'nearest', 'images/bosses/slithe.webp (retrato do chefe ao cadastrar o tema)'),
    ('tc-boss-ratar-o', 'Ratar-O', 'thundercats', 'bosses',
     'lote2-ratar-o.png', 'thundercats/bosses/ratar-o.webp',
     (512, 512), 'nearest', 'images/bosses/ratar-o.webp (retrato do chefe ao cadastrar o tema)'),
    ('tc-boss-grune', 'Grune', 'thundercats', 'bosses',
     'lote2-grune.png', 'thundercats/bosses/grune.webp',
     (512, 512), 'nearest', 'images/bosses/grune.webp (retrato do chefe ao cadastrar o tema)'),
    ('tc-boss-safari-joe', 'Safari Joe', 'thundercats', 'bosses',
     'lote2-safari-joe.png', 'thundercats/bosses/safari-joe.webp',
     (512, 512), 'nearest', 'images/bosses/safari-joe.webp (retrato do chefe ao cadastrar o tema)'),
    ('tc-boss-captain-shiner', 'Captain Shiner', 'thundercats', 'bosses',
     'lote2-captain-shiner.png', 'thundercats/bosses/captain-shiner.webp',
     (512, 512), 'nearest', 'images/bosses/captain-shiner.webp (retrato do chefe ao cadastrar o tema)'),
    ('tc-boss-hammerhand', 'Hammerhand', 'thundercats', 'bosses',
     'lote2-hammerhand.png', 'thundercats/bosses/hammerhand.webp',
     (512, 512), 'nearest', 'images/bosses/hammerhand.webp (retrato do chefe ao cadastrar o tema)'),
    ('tc-boss-the-driller', 'The Driller', 'thundercats', 'bosses',
     'lote2-the-driller.png', 'thundercats/bosses/the-driller.webp',
     (512, 512), 'nearest', 'images/bosses/the-driller.webp (retrato do chefe ao cadastrar o tema)'),
    # Lote 3 — fecha a cartela 1 (Mumm-Ra mumificada) e a cartela 2 (patentes 01–09)
    ('tc-boss-mumm-ra-mumificada', 'Mumm-Ra, forma mumificada', 'thundercats', 'bosses',
     'lote3-mumm-ra-mumificada.png', 'thundercats/bosses/mumm-ra-mumificada.webp',
     (512, 512), 'nearest', 'images/bosses/mumm-ra-mumificada.webp (retrato do chefe ao cadastrar o tema)'),
    ('tc-patente-sobrevivente-de-thundera', 'Patente Sobrevivente de Thundera', 'thundercats', 'patentes',
     'lote3-patente-01.png', 'thundercats/patentes/thundercats-01.webp',
     (192, 192), 'lanczos', 'images/patentes/thundercats-01.webp (patente 1/10 ao cadastrar o tema)'),
    ('tc-patente-aprendiz-terceira-terra', 'Patente Aprendiz da Terceira Terra', 'thundercats', 'patentes',
     'lote3-patente-02.png', 'thundercats/patentes/thundercats-02.webp',
     (192, 192), 'lanczos', 'images/patentes/thundercats-02.webp (patente 2/10 ao cadastrar o tema)'),
    ('tc-patente-explorador-terceira-terra', 'Patente Explorador da Terceira Terra', 'thundercats', 'patentes',
     'lote3-patente-03.png', 'thundercats/patentes/thundercats-03.webp',
     (192, 192), 'lanczos', 'images/patentes/thundercats-03.webp (patente 3/10 ao cadastrar o tema)'),
    ('tc-patente-sentinela-toca-dos-gatos', 'Patente Sentinela da Toca dos Gatos', 'thundercats', 'patentes',
     'lote3-patente-04.png', 'thundercats/patentes/thundercats-04.webp',
     (192, 192), 'lanczos', 'images/patentes/thundercats-04.webp (patente 4/10 ao cadastrar o tema)'),
    ('tc-patente-guerreiro-de-thundera', 'Patente Guerreiro de Thundera', 'thundercats', 'patentes',
     'lote3-patente-05.png', 'thundercats/patentes/thundercats-05.webp',
     (192, 192), 'lanczos', 'images/patentes/thundercats-05.webp (patente 5/10 ao cadastrar o tema)'),
    ('tc-patente-guardiao-do-codigo', 'Patente Guardião do Código', 'thundercats', 'patentes',
     'lote3-patente-06.png', 'thundercats/patentes/thundercats-06.webp',
     (192, 192), 'lanczos', 'images/patentes/thundercats-06.webp (patente 6/10 ao cadastrar o tema)'),
    ('tc-patente-portador-da-espada', 'Patente Portador da Espada Justiceira', 'thundercats', 'patentes',
     'lote3-patente-07.png', 'thundercats/patentes/thundercats-07.webp',
     (192, 192), 'lanczos', 'images/patentes/thundercats-07.webp (patente 7/10 ao cadastrar o tema)'),
    ('tc-patente-protetor-do-olho', 'Patente Protetor do Olho de Thundera', 'thundercats', 'patentes',
     'lote3-patente-08.png', 'thundercats/patentes/thundercats-08.webp',
     (192, 192), 'lanczos', 'images/patentes/thundercats-08.webp (patente 8/10 ao cadastrar o tema)'),
    ('tc-patente-senor-dos-thundercats', 'Patente Senhor dos ThunderCats', 'thundercats', 'patentes',
     'lote3-patente-09.png', 'thundercats/patentes/thundercats-09.webp',
     (192, 192), 'lanczos', 'images/patentes/thundercats-09.webp (patente 9/10 ao cadastrar o tema)'),
    # Lote 4 — cartela 4: desafios The Office (itens 2–11; falta Último expediente)
    ('to-boss-reuniao-email', 'Reunião que poderia ser um e-mail', 'office', 'desafios',
     'lote4-reuniao-que-poderia-ser-um-email.png', 'office/bosses/reuniao-que-poderia-ser-um-email.webp',
     (512, 512), 'nearest', 'images/bosses/reuniao-que-poderia-ser-um-email.webp (retrato do desafio ao cadastrar o tema)'),
    ('to-boss-grampeador-na-gelatina', 'Grampeador na gelatina', 'office', 'desafios',
     'lote4-grampeador-na-gelatina.png', 'office/bosses/grampeador-na-gelatina.webp',
     (512, 512), 'nearest', 'images/bosses/grampeador-na-gelatina.webp (retrato do desafio ao cadastrar o tema)'),
    ('to-boss-inventario-do-deposito', 'Inventário do depósito', 'office', 'desafios',
     'lote4-inventario-do-deposito.png', 'office/bosses/inventario-do-deposito.webp',
     (512, 512), 'nearest', 'images/bosses/inventario-do-deposito.webp (retrato do desafio ao cadastrar o tema)'),
    ('to-boss-guerra-das-vendas', 'Guerra das vendas', 'office', 'desafios',
     'lote4-guerra-das-vendas.png', 'office/bosses/guerra-das-vendas.webp',
     (512, 512), 'nearest', 'images/bosses/guerra-das-vendas.webp (retrato do desafio ao cadastrar o tema)'),
    ('to-boss-comite-de-festas', 'Comitê de festas', 'office', 'desafios',
     'lote4-comite-de-festas.png', 'office/bosses/comite-de-festas.webp',
     (512, 512), 'nearest', 'images/bosses/comite-de-festas.webp (retrato do desafio ao cadastrar o tema)'),
    ('to-boss-olimpiadas-do-escritorio', 'Olimpíadas do escritório', 'office', 'desafios',
     'lote4-olimpiadas-do-escritorio.png', 'office/bosses/olimpiadas-do-escritorio.webp',
     (512, 512), 'nearest', 'images/bosses/olimpiadas-do-escritorio.webp (retrato do desafio ao cadastrar o tema)'),
    ('to-boss-simulado-de-incendio', 'Simulado de incêndio do Dwight', 'office', 'desafios',
     'lote4-simulado-de-incendio-do-dwight.png', 'office/bosses/simulado-de-incendio-do-dwight.webp',
     (512, 512), 'nearest', 'images/bosses/simulado-de-incendio-do-dwight.webp (retrato do desafio ao cadastrar o tema)'),
    ('to-boss-visita-do-corporativo', 'Visita do corporativo', 'office', 'desafios',
     'lote4-visita-do-corporativo.png', 'office/bosses/visita-do-corporativo.webp',
     (512, 512), 'nearest', 'images/bosses/visita-do-corporativo.webp (retrato do desafio ao cadastrar o tema)'),
    ('to-boss-crise-da-marca-dagua', 'Crise da marca-d’água', 'office', 'desafios',
     'lote4-crise-da-marca-dagua.png', 'office/bosses/crise-da-marca-dagua.webp',
     (512, 512), 'nearest', 'images/bosses/crise-da-marca-dagua.webp (retrato do desafio ao cadastrar o tema)'),
    ('to-boss-premiacao-dos-dundies', 'Premiação dos Dundies', 'office', 'desafios',
     'lote4-premiacao-dos-dundies.png', 'office/bosses/premiacao-dos-dundies.webp',
     (512, 512), 'nearest', 'images/bosses/premiacao-dos-dundies.webp (retrato do desafio ao cadastrar o tema)'),
    # Lote 5 — fecha a cartela 4 (Último expediente) e a cartela 5 (patentes 01–09)
    ('to-boss-ultimo-expediente', 'Último expediente', 'office', 'desafios',
     'lote5-ultimo-expediente.png', 'office/bosses/ultimo-expediente.webp',
     (512, 512), 'nearest', 'images/bosses/ultimo-expediente.webp (retrato do desafio ao cadastrar o tema)'),
    ('to-patente-recem-contratado', 'Patente Recém-contratado', 'office', 'patentes',
     'lote5-patente-01.png', 'office/patentes/office-01.webp',
     (192, 192), 'lanczos', 'images/patentes/office-01.webp (patente 1/10 ao cadastrar o tema)'),
    ('to-patente-assistente-administrativo', 'Patente Assistente Administrativo', 'office', 'patentes',
     'lote5-patente-02.png', 'office/patentes/office-02.webp',
     (192, 192), 'lanczos', 'images/patentes/office-02.webp (patente 2/10 ao cadastrar o tema)'),
    ('to-patente-representante-de-vendas', 'Patente Representante de Vendas', 'office', 'patentes',
     'lote5-patente-03.png', 'office/patentes/office-03.webp',
     (192, 192), 'lanczos', 'images/patentes/office-03.webp (patente 3/10 ao cadastrar o tema)'),
    ('to-patente-vendedor-do-mes', 'Patente Vendedor do Mês', 'office', 'patentes',
     'lote5-patente-04.png', 'office/patentes/office-04.webp',
     (192, 192), 'lanczos', 'images/patentes/office-04.webp (patente 4/10 ao cadastrar o tema)'),
    ('to-patente-supervisor-da-filial', 'Patente Supervisor da Filial', 'office', 'patentes',
     'lote5-patente-05.png', 'office/patentes/office-05.webp',
     (192, 192), 'lanczos', 'images/patentes/office-05.webp (patente 5/10 ao cadastrar o tema)'),
    ('to-patente-assistente-do-gerente', 'Patente Assistente do Gerente Regional', 'office', 'patentes',
     'lote5-patente-06.png', 'office/patentes/office-06.webp',
     (192, 192), 'lanczos', 'images/patentes/office-06.webp (patente 6/10 ao cadastrar o tema)'),
    ('to-patente-assistente-gerente', 'Patente Assistente Gerente Regional', 'office', 'patentes',
     'lote5-patente-07.png', 'office/patentes/office-07.webp',
     (192, 192), 'lanczos', 'images/patentes/office-07.webp (patente 7/10 ao cadastrar o tema)'),
    ('to-patente-gerente-regional', 'Patente Gerente Regional', 'office', 'patentes',
     'lote5-patente-08.png', 'office/patentes/office-08.webp',
     (192, 192), 'lanczos', 'images/patentes/office-08.webp (patente 8/10 ao cadastrar o tema)'),
    ('to-patente-diretor-do-corporativo', 'Patente Diretor do Corporativo', 'office', 'patentes',
     'lote5-patente-09.png', 'office/patentes/office-09.webp',
     (192, 192), 'lanczos', 'images/patentes/office-09.webp (patente 9/10 ao cadastrar o tema)'),
    # Lote 6 — cartela 3 (ThunderCats/Identidade) e cartela 6 (The Office/Identidade).
    # Peças de identidade: objetos centrais opacos, 512×512 NEAREST (2:1 exato).
    # Sem uso na UI por ora: candidatos para revisão/futuro vínculo editorial.
    ('tc-id-trofeu-da-jornada', 'Troféu da Jornada', 'thundercats', 'identidade',
     'lote6-trofeu-da-jornada.png', 'thundercats/identidade/trofeu-da-jornada.webp',
     (512, 512), 'nearest', 'images/artes/candidatos/thundercats/identidade/trofeu-da-jornada.webp (identidade do tema; sem vínculo com UI)'),
    ('tc-id-espada-do-trovao', 'Espada do Trovão', 'thundercats', 'identidade',
     'lote6-espada-do-trovao.png', 'thundercats/identidade/espada-do-trovao.webp',
     (512, 512), 'nearest', 'images/artes/candidatos/thundercats/identidade/espada-do-trovao.webp (identidade do tema; sem vínculo com UI)'),
    ('tc-id-olho-de-thundera', 'Olho de Thundera', 'thundercats', 'identidade',
     'lote6-olho-de-thundera.png', 'thundercats/identidade/olho-de-thundera.webp',
     (512, 512), 'nearest', 'images/artes/candidatos/thundercats/identidade/olho-de-thundera.webp (identidade do tema; sem vínculo com UI)'),
    ('tc-id-fortaleza-de-thundera', 'Fortaleza de Thundera', 'thundercats', 'identidade',
     'lote6-fortaleza-de-thundera.png', 'thundercats/identidade/fortaleza-de-thundera.webp',
     (512, 512), 'nearest', 'images/artes/candidatos/thundercats/identidade/fortaleza-de-thundera.webp (identidade do tema; sem vínculo com UI)'),
    ('tc-id-simbolo-central', 'Símbolo central', 'thundercats', 'identidade',
     'lote6-simbolo-central.png', 'thundercats/identidade/simbolo-central.webp',
     (512, 512), 'nearest', 'images/artes/candidatos/thundercats/identidade/simbolo-central.webp (identidade do tema; sem vínculo com UI)'),
    ('to-id-trofeu-dundie', 'Troféu Dundie', 'office', 'identidade',
     'lote6-trofeu-dundie.png', 'office/identidade/trofeu-dundie.webp',
     (512, 512), 'nearest', 'images/artes/candidatos/office/identidade/trofeu-dundie.webp (identidade do tema; sem vínculo com UI)'),
    ('to-id-caneca', 'Caneca', 'office', 'identidade',
     'lote6-caneca.png', 'office/identidade/caneca.webp',
     (512, 512), 'nearest', 'images/artes/candidatos/office/identidade/caneca.webp (identidade do tema; sem vínculo com UI)'),
    ('to-id-beterraba', 'Beterraba', 'office', 'identidade',
     'lote6-beterraba.png', 'office/identidade/beterraba.webp',
     (512, 512), 'nearest', 'images/artes/candidatos/office/identidade/beterraba.webp (identidade do tema; sem vínculo com UI)'),
    ('to-id-grampeador-na-gelatina', 'Grampeador na gelatina', 'office', 'identidade',
     'lote6-grampeador-na-gelatina-identidade.png', 'office/identidade/grampeador-na-gelatina.webp',
     (512, 512), 'nearest', 'images/artes/candidatos/office/identidade/grampeador-na-gelatina.webp (identidade do tema, close do objeto; sem vínculo com UI)'),
    ('to-id-cadeira', 'Cadeira', 'office', 'identidade',
     'lote6-cadeira.png', 'office/identidade/cadeira.webp',
     (512, 512), 'nearest', 'images/artes/candidatos/office/identidade/cadeira.webp (identidade do tema; sem vínculo com UI)'),
]

# Notas de revisão peça a peça que complementam a nota genérica do método
# (divergências registradas na revisão visual, como nas bordas dos lotes 2/4).
NOTAS_EXTRA = {
    'tc-id-espada-do-trovao': ' Divergência registrada: borda decorativa interna marrom em todo o quadro (como a borda do Grune no lote 2).',
    'tc-id-simbolo-central': ' Divergência registrada: silhueta felina assimétrica, com bigodes apenas à esquerda; leitura a 28 px conferida na prova de leitura.',
    'to-id-trofeu-dundie': ' Divergência registrada: fundo claro tipo folha/cortina de papel atrás da estatueta; placa da base em branco, sem texto.',
    'to-id-caneca': ' Divergência registrada: post-its ao fundo com rabiscos abstratos ilegíveis (sem texto legível); caneca em branco, sem logo.',
    'to-id-cadeira': ' Divergência registrada: cena noturna escura; cadeira preta sobre fundo escuro com contraste moderado, realçada pela luminária. Leitura fraca a 28 px (prova de leitura do lote 6): preferir exibição maior ou revisão de contraste antes de uso como ícone pequeno.',
}

# Molduras: flood-fill do xadrez pintado. (faixas de luminância de neutros, sementes extras)
MOLDURAS = [
    ('tc-moldura', 'Moldura ThunderCats', 'thundercats',
     'lote1-moldura-thundercats.png', 'thundercats/molduras/moldura-thundercats',
     [(140, 222)], [],
     'Overlay de moldura do Card (referência 1080×1920); precisa de alfa confiável + teste nos canvases 1080×1920/1080×1080 antes de virar em uso'),
    ('to-moldura', 'Moldura The Office', 'office',
     'lote1-moldura-office.png', 'office/molduras/moldura-office',
     [(200, 250)], [(118, 108)],  # semente extra: xadrez ilhado dentro do anel do café
     'Overlay de moldura do Card (referência 1080×1920); precisa de alfa confiável + teste nos canvases 1080×1920/1080×1080 antes de virar em uso'),
]

RESAMPLE = {'nearest': Image.Resampling.NEAREST, 'lanczos': Image.Resampling.LANCZOS}


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def rel(p):
    p = Path(p)
    return str(p.relative_to(ROOT)) if p.is_relative_to(ROOT) else str(p)


def key_checker(im, bands, extra_seeds):
    """Alfa por flood-fill do xadrez pintado (neutros dentro das faixas)."""
    w, h = im.size
    px = im.load()

    def is_checker(r, g, b):
        if max(r, g, b) - min(r, g, b) > 6:
            return False
        y = (r + g + b) / 3
        return any(lo <= y <= hi for lo, hi in bands)

    mask = bytearray(w * h)
    q = deque()

    def seed(x, y):
        if 0 <= x < w and 0 <= y < h and not mask[y * w + x]:
            r, g, b = px[x, y]
            if is_checker(r, g, b):
                mask[y * w + x] = 1
                q.append((x, y))

    for x in range(0, w, 2):
        seed(x, 0)
        seed(x, h - 1)
    for y in range(0, h, 2):
        seed(0, y)
        seed(w - 1, y)
    for dx in range(-80, 81, 10):
        for dy in range(-80, 81, 10):
            seed(w // 2 + dx, h // 2 + dy)
    for (sx, sy) in extra_seeds:
        for dx in range(-30, 31, 5):
            for dy in range(-30, 31, 5):
                seed(sx + dx, sy + dy)
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not mask[ny * w + nx]:
                r, g, b = px[nx, ny]
                if is_checker(r, g, b):
                    mask[ny * w + nx] = 1
                    q.append((nx, ny))
    alpha = Image.frombytes('L', (w, h), bytes(0 if v else 255 for v in mask))
    alpha = alpha.filter(ImageFilter.MedianFilter(3))  # remove pontilhado de halo
    return Image.merge('RGBA', (*im.split(), alpha)), sum(mask) / (w * h)


# Manifesto anterior, indexado por id (registros sem original no ambiente são preservados)
antigo = {}
if MANIFESTO.exists():
    for r in json.loads(MANIFESTO.read_text()):
        antigo[r['id']] = r

records = []
preservados = 0

for pid, peca, tema, cat, fname, dest, alvo, metodo, uso in PECAS:
    src = SRC / fname
    if not src.exists():
        if pid in antigo:
            records.append(antigo[pid])
            preservados += 1
            print(f'  ⏭️  {pid}: original ausente ({fname}) — registro preservado, derivado não tocado')
        else:
            print(f'  ⚠️  {pid}: original ausente e sem registro anterior — pulado')
        continue
    im = Image.open(src).convert('RGB')
    saida = OUT_CAND / dest
    saida.parent.mkdir(parents=True, exist_ok=True)
    out = im if metodo == 'none' else im.resize(alvo, RESAMPLE[metodo])
    out.save(saida, 'WEBP', quality=84, method=6)
    records.append(dict(
        id=pid, peca=peca, tema=tema, categoria=cat, origem='geracao',
        fonte=rel(src), fonte_sha256=sha256(src), recorte=None,
        saida=rel(saida), largura=out.width, altura=out.height,
        formato='webp', transparencia='opaco', bytes=saida.stat().st_size,
        local_de_uso=uso, estado='candidato',
        notas=f'Redução {metodo} de {im.width}×{im.height} (gerada em pixel art com brilhos suaves; sem esticar). Revisada individualmente.' + NOTAS_EXTRA.get(pid, '')))

for pid, peca, tema, fname, dest, bands, extra, uso in MOLDURAS:
    src = SRC / fname
    if not src.exists():
        if pid + '-webp' in antigo:
            records.append(antigo[pid + '-webp'])
            preservados += 1
            print(f'  ⏭️  {pid}: original ausente ({fname}) — registro preservado, derivado não tocado')
        else:
            print(f'  ⚠️  {pid}: original ausente e sem registro anterior — pulado')
        continue
    im = Image.open(src).convert('RGB')
    rgba, pct = key_checker(im, bands, extra)
    # Mestre PNG sem perda fica FORA do Git (cache); só o WebP com alfa é versionado.
    mestre = SRC / 'derivados' / (dest + '.png')
    mestre.parent.mkdir(parents=True, exist_ok=True)
    rgba.save(mestre, 'PNG')
    saida = OUT_CAND / (dest + '.webp')
    saida.parent.mkdir(parents=True, exist_ok=True)
    rgba.save(saida, 'WEBP', quality=84, method=6)
    records.append(dict(
        id=f'{pid}-webp', peca=peca, tema=tema, categoria='molduras', origem='derivado',
        fonte=rel(src), fonte_sha256=sha256(src), recorte=None,
        saida=rel(saida), largura=rgba.width, altura=rgba.height,
        formato='webp', transparencia=f'alfa por keying do xadrez pintado ({pct:.0%} do quadro; mediana 3 no alfa)',
        bytes=saida.stat().st_size, local_de_uso=uso, estado='candidato',
        notas='Gerada SEM alfa nativo (RGB com xadrez desenhado — não é transparência). Keying flood-fill revisado em prova sobre card; halo leve nas bordas internas aceito como candidato. Mestre PNG sem perda em ' + rel(mestre) + ' (fora do Git; o script regenera). Não usar como overlay final sem novo teste nos canvases reais.'))

# Provas leves para revisão (montagem por código; fora do cache do app)
OUT_PROVAS.mkdir(parents=True, exist_ok=True)

def arquivo_peca(dest, uso):
    """Derivado no candidato; após o cadastro do tema, no caminho final."""
    cand = OUT_CAND / dest
    if cand.exists():
        return cand
    final = ROOT / uso.split(' ')[0]
    return final if final.exists() else cand


# 1) leitura a 28/56 px de patentes, selos e identidade (método final)
alvos_leitura = [(pid, dest, uso) for pid, peca, tema, cat, fname, dest, alvo, metodo, uso in PECAS
                 if cat in ('patentes', 'temas', 'identidade') and arquivo_peca(dest, uso).exists()]
faixa = Image.new('RGB', (max(1, len(alvos_leitura)) * 90, 200), (24, 24, 28))
col = 0
for pid, dest, uso in alvos_leitura:
    im = Image.open(arquivo_peca(dest, uso))
    faixa.paste(im.resize((80, 80), Image.Resampling.NEAREST), (col * 90 + 5, 5))
    faixa.paste(im.resize((28, 28), Image.Resampling.LANCZOS), (col * 90 + 5, 95))
    faixa.paste(im.resize((56, 56), Image.Resampling.LANCZOS), (col * 90 + 5, 130))
    col += 1
faixa = faixa.resize((faixa.width * 2, faixa.height * 2), Image.Resampling.NEAREST)
faixa.save(OUT_PROVAS / 'leitura-patentes-28px.webp', 'WEBP', quality=85, method=6)

# 2) molduras sobre um card real (halos)
card = Image.open(ROOT / 'images' / 'cards' / 'classico.webp').convert('RGB')
for pid, peca, tema, fname, dest, bands, extra, uso in MOLDURAS:
    p = OUT_CAND / (dest + '.webp')
    if not p.exists():
        continue
    m = Image.open(p)
    fundo = card.resize(m.size, Image.LANCZOS)
    fundo.paste(m, (0, 0), m)
    fundo.save(OUT_PROVAS / f'moldura-{tema}-sobre-card.webp', 'WEBP', quality=82, method=6)

# 3) cartela de revisão com TODOS os derivados (grade regular, sem legendas;
# candidatos e, após o cadastro dos temas, também os arquivos finais)
cells = [arquivo_peca(dest, uso) for pid, peca, tema, cat, fname, dest, alvo, metodo, uso in PECAS
         if arquivo_peca(dest, uso).exists()]
cells += [OUT_CAND / (dest + '.webp') for pid, peca, tema, fname, dest, bands, extra, uso in MOLDURAS
          if (OUT_CAND / (dest + '.webp')).exists()]
cols = 6
rows = max(1, math.ceil(len(cells) / cols))
CW, CH, M = 200, 200, 20
cartela = Image.new('RGB', (cols * CW + (cols + 1) * M, rows * CH + (rows + 1) * M), (18, 18, 22))
for i, caminho in enumerate(cells):
    im = Image.open(caminho)
    im.thumbnail((CW, CH), Image.Resampling.LANCZOS)
    x = M + (i % cols) * (CW + M) + (CW - im.width) // 2
    y = M + (i // cols) * (CH + M) + (CH - im.height) // 2
    if im.mode == 'RGBA':
        cartela.paste(im, (x, y), im)
    else:
        cartela.paste(im, (x, y))
cartela.save(OUT_PROVAS / 'cartela-candidatos.webp', 'WEBP', quality=82, method=6)

MANIFESTO.write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n')
print(f'{len(records)} registros no manifesto ({preservados} preservados); '
      f'candidatos em {OUT_CAND}; provas em {OUT_PROVAS}')
