/* Feed da comunidade (estilo Instagram/Twitter): curtir, comentar, repostar, compartilhar e pedir amizade.
   Requer supabase/10-comunidade.sql e supabase/11-feed.sql. */
const LIMITE_POST = 500;
const LIMITE_COMENTARIO = 280;
const ICONES_POST = {
  coracao: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 21s-7.5-4.6-9.5-9.2C1.1 8.6 3 5 6.6 5c2.1 0 3.6 1.2 4.4 2.5C11.8 6.2 13.3 5 15.4 5 19 5 20.9 8.6 21.5 11.8 19.5 16.4 12 21 12 21z"/></svg>',
  coracaoCheio: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-4.6-9.5-9.2C1.1 8.6 3 5 6.6 5c2.1 0 3.6 1.2 4.4 2.5C11.8 6.2 13.3 5 15.4 5 19 5 20.9 8.6 21.5 11.8 19.5 16.4 12 21 12 21z"/></svg>',
  comentar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.5-4.6A8 8 0 1 1 21 12z"/></svg>',
  repostar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/></svg>',
  compartilhar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg>',
};

const $ = (id) => document.getElementById(id);
let eu = null;
let perfilEu = null;
let membros = new Map();
let amizades = { amigos: new Set(), enviados: new Map(), recebidos: new Map() };
let posts = [];
let comentarios = new Map();      // post id -> lista de comentários
let comentariosAbertos = new Set();
let fotoEscolhida = null;
let recarregarAgendado = null;

function avisar(texto) { const el = $("post-aviso"); el.textContent = texto; el.hidden = !texto; }

function botaoAmizade(autorId) {
  const sit = situacaoCom(amizades, eu.id, autorId);
  const m = membros.get(autorId) || {};
  if (sit === "eu" || sit === "amigo") return "";
  if (sit === "enviado") return '<span class="muted">Pedido enviado</span>';
  if (sit === "recebido") return `<button type="button" class="btn-pequeno btn-pequeno--vermelho" data-aceitar="${amizades.recebidos.get(autorId)}">Aceitar amizade</button>`;
  if (!m.apelido) return "";
  return `<button type="button" class="btn-pequeno" data-amigo="${esc(m.apelido)}">Adicionar amigo</button>`;
}

function estaComAmigo(autorId) {
  return amizades.amigos.has(autorId);
}

function listaComentarios(post) {
  const lista = comentarios.get(post.id);
  if (!lista) return '<p class="muted">Carregando comentários…</p>';
  const itens = lista.map((c) => {
    const m = membros.get(c.autor_id) || {};
    const pode = c.autor_id === eu.id || perfilEu.papel === "admin";
    return `<div class="comentario">
      <span class="comentario__nome">${esc(m.nome || "Membro")}</span>
      <span class="comentario__apelido">${m.apelido ? "@" + esc(m.apelido) : ""}</span>
      <p>${esc(c.texto)}</p>
      ${pode ? `<button type="button" class="btn-pequeno btn-pequeno--link" data-apagar-comentario="${c.id}" data-post="${post.id}">apagar</button>` : ""}
    </div>`;
  }).join("");
  return itens || '<p class="muted">Seja a primeira pessoa a comentar.</p>';
}

function cardPost(p) {
  const m = membros.get(p.autor_id) || {};
  const curtiu = p.eu_curti;
  const repostou = p.eu_repostei;
  const apagar = (p.autor_id === eu.id || perfilEu.papel === "admin")
    ? `<button type="button" class="btn-pequeno btn-pequeno--link" data-apagar="${p.id}">apagar publicação</button>` : "";
  const amigo = estaComAmigo(p.autor_id) && p.autor_id !== eu.id
    ? `<a class="btn-pequeno btn-pequeno--suave" href="chat.html">Conversar</a>` : "";
  const foto = p.imagem_url
    ? `<img class="post__foto" src="${esc(p.imagem_url)}" alt="Foto publicada por ${esc(m.apelido || "um membro")}" loading="lazy" decoding="async">` : "";
  const texto = p.texto ? `<p class="post__texto">${esc(p.texto)}</p>` : "";
  const aberto = comentariosAbertos.has(p.id);
  const selo = /ativo/i.test(m.funcao || "") ? ' <img class="selo-ativo" src="assets/img/martelo-foice.png" alt="Membro ativo" title="Membro ativo">' : "";

  return `<article class="card post" id="post-${p.id}" data-id="${p.id}">
    <header class="post__cab">
      <img class="av" src="${esc(m.foto || "assets/img/avatar.svg")}" alt="">
      <div class="post__quem">
        <strong>${esc(m.nome || "Membro")}${selo}</strong>
        <span class="apelido">${m.apelido ? "@" + esc(m.apelido) : ""} · ${dataHora(p.criado_em)}</span>
      </div>
      ${apagar}
    </header>
    ${texto}
    ${foto}
    <div class="post__acoes">
      <button type="button" class="acao${curtiu ? " ativo" : ""}" data-curtir="${p.id}" aria-pressed="${curtiu}" aria-label="Curtir">
        ${curtiu ? ICONES_POST.coracaoCheio : ICONES_POST.coracao}<span>${p.curtidas || ""}</span>
      </button>
      <button type="button" class="acao" data-comentarios="${p.id}" aria-expanded="${aberto}" aria-label="Comentar">
        ${ICONES_POST.comentar}<span>${p.comentarios || ""}</span>
      </button>
      <button type="button" class="acao${repostou ? " ativo" : ""}" data-repostar="${p.id}" aria-pressed="${repostou}" aria-label="Repostar">
        ${ICONES_POST.repostar}<span>${p.reposts || ""}</span>
      </button>
      <button type="button" class="acao" data-compartilhar="${p.id}" aria-label="Compartilhar">${ICONES_POST.compartilhar}</button>
      <span class="espaco"></span>
      ${amigo}${botaoAmizade(p.autor_id)}
    </div>
    <div class="post__comentarios" id="comentarios-${p.id}" ${aberto ? "" : "hidden"}>
      <div class="lista-comentarios">${aberto ? listaComentarios(p) : ""}</div>
      <form class="form-comentario" data-comentar="${p.id}">
        <input maxlength="${LIMITE_COMENTARIO}" placeholder="Escreva um comentário…" aria-label="Escreva um comentário">
        <button class="btn-pequeno" type="submit">Comentar</button>
      </form>
    </div>
  </article>`;
}

function desenharFeed() {
  const f = $("feed");
  f.innerHTML = posts.length
    ? posts.map(cardPost).join("")
    : '<p class="card muted">Ainda não há publicações. Seja a primeira pessoa a publicar!</p>';
  const hash = location.hash.match(/^#post-(\d+)$/);
  if (hash) { const el = $("post-" + hash[1]); if (el) el.scrollIntoView({ behavior: "smooth", block: "center" }); }
}

// ----- carregar -----
async function carregarFeed() {
  const { data, error } = await supa.rpc("feed_posts", { p_limite: 60 });
  if (error) return avisar("Não foi possível carregar o feed agora.");
  posts = data || [];
  desenharFeed();
}

function agendarRecarga() {
  clearTimeout(recarregarAgendado);
  recarregarAgendado = setTimeout(async () => {
    await carregarFeed();
    for (const id of comentariosAbertos) await carregarComentarios(id);
  }, 600);
}

async function carregarComentarios(postId) {
  const { data } = await supa.from("post_comentarios")
    .select("id,post_id,autor_id,texto,criado_em")
    .eq("post_id", postId)
    .order("criado_em", { ascending: true });
  comentarios.set(postId, data || []);
  const bloco = document.querySelector(`#comentarios-${postId} .lista-comentarios`);
  const post = posts.find((x) => x.id === postId);
  if (bloco && post) bloco.innerHTML = listaComentarios(post);
}

async function atualizarAmizades() {
  amizades = await carregarAmizades(eu.id);
  desenharFeed();
}

// ----- publicar -----
function atualizarContador() {
  $("post-contador").textContent = `${$("post-texto").value.length}/${LIMITE_POST}`;
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
    const { error } = await supa.from("posts").insert({ autor_id: eu.id, texto, imagem_url });
    if (error) throw new Error(error.message);
    $("post-texto").value = "";
    limparFoto();
    atualizarContador();
    await carregarFeed();
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

// ----- ações -----
async function alternarCurtida(postId, botao) {
  const post = posts.find((x) => x.id === postId);
  if (!post) return;
  botao.disabled = true;
  const euCurti = post.eu_curti;
  const { error } = euCurti
    ? await supa.from("post_curtidas").delete().eq("post_id", postId).eq("usuario_id", eu.id)
    : await supa.from("post_curtidas").insert({ post_id: postId, usuario_id: eu.id });
  botao.disabled = false;
  if (error) return avisar("Não foi possível curtir: " + error.message);
  post.eu_curti = !euCurti;
  post.curtidas = Math.max(0, (post.curtidas || 0) + (euCurti ? -1 : 1));
  desenharFeed();
}

async function alternarRepost(postId, botao) {
  const post = posts.find((x) => x.id === postId);
  if (!post) return;
  botao.disabled = true;
  const jaReposted = post.eu_repostei;
  const { error } = jaReposted
    ? await supa.from("post_reposts").delete().eq("post_id", postId).eq("usuario_id", eu.id)
    : await supa.from("post_reposts").insert({ post_id: postId, usuario_id: eu.id });
  botao.disabled = false;
  if (error) return avisar("Não foi possível repostar: " + error.message);
  post.eu_repostei = !jaReposted;
  post.reposts = Math.max(0, (post.reposts || 0) + (jaReposted ? -1 : 1));
  desenharFeed();
}

async function alternarComentarios(postId) {
  if (comentariosAbertos.has(postId)) comentariosAbertos.delete(postId);
  else { comentariosAbertos.add(postId); await carregarComentarios(postId); }
  desenharFeed();
}

async function enviarComentario(postId, campo, form) {
  const texto = campo.value.trim();
  if (!texto) return;
  if (texto.length > LIMITE_COMENTARIO) return avisar(`O comentário pode ter no máximo ${LIMITE_COMENTARIO} caracteres.`);
  const botao = form.querySelector("button");
  botao.disabled = true;
  const { error } = await supa.from("post_comentarios").insert({ post_id: postId, autor_id: eu.id, texto });
  botao.disabled = false;
  if (error) return avisar("Não foi possível comentar: " + error.message);
  campo.value = "";
  const post = posts.find((x) => x.id === postId);
  if (post) post.comentarios = (post.comentarios || 0) + 1;
  comentariosAbertos.add(postId);
  await carregarComentarios(postId);
  desenharFeed();
}

async function apagarComentario(id, postId) {
  if (!confirm("Apagar este comentário?")) return;
  const { error } = await supa.from("post_comentarios").delete().eq("id", id);
  if (error) return avisar("Não foi possível apagar: " + error.message);
  const post = posts.find((x) => x.id === postId);
  if (post) post.comentarios = Math.max(0, (post.comentarios || 0) - 1);
  await carregarComentarios(postId);
  desenharFeed();
}

async function compartilhar(postId) {
  const url = `${location.origin}${location.pathname}#post-${postId}`;
  const post = posts.find((x) => x.id === postId);
  const m = membros.get(post?.autor_id) || {};
  const titulo = `Publicação de @${m.apelido || "membro"} · Coletivo Lufã`;
  try {
    if (navigator.share) return await navigator.share({ title: titulo, url });
    await navigator.clipboard.writeText(url);
    avisar("Link da publicação copiado.");
  } catch (_) {
    avisar("Não foi possível compartilhar agora.");
  }
}

async function pedirAmizade(apelido, botao) {
  botao.disabled = true;
  const { data, error } = await supa.rpc("pedir_amizade", { p_apelido: apelido });
  if (error) { botao.disabled = false; return avisar(error.message); }
  await atualizarAmizades();
  const textos = {
    enviado: `Pedido de amizade enviado para @${apelido}.`,
    aceito_automatico: `@${apelido} já tinha pedido: agora vocês são amigos.`,
    ja_enviado: `Você já pediu amizade para @${apelido}.`,
    ja_amigos: "Vocês já são amigos.",
  };
  avisar(textos[data] || "");
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
function buscar() {
  const termo = $("buscar-apelido").value.trim().toLowerCase().replace(/^@/, "");
  const r = $("resultado-busca");
  if (!termo) { r.innerHTML = ""; return; }
  const achados = [...membros.values()].filter((m) => m.apelido && m.apelido.includes(termo) && m.id !== eu.id);
  if (!achados.length) { r.innerHTML = '<p class="muted">Ninguém com esse @apelido.</p>'; return; }
  r.innerHTML = achados.slice(0, 10).map((m) => `<div class="linha-autor" style="margin-bottom:10px">
      <img class="av" src="${esc(m.foto || "assets/img/avatar.svg")}" alt="">
      <div style="flex:1"><strong>${esc(m.nome || "Membro")}</strong><span class="apelido" style="display:block">@${esc(m.apelido)}</span></div>
      ${botaoAmizade(m.id) || (estaComAmigo(m.id) ? '<span class="muted">Amigos</span>' : "")}
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
    if (b.dataset.curtir) return alternarCurtida(Number(b.dataset.curtir), b);
    if (b.dataset.repostar) return alternarRepost(Number(b.dataset.repostar), b);
    if (b.dataset.comentarios) return alternarComentarios(Number(b.dataset.comentarios));
    if (b.dataset.compartilhar) return compartilhar(Number(b.dataset.compartilhar));
    if (b.dataset.amigo) return pedirAmizade(b.dataset.amigo, b);
    if (b.dataset.aceitar) return aceitarAmizade(b.dataset.aceitar, b);
    if (b.dataset.apagar) return apagarPost(b.dataset.apagar, b);
    if (b.dataset.apagarComentario) return apagarComentario(Number(b.dataset.apagarComentario), Number(b.dataset.post));
  });
  $("feed").addEventListener("submit", (e) => {
    const form = e.target.closest("form[data-comentar]");
    if (!form) return;
    e.preventDefault();
    enviarComentario(Number(form.dataset.comentar), form.querySelector("input"), form);
  });
  $("resultado-busca").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.amigo) return pedirAmizade(b.dataset.amigo, b);
    if (b.dataset.aceitar) return aceitarAmizade(b.dataset.aceitar, b);
  });
  window.addEventListener("hashchange", () => desenharFeed());

  // tempo real: publicações e curtidas/comentários de outras pessoas aparecem sem recarregar
  supa.channel("feed-comunidade")
    .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, agendarRecarga)
    .on("postgres_changes", { event: "*", schema: "public", table: "post_curtidas" }, agendarRecarga)
    .on("postgres_changes", { event: "*", schema: "public", table: "post_reposts" }, agendarRecarga)
    .on("postgres_changes", { event: "*", schema: "public", table: "post_comentarios" }, agendarRecarga)
    .on("postgres_changes", { event: "*", schema: "public", table: "amizades" }, () => atualizarAmizades())
    .subscribe();
}

iniciarFeed().catch(() => mostrarFora("Não foi possível abrir o feed agora. Atualize a página e tente de novo.", false));
