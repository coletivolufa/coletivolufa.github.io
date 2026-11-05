/* Avisos: toca um sonzinho e mostra um aviso na tela quando chega pedido de amizade ou mensagem.
   Depende de assets/supa.js. O navegador só deixa tocar som depois de um toque na página. */
(function () {
  let contexto = null;

  function liberarSom() {
    try {
      contexto = contexto || new (window.AudioContext || window.webkitAudioContext)();
      if (contexto.state === "suspended") contexto.resume();
    } catch (_) { /* navegador sem áudio */ }
  }
  ["pointerdown", "keydown", "touchstart"].forEach((ev) => document.addEventListener(ev, liberarSom, { passive: true }));

  function tocarSom() {
    if (!contexto || contexto.state !== "running") return;
    const t = contexto.currentTime;
    [[880, 0], [1320, 0.13]].forEach(([freq, atraso]) => {
      const o = contexto.createOscillator();
      const g = contexto.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t + atraso);
      g.gain.exponentialRampToValueAtTime(0.22, t + atraso + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + atraso + 0.4);
      o.connect(g).connect(contexto.destination);
      o.start(t + atraso);
      o.stop(t + atraso + 0.45);
    });
  }

  function mostrarAviso(texto) {
    let caixa = document.getElementById("avisos-tela");
    if (!caixa) {
      caixa = document.createElement("div");
      caixa.id = "avisos-tela";
      caixa.setAttribute("role", "status");
      caixa.setAttribute("aria-live", "polite");
      document.body.appendChild(caixa);
    }
    const item = document.createElement("div");
    item.className = "aviso-tela";
    item.textContent = texto;
    caixa.appendChild(item);
    setTimeout(() => item.remove(), 6000);
  }

  async function iniciar() {
    if (typeof supa === "undefined") return;
    const { data: sessao } = await supa.auth.getSession();
    if (!sessao || !sessao.session) return;
    const eu = sessao.session.user.id;
    supa.channel("avisos-" + eu)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notificacoes", filter: "para_id=eq." + eu }, (p) => {
        tocarSom();
        mostrarAviso(p.new.texto);
      })
      .subscribe();
  }

  iniciar();
})();
