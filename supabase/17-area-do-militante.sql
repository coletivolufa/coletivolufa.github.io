-- =====================================================================
--  Coletivo Lufã · ÁREA DO MILITANTE (ficha completa + central de avisos)
--  Rode DEPOIS do 16-celular-e-canal.sql. Cole tudo no SQL Editor e clique em Run.
--  Pode rodar de novo sem problema.
--
--  A FICHA tem dados pessoais e sensíveis (CPF, endereço, religião, renda,
--  orientação sexual). Ela fica numa tabela própria, que só a própria pessoa
--  e a administração conseguem ler. Não entra em nenhuma lista nem página pública.
-- =====================================================================

-- ---------- 1. quem é membro ativo (aprovado e sem "comum" na função) ----------
create or replace function public.sou_militante() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select papel in ('membro', 'autor', 'editor', 'admin') and funcao not ilike '%comum%'
                   from public.perfis where id = auth.uid()), false)
$$;
grant execute on function public.sou_militante() to authenticated;

-- ---------- 2. ficha do militante ----------
create table if not exists public.fichas (
  id                 uuid primary key references public.perfis (id) on delete cascade,
  nascimento         date,
  sexo               text not null default '' check (char_length(sexo) <= 60),
  genero             text not null default '' check (char_length(genero) <= 60),
  orientacao         text not null default '' check (char_length(orientacao) <= 60),
  cep                text not null default '' check (cep ~ '^([0-9]{8})?$'),
  rua                text not null default '' check (char_length(rua) <= 120),
  numero             text not null default '' check (char_length(numero) <= 20),
  complemento        text not null default '' check (char_length(complemento) <= 80),
  bairro             text not null default '' check (char_length(bairro) <= 80),
  cidade             text not null default '' check (char_length(cidade) <= 80),
  uf                 text not null default '' check (uf ~ '^([A-Z]{2})?$'),
  nasc_cidade        text not null default '' check (char_length(nasc_cidade) <= 80),
  nasc_uf            text not null default '' check (nasc_uf ~ '^([A-Z]{2})?$'),
  cpf                text not null default '' check (cpf ~ '^([0-9]{11})?$'),
  nome_mae           text not null default '' check (char_length(nome_mae) <= 120),
  religiao           text not null default '' check (char_length(religiao) <= 60),
  ocupacao           text not null default '' check (char_length(ocupacao) <= 80),
  renda              text not null default '' check (char_length(renda) <= 60),
  consentimento_em   timestamptz,
  completo_em        timestamptz,
  atualizado_em      timestamptz not null default now()
);
create unique index if not exists fichas_cpf_unico on public.fichas (cpf) where cpf <> '';

alter table public.fichas enable row level security;

drop policy if exists "ficha: a propria pessoa ou admin le" on public.fichas;
create policy "ficha: a propria pessoa ou admin le" on public.fichas
  for select using (id = auth.uid() or public.eh_admin());

drop policy if exists "ficha: militante cria a propria" on public.fichas;
create policy "ficha: militante cria a propria" on public.fichas
  for insert with check (id = auth.uid() and public.sou_militante());

drop policy if exists "ficha: a propria pessoa ou admin edita" on public.fichas;
create policy "ficha: a propria pessoa ou admin edita" on public.fichas
  for update using (id = auth.uid() or public.eh_admin()) with check (id = auth.uid() or public.eh_admin());

drop policy if exists "ficha: admin apaga" on public.fichas;
create policy "ficha: admin apaga" on public.fichas for delete using (public.eh_admin());

revoke all on public.fichas from anon;
grant select, insert, update, delete on public.fichas to authenticated;

create or replace function public.ficha_atualizada() returns trigger
language plpgsql as $$ begin new.atualizado_em := now(); return new; end $$;
drop trigger if exists ficha_atualizada on public.fichas;
create trigger ficha_atualizada before update on public.fichas
  for each row execute function public.ficha_atualizada();

-- ---------- 3. central de avisos (só membros ativos leem; só admin publica) ----------
create table if not exists public.avisos_militantes (
  id         bigint generated always as identity primary key,
  titulo     text not null check (char_length(titulo) between 1 and 120),
  texto      text not null default '' check (char_length(texto) <= 4000),
  fixado     boolean not null default false,
  autor_id   uuid references public.perfis (id) on delete set null,
  criado_em  timestamptz not null default now()
);
alter table public.avisos_militantes enable row level security;

drop policy if exists "avisos: militantes leem" on public.avisos_militantes;
create policy "avisos: militantes leem" on public.avisos_militantes
  for select using (public.sou_militante() or public.eh_admin());

drop policy if exists "avisos: admin publica" on public.avisos_militantes;
create policy "avisos: admin publica" on public.avisos_militantes
  for insert with check (public.eh_admin() and autor_id = auth.uid());

drop policy if exists "avisos: admin edita" on public.avisos_militantes;
create policy "avisos: admin edita" on public.avisos_militantes
  for update using (public.eh_admin());

drop policy if exists "avisos: admin apaga" on public.avisos_militantes;
create policy "avisos: admin apaga" on public.avisos_militantes
  for delete using (public.eh_admin());

revoke all on public.avisos_militantes from anon;
grant select, insert, update, delete on public.avisos_militantes to authenticated;

-- ---------- 4. fim da Comunidade ----------
-- A página da Comunidade saiu do site. Esta função mostrava sexo, gênero e
-- orientação de um membro a outros membros; agora ninguém além da própria
-- pessoa e da administração vê esses dados.
do $$ begin
  revoke execute on function public.perfil_detalhado(uuid) from authenticated, anon, public;
exception when undefined_function then null; end $$;
