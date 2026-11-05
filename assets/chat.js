/* Bate-papo dos membros. Mensagens somem 72 horas depois do envio (supabase/08-chat.sql). */
const LIMITE_TEXTO = 500;
const MAX_BYTES = 5 * 1024 * 1024;
const TIPOS_IMAGEM = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const SETENTA_E_DUAS_HORAS = 72 * 3600 * 1000;
const INTERVALO_ENVIO = 1500;
const MAX_AUDIO_MS = 120 * 1000;
const COLUNAS = "id,autor_id,tipo,texto,imagem_url,criado_em";
const CORES = ["#C8201E", "#1F3A5F", "#8A5A00", "#2E6B3A", "#6B2E7A", "#A4471B"];
const ICONE_ATIVO = '<img class="selo-ativo" src="assets/img/martelo-foice.png" alt="" title="Membro ativo">';

const $ = (id) => document.getElementById(id);

let eu = null;
let minhaPapel = "";
let souAtivo = false;
let mensagens = [];
let ids = new Set();
let autores = new Map();
let ultimoEnvio = 0;
let gravador = null;
let pedacos = [];
let temporizador = null;
let inicioGravacao = 0;
let cancelando = false;
let previa = null; // { blob, url }
let ultimaMudanca = 0; // quando a tela mudou por último (envio, recebimento ou apagar)

function avisar(texto) { const el = $("aviso-chat"); el.textContent = texto; el.hidden = !texto; }

function fora(texto, comLogin) {
  $("area").hidden = true;
  const e = $("entrada");
  e.hidden = false;
  e.textContent = texto;
  if (comLogin) {
    const a = document.createElement("a");
    a.href = "conta.html";
    a.textContent = " Entrar na conta";
    e.appendChild(a);
  }
}

function mostrarComp(estado) {
  $("comp-texto").hidden = estado !== "texto";
  $("comp-gravando").hidden = estado !== "gravando";
  $("comp-previa").hidden = estado !== "previa";
}

// selos: "Membro ativo" + a primeira ocupação, ou "Membro comum"
function selosDe(funcao) {
  const texto = String(funcao || "");
  if (/comum/i.test(texto)) return { ativo: false, selos: ["Membro comum"] };
  const ocupacoes = texto.split("·").map((t) => t.trim()).filter((t) => t && !/^membro( ativo)?$/i.test(t));
  return { ativo: true, selos: ["Membro ativo", ...ocupacoes.slice(0, 1)] };
}

const cor = (id) => {
  let h = 0;
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return CORES[h % CORES.length];
};
const hora = (iso) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const mesmoDia = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
function rotuloDia(iso) {
  const d = new Date(iso);
  if (d.toDateString() === new Date().toDateString()) return "Hoje";
  if (d.toDateString() === new Date(Date.now() - 86400000).toDateString()) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
}
function ligar(texto) {
  return texto.replace(/https?:\/\/[^\s<]+/g, (u) => `<a href="${u}" target="_blank" rel="noopener nofollow">${u}</a>`);
}

function htmlMensagem(m, anterior) {
  const a = autores.get(m.autor_id) || { nome: "Membro", foto: "", funcao: "Membro comum" };
  const meu = m.autor_id === eu.id;
  const mudouDia = !anterior || !mesmoDia(anterior.criado_em, m.criado_em);
  const seguida = !mudouDia && anterior.autor_id === m.autor_id
    && new Date(m.criado_em) - new Date(anterior.criado_em) < 5 * 60 * 1000;
  const { ativo, selos } = selosDe(a.funcao);
  const pode = meu || minhaPapel === "admin";

  const separador = mudouDia ? `<div class="dia">${esc(rotuloDia(m.criado_em))}</div>` : "";
  const foto = meu ? "" : seguida
    ? '<span class="foto-vazia"></span>'
    : `<img class="foto" src="${esc(a.foto || "assets/img/avatar.svg")}" alt="">`;
  const cabeca = seguida ? "" : `
      <header class="cab">
        <span class="nome" style="color:${cor(m.autor_id)}">${esc(a.nome || "Membro")}</span>${ativo ? ICONE_ATIVO : ""}
        ${selos.map((s) => `<span class="pill${s === "Membro ativo" ? " pill--ativo" : ""}">${esc(s)}</span>`).join("")}
      </header>`;
  const corpo = m.tipo === "audio"
    ? `<audio class="audio" controls preload="none" src="${esc(m.imagem_url)}"></audio>`
    : m.tipo === "imagem"
      ? `<a href="${esc(m.imagem_url)}" target="_blank" rel="noopener"><img class="midia" src="${esc(m.imagem_url)}" alt="Imagem enviada no bate-papo" loading="lazy"></a>`
      : `<p class="texto">${ligar(esc(m.texto))}</p>`;

  return `${separador}<article class="linha ${meu ? "minha" : "outra"}${seguida ? " seguida" : ""}" data-id="${m.id}">
    ${foto}
    <div class="balao">${cabeca}
      ${corpo}
      <footer class="rodape-balao"><time datetime="${esc(m.criado_em)}">${hora(m.criado_em)}</time>${pode ? `<button type="button" class="apagar" data-id="${m.id}">apagar</button>` : ""}</footer>
    </div>
  </article>`;
}

function estaPerto() {
  const l = $("lista");
  return l.scrollHeight - l.scrollTop - l.clientHeight < 160;
}

// desenha tudo de uma vez (primeira carga e quando algo foi apagado)
function desenhar() {
  const lista = $("lista");
  ids = new Set(mensagens.map((m) => m.id));
  lista.innerHTML = mensagens.length
    ? mensagens.map((m, i) => htmlMensagem(m, mensagens[i - 1])).join("")
    : '<p class="vazio">Ainda não há mensagens. Comece a conversa!</p>';
  lista.scrollTop = lista.scrollHeight;
}

// acrescenta só a mensagem nova (rápido, sem redesenhar a conversa)
function acrescentar(m) {
  if (!m || ids.has(m.id)) return;
  ultimaMudanca = Date.now();
  const perto = estaPerto();
  const anterior = mensagens[mensagens.length - 1];
  mensagens.push(m);
  ids.add(m.id);
  const lista = $("lista");
  const vazio = lista.querySelector(".vazio");
  if (vazio) vazio.remove();
  lista.insertAdjacentHTML("beforeend", htmlMensagem(m, anterior));
  if (perto || m.autor_id === eu.id) lista.scrollTop = lista.scrollHeight;
}

function removerLocal(id) {
  ultimaMudanca = Date.now();
  mensagens = mensagens.filter((m) => m.id !== id);
  desenhar();
}

// compara com o servidor e só redesenha se algo mudou (apagado ou novo de outra pessoa)
function sincronizar(novas) {
  const mudou = novas.length !== mensagens.length || novas.some((m) => !ids.has(m.id));
  mensagens = novas;
  if (mudou) desenhar();
}

async function carregarAutores() {
  const { data } = await supa.from("membros_publicos").select("id,nome,foto,funcao");
  autores = new Map((data || []).map((p) => [p.id, p]));
}

// traz a conversa do servidor. Se a tela mudou enquanto a resposta vinha, descarta a resposta
// (ela pode ser antiga e apagaria a mensagem que acabou de chegar).
async function carregarMensagens() {
  const inicio = Date.now();
  const { data, error } = await supa.from("chat_mensagens")
    .select(COLUNAS)
    .gt("criado_em", new Date(Date.now() - SETENTA_E_DUAS_HORAS).toISOString())
    .order("criado_em", { ascending: true })
    .limit(300);
  if (error) return avisar("Não foi possível carregar o bate-papo agora. Tente de novo.");
  if (ultimaMudanca > inicio) return;
  sincronizar(data || []);
}

// busca só o que é novo desde a última mensagem da tela (rápido, para o caso de o tempo real falhar)
async function buscarNovas() {
  const ultima = mensagens[mensagens.length - 1];
  const desde = ultima ? ultima.criado_em : new Date(Date.now() - SETENTA_E_DUAS_HORAS).toISOString();
  const { data, error } = await supa.from("chat_mensagens")
    .select(COLUNAS)
    .gte("criado_em", desde)
    .order("criado_em", { ascending: true })
    .limit(100);
  if (error || !data) return;
  data.forEach(acrescentar);
}

function podeEnviar() {
  const agora = Date.now();
  if (agora - ultimoEnvio < INTERVALO_ENVIO) { avisar("Espere um instante antes de enviar de novo."); return false; }
  ultimoEnvio = agora;
  avisar("");
  return true;
}

// grava a mensagem no banco e já a mostra na tela
async function publicar(dados) {
  const { data, error } = await supa.from("chat_mensagens")
    .insert({ autor_id: eu.id, ...dados })
    .select(COLUNAS)
    .single();
  if (error) { avisar("Não foi possível enviar: " + error.message); return false; }
  acrescentar(data);
  return true;
}

async function enviarTexto() {
  const campo = $("texto");
  const texto = campo.value.trim();
  if (!texto) return;
  if (texto.length > LIMITE_TEXTO) return avisar(`Mensagem muito longa (máximo de ${LIMITE_TEXTO} caracteres).`);
  if (!podeEnviar()) return;
  if (await publicar({ tipo: "texto", texto })) {
    campo.value = "";
    ajustarAltura();
  }
}

async function enviarArquivo(arquivo, tipo) {
  if (!podeEnviar()) return false;
  avisar(tipo === "audio" ? "Enviando áudio…" : "Enviando imagem…");
  const ext = tipo === "audio" ? (arquivo.type.includes("ogg") ? "ogg" : arquivo.type.includes("mp4") ? "m4a" : "webm") : "";
  const nome = tipo === "audio" ? `audio.${ext}` : arquivo.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const caminho = `${eu.id}/${Date.now()}-${nome}`;
  const contentType = arquivo.type.split(";")[0];
  const { error } = await supa.storage.from("chat").upload(caminho, arquivo, { contentType, upsert: false });
  if (error) { avisar("Não foi possível enviar o arquivo: " + error.message); return false; }
  const url = supa.storage.from("chat").getPublicUrl(caminho).data.publicUrl;
  avisar("");
  return publicar({ tipo, imagem_url: url });
}

async function enviarImagem(arquivo) {
  if (!TIPOS_IMAGEM.includes(arquivo.type)) return avisar("Envie uma imagem PNG, JPG, WEBP ou GIF.");
  if (arquivo.size > MAX_BYTES) return avisar("A imagem passa de 5 MB. Escolha uma menor.");
  await enviarArquivo(arquivo, "imagem");
}

// ---------- áudio: grava, mostra a prévia para ouvir, e só envia quando a pessoa confirma ----------
function atualizarTempo() {
  const s = Math.floor((Date.now() - inicioGravacao) / 1000);
  $("tempo").textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function limparPrevia() {
  if (previa) URL.revokeObjectURL(previa.url);
  previa = null;
  const a = $("previa-audio");
  a.pause();
  a.removeAttribute("src");
  a.load();
}

async function comecarGravacao() {
  if (!souAtivo) return avisar("Só membros ativos podem enviar áudio.");
  if (!navigator.mediaDevices || !window.MediaRecorder) return avisar("Este navegador não permite gravar áudio.");
  limparPrevia();
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
  catch (e) { return avisar("Permita o uso do microfone para gravar."); }

  const tipo = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]
    .find((t) => MediaRecorder.isTypeSupported(t)) || "";
  const rec = new MediaRecorder(stream, tipo ? { mimeType: tipo } : undefined);
  pedacos = [];
  cancelando = false;
  rec.ondataavailable = (e) => { if (e.data && e.data.size) pedacos.push(e.data); };
  rec.onstop = () => {
    stream.getTracks().forEach((t) => t.stop());
    clearInterval(temporizador);
    temporizador = null;
    if (cancelando) return mostrarComp("texto");
    const blob = new Blob(pedacos, { type: rec.mimeType || tipo || "audio/webm" });
    if (!blob.size) { mostrarComp("texto"); return avisar("Não consegui gravar o áudio. Tente de novo."); }
    previa = { blob, url: URL.createObjectURL(blob) };
    $("previa-audio").src = previa.url;
    mostrarComp("previa");
  };

  gravador = rec;
  inicioGravacao = Date.now();
  rec.start();
  mostrarComp("gravando");
  atualizarTempo();
  temporizador = setInterval(() => {
    if (Date.now() - inicioGravacao >= MAX_AUDIO_MS) return pararGravacao();
    atualizarTempo();
  }, 250);
  avisar("");
}

function pararGravacao() {
  if (gravador && gravador.state === "recording") gravador.stop();
}

function cancelarGravacao() {
  cancelando = true;
  pararGravacao();
}

async function enviarPrevia() {
  if (!previa) return;
  if (previa.blob.size > MAX_BYTES) return avisar("Áudio grande demais. Grave um trecho menor.");
  const ok = await enviarArquivo(previa.blob, "audio");
  if (ok) {
    limparPrevia();
    mostrarComp("texto");
  }
}

// ---------- campo de texto ----------
function ajustarAltura() {
  const t = $("texto");
  t.style.height = "auto";
  t.style.height = Math.min(t.scrollHeight, 120) + "px";
}

async function apagar(id) {
  if (!confirm("Apagar esta mensagem?")) return;
  const { error } = await supa.from("chat_mensagens").delete().eq("id", id);
  if (error) return avisar("Não foi possível apagar: " + error.message);
  removerLocal(id);
}

async function iniciar() {
  const { data: sessao } = await supa.auth.getSession();
  if (!sessao || !sessao.session) return fora("Entre na sua conta para participar do bate-papo.", true);
  const { data: aprovado } = await supa.rpc("sou_aprovado");
  if (aprovado !== true) return fora("O bate-papo é para membros aprovados. Se você acabou de se cadastrar, aguarde a aprovação da secretaria.", false);

  eu = sessao.session.user;
  const { data: perfil } = await supa.from("perfis").select("papel,funcao").eq("id", eu.id).single();
  minhaPapel = perfil ? perfil.papel : "";
  souAtivo = !!perfil && !/comum/i.test(perfil.funcao || "");
  $("gravar").hidden = !souAtivo;
  $("entrada").hidden = true;
  $("area").hidden = false;

  $("enviar").addEventListener("click", enviarTexto);
  $("texto").addEventListener("input", ajustarAltura);
  $("texto").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(pointer: fine)").matches) { e.preventDefault(); enviarTexto(); }
  });
  $("arquivo").addEventListener("change", (e) => { const f = e.target.files[0]; e.target.value = ""; if (f) enviarImagem(f); });
  $("gravar").addEventListener("click", comecarGravacao);
  $("parar-gravacao").addEventListener("click", pararGravacao);
  $("cancelar-gravacao").addEventListener("click", cancelarGravacao);
  $("descartar-previa").addEventListener("click", () => { limparPrevia(); mostrarComp("texto"); avisar(""); });
  $("enviar-previa").addEventListener("click", enviarPrevia);
  $("lista").addEventListener("click", (e) => {
    const b = e.target.closest(".apagar");
    if (b) apagar(b.dataset.id);
  });

  await carregarAutores();
  await carregarMensagens();
  // tempo real: a mensagem chega na hora que é enviada
  supa.channel("chat-mensagens")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_mensagens" }, async (p) => {
      if (!autores.has(p.new.autor_id)) await carregarAutores();
      acrescentar(p.new);
    })
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "chat_mensagens" }, (p) => {
      if (p.old && p.old.id) removerLocal(p.old.id);
    })
    .subscribe();
  // reserva: confere novidades a cada 3 segundos, caso o tempo real caia
  setInterval(buscarNovas, 3000);
  // confere apagamentos e a conversa inteira de tempos em tempos
  setInterval(carregarMensagens, 60000);
  setInterval(() => {                     // some com o que passou de 72 horas
    const agora = Date.now();
    const antes = mensagens.length;
    mensagens = mensagens.filter((m) => agora - new Date(m.criado_em).getTime() < SETENTA_E_DUAS_HORAS);
    if (mensagens.length !== antes) desenhar();
  }, 60000);
}

iniciar().catch(() => fora("Não foi possível abrir o bate-papo agora. Atualize a página e tente de novo.", false));
