/* Carteirinha do Militante: monta a carteirinha no <canvas> com foto, dados e assinatura feita com o dedo */

const $ = (id) => document.getElementById(id);
const cartao = $("cartao"), ctx = cartao.getContext("2d");
const TINTA = "#1c2d6e";                      // azul de carimbo, igual ao da arte
const FOTO = { x: 591, y: 53, w: 372, h: 520 }; // espaço da foto na arte (1024 × 1536)
const LINHA = { nome: 690, idade: 782, ocupacao: 871, matricula: 1008, data: 1098, assinatura: 1234 };

const hoje = new Date();
const DATA = { d: String(hoje.getDate()).padStart(2, "0"), m: String(hoje.getMonth() + 1).padStart(2, "0"), a: String(hoje.getFullYear()) };

let membro = null, foto = null, eu = null;
const fundo = carregar("carteirinha/fundo.jpg"), carimbo = carregar("carteirinha/carimbo-foto.png");

function carregar(src) { const i = new Image(); i.src = src; return i; }
const pronto = (img) => img.complete && img.naturalWidth > 0;

// ---------- desenho ----------
function escrever(texto, x, linha, largura, tam = 46, alinhar = "left") {
  if (!texto) return;
  let t = tam;
  ctx.font = `700 ${t}px "Courier Prime", "Courier New", monospace`;
  while (ctx.measureText(texto).width > largura && t > 22) { t -= 2; ctx.font = `700 ${t}px "Courier Prime", "Courier New", monospace`; }
  ctx.textAlign = alinhar;
  ctx.fillText(texto, x, linha - 9);
}

function desenhar() {
  ctx.clearRect(0, 0, cartao.width, cartao.height);
  if (pronto(fundo)) ctx.drawImage(fundo, 0, 0, 1024, 1536);
  // foto: cobre o espaço, com zoom e posição ajustáveis
  if (foto) {
    const z = Number($("zoom").value), e = Math.max(FOTO.w / foto.width, FOTO.h / foto.height) * z;
    const w = foto.width * e, h = foto.height * e;
    const x = FOTO.x + (FOTO.w - w) / 2 + Number($("px").value) * (w - FOTO.w) / 2;
    const y = FOTO.y + (FOTO.h - h) / 2 + Number($("py").value) * (h - FOTO.h) / 2;
    ctx.save(); ctx.beginPath(); ctx.rect(FOTO.x, FOTO.y, FOTO.w, FOTO.h); ctx.clip();
    ctx.filter = "sepia(.22) contrast(1.05)"; ctx.drawImage(foto, x, y, w, h); ctx.filter = "none";
    ctx.restore();
    if (pronto(carimbo)) ctx.drawImage(carimbo, FOTO.x, FOTO.y);
  }
  // dados, com cara de tinta de máquina de escrever sobre o papel
  ctx.save(); ctx.globalCompositeOperation = "multiply"; ctx.fillStyle = TINTA; ctx.globalAlpha = 0.92;
  escrever($("nome").value.trim().toUpperCase(), 232, LINHA.nome, 728);
  const idade = $("idade").value.trim();
  escrever(idade ? `${idade} ANOS` : "", 245, LINHA.idade, 580);
  escrever(textoOcupacao(membro).toUpperCase(), 66, 924, 790, 48);
  escrever(membro ? membro.matricula : "", 470, LINHA.matricula, 480, 50);
  escrever(DATA.d, 584, LINHA.data, 100, 46, "center");
  escrever(DATA.m, 724, LINHA.data, 100, 46, "center");
  escrever(DATA.a, 884, LINHA.data, 150, 46, "center");
  // assinatura: recorta o traço e encaixa acima da linha
  const caixa = recorteAssinatura();
  if (caixa) {
    const maxW = 700, maxH = 125, e = Math.min(maxW / caixa.w, maxH / caixa.h, 1.6);
    const w = caixa.w * e, h = caixa.h * e;
    ctx.globalAlpha = 1;
    ctx.drawImage(pad, caixa.x, caixa.y, caixa.w, caixa.h, 512 - w / 2, LINHA.assinatura - 6 - h, w, h);
  }
  ctx.restore();
}

// ---------- assinatura com o dedo ----------
const pad = $("assinatura"), pctx = pad.getContext("2d");
let desenhando = false, ultimo = null, temAssinatura = false;
pctx.lineCap = "round"; pctx.lineJoin = "round"; pctx.strokeStyle = TINTA;
function ponto(ev) {
  const r = pad.getBoundingClientRect();
  return { x: (ev.clientX - r.left) * pad.width / r.width, y: (ev.clientY - r.top) * pad.height / r.height, p: ev.pressure || 0.5 };
}
pad.addEventListener("pointerdown", (ev) => { desenhando = true; ultimo = ponto(ev); pad.setPointerCapture(ev.pointerId); ev.preventDefault(); });
pad.addEventListener("pointermove", (ev) => {
  if (!desenhando) return;
  const p = ponto(ev);
  const dist = Math.hypot(p.x - ultimo.x, p.y - ultimo.y);
  pctx.lineWidth = Math.max(4, Math.min(9, 9 - dist / 6)); // traço mais fino quando rápido, como caneta
  pctx.beginPath(); pctx.moveTo(ultimo.x, ultimo.y);
  pctx.quadraticCurveTo(ultimo.x, ultimo.y, (ultimo.x + p.x) / 2, (ultimo.y + p.y) / 2);
  pctx.lineTo(p.x, p.y); pctx.stroke();
  ultimo = p; temAssinatura = true; ev.preventDefault();
  agendar();
});
const parar = () => { desenhando = false; agendar(); };
pad.addEventListener("pointerup", parar); pad.addEventListener("pointercancel", parar); pad.addEventListener("pointerleave", () => desenhando && parar());
$("limpar").addEventListener("click", () => { pctx.clearRect(0, 0, pad.width, pad.height); temAssinatura = false; desenhar(); });

function recorteAssinatura() {
  if (!temAssinatura) return null;
  const d = pctx.getImageData(0, 0, pad.width, pad.height).data;
  let x0 = pad.width, y0 = pad.height, x1 = -1, y1 = -1;
  for (let y = 0; y < pad.height; y += 2) for (let x = 0; x < pad.width; x += 2) {
    if (d[(y * pad.width + x) * 4 + 3] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0) return null;
  const m = 8; x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(pad.width, x1 + m); y1 = Math.min(pad.height, y1 + m);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

// ---------- foto ----------
function usarFoto(src) {
  const img = new Image();
  // foto do perfil fica no Supabase (outro endereço): sem isso o navegador bloqueia gerar a imagem final
  if (!/^(blob:|data:)/.test(src)) img.crossOrigin = "anonymous";
  img.onload = () => { foto = img; $("ajuste").hidden = false; desenhar(); };
  img.onerror = () => avisar("Não foi possível abrir essa foto. Tente outra.");
  img.src = src;
}
$("foto").addEventListener("change", (ev) => {
  const f = ev.target.files[0]; if (!f) return;
  ["zoom", "px", "py"].forEach((id) => ($(id).value = id === "zoom" ? 1 : 0));
  usarFoto(URL.createObjectURL(f));
  $("foto-aviso").textContent = "Use os controles abaixo para enquadrar o rosto.";
});
["zoom", "px", "py"].forEach((id) => $(id).addEventListener("input", desenhar));

// ---------- dados ----------
function preencherDaConta() {
  membro = { nome: eu.nome, matricula: eu.matricula, foto: eu.foto, funcao: eu.funcao };
  $("nome").value = eu.nome || "";
  if (eu.idade) $("idade").value = eu.idade;
  $("ver-matricula").textContent = eu.matricula;
  $("ver-ocupacao").textContent = textoOcupacao(eu);
  if (eu.aprovado_em) { const d = new Date(eu.aprovado_em); DATA.d = String(d.getDate()).padStart(2, "0"); DATA.m = String(d.getMonth() + 1).padStart(2, "0"); DATA.a = String(d.getFullYear()); }
  $("ver-data").textContent = `${DATA.d}/${DATA.m}/${DATA.a}`;
  if (eu.foto) { usarFoto(eu.foto); $("foto-aviso").textContent = "Usamos a foto do seu perfil. Se quiser, escolha outra só para a carteirinha."; }
  else $("foto-aviso").textContent = "Escolha uma foto de rosto.";
}
["nome", "idade"].forEach((id) => $(id).addEventListener("input", agendar));

let espera;
function agendar() { cancelAnimationFrame(espera); espera = requestAnimationFrame(desenhar); }
function avisar(t) { $("aviso").textContent = t; }

// ---------- baixar e compartilhar ----------
function faltando() {
  if (!membro) return "Entre na sua conta para fazer a carteirinha.";
  if (!$("nome").value.trim()) return "Preencha o seu nome.";
  if (!$("idade").value.trim()) return "Preencha a sua idade.";
  if (!foto) return "Escolha uma foto.";
  if (!temAssinatura) return "Assine no quadro da assinatura.";
  return "";
}
function nomeArquivo() {
  return "carteirinha-lufa-" + (membro ? membro.matricula : "") + "-" +
    $("nome").value.trim().normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + ".png";
}
function gerarBlob(tipo = "image/png", q) {
  desenhar();
  return new Promise((ok, falha) => {
    try { cartao.toBlob((b) => (b ? ok(b) : falha(new Error("não foi possível gerar a imagem"))), tipo, q); }
    catch (e) { falha(new Error("a foto não pôde ser usada; escolha a foto de novo pelo botão de foto")); }
  });
}

// salva na conta ANTES de baixar/compartilhar (no celular, o download interrompe a página)
let salva = false;
async function salvarNaConta() {
  if (!eu) return false;
  avisar("Salvando na sua conta…");
  let error;
  try {
    const jpg = await gerarBlob("image/jpeg", 0.9);
    const envio = supa.storage.from("fotos").upload(`${eu.id}/carteirinha.jpg`, jpg, { contentType: "image/jpeg", upsert: true, cacheControl: "60" });
    const limite = new Promise((_, falha) => setTimeout(() => falha(new Error("a conexão demorou demais")), 45000));
    ({ error } = await Promise.race([envio, limite]));
  } catch (e) { error = e; }
  if (error) { avisar("Não foi possível salvar na sua conta: " + mensagemErro(error) + ". Tente de novo."); return false; }
  salva = true;
  avisar("Carteirinha salva! Ela aparece em Minha conta → Minha carteirinha.");
  return true;
}
function botoes(desligar) { ["salvar", "baixar", "compartilhar"].forEach((id) => { if ($(id)) $(id).disabled = desligar; }); }

$("salvar").addEventListener("click", async () => {
  const f = faltando(); if (f) { avisar(f); return; }
  botoes(true); await salvarNaConta(); botoes(false);
});
$("baixar").addEventListener("click", async () => {
  const f = faltando(); if (f) { avisar(f); return; }
  botoes(true);
  const ok = await salvarNaConta();
  let blob; try { blob = await gerarBlob(); } catch (e) { avisar("Não foi possível baixar: " + e.message + "."); botoes(false); return; }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = nomeArquivo(); a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  if (ok) avisar("Carteirinha salva na sua conta e baixada no aparelho!");
  botoes(false);
});
if (navigator.canShare) {
  $("compartilhar").hidden = false;
  $("compartilhar").addEventListener("click", async () => {
    const f = faltando(); if (f) { avisar(f); return; }
    botoes(true);
    await salvarNaConta();
    let png; try { png = await gerarBlob(); } catch (e) { avisar("Não foi possível compartilhar: " + e.message + "."); botoes(false); return; }
    const arq = new File([png], nomeArquivo(), { type: "image/png" });
    botoes(false);
    if (navigator.canShare({ files: [arq] })) { try { await navigator.share({ files: [arq], title: "Minha carteirinha do Coletivo Lufã" }); } catch (_) {} }
    else avisar("Seu navegador não permite compartilhar arquivos. Use o botão Baixar.");
  });
}
// qualquer mudança depois de salvar pede para salvar de novo
["nome", "idade", "foto", "zoom", "px", "py"].forEach((id) => $(id).addEventListener("input", () => { if (salva) { salva = false; avisar("Você alterou a carteirinha: salve de novo para atualizar a sua conta."); } }));

// ---------- início: só para quem entrou na conta e foi aprovado ----------
function bloquear(titulo, texto, link, rotulo) {
  $("bloqueio").hidden = false;
  $("bloqueio-titulo").textContent = titulo;
  $("bloqueio-texto").textContent = texto;
  $("bloqueio-link").href = link; $("bloqueio-link").textContent = rotulo;
  document.querySelector(".carteira").hidden = true;
}
(async () => {
  await Promise.all([fundo.decode().catch(() => {}), carimbo.decode().catch(() => {}), document.fonts.load('700 46px "Courier Prime"').catch(() => {})]);
  eu = await meuPerfil().catch(() => null);
  if (!eu) return bloquear("Entre na sua conta", "A carteirinha é feita com os dados da sua conta e fica salva nela. Entre (ou crie a sua conta) para continuar.", "conta.html", "Entrar ou criar conta");
  if (eu.papel === "pendente") return bloquear("Aguardando aprovação", "Sua conta ainda está sendo analisada pela secretaria. Assim que for aprovada, você ganha a sua matrícula e pode fazer a carteirinha.", "conta.html", "Ver minha conta");
  if (!APROVADO.includes(eu.papel) || !eu.matricula) return bloquear("Carteirinha indisponível", "Sua conta não tem permissão para emitir carteirinha. Fale com a secretaria do coletivo.", "conta.html", "Ver minha conta");
  document.querySelector(".carteira").hidden = false;
  preencherDaConta();
  avisar("Seus dados vieram da sua conta. Falta só assinar! Ao baixar, a carteirinha também fica salva em Minha conta.");
  desenhar();
})();
