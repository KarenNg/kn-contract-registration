-- Multi-tenant lockdown: every company (organization) gets its own isolated
-- vendors, contracts, documents, and applications behind a login. Existing
-- demo data is parked under a placeholder org until claimed by a real signup.

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  full_name text,
  role text not null default 'owner',
  created_at timestamptz not null default now()
);

create index if not exists profiles_organization_id_idx on profiles (organization_id);

-- Resolves the signed-in user's organization. security definer so it can be
-- read from other tables' RLS policies without re-entering profiles' own RLS.
create or replace function current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from profiles where id = auth.uid()
$$;

insert into organizations (name, slug)
values ('Demo Organization', 'demo-org')
on conflict (slug) do nothing;

alter table vendors add column if not exists organization_id uuid references organizations(id) on delete cascade;
alter table contracts add column if not exists organization_id uuid references organizations(id) on delete cascade;
alter table contract_documents add column if not exists organization_id uuid references organizations(id) on delete cascade;
alter table vendor_applications add column if not exists organization_id uuid references organizations(id) on delete cascade;

update vendors set organization_id = (select id from organizations where slug = 'demo-org') where organization_id is null;
update contracts set organization_id = (select id from organizations where slug = 'demo-org') where organization_id is null;
update contract_documents set organization_id = (select id from organizations where slug = 'demo-org') where organization_id is null;
update vendor_applications set organization_id = (select id from organizations where slug = 'demo-org') where organization_id is null;

alter table vendors alter column organization_id set not null;
alter table contracts alter column organization_id set not null;
alter table contract_documents alter column organization_id set not null;
alter table vendor_applications alter column organization_id set not null;

alter table vendors alter column organization_id set default current_org_id();
alter table contracts alter column organization_id set default current_org_id();
alter table contract_documents alter column organization_id set default current_org_id();
alter table vendor_applications alter column organization_id set default current_org_id();

create index if not exists vendors_organization_id_idx on vendors (organization_id);
create index if not exists contracts_organization_id_idx on contracts (organization_id);
create index if not exists contract_documents_organization_id_idx on contract_documents (organization_id);
create index if not exists vendor_applications_organization_id_idx on vendor_applications (organization_id);

alter table organizations enable row level security;
alter table profiles enable row level security;

-- Replace the old wide-open "anyone can do anything" demo policies.
drop policy if exists "public_all_vendors" on vendors;
drop policy if exists "public_all_contracts" on contracts;
drop policy if exists "public_all_contract_documents" on contract_documents;
drop policy if exists "public_all_vendor_applications" on vendor_applications;

create policy "org_members_manage_vendors" on vendors for all
  using (organization_id = current_org_id()) with check (organization_id = current_org_id());

create policy "org_members_manage_contracts" on contracts for all
  using (organization_id = current_org_id()) with check (organization_id = current_org_id());

create policy "org_members_manage_contract_documents" on contract_documents for all
  using (organization_id = current_org_id()) with check (organization_id = current_org_id());

-- Applications: org members review; the public can only submit new ones.
create policy "org_members_view_vendor_applications" on vendor_applications for select
  using (organization_id = current_org_id());
create policy "org_members_update_vendor_applications" on vendor_applications for update
  using (organization_id = current_org_id()) with check (organization_id = current_org_id());
create policy "org_members_delete_vendor_applications" on vendor_applications for delete
  using (organization_id = current_org_id());
create policy "public_submit_vendor_applications" on vendor_applications for insert
  with check (true);

-- Organizations: name/slug are needed to render the public /apply/[slug] page.
create policy "public_read_organizations" on organizations for select
  using (true);
create policy "authenticated_create_organization" on organizations for insert
  to authenticated
  with check (true);

-- Profiles: strictly self-service.
create policy "self_read_profile" on profiles for select
  using (id = auth.uid());
create policy "self_insert_profile" on profiles for insert
  with check (id = auth.uid());

-- Storage: only signed-in org members may upload/delete supporting documents.
drop policy if exists "public_insert_contract_documents" on storage.objects;
drop policy if exists "public_delete_contract_documents" on storage.objects;

create policy "authenticated_insert_contract_documents" on storage.objects for insert
  to authenticated
  with check (bucket_id = 'contract-documents');
create policy "authenticated_delete_contract_documents" on storage.objects for delete
  to authenticated
  using (bucket_id = 'contract-documents');
