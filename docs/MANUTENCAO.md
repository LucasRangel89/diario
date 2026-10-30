# Manutenção do site publicado

O app é uma PWA 100% local, mas o **site** que o entrega vive no GitHub Pages
(<https://lucasrangel89.github.io/diario/>, branch `main`). Este documento é o
manual de como tirar esse site do ar e como colocá-lo de volta, sem tocar no
código do app.

> **Estado em 30/10/2026: o site está NO AR.** O modo manutenção (nível 1) foi
> usado entre 29/10 e 30/10/2026 e depois desligado; o nível 2 nunca foi aplicado,
> então o GitHub Pages também está publicando normalmente. Ver §5.

São **dois níveis independentes** — o primeiro está no código e é reversível por
commit; o segundo é configuração do repositório e exige permissão de admin:

| Nível | O que muda | O que o visitante vê | Reversão |
| --- | --- | --- | --- |
| **1. Site fora do ar** (desligado) | arquivo `MANUTENCAO` na raiz | **404** em toda URL, com a página de aviso | apagar o arquivo e publicar |
| **2. GitHub Pages desligado** (nunca usado) | configuração do repositório | 404 imediato, sem deploy nenhum | religar o Pages |

O nível 1 já deixa o app inacessível: sem `index.html` no artefato, não existe
ponto de entrada. O nível 2 é o desligamento de fato — para quando não se quer
nem a página de aviso no ar. Ver §2 para o motivo de ele ficar pendente.

---

## 1. Site fora do ar (arquivo `MANUTENCAO`)

Enquanto o arquivo `MANUTENCAO` existir na raiz, `scripts/build-site.sh` monta um
artefato em modo manutenção:

```
_site/404.html        <- manutencao.html (página de aviso)
_site/robots.txt      <- Disallow: /
_site/sw.js           <- scripts/manutencao-sw.js (versão de passagem)
_site/icon-192.png, icon-512.png, apple-touch-icon.png
```

**Não há `index.html` — de propósito.** Sem ponto de entrada, o GitHub Pages
responde **404 em todas as URLs** (`/`, `/index.html`, `/js/app.js`, qualquer
caminho), e o visitante vê a página de aviso como 404 personalizado. `js/`,
`images/` e `vendor/` nem entram no artefato, então não há como o app ser
publicado por acidente enquanto o sinalizador estiver lá. O artefato cai de
~22 MB para ~453 KB.

O mesmo script é usado pelo workflow `pages.yml` e pelo job `pages-artefato` da
CI, que validam `_site` com `node scripts/check-sw.js _site` — nos dois modos.

### O `sw.js` de manutenção

`scripts/manutencao-sw.js` é publicado **no lugar** do Service Worker do app. Ele
declara `VERSION` no formato `vNN` e `CORE = ['./404.html']` (o único arquivo
publicado, exigido pelo contrato de `scripts/check-sw.js`), mas é o oposto do SW
real:

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

## 2. Desligar o GitHub Pages — **pendente**

Desligar o Pages de verdade é uma chamada de admin:

```bash
gh api -X DELETE repos/LucasRangel89/diario/pages          # unpublish
gh workflow disable pages.yml                              # opcional
```

**O token do agente não tem essa permissão.** As três chamadas de configuração
(`DELETE …/pages`, `PUT …/pages` e `…/actions/workflows/pages.yml/disable`)
devolvem **403 `Resource not accessible by integration`**: a integração tem
permissão de conteúdo, PR e merge, não de Pages/Actions. Nada disso é erro de
código — é escopo de credencial.

Dois caminhos, escolhendo um:

1. **Botão do dono (30 s).** GitHub → repositório → **Settings → Pages →
   Unpublish**. A URL passa a devolver 404 da plataforma e nenhum deploy roda mais.
2. **Deixar como está.** O nível 1 já devolve 404 em todas as URLs; a diferença é
   que o `pages.yml` continua publicando o artefato de manutenção a cada push na
   `main` (o que mantém o 404 no ar e não gera execução vermelha).

Se o dono fizer o *Unpublish*, a volta (§4) precisa recriar o site antes de
publicar:

```bash
gh api -X POST repos/LucasRangel89/diario/pages -f build_type=workflow
gh workflow enable pages.yml     # se tiver sido desabilitado
```

> Token com permissão de Pages (ou o `gh` autenticado pelo dono) faz o §2 inteiro
> em um comando. Nada de credencial passa por este repositório.

---

## 3. Quem já instalou o app

Nada a fazer, e vale entender o porquê:

- **Dados**: logs, treinos, histórico, jogo e Story Cards vivem no IndexedDB (com
  espelho no `localStorage`) do aparelho. Nada disso passa pelo site.
- **Sessão aberta**: o app já carregado continua funcionando até ser fechado —
  ele não depende de rede para registrar treino.
- **App instalado, aberto depois**: o Service Worker antigo usa rede-primeiro para
  os arquivos do app. Com o site em 404, a resposta não é OK e o SW cai no cache —
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

# 2) publicar
git add -A && git commit -m "Religa o site"
git push origin main

# 3) só se o Pages tiver sido despublikado à mão (§2)
gh api -X POST repos/LucasRangel89/diario/pages -f build_type=workflow
gh workflow enable pages.yml

# 4) conferir
gh run watch "$(gh run list --workflow=pages.yml --limit 1 --json databaseId --jq '.[0].databaseId')"
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

> **Executado em 30/10/2026** para o religamento: `MANUTENCAO` removido, `README.md`
> e este documento atualizados, `pages.yml` disparado pelo merge na `main`. O Pages
> nunca foi despublikado, então o passo 3 do checklist não foi necessário. O merge
> é o que publica — enquanto a mudança estiver só num branch, o site continua em
> manutenção.

---

## 5. Estado atual

- **29/10/2026** — nível 1 ativo e publicado (PR #37): `MANUTENCAO` criado,
  `manutencao.html` e `scripts/manutencao-sw.js` adicionados, `scripts/build-site.sh`
  com modo manutenção **sem `index.html`** → todas as URLs do site respondem 404
  com o aviso. Nível 2 **pendente**: o token do agente recebe 403 em
  `DELETE/PUT /pages` e em `disable` de workflow (§2). O app no repositório não foi
  alterado — todos os testes seguem passando.
- **30/10/2026 — site religado.** O `MANUTENCAO` da raiz foi apagado, então
  `scripts/build-site.sh` voltou ao modo normal: o artefato passa a ter `index.html`,
  `js/`, `images/` e `vendor/` de novo, e o `sw.js` publicado volta a ser o do app
  (`v77`, com pré-cache do CORE) no lugar do `scripts/manutencao-sw.js` (`v76`).
  Quem já tinha o app instalado não perde nada: como o conteúdo de `/sw.js` muda, o
  navegador instala o SW real na primeira visita com rede e repopula o cache offline.
  Os arquivos de manutenção (`manutencao.html`, `scripts/manutencao-sw.js` e o modo
  do `build-site.sh`) **continuam no repositório**, prontos para o próximo desligamento —
  para tirar o site do ar de novo basta recriar o `MANUTENCAO`.
- Para religar: seção 4 deste documento.
