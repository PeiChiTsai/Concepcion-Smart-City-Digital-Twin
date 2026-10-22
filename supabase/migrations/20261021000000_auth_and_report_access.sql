alter table public.reports
  add column if not exists user_id uuid references auth.users (id) on delete set null;

alter table public.reports enable row level security;

revoke all on table public.reports from public, anon, authenticated;
grant select, insert, update, delete on table public.reports to authenticated;

do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'reports'
  loop
    execute format(
      'drop policy %I on public.reports',
      existing_policy.policyname
    );
  end loop;
end;
$$;

create policy "Report owners and approved municipal staff can read reports"
  on public.reports
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (
      (select auth.jwt() -> 'app_metadata' ->> 'role') = 'municipal_admin'
      and (select auth.jwt() -> 'app_metadata' ->> 'municipal_approved') = 'true'
    )
  );

create policy "Authenticated citizens can submit reports for themselves"
  on public.reports
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'pending'
  );

create policy "Approved municipal staff can update reports"
  on public.reports
  for update
  to authenticated
  using (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'municipal_admin'
    and (select auth.jwt() -> 'app_metadata' ->> 'municipal_approved') = 'true'
  )
  with check (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'municipal_admin'
    and (select auth.jwt() -> 'app_metadata' ->> 'municipal_approved') = 'true'
  );

create policy "Approved municipal staff can delete reports"
  on public.reports
  for delete
  to authenticated
  using (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'municipal_admin'
    and (select auth.jwt() -> 'app_metadata' ->> 'municipal_approved') = 'true'
  );
