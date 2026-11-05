/* Identidade visual dos posts do Coletivo Lufã: desenha cada modelo num <canvas>.
   Prima d'O Camarada: mesma família de cartaz soviético, com as cores e a pomba do coletivo. */

const COR = {
  vermelho: "#cc2220", vermelhoEsc: "#9e1715", amarelo: "#eab426",
  papel: "#fbf6ec", branco: "#ffffff", preto: "#1e1916", cinza: "#6b625c",
};
const FONTE = { titulo: "Bebas Neue", texto: "Archivo", citacao: "Literata" };
// fontes que o gerador oferece (do guia de identidade do site)
const FONTES_TITULO = ["Bebas Neue", "Big Shoulders Display", "Russo One", "Oswald"];
const FONTES_TEXTO = ["Archivo", "Literata", "Special Elite", "Instrument Serif"];
const ARROBA = "@coletivolufa";

const LOGO = new Image();
LOGO.src = new URL("../assets/img/logo.png", document.currentScript.src).href;

async function prepararFontes() {
  const familias = [...FONTES_TITULO, ...FONTES_TEXTO, FONTE.titulo, FONTE.texto, FONTE.citacao];
  const cargas = [];
  familias.forEach((f) => {
    cargas.push(document.fonts.load(`400 100px "${f}"`), document.fonts.load(`700 40px "${f}"`),
      document.fonts.load(`italic 400 60px "${f}"`));
  });
  await Promise.all([...cargas.map((p) => p.catch(() => {})), LOGO.decode().catch(() => {})]);
}

// ---------- utilidades de desenho ----------
function fonte(ctx, tam, fam = FONTE.titulo, peso = "400", estilo = "normal") {
  ctx.font = `${estilo} ${peso} ${tam}px "${fam}"`;
}
// marcações de formatação dentro do texto:
// [b]negrito[/b]  [i]itálico[/i]  [+]maior[/+]  [-]menor[/-]  [c=#cc2220]cor[/c]
const MARCA_RE = /\[\/?(?:b|i|\+|-|c(?:=#[0-9a-f]{3,8})?)\]/gi;
const TEM_MARCA = /\[\/?(?:b|i|\+|-|c(?:=#[0-9a-f]{3,8})?)\]/i;
const semMarca = (t) => String(t).replace(MARCA_RE, "");

// separa o texto em trechos, cada um com o seu estilo
function segmentos(txt) {
  const out = [];
  const st = { b: false, i: false, f: 1, c: null };
  let pos = 0, m;
  const empurra = (t) => { if (t) out.push({ ...st, t }); };
  MARCA_RE.lastIndex = 0;
  while ((m = MARCA_RE.exec(txt))) {
    empurra(txt.slice(pos, m.index));
    pos = MARCA_RE.lastIndex;
    const fecha = m[0][1] === "/";
    const k = m[0].replace(/[\[\]/]/g, "").toLowerCase();
    if (k === "b") st.b = !fecha;
    else if (k === "i") st.i = !fecha;
    else if (k === "+") st.f = fecha ? 1 : 1.3;
    else if (k === "-") st.f = fecha ? 1 : 0.75;
    else if (k.startsWith("c")) st.c = fecha ? null : k.replace(/^c=/, "");
  }
  empurra(txt.slice(pos));
  return out.map((r) => ({ ...r, t: r.t.replace(/\*/g, "") }));
}

// fonte de um trecho: mantém a família e o tamanho da linha, e aplica negrito, itálico e tamanho
function fonteDoTrecho(base, r) {
  const m = base.match(/^(.*?)(\d+(?:\.\d+)?)px\s+(.+)$/);
  const pre = m ? m[1] : "";
  const tam = m ? parseFloat(m[2]) : 40;
  const fam = m ? m[3] : `"${FONTE.texto}"`;
  const pesoBase = (pre.match(/\b(\d{3})\b/) || [])[1] || "400";
  const estilo = r.i || /italic/.test(pre) ? "italic" : "normal";
  const peso = r.b ? "700" : pesoBase;
  return `${estilo} ${peso} ${tam * r.f}px ${fam}`;
}

const FILLTEXT_NATIVO = CanvasRenderingContext2D.prototype.fillText;
// escreve um texto com marcações de estilo, respeitando o alinhamento da linha
function escreverRico(ctx, texto, x, y) {
  const base = ctx.font, corBase = ctx.fillStyle, alinhar = ctx.textAlign;
  const trechos = segmentos(texto);
  const larguras = trechos.map((r) => { ctx.font = fonteDoTrecho(base, r); return ctx.measureText(r.t).width; });
  const total = larguras.reduce((a, b) => a + b, 0);
  let cx = alinhar === "center" ? x - total / 2 : alinhar === "right" ? x - total : x;
  ctx.textAlign = "left";
  trechos.forEach((r, k) => {
    ctx.font = fonteDoTrecho(base, r);
    ctx.fillStyle = r.c || corBase;
    FILLTEXT_NATIVO.call(ctx, r.t, cx, y);
    cx += larguras[k];
  });
  ctx.font = base; ctx.fillStyle = corBase; ctx.textAlign = alinhar;
}

function quebrar(ctx, texto, largura) {
  const linhas = [];
  for (const par of String(texto).split("\n")) {
    const palavras = par.split(/\s+/).filter(Boolean);
    let linha = "";
    for (const p of palavras) {
      const teste = linha ? linha + " " + p : p;
      if (ctx.measureText(semMarca(teste).replace(/\*/g, "")).width > largura && linha) { linhas.push(linha); linha = p; }
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
  const total = partes.reduce((s, p) => s + ctx.measureText(semMarca(p).replace(/\*/g, "")).width, 0);
  let cx = alinhar === "center" ? x - total / 2 : x;
  ctx.textAlign = "left";
  for (const p of partes) {
    const d = p.startsWith("*") && p.endsWith("*");
    const t = p.replace(/\*/g, "");
    ctx.fillStyle = d ? corDestaque : cor;
    ctx.fillText(t, cx, y);
    cx += ctx.measureText(semMarca(t)).width;
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
  // aceita foto (img) ou vídeo (video): cada um tem o seu tamanho natural
  const iW = img.videoWidth || img.width, iH = img.videoHeight || img.height;
  const e = Math.max(w / iW, h / iH), iw = iW * e, ih = iH * e;
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
  // 4) Aviso de evento — feed 1080×1350
  evento: {
    nome: "Aviso de evento", w: 1080, h: 1350,
    campos: [
      { id: "tipo", rotulo: "Tipo", padrao: "REUNIÃO ABERTA" },
      { id: "titulo", rotulo: "Nome do evento (use *asteriscos* para destacar)", tipo: "area", padrao: "Roda de leitura do *Manifesto*" },
      { id: "dia", rotulo: "Dia", padrao: "15" },
      { id: "mes", rotulo: "Mês", padrao: "NOV" },
      { id: "semana", rotulo: "Dia da semana", padrao: "SÁBADO" },
      { id: "hora", rotulo: "Horário", padrao: "16h" },
      { id: "local", rotulo: "Local", padrao: "Praça da Liberdade · ou online" },
      { id: "extra", rotulo: "Informação extra (opcional)", padrao: "Gratuito e aberto a todos · inscrição no link da bio" },
    ],
    desenhar(ctx, v) {
      const W = 1080, H = 1350;
      ctx.fillStyle = COR.vermelho; ctx.fillRect(0, 0, W, H);
      raios(ctx, W * 0.85, H * 0.32, 22, "rgba(255,255,255,.06)", 0.1);
      assinatura(ctx, 90, 130, COR.branco, 40);
      etiqueta(ctx, ("AGENDA · " + v.tipo).toUpperCase(), 90, 300, 46, COR.amarelo, COR.preto);
      const r = caber(ctx, v.titulo.toUpperCase(), 900, 380, 170, 80, 0.92, FONTE.titulo);
      r.linhas.forEach((l, i) => linhaDestacada(ctx, l, 90, 370 + r.tam * 0.82 + i * r.tam * 0.92, COR.branco, COR.amarelo));
      // bloco de data, como um carimbo de calendário
      const y = 820;
      ctx.fillStyle = "rgba(30,25,22,.9)"; ctx.fillRect(102, y + 12, 300, 330);
      ctx.fillStyle = COR.papel; ctx.fillRect(90, y, 300, 330);
      ctx.fillStyle = COR.preto; ctx.fillRect(90, y, 300, 70);
      fonte(ctx, 50); ctx.fillStyle = COR.amarelo; ctx.textAlign = "center"; ctx.fillText(v.mes.toUpperCase(), 240, y + 54);
      fonte(ctx, 210); ctx.fillStyle = COR.vermelho; ctx.fillText(v.dia, 240, y + 280);
      fonte(ctx, 40); ctx.fillStyle = COR.preto; ctx.fillText(v.semana.toUpperCase(), 240, y + 318);
      ctx.textAlign = "left";
      fonte(ctx, 120); ctx.fillStyle = COR.amarelo; ctx.fillText(v.hora, 450, y + 120);
      fonte(ctx, 46, FONTE.texto, "700"); ctx.fillStyle = COR.branco;
      quebrar(ctx, v.local, 540).slice(0, 2).forEach((l, i) => ctx.fillText(l, 450, y + 200 + i * 56));
      if (v.extra.trim()) { fonte(ctx, 30, FONTE.texto); ctx.fillStyle = COR.papel; quebrar(ctx, v.extra, 560).slice(0, 2).forEach((l, i) => ctx.fillText(l, 450, y + 310 + i * 40)); }
      faixa(ctx, 1260, 70, -2, COR.amarelo, ARROBA.toUpperCase(), COR.preto, W);
      grao(ctx, W, H);
    },
  },

  // 5) Evento em story — 1080×1920 (deixa espaço livre em cima e embaixo para os botões do Instagram)
  eventoStory: {
    nome: "Evento · story", w: 1080, h: 1920,
    campos: [
      { id: "tipo", rotulo: "Tipo", padrao: "ATO" },
      { id: "titulo", rotulo: "Nome do evento", tipo: "area", padrao: "Pelo fim da *escala 6x1*" },
      { id: "dia", rotulo: "Dia", padrao: "20" },
      { id: "mes", rotulo: "Mês", padrao: "NOV" },
      { id: "semana", rotulo: "Dia da semana", padrao: "QUINTA" },
      { id: "hora", rotulo: "Horário", padrao: "17h" },
      { id: "local", rotulo: "Local", padrao: "Em frente à prefeitura" },
      { id: "chamada", rotulo: "Chamada final", padrao: "Chame quem trabalha com você" },
    ],
    desenhar(ctx, v) {
      const W = 1080, H = 1920, CX = 540;
      ctx.fillStyle = COR.vermelho; ctx.fillRect(0, 0, W, H);
      raios(ctx, CX, 760, 24, "rgba(138,20,17,.55)", 0);
      logo(ctx, CX, 330, 170);
      etiqueta(ctx, v.tipo.toUpperCase(), CX, 520, 58, COR.preto, COR.papel, "center");
      const r = caber(ctx, v.titulo.toUpperCase(), 940, 420, 220, 100, 0.9, FONTE.titulo);
      r.linhas.forEach((l, i) => {
        const y = 590 + r.tam * 0.82 + i * r.tam * 0.9;
        ctx.save(); ctx.translate(7, 7); linhaDestacada(ctx, l.replace(/\*/g, ""), CX, y, COR.preto, COR.preto, "center"); ctx.restore();
        linhaDestacada(ctx, l, CX, y, COR.papel, COR.amarelo, "center");
      });
      const y = 1120;
      ctx.fillStyle = "rgba(30,25,22,.9)"; ctx.fillRect(132, y + 14, 840, 300);
      ctx.fillStyle = COR.papel; ctx.fillRect(120, y, 840, 300);
      ctx.fillStyle = COR.vermelho; ctx.fillRect(120, y, 300, 300);
      fonte(ctx, 46); ctx.fillStyle = COR.amarelo; ctx.textAlign = "center"; ctx.fillText(v.mes.toUpperCase(), 270, y + 62);
      fonte(ctx, 190); ctx.fillStyle = COR.branco; ctx.fillText(v.dia, 270, y + 236);
      fonte(ctx, 36); ctx.fillStyle = COR.papel; ctx.fillText(v.semana.toUpperCase(), 270, y + 280);
      ctx.textAlign = "left"; fonte(ctx, 120); ctx.fillStyle = COR.vermelho; ctx.fillText(v.hora, 460, y + 130);
      fonte(ctx, 40, FONTE.texto, "700"); ctx.fillStyle = COR.preto;
      quebrar(ctx, v.local, 470).slice(0, 3).forEach((l, i) => ctx.fillText(l, 460, y + 195 + i * 48));
      if (v.chamada.trim()) { fonte(ctx, 58); ctx.fillStyle = COR.papel; ctx.textAlign = "center"; ctx.fillText(v.chamada.toUpperCase(), CX, 1560, 960); }
      fonte(ctx, 44); ctx.fillStyle = COR.amarelo; ctx.textAlign = "center"; ctx.fillText("★  " + ARROBA.toUpperCase() + "  ★", CX, 1640);
      grao(ctx, W, H, 0.08); vinheta(ctx, W, H, 0.3);
    },
  },

  // 6) Story de divulgação — artigo novo, episódio novo, livro da semana
  storyDivulga: {
    nome: "Story de divulgação", w: 1080, h: 1920,
    campos: [
      { id: "tipo", rotulo: "Tipo", tipo: "opcoes", opcoes: { "NOVO ARTIGO": "Novo artigo", "EPISÓDIO NOVO": "Episódio novo", "LIVRO DA SEMANA": "Livro da semana", "NO SITE": "Outro" }, padrao: "NOVO ARTIGO" },
      { id: "titulo", rotulo: "Título", tipo: "area", padrao: "Por que o fim da *escala 6x1* é urgente" },
      { id: "texto", rotulo: "Resumo curto", tipo: "area", padrao: "Trabalhar seis dias para descansar um não é natural: é uma escolha de quem lucra com o nosso tempo." },
      { id: "autor", rotulo: "Autor(a) (opcional)", padrao: "por Leonardo Duarte" },
      { id: "imagem", rotulo: "Imagem (capa do episódio ou do livro, opcional)", tipo: "imagem" },
      { id: "chamada", rotulo: "Chamada", padrao: "LEIA NO LINK ↓" },
    ],
    desenhar(ctx, v) {
      const W = 1080, H = 1920, CX = 540;
      ctx.fillStyle = COR.papel; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = COR.vermelho; ctx.fillRect(0, 0, W, 760);
      raios(ctx, CX, 760, 22, "rgba(255,255,255,.06)", 0);
      assinatura(ctx, 90, 300, COR.branco, 44);
      etiqueta(ctx, v.tipo, 90, 430, 70, COR.amarelo, COR.preto);
      let y = 560;
      if (v.imagem) {
        const iw = 330, ih = Math.min(500, iw * v.imagem.height / v.imagem.width);
        ctx.fillStyle = COR.preto; ctx.fillRect(CX - iw / 2 + 14, y + 14, iw, ih);
        imagemCobrindo(ctx, v.imagem, CX - iw / 2, y, iw, ih);
        y += ih + 70;
      } else y = 860;
      const r = caber(ctx, v.titulo.toUpperCase(), 900, v.imagem ? 220 : 330, 120, 64, 0.95, FONTE.titulo);
      r.linhas.forEach((l, i) => linhaDestacada(ctx, l, 90, y + r.tam * 0.82 + i * r.tam * 0.95, COR.vermelho, COR.preto));
      y += r.tam * 0.82 + (r.linhas.length - 1) * r.tam * 0.95 + 40;
      if (v.autor.trim()) { fonte(ctx, 40); ctx.fillStyle = COR.cinza; ctx.textAlign = "left"; ctx.fillText(v.autor.toUpperCase(), 90, y + 10); y += 50; }
      ctx.fillStyle = COR.vermelho; ctx.fillRect(90, y + 10, 90, 8); y += 70;
      const rb = caber(ctx, v.texto, 900, Math.max(130, 1590 - y), 42, 28, 1.4, FONTE.texto);
      rb.linhas = rb.linhas.slice(0, Math.max(2, Math.floor((1600 - y) / (rb.tam * 1.4))));
      rb.linhas.forEach((l, i) => linhaDestacada(ctx, l, 90, y + i * rb.tam * 1.4, COR.preto, COR.vermelho));
      ctx.fillStyle = COR.preto; ctx.fillRect(0, 1600, W, 120);
      fonte(ctx, 66); ctx.fillStyle = COR.amarelo; ctx.textAlign = "center"; ctx.fillText(v.chamada.toUpperCase(), CX, 1683);
      grao(ctx, W, H, 0.05);
    },
  },

  // 7) Dado ou número — feed 1080×1350
  dado: {
    nome: "Dado ou número", w: 1080, h: 1350,
    campos: [
      { id: "kicker", rotulo: "Linha de cima", padrao: "VOCÊ SABIA?" },
      { id: "numero", rotulo: "Número em destaque", padrao: "44h" },
      { id: "texto", rotulo: "O que o número significa (use *asteriscos*)", tipo: "area", padrao: "é a jornada semanal máxima no Brasil desde *1988*. Na escala 6x1, sobra só um dia de descanso." },
      { id: "fonte", rotulo: "Fonte do dado", padrao: "Fonte: Constituição Federal, art. 7º, XIII" },
      { id: "fundo", rotulo: "Fundo", tipo: "opcoes", opcoes: { vermelho: "Vermelho", preto: "Preto" }, padrao: "vermelho" },
    ],
    desenhar(ctx, v) {
      const W = 1080, H = 1350, ver = v.fundo !== "preto";
      ctx.fillStyle = ver ? COR.vermelho : COR.preto; ctx.fillRect(0, 0, W, H);
      raios(ctx, W / 2, 560, 28, ver ? "rgba(255,255,255,.06)" : "rgba(204,34,32,.18)", 0);
      assinatura(ctx, 90, 130, ver ? COR.branco : COR.amarelo, 40);
      etiqueta(ctx, v.kicker.toUpperCase(), W / 2, 290, 50, ver ? COR.preto : COR.vermelho, COR.papel, "center");
      let t = 480; fonte(ctx, t); while (ctx.measureText(v.numero).width > 920 && t > 160) { t -= 10; fonte(ctx, t); }
      ctx.textAlign = "center";
      ctx.fillStyle = COR.preto; ctx.fillText(v.numero, W / 2 + 12, 400 + t * 0.78 + 12);
      ctx.fillStyle = COR.amarelo; ctx.fillText(v.numero, W / 2, 400 + t * 0.78);
      const y0 = 400 + t * 0.78 + 90;
      const r = caber(ctx, v.texto, 880, H - 200 - y0, 56, 34, 1.3, FONTE.texto, "700");
      r.linhas.forEach((l, i) => linhaDestacada(ctx, l, W / 2, y0 + i * r.tam * 1.3, COR.papel, COR.amarelo, "center"));
      fonte(ctx, 26, FONTE.texto); ctx.fillStyle = COR.papel; ctx.globalAlpha = 0.75; ctx.textAlign = "center"; ctx.fillText(v.fonte, W / 2, H - 120); ctx.globalAlpha = 1;
      fonte(ctx, 40); ctx.fillStyle = COR.amarelo; ctx.fillText(ARROBA.toUpperCase(), W / 2, H - 60);
      grao(ctx, W, H);
    },
  },

  // 8) Notícia — feed 1080×1350
  noticia: {
    nome: "Notícia", w: 1080, h: 1350,
    campos: [
      { id: "selo", rotulo: "Selo", padrao: "URGENTE" },
      { id: "data", rotulo: "Data", padrao: "03/11/2026" },
      { id: "manchete", rotulo: "Manchete (use *asteriscos*)", tipo: "area", padrao: "Trabalhadores do comércio aprovam *greve* contra a escala 6x1" },
      { id: "resumo", rotulo: "Resumo (opcional)", tipo: "area", padrao: "Assembleia reuniu mais de 2 mil pessoas. Paralisação começa na próxima segunda." },
      { id: "fonte", rotulo: "Fonte", padrao: "Fonte: Agência Brasil" },
      { id: "imagem", rotulo: "Foto (com crédito na fonte)", tipo: "imagem" },
    ],
    desenhar(ctx, v) {
      const W = 1080, H = 1350, FY = 640;
      ctx.fillStyle = COR.papel; ctx.fillRect(0, 0, W, H);
      if (v.imagem) imagemCobrindo(ctx, v.imagem, 0, 0, W, FY);
      else { ctx.fillStyle = COR.vermelho; ctx.fillRect(0, 0, W, FY); raios(ctx, W / 2, FY, 22, "rgba(255,255,255,.06)", 0); }
      const g = ctx.createLinearGradient(0, 0, 0, 220); g.addColorStop(0, "rgba(30,25,22,.7)"); g.addColorStop(1, "rgba(30,25,22,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, 220);
      assinatura(ctx, 60, 100, COR.branco, 38);
      ctx.fillStyle = COR.vermelho; ctx.fillRect(0, FY, W, 14);
      const ws = etiqueta(ctx, v.selo.toUpperCase(), 90, FY + 82, 46, COR.vermelho, COR.branco);
      fonte(ctx, 34); ctx.fillStyle = COR.cinza; ctx.textAlign = "left"; ctx.fillText(v.data, 90 + ws + 22, FY + 84);
      const r = caber(ctx, v.manchete.toUpperCase(), 900, 300, 112, 60, 0.95, FONTE.titulo);
      let y = FY + 120;
      r.linhas.forEach((l, i) => linhaDestacada(ctx, l, 90, y + r.tam * 0.85 + i * r.tam * 0.95, COR.preto, COR.vermelho));
      y += r.tam * 0.85 + (r.linhas.length - 1) * r.tam * 0.95 + 50;
      if (v.resumo.trim()) { const rb = caber(ctx, v.resumo, 900, H - 140 - y, 38, 28, 1.35, FONTE.texto); rb.linhas.forEach((l, i) => { ctx.fillStyle = "#3b3430"; ctx.fillText(l, 90, y + i * rb.tam * 1.35); }); }
      ctx.fillStyle = COR.preto; ctx.fillRect(0, H - 90, W, 90);
      fonte(ctx, 24, FONTE.texto); ctx.fillStyle = "#cbbfae"; ctx.textAlign = "left"; ctx.fillText(v.fonte, 90, H - 36);
      fonte(ctx, 40); ctx.fillStyle = COR.amarelo; ctx.textAlign = "right"; ctx.fillText(ARROBA.toUpperCase(), W - 90, H - 32);
      grao(ctx, W, H, 0.05);
    },
  },

  // 9) Meme — feed 1080×1350, imagem com texto em cima e embaixo
  meme: {
    nome: "Meme", w: 1080, h: 1350,
    campos: [
      { id: "cima", rotulo: "Texto de cima", tipo: "area", padrao: "O patrão quando você pede aumento" },
      { id: "baixo", rotulo: "Texto de baixo (opcional)", tipo: "area", padrao: "\"A empresa é uma família\"" },
      { id: "imagem", rotulo: "Imagem do meme", tipo: "imagem" },
    ],
    desenhar(ctx, v) {
      const W = 1080, H = 1350;
      ctx.fillStyle = COR.preto; ctx.fillRect(0, 0, W, H);
      const temBaixo = !!v.baixo.trim();
      fonte(ctx, 70, FONTE.texto, "700");
      const rc = caber(ctx, v.cima, 940, 300, 76, 40, 1.15, FONTE.texto, "700");
      const topo = 60 + rc.linhas.length * rc.tam * 1.15 + 40;
      ctx.fillStyle = COR.branco; ctx.fillRect(0, 0, W, topo);
      ctx.fillStyle = COR.preto; ctx.textAlign = "left";
      rc.linhas.forEach((l, i) => linhaDestacada(ctx, l, 70, 60 + rc.tam * 0.9 + i * rc.tam * 1.15, COR.preto, COR.vermelho));
      const base = temBaixo ? H - 230 : H - 110;
      if (v.imagem) imagemCobrindo(ctx, v.imagem, 0, topo, W, base - topo);
      else { ctx.fillStyle = "#3a322d"; ctx.fillRect(0, topo, W, base - topo); fonte(ctx, 50); ctx.fillStyle = "#8a7f74"; ctx.textAlign = "center"; ctx.fillText("ESCOLHA UMA IMAGEM", W / 2, (topo + base) / 2); }
      if (temBaixo) {
        ctx.fillStyle = COR.vermelho; ctx.fillRect(0, base, W, H - base);
        const rb = caber(ctx, v.baixo.toUpperCase(), 940, 110, 90, 44, 0.95, FONTE.titulo);
        rb.linhas.forEach((l, i) => linhaDestacada(ctx, l, W / 2, base + 30 + rb.tam * 0.85 + i * rb.tam * 0.95, COR.branco, COR.amarelo, "center"));
      }
      ctx.fillStyle = COR.preto; ctx.fillRect(0, H - 70, W, 70);
      logo(ctx, 70, H - 35, 46, null, false);
      fonte(ctx, 34); ctx.fillStyle = COR.amarelo; ctx.textAlign = "left"; ctx.fillText(ARROBA.toUpperCase(), 110, H - 22);
      fonte(ctx, 30); ctx.fillStyle = "#b9ab98"; ctx.textAlign = "right"; ctx.fillText("COLETIVO LUFÃ", W - 40, H - 24);
    },
  },
};

// desenha um modelo num canvas novo e devolve o canvas
// desenha as imagens extras (PNG) por cima do modelo. Tamanho e posição em % da largura/altura.
function desenharCamadas(ctx, W, H, camadas) {
  (camadas || []).forEach((l) => {
    if (!l.img) return;
    const w = W * (l.tamanho / 100), h = w * (l.img.height / l.img.width);
    ctx.drawImage(l.img, W * (l.x / 100) - w / 2, H * (l.y / 100) - h / 2, w, h);
  });
}

// opcoes: { titulo, texto (nome da fonte, ou "padrao"), camadas (imagens extras) }
async function desenharModelo(id, valores, opcoes = {}) {
  await prepararFontes();
  const m = MODELOS[id];
  const c = document.createElement("canvas"); c.width = m.w; c.height = m.h;
  const v = {};
  m.campos.forEach((f) => (v[f.id] = valores && f.id in valores ? valores[f.id] : (f.tipo === "imagem" ? null : f.padrao)));
  const salvo = { ...FONTE };
  if (opcoes.titulo && opcoes.titulo !== "padrao") FONTE.titulo = opcoes.titulo;
  if (opcoes.texto && opcoes.texto !== "padrao") { FONTE.texto = opcoes.texto; FONTE.citacao = opcoes.texto; }
  try {
    const ctx = c.getContext("2d");
    ctx.fillText = function (t, x, y, max) {
      const txt = String(t);
      if (TEM_MARCA.test(txt)) return escreverRico(ctx, txt, x, y);
      return FILLTEXT_NATIVO.call(ctx, t, x, y, max);
    };
    m.desenhar(ctx, v);
    desenharCamadas(ctx, c.width, c.height, opcoes.camadas);
  } finally {
    Object.assign(FONTE, salvo);
  }
  return c;
}
