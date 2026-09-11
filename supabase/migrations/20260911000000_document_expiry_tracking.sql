-- Expiration tracking for supporting documents (insurance certificates and other
-- compliance paperwork expire on their own schedule, independent of the contract's
-- own end_date) plus an acknowledgement trail mirroring contract alerts.

alter table contract_documents add column if not exists expires_on date;
alter table contract_documents add column if not exists expiry_acknowledged_at timestamptz;

create index if not exists contract_documents_expires_on_idx
  on contract_documents (expires_on)
  where expires_on is not null and superseded_at is null;

alter table contract_events drop constraint if exists contract_events_event_type_check;
alter table contract_events add constraint contract_events_event_type_check check (event_type in (
  'created', 'amended', 'renewed', 'terminated', 'reactivated',
  'document_uploaded', 'document_superseded', 'status_changed', 'alert_acknowledged',
  'document_expiry_acknowledged'
));
