-- 23 · Núcleo Estudantil
-- Novo núcleo, obrigatório para quem entrou no coletivo com 13 a 17 anos
-- (o site marca sozinho na ficha). Já entra com o link do grupo do WhatsApp.
alter table public.nucleos_grupos drop constraint if exists nucleos_grupos_slug_check;
alter table public.nucleos_grupos add constraint nucleos_grupos_slug_check
  check (slug in ('marxista', 'racial', 'povos', 'feminista', 'cultural', 'lgbtqia', 'estudantil'));
insert into public.nucleos_grupos (slug, link)
  values ('estudantil', 'https://chat.whatsapp.com/ERnyFrVblzZJJvT1gvO6JZ')
on conflict (slug) do update set link = excluded.link;
