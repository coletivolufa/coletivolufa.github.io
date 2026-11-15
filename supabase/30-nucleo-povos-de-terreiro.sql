-- 30 · Núcleo dos Povos de Terreiro
-- Libera o núcleo novo (slug "terreiro") nos grupos de WhatsApp e no quadro de tarefas da Organização.
alter table public.nucleos_grupos drop constraint if exists nucleos_grupos_slug_check;
alter table public.nucleos_grupos add constraint nucleos_grupos_slug_check
  check (slug in ('marxista', 'racial', 'povos', 'terreiro', 'feminista', 'cultural', 'lgbtqia', 'estudantil', 'geral'));
insert into public.nucleos_grupos (slug) values ('terreiro') on conflict (slug) do nothing;

alter table public.tarefas drop constraint if exists tarefas_nucleo_check;
alter table public.tarefas add constraint tarefas_nucleo_check
  check (nucleo in ('marxista', 'racial', 'povos', 'terreiro', 'feminista', 'cultural', 'lgbtqia', 'estudantil', 'jornal'));
