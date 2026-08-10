-- Platform-admin view: lets a small set of trusted accounts (set manually,
-- never self-service) see which companies have signed up, without widening
-- any RLS on vendors/contracts/applications for them.

alter table profiles add column if not exists is_platform_admin boolean not null default false;
alter table profiles add column if not exists email text;

-- Backfill from auth.users (this migration runs with full privileges, unlike
-- the client API, which never exposes the auth schema).
update profiles p set email = u.email from auth.users u where u.id = p.id and p.email is null;

-- Keep future signups' email populated too (provisionOrganization() also
-- sets it explicitly going forward; this is a safety-net default).
create or replace function sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is null then
    select email into new.email from auth.users where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_sync_email on profiles;
create trigger profiles_sync_email before insert on profiles
for each row execute function sync_profile_email();

create or replace function is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_platform_admin from profiles where id = auth.uid()), false)
$$;

create policy "platform_admin_read_all_profiles" on profiles for select
  using (is_platform_admin());

-- Aggregate counts only, via a gated function, so admins never get row-level
-- read/write access to other companies' vendors/contracts/applications.
create or replace function platform_admin_org_stats()
returns table (
  organization_id uuid,
  vendor_count bigint,
  contract_count bigint,
  application_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    o.id,
    (select count(*) from vendors v where v.organization_id = o.id),
    (select count(*) from contracts c where c.organization_id = o.id),
    (select count(*) from vendor_applications a where a.organization_id = o.id)
  from organizations o
  where is_platform_admin()
$$;
