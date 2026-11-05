-- =====================================================================
--  Coletivo Lufã · FEED: vídeos, hashtags e tendências
--  Rode DEPOIS do 11-feed.sql. Cole tudo no SQL Editor e clique em Run.
--  Pode rodar de novo sem problema.
-- =====================================================================

-- ---------- 1. vídeos e fotos nos posts ----------
alter table public.posts add column if not exists video_url text;
alter table public.posts drop constraint if exists posts_check;
alter table public.posts drop constraint if exists posts_conteudo_check;
alter table public.posts add constraint posts_conteudo_check
  check (char_length(texto) > 0 or imagem_url is not null or video_url is not null);

-- o bucket de fotos da comunidade passa a aceitar vídeos (até 50 MB)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comunidade', 'comunidade', true, 52428800,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do update set public = true, file_size_limit = 52428800,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime'];

-- ---------- 2. hashtags ----------
create table if not exists public.hashtags (
  id        bigint generated always as identity primary key,
  nome      text not null unique check (nome ~ '^[a-z0-9_]{2,30}$'),
  criado_em timestamptz not null default now()
);
create table if not exists public.post_hashtags (
  post_id    bigint not null references public.posts (id) on delete cascade,
  hashtag_id bigint not null references public.hashtags (id) on delete cascade,
  primary key (post_id, hashtag_id)
);
create index if not exists post_hashtags_hashtag_idx on public.post_hashtags (hashtag_id);
alter table public.hashtags enable row level security;
alter table public.post_hashtags enable row level security;

drop policy if exists "aprovados leem hashtags" on public.hashtags;
create policy "aprovados leem hashtags" on public.hashtags for select using (public.sou_aprovado());

drop policy if exists "aprovados leem hashtags dos posts" on public.post_hashtags;
create policy "aprovados leem hashtags dos posts" on public.post_hashtags for select using (public.sou_aprovado());

grant select on public.hashtags, public.post_hashtags to authenticated;

-- ---------- 3. publicar (texto, foto ou vídeo, e hashtags) ----------
create or replace function public.criar_post(p_texto text, p_imagem_url text, p_video_url text, p_tags text[])
returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v_id bigint;
  v_tag text;
  v_hid bigint;
begin
  if not public.sou_aprovado() or not public.tenho_apelido() then
    raise exception 'Crie seu @apelido antes de publicar.';
  end if;
  if char_length(coalesce(p_texto, '')) > 500 then raise exception 'O texto pode ter no máximo 500 caracteres.'; end if;
  if p_imagem_url is not null and p_video_url is not null then
    raise exception 'Escolha só uma foto ou só um vídeo.';
  end if;
  if coalesce(array_length(p_tags, 1), 0) > 10 then raise exception 'Use no máximo 10 hashtags por publicação.'; end if;

  insert into public.posts (autor_id, texto, imagem_url, video_url)
    values (auth.uid(), coalesce(p_texto, ''), p_imagem_url, p_video_url)
    returning id into v_id;

  foreach v_tag in array coalesce(p_tags, '{}') loop
    v_tag := lower(v_tag);
    if v_tag ~ '^[a-z0-9_]{2,30}$' then
      insert into public.hashtags (nome) values (v_tag) on conflict (nome) do nothing;
      select id into v_hid from public.hashtags where nome = v_tag;
      insert into public.post_hashtags (post_id, hashtag_id) values (v_id, v_hid) on conflict do nothing;
    end if;
  end loop;
  return v_id;
end $$;

-- ---------- 4. tendências: as hashtags com mais publicações (últimos 7 dias) ----------
create or replace function public.hashtags_em_alta(p_limite int default 5, p_dias int default 7)
returns table (nome text, publicacoes int)
language sql stable security definer set search_path = public as $$
  select h.nome, count(*)::int as publicacoes
  from public.post_hashtags ph
  join public.hashtags h on h.id = ph.hashtag_id
  join public.posts p on p.id = ph.post_id
  where public.sou_aprovado()
    and p.criado_em > now() - make_interval(days => p_dias)
  group by h.nome
  order by count(*) desc, h.nome
  limit p_limite
$$;

-- ---------- 5. feed: agora traz vídeo e pode filtrar por hashtag ----------
drop function if exists public.feed_posts(int);
create or replace function public.feed_posts(p_limite int default 60, p_hashtag text default null)
returns table (
  id bigint, autor_id uuid, texto text, imagem_url text, video_url text, criado_em timestamptz,
  curtidas int, comentarios int, reposts int, eu_curti boolean, eu_repostei boolean
)
language sql stable security definer set search_path = public as $$
  select p.id, p.autor_id, p.texto, p.imagem_url, p.video_url, p.criado_em,
    (select count(*)::int from public.post_curtidas c where c.post_id = p.id),
    (select count(*)::int from public.post_comentarios m where m.post_id = p.id),
    (select count(*)::int from public.post_reposts r where r.post_id = p.id),
    exists (select 1 from public.post_curtidas c where c.post_id = p.id and c.usuario_id = auth.uid()),
    exists (select 1 from public.post_reposts r where r.post_id = p.id and r.usuario_id = auth.uid())
  from public.posts p
  where public.sou_aprovado()
    and (p_hashtag is null or exists (
      select 1 from public.post_hashtags ph
      join public.hashtags h on h.id = ph.hashtag_id
      where ph.post_id = p.id and h.nome = lower(p_hashtag)))
  order by p.criado_em desc
  limit p_limite
$$;

grant execute on function public.criar_post(text, text, text, text[]) to authenticated;
grant execute on function public.hashtags_em_alta(int, int) to authenticated;
grant execute on function public.feed_posts(int, text) to authenticated;
