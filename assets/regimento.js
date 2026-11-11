/* Regimento Interno: aberto a todos, com ou sem conta.
   Lê o texto do banco (supabase/06-regimento-publico.sql); se o banco não
   responder, usa o arquivo regimento-interno.md do site. */

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

// ---------- Quero me tornar um militante (inscrição) ----------
(function () {
  const $ = (id) => document.getElementById(id);
  const PARTIDOS = ["Não sou filiado(a)", "PCB", "PCdoB", "PCO", "PDT", "PSB", "PSOL", "PSTU", "PT", "PV", "Rede Sustentabilidade", "Solidariedade", "UP (Unidade Popular)"];
  $("i-partido").innerHTML = `<option value="">Escolha…</option>` + PARTIDOS.map((p) => `<option>${p}</option>`).join("");
  const so = (t) => String(t || "").replace(/\D/g, "");
  const celularLimpo = (t) => so(t).replace(/^55(?=\d{10,11}$)/, "");
  const fmtCel = (n) => (n = celularLimpo(n)).length === 11 ? `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}` : n.length === 10 ? `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}` : n;
  function cpfValido(c) {
    c = so(c); if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
    const dv = (n) => { let s = 0; for (let i = 0; i < n; i++) s += Number(c[i]) * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
    return dv(9) === Number(c[9]) && dv(10) === Number(c[10]);
  }
  function idade(d) { const n = new Date(d + "T12:00:00"); if (isNaN(n)) return null; const h = new Date(); let i = h.getFullYear() - n.getFullYear(); if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) i--; return i; }
  let local = { cidade: "", uf: "" }, ultimo = "";
  async function buscarCEP() {
    const cep = so($("i-cep").value); if (cep.length !== 8 || cep === ultimo) return; ultimo = cep;
    $("i-cep-status").textContent = "Buscando…";
    try {
      const d = await (await fetch(`https://viacep.com.br/ws/${cep}/json/`)).json();
      if (d.erro) { local = { cidade: "", uf: "" }; $("i-cep-status").textContent = "CEP não encontrado. Confira os números."; return; }
      local = { cidade: d.localidade || "", uf: d.uf || "" };
      $("i-cep-status").textContent = [d.bairro, local.cidade && `${local.cidade}/${local.uf}`].filter(Boolean).join(" · ");
    } catch (_) { ultimo = ""; $("i-cep-status").textContent = ""; }
  }
  $("i-cep").addEventListener("input", () => { const c = so($("i-cep").value).slice(0, 8); $("i-cep").value = c.length > 5 ? c.slice(0, 5) + "-" + c.slice(5) : c; if (c.length === 8) buscarCEP(); });
  $("i-cpf").addEventListener("input", () => { const c = so($("i-cpf").value).slice(0, 11); $("i-cpf").value = c.length === 11 ? `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6, 9)}-${c.slice(9)}` : c; });
  $("i-celular").addEventListener("blur", () => { if (/^\d{10,11}$/.test(celularLimpo($("i-celular").value))) $("i-celular").value = fmtCel($("i-celular").value); });

  const abrir = () => { $("insc-erro").hidden = true; $("janela-inscricao").showModal(); document.documentElement.classList.add("janela-aberta"); };
  $("quero-militar").addEventListener("click", abrir);
  $("quero-militar-2").addEventListener("click", abrir);
  if (location.hash === "#inscricao") abrir();
  $("insc-cancelar").addEventListener("click", () => $("janela-inscricao").close());
  $("janela-inscricao").addEventListener("close", () => document.documentElement.classList.remove("janela-aberta"));
  $("inscrito-ok").addEventListener("click", () => $("janela-inscrito").close());

  function erro(t, campo) { $("insc-erro").textContent = t; $("insc-erro").hidden = false; if (campo) $(campo).focus(); else $("insc-erro").scrollIntoView({ block: "nearest" }); return false; }
  $("form-inscricao").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if ($("i-site").value) return; // robô
    const nome = $("i-nome").value.trim().replace(/\s+/g, " ");
    if (nome.split(" ").length < 2) return erro("Escreva o seu nome completo.", "i-nome");
    const nasc = $("i-nascimento").value, id = idade(nasc);
    if (!nasc || id === null || id < 0 || id > 120) return erro("Confira a data de nascimento.", "i-nascimento");
    if (id < 13) return erro("O coletivo aceita militantes a partir de 13 anos.", "i-nascimento");
    if (!cpfValido($("i-cpf").value)) return erro("CPF inválido. Confira os números.", "i-cpf");
    const email = $("i-email").value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return erro("Digite um e-mail válido.", "i-email");
    const cel = celularLimpo($("i-celular").value);
    if (!/^\d{10,11}$/.test(cel)) return erro("Digite o celular com DDD. Exemplo: (21) 91234-5678.", "i-celular");
    if (so($("i-cep").value).length !== 8) return erro("Digite o CEP com 8 números.", "i-cep");
    if (!$("i-partido").value) return erro("Diga se você é filiado(a) a algum partido.", "i-partido");
    if (!$("i-movimento").value.trim()) return erro("Diga se participa de algum movimento. Caso não participe, escreva Não.", "i-movimento");
    if (!$("i-consentimento").checked) return erro("Para enviar, marque a autorização de uso dos dados.");
    const b = $("insc-enviar"); b.disabled = true; b.textContent = "Enviando…";
    const { error } = await supa.from("inscricoes").insert({
      nome, nascimento: nasc, email, celular: cel, cpf: so($("i-cpf").value), cep: so($("i-cep").value),
      cidade: local.cidade, uf: local.uf, partido: $("i-partido").value, movimento: $("i-movimento").value.trim(),
    });
    b.disabled = false; b.textContent = "Inscrever-se";
    if (error) {
      const m = String(error.message || "");
      return erro(/inscricoes_cpf_pendente|duplicate key/i.test(m) ? "Já existe uma inscrição com este CPF esperando resposta. Aguarde o contato da secretaria."
        : /relation|does not exist|schema cache|permission/i.test(m) ? "As inscrições ainda não estão abertas. Tente de novo mais tarde."
        : mensagemErro(error));
    }
    $("form-inscricao").reset(); local = { cidade: "", uf: "" }; ultimo = ""; $("i-cep-status").textContent = "";
    $("janela-inscricao").close(); $("janela-inscrito").showModal();
  });
})();
