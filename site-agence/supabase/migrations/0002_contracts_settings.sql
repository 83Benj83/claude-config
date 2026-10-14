-- =====================================================================
-- Contrats, réglages (remise à zéro des statistiques) et ressources
-- de type téléphone. À exécuter après 0001_init.sql, y compris sur une
-- base déjà en service : rien d'existant n'est effacé.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Ressources : numéros de téléphone en plus des e-mails, modèles et liens
-- ---------------------------------------------------------------------
alter table public.resources drop constraint if exists resources_kind_check;
alter table public.resources
  add constraint resources_kind_check check (kind in ('email', 'phone', 'template', 'link'));

-- ---------------------------------------------------------------------
-- Contrats : sites en cours de création et sites livrés
-- ---------------------------------------------------------------------
create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  client text not null check (char_length(client) between 1 and 120),
  city text check (city is null or char_length(city) <= 80),
  contact text check (contact is null or char_length(contact) <= 160),
  pack text not null check (pack in ('Essentiel', 'Pro', 'Signature', 'Sur mesure')),
  options text check (options is null or char_length(options) <= 300),
  amount numeric(10, 2) check (amount is null or amount >= 0),
  monthly numeric(10, 2) check (monthly is null or monthly >= 0),
  status text not null check (status in ('maquette', 'developpement', 'validation', 'termine')),
  signed_on date not null,
  delivered_on date,
  site_url text check (site_url is null or site_url ~ '^https?://'),
  brought_by uuid references public.members (id) on delete set null,
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Réglages : une seule ligne (date de remise à zéro des statistiques)
-- ---------------------------------------------------------------------
create table if not exists public.app_settings (
  id boolean primary key default true check (id),
  stats_since timestamptz
);
insert into public.app_settings (id) values (true) on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Sécurité : aucun accès en dehors du serveur du site
-- ---------------------------------------------------------------------
alter table public.contracts enable row level security;
alter table public.app_settings enable row level security;

revoke all on public.contracts, public.app_settings from anon, authenticated;
