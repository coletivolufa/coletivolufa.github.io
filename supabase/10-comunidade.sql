-- =====================================================================
--  Coletivo Lufã · COMUNIDADE: @apelido, feed, amizades e encontros
--  Rode DEPOIS do 09-chat-privado.sql. Cole tudo no SQL Editor e clique em Run.
--  Pode rodar de novo sem problema.
-- =====================================================================

-- ---------- 1. @apelido ----------
alter table public.perfis add column if not exists apelido text;
alter table public.perfis drop constraint if exists perfis_apelido_formato;
alter table public.perfis add constraint perfis_apelido_formato
  check (apelido is null or apelido ~ '^[a-z0-9_.]{3,20}$');
create unique index if not exists perfis_apelido_unico on public.perfis (lower(apelido)) where apelido is not null;

-- a lista pública de membros passa a trazer o @apelido (coluna nova no fim)
create or replace view public.membros_publicos as
  select id, nome, arroba, rede, foto, funcao, matricula, aprovado_em, apelido
  from public.perfis
  where papel in ('membro', 'autor', 'editor', 'admin');
grant select on public.membros_publicos to anon, authenticated;

create or replace function public.tenho_apelido() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select apelido is not null from public.perfis where id = auth.uid()), false)
$$;

-- ---------- 2. conversas: origem, resposta e quem começou ----------
alter table public.chat_conversas add column if not exists origem text not null default 'amizade';
alter table public.chat_conversas drop constraint if exists chat_conversas_origem_check;
alter table public.chat_conversas add constraint chat_conversas_origem_check
  check (origem in ('amizade', 'match', 'encontro'));
alter table public.chat_conversas add column if not exists respondida boolean not null default true;
alter table public.chat_conversas add column if not exists iniciada_por uuid references public.perfis (id) on delete set null;

create or replace function public.pode_escrever(c bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.chat_conversas
                 where id = c and (respondida or iniciada_por is distinct from auth.uid()))
$$;

-- quando a outra pessoa responde a uma mensagem de encontro, a conversa fica liberada
create or replace function public.marcar_respondida() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.conversa_id is not null then
    update public.chat_conversas set respondida = true
      where id = new.conversa_id and respondida = false and iniciada_por is distinct from new.autor_id;
  end if;
  return new;
end $$;

drop trigger if exists chat_marca_respondida on public.chat_mensagens;
create trigger chat_marca_respondida after insert on public.chat_mensagens
  for each row execute function public.marcar_respondida();

-- para escrever no chat: ter @apelido, ser aprovado, e (em conversa privada) poder escrever
drop policy if exists "escrevem no chat" on public.chat_mensagens;
create policy "escrevem no chat" on public.chat_mensagens
  for insert with check (
    public.sou_aprovado() and autor_id = auth.uid() and public.tenho_apelido()
    and (tipo <> 'audio' or public.sou_ativo())
    and (conversa_id is null or (public.sou_participante(conversa_id) and public.pode_escrever(conversa_id)))
  );

-- ---------- 3. feed (postagens públicas) ----------
create table if not exists public.posts (
  id          bigint generated always as identity primary key,
  autor_id    uuid not null references public.perfis (id) on delete cascade,
  texto       text not null default '' check (char_length(texto) <= 500),
  imagem_url  text,
  criado_em   timestamptz not null default now(),
  check (char_length(texto) > 0 or imagem_url is not null)
);
alter table public.posts enable row level security;

drop policy if exists "aprovados leem o feed" on public.posts;
create policy "aprovados leem o feed" on public.posts
  for select using (public.sou_aprovado());

drop policy if exists "aprovados publicam" on public.posts;
create policy "aprovados publicam" on public.posts
  for insert with check (public.sou_aprovado() and public.tenho_apelido() and autor_id = auth.uid());

drop policy if exists "dono ou admin apaga post" on public.posts;
create policy "dono ou admin apaga post" on public.posts
  for delete using (autor_id = auth.uid() or public.eh_admin());

grant select, insert, delete on public.posts to authenticated;
grant usage on sequence public.posts_id_seq to authenticated;

-- ---------- 4. amizades ----------
create table if not exists public.amizades (
  id        bigint generated always as identity primary key,
  de_id     uuid not null references public.perfis (id) on delete cascade,
  para_id   uuid not null references public.perfis (id) on delete cascade,
  status    text not null default 'pendente' check (status in ('pendente', 'aceita')),
  criado_em timestamptz not null default now(),
  check (de_id <> para_id)
);
alter table public.amizades enable row level security;

drop policy if exists "envolvidos leem amizades" on public.amizades;
create policy "envolvidos leem amizades" on public.amizades
  for select using (auth.uid() in (de_id, para_id) and public.sou_aprovado());

grant select on public.amizades to authenticated;

create or replace function public.pedir_amizade(p_apelido text) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_eu uuid := auth.uid();
  v_para uuid;
  v_id bigint;
begin
  if not public.sou_aprovado() or not public.tenho_apelido() then
    raise exception 'Crie seu @apelido antes de pedir amizade.';
  end if;
  select id into v_para from public.perfis
    where lower(apelido) = lower(trim(p_apelido)) and papel in ('membro', 'autor', 'editor', 'admin');
  if v_para is null then raise exception 'Ninguém com esse @apelido.'; end if;
  if v_para = v_eu then raise exception 'Você não pode pedir amizade para você mesmo.'; end if;
  if exists (select 1 from public.amizades where status = 'aceita'
             and ((de_id = v_eu and para_id = v_para) or (de_id = v_para and para_id = v_eu))) then
    return 'ja_amigos';
  end if;
  if exists (select 1 from public.amizades where de_id = v_eu and para_id = v_para and status = 'pendente') then
    return 'ja_enviado';
  end if;
  -- se a outra pessoa já tinha pedido, a amizade é aceita direto
  select id into v_id from public.amizades where de_id = v_para and para_id = v_eu and status = 'pendente';
  if v_id is not null then
    perform public.aceitar_amizade(v_id);
    return 'aceito_automatico';
  end if;
  insert into public.amizades (de_id, para_id) values (v_eu, v_para);
  return 'enviado';
end $$;

create or replace function public.aceitar_amizade(p_id bigint) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  a record;
  v_conv bigint;
begin
  select * into a from public.amizades where id = p_id and para_id = auth.uid() and status = 'pendente';
  if not found then raise exception 'Pedido não encontrado ou já respondido.'; end if;
  update public.amizades set status = 'aceita' where id = p_id;
  insert into public.chat_conversas (membro_a, membro_b, origem)
    values (least(a.de_id, a.para_id), greatest(a.de_id, a.para_id), 'amizade')
    on conflict (membro_a, membro_b) do nothing;
  select id into v_conv from public.chat_conversas
    where membro_a = least(a.de_id, a.para_id) and membro_b = greatest(a.de_id, a.para_id);
  return v_conv;
end $$;

create or replace function public.recusar_amizade(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.amizades where id = p_id and para_id = auth.uid() and status = 'pendente';
end $$;

-- ---------- 5. perfis de encontro ----------
create table if not exists public.encontro_perfis (
  id              uuid primary key references public.perfis (id) on delete cascade,
  sobre           text not null default '' check (char_length(sobre) <= 300),
  gostos          text not null default '' check (char_length(gostos) <= 200),
  musica          text not null default '' check (char_length(musica) <= 120),
  filme           text not null default '' check (char_length(filme) <= 120),
  genero          text not null check (char_length(genero) <= 60),
  genero_outro    text not null default '' check (char_length(genero_outro) <= 60),
  orientacao      text not null check (char_length(orientacao) <= 60),
  orientacao_outra text not null default '' check (char_length(orientacao_outra) <= 60),
  foto_url        text not null,
  ativo           boolean not null default true,
  atualizado_em   timestamptz not null default now()
);
alter table public.encontro_perfis enable row level security;

drop policy if exists "leem perfis de encontro" on public.encontro_perfis;
create policy "leem perfis de encontro" on public.encontro_perfis
  for select using (id = auth.uid() or (public.sou_aprovado() and ativo));

drop policy if exists "cada um cria o proprio perfil de encontro" on public.encontro_perfis;
create policy "cada um cria o proprio perfil de encontro" on public.encontro_perfis
  for insert with check (id = auth.uid() and public.sou_aprovado());

drop policy if exists "cada um edita o proprio perfil de encontro" on public.encontro_perfis;
create policy "cada um edita o proprio perfil de encontro" on public.encontro_perfis
  for update using (id = auth.uid()) with check (id = auth.uid());

grant select, insert, update on public.encontro_perfis to authenticated;

-- curtidas (coração) e negações (X): cada pessoa só vê as próprias
create table if not exists public.encontro_reacoes (
  de_id     uuid not null references public.perfis (id) on delete cascade,
  para_id   uuid not null references public.perfis (id) on delete cascade,
  tipo      text not null check (tipo in ('coracao', 'x')),
  criado_em timestamptz not null default now(),
  primary key (de_id, para_id),
  check (de_id <> para_id)
);
alter table public.encontro_reacoes enable row level security;

drop policy if exists "vejo minhas reacoes" on public.encontro_reacoes;
create policy "vejo minhas reacoes" on public.encontro_reacoes
  for select using (de_id = auth.uid());

grant select on public.encontro_reacoes to authenticated;

create or replace function public.reagir_encontro(p_para uuid, p_tipo text) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_eu uuid := auth.uid();
  v_a uuid;
  v_b uuid;
begin
  if not public.sou_aprovado() then raise exception 'Só membros aprovados.'; end if;
  if p_tipo not in ('coracao', 'x') then raise exception 'Reação inválida.'; end if;
  if not exists (select 1 from public.encontro_perfis where id = v_eu) then raise exception 'Crie seu perfil de encontros antes.'; end if;
  if not exists (select 1 from public.encontro_perfis where id = p_para and ativo) then raise exception 'Perfil não encontrado.'; end if;

  insert into public.encontro_reacoes (de_id, para_id, tipo) values (v_eu, p_para, p_tipo)
    on conflict (de_id, para_id) do update set tipo = excluded.tipo, criado_em = now();

  -- as duas pessoas deram coração: match, e a conversa abre no chat
  if p_tipo = 'coracao' and exists (select 1 from public.encontro_reacoes
                                    where de_id = p_para and para_id = v_eu and tipo = 'coracao') then
    v_a := least(v_eu, p_para);
    v_b := greatest(v_eu, p_para);
    insert into public.chat_conversas (membro_a, membro_b, origem, respondida)
      values (v_a, v_b, 'match', true)
      on conflict (membro_a, membro_b) do update set origem = 'match', respondida = true;
    return 'match';
  end if;
  return 'ok';
end $$;

-- mensagem de encontro: até 50 caracteres; só pode mandar outra depois que a pessoa responder
create or replace function public.mensagem_encontro(p_para uuid, p_texto text) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v_eu uuid := auth.uid();
  v_a uuid := least(v_eu, p_para);
  v_b uuid := greatest(v_eu, p_para);
  v_txt text := trim(p_texto);
  c record;
begin
  if not public.sou_aprovado() or not public.tenho_apelido() then
    raise exception 'Crie seu @apelido antes de mandar mensagem.';
  end if;
  if char_length(v_txt) < 1 or char_length(v_txt) > 50 then
    raise exception 'A mensagem de encontro pode ter no máximo 50 caracteres.';
  end if;
  if not exists (select 1 from public.encontro_perfis where id = v_eu) then raise exception 'Crie seu perfil de encontros antes.'; end if;
  if not exists (select 1 from public.encontro_perfis where id = p_para and ativo) then raise exception 'Perfil não encontrado.'; end if;

  select * into c from public.chat_conversas where membro_a = v_a and membro_b = v_b;
  if not found then
    insert into public.chat_conversas (membro_a, membro_b, origem, respondida, iniciada_por)
      values (v_a, v_b, 'encontro', false, v_eu)
      returning * into c;
  elsif not c.respondida and c.iniciada_por = v_eu then
    raise exception 'Espere a resposta antes de mandar outra mensagem.';
  end if;

  insert into public.chat_mensagens (autor_id, tipo, texto, conversa_id)
    values (v_eu, 'texto', v_txt, c.id);
  return c.id;
end $$;

-- a pilha de perfis: primeiro quem curtiu você, depois os demais (sem os que você já respondeu)
create or replace function public.proximos_encontros(p_limite int default 30)
returns table (
  id uuid, nome text, idade int, sobre text, gostos text, musica text, filme text,
  genero text, genero_outro text, orientacao text, orientacao_outra text,
  foto_url text, curtiu_voce boolean
)
language sql stable security definer set search_path = public as $$
  select e.id,
         split_part(p.nome, ' ', 1),
         p.idade, e.sobre, e.gostos, e.musica, e.filme,
         e.genero, e.genero_outro, e.orientacao, e.orientacao_outra, e.foto_url,
         exists (select 1 from public.encontro_reacoes r
                 where r.de_id = e.id and r.para_id = auth.uid() and r.tipo = 'coracao') as curtiu_voce
  from public.encontro_perfis e
  join public.perfis p on p.id = e.id
  where e.ativo
    and e.id <> auth.uid()
    and public.sou_aprovado()
    and public.tenho_apelido()
    and p.papel in ('membro', 'autor', 'editor', 'admin')
    and not exists (select 1 from public.encontro_reacoes r where r.de_id = auth.uid() and r.para_id = e.id)
    and not exists (select 1 from public.chat_conversas c
                    where c.origem = 'match' and c.membro_a = least(auth.uid(), e.id) and c.membro_b = greatest(auth.uid(), e.id))
    -- quem você já chamou com mensagem de encontro não volta na pilha
    and not exists (select 1 from public.chat_conversas c
                    where c.origem = 'encontro' and c.iniciada_por = auth.uid()
                      and c.membro_a = least(auth.uid(), e.id) and c.membro_b = greatest(auth.uid(), e.id))
  order by 13 desc, random()
  limit p_limite
$$;

grant execute on function public.pedir_amizade(text) to authenticated;
grant execute on function public.aceitar_amizade(bigint) to authenticated;
grant execute on function public.recusar_amizade(bigint) to authenticated;
grant execute on function public.reagir_encontro(uuid, text) to authenticated;
grant execute on function public.mensagem_encontro(uuid, text) to authenticated;
grant execute on function public.proximos_encontros(int) to authenticated;

-- ---------- 6. fotos da comunidade (Storage) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comunidade', 'comunidade', true, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do update set public = true, file_size_limit = 5242880,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

drop policy if exists "aprovados enviam fotos da comunidade" on storage.objects;
create policy "aprovados enviam fotos da comunidade" on storage.objects
  for insert with check (bucket_id = 'comunidade' and public.sou_aprovado() and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "dono ou admin apaga foto da comunidade" on storage.objects;
create policy "dono ou admin apaga foto da comunidade" on storage.objects
  for delete using (bucket_id = 'comunidade' and ((storage.foldername(name))[1] = auth.uid()::text or public.eh_admin()));

-- ---------- 7. tempo real: feed e amizades ----------
do $$ begin alter publication supabase_realtime add table public.posts;
exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.amizades;
exception when duplicate_object then null; end $$;

-- ---------- 8. limpeza: só as MENSAGENS somem em 72 horas (amizades, matches e posts ficam) ----------
do $$ begin
  create extension if not exists pg_cron;
  perform cron.schedule('chat-apagar-72h', '0 * * * *', $cron$
    delete from public.chat_mensagens where criado_em < now() - interval '72 hours';
    delete from storage.objects where bucket_id = 'chat' and created_at < now() - interval '72 hours';
  $cron$);
exception when others then
  raise notice 'pg_cron não ativado: %', sqlerrm;
end $$;
