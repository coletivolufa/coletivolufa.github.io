-- =====================================================================
--  Coletivo Lufã · CONVERSAS PRIVADAS no bate-papo (convites)
--  Rode DEPOIS do 08-chat.sql. Cole tudo no SQL Editor e clique em Run.
--  Pode rodar de novo sem problema.
--  Chat geral: conversa_id é null. Conversa privada: conversa_id preenchido.
--  Tudo (mensagens, convites e conversas) some 72 horas depois.
-- =====================================================================

-- ---------- conversas privadas e convites ----------
create table if not exists public.chat_conversas (
  id        bigint generated always as identity primary key,
  membro_a  uuid not null references public.perfis (id) on delete cascade,
  membro_b  uuid not null references public.perfis (id) on delete cascade,
  criado_em timestamptz not null default now(),
  check (membro_a < membro_b),
  unique (membro_a, membro_b)
);

create table if not exists public.chat_convites (
  id        bigint generated always as identity primary key,
  de_id     uuid not null references public.perfis (id) on delete cascade,
  para_id   uuid not null references public.perfis (id) on delete cascade,
  status    text not null default 'pendente' check (status in ('pendente', 'aceito', 'recusado')),
  criado_em timestamptz not null default now(),
  check (de_id <> para_id)
);

create unique index if not exists chat_convite_pendente on public.chat_convites (de_id, para_id) where status = 'pendente';

-- mensagem pode ser de uma conversa privada (null = chat geral)
alter table public.chat_mensagens add column if not exists conversa_id bigint;
alter table public.chat_mensagens drop constraint if exists chat_mensagens_conversa_fk;
alter table public.chat_mensagens add constraint chat_mensagens_conversa_fk
  foreign key (conversa_id) references public.chat_conversas (id) on delete cascade;
create index if not exists chat_conversa_idx on public.chat_mensagens (conversa_id, criado_em);

alter table public.chat_conversas enable row level security;
alter table public.chat_convites enable row level security;

create or replace function public.sou_participante(c bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.chat_conversas where id = c and auth.uid() in (membro_a, membro_b))
$$;

drop policy if exists "participantes leem suas conversas" on public.chat_conversas;
create policy "participantes leem suas conversas" on public.chat_conversas
  for select using (auth.uid() in (membro_a, membro_b) and public.sou_aprovado());

drop policy if exists "envolvidos leem convites" on public.chat_convites;
create policy "envolvidos leem convites" on public.chat_convites
  for select using (auth.uid() in (de_id, para_id) and public.sou_aprovado());

grant select on public.chat_conversas, public.chat_convites to authenticated;

-- ---------- regras das mensagens (geral + privadas) ----------
drop policy if exists "aprovados leem o chat" on public.chat_mensagens;
drop policy if exists "leem o chat" on public.chat_mensagens;
create policy "leem o chat" on public.chat_mensagens
  for select using (
    criado_em > now() - interval '72 hours' and public.sou_aprovado()
    and (conversa_id is null or public.sou_participante(conversa_id))
  );

drop policy if exists "aprovados escrevem no chat" on public.chat_mensagens;
drop policy if exists "escrevem no chat" on public.chat_mensagens;
create policy "escrevem no chat" on public.chat_mensagens
  for insert with check (
    public.sou_aprovado() and autor_id = auth.uid()
    and (tipo <> 'audio' or public.sou_ativo())
    and (conversa_id is null or public.sou_participante(conversa_id))
  );

-- ---------- funções: chamar, aceitar, recusar ----------
create or replace function public.chamar_membro(para uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_eu uuid := auth.uid();
  v_a uuid;
  v_b uuid;
  v_convite bigint;
begin
  if not public.sou_aprovado() then raise exception 'Só membros aprovados podem chamar alguém.'; end if;
  if para is null or para = v_eu then raise exception 'Escolha outro membro.'; end if;
  if not exists (select 1 from public.perfis where id = para and papel in ('membro', 'autor', 'editor', 'admin')) then
    raise exception 'Membro não encontrado.';
  end if;

  v_a := least(v_eu, para);
  v_b := greatest(v_eu, para);
  if exists (select 1 from public.chat_conversas where membro_a = v_a and membro_b = v_b) then return 'ja_conversa'; end if;
  if exists (select 1 from public.chat_convites where de_id = v_eu and para_id = para and status = 'pendente') then return 'ja_enviado'; end if;

  -- se a outra pessoa já tinha chamado você, a conversa abre direto
  select id into v_convite from public.chat_convites where de_id = para and para_id = v_eu and status = 'pendente' limit 1;
  if v_convite is not null then
    perform public.aceitar_convite(v_convite);
    return 'aceito_automatico';
  end if;

  insert into public.chat_convites (de_id, para_id) values (v_eu, para);
  return 'enviado';
end $$;

create or replace function public.aceitar_convite(conv bigint) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  c record;
  v_id bigint;
begin
  select * into c from public.chat_convites where id = conv and para_id = auth.uid() and status = 'pendente';
  if not found then raise exception 'Convite não encontrado ou já respondido.'; end if;

  update public.chat_convites set status = 'aceito' where id = conv;
  insert into public.chat_conversas (membro_a, membro_b)
    values (least(c.de_id, c.para_id), greatest(c.de_id, c.para_id))
    on conflict (membro_a, membro_b) do nothing;
  select id into v_id from public.chat_conversas
    where membro_a = least(c.de_id, c.para_id) and membro_b = greatest(c.de_id, c.para_id);
  return v_id;
end $$;

create or replace function public.recusar_convite(conv bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.chat_convites set status = 'recusado' where id = conv and para_id = auth.uid() and status = 'pendente';
end $$;

grant execute on function public.chamar_membro(uuid) to authenticated;
grant execute on function public.aceitar_convite(bigint) to authenticated;
grant execute on function public.recusar_convite(bigint) to authenticated;

-- ---------- tempo real também para convites e conversas ----------
do $$ begin alter publication supabase_realtime add table public.chat_convites;
exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.chat_conversas;
exception when duplicate_object then null; end $$;

-- ---------- apagar tudo depois de 72 horas (a cada hora) ----------
do $$ begin
  create extension if not exists pg_cron;
  perform cron.schedule('chat-apagar-72h', '0 * * * *', $cron$
    delete from public.chat_mensagens where criado_em < now() - interval '72 hours';
    delete from public.chat_convites where criado_em < now() - interval '72 hours';
    delete from public.chat_conversas where criado_em < now() - interval '72 hours';
    delete from storage.objects where bucket_id = 'chat' and created_at < now() - interval '72 hours';
  $cron$);
exception when others then
  raise notice 'pg_cron não ativado: %', sqlerrm;
end $$;
