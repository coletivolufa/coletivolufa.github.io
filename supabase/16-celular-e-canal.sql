-- =====================================================================
--  Coletivo Lufã · CELULAR OBRIGATÓRIO e AVISO DO CANAL DO WHATSAPP
--  Rode DEPOIS dos outros arquivos. Cole tudo no SQL Editor e clique em Run.
--  Pode rodar de novo sem problema.
--  O celular só é visto pela própria pessoa e pela administração
--  (a tabela perfis já tem essa regra); ele não aparece no site.
-- =====================================================================

-- 1. coluna do celular (só números, com DDD; vazio = ainda não informou)
alter table public.perfis add column if not exists celular text not null default ''
  check (celular ~ '^([0-9]{10,13})?$');

-- 2. data em que o e-mail "atualize seu cadastro" foi enviado (para não repetir)
alter table public.perfis add column if not exists aviso_celular_em timestamptz;

-- 3. cadastro novo: copia o celular informado no formulário para o perfil
create or replace function public.novo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
declare cel text := regexp_replace(coalesce(new.raw_user_meta_data ->> 'celular', ''), '[^0-9]', '', 'g');
begin
  if cel !~ '^[0-9]{10,13}$' then cel := ''; end if;
  insert into public.perfis (id, nome, arroba, celular, papel, funcao, matricula, aprovado_em)
  values (new.id,
          coalesce(new.raw_user_meta_data ->> 'nome', ''),
          coalesce(new.raw_user_meta_data ->> 'arroba', ''),
          cel,
          'membro',
          'Membro comum',
          '001' || lpad(nextval('public.ordem_matricula')::text, 3, '0'),
          now())
  on conflict (id) do nothing;
  return new;
end $$;

-- 4. lista para o e-mail "atualize seu cadastro" (só o robô de e-mail usa)
create or replace function public.membros_sem_celular()
returns table (id uuid, email text, nome text)
language sql stable security definer set search_path = public as $$
  select p.id, u.email::text, p.nome
  from public.perfis p
  join auth.users u on u.id = p.id
  where p.celular = ''
    and p.aviso_celular_em is null
    and p.papel in ('membro', 'autor', 'editor', 'admin')
    and u.email is not null
  order by p.criado_em
  limit 500
$$;

create or replace function public.marcar_aviso_celular(p_ids uuid[]) returns void
language sql security definer set search_path = public as $$
  update public.perfis set aviso_celular_em = now() where id = any(p_ids)
$$;

revoke execute on function public.membros_sem_celular() from public, anon, authenticated;
revoke execute on function public.marcar_aviso_celular(uuid[]) from public, anon, authenticated;
grant execute on function public.membros_sem_celular() to service_role;
grant execute on function public.marcar_aviso_celular(uuid[]) to service_role;
