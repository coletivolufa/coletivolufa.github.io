// E-mail único para quem já era membro: "atualize seu cadastro (celular)" + canal do WhatsApp.
// Usa os mesmos segredos do envio de avisos (SUPABASE_SERVICE_KEY, RESEND_API_KEY, EMAIL_REMETENTE).
// Cada pessoa recebe uma vez só (o banco guarda a data em perfis.aviso_celular_em).
// TESTE=1 manda tudo para um único endereço (EMAIL_TESTE) e não marca ninguém como avisado.
const URL_BANCO = "https://mszatrbsbzhuxlsfebrv.supabase.co";
const CHAVE_BANCO = process.env.SUPABASE_SERVICE_KEY;
const CHAVE_EMAIL = process.env.RESEND_API_KEY;
const REMETENTE = process.env.EMAIL_REMETENTE || "Coletivo Lufã <onboarding@resend.dev>";
const TESTE = process.env.TESTE === "1" || process.env.TESTE === "true";
const EMAIL_TESTE = process.env.EMAIL_TESTE || "";
const CONTA = "https://coletivolufa.github.io/conta.html";
const CANAL = "https://whatsapp.com/channel/0029VbE3dHYLY6d1Pf9lyk1j";

if (!CHAVE_BANCO || !CHAVE_EMAIL) { console.error("Faltam os segredos SUPABASE_SERVICE_KEY e/ou RESEND_API_KEY."); process.exit(1); }
if (TESTE && !EMAIL_TESTE) { console.error("No modo teste, informe o e-mail de teste."); process.exit(1); }

async function rpc(nome, corpo) {
  const r = await fetch(`${URL_BANCO}/rest/v1/rpc/${nome}`, {
    method: "POST",
    headers: { apikey: CHAVE_BANCO, Authorization: `Bearer ${CHAVE_BANCO}`, "Content-Type": "application/json" },
    body: JSON.stringify(corpo || {}),
  });
  if (!r.ok) throw new Error(`${nome}: ${r.status} ${await r.text()}`);
  return r.status === 204 ? null : r.json();
}
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));

const lista = (await rpc("membros_sem_celular")) || [];
const alvo = TESTE ? lista.slice(0, 1) : lista;
console.log(`Membros sem celular e ainda não avisados: ${lista.length}.${TESTE ? " Modo teste: 1 e-mail para o endereço de teste." : ""}`);

let enviados = 0, falhas = 0;
for (const p of alvo) {
  const nome = (p.nome || "").split(" ")[0] || "camarada";
  const html = `<div style="font-family:Arial,sans-serif;color:#1C1714;max-width:560px">
    <h2 style="color:#cc2220;margin:0 0 12px">Coletivo Lufã</h2>
    <p>Olá, ${esc(nome)}!</p>
    <p>A partir de agora, o <b>número de celular é obrigatório</b> no cadastro de todos os membros do Coletivo Lufã.
    Ele não aparece no site: serve só para a organização do coletivo falar com você.</p>
    <p>Entre na sua conta e atualize o seu cadastro. Leva menos de um minuto:</p>
    <p><a href="${CONTA}" style="display:inline-block;background:#cc2220;color:#fff;padding:12px 18px;border-radius:999px;text-decoration:none;font-weight:bold">Atualizar meu cadastro</a></p>
    <hr style="border:0;border-top:1px solid #ddd;margin:24px 0">
    <p><b>Faça parte do nosso canal de notícias no WhatsApp.</b> Lá você recebe as notícias, as denúncias, as convocações e os novos conteúdos do coletivo.</p>
    <p><a href="${CANAL}" style="display:inline-block;background:#25D366;color:#fff;padding:12px 18px;border-radius:999px;text-decoration:none;font-weight:bold">Entrar no canal do WhatsApp</a></p>
    <p style="font-size:12px;color:#777;margin-top:24px">Você recebe este e-mail porque tem cadastro no site do Coletivo Lufã.</p>
  </div>`;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${CHAVE_EMAIL}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: REMETENTE, to: [TESTE ? EMAIL_TESTE : p.email], subject: "Atualize seu cadastro no Coletivo Lufã (e entre no nosso canal)", html }),
  });
  if (!r.ok) { falhas++; console.error(`Falhou para um destinatário: ${r.status} ${await r.text()}`); continue; }
  if (!TESTE) await rpc("marcar_aviso_celular", { p_ids: [p.id] });
  enviados++;
  await espera(600); // respeita o limite do serviço de e-mail
}
console.log(`E-mails enviados: ${enviados}. Falhas: ${falhas}.`);
if (falhas && !enviados) process.exit(1);
