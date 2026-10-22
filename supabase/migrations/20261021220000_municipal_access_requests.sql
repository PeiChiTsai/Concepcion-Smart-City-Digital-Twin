create table if not exists public.municipal_access_requests (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  organization text not null check (length(trim(organization)) between 2 and 160),
  reason text not null check (length(trim(reason)) between 10 and 1000),
  requested_at timestamptz not null default now()
);

alter table public.municipal_access_requests
  add column if not exists email text;

update public.municipal_access_requests as requests
set email = users.email
from auth.users as users
where users.id = requests.user_id
  and requests.email is null;

alter table public.municipal_access_requests
  alter column email set not null;

create or replace function public.set_municipal_access_request_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select users.email
  into new.email
  from auth.users as users
  where users.id = new.user_id;

  if new.email is null then
    raise exception 'A valid account email is required for a municipal access request.';
  end if;

  return new;
end;
$$;

revoke all on function public.set_municipal_access_request_email()
  from public, anon, authenticated;

drop trigger if exists set_municipal_access_request_email
  on public.municipal_access_requests;

create trigger set_municipal_access_request_email
  before insert or update of user_id, email
  on public.municipal_access_requests
  for each row
  execute function public.set_municipal_access_request_email();

alter table public.municipal_access_requests enable row level security;

revoke all on table public.municipal_access_requests from public, anon, authenticated;
grant select on table public.municipal_access_requests to authenticated;
grant insert (user_id, organization, reason)
  on table public.municipal_access_requests
  to authenticated;

drop policy if exists "Users can view their own municipal access request"
  on public.municipal_access_requests;

create policy "Users can view their own municipal access request"
  on public.municipal_access_requests
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users can submit one municipal access request for themselves"
  on public.municipal_access_requests;

create policy "Users can submit one municipal access request for themselves"
  on public.municipal_access_requests
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));
