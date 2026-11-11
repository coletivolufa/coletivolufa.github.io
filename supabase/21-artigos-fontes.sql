-- =====================================================================
--  Coletivo Lufã · ARTIGOS: fontes de pesquisa
--  Rode no SQL Editor e clique em Run. Pode rodar de novo sem problema.
--  Guarda as fontes (uma por linha) que aparecem no fim de cada artigo.
-- =====================================================================
alter table public.artigos add column if not exists fontes text not null default ''
  check (char_length(fontes) <= 6000);
