/* Minha conta: cadastro, login, perfil, artigos e administração (Supabase) */

const $ = (id) => document.getElementById(id);
let perfil = null, editandoArtigo = null, filtroAdmin = "todos", pessoas = [];

function avisar(texto, tipo = "") {
  $("mensagem").innerHTML = texto ? `<div class="aviso ${tipo ? "aviso--" + tipo : ""}">${texto}</div>` : "";
  if (texto) $("mensagem").scrollIntoView({ behavior: "smooth", block: "center" });
}
function ocupado(botao, sim, texto) {
  if (!botao) return;
  if (sim) { botao.dataset.texto = botao.textContent; botao.textContent = texto || "Aguarde…"; botao.disabled = true; }
  else { botao.textContent = botao.dataset.texto || botao.textContent; botao.disabled = false; }
}

// ---------- celular e canal do WhatsApp ----------
const CANAL_WHATSAPP = "https://whatsapp.com/channel/0029VbE3dHYLY6d1Pf9lyk1j";
const soNumeros = (t) => String(t || "").replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
const celularValido = (n) => /^\d{10,11}$/.test(n);
function formatarCelular(n) {
  n = soNumeros(n);
  if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
  if (n.length === 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return n;
}
let depoisDoCanal = null;
function abrirCanal(depois) {
  depoisDoCanal = depois || null;
  const j = $("janela-canal"); if (!j.open) j.showModal();
}
$("janela-canal").addEventListener("close", () => { const f = depoisDoCanal; depoisDoCanal = null; if (f) f(); });
// sem "agora não": a janela só fecha depois que a pessoa clica para entrar no canal
$("janela-canal").addEventListener("cancel", (ev) => ev.preventDefault());
const chaveCanal = () => "lufa_canal_" + (perfil ? perfil.id : "novo");
const jaEntrouNoCanal = () => { try { return localStorage.getItem(chaveCanal()) === "1"; } catch (_) { return false; } };
$("canal-entrar").addEventListener("click", () => {
  try { localStorage.setItem(chaveCanal(), "1"); } catch (_) {}
  setTimeout(() => $("janela-canal").close(), 300);
});
// máscara simples nos campos de celular
document.querySelectorAll('input[type="tel"]').forEach((c) => c.addEventListener("blur", () => { if (celularValido(soNumeros(c.value))) c.value = formatarCelular(c.value); }));

// ---------- volta para onde a pessoa estava (ex.: um episódio da Formação) ----------
const params = new URLSearchParams(location.search);
const voltar = (() => { const v = params.get("voltar") || ""; return /^[a-z0-9_-]+\.html(#[\w\-\/=]*)?$/i.test(v) ? v : ""; })();
function irDeVolta() { if (voltar) { location.href = voltar; return true; } return false; }

// ---------- abas ----------
document.querySelectorAll("[data-aba-fora]").forEach((b) => b.addEventListener("click", () => {
  document.querySelectorAll("[data-aba-fora]").forEach((x) => x.setAttribute("aria-selected", String(x === b)));
  document.querySelectorAll("[data-painel-fora]").forEach((p) => (p.hidden = p.dataset.painelFora !== b.dataset.abaFora));
  avisar("");
}));
function abrirAba(nome) {
  document.querySelectorAll("[data-aba]").forEach((x) => x.setAttribute("aria-selected", String(x.dataset.aba === nome)));
  document.querySelectorAll("[data-painel]").forEach((p) => (p.hidden = p.dataset.painel !== nome));
  if (nome === "artigos") carregarArtigos();
  if (nome === "carteirinha") carregarCarteirinha();
  if (nome === "gerador" && !$("gerador-quadro").src) {
    const q = $("gerador-quadro");
    q.src = "identidade/gerador.html?embutido=1";
    // altura do quadro acompanha o conteúdo do gerador
    setInterval(() => {
      try { const h = q.contentDocument && q.contentDocument.documentElement.scrollHeight; if (h && Math.abs(h - q.offsetHeight) > 8) q.style.height = h + "px"; } catch (_) {}
    }, 700);
  }
  if (nome === "admin") { carregarPessoas(); carregarOrdem(); }
}
document.querySelectorAll("[data-aba]").forEach((b) => b.addEventListener("click", () => abrirAba(b.dataset.aba)));

// ---------- entrar / cadastrar / sair ----------
$("form-entrar").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const b = ev.submitter; ocupado(b, true, "Entrando…");
  const { error } = await supa.auth.signInWithPassword({ email: $("e-email").value.trim(), password: $("e-senha").value });
  ocupado(b, false);
  if (error) return avisar(mensagemErro(error), "erro");
  if (irDeVolta()) return;
  avisar(""); mostrar();
});

$("form-cadastrar").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const celular = soNumeros($("c-celular").value);
  if (!celularValido(celular)) { $("c-celular").focus(); return avisar("Digite um número de celular válido, com DDD. Exemplo: (11) 91234-5678.", "erro"); }
  const b = ev.submitter; ocupado(b, true, "Criando conta…");
  const { data, error } = await supa.auth.signUp({
    email: $("c-email").value.trim(), password: $("c-senha").value,
    options: { data: { nome: $("c-nome").value.trim(), arroba: $("c-arroba").value.trim().replace(/^@/, ""), celular }, emailRedirectTo: location.origin + location.pathname },
  });
  ocupado(b, false);
  if (error) return avisar(mensagemErro(error), "erro");
  if (!data.session) {
    avisar("Conta criada! Enviamos um e-mail de confirmação: abra o link para ativar a conta e depois entre por aqui.", "ok");
    return abrirCanal();
  }
  avisar("Conta criada! Você já é membro do Coletivo Lufã. Complete o seu perfil e faça a sua carteirinha.", "ok");
  await mostrar();
  abrirCanal(() => irDeVolta());   // pop-up do canal; ao fechar, volta para onde a pessoa estava
});

$("esqueci").addEventListener("click", async () => {
  const email = $("e-email").value.trim();
  if (!email) return avisar("Digite o seu e-mail no campo acima e clique de novo em “Esqueci a minha senha”.", "erro");
  const { error } = await supa.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
  avisar(error ? mensagemErro(error) : "Se esse e-mail estiver cadastrado, você vai receber um link para criar uma nova senha.", error ? "erro" : "ok");
});

$("form-nova-senha").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const { error } = await supa.auth.updateUser({ password: $("n-senha").value });
  if (error) return avisar(mensagemErro(error), "erro");
  $("form-nova-senha").hidden = true; avisar("Senha alterada!", "ok"); mostrar();
});

$("sair").addEventListener("click", async () => { await supa.auth.signOut(); perfil = null; avisar(""); mostrar(); });

// ---------- tela ----------
async function mostrar() {
  const u = await usuarioAtual();
  $("tela-fora").hidden = !!u;
  $("tela-dentro").hidden = !u;
  if (!u) { $("titulo").textContent = "Minha conta"; return; }
  try { perfil = await meuPerfil(); } catch (e) { return avisar(mensagemErro(e), "erro"); }
  if (!perfil) return avisar("Seu perfil ainda está sendo criado. Recarregue a página em alguns segundos.", "erro");
  $("titulo").textContent = "Olá, " + (perfil.nome.split(" ")[0] || "camarada") + "!";
  $("subtitulo").textContent = APROVADO.includes(perfil.papel) ? "Bem-vindo(a) à área do militante." : "Sua conta foi criada.";
  $("topo-nome").textContent = perfil.nome || perfil.email;
  $("topo-status").textContent = APROVADO.includes(perfil.papel) ? `${textoOcupacao(perfil)} · ${PAPEIS[perfil.papel]}` : (PAPEIS[perfil.papel] || perfil.papel);
  $("topo-status").dataset.papel = perfil.papel;
  $("topo-matricula").textContent = perfil.matricula ? "Matrícula Nº " + perfil.matricula : "";
  $("topo-foto").src = perfil.foto || "assets/img/avatar.svg";
  $("aviso-pendente").hidden = perfil.papel !== "pendente";
  $("aviso-recusado").hidden = perfil.papel !== "recusado";
  $("link-carteirinha").hidden = !APROVADO.includes(perfil.papel);
  $("p-nome").value = perfil.nome; $("p-arroba").value = perfil.arroba; $("p-rede").value = perfil.rede || "instagram";
  $("p-idade").value = perfil.idade || "";
  const temColunaCelular = Object.prototype.hasOwnProperty.call(perfil, "celular");
  $("campo-p-celular").hidden = !temColunaCelular;
  $("p-celular").required = temColunaCelular;
  $("p-celular").value = temColunaCelular ? formatarCelular(perfil.celular) : "";
  // quem já era cadastrado e ainda não tem celular: pede para atualizar
  if (temColunaCelular && !perfil.celular && !$("janela-canal").open && !$("janela-celular").open) $("janela-celular").showModal();
  else if (!jaEntrouNoCanal() && !$("janela-canal").open && !$("janela-celular").open) abrirCanal();
  document.querySelector('[data-aba="carteirinha"]').hidden = !APROVADO.includes(perfil.papel);
  // gerador de imagens: só membro ativo
  document.querySelector('[data-aba="gerador"]').hidden = !(APROVADO.includes(perfil.papel) && !ehComum(perfil));
  // artigos: só membros ativos com permissão de autor, editor ou admin
  document.querySelector('[data-aba="artigos"]').hidden = !(PODE_ESCREVER.includes(perfil.papel) && !ehComum(perfil));
  document.querySelector('[data-aba="admin"]').hidden = perfil.papel !== "admin";
  // regimento interno: aberto a todos
  $("bloco-regimento").hidden = false;
  $("titulo-lista-artigos").textContent = ["editor", "admin"].includes(perfil.papel) ? "Artigos do site" : "Meus artigos";
}

// ---------- perfil ----------
let fotoNova = null;
function recortar(arquivo, lado = 600) {
  return new Promise((ok, falha) => {
    const img = new Image();
    img.onload = () => {
      const m = Math.min(img.width, img.height), c = document.createElement("canvas"); c.width = c.height = lado;
      c.getContext("2d").drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, lado, lado);
      URL.revokeObjectURL(img.src); c.toBlob(ok, "image/jpeg", 0.86);
    };
    img.onerror = () => falha(new Error("Não foi possível ler essa imagem."));
    img.src = URL.createObjectURL(arquivo);
  });
}
$("p-foto").addEventListener("change", async (ev) => {
  const f = ev.target.files[0]; if (!f) return;
  try { fotoNova = await recortar(f); $("topo-foto").src = URL.createObjectURL(fotoNova); } catch (e) { avisar(e.message, "erro"); }
});
$("form-perfil").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const b = $("salvar-perfil"); ocupado(b, true, "Salvando…");
  try {
    const dados = { nome: $("p-nome").value.trim(), arroba: $("p-arroba").value.trim().replace(/^@/, ""), rede: $("p-rede").value, idade: $("p-idade").value ? Number($("p-idade").value) : null };
    if (Object.prototype.hasOwnProperty.call(perfil, "celular")) {
      const cel = soNumeros($("p-celular").value);
      if (!celularValido(cel)) { ocupado(b, false); $("p-celular").focus(); return avisar("Digite um número de celular válido, com DDD. Exemplo: (11) 91234-5678.", "erro"); }
      dados.celular = cel;
    }
    if (fotoNova) {
      const caminho = `${perfil.id}/foto-${Date.now()}.jpg`;
      const { error: e1 } = await supa.storage.from("fotos").upload(caminho, fotoNova, { contentType: "image/jpeg", upsert: true });
      if (e1) throw e1;
      dados.foto = supa.storage.from("fotos").getPublicUrl(caminho).data.publicUrl;
    }
    const { error } = await supa.from("perfis").update(dados).eq("id", perfil.id);
    if (error) throw error;
    fotoNova = null; $("p-foto").value = "";
    avisar("Perfil salvo!", "ok"); mostrar();
  } catch (e) { avisar(mensagemErro(e), "erro"); }
  ocupado(b, false);
});

// ---------- carteirinha ----------
function carregarCarteirinha() {
  const base = (nome) => supa.storage.from("fotos").getPublicUrl(`${perfil.id}/${nome}`).data.publicUrl + "?t=" + Date.now();
  const img = $("carteira-img");
  const vazia = () => { img.hidden = true; $("carteira-acoes").hidden = true; $("carteira-vazia").hidden = false; };
  const tentar = (lista) => {
    if (!lista.length) return vazia();
    const url = base(lista[0]);
    img.onload = () => {
      img.hidden = false; $("carteira-acoes").hidden = false; $("carteira-vazia").hidden = true;
      fetch(url).then((r) => r.blob()).then((b) => { $("carteira-baixar").href = URL.createObjectURL(b); $("carteira-baixar").download = "carteirinha-coletivo-lufa." + lista[0].split(".").pop(); }).catch(() => {});
    };
    img.onerror = () => tentar(lista.slice(1));
    img.src = url;
  };
  tentar(["carteirinha.jpg", "carteirinha.png"]);
}

// ---------- artigos ----------
function slug(t) {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || "artigo";
}
async function carregarArtigos() {
  const ul = $("lista-artigos"); ul.innerHTML = "<li>Carregando…</li>";
  let q = supa.from("artigos").select("id,slug,titulo,autor_nome,autor_id,publicado,criado_em").order("criado_em", { ascending: false });
  if (!["editor", "admin"].includes(perfil.papel)) q = q.eq("autor_id", perfil.id);
  const { data, error } = await q;
  if (error) { ul.innerHTML = `<li>${esc(mensagemErro(error))}</li>`; return; }
  ul.innerHTML = data.length ? data.map((a) => `
    <li><div><strong>${esc(a.titulo)}</strong><span class="meta">${esc(a.autor_nome)} · ${esc(dataPorExtenso(a.criado_em))} · ${a.publicado ? "publicado" : "rascunho"}</span></div>
      ${a.publicado ? `<a href="artigos.html?a=${encodeURIComponent(a.slug)}" target="_blank" class="link-botao">Ver</a>` : ""}
      <button type="button" data-editar="${a.id}">Editar</button>
      <button type="button" data-apagar="${a.id}" data-titulo="${esc(a.titulo)}">Apagar</button></li>`).join("")
    : "<li>Nenhum artigo ainda. Escreva o primeiro aí em cima!</li>";
}
function limparArtigo() {
  editandoArtigo = null; $("form-artigo").reset(); $("a-publicado").checked = true; $("previa").hidden = true;
  $("titulo-artigo").textContent = "Novo artigo"; $("botao-artigo").textContent = "Publicar"; $("cancelar-artigo").hidden = true;
}
$("cancelar-artigo").addEventListener("click", limparArtigo);
$("previa-artigo").addEventListener("click", () => {
  const p = $("previa"); p.hidden = false;
  p.innerHTML = `<article class="artigo"><h1>${esc($("a-titulo").value || "Título")}</h1><div class="meta">Por <strong>${esc(perfil.nome)}</strong></div><div class="texto-artigo">${markdown($("a-texto").value || "O texto aparece aqui.")}</div></article>`;
  p.scrollIntoView({ behavior: "smooth" });
});
$("form-artigo").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const b = $("botao-artigo"); ocupado(b, true, "Salvando…");
  try {
    const titulo = $("a-titulo").value.trim(), texto = $("a-texto").value.trim(), publicado = $("a-publicado").checked;
    if (editandoArtigo) {
      const { error } = await supa.from("artigos").update({ titulo, texto, publicado, editado_em: new Date().toISOString() }).eq("id", editandoArtigo);
      if (error) throw error;
    } else {
      let s = slug(titulo);
      const { data: iguais } = await supa.from("artigos").select("slug").like("slug", s + "%");
      if (iguais && iguais.some((x) => x.slug === s)) s += "-" + Date.now().toString(36).slice(-4);
      const { error } = await supa.from("artigos").insert({ slug: s, titulo, texto, publicado, autor_id: perfil.id, autor_nome: perfil.nome });
      if (error) throw error;
    }
    avisar(publicado ? "Artigo publicado! Ele já aparece na página de Artigos." : "Rascunho salvo.", "ok");
    limparArtigo(); carregarArtigos();
  } catch (e) { avisar(mensagemErro(e), "erro"); }
  ocupado(b, false);
});
$("lista-artigos").addEventListener("click", async (ev) => {
  const b = ev.target.closest("button"); if (!b) return;
  if (b.dataset.editar) {
    const { data, error } = await supa.from("artigos").select("*").eq("id", b.dataset.editar).single();
    if (error) return avisar(mensagemErro(error), "erro");
    editandoArtigo = data.id; $("a-titulo").value = data.titulo; $("a-texto").value = data.texto; $("a-publicado").checked = data.publicado;
    $("titulo-artigo").textContent = "Editando artigo"; $("botao-artigo").textContent = "Salvar alterações"; $("cancelar-artigo").hidden = false;
    $("form-artigo").scrollIntoView({ behavior: "smooth" });
  } else if (b.dataset.apagar && confirm(`Apagar o artigo "${b.dataset.titulo}"? Não dá para desfazer.`)) {
    const { error } = await supa.from("artigos").delete().eq("id", b.dataset.apagar);
    if (error) return avisar(mensagemErro(error), "erro");
    avisar("Artigo apagado.", "ok"); carregarArtigos();
  }
});

// ---------- administração ----------
async function carregarPessoas() {
  const ul = $("lista-pessoas"); ul.innerHTML = "<li>Carregando…</li>";
  const { data, error } = await supa.from("perfis").select("*").order("criado_em", { ascending: false });
  if (error) { ul.innerHTML = `<li>${esc(mensagemErro(error))}</li>`; return; }
  pessoas = data; desenharPessoas();
}
function desenharPessoas() {
  const lista = pessoas.filter((p) => filtroAdmin === "todos" ? true
    : filtroAdmin === "ativos" ? (APROVADO.includes(p.papel) && !ehComum(p))
    : filtroAdmin === "comuns" ? (APROVADO.includes(p.papel) && ehComum(p))
    : p.papel === "pendente" || p.papel === "recusado");
  const conta = (f) => pessoas.filter((p) => APROVADO.includes(p.papel) && (f === "comum" ? ehComum(p) : !ehComum(p))).length;
  const b = (f) => document.querySelector(`[data-filtro="${f}"]`);
  b("todos").textContent = `Todos (${pessoas.length})`;
  b("ativos").textContent = `Membros ativos (${conta("ativo")})`;
  b("comuns").textContent = `Membros comuns (${conta("comum")})`;
  $("lista-pessoas").innerHTML = lista.length ? lista.map((p) => `
    <li data-id="${p.id}">
      <img src="${esc(p.foto || "assets/img/avatar.svg")}" alt="">
      <div><strong>${esc(p.nome || "(sem nome)")}</strong>
        <span class="meta">${APROVADO.includes(p.papel) ? `<b>${esc(textoOcupacao(p))}</b> · ` : ""}${p.arroba ? "@" + esc(p.arroba) + " · " : ""}${p.matricula ? "Nº " + esc(p.matricula) + " · " : ""}cadastro em ${esc(dataPorExtenso(p.criado_em))}${p.idade ? " · " + esc(p.idade) + " anos" : ""}</span></div>
      ${p.papel === "pendente" ? `<button type="button" class="aprovar" data-papel="membro" data-classe="${ATIVO}">Aprovar como ativo</button><button type="button" class="aprovar aprovar--comum" data-papel="membro" data-classe="${COMUM}">Aprovar como comum</button><button type="button" data-papel="recusado">Recusar</button>`
        : `<select data-classe-sel aria-label="Classificação de ${esc(p.nome)}"><option value="${ATIVO}"${!ehComum(p) ? " selected" : ""}>Membro ativo</option><option value="${COMUM}"${ehComum(p) ? " selected" : ""}>Membro comum</option></select>`}
      <select data-mudar aria-label="Permissão de ${esc(p.nome)}" ${p.id === perfil.id ? "disabled title='Você não pode mudar a sua própria permissão'" : ""}>
        ${Object.entries(PAPEIS).map(([k, n]) => {
          const bloqueado = ehComum(p) && PODE_ESCREVER.includes(k) && k !== p.papel;
          return `<option value="${k}"${k === p.papel ? " selected" : ""}${bloqueado ? " disabled" : ""}>${n}${bloqueado ? " (só membro ativo)" : ""}</option>`;
        }).join("")}
      </select>
      ${APROVADO.includes(p.papel) && !ehComum(p) ? `<button type="button" data-ocupacoes>Ocupações</button>` : ""}
      <button type="button" data-matricula title="Usar uma matrícula que a pessoa já tinha">Nº</button>
    </li>`).join("") : `<li>Nenhuma pessoa aqui.</li>`;
}
document.querySelectorAll("[data-filtro]").forEach((b) => b.addEventListener("click", () => {
  filtroAdmin = b.dataset.filtro;
  document.querySelectorAll("[data-filtro]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  desenharPessoas();
}));
async function definir(id, papel) {
  const { error } = await supa.rpc("definir_papel", { pessoa: id, novo_papel: papel });
  if (error) return avisar(mensagemErro(error), "erro");
  const p = pessoas.find((x) => x.id === id);
  avisar(`${esc(p ? p.nome : "Pessoa")}: ${esc(PAPEIS[papel])}.`, "ok");
  carregarPessoas();
}
$("lista-pessoas").addEventListener("click", async (ev) => {
  const b = ev.target.closest("button"); if (!b) return;
  const id = b.closest("li").dataset.id;
  if (b.dataset.papel) {
    if (b.dataset.classe) {
      const { error } = await supa.from("perfis").update({ funcao: b.dataset.classe }).eq("id", id);
      if (error) return avisar(mensagemErro(error), "erro");
    }
    definir(id, b.dataset.papel);
  }
  if (b.hasAttribute("data-ocupacoes")) return abrirOcupacoes(pessoas.find((x) => x.id === id));
  if (b.hasAttribute("data-matricula")) {
    const p = pessoas.find((x) => x.id === id);
    const nova = prompt(`Matrícula de ${p.nome} (6 números, ex.: 001003). Use para quem já era membro antes do cadastro:`, p.matricula || "");
    if (nova === null) return;
    if (!/^\d{6}$/.test(nova.trim())) return avisar("A matrícula precisa ter 6 números.", "erro");
    const { error } = await supa.from("perfis").update({ matricula: nova.trim() }).eq("id", id);
    if (error) return avisar(/duplicate|unique/i.test(error.message) ? "Essa matrícula já pertence a outra pessoa." : mensagemErro(error), "erro");
    avisar("Matrícula atualizada.", "ok"); carregarPessoas();
  }
});
$("lista-pessoas").addEventListener("change", async (ev) => {
  const c = ev.target.closest("[data-classe-sel]");
  if (c) {
    const alvo = pessoas.find((x) => x.id === c.closest("li").dataset.id);
    // virar membro comum tira a permissão de escrever artigos
    if (c.value === COMUM && alvo && PODE_ESCREVER.includes(alvo.papel)) {
      if (alvo.id === perfil.id) { c.value = ATIVO; return avisar("Você não pode se tornar membro comum sendo admin.", "erro"); }
      if (!confirm(`${alvo.nome} é ${PAPEIS[alvo.papel]}. Membros comuns não escrevem artigos, então a permissão dele(a) volta para Membro. Continuar?`)) { c.value = ATIVO; return; }
      const { error: e2 } = await supa.rpc("definir_papel", { pessoa: alvo.id, novo_papel: "membro" });
      if (e2) return avisar(mensagemErro(e2), "erro");
    }
    const { error } = await supa.from("perfis").update({ funcao: c.value }).eq("id", c.closest("li").dataset.id);
    if (error) return avisar(mensagemErro(error), "erro");
    avisar(`Classificação alterada para ${esc(c.value)}.`, "ok"); return carregarPessoas();
  }
  const s = ev.target.closest("[data-mudar]"); if (!s) return;
  definir(s.closest("li").dataset.id, s.value);
});

// ---------- ordem dos membros na página inicial ----------
let ordem = [];
async function carregarOrdem() {
  $("lista-ordem").innerHTML = "<li>Carregando…</li>";
  ordem = (await todosOsMembros()).filter((m) => !ehComum(m) && m.matricula);
  desenharOrdem();
}
function desenharOrdem() {
  $("lista-ordem").innerHTML = ordem.map((m, i) => `
    <li><span class="ordem__pos">${i + 1}</span>
      <img src="${esc(m.foto || "assets/img/avatar.svg")}" alt="">
      <div><strong>${esc(m.nome)}</strong><span class="meta">${esc(ocupacoes(m).join(" · ") || "Membro")} · Nº ${esc(m.matricula)}</span></div>
      <button type="button" data-ordem-subir="${i}" ${i === 0 ? "disabled" : ""} aria-label="Subir ${esc(m.nome)}">↑</button>
      <button type="button" data-ordem-descer="${i}" ${i === ordem.length - 1 ? "disabled" : ""} aria-label="Descer ${esc(m.nome)}">↓</button>
    </li>`).join("") || "<li>Nenhum membro ativo.</li>";
}
$("lista-ordem").addEventListener("click", (ev) => {
  const b = ev.target.closest("button"); if (!b) return;
  const i = Number(b.dataset.ordemSubir ?? b.dataset.ordemDescer), j = b.dataset.ordemSubir !== undefined ? i - 1 : i + 1;
  if (j < 0 || j >= ordem.length) return;
  [ordem[i], ordem[j]] = [ordem[j], ordem[i]]; desenharOrdem();
  $("lista-ordem").children[j].querySelector("button:not([disabled])")?.focus();
});
$("salvar-ordem").addEventListener("click", async () => {
  const b = $("salvar-ordem"); ocupado(b, true, "Salvando…");
  const { error } = await supa.from("ordem_membros").upsert(ordem.map((m, i) => ({ matricula: m.matricula, posicao: i + 1 })));
  ocupado(b, false);
  if (error) return avisar(/ordem_membros|relation|schema cache/i.test(error.message) ? "Falta rodar o arquivo 04-ordem-dos-membros.sql no SQL Editor do Supabase." : mensagemErro(error), "erro");
  avisar("Ordem salva! A página inicial já mostra os membros nessa ordem.", "ok");
});

// ---------- ocupações do membro ativo ----------
let ocupAlvo = null, ocupLista = [];
function desenharOcupacoes() {
  $("ocup-chips").innerHTML = ocupLista.length ? ocupLista.map((o, i) => `<span class="chip">${esc(o)}<button type="button" data-tirar="${i}" aria-label="Tirar ${esc(o)}">×</button></span>`).join("")
    : '<span class="meta">Nenhuma ocupação além de membro ativo.</span>';
  $("ocup-previa").textContent = funcaoDe(ocupLista);
}
function abrirOcupacoes(p) {
  if (!p) return;
  ocupAlvo = p; ocupLista = ocupacoes(p);
  $("ocup-nome").textContent = p.nome;
  $("ocup-sugestoes").innerHTML = OCUPACOES_SUGERIDAS.map((o) => `<option value="${esc(o)}">`).join("");
  $("ocup-nova").value = ""; desenharOcupacoes(); $("janela-ocupacoes").showModal();
}
function adicionarOcupacao() {
  const v = $("ocup-nova").value.replace(/·/g, "").trim();
  if (!v) return;
  if (!ocupLista.some((o) => o.toLowerCase() === v.toLowerCase())) ocupLista.push(v.charAt(0).toUpperCase() + v.slice(1));
  $("ocup-nova").value = ""; desenharOcupacoes(); $("ocup-nova").focus();
}
$("ocup-adicionar").addEventListener("click", adicionarOcupacao);
$("ocup-nova").addEventListener("keydown", (ev) => { if (ev.key === "Enter") { ev.preventDefault(); adicionarOcupacao(); } });
$("ocup-chips").addEventListener("click", (ev) => { const b = ev.target.closest("[data-tirar]"); if (b) { ocupLista.splice(Number(b.dataset.tirar), 1); desenharOcupacoes(); } });
$("ocup-cancelar").addEventListener("click", () => $("janela-ocupacoes").close());
$("ocup-salvar").addEventListener("click", async () => {
  if ($("ocup-nova").value.trim()) adicionarOcupacao();
  const { error } = await supa.from("perfis").update({ funcao: funcaoDe(ocupLista) }).eq("id", ocupAlvo.id);
  if (error) return avisar(mensagemErro(error), "erro");
  $("janela-ocupacoes").close();
  avisar(`Ocupações de ${esc(ocupAlvo.nome)}: ${esc(funcaoDe(ocupLista))}.`, "ok");
  if (ocupAlvo.id === perfil.id) mostrar();
  carregarPessoas();
});

$("form-celular").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const cel = soNumeros($("j-celular").value);
  if (!celularValido(cel)) { $("j-celular-erro").hidden = false; return $("j-celular").focus(); }
  $("j-celular-erro").hidden = true;
  const b = ev.submitter; ocupado(b, true, "Salvando…");
  const { error } = await supa.from("perfis").update({ celular: cel }).eq("id", perfil.id);
  ocupado(b, false);
  if (error) { $("j-celular-erro").textContent = mensagemErro(error); $("j-celular-erro").hidden = false; return; }
  perfil.celular = cel; $("p-celular").value = formatarCelular(cel);
  $("janela-celular").close();
  avisar("Cadastro atualizado! Obrigado.", "ok");
  abrirCanal();
});
$("janela-celular").addEventListener("cancel", (ev) => ev.preventDefault()); // não fecha com Esc: o celular é obrigatório

// ---------- início ----------
supa.auth.onAuthStateChange((evento) => {
  if (evento === "PASSWORD_RECOVERY") { $("tela-fora").hidden = true; $("tela-dentro").hidden = true; $("form-nova-senha").hidden = false; }
});
if (params.get("criar")) document.querySelector('[data-aba-fora="cadastrar"]').click();
if (voltar.startsWith("formacao")) avisar("Entre ou crie a sua conta para assistir à formação. Depois você volta direto para o episódio.");
mostrar();
