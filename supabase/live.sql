-- Live scoreboard broadcasting (v4.3) — one ephemeral state row per crew,
-- upserted by the scorekeeper's phone, polled by watchers.
create table if not exists public.live (
  code text primary key references public.tables(code),
  state jsonb not null check (pg_column_size(state) <= 32768),
  updated_at timestamptz not null default now()
);

alter table public.live enable row level security;
create policy "app can publish live state" on public.live for insert to anon with check (true);
create policy "app can update live state"  on public.live for update to anon using (true) with check (true);
create policy "anyone can watch"           on public.live for select to anon using (true);
grant select, insert, update on public.live to anon;
