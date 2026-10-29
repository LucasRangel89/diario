#!/usr/bin/env bash
# Monta o artefato publicado no GitHub Pages (pasta _site).
# Usado pelo workflow pages.yml e pela CI (que valida o MESMO artefato com check-sw.js),
# para que a lista de arquivos publicados não divirja entre os dois.
#
# Modo manutenção: se existir o arquivo MANUTENCAO na raiz do repositório, o artefato
# passa a ser SÓ a página de aviso (manutencao.html + ícones + sw.js de passagem).
# O app não é copiado, então uma publicação acidental não coloca o app no ar.
# Ver docs/MANUTENCAO.md.
set -euo pipefail
OUT="${1:-_site}"
rm -rf "$OUT"
mkdir -p "$OUT"

if [ -f MANUTENCAO ]; then
    cp manutencao.html "$OUT/index.html"
    # Qualquer URL direta (ex.: /diario/js/app.js) cai no aviso em vez do 404 genérico.
    cp manutencao.html "$OUT/404.html"
    printf 'User-agent: *\nDisallow: /\n' > "$OUT/robots.txt"
    cp -r icon-192.png icon-512.png apple-touch-icon.png "$OUT/"
    cp scripts/manutencao-sw.js "$OUT/sw.js"
    echo "⚠️  MANUTENÇÃO: _site publica apenas manutencao.html (o app fica de fora)."
    du -sh "$OUT"
    exit 0
fi

cp -r index.html manifest.webmanifest sw.js "$OUT/"
cp -r icon-192.png icon-512.png apple-touch-icon.png "$OUT/"
cp -r js vendor images "$OUT/"
du -sh "$OUT"
