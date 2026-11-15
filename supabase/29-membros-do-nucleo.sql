-- 29 · Membros de cada núcleo (com WhatsApp), na Organização
-- Militantes ativos de um núcleo, com nome e foto. Só quem é do núcleo (ou a administração) vê.
-- O celular (botão Conversar) só vai para a administração.
-- Marxista: todos os militantes. Estudantil: quem marcou ou entrou com até 17 anos. Redação: a equipe do jornal.
create or replace function public.membros_do_nucleo(alvo text)
returns table (id uuid, nome text, foto text, celular text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.eh_admin() or (public.sou_militante() and alvo = any (public.meus_nucleos()))) then
    return;
  end if;
  return query
  select p.id, p.nome, p.foto, case when public.eh_admin() then p.celular else null end   -- celular só para a administração
  from public.perfis p
  left join public.fichas f on f.id = p.id
  where p.papel in ('membro', 'autor', 'editor', 'admin')
    and p.funcao not ilike '%comum%'
    and case alvo
      when 'marxista' then true
      when 'jornal' then exists (select 1 from public.redacao r where r.id = p.id)
      when 'estudantil' then 'estudantil' = any (coalesce(f.nucleos, '{}'))
        or (f.nascimento is not null and extract(year from age(coalesce(p.aprovado_em, p.criado_em)::date, f.nascimento)) <= 17)
      else alvo = any (coalesce(f.nucleos, '{}'))
    end
  order by p.nome;
end $$;
revoke execute on function public.membros_do_nucleo(text) from public, anon;
grant execute on function public.membros_do_nucleo(text) to authenticated;
