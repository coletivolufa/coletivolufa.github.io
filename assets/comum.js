/* Coletivo Lufã — código comum a todas as páginas */

// Onde ficam os dados do site no GitHub. A área de publicação grava aqui.
// Se mudar o nome do repositório ou do branch principal, altere estes valores.
const LUFA = {
  dono: "coletivolufa",
  repositorio: "coletivolufa.github.io",
  branch: "main",
  pasta: "",
};

const ICONES = {
  inicio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M3 11 12 3l9 8v10h-6v-6H9v6H3z"/></svg>',
  artigos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M5 3h10l4 4v14H5z"/><path d="M9 11h6M9 15h6M9 7h3"/></svg>',
  formacao: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="1"/><path d="m10 9 5 3-5 3z" fill="currentColor"/></svg>',
  conta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.5 4.4-7 8-7s7 2.5 8 7"/></svg>',
  biblioteca: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M4 4h4v16H4zM10 4h4v16h-4z"/><path d="m16 5 3.8-1 3 15.5-3.8 1z"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
};

function montarMenu() {
  const pagina = document.body.dataset.pagina;
  const atual = (nome) => (pagina === nome ? ' aria-current="page"' : "");
  const menu = `
    <header class="topo">
      <a href="index.html"><img src="assets/img/logo.png" alt="">Coletivo Lufã</a>
      <button type="button" aria-label="Abrir menu" aria-expanded="false" data-abrir-menu>${ICONES.menu}</button>
    </header>
    <div class="fundo-menu" data-fechar-menu></div>
    <aside class="menu" aria-label="Menu principal">
      <a class="menu__marca" href="index.html">
        <img src="assets/img/logo.png" alt="Logo do Coletivo Lufã: pomba branca sobre fundo vermelho">
        <span>Coletivo Lufã</span>
      </a>
      <nav>
        <a href="index.html"${atual("inicio")}>${ICONES.inicio}Início</a>
        <a href="artigos.html"${atual("artigos")}>${ICONES.artigos}Artigos</a>
        <a href="formacao.html"${atual("formacao")}>${ICONES.formacao}Formação</a>
        <a href="biblioteca.html"${atual("biblioteca")}>${ICONES.biblioteca}Biblioteca</a>
        <a href="conta.html"${atual("conta")}>${ICONES.conta}Minha conta</a>
      </nav>
      <div class="menu__rodape">
        Siga <a href="https://www.instagram.com/coletivolufa/" target="_blank" rel="noopener">@coletivolufa</a>
      </div>
    </aside>`;
  document.body.insertAdjacentHTML("afterbegin", menu);
  const botao = document.querySelector("[data-abrir-menu]");
  const alternar = (abrir) => {
    document.body.classList.toggle("menu-aberto", abrir);
    botao.setAttribute("aria-expanded", String(abrir));
  };
  botao.addEventListener("click", () => alternar(!document.body.classList.contains("menu-aberto")));
  document.querySelector("[data-fechar-menu]").addEventListener("click", () => alternar(false));
  document.addEventListener("keydown", (e) => e.key === "Escape" && alternar(false));

  // o rodapé fica dentro do <main> para respeitar o menu lateral
  document.querySelector("main").insertAdjacentHTML("beforeend", `
    <footer class="rodape">
      <div class="conteudo">
        <div><strong>Coletivo Lufã</strong><br>Coletivo marxista de esquerda radical.</div>
        <div>Organização sem fins lucrativos · <a href="https://www.instagram.com/coletivolufa/" target="_blank" rel="noopener">@coletivolufa</a><br>
        <a href="publicar.html">Área dos membros</a></div>
      </div>
    </footer>`);
}

// ---------- utilidades ----------
function esc(texto) {
  return String(texto ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function dataPorExtenso(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return d.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
}

async function lerJSON(caminho) {
  const r = await fetch(caminho + "?v=" + Date.now(), { cache: "no-store" });
  if (!r.ok) throw new Error("Não foi possível carregar " + caminho);
  return r.json();
}

function linkPerfil(arroba, rede) {
  const usuario = String(arroba || "").replace(/^@/, "").trim();
  if (!usuario) return "";
  const bases = {
    instagram: "https://www.instagram.com/",
    tiktok: "https://www.tiktok.com/@",
    x: "https://x.com/",
    youtube: "https://www.youtube.com/@",
    threads: "https://www.threads.net/@",
    bluesky: "https://bsky.app/profile/",
  };
  return (bases[rede] || bases.instagram) + encodeURIComponent(usuario);
}

// Markdown simples e seguro (o HTML digitado é escapado antes)
function markdown(texto) {
  const linhas = esc(texto).replace(/\r/g, "").split("\n");
  const html = [];
  let par = [], lista = null;
  const inline = (s) => s
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  const fecharPar = () => { if (par.length) { html.push("<p>" + inline(par.join("<br>")) + "</p>"); par = []; } };
  const fecharLista = () => { if (lista) { html.push(`<${lista.tipo}>` + lista.itens.map((i) => "<li>" + inline(i) + "</li>").join("") + `</${lista.tipo}>`); lista = null; } };
  for (const bruta of linhas) {
    const l = bruta.trim();
    let m;
    if (!l) { fecharPar(); fecharLista(); continue; }
    if ((m = l.match(/^(#{2,3})\s+(.*)/))) { fecharPar(); fecharLista(); const n = m[1].length; html.push(`<h${n}>${inline(m[2])}</h${n}>`); continue; }
    if (/^(-{3,}|\*{3,})$/.test(l)) { fecharPar(); fecharLista(); html.push("<hr>"); continue; }
    if ((m = l.match(/^&gt;\s?(.*)/))) { fecharPar(); fecharLista(); html.push("<blockquote>" + inline(m[1]) + "</blockquote>"); continue; }
    if ((m = l.match(/^[-*]\s+(.*)/)) || (m = l.match(/^\d+[.)]\s+(.*)/))) {
      fecharPar();
      const tipo = /^\d/.test(l) ? "ol" : "ul";
      if (!lista || lista.tipo !== tipo) { fecharLista(); lista = { tipo, itens: [] }; }
      lista.itens.push(m[1]);
      continue;
    }
    fecharLista();
    par.push(l);
  }
  fecharPar(); fecharLista();
  return html.join("\n");
}

function resumir(texto, limite = 220) {
  const limpo = String(texto || "").replace(/[#>*_\-\[\]()]/g, "").replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ").trim();
  return limpo.length > limite ? limpo.slice(0, limite).replace(/\s\S*$/, "") + "…" : limpo;
}

document.addEventListener("DOMContentLoaded", montarMenu);
