/* Feed da comunidade: publicações públicas, amizades pelo @apelido e fotos. */
const LIMITE_POST = 500;
const LIMITE_FEED = 60;
let eu = null;
let perfilEu = null;
let membros = new Map();
let amizades = { amigos: new Set(), enviados: new Map(), recebidos: new Map() };
let posts = [];
let fotoEscolhida = null;

const $ = (id) => document.getElementById(id);

function avisar(texto) { const el = $("post-aviso"); el.textContent = texto; el.hidden = !texto; }

function nomeAutor(id) {
  const m = membros.get(id);
  return m ? m.nome : "Membro";
}

function botoesAmizade(autorId) {
  const sit = situacaoCom(amizades, eu.id, autorId);
  const m = membros.get(autorId) || {};
  if (sit === "eu") return "";
  if (sit === "amigo") return `<a class="btn-pequeno btn-pequeno--suave" href="chat.html">Conversar</a>`;
  if (sit === "enviado") return `<span class="muted">Pedido enviado</span>`;
  if (sit === "recebido") {
    const id = amizades.recebidos.get(autorId);
    return `<button type="button" class="btn-pequeno btn-pequeno--vermelho" data-aceitar="${id}">Aceitar amizade</button>`;
  }
  if (!m.apelido) return "";
  return `<button type="button" class="btn-pequeno" data-amigo="${esc(m.apelido)}">Adicionar amigo</button>`;
}

function cardPost(p) {
  const m = membros.get(p.autor_id) || {};
  const apagar = (p.autor_id === eu.id || perfilEu.papel === "admin")
    ? `<button type="button" class="btn-pequeno btn-pequeno--link" data-apagar="${p.id}">apagar</button>` : "";
  const foto = p.imagem_url ? `<img class="post__foto" src="${esc(p.imagem_url)}" alt="Foto publicada por ${esc(m.apelido || "um membro")}" loading="lazy">` : "";
  const texto = p.texto ? `<p class="post__texto">${esc(p.texto)}</p>` : "";
  return `<article class="card post" data-id="${p.id}">
    <div class="linha-autor">
      <img class="av" src="${esc(m.foto || "assets/img/avatar.svg")}" alt="">
      <div>
        <strong>${esc(m.nome || "Membro")}</strong>${m.funcao && /ativo/i.test(m.funcao) ? ' <img class="selo-ativo" src="assets/img/martelo-foice.png" alt="Membro ativo" title="Membro ativo">' : ""}
        <span class="apelido">${m.apelido ? "@" + esc(m.apelido) : ""}</span>
      </div>
    </div>
    ${texto}
    ${foto}
    <div class="post__rodape">
      <span class="hora">${dataHora(p.criado_em)}</span>
      ${botoesAmizade(p.autor_id)}
      ${apagar}
    </div>
  </article>`;
}

function desenharFeed() {
  const f = $("feed");
  f.innerHTML = posts.length
    ? posts.map(cardPost).join("")
    : '<p class="card muted">Ainda não há publicações. Seja a primeira pessoa a publicar!</p>';
}

async function carregarFeed() {
  const { data, error } = await supa.from("posts")
    .select("id,autor_id,texto,imagem_url,criado_em")
    .order("criado_em", { ascending: false })
    .limit(LIMITE_FEED);
  if (error) return avisar("Não foi possível carregar o feed agora.");
  posts = data || [];
  desenharFeed();
}

async function atualizarAmizades() {
  amizades = await carregarAmizades(eu.id);
  desenharFeed();
}

// ----- publicar -----
function atualizarContador() {
  const t = $("post-texto").value;
  $("post-contador").textContent = `${t.length}/${LIMITE_POST}`;
}

async function publicar(e) {
  e.preventDefault();
  const texto = $("post-texto").value.trim();
  if (!texto && !fotoEscolhida) return avisar("Escreva algo ou escolha uma foto.");
  if (texto.length > LIMITE_POST) return avisar(`A publicação pode ter no máximo ${LIMITE_POST} caracteres.`);
  const botao = $("post-publicar");
  botao.disabled = true;
  avisar("");
  try {
    let imagem_url = null;
    if (fotoEscolhida) {
      botao.textContent = "Enviando foto…";
      imagem_url = await enviarFotoComunidade(fotoEscolhida, eu.id);
    }
    const { data, error } = await supa.from("posts")
      .insert({ autor_id: eu.id, texto, imagem_url })
      .select("id,autor_id,texto,imagem_url,criado_em")
      .single();
    if (error) throw new Error(error.message);
    posts.unshift(data);
    desenharFeed();
    $("post-texto").value = "";
    limparFoto();
    atualizarContador();
  } catch (err) {
    avisar("Não foi possível publicar: " + err.message);
  } finally {
    botao.disabled = false;
    botao.textContent = "Publicar";
  }
}

function escolherFoto(e) {
  const f = e.target.files[0];
  e.target.value = "";
  if (!f) return;
  if (!f.type.startsWith("image/")) return avisar("Escolha uma imagem.");
  if (f.size > 12 * 1024 * 1024) return avisar("A foto é muito grande. Escolha uma menor.");
  fotoEscolhida = f;
  $("post-previa-img").src = URL.createObjectURL(f);
  $("post-previa").hidden = false;
}

function limparFoto() {
  fotoEscolhida = null;
  $("post-previa").hidden = true;
  $("post-previa-img").removeAttribute("src");
}

// ----- ações nos cards -----
async function pedirAmizade(apelido, botao) {
  botao.disabled = true;
  const { data, error } = await supa.rpc("pedir_amizade", { p_apelido: apelido });
  if (error) { botao.disabled = false; return avisar(error.message); }
  await atualizarAmizades();
  if (data === "enviado") avisar(`Pedido de amizade enviado para @${apelido}.`);
  else if (data === "aceito_automatico") avisar(`@${apelido} já tinha pedido: agora vocês são amigos.`);
  else if (data === "ja_enviado") avisar(`Você já pediu amizade para @${apelido}.`);
  else if (data === "ja_amigos") avisar(`Vocês já são amigos.`);
}

async function aceitarAmizade(id, botao) {
  botao.disabled = true;
  const { error } = await supa.rpc("aceitar_amizade", { p_id: Number(id) });
  if (error) { botao.disabled = false; return avisar(error.message); }
  avisar("Amizade aceita! Agora vocês podem conversar no bate-papo.");
  await atualizarAmizades();
}

async function apagarPost(id, botao) {
  if (!confirm("Apagar esta publicação?")) return;
  botao.disabled = true;
  const { error } = await supa.from("posts").delete().eq("id", id);
  if (error) { botao.disabled = false; return avisar("Não foi possível apagar: " + error.message); }
  posts = posts.filter((p) => String(p.id) !== String(id));
  desenharFeed();
}

// ----- procurar por @apelido -----
async function buscar() {
  const termo = $("buscar-apelido").value.trim().toLowerCase().replace(/^@/, "");
  const r = $("resultado-busca");
  if (!termo) { r.innerHTML = ""; return; }
  const achados = [...membros.values()].filter((m) => m.apelido && m.apelido.includes(termo) && m.id !== eu.id);
  if (!achados.length) { r.innerHTML = '<p class="muted">Ninguém com esse @apelido.</p>'; return; }
  r.innerHTML = achados.slice(0, 10).map((m) => `<div class="linha-autor" style="margin-bottom:10px">
      <img class="av" src="${esc(m.foto || "assets/img/avatar.svg")}" alt="">
      <div style="flex:1"><strong>${esc(m.nome || "Membro")}</strong><span class="apelido" style="display:block">@${esc(m.apelido)}</span></div>
      ${botoesAmizade(m.id)}
    </div>`).join("");
}

async function iniciarFeed() {
  const entrou = await entrarComunidade();
  if (!entrou) return;
  eu = entrou.eu;
  perfilEu = entrou.perfil;
  montarAbas("feed");
  $("minha-foto").src = perfilEu.foto || "assets/img/avatar.svg";
  $("meu-apelido").textContent = "@" + perfilEu.apelido;

  membros = await carregarMembros();
  amizades = await carregarAmizades(eu.id);
  await carregarFeed();

  $("post-texto").addEventListener("input", atualizarContador);
  $("form-post").addEventListener("submit", publicar);
  $("post-foto").addEventListener("change", escolherFoto);
  $("post-tirar").addEventListener("click", limparFoto);
  $("buscar-ir").addEventListener("click", buscar);
  $("buscar-apelido").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); buscar(); } });
  $("buscar-apelido").addEventListener("input", (e) => { if (!e.target.value.trim()) $("resultado-busca").innerHTML = ""; });

  $("feed").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.amigo) return pedirAmizade(b.dataset.amigo, b);
    if (b.dataset.aceitar) return aceitarAmizade(b.dataset.aceitar, b);
    if (b.dataset.apagar) return apagarPost(b.dataset.apagar, b);
  });
  $("resultado-busca").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.amigo) return pedirAmizade(b.dataset.amigo, b);
    if (b.dataset.aceitar) return aceitarAmizade(b.dataset.aceitar, b);
  });

  // publicações novas aparecem sem recarregar
  supa.channel("feed-comunidade")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, async (p) => {
      if (posts.some((x) => x.id === p.new.id)) return;
      if (!membros.has(p.new.autor_id)) membros = await carregarMembros();
      posts.unshift(p.new);
      posts = posts.slice(0, LIMITE_FEED);
      desenharFeed();
    })
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "posts" }, (p) => {
      posts = posts.filter((x) => x.id !== p.old.id);
      desenharFeed();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "amizades" }, () => atualizarAmizades())
    .subscribe();
}

iniciarFeed().catch(() => mostrarFora("Não foi possível abrir o feed agora. Atualize a página e tente de novo.", false));
