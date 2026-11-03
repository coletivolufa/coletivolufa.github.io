# Site do Coletivo Lufã

Site estático (HTML, CSS e JavaScript, sem build) publicado pelo GitHub Pages.

## Páginas

- `index.html`: início, com o projeto do coletivo e a lista de membros.
- `artigos.html`: lista de artigos. Com `?a=<slug>`, mostra um artigo.
- `formacao.html` + `assets/formacao.js`: Formação para Novos Militantes, com séries de vídeo em `data/formacao.json` (vídeos por link do YouTube/Instagram ou arquivo em `formacao/videos/`). Episódios se publicam pela aba Formação da área dos membros.
- `identidade/`: guia de identidade visual dos posts (`index.html`) e gerador de posts em PNG (`gerador.html`, modelos em `posts.js`).
- `carteirinha.html` + `assets/carteirinha.js`: carteirinha de membro (arte em `carteirinha/`). A matrícula vem de `matricula` em `data/membros.json`: "001" + ordem de entrada; novos membros recebem o próximo número pela área dos membros.
- `publicar.html`: área dos membros, para publicar artigos e editar membros. O link fica no rodapé.
- `biblioteca.html` + `assets/biblioteca.js`: Biblioteca dos Camaradas, com estantes, busca e ficha de cada livro. Links diretos: `biblioteca.html#estante=poesia` e `biblioteca.html#livro=dom-casmurro`.

## Onde ficam os dados

- `data/membros.json`: membros (nome, @, rede, função e foto).
- `data/biblioteca.json`: estantes, biografias dos autores e livros (estantes, título, autor, ano, link, fonte, resumo, idioma e destaque).
- `data/artigos.json`: lista de artigos (título, autor, data e resumo).
- `artigos/<slug>.json`: texto completo de cada artigo.
- `membros/`: fotos enviadas pela área dos membros.

## Como funciona a publicação

A área dos membros grava os arquivos direto neste repositório pela API do GitHub.
Só consegue entrar quem tem uma chave (token) com permissão de escrita aqui.
Cada gravação no branch `main` dispara o workflow `.github/workflows/site.yml`, que republica o site em 1 a 2 minutos.

Para dar acesso a alguém:

1. Convide a pessoa para a organização coletivolufa ou adicione como colaboradora deste repositório.
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

Endereço: https://coletivolufa.github.io/
