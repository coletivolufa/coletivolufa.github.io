/* Pesquisar: encontra uma pessoa pelo @arroba e pede amizade. Requer supabase/10-comunidade.sql. */
const $ = (id) => document.getElementById(id);
let eu = null;
let membros = new Map();
let amizades = { amigos: new Set(), enviados: new Map(), recebidos: new Map() };
let temporizador = null;

const avisar = (t) => { if (t) alert(t); };

function botao(m) {
  const sit = situacaoCom(amizades, eu.id, m.id);
  if (sit === "eu") return "";
  if (sit === "amigo") return '<a class="btn-pequeno btn-pequeno--suave" href="chat.html">Conversar</a>';
  if (sit === "enviado") return '<span class="muted">Pedido enviado</span>';
  if (sit === "recebido") return '<a class="btn-pequeno btn-pequeno--vermelho" href="amizades.html">Responder pedido</a>';
  return `<button type="button" class="btn-pequeno" data-amigo="${esc(m.apelido)}">Adicionar amigo</button>`;
}

function pesquisar() {
  const termo = $("busca").value.trim().toLowerCase().replace(/^@/, "");
  const r = $("resultados");
  if (!termo) { r.innerHTML = ""; return; }
  const achados = [...membros.values()].filter((m) => m.apelido && m.apelido.includes(termo));
  r.innerHTML = achados.length
    ? `<section class="card">${achados.slice(0, 30).map((m) => `<div class="linha-amizade">
        <img class="av perfil-clicavel" data-perfil="${m.id}" src="${esc(m.foto || "assets/img/avatar.svg")}" alt="">
        <div class="linha-amizade__txt"><strong class="perfil-clicavel" data-perfil="${m.id}">${esc(m.nome || "Membro")}</strong><span class="apelido">@${esc(m.apelido)}</span></div>
        ${botao(m)}
      </div>`).join("")}</section>`
    : '<p class="card muted">Ninguém com esse @arroba.</p>';
}

async function pedir(apelido, b) {
  b.disabled = true;
  const { data, error } = await supa.rpc("pedir_amizade", { p_apelido: apelido });
  if (error) { b.disabled = false; return $("resultados").insertAdjacentHTML("afterbegin", `<p class="aviso-com">${esc(error.message)}</p>`); }
  amizades = await carregarAmizades(eu.id);
  pesquisar();
  const textos = {
    enviado: `Pedido de amizade enviado para @${apelido}.`,
    aceito_automatico: `@${apelido} já tinha pedido: agora vocês são amigos.`,
    ja_enviado: `Você já pediu amizade para @${apelido}.`,
    ja_amigos: "Vocês já são amigos.",
  };
  if (textos[data]) $("resultados").insertAdjacentHTML("afterbegin", `<p class="aviso-com">${esc(textos[data])}</p>`);
}

async function iniciar() {
  const entrou = await entrarComunidade();
  if (!entrou) return;
  eu = entrou.eu;
  montarAbas("pesquisar");
  membros = await carregarMembros();
  amizades = await carregarAmizades(eu.id);

  $("busca").addEventListener("input", () => { clearTimeout(temporizador); temporizador = setTimeout(pesquisar, 150); });
  $("resultados").addEventListener("click", (e) => {
    const b = e.target.closest("[data-amigo]");
    if (b) pedir(b.dataset.amigo, b);
  });
}

iniciar().catch(() => mostrarFora("Não foi possível abrir a pesquisa agora. Atualize a página e tente de novo.", false));
