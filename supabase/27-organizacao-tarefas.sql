-- 27 · Organização: quadro de tarefas por núcleo (A fazer → Fazendo → Pronto)
-- Só militantes (membros ativos) usam. Cada pessoa vê só os núcleos dela; a administração vê todos.
-- A administração cria, edita e apaga tarefas. O militante assume uma tarefa ("Quero fazer"),
-- conclui ("Concluído") ou devolve. A administração dá o OK numa tarefa pronta: +10 de XP para quem fez.

create table if not exists public.tarefas (
  id               bigint generated always as identity primary key,
  nucleo           text not null check (nucleo in ('marxista', 'racial', 'povos', 'feminista', 'cultural', 'lgbtqia', 'estudantil')),
  titulo           text not null check (char_length(titulo) between 2 and 120),
  descricao        text not null default '' check (char_length(descricao) <= 4000),
  status           text not null default 'afazer' check (status in ('afazer', 'fazendo', 'pronto')),
  aprovada         boolean not null default false,
  criado_por       uuid default auth.uid() references public.perfis (id) on delete set null,
  criado_por_nome  text not null default '',
  responsavel      uuid references public.perfis (id) on delete set null,
  responsavel_nome text not null default '',
  criado_em        timestamptz not null default now(),
  assumida_em      timestamptz,
  concluida_em     timestamptz,
  aprovada_em      timestamptz
);
create index if not exists tarefas_nucleo on public.tarefas (nucleo, status);

-- núcleos da pessoa logada: os da ficha + Marxista (todos) + Estudantil (quem entrou com até 17 anos)
create or replace function public.meus_nucleos() returns text[]
language sql stable security definer set search_path = public as $$
  select array(select distinct n from (
    select unnest(coalesce(f.nucleos, '{}')) as n from public.fichas f where f.id = auth.uid()
    union all select 'marxista'
    union all select 'estudantil' from public.fichas f join public.perfis p on p.id = f.id
      where f.id = auth.uid() and f.nascimento is not null
        and extract(year from age(coalesce(p.aprovado_em, p.criado_em)::date, f.nascimento)) <= 17
  ) x)
$$;
grant execute on function public.meus_nucleos() to authenticated;

alter table public.tarefas enable row level security;

drop policy if exists "tarefas: militante ve as do seu nucleo" on public.tarefas;
create policy "tarefas: militante ve as do seu nucleo" on public.tarefas
  for select using (public.eh_admin() or (public.sou_militante() and nucleo = any (public.meus_nucleos())));

drop policy if exists "tarefas: admin cria" on public.tarefas;
create policy "tarefas: admin cria" on public.tarefas for insert with check (public.eh_admin());

drop policy if exists "tarefas: admin altera" on public.tarefas;
create policy "tarefas: admin altera" on public.tarefas for update using (public.eh_admin()) with check (public.eh_admin());

drop policy if exists "tarefas: admin apaga" on public.tarefas;
create policy "tarefas: admin apaga" on public.tarefas for delete using (public.eh_admin());

revoke all on public.tarefas from anon;
grant select, insert, update, delete on public.tarefas to authenticated;

-- militante assume uma tarefa que está "A fazer" no seu núcleo
create or replace function public.assumir_tarefa(tarefa bigint) returns void
language plpgsql security definer set search_path = public as $$
declare t public.tarefas;
begin
  select * into t from public.tarefas where id = tarefa for update;
  if t.id is null then raise exception 'Tarefa não encontrada.'; end if;
  if not (public.eh_admin() or (public.sou_militante() and t.nucleo = any (public.meus_nucleos()))) then
    raise exception 'Você não participa deste núcleo.';
  end if;
  if t.status <> 'afazer' then raise exception 'Outra pessoa já pegou esta tarefa.'; end if;
  update public.tarefas set status = 'fazendo', responsavel = auth.uid(),
    responsavel_nome = coalesce((select nome from public.perfis where id = auth.uid()), ''), assumida_em = now()
  where id = tarefa;
end $$;

-- quem está fazendo marca como concluída (vai para "Pronto")
create or replace function public.concluir_tarefa(tarefa bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.tarefas set status = 'pronto', concluida_em = now()
  where id = tarefa and status = 'fazendo' and (responsavel = auth.uid() or public.eh_admin());
  if not found then raise exception 'Só quem está fazendo a tarefa pode concluí-la.'; end if;
end $$;

-- quem está fazendo desiste e devolve para "A fazer"
create or replace function public.devolver_tarefa(tarefa bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.tarefas set status = 'afazer', responsavel = null, responsavel_nome = '', assumida_em = null, concluida_em = null, aprovada = false
  where id = tarefa and status in ('fazendo', 'pronto') and not aprovada and (responsavel = auth.uid() or public.eh_admin());
  if not found then raise exception 'Não foi possível devolver esta tarefa.'; end if;
end $$;

-- a administração dá o OK numa tarefa pronta (vale +10 de XP para quem fez)
create or replace function public.aprovar_tarefa(tarefa bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.eh_admin() then raise exception 'Só a administração aprova tarefas.'; end if;
  update public.tarefas set aprovada = true, aprovada_em = now() where id = tarefa and status = 'pronto';
  if not found then raise exception 'A tarefa precisa estar em "Pronto".'; end if;
end $$;

revoke execute on function public.assumir_tarefa(bigint), public.concluir_tarefa(bigint), public.devolver_tarefa(bigint), public.aprovar_tarefa(bigint) from public, anon;
grant execute on function public.assumir_tarefa(bigint), public.concluir_tarefa(bigint), public.devolver_tarefa(bigint), public.aprovar_tarefa(bigint) to authenticated;

-- XP: 1 por convite enviado, 5 por cadastro com o seu código e 10 por tarefa aprovada
create or replace function public.ranking_convites()
returns table (id uuid, nome text, foto text, matricula text, enviados bigint, cadastrados bigint, xp bigint)
language sql stable security definer set search_path = public as $$
  select p.id, p.nome, p.foto, p.matricula, e.n, c.n, e.n + 5 * c.n + 10 * t.n
  from public.perfis p
  cross join lateral (select count(*) as n from public.convites v where v.de_id = p.id) e
  cross join lateral (select count(*) as n from public.perfis q where q.convidado_por = p.matricula and q.id <> p.id) c
  cross join lateral (select count(*) as n from public.tarefas k where k.responsavel = p.id and k.aprovada) t
  where (public.sou_militante() or public.eh_admin())
    and p.papel in ('membro', 'autor', 'editor', 'admin')
    and p.funcao not ilike '%comum%'
    and e.n + c.n + t.n > 0
  order by 7 desc, p.nome
  limit 50
$$;
revoke execute on function public.ranking_convites() from public, anon;
grant execute on function public.ranking_convites() to authenticated;
