-- =====================================================================
--  Coletivo Lufã · lista de e-mails dos membros (USO INTERNO)
--  Rode no SQL Editor do Supabase (como dono do projeto).
--  O resultado tem dados pessoais: não publique nem cole em lugar aberto.
-- =====================================================================

-- MEMBROS ATIVOS (funcao sem a palavra "comum", papel aprovado)
select u.email, p.nome, p.funcao
from public.perfis p
join auth.users u on u.id = p.id
where p.papel in ('membro', 'autor', 'editor', 'admin')
  and p.funcao not ilike '%comum%'
order by p.nome;

-- Para os MEMBROS COMUNS, troque a última condição por: and p.funcao ilike '%comum%'
