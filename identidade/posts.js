/* Identidade visual dos posts do Coletivo Lufã: desenha cada modelo num <canvas>.
   Prima d'O Camarada: mesma família de cartaz soviético, com as cores e a pomba do coletivo. */

const COR = {
  vermelho: "#cc2220", vermelhoEsc: "#9e1715", amarelo: "#eab426",
  papel: "#fbf6ec", branco: "#ffffff", preto: "#1e1916", cinza: "#6b625c",
};
const FONTE = { titulo: "Bebas Neue", texto: "Archivo", citacao: "Literata" };
const ARROBA = "@coletivolufa";

const LOGO = new Image();
LOGO.src = new URL("../assets/img/logo.png", document.currentScript.src).href;

async function prepararFontes() {
  await Promise.all([
    document.fonts.load(`400 100px "${FONTE.titulo}"`),
    document.fonts.load(`400 40px "${FONTE.texto}"`),
    document.fonts.load(`700 40px "${FONTE.texto}"`),
    document.fonts.load(`italic 400 60px "${FONTE.citacao}"`),
    LOGO.decode().catch(() => {}),
  ]);
}

// ---------- utilidades de desenho ----------
function fonte(ctx, tam, fam = FONTE.titulo, peso = "400", estilo = "normal") {
  ctx.font = `${estilo} ${peso} ${tam}px "${fam}"`;
}
function quebrar(ctx, texto, largura) {
  const linhas = [];
  for (const par of String(texto).split("\n")) {
    const palavras = par.split(/\s+/).filter(Boolean);
    let linha = "";
    for (const p of palavras) {
      const teste = linha ? linha + " " + p : p;
      if (ctx.measureText(teste.replace(/\*/g, "")).width > largura && linha) { linhas.push(linha); linha = p; }
      else linha = teste;
    }
    linhas.push(linha);
  }
  return linhas;
}
// encontra o maior tamanho de fonte em que o texto cabe na caixa
function caber(ctx, texto, largura, altura, max, min, alturaLinha, fam, peso, estilo) {
  for (let t = max; t >= min; t -= 2) {
    fonte(ctx, t, fam, peso, estilo);
    const l = quebrar(ctx, texto, largura);
    if (l.length * t * alturaLinha <= altura) return { tam: t, linhas: l };
  }
  fonte(ctx, min, fam, peso, estilo);
  return { tam: min, linhas: quebrar(ctx, texto, largura) };
}
// escreve uma linha em que *palavras entre asteriscos* saem na cor de destaque
function linhaDestacada(ctx, linha, x, y, cor, corDestaque, alinhar = "left") {
  const partes = linha.split(/(\*[^*]+\*)/).filter(Boolean);
  const total = partes.reduce((s, p) => s + ctx.measureText(p.replace(/\*/g, "")).width, 0);
  let cx = alinhar === "center" ? x - total / 2 : x;
  ctx.textAlign = "left";
  for (const p of partes) {
    const d = p.startsWith("*") && p.endsWith("*");
    const t = p.replace(/\*/g, "");
    ctx.fillStyle = d ? corDestaque : cor;
    ctx.fillText(t, cx, y);
    cx += ctx.measureText(t).width;
  }
}
function raios(ctx, cx, cy, n, cor, giro = 0) {
  ctx.save(); ctx.fillStyle = cor;
  const R = 4000;
  for (let i = 0; i < n; i++) {
    const a0 = giro + (i * 2 * Math.PI) / n, a1 = a0 + Math.PI / n;
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + R * Math.cos(a0), cy + R * Math.sin(a0));
    ctx.lineTo(cx + R * Math.cos(a1), cy + R * Math.sin(a1));
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
function estrela(ctx, cx, cy, r, cor) {
  ctx.save(); ctx.fillStyle = cor; ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.42 : r, a = -Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a));
  }
  ctx.closePath(); ctx.fill(); ctx.restore();
}
function logo(ctx, cx, cy, d, anel = COR.amarelo, sombra = true) {
  if (sombra) { ctx.fillStyle = "rgba(30,25,22,.85)"; ctx.beginPath(); ctx.arc(cx + d * 0.04, cy + d * 0.05, d / 2 + d * 0.04, 0, 7); ctx.fill(); }
  if (anel) { ctx.fillStyle = anel; ctx.beginPath(); ctx.arc(cx, cy, d / 2 + d * 0.04, 0, 7); ctx.fill(); }
  if (LOGO.complete && LOGO.naturalWidth) ctx.drawImage(LOGO, cx - d / 2, cy - d / 2, d, d);
}
function etiqueta(ctx, texto, x, y, tam, fundo, corTexto, alinhar = "left") {
  fonte(ctx, tam); const w = ctx.measureText(texto).width + tam * 0.7, h = tam * 1.18;
  const x0 = alinhar === "center" ? x - w / 2 : x;
  ctx.fillStyle = fundo; ctx.fillRect(x0, y - h * 0.8, w, h);
  ctx.fillStyle = corTexto; ctx.textAlign = "left"; ctx.fillText(texto, x0 + tam * 0.35, y + tam * 0.06);
  return w;
}
function faixa(ctx, y, altura, angulo, cor, texto, corTexto, W) {
  ctx.save(); ctx.translate(W / 2, y); ctx.rotate((angulo * Math.PI) / 180);
  ctx.fillStyle = "rgba(30,25,22,.9)"; ctx.fillRect(-W, altura / 2, W * 2, 10);
  ctx.fillStyle = cor; ctx.fillRect(-W, -altura / 2, W * 2, altura);
  if (texto) {
    fonte(ctx, altura * 0.62); ctx.fillStyle = corTexto; ctx.textAlign = "center";
    const unidade = `${texto}   ★   `; let linha = "";
    while (ctx.measureText(linha).width < W * 2.2) linha += unidade;
    ctx.fillText(linha, 0, altura * 0.22);
  }
  ctx.restore();
}
// grão de papel impresso (mesmo acabamento d'O Camarada, mais leve)
let PADRAO_GRAO = null;
function grao(ctx, W, H, forca = 0.06) {
  if (!PADRAO_GRAO) {
    const c = document.createElement("canvas"); c.width = c.height = 256;
    const g = c.getContext("2d"), d = g.createImageData(256, 256);
    for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    g.putImageData(d, 0, 0); PADRAO_GRAO = c;
  }
  ctx.save(); ctx.globalAlpha = forca; ctx.globalCompositeOperation = "overlay";
  ctx.fillStyle = ctx.createPattern(PADRAO_GRAO, "repeat"); ctx.fillRect(0, 0, W, H); ctx.restore();
}
function vinheta(ctx, W, H, forca = 0.35) {
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, `rgba(0,0,0,${forca})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function assinatura(ctx, x, y, cor, tam = 40) {
  logo(ctx, x + tam * 0.75, y - tam * 0.35, tam * 1.5, null, false);
  fonte(ctx, tam); ctx.fillStyle = cor; ctx.textAlign = "left";
  ctx.fillText("COLETIVO LUFÃ", x + tam * 1.8, y);
}
function imagemCobrindo(ctx, img, x, y, w, h, ancora = "centro") {
  const e = Math.max(w / img.width, h / img.height), iw = img.width * e, ih = img.height * e;
  const ix = x + (w - iw) / 2, iy = ancora === "baixo" ? y + h - ih : y + (h - ih) / 2;
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.drawImage(img, ix, iy, iw, ih); ctx.restore();
}

// ---------- MODELOS ----------
const MODELOS = {
  // 1) Frase / citação — feed 1080×1350
  citacao: {
    nome: "Frase e citação", w: 1080, h: 1350,
    campos: [
      { id: "texto", rotulo: "Frase", tipo: "area", padrao: "A história de todas as sociedades até hoje existentes é a história da luta de classes." },
      { id: "autor", rotulo: "Autor(a)", padrao: "Karl Marx e Friedrich Engels" },
      { id: "fonte", rotulo: "Obra ou fonte (opcional)", padrao: "Manifesto do Partido Comunista, 1848" },
      { id: "fundo", rotulo: "Fundo", tipo: "opcoes", opcoes: { vermelho: "Vermelho", claro: "Papel claro", preto: "Preto" }, padrao: "vermelho" },
    ],
    desenhar(ctx, v) {
      const W = 1080, H = 1350;
      const tema = { vermelho: [COR.vermelho, COR.branco, COR.amarelo, "rgba(255,255,255,.06)"], claro: [COR.papel, COR.preto, COR.vermelho, "rgba(204,34,32,.06)"], preto: [COR.preto, COR.papel, COR.amarelo, "rgba(234,180,38,.06)"] }[v.fundo];
      ctx.fillStyle = tema[0]; ctx.fillRect(0, 0, W, H);
      raios(ctx, W * 0.5, H * 1.05, 26, tema[3], -0.1);
      assinatura(ctx, 90, 130, tema[2], 40);
      fonte(ctx, 330, FONTE.citacao, "400", "italic"); ctx.fillStyle = tema[2]; ctx.textAlign = "left"; ctx.fillText("“", 70, 430);
      const temAutor = !!v.autor.trim();
      const caixaH = temAutor ? 560 : 700;
      const r = caber(ctx, v.texto, 900, caixaH, 96, 44, 1.32, FONTE.citacao, "400", "italic");
      const y0 = 420 + (caixaH - r.linhas.length * r.tam * 1.32) / 2 + r.tam;
      r.linhas.forEach((l, i) => linhaDestacada(ctx, l, 90, y0 + i * r.tam * 1.32, tema[1], tema[2]));
      if (temAutor) {
        const ya = 420 + caixaH + 60;
        ctx.fillStyle = tema[2]; ctx.fillRect(90, ya - 22, 70, 7);
        fonte(ctx, 54); ctx.fillStyle = tema[2]; ctx.fillText(v.autor.toUpperCase(), 180, ya);
        if (v.fonte.trim()) { fonte(ctx, 30, FONTE.texto); ctx.fillStyle = tema[1]; ctx.globalAlpha = 0.8; ctx.fillText(v.fonte, 180, ya + 46); ctx.globalAlpha = 1; }
      }
      faixa(ctx, 1235, 84, -3, v.fundo === "claro" ? COR.vermelho : COR.amarelo, ARROBA.toUpperCase(), v.fundo === "claro" ? COR.branco : COR.preto, W);
      grao(ctx, W, H);
    },
  },

  // 2) Carrossel — capa, slides e fechamento, 1080×1350
  carrosselCapa: {
    nome: "Carrossel · capa", w: 1080, h: 1350, grupo: "carrossel",
    campos: [
      { id: "tema", rotulo: "Etiqueta do tema", padrao: "ENTENDA EM 5 PONTOS" },
      { id: "titulo", rotulo: "Título (use *asteriscos* para destacar em amarelo)", tipo: "area", padrao: "O que é a *mais-valia*?" },
      { id: "sub", rotulo: "Subtítulo (opcional)", padrao: "E por que o seu salário nunca paga todo o seu trabalho." },
      { id: "imagem", rotulo: "Imagem (opcional, fica no fundo)", tipo: "imagem" },
    ],
    desenhar(ctx, v) {
      const W = 1080, H = 1350;
      ctx.fillStyle = COR.vermelho; ctx.fillRect(0, 0, W, H);
      if (v.imagem) {
        imagemCobrindo(ctx, v.imagem, 0, 0, W, H);
        ctx.fillStyle = "rgba(158,23,21,.78)"; ctx.fillRect(0, 0, W, H);
      }
      raios(ctx, W * 0.82, H * 0.18, 22, "rgba(255,255,255,.07)", 0.2);
      assinatura(ctx, 90, 130, COR.branco, 40);
      etiqueta(ctx, v.tema.toUpperCase(), 90, 330, 46, COR.amarelo, COR.preto);
      const r = caber(ctx, v.titulo.toUpperCase(), 900, 560, 230, 90, 0.92, FONTE.titulo);
      r.linhas.forEach((l, i) => linhaDestacada(ctx, l, 90, 420 + r.tam * 0.8 + i * r.tam * 0.92, COR.branco, COR.amarelo));
      const yFim = 420 + r.tam * 0.8 + (r.linhas.length - 1) * r.tam * 0.92;
      if (v.sub.trim()) {
        fonte(ctx, 40, FONTE.texto); ctx.fillStyle = COR.papel;
        quebrar(ctx, v.sub, 860).slice(0, 3).forEach((l, i) => ctx.fillText(l, 90, yFim + 90 + i * 54));
      }
      ctx.fillStyle = COR.preto; ctx.fillRect(0, H - 150, W, 150);
      ctx.fillStyle = COR.amarelo; ctx.fillRect(0, H - 158, W, 8);
      fonte(ctx, 52); ctx.fillStyle = COR.amarelo; ctx.textAlign = "left"; ctx.fillText("ARRASTE PARA O LADO  →", 90, H - 58);
      fonte(ctx, 40); ctx.fillStyle = COR.papel; ctx.textAlign = "right"; ctx.fillText(ARROBA, W - 90, H - 60);
      grao(ctx, W, H);
    },
  },
  carrosselSlide: {
    nome: "Carrossel · slide de conteúdo", w: 1080, h: 1350, grupo: "carrossel",
    campos: [
      { id: "numero", rotulo: "Número grande (opcional)", padrao: "01" },
      { id: "titulo", rotulo: "Título do slide", padrao: "O trabalhador produz mais do que recebe" },
      { id: "texto", rotulo: "Texto (até uns 450 caracteres)", tipo: "area", padrao: "Numa jornada de 8 horas, em poucas horas o trabalhador já produziu o valor equivalente ao seu salário. O resto do dia é trabalho não pago, que vira lucro do patrão.\n\nÉ isso que Marx chamou de mais-valia." },
      { id: "pagina", rotulo: "Página (ex.: 2/6)", padrao: "2/6" },
      { id: "fundo", rotulo: "Fundo", tipo: "opcoes", opcoes: { claro: "Papel claro", vermelho: "Vermelho" }, padrao: "claro" },
    ],
    desenhar(ctx, v) {
      const W = 1080, H = 1350, claro = v.fundo !== "vermelho";
      const [fundo, corTxt, corTit, corNum] = claro ? [COR.papel, COR.preto, COR.vermelho, COR.amarelo] : [COR.vermelho, COR.branco, COR.amarelo, COR.amarelo];
      ctx.fillStyle = fundo; ctx.fillRect(0, 0, W, H);
      assinatura(ctx, 90, 120, claro ? COR.vermelho : COR.branco, 34);
      fonte(ctx, 40); ctx.fillStyle = claro ? COR.cinza : COR.papel; ctx.textAlign = "right"; ctx.fillText(v.pagina, W - 90, 120);
      let y = 230;
      if (v.numero.trim()) {
        fonte(ctx, 230); ctx.textAlign = "left"; ctx.lineWidth = 5; ctx.strokeStyle = COR.preto;
        ctx.fillStyle = corNum; ctx.fillText(v.numero, 84, y + 190); ctx.strokeText(v.numero, 84, y + 190);
        y += 250;
      } else y += 40;
      const rt = caber(ctx, v.titulo.toUpperCase(), 900, 260, 104, 60, 0.95, FONTE.titulo);
      rt.linhas.forEach((l, i) => linhaDestacada(ctx, l, 90, y + rt.tam * 0.85 + i * rt.tam * 0.95, corTit, claro ? COR.preto : COR.branco));
      y += rt.tam * 0.85 + (rt.linhas.length - 1) * rt.tam * 0.95 + 40;
      ctx.fillStyle = corTit; ctx.fillRect(90, y, 90, 8); y += 70;
      const rb = caber(ctx, v.texto, 900, H - 180 - y, 46, 30, 1.45, FONTE.texto);
      rb.linhas.forEach((l, i) => linhaDestacada(ctx, l, 90, y + i * rb.tam * 1.45, corTxt, corTit));
      ctx.fillStyle = claro ? COR.vermelho : COR.preto; ctx.fillRect(0, H - 22, W, 22);
      fonte(ctx, 64); ctx.fillStyle = corTit; ctx.textAlign = "right"; ctx.fillText("→", W - 90, H - 70);
      grao(ctx, W, H, 0.05);
    },
  },
  carrosselFim: {
    nome: "Carrossel · fechamento", w: 1080, h: 1350, grupo: "carrossel",
    campos: [
      { id: "chamada", rotulo: "Chamada", padrao: "Gostou? Então organize-se." },
      { id: "acoes", rotulo: "Ações (separe com vírgula)", padrao: "Salve, Compartilhe, Comente" },
    ],
    desenhar(ctx, v) {
      const W = 1080, H = 1350;
      ctx.fillStyle = COR.preto; ctx.fillRect(0, 0, W, H);
      raios(ctx, W / 2, H * 0.36, 24, "rgba(204,34,32,.16)", 0);
      logo(ctx, W / 2, 380, 300);
      const r = caber(ctx, v.chamada.toUpperCase(), 900, 220, 110, 60, 0.95, FONTE.titulo);
      r.linhas.forEach((l, i) => linhaDestacada(ctx, l, W / 2, 640 + r.tam * 0.85 + i * r.tam * 0.95, COR.papel, COR.amarelo, "center"));
      fonte(ctx, 46); ctx.fillStyle = COR.papel; ctx.textAlign = "center"; ctx.fillText("SIGA", W / 2, 965);
      fonte(ctx, 120); ctx.fillStyle = COR.amarelo; ctx.fillText(ARROBA.toUpperCase(), W / 2, 1080);
      const acoes = v.acoes.split(",").map((s) => s.trim()).filter(Boolean);
      fonte(ctx, 44); ctx.fillStyle = COR.papel;
      ctx.fillText(acoes.join("   ★   ").toUpperCase(), W / 2, 1180);
      fonte(ctx, 30, FONTE.texto); ctx.fillStyle = "#b9ab98"; ctx.fillText("coletivolufa.github.io", W / 2, 1265);
      grao(ctx, W, H, 0.05);
    },
  },

  // 3) Capa de Reels — 1080×1920 (a parte central 1080×1350 aparece no grid do perfil)
  reels: {
    nome: "Capa de Reels", w: 1080, h: 1920,
    campos: [
      { id: "kicker", rotulo: "Linha de cima (série ou tema)", padrao: "COLETIVO LUFÃ EXPLICA" },
      { id: "titulo", rotulo: "Título (use *asteriscos* para destacar em amarelo)", tipo: "area", padrao: "Escala *6x1*" },
      { id: "com", rotulo: "Com quem (opcional)", padrao: "com Léo Duarte" },
      { id: "selo", rotulo: "Etiqueta (opcional)", padrao: "EP. 2 · POR QUE ACABAR COM ELA?" },
      { id: "imagem", rotulo: "Imagem ou recorte (fica na parte de baixo)", tipo: "imagem" },
    ],
    desenhar(ctx, v) {
      const W = 1080, H = 1920, CX = 540;
      ctx.fillStyle = COR.vermelho; ctx.fillRect(0, 0, W, H);
      raios(ctx, CX, 1250, 22, "rgba(138,20,17,.5)", -0.25);
      logo(ctx, CX, 400, 200);
      fonte(ctx, 64); const kw = Math.min(900, ctx.measureText(v.kicker.toUpperCase()).width + 60);
      ctx.fillStyle = COR.preto; ctx.fillRect(CX - kw / 2, 560, kw, 92);
      ctx.fillStyle = COR.papel; ctx.textAlign = "center"; ctx.fillText(v.kicker.toUpperCase(), CX, 630, 860);
      const r = caber(ctx, v.titulo.toUpperCase(), 940, 300, 260, 110, 0.9, FONTE.titulo);
      r.linhas.forEach((l, i) => {
        const y = 700 + r.tam * 0.82 + i * r.tam * 0.9;
        ctx.save(); ctx.translate(8, 8); linhaDestacada(ctx, l.replace(/\*/g, ""), CX, y, COR.preto, COR.preto, "center"); ctx.restore();
        linhaDestacada(ctx, l, CX, y, COR.papel, COR.amarelo, "center");
      });
      let y = 700 + r.tam * 0.82 + (r.linhas.length - 1) * r.tam * 0.9 + 80;
      if (v.com.trim()) {
        fonte(ctx, 46); ctx.letterSpacing = "5px"; const w = ctx.measureText(v.com.toUpperCase()).width;
        ctx.fillStyle = COR.amarelo; ctx.fillRect(CX - w / 2 - 80, y - 18, 56, 6);
        ctx.fillStyle = COR.papel; ctx.textAlign = "left"; ctx.fillText(v.com.toUpperCase(), CX - w / 2, y); ctx.letterSpacing = "0px";
        y += 80;
      }
      if (v.imagem) {
        const top = Math.max(y + 40, 1080);
        const c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d");
        const e = Math.min(W / v.imagem.width, (H - top) / v.imagem.height) * 1.0;
        const iw = v.imagem.width * e, ih = v.imagem.height * e;
        g.drawImage(v.imagem, CX - iw / 2, H - ih, iw, ih);
        const s = document.createElement("canvas"); s.width = W; s.height = H; const gs = s.getContext("2d");
        gs.drawImage(c, 0, 0); gs.globalCompositeOperation = "source-in"; gs.fillStyle = COR.preto; gs.fillRect(0, 0, W, H);
        ctx.drawImage(s, -16, 0); ctx.drawImage(c, 0, 0);
      }
      if (v.selo.trim()) etiqueta(ctx, v.selo.toUpperCase(), CX, y + 10, 44, COR.preto, COR.papel, "center");
      grao(ctx, W, H, 0.08); vinheta(ctx, W, H, 0.3);
    },
  },
};

// desenha um modelo num canvas novo e devolve o canvas
async function desenharModelo(id, valores) {
  await prepararFontes();
  const m = MODELOS[id];
  const c = document.createElement("canvas"); c.width = m.w; c.height = m.h;
  const v = {};
  m.campos.forEach((f) => (v[f.id] = valores && f.id in valores ? valores[f.id] : (f.tipo === "imagem" ? null : f.padrao)));
  m.desenhar(c.getContext("2d"), v);
  return c;
}
