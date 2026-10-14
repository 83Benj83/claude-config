-- =====================================================================
-- Liste « À contacter » : commerces sans site web proposés à l'équipe.
-- À exécuter après 0004_activite.sql.
-- Chacun coche le commerce qu'il a contacté : il quitte la liste et devient
-- un de ses prospects. Lu et écrit uniquement par le serveur (clé secrète).
-- =====================================================================

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  city text not null check (char_length(city) between 1 and 80),
  category text check (category is null or char_length(category) <= 60),
  phone text check (phone is null or char_length(phone) <= 30),
  email text check (email is null or char_length(email) <= 160),
  -- Pages Instagram et Facebook : adresses https seulement.
  instagram text check (instagram is null or (instagram ~ '^https://' and char_length(instagram) <= 160)),
  facebook text check (facebook is null or (facebook ~ '^https://' and char_length(facebook) <= 160)),
  note text check (note is null or char_length(note) <= 300),
  -- Jour de la liste (heure de Paris).
  list_day date not null,
  status text not null default 'open' check (status in ('open', 'done', 'archived')),
  -- Qui l'a coché, quand, et le prospect alors créé (il peut être supprimé ensuite).
  done_by uuid references public.members (id),
  done_at timestamptz,
  prospect_id uuid,
  created_at timestamptz not null default now(),
  constraint leads_done_consistent check ((status = 'done') = (done_by is not null and done_at is not null))
);

create index if not exists leads_status_idx on public.leads (status, done_at desc);

alter table public.leads enable row level security;
revoke all on public.leads from anon, authenticated;
