-- =====================================================================
--  Coletivo Lufã · ARTIGOS PARA TODOS OS MILITANTES
--  Rode no SQL Editor e clique em Run. Pode rodar de novo sem problema.
--  Todo membro ativo (militante) publica artigos e edita/apaga os próprios.
--  Editor e admin continuam editando e apagando os de todos.
-- =====================================================================

drop policy if exists "autores publicam" on public.artigos;
create policy "autores publicam" on public.artigos
  for insert with check (
    autor_id = auth.uid()
    and (public.sou_militante() or public.meu_papel() in ('editor', 'admin'))
  );

drop policy if exists "autor edita o seu, editor edita todos" on public.artigos;
create policy "autor edita o seu, editor edita todos" on public.artigos
  for update using (
    (autor_id = auth.uid() and public.sou_militante())
    or public.meu_papel() in ('editor', 'admin')
  );

drop policy if exists "autor apaga o seu, editor apaga todos" on public.artigos;
create policy "autor apaga o seu, editor apaga todos" on public.artigos
  for delete using (
    (autor_id = auth.uid() and public.sou_militante())
    or public.meu_papel() in ('editor', 'admin')
  );
