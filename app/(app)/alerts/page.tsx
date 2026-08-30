import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { sweepExpiredContracts } from "@/lib/contracts";
import { ContractStatusBadge, ExpiringBadge } from "@/components/StatusBadge";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { acknowledgeAlert } from "@/app/(app)/alerts/actions";
import { formatDate } from "@/lib/format";
import { isExpiringSoon, isInForce, type ContractWithVendor } from "@/lib/types";
import { code, panel, panelHeader, primaryButton, secondaryButton, severityStripe, tableWrap, td, th, tr } from "@/components/theme";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const supabase = await createClient();
  await sweepExpiredContracts(supabase);

  const { data: contracts } = await supabase
    .from("contracts")
    .select("*, vendors(id, vendor_code, name)")
    .in("status", ["active", "renewed", "expired"])
    .order("end_date", { ascending: true, nullsFirst: false });

  const allContracts = (contracts as ContractWithVendor[] | null) ?? [];
  const needsAttention = allContracts.filter(
    (c) => (c.status === "expired" || (isInForce(c.status) && isExpiringSoon(c.end_date))) && !c.alert_acknowledged_at,
  );
  const acknowledged = allContracts.filter(
    (c) => (c.status === "expired" || (isInForce(c.status) && isExpiringSoon(c.end_date))) && c.alert_acknowledged_at,
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
                            <form action={acknowledge}>
                              <ConfirmSubmitButton
                                confirmMessage="Acknowledge this alert? It'll drop off this list until the situation changes."
                                className={`${primaryButton} w-full`}
                              >
                                Acknowledge
                              </ConfirmSubmitButton>
                            </form>
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
