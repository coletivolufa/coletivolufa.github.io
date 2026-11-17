-- 31 · Jornal: manchete fixada e "Leia também"
alter table public.noticias add column if not exists manchete boolean not null default false;
alter table public.noticias add column if not exists destaque boolean not null default false;
create index if not exists noticias_destaque on public.noticias (destaque) where destaque;
