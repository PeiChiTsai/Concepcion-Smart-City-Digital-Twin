create or replace view public.public_report_map
with (security_barrier = true, security_invoker = false)
as
select
  id,
  category,
  status,
  lat,
  lon,
  address,
  event_time,
  report_time,
  responsible_department,
  emergency_notification_needed
from public.reports;

comment on view public.public_report_map is
  'Public, read-only map data. Deliberately excludes reporter identity, contact details, and free-text descriptions.';

revoke all on public.public_report_map from public, anon, authenticated;
grant select on public.public_report_map to anon, authenticated;
