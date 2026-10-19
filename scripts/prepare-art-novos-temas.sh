#!/usr/bin/env bash
# ============================================================
# Deriva as artes dos NOVOS TEMAS (lotes 1–2: selos, fundos e patentes).
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
#  - patente 192×192: LANCZOS (idem; lida a 28 px no modal de patentes)
#  - retrato de chefão 512×512: LANCZOS (a origem é 1254 px, escala não inteira;
#    o retrato aparece em círculo no card, então detalhe importa mais que grade)
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

# id do tema (destino) ↔ prefixo do arquivo de origem
TEMAS=(avatar caverna office-us springfield vila esgoto)
prefixo() {
    case "$1" in
        avatar) echo aang ;;
        office-us) echo scranton ;;
        *) echo "$1" ;;
    esac
}

# ---------- selos (192×192) ----------
for tema in "${TEMAS[@]}"; do
    origem="$SRC/selo-$(prefixo "$tema").png"
    destino="$OUT/$tema/temas/$tema.webp"
    if [ ! -f "$origem" ]; then
        echo "AVISO: selo ausente, mantendo derivado existente: $origem" >&2
        continue
    fi
    mkdir -p "$(dirname "$destino")"
    convert "$origem" -filter Lanczos -resize 192x192 -strip \
        -define webp:method=6 -quality 84 "$destino"
    echo "ok $destino"
done

# ---------- fundos de card (1024×1024) ----------
for tema in "${TEMAS[@]}"; do
    origem="$SRC/fundo-$(prefixo "$tema").png"
    destino="$OUT/$tema/cards/$tema.webp"
    if [ ! -f "$origem" ]; then
        echo "AVISO: fundo ausente, mantendo derivado existente: $origem" >&2
        continue
    fi
    mkdir -p "$(dirname "$destino")"
    convert "$origem" -resize 1024x1024 -strip \
        -define webp:method=6 -quality 80 "$destino"
    echo "ok $destino"
done

# ---------- patentes (192×192) ----------
# Formato de origem: patente-<tema>-NN.png; destino: <tema>/patentes/<tema>-NN.webp
for origem in "$SRC"/patente-*.png; do
    [ -f "$origem" ] || continue
    base="$(basename "$origem" .png)"
    tema_curto="${base#patente-}"      # ex.: avatar-03
    tema="${tema_curto%-*}"            # ex.: avatar
    sufixo="${tema_curto##*-}"         # ex.: 03
    case "$tema" in
        avatar) destino_tema=avatar ;;
        caverna) destino_tema=caverna ;;
        scranton|office) destino_tema=office-us ;;
        springfield) destino_tema=springfield ;;
        vila) destino_tema=vila ;;
        esgoto) destino_tema=esgoto ;;
        *) echo "AVISO: tema desconhecido em $origem" >&2; continue ;;
    esac
    destino="$OUT/$destino_tema/patentes/$destino_tema-$sufixo.webp"
    mkdir -p "$(dirname "$destino")"
    convert "$origem" -filter Lanczos -resize 192x192 -strip \
        -define webp:method=6 -quality 84 "$destino"
    echo "ok $destino"
done

# ---------- retratos de chefão (512×512) ----------
for origem in "$SRC"/boss-*.png; do
    [ -f "$origem" ] || continue
    base="$(basename "$origem" .png)"
    tema="$(printf '%s' "${base#boss-}" | sed 's/-[0-9]*$//')"
    sufixo="${base##*-}"
    case "$tema" in
        avatar) destino_tema=avatar ;;
        caverna) destino_tema=caverna ;;
        scranton|office) destino_tema=office-us ;;
        springfield) destino_tema=springfield ;;
        vila) destino_tema=vila ;;
        esgoto) destino_tema=esgoto ;;
        *) echo "AVISO: tema desconhecido em $origem" >&2; continue ;;
    esac
    destino="$OUT/$destino_tema/bosses/$destino_tema-b$sufixo.webp"
    mkdir -p "$(dirname "$destino")"
    convert "$origem" -filter Lanczos -resize 512x512 -strip \
        -define webp:method=6 -quality 82 "$destino"
    echo "ok $destino"
done

# ---------- molduras (alfa por keying do fundo magenta) ----------
# A moldura é gerada com fundo magenta chapado; o keying remove o exterior.
# Em dois temas o gerador também PINTou o xadrez de transparência dentro do
# vão: ali um desfoque + floodfill do centro isola o miolo e ele vira alfa.
# (A lista é explícita: o flood às cegas comeria molduras de vão já vazio.)
MOLDURAS_XADREZ="vila esgoto"
for origem in "$SRC"/moldura-*.png; do
    [ -f "$origem" ] || continue
    base="$(basename "$origem" .png)"
    tema="$(printf '%s' "${base#moldura-}" | sed 's/-v[0-9]*$//')"
    case "$tema" in
        avatar) destino_tema=avatar ;;
        caverna) destino_tema=caverna ;;
        office|scranton) destino_tema=office-us ;;
        springfield) destino_tema=springfield ;;
        vila) destino_tema=vila ;;
        esgoto) destino_tema=esgoto ;;
        *) echo "AVISO: tema desconhecido em $origem" >&2; continue ;;
    esac
    destino="$OUT/$destino_tema/molduras/moldura-$destino_tema.webp"
    mkdir -p "$(dirname "$destino")"
    read -r larg altura < <(identify -format "%w %h\n" "$origem")
    tmp="$(mktemp -d)"
    convert "$origem" -alpha set -fuzz 18% -transparent '#ff00ff' \
        -fuzz 6% -transparent '#ff00ff' "$tmp/base.png"
    case " $MOLDURAS_XADREZ " in
        *" $tema "*)
            # sementes: o centro e, no esgoto, os bolsões atrás da corrente
            # (só entram sementes comprovadamente claras — uma semente no
            # metal alagaria a moldura inteira).
            sementes=" $((larg / 2)),$((altura / 2)) "
            if [ "$tema" = "esgoto" ]; then
                for pct in 40 50 60; do
                    sx=$((larg * pct / 100)); sy=$((altura * 14 / 100))
                    claro=$(convert "$origem" -crop 1x1+$sx+$sy +repage \
                        -format "%[fx:min(min(r,g),b)>0.78?1:0]" info:)
                    [ "$claro" = "1" ] && sementes="$sementes $sx,$sy "
                done
            fi
            desenho=""
            for p in $sementes; do desenho="$desenho color $p floodfill"; done
            convert "$origem" -blur 0x8 "$tmp/blur.png"
            convert "$tmp/blur.png" -fuzz 8% -fill '#ff0000' \
                -draw "$desenho" "$tmp/flood.png"
            convert "$tmp/flood.png" -fuzz 0% -fill white -opaque '#ff0000' \
                -fill black +opaque white "$tmp/vao.png"
            convert "$tmp/vao.png" -morphology Dilate Disk:12 -blur 0x2 "$tmp/vao-dil.png"
            # protege o que é escuro (corrente, contorno interno): a remoção
            # só vale para pixel claro — o xadrez é claro, a corrente não.
            convert "$origem" -colorspace gray -threshold 72% "$tmp/claro.png"
            convert "$tmp/vao-dil.png" "$tmp/claro.png" -compose Multiply -composite "$tmp/remover.png"
            convert "$tmp/remover.png" -negate "$tmp/keep.png"
            convert "$tmp/base.png" -alpha extract "$tmp/alfa.png"
            convert "$tmp/alfa.png" "$tmp/keep.png" -compose Multiply -composite "$tmp/alfa-ok.png"
            convert "$tmp/base.png" "$tmp/alfa-ok.png" -alpha off \
                -compose CopyOpacity -composite "$tmp/limpa.png"
            ;;
        *) cp "$tmp/base.png" "$tmp/limpa.png" ;;
    esac
    convert "$tmp/limpa.png" -filter Lanczos -resize 768x1376 -strip \
        -define webp:method=6 -quality 86 "$destino"
    rm -rf "$tmp"
    echo "ok $destino"
done

# ---------- provas (montagem por código, nunca arte gerada) ----------
prova_fila() { # <arquivo-saida> <altura> <arquivos...>
    local saida="$1" tam="$2"; shift 2
    local tmp; tmp=$(mktemp -d)
    local i=0
    for f in "$@"; do
        [ -f "$f" ] || continue
        i=$((i + 1))
        convert "$f" -filter Lanczos -resize "${tam}x${tam}" "$tmp/$(printf '%02d' "$i").png"
    done
    [ "$i" -gt 0 ] || { rm -rf "$tmp"; return; }
    montage -background '#15171c' -fill '#c9ccd4' -font DejaVu-Sans -pointsize 14 \
        -label '%t' "$tmp"/*.png -tile "${i}x1" -geometry "${tam}x${tam}+10+10" \
        -gravity center \
        -define webp:method=6 -quality 88 "$saida"
    rm -rf "$tmp"
}

for tam in 192 56 28; do
    prova_fila "$PROVAS/tmp-selos-$tam.webp" "$tam" \
        "$OUT"/avatar/temas/avatar.webp "$OUT"/caverna/temas/caverna.webp \
        "$OUT"/office-us/temas/office-us.webp "$OUT"/springfield/temas/springfield.webp \
        "$OUT"/vila/temas/vila.webp "$OUT"/esgoto/temas/esgoto.webp
done
convert "$PROVAS/tmp-selos-192.webp" "$PROVAS/tmp-selos-56.webp" "$PROVAS/tmp-selos-28.webp" \
    -background '#15171c' -gravity west -append \
    -define webp:method=6 -quality 88 "$PROVAS/leitura-selos.webp"

prova_fila "$PROVAS/leitura-patentes-avatar.webp" 192 "$OUT"/avatar/patentes/avatar-*.webp
prova_fila "$PROVAS/retratos-avatar.webp" 256 "$OUT"/avatar/bosses/avatar-b*.webp
prova_fila "$PROVAS/leitura-patentes-springfield.webp" 192 "$OUT"/springfield/patentes/springfield-*.webp

# Fundos: prova reduzida, com a mesma moldura escura de conferência (não é o card final)
tmpf=$(mktemp -d)
i=0
for f in "$OUT"/*/cards/*.webp; do
    [ -f "$f" ] || continue
    i=$((i + 1))
    convert "$f" -resize 384x384 "$tmpf/$(printf '%02d' "$i").png"
done
if [ "$i" -gt 0 ]; then
    montage -background '#15171c' -fill '#c9ccd4' -font DejaVu-Sans -pointsize 16 \
        -label '%t' "$tmpf"/*.png -tile "${i}x1" -geometry 384x384+14+14 -gravity center \
        -define webp:method=6 -quality 86 "$PROVAS/fundos-cards.webp"
fi
rm -rf "$tmpf" "$PROVAS"/tmp-selos-*.webp

echo "provas em $PROVAS"
