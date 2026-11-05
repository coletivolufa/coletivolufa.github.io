/* Faixa de novidades no topo do site: novidades gerais (data/novidades.json) e, para quem está logado,
   novos membros e avisos pessoais (mensagens e pedidos de amizade ainda não vistos). */
(function () {
  const DIAS_NOVO_MEMBRO = 14;

  function item(texto, link, onClick) {
    const a = document.createElement("a");
    a.className = "faixa__item";
    a.href = link || "#";
    a.textContent = texto;
    if (onClick) a.addEventListener("click", onClick);
    return a;
  }

  function desenhar(itens) {
    const trilho = document.querySelector("#faixa-novidades .faixa__trilho");
    if (!trilho) return;
    trilho.innerHTML = "";
    itens.forEach((el) => trilho.appendChild(el));
    // repete a sequência para o movimento ficar contínuo
    itens.forEach((el) => trilho.appendChild(el.cloneNode(true)));
    document.getElementById("faixa-novidades").hidden = itens.length === 0;
  }

  // novidades gerais, montadas sozinhas a partir dos arquivos do site (últimos 30 dias)
  async function coletarGerais() {
    const limite = Date.now() - 30 * 86400000;
    const achados = [];
    try {
      const artigos = await (await fetch("data/artigos.json", { cache: "no-cache" })).json();
      (Array.isArray(artigos) ? artigos : []).forEach((a) => {
        const t = Date.parse(a.data);
        if (t >= limite) achados.push({ t, texto: "Novo artigo: " + a.titulo, link: "artigos.html?a=" + encodeURIComponent(a.slug) });
      });
    } catch (_) { /* sem artigos */ }
    try {
      const formacao = await (await fetch("data/formacao.json", { cache: "no-cache" })).json();
      (formacao.series || []).forEach((s) => {
        const eps = s.episodios || [];
        if (!eps.length && s.publicado_em) {
          const t = Date.parse(s.publicado_em);
          if (t >= limite) achados.push({ t, texto: `Nova série: ${s.titulo}, com ${s.apresentador}`, link: "formacao.html" });
        }
        eps.forEach((e) => {
          const t = Date.parse(e.publicado_em || "");
          if (t >= limite) achados.push({ t, texto: `Novo episódio: ${s.titulo} · EP. ${e.numero}, ${e.titulo}`, link: "formacao.html" });
        });
      });
    } catch (_) { /* sem formação */ }
    return achados.sort((a, b) => b.t - a.t).slice(0, 8).map((n) => item(n.texto, n.link));
  }

  async function montarItens() {
    const gerais = await coletarGerais();

    const pessoais = [];
    if (typeof supa !== "undefined") {
      try {
        const { data: sessao } = await supa.auth.getSession();
        if (sessao && sessao.session) {
          const { data: avisos } = await supa.from("notificacoes")
            .select("id,tipo,texto,conversa_id").eq("lida", false).order("criado_em", { ascending: false }).limit(5);
          (avisos || []).forEach((a) => {
            const link = a.tipo === "pedido_amizade" ? "amizades.html" : a.conversa_id ? "chat.html" : "comunidade.html";
            pessoais.push(item("● " + a.texto, link, async () => {
              await supa.from("notificacoes").update({ lida: true }).eq("id", a.id);
            }));
          });
          const desde = new Date(Date.now() - DIAS_NOVO_MEMBRO * 86400000).toISOString();
          const { data: novos } = await supa.from("membros_publicos")
            .select("nome,aprovado_em").gt("aprovado_em", desde).order("aprovado_em", { ascending: false }).limit(3);
          (novos || []).forEach((m) => pessoais.push(item(`Novo membro no site: ${(m.nome || "").split(" ")[0]}`, "comunidade.html")));
        }
      } catch (_) { /* sem conexão com o banco */ }
    }
    return [...pessoais, ...gerais];
  }

  function criarFaixa() {
    const faixa = document.createElement("div");
    faixa.id = "faixa-novidades";
    faixa.className = "faixa-novidades";
    faixa.hidden = true;
    faixa.innerHTML = `<span class="faixa__rotulo">Novidades</span>
      <div class="faixa__janela"><div class="faixa__trilho"></div></div>
      <button type="button" class="faixa__fechar" aria-label="Fechar novidades">✕</button>`;
    const topo = document.querySelector(".topo");
    if (topo && topo.parentNode) topo.parentNode.insertBefore(faixa, topo.nextSibling);
    else document.body.prepend(faixa);
    faixa.querySelector(".faixa__fechar").addEventListener("click", () => {
      faixa.hidden = true;
    });
  }

  async function iniciar() {
    criarFaixa();
    desenhar(await montarItens());
    if (typeof supa !== "undefined") {
      const { data: sessao } = await supa.auth.getSession();
      if (sessao && sessao.session) {
        const eu = sessao.session.user.id;
        supa.channel("novidades-" + eu)
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "notificacoes", filter: "para_id=eq." + eu }, async () => {
            desenhar(await montarItens());
          })
          .subscribe();
      }
    }
  }

  document.addEventListener("DOMContentLoaded", iniciar);
})();
