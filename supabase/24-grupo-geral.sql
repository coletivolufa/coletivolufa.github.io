-- 24 · Grupo geral dos militantes
-- O link do grupo geral no WhatsApp fica na mesma tabela dos núcleos
-- (só militantes leem; só a administração troca). Aparece na Área do Militante.
alter table public.nucleos_grupos drop constraint if exists nucleos_grupos_slug_check;
alter table public.nucleos_grupos add constraint nucleos_grupos_slug_check
  check (slug in ('marxista', 'racial', 'povos', 'feminista', 'cultural', 'lgbtqia', 'estudantil', 'geral'));
insert into public.nucleos_grupos (slug, link)
  values ('geral', 'https://chat.whatsapp.com/Hl24AEgOjof5rPrKtFgVYq')
on conflict (slug) do update set link = excluded.link;
