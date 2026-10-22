alter table public.reports
  add column if not exists department text,
  add column if not exists address text,
  add column if not exists location_description text,
  add column if not exists geocoded_address text,
  add column if not exists incident_time text,
  add column if not exists event_time text,
  add column if not exists additional_detail text,
  add column if not exists details text,
  add column if not exists report_time timestamptz not null default now(),
  add column if not exists emergency_notification_needed boolean not null default false,
  add column if not exists emergency_notification_reason text;
