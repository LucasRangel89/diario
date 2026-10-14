#!/usr/bin/env bash
# ============================================================
# SCREENSHOTS DO MANIFEST (PWA)
# ------------------------------------------------------------
# Compõe as duas capturas declaradas no manifest.webmanifest
# (1080x1920 e 1920x1080) usando SÓ as artes que já existem no
# repo: fundo de card do tema, retratos de chefão e emblema de
# patente. Nada de arte nova, nada de navegador.
#   uso: bash scripts/make-screenshots.sh
# ============================================================
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p images/screens
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

CARD=images/cards/classico.webp
EMBLEMA=images/patentes/classico-07.webp

# cartão de chefão: retrato + faixa de título, como na grade do app
boss_card() { # $1=src $2=tamanho $3=destino
    convert "$1" -resize "$2x$2" -bordercolor '#3f3f46' -border 4 \
        -background '#0b0b0d' -fill '#fca5a5' -font DejaVu-Sans-Bold -pointsize 22 \
        -splice 0x36 -gravity north -annotate +0+7 'CHEFÃO' "$3"
}
boss_card images/bosses/golem-anilhas.webp  400 "$TMP/b1.png"
boss_card images/bosses/hidra-titanio.webp  400 "$TMP/b2.png"
boss_card images/bosses/mecagorila.webp     400 "$TMP/b3.png"
boss_card images/bosses/behemoth.webp       400 "$TMP/b4.png"
boss_card images/bosses/cavaleiro-de-ferro.webp 400 "$TMP/b5.png"
boss_card images/bosses/dragao-de-aco.webp  400 "$TMP/b6.png"

# ============================ RETRATO 1080x1920 ============================
convert -size 1080x1920 gradient:'#260707'-'#08080a' \
    \( "$CARD" -resize 1080x1920^ -gravity center -extent 1080x1920 -modulate 55,70 \) -compose over -composite \
    \( -size 1080x1920 xc:'#00000088' \) -compose over -composite \
    -gravity northwest \
    -fill '#121216cc' -stroke '#dc262666' -strokewidth 3 -draw "roundrectangle 60,120 1020,430 28,28" \
    -stroke none -font DejaVu-Sans-Bold -fill white -pointsize 64 -annotate +100+255 'DIÁRIO DE CARGAS' \
    -font DejaVu-Sans-Bold -fill '#ef4444' -pointsize 32 -annotate +102+330 'BERZERKER MODE · ARENA DE CHEFÃO' \
    \( "$EMBLEMA" -resize 170x170 \) -geometry +830+150 -composite \
    -fill '#121216cc' -stroke none -draw "roundrectangle 60,480 1020,1860 28,28" \
    \( "$TMP/b1.png" \) -geometry +110+550 -composite \
    \( "$TMP/b2.png" \) -geometry +562+550 -composite \
    \( "$TMP/b3.png" \) -geometry +110+1010 -composite \
    \( "$TMP/b4.png" \) -geometry +562+1010 -composite \
    -fill '#3f3f46' -stroke none -draw "roundrectangle 110,1500 970,1540 20,20" \
    -fill '#dc2626' -draw "roundrectangle 110,1500 700,1540 20,20" \
    -font DejaVu-Sans -fill '#9ca3af' -pointsize 34 -annotate +110+1630 'HP DO CHEFÃO ATIVO · 68% RESTANTE' \
    -pointsize 34 -annotate +110+1710 '1 kg movido = 1 DMG · fraqueza x1,25 · PR = crítico x2' \
    -pointsize 34 -annotate +110+1790 '10 temas · 120 chefões · 100 patentes · offline' \
    -quality 82 images/screens/screenshot-portrait-1080x1920.webp

# ============================ PAISAGEM 1920x1080 ============================
convert -size 1920x1080 gradient:'#260707'-'#08080a' \
    \( "$CARD" -resize 1920x1080^ -gravity center -extent 1920x1080 -modulate 55,70 \) -compose over -composite \
    \( -size 1920x1080 xc:'#00000088' \) -compose over -composite \
    -gravity northwest \
    -fill '#121216cc' -stroke '#dc262666' -strokewidth 3 -draw "roundrectangle 60,80 900,1000 28,28" \
    -stroke none -font DejaVu-Sans-Bold -fill white -pointsize 52 -annotate +110+230 'DIÁRIO DE CARGAS' \
    -font DejaVu-Sans-Bold -fill '#ef4444' -pointsize 34 -annotate +112+300 'BERZERKER MODE' \
    -font DejaVu-Sans -fill '#9ca3af' -pointsize 30 -annotate +112+400 'Diário de treino 100% local e offline:' \
    -pointsize 30 -annotate +112+452 'volume, 1RM, PRs e progresso por grupo.' \
    -pointsize 30 -annotate +112+520 'Gamificação completa: 10 temas, 120 chefões,' \
    -pointsize 30 -annotate +112+572 '100 patentes, missões e temporadas.' \
    \( "$EMBLEMA" -resize 160x160 \) -geometry +680+110 -composite \
    -fill '#3f3f46' -stroke none -draw "roundrectangle 112,720 850,760 20,20" \
    -fill '#dc2626' -draw "roundrectangle 112,720 610,760 20,20" \
    -font DejaVu-Sans -fill '#9ca3af' -pointsize 32 -annotate +112+840 'HP DO CHEFÃO · 68% RESTANTE' \
    -pointsize 32 -annotate +112+910 'Cada kg movido vira dano no chefão do tema.' \
    \( "$TMP/b5.png" \) -geometry +960+90 -composite \
    \( "$TMP/b6.png" \) -geometry +1420+90 -composite \
    \( "$TMP/b1.png" \) -geometry +960+560 -composite \
    \( "$TMP/b3.png" \) -geometry +1420+560 -composite \
    -quality 82 images/screens/screenshot-landscape-1920x1080.webp

identify images/screens/*.webp
ls -la images/screens/
