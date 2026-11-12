/* Formação (Centro de Formação Carlos Marighella): catálogo de séries no estilo de streaming */

let F = null;
const player = document.getElementById("player");
const detalhe = document.getElementById("detalhe");
const abs = (u) => (u ? new URL(u, location.href).href : "");
const epsDe = (s) => [...s.episodios].sort((a, b) => a.numero - b.numero);
const serie = (id) => F.series.find((x) => x.id === id);

// Aceita link do YouTube, do Instagram (reels/post) ou um arquivo de vídeo hospedado no site
function incorporar(video) {
  const v = String(video || "").trim();
  if (!v) return null;
  let m;
  if ((m = v.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/)))
    return { tipo: "iframe", src: `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0&playsinline=1`, vertical: /shorts\//.test(v) };
  if ((m = v.match(/instagram\.com\/(?:[\w.]+\/)?(reels?|p|tv)\/([\w-]+)/)))
    return { tipo: "iframe", src: `https://www.instagram.com/${m[1] === "reels" ? "reel" : m[1]}/${m[2]}/embed/`, vertical: true, instagram: true };
  if (/\.(mp4|webm|mov)(\?|$)/i.test(v)) return { tipo: "video", src: v, vertical: true };
  return { tipo: "link", src: v };
}

function perfilLink(s) {
  return s.perfil ? `<a href="${esc(linkPerfil(s.perfil, "instagram"))}" target="_blank" rel="noopener">@${esc(s.perfil.replace(/^@/, ""))}</a>` : "";
}
function metaSerie(s) {
  const eps = epsDe(s), prontos = eps.filter((e) => e.video).length;
  if (!eps.length) return "Nova série · estreia em breve";
  return `${eps.length} ${eps.length === 1 ? "episódio" : "episódios"}${prontos < eps.length ? " · novos em breve" : ""}`;
}

// ---------- cartões ----------
function cartaoSerie(s) {
  return `
    <button type="button" class="cartaz" data-detalhe="${esc(s.id)}" aria-label="Série ${esc(s.titulo)}">
      <span class="cartaz__img">${s.poster ? `<img src="${esc(s.poster)}" alt="" loading="lazy">` : `<span class="cartaz__sem">${esc(s.titulo)}</span>`}
        ${s.episodios.some((e) => e.video) ? "" : '<span class="cartaz__selo">Em breve</span>'}</span>
      <span class="cartaz__titulo">${esc(s.titulo)}</span>
      <span class="cartaz__meta">${esc(metaSerie(s))}</span>
    </button>`;
}
function cartaoEpisodio(s, ep, mostrarSerie = false) {
  const pronto = !!ep.video;
  return `
    <button type="button" class="episodio${pronto ? "" : " episodio--breve"}" data-serie="${esc(s.id)}" data-ep="${esc(ep.id)}"
      aria-label="${esc(s.titulo)}, episódio ${esc(ep.numero)}: ${esc(ep.titulo)}${pronto ? "" : " (em breve)"}">
      <span class="episodio__capa">
        ${ep.capa ? `<img src="${esc(ep.capa)}" alt="" loading="lazy">` : `<span class="episodio__sem-capa">EP. ${esc(ep.numero)}</span>`}
        <span class="episodio__num">EP. ${esc(ep.numero)}</span>
        ${pronto ? '<span class="episodio__play" aria-hidden="true">▶</span>' : '<span class="episodio__breve">Em breve</span>'}
      </span>
      ${mostrarSerie ? `<span class="episodio__serie">${esc(s.titulo)}</span>` : ""}
      <span class="episodio__titulo">${esc(ep.titulo)}</span>
      ${ep.duracao ? `<span class="episodio__dur">${esc(ep.duracao)}</span>` : ""}
    </button>`;
}
const cartaoEstreia = (s) => `
  <button type="button" class="episodio episodio--breve" data-detalhe="${esc(s.id)}" aria-label="${esc(s.titulo)}: primeiro episódio em breve">
    <span class="episodio__capa">${s.poster ? `<img src="${esc(s.poster)}" alt="" loading="lazy">` : '<span class="episodio__sem-capa">EP. 1</span>'}
      <span class="episodio__num">EP. 1</span><span class="episodio__breve">Em breve</span></span>
    <span class="episodio__titulo">Primeiro episódio</span>
  </button>`;

function fileira(titulo, conteudo, extra = "") {
  return `
    <section class="fileira-bloco">
      <div class="fileira-bloco__topo"><h2>${titulo}</h2>${extra}</div>
      <div class="fileira" role="list">${conteudo}</div>
    </section>`;
}

// ---------- destaque (hero) ----------
let slide = 0, relogio = null;
function desenharHero() {
  const hero = document.getElementById("hero");
  hero.innerHTML = F.series.map((s, i) => {
    const primeiro = epsDe(s).find((e) => e.video);
    return `
      <article class="hero__slide${i === slide ? " ativo" : ""}" style="--banner:url('${esc(abs(s.banner || s.poster))}');--poster:url('${esc(abs(s.poster || s.banner))}')"
        aria-roledescription="slide" aria-label="${i + 1} de ${F.series.length}: ${esc(s.titulo)}" ${i === slide ? "" : 'aria-hidden="true"'}>
        ${s.poster ? `<img class="hero__poster" src="${esc(s.poster)}" alt="" data-detalhe="${esc(s.id)}">` : ""}
        <div class="hero__info">
          <span class="serie__selo">${i === 0 ? "Série · comece por aqui" : primeiro ? "Série" : "Nova série"}</span>
          <h2>${esc(s.titulo)}</h2>
          ${s.apresentador ? `<p class="serie__com">com ${esc(s.apresentador)}${s.perfil ? " do " + perfilLink(s) : ""}</p>` : ""}
          <p class="serie__desc">${esc(s.descricao || "")}</p>
          <p class="serie__meta">${esc(metaSerie(s))}</p>
          <div class="hero__botoes">
            ${primeiro ? `<button type="button" class="botao" data-serie="${esc(s.id)}" data-ep="${esc(primeiro.id)}" ${i === slide ? "" : 'tabindex="-1"'}>▶ Assistir</button>`
              : `<span class="hero__breve">Estreia em breve</span>`}
            <button type="button" class="botao botao--escuro" data-detalhe="${esc(s.id)}" ${i === slide ? "" : 'tabindex="-1"'}>ⓘ Mais informações</button>
          </div>
        </div>
      </article>`;
  }).join("") + (F.series.length > 1 ? `<div class="hero__pontos">${F.series.map((s, i) =>
      `<button type="button" data-slide="${i}" aria-label="Ver ${esc(s.titulo)}" aria-current="${i === slide}"></button>`).join("")}</div>` : "");
}
function irSlide(i) {
  slide = (i + F.series.length) % F.series.length;
  document.querySelectorAll(".hero__slide").forEach((el, j) => {
    el.classList.toggle("ativo", j === slide);
    el.toggleAttribute("aria-hidden", j !== slide);
    el.querySelectorAll("button").forEach((b) => (j === slide ? b.removeAttribute("tabindex") : b.setAttribute("tabindex", "-1")));
  });
  document.querySelectorAll(".hero__pontos button").forEach((b, j) => b.setAttribute("aria-current", String(j === slide)));
}
function iniciarRelogio() {
  clearInterval(relogio);
  if (F.series.length > 1 && !matchMedia("(prefers-reduced-motion: reduce)").matches) relogio = setInterval(() => irSlide(slide + 1), 7000);
}

// ---------- catálogo ----------
function desenharCatalogo() {
  const recentes = [];
  F.series.forEach((s) => epsDe(s).forEach((e, idx) => e.video && recentes.push({ s, e, ordem: e.publicado || idx })));
  recentes.reverse();
  let html = fileira("Séries", F.series.map(cartaoSerie).join(""));
  if (recentes.length) html += fileira("Episódios recentes", recentes.slice(0, 12).map(({ s, e }) => cartaoEpisodio(s, e, true)).join(""));
  F.series.forEach((s) => {
    const eps = epsDe(s);
    html += fileira(esc(s.titulo), eps.length ? eps.map((e) => cartaoEpisodio(s, e)).join("") : cartaoEstreia(s),
      `<button type="button" class="fileira-bloco__ver" data-detalhe="${esc(s.id)}">Ver série ›</button>`);
  });
  document.getElementById("fileiras").innerHTML = html;
}

// ---------- ficha da série ----------
function abrirDetalhe(id, empilhar = true) {
  const s = serie(id);
  if (!s) return;
  const eps = epsDe(s), primeiro = eps.find((e) => e.video);
  document.getElementById("detalhe-conteudo").innerHTML = `
    <div class="detalhe__topo" style="--banner:url('${esc(abs(s.banner || s.poster))}');--poster:url('${esc(abs(s.poster || s.banner))}')">
      ${s.poster ? `<img class="detalhe__poster" src="${esc(s.poster)}" alt="">` : ""}
      <div class="detalhe__info">
        <span class="serie__selo">Série</span>
        <h2 id="detalhe-titulo">${esc(s.titulo)}</h2>
        ${s.apresentador ? `<p class="serie__com">com ${esc(s.apresentador)}${s.perfil ? " do " + perfilLink(s) : ""}</p>` : ""}
        <p class="serie__meta">${esc(metaSerie(s))}</p>
        <div class="hero__botoes">
          ${primeiro ? `<button type="button" class="botao" data-serie="${esc(s.id)}" data-ep="${esc(primeiro.id)}">▶ Assistir EP. ${esc(primeiro.numero)}</button>` : '<span class="hero__breve">Estreia em breve</span>'}
          <button type="button" class="botao botao--escuro" data-compartilhar-serie="${esc(s.id)}">Compartilhar</button>
        </div>
      </div>
    </div>
    <div class="detalhe__corpo">
      <p class="detalhe__desc">${esc(s.descricao || "")}</p>
      <h3>Episódios</h3>
      ${eps.length ? `<ol class="detalhe__eps">${eps.map((e) => `
        <li><button type="button" data-serie="${esc(s.id)}" data-ep="${esc(e.id)}" class="${e.video ? "" : "breve"}">
          <span class="detalhe__num">${esc(e.numero)}</span>
          <span class="detalhe__mini">${e.capa ? `<img src="${esc(e.capa)}" alt="" loading="lazy">` : ""}<span>${e.video ? "▶" : "Em breve"}</span></span>
          <span class="detalhe__txt"><b>${esc(e.titulo)}</b>${e.duracao ? `<small>${esc(e.duracao)}</small>` : ""}<span>${esc(e.descricao || "")}</span></span>
        </button></li>`).join("")}</ol>`
        : '<p class="detalhe__vazio">O primeiro episódio chega em breve. Siga o <a href="https://www.instagram.com/coletivolufa/" target="_blank" rel="noopener">@coletivolufa</a> para não perder.</p>'}
    </div>`;
  if (!detalhe.open) detalhe.showModal();
  detalhe.scrollTop = 0;
  if (empilhar) history.pushState({}, "", `#serie=${s.id}`);
}
function fecharDetalhe() { if (detalhe.open) detalhe.close(); }

// ---------- player ----------
// assistir exige cadastro: sem conta, abre a janela pedindo login ou cadastro
const pedido = document.getElementById("pedir-conta");
async function temConta() { try { return !!(await usuarioAtual()); } catch (_) { return false; } }
function pedirConta(serieId, epId) {
  const voltar = encodeURIComponent(`formacao.html#${serieId}/${epId}`);
  document.getElementById("pedir-cadastrar").href = `conta.html?criar=1&voltar=${voltar}`;
  document.getElementById("pedir-entrar").href = `conta.html?voltar=${voltar}`;
  fecharDetalhe();
  if (!pedido.open) pedido.showModal();
}
pedido.querySelector("[data-fechar-pedido]").addEventListener("click", () => pedido.close());
pedido.addEventListener("click", (ev) => { if (ev.target === pedido) pedido.close(); });

async function abrir(serieId, epId, empilhar = true) {
  if (!(await temConta())) { if (!empilhar && location.hash) history.replaceState({}, "", location.pathname); return pedirConta(serieId, epId); }
  const s = serie(serieId);
  if (!s) return;
  const eps = epsDe(s), ep = eps.find((e) => e.id === epId);
  if (!ep) return;
  fecharDetalhe();
  const midia = incorporar(ep.video), prox = eps[eps.indexOf(ep) + 1];
  let tela;
  if (!midia) tela = `<div class="player__breve">${ep.capa ? `<img src="${esc(ep.capa)}" alt="">` : ""}<span>Este episódio chega em breve.<br>Siga <a href="${esc(linkPerfil(s.perfil || "coletivolufa", "instagram"))}" target="_blank" rel="noopener">@${esc((s.perfil || "coletivolufa").replace(/^@/, ""))}</a> para não perder.</span></div>`;
  else if (midia.tipo === "video") tela = `<video src="${esc(midia.src)}" ${ep.capa ? `poster="${esc(ep.capa)}"` : ""} controls playsinline autoplay preload="metadata"></video>`;
  else if (midia.tipo === "iframe") tela = `<iframe src="${esc(midia.src)}" title="${esc(ep.titulo)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy"${midia.instagram ? ' scrolling="no"' : ""}></iframe>`;
  else tela = `<div class="player__breve"><a class="botao" href="${esc(midia.src)}" target="_blank" rel="noopener">Assistir no site do vídeo →</a></div>`;
  document.getElementById("player-conteudo").innerHTML = `
    <div class="player__corpo">
      <div class="player__tela${midia && !midia.vertical ? " player__tela--larga" : ""}">${tela}</div>
      <div class="player__texto">
        <span class="serie__selo">${esc(s.titulo)} · EP. ${esc(ep.numero)}</span>
        <h2 id="player-titulo">${esc(ep.titulo)}</h2>
        ${ep.duracao ? `<p class="serie__meta">${esc(ep.duracao)}</p>` : ""}
        <p>${esc(ep.descricao || "")}</p>
        <div class="ficha__acoes">
          ${prox ? `<button type="button" class="botao botao--vermelho" data-serie="${esc(s.id)}" data-ep="${esc(prox.id)}">Próximo: EP. ${esc(prox.numero)} →</button>` : ""}
          <button type="button" class="botao botao--claro" data-compartilhar-ep="${esc(s.id)}|${esc(ep.id)}">Compartilhar</button>
        </div>
        <h3>Episódios</h3>
        <ol class="player__lista">${eps.map((e) => `
          <li><button type="button" data-serie="${esc(s.id)}" data-ep="${esc(e.id)}" ${e.id === ep.id ? 'aria-current="true"' : ""}>
            <b>EP. ${esc(e.numero)}</b> ${esc(e.titulo)} ${e.video ? "" : "<small>em breve</small>"}</button></li>`).join("")}
        </ol>
      </div>
    </div>`;
  if (!player.open) player.showModal();
  player.scrollTop = 0;
  if (empilhar) history.pushState({}, "", `#${s.id}/${ep.id}`);
}
function fechar() {
  const v = player.querySelector("video"); if (v) v.pause();
  document.getElementById("player-conteudo").innerHTML = "";
  if (player.open) player.close();
}

// ---------- endereço (#serie=… ou #serie/episodio) ----------
function lerEndereco() {
  const h = location.hash.slice(1);
  if (h.startsWith("serie=")) { fechar(); abrirDetalhe(h.slice(6), false); return; }
  const [s, e] = h.split("/");
  if (s && e) abrir(s, e, false); else { fechar(); fecharDetalhe(); }
}

async function compartilhar(b, url, titulo) {
  try {
    if (navigator.share) await navigator.share({ title: titulo, url });
    else { await navigator.clipboard.writeText(url); const t = b.textContent; b.textContent = "Link copiado!"; setTimeout(() => (b.textContent = t), 2000); }
  } catch (_) {}
}

document.addEventListener("click", (ev) => {
  const b = ev.target.closest("[data-ep],[data-detalhe],[data-slide],[data-fechar-player],[data-fechar-detalhe],[data-compartilhar-ep],[data-compartilhar-serie]");
  if (!b) return;
  const base = location.origin + location.pathname;
  if (b.dataset.ep) abrir(b.dataset.serie, b.dataset.ep);
  else if (b.dataset.detalhe) abrirDetalhe(b.dataset.detalhe);
  else if (b.dataset.slide) { irSlide(Number(b.dataset.slide)); iniciarRelogio(); }
  else if (b.hasAttribute("data-fechar-player") || b.hasAttribute("data-fechar-detalhe")) location.hash ? history.back() : (fechar(), fecharDetalhe());
  else if (b.dataset.compartilharEp) { const [s, e] = b.dataset.compartilharEp.split("|"); compartilhar(b, `${base}#${s}/${e}`, "Formação · Coletivo Lufã"); }
  else if (b.dataset.compartilharSerie) compartilhar(b, `${base}#serie=${b.dataset.compartilharSerie}`, "Formação · Coletivo Lufã");
});
for (const d of [player, detalhe]) {
  const x = d.querySelector(".ficha__fechar");
  d.addEventListener("click", (ev) => { if (ev.target === d) x.click(); });
  d.addEventListener("cancel", (ev) => { ev.preventDefault(); x.click(); });
}
window.addEventListener("popstate", lerEndereco);
document.getElementById("hero").addEventListener("mouseenter", () => clearInterval(relogio));
document.getElementById("hero").addEventListener("mouseleave", iniciarRelogio);

(async () => {
  try {
    F = await lerJSON("data/formacao.json");
    if (!F.series.length) { document.getElementById("fileiras").innerHTML = '<p class="streaming__carregando">As primeiras séries chegam em breve.</p>'; return; }
    desenharHero(); desenharCatalogo(); iniciarRelogio(); lerEndereco();
  } catch (e) {
    document.getElementById("fileiras").innerHTML = '<p class="streaming__carregando">Não foi possível carregar o catálogo agora.</p>';
  }
})();
