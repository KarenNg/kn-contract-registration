-- Spend/financial governance was the weakest Gartner-VMO pillar: contract.value
-- tracked the budgeted amount but nothing recorded what was actually paid, so
-- there was no spend-vs-budget visibility and no way to see a contract running
-- over its contracted value.

create table if not exists contract_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade default current_org_id(),
  contract_id uuid not null references contracts(id) on delete cascade,
  obligation_id uuid references contract_obligations(id) on delete set null,
  amount numeric(14, 2) not null check (amount > 0),
  payment_date date not null,
  reference text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists contract_payments_contract_id_idx on contract_payments (contract_id, payment_date);
create index if not exists contract_payments_organization_id_idx on contract_payments (organization_id);

alter table contract_payments enable row level security;

create policy "org_members_select_contract_payments" on contract_payments for select
  using (organization_id = current_org_id());

create policy "admins_and_scoped_owners_insert_contract_payments" on contract_payments for insert
  with check (
    organization_id = current_org_id()
    and (
      current_user_role() = 'admin'
      or (current_user_role() = 'contract_owner' and exists (
        select 1 from contracts c where c.id = contract_payments.contract_id and c.owner_user_id = auth.uid()
      ))
    )
  );

create policy "admins_and_scoped_owners_update_contract_payments" on contract_payments for update
  using (
    organization_id = current_org_id()
    and (
      current_user_role() = 'admin'
      or (current_user_role() = 'contract_owner' and exists (
        select 1 from contracts c where c.id = contract_payments.contract_id and c.owner_user_id = auth.uid()
      ))
    )
  )
  with check (organization_id = current_org_id());

create policy "admins_and_scoped_owners_delete_contract_payments" on contract_payments for delete
  using (
    organization_id = current_org_id()
    and (
      current_user_role() = 'admin'
      or (current_user_role() = 'contract_owner' and exists (
        select 1 from contracts c where c.id = contract_payments.contract_id and c.owner_user_id = auth.uid()
      ))
    )
  );

alter table contract_events drop constraint if exists contract_events_event_type_check;
alter table contract_events add constraint contract_events_event_type_check check (event_type in (
  'created', 'amended', 'renewed', 'terminated', 'reactivated',
  'document_uploaded', 'document_superseded', 'status_changed', 'alert_acknowledged',
  'document_expiry_acknowledged', 'obligation_added', 'obligation_completed', 'payment_recorded'
));
