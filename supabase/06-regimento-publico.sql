-- =====================================================================
--  Coletivo Lufã · Regimento Interno aberto a TODOS
--  Cole tudo no SQL Editor do Supabase e clique em Run.
--  Qualquer pessoa (com ou sem conta) passa a poder ler o regimento.
--  Continua valendo: ninguém altera o texto pelo site, só pelo SQL Editor.
-- =====================================================================

drop policy if exists "so membros ativos leem o regimento" on public.regimento;
drop policy if exists "todos leem o regimento" on public.regimento;
create policy "todos leem o regimento" on public.regimento
  for select using (true);

grant select on public.regimento to anon, authenticated;
