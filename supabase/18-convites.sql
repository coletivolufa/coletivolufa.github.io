-- =====================================================================
--  Coletivo Lufã · CONVITES e XP
--  Rode DEPOIS do 17-area-do-militante.sql. Cole tudo no SQL Editor e clique em Run.
--  Pode rodar de novo sem problema.
-- =====================================================================

-- ---------- 1. convites enviados pelos militantes ----------
create table if not exists public.convites (
  id         bigint generated always as identity primary key,
  de_id      uuid not null references public.perfis (id) on delete cascade,
  nome       text not null check (char_length(nome) between 2 and 80),
  whatsapp   text not null check (whatsapp ~ '^[0-9]{10,13}$'),
  milita     boolean not null default false,
  criado_em  timestamptz not null default now()
);
-- a mesma pessoa não conta duas vezes para o mesmo militante
create unique index if not exists convites_sem_repetir on public.convites (de_id, whatsapp);

alter table public.convites enable row level security;

drop policy if exists "convites: militante envia o seu" on public.convites;
create policy "convites: militante envia o seu" on public.convites
  for insert with check (de_id = auth.uid() and public.sou_militante());

drop policy if exists "convites: ve os seus ou admin ve todos" on public.convites;
create policy "convites: ve os seus ou admin ve todos" on public.convites
  for select using (de_id = auth.uid() or public.eh_admin());

drop policy if exists "convites: admin apaga" on public.convites;
create policy "convites: admin apaga" on public.convites for delete using (public.eh_admin());

revoke all on public.convites from anon;
grant select, insert, delete on public.convites to authenticated;

-- ---------- 2. quem convidou cada pessoa nova (código de convite = matrícula) ----------
alter table public.perfis add column if not exists convidado_por text
  check (convidado_por is null or convidado_por ~ '^[0-9]{6}$');

-- cadastro novo: guarda o celular e o código de convite (se a matrícula existir)
create or replace function public.novo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  cel text := regexp_replace(coalesce(new.raw_user_meta_data ->> 'celular', ''), '[^0-9]', '', 'g');
  cod text := regexp_replace(coalesce(new.raw_user_meta_data ->> 'convite', ''), '[^0-9]', '', 'g');
begin
  if cel !~ '^[0-9]{10,13}$' then cel := ''; end if;
  if cod !~ '^[0-9]{6}$' or not exists (select 1 from public.perfis where matricula = cod) then cod := null; end if;
  insert into public.perfis (id, nome, arroba, celular, convidado_por, papel, funcao, matricula, aprovado_em)
  values (new.id,
          coalesce(new.raw_user_meta_data ->> 'nome', ''),
          coalesce(new.raw_user_meta_data ->> 'arroba', ''),
          cel, cod, 'membro', 'Membro comum',
          '001' || lpad(nextval('public.ordem_matricula')::text, 3, '0'),
          now())
  on conflict (id) do nothing;
  return new;
end $$;

-- ninguém muda o próprio "convidado por" depois (só a administração)
create or replace function public.proteger_convite() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.eh_admin() then
    new.convidado_por := old.convidado_por;
  end if;
  return new;
end $$;
drop trigger if exists proteger_convite on public.perfis;
create trigger proteger_convite before update on public.perfis
  for each row execute function public.proteger_convite();

-- ---------- 3. ranking de XP (só militantes veem) ----------
--  1 XP por convite enviado · 5 XP por convidado que se cadastrou com o código
create or replace function public.ranking_convites()
returns table (id uuid, nome text, foto text, matricula text, enviados bigint, cadastrados bigint, xp bigint)
language sql stable security definer set search_path = public as $$
  select p.id, p.nome, p.foto, p.matricula, e.n, c.n, e.n + 5 * c.n
  from public.perfis p
  cross join lateral (select count(*) as n from public.convites v where v.de_id = p.id) e
  cross join lateral (select count(*) as n from public.perfis q where q.convidado_por = p.matricula and q.id <> p.id) c
  where (public.sou_militante() or public.eh_admin())
    and p.papel in ('membro', 'autor', 'editor', 'admin')
    and p.funcao not ilike '%comum%'
    and e.n + c.n > 0
  order by 7 desc, p.nome
  limit 50
$$;
revoke execute on function public.ranking_convites() from public, anon;
grant execute on function public.ranking_convites() to authenticated;
