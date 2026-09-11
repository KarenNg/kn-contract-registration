import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { sweepExpiredContracts } from "@/lib/contracts";
import { canManageContract } from "@/lib/permissions";
import { ContractStatusBadge, ExpiringBadge } from "@/components/StatusBadge";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { acknowledgeAlert } from "@/app/(app)/alerts/actions";
import { acknowledgeDocumentExpiry } from "@/app/(app)/contracts/documents-actions";
import { formatDate } from "@/lib/format";
import {
  isExpiringSoon,
  isInForce,
  isPastEndDate,
  type ContractDocumentWithContract,
  type ContractWithVendor,
} from "@/lib/types";
import { code, panel, panelHeader, primaryButton, secondaryButton, severityStripe, tableWrap, td, th, tr } from "@/components/theme";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  await sweepExpiredContracts(supabase);

  const [{ data: contracts }, { data: documents }] = await Promise.all([
    supabase
      .from("contracts")
      .select("*, vendors(id, vendor_code, name)")
      .in("status", ["active", "renewed", "expired"])
      .order("end_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("contract_documents")
      .select("*, contracts(id, contract_code, title, vendor_id, owner_user_id, vendors(id, vendor_code, name))")
      .not("expires_on", "is", null)
      .is("superseded_at", null)
      .order("expires_on", { ascending: true }),
  ]);

  const allContracts = (contracts as ContractWithVendor[] | null) ?? [];
  const needsAttention = allContracts.filter(
    (c) => (c.status === "expired" || (isInForce(c.status) && isExpiringSoon(c.end_date))) && !c.alert_acknowledged_at,
  );
  const acknowledged = allContracts.filter(
    (c) => (c.status === "expired" || (isInForce(c.status) && isExpiringSoon(c.end_date))) && c.alert_acknowledged_at,
  );

  const allDocuments = (documents as ContractDocumentWithContract[] | null) ?? [];
  const documentsNeedingAttention = allDocuments.filter(
    (d) => (isPastEndDate(d.expires_on) || isExpiringSoon(d.expires_on)) && !d.expiry_acknowledged_at,
  );
  const acknowledgedDocuments = allDocuments.filter(
    (d) => (isPastEndDate(d.expires_on) || isExpiringSoon(d.expires_on)) && d.expiry_acknowledged_at,
  );

  const byOwner = new Map<string, ContractWithVendor[]>();
  for (const contract of needsAttention) {
    const owner = contract.owner_name?.trim() || "Unassigned";
    byOwner.set(owner, [...(byOwner.get(owner) ?? []), contract]);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-sm font-bold uppercase tracking-wider text-slate-500">Alerts</h1>
        <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
          Every contract expiring within 60 days or already expired, by owner.
        </p>
        <p className="mt-1 text-sm text-slate-500">
          This is what used to mean manually scanning a spreadsheet. Renew, terminate, or acknowledge each one below.
        </p>
      </div>

      {needsAttention.length === 0 && (
        <div className={`${panel} p-8 text-center text-slate-500`}>Nothing needs a decision right now.</div>
      )}

      {[...byOwner.entries()].map(([owner, ownerContracts]) => (
        <section key={owner} className="space-y-3">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {owner} ({ownerContracts.length})
          </h2>
          <div className={tableWrap}>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th className={th}>Contract</th>
                    <th className={th}>Vendor</th>
                    <th className={th}>End date</th>
                    <th className={th}>Status</th>
                    <th className={th} />
                  </tr>
                </thead>
                <tbody>
                  {ownerContracts.map((contract) => {
                    const acknowledge = acknowledgeAlert.bind(null, contract.id);
                    const soon = isInForce(contract.status) && isExpiringSoon(contract.end_date);
                    return (
                      <tr key={contract.id} className={`${tr} ${severityStripe(contract.status, soon)}`}>
                        <td className="px-4 py-3">
                          <Link href={`/contracts/${contract.id}`} className="font-medium text-slate-900 hover:text-blue-700">
                            {contract.title}
                          </Link>
                          <span className={`ml-2 ${code}`}>{contract.contract_code}</span>
                        </td>
                        <td className={td}>
                          {contract.vendors ? (
                            <Link href={`/vendors/${contract.vendors.id}`} className="hover:text-blue-700">
                              {contract.vendors.name}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className={td}>
                          <div className="flex items-center gap-2">
                            {formatDate(contract.end_date)}
                            {soon && <ExpiringBadge />}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <ContractStatusBadge status={contract.status} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
                            <Link href={`/contracts/${contract.id}`} className={`${secondaryButton} text-center`}>
                              Decide
                            </Link>
                            {canManageContract(profile.role, profile.userId, contract.owner_user_id) && (
                              <form action={acknowledge}>
                                <ConfirmSubmitButton
                                  confirmMessage="Acknowledge this alert? It'll drop off this list until the situation changes."
                                  className={`${primaryButton} w-full`}
                                >
                                  Acknowledge
                                </ConfirmSubmitButton>
                              </form>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ))}

      <section className="space-y-3">
        <div>
          <h2 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Compliance &amp; insurance documents
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Insurance certificates and other supporting documents that expire on their own schedule,
            independent of the contract&apos;s end date.
          </p>
        </div>

        {documentsNeedingAttention.length === 0 && (
          <div className={`${panel} p-8 text-center text-slate-500`}>No document expirations need attention.</div>
        )}

        {documentsNeedingAttention.length > 0 && (
          <div className={tableWrap}>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th className={th}>Document</th>
                    <th className={th}>Contract</th>
                    <th className={th}>Vendor</th>
                    <th className={th}>Expires</th>
                    <th className={th} />
                  </tr>
                </thead>
                <tbody>
                  {documentsNeedingAttention.map((doc) => {
                    const contract = doc.contracts;
                    const expired = isPastEndDate(doc.expires_on);
                    const acknowledge = contract ? acknowledgeDocumentExpiry.bind(null, contract.id, doc.id) : null;
                    return (
                      <tr key={doc.id} className={`${tr} ${expired ? "bg-red-50" : "bg-orange-50"}`}>
                        <td className="px-4 py-3">
                          <span className="font-medium text-slate-900 capitalize">
                            {doc.document_type.replace(/_/g, " ")}
                          </span>
                          <span className="ml-2 text-slate-500">{doc.file_name}</span>
                        </td>
                        <td className={td}>
                          {contract ? (
                            <Link href={`/contracts/${contract.id}`} className="font-medium text-slate-900 hover:text-blue-700">
                              {contract.title}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className={td}>
                          {contract?.vendors ? (
                            <Link href={`/vendors/${contract.vendors.id}`} className="hover:text-blue-700">
                              {contract.vendors.name}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className={td}>
                          <div className="flex items-center gap-2">
                            {formatDate(doc.expires_on)}
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white ${
                                expired ? "bg-red-600" : "bg-orange-500"
                              }`}
                            >
                              {expired ? "⚠ Expired" : "⚠ Expiring soon"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {contract && acknowledge && (
                            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
                              <Link href={`/contracts/${contract.id}`} className={`${secondaryButton} text-center`}>
                                Replace
                              </Link>
                              {canManageContract(profile.role, profile.userId, contract.owner_user_id) && (
                                <form action={acknowledge}>
                                  <ConfirmSubmitButton
                                    confirmMessage="Acknowledge this document's expiry alert? It'll drop off this list until the situation changes."
                                    className={`${primaryButton} w-full`}
                                  >
                                    Acknowledge
                                  </ConfirmSubmitButton>
                                </form>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {acknowledgedDocuments.length > 0 && (
          <details className={`p-6 ${panel}`}>
            <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Acknowledged ({acknowledgedDocuments.length})
            </summary>
            <div className={`${panelHeader} mt-4 rounded-md`}>
              <ul className="divide-y divide-slate-200">
                {acknowledgedDocuments.map((doc) => (
                  <li key={doc.id} className="flex flex-col gap-0.5 px-2 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <span className="font-medium text-slate-900">{doc.file_name}</span>
                    <span className="text-slate-500">{formatDate(doc.expires_on)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </details>
        )}
      </section>

      {acknowledged.length > 0 && (
        <details className={`p-6 ${panel}`}>
          <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Acknowledged ({acknowledged.length})
          </summary>
          <div className={`${panelHeader} mt-4 rounded-md`}>
            <ul className="divide-y divide-slate-200">
              {acknowledged.map((contract) => (
                <li key={contract.id} className="flex flex-col gap-0.5 px-2 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <Link href={`/contracts/${contract.id}`} className="font-medium text-slate-900 hover:text-blue-700">
                    {contract.title}
                  </Link>
                  <span className="text-slate-500">{formatDate(contract.end_date)}</span>
                </li>
              ))}
            </ul>
          </div>
        </details>
      )}
    </div>
  );
}
