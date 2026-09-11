-- Lightweight vendor risk management: a manually-set risk tier, when the
-- vendor was last reviewed, and the vendor's own compliance document expiry
-- (e.g. a master certificate of insurance, W-9, sanctions screening —
-- something tied to the vendor relationship itself, not one specific
-- contract). Not full ESG/financial scoring, but closes the biggest gap
-- between this app and a real vendor risk register.

alter table vendors add column if not exists risk_tier text
  check (risk_tier in ('low', 'medium', 'high', 'critical'));
alter table vendors add column if not exists last_risk_review_at date;
alter table vendors add column if not exists compliance_doc_expires_on date;
alter table vendors add column if not exists compliance_doc_acknowledged_at timestamptz;

create index if not exists vendors_compliance_doc_expires_on_idx
  on vendors (compliance_doc_expires_on)
  where compliance_doc_expires_on is not null;
