-- =====================================================================
-- Activité (admins) : qui vient sur le site, et journal des connexions.
-- À exécuter après 0003_echange.sql.
-- Comme le reste : lu et écrit uniquement par le serveur (clé secrète).
-- =====================================================================

-- Dernière visite (notée au plus toutes les 5 minutes par le site).
alter table public.members add column if not exists last_seen_at timestamptz;

-- Présence par jour (heure de Paris) : première et dernière visite.
create table if not exists public.member_days (
  member_id uuid not null references public.members (id) on delete cascade,
  day date not null,
  first_seen_at timestamptz not null,
  last_seen_at timestamptz not null,
  primary key (member_id, day)
);
create index if not exists member_days_day_idx on public.member_days (day);

-- Essais de connexion avec un mot de passe. Refusé : identifiant tel que saisi, sans membre.
create table if not exists public.login_events (
  id bigint generated always as identity primary key,
  member_id uuid references public.members (id) on delete set null,
  login text not null check (char_length(login) <= 60),
  ok boolean not null,
  at timestamptz not null default now()
);
create index if not exists login_events_at_idx on public.login_events (at desc);

alter table public.member_days enable row level security;
alter table public.login_events enable row level security;
revoke all on public.member_days, public.login_events from anon, authenticated;

-- Visite : garde la première du jour, avance la dernière (et celle du membre).
create or replace function public.record_presence(p_member uuid, p_day date, p_at timestamptz)
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.member_days (member_id, day, first_seen_at, last_seen_at)
  values (p_member, p_day, p_at, p_at)
  on conflict (member_id, day) do update
    set last_seen_at = greatest(public.member_days.last_seen_at, excluded.last_seen_at);
  update public.members
    set last_seen_at = greatest(coalesce(last_seen_at, p_at), p_at)
    where id = p_member;
$$;

-- Par défaut, une fonction est exécutable par tous : réservée ici au serveur.
revoke all on function public.record_presence(uuid, date, timestamptz) from public, anon, authenticated;
grant execute on function public.record_presence(uuid, date, timestamptz) to service_role;
