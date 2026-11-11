-- =====================================================================
--  Coletivo Lufã · INSCRIÇÕES "Quero me tornar um militante"
--  Rode DEPOIS do 19-conheca-camaradas.sql. Cole tudo no SQL Editor e clique em Run.
--  Pode rodar de novo sem problema.
--
--  Qualquer pessoa (com ou sem conta) pode enviar a inscrição pela página do
--  Regimento Interno. Só a administração consegue ver, aceitar ou recusar.
-- =====================================================================

create table if not exists public.inscricoes (
  id            bigint generated always as identity primary key,
  nome          text not null check (char_length(nome) between 3 and 120),
  nascimento    date not null,
  email         text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 160),
  celular       text not null check (celular ~ '^[0-9]{10,11}$'),
  cpf           text not null check (cpf ~ '^[0-9]{11}$'),
  partido       text not null check (char_length(partido) between 1 and 60),
  movimento     text not null check (char_length(movimento) between 1 and 200),
  cep           text not null check (cep ~ '^[0-9]{8}$'),
  cidade        text not null default '' check (char_length(cidade) <= 80),
  uf            text not null default '' check (uf ~ '^([A-Z]{2})?$'),
  situacao      text not null default 'pendente' check (situacao in ('pendente', 'aceita', 'recusada')),
  decidido_por  uuid references public.perfis (id) on delete set null,
  decidido_em   timestamptz,
  criado_em     timestamptz not null default now()
);
-- o mesmo CPF não pode ter duas inscrições esperando resposta
create unique index if not exists inscricoes_cpf_pendente on public.inscricoes (cpf) where situacao = 'pendente';

alter table public.inscricoes enable row level security;

drop policy if exists "inscricoes: qualquer pessoa se inscreve" on public.inscricoes;
create policy "inscricoes: qualquer pessoa se inscreve" on public.inscricoes
  for insert to anon, authenticated
  with check (situacao = 'pendente' and decidido_por is null and decidido_em is null);

drop policy if exists "inscricoes: admin ve" on public.inscricoes;
create policy "inscricoes: admin ve" on public.inscricoes
  for select using (public.eh_admin());

drop policy if exists "inscricoes: admin decide" on public.inscricoes;
create policy "inscricoes: admin decide" on public.inscricoes
  for update using (public.eh_admin()) with check (public.eh_admin());

drop policy if exists "inscricoes: admin apaga" on public.inscricoes;
create policy "inscricoes: admin apaga" on public.inscricoes
  for delete using (public.eh_admin());

grant insert on public.inscricoes to anon, authenticated;
grant select, update, delete on public.inscricoes to authenticated;
