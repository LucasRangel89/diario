# Manutenção do site publicado

O app é uma PWA 100% local, mas o **site** que o entrega vive no GitHub Pages
(<https://lucasrangel89.github.io/diario/>, branch `main`). Este documento é o
manual de como tirar esse site do ar e como colocá-lo de volta, sem tocar no
código do app.

São **dois níveis independentes** — um não substitui o outro:

| Nível | O que muda | O que o visitante vê | Reversão |
| --- | --- | --- | --- |
| **1. Aviso de manutenção** | arquivo `MANUTENCAO` na raiz | a página `manutencao.html` (HTTP 200) | apagar o arquivo e publicar |
| **2. GitHub Pages desligado** | configuração do repositório | **404** imediato | religar o Pages pelo `gh api` |

O nível 1 protege contra o pior acidente: religar o Pages e o app voltar ao ar
sem ninguém perceber. O nível 2 é o corte imediato. Os dois juntos deixam o site
inacessível **e** o repositório "armado" para não republicar o app por engano.

---

## 1. Aviso de manutenção (arquivo `MANUTENCAO`)

Enquanto o arquivo `MANUTENCAO` existir na raiz, `scripts/build-site.sh` monta um
artefato em modo manutenção:

```
_site/index.html      <- manutencao.html
_site/404.html        <- manutencao.html (qualquer URL direta cai no aviso)
_site/robots.txt      <- Disallow: /  (nada de indexar uma página provisória)
_site/sw.js           <- scripts/manutencao-sw.js (versão de passagem)
_site/icon-192.png, icon-512.png, apple-touch-icon.png
```

Nada de `js/`, `images/`, `vendor/` ou do `index.html` do app: o app **não entra**
no artefato, então não existe caminho pelo qual ele seja publicado enquanto o
sinalizador estiver lá. O tamanho do artefato cai de ~22 MB para ~465 KB.

O mesmo script é usado pelo workflow `pages.yml` e pelo job `pages-artefato` da
CI, que valida `_site` com `node scripts/check-sw.js _site` — nos dois modos.

### O `sw.js` de manutenção

`scripts/manutencao-sw.js` é publicado **no lugar** do Service Worker do app. Ele
declara `VERSION` no formato `vNN` e `CORE = ['./']` (o contrato exigido por
`scripts/check-sw.js`), mas é o oposto do SW real:

- **não** pré-cacheia nada;
- **não** responde pelo cache (`fetch()` puro);
- **não** apaga os caches existentes do app.

A consequência importa: quem já tem o app instalado **não perde os dados**, e o
cache antigo não é usado para "ressuscitar" o app pela porta dos fundos. Quando o
site volta, o `sw.js` de verdade (com `VERSION` nova) reassume e repopula o CORE.

> Se algum dia o `VERSION` do `sw.js` e o do `scripts/manutencao-sw.js` divergirem,
> não há problema de funcionamento (o navegador compara bytes do arquivo, não a
> constante). Só mantenha o formato `vNN`.

### Página de aviso

`manutencao.html` é autossuficiente de propósito: CSS embutido, **zero** JS e
nenhuma referência a `/vendor`, `/js` ou `/images` — abre em rede ruim, sem
Service Worker e sem quebrar se o artefato for podado. Ela diz três coisas:

1. o site está fora do ar **provisoriamente**;
2. os dados de treino continuam gravados no aparelho do usuário (nunca em servidor);
3. a volta é curta e o app abre com tudo no lugar.

Leva `noindex, nofollow` e `robots.txt` com `Disallow: /` para não fixar uma
página provisória no Google.

---

## 2. Desligar o GitHub Pages (404 imediato)

```bash
# estado atual
gh api repos/LucasRangel89/diario/pages --jq '{status, html_url, build_type}'

# desligar
gh api -X DELETE repos/LucasRangel89/diario/pages

# conferir (espera 404)
curl -s -o /dev/null -w '%{http_code}\n' https://lucasrangel89.github.io/diario/
```

Efeitos colaterais conhecidos, todos reversíveis:

- A URL passa a responder **404** em alguns minutos (propagação do CDN).
- As configurações do Pages (origem `workflow`, `https_enforced`) são descartadas
  e voltam no `POST` de religamento (abaixo).
- O histórico de deployments e o ambiente `github-pages` continuam existindo.
- **Enquanto o Pages estiver desligado, todo push na `main` gera uma execução
  vermelha do workflow `Pages`**: ele falha em `actions/configure-pages`
  ("Get Pages site failed"), não no código. Para não acumular execuções
  vermelhas, desabilite o workflow enquanto durar a manutenção:

  ```bash
  gh workflow disable pages.yml
  ```

  Os demais workflows (`CI`) seguem normais e continuam sendo o gate dos PRs.

> **Ordem recomendada ao desligar:** primeiro apague o Pages, **depois** desabilite
> o workflow — assim o último deploy publicado é o da página de aviso, e quem
> estiver com a aba aberta ainda vê "em manutenção" antes do 404.

---

## 3. Quem já instalou o app

Nada a fazer, e vale entender o porquê:

- **Dados**: logs, treinos, histórico, jogo e Story Cards vivem no IndexedDB (com
  espelho no `localStorage`) do aparelho. Nada disso passa pelo site.
- **Sessão aberta**: o app já carregado continua funcionando até ser fechado —
  ele não depende de rede para registrar treino.
- **App instalado, aberto depois**: o Service Worker antigo usa rede-primeiro para
  os arquivos do app. Com o site em manutenção, a navegação baixa a página de
  aviso; com o Pages desligado (404), a resposta não é OK e o SW cai no cache —
  por isso é normal o app ainda abrir offline por um tempo no aparelho de quem já
  o tinha instalado. **Isso é esperado**: o app é local por decisão de projeto.
- **Quando o site volta**: a primeira navegação com rede busca o `index.html` novo,
  o SW percebe o `sw.js` alterado, instala a `VERSION` nova e repopula o CORE.

O que a manutenção **não** faz: apagar dados, revogar acesso de quem já tem o app
instalado, ou impedir o uso offline. Se algum dia for preciso revogar de verdade,
o caminho é trocar as chaves do repositório/Pages, não este sinalizador.

---

## 4. Religar o site (checklist)

```bash
# 1) tirar o modo manutenção
rm MANUTENCAO

# 2) religar o Pages (recria a origem a partir do workflow)
gh api -X POST repos/LucasRangel89/diario/pages -f build_type=workflow

# 3) reabilitar o workflow, se ele foi desabilitado
gh workflow enable pages.yml

# 4) publicar
git add -A && git commit -m "Religa o site"
git push origin main

# 5) conferir
gh run watch "$(gh run list --workflow=pages.yml --limit 1 --json databaseId --jq '.[0].databaseId')"
curl -s -o /dev/null -w '%{http_code}\n' https://lucasrangel89.github.io/diario/   # 200
```

Antes de religar, rode o que a CI roda — o site publicado é o mesmo artefato:

```bash
npm test
npm run check:sw-core
npm run check:sw
npm run check:docs
npm run check:modules
bash scripts/build-site.sh _site && node scripts/check-sw.js _site
```

E desfaça o aviso nos textos: a linha **App publicado** do `README.md` volta a
apontar para o site sem a ressalva de manutenção.

---

## 5. Estado atual

- **29/10/2026** — site colocado em manutenção: `MANUTENCAO` criado,
  `manutencao.html` e `scripts/manutencao-sw.js` adicionados, `scripts/build-site.sh`
  com modo manutenção, GitHub Pages **desligado** (404). O app no repositório não
  foi alterado — todos os testes seguem passando.
- Para religar: seção 4 deste documento.
