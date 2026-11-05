/* Bate-papo: chat geral e conversas privadas entre amigos. Pedidos de amizade são feitos pelo feed. Mensagens somem em 72 horas.
   Requer supabase/08-chat.sql e supabase/09-chat-privado.sql. */
const LIMITE_TEXTO = 500;
const MAX_BYTES = 5 * 1024 * 1024;
const TIPOS_IMAGEM = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const SETENTA_E_DUAS_HORAS = 72 * 3600 * 1000;
const INTERVALO_ENVIO = 1500;
const MAX_AUDIO_MS = 120 * 1000;
const COLUNAS = "id,autor_id,tipo,texto,imagem_url,criado_em,conversa_id";
const CORES = ["#C8201E", "#1F3A5F", "#8A5A00", "#2E6B3A", "#6B2E7A", "#A4471B"];
const ICONE_ATIVO = '<img class="selo-ativo" src="assets/img/martelo-foice.png" alt="" title="Membro ativo">';

const $ = (id) => document.getElementById(id);

let eu = null;
let minhaPapel = "";
let souAtivo = false;
let autores = new Map();          // id -> { id, nome, foto, funcao }
let conversas = [];               // { id, outro }
let amigos = new Set();             // ids de quem é amigo
let pedidosEnviados = new Map();    // para_id -> id do pedido
let pedidosRecebidos = new Map();   // de_id -> id do pedido
let naoLidas = new Map();         // conversa id -> quantas mensagens novas
let alvo = { chave: "geral", conversaId: null };
let mensagens = [];
let ids = new Set();
let ultimaMudanca = 0;
let ultimoEnvio = 0;
let canal = null;
let ultimoAviso = 0;
let estadoEnviado = "parado";
const digitando = new Map();      // id -> { nome, estado, expira }
let gravador = null;
let pedacos = [];
let temporizador = null;
let inicioGravacao = 0;
let cancelando = false;
let previa = null;

// ---------- utilidades ----------
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
const nomeDe = (id) => (autores.get(id) || {}).nome || "Membro";
const fotoDe = (id) => (autores.get(id) || {}).foto || "assets/img/avatar.svg";
const desde72h = () => new Date(Date.now() - SETENTA_E_DUAS_HORAS).toISOString();

// ---------- mensagens na tela ----------
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
    ? '<span class="msg-foto-vazia"></span>'
    : `<img class="msg-foto" src="${esc(a.foto || "assets/img/avatar.svg")}" alt="">`;
  const cabeca = seguida ? "" : `
      <header class="cab">
        <span class="nome" style="color:${cor(m.autor_id)}">${esc(a.nome || "Membro")}</span>${ativo ? ICONE_ATIVO : ""}
        ${selos.map((s) => `<span class="pill${s === "Membro ativo" ? " pill--ativo" : ""}">${esc(s)}</span>`).join("")}
      </header>`;
  const corpo = m.tipo === "audio"
    ? `<audio class="audio" controls preload="none" src="${esc(m.imagem_url)}"></audio>`
    : m.tipo === "imagem"
      ? `<a href="${esc(m.imagem_url)}" target="_blank" rel="noopener"><img class="midia" src="${esc(m.imagem_url)}" alt="Imagem enviada no bate-papo" loading="lazy"></a>`
      : `<p class="msg-texto">${ligar(esc(m.texto))}</p>`;

  return `${separador}<article class="msg-linha ${meu ? "minha" : "outra"}${seguida ? " seguida" : ""}" data-id="${m.id}">
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

function desenhar() {
  const lista = $("lista");
  ids = new Set(mensagens.map((m) => m.id));
  lista.innerHTML = mensagens.length
    ? mensagens.map((m, i) => htmlMensagem(m, mensagens[i - 1])).join("")
    : '<p class="chat-vazio">Ainda não há mensagens. Comece a conversa!</p>';
  lista.scrollTop = lista.scrollHeight;
}

function acrescentar(m) {
  if (!m || ids.has(m.id)) return;
  const conv = m.conversa_id ?? null;
  if (conv !== alvo.conversaId) {
    // chegou em outra conversa: marca como não lida
    if (conv !== null && m.autor_id !== eu.id) {
      naoLidas.set(conv, (naoLidas.get(conv) || 0) + 1);
      renderLateral();
    }
    return;
  }
  ultimaMudanca = Date.now();
  const perto = estaPerto();
  const anterior = mensagens[mensagens.length - 1];
  mensagens.push(m);
  ids.add(m.id);
  const lista = $("lista");
  const vazio = lista.querySelector(".chat-vazio");
  if (vazio) vazio.remove();
  lista.insertAdjacentHTML("beforeend", htmlMensagem(m, anterior));
  if (perto || m.autor_id === eu.id) lista.scrollTop = lista.scrollHeight;
}

function removerLocal(id) {
  ultimaMudanca = Date.now();
  mensagens = mensagens.filter((m) => m.id !== id);
  desenhar();
}

function sincronizar(novas) {
  const mudou = novas.length !== mensagens.length || novas.some((m) => !ids.has(m.id));
  mensagens = novas;
  if (mudou) desenhar();
}

// ---------- carregar dados ----------
async function carregarAutores() {
  const { data } = await supa.from("membros_publicos").select("id,nome,foto,funcao,apelido");
  autores = new Map((data || []).map((p) => [p.id, p]));
}

async function carregarConversas() {
  const { data } = await supa.from("chat_conversas").select("id,membro_a,membro_b,origem,respondida,iniciada_por");
  conversas = (data || []).map((c) => ({
    id: c.id,
    outro: c.membro_a === eu.id ? c.membro_b : c.membro_a,
    origem: c.origem,
    aguardando: !c.respondida && c.iniciada_por === eu.id,
  }));
}

async function recarregarAmizades() {
  const a = await carregarAmizades(eu.id);   // de assets/comunidade.js
  amigos = a.amigos;
  pedidosEnviados = a.enviados;
  pedidosRecebidos = a.recebidos;
  await carregarConversas();
  renderLateral();
}

// mensagens da conversa aberta (geral: conversa_id nulo; privada: o id da conversa)
function consultaDaConversa(base) {
  return alvo.conversaId === null
    ? base.is("conversa_id", null)
    : base.eq("conversa_id", alvo.conversaId);
}

async function carregarMensagens() {
  const inicio = Date.now();
  const base = supa.from("chat_mensagens").select(COLUNAS).gt("criado_em", desde72h());
  const { data, error } = await consultaDaConversa(base).order("criado_em", { ascending: true }).limit(300);
  if (error) return avisar("Não foi possível carregar as mensagens agora. Tente de novo.");
  if (ultimaMudanca > inicio) return;
  sincronizar(data || []);
}

async function buscarNovas() {
  const ultima = mensagens[mensagens.length - 1];
  const desde = ultima ? ultima.criado_em : desde72h();
  const base = supa.from("chat_mensagens").select(COLUNAS).gte("criado_em", desde);
  const { data, error } = await consultaDaConversa(base).order("criado_em", { ascending: true }).limit(100);
  if (error || !data) return;
  data.forEach(acrescentar);
}

// ---------- lateral: chat geral, conversas, pedidos de amizade e membros ----------
function renderLateral() {
  $("btn-geral").classList.toggle("ativo", alvo.conversaId === null);

  $("lista-conversas").innerHTML = conversas.length
    ? conversas.map((c) => {
        const n = naoLidas.get(c.id) || 0;
        const marca = c.origem === "match" ? '<span class="coracao-match" title="Deu match">♥</span>' : "";
        const sub = c.origem === "encontro"
          ? `<small class="sub-item">${c.aguardando ? "aguardando resposta" : "mensagem de encontro"}</small>` : "";
        return `<button type="button" class="item${alvo.conversaId === c.id ? " ativo" : ""}" data-abrir="${c.id}">
          <img src="${esc(fotoDe(c.outro))}" alt="">
          <span class="item__txt">${marca}${esc(nomeDe(c.outro))}${sub}</span>
          ${n ? `<span class="contador">${n}</span>` : ""}
        </button>`;
      }).join("")
    : '<p class="muted">Nenhuma conversa ainda. Peça amizade pelo feed.</p>';

}

// ---------- trocar de conversa ----------
function cabecalho() {
  if (alvo.conversaId === null) {
    $("titulo-painel").textContent = "Chat geral";
    $("sub-painel").textContent = "Todos os membros aprovados";
  } else {
    const c = conversas.find((x) => x.id === alvo.conversaId);
    $("titulo-painel").textContent = c ? nomeDe(c.outro) : "Conversa privada";
    $("sub-painel").textContent = "Conversa privada";
  }
}

async function trocarAlvo(novo) {
  alvo = novo;
  mensagens = [];
  ids = new Set();
  digitando.clear();
  mostrarDigitando();
  estadoEnviado = "parado";
  avisar("");
  cabecalho();
  desenhar();
  renderLateral();
  await carregarMensagens();
}

function abrirGeral() { return trocarAlvo({ chave: "geral", conversaId: null }); }

function abrirPrivado(id) {
  const c = conversas.find((x) => x.id === id);
  if (!c) return;
  naoLidas.delete(id);
  return trocarAlvo({ chave: "c" + id, conversaId: id });
}

// ---------- pedidos de amizade ----------
const MENSAGENS_AMIZADE = {
  enviado: (a) => `Pedido de amizade enviado para @${a}.`,
  aceito_automatico: (a) => `@${a} já tinha pedido: agora vocês são amigos.`,
  ja_enviado: (a) => `Você já pediu amizade para @${a}.`,
  ja_amigos: () => "Vocês já são amigos.",
};

async function pedirAmigo(apelido) {
  const { data, error } = await supa.rpc("pedir_amizade", { p_apelido: apelido });
  if (error) return avisar(error.message);
  await recarregarAmizades();
  const texto = MENSAGENS_AMIZADE[data];
  avisar(texto ? texto(apelido) : "");
}

async function aceitarAmigo(id) {
  const { data, error } = await supa.rpc("aceitar_amizade", { p_id: Number(id) });
  if (error) return avisar("Não foi possível aceitar: " + error.message);
  await recarregarAmizades();
  if (data) abrirPrivado(data);
}

async function recusarAmigo(id) {
  const { error } = await supa.rpc("recusar_amizade", { p_id: Number(id) });
  if (error) return avisar("Não foi possível recusar: " + error.message);
  await recarregarAmizades();
}

// ---------- "digitando" e "gravando", por conversa ----------
function avisarEstado(estado) {
  if (!canal || !eu) return;
  const agora = Date.now();
  if (estado === estadoEnviado && estado !== "digitando") return;
  if (estado === "digitando" && estadoEnviado === "digitando" && agora - ultimoAviso < 2000) return;
  estadoEnviado = estado;
  ultimoAviso = agora;
  canal.send({ type: "broadcast", event: "digitando", payload: { id: eu.id, nome: meuNome(), estado, chave: alvo.chave } });
}

function meuNome() {
  const n = nomeDe(eu.id);
  return n !== "Membro" ? n.split(" ")[0] : "Alguém";
}

function receberEstado(p) {
  if (!p || !p.id || p.id === eu.id || p.chave !== alvo.chave) return;
  if (p.estado === "parado") { digitando.delete(p.id); return mostrarDigitando(); }
  digitando.set(p.id, { nome: p.nome || "Alguém", estado: p.estado, expira: Date.now() + 4000 });
  mostrarDigitando();
}

function mostrarDigitando() {
  const el = $("digitando");
  const agora = Date.now();
  for (const [id, v] of digitando) if (v.expira < agora) digitando.delete(id);
  const itens = [...digitando.values()];
  if (!itens.length) { el.hidden = true; el.textContent = ""; return; }
  const frase = (v) => v.estado === "gravando" ? `${v.nome} está gravando um áudio` : `${v.nome} está digitando`;
  let texto;
  if (itens.length === 1) texto = frase(itens[0]) + "…";
  else if (itens.length === 2) texto = `${itens[0].nome} e ${itens[1].nome} estão ${itens.every((v) => v.estado === "gravando") ? "gravando" : "digitando"}…`;
  else texto = `${itens.length} pessoas estão conversando…`;
  el.textContent = texto;
  el.hidden = false;
}

// ---------- envio ----------
function podeEnviar() {
  const agora = Date.now();
  if (agora - ultimoEnvio < INTERVALO_ENVIO) { avisar("Espere um instante antes de enviar de novo."); return false; }
  ultimoEnvio = agora;
  avisar("");
  return true;
}

async function publicar(dados) {
  const { data, error } = await supa.from("chat_mensagens")
    .insert({ autor_id: eu.id, conversa_id: alvo.conversaId, ...dados })
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
    avisarEstado("parado");
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

// ---------- áudio: grava, toca a prévia e só envia quando confirmado ----------
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
    avisarEstado("parado");
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
  avisarEstado("gravando");
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

// ---------- início ----------
async function iniciar() {
  const { data: sessao } = await supa.auth.getSession();
  if (!sessao || !sessao.session) return fora("Entre na sua conta para participar do bate-papo.", true);
  const { data: aprovado } = await supa.rpc("sou_aprovado");
  if (aprovado !== true) return fora("O bate-papo é para membros aprovados. Se você acabou de se cadastrar, aguarde a aprovação da secretaria.", false);

  eu = sessao.session.user;
  const { data: perfil } = await supa.from("perfis").select("id,nome,foto,papel,funcao,apelido").eq("id", eu.id).single();
  minhaPapel = perfil ? perfil.papel : "";
  souAtivo = !!perfil && !/comum/i.test(perfil.funcao || "");
  $("gravar").hidden = !souAtivo;
  $("entrada").hidden = true;
  montarAbas("bate-papo");
  if (perfil) await garantirApelido(eu, perfil);   // @apelido obrigatório na comunidade
  $("area").hidden = false;

  $("btn-geral").addEventListener("click", abrirGeral);
  $("lateral").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.abrir) return abrirPrivado(Number(b.dataset.abrir));
  });
  $("enviar").addEventListener("click", enviarTexto);
  $("texto").addEventListener("input", () => {
    ajustarAltura();
    avisarEstado($("texto").value.trim() ? "digitando" : "parado");
  });
  $("texto").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(pointer: fine)").matches) { e.preventDefault(); enviarTexto(); }
  });
  window.addEventListener("pagehide", () => avisarEstado("parado"));
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
  await carregarConversas();
  await recarregarAmizades();
  await trocarAlvo({ chave: "geral", conversaId: null });

  canal = supa.channel("chat-comunidade", { config: { broadcast: { self: false } } })
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_mensagens" }, async (p) => {
      if (!autores.has(p.new.autor_id)) await carregarAutores();
      acrescentar(p.new);
    })
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "chat_mensagens" }, (p) => {
      if (p.old && p.old.id) removerLocal(p.old.id);
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "amizades" }, async (p) => {
      const novo = p.new || {};
      if (novo.para_id === eu.id && p.eventType === "INSERT") {
        if (!autores.has(novo.de_id)) await carregarAutores();
        avisar(`${nomeDe(novo.de_id)} pediu sua amizade. Veja em Amizades.`);
      }
      await recarregarAmizades();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "chat_conversas" }, async () => {
      await carregarConversas();
      renderLateral();
      cabecalho();
    })
    .on("broadcast", { event: "digitando" }, ({ payload }) => receberEstado(payload))
    .subscribe();

  setInterval(buscarNovas, 3000);          // reserva, caso o tempo real caia
  setInterval(mostrarDigitando, 1000);     // apaga o aviso de quem parou de digitar
  setInterval(() => {                      // confere apagamentos e a lista de convites e conversas
    carregarMensagens();
    recarregarAmizades();
    carregarConversas().then(renderLateral);
  }, 60000);
  setInterval(() => {                      // tira o que passou de 72 horas
    const agora = Date.now();
    const antes = mensagens.length;
    mensagens = mensagens.filter((m) => agora - new Date(m.criado_em).getTime() < SETENTA_E_DUAS_HORAS);
    if (mensagens.length !== antes) desenhar();
  }, 60000);
}

iniciar().catch(() => fora("Não foi possível abrir o bate-papo agora. Atualize a página e tente de novo.", false));
