-- Risk Management was flagged as the weakest remaining pillar: a single manual
-- risk_tier with no breakdown by risk category, and no log of actual incidents
-- to justify (or challenge) that tier over time.

alter table vendors add column if not exists financial_risk_tier text
  check (financial_risk_tier in ('low', 'medium', 'high', 'critical'));
alter table vendors add column if not exists security_risk_tier text
  check (security_risk_tier in ('low', 'medium', 'high', 'critical'));
alter table vendors add column if not exists operational_risk_tier text
  check (operational_risk_tier in ('low', 'medium', 'high', 'critical'));

create table if not exists vendor_incidents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade default current_org_id(),
  vendor_id uuid not null references vendors(id) on delete cascade,
  title text not null,
  description text,
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  occurred_on date not null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists vendor_incidents_vendor_id_idx on vendor_incidents (vendor_id, occurred_on);
create index if not exists vendor_incidents_organization_id_idx on vendor_incidents (organization_id);

alter table vendor_incidents enable row level security;

-- Mirrors the vendors table's own RLS: any org member can read, only admin/contract_owner can write.
create policy "org_members_select_vendor_incidents" on vendor_incidents for select
  using (organization_id = current_org_id());

create policy "admins_and_owners_insert_vendor_incidents" on vendor_incidents for insert
  with check (organization_id = current_org_id() and current_user_role() in ('admin', 'contract_owner'));

create policy "admins_and_owners_update_vendor_incidents" on vendor_incidents for update
  using (organization_id = current_org_id() and current_user_role() in ('admin', 'contract_owner'))
  with check (organization_id = current_org_id());

create policy "admins_and_owners_delete_vendor_incidents" on vendor_incidents for delete
  using (organization_id = current_org_id() and current_user_role() in ('admin', 'contract_owner'));
