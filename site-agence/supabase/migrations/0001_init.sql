-- =====================================================================
-- Espace équipe : profils, organigramme et prospections quotidiennes.
-- À exécuter une fois dans Supabase (SQL Editor) ou via `supabase db push`.
-- =====================================================================

-- Journée de référence : heure de Paris, pas UTC.
create or replace function public.app_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Europe/Paris')::date;
$$;

-- ---------------------------------------------------------------------
-- Profils (1 ligne par compte, créée automatiquement à l'inscription)
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(full_name) between 1 and 80),
  job_title text not null default 'Membre de l''équipe' check (char_length(job_title) between 1 and 80),
  department text check (department is null or char_length(department) <= 60),
  manager_id uuid references public.profiles (id) on delete set null,
  avatar_url text check (avatar_url is null or avatar_url ~ '^https://'),
  is_prospector boolean not null default true,
  is_admin boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint profiles_not_own_manager check (manager_id is distinct from id)
);

create index profiles_manager_id_idx on public.profiles (manager_id);

-- ---------------------------------------------------------------------
-- Prospections : une ligne par personne et par jour
--  (la clé étrangère vers profiles impose d'être membre pour saisir)
-- ---------------------------------------------------------------------
create table public.prospecting_entries (
  user_id uuid not null references public.profiles (id) on delete cascade,
  entry_date date not null,
  count integer not null check (count between 0 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, entry_date)
);

create index prospecting_entries_date_idx on public.prospecting_entries (entry_date);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger prospecting_entries_touch
  before update on public.prospecting_entries
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Appartenance à l'équipe
--  Les profils sont créés uniquement par le site (après vérification du code
--  d'invitation, avec la clé secrète). Un compte créé directement auprès de
--  Supabase n'a pas de profil : il ne voit rien et ne peut rien saisir.
-- ---------------------------------------------------------------------
create or replace function public.is_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()));
$$;

revoke all on function public.is_member() from public, anon;
grant execute on function public.is_member() to authenticated;

-- ---------------------------------------------------------------------
-- Sécurité (RLS)
--  - tout membre de l'équipe (compte avec profil) peut lire l'équipe et
--    toutes les prospections (le classement est public au sein de l'équipe) ;
--  - chacun ne peut saisir / corriger que SES prospections, pour aujourd'hui
--    et les 7 derniers jours ;
--  - les profils ne sont modifiables que côté serveur (clé secrète), après
--    vérification du rôle admin dans l'application.
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.prospecting_entries enable row level security;

revoke all on public.profiles from anon;
revoke all on public.prospecting_entries from anon;
revoke insert, update, delete, truncate, references, trigger on public.profiles from authenticated;
revoke delete, truncate, references, trigger on public.prospecting_entries from authenticated;

create policy "Les membres voient l'équipe"
  on public.profiles for select
  to authenticated
  using ((select public.is_member()));

create policy "Les membres voient les prospections"
  on public.prospecting_entries for select
  to authenticated
  using ((select public.is_member()));

create policy "Chacun saisit ses prospections récentes"
  on public.prospecting_entries for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and entry_date between public.app_today() - 7 and public.app_today()
  );

create policy "Chacun corrige ses prospections récentes"
  on public.prospecting_entries for update
  to authenticated
  using (
    user_id = (select auth.uid())
    and entry_date between public.app_today() - 7 and public.app_today()
  )
  with check (
    user_id = (select auth.uid())
    and entry_date between public.app_today() - 7 and public.app_today()
  );
