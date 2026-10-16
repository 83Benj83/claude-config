-- =====================================================================
-- Rappels (appels à refaire plus tard), ajout de numéros par l'équipe et
-- fichiers de commerces extraits de la liste « À contacter ».
-- À exécuter après 0005_a_contacter.sql. Rejouable sans danger.
-- =====================================================================

-- Fichiers extraits : un seul fichier en cours par membre.
create table if not exists public.lead_batches (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id),
  size integer not null check (size between 1 and 50),
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create unique index if not exists lead_batches_one_active_idx on public.lead_batches (member_id) where finished_at is null;

-- Qui a ajouté le commerce, le fichier qui le réserve, et l'issue de l'appel avant clôture du fichier.
alter table public.leads add column if not exists added_by uuid references public.members (id) on delete set null;
alter table public.leads add column if not exists batch_id uuid references public.lead_batches (id) on delete set null;
alter table public.leads add column if not exists outcome text;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'leads_outcome_check') then
    alter table public.leads add constraint leads_outcome_check check (outcome is null or outcome in ('contacted', 'callback'));
  end if;
end $$;
create index if not exists leads_batch_idx on public.leads (batch_id) where batch_id is not null;

-- Rappels.
create table if not exists public.callbacks (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  city text check (city is null or char_length(city) <= 80),
  phone text check (phone is null or char_length(phone) <= 30),
  contact_name text check (contact_name is null or char_length(contact_name) <= 80),
  due_on date not null,
  due_time text check (due_time is null or due_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  priority text not null default 'moyenne' check (priority in ('faible', 'moyenne', 'haute', 'urgente')),
  note text check (note is null or char_length(note) <= 500),
  added_by uuid not null references public.members (id),
  lead_id uuid references public.leads (id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'done')),
  done_by uuid references public.members (id),
  done_at timestamptz,
  created_at timestamptz not null default now(),
  constraint callbacks_done_consistent check ((status = 'done') = (done_by is not null and done_at is not null))
);
create index if not exists callbacks_status_due_idx on public.callbacks (status, due_on, due_time);

alter table public.lead_batches enable row level security;
alter table public.callbacks enable row level security;
revoke all on public.lead_batches, public.callbacks from anon, authenticated;
