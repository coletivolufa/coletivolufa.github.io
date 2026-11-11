-- =====================================================================
--  Coletivo Lufã · CONHEÇA OUTROS CAMARADAS
--  Rode DEPOIS do 18-convites.sql. Cole tudo no SQL Editor e clique em Run.
--  Pode rodar de novo sem problema.
--
--  Lista os membros ativos que já completaram o cadastro da Área do Militante,
--  só com dados básicos do coletivo (nome, foto, função, matrícula, @, núcleos).
--  Nada de CPF, endereço, renda, religião, contato ou dados pessoais.
--  Só quem é membro ativo consegue ver.
-- =====================================================================

create or replace function public.camaradas_ativos()
returns table (id uuid, nome text, foto text, funcao text, matricula text,
               arroba text, rede text, membro_desde timestamptz, nucleos text[])
language sql stable security definer set search_path = public as $$
  select p.id, p.nome, p.foto, p.funcao, p.matricula, p.arroba, p.rede,
         coalesce(p.aprovado_em, p.criado_em), f.nucleos
  from public.perfis p
  join public.fichas f on f.id = p.id
  where (public.sou_militante() or public.eh_admin())
    and f.completo_em is not null
    and p.papel in ('membro', 'autor', 'editor', 'admin')
    and p.funcao not ilike '%comum%'
  order by f.completo_em desc
  limit 300
$$;
revoke execute on function public.camaradas_ativos() from public, anon;
grant execute on function public.camaradas_ativos() to authenticated;
