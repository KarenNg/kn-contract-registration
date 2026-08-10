-- Customer application intake: prospective vendors ("customers") submit a small
-- application; admins review it and, on approval, it becomes a real vendor + contract.
create sequence if not exists vendor_application_code_seq;

create table if not exists vendor_applications (
  id uuid primary key default gen_random_uuid(),
  application_code text not null unique default ('APP-' || lpad(nextval('vendor_application_code_seq')::text, 4, '0')),

  -- applicant / company info (becomes the Vendor on approval)
  company_name text not null,
  contact_name text,
  contact_email text,
  contact_phone text,
  address text,

  -- requested contract (becomes the Contract on approval)
  requested_contract_title text not null,
  requested_contract_type text,
  requested_value numeric(14, 2),
  requested_start_date date,
  applicant_notes text,

  -- review workflow
  status text not null default 'submitted' check (
    status in ('submitted', 'under_review', 'approved', 'rejected')
  ),
  reviewer_name text,
  review_notes text,
  decided_at timestamptz,

  -- set once approved
  vendor_id uuid references vendors(id) on delete set null,
  contract_id uuid references contracts(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vendor_applications_status_idx on vendor_applications (status);

drop trigger if exists vendor_applications_set_updated_at on vendor_applications;
create trigger vendor_applications_set_updated_at before update on vendor_applications
for each row execute function set_updated_at();

-- Demo-first: no login wall in v1, so RLS is open. Lock down in a later sprint.
alter table vendor_applications enable row level security;

drop policy if exists "public_all_vendor_applications" on vendor_applications;
create policy "public_all_vendor_applications" on vendor_applications for all using (true) with check (true);

-- Seed a couple of demo applications so the review queue is demoable immediately
insert into vendor_applications (
  company_name, contact_name, contact_email, contact_phone, address,
  requested_contract_title, requested_contract_type, requested_value, requested_start_date,
  applicant_notes, status
) values
  (
    'Stark Logistics', 'Pepper Potts', 'pepper@starklogistics.com', '555-0201', '500 Freight Ave, Newark',
    'Freight Forwarding Agreement', 'Logistics', 72000.00, '2026-09-01',
    'Looking for a 12-month freight agreement covering the East Coast distribution centers.',
    'submitted'
  ),
  (
    'Wayne Analytics', 'Lucius Fox', 'lucius@wayneanalytics.com', '555-0202', '1 Wayne Tower, Gotham',
    'Data Analytics Platform License', 'Software', 54000.00, '2026-10-01',
    'Need a platform license plus onboarding support for our reporting team.',
    'under_review'
  )
on conflict do nothing;
