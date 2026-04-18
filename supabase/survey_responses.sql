create extension if not exists pgcrypto;

create table if not exists public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  answer text not null,
  saved_citation_count integer not null default 0,
  project_present boolean not null default false,
  session_mode text not null default 'guest',
  scope text not null default 'guest:local',
  fingerprint text,
  source text not null default 'pricing-survey-v1'
);

alter table public.survey_responses enable row level security;

drop policy if exists "Allow survey inserts" on public.survey_responses;
create policy "Allow survey inserts"
on public.survey_responses
for insert
to anon, authenticated
with check (true);
