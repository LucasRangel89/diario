#!/usr/bin/env bash
# Monta o artefato publicado no GitHub Pages (pasta _site).
# Usado pelo workflow pages.yml e pela CI (que valida o MESMO artefato com check-sw.js),
# para que a lista de arquivos publicados não divirja entre os dois.
set -euo pipefail
OUT="${1:-_site}"
rm -rf "$OUT"
mkdir -p "$OUT"
cp -r index.html manifest.webmanifest sw.js "$OUT/"
cp -r icon-192.png icon-512.png apple-touch-icon.png "$OUT/"
cp -r js vendor images "$OUT/"
du -sh "$OUT"
