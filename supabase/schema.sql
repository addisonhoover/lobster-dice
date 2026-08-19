-- Lobster Dice crew sync — schema v1
-- Crews are identified by a 4-character code; no accounts, no passwords.
-- The games ledger is append-only: no update or delete is possible from the app.

create table if not exists public.tables (
  code text primary key check (code ~ '^[A-Z0-9]{4}$'),
  created_at timestamptz not null default now()
);

create table if not exists public.games (
  id uuid primary key,
  code text not null references public.tables(code),
  played_at timestamptz not null default now(),
  stake numeric not null default 0,
  players jsonb not null check (pg_column_size(players) <= 65536),
  created_at timestamptz not null default now()
);

create index if not exists games_code_idx on public.games (code, played_at desc);

alter table public.tables enable row level security;
alter table public.games enable row level security;

create policy "anyone can create a crew code"  on public.tables for insert to anon with check (true);
create policy "anyone can look up a crew code" on public.tables for select to anon using (true);
create policy "app can record games"           on public.games  for insert to anon with check (true);
create policy "app can read games"             on public.games  for select to anon using (true);
-- deliberately no update/delete policies: nobody can rewrite history

grant usage on schema public to anon;
grant select, insert on public.tables to anon;
grant select, insert on public.games  to anon;
