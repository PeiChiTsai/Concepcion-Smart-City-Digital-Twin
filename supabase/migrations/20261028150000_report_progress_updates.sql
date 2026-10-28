-- Progress log: municipal staff record how far the handling of a report has come.
create table if not exists public.report_progress_updates (
  id bigint generated always as identity primary key,
  report_id bigint not null references public.reports (id) on delete cascade,
  author_id uuid default auth.uid() references auth.users (id) on delete set null,
  author_email text,
  note text not null check (char_length(btrim(note)) between 1 and 1000),
  status text,
  created_at timestamptz not null default now()
);

create index if not exists report_progress_updates_report_idx
  on public.report_progress_updates (report_id, created_at desc);

alter table public.report_progress_updates enable row level security;

revoke all on table public.report_progress_updates from public, anon, authenticated;
grant select, insert, delete on table public.report_progress_updates to authenticated;

create policy "Approved municipal staff can read progress updates"
  on public.report_progress_updates
  for select
  to authenticated
  using (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'municipal_admin'
    and (select auth.jwt() -> 'app_metadata' ->> 'municipal_approved') = 'true'
  );

create policy "Approved municipal staff can add progress updates"
  on public.report_progress_updates
  for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and (select auth.jwt() -> 'app_metadata' ->> 'role') = 'municipal_admin'
    and (select auth.jwt() -> 'app_metadata' ->> 'municipal_approved') = 'true'
  );

create policy "Approved municipal staff can delete progress updates"
  on public.report_progress_updates
  for delete
  to authenticated
  using (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'municipal_admin'
    and (select auth.jwt() -> 'app_metadata' ->> 'municipal_approved') = 'true'
  );
