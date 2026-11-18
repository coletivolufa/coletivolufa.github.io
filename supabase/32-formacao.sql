-- 32: progresso da "Formação para novos militantes" (Área do Militante).
-- Cada linha = um vídeo que o militante marcou como assistido. Cada pessoa só vê e grava o próprio progresso;
-- a administração vê o de todos (para saber quem já completou a formação).
create table if not exists public.formacao_progresso (
  membro       uuid not null default auth.uid() references public.perfis (id) on delete cascade,
  video        text not null check (char_length(video) between 1 and 60),
  assistido_em timestamptz not null default now(),
  primary key (membro, video)
);
alter table public.formacao_progresso enable row level security;

drop policy if exists "formacao: ve o proprio progresso" on public.formacao_progresso;
create policy "formacao: ve o proprio progresso" on public.formacao_progresso
  for select using (membro = auth.uid() or public.eh_admin());

drop policy if exists "formacao: marca o proprio video" on public.formacao_progresso;
create policy "formacao: marca o proprio video" on public.formacao_progresso
  for insert with check (membro = auth.uid());

drop policy if exists "formacao: admin apaga" on public.formacao_progresso;
create policy "formacao: admin apaga" on public.formacao_progresso
  for delete using (public.eh_admin());

grant select, insert, delete on public.formacao_progresso to authenticated;
