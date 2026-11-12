-- 25 · Jornal da Classe Trabalhadora: notícias
-- As notícias do jornal ficam numa tabela própria (os artigos continuam em "artigos").
-- Qualquer pessoa lê as notícias publicadas; só a administração e os editores publicam,
-- editam e apagam. A foto vai para o bucket "fotos", na pasta do próprio usuário.
create table if not exists public.noticias (
  id           bigint generated always as identity primary key,
  titulo       text not null check (char_length(titulo) between 3 and 200),
  secao        text not null default 'Brasil' check (char_length(secao) <= 40),
  linha_fina   text not null default '' check (char_length(linha_fina) <= 400),
  texto        text not null default '' check (char_length(texto) <= 20000),
  foto         text not null default '' check (foto = '' or foto ~ '^https://'),
  foto_credito text not null default '' check (char_length(foto_credito) <= 200),
  fonte_nome   text not null default '' check (char_length(fonte_nome) <= 200),
  fonte_link   text not null default '' check (fonte_link = '' or fonte_link ~ '^https?://'),
  publicado    boolean not null default true,
  autor_id     uuid default auth.uid() references auth.users (id) on delete set null,
  criado_em    timestamptz not null default now()
);
-- se a tabela já tinha sido criada antes da linha fina:
alter table public.noticias add column if not exists linha_fina text not null default '' check (char_length(linha_fina) <= 400);
create index if not exists noticias_data on public.noticias (criado_em desc);

alter table public.noticias enable row level security;

drop policy if exists "noticias: todos leem as publicadas" on public.noticias;
create policy "noticias: todos leem as publicadas" on public.noticias
  for select using (publicado or public.meu_papel() in ('editor', 'admin'));

drop policy if exists "noticias: editor publica" on public.noticias;
create policy "noticias: editor publica" on public.noticias
  for insert with check (public.meu_papel() in ('editor', 'admin') and autor_id = auth.uid());

drop policy if exists "noticias: editor altera" on public.noticias;
create policy "noticias: editor altera" on public.noticias
  for update using (public.meu_papel() in ('editor', 'admin'))
  with check (public.meu_papel() in ('editor', 'admin'));

drop policy if exists "noticias: editor apaga" on public.noticias;
create policy "noticias: editor apaga" on public.noticias
  for delete using (public.meu_papel() in ('editor', 'admin'));

grant select on public.noticias to anon, authenticated;
grant insert, update, delete on public.noticias to authenticated;
