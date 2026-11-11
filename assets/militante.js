/* Área do Militante: só para membros ativos.
   Carteirinha, central de avisos e ficha completa (passo a passo, obrigatória na primeira vez).
   Depende de assets/supa.js. As regras do banco estão em supabase/17-area-do-militante.sql. */

const $ = (id) => document.getElementById(id);
let perfil = null, ficha = null, passo = 1, fichaObrigatoria = false;

// ---------- listas ----------
const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];
const SEXOS = ["Feminino", "Masculino", "Intersexo", "Prefiro não dizer"];
const GENEROS = ["Mulher cisgênero", "Homem cisgênero", "Mulher trans", "Homem trans", "Travesti", "Não binário", "Outro", "Prefiro não dizer"];
const ORIENTACOES = ["Heterossexual", "Lésbica", "Gay", "Bissexual", "Pansexual", "Assexual", "Outra", "Prefiro não dizer"];
const RELIGIOES = ["Católica", "Evangélica", "Espírita", "Umbanda", "Candomblé", "Outra religião de matriz africana", "Religião indígena",
  "Judaica", "Islâmica", "Budista", "Sem religião", "Ateu / ateia", "Agnóstico(a)", "Outra", "Prefiro não dizer"];
// "Estudante" sempre em primeiro; o resto em ordem alfabética; "Outra" no fim
const OCUPACOES = ["Estudante", ...["Administrador(a)", "Advogado(a)", "Agricultor(a)", "Analista / técnico(a) de TI", "Aposentado(a)",
  "Arquiteto(a)", "Artista", "Assistente administrativo(a)", "Assistente social", "Atendente", "Autônomo(a)", "Auxiliar de serviços gerais",
  "Bancário(a)", "Comerciante", "Contador(a)", "Cozinheiro(a)", "Criador(a) de conteúdo", "Dentista", "Desempregado(a)", "Designer",
  "Do lar", "Eletricista", "Empregado(a) doméstico(a)", "Empresário(a)", "Enfermeiro(a)", "Engenheiro(a)", "Entregador(a) / motoboy",
  "Estagiário(a)", "Farmacêutico(a)", "Fisioterapeuta", "Jornalista", "Mecânico(a)", "Médico(a)", "Motorista", "Músico(a)",
  "Nutricionista", "Operador(a) de caixa", "Operário(a) de fábrica", "Pedreiro(a) / construção civil", "Pesquisador(a)", "Professor(a)",
  "Psicólogo(a)", "Publicitário(a)", "Recepcionista", "Servidor(a) público(a)", "Técnico(a) de enfermagem", "Trabalhador(a) rural",
  "Vendedor(a)", "Vigilante / segurança"].sort((a, b) => a.localeCompare(b, "pt-BR")), "Outra"];
const RENDAS = ["Abaixo de 1 salário mínimo", "De 1 a 3 salários mínimos", "De 4 a 5 salários mínimos", "Acima de 6 salários mínimos", "Prefiro não dizer"];

function opcoes(sel, lista, texto = "Escolha…") {
  $(sel).innerHTML = `<option value="">${texto}</option>` + lista.map((o) => `<option>${esc(o)}</option>`).join("");
}
opcoes("f-sexo", SEXOS); opcoes("f-genero", GENEROS); opcoes("f-orientacao", ORIENTACOES);
opcoes("f-uf", UFS, "UF"); opcoes("f-nasc-uf", UFS, "UF");
opcoes("f-religiao", RELIGIOES); opcoes("f-ocupacao", OCUPACOES); opcoes("f-renda", RENDAS);

// ---------- utilidades ----------
const soNumeros = (t) => String(t || "").replace(/\D/g, "");
const celularLimpo = (t) => soNumeros(t).replace(/^55(?=\d{10,11}$)/, "");
const celularValido = (n) => /^\d{10,11}$/.test(n);
function formatarCelular(n) {
  n = celularLimpo(n);
  if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
  if (n.length === 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return n;
}
const formatarCPF = (c) => (c = soNumeros(c)).length === 11 ? `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6, 9)}-${c.slice(9)}` : c;
const formatarCEP = (c) => (c = soNumeros(c)).length === 8 ? `${c.slice(0, 5)}-${c.slice(5)}` : c;
function cpfValido(c) {
  c = soNumeros(c);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  const dv = (n) => { let s = 0; for (let i = 0; i < n; i++) s += Number(c[i]) * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
  return dv(9) === Number(c[9]) && dv(10) === Number(c[10]);
}
function idadeDe(data) {
  const d = new Date(data + "T12:00:00"); if (isNaN(d)) return null;
  const h = new Date(); let i = h.getFullYear() - d.getFullYear();
  if (h.getMonth() < d.getMonth() || (h.getMonth() === d.getMonth() && h.getDate() < d.getDate())) i--;
  return i;
}
const primeiroNome = (n) => String(n || "").trim().split(/\s+/)[0] || "";
function avisar(texto, tipo = "") {
  $("mensagem").innerHTML = texto ? `<div class="aviso ${tipo ? "aviso--" + tipo : ""}">${texto}</div>` : "";
}
function bloquear(titulo, texto, link, rotulo) {
  $("area").hidden = true; $("bloqueio").hidden = false;
  $("bloqueio-titulo").textContent = titulo; $("bloqueio-texto").textContent = texto;
  if (link) { $("bloqueio-link").href = link; $("bloqueio-link").textContent = rotulo; $("bloqueio-link").hidden = false; } else $("bloqueio-link").hidden = true;
}
["f-celular"].forEach((id) => $(id).addEventListener("blur", () => { if (celularValido(celularLimpo($(id).value))) $(id).value = formatarCelular($(id).value); }));
$("f-cpf").addEventListener("input", () => { const c = soNumeros($("f-cpf").value).slice(0, 11); $("f-cpf").value = c.length === 11 ? formatarCPF(c) : c; });
$("f-cep").addEventListener("input", () => { const c = soNumeros($("f-cep").value).slice(0, 8); $("f-cep").value = c.length > 5 ? c.slice(0, 5) + "-" + c.slice(5) : c; if (c.length === 8) buscarCEP(); });
$("f-ocupacao").addEventListener("change", () => { $("campo-ocupacao-outra").hidden = $("f-ocupacao").value !== "Outra"; });

// ---------- CEP (ViaCEP, serviço público e gratuito) ----------
let ultimoCEP = "";
async function buscarCEP() {
  const cep = soNumeros($("f-cep").value);
  if (cep.length !== 8) { $("cep-status").textContent = "Digite os 8 números do CEP."; return; }
  if (cep === ultimoCEP) return; ultimoCEP = cep;
  $("cep-status").textContent = "Buscando o endereço…";
  try {
    const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const d = await r.json();
    if (d.erro) { $("cep-status").textContent = "CEP não encontrado. Preencha o endereço à mão."; return; }
    if (d.logradouro) $("f-rua").value = d.logradouro;
    if (d.bairro) $("f-bairro").value = d.bairro;
    if (d.localidade) $("f-cidade").value = d.localidade;
    if (d.uf) $("f-uf").value = d.uf;
    $("cep-status").textContent = "Endereço encontrado. Confira e coloque o número.";
    $("f-numero").focus();
  } catch (_) { ultimoCEP = ""; $("cep-status").textContent = "Não foi possível buscar o CEP agora. Preencha o endereço à mão."; }
}
$("buscar-cep").addEventListener("click", () => { ultimoCEP = ""; buscarCEP(); });

// ---------- ficha passo a passo ----------
function irPara(n) {
  passo = n;
  document.querySelectorAll(".ficha-mil__passo").forEach((f) => (f.hidden = Number(f.dataset.passo) !== n));
  document.querySelectorAll("#passos li").forEach((li, i) => { li.classList.toggle("feito", i + 1 < n); li.classList.toggle("atual", i + 1 === n); });
  $("ficha-voltar").hidden = n === 1;
  $("ficha-cancelar").hidden = fichaObrigatoria || n !== 1;
  $("ficha-avancar").textContent = n === 3 ? "Salvar cadastro" : "Continuar";
  $("ficha-erro").hidden = true;
  $("janela-ficha").scrollTop = 0;
}
function erroFicha(texto, campo) {
  $("ficha-erro").textContent = texto; $("ficha-erro").hidden = false;
  if (campo) { $(campo).focus(); $(campo).classList.add("campo-erro"); setTimeout(() => $(campo).classList.remove("campo-erro"), 2500); }
  return false;
}
function conferirPasso(n) {
  const vazio = (id, nome) => (!String($(id).value || "").trim() ? erroFicha(`Preencha: ${nome}.`, id) : true);
  if (n === 1) {
    if (!vazio("f-nome", "nome completo")) return false;
    if (!$("f-nascimento").value) return erroFicha("Preencha a data de nascimento.", "f-nascimento");
    const idade = idadeDe($("f-nascimento").value);
    if (idade === null || idade < 10 || idade > 120) return erroFicha("Confira a data de nascimento.", "f-nascimento");
    if (!celularValido(celularLimpo($("f-celular").value))) return erroFicha("Digite um celular válido, com DDD. Exemplo: (11) 91234-5678.", "f-celular");
    return vazio("f-sexo", "sexo") && vazio("f-genero", "identidade de gênero") && vazio("f-orientacao", "orientação sexual");
  }
  if (n === 2) {
    if (soNumeros($("f-cep").value).length !== 8) return erroFicha("Digite o CEP com 8 números.", "f-cep");
    return vazio("f-rua", "rua") && vazio("f-numero", "número") && vazio("f-bairro", "bairro") && vazio("f-cidade", "cidade") &&
      vazio("f-uf", "estado") && vazio("f-nasc-cidade", "cidade de nascimento") && vazio("f-nasc-uf", "estado de nascimento");
  }
  if (!cpfValido($("f-cpf").value)) return erroFicha("CPF inválido. Confira os números.", "f-cpf");
  if (!vazio("f-mae", "nome da mãe") || !vazio("f-religiao", "religião") || !vazio("f-ocupacao", "ocupação")) return false;
  if ($("f-ocupacao").value === "Outra" && !vazio("f-ocupacao-outra", "qual é a sua ocupação")) return false;
  if (!vazio("f-renda", "renda mensal")) return false;
  if (!$("f-consentimento").checked) return erroFicha("Para salvar, marque a autorização de uso dos dados.", "f-consentimento");
  return true;
}
function preencherFicha() {
  const f = ficha || {};
  $("f-nome").value = perfil.nome || "";
  $("f-nascimento").value = f.nascimento || "";
  $("f-email").value = perfil.email || "";
  $("f-celular").value = formatarCelular(perfil.celular || "");
  $("f-arroba").value = perfil.arroba ? "@" + perfil.arroba : "";
  $("f-sexo").value = f.sexo || perfil.sexo || "";
  $("f-genero").value = f.genero || perfil.genero || "";
  $("f-orientacao").value = f.orientacao || perfil.orientacao || "";
  $("f-cep").value = formatarCEP(f.cep || ""); ultimoCEP = f.cep || "";
  $("f-rua").value = f.rua || ""; $("f-numero").value = f.numero || ""; $("f-complemento").value = f.complemento || "";
  $("f-bairro").value = f.bairro || ""; $("f-cidade").value = f.cidade || perfil.cidade || ""; $("f-uf").value = f.uf || perfil.uf || "";
  $("f-nasc-cidade").value = f.nasc_cidade || ""; $("f-nasc-uf").value = f.nasc_uf || "";
  $("f-cpf").value = formatarCPF(f.cpf || ""); $("f-mae").value = f.nome_mae || "";
  $("f-religiao").value = f.religiao || "";
  const naLista = OCUPACOES.includes(f.ocupacao);
  $("f-ocupacao").value = f.ocupacao ? (naLista ? f.ocupacao : "Outra") : "";
  $("f-ocupacao-outra").value = f.ocupacao && !naLista ? f.ocupacao : "";
  $("campo-ocupacao-outra").hidden = $("f-ocupacao").value !== "Outra";
  $("f-renda").value = f.renda || "";
  $("f-consentimento").checked = !!f.consentimento_em;
  $("cep-status").textContent = "";
}
function abrirFicha(obrigatoria) {
  fichaObrigatoria = obrigatoria;
  $("ficha-titulo").textContent = obrigatoria ? "Militante, atualize seu cadastro" : "Editar cadastro";
  $("ficha-intro").textContent = obrigatoria
    ? "Para usar a Área do Militante, complete o seu cadastro. Leva poucos minutos."
    : "Altere o que precisar e salve no último passo.";
  preencherFicha(); irPara(1);
  if (!$("janela-ficha").open) $("janela-ficha").showModal();
}
// enquanto o cadastro não estiver completo, a janela não fecha (nem com Esc)
$("janela-ficha").addEventListener("cancel", (ev) => { if (fichaObrigatoria) ev.preventDefault(); });
$("ficha-cancelar").addEventListener("click", () => $("janela-ficha").close());
$("ficha-voltar").addEventListener("click", () => irPara(Math.max(1, passo - 1)));
$("editar-cadastro").addEventListener("click", () => abrirFicha(false));

$("form-ficha").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  if (!conferirPasso(passo)) return;
  if (passo < 3) return irPara(passo + 1);
  const b = $("ficha-avancar"); b.disabled = true; b.textContent = "Salvando…";
  try {
    const nascimento = $("f-nascimento").value;
    const dadosPerfil = {
      nome: $("f-nome").value.trim(),
      arroba: $("f-arroba").value.trim().replace(/^@/, ""),
      celular: celularLimpo($("f-celular").value),
      idade: idadeDe(nascimento),
    };
    const { error: e1 } = await supa.from("perfis").update(dadosPerfil).eq("id", perfil.id);
    if (e1) throw e1;
    const agora = new Date().toISOString();
    const dadosFicha = {
      id: perfil.id, nascimento,
      sexo: $("f-sexo").value, genero: $("f-genero").value, orientacao: $("f-orientacao").value,
      cep: soNumeros($("f-cep").value), rua: $("f-rua").value.trim(), numero: $("f-numero").value.trim(),
      complemento: $("f-complemento").value.trim(), bairro: $("f-bairro").value.trim(), cidade: $("f-cidade").value.trim(), uf: $("f-uf").value,
      nasc_cidade: $("f-nasc-cidade").value.trim(), nasc_uf: $("f-nasc-uf").value,
      cpf: soNumeros($("f-cpf").value), nome_mae: $("f-mae").value.trim(), religiao: $("f-religiao").value,
      ocupacao: $("f-ocupacao").value === "Outra" ? $("f-ocupacao-outra").value.trim() : $("f-ocupacao").value,
      renda: $("f-renda").value,
      consentimento_em: (ficha && ficha.consentimento_em) || agora,
      completo_em: (ficha && ficha.completo_em) || agora,
    };
    const { data, error: e2 } = await supa.from("fichas").upsert(dadosFicha).select().single();
    if (e2) throw e2;
    ficha = data; Object.assign(perfil, dadosPerfil);
    fichaObrigatoria = false; $("janela-ficha").close();
    mostrarCabecalho(); mostrarResumo();
    avisar("Cadastro salvo! Obrigado, camarada.", "ok");
  } catch (e) {
    const m = String((e && e.message) || "");
    erroFicha(/fichas_cpf_unico|duplicate key/i.test(m) ? "Este CPF já está cadastrado por outra pessoa. Fale com a secretaria." : mensagemErro(e));
  }
  b.disabled = false; b.textContent = "Salvar cadastro";
});

// ---------- tela ----------
function mostrarCabecalho() {
  const nome = primeiroNome(perfil.nome);
  $("ola").textContent = nome ? `Olá, camarada ${nome}!` : "Olá, camarada!";
  $("ola-sub").textContent = [textoOcupacao(perfil), perfil.matricula ? "Matrícula Nº " + perfil.matricula : ""].filter(Boolean).join(" · ");
}
function mostrarResumo() {
  const f = ficha || {};
  const cpf = f.cpf ? `***.***.${f.cpf.slice(6, 9)}-${f.cpf.slice(9)}` : "";
  const endereco = [f.rua && `${f.rua}, ${f.numero}${f.complemento ? " · " + f.complemento : ""}`, f.bairro, f.cidade && `${f.cidade}/${f.uf}`, f.cep && "CEP " + formatarCEP(f.cep)].filter(Boolean).join(" · ");
  const linhas = [
    ["Nome", perfil.nome], ["E-mail", perfil.email], ["Celular", formatarCelular(perfil.celular || "")],
    ["Nascimento", f.nascimento ? new Date(f.nascimento + "T12:00:00").toLocaleDateString("pt-BR") + (perfil.idade ? ` (${perfil.idade} anos)` : "") : ""],
    ["Endereço", endereco], ["Naturalidade", f.nasc_cidade ? `${f.nasc_cidade}/${f.nasc_uf}` : ""],
    ["CPF", cpf], ["Ocupação", f.ocupacao], ["Renda", f.renda],
  ];
  $("resumo").innerHTML = linhas.map(([k, v]) => `<div><dt>${k}</dt><dd>${v ? esc(v) : '<span class="mil-falta">não preenchido</span>'}</dd></div>`).join("") +
    `<p class="mil-privado">Esses dados só aparecem para você e para a administração do coletivo.</p>`;
}
function carregarCarteirinha() {
  const base = (nome) => supa.storage.from("fotos").getPublicUrl(`${perfil.id}/${nome}`).data.publicUrl + "?t=" + Date.now();
  const img = $("carteira-img");
  const vazia = () => { img.hidden = true; $("carteira-acoes").hidden = true; $("carteira-vazia").hidden = false; };
  const tentar = (lista) => {
    if (!lista.length) return vazia();
    const url = base(lista[0]);
    img.onload = () => {
      img.hidden = false; $("carteira-acoes").hidden = false; $("carteira-vazia").hidden = true;
      fetch(url).then((r) => r.blob()).then((b) => { $("carteira-baixar").href = URL.createObjectURL(b); $("carteira-baixar").download = "carteirinha-coletivo-lufa." + lista[0].split(".").pop(); }).catch(() => {});
    };
    img.onerror = () => tentar(lista.slice(1));
    img.src = url;
  };
  tentar(["carteirinha.jpg", "carteirinha.png"]);
}

// ---------- central de avisos ----------
async function carregarAvisos() {
  const ul = $("lista-avisos");
  const { data, error } = await supa.from("avisos_militantes").select("*").order("fixado", { ascending: false }).order("criado_em", { ascending: false }).limit(50);
  if (error) { ul.innerHTML = `<li class="mil-aviso-vazio">Não foi possível carregar os avisos agora.</li>`; return; }
  if (!data.length) { ul.innerHTML = `<li class="mil-aviso-vazio">Nenhum aviso por enquanto.</li>`; return; }
  const admin = perfil.papel === "admin";
  ul.innerHTML = data.map((a) => `<li class="mil-aviso${a.fixado ? " mil-aviso--fixado" : ""}">
      <div class="mil-aviso__topo"><strong>${a.fixado ? "📌 " : ""}${esc(a.titulo)}</strong><time>${esc(dataPorExtenso(a.criado_em))}</time></div>
      ${a.texto ? `<div class="mil-aviso__texto">${esc(a.texto).replace(/\n/g, "<br>")}</div>` : ""}
      ${admin ? `<button type="button" class="mil-aviso__apagar" data-apagar="${a.id}">Apagar</button>` : ""}
    </li>`).join("");
  ul.querySelectorAll("[data-apagar]").forEach((b) => b.addEventListener("click", async () => {
    if (!confirm("Apagar este aviso para todos?")) return;
    const { error: e } = await supa.from("avisos_militantes").delete().eq("id", Number(b.dataset.apagar));
    if (e) return avisar(mensagemErro(e), "erro");
    carregarAvisos();
  }));
}
$("form-aviso").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const b = ev.submitter; b.disabled = true;
  const { error } = await supa.from("avisos_militantes").insert({ titulo: $("av-titulo").value.trim(), texto: $("av-texto").value.trim(), fixado: $("av-fixado").checked, autor_id: perfil.id });
  b.disabled = false;
  if (error) return avisar(mensagemErro(error), "erro");
  $("av-titulo").value = ""; $("av-texto").value = ""; $("av-fixado").checked = false;
  avisar("Aviso publicado para todos os militantes.", "ok");
  carregarAvisos();
});

// ---------- início ----------
(async () => {
  const u = await usuarioAtual();
  if (!u) return bloquear("Entre na sua conta", "A Área do Militante é exclusiva para os membros ativos do Coletivo Lufã.", "conta.html?voltar=militante.html", "Entrar");
  try { perfil = await meuPerfil(); } catch (e) { return avisar(mensagemErro(e), "erro"); }
  if (!perfil) return avisar("Seu perfil ainda está sendo criado. Recarregue a página em alguns segundos.", "erro");
  if (!(APROVADO.includes(perfil.papel) && !ehComum(perfil))) {
    return bloquear("Área exclusiva", "A Área do Militante é só para os membros ativos do Coletivo Lufã.", "index.html", "Voltar ao início");
  }
  $("area").hidden = false;
  mostrarCabecalho(); carregarCarteirinha();
  $("form-aviso").hidden = perfil.papel !== "admin";
  carregarAvisos();
  const { data, error } = await supa.from("fichas").select("*").eq("id", perfil.id).maybeSingle();
  if (error) { mostrarResumo(); return avisar("A ficha do militante ainda não está ativada no banco de dados. Avise a administração.", "erro"); }
  ficha = data; mostrarResumo();
  if (!ficha || !ficha.completo_em) abrirFicha(true);
})();
