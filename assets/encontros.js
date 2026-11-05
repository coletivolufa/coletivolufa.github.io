/* Encontros (estilo Tinder): perfis com foto, coração, X e mensagem de até 50 caracteres. */
const GENEROS = ["Homem cis", "Mulher cis", "Homem trans", "Mulher trans", "Homem gay", "Mulher lésbica",
  "Não-binário", "Gênero fluido", "Agênero", "Travesti", "Queer", "Intersexo", "Outro (escrever)"];
const ORIENTACOES = ["Heterossexual (hétero)", "Homossexual (gay / lésbica)", "Bissexual", "Pansexual",
  "Assexual", "Demissexual", "Outra (escrever)"];
const OUTRO = "Outro (escrever)";
const OUTRA = "Outra (escrever)";
const MAX_MENSAGEM = 50;

const $ = (id) => document.getElementById(id);
let eu = null;
let perfilEu = null;
let meuEncontro = null;   // linha de encontro_perfis
let pilha = [];           // cartões a exibir
let fotoNova = null;

function avisarPerfil(t) { const el = $("aviso-perfil"); el.textContent = t; el.hidden = !t; }

// ----- formulário -----
function preencherListas() {
  $("f-genero").innerHTML = GENEROS.map((g) => `<option>${esc(g)}</option>`).join("");
  $("f-orientacao").innerHTML = ORIENTACOES.map((o) => `<option>${esc(o)}</option>`).join("");
}

function mostrarOutro() {
  $("f-genero-outro").hidden = $("f-genero").value !== OUTRO;
  $("f-orientacao-outra").hidden = $("f-orientacao").value !== OUTRA;
}

function abrirFormulario() {
  $("sec-deck").hidden = true;
  $("sec-perfil").hidden = false;
  $("titulo-form").textContent = meuEncontro ? "Editar meu perfil" : "Crie seu perfil";
  $("cancelar-perfil").hidden = !meuEncontro;
  $("f-nome").value = perfilEu.nome || "";
  const m = meuEncontro || {};
  $("f-sobre").value = m.sobre || "";
  $("f-gostos").value = m.gostos || "";
  $("f-musica").value = m.musica || "";
  $("f-filme").value = m.filme || "";
  $("f-genero").value = m.genero || GENEROS[0];
  $("f-genero-outro").value = m.genero_outro || "";
  $("f-orientacao").value = m.orientacao || ORIENTACOES[0];
  $("f-orientacao-outra").value = m.orientacao_outra || "";
  $("f-ativo").checked = m.ativo !== false;
  $("foto-previa").src = m.foto_url || "assets/img/avatar.svg";
  fotoNova = null;
  mostrarOutro();
  avisarPerfil("");
}

function escolherFotoPerfil(e) {
  const f = e.target.files[0];
  e.target.value = "";
  if (!f) return;
  if (f.size > 12 * 1024 * 1024) return avisarPerfil("A foto é muito grande. Escolha uma menor.");
  fotoNova = f;
  $("foto-previa").src = URL.createObjectURL(f);
}

async function salvarPerfil(e) {
  e.preventDefault();
  const v = {
    nome: $("f-nome").value.trim(),
    sobre: $("f-sobre").value.trim(),
    gostos: $("f-gostos").value.trim(),
    musica: $("f-musica").value.trim(),
    filme: $("f-filme").value.trim(),
    genero: $("f-genero").value,
    genero_outro: $("f-genero-outro").value.trim(),
    orientacao: $("f-orientacao").value,
    orientacao_outra: $("f-orientacao-outra").value.trim(),
    ativo: $("f-ativo").checked,
  };
  const faltam = [];
  if (!v.nome) faltam.push("nome completo");
  if (!v.sobre) faltam.push("sobre você");
  if (!v.gostos) faltam.push("do que você gosta");
  if (!v.musica) faltam.push("música favorita");
  if (!v.filme) faltam.push("filme favorito");
  if (v.genero === OUTRO && !v.genero_outro) faltam.push("seu gênero");
  if (v.orientacao === OUTRA && !v.orientacao_outra) faltam.push("sua orientação");
  if (!meuEncontro?.foto_url && !fotoNova) faltam.push("uma foto");
  if (faltam.length) return avisarPerfil("Preencha: " + faltam.join(", ") + ".");

  const botao = $("salvar-perfil");
  botao.disabled = true;
  try {
    let foto_url = meuEncontro?.foto_url;
    if (fotoNova) {
      botao.textContent = "Enviando foto…";
      foto_url = await enviarFotoComunidade(fotoNova, eu.id);
    }
    // o nome completo fica no perfil de membro (o mesmo que aparece no bate-papo)
    const { error: erroNome } = await supa.from("perfis").update({ nome: v.nome }).eq("id", eu.id);
    if (erroNome) throw new Error(erroNome.message);
    // "nome" fica em perfis; encontro_perfis recebe só os seus próprios campos
    const { nome, ...camposEncontro } = v;
    const { error } = await supa.from("encontro_perfis")
      .upsert({ id: eu.id, ...camposEncontro, foto_url, atualizado_em: new Date().toISOString() }, { onConflict: "id" });
    if (error) throw new Error(error.message);
    perfilEu.nome = v.nome;
    await carregarMeuEncontro();
    $("sec-perfil").hidden = true;
    await carregarPilha();
  } catch (err) {
    avisarPerfil("Não foi possível salvar: " + err.message);
  } finally {
    botao.disabled = false;
    botao.textContent = "Salvar perfil";
  }
}

// ----- pilha de cartões -----
async function carregarMeuEncontro() {
  const { data } = await supa.from("encontro_perfis").select("*").eq("id", eu.id).maybeSingle();
  meuEncontro = data || null;
}

function tagsDo(c) {
  const genero = c.genero === OUTRO ? c.genero_outro : c.genero;
  const orientacao = c.orientacao === OUTRA ? c.orientacao_outra : c.orientacao;
  return [c.idade ? c.idade + " anos" : "", genero, orientacao].filter(Boolean);
}

function cartaoHTML(c) {
  const tags = tagsDo(c).map((t) => `<span class="tag">${esc(t)}</span>`).join("");
  const curtiu = c.curtiu_voce ? '<span class="tag tag--quente">Curtiu você</span>' : "";
  return `<article class="cartao" data-id="${c.id}">
    <div class="cartao__foto">
      <img src="${esc(c.foto_url)}" alt="Foto de ${esc(c.nome)}" loading="lazy">
      <div class="cartao__info">
        <h2>${esc(c.nome)}</h2>
        <div class="cartao__tags">${curtiu}${tags}</div>
      </div>
    </div>
    <div class="cartao__corpo">
      ${c.sobre ? `<p>${esc(c.sobre)}</p>` : ""}
      ${c.gostos ? `<p><b>Gosto de:</b> ${esc(c.gostos)}</p>` : ""}
      ${c.musica ? `<p><b>Música:</b> ${esc(c.musica)}</p>` : ""}
      ${c.filme ? `<p><b>Filme:</b> ${esc(c.filme)}</p>` : ""}
    </div>
    <div class="msg-painel" id="msg-painel" hidden>
      <div class="linha">
        <input id="msg-texto" maxlength="${MAX_MENSAGEM}" placeholder="Uma mensagem curta (até 50 caracteres)" autocomplete="off">
        <button class="botao-com" type="button" id="msg-enviar">Enviar</button>
      </div>
      <div class="contador" id="msg-contador">0/${MAX_MENSAGEM}</div>
      <p class="aviso-com" id="msg-aviso" hidden></p>
    </div>
    <div class="acoes-cartao">
      <button class="redondo redondo--x" type="button" data-acao="x" aria-label="Não gostei">✕</button>
      <button class="redondo redondo--msg" type="button" data-acao="msg" aria-label="Enviar mensagem">✉</button>
      <button class="redondo redondo--coracao" type="button" data-acao="coracao" aria-label="Curtir">♥</button>
    </div>
  </article>`;
}

function mostrarProximo() {
  const deck = $("deck");
  if (!pilha.length) {
    deck.innerHTML = `<div class="vazio-deck card"><h2>Por enquanto é só isso</h2><p>Quando novos membros criarem o perfil, eles aparecem aqui.</p><button class="botao-com botao-com--suave" type="button" id="recarregar">Procurar de novo</button></div>`;
    return;
  }
  deck.innerHTML = cartaoHTML(pilha[0]);
}

async function carregarPilha() {
  $("sec-deck").hidden = false;
  const { data, error } = await supa.rpc("proximos_encontros", { p_limite: 30 });
  if (error) { $("deck").innerHTML = `<p class="aviso-com">Não foi possível carregar os perfis: ${esc(error.message)}</p>`; return; }
  pilha = data || [];
  mostrarProximo();
}

// ----- ações -----
function proximaCarta() {
  pilha.shift();
  mostrarProximo();
}

async function reagir(tipo, botao) {
  const atual = pilha[0];
  if (!atual) return;
  botao.disabled = true;
  const { data, error } = await supa.rpc("reagir_encontro", { p_para: atual.id, p_tipo: tipo });
  botao.disabled = false;
  if (error) return alert(error.message);
  if (data === "match") {
    $("match-texto").textContent = `Você e ${atual.nome} curtiram um ao outro. A conversa já está no bate-papo.`;
    $("overlay-match").hidden = false;
    return;
  }
  proximaCarta();
}

function abrirMensagem() {
  const painel = $("msg-painel");
  painel.hidden = !painel.hidden;
  if (!painel.hidden) $("msg-texto").focus();
}

async function enviarMensagem(botao) {
  const atual = pilha[0];
  const texto = $("msg-texto").value.trim();
  const aviso = $("msg-aviso");
  if (!texto) { aviso.hidden = false; aviso.textContent = "Escreva uma mensagem curta."; return; }
  if (texto.length > MAX_MENSAGEM) { aviso.hidden = false; aviso.textContent = `No máximo ${MAX_MENSAGEM} caracteres.`; return; }
  botao.disabled = true;
  const { error } = await supa.rpc("mensagem_encontro", { p_para: atual.id, p_texto: texto });
  botao.disabled = false;
  if (error) { aviso.hidden = false; aviso.textContent = error.message; return; }
  alert(`Mensagem enviada para ${atual.nome}. Agora é só esperar a resposta.`);
  proximaCarta();
}

async function iniciarEncontros() {
  const entrou = await entrarComunidade();
  if (!entrou) return;
  eu = entrou.eu;
  perfilEu = entrou.perfil;
  montarAbas("encontros");
  preencherListas();
  await carregarMeuEncontro();

  $("f-genero").addEventListener("change", mostrarOutro);
  $("f-orientacao").addEventListener("change", mostrarOutro);
  $("foto").addEventListener("change", escolherFotoPerfil);
  $("form-perfil").addEventListener("submit", salvarPerfil);
  $("cancelar-perfil").addEventListener("click", () => { $("sec-perfil").hidden = true; carregarPilha(); });
  $("btn-meu-perfil").addEventListener("click", abrirFormulario);
  $("fechar-match").addEventListener("click", () => { $("overlay-match").hidden = true; });

  $("deck").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.id === "recarregar") return carregarPilha();
    if (b.id === "msg-enviar") return enviarMensagem(b);
    if (b.dataset.acao === "x") return reagir("x", b);
    if (b.dataset.acao === "coracao") return reagir("coracao", b);
    if (b.dataset.acao === "msg") return abrirMensagem();
  });
  $("deck").addEventListener("input", (e) => {
    if (e.target.id === "msg-texto") $("msg-contador").textContent = `${e.target.value.length}/${MAX_MENSAGEM}`;
  });

  if (!meuEncontro) {
    abrirFormulario();
    $("sec-deck").hidden = true;
    return;
  }
  await carregarPilha();
}

iniciarEncontros().catch((err) => mostrarFora("Não foi possível abrir os encontros agora: " + err.message, false));
