#!/usr/bin/env python3
"""Deriva o primeiro lote de artes ThunderCats e The Office (10 geradas).

Uso: python3 prepare-art-lote1.py [DIRETORIO_DOS_ORIGINAIS]
Padrão: .cache/artes-originais (originais grandes FORA do Git; .cache/ é ignorado).

Ferramenta editorial opcional: Pillow (venv próprio). Não é dependência do
app/build e não entra em package.json.

Regras aplicadas por peça (decisões revisadas uma a uma, não grade automática):
- Bosses 512×512: NEAREST (2:1 exato; a arte é pixel art com brilhos).
- Patentes/selos 192×192: LANCZOS (escala não inteira; NEAREST granula os
  brilhos suaves e piora a leitura a 28 px).
- Fundos 1024×1024: sem redimensionar, só WebP.
- Molduras: o gerador devolveu RGB com xadrez PINTADO (não é alfa). O xadrez
  é removido por flood-fill de neutros em faixas de luminância + mediana 3 no
  alfa, COM revisão visual das provas em docs/provas-lote1/. Qualquer resíduo
  fica documentado no manifesto; nada é apresentado como alfa nativo.

Regenera também docs/manifesto-artes.json (dimensões/bytes reais por peça).
"""
import hashlib
import json
import os
import sys
from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / '.cache' / 'artes-originais'
OUT_CAND = ROOT / 'images' / 'artes' / 'candidatos'
OUT_PROVAS = ROOT / 'docs' / 'provas-lote1'

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
]

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


records = []

for pid, peca, tema, cat, fname, dest, alvo, metodo, uso in PECAS:
    src = SRC / fname
    im = Image.open(src).convert('RGB')
    saida = OUT_CAND / dest
    saida.parent.mkdir(parents=True, exist_ok=True)
    if metodo == 'none':
        out = im
    else:
        out = im.resize(alvo, RESAMPLE[metodo])
    out.save(saida, 'WEBP', quality=84, method=6)
    records.append(dict(
        id=pid, peca=peca, tema=tema, categoria=cat, origem='geracao',
        fonte=str(src.relative_to(ROOT)) if src.is_relative_to(ROOT) else str(src),
        fonte_sha256=sha256(src), recorte=None,
        saida=str(saida.relative_to(ROOT)), largura=out.width, altura=out.height,
        formato='webp', transparencia='opaco', bytes=saida.stat().st_size,
        local_de_uso=uso, estado='candidato',
        notas=f'Redução {metodo} de {im.width}×{im.height} (gerada em pixel art com brilhos suaves; sem esticar). Revisada individualmente.'))

for pid, peca, tema, fname, dest, bands, extra, uso in MOLDURAS:
    src = SRC / fname
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
        fonte=str(src.relative_to(ROOT)) if src.is_relative_to(ROOT) else str(src),
        fonte_sha256=sha256(src), recorte=None,
        saida=str(saida.relative_to(ROOT)), largura=rgba.width, altura=rgba.height,
        formato='webp', transparencia=f'alfa por keying do xadrez pintado ({pct:.0%} do quadro; mediana 3 no alfa)',
        bytes=saida.stat().st_size, local_de_uso=uso, estado='candidato',
        notas='Gerada SEM alfa nativo (RGB com xadrez desenhado — não é transparência). Keying flood-fill revisado em prova sobre card; halo leve nas bordas internas aceito como candidato. Mestre PNG sem perda em ' + str(mestre.relative_to(ROOT)) + ' (fora do Git; o script regenera). Não usar como overlay final sem novo teste nos canvases reais.'))

# Provas leves para revisão (montagem por código; fora do cache do app)
OUT_PROVAS.mkdir(parents=True, exist_ok=True)
# 1) leitura a 28/56 px: patentes e selos (pares NEAREST|LANCZOS do experimento → aqui só o método final)
faixa = Image.new('RGB', (4 * 90, 200), (24, 24, 28))
col = 0
for pid, peca, tema, cat, fname, dest, alvo, metodo, uso in PECAS:
    if cat not in ('patentes', 'temas'):
        continue
    im = Image.open(OUT_CAND / dest)
    faixa.paste(im.resize((80, 80), Image.Resampling.NEAREST), (col * 90 + 5, 5))
    faixa.paste(im.resize((28, 28), Image.Resampling.LANCZOS), (col * 90 + 5, 95))
    faixa.paste(im.resize((56, 56), Image.Resampling.LANCZOS), (col * 90 + 5, 130))
    col += 1
faixa = faixa.resize((faixa.width * 2, faixa.height * 2), Image.Resampling.NEAREST)
faixa.save(OUT_PROVAS / 'leitura-patentes-28px.webp', 'WEBP', quality=85, method=6)

# 2) molduras sobre um card real (halos)
card = Image.open(ROOT / 'images' / 'cards' / 'classico.webp').convert('RGB')
for pid, peca, tema, fname, dest, bands, extra, uso in MOLDURAS:
    m = Image.open(OUT_CAND / (dest + '.webp'))
    fundo = card.resize(m.size, Image.LANCZOS)
    fundo.paste(m, (0, 0), m)
    fundo.save(OUT_PROVAS / f'moldura-{tema}-sobre-card.webp', 'WEBP', quality=82, method=6)

# 3) cartela de revisão 5×2 montada por código (grade regular, sem legendas)
cells = [(pid, dest) for pid, peca, tema, cat, fname, dest, alvo, metodo, uso in PECAS]
cells += [(pid, dest + '.webp') for pid, peca, tema, fname, dest, bands, extra, uso in MOLDURAS]
CW, CH, M = 256, 256, 24
cartela = Image.new('RGB', (5 * CW + 6 * M, 2 * CH + 3 * M), (18, 18, 22))
for i, (pid, dest) in enumerate(cells):
    im = Image.open(OUT_CAND / dest)
    im.thumbnail((CW, CH), Image.Resampling.LANCZOS)
    col, row = i % 5, i // 5
    x = M + col * (CW + M) + (CW - im.width) // 2
    y = M + row * (CH + M) + (CH - im.height) // 2
    if im.mode == 'RGBA':
        cartela.paste(im, (x, y), im)
    else:
        cartela.paste(im, (x, y))
cartela.save(OUT_PROVAS / 'cartela-lote1.webp', 'WEBP', quality=82, method=6)

(ROOT / 'docs' / 'manifesto-artes.json').write_text(
    json.dumps(records, ensure_ascii=False, indent=2) + '\n')
print(f'{len(records)} registros no manifesto; candidatos em {OUT_CAND}; provas em {OUT_PROVAS}')
