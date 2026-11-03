-- =====================================================================
--  Coletivo Lufã · aprovação automática de novas contas
--  Cole tudo no SQL Editor do Supabase e clique em Run.
--  Quem cria conta já entra como MEMBRO COMUM, com matrícula e data de
--  aprovação. O admin pode depois mudar para MEMBRO ATIVO.
-- =====================================================================

create or replace function public.novo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfis (id, nome, arroba, papel, funcao, matricula, aprovado_em)
  values (new.id,
          coalesce(new.raw_user_meta_data ->> 'nome', ''),
          coalesce(new.raw_user_meta_data ->> 'arroba', ''),
          'membro',
          'Membro comum',
          '001' || lpad(nextval('public.ordem_matricula')::text, 3, '0'),
          now())
  on conflict (id) do nothing;
  return new;
end $$;

-- aprova também quem já tinha se cadastrado e estava aguardando
-- (menos a conta de teste do diagnóstico, que pode ser apagada)
update public.perfis p set
  papel = 'membro',
  funcao = 'Membro comum',
  matricula = coalesce(p.matricula, '001' || lpad(nextval('public.ordem_matricula')::text, 3, '0')),
  aprovado_em = coalesce(p.aprovado_em, now())
where p.papel = 'pendente'
  and p.id not in (select id from auth.users where email = 'teste.diagnostico.lufa@gmail.com');
