-- =====================================================================
--  Coletivo Lufã · ordem dos membros na página inicial
--  Cole tudo no SQL Editor do Supabase e clique em Run.
--  Guarda a posição de cada membro (pela matrícula). Todos podem ler;
--  só admins mudam a ordem.
-- =====================================================================

create table if not exists public.ordem_membros (
  matricula text primary key,
  posicao   int  not null
);

alter table public.ordem_membros enable row level security;

drop policy if exists "todos leem a ordem" on public.ordem_membros;
create policy "todos leem a ordem" on public.ordem_membros for select using (true);

drop policy if exists "admin muda a ordem" on public.ordem_membros;
create policy "admin muda a ordem" on public.ordem_membros for all
  using (public.eh_admin()) with check (public.eh_admin());

grant select on public.ordem_membros to anon, authenticated;
grant insert, update, delete on public.ordem_membros to authenticated;
