-- =====================================================================
--  Coletivo Lufã · artigos só para MEMBROS ATIVOS
--  Cole tudo no SQL Editor do Supabase e clique em Run.
--  Membro comum não publica, não edita e não apaga artigos,
--  mesmo que tenha a permissão de autor ou editor.
-- =====================================================================

create or replace function public.sou_ativo() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select funcao not ilike '%comum%' from public.perfis where id = auth.uid()), false)
$$;

drop policy if exists "autores publicam" on public.artigos;
create policy "autores publicam" on public.artigos
  for insert with check (public.sou_ativo() and public.meu_papel() in ('autor', 'editor', 'admin') and autor_id = auth.uid());

drop policy if exists "autor edita o seu, editor edita todos" on public.artigos;
create policy "autor edita o seu, editor edita todos" on public.artigos
  for update using (public.sou_ativo() and ((autor_id = auth.uid() and public.meu_papel() = 'autor') or public.meu_papel() in ('editor', 'admin')));

drop policy if exists "autor apaga o seu, editor apaga todos" on public.artigos;
create policy "autor apaga o seu, editor apaga todos" on public.artigos
  for delete using (public.sou_ativo() and ((autor_id = auth.uid() and public.meu_papel() = 'autor') or public.meu_papel() in ('editor', 'admin')));
