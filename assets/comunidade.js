/* Comunidade: abas, entrada com @apelido obrigatório e utilidades comuns (feed, encontros e bate-papo).
   Usa supa (assets/supa.js) e esc (assets/comum.js). */
const ABAS_COM = [
  ["feed", "Feed", "comunidade.html"],
  ["bate-papo", "Bate-papo", "chat.html"],
];
const REGEX_APELIDO = /^[a-z0-9_.]{3,20}$/;

function montarAbas(atual) {
  const main = document.querySelector("main");
  if (!main || main.querySelector(".abas-com")) return;
  const nav = document.createElement("nav");
  nav.className = "abas-com";
  nav.setAttribute("aria-label", "Comunidade");
  nav.innerHTML = ABAS_COM.map(([k, t, h]) =>
    `<a href="${h}" class="aba-com${k === atual ? " ativa" : ""}"${k === atual ? ' aria-current="page"' : ""}>${t}</a>`
  ).join("");
  main.prepend(nav);
}

function mostrarFora(texto, comLogin) {
  const e = document.getElementById("estado");
  const c = document.getElementById("conteudo");
  if (c) c.hidden = true;
  if (!e) return;
  e.className = "estado";
  e.hidden = false;
  e.textContent = texto;
  if (comLogin) {
    const a = document.createElement("a");
    a.href = "conta.html";
    a.textContent = " Entrar na conta";
    e.appendChild(a);
  }
}

function mostrarConteudo() {
  const e = document.getElementById("estado");
  const c = document.getElementById("conteudo");
  if (e) e.hidden = true;
  if (c) c.hidden = false;
}

// formulário que pede o @apelido na primeira vez. Só retorna quando o apelido foi salvo.
function garantirApelido(eu, perfil) {
  if (perfil.apelido) return Promise.resolve(perfil);
  return new Promise((resolver) => {
    const main = document.querySelector("main");
    const gate = document.createElement("section");
    gate.className = "gate";
    gate.innerHTML = `
      <h2>Crie seu @apelido</h2>
      <p>É pelo @apelido que as pessoas encontram você na comunidade. Use de 3 a 20 letras minúsculas, números, ponto ou traço baixo. Exemplo: <strong>@ana.lufa</strong></p>
      <form class="gate__form" novalidate>
        <span class="arroba">@</span>
        <input id="gate-apelido" maxlength="20" autocomplete="off" placeholder="seu.apelido" aria-label="Seu @apelido">
        <button class="botao-com" type="submit">Salvar</button>
      </form>
      <p class="aviso-com" id="gate-aviso" hidden></p>`;
    main.insertBefore(gate, main.querySelector("#estado") || main.firstElementChild);
    const campo = gate.querySelector("#gate-apelido");
    const aviso = gate.querySelector("#gate-aviso");
    campo.focus();
    gate.querySelector("form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const apelido = campo.value.trim().toLowerCase().replace(/^@/, "");
      if (!REGEX_APELIDO.test(apelido)) {
        aviso.hidden = false;
        aviso.textContent = "Use de 3 a 20 letras minúsculas, números, ponto ou traço baixo.";
        return;
      }
      const botao = gate.querySelector("button");
      botao.disabled = true;
      const { error } = await supa.from("perfis").update({ apelido }).eq("id", eu.id);
      botao.disabled = false;
      if (error) {
        aviso.hidden = false;
        aviso.textContent = /duplicate|unique|23505/i.test(error.message)
          ? "Esse @apelido já existe. Escolha outro."
          : "Não foi possível salvar: " + error.message;
        return;
      }
      perfil.apelido = apelido;
      gate.remove();
      resolver(perfil);
    });
  });
}

// checa sessão, aprovação e @apelido. Retorna { eu, perfil } ou null (e mostra o motivo).
async function entrarComunidade() {
  const { data: sessao } = await supa.auth.getSession();
  if (!sessao || !sessao.session) {
    mostrarFora("Entre na sua conta para participar da comunidade.", true);
    return null;
  }
  const { data: aprovado } = await supa.rpc("sou_aprovado");
  if (aprovado !== true) {
    mostrarFora("A comunidade é para membros aprovados. Se você acabou de se cadastrar, aguarde a aprovação da secretaria.", false);
    return null;
  }
  const eu = sessao.session.user;
  const { data: perfil, error } = await supa.from("perfis")
    .select("id,nome,foto,papel,funcao,apelido").eq("id", eu.id).single();
  if (error || !perfil) {
    mostrarFora("Não foi possível abrir a comunidade agora. Atualize a página e tente de novo.", false);
    return null;
  }
  await garantirApelido(eu, perfil);
  mostrarConteudo();
  return { eu, perfil };
}

// mapa de membros (nome, foto, @apelido) para mostrar autores
async function carregarMembros() {
  const { data } = await supa.from("membros_publicos").select("id,nome,foto,funcao,apelido");
  return new Map((data || []).map((p) => [p.id, p]));
}

// situação de amizade entre eu e cada pessoa
async function carregarAmizades(euId) {
  const { data } = await supa.from("amizades").select("id,de_id,para_id,status");
  const amigos = new Set();
  const enviados = new Map();   // para_id -> id do pedido
  const recebidos = new Map();  // de_id -> id do pedido
  (data || []).forEach((a) => {
    const outro = a.de_id === euId ? a.para_id : a.de_id;
    if (a.status === "aceita") amigos.add(outro);
    else if (a.de_id === euId) enviados.set(a.para_id, a.id);
    else recebidos.set(a.de_id, a.id);
  });
  return { amigos, enviados, recebidos };
}

function situacaoCom(amizades, euId, outroId) {
  if (outroId === euId) return "eu";
  if (amizades.amigos.has(outroId)) return "amigo";
  if (amizades.enviados.has(outroId)) return "enviado";
  if (amizades.recebidos.has(outroId)) return "recebido";
  return "nenhum";
}

// reduz a foto antes de enviar (menos dados e carregamento mais rápido). GIF vai como está.
function reduzirImagem(arquivo, max = 1080) {
  return new Promise((resolver, rejeitar) => {
    if (!arquivo.type.startsWith("image/") || arquivo.type === "image/gif") return resolver(arquivo);
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      c.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (!blob) return rejeitar(new Error("não consegui preparar a foto"));
        resolver(new File([blob], "foto.jpg", { type: "image/jpeg" }));
      }, "image/jpeg", 0.86);
    };
    img.onerror = () => { URL.revokeObjectURL(url); rejeitar(new Error("arquivo de imagem inválido")); };
    img.src = url;
  });
}

// envia uma foto para o bucket da comunidade, na pasta de quem enviou
async function enviarFotoComunidade(arquivo, euId) {
  const pronta = await reduzirImagem(arquivo);
  const ext = pronta.type === "image/gif" ? "gif" : "jpg";
  const caminho = `${euId}/${Date.now()}.${ext}`;
  const { error } = await supa.storage.from("comunidade").upload(caminho, pronta, { contentType: pronta.type, upsert: false });
  if (error) throw new Error(error.message);
  return supa.storage.from("comunidade").getPublicUrl(caminho).data.publicUrl;
}

const dataHora = (iso) => {
  const d = new Date(iso);
  const dia = d.toDateString() === new Date().toDateString() ? "" : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + " · ";
  return dia + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
};

const primeiroNome = (nome) => String(nome || "Membro").split(" ")[0];
