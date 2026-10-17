-- =====================================================================
-- Liste « À contacter » : adresse et infos utiles pour l'appel.
-- À exécuter après 0008_echange_salons.sql. Rejouable sans risque.
-- Chaque commerce peut porter jusqu'à 3 infos courtes (ce qui lui manque,
-- un fait, un angle d'accroche), affichées quand on déplie la ligne.
-- =====================================================================

alter table public.leads add column if not exists address text;
alter table public.leads add column if not exists tips text[] not null default '{}';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'leads_address_length') then
    alter table public.leads
      add constraint leads_address_length check (address is null or char_length(address) between 1 and 160);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'leads_tips_shape') then
    alter table public.leads
      add constraint leads_tips_shape check (cardinality(tips) <= 3 and char_length(array_to_string(tips, '')) <= 480);
  end if;
end
$$;
