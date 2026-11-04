# Instruções para este repositório (site do Coletivo Lufã)

O funcionamento do site está no `README.md`. Este arquivo guarda combinados com o autor (Léo Duarte) que valem para qualquer sessão.

## Seção "Duda": usa a base de motion graphics do vídeo "O que é o comunismo?"

Tudo o que for feito para a **seção Duda** (vídeos, vinhetas, animações e peças em movimento) usa a **mesma base de estilo de motion
graphics** do EP. 1 de *Desmistificando o Comunismo* ("O que é o comunismo?"). O vídeo de referência está neste repositório em
`formacao/videos/desmistificando-ep01.mp4` (1:37), e a capa em `formacao/capas/desmistificando-ep01.jpg`.

Antes de criar qualquer peça da seção Duda, assista esse vídeo e siga o padrão abaixo.

### Onde está a base (código e regras)
Tudo está no repositório dos vídeos, **`leoduartesouzabrasil-cell/meu-reposit-rio`**, branch **`claude/serie-comunismo`**:
- `identidade/IDENTIDADE.md`: o guia completo da identidade "Construtivismo Tropical" (paleta, fontes, composição, movimento, o que não fazer).
- `motor/lib.js`: a biblioteca de animação (objeto `CT`): carimbo, corte diagonal, raios de sol, datilografia + seleção, moldura, foto P&B, etiquetas, legenda, papel com grão e a vinheta da série (`vinhetaComunismo`).
- `motor/cenas/comunismo-01.js`: a cena do EP. 1 inteira (modelo a copiar).
- `motor/cenas/serie-comunismo-logo.js`: a vinheta (3,5 s).
- `audio/comunismo-01/` (`previa.py`, `montar.py`, `juntar.sh`) e `audio/serie-comunismo/vinheta.py`: trilha, montagem da narração e da legenda, e a música da vinheta.
- `motor/render.js` (render em MP4) e `ferramentas/stills.js` (quadros para conferir).
- `CLAUDE.md` daquele repositório: o fluxo de produção de cada vídeo e as preferências do autor.

### O estilo, em resumo
- **Formato:** 1080×1920, 30 fps.
- **Dois registros alternados:**
  - **ARQUIVO** (cerca de 70%): fundo bege de papel, fotos e imagens de época em moldura dourada, em P&B, com crédito logo abaixo; fichas datilografadas com seleção em vermelho.
  - **CARTAZ** (cerca de 30%, nos picos): fundo vermelho com raios de sol nascente, palavras carimbadas.
- **Cores:**

  | Cor | Hex | Uso |
  |---|---|---|
  | bege | `#EDE0C4` | base |
  | vermelho | `#C8201E` | destaque |
  | amarelo | `#EBB52A` | destaque |
  | tinta | `#1C1714` | texto e contornos |
  | azul | `#1F3A5F` | só como contraponto |

- **Fontes:**
  - Big Shoulders Display (manchete)
  - Russo One (palavra-bloco)
  - Oswald (chamadas curtas)
  - Special Elite (datilografia e créditos)
  - Instrument Serif itálica (legenda e citações)
  - Archivo 700 (rótulos)
- **Movimento:**
  - Corte diagonal entre cenas.
  - Carimbo com tremor curto e flash amarelo nos impactos.
  - Datilografia, seleção de texto e foco entrando.
  - Etiquetas surgindo.
  - Explicações didáticas em **2D**, com bonecos de cartaz, mapas e contadores, e nunca em 3D.
- **Sempre ligado:** papel com grão "fervendo", vinheta escura nas bordas e varredura de TV nas cenas de arquivo.
- **Diagramação:**
  - Título em y 330 e fonte dos dados em y 384.
  - Conteúdo entre y 420 e 1420.
  - **Legenda** palavra por palavra numa tarja escura do tamanho da frase, com filete vermelho à esquerda e texto bege de 48 px (y 1466–1542).
- **Trechos de vídeo de terceiros:** entram numa moldura, nunca em tela cheia, com a legenda original cortada, a nossa legenda e o crédito embaixo.
- **Som:** rock sintetizado com a banda completa (bateria com viradas, baixo, duas guitarras, guitarra solo, sintetizador). A banda bate junto em cada carimbo. A voz sempre manda: a trilha fica cerca de 22 dB abaixo dela. Volume final perto de -14 LUFS.
- **Fim:** todo vídeo termina com o logo O Camarada e os créditos de fotos e fontes.
- **Fatos:** sempre conferidos em duas fontes, ou numa fonte primária; as imagens são de uso livre e vêm com crédito.
