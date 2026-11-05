/* Regimento Interno: o texto só é lido do banco por MEMBRO ATIVO.
   A proteção de verdade está em supabase/05-regimento-so-membros-ativos.sql;
   este arquivo só mostra a mensagem certa para cada caso. */

const estado = document.getElementById("estado");
const conteudo = document.getElementById("conteudo");

const escapar = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const negrito = (t) => escapar(t).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

// conversão mínima de Markdown (títulos, listas, linhas e parágrafos)
function markdownParaHTML(md) {
  const linhas = md.split("\n");
  let html = "", lista = null;
  const fecharLista = () => { if (lista) { html += `</${lista}>`; lista = null; } };
  for (const linha of linhas) {
    const t = linha.trim();
    let m;
    if (!t) { fecharLista(); continue; }
    if (/^---+$/.test(t)) { fecharLista(); html += "<hr>"; }
    else if ((m = t.match(/^(#{1,3})\s+(.*)$/))) { fecharLista(); const n = m[1].length; html += `<h${n}>${negrito(m[2])}</h${n}>`; }
    else if ((m = t.match(/^\d+\.\s+(.*)$/))) { if (lista !== "ol") { fecharLista(); html += "<ol>"; lista = "ol"; } html += `<li>${negrito(m[1])}</li>`; }
    else if ((m = t.match(/^-\s+(.*)$/))) { if (lista !== "ul") { fecharLista(); html += "<ul>"; lista = "ul"; } html += `<li>${negrito(m[1])}</li>`; }
    else { fecharLista(); html += `<p>${negrito(t)}</p>`; }
  }
  fecharLista();
  return html;
}

const mostrarAviso = (texto, html) => {
  conteudo.innerHTML = `<p class="regimento__aviso">${html || texto}</p>`;
};

async function carregar() {
  try {
    const { data: sessao } = await supa.auth.getSession();
    if (!sessao || !sessao.session) {
      return mostrarAviso("", 'Esta página é só para membros ativos. <a href="conta.html">Entre na sua conta</a> para continuar.');
    }
    const { data: ativo, error: erroAtivo } = await supa.rpc("sou_ativo");
    if (erroAtivo || ativo !== true) {
      return mostrarAviso("", "Esta página é só para membros ativos. Se você é membro ativo e não consegue entrar, fale com a coordenação.");
    }
    const { data, error } = await supa.from("regimento").select("texto").eq("id", 1).single();
    if (error || !data) return mostrarAviso("Não foi possível carregar o regimento agora. Tente de novo mais tarde.");
    conteudo.innerHTML = markdownParaHTML(data.texto);
  } catch (e) {
    mostrarAviso("Não foi possível verificar seu acesso agora. Tente de novo mais tarde.");
  }
}

carregar();
