-- Crimson Dice kit tracking (POC — pouches 01–25)
-- Apply in the existing Lobster Dice Supabase project.
-- Anon clients may INSERT events only. SELECT is locked down so the public
-- app cannot dump names/emails. The owner roster reads via a Vercel function
-- using SUPABASE_SERVICE_ROLE_KEY (bypasses RLS).

create table if not exists public.crimson_events (
  id uuid primary key default gen_random_uuid(),
  kit_id text not null check (kit_id ~ '^(0[1-9]|1[0-9]|2[0-5])$'),
  event text not null check (event in ('open', 'return', 'setup', 'game_start', 'game_end')),
  name text,
  email text,
  user_agent text,
  device_id text not null,
  created_at timestamptz not null default now()
);

create index if not exists crimson_events_kit_idx
  on public.crimson_events (kit_id, created_at desc);
create index if not exists crimson_events_device_kit_idx
  on public.crimson_events (device_id, kit_id);

alter table public.crimson_events enable row level security;

drop policy if exists "anon can record crimson events" on public.crimson_events;
create policy "anon can record crimson events"
  on public.crimson_events
  for insert
  to anon
  with check (
    kit_id ~ '^(0[1-9]|1[0-9]|2[0-5])$'
    and event in ('open', 'return', 'setup', 'game_start', 'game_end')
    and char_length(device_id) between 8 and 80
    and (name is null or char_length(name) <= 80)
    and (email is null or char_length(email) <= 120)
    and (user_agent is null or char_length(user_agent) <= 400)
  );

-- deliberately no SELECT / UPDATE / DELETE policies for anon

grant usage on schema public to anon;
grant insert on public.crimson_events to anon;
