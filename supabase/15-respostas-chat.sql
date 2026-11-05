-- =====================================================================
--  Coletivo Lufã · BATE-PAPO: responder a uma mensagem específica
--  Rode DEPOIS do 14-perfil.sql. Cole tudo no SQL Editor e clique em Run.
--  Pode rodar de novo sem problema.
-- =====================================================================

-- ---------- 1. mensagem pode responder outra ----------
alter table public.chat_mensagens add column if not exists resposta_de bigint
  references public.chat_mensagens (id) on delete set null;
create index if not exists chat_resposta_idx on public.chat_mensagens (resposta_de);

-- ---------- 2. novo tipo de aviso: alguém respondeu sua mensagem ----------
alter table public.notificacoes drop constraint if exists notificacoes_tipo_check;
alter table public.notificacoes add constraint notificacoes_tipo_check
  check (tipo in ('pedido_amizade', 'mensagem', 'resposta'));

-- ---------- 3. avisos: resposta vai para quem escreveu a mensagem respondida ----------
create or replace function public.notificar_mensagem() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  c record;
  v_outro uuid;
  v_trecho text;
  v_quem text;
  v_resp_autor uuid;
begin
  v_quem := public.nome_curto(new.autor_id);
  v_trecho := case
    when new.tipo = 'texto' then '"' || left(new.texto, 80) || '"'
    when new.tipo = 'imagem' then '[foto]'
    else '[áudio]' end;

  if new.resposta_de is not null then
    select autor_id into v_resp_autor from public.chat_mensagens where id = new.resposta_de;
    if v_resp_autor is not null and v_resp_autor <> new.autor_id then
      insert into public.notificacoes (para_id, de_id, tipo, texto, conversa_id)
        values (v_resp_autor, new.autor_id, 'resposta',
                v_quem || ' respondeu sua mensagem: ' || v_trecho, new.conversa_id);
    end if;
  end if;

  if new.conversa_id is null then return new; end if;
  select * into c from public.chat_conversas where id = new.conversa_id;
  if not found then return new; end if;
  v_outro := case when c.membro_a = new.autor_id then c.membro_b else c.membro_a end;

  -- quem já recebeu o aviso de resposta não recebe também o de mensagem
  if not (new.resposta_de is not null and v_resp_autor = v_outro) then
    insert into public.notificacoes (para_id, de_id, tipo, texto, conversa_id)
      values (v_outro, new.autor_id, 'mensagem', v_quem || ' mandou uma mensagem: ' || v_trecho, new.conversa_id);
  end if;
  return new;
end $$;
