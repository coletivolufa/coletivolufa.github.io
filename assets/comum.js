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
  militante: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M12 2.8l2.6 6.1 6.6.5-5 4.3 1.6 6.4L12 16.6l-5.8 3.5 1.6-6.4-5-4.3 6.6-.5z"/></svg>',
  inicio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M3 11 12 3l9 8v10h-6v-6H9v6H3z"/></svg>',
  jornal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M4 5h13v14H6a2 2 0 0 1-2-2z"/><path d="M17 9h3v8a2 2 0 0 1-2 2"/><path d="M7 9h7M7 13h7M7 16h4"/></svg>',
  artigos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M5 3h10l4 4v14H5z"/><path d="M9 11h6M9 15h6M9 7h3"/></svg>',
  formacao: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="1"/><path d="m10 9 5 3-5 3z" fill="currentColor"/></svg>',
  conta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.5 4.4-7 8-7s7 2.5 8 7"/></svg>',
  biblioteca: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M4 4h4v16H4zM10 4h4v16h-4z"/><path d="m16 5 3.8-1 3 15.5-3.8 1z"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
};

// o link da Área do Militante só aparece para membro ativo (a página e o banco também conferem)
function souMilitante() { try { return localStorage.getItem("lufa_militante") === "1"; } catch (_) { return false; } }

function montarMenu() {
  const pagina = document.body.dataset.pagina;
  const atual = (nome) => (pagina === nome ? ' aria-current="page"' : "");
  const menu = `
    <header class="topo">
      <a href="index.html"><img src="assets/img/logo-lufa-pomba.png" alt="">Coletivo Lufã</a>
      <button type="button" aria-label="Abrir menu" aria-expanded="false" data-abrir-menu>${ICONES.menu}</button>
    </header>
    <div class="fundo-menu" data-fechar-menu></div>
    <aside class="menu" aria-label="Menu principal">
      <a class="menu__marca" href="index.html">
        <img src="assets/img/logo-lufa-empilhado.png" alt="Coletivo Lufã">
      </a>
      <nav>
        <a href="index.html"${atual("inicio")}>${ICONES.inicio}Início</a>
        <a href="artigos.html"${atual("artigos")}>${ICONES.artigos}Artigos</a>
        <a href="jornal.html"${atual("jornal")}>${ICONES.jornal}Jornal</a>
        <a href="formacao.html"${atual("formacao")}>${ICONES.formacao}Formação</a>
        <a href="biblioteca.html"${atual("biblioteca")}>${ICONES.biblioteca}Biblioteca</a>
        <a href="militante.html"${atual("militante")} data-so-militante${souMilitante() ? "" : " hidden"}>${ICONES.militante}Área do militante</a>
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
        <a href="conta.html">Minha conta</a></div>
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
    .replace(/\[grande\]([\s\S]+?)\[\/grande\]/g, '<span class="tx-grande">$1</span>')
    .replace(/\[pequeno\]([\s\S]+?)\[\/pequeno\]/g, '<span class="tx-pequeno">$1</span>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  const fecharPar = () => { if (par.length) { html.push("<p>" + inline(par.join("<br>")) + "</p>"); par = []; } };
  const fecharLista = () => { if (lista) { html.push(`<${lista.tipo}>` + lista.itens.map((i) => "<li>" + inline(i) + "</li>").join("") + `</${lista.tipo}>`); lista = null; } };
  for (const bruta of linhas) {
    const l = bruta.trim();
    let m;
    if (!l) { fecharPar(); fecharLista(); continue; }
    if ((m = l.match(/^!\[([^\]]*)\]\((https:\/\/[^\s)]+)\)$/))) { fecharPar(); fecharLista(); html.push(`<figure class="artigo-imagem"><img src="${m[2]}" alt="${m[1]}" loading="lazy">${m[1] ? `<figcaption>${m[1]}</figcaption>` : ""}</figure>`); continue; }
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
  const limpo = String(texto || "").replace(/!\[[^\]]*\]\([^)]*\)/g, " ").replace(/\[\/?(grande|pequeno)\]/g, "").replace(/[#>*_\-\[\]()]/g, "").replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ").trim();
  return limpo.length > limite ? limpo.slice(0, limite).replace(/\s\S*$/, "") + "…" : limpo;
}

// Janelas em tela cheia (cadastro, artigo, inscrição…): quando o teclado do celular abre, o navegador
// às vezes empurra a janela inteira para cima e ela não volta. Aqui ela é mantida sempre no lugar.
(function () {
  const SEL = "dialog.ficha-mil, dialog.mil-janela-gerador";
  const zerar = (d) => { if (d && (d.scrollTop || d.scrollLeft)) { d.scrollTop = 0; d.scrollLeft = 0; } };
  document.addEventListener("scroll", (e) => { if (e.target && e.target.matches && e.target.matches(SEL)) zerar(e.target); }, true);
  const todas = () => document.querySelectorAll(SEL + "[open]").forEach(zerar);
  if (window.visualViewport) { visualViewport.addEventListener("resize", todas); visualViewport.addEventListener("scroll", todas); }
  window.addEventListener("resize", todas);
  document.addEventListener("focusout", () => setTimeout(todas, 50));
})();

document.addEventListener("DOMContentLoaded", montarMenu);

// fontes de pesquisa no fim do artigo (uma por linha; links viram clicáveis)
function fontesHTML(fontes) {
  const itens = String(fontes || "").split(/\r?\n/).map((t) => t.trim()).filter(Boolean);
  if (!itens.length) return "";
  const item = (t) => esc(t).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  return `<section class="artigo-fontes"><h2>Fontes</h2><ol>${itens.map((t) => `<li>${item(t)}</li>`).join("")}</ol></section>`;
}

// ---------- apoio: pop-up na primeira visita ao site (uma vez por aparelho) ----------
const LINK_APOIO = "https://widget.livepix.gg/embed/eab90305-07db-499f-a0a9-12c932a4902b";   // o do QR Code
const LINK_BOTAO_APOIO = "https://livepix.gg/coletivolufa";   // o do botão "Apoiar agora"
(function () {
  const CHAVE = "lufa_apoio_visto";
  try { if (localStorage.getItem(CHAVE)) return; } catch (_) { return; }
  if (/[?&]embutido=1/.test(location.search)) return;   // não aparece dentro do gerador embutido
  document.body.insertAdjacentHTML("beforeend", `
    <dialog class="apoio" id="janela-apoio" aria-labelledby="apoio-titulo">
      <button class="ficha__fechar apoio__x" type="button" aria-label="Fechar" data-fechar-apoio>×</button>
      <img class="apoio__logo" src="assets/img/logo-lufa-linha-amarela.png" alt="Coletivo Lufã">
      <h2 id="apoio-titulo">Você pode tornar este projeto <em>ainda mais forte!</em></h2>
      <p class="apoio__sub">Colabore com <b>qualquer valor</b>.</p>
      <div class="apoio__qr"><img src="assets/img/apoie-qrcode.png" alt="QR Code para apoiar o Coletivo Lufã" width="492" height="492"><small>Aponte a câmera do celular</small></div>
      <a class="botao apoio__botao" href="${LINK_BOTAO_APOIO}" target="_blank" rel="noopener" data-fechar-apoio>Apoiar agora ★</a>
      <button class="apoio__depois" type="button" data-fechar-apoio>Agora não</button>
    </dialog>`);
  const j = document.getElementById("janela-apoio");
  const marcar = () => { try { localStorage.setItem(CHAVE, "1"); } catch (_) {} };
  j.addEventListener("close", () => { marcar(); document.documentElement.classList.remove("janela-aberta"); });
  j.querySelectorAll("[data-fechar-apoio]").forEach((b) => b.addEventListener("click", () => setTimeout(() => j.close(), 50)));
  j.addEventListener("click", (e) => { if (e.target === j) j.close(); });   // tocar fora fecha
  // espera a página assentar e não abre por cima de outra janela (canal, cadastro, abertura do jornal…)
  let tentativas = 0;
  const tentar = () => {
    const ocupado = document.querySelector("dialog[open]:not(#janela-apoio)") || document.getElementById("abertura");
    if (ocupado) { if (++tentativas < 40) setTimeout(tentar, 1500); return; }
    j.showModal(); document.documentElement.classList.add("janela-aberta");
  };
  setTimeout(tentar, 2500);
})();
