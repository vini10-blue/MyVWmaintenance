-- =============================================================================
-- MyVW Maintenance — Supabase setup
-- Paste this whole script into your Supabase project: SQL Editor → New query →
-- Run. It creates the tables, the security rules (so each user only sees their
-- own data), and the storage bucket for photos/receipts. Safe to re-run.
-- =============================================================================

-- Generic per-entity tables. The app stores each record's fields inside `data`
-- (jsonb), which keeps the schema simple and future-proof.
create table if not exists public.cars (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

create table if not exists public.records (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

create table if not exists public.fuel_logs (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

create table if not exists public.reminders (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

-- Attachment metadata (the file itself lives in Storage, see below).
create table if not exists public.attachments (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  car_id text,
  record_id text,
  kind text,
  filename text,
  mime text,
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

-- ---- Row-Level Security: each user can only touch their own rows ------------
do $$
declare t text;
begin
  foreach t in array array['cars','records','fuel_logs','reminders','attachments']
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "own rows" on public.%I;', t);
    execute format(
      'create policy "own rows" on public.%I
         for all
         using (user_id = auth.uid())
         with check (user_id = auth.uid());', t);
  end loop;
end $$;

-- ---- Storage bucket for attachment files -----------------------------------
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

-- Files are stored at "<user_id>/<attachment_id>"; users can only access their
-- own folder.
drop policy if exists "own files" on storage.objects;
create policy "own files" on storage.objects
  for all
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
