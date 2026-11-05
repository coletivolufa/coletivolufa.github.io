/* Amizades: pedidos recebidos e enviados, e lista de amigos. Requer supabase/10-comunidade.sql. */
const $ = (id) => document.getElementById(id);
let eu = null;
let membros = new Map();

const avisar = (t) => { const el = $("aviso-amizades"); el.textContent = t; el.hidden = !t; };

function linhaPessoa(m, extra) {
  return `<div class="linha-amizade">
    <img class="av" src="${esc(m.foto || "assets/img/avatar.svg")}" alt="">
    <div class="linha-amizade__txt"><strong>${esc(m.nome || "Membro")}</strong><span class="apelido">${m.apelido ? "@" + esc(m.apelido) : ""}</span></div>
    ${extra}
  </div>`;
}

async function desenhar() {
  const { data } = await supa.from("amizades").select("id,de_id,para_id,status").order("criado_em", { ascending: false });
  const lista = data || [];
  const recebidos = lista.filter((a) => a.status === "pendente" && a.para_id === eu.id);
  const enviados = lista.filter((a) => a.status === "pendente" && a.de_id === eu.id);
  const amigos = lista.filter((a) => a.status === "aceita").map((a) => (a.de_id === eu.id ? a.para_id : a.de_id));

  $("lista-recebidos").innerHTML = recebidos.length
    ? recebidos.map((a) => linhaPessoa(membros.get(a.de_id) || {},
        `<span class="acoes-linha">
           <button type="button" class="btn-pequeno btn-pequeno--vermelho" data-aceitar="${a.id}">Aceitar</button>
           <button type="button" class="btn-pequeno btn-pequeno--suave" data-recusar="${a.id}">Recusar</button>
         </span>`)).join("")
    : '<p class="muted">Nenhum pedido recebido.</p>';

  $("lista-enviados").innerHTML = enviados.length
    ? enviados.map((a) => linhaPessoa(membros.get(a.para_id) || {}, '<span class="muted">aguardando</span>')).join("")
    : '<p class="muted">Você não enviou pedidos pendentes.</p>';

  $("lista-amigos").innerHTML = amigos.length
    ? amigos.map((id) => linhaPessoa(membros.get(id) || {},
        `<span class="acoes-linha">
           <a class="btn-pequeno btn-pequeno--suave" href="chat.html">Conversar</a>
           <button type="button" class="btn-pequeno btn-pequeno--link" data-desfazer="${id}">desfazer amizade</button>
         </span>`)).join("")
    : '<p class="muted">Você ainda não tem amigos. Encontre pessoas no feed ou em Pesquisar.</p>';
}

let amigoParaDesfazer = null;

function abrirConfirmacao(id) {
  const m = membros.get(id) || {};
  amigoParaDesfazer = id;
  $("modal-texto").textContent = `Você quer desfazer a amizade com ${m.nome || "esta pessoa"}${m.apelido ? " (@" + m.apelido + ")" : ""}? A conversa privada entre vocês será apagada.`;
  $("modal-desfazer").hidden = false;
  $("modal-cancelar").focus();
}

function fecharConfirmacao() {
  amigoParaDesfazer = null;
  $("modal-desfazer").hidden = true;
}

async function confirmarDesfazer(botao) {
  if (!amigoParaDesfazer) return;
  botao.disabled = true;
  const { error } = await supa.rpc("desfazer_amizade", { p_outro: amigoParaDesfazer });
  botao.disabled = false;
  fecharConfirmacao();
  if (error) return avisar(error.message);
  avisar("Amizade desfeita.");
  await desenhar();
}

async function responder(id, botao, acao) {
  botao.disabled = true;
  const { error } = await supa.rpc(acao, { p_id: Number(id) });
  if (error) { botao.disabled = false; return avisar(error.message); }
  avisar(acao === "aceitar_amizade" ? "Amizade aceita! Agora vocês podem conversar no bate-papo." : "");
  await desenhar();
}

async function iniciar() {
  const entrou = await entrarComunidade();
  if (!entrou) return;
  eu = entrou.eu;
  montarAbas("amizades");
  membros = await carregarMembros();
  await desenhar();

  $("conteudo").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.aceitar) return responder(b.dataset.aceitar, b, "aceitar_amizade");
    if (b.dataset.recusar) return responder(b.dataset.recusar, b, "recusar_amizade");
    if (b.dataset.desfazer) return abrirConfirmacao(b.dataset.desfazer);
  });
  $("modal-cancelar").addEventListener("click", fecharConfirmacao);
  $("modal-confirmar").addEventListener("click", (e) => confirmarDesfazer(e.currentTarget));
  $("modal-desfazer").addEventListener("click", (e) => { if (e.target.id === "modal-desfazer") fecharConfirmacao(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") fecharConfirmacao(); });
  supa.channel("amizades-pagina")
    .on("postgres_changes", { event: "*", schema: "public", table: "amizades" }, desenhar)
    .subscribe();
}

iniciar().catch(() => mostrarFora("Não foi possível abrir as amizades agora. Atualize a página e tente de novo.", false));
