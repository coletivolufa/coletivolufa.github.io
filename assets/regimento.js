/* Regimento Interno: aberto a todos, com ou sem conta.
   Lê o texto do banco (supabase/06-regimento-publico.sql); se o banco não
   responder, usa o arquivo regimento-interno.md do site. */

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
  // 1) texto do banco (atualizado pelo SQL Editor); 2) se o banco recusar, o arquivo do site
  try {
    const { data, error } = await supa.from("regimento").select("texto").eq("id", 1).maybeSingle();
    if (!error && data && data.texto) { conteudo.innerHTML = markdownParaHTML(data.texto); return; }
  } catch (_) { /* segue para o arquivo */ }
  try {
    const r = await fetch("regimento-interno.md?v=" + Date.now(), { cache: "no-store" });
    if (!r.ok) throw new Error();
    conteudo.innerHTML = markdownParaHTML(await r.text());
  } catch (e) {
    mostrarAviso("Não foi possível carregar o regimento agora. Tente de novo mais tarde.");
  }
}

carregar();
