alter table public.reports
  add column if not exists report_time timestamptz not null default now(),
  add column if not exists coordinates jsonb,
  add column if not exists reporter_info jsonb,
  add column if not exists responsible_department text;
