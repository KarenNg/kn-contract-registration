export type VendorStatus = "active" | "inactive";

export type ContractStatus =
  | "draft"
  | "active"
  | "renewed"
  | "terminated"
  | "expired";

export type DocumentType =
  | "signed_contract"
  | "amendment"
  | "sow"
  | "invoice"
  | "insurance_certificate"
  | "other";

export interface Vendor {
  id: string;
  vendor_code: string;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  status: VendorStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contract {
  id: string;
  contract_code: string;
  vendor_id: string;
  title: string;
  contract_type: string | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  value: number | null;
  currency: string;
  status: ContractStatus;
  owner_name: string | null;
  auto_renew: boolean;
  renewal_terms: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContractWithVendor extends Contract {
  vendors: Pick<Vendor, "id" | "vendor_code" | "name"> | null;
}

export interface ContractDocument {
  id: string;
  contract_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  document_type: DocumentType;
  notes: string | null;
  uploaded_at: string;
}

export const CONTRACT_STATUSES: ContractStatus[] = [
  "draft",
  "active",
  "renewed",
  "terminated",
  "expired",
];

export const DOCUMENT_TYPES: DocumentType[] = [
  "signed_contract",
  "amendment",
  "sow",
  "invoice",
  "insurance_certificate",
  "other",
];

export function isExpiringSoon(endDate: string | null, days = 60): boolean {
  if (!endDate) return false;
  const end = new Date(endDate);
  const now = new Date();
  const diffDays = (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= days;
}

export function isPastEndDate(endDate: string | null): boolean {
  if (!endDate) return false;
  return new Date(endDate).getTime() < new Date().getTime();
}
