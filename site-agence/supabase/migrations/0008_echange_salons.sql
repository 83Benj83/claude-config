-- =====================================================================
-- Échange : salons thématiques, réponses, messages épinglés et réactions.
-- À exécuter après 0007_maquettes.sql. Rejouable sans danger ; les messages
-- existants rejoignent le salon « Général ».
-- =====================================================================

alter table public.messages add column if not exists channel text not null default 'general';
alter table public.messages add column if not exists reply_to uuid references public.messages (id) on delete set null;
alter table public.messages add column if not exists pinned boolean not null default false;
-- Réactions : { "👍": ["id-membre", …], … }
alter table public.messages add column if not exists reactions jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'messages_channel_check') then
    alter table public.messages add constraint messages_channel_check
      check (channel in ('general', 'prospection', 'contrats', 'astuces', 'annonces'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'messages_reactions_check') then
    alter table public.messages add constraint messages_reactions_check check (jsonb_typeof(reactions) = 'object');
  end if;
end $$;

create index if not exists messages_channel_created_idx on public.messages (channel, created_at desc);
