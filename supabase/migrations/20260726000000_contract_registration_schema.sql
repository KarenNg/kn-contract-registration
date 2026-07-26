-- Contract Registration schema: vendors -> contracts -> contract_documents
create extension if not exists pgcrypto;

create sequence if not exists vendor_code_seq;
create sequence if not exists contract_code_seq;

create table if not exists vendors (
  id uuid primary key default gen_random_uuid(),
  vendor_code text not null unique default ('V-' || lpad(nextval('vendor_code_seq')::text, 4, '0')),
  name text not null,
  contact_name text,
  contact_email text,
  contact_phone text,
  address text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists contracts (
  id uuid primary key default gen_random_uuid(),
  contract_code text not null unique default ('C-' || lpad(nextval('contract_code_seq')::text, 4, '0')),
  vendor_id uuid not null references vendors(id) on delete restrict,
  title text not null,
  contract_type text,
  description text,
  start_date date,
  end_date date,
  value numeric(14, 2),
  currency text not null default 'USD',
  status text not null default 'draft' check (status in ('draft', 'active', 'renewed', 'terminated', 'expired')),
  owner_name text,
  auto_renew boolean not null default false,
  renewal_terms text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists contract_documents (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_size bigint,
  mime_type text,
  document_type text not null default 'other' check (
    document_type in ('signed_contract', 'amendment', 'sow', 'invoice', 'insurance_certificate', 'other')
  ),
  notes text,
  uploaded_at timestamptz not null default now()
);

create index if not exists contracts_vendor_id_idx on contracts (vendor_id);
create index if not exists contracts_end_date_idx on contracts (end_date);
create index if not exists contract_documents_contract_id_idx on contract_documents (contract_id);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists vendors_set_updated_at on vendors;
create trigger vendors_set_updated_at before update on vendors
for each row execute function set_updated_at();

drop trigger if exists contracts_set_updated_at on contracts;
create trigger contracts_set_updated_at before update on contracts
for each row execute function set_updated_at();

-- Demo-first: no login wall in v1, so RLS is open. Lock down in a later sprint.
alter table vendors enable row level security;
alter table contracts enable row level security;
alter table contract_documents enable row level security;

drop policy if exists "public_all_vendors" on vendors;
create policy "public_all_vendors" on vendors for all using (true) with check (true);

drop policy if exists "public_all_contracts" on contracts;
create policy "public_all_contracts" on contracts for all using (true) with check (true);

drop policy if exists "public_all_contract_documents" on contract_documents;
create policy "public_all_contract_documents" on contract_documents for all using (true) with check (true);

-- Storage bucket for contract supporting documents
insert into storage.buckets (id, name, public)
values ('contract-documents', 'contract-documents', true)
on conflict (id) do nothing;

drop policy if exists "public_read_contract_documents" on storage.objects;
create policy "public_read_contract_documents" on storage.objects for select
using (bucket_id = 'contract-documents');

drop policy if exists "public_insert_contract_documents" on storage.objects;
create policy "public_insert_contract_documents" on storage.objects for insert
with check (bucket_id = 'contract-documents');

drop policy if exists "public_delete_contract_documents" on storage.objects;
create policy "public_delete_contract_documents" on storage.objects for delete
using (bucket_id = 'contract-documents');

-- Seed data so the app is demoable immediately
insert into vendors (name, contact_name, contact_email, contact_phone, address, status) values
  ('Acme Office Supplies', 'Jane Doe', 'jane@acmeoffice.com', '555-0101', '100 Main St, Springfield', 'active'),
  ('Globex IT Services', 'Bob Smith', 'bob@globexit.com', '555-0102', '200 Tech Blvd, Austin', 'active'),
  ('Initech Facilities', 'Carla Reyes', 'carla@initech.com', '555-0103', '300 Industrial Way, Denver', 'active'),
  ('Umbrella Consulting', 'Dan Lee', 'dan@umbrellaconsulting.com', '555-0104', '400 Corporate Dr, Chicago', 'inactive')
on conflict do nothing;

insert into contracts (vendor_id, title, contract_type, description, start_date, end_date, value, status, owner_name, auto_renew)
select v.id, c.title, c.contract_type, c.description, c.start_date::date, c.end_date::date, c.value, c.status, c.owner_name, c.auto_renew
from (values
  ('Acme Office Supplies', 'Office Supplies Master Agreement', 'Supply', 'Recurring office supplies order agreement', '2025-01-01', '2026-08-15', 45000.00, 'active', 'Sarah Connor', true),
  ('Globex IT Services', 'Managed IT Support', 'Service', 'Helpdesk and infrastructure support', '2025-06-01', '2026-09-01', 120000.00, 'active', 'John Matrix', false),
  ('Globex IT Services', 'Cloud Hosting Agreement', 'Service', 'Production cloud hosting', '2024-01-01', '2026-08-05', 96000.00, 'active', 'John Matrix', true),
  ('Initech Facilities', 'Building Maintenance Contract', 'Facilities', 'HVAC and janitorial services', '2023-03-01', '2026-03-01', 60000.00, 'expired', 'Michael Bolton', false),
  ('Initech Facilities', 'Security Services Agreement', 'Facilities', 'On-site security staffing', '2025-04-01', '2027-04-01', 84000.00, 'active', 'Milton Waddams', true),
  ('Umbrella Consulting', 'Strategic Advisory Retainer', 'Consulting', 'Quarterly strategy consulting', '2024-01-01', '2025-01-01', 30000.00, 'terminated', 'Alice Marcus', false)
) as c(vendor_name, title, contract_type, description, start_date, end_date, value, status, owner_name, auto_renew)
join vendors v on v.name = c.vendor_name
on conflict do nothing;
