-- Three follow-ups from a Gartner-VMO gap review:
--
-- 1. A second vendor segmentation axis (strategic importance), so risk_tier
--    isn't the only lens — a critical-but-low-spend vendor and a
--    high-spend-but-commodity vendor need different governance.
-- 2. A minimal manual performance rating — not SLA automation, just enough
--    to stop Performance Management being a total zero.
-- 3. Contract obligations (deliverables / payment milestones) — the
--    lifecycle so far only covers renewal/termination, not what's actually
--    due along the way.

alter table vendors add column if not exists strategic_tier text
  check (strategic_tier in ('strategic', 'tactical', 'commodity'));
alter table vendors add column if not exists performance_rating text
  check (performance_rating in ('excellent', 'good', 'fair', 'poor'));
alter table vendors add column if not exists last_performance_review_at date;

create table if not exists contract_obligations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade default current_org_id(),
  contract_id uuid not null references contracts(id) on delete cascade,
  title text not null,
  due_date date not null,
  amount numeric(14, 2),
  notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists contract_obligations_contract_id_idx on contract_obligations (contract_id, due_date);
create index if not exists contract_obligations_organization_id_idx on contract_obligations (organization_id);

alter table contract_obligations enable row level security;

create policy "org_members_select_contract_obligations" on contract_obligations for select
  using (organization_id = current_org_id());

create policy "admins_and_scoped_owners_insert_contract_obligations" on contract_obligations for insert
  with check (
    organization_id = current_org_id()
    and (
      current_user_role() = 'admin'
      or (current_user_role() = 'contract_owner' and exists (
        select 1 from contracts c where c.id = contract_obligations.contract_id and c.owner_user_id = auth.uid()
      ))
    )
  );

create policy "admins_and_scoped_owners_update_contract_obligations" on contract_obligations for update
  using (
    organization_id = current_org_id()
    and (
      current_user_role() = 'admin'
      or (current_user_role() = 'contract_owner' and exists (
        select 1 from contracts c where c.id = contract_obligations.contract_id and c.owner_user_id = auth.uid()
      ))
    )
  )
  with check (organization_id = current_org_id());

create policy "admins_and_scoped_owners_delete_contract_obligations" on contract_obligations for delete
  using (
    organization_id = current_org_id()
    and (
      current_user_role() = 'admin'
      or (current_user_role() = 'contract_owner' and exists (
        select 1 from contracts c where c.id = contract_obligations.contract_id and c.owner_user_id = auth.uid()
      ))
    )
  );

alter table contract_events drop constraint if exists contract_events_event_type_check;
alter table contract_events add constraint contract_events_event_type_check check (event_type in (
  'created', 'amended', 'renewed', 'terminated', 'reactivated',
  'document_uploaded', 'document_superseded', 'status_changed', 'alert_acknowledged',
  'document_expiry_acknowledged', 'obligation_added', 'obligation_completed'
));
