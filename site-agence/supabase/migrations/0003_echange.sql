-- =====================================================================
-- Échange : messages de l'équipe, photos et fichiers joints.
-- À exécuter après 0002_contracts_settings.sql.
-- Les fichiers sont dans un espace de stockage privé : seul le serveur du
-- site les lit (clé secrète), après avoir vérifié la session.
-- =====================================================================

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.members (id),
  body text not null check (char_length(body) <= 2000),
  -- Copie des pièces jointes : [{ id, name, type, size, kind }]
  attachments jsonb not null default '[]'::jsonb check (jsonb_typeof(attachments) = 'array'),
  created_at timestamptz not null default now()
);
create index if not exists messages_created_at_idx on public.messages (created_at desc);

-- Fichiers envoyés : en attente (message_id vide) jusqu'à l'envoi du message.
create table if not exists public.message_files (
  id uuid primary key,
  uploader_id uuid not null references public.members (id),
  -- Message supprimé : ses fichiers sont détachés (le site efface ensuite le stockage).
  message_id uuid references public.messages (id) on delete set null,
  name text not null check (char_length(name) between 1 and 120),
  type text not null,
  size integer not null check (size between 1 and 4194304),
  kind text not null check (kind in ('image', 'file')),
  created_at timestamptz not null default now()
);
create index if not exists message_files_message_id_idx on public.message_files (message_id);

insert into storage.buckets (id, name, public, file_size_limit)
values ('echange', 'echange', false, 4194304)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

alter table public.messages enable row level security;
alter table public.message_files enable row level security;

revoke all on public.messages, public.message_files from anon, authenticated;
