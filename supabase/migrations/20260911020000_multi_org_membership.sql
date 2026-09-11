-- Lets one person belong to more than one company. Previously a profile row
-- WAS the membership (one org, one role, permanently) — so an existing user
-- had no way to accept an invite into a second org. Splits "who this person
-- is" (profiles: name/email/active workspace) from "which orgs they're in,
-- and with what role" (memberships: many rows per user).

create table if not exists memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  role text not null check (role in ('admin', 'contract_owner', 'management')),
  created_at timestamptz not null default now(),
  unique (user_id, organization_id)
);

create index if not exists memberships_user_id_idx on memberships (user_id);
create index if not exists memberships_organization_id_idx on memberships (organization_id);

insert into memberships (user_id, organization_id, role)
select id, organization_id, role from profiles
on conflict (user_id, organization_id) do nothing;

alter table profiles add column if not exists active_organization_id uuid references organizations(id);
update profiles set active_organization_id = organization_id where active_organization_id is null;
alter table profiles alter column active_organization_id set not null;

-- Drop everything on profiles that referenced the columns being removed,
-- before actually removing them.
drop policy if exists "org_members_read_org_profiles" on profiles;
drop policy if exists "admins_update_org_profiles" on profiles;
drop policy if exists "admins_delete_org_profiles" on profiles;
drop policy if exists "self_insert_profile" on profiles;
drop trigger if exists profiles_consume_invite on profiles;
drop function if exists consume_organization_invite();

-- Also depends on profiles.organization_id; recreate against memberships below.
drop policy if exists "authenticated_delete_empty_organization" on organizations;

alter table profiles drop column organization_id;
alter table profiles drop column role;

create or replace function current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select active_organization_id from profiles where id = auth.uid()
$$;

create or replace function current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from memberships where user_id = auth.uid() and organization_id = current_org_id()
$$;

-- Gate for a membership insert: either this org has no members yet (fresh
-- signup bootstrapping their own new company) or a pending invite matches
-- the caller's own auth email for that org+role.
create or replace function can_join_organization(target_org uuid, target_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    not exists (select 1 from memberships m where m.organization_id = target_org)
    or exists (
      select 1 from organization_invites i
      join auth.users u on u.id = auth.uid()
      where i.organization_id = target_org
        and lower(i.email) = lower(u.email)
        and i.role = target_role
    )
$$;

create policy "self_insert_profile" on profiles for insert
  with check (id = auth.uid());

create policy "self_update_profile" on profiles for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and exists (select 1 from memberships m where m.user_id = auth.uid() and m.organization_id = active_organization_id)
  );

-- Teammates need to see each other's names (owner assignment, the /team
-- list) — scoped through a shared membership rather than a single org column.
create policy "org_members_read_teammate_profiles" on profiles for select
  using (exists (select 1 from memberships m where m.user_id = profiles.id and m.organization_id = current_org_id()));

alter table memberships enable row level security;

create policy "self_read_memberships" on memberships for select
  using (user_id = auth.uid() or organization_id = current_org_id());

create policy "platform_admin_read_all_memberships" on memberships for select
  using (is_platform_admin());

create policy "self_or_invited_insert_membership" on memberships for insert
  with check (user_id = auth.uid() and can_join_organization(organization_id, role));

create policy "admins_update_membership_role" on memberships for update
  using (organization_id = current_org_id() and current_user_role() = 'admin')
  with check (organization_id = current_org_id());

create policy "admins_or_self_delete_membership" on memberships for delete
  using (
    user_id = auth.uid()
    or (organization_id = current_org_id() and current_user_role() = 'admin')
  );

-- A user needs to see (and act on) invites addressed to their own email
-- regardless of which org is currently active — previously only the inviting
-- org's admins could see the invite at all, so an existing user had no way
-- to discover or accept one.
create policy "invitee_can_view_own_invites" on organization_invites for select
  using (lower(email) = lower((select email from auth.users where id = auth.uid())));

create policy "invitee_can_delete_own_invites" on organization_invites for delete
  using (lower(email) = lower((select email from auth.users where id = auth.uid())));

create policy "authenticated_delete_empty_organization" on organizations for delete
  to authenticated
  using (not exists (select 1 from memberships where memberships.organization_id = organizations.id));
