-- ENIGMA game progress. Run this once in the Supabase SQL editor.
-- The existing project tables (teams and team_info) remain the source of team data.

create table if not exists public.game_rounds (
  team_name text primary key references public.teams(name) on delete cascade,
  current_round smallint not null default 1 check (current_round between 1 and 6),
  last_result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_settings (
  id smallint primary key default 1 check (id = 1),
  event_name text not null check (event_name in (
    'AI Security Breakthrough',
    'Bull Market',
    'Coordinated Cyber Attack',
    'Institutional Investment Wave',
    'Major Exchange Listing',
    'Market Crash',
    'Open Source Contributor Boom',
    'Regulatory Crackdown',
    'Security Grant',
    'Validator Incentive Program'
  )),
  created_at timestamptz not null default now()
);

alter table public.game_rounds enable row level security;
alter table public.game_settings enable row level security;

drop policy if exists "Team leaders can read their own game progress" on public.game_rounds;
create policy "Team leaders can read their own game progress"
  on public.game_rounds for select to authenticated
  using (
    exists (
      select 1 from public.team_info
      where team_info.teamname = game_rounds.team_name
        and lower(team_info.teamleaderemail) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

drop policy if exists "Team leaders can start their own game" on public.game_rounds;
create policy "Team leaders can start their own game"
  on public.game_rounds for insert to authenticated
  with check (
    exists (
      select 1 from public.team_info
      where team_info.teamname = game_rounds.team_name
        and lower(team_info.teamleaderemail) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

drop policy if exists "Team leaders can advance their own game" on public.game_rounds;
create policy "Team leaders can advance their own game"
  on public.game_rounds for update to authenticated
  using (
    exists (
      select 1 from public.team_info
      where team_info.teamname = game_rounds.team_name
        and lower(team_info.teamleaderemail) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  )
  with check (
    exists (
      select 1 from public.team_info
      where team_info.teamname = game_rounds.team_name
        and lower(team_info.teamleaderemail) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

drop policy if exists "Authenticated players can read the shared market event" on public.game_settings;
create policy "Authenticated players can read the shared market event"
  on public.game_settings for select to authenticated
  using (true);

drop policy if exists "Authenticated players can create the shared market event" on public.game_settings;
create policy "Authenticated players can create the shared market event"
  on public.game_settings for insert to authenticated
  with check (id = 1);
