/* Formação para Novos Militantes: séries de vídeo no estilo de streaming */

let F = null;
const player = document.getElementById("player");

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

function cartaoEpisodio(serie, ep) {
  const pronto = !!ep.video;
  return `
    <button type="button" class="episodio${pronto ? "" : " episodio--breve"}" data-serie="${esc(serie.id)}" data-ep="${esc(ep.id)}"
      aria-label="Episódio ${esc(ep.numero)}: ${esc(ep.titulo)}${pronto ? "" : " (em breve)"}">
      <span class="episodio__capa">
        ${ep.capa ? `<img src="${esc(ep.capa)}" alt="" loading="lazy">` : `<span class="episodio__sem-capa">EP. ${esc(ep.numero)}</span>`}
        <span class="episodio__num">EP. ${esc(ep.numero)}</span>
        ${pronto ? '<span class="episodio__play" aria-hidden="true">▶</span>' : '<span class="episodio__breve">Em breve</span>'}
      </span>
      <span class="episodio__titulo">${esc(ep.titulo)}</span>
      ${ep.duracao ? `<span class="episodio__dur">${esc(ep.duracao)}</span>` : ""}
    </button>`;
}

function desenhar() {
  const alvo = document.getElementById("series");
  if (!F.series.length) { alvo.innerHTML = '<p class="streaming__carregando">As primeiras séries chegam em breve.</p>'; return; }
  alvo.innerHTML = F.series.map((s, i) => {
    const eps = [...s.episodios].sort((a, b) => a.numero - b.numero);
    const primeiro = eps.find((e) => e.video);
    const perfil = s.perfil ? `<a href="${esc(linkPerfil(s.perfil, "instagram"))}" target="_blank" rel="noopener">@${esc(s.perfil.replace(/^@/, ""))}</a>` : "";
    return `
      <article class="serie${i === 0 ? " serie--destaque" : ""}" id="serie-${esc(s.id)}">
        <div class="serie__topo" ${s.banner ? `style="--banner:url('${esc(new URL(s.banner, location.href).href)}')"` : ""}>
          <div class="serie__info">
            <span class="serie__selo">Série${i === 0 ? " · comece por aqui" : ""}</span>
            <h2>${esc(s.titulo)}</h2>
            ${s.apresentador ? `<p class="serie__com">com ${esc(s.apresentador)}${perfil ? " do " + perfil : ""}</p>` : ""}
            <p class="serie__desc">${esc(s.descricao || "")}</p>
            <p class="serie__meta">${eps.length ? `${eps.length} ${eps.length === 1 ? "episódio" : "episódios"}${eps.some((e) => !e.video) ? " · novos episódios em breve" : ""}` : "Nova série · estreia em breve"}</p>
            ${primeiro ? `<button type="button" class="botao" data-serie="${esc(s.id)}" data-ep="${esc(primeiro.id)}">▶ Assistir</button>`
              : `<span class="serie__aviso">Primeiro episódio chegando em breve</span>`}
          </div>
        </div>
        <div class="fileira" role="list">${eps.length ? eps.map((e) => cartaoEpisodio(s, e)).join("")
          : `<div class="episodio episodio--breve" aria-label="Primeiro episódio em breve"><span class="episodio__capa"><span class="episodio__sem-capa">EP. 1</span><span class="episodio__breve">Em breve</span></span><span class="episodio__titulo">Primeiro episódio</span></div>`}</div>
      </article>`;
  }).join("");
}

function abrir(serieId, epId, empilhar = true) {
  const s = F.series.find((x) => x.id === serieId);
  if (!s) return;
  const eps = [...s.episodios].sort((a, b) => a.numero - b.numero);
  const ep = eps.find((e) => e.id === epId);
  if (!ep) return;
  const midia = incorporar(ep.video);
  const prox = eps[eps.indexOf(ep) + 1];
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

function lerEndereco() {
  const [s, e] = location.hash.slice(1).split("/");
  if (s && e) abrir(s, e, false); else fechar();
}

document.addEventListener("click", async (ev) => {
  const b = ev.target.closest("[data-ep],[data-fechar-player],[data-compartilhar-ep]");
  if (!b) return;
  if (b.dataset.ep) abrir(b.dataset.serie, b.dataset.ep);
  else if (b.hasAttribute("data-fechar-player")) location.hash ? history.back() : fechar();
  else if (b.dataset.compartilharEp) {
    const [s, e] = b.dataset.compartilharEp.split("|");
    const url = location.origin + location.pathname + `#${s}/${e}`;
    try {
      if (navigator.share) await navigator.share({ title: "Formação · Coletivo Lufã", url });
      else { await navigator.clipboard.writeText(url); b.textContent = "Link copiado!"; setTimeout(() => (b.textContent = "Compartilhar"), 2000); }
    } catch (_) {}
  }
});
player.addEventListener("click", (ev) => { if (ev.target === player) player.querySelector("[data-fechar-player]").click(); });
player.addEventListener("cancel", (ev) => { ev.preventDefault(); player.querySelector("[data-fechar-player]").click(); });
window.addEventListener("popstate", lerEndereco);

(async () => {
  try {
    F = await lerJSON("data/formacao.json");
    desenhar();
    lerEndereco();
  } catch (e) {
    document.getElementById("series").innerHTML = '<p class="streaming__carregando">Não foi possível carregar as séries agora.</p>';
  }
})();
