-- =====================================================================
--  Coletivo Lufã · PERFIL: cidade, estado, sexo, gênero e orientação
--  Rode DEPOIS do 13-interacoes.sql. Cole tudo no SQL Editor e clique em Run.
--  Pode rodar de novo sem problema.
--  Estes dados são opcionais e só aparecem para membros aprovados.
-- =====================================================================

alter table public.perfis add column if not exists cidade text not null default ''
  check (char_length(cidade) <= 80);
alter table public.perfis add column if not exists uf text not null default ''
  check (uf ~ '^([A-Z]{2})?$');
alter table public.perfis add column if not exists sexo text not null default ''
  check (char_length(sexo) <= 60);
alter table public.perfis add column if not exists genero text not null default ''
  check (char_length(genero) <= 60);
alter table public.perfis add column if not exists orientacao text not null default ''
  check (char_length(orientacao) <= 60);

-- perfil completo de um membro, só para quem é aprovado (não entra na lista pública)
create or replace function public.perfil_detalhado(p_id uuid)
returns table (
  id uuid, nome text, apelido text, foto text, funcao text,
  cidade text, uf text, sexo text, genero text, orientacao text
)
language sql stable security definer set search_path = public as $$
  select p.id, p.nome, p.apelido, p.foto, p.funcao,
         p.cidade, p.uf, p.sexo, p.genero, p.orientacao
  from public.perfis p
  where p.id = p_id
    and public.sou_aprovado()
    and p.papel in ('membro', 'autor', 'editor', 'admin')
$$;

grant execute on function public.perfil_detalhado(uuid) to authenticated;
