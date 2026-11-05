// Envia por e-mail os avisos pendentes (pedidos de amizade e mensagens).
// Precisa de três segredos no GitHub (Settings > Secrets and variables > Actions):
//   SUPABASE_SERVICE_KEY  chave "service_role" do Supabase (nunca vai para o site)
//   RESEND_API_KEY        chave do serviço de e-mail Resend
//   EMAIL_REMETENTE       ex.: "Coletivo Lufã <avisos@seudominio.com.br>"
const URL_BANCO = "https://mszatrbsbzhuxlsfebrv.supabase.co";
const CHAVE_BANCO = process.env.SUPABASE_SERVICE_KEY;
const CHAVE_EMAIL = process.env.RESEND_API_KEY;
const REMETENTE = process.env.EMAIL_REMETENTE || "Coletivo Lufã <onboarding@resend.dev>";
const SITE = "https://coletivolufa.github.io/comunidade.html";

if (!CHAVE_BANCO || !CHAVE_EMAIL) {
  console.error("Faltam os segredos SUPABASE_SERVICE_KEY e/ou RESEND_API_KEY.");
  process.exit(1);
}

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

const pendentes = (await rpc("avisos_para_email")) || [];
const porPessoa = new Map();
for (const a of pendentes) {
  if (!porPessoa.has(a.para_id)) porPessoa.set(a.para_id, { email: a.email, nome: a.nome, itens: [] });
  porPessoa.get(a.para_id).itens.push(a);
}

let enviados = 0;
for (const [, pessoa] of porPessoa) {
  const n = pessoa.itens.length;
  const assunto = n === 1 ? "Você tem um aviso no Coletivo Lufã" : `Você tem ${n} avisos no Coletivo Lufã`;
  const lista = pessoa.itens.map((i) => `<li style="margin:8px 0">${esc(i.texto)}</li>`).join("");
  const html = `<div style="font-family:Arial,sans-serif;color:#1C1714">
    <h2 style="color:#cc2220;margin:0 0 12px">Coletivo Lufã</h2>
    <p>Olá, ${esc(pessoa.nome || "camarada")}! Você recebeu:</p>
    <ul style="padding-left:20px">${lista}</ul>
    <p><a href="${SITE}" style="background:#cc2220;color:#fff;padding:10px 16px;border-radius:999px;text-decoration:none;font-weight:bold">Abrir a comunidade</a></p>
    <p style="font-size:12px;color:#777">Você recebe este aviso porque é membro do Coletivo Lufã. Para deixar de receber e-mails, desligue a opção de avisos na sua conta.</p>
  </div>`;

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${CHAVE_EMAIL}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: REMETENTE, to: [pessoa.email], subject: assunto, html }),
  });
  if (!r.ok) { console.error(`Falhou para um destinatário: ${r.status} ${await r.text()}`); continue; }
  await rpc("marcar_avisos_enviados", { p_ids: pessoa.itens.map((i) => i.id) });
  enviados += n;
}
console.log(`Avisos enviados: ${enviados} de ${pendentes.length}.`);
