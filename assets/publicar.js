/* Área dos membros: publica artigos e edita membros gravando no repositório pelo GitHub */

const API = "https://api.github.com";
const CHAVE_SALVA = "lufa-chave";
let chave = null;
let editandoArtigo = null;   // slug do artigo em edição
let editandoMembro = null;   // índice do membro em edição
let fotoNova = null;         // base64 (sem prefixo) da foto escolhida

const $ = (id) => document.getElementById(id);
const caminho = (rel) => (LUFA.pasta ? `${LUFA.pasta}/${rel}` : rel);

// ---------- mensagens ----------
function avisar(texto, tipo = "") {
  $("mensagem").innerHTML = texto ? `<div class="aviso ${tipo ? "aviso--" + tipo : ""}">${texto}</div>` : "";
  if (texto) $("mensagem").scrollIntoView({ behavior: "smooth", block: "center" });
}

// ---------- base64 com acentos ----------
function paraBase64(texto) {
  const bytes = new TextEncoder().encode(texto);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
function deBase64(b64) {
  const bin = atob(b64.replace(/\n/g, ""));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

// ---------- GitHub ----------
async function api(metodo, rota, corpo) {
  const r = await fetch(API + rota, {
    method: metodo,
    headers: {
      Authorization: "Bearer " + chave,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(corpo ? { "Content-Type": "application/json" } : {}),
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
    cache: "no-store",
  });
  if (r.status === 404) return null;
  const dados = r.status === 204 ? {} : await r.json().catch(() => ({}));
  if (!r.ok) {
    const erro = new Error(dados.message || "Erro " + r.status);
    erro.status = r.status;
    throw erro;
  }
  return dados;
}
const rotaArquivo = (rel) => `/repos/${LUFA.dono}/${LUFA.repositorio}/contents/${caminho(rel).split("/").map(encodeURIComponent).join("/")}`;

async function lerArquivo(rel) {
  const d = await api("GET", rotaArquivo(rel) + "?ref=" + encodeURIComponent(LUFA.branch) + "&t=" + Date.now());
  return d ? { texto: deBase64(d.content), sha: d.sha } : null;
}
async function lerLista(rel) {
  const a = await lerArquivo(rel);
  return { lista: a ? JSON.parse(a.texto) : [], sha: a?.sha };
}
async function gravar(rel, conteudoBase64, mensagem, sha) {
  return api("PUT", rotaArquivo(rel), { message: mensagem, content: conteudoBase64, branch: LUFA.branch, ...(sha ? { sha } : {}) });
}
async function gravarJSON(rel, dados, mensagem, sha) {
  return gravar(rel, paraBase64(JSON.stringify(dados, null, 2) + "\n"), mensagem, sha);
}
async function apagar(rel, mensagem) {
  const d = await api("GET", rotaArquivo(rel) + "?ref=" + encodeURIComponent(LUFA.branch));
  if (!d) return;
  return api("DELETE", rotaArquivo(rel), { message: mensagem, sha: d.sha, branch: LUFA.branch });
}
// Lê, altera e grava uma lista JSON; tenta de novo se alguém gravou ao mesmo tempo
async function alterarLista(rel, alterar, mensagem) {
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const { lista, sha } = await lerLista(rel);
    const nova = alterar(lista);
    try { await gravarJSON(rel, nova, mensagem, sha); return nova; }
    catch (e) { if (e.status !== 409 && e.status !== 422) throw e; }
  }
  throw new Error("Outra pessoa está editando ao mesmo tempo. Tente de novo.");
}

function explicarErro(e) {
  if (e.status === 401) return "A chave de acesso é inválida ou expirou. Saia e entre de novo com uma chave nova.";
  if (e.status === 403) return "Sua chave não tem permissão para gravar. Confira se ela tem <em>Contents: Read and write</em> no repositório do coletivo.";
  if (e instanceof TypeError) return "Sem conexão com o GitHub. Verifique a internet e tente de novo.";
  return esc(e.message || String(e));
}

// ---------- entrar / sair ----------
async function entrar(novaChave, lembrar) {
  chave = novaChave.trim();
  avisar("Verificando acesso…");
  try {
    const repo = await api("GET", `/repos/${LUFA.dono}/${LUFA.repositorio}`);
    if (!repo) throw Object.assign(new Error("Repositório não encontrado com essa chave."), { status: 403 });
    if (!repo.permissions?.push) throw Object.assign(new Error("sem permissão"), { status: 403 });
    try {
      (lembrar ? localStorage : sessionStorage).setItem(CHAVE_SALVA, chave);
      (lembrar ? sessionStorage : localStorage).removeItem(CHAVE_SALVA);
    } catch (_) { /* navegador sem armazenamento: segue só nesta aba */ }
    $("tela-entrar").hidden = true;
    $("tela-painel").hidden = false;
    avisar("");
    carregarAutores();
  } catch (e) {
    chave = null;
    avisar(explicarErro(e), "erro");
  }
}
function sair() {
  try { localStorage.removeItem(CHAVE_SALVA); sessionStorage.removeItem(CHAVE_SALVA); } catch (_) {}
  chave = null;
  location.reload();
}

// ---------- abas ----------
function abrirAba(nome) {
  document.querySelectorAll("[data-aba]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.aba === nome)));
  document.querySelectorAll("[data-painel]").forEach((p) => (p.hidden = p.dataset.painel !== nome));
  if (nome === "publicados") carregarPublicados();
  if (nome === "membros") carregarMembros();
  if (nome === "formacao") carregarFormacao();
}

// ---------- artigos ----------
function criarSlug(texto) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || "artigo";
}

async function carregarAutores() {
  try {
    const { lista } = await lerLista("data/membros.json");
    $("lista-autores").innerHTML = lista.filter((m) => !m.exemplo).map((m) => `<option value="${esc(m.nome)}">`).join("");
  } catch (_) {}
}

async function publicarArtigo(ev) {
  ev.preventDefault();
  const titulo = $("a-titulo").value.trim();
  const autor = $("a-autor").value.trim();
  const texto = $("a-texto").value.trim();
  if (!titulo || !autor || !texto) return;
  const botao = $("botao-publicar");
  botao.disabled = true;
  avisar("Publicando…");
  try {
    const { lista } = await lerLista("data/artigos.json");
    let slug = editandoArtigo;
    let dataPub = new Date().toISOString();
    let sha;
    if (slug) {
      const atual = await lerArquivo(`artigos/${slug}.json`);
      sha = atual?.sha;
      if (atual) dataPub = JSON.parse(atual.texto).data || dataPub;
    } else {
      const base = criarSlug(titulo);
      slug = base;
      for (let n = 2; lista.some((a) => a.slug === slug); n++) slug = `${base}-${n}`;
    }
    const artigo = { slug, titulo, autor, data: dataPub, texto };
    if (editandoArtigo) artigo.editado = new Date().toISOString();
    await gravarJSON(`artigos/${slug}.json`, artigo, `${editandoArtigo ? "Edita" : "Publica"} artigo: ${titulo}`, sha);
    const entrada = { slug, titulo, autor, data: dataPub, resumo: resumir(texto) };
    await alterarLista("data/artigos.json",
      (l) => [entrada, ...l.filter((a) => a.slug !== slug)].sort((a, b) => (b.data || "").localeCompare(a.data || "")),
      `Atualiza lista de artigos: ${titulo}`);
    avisar(`Artigo ${editandoArtigo ? "atualizado" : "publicado"}! Ele aparece no site em cerca de 1 a 2 minutos:
      <a href="artigos.html?a=${encodeURIComponent(slug)}">ver artigo</a>.`, "ok");
    limparFormArtigo();
  } catch (e) {
    avisar(explicarErro(e), "erro");
  } finally {
    botao.disabled = false;
  }
}

function limparFormArtigo() {
  editandoArtigo = null;
  $("form-artigo").reset();
  $("previa").hidden = true;
  $("titulo-form-artigo").textContent = "Novo artigo";
  $("botao-publicar").textContent = "Publicar";
  $("botao-cancelar-edicao").hidden = true;
}

async function carregarPublicados() {
  const ul = $("lista-publicados");
  ul.innerHTML = "<li>Carregando…</li>";
  try {
    const { lista } = await lerLista("data/artigos.json");
    if (!lista.length) { ul.innerHTML = "<li>Nenhum artigo publicado ainda.</li>"; return; }
    ul.innerHTML = lista.map((a) => `
      <li>
        <div><strong>${esc(a.titulo)}</strong><span class="meta">Por ${esc(a.autor)} · ${esc(dataPorExtenso(a.data))}</span></div>
        <button type="button" data-editar="${esc(a.slug)}">Editar</button>
        <button type="button" data-apagar="${esc(a.slug)}" data-titulo="${esc(a.titulo)}">Apagar</button>
      </li>`).join("");
  } catch (e) {
    ul.innerHTML = `<li>${explicarErro(e)}</li>`;
  }
}

async function editarArtigo(slug) {
  avisar("Abrindo artigo…");
  try {
    const arq = await lerArquivo(`artigos/${slug}.json`);
    if (!arq) throw new Error("Arquivo do artigo não encontrado.");
    const a = JSON.parse(arq.texto);
    editandoArtigo = slug;
    $("a-titulo").value = a.titulo;
    $("a-autor").value = a.autor;
    $("a-texto").value = a.texto;
    $("titulo-form-artigo").textContent = "Editando artigo";
    $("botao-publicar").textContent = "Salvar alterações";
    $("botao-cancelar-edicao").hidden = false;
    abrirAba("novo");
    avisar("");
  } catch (e) { avisar(explicarErro(e), "erro"); }
}

async function apagarArtigo(slug, titulo) {
  if (!confirm(`Apagar o artigo "${titulo}"? Isso não pode ser desfeito pelo site.`)) return;
  avisar("Apagando…");
  try {
    await alterarLista("data/artigos.json", (l) => l.filter((a) => a.slug !== slug), `Remove artigo da lista: ${titulo}`);
    await apagar(`artigos/${slug}.json`, `Apaga artigo: ${titulo}`);
    avisar("Artigo apagado. O site atualiza em 1 a 2 minutos.", "ok");
    carregarPublicados();
  } catch (e) { avisar(explicarErro(e), "erro"); }
}

// ---------- membros ----------
async function carregarMembros() {
  const ul = $("lista-membros-admin");
  ul.innerHTML = "<li>Carregando…</li>";
  try {
    const { lista } = await lerLista("data/membros.json");
    if (!lista.length) { ul.innerHTML = "<li>Nenhum membro cadastrado.</li>"; return; }
    ul.innerHTML = lista.map((m, i) => `
      <li>
        <img src="${esc(m.foto || "assets/img/avatar.svg")}" alt="" onerror="this.src='assets/img/avatar.svg'">
        <div><strong>${esc(m.nome)}${m.exemplo ? " (exemplo)" : ""}</strong>
          <span class="meta">${m.arroba ? "@" + esc(String(m.arroba).replace(/^@/, "")) : "sem @"} · ${esc(m.rede || "instagram")}</span></div>
        <button type="button" data-subir="${i}" ${i === 0 ? "disabled" : ""} aria-label="Mover para cima">↑</button>
        <button type="button" data-editar-membro="${i}">Editar</button>
        <button type="button" data-remover-membro="${i}">Remover</button>
      </li>`).join("");
    ul.dataset.lista = JSON.stringify(lista);
  } catch (e) {
    ul.innerHTML = `<li>${explicarErro(e)}</li>`;
  }
}

function recortarFoto(arquivo) {
  return new Promise((ok, falha) => {
    const img = new Image();
    img.onload = () => {
      const lado = Math.min(img.width, img.height);
      const c = document.createElement("canvas");
      c.width = c.height = 480;
      c.getContext("2d").drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, 480, 480);
      URL.revokeObjectURL(img.src);
      ok(c.toDataURL("image/jpeg", 0.86));
    };
    img.onerror = () => falha(new Error("Não foi possível ler essa imagem. Tente uma foto JPG ou PNG."));
    img.src = URL.createObjectURL(arquivo);
  });
}

async function salvarMembro(ev) {
  ev.preventDefault();
  const nome = $("m-nome").value.trim();
  if (!nome) return;
  const botao = $("botao-membro");
  botao.disabled = true;
  avisar("Salvando membro…");
  try {
    const membro = {
      nome,
      arroba: $("m-arroba").value.trim().replace(/^@/, ""),
      rede: $("m-rede").value,
      funcao: $("m-funcao").value.trim(),
      foto: "",
    };
    const indice = editandoMembro;
    if (fotoNova) {
      const arquivo = `membros/${criarSlug(nome)}-${Date.now()}.jpg`;
      await gravar(arquivo, fotoNova, `Foto do membro: ${nome}`);
      membro.foto = arquivo;
    }
    await alterarLista("data/membros.json", (lista) => {
      if (indice !== null && lista[indice]) {
        if (!membro.foto) membro.foto = lista[indice].foto || "";
        // vaga de exemplo preenchida ganha matrícula nova; membro real mantém a dele
        membro.matricula = lista[indice].matricula || proximaMatricula(lista);
        lista[indice] = membro;
      } else {
        membro.matricula = proximaMatricula(lista);
        lista.push(membro);
      }
      return lista;
    }, `${indice !== null ? "Edita" : "Adiciona"} membro: ${nome}`);
    avisar(`${esc(nome)} salvo! A página inicial atualiza em 1 a 2 minutos.`, "ok");
    limparFormMembro();
    carregarMembros();
    carregarAutores();
  } catch (e) {
    avisar(explicarErro(e), "erro");
  } finally {
    botao.disabled = false;
  }
}

// matrícula: "001" (primeira turma do coletivo) + ordem de entrada, com 3 dígitos
function proximaMatricula(lista) {
  const ultimo = Math.max(0, ...lista.map((m) => parseInt(String(m.matricula || "").slice(3), 10) || 0));
  return "001" + String(ultimo + 1).padStart(3, "0");
}

function limparFormMembro() {
  editandoMembro = null;
  fotoNova = null;
  $("form-membro").reset();
  $("m-foto-previa").hidden = true;
  $("titulo-form-membro").textContent = "Adicionar membro";
  $("botao-cancelar-membro").hidden = true;
}

function editarMembro(i) {
  const lista = JSON.parse($("lista-membros-admin").dataset.lista || "[]");
  const m = lista[i];
  if (!m) return;
  editandoMembro = i;
  fotoNova = null;
  $("m-nome").value = m.exemplo ? "" : m.nome;
  $("m-arroba").value = m.exemplo ? "" : m.arroba || "";
  $("m-rede").value = m.rede || "instagram";
  $("m-funcao").value = m.funcao || "";
  $("m-foto").value = "";
  $("m-foto-previa").src = m.foto || "assets/img/avatar.svg";
  $("m-foto-previa").hidden = false;
  $("titulo-form-membro").textContent = m.exemplo ? "Preencher vaga de membro" : `Editando: ${m.nome}`;
  $("botao-cancelar-membro").hidden = false;
  $("form-membro").scrollIntoView({ behavior: "smooth", block: "start" });
}

async function removerMembro(i) {
  const lista = JSON.parse($("lista-membros-admin").dataset.lista || "[]");
  const m = lista[i];
  if (!m || !confirm(`Remover ${m.nome} da lista de membros?`)) return;
  avisar("Removendo…");
  try {
    await alterarLista("data/membros.json", (l) => l.filter((x, j) => !(j === i && x.nome === m.nome)), `Remove membro: ${m.nome}`);
    if (m.foto && m.foto.startsWith("membros/")) await apagar(m.foto, `Apaga foto de ${m.nome}`).catch(() => {});
    avisar("Membro removido.", "ok");
    carregarMembros();
  } catch (e) { avisar(explicarErro(e), "erro"); }
}

async function subirMembro(i) {
  try {
    await alterarLista("data/membros.json", (l) => { if (i > 0 && l[i]) [l[i - 1], l[i]] = [l[i], l[i - 1]]; return l; }, "Reordena membros");
    carregarMembros();
  } catch (e) { avisar(explicarErro(e), "erro"); }
}


// ---------- formação (séries e episódios) ----------
let formacao = null, editandoEp = null, capaEp = null;
async function carregarFormacao() {
  const ul = $("lista-episodios");
  ul.innerHTML = "<li>Carregando…</li>";
  try {
    const a = await lerArquivo("data/formacao.json");
    formacao = a ? JSON.parse(a.texto) : { series: [] };
    $("e-serie").innerHTML = formacao.series.map((s) => `<option value="${esc(s.id)}">${esc(s.titulo)}</option>`).join("") + '<option value="__nova">+ Nova série…</option>';
    $("nova-serie").hidden = formacao.series.length > 0;
    ul.innerHTML = formacao.series.map((s) => `
      <li style="display:block"><strong style="font-family:var(--titulo);font-size:24px">${esc(s.titulo)}</strong>
        <ul class="itens">${[...s.episodios].sort((a, b) => a.numero - b.numero).map((e) => `
          <li><div><strong>EP. ${esc(e.numero)} · ${esc(e.titulo)}</strong><span class="meta">${e.video ? "publicado" : "em breve"}</span></div>
            <button type="button" data-editar-ep="${esc(s.id)}|${esc(e.id)}">Editar</button>
            <button type="button" data-remover-ep="${esc(s.id)}|${esc(e.id)}">Remover</button></li>`).join("") || "<li>Nenhum episódio ainda.</li>"}</ul>
      </li>`).join("") || "<li>Nenhuma série ainda.</li>";
  } catch (e) { ul.innerHTML = `<li>${explicarErro(e)}</li>`; }
}
function lerBase64(arquivo) {
  return new Promise((ok, falha) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(",")[1]);
    r.onerror = () => falha(new Error("Não foi possível ler o arquivo."));
    r.readAsDataURL(arquivo);
  });
}
function capaVertical(arquivo) {
  return new Promise((ok, falha) => {
    const img = new Image();
    img.onload = () => {
      const W = 540, H = 960, c = document.createElement("canvas"); c.width = W; c.height = H;
      const esc2 = Math.max(W / img.width, H / img.height), w = img.width * esc2, h = img.height * esc2;
      c.getContext("2d").drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
      URL.revokeObjectURL(img.src); ok(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => falha(new Error("Não foi possível ler essa imagem."));
    img.src = URL.createObjectURL(arquivo);
  });
}
async function salvarEpisodio(ev) {
  ev.preventDefault();
  const botao = $("botao-ep"); botao.disabled = true;
  avisar("Salvando episódio…");
  try {
    let serieId = $("e-serie").value, novaSerie = null;
    if (serieId === "__nova" || !serieId) {
      const t = $("s-titulo").value.trim();
      if (!t) throw new Error("Dê um nome para a nova série.");
      serieId = criarSlug(t);
      novaSerie = { id: serieId, titulo: t, apresentador: $("s-apres").value.trim(), perfil: $("s-perfil").value.trim().replace(/^@/, ""), descricao: $("s-desc").value.trim(), episodios: [] };
    }
    const numero = Number($("e-numero").value);
    const epId = editandoEp ? editandoEp.ep : "ep" + String(numero).padStart(2, "0") + "-" + Date.now().toString(36);
    let video = $("e-link").value.trim();
    const arq = $("e-arquivo").files[0];
    if (arq) {
      if (arq.size > 40 * 1048576) throw new Error("O vídeo tem mais de 40 MB. Publique no YouTube ou no Instagram e cole o link.");
      avisar("Enviando o vídeo… isso pode levar alguns minutos.");
      const ext = (arq.name.split(".").pop() || "mp4").toLowerCase();
      const caminhoVideo = `formacao/videos/${serieId}-${epId}.${ext}`;
      await gravar(caminhoVideo, await lerBase64(arq), `Vídeo: ${$("e-titulo").value.trim()}`);
      video = caminhoVideo;
    }
    let capa = null;
    if (capaEp) {
      capa = `formacao/capas/${serieId}-${epId}.jpg`;
      await gravar(capa, capaEp, `Capa: ${$("e-titulo").value.trim()}`);
    }
    await alterarLista("data/formacao.json", (f) => {
      f = Array.isArray(f) ? { series: [] } : f;
      if (novaSerie && !f.series.some((s) => s.id === novaSerie.id)) f.series.push(novaSerie);
      const s = f.series.find((x) => x.id === serieId);
      const anterior = s.episodios.find((e) => e.id === epId) || {};
      const ep = { ...anterior, id: epId, numero, titulo: $("e-titulo").value.trim(), descricao: $("e-desc").value.trim(), duracao: $("e-dur").value.trim(),
        capa: capa || anterior.capa || "", video: video || (editandoEp && !$("e-link").value.trim() && !arq ? anterior.video || "" : video) };
      s.episodios = [...s.episodios.filter((e) => e.id !== epId), ep];
      return f;
    }, `${editandoEp ? "Edita" : "Adiciona"} episódio: ${$("e-titulo").value.trim()}`);
    avisar("Episódio salvo! Ele aparece na página de Formação em 1 a 2 minutos.", "ok");
    limparFormEp(); carregarFormacao();
  } catch (e) { avisar(explicarErro(e), "erro"); }
  finally { botao.disabled = false; }
}
function limparFormEp() {
  editandoEp = null; capaEp = null; $("form-ep").reset();
  $("e-capa-previa").hidden = true; $("titulo-form-ep").textContent = "Novo episódio"; $("botao-cancelar-ep").hidden = true;
  if (formacao) $("nova-serie").hidden = formacao.series.length > 0;
}
document.addEventListener("DOMContentLoaded", () => {
  $("form-ep").addEventListener("submit", salvarEpisodio);
  $("botao-cancelar-ep").addEventListener("click", limparFormEp);
  $("e-serie").addEventListener("change", (e) => ($("nova-serie").hidden = e.target.value !== "__nova"));
  $("e-capa").addEventListener("change", async (e) => {
    const f = e.target.files[0]; if (!f) { capaEp = null; return; }
    try { const url = await capaVertical(f); capaEp = url.split(",")[1]; $("e-capa-previa").src = url; $("e-capa-previa").hidden = false; }
    catch (err) { avisar(esc(err.message), "erro"); }
  });
  $("lista-episodios").addEventListener("click", async (e) => {
    const b = e.target.closest("button"); if (!b) return;
    const [sid, eid] = (b.dataset.editarEp || b.dataset.removerEp || "").split("|");
    const s = formacao.series.find((x) => x.id === sid), ep = s && s.episodios.find((x) => x.id === eid);
    if (!ep) return;
    if (b.dataset.editarEp) {
      editandoEp = { serie: sid, ep: eid }; capaEp = null;
      $("e-serie").value = sid; $("nova-serie").hidden = true;
      $("e-numero").value = ep.numero; $("e-dur").value = ep.duracao || ""; $("e-titulo").value = ep.titulo;
      $("e-desc").value = ep.descricao || ""; $("e-link").value = /^https?:/.test(ep.video || "") ? ep.video : "";
      if (ep.capa) { $("e-capa-previa").src = ep.capa; $("e-capa-previa").hidden = false; }
      $("titulo-form-ep").textContent = `Editando: EP. ${ep.numero}`; $("botao-cancelar-ep").hidden = false;
      $("form-ep").scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (confirm(`Remover o EP. ${ep.numero} (${ep.titulo})?`)) {
      try {
        await alterarLista("data/formacao.json", (f) => { const ss = f.series.find((x) => x.id === sid); ss.episodios = ss.episodios.filter((x) => x.id !== eid); return f; }, `Remove episódio: ${ep.titulo}`);
        avisar("Episódio removido.", "ok"); carregarFormacao();
      } catch (err) { avisar(explicarErro(err), "erro"); }
    }
  });
});

// ---------- ligações ----------
document.addEventListener("DOMContentLoaded", () => {
  $("nome-repo").textContent = `${LUFA.dono}/${LUFA.repositorio}`;
  $("form-entrar").addEventListener("submit", (e) => { e.preventDefault(); entrar($("chave").value, $("lembrar").checked); });
  $("sair").addEventListener("click", sair);
  document.querySelectorAll("[data-aba]").forEach((b) => b.addEventListener("click", () => abrirAba(b.dataset.aba)));

  $("form-artigo").addEventListener("submit", publicarArtigo);
  $("botao-cancelar-edicao").addEventListener("click", limparFormArtigo);
  $("botao-previa").addEventListener("click", () => {
    const p = $("previa");
    p.hidden = false;
    p.innerHTML = `<article class="artigo"><h1>${esc($("a-titulo").value || "Título do artigo")}</h1>
      <div class="meta">Por <strong>${esc($("a-autor").value || "Autor")}</strong> · ${esc(dataPorExtenso(new Date()))}</div>
      <div class="texto-artigo">${markdown($("a-texto").value || "O texto aparece aqui.")}</div></article>`;
    p.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  $("lista-publicados").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.editar) editarArtigo(b.dataset.editar);
    if (b.dataset.apagar) apagarArtigo(b.dataset.apagar, b.dataset.titulo);
  });

  $("form-membro").addEventListener("submit", salvarMembro);
  $("botao-cancelar-membro").addEventListener("click", limparFormMembro);
  $("m-foto").addEventListener("change", async (e) => {
    const arq = e.target.files[0];
    if (!arq) { fotoNova = null; return; }
    try {
      const url = await recortarFoto(arq);
      fotoNova = url.split(",")[1];
      $("m-foto-previa").src = url;
      $("m-foto-previa").hidden = false;
    } catch (err) { avisar(esc(err.message), "erro"); }
  });
  $("lista-membros-admin").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.editarMembro) editarMembro(Number(b.dataset.editarMembro));
    if (b.dataset.removerMembro) removerMembro(Number(b.dataset.removerMembro));
    if (b.dataset.subir) subirMembro(Number(b.dataset.subir));
  });

  let salva = null, lembrada = false;
  try {
    lembrada = !!localStorage.getItem(CHAVE_SALVA);
    salva = localStorage.getItem(CHAVE_SALVA) || sessionStorage.getItem(CHAVE_SALVA);
  } catch (_) {}
  if (salva) { $("lembrar").checked = lembrada; entrar(salva, lembrada); }
});
