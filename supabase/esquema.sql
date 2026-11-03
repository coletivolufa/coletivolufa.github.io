-- =====================================================================
--  Coletivo Lufã · banco de dados do site (Supabase)
--  Como usar: no painel do Supabase, abra "SQL Editor", cole TUDO isto
--  e clique em "Run". Pode rodar de novo sem problema.
-- =====================================================================

-- ---------- PERFIS (uma linha por pessoa cadastrada) ----------
create table if not exists public.perfis (
  id          uuid primary key references auth.users (id) on delete cascade,
  nome        text not null default '',
  arroba      text not null default '',
  rede        text not null default 'instagram',
  foto        text not null default '',
  idade       int  check (idade is null or idade between 10 and 120),
  funcao      text not null default 'Membro',
  papel       text not null default 'pendente'
              check (papel in ('pendente', 'membro', 'autor', 'editor', 'admin', 'recusado')),
  matricula   text unique,
  criado_em   timestamptz not null default now(),
  aprovado_em timestamptz
);

-- matrícula: "001" + ordem de entrada. Os 9 membros que já estavam no site
-- vão de 001001 a 001009; quem for aprovado daqui em diante continua do 010.
create sequence if not exists public.ordem_matricula start 10;

-- ---------- ARTIGOS ----------
create table if not exists public.artigos (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  titulo     text not null check (char_length(titulo) between 3 and 160),
  autor_nome text not null,
  autor_id   uuid references public.perfis (id) on delete set null,
  texto      text not null,
  publicado  boolean not null default true,
  criado_em  timestamptz not null default now(),
  editado_em timestamptz
);

-- ---------- funções de apoio ----------
create or replace function public.meu_papel() returns text
language sql stable security definer set search_path = public as $$
  select papel from public.perfis where id = auth.uid()
$$;

create or replace function public.eh_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.meu_papel() = 'admin', false)
$$;

-- cria o perfil "pendente" assim que alguém se cadastra
create or replace function public.novo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfis (id, nome, arroba)
  values (new.id,
          coalesce(new.raw_user_meta_data ->> 'nome', ''),
          coalesce(new.raw_user_meta_data ->> 'arroba', ''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists ao_cadastrar on auth.users;
create trigger ao_cadastrar after insert on auth.users
  for each row execute function public.novo_usuario();

-- impede que alguém mude o próprio papel ou matrícula (só admin pode)
create or replace function public.proteger_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() vazio = comando rodado pelo próprio painel do Supabase (dono do projeto)
  if auth.uid() is not null and not public.eh_admin() then
    new.papel := old.papel;
    new.matricula := old.matricula;
    new.aprovado_em := old.aprovado_em;
    new.funcao := old.funcao;
  end if;
  return new;
end $$;

drop trigger if exists proteger on public.perfis;
create trigger proteger before update on public.perfis
  for each row execute function public.proteger_perfil();

-- admin define o papel de alguém; ao aprovar pela primeira vez, gera a matrícula
create or replace function public.definir_papel(pessoa uuid, novo_papel text) returns public.perfis
language plpgsql security definer set search_path = public as $$
declare p public.perfis;
begin
  if not public.eh_admin() then raise exception 'Apenas admins podem mudar permissões.'; end if;
  if novo_papel not in ('pendente', 'membro', 'autor', 'editor', 'admin', 'recusado') then
    raise exception 'Papel inválido: %', novo_papel;
  end if;
  update public.perfis set
    papel = novo_papel,
    matricula = case when matricula is null and novo_papel in ('membro', 'autor', 'editor', 'admin')
                     then '001' || lpad(nextval('public.ordem_matricula')::text, 3, '0') else matricula end,
    aprovado_em = case when aprovado_em is null and novo_papel in ('membro', 'autor', 'editor', 'admin')
                       then now() else aprovado_em end
  where id = pessoa
  returning * into p;
  return p;
end $$;

-- ---------- lista pública de membros (sem idade nem dados privados) ----------
create or replace view public.membros_publicos as
  select id, nome, arroba, rede, foto, funcao, matricula, aprovado_em
  from public.perfis
  where papel in ('membro', 'autor', 'editor', 'admin');

-- ---------- segurança (Row Level Security) ----------
alter table public.perfis  enable row level security;
alter table public.artigos enable row level security;

drop policy if exists "ver o próprio perfil ou admin vê todos" on public.perfis;
create policy "ver o próprio perfil ou admin vê todos" on public.perfis
  for select using (id = auth.uid() or public.eh_admin());

drop policy if exists "editar o próprio perfil ou admin" on public.perfis;
create policy "editar o próprio perfil ou admin" on public.perfis
  for update using (id = auth.uid() or public.eh_admin());

drop policy if exists "admin apaga perfis" on public.perfis;
create policy "admin apaga perfis" on public.perfis
  for delete using (public.eh_admin());

drop policy if exists "todos leem artigos publicados" on public.artigos;
create policy "todos leem artigos publicados" on public.artigos
  for select using (publicado or autor_id = auth.uid() or public.meu_papel() in ('editor', 'admin'));

drop policy if exists "autores publicam" on public.artigos;
create policy "autores publicam" on public.artigos
  for insert with check (public.meu_papel() in ('autor', 'editor', 'admin') and autor_id = auth.uid());

drop policy if exists "autor edita o seu, editor edita todos" on public.artigos;
create policy "autor edita o seu, editor edita todos" on public.artigos
  for update using ((autor_id = auth.uid() and public.meu_papel() = 'autor') or public.meu_papel() in ('editor', 'admin'));

drop policy if exists "autor apaga o seu, editor apaga todos" on public.artigos;
create policy "autor apaga o seu, editor apaga todos" on public.artigos
  for delete using ((autor_id = auth.uid() and public.meu_papel() = 'autor') or public.meu_papel() in ('editor', 'admin'));

grant select on public.membros_publicos to anon, authenticated;
grant execute on function public.definir_papel(uuid, text) to authenticated;

-- ---------- fotos de perfil (Storage) ----------
insert into storage.buckets (id, name, public) values ('fotos', 'fotos', true)
  on conflict (id) do nothing;

drop policy if exists "fotos são públicas" on storage.objects;
create policy "fotos são públicas" on storage.objects
  for select using (bucket_id = 'fotos');

drop policy if exists "cada um envia a própria foto" on storage.objects;
create policy "cada um envia a própria foto" on storage.objects
  for insert to authenticated with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "cada um troca a própria foto" on storage.objects;
create policy "cada um troca a própria foto" on storage.objects
  for update to authenticated using (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);

-- =====================================================================
--  DEPOIS de criar a sua conta no site, rode SÓ a linha abaixo
--  (troque pelo e-mail que você usou) para virar o primeiro admin:
--
--  update public.perfis set papel = 'admin', matricula = '001001', aprovado_em = now()
--  where id = (select id from auth.users where email = 'SEU-EMAIL-AQUI');
-- =====================================================================
