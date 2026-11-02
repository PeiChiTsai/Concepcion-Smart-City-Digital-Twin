-- Repairs reports.department values that hold JSON-encoded arrays, e.g.
--   '["Dept A"]'  or  '["[\"Dept A\"]","Dept B"]'  (column still text)
--   {"[\"Dept A\"]","Dept B"}                       (column already text[])
-- Works whether the column is still text (20261028140000 not applied) or text[].
-- If this runs, 20261028140000_department_array.sql is no longer needed.
begin;

create or replace function pg_temp.parse_departments(t text) returns text[]
language plpgsql as $$
declare
  j jsonb;
  el text;
  r text[] := '{}';
begin
  t := btrim(coalesce(t, ''));
  if t = '' then return '{}'; end if;
  if left(t, 1) = '[' and right(t, 1) = ']' then
    begin
      j := t::jsonb;
    exception when others then
      return array[t];
    end;
    if jsonb_typeof(j) = 'array' then
      for el in select jsonb_array_elements_text(j) loop
        r := r || pg_temp.parse_departments(el);
      end loop;
      return r;
    end if;
  end if;
  return array[t];
end $$;

create or replace function pg_temp.clean_departments(a text[]) returns text[]
language sql as $$
  select coalesce(array_agg(d order by first_pos), '{}'::text[])
  from (
    select d, min(pos) as first_pos
    from (
      select p as d, row_number() over () as pos
      from unnest(a) as e,
      lateral unnest(pg_temp.parse_departments(e)) as p
    ) s
    where d <> ''
    group by d
  ) g
$$;

do $$
declare
  col_type text;
begin
  select data_type into col_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'reports' and column_name = 'department';

  if col_type = 'text' then
    drop view if exists public.public_report_map;

    alter table public.reports
      alter column department type text[]
      using pg_temp.clean_departments(array[department]);

    alter table public.reports
      alter column department set default '{}'::text[];

    create view public.public_report_map
    with (security_barrier = true, security_invoker = false)
    as
    select
      id, theme, category, status, lat, lon, address,
      event_time, report_time, department, emergency_notification_needed
    from public.reports;

    comment on view public.public_report_map is
      'Public, read-only map data. Deliberately excludes reporter identity, contact details, and free-text descriptions.';

    revoke all on public.public_report_map from public, anon, authenticated;
    grant select on public.public_report_map to anon, authenticated;
  else
    update public.reports
    set department = pg_temp.clean_departments(department)
    where department is not null;
  end if;
end $$;

commit;
