-- =====================================================================
-- Espace équipe : membres (identifiants), prospects, ressources.
-- À exécuter une fois dans Supabase (SQL Editor) ou via `supabase db push`.
--
-- Sécurité : toutes les tables sont accessibles UNIQUEMENT par le serveur
-- du site, avec la clé secrète. La Row Level Security est activée sans
-- aucune règle : les clés publiques de Supabase ne lisent ni n'écrivent rien.
-- =====================================================================

create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------
-- Membres : un identifiant + un mot de passe défini par un admin
-- ---------------------------------------------------------------------
create table public.members (
  id uuid primary key default gen_random_uuid(),
  login text not null check (char_length(login) between 2 and 40),
  -- identifiant normalisé (minuscules, sans accents) : unicité et recherche
  login_key text not null unique,
  full_name text not null check (char_length(full_name) between 1 and 80),
  job_title text not null default 'Membre de l''équipe' check (char_length(job_title) between 1 and 80),
  department text check (department is null or char_length(department) <= 60),
  manager_id uuid references public.members (id) on delete set null,
  avatar_url text check (avatar_url is null or avatar_url ~ '^https://'),
  is_prospector boolean not null default true,
  is_admin boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0,
  -- empreinte PBKDF2 (jamais le mot de passe en clair) ; obligatoire : pas d'identifiant sans mot de passe
  password_hash text not null check (password_hash like 'pbkdf2$%'),
  -- incrémentée pour déconnecter toutes les sessions (changement de mot de passe)
  session_version integer not null default 1,
  welcomed_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  constraint members_not_own_manager check (manager_id is distinct from id)
);

create index members_manager_id_idx on public.members (manager_id);

-- ---------------------------------------------------------------------
-- Prospects : une ligne par prise de contact avec un établissement
-- ---------------------------------------------------------------------
create table public.prospects (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete restrict,
  name text not null check (char_length(name) between 1 and 120),
  -- nom et ville normalisés par le site : reconnaissance des établissements déjà contactés
  name_key text not null,
  city text not null check (char_length(city) between 1 and 80),
  city_key text not null,
  channel text not null check (
    channel in ('telephone', 'email', 'instagram', 'facebook', 'linkedin', 'visite', 'formulaire', 'autre')
  ),
  contact text check (contact is null or char_length(contact) <= 160),
  note text check (note is null or char_length(note) <= 500),
  contacted_on date not null,
  created_at timestamptz not null default now()
);

create index prospects_contacted_on_idx on public.prospects (contacted_on);
create index prospects_member_day_idx on public.prospects (member_id, contacted_on);
create index prospects_created_at_idx on public.prospects (created_at desc);
create index prospects_establishment_idx on public.prospects (name_key, city_key);
create index prospects_name_key_trgm_idx on public.prospects using gin (name_key gin_trgm_ops);

-- Nombre d'établissements distincts déjà contactés.
create view public.establishment_count with (security_invoker = true) as
  select count(distinct (name_key, city_key))::integer as total from public.prospects;

-- ---------------------------------------------------------------------
-- Ressources : adresses e-mail, modèles de messages, liens utiles
-- ---------------------------------------------------------------------
create table public.resources (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('email', 'phone', 'template', 'link')),
  title text not null check (char_length(title) between 1 and 100),
  value text not null check (char_length(value) between 1 and 5000),
  note text check (note is null or char_length(note) <= 300),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Sécurité : aucun accès en dehors du serveur du site
-- ---------------------------------------------------------------------
-- ---------------------------------------------------------------------
-- Contrats : sites en cours de création et sites livrés
-- ---------------------------------------------------------------------
create table public.contracts (
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
create table public.app_settings (
  id boolean primary key default true check (id),
  stats_since timestamptz
);
insert into public.app_settings (id) values (true);

alter table public.members enable row level security;
alter table public.prospects enable row level security;
alter table public.resources enable row level security;
alter table public.app_settings enable row level security;
alter table public.contracts enable row level security;

revoke all on public.members, public.prospects, public.resources, public.app_settings, public.contracts from anon, authenticated;
revoke all on public.establishment_count from anon, authenticated;
