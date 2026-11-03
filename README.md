# Site do Coletivo Lufã

Site estático (HTML, CSS e JavaScript, sem build) publicado pelo GitHub Pages.

## Páginas

- `index.html`: início, com o projeto do coletivo e a lista de membros.
- `artigos.html`: lista de artigos. Com `?a=<slug>`, mostra um artigo.
- `publicar.html`: área dos membros, para publicar artigos e editar membros. O link fica no rodapé.
- O terceiro item do menu ("Em breve") está reservado em `assets/comum.js`.

## Onde ficam os dados

- `data/membros.json`: membros (nome, @, rede, função e foto).
- `data/artigos.json`: lista de artigos (título, autor, data e resumo).
- `artigos/<slug>.json`: texto completo de cada artigo.
- `membros/`: fotos enviadas pela área dos membros.

## Como funciona a publicação

A área dos membros grava os arquivos direto neste repositório pela API do GitHub.
Só consegue entrar quem tem uma chave (token) com permissão de escrita aqui.
Cada gravação no branch `main` dispara o workflow `.github/workflows/site.yml`, que republica o site em 1 a 2 minutos.

Para dar acesso a alguém:

1. Convide a pessoa para a organização Coletivo-Lufa ou adicione como colaboradora deste repositório.
2. Ela cria um token em https://github.com/settings/personal-access-tokens/new com
   acesso só a este repositório e permissão **Contents: Read and write**.
3. Ela cola o token na área dos membros.

## Testar no computador

```
python3 -m http.server 8000
```

Depois abra http://localhost:8000.

Se o repositório ou o branch principal mudarem de nome, atualize `LUFA` em `assets/comum.js`
e o branch em `.github/workflows/site.yml`.

Endereço: https://coletivo-lufa.github.io/coletivolufa/
