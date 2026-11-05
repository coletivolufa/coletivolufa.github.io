-- =====================================================================
--  Coletivo Lufã · Regimento Interno, visível só para MEMBROS ATIVOS
--  Cole tudo no SQL Editor do Supabase e clique em Run.
--  Pode rodar de novo: atualiza o texto sem apagar nada.
--  Para mudar o regimento depois, edite o texto abaixo e rode de novo.
-- =====================================================================

create table if not exists public.regimento (
  id           int primary key default 1 check (id = 1),
  texto        text not null default '',
  atualizado_em timestamptz not null default now()
);

alter table public.regimento enable row level security;

-- só quem é MEMBRO ATIVO lê o regimento (mesma regra de sou_ativo() dos artigos)
drop policy if exists "so membros ativos leem o regimento" on public.regimento;
create policy "so membros ativos leem o regimento" on public.regimento
  for select using (public.sou_ativo());

-- ninguém escreve pela API pública; só pelo painel do Supabase (SQL Editor)
revoke all on public.regimento from anon, authenticated;
grant select on public.regimento to authenticated;

insert into public.regimento (id, texto) values (1, $regimento$# Regimento Interno do Coletivo Lufã

## Seja um membro ativo do coletivo Lufã

Este regimento é para os novos membros. Ao entrar no coletivo, você concorda com o que está escrito aqui.

---

## 1. Objetivo do coletivo

O Coletivo Lufã não é de esquerda moderada, nem lulista. Não somos ligados a nenhum partido político. Nosso compromisso é com a defesa do trabalhador brasileiro.

Nossos ideais são pautados pelo marxismo. Por meio de uma organização radicalizada, buscamos orientar, informar, denunciar e, principalmente, formar novos militantes comunistas.

---

## 2. Requisitos para ser membro

1. Fazer o cadastro obrigatório no site, com nome completo, idade, e-mail, telefone e foto. Nome e foto podem ser divulgados. Os demais dados são usados para a segurança interna e a segurança do próprio membro.
2. Concordar com as diretrizes internas e manter suas ações dentro das leis vigentes.
3. Ter respeito, cordialidade e empatia. Essas qualidades valem tanto quanto a radicalização.
4. Quem ainda não tem conhecimento mínimo de marxismo deve pedir orientação especial. Conforme a disponibilidade do coletivo e as condições de cada um, o membro será auxiliado na própria formação.

---

## 3. Compromisso

1. **Colaborar mínima e corretamente.** Todo membro ativo deve contribuir com o coletivo, de acordo com a função escolhida.
2. **Ser acompanhado e direcionado.** Todo novo membro será acompanhado e orientado pelo coletivo.
3. **Manter seu cadastro como membro ativo.** Ao se cadastrar, o membro passa a fazer parte do time de colaboradores do coletivo Lufã.
4. **Respeitar a inatividade.** Quem ultrapassar os limites de inatividade ou de falta de colaboração será desligado imediatamente.
5. **Responder por suas falas.** Falas em eventos, podcasts ou vídeos em outros locais que contrariem os ideais do coletivo podem ser vetadas. Nesse caso, a permanência do membro vai à votação dos membros.
6. **Não usar o coletivo em campanha política sem aviso prévio.** Quem se candidatar a cargo político deve comunicar antecipadamente ao coletivo e fazer um acordo.
7. **Não fazer pedidos financeiros em nome do coletivo,** salvo em campanha ou em acordo feito antes com a diretoria.

---

## 4. Funções dentro do coletivo

- **Membros com responsabilidade:** quem tiver os requisitos e quiser ocupar funções de maior responsabilidade será acompanhado e orientado para fortalecer e construir o coletivo.
- **Criadores de conteúdo:** quem não tiver ocupação específica ou não quiser uma função de responsabilidade será designado a criar conteúdo. Pode ajudar com artigos no site, notícias no Instagram, memes, edição e Reels, Stories ou outros formatos.
- **Seguidores e apoiadores:** quem não quiser colaborar ativamente pode seguir os conteúdos, participar dos movimentos e ajudar de outras formas. Essas pessoas não são chamadas de membros ativos.

---

## 5. Disposições gerais

1. **Uso de imagem e voz.** Ao participar de vídeos, stories ou outras mídias com sua imagem, voz ou dados, o membro concorda que o conteúdo seja mantido mesmo se ele sair do coletivo, salvo acordo interno.
2. **Vedação de coação.** Não há obrigação de participar de ações ligadas a partido político. É vedado obrigar qualquer membro a se filiar a partido, a aliar-se a uma luta ou causa específica, ou algo semelhante.
3. **Outros núcleos.** Qualquer membro pode participar de outros núcleos, coletivos ou células, desde que não infrinja as regras internas nem a linha marxista do coletivo.
4. **Saída.** Qualquer membro pode pedir desligamento do coletivo a qualquer momento.
5. **Suspeitas graves.** Membros com suspeita de ações criminosas, danosas ou problemáticas passam por julgamento interno. Todos os membros votam pela permanência ou pela expulsão.
$regimento$)
on conflict (id) do update set texto = excluded.texto, atualizado_em = now();
