/* Área do Militante: só para membros ativos.
   Carteirinha, central de avisos e ficha completa (passo a passo, obrigatória na primeira vez).
   Depende de assets/supa.js. As regras do banco estão em supabase/17-area-do-militante.sql. */

const $ = (id) => document.getElementById(id);
let perfil = null, ficha = null, passo = 1, fichaObrigatoria = false, links = {};
const ULTIMO = 4;

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
const ESCOLARIDADES = ["Ensino fundamental incompleto", "Ensino fundamental completo", "Ensino médio incompleto", "Ensino médio completo",
  "Ensino técnico", "Ensino superior incompleto", "Ensino superior completo", "Pós-graduação / especialização", "Mestrado", "Doutorado"];
// só partidos de esquerda e centro-esquerda; "Não" em primeiro
const PARTIDOS = ["Não sou filiado(a)", "PCB", "PCdoB", "PCO", "PDT", "PSB", "PSOL", "PSTU", "PT", "PV", "Rede Sustentabilidade", "Solidariedade", "UP (Unidade Popular)"];
const NUCLEOS = [
  { slug: "marxista", nome: "Núcleo Marxista", fixo: true },
  { slug: "racial", nome: "Núcleo Racial" },
  { slug: "feminista", nome: "Núcleo Feminista" },
  { slug: "lgbtqia", nome: "Núcleo LGBTQIA+" },
  { slug: "povos", nome: "Núcleo dos Povos Originários" },
  { slug: "cultural", nome: "Núcleo Cultural" },
];
const MAX_NUCLEOS = 3, MIN_PAUTAS = 3;
const PAUTAS = [
  ["Trabalho e renda", ["Fim da escala 6x1 e redução da jornada", "Salário mínimo e valorização do trabalho", "Direitos dos trabalhadores de aplicativo",
    "Combate ao desemprego e à informalidade", "Sindicalismo e organização dos trabalhadores", "Previdência e aposentadoria"]],
  ["Economia e terra", ["Taxação dos super-ricos e justiça tributária", "Combate à fome e segurança alimentar", "Combate à desigualdade social",
    "Reforma agrária", "Agricultura familiar e agroecologia", "Soberania nacional e defesa das estatais", "Dívida pública e juros altos"]],
  ["Direitos sociais", ["Saúde pública e defesa do SUS", "Saúde mental", "Educação pública e de qualidade", "Acesso à universidade e cotas",
    "Moradia e reforma urbana", "Transporte público e tarifa zero", "Saneamento básico e acesso à água", "Assistência social e Bolsa Família"]],
  ["Igualdade e diversidade", ["Pauta racial e combate ao racismo", "Feminismo e direitos das mulheres", "Combate à violência contra a mulher",
    "Direitos reprodutivos", "Pauta LGBTQIA+", "Povos indígenas e demarcação de terras", "Quilombolas e comunidades tradicionais",
    "Direitos das pessoas com deficiência", "Infância e juventude", "Direitos das pessoas idosas", "Liberdade religiosa e combate à intolerância"]],
  ["Meio ambiente", ["Meio ambiente e crise climática", "Defesa da Amazônia e combate ao desmatamento", "Transição energética", "Direitos dos animais"]],
  ["Segurança e justiça", ["Segurança pública e violência policial", "Sistema prisional e desencarceramento", "Política de drogas", "Direitos humanos",
    "Memória, verdade e justiça (ditadura militar)"]],
  ["Democracia e comunicação", ["Defesa da democracia e combate ao fascismo", "Combate à desinformação e às fake news", "Regulação das redes e das big techs",
    "Democratização da mídia", "Reforma política e participação popular"]],
  ["Cultura e mundo", ["Cultura e acesso à arte", "Acesso à literatura e ao livro", "Política externa e diplomacia do Brasil", "Solidariedade internacional e causa palestina"]],
];
const RENDAS = ["Abaixo de 1 salário mínimo", "De 1 a 3 salários mínimos", "De 4 a 5 salários mínimos", "Acima de 6 salários mínimos", "Prefiro não dizer"];

function opcoes(sel, lista, texto = "Escolha…") {
  $(sel).innerHTML = `<option value="">${texto}</option>` + lista.map((o) => `<option>${esc(o)}</option>`).join("");
}
opcoes("f-sexo", SEXOS); opcoes("f-genero", GENEROS); opcoes("f-orientacao", ORIENTACOES);
opcoes("f-uf", UFS, "UF"); opcoes("f-nasc-uf", UFS, "UF");
opcoes("f-religiao", RELIGIOES); opcoes("f-ocupacao", OCUPACOES); opcoes("f-renda", RENDAS);
opcoes("f-escolaridade", ESCOLARIDADES); opcoes("f-partido", PARTIDOS);
$("f-pautas").innerHTML = PAUTAS.map(([grupo, itens]) => `<div class="mil-chips__grupo"><span>${grupo}</span>${itens.map((p) =>
  `<label class="mil-chip"><input type="checkbox" value="${esc(p)}"><i>${esc(p)}</i></label>`).join("")}</div>`).join("");
$("f-nucleos").innerHTML = NUCLEOS.map((n) => `<label class="mil-nucleo-op${n.fixo ? " fixo" : ""}"><input type="checkbox" value="${n.slug}"${n.fixo ? " checked disabled" : ""}>
  <img src="assets/img/nucleos/${n.slug}.jpg" alt=""><b>${esc(n.nome)}</b>${n.fixo ? "<em>obrigatório</em>" : ""}</label>`).join("");
const pautasMarcadas = () => [...document.querySelectorAll("#f-pautas input:checked")].map((i) => i.value);
const nucleosMarcados = () => [...document.querySelectorAll("#f-nucleos input:checked")].map((i) => i.value);
function contarPautas() { const n = pautasMarcadas().length; $("pautas-conta").textContent = n === 1 ? "1 escolhida" : `${n} escolhidas`; }
$("f-pautas").addEventListener("change", contarPautas);
// no máximo 3 núcleos (o Marxista já conta): ao chegar no limite, trava os que sobraram
function travarNucleos() {
  const cheio = nucleosMarcados().length >= MAX_NUCLEOS;
  document.querySelectorAll("#f-nucleos input").forEach((i) => { if (i.value !== "marxista") { i.disabled = cheio && !i.checked; i.closest("label").classList.toggle("travado", i.disabled); } });
}
$("f-nucleos").addEventListener("change", travarNucleos);

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
  $("ficha-avancar").textContent = n === ULTIMO ? "Concluir cadastro" : "Continuar";
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
  if (n === 3) {
    if (!cpfValido($("f-cpf").value)) return erroFicha("CPF inválido. Confira os números.", "f-cpf");
    if (!vazio("f-mae", "nome da mãe") || !vazio("f-religiao", "religião") || !vazio("f-ocupacao", "ocupação")) return false;
    if ($("f-ocupacao").value === "Outra" && !vazio("f-ocupacao-outra", "qual é a sua ocupação")) return false;
    return vazio("f-renda", "renda mensal") && vazio("f-escolaridade", "escolaridade");
  }
  if (pautasMarcadas().length < MIN_PAUTAS) { $("f-pautas").scrollIntoView({ behavior: "smooth", block: "center" }); return erroFicha(`Escolha pelo menos ${MIN_PAUTAS} pautas.`); }
  if (!vazio("f-partido", "se você é filiado(a) a algum partido")) return false;
  if (!String($("f-movimento").value).trim()) return erroFicha("Diga se participa de outro movimento popular. Caso não faça parte, escreva Não.", "f-movimento");
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
  $("f-escolaridade").value = f.escolaridade || "";
  const pt = f.pautas || [], nc = f.nucleos || [];
  document.querySelectorAll("#f-pautas input").forEach((i) => (i.checked = pt.includes(i.value)));
  document.querySelectorAll("#f-nucleos input").forEach((i) => (i.checked = i.value === "marxista" || nc.includes(i.value)));
  contarPautas(); travarNucleos();
  $("f-partido").value = f.partido || ""; $("f-movimento").value = f.movimento || "";
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
  if (passo < ULTIMO) return irPara(passo + 1);
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
      renda: $("f-renda").value, escolaridade: $("f-escolaridade").value,
      pautas: pautasMarcadas(), nucleos: [...new Set(["marxista", ...nucleosMarcados()])].slice(0, MAX_NUCLEOS),
      partido: $("f-partido").value, movimento: $("f-movimento").value.trim(),
      consentimento_em: (ficha && ficha.consentimento_em) || agora,
      completo_em: (ficha && ficha.completo_em) || agora,
    };
    const { data, error: e2 } = await supa.from("fichas").upsert(dadosFicha).select().single();
    if (e2) throw e2;
    ficha = data; Object.assign(perfil, dadosPerfil);
    fichaObrigatoria = false; $("janela-ficha").close();
    mostrarCabecalho(); mostrarResumo(); mostrarNucleos();
    avisar("Cadastro concluído! Obrigado, camarada. Agora entre nos grupos dos seus núcleos.", "ok");
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (e) {
    const m = String((e && e.message) || "");
    erroFicha(/fichas_cpf_unico|duplicate key/i.test(m) ? "Este CPF já está cadastrado por outra pessoa. Fale com a secretaria." : mensagemErro(e));
  }
  b.disabled = false; b.textContent = "Concluir cadastro";
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
    ["CPF", cpf], ["Ocupação", f.ocupacao], ["Renda", f.renda], ["Escolaridade", f.escolaridade],
    ["Partido", f.partido], ["Outro movimento", f.movimento], ["Pautas", (f.pautas || []).join(" · ")],
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

// ---------- seus núcleos ----------
function mostrarNucleos() {
  const meus = (ficha && ficha.nucleos && ficha.nucleos.length) ? ficha.nucleos : ["marxista"];
  const admin = perfil.papel === "admin";
  const lista = admin ? NUCLEOS : NUCLEOS.filter((n) => meus.includes(n.slug));
  $("meus-nucleos").innerHTML = lista.map((n) => {
    const link = links[n.slug] || "", meu = meus.includes(n.slug);
    return `<article class="mil-nucleo${meu ? "" : " mil-nucleo--fora"}">
      <img src="assets/img/nucleos/${n.slug}.jpg" alt="Logo do ${esc(n.nome)}">
      <h3>${esc(n.nome)}</h3>
      ${link ? `<a class="botao botao--vermelho" href="${esc(link)}" target="_blank" rel="noopener">Participar agora</a>`
             : `<span class="botao mil-nucleo__breve">Grupo em breve</span>`}
      ${admin ? `<button type="button" class="mil-nucleo__link" data-link="${n.slug}">${link ? "Trocar link do grupo" : "Definir link do grupo"}</button>` : ""}
      ${admin && !meu ? `<small>Você não está neste núcleo (aparece só para a administração).</small>` : ""}
    </article>`; }).join("");
  $("meus-nucleos").querySelectorAll("[data-link]").forEach((b) => b.addEventListener("click", async () => {
    const slug = b.dataset.link;
    const novo = prompt("Cole o link do grupo de WhatsApp deste núcleo (começa com https://). Deixe vazio para tirar o link:", links[slug] || "");
    if (novo === null) return;
    const link = novo.trim();
    if (link && !/^https:\/\//i.test(link)) return avisar("O link precisa começar com https://", "erro");
    const { error } = await supa.from("nucleos_grupos").update({ link }).eq("slug", slug);
    if (error) return avisar(mensagemErro(error), "erro");
    links[slug] = link; mostrarNucleos(); avisar("Link do grupo atualizado.", "ok");
  }));
}
async function carregarLinks() {
  const { data } = await supa.from("nucleos_grupos").select("*");
  links = Object.fromEntries((data || []).map((n) => [n.slug, n.link]));
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
  $("av-titulo").value = ""; $("av-texto").value = ""; $("av-fixado").checked = false; $("caixa-aviso").open = false;
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
  $("caixa-aviso").hidden = perfil.papel !== "admin";
  carregarAvisos();
  const { data, error } = await supa.from("fichas").select("*").eq("id", perfil.id).maybeSingle();
  await carregarLinks();
  if (error) { mostrarResumo(); mostrarNucleos(); return avisar("A ficha do militante ainda não está ativada no banco de dados. Avise a administração.", "erro"); }
  ficha = data; mostrarResumo(); mostrarNucleos();
  // cadastro completo = passou pelos 4 passos (inclusive a parte de militância)
  const completo = ficha && ficha.completo_em && ficha.escolaridade && (ficha.pautas || []).length >= MIN_PAUTAS && ficha.partido && ficha.movimento;
  if (!completo) abrirFicha(true);
})();
