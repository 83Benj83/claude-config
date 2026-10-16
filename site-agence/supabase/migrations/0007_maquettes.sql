-- =====================================================================
-- Maquettes : celles en cours de réalisation et celles déjà faites.
-- À exécuter après 0006_rappels_lots.sql. Rejouable sans danger.
-- Lu et écrit uniquement par le serveur (clé secrète).
-- =====================================================================

create table if not exists public.mockups (
  id uuid primary key default gen_random_uuid(),
  client text not null check (char_length(client) between 1 and 120),
  city text check (city is null or char_length(city) <= 80),
  contact text check (contact is null or char_length(contact) <= 160),
  status text not null default 'en_cours' check (status in ('en_cours', 'terminee')),
  started_on date not null,
  done_on date,
  -- Lien vers la maquette (Figma, page de démonstration…).
  preview_url text check (preview_url is null or preview_url ~ '^https?://'),
  made_by uuid references public.members (id) on delete set null,
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mockups_done_consistent check ((status = 'terminee') = (done_on is not null))
);
create index if not exists mockups_status_idx on public.mockups (status, started_on desc);

alter table public.mockups enable row level security;
revoke all on public.mockups from anon, authenticated;
