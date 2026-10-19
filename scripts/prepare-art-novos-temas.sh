#!/usr/bin/env bash
# ============================================================
# Deriva as artes dos NOVOS TEMAS (lote 1: selos + fundos de card).
# ------------------------------------------------------------
# Ferramenta editorial opcional. Não participa de npm/build/CI e não é
# dependência de produção: usa ImageMagick (convert/montage), não Pillow.
#
# Uso:  scripts/prepare-art-novos-temas.sh [DIRETORIO_DOS_ORIGINAIS]
# Padrão: .cache/artes-originais/novos-temas
#
# Os originais grandes ficam FORA do Git (.cache/ é ignorado e volátil).
# O registro durável é docs/manifesto-artes.json + os derivados versionados.
#
# Regras de redução (mesmas do lote ThunderCats/Office):
#  - selo de tema 192×192: LANCZOS (escala não inteira; não granular brilhos)
#  - fundo de card 1024×1024: sem redimensionar, só reempacotar em WebP
# Nada é esticado; nenhuma peça é gerada aqui (as cartelas de prova são
# montagem por código, só para conferência).
# ============================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="${1:-$ROOT/.cache/artes-originais/novos-temas}"
OUT="$ROOT/images/artes/candidatos"
PROVAS="$ROOT/docs/provas-novos-temas"

if [ ! -d "$SRC" ]; then
    echo "ERRO: diretório de originais não encontrado: $SRC" >&2
    echo "Os originais não ficam no Git; reenvie/regere as peças antes de rodar." >&2
    exit 1
fi

mkdir -p "$PROVAS"

# tema:peça — a peça é o sufixo do arquivo de origem e do caminho de destino.
PECAS=(
    "avatar:selo"
    "caverna:selo"
    "office-us:selo"
    "springfield:selo"
    "vila:selo"
    "esgoto:selo"
    "avatar:fundo"
    "vila:fundo"
)

for item in "${PECAS[@]}"; do
    tema="${item%%:*}"
    peca="${item##*:}"
    origem="$SRC/$peca-${tema}.png"
    # os arquivos de origem usam o nome curto do tema; mapa explícito
    case "$tema" in
        avatar)      origem="$SRC/$peca-aang.png" ;;
        caverna)     origem="$SRC/$peca-caverna.png" ;;
        office-us)   origem="$SRC/$peca-scranton.png" ;;
        springfield) origem="$SRC/$peca-springfield.png" ;;
        vila)        origem="$SRC/$peca-vila.png" ;;
        esgoto)      origem="$SRC/$peca-esgoto.png" ;;
    esac
    if [ ! -f "$origem" ]; then
        echo "AVISO: peça ausente, mantendo derivado existente: $origem" >&2
        continue
    fi
    if [ "$peca" = "selo" ]; then
        destino="$OUT/$tema/temas/$tema.webp"
        mkdir -p "$(dirname "$destino")"
        convert "$origem" -filter Lanczos -resize 192x192 -strip \
            -define webp:method=6 -quality 84 "$destino"
    else
        destino="$OUT/$tema/cards/$tema.webp"
        mkdir -p "$(dirname "$destino")"
        convert "$origem" -resize 1024x1024 -strip \
            -define webp:method=6 -quality 80 "$destino"
    fi
    echo "ok $destino"
done

# ---------- provas (montagem por código, nunca arte gerada) ----------
SELOS=("avatar" "caverna" "office-us" "springfield" "vila" "esgoto")
sizes=(192 56 28)
for s in "${sizes[@]}"; do
    tmp=$(mktemp -d)
    for t in "${SELOS[@]}"; do
        f="$OUT/$t/temas/$t.webp"
        [ -f "$f" ] && convert "$f" -filter Lanczos -resize "${s}x${s}" "$tmp/$t.png"
    done
    montage -background '#15171c' -fill '#c9ccd4' -font DejaVu-Sans -pointsize 14 \
        -label '%t' "$tmp"/*.png -tile 6x1 -geometry "${s}x${s}+12+12" -gravity center \
        "$PROVAS/leitura-selos-${s}px.png"
    rm -rf "$tmp"
done

convert "$PROVAS/leitura-selos-192px.png" \
    "$PROVAS/leitura-selos-56px.png" \
    "$PROVAS/leitura-selos-28px.png" \
    -background '#15171c' -gravity west -append \
    -define webp:method=6 -quality 88 "$PROVAS/leitura-selos.webp"

# Fundos com a mesma moldura escura de conferência (não é o card final)
montage -background '#15171c' -fill '#c9ccd4' -font DejaVu-Sans -pointsize 16 \
    -label '%t' "$OUT/avatar/cards/avatar.webp" "$OUT/vila/cards/vila.webp" \
    -tile 2x1 -geometry 512x512+14+14 -gravity center \
    -define webp:method=6 -quality 86 "$PROVAS/fundos-cards.webp"

rm -f "$PROVAS"/leitura-selos-*px.png
echo "provas em $PROVAS"
