-- =====================================================================
--  Coletivo Lufã · COMUNIDADE: respostas em comentários (com foto),
--  desfazer amizade e avisos (pedidos de amizade e mensagens)
--  Rode DEPOIS do 12-midia-hashtags.sql. Cole tudo no SQL Editor e clique em Run.
--  Pode rodar de novo sem problema.
-- =====================================================================

-- ---------- 1. respostas nos comentários, com foto ----------
alter table public.post_comentarios add column if not exists parent_id bigint
  references public.post_comentarios (id) on delete cascade;
alter table public.post_comentarios add column if not exists imagem_url text;
alter table public.post_comentarios drop constraint if exists post_comentarios_texto_check;
alter table public.post_comentarios drop constraint if exists post_comentarios_conteudo_check;
alter table public.post_comentarios add constraint post_comentarios_conteudo_check
  check (char_length(trim(texto)) <= 280 and (char_length(trim(texto)) >= 1 or imagem_url is not null));
create index if not exists post_comentarios_parent_idx on public.post_comentarios (parent_id);

-- ---------- 2. desfazer amizade (apaga a amizade e a conversa privada) ----------
create or replace function public.desfazer_amizade(p_outro uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_eu uuid := auth.uid();
begin
  if not public.sou_aprovado() then raise exception 'Só membros aprovados.'; end if;
  delete from public.amizades
    where status = 'aceita'
      and ((de_id = v_eu and para_id = p_outro) or (de_id = p_outro and para_id = v_eu));
  delete from public.chat_conversas
    where membro_a = least(v_eu, p_outro) and membro_b = greatest(v_eu, p_outro) and origem = 'amizade';
end $$;

grant execute on function public.desfazer_amizade(uuid) to authenticated;

-- ---------- 3. avisos: pedidos de amizade e mensagens ----------
alter table public.perfis add column if not exists avisar_email boolean not null default true;

create table if not exists public.notificacoes (
  id           bigint generated always as identity primary key,
  para_id      uuid not null references public.perfis (id) on delete cascade,
  de_id        uuid references public.perfis (id) on delete cascade,
  tipo         text not null check (tipo in ('pedido_amizade', 'mensagem')),
  texto        text not null default '',
  conversa_id  bigint references public.chat_conversas (id) on delete cascade,
  lida         boolean not null default false,
  email_enviado boolean not null default false,
  criado_em    timestamptz not null default now()
);
alter table public.notificacoes enable row level security;

drop policy if exists "vejo minhas notificacoes" on public.notificacoes;
create policy "vejo minhas notificacoes" on public.notificacoes
  for select using (para_id = auth.uid());

drop policy if exists "marco minhas notificacoes" on public.notificacoes;
create policy "marco minhas notificacoes" on public.notificacoes
  for update using (para_id = auth.uid()) with check (para_id = auth.uid());

grant select, update on public.notificacoes to authenticated;

create or replace function public.nome_curto(p uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(split_part((select nome from public.perfis where id = p), ' ', 1), 'Alguém')
$$;

create or replace function public.notificar_pedido() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'pendente' then
    insert into public.notificacoes (para_id, de_id, tipo, texto)
      values (new.para_id, new.de_id, 'pedido_amizade',
              public.nome_curto(new.de_id) || ' pediu sua amizade na comunidade do Coletivo Lufã');
  end if;
  return new;
end $$;

drop trigger if exists amizade_notifica on public.amizades;
create trigger amizade_notifica after insert on public.amizades
  for each row execute function public.notificar_pedido();

create or replace function public.notificar_mensagem() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  c record;
  v_outro uuid;
  v_trecho text;
begin
  if new.conversa_id is null then return new; end if;
  select * into c from public.chat_conversas where id = new.conversa_id;
  if not found then return new; end if;
  v_outro := case when c.membro_a = new.autor_id then c.membro_b else c.membro_a end;
  v_trecho := case
    when new.tipo = 'texto' then '"' || left(new.texto, 80) || '"'
    when new.tipo = 'imagem' then '[foto]'
    else '[áudio]' end;
  insert into public.notificacoes (para_id, de_id, tipo, texto, conversa_id)
    values (v_outro, new.autor_id, 'mensagem',
            public.nome_curto(new.autor_id) || ' mandou uma mensagem: ' || v_trecho, new.conversa_id);
  return new;
end $$;

drop trigger if exists chat_notifica on public.chat_mensagens;
create trigger chat_notifica after insert on public.chat_mensagens
  for each row execute function public.notificar_mensagem();

-- ---------- 4. envio de e-mails (usado só pelo robô, com a chave de serviço) ----------
create or replace function public.avisos_para_email()
returns table (id bigint, para_id uuid, email text, nome text, texto text, tipo text, criado_em timestamptz)
language sql stable security definer set search_path = public as $$
  select n.id, n.para_id, u.email::text, p.nome, n.texto, n.tipo, n.criado_em
  from public.notificacoes n
  join public.perfis p on p.id = n.para_id
  join auth.users u on u.id = n.para_id
  where not n.email_enviado
    and p.avisar_email
    and n.criado_em > now() - interval '2 days'
  order by n.para_id, n.criado_em
  limit 500
$$;

create or replace function public.marcar_avisos_enviados(p_ids bigint[]) returns void
language sql security definer set search_path = public as $$
  update public.notificacoes set email_enviado = true where id = any(p_ids)
$$;

revoke execute on function public.avisos_para_email() from public, anon, authenticated;
revoke execute on function public.marcar_avisos_enviados(bigint[]) from public, anon, authenticated;
grant execute on function public.avisos_para_email() to service_role;
grant execute on function public.marcar_avisos_enviados(bigint[]) to service_role;

-- ---------- 5. tempo real: o aviso chega na hora (som na tela) ----------
do $$ begin alter publication supabase_realtime add table public.notificacoes;
exception when duplicate_object then null; end $$;
