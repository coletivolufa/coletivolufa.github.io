-- 26 · Excluir a membra Naiara (pedido da administração em 13/11/2026)
-- PASSO 1: confira quem será excluída (rode só este SELECT e veja o resultado).
select p.id, p.nome, p.matricula, p.papel, u.email, p.criado_em
from public.perfis p join auth.users u on u.id = p.id
where p.nome ilike '%naiara%';

-- PASSO 2: exclui a conta. Só apaga se houver exatamente UMA pessoa com "Naiara" no nome;
-- se houver mais de uma (ou nenhuma), não apaga nada e avisa.
-- Apagar a conta (auth.users) apaga também o perfil, a ficha, os convites e o resto dela;
-- os artigos que ela escreveu, se houver, ficam sem autor.
do $$
declare alvo uuid; quantos int;
begin
  select count(*) into quantos from public.perfis where nome ilike '%naiara%';
  if quantos <> 1 then
    raise exception 'Encontrei % pessoa(s) com "Naiara" no nome. Nada foi apagado: confira no passo 1.', quantos;
  end if;
  select id into alvo from public.perfis where nome ilike '%naiara%';
  delete from auth.users where id = alvo;
  raise notice 'Conta excluída.';
end $$;
