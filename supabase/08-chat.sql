-- =====================================================================
--  Coletivo Lufã · BATE-PAPO dos membros
--  Cole tudo no SQL Editor do Supabase e clique em Run.
--  Pode rodar de novo sem problema.
--  Quem lê e escreve: qualquer membro APROVADO (ativo ou comum).
--  Mensagens e imagens são apagadas 72 horas depois do envio.
-- =====================================================================

-- ---------- mensagens ----------
create table if not exists public.chat_mensagens (
  id          bigint generated always as identity primary key,
  autor_id    uuid not null references public.perfis (id) on delete cascade,
  tipo        text not null default 'texto' check (tipo in ('texto', 'imagem', 'audio')),
  texto       text not null default '' check (char_length(texto) <= 500),
  imagem_url  text,
  criado_em   timestamptz not null default now(),
  check ((tipo = 'texto' and char_length(texto) > 0) or (tipo in ('imagem', 'audio') and imagem_url is not null))
);

-- atualiza tabelas que já existiam (rodar de novo é seguro)
alter table public.chat_mensagens drop constraint if exists chat_mensagens_tipo_check;
alter table public.chat_mensagens add constraint chat_mensagens_tipo_check check (tipo in ('texto', 'imagem', 'audio'));
alter table public.chat_mensagens drop constraint if exists chat_mensagens_check;
alter table public.chat_mensagens add constraint chat_mensagens_check
  check ((tipo = 'texto' and char_length(texto) > 0) or (tipo in ('imagem', 'audio') and imagem_url is not null));

create index if not exists chat_criado_idx on public.chat_mensagens (criado_em);
alter table public.chat_mensagens enable row level security;

-- quem é aprovado (membro comum ou ativo, ou autor/editor/admin)
create or replace function public.sou_aprovado() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select papel in ('membro', 'autor', 'editor', 'admin') from public.perfis where id = auth.uid()), false)
$$;

drop policy if exists "aprovados leem o chat" on public.chat_mensagens;
create policy "aprovados leem o chat" on public.chat_mensagens
  for select using (public.sou_aprovado() and criado_em > now() - interval '72 hours');

drop policy if exists "aprovados escrevem no chat" on public.chat_mensagens;
create policy "aprovados escrevem no chat" on public.chat_mensagens
  for insert with check (
    public.sou_aprovado() and autor_id = auth.uid()
    and (tipo <> 'audio' or public.sou_ativo())   -- áudio: só membros ativos
  );

drop policy if exists "dono ou admin apaga no chat" on public.chat_mensagens;
create policy "dono ou admin apaga no chat" on public.chat_mensagens
  for delete using (autor_id = auth.uid() or public.eh_admin());

grant select, insert, delete on public.chat_mensagens to authenticated;
grant usage on sequence public.chat_mensagens_id_seq to authenticated;

-- ---------- tempo real (as mensagens aparecem sem recarregar) ----------
do $$ begin
  alter publication supabase_realtime add table public.chat_mensagens;
exception when duplicate_object then null;
end $$;

-- ---------- imagens e GIFs (Storage) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat', 'chat', true, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav'])
on conflict (id) do update set public = true, file_size_limit = 5242880,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav'];

drop policy if exists "aprovados enviam imagens no chat" on storage.objects;
create policy "aprovados enviam imagens no chat" on storage.objects
  for insert with check (
    bucket_id = 'chat' and public.sou_aprovado() and (storage.foldername(name))[1] = auth.uid()::text
    and (name ~* '\.(png|jpe?g|webp|gif)$' or public.sou_ativo())   -- áudio: só membros ativos
  );

drop policy if exists "dono ou admin apaga imagem do chat" on storage.objects;
create policy "dono ou admin apaga imagem do chat" on storage.objects
  for delete using (bucket_id = 'chat' and ((storage.foldername(name))[1] = auth.uid()::text or public.eh_admin()));

-- ---------- apagar tudo depois de 72 horas (a cada hora) ----------
-- Precisa da extensão pg_cron. Se o comando abaixo falhar, ative a extensão
-- em Database > Extensions (pg_cron) e rode este arquivo de novo.
do $$ begin
  create extension if not exists pg_cron;
  perform cron.schedule('chat-apagar-72h', '0 * * * *', $cron$
    delete from public.chat_mensagens where criado_em < now() - interval '72 hours';
    delete from storage.objects where bucket_id = 'chat' and created_at < now() - interval '72 hours';
  $cron$);
exception when others then
  raise notice 'pg_cron não ativado: %. Ative a extensão pg_cron e rode de novo.', sqlerrm;
end $$;
