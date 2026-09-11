import type { SupabaseClient } from "@supabase/supabase-js";
import { isExpiringSoon, isInForce, isPastEndDate, type ContractStatus, type RiskTier } from "@/lib/types";
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

interface AlertObligation {
  id: string;
  title: string;
  due_date: string;
  amount: number | null;
  contracts: { id: string; title: string; currency: string; owner_user_id: string | null } | null;
}

interface AlertOverspentContract {
  id: string;
  contract_code: string;
  title: string;
  value: number;
  currency: string;
  owner_user_id: string | null;
  vendors: { name: string } | null;
  totalPaid: number;
}

interface AlertIncident {
  id: string;
  title: string;
  severity: RiskTier;
  occurred_on: string;
  vendors: { id: string; name: string } | null;
}

export interface OrgAlerts {
  contracts: AlertContract[];
  documents: AlertDocument[];
  vendors: AlertVendor[];
  obligations: AlertObligation[];
  overspentContracts: AlertOverspentContract[];
  openIncidents: AlertIncident[];
}

/** Everything in this org that's expiring/expired/due and hasn't been acknowledged or completed. */
export async function getOrgAlerts(supabase: SupabaseClient, organizationId: string): Promise<OrgAlerts> {
  const [
    { data: contracts },
    { data: documents },
    { data: vendors },
    { data: obligations },
    { data: contractsWithPayments },
    { data: incidents },
  ] = await Promise.all([
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
    supabase
      .from("contract_obligations")
      .select("id, title, due_date, amount, contracts(id, title, currency, owner_user_id)")
      .eq("organization_id", organizationId)
      .is("completed_at", null),
    supabase
      .from("contracts")
      .select("id, contract_code, title, value, currency, owner_user_id, vendors(name), contract_payments(amount)")
      .eq("organization_id", organizationId)
      .not("value", "is", null),
    supabase
      .from("vendor_incidents")
      .select("id, title, severity, occurred_on, vendors(id, name)")
      .eq("organization_id", organizationId)
      .in("severity", ["high", "critical"])
      .is("resolved_at", null),
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
  const relevantObligations = ((obligations as unknown as AlertObligation[]) ?? []).filter(
    (o) => isPastEndDate(o.due_date) || isExpiringSoon(o.due_date, 14),
  );

  interface RawContractWithPayments {
    id: string;
    contract_code: string;
    title: string;
    value: number;
    currency: string;
    owner_user_id: string | null;
    vendors: { name: string } | null;
    contract_payments: { amount: number }[] | null;
  }
  const relevantOverspentContracts = ((contractsWithPayments as unknown as RawContractWithPayments[]) ?? [])
    .map((c) => ({
      id: c.id,
      contract_code: c.contract_code,
      title: c.title,
      value: c.value,
      currency: c.currency,
      owner_user_id: c.owner_user_id,
      vendors: c.vendors,
      totalPaid: (c.contract_payments ?? []).reduce((sum, p) => sum + p.amount, 0),
    }))
    .filter((c) => c.totalPaid > c.value);

  const relevantOpenIncidents = (incidents as unknown as AlertIncident[]) ?? [];

  return {
    contracts: relevantContracts,
    documents: relevantDocuments,
    vendors: relevantVendors,
    obligations: relevantObligations,
    overspentContracts: relevantOverspentContracts,
    openIncidents: relevantOpenIncidents,
  };
}

/** A contract_owner's digest only covers what's assigned to them — vendor compliance risk stays admin/management-only. */
export function scopeAlertsToOwner(alerts: OrgAlerts, userId: string): OrgAlerts {
  return {
    contracts: alerts.contracts.filter((c) => c.owner_user_id === userId),
    documents: alerts.documents.filter((d) => d.contracts?.owner_user_id === userId),
    vendors: [],
    obligations: alerts.obligations.filter((o) => o.contracts?.owner_user_id === userId),
    overspentContracts: alerts.overspentContracts.filter((c) => c.owner_user_id === userId),
    openIncidents: [],
  };
}

export function alertsAreEmpty(alerts: OrgAlerts): boolean {
  return (
    alerts.contracts.length === 0 &&
    alerts.documents.length === 0 &&
    alerts.vendors.length === 0 &&
    alerts.obligations.length === 0 &&
    alerts.overspentContracts.length === 0 &&
    alerts.openIncidents.length === 0
  );
}

export function renderDigestEmail(organizationName: string, alerts: OrgAlerts): { subject: string; html: string } {
  const total =
    alerts.contracts.length +
    alerts.documents.length +
    alerts.vendors.length +
    alerts.obligations.length +
    alerts.overspentContracts.length +
    alerts.openIncidents.length;
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

  const obligationsHtml = alerts.obligations
    .map((o) =>
      row(
        `${o.title}${o.contracts ? ` (${o.contracts.title})` : ""}`,
        `due ${formatDate(o.due_date)}${o.amount != null && o.contracts ? ` · ${formatCurrency(o.amount, o.contracts.currency)}` : ""}`,
      ),
    )
    .join("");

  const overspentHtml = alerts.overspentContracts
    .map((c) =>
      row(
        `${c.title} (${c.contract_code})`,
        `${c.vendors?.name ?? "—"} · budgeted ${formatCurrency(c.value, c.currency)} · paid ${formatCurrency(c.totalPaid, c.currency)}`,
      ),
    )
    .join("");

  const incidentsHtml = alerts.openIncidents
    .map((i) => row(`${i.title}${i.vendors ? ` (${i.vendors.name})` : ""}`, `${i.severity} severity · occurred ${formatDate(i.occurred_on)}`))
    .join("");

  const section = (title: string, itemsHtml: string) =>
    itemsHtml
      ? `<h3 style="font-size:13px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;margin:20px 0 4px">${title}</h3><ul style="list-style:none;padding:0;margin:0">${itemsHtml}</ul>`
      : "";

  const html = `
    <div style="font-family:sans-serif;color:#0f172a;max-width:560px">
      <p style="font-size:15px">${organizationName} has <strong>${total}</strong> item${total === 1 ? "" : "s"} expiring, expired, due, or otherwise needing a decision.</p>
      ${section("Contracts", contractsHtml)}
      ${section("Compliance &amp; insurance documents", documentsHtml)}
      ${section("Vendor compliance documents", vendorsHtml)}
      ${section("Obligations &amp; milestones", obligationsHtml)}
      ${section("Budget variance", overspentHtml)}
      ${section("Vendor risk incidents", incidentsHtml)}
      <p style="margin-top:24px;font-size:13px;color:#94a3b8">Open ContractOps to renew, terminate, or acknowledge each one.</p>
    </div>
  `;

  return { subject, html };
}
