-- Closes gaps: termination workflow, document versioning, alert acknowledgement,
-- and a unified contract activity/audit trail used by renewals, amendments,
-- terminations, document replacements, and status changes.

alter table contracts add column if not exists terminated_at timestamptz;
alter table contracts add column if not exists termination_reason text;
alter table contracts add column if not exists terminated_by text;
alter table contracts add column if not exists alert_acknowledged_at timestamptz;

alter table contract_documents add column if not exists superseded_at timestamptz;
alter table contract_documents add column if not exists superseded_by_id uuid references contract_documents(id) on delete set null;

create table if not exists contract_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade default current_org_id(),
  contract_id uuid not null references contracts(id) on delete cascade,
  event_type text not null check (event_type in (
    'created', 'amended', 'renewed', 'terminated', 'reactivated',
    'document_uploaded', 'document_superseded', 'status_changed', 'alert_acknowledged'
  )),
  summary text not null,
  detail text,
  actor_name text,
  created_at timestamptz not null default now()
);

create index if not exists contract_events_contract_id_idx on contract_events (contract_id, created_at desc);
create index if not exists contract_events_organization_id_idx on contract_events (organization_id);

alter table contract_events enable row level security;

create policy "org_members_manage_contract_events" on contract_events for all
  using (organization_id = current_org_id()) with check (organization_id = current_org_id());
