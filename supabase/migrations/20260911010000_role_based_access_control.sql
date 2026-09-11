-- Real RBAC: three personas per the PRD (Contract Administrator, Contract Owner,
-- Management) instead of one undifferentiated "owner" role, plus what that
-- actually requires to mean anything — a way to invite a second person into an
-- org at all (today every signup creates a brand-new org) and a real user
-- reference for "the contract owner" instead of a free-text name nobody's
-- permissions can be tied to.

-- ---------------------------------------------------------------------------
-- 1. profiles.role: admin / contract_owner / management
-- ---------------------------------------------------------------------------
update profiles set role = 'admin' where role = 'owner';

alter table profiles alter column role set default 'admin';
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('admin', 'contract_owner', 'management'));

create or replace function current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid()
$$;

-- Org members need to see each other's names (owner assignment, the team
-- list) — previously only self-read existed, so no one could see teammates.
create policy "org_members_read_org_profiles" on profiles for select
  using (organization_id = current_org_id());

create policy "admins_update_org_profiles" on profiles for update
  using (organization_id = current_org_id() and current_user_role() = 'admin')
  with check (organization_id = current_org_id());

create policy "admins_delete_org_profiles" on profiles for delete
  using (organization_id = current_org_id() and current_user_role() = 'admin');

-- ---------------------------------------------------------------------------
-- 2. organization_invites: the only way a second person joins an org
-- ---------------------------------------------------------------------------
create table if not exists organization_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'contract_owner', 'management')),
  invited_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, email)
);

create index if not exists organization_invites_email_idx on organization_invites (lower(email));

alter table organization_invites enable row level security;

create policy "admins_manage_org_invites" on organization_invites for all
  using (organization_id = current_org_id() and current_user_role() = 'admin')
  with check (organization_id = current_org_id() and current_user_role() = 'admin');

-- A brand-new signup may join an org two ways: create their own (org has zero
-- members yet), or consume a pending invite that matches their auth email.
-- Without this, the old "id = auth.uid()" insert check would let any signed-in
-- user hand themselves admin on an *existing* org just by naming its id.
create or replace function can_join_organization(target_org uuid, target_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    not exists (select 1 from profiles p where p.organization_id = target_org)
    or exists (
      select 1 from organization_invites i
      join auth.users u on u.id = auth.uid()
      where i.organization_id = target_org
        and lower(i.email) = lower(u.email)
        and i.role = target_role
    )
$$;

drop policy if exists "self_insert_profile" on profiles;
create policy "self_insert_profile" on profiles for insert
  with check (id = auth.uid() and can_join_organization(organization_id, role));

create or replace function consume_organization_invite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from organization_invites i
  using auth.users u
  where u.id = new.id
    and i.organization_id = new.organization_id
    and lower(i.email) = lower(u.email);
  return new;
end;
$$;

drop trigger if exists profiles_consume_invite on profiles;
create trigger profiles_consume_invite after insert on profiles
for each row execute function consume_organization_invite();

-- ---------------------------------------------------------------------------
-- 3. contracts.owner_user_id: a real account, not a free-text name
-- ---------------------------------------------------------------------------
alter table contracts add column if not exists owner_user_id uuid references profiles(id) on delete set null;
create index if not exists contracts_owner_user_id_idx on contracts (owner_user_id);

-- ---------------------------------------------------------------------------
-- 4. Role-aware RLS: management is read-only everywhere; contract_owner is
--    scoped to the contracts (and their documents) they own; admin is
--    unrestricted within their org.
-- ---------------------------------------------------------------------------
drop policy if exists "org_members_manage_vendors" on vendors;

create policy "org_members_select_vendors" on vendors for select
  using (organization_id = current_org_id());
create policy "admins_and_owners_insert_vendors" on vendors for insert
  with check (organization_id = current_org_id() and current_user_role() in ('admin', 'contract_owner'));
create policy "admins_and_owners_update_vendors" on vendors for update
  using (organization_id = current_org_id() and current_user_role() in ('admin', 'contract_owner'))
  with check (organization_id = current_org_id() and current_user_role() in ('admin', 'contract_owner'));
create policy "admins_and_owners_delete_vendors" on vendors for delete
  using (organization_id = current_org_id() and current_user_role() in ('admin', 'contract_owner'));

drop policy if exists "org_members_manage_contracts" on contracts;

create policy "org_members_select_contracts" on contracts for select
  using (organization_id = current_org_id());
create policy "admins_and_owners_insert_contracts" on contracts for insert
  with check (
    organization_id = current_org_id()
    and (current_user_role() = 'admin' or (current_user_role() = 'contract_owner' and owner_user_id = auth.uid()))
  );
create policy "admins_and_scoped_owners_update_contracts" on contracts for update
  using (
    organization_id = current_org_id()
    and (current_user_role() = 'admin' or (current_user_role() = 'contract_owner' and owner_user_id = auth.uid()))
  )
  with check (
    organization_id = current_org_id()
    and (current_user_role() = 'admin' or (current_user_role() = 'contract_owner' and owner_user_id = auth.uid()))
  );
create policy "admins_and_scoped_owners_delete_contracts" on contracts for delete
  using (
    organization_id = current_org_id()
    and (current_user_role() = 'admin' or (current_user_role() = 'contract_owner' and owner_user_id = auth.uid()))
  );

drop policy if exists "org_members_manage_contract_documents" on contract_documents;

create policy "org_members_select_contract_documents" on contract_documents for select
  using (organization_id = current_org_id());
create policy "admins_and_scoped_owners_insert_contract_documents" on contract_documents for insert
  with check (
    organization_id = current_org_id()
    and (
      current_user_role() = 'admin'
      or (current_user_role() = 'contract_owner' and exists (
        select 1 from contracts c where c.id = contract_documents.contract_id and c.owner_user_id = auth.uid()
      ))
    )
  );
create policy "admins_and_scoped_owners_update_contract_documents" on contract_documents for update
  using (
    organization_id = current_org_id()
    and (
      current_user_role() = 'admin'
      or (current_user_role() = 'contract_owner' and exists (
        select 1 from contracts c where c.id = contract_documents.contract_id and c.owner_user_id = auth.uid()
      ))
    )
  )
  with check (organization_id = current_org_id());
create policy "admins_and_scoped_owners_delete_contract_documents" on contract_documents for delete
  using (
    organization_id = current_org_id()
    and (
      current_user_role() = 'admin'
      or (current_user_role() = 'contract_owner' and exists (
        select 1 from contracts c where c.id = contract_documents.contract_id and c.owner_user_id = auth.uid()
      ))
    )
  );

drop policy if exists "org_members_update_vendor_applications" on vendor_applications;
create policy "admins_and_owners_update_vendor_applications" on vendor_applications for update
  using (organization_id = current_org_id() and current_user_role() in ('admin', 'contract_owner'))
  with check (organization_id = current_org_id() and current_user_role() in ('admin', 'contract_owner'));

drop policy if exists "org_members_delete_vendor_applications" on vendor_applications;
create policy "admins_and_owners_delete_vendor_applications" on vendor_applications for delete
  using (organization_id = current_org_id() and current_user_role() in ('admin', 'contract_owner'));

drop policy if exists "org_members_manage_contract_events" on contract_events;
create policy "org_members_select_contract_events" on contract_events for select
  using (organization_id = current_org_id());
create policy "admins_and_owners_insert_contract_events" on contract_events for insert
  with check (organization_id = current_org_id() and current_user_role() in ('admin', 'contract_owner'));

-- ---------------------------------------------------------------------------
-- 5. Storage: the previous policies let ANY authenticated user (any org)
--    upload/delete into ANY contract's document folder, since bucket-level
--    "authenticated" was the only check. Scope to the uploader's own org and
--    role, same as the table-level policies above.
-- ---------------------------------------------------------------------------
drop policy if exists "authenticated_insert_contract_documents" on storage.objects;
drop policy if exists "authenticated_delete_contract_documents" on storage.objects;

create policy "org_scoped_insert_contract_documents" on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'contract-documents'
    and current_user_role() in ('admin', 'contract_owner')
    and exists (
      select 1 from contracts c
      where c.id::text = (storage.foldername(name))[1]
        and c.organization_id = current_org_id()
    )
  );

create policy "org_scoped_delete_contract_documents" on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'contract-documents'
    and current_user_role() in ('admin', 'contract_owner')
    and exists (
      select 1 from contracts c
      where c.id::text = (storage.foldername(name))[1]
        and c.organization_id = current_org_id()
    )
  );
