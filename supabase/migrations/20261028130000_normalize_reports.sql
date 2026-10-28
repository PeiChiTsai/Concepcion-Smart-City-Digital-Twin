-- Normalize legacy report rows and drop duplicated columns.
-- Canonical columns kept:
--   address              (replaces location_description)
--   event_time           (replaces incident_time; local Concepción 'YYYY-MM-DDTHH:mm')
--   text                 (replaces details)
--   lat, lon             (replace coordinates)
--   name, phone, email   (replace reporter_info)
--   department           (replaces responsible_department; English, from sav_categories_EN.csv)
--   emergency_notification_needed (replaces is_urgent_police)
--   report_time          (replaces created_at and the free-form "time" text)
-- Stored theme / category / department values are always English.

begin;

-- 1. Merge duplicated columns (prefer the canonical value when present).
update public.reports set
  address = coalesce(nullif(btrim(address), ''), nullif(btrim(location_description), '')),
  event_time = coalesce(nullif(btrim(event_time), ''), nullif(btrim(incident_time), '')),
  text = coalesce(nullif(btrim(text), ''), nullif(btrim(details), '')),
  lat = coalesce(lat, nullif(coordinates->>'latitude', '')::double precision),
  lon = coalesce(lon, nullif(coordinates->>'longitude', '')::double precision),
  name = coalesce(nullif(btrim(name), ''), nullif(btrim(reporter_info->>'name'), '')),
  phone = coalesce(nullif(btrim(phone), ''), nullif(btrim(reporter_info->>'phone'), '')),
  email = coalesce(nullif(btrim(email), ''), nullif(btrim(reporter_info->>'email'), '')),
  department = coalesce(nullif(btrim(responsible_department), ''), nullif(btrim(department), '')),
  emergency_notification_needed = emergency_notification_needed or coalesce(is_urgent_police, false),
  report_time = coalesce(created_at, report_time);

-- 2. Unify formats.
update public.reports set
  name = coalesce(name, 'Anonymous'),
  phone = case when upper(phone) in ('N/A', '—', '-') then null else phone end,
  email = case when email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then lower(email) else null end,
  -- Free-text values such as "yesterday" or "昨天" cannot be converted reliably.
  event_time = case
    when event_time ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$' then event_time
    else null
  end,
  additional_detail = nullif(btrim(additional_detail), ''),
  emergency_notification_reason = nullif(btrim(emergency_notification_reason), '');

-- 3. Align theme / category / department to the English SAV list.
with mapping (old_category, new_theme, new_category, new_department) as (
  values
    ('Roads & Infrastructure', 'Roads and Sidewalks', 'Roads and Carriageways in Poor Condition', 'Municipal Public Works Department'),
    ('Lighting & Utilities', 'Street Lighting and Cabling', 'Streetlights in Poor Condition', 'Municipal Public Works Department'),
    ('Public Safety', 'Public Safety and Emergencies', 'Public Safety / Surveillance', 'Public Safety Department'),
    ('Environment & Sanitation', 'Sanitation and Waste', 'Garbage in Public Areas', 'Public Sanitation and Green Spaces Department'),
    ('Poda de Árbol', 'Trees, Green Spaces and Parks', 'Tree Pruning', 'Public Sanitation and Green Spaces Department'),
    ('Problema de señalización vial', 'Traffic and Transportation', 'Request for Traffic Signs', 'Traffic and Public Transportation Department'),
    ('Fiscalización vehículos mal estacionados', 'Traffic and Transportation', 'Enforcement of Illegally Parked Vehicles', 'Public Safety Department'),
    ('Tenencia responsable de mascotas', 'Pets and Animals', 'Responsible Pet Ownership', 'Environment Department')
)
update public.reports as r set
  theme = m.new_theme,
  category = m.new_category,
  department = m.new_department
from mapping m
where r.category = m.old_category;

-- 4. The public map view depends on responsible_department; rebuild it first.
drop view if exists public.public_report_map;

alter table public.reports
  drop column if exists location_description,
  drop column if exists incident_time,
  drop column if exists details,
  drop column if exists coordinates,
  drop column if exists reporter_info,
  drop column if exists responsible_department,
  drop column if exists is_urgent_police,
  drop column if exists created_at,
  drop column if exists time;

alter table public.reports
  add constraint reports_event_time_format
  check (event_time is null or event_time ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$');

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
