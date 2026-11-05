/* Bate-papo dos membros. As mensagens somem 72 horas depois do envio (ver supabase/08-chat.sql). */
const LIMITE_TEXTO = 500;
const MAX_BYTES = 5 * 1024 * 1024;
const TIPOS_IMAGEM = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const SETENTA_E_DUAS_HORAS = 72 * 3600 * 1000;
const INTERVALO_ENVIO = 2000;
const MAX_AUDIO_MS = 120 * 1000;
const SELO_ATIVO = `<img class="selo-ativo" src="assets/img/martelo-foice.png" alt="Membro ativo" title="Membro ativo">`;

const $ = (id) => document.getElementById(id);
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ligar = (t) => t.replace(/https?:\/\/[^\s<]+/g, (u) => `<a href="${u}" target="_blank" rel="noopener nofollow">${u}</a>`);

let eu = null;
let minhaPapel = "";
let mensagens = [];
let autores = new Map();
let ultimoEnvio = 0;
let souAtivo = false;
let gravador = null;
let pedacos = [];
let temporizador = null;
let inicioGravacao = 0;

function avisar(texto) { $("aviso-chat").textContent = texto; $("aviso-chat").hidden = !texto; }

function fora(texto, comLogin) {
  $("area").hidden = true;
  $("entrada").hidden = false;
  $("entrada").innerHTML = esc(texto) + (comLogin ? ' <a href="conta.html">Entrar na conta</a>' : "");
}

// selos: "Membro ativo" + a primeira ocupação, ou "Membro comum"
function selosDe(funcao) {
  const texto = String(funcao || "");
  if (/comum/i.test(texto)) return { ativo: false, selos: ["Membro comum"] };
  const ocupacoes = texto.split("·").map((t) => t.trim()).filter((t) => t && !/^membro( ativo)?$/i.test(t));
  return { ativo: true, selos: ["Membro ativo", ...ocupacoes.slice(0, 1)] };
}

function horario(iso) {
  const d = new Date(iso);
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const hoje = new Date().toDateString() === d.toDateString();
  return hoje ? hora : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + " " + hora;
}

function msgHTML(m) {
  const a = autores.get(m.autor_id) || { nome: "Membro", foto: "", funcao: "Membro comum" };
  const { ativo, selos } = selosDe(a.funcao);
  const meu = m.autor_id === eu.id;
  const corpo = m.tipo === "audio"
    ? `<audio class="audio" controls preload="none" src="${esc(m.imagem_url)}"></audio>`
    : m.tipo === "imagem"
      ? `<a href="${esc(m.imagem_url)}" target="_blank" rel="noopener"><img class="midia" src="${esc(m.imagem_url)}" alt="Imagem enviada no bate-papo" loading="lazy"></a>`
      : `<p class="texto">${ligar(esc(m.texto))}</p>`;
  const pode = meu || minhaPapel === "admin";
  return `<article class="msg${meu ? " msg--eu" : ""}" data-id="${m.id}">
    <img class="msg__foto" src="${esc(a.foto || "assets/img/avatar.svg")}" alt="">
    <div class="msg__corpo">
      <header class="msg__cab">
        <strong>${esc(a.nome || "Membro")}</strong>${ativo ? SELO_ATIVO : ""}
        ${selos.map((s) => `<span class="badge${s === "Membro ativo" ? " badge--ativo" : ""}">${esc(s)}</span>`).join("")}
        <time datetime="${esc(m.criado_em)}">${horario(m.criado_em)}</time>
      </header>
      ${corpo}
      ${pode ? `<button type="button" class="apagar" data-id="${m.id}">apagar</button>` : ""}
    </div>
  </article>`;
}

function desenhar() {
  const lista = $("lista");
  const perto = lista.scrollHeight - lista.scrollTop - lista.clientHeight < 120;
  const vazio = mensagens.length === 0;
  lista.innerHTML = vazio
    ? '<p class="vazio">Ainda não há mensagens. Comece a conversa!</p>'
    : mensagens.map(msgHTML).join("");
  if (perto || vazio) lista.scrollTop = lista.scrollHeight;
}

function limparVencidas() {
  const agora = Date.now();
  const antes = mensagens.length;
  mensagens = mensagens.filter((m) => agora - new Date(m.criado_em).getTime() < SETENTA_E_DUAS_HORAS);
  if (mensagens.length !== antes) desenhar();
}

async function carregarAutores() {
  const { data } = await supa.from("membros_publicos").select("id,nome,foto,funcao");
  autores = new Map((data || []).map((p) => [p.id, p]));
}

async function carregarMensagens() {
  const { data, error } = await supa.from("chat_mensagens")
    .select("id,autor_id,tipo,texto,imagem_url,criado_em")
    .gt("criado_em", new Date(Date.now() - SETENTA_E_DUAS_HORAS).toISOString())
    .order("criado_em", { ascending: true })
    .limit(300);
  if (error) return avisar("Não foi possível carregar o bate-papo agora. Tente de novo.");
  mensagens = data || [];
  desenhar();
}

function adicionar(m) {
  if (mensagens.some((x) => x.id === m.id)) return;
  mensagens.push(m);
  mensagens.sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em));
  desenhar();
}

function podeEnviar() {
  const agora = Date.now();
  if (agora - ultimoEnvio < INTERVALO_ENVIO) { avisar("Espere um instante antes de enviar de novo."); return false; }
  ultimoEnvio = agora;
  avisar("");
  return true;
}

async function enviarTexto(e) {
  e.preventDefault();
  const campo = $("texto");
  const texto = campo.value.trim();
  if (!texto) return;
  if (texto.length > LIMITE_TEXTO) return avisar(`Mensagem muito longa (máximo de ${LIMITE_TEXTO} caracteres).`);
  if (!podeEnviar()) return;
  const { error } = await supa.from("chat_mensagens").insert({ autor_id: eu.id, tipo: "texto", texto });
  if (error) return avisar("Não foi possível enviar: " + error.message);
  campo.value = "";
  carregarMensagens();
}

async function enviarImagem(arquivo) {
  if (!TIPOS_IMAGEM.includes(arquivo.type)) return avisar("Envie uma imagem PNG, JPG, WEBP ou GIF.");
  if (arquivo.size > MAX_BYTES) return avisar("A imagem passa de 5 MB. Escolha uma menor.");
  if (!podeEnviar()) return;
  avisar("Enviando imagem…");
  const nome = arquivo.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const caminho = `${eu.id}/${Date.now()}-${nome}`;
  const { error: erroEnvio } = await supa.storage.from("chat").upload(caminho, arquivo, { contentType: arquivo.type, upsert: false });
  if (erroEnvio) return avisar("Não foi possível enviar a imagem: " + erroEnvio.message);
  const url = supa.storage.from("chat").getPublicUrl(caminho).data.publicUrl;
  const { error } = await supa.from("chat_mensagens").insert({ autor_id: eu.id, tipo: "imagem", imagem_url: url });
  if (error) return avisar("Não foi possível enviar: " + error.message);
  avisar("");
  carregarMensagens();
}

function atualizarBotaoGravar() {
  const b = $("gravar");
  if (!b) return;
  if (gravador && gravador.state === "recording") {
    const seg = Math.floor((Date.now() - inicioGravacao) / 1000);
    b.textContent = `■ Parar e enviar (${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, "0")})`;
    b.classList.add("gravando");
  } else {
    b.textContent = "● Gravar áudio";
    b.classList.remove("gravando");
  }
}

async function alternarGravacao() {
  if (gravador && gravador.state === "recording") { gravador.stop(); return; }
  if (!souAtivo) return avisar("Só membros ativos podem enviar áudio.");
  if (!window.MediaRecorder || !navigator.mediaDevices) return avisar("Este navegador não permite gravar áudio.");
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
  catch (e) { return avisar("Permita o uso do microfone para gravar."); }
  const tipo = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]
    .find((t) => MediaRecorder.isTypeSupported(t)) || "";
  gravador = new MediaRecorder(stream, tipo ? { mimeType: tipo } : undefined);
  pedacos = [];
  gravador.ondataavailable = (e) => { if (e.data && e.data.size) pedacos.push(e.data); };
  gravador.onstop = () => {
    stream.getTracks().forEach((t) => t.stop());
    clearInterval(temporizador);
    atualizarBotaoGravar();
    enviarAudio(new Blob(pedacos, { type: gravador.mimeType || tipo || "audio/webm" }));
  };
  gravador.start();
  inicioGravacao = Date.now();
  temporizador = setInterval(() => {
    if (Date.now() - inicioGravacao >= MAX_AUDIO_MS) { gravador.stop(); return; }
    atualizarBotaoGravar();
  }, 500);
  atualizarBotaoGravar();
  avisar("");
}

async function enviarAudio(blob) {
  if (!blob.size) return avisar("Não consegui gravar o áudio. Tente de novo.");
  if (blob.size > MAX_BYTES) return avisar("Áudio grande demais. Grave um trecho menor.");
  if (!podeEnviar()) return;
  const tipo = blob.type.split(";")[0] || "audio/webm";
  const ext = tipo.includes("ogg") ? "ogg" : tipo.includes("mp4") ? "m4a" : "webm";
  const caminho = `${eu.id}/${Date.now()}-audio.${ext}`;
  avisar("Enviando áudio…");
  const { error: erroEnvio } = await supa.storage.from("chat").upload(caminho, blob, { contentType: tipo, upsert: false });
  if (erroEnvio) return avisar("Não foi possível enviar o áudio: " + erroEnvio.message);
  const url = supa.storage.from("chat").getPublicUrl(caminho).data.publicUrl;
  const { error } = await supa.from("chat_mensagens").insert({ autor_id: eu.id, tipo: "audio", imagem_url: url });
  if (error) return avisar("Não foi possível enviar: " + error.message);
  avisar("");
  carregarMensagens();
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
  $("gravar").addEventListener("click", alternarGravacao);
  $("entrada").hidden = true;
  $("area").hidden = false;

  $("form").addEventListener("submit", enviarTexto);
  $("texto").addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("form").requestSubmit(); } });
  $("arquivo").addEventListener("change", (e) => { const f = e.target.files[0]; e.target.value = ""; if (f) enviarImagem(f); });
  $("lista").addEventListener("click", async (e) => {
    const b = e.target.closest(".apagar");
    if (!b || !confirm("Apagar esta mensagem?")) return;
    const { error } = await supa.from("chat_mensagens").delete().eq("id", b.dataset.id);
    if (error) return avisar("Não foi possível apagar: " + error.message);
    carregarMensagens();
  });

  await carregarAutores();
  await carregarMensagens();
  supa.channel("chat-mensagens")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_mensagens" }, async (p) => {
      if (!autores.has(p.new.autor_id)) await carregarAutores();
      adicionar(p.new);
    })
    .subscribe();
  setInterval(carregarMensagens, 30000);   // reconcilia apagamentos feitos por outras pessoas
  setInterval(limparVencidas, 60000);      // some com as mensagens que passaram de 72 horas
}

iniciar().catch(() => avisar("Não foi possível abrir o bate-papo agora. Tente de novo."));
