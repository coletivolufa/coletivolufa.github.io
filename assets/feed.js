/* Feed da comunidade: fotos e vídeos, hashtags, tendências, curtir, comentar, repostar e compartilhar.
   Requer supabase/10-comunidade.sql, 11-feed.sql e 12-midia-hashtags.sql. */
const LIMITE_POST = 500;
const LIMITE_COMENTARIO = 280;
const MAX_FOTO = 12 * 1024 * 1024;
const MAX_VIDEO = 50 * 1024 * 1024;
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
let comentarios = new Map();
let comentariosAbertos = new Set();
let filtroTag = null;
let fotoEscolhida = null;
let videoEscolhido = null;
let recarregarAgendado = null;
const fotosComentario = new Map();  // "post:pai" -> foto escolhida
const respostasAbertas = new Set(); // comentários com a caixa de resposta aberta

const avisar = (texto) => { const el = $("post-aviso"); el.textContent = texto; el.hidden = !texto; };
const normalizar = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "");
const extrairTags = (t) => [...new Set([...normalizar(t).matchAll(/#([a-z0-9_]{2,30})/gi)].map((m) => m[1].toLowerCase()))].slice(0, 10);

// texto com hashtags viraram links para filtrar o feed
function textoComTags(texto) {
  return esc(texto).replace(/#([a-z0-9_]{2,30})/gi, (_, t) =>
    `<a href="#" class="tag-link" data-tag="${t.toLowerCase()}">#${t}</a>`);
}

function botaoAmizade(autorId) {
  const sit = situacaoCom(amizades, eu.id, autorId);
  const m = membros.get(autorId) || {};
  if (sit === "eu" || sit === "amigo") return "";
  if (sit === "enviado") return '<span class="muted">Pedido enviado</span>';
  if (sit === "recebido") return `<button type="button" class="btn-pequeno btn-pequeno--vermelho" data-aceitar="${amizades.recebidos.get(autorId)}">Aceitar amizade</button>`;
  if (!m.apelido) return "";
  return `<button type="button" class="btn-pequeno" data-amigo="${esc(m.apelido)}">Adicionar amigo</button>`;
}

function formComentario(postId, paiId) {
  const chave = `${postId}:${paiId || 0}`;
  return `<form class="form-comentario" data-comentar="${postId}" data-pai="${paiId || ""}">
    <input maxlength="${LIMITE_COMENTARIO}" placeholder="${paiId ? "Escreva uma resposta…" : "Escreva um comentário…"}" aria-label="${paiId ? "Escreva uma resposta" : "Escreva um comentário"}">
    <label class="btn-foto-pequeno" title="Enviar foto">📷<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" data-foto-de="${chave}" aria-label="Enviar foto no comentário"></label>
    <span class="foto-anexada">${fotosComentario.has(chave) ? "foto anexada" : ""}</span>
    <button class="btn-pequeno" type="submit">Enviar</button>
  </form>`;
}

function htmlComentario(c, post, nivel) {
  const m = membros.get(c.autor_id) || {};
  const pode = c.autor_id === eu.id || perfilEu.papel === "admin";
  const aberta = respostasAbertas.has(c.id);
  return `<div class="comentario${nivel ? " comentario--resposta" : ""}">
    <div class="comentario__topo">
      <img class="av-mini perfil-clicavel" data-perfil="${c.autor_id}" src="${esc(m.foto || "assets/img/avatar.svg")}" alt="">
      <span class="comentario__nome perfil-clicavel" data-perfil="${c.autor_id}">${esc(m.nome || "Membro")}</span>
      <span class="comentario__apelido">${m.apelido ? "@" + esc(m.apelido) : ""} · ${dataHora(c.criado_em)}</span>
    </div>
    ${c.texto ? `<p>${textoComTags(c.texto)}</p>` : ""}
    ${c.imagem_url ? `<img class="comentario__foto" src="${esc(c.imagem_url)}" alt="Foto enviada no comentário" loading="lazy" decoding="async">` : ""}
    <div class="comentario__acoes">
      <button type="button" class="btn-pequeno btn-pequeno--link" data-responder="${c.id}">${aberta ? "fechar resposta" : "responder"}</button>
      ${pode ? `<button type="button" class="btn-pequeno btn-pequeno--link" data-apagar-comentario="${c.id}" data-post="${post.id}">apagar</button>` : ""}
    </div>
    ${aberta ? formComentario(post.id, c.id) : ""}
  </div>`;
}

function listaComentarios(post) {
  const lista = comentarios.get(post.id);
  if (!lista) return '<p class="muted">Carregando comentários…</p>';
  if (!lista.length) return '<p class="muted">Seja a primeira pessoa a comentar.</p>';
  const filhos = new Map();
  lista.filter((c) => c.parent_id).forEach((c) => {
    if (!filhos.has(c.parent_id)) filhos.set(c.parent_id, []);
    filhos.get(c.parent_id).push(c);
  });
  const descendentes = (id) => (filhos.get(id) || []).flatMap((f) => [f, ...descendentes(f.id)]);
  return lista.filter((c) => !c.parent_id)
    .map((r) => htmlComentario(r, post, 0) + descendentes(r.id).map((d) => htmlComentario(d, post, 1)).join(""))
    .join("");
}

function midiaHTML(p, m) {
  if (p.video_url) return `<video class="post__midia" src="${esc(p.video_url)}" controls playsinline preload="metadata"></video>`;
  if (p.imagem_url) return `<img class="post__midia" src="${esc(p.imagem_url)}" alt="Foto publicada por ${esc(m.apelido || "um membro")}" loading="lazy" decoding="async">`;
  return "";
}

function cardPost(p) {
  const m = membros.get(p.autor_id) || {};
  const apagar = (p.autor_id === eu.id || perfilEu.papel === "admin")
    ? `<button type="button" class="btn-pequeno btn-pequeno--link" data-apagar="${p.id}">apagar publicação</button>` : "";
  const amigo = amizades.amigos.has(p.autor_id) && p.autor_id !== eu.id
    ? '<a class="btn-pequeno btn-pequeno--suave" href="chat.html">Conversar</a>' : "";
  const aberto = comentariosAbertos.has(p.id);
  const selo = /ativo/i.test(m.funcao || "") ? ' <img class="selo-ativo" src="assets/img/martelo-foice.png" alt="Membro ativo" title="Membro ativo">' : "";
  const texto = p.texto ? `<p class="post__texto">${textoComTags(p.texto)}</p>` : "";

  return `<article class="card post" id="post-${p.id}" data-id="${p.id}">
    <header class="post__cab">
      <img class="av perfil-clicavel" data-perfil="${p.autor_id}" src="${esc(m.foto || "assets/img/avatar.svg")}" alt="Ver perfil de ${esc(m.nome || "membro")}">
      <div class="post__quem">
        <strong class="perfil-clicavel" data-perfil="${p.autor_id}">${esc(m.nome || "Membro")}${selo}</strong>
        <span class="apelido">${m.apelido ? "@" + esc(m.apelido) : ""} · ${dataHora(p.criado_em)}</span>
      </div>
      ${apagar}
    </header>
    ${texto}
    ${midiaHTML(p, m)}
    <div class="post__acoes">
      <button type="button" class="acao${p.eu_curti ? " ativo" : ""}" data-curtir="${p.id}" aria-pressed="${!!p.eu_curti}" aria-label="Curtir">
        ${p.eu_curti ? ICONES_POST.coracaoCheio : ICONES_POST.coracao}<span>${p.curtidas || ""}</span>
      </button>
      <button type="button" class="acao" data-comentarios="${p.id}" aria-expanded="${aberto}" aria-label="Comentar">
        ${ICONES_POST.comentar}<span>${p.comentarios || ""}</span>
      </button>
      <button type="button" class="acao${p.eu_repostei ? " ativo" : ""}" data-repostar="${p.id}" aria-pressed="${!!p.eu_repostei}" aria-label="Repostar">
        ${ICONES_POST.repostar}<span>${p.reposts || ""}</span>
      </button>
      <button type="button" class="acao" data-compartilhar="${p.id}" aria-label="Compartilhar">${ICONES_POST.compartilhar}</button>
      <span class="espaco"></span>
      ${amigo}${botaoAmizade(p.autor_id)}
    </div>
    <div class="post__comentarios" id="comentarios-${p.id}" ${aberto ? "" : "hidden"}>
      <div class="lista-comentarios">${aberto ? listaComentarios(p) : ""}</div>
      ${formComentario(p.id, null)}
    </div>
  </article>`;
}

const observadorCartoes = "IntersectionObserver" in window
  ? new IntersectionObserver((entradas) => {
      entradas.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("visivel"); observadorCartoes.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -40px 0px", threshold: 0.05 })
  : null;

function revelarCartoes() {
  document.querySelectorAll("#feed .post.reveal:not(.visivel)").forEach((el) => {
    if (observadorCartoes) observadorCartoes.observe(el); else el.classList.add("visivel");
  });
}

// pequeno pulo no coração/repost quando a pessoa age
function pulsar(seletor) {
  const el = document.querySelector(seletor);
  if (!el) return;
  el.classList.remove("pulsar");
  void el.offsetWidth;
  el.classList.add("pulsar");
  setTimeout(() => el.classList.remove("pulsar"), 450);
}

function desenharFeed() {
  $("feed").innerHTML = posts.length
    ? posts.map(cardPost).join("")
    : `<p class="card muted">${filtroTag ? `Ainda não há publicações com #${esc(filtroTag)}.` : "Ainda não há publicações. Seja a primeira pessoa a publicar!"}</p>`;
  $("feed").querySelectorAll(".post").forEach((el) => el.classList.add("reveal"));
  revelarCartoes();
  $("filtro-ativo").hidden = !filtroTag;
  $("filtro-texto").textContent = filtroTag ? `Mostrando publicações com #${filtroTag}` : "";
  const hash = location.hash.match(/^#post-(\d+)$/);
  if (hash) { const el = $("post-" + hash[1]); if (el) el.scrollIntoView({ behavior: "smooth", block: "center" }); }
}

// ----- tendências -----
async function carregarTendencias() {
  const { data } = await supa.rpc("hashtags_em_alta", { p_limite: 5, p_dias: 7 });
  const lista = data || [];
  $("tendencias").innerHTML = lista.length
    ? lista.map((t, i) => `<li><button type="button" class="tendencia" data-tag="${esc(t.nome)}">
        <span class="tendencia__pos">${i + 1}</span>
        <span class="tendencia__tag">#${esc(t.nome)}</span>
        <span class="muted">${t.publicacoes} ${t.publicacoes === 1 ? "publicação" : "publicações"}</span>
      </button></li>`).join("")
    : '<li class="muted">Ainda não há hashtags. Use # nas suas publicações para criar tendências!</li>';
}

// ----- feed -----
async function carregarFeed() {
  const { data, error } = await supa.rpc("feed_posts", { p_limite: 60, p_hashtag: filtroTag });
  if (error) return avisar("Não foi possível carregar o feed agora.");
  posts = data || [];
  desenharFeed();
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

function agendarRecarga() {
  clearTimeout(recarregarAgendado);
  recarregarAgendado = setTimeout(async () => {
    await carregarFeed();
    await carregarTendencias();
    for (const id of comentariosAbertos) await carregarComentarios(id);
  }, 600);
}

async function atualizarAmizades() {
  amizades = await carregarAmizades(eu.id);
  desenharFeed();
}

function filtrarPorTag(tag) {
  filtroTag = tag ? tag.toLowerCase() : null;
  history.replaceState(null, "", filtroTag ? `?tag=${filtroTag}` : location.pathname);
  carregarFeed();
}

// ----- publicar -----
function atualizarContador() { $("post-contador").textContent = `${$("post-texto").value.length}/${LIMITE_POST}`; }

async function enviarArquivo(arquivo, eImagem) {
  const caminho = `${eu.id}/${Date.now()}.${eImagem ? "jpg" : (arquivo.name.split(".").pop() || "mp4").toLowerCase()}`;
  if (eImagem) return enviarFotoComunidade(arquivo, eu.id);
  const { error } = await supa.storage.from("comunidade").upload(caminho, arquivo, { contentType: arquivo.type, upsert: false });
  if (error) throw new Error(error.message);
  return supa.storage.from("comunidade").getPublicUrl(caminho).data.publicUrl;
}

async function publicar(e) {
  e.preventDefault();
  const texto = $("post-texto").value.trim();
  if (!texto && !fotoEscolhida && !videoEscolhido) return avisar("Escreva algo, escolha uma foto ou um vídeo.");
  if (texto.length > LIMITE_POST) return avisar(`A publicação pode ter no máximo ${LIMITE_POST} caracteres.`);
  const botao = $("post-publicar");
  botao.disabled = true;
  avisar("");
  try {
    let imagem_url = null;
    let video_url = null;
    if (fotoEscolhida) { botao.textContent = "Enviando foto…"; imagem_url = await enviarArquivo(fotoEscolhida, true); }
    if (videoEscolhido) { botao.textContent = "Enviando vídeo…"; video_url = await enviarArquivo(videoEscolhido, false); }
    botao.textContent = "Publicando…";
    const { error } = await supa.rpc("criar_post", { p_texto: texto, p_imagem_url: imagem_url, p_video_url: video_url, p_tags: extrairTags(texto) });
    if (error) throw new Error(error.message);
    $("post-texto").value = "";
    limparMidia();
    atualizarContador();
    await carregarFeed();
    await carregarTendencias();
  } catch (err) {
    avisar("Não foi possível publicar: " + err.message);
  } finally {
    botao.disabled = false;
    botao.textContent = "Publicar";
  }
}

function escolherMidia(e) {
  const f = e.target.files[0];
  e.target.value = "";
  if (!f) return;
  limparMidia();
  if (f.type.startsWith("video/")) {
    if (f.size > MAX_VIDEO) return avisar("O vídeo passa de 50 MB. Escolha um menor.");
    videoEscolhido = f;
    $("post-previa-video").src = URL.createObjectURL(f);
    $("post-previa-video").hidden = false;
  } else if (f.type.startsWith("image/")) {
    if (f.size > MAX_FOTO) return avisar("A foto é muito grande. Escolha uma menor.");
    fotoEscolhida = f;
    $("post-previa-img").src = URL.createObjectURL(f);
    $("post-previa-img").hidden = false;
  } else {
    return avisar("Escolha uma foto ou um vídeo.");
  }
  $("post-previa").hidden = false;
}

function limparMidia() {
  fotoEscolhida = null;
  videoEscolhido = null;
  $("post-previa").hidden = true;
  $("post-previa-img").hidden = true;
  $("post-previa-video").hidden = true;
  $("post-previa-img").removeAttribute("src");
  $("post-previa-video").removeAttribute("src");
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
  if (!euCurti) pulsar(`[data-curtir="${postId}"]`);
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
  if (!jaReposted) pulsar(`[data-repostar="${postId}"]`);
}

async function alternarComentarios(postId) {
  if (comentariosAbertos.has(postId)) comentariosAbertos.delete(postId);
  else { comentariosAbertos.add(postId); await carregarComentarios(postId); }
  desenharFeed();
}

async function enviarComentario(form) {
  const postId = Number(form.dataset.comentar);
  const paiId = form.dataset.pai ? Number(form.dataset.pai) : null;
  const chave = `${postId}:${paiId || 0}`;
  const texto = form.querySelector("input").value.trim();
  const foto = fotosComentario.get(chave) || null;
  if (!texto && !foto) return avisar("Escreva um comentário ou escolha uma foto.");
  if (texto.length > LIMITE_COMENTARIO) return avisar(`O comentário pode ter no máximo ${LIMITE_COMENTARIO} caracteres.`);
  const botao = form.querySelector("button");
  botao.disabled = true;
  try {
    const imagem_url = foto ? await enviarFotoComunidade(foto, eu.id) : null;
    const { error } = await supa.from("post_comentarios").insert({ post_id: postId, autor_id: eu.id, texto, parent_id: paiId, imagem_url });
    if (error) throw new Error(error.message);
  } catch (err) {
    botao.disabled = false;
    return avisar("Não foi possível comentar: " + err.message);
  }
  fotosComentario.delete(chave);
  if (paiId) respostasAbertas.delete(paiId);
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
  try {
    if (navigator.share) return await navigator.share({ title: `Publicação de @${m.apelido || "membro"} · Coletivo Lufã`, url });
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
  await carregarTendencias();
}

async function iniciarFeed() {
  const entrou = await entrarComunidade();
  if (!entrou) return;
  eu = entrou.eu;
  perfilEu = entrou.perfil;
  montarAbas("feed");
  $("minha-foto").src = perfilEu.foto || "assets/img/avatar.svg";
  $("meu-apelido").textContent = "@" + perfilEu.apelido;
  filtroTag = new URLSearchParams(location.search).get("tag");
  filtroTag = filtroTag ? filtroTag.toLowerCase() : null;

  $("feed").innerHTML = '<div class="carregando"></div><div class="carregando"></div>';
  membros = await carregarMembros();
  amizades = await carregarAmizades(eu.id);
  await carregarTendencias();
  await carregarFeed();

  $("post-texto").addEventListener("input", atualizarContador);
  $("form-post").addEventListener("submit", publicar);
  $("post-foto").addEventListener("change", escolherMidia);
  $("post-tirar").addEventListener("click", limparMidia);
  $("limpar-filtro").addEventListener("click", () => filtrarPorTag(null));

  $("tendencias").addEventListener("click", (e) => {
    const b = e.target.closest("[data-tag]");
    if (b) filtrarPorTag(b.dataset.tag);
  });
  $("feed").addEventListener("click", (e) => {
    const tag = e.target.closest("[data-tag]");
    if (tag && tag.classList.contains("tag-link")) { e.preventDefault(); return filtrarPorTag(tag.dataset.tag); }
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.responder) {
      const id = Number(b.dataset.responder);
      if (respostasAbertas.has(id)) respostasAbertas.delete(id); else respostasAbertas.add(id);
      return desenharFeed();
    }
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
    enviarComentario(form);
  });
  $("feed").addEventListener("change", (e) => {
    const input = e.target;
    if (!input.dataset.fotoDe) return;
    const f = input.files[0];
    input.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) return avisar("Escolha uma imagem para o comentário.");
    fotosComentario.set(input.dataset.fotoDe, f);
    const aviso = input.closest("form").querySelector(".foto-anexada");
    if (aviso) aviso.textContent = "foto anexada";
  });
  window.addEventListener("hashchange", () => desenharFeed());

  $("trocar-apelido").addEventListener("click", () => {
    $("novo-apelido").value = perfilEu.apelido || "";
    $("apelido-aviso").hidden = true;
    $("form-apelido").hidden = false;
    $("novo-apelido").focus();
  });
  $("cancelar-apelido").addEventListener("click", () => { $("form-apelido").hidden = true; });
  $("editar-dados").addEventListener("click", () => {
    $("campos-dados").innerHTML = camposPerfilHTML(perfilEu);
    $("dados-aviso").hidden = true;
    $("form-dados").hidden = false;
  });
  $("cancelar-dados").addEventListener("click", () => { $("form-dados").hidden = true; });
  $("form-dados").addEventListener("submit", async (e) => {
    e.preventDefault();
    const aviso = $("dados-aviso");
    const botao = e.target.querySelector("button[type=submit]");
    botao.disabled = true;
    const dados = lerCamposPerfil();
    const { error } = await supa.from("perfis").update(dados).eq("id", eu.id);
    botao.disabled = false;
    if (error) { aviso.hidden = false; aviso.textContent = "Não foi possível salvar: " + error.message; return; }
    Object.assign(perfilEu, dados);
    $("form-dados").hidden = true;
    avisar("Seus dados foram salvos.");
  });
  $("form-apelido").addEventListener("submit", async (e) => {
    e.preventDefault();
    const aviso = $("apelido-aviso");
    const botao = e.target.querySelector("button[type=submit]");
    botao.disabled = true;
    const r = await trocarApelido(eu, perfilEu, $("novo-apelido").value);
    botao.disabled = false;
    if (!r.ok) { aviso.hidden = false; aviso.textContent = r.erro; return; }
    $("meu-apelido").textContent = "@" + r.apelido;
    $("form-apelido").hidden = true;
    membros = await carregarMembros();
    desenharFeed();
    avisar("Seu @arroba foi alterado.");
  });

  supa.channel("feed-comunidade")
    .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, agendarRecarga)
    .on("postgres_changes", { event: "*", schema: "public", table: "post_curtidas" }, agendarRecarga)
    .on("postgres_changes", { event: "*", schema: "public", table: "post_reposts" }, agendarRecarga)
    .on("postgres_changes", { event: "*", schema: "public", table: "post_comentarios" }, agendarRecarga)
    .on("postgres_changes", { event: "*", schema: "public", table: "amizades" }, () => atualizarAmizades())
    .subscribe();
}

iniciarFeed().catch(() => mostrarFora("Não foi possível abrir o feed agora. Atualize a página e tente de novo.", false));
