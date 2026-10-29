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
    # Sem index.html DE PROPÓSITO: sem ponto de entrada, TODA URL do site responde
    # 404 (com o aviso como 404 personalizado). É o mais perto de "fora do ar" que
    # dá para fazer pelo artefato — desligar a configuração do Pages exige permissão
    # de admin que o token do agente não tem (404/403 no DELETE). Ver docs/MANUTENCAO.md.
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
