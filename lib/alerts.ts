import type { SupabaseClient } from "@supabase/supabase-js";
import { isExpiringSoon, isInForce, isPastEndDate, type ContractStatus } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";

interface AlertContract {
  id: string;
  contract_code: string;
  title: string;
  end_date: string | null;
  status: ContractStatus;
  value: number | null;
  currency: string;
  owner_user_id: string | null;
  vendors: { name: string } | null;
}

interface AlertDocument {
  id: string;
  file_name: string;
  document_type: string;
  expires_on: string | null;
  contracts: { id: string; title: string; owner_user_id: string | null } | null;
}

interface AlertVendor {
  id: string;
  name: string;
  compliance_doc_expires_on: string | null;
}

export interface OrgAlerts {
  contracts: AlertContract[];
  documents: AlertDocument[];
  vendors: AlertVendor[];
}

/** Everything in this org that's expiring/expired and hasn't been acknowledged. */
export async function getOrgAlerts(supabase: SupabaseClient, organizationId: string): Promise<OrgAlerts> {
  const [{ data: contracts }, { data: documents }, { data: vendors }] = await Promise.all([
    supabase
      .from("contracts")
      .select("id, contract_code, title, end_date, status, value, currency, owner_user_id, vendors(name)")
      .eq("organization_id", organizationId)
      .in("status", ["active", "renewed", "expired"])
      .is("alert_acknowledged_at", null),
    supabase
      .from("contract_documents")
      .select("id, file_name, document_type, expires_on, contracts(id, title, owner_user_id)")
      .eq("organization_id", organizationId)
      .not("expires_on", "is", null)
      .is("superseded_at", null)
      .is("expiry_acknowledged_at", null),
    supabase
      .from("vendors")
      .select("id, name, compliance_doc_expires_on")
      .eq("organization_id", organizationId)
      .not("compliance_doc_expires_on", "is", null)
      .is("compliance_doc_acknowledged_at", null),
  ]);

  const relevantContracts = ((contracts as unknown as AlertContract[]) ?? []).filter(
    (c) => c.status === "expired" || (isInForce(c.status) && isExpiringSoon(c.end_date)),
  );
  const relevantDocuments = ((documents as unknown as AlertDocument[]) ?? []).filter(
    (d) => isPastEndDate(d.expires_on) || isExpiringSoon(d.expires_on),
  );
  const relevantVendors = ((vendors as unknown as AlertVendor[]) ?? []).filter(
    (v) => isPastEndDate(v.compliance_doc_expires_on) || isExpiringSoon(v.compliance_doc_expires_on),
  );

  return { contracts: relevantContracts, documents: relevantDocuments, vendors: relevantVendors };
}

/** A contract_owner's digest only covers what's assigned to them — vendor compliance risk stays admin/management-only. */
export function scopeAlertsToOwner(alerts: OrgAlerts, userId: string): OrgAlerts {
  return {
    contracts: alerts.contracts.filter((c) => c.owner_user_id === userId),
    documents: alerts.documents.filter((d) => d.contracts?.owner_user_id === userId),
    vendors: [],
  };
}

export function alertsAreEmpty(alerts: OrgAlerts): boolean {
  return alerts.contracts.length === 0 && alerts.documents.length === 0 && alerts.vendors.length === 0;
}

export function renderDigestEmail(organizationName: string, alerts: OrgAlerts): { subject: string; html: string } {
  const total = alerts.contracts.length + alerts.documents.length + alerts.vendors.length;
  const subject = `${organizationName}: ${total} item${total === 1 ? "" : "s"} need${total === 1 ? "s" : ""} attention`;

  const row = (label: string, detail: string) =>
    `<li style="padding:6px 0;border-bottom:1px solid #e5e7eb"><strong>${label}</strong><br><span style="color:#64748b;font-size:13px">${detail}</span></li>`;

  const contractsHtml = alerts.contracts
    .map((c) =>
      row(
        `${c.title} (${c.contract_code})`,
        `${c.vendors?.name ?? "—"} · ends ${formatDate(c.end_date)} · ${formatCurrency(c.value, c.currency)} · status: ${c.status}`,
      ),
    )
    .join("");

  const documentsHtml = alerts.documents
    .map((d) =>
      row(
        `${d.file_name} (${d.document_type.replace(/_/g, " ")})`,
        `${d.contracts?.title ?? "—"} · expires ${formatDate(d.expires_on)}`,
      ),
    )
    .join("");

  const vendorsHtml = alerts.vendors
    .map((v) => row(v.name, `Compliance document expires ${formatDate(v.compliance_doc_expires_on)}`))
    .join("");

  const section = (title: string, itemsHtml: string) =>
    itemsHtml
      ? `<h3 style="font-size:13px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;margin:20px 0 4px">${title}</h3><ul style="list-style:none;padding:0;margin:0">${itemsHtml}</ul>`
      : "";

  const html = `
    <div style="font-family:sans-serif;color:#0f172a;max-width:560px">
      <p style="font-size:15px">${organizationName} has <strong>${total}</strong> item${total === 1 ? "" : "s"} expiring, expired, or otherwise needing a decision.</p>
      ${section("Contracts", contractsHtml)}
      ${section("Compliance &amp; insurance documents", documentsHtml)}
      ${section("Vendor compliance documents", vendorsHtml)}
      <p style="margin-top:24px;font-size:13px;color:#94a3b8">Open ContractOps to renew, terminate, or acknowledge each one.</p>
    </div>
  `;

  return { subject, html };
}
