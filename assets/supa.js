/* Conexão com o Supabase (contas, perfis, permissões e artigos).
   A chave abaixo é a "publishable": pública por natureza. Quem protege os dados
   são as regras de segurança do banco (supabase/esquema.sql). */

const SUPA_URL = "https://mszatrbsbzhuxlsfebrv.supabase.co";
const SUPA_CHAVE = "sb_publishable_4w3AIkuWKC-bme-eTv2vzQ_sGkjJN9U";
const supa = window.supabase.createClient(SUPA_URL, SUPA_CHAVE, { auth: { persistSession: true, autoRefreshToken: true } });

const PAPEIS = {
  pendente: "Aguardando aprovação", membro: "Membro", autor: "Autor(a)",
  editor: "Editor(a)", admin: "Admin", recusado: "Recusado",
};
const APROVADO = ["membro", "autor", "editor", "admin"];
const PODE_ESCREVER = ["autor", "editor", "admin"];
// classificação: "Membro ativo" (equipe, aparece na página inicial) ou "Membro comum" (usa o site)
const ATIVO = "Membro ativo", COMUM = "Membro comum";
const ehComum = (m) => /comum/i.test(String((m && m.funcao) || ""));
const classificacao = (m) => (ehComum(m) ? COMUM : ATIVO);
// ocupações do membro ativo ficam no mesmo campo: "Membro ativo · Idealizador · Secretário"
const OCUPACOES_SUGERIDAS = ["Idealizador", "Idealizadora", "Secretário", "Secretária", "Coordenador", "Coordenadora",
  "Assessor", "Assessora", "Designer", "Pesquisador", "Pesquisadora", "Redator", "Redatora", "Editor de vídeo", "Editora de vídeo",
  "Social media", "Fotógrafo", "Fotógrafa", "Tesoureiro", "Tesoureira", "Formador", "Formadora", "Apresentador", "Apresentadora"];
function ocupacoes(m) {
  if (ehComum(m)) return [];
  return String((m && m.funcao) || "").split("·").map((t) => t.trim()).filter((t) => t && !/^membro( ativo)?$/i.test(t));
}
const textoOcupacao = (m) => (ehComum(m) ? COMUM : [ATIVO, ...ocupacoes(m)].join(" · "));
const funcaoDe = (lista) => [ATIVO, ...lista].join(" · ");

async function usuarioAtual() {
  const { data } = await supa.auth.getSession();
  return data.session ? data.session.user : null;
}

async function meuPerfil() {
  const u = await usuarioAtual();
  if (!u) return null;
  const { data, error } = await supa.from("perfis").select("*").eq("id", u.id).maybeSingle();
  if (error) throw error;
  return data ? { ...data, email: u.email } : null;
}

// membros aprovados no banco, no mesmo formato de data/membros.json
async function membrosDoBanco() {
  try {
    const { data, error } = await supa.from("membros_publicos").select("*").order("matricula");
    if (error) throw error;
    return (data || []).map((m) => ({ nome: m.nome, arroba: m.arroba, rede: m.rede, funcao: m.funcao, foto: m.foto, matricula: m.matricula, conta: true }));
  } catch (_) { return []; }
}

// junta a lista antiga (arquivo) com a do banco; quem tem conta prevalece pela matrícula
async function todosOsMembros() {
  const [arquivo, banco] = await Promise.all([lerJSON("data/membros.json").catch(() => []), membrosDoBanco()]);
  const porMatricula = new Map();
  arquivo.filter((m) => !m.exemplo).forEach((m) => porMatricula.set(m.matricula || "x" + m.nome, m));
  banco.forEach((m) => {
    const antigo = porMatricula.get(m.matricula);
    porMatricula.set(m.matricula, { ...antigo, ...Object.fromEntries(Object.entries(m).filter(([, v]) => v)) });
  });
  // ordem escolhida pelo admin (tabela ordem_membros); quem não tem posição vai para o fim, pela matrícula
  let posicao = new Map();
  try { const { data } = await supa.from("ordem_membros").select("matricula,posicao"); posicao = new Map((data || []).map((o) => [o.matricula, o.posicao])); } catch (_) {}
  const pos = (m) => (posicao.has(m.matricula) ? posicao.get(m.matricula) : 100000);
  return [...porMatricula.values()].sort((a, b) => pos(a) - pos(b) || String(a.matricula).localeCompare(String(b.matricula)));
}

// artigos publicados pelo site (banco), no mesmo formato de data/artigos.json
async function artigosDoBanco() {
  try {
    const { data, error } = await supa.from("artigos").select("*").eq("publicado", true).order("criado_em", { ascending: false });
    if (error) throw error;
    return (data || []).map((a) => ({ slug: a.slug, titulo: a.titulo, autor: a.autor_nome, data: a.criado_em, resumo: resumir(a.texto), texto: a.texto, fontes: a.fontes || "", banco: true }));
  } catch (_) { return []; }
}

function mensagemErro(e) {
  const m = String((e && (e.message || e.error_description)) || e || "");
  if (/Invalid login credentials/i.test(m)) return "E-mail ou senha incorretos.";
  if (/Email not confirmed/i.test(m)) return "Confirme o seu e-mail antes de entrar (veja a sua caixa de entrada).";
  if (/already registered|already exists/i.test(m)) return "Já existe uma conta com esse e-mail. Use a aba Entrar.";
  if (/Password should be/i.test(m)) return "A senha precisa ter pelo menos 6 caracteres.";
  if (/rate limit/i.test(m)) return "Muitas tentativas seguidas. Espere alguns minutos e tente de novo.";
  if (/Failed to fetch|NetworkError/i.test(m)) return "Sem conexão. Verifique a internet e tente de novo.";
  return m || "Algo deu errado. Tente de novo.";
}

// guarda se a pessoa é membro ativo, para mostrar o link "Área do militante" no menu
(async () => {
  let ativo = false;
  try { const p = await meuPerfil(); ativo = !!(p && APROVADO.includes(p.papel) && !ehComum(p)); } catch (_) { return; }
  try { localStorage.setItem("lufa_militante", ativo ? "1" : "0"); } catch (_) {}
  const mostrar = () => document.querySelectorAll("[data-so-militante]").forEach((a) => (a.hidden = !ativo));
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mostrar); else mostrar();
})();

// ---------- formação obrigatória para militantes ----------
// Episódios da "Formação para novos militantes" (Área do Militante). Para publicar um: preencha "video" e "capa".
const FORMACAO = [
  { id: "novos-01", titulo: "Bem-vindo ao Coletivo Lufã!", video: "formacao/videos/novos-ep01.mp4", capa: "formacao/capas/novos-ep01.jpg?v=4" },
  { id: "novos-02", titulo: "O que é ser um militante ativo?", video: "", capa: "" },
  { id: "novos-03", titulo: "A Área do Militante e a organização dos núcleos", video: "", capa: "" },
];
// Lembrete em qualquer página do site: o militante que ainda não assistiu aos episódios publicados vê um pop-up
// "Complete a formação obrigatória para militantes" com um botão que leva à formação (uma vez por visita ao site).
(async () => {
  if (/[?&]embutido=1/.test(location.search)) return;
  try { if (sessionStorage.getItem("lufa_formacao_lembrete")) return; } catch (_) {}
  let p = null;
  try { p = await meuPerfil(); } catch (_) { return; }
  if (!(p && APROVADO.includes(p.papel) && !ehComum(p))) return;
  const vistos = () => {
    const v = new Set();
    try { JSON.parse(localStorage.getItem("formacao-vistos-" + p.id) || "[]").forEach((x) => v.add(x)); } catch (_) {}
    return v;
  };
  const { data, error } = await supa.from("formacao_progresso").select("video").eq("membro", p.id);
  const doBanco = error ? [] : (data || []).map((r) => r.video);
  const faltam = () => { const v = vistos(); doBanco.forEach((x) => v.add(x)); return FORMACAO.filter((e) => e.video && !v.has(e.id)); };
  if (!faltam().length) return;
  const naArea = /militante\.html$/.test(location.pathname);
  const iniciar = () => {
    document.body.insertAdjacentHTML("beforeend", `
      <dialog class="pedir-conta lembrete-formacao" id="janela-lembrete-formacao" aria-labelledby="lembrete-formacao-titulo">
        <button class="ficha__fechar" type="button" aria-label="Fechar" data-fechar-lembrete>×</button>
        <div class="pedir-conta__corpo">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2l2.9 6.9 7.1.6-5.4 4.7 1.6 7.3L12 17.8 5.8 21.5l1.6-7.3L2 9.5l7.1-.6z"/></svg>
          <h2 id="lembrete-formacao-titulo">Complete a formação obrigatória para militantes</h2>
          <p>Todo militante do Coletivo Lufã assiste à formação inicial. São vídeos curtos, na Área do Militante.</p>
          <a class="botao botao--amarelo" href="militante.html#formacao" data-ir-formacao>Clique aqui</a>
        </div>
      </dialog>`);
    const j = document.getElementById("janela-lembrete-formacao");
    j.addEventListener("close", () => { try { sessionStorage.setItem("lufa_formacao_lembrete", "1"); } catch (_) {} document.documentElement.classList.remove("janela-aberta"); });
    j.querySelector("[data-fechar-lembrete]").addEventListener("click", () => j.close());
    j.addEventListener("click", (e) => { if (e.target === j) j.close(); });
    j.querySelector("[data-ir-formacao]").addEventListener("click", (e) => {
      if (!naArea) return;   // em outra página, o link leva à Área do Militante
      e.preventDefault(); j.close();
      const s = document.getElementById("formacao"); if (s && !s.hidden) s.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    // espera outras janelas (cadastro, formação obrigatória, abertura do jornal) fecharem
    let tentativas = 0;
    const tentar = () => {
      const ocupado = document.querySelector("dialog[open]:not(#janela-lembrete-formacao)") || document.getElementById("abertura");
      if (ocupado) { if (++tentativas < 80) setTimeout(tentar, 1500); return; }
      if (!faltam().length) return;   // já assistiu enquanto isso (ex.: na janela da formação obrigatória)
      j.showModal(); document.documentElement.classList.add("janela-aberta");
      try { sessionStorage.setItem("lufa_formacao_lembrete", "1"); } catch (_) {}   // uma vez por visita ao site
    };
    setTimeout(tentar, naArea ? 4000 : 1200);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
})();
