-- Reports can be handled by several departments: department becomes text[] (English names).
begin;

drop view if exists public.public_report_map;

alter table public.reports
  alter column department type text[]
  using case
    when department is null or btrim(department) = '' then '{}'::text[]
    else array[btrim(department)]
  end;

alter table public.reports
  alter column department set default '{}'::text[];

create view public.public_report_map
with (security_barrier = true, security_invoker = false)
as
select
  id,
  theme,
  category,
  status,
  lat,
  lon,
  address,
  event_time,
  report_time,
  department,
  emergency_notification_needed
from public.reports;

comment on view public.public_report_map is
  'Public, read-only map data. Deliberately excludes reporter identity, contact details, and free-text descriptions.';

revoke all on public.public_report_map from public, anon, authenticated;
grant select on public.public_report_map to anon, authenticated;

commit;
