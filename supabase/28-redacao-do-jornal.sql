-- 28 · Redação do Jornal da Classe Trabalhadora
-- Equipe do jornal com funções próprias (só a administração coloca e tira pessoas).
-- Quem está na redação vê o quadro "Redação do Jornal" na Organização e publica notícias no jornal.

create table if not exists public.redacao (
  id      uuid primary key references public.perfis (id) on delete cascade,
  funcao  text not null check (funcao in ('Editor(a)-chefe', 'Repórter', 'Redator(a)', 'Revisor(a)', 'Fotógrafo(a)', 'Designer / Diagramador(a)', 'Social media')),
  desde   timestamptz not null default now()
);

-- a pessoa logada é da redação (e militante)?
create or replace function public.sou_redacao() returns boolean
language sql stable security definer set search_path = public as $$
  select public.sou_militante() and exists (select 1 from public.redacao where id = auth.uid())
$$;
grant execute on function public.sou_redacao() to authenticated;

alter table public.redacao enable row level security;
drop policy if exists "redacao: equipe e admin veem" on public.redacao;
create policy "redacao: equipe e admin veem" on public.redacao for select using (public.eh_admin() or public.sou_redacao());
drop policy if exists "redacao: admin coloca" on public.redacao;
create policy "redacao: admin coloca" on public.redacao for insert with check (public.eh_admin());
drop policy if exists "redacao: admin altera" on public.redacao;
create policy "redacao: admin altera" on public.redacao for update using (public.eh_admin()) with check (public.eh_admin());
drop policy if exists "redacao: admin tira" on public.redacao;
create policy "redacao: admin tira" on public.redacao for delete using (public.eh_admin());
revoke all on public.redacao from anon;
grant select, insert, update, delete on public.redacao to authenticated;

-- equipe com nome e foto (para a equipe e a administração)
create or replace function public.equipe_redacao()
returns table (id uuid, nome text, foto text, matricula text, funcao text, desde timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.nome, p.foto, p.matricula, r.funcao, r.desde
  from public.redacao r join public.perfis p on p.id = r.id
  where public.eh_admin() or public.sou_redacao()
  order by array_position(array['Editor(a)-chefe', 'Repórter', 'Redator(a)', 'Revisor(a)', 'Fotógrafo(a)', 'Designer / Diagramador(a)', 'Social media'], r.funcao), p.nome
$$;
revoke execute on function public.equipe_redacao() from public, anon;
grant execute on function public.equipe_redacao() to authenticated;

-- o quadro da redação ("jornal") passa a existir na Organização
alter table public.tarefas drop constraint if exists tarefas_nucleo_check;
alter table public.tarefas add constraint tarefas_nucleo_check
  check (nucleo in ('marxista', 'racial', 'povos', 'feminista', 'cultural', 'lgbtqia', 'estudantil', 'jornal'));

-- núcleos da pessoa: os da ficha + Marxista + Estudantil (até 17 anos na entrada) + Redação (quem é da equipe)
create or replace function public.meus_nucleos() returns text[]
language sql stable security definer set search_path = public as $$
  select array(select distinct n from (
    select unnest(coalesce(f.nucleos, '{}')) as n from public.fichas f where f.id = auth.uid()
    union all select 'marxista'
    union all select 'estudantil' from public.fichas f join public.perfis p on p.id = f.id
      where f.id = auth.uid() and f.nascimento is not null
        and extract(year from age(coalesce(p.aprovado_em, p.criado_em)::date, f.nascimento)) <= 17
    union all select 'jornal' where public.sou_redacao()
  ) x)
$$;

-- notícias do jornal: a redação também publica, edita e apaga
drop policy if exists "noticias: todos leem as publicadas" on public.noticias;
create policy "noticias: todos leem as publicadas" on public.noticias
  for select using (publicado or public.meu_papel() in ('editor', 'admin') or public.sou_redacao());
drop policy if exists "noticias: editor publica" on public.noticias;
create policy "noticias: editor publica" on public.noticias
  for insert with check ((public.meu_papel() in ('editor', 'admin') or public.sou_redacao()) and autor_id = auth.uid());
drop policy if exists "noticias: editor altera" on public.noticias;
create policy "noticias: editor altera" on public.noticias
  for update using (public.meu_papel() in ('editor', 'admin') or public.sou_redacao())
  with check (public.meu_papel() in ('editor', 'admin') or public.sou_redacao());
drop policy if exists "noticias: editor apaga" on public.noticias;
create policy "noticias: editor apaga" on public.noticias
  for delete using (public.meu_papel() in ('editor', 'admin') or public.sou_redacao());
