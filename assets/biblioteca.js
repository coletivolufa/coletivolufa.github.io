/* Biblioteca dos Camaradas: estantes, busca, capas e ficha de cada livro */

let B = null;          // dados de data/biblioteca.json
let porId = {};        // livros por id
const vista = document.getElementById("vista");
const ficha = document.getElementById("ficha");

const normalizar = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const anoTexto = (a) => (a < 0 ? `${-a} a.C.` : String(a));
const estante = (id) => B.estantes.find((e) => e.id === id);
const indiceEstante = (id) => B.estantes.findIndex((e) => e.id === id);

function hash(t) { let h = 0; for (const c of t) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }

// ---------- capa gerada ----------
function capa(l) {
  const h = hash(l.id);
  const e = estante(l.estantes[0]);
  const cor = (indiceEstante(l.estantes[0]) + h) % 4;
  return `
    <div class="capa-livro cor-${cor} padrao-${h % 4}" aria-hidden="true">
      <span class="capa-livro__selo">${e ? e.simbolo : "★"}</span>
      <span class="capa-livro__ano">${esc(anoTexto(l.ano))}</span>
      <span class="capa-livro__titulo">${esc(l.titulo)}</span>
      <span class="capa-livro__autor">${esc(l.autor)}</span>
    </div>`;
}

function cartao(l) {
  return `
    <button type="button" class="livro-card" data-livro="${esc(l.id)}" aria-label="${esc(l.titulo)}, de ${esc(l.autor)}">
      ${capa(l)}
      ${l.pdf ? '<span class="livro-card__pdf">PDF</span>' : ""}
      <span class="livro-card__titulo">${esc(l.titulo)}</span>
      <span class="livro-card__autor">${esc(l.autor)}</span>
    </button>`;
}

// ---------- vistas ----------
function vistaInicial() {
  const destaques = B.livros.filter((l) => l.destaque);
  vista.innerHTML = `
    <div class="biblio-titulo"><h2>Estantes</h2><p>Escolha um tema para explorar.</p></div>
    <div class="estantes">
      ${B.estantes.map((e, i) => {
        const n = B.livros.filter((l) => l.estantes.includes(e.id)).length;
        return `
          <button type="button" class="estante estante--${i % 4}" data-estante="${e.id}">
            <span class="estante__simbolo" aria-hidden="true">${e.simbolo}</span>
            <span class="estante__nome">${esc(e.nome)}</span>
            <span class="estante__desc">${esc(e.descricao)}</span>
            <span class="estante__conta">${n} ${n === 1 ? "livro" : "livros"} →</span>
          </button>`;
      }).join("")}
    </div>
    <div class="biblio-titulo"><h2>Essenciais</h2><p>Por onde começar: os livros que todo camarada deveria conhecer.</p></div>
    <div class="destaques">${destaques.map(cartao).join("")}</div>
    <div class="biblio-titulo"><h2>Todos os livros</h2><p>${B.livros.length} livros em ordem alfabética.</p></div>
    <div class="grade-livros">${ordenar(B.livros, "titulo").map(cartao).join("")}</div>`;
}

function ordenar(lista, modo) {
  const c = [...lista];
  if (modo === "ano") c.sort((a, b) => a.ano - b.ano);
  else if (modo === "autor") c.sort((a, b) => a.autor.localeCompare(b.autor, "pt"));
  else c.sort((a, b) => a.titulo.localeCompare(b.titulo, "pt"));
  return c;
}

function vistaEstante(id, modo = "titulo") {
  const e = estante(id);
  if (!e) return vistaInicial();
  const livros = ordenar(B.livros.filter((l) => l.estantes.includes(id)), modo);
  vista.innerHTML = `
    <button type="button" class="biblio-voltar" data-ir="inicio">← Todas as estantes</button>
    <div class="biblio-titulo">
      <h2>${e.simbolo} ${esc(e.nome)}</h2>
      <label><span class="visualmente-oculto">Ordenar por</span>
        <select class="biblio-ordem" id="ordem">
          <option value="titulo"${modo === "titulo" ? " selected" : ""}>Título (A–Z)</option>
          <option value="autor"${modo === "autor" ? " selected" : ""}>Autor</option>
          <option value="ano"${modo === "ano" ? " selected" : ""}>Mais antigos primeiro</option>
        </select>
      </label>
      <p>${esc(e.descricao)} · ${livros.length} livros</p>
    </div>
    <div class="grade-livros">${livros.map(cartao).join("")}</div>`;
  document.getElementById("ordem").addEventListener("change", (ev) => vistaEstante(id, ev.target.value));
}

function vistaBusca(termo) {
  const t = normalizar(termo);
  const achados = B.livros.filter((l) => normalizar([l.titulo, l.autor, l.resumo, l.estantes.map((e) => estante(e).nome).join(" ")].join(" ")).includes(t));
  vista.innerHTML = `
    <button type="button" class="biblio-voltar" data-ir="inicio">← Todas as estantes</button>
    <div class="biblio-titulo"><h2>Busca</h2><p>${achados.length} ${achados.length === 1 ? "resultado" : "resultados"} para “${esc(termo)}”</p></div>
    ${achados.length ? `<div class="grade-livros">${ordenar(achados, "titulo").map(cartao).join("")}</div>`
      : '<div class="vazio">Nenhum livro encontrado. Tente outro título, autor ou assunto.</div>'}`;
}

// ---------- ficha do livro ----------
function biografias(autor) {
  if (B.autores[autor]) return [[autor, B.autores[autor]]];
  return autor.split(/ e (?=[A-ZÁÉ])/).filter((a) => B.autores[a]).map((a) => [a, B.autores[a]]);
}

function abrirFicha(id, { atualizarEndereco = true } = {}) {
  const l = porId[id];
  if (!l) return;
  const bios = biografias(l.autor);
  const autoresSet = new Set(l.autor.split(/ e (?=[A-ZÁÉ])/));
  const mais = B.livros.filter((x) => x.id !== l.id && x.autor.split(/ e (?=[A-ZÁÉ])/).some((a) => autoresSet.has(a) && a !== "Vários autores")).slice(0, 8);
  const pdf = l.formato === "PDF";
  document.getElementById("ficha-conteudo").innerHTML = `
    <div class="ficha__corpo">
      <div class="ficha__capa">${capa(l)}</div>
      <div>
        <div class="ficha__estantes">${l.estantes.map((e) => `<button type="button" data-estante="${e}">${esc(estante(e).nome)}</button>`).join("")}</div>
        <h2 id="ficha-titulo">${esc(l.titulo)}</h2>
        <div class="ficha__autor">${esc(l.autor)} <span>· ${esc(anoTexto(l.ano))}</span>
          ${l.idioma === "en" ? '<span class="ficha__idioma">Em inglês</span>' : ""}</div>
        <p class="ficha__resumo">${esc(l.resumo)}</p>
        <div class="ficha__acoes">
          ${l.pdf ? `<a class="botao botao--vermelho" href="${esc(l.pdf)}" download="${esc(l.id)}.pdf">Baixar PDF <small class="ficha__peso">${esc(l.pdf_mb)} MB</small></a>` : ""}
          ${pdf ? "" : `<a class="botao ${l.pdf ? "botao--claro" : "botao--vermelho"}" href="${esc(l.link)}" target="_blank" rel="noopener">Ler online →</a>`}
          <button class="botao botao--claro" type="button" data-compartilhar="${esc(l.id)}">Compartilhar</button>
        </div>
        ${l.pdf && l.pdf_edicao ? `<p class="ficha__edicao">Edição do PDF: <b>${esc(l.pdf_edicao)}</b>${l.pdf_origem ? ` · <a href="${esc(l.pdf_origem)}" target="_blank" rel="noopener">ver a edição original</a>` : ""}</p>` : ""}
        ${l.pdf ? "" : `<p class="ficha__aviso">${pdf
          ? `Este livro está disponível em PDF no ${esc(l.fonte)}: <a href="${esc(l.link)}" target="_blank" rel="noopener">abrir o PDF</a>.`
          : "PDF ainda não disponível no nosso acervo: o texto original está em domínio público, mas esta tradução tem direitos reservados pela editora. Você pode ler gratuitamente no link acima."}</p>`}
        ${bios.length ? `<div class="ficha__bloco"><h3>Sobre ${bios.length > 1 ? "os autores" : "o autor"}</h3>
          ${bios.map(([n, b]) => `<p><strong>${esc(n)}.</strong> ${esc(b)}</p>`).join("")}</div>` : ""}
        ${mais.length ? `<div class="ficha__bloco"><h3>Mais deste autor</h3><div class="ficha__mais">${mais.map(cartao).join("")}</div></div>` : ""}
        <p class="ficha__fonte">Texto em domínio público${l.pdf ? ". O PDF é uma edição da Biblioteca dos Camaradas, hospedada no nosso site" : ""}. Leitura online: ${esc(l.fonte)}${l.idioma === "en" ? " (tradução livre em inglês)" : ""}.</p>
      </div>
    </div>`;
  if (!ficha.open) ficha.showModal();
  ficha.scrollTop = 0;
  if (atualizarEndereco) history.pushState({ livro: id }, "", "#livro=" + id);
  document.title = `${l.titulo} · Biblioteca dos Camaradas`;
}

function fecharFicha() {
  if (ficha.open) ficha.close();
  document.title = "Biblioteca dos Camaradas · Coletivo Lufã";
}

async function compartilhar(id) {
  const l = porId[id];
  const url = location.origin + location.pathname + "#livro=" + id;
  const texto = `${l.titulo}, de ${l.autor}, na Biblioteca dos Camaradas do Coletivo Lufã`;
  try {
    if (navigator.share) { await navigator.share({ title: l.titulo, text: texto, url }); return; }
    await navigator.clipboard.writeText(url);
    const b = document.querySelector(`[data-compartilhar="${id}"]`);
    if (b) { b.textContent = "Link copiado!"; setTimeout(() => (b.textContent = "Compartilhar"), 2000); }
  } catch (_) { /* a pessoa cancelou */ }
}

// ---------- navegação pelo endereço (#estante=… / #livro=…) ----------
function irPara(alvo, empilhar = true) {
  fecharFicha();
  document.getElementById("busca").value = "";
  if (alvo === "inicio") { vistaInicial(); if (empilhar) history.pushState({}, "", location.pathname); }
  else { vistaEstante(alvo); if (empilhar) history.pushState({ estante: alvo }, "", "#estante=" + alvo); }
  document.querySelector(".secao").scrollIntoView({ behavior: "smooth", block: "start" });
}

function lerEndereco() {
  const p = new URLSearchParams(location.hash.slice(1));
  if (p.get("livro") && porId[p.get("livro")]) {
    if (!vista.querySelector(".grade-livros")) vistaInicial();
    abrirFicha(p.get("livro"), { atualizarEndereco: false });
  } else {
    fecharFicha();
    p.get("estante") ? vistaEstante(p.get("estante")) : vistaInicial();
  }
}

// ---------- eventos ----------
document.addEventListener("click", (ev) => {
  const el = ev.target.closest("[data-livro],[data-estante],[data-ir],[data-fechar],[data-compartilhar]");
  if (!el) return;
  if (el.dataset.livro) abrirFicha(el.dataset.livro);
  else if (el.dataset.estante) irPara(el.dataset.estante);
  else if (el.dataset.ir) irPara(el.dataset.ir);
  else if (el.dataset.compartilhar) compartilhar(el.dataset.compartilhar);
  else if (el.hasAttribute("data-fechar")) history.length > 1 && location.hash.startsWith("#livro") ? history.back() : fecharFicha();
});
ficha.addEventListener("click", (ev) => { if (ev.target === ficha) ficha.querySelector("[data-fechar]").click(); });
ficha.addEventListener("cancel", (ev) => { ev.preventDefault(); ficha.querySelector("[data-fechar]").click(); });
window.addEventListener("popstate", lerEndereco);

let espera;
document.getElementById("busca").addEventListener("input", (ev) => {
  clearTimeout(espera);
  espera = setTimeout(() => (ev.target.value.trim() ? vistaBusca(ev.target.value.trim()) : vistaInicial()), 180);
});

(async () => {
  try {
    B = await lerJSON("data/biblioteca.json");
    B.livros.forEach((l) => (porId[l.id] = l));
    const autores = new Set(B.livros.flatMap((l) => l.autor.split(/ e (?=[A-ZÁÉ])/)).filter((a) => a !== "Vários autores"));
    document.getElementById("numeros").innerHTML =
      `<span><b>${B.livros.length}</b>livros</span><span><b>${B.estantes.length}</b>estantes</span><span><b>${autores.size}</b>autores</span>`;
    lerEndereco();
  } catch (e) {
    vista.innerHTML = '<div class="vazio">Não foi possível abrir a biblioteca agora. Tente recarregar a página.</div>';
  }
})();
