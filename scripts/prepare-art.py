#!/usr/bin/env python3
"""Deriva somente os anexos desta PR. Uso: python prepare-art.py DIRETORIO_DOS_ANEXOS.
Ferramenta editorial opcional: Pillow 13.0.0; não é dependência do app/build.
Coordenadas manuais [esquerda, topo, direita, base), não grade automática.
"""
import hashlib
import json
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCES = Path(sys.argv[1])
EQUIP = 'Ícones Pixelados de Equipamentos de Academia.png'
MUSCLE = 'Grade de Músculos em Pixel Art.png'
SESSION = 'Ícones Fitness Pixelados em Laranja e Ciano.png'
BADGE = 'Oito_insgnias_para_conquistas_de_treino_em_uma_cartela_42_pr.webp'
# Cada caixa inclui margem para contorno/sombra, sem invadir o vizinho.
GROUPS = [
    (EQUIP, 'icones/equipamentos', 128, [
        ('barra-anilhas', (38, 138, 380, 483)),
        ('halteres', (410, 138, 756, 483)),
        ('kettlebell', (784, 138, 1130, 483)),
        ('banco', (1156, 138, 1502, 483)),
        ('polia', (38, 520, 380, 866)),
        ('esteira', (410, 520, 756, 866)),
        ('remo', (784, 520, 1130, 866)),
        ('argolas', (1156, 520, 1502, 866)),
    ]),
    (MUSCLE, 'icones/anatomia', 128, [
        ('desenho-01', (34, 119, 361, 430)),
        ('desenho-02', (380, 119, 707, 430)),
        ('desenho-03', (727, 119, 1054, 430)),
        ('desenho-04', (1073, 119, 1400, 430)),
        ('desenho-05', (1420, 119, 1747, 430)),
        ('desenho-06', (34, 459, 361, 771)),
        ('desenho-07', (380, 459, 707, 771)),
        ('desenho-08', (727, 459, 1054, 771)),
        ('desenho-09', (1073, 459, 1400, 771)),
        ('desenho-10', (1420, 459, 1747, 771)),
    ]),
    (SESSION, 'icones/sessao', 96, [
        ('halter', (82, 223, 381, 410)),
        ('simbolo-ciclo-01', (452, 190, 726, 446)),
        ('cronometro', (813, 173, 1065, 453)),
        ('adicionar', (1193, 205, 1442, 441)),
        ('check', (94, 574, 362, 840)),
        ('simbolo-ciclo-02', (436, 594, 737, 806)),
        ('trofeu', (804, 581, 1074, 838)),
        ('alerta', (1182, 581, 1451, 831)),
    ]),
    (BADGE, 'insignias', 160, [
        ('insignia-01', (100, 65, 320, 292)),
        ('insignia-02', (372, 72, 590, 293)),
        ('insignia-03', (646, 71, 869, 293)),
        ('insignia-04', (916, 67, 1137, 298)),
        ('insignia-05', (94, 297, 313, 511)),
        ('insignia-06', (372, 295, 586, 512)),
        ('insignia-07', (647, 299, 869, 510)),
        ('insignia-08', (927, 311, 1124, 505)),
        ('insignia-09', (110, 521, 294, 743)),
        ('insignia-10', (362, 539, 590, 741)),
        ('insignia-11', (645, 522, 861, 748)),
        ('insignia-12', (905, 520, 1146, 749)),
    ]),
]
USES = {
    'icones/equipamentos/barra-anilhas': 'Título da calculadora de anilhas',
    'icones/sessao/halter': 'Título do treino em andamento',
    'icones/sessao/cronometro': 'Título do descanso da sessão',
    'cenarios/caderno-barra': 'Ilustração junto ao título Registro rápido',
}
records = []

def export(source, key, box, size):
    original = Image.open(SOURCES / source)
    im = original.crop(box) if box else original.copy()
    # NEAREST mantém os contornos; thumbnail preserva proporção (sem esticar).
    im.thumbnail((size, size), Image.Resampling.NEAREST)
    dest = ROOT / 'images' / 'artes' / (key + '.webp')
    dest.parent.mkdir(parents=True, exist_ok=True)
    # Sem remoção automática de fundo: RGB opaco é intencional.
    im.convert('RGB').save(dest, 'WEBP', quality=84, method=6)
    records.append(dict(source=source, source_sha256=hashlib.sha256((SOURCES / source).read_bytes()).hexdigest(),
                        file=dest.relative_to(ROOT).as_posix(), crop=box,
                        width=im.width, height=im.height, bytes=dest.stat().st_size,
                        status='em uso' if key in USES else 'candidato',
                        use=USES.get(key, 'Sem vínculo com UI; preparação para revisão futura')))

for source, folder, size, items in GROUPS:
    for name, box in items:
        export(source, folder + '/' + name, box, size)
export('lVHrN00vYebRObERwahc3FuKtjPo_7jmbAmgE94gXu8.webp', 'cenarios/caderno-barra', None, 240)
(ROOT / 'docs' / 'artes-derivadas.json').write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n')
print(f'{len(records)} derivados; {sum(r["bytes"] for r in records)} bytes')
