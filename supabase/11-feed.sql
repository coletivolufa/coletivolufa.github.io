-- =====================================================================
--  Coletivo Lufã · FEED: curtidas, comentários e repostagens
--  Rode DEPOIS do 10-comunidade.sql. Cole tudo no SQL Editor e clique em Run.
--  Pode rodar de novo sem problema.
-- =====================================================================

-- ---------- curtidas (coração) ----------
create table if not exists public.post_curtidas (
  post_id    bigint not null references public.posts (id) on delete cascade,
  usuario_id uuid   not null references public.perfis (id) on delete cascade,
  criado_em  timestamptz not null default now(),
  primary key (post_id, usuario_id)
);
alter table public.post_curtidas enable row level security;

drop policy if exists "aprovados leem curtidas" on public.post_curtidas;
create policy "aprovados leem curtidas" on public.post_curtidas
  for select using (public.sou_aprovado());

drop policy if exists "aprovados curtem" on public.post_curtidas;
create policy "aprovados curtem" on public.post_curtidas
  for insert with check (usuario_id = auth.uid() and public.sou_aprovado());

drop policy if exists "cada um tira a propria curtida" on public.post_curtidas;
create policy "cada um tira a propria curtida" on public.post_curtidas
  for delete using (usuario_id = auth.uid());

-- ---------- repostagens (como o Twitter) ----------
create table if not exists public.post_reposts (
  post_id    bigint not null references public.posts (id) on delete cascade,
  usuario_id uuid   not null references public.perfis (id) on delete cascade,
  criado_em  timestamptz not null default now(),
  primary key (post_id, usuario_id)
);
alter table public.post_reposts enable row level security;

drop policy if exists "aprovados leem reposts" on public.post_reposts;
create policy "aprovados leem reposts" on public.post_reposts
  for select using (public.sou_aprovado());

drop policy if exists "aprovados repostam" on public.post_reposts;
create policy "aprovados repostam" on public.post_reposts
  for insert with check (usuario_id = auth.uid() and public.sou_aprovado());

drop policy if exists "cada um desfaz o proprio repost" on public.post_reposts;
create policy "cada um desfaz o proprio repost" on public.post_reposts
  for delete using (usuario_id = auth.uid());

-- ---------- comentários ----------
create table if not exists public.post_comentarios (
  id        bigint generated always as identity primary key,
  post_id   bigint not null references public.posts (id) on delete cascade,
  autor_id  uuid   not null references public.perfis (id) on delete cascade,
  texto     text   not null check (char_length(trim(texto)) between 1 and 280),
  criado_em timestamptz not null default now()
);
create index if not exists post_comentarios_post_idx on public.post_comentarios (post_id, criado_em);
alter table public.post_comentarios enable row level security;

drop policy if exists "aprovados leem comentarios" on public.post_comentarios;
create policy "aprovados leem comentarios" on public.post_comentarios
  for select using (public.sou_aprovado());

drop policy if exists "aprovados comentam" on public.post_comentarios;
create policy "aprovados comentam" on public.post_comentarios
  for insert with check (autor_id = auth.uid() and public.sou_aprovado() and public.tenho_apelido());

drop policy if exists "dono ou admin apaga comentario" on public.post_comentarios;
create policy "dono ou admin apaga comentario" on public.post_comentarios
  for delete using (autor_id = auth.uid() or public.eh_admin());

grant select, insert, delete on public.post_curtidas to authenticated;
grant select, insert, delete on public.post_reposts to authenticated;
grant select, insert, delete on public.post_comentarios to authenticated;
grant usage on sequence public.post_comentarios_id_seq to authenticated;

-- ---------- feed com contagens e o que eu já fiz em cada post ----------
create or replace function public.feed_posts(p_limite int default 60)
returns table (
  id bigint, autor_id uuid, texto text, imagem_url text, criado_em timestamptz,
  curtidas int, comentarios int, reposts int, eu_curti boolean, eu_repostei boolean
)
language sql stable security definer set search_path = public as $$
  select p.id, p.autor_id, p.texto, p.imagem_url, p.criado_em,
    (select count(*)::int from public.post_curtidas c where c.post_id = p.id),
    (select count(*)::int from public.post_comentarios m where m.post_id = p.id),
    (select count(*)::int from public.post_reposts r where r.post_id = p.id),
    exists (select 1 from public.post_curtidas c where c.post_id = p.id and c.usuario_id = auth.uid()),
    exists (select 1 from public.post_reposts r where r.post_id = p.id and r.usuario_id = auth.uid())
  from public.posts p
  where public.sou_aprovado()
  order by p.criado_em desc
  limit p_limite
$$;

grant execute on function public.feed_posts(int) to authenticated;

-- ---------- tempo real: curtidas, comentários e reposts ----------
do $$ begin alter publication supabase_realtime add table public.post_curtidas;
exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.post_comentarios;
exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.post_reposts;
exception when duplicate_object then null; end $$;
