import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ContractStatusBadge, ExpiringBadge } from "@/components/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/format";
import { isExpiringSoon, type ContractWithVendor } from "@/lib/types";
import { code, panel, panelHeader, severityStripe, tableWrap, td, th, tr } from "@/components/theme";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ count: vendorCount }, { count: contractCount }, { count: documentCount }, { data: contracts }] =
    await Promise.all([
      supabase.from("vendors").select("*", { count: "exact", head: true }),
      supabase.from("contracts").select("*", { count: "exact", head: true }),
      supabase.from("contract_documents").select("*", { count: "exact", head: true }),
      supabase
        .from("contracts")
        .select("*, vendors(id, vendor_code, name)")
        .order("end_date", { ascending: true, nullsFirst: false }),
    ]);

  const allContracts = (contracts as ContractWithVendor[] | null) ?? [];
  const expiring = allContracts.filter(
    (c) => c.status === "active" && isExpiringSoon(c.end_date),
  );

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-bold uppercase tracking-wider text-slate-400">Dashboard</h1>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-100">
            Vendors, contracts, and documents at a glance.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <KpiTile label="Vendors" value={vendorCount ?? 0} href="/vendors" />
        <KpiTile label="Contracts" value={contractCount ?? 0} href="/contracts" />
        <KpiTile label="Documents on file" value={documentCount ?? 0} />
        <KpiTile
          label="Expiring within 60 days"
          value={expiring.length}
          warn={expiring.length > 0}
        />
      </div>

      {expiring.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-amber-400">
            ⚠ Renewal decision needed
          </h2>
          <div className={tableWrap}>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th className={th}>Contract</th>
                    <th className={th}>Vendor ID</th>
                    <th className={th}>Vendor</th>
                    <th className={th}>End date</th>
                    <th className={th}>Owner</th>
                  </tr>
                </thead>
                <tbody>
                  {expiring.map((contract) => (
                    <tr key={contract.id} className={`${tr} ${severityStripe(contract.status, true)}`}>
                      <td className="px-4 py-3">
                        <Link href={`/contracts/${contract.id}`} className="font-medium text-slate-100 hover:text-teal-400">
                          {contract.title}
                        </Link>
                      </td>
                      <td className={`px-4 py-3 ${code}`}>{contract.vendors?.vendor_code ?? "—"}</td>
                      <td className="px-4 py-3">
                        {contract.vendors ? (
                          <Link href={`/vendors/${contract.vendors.id}`} className="text-slate-300 hover:text-teal-400">
                            {contract.vendors.name}
                          </Link>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className={td}>{formatDate(contract.end_date)}</td>
                      <td className={td}>{contract.owner_name ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">All contracts</h2>
          <Link href="/contracts/new" className="text-sm font-semibold text-teal-400 hover:text-teal-300">
            + New contract
          </Link>
        </div>
        <div className={tableWrap}>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className={th}>Contract</th>
                  <th className={th}>Vendor ID</th>
                  <th className={th}>Vendor name</th>
                  <th className={th}>End date</th>
                  <th className={th}>Value</th>
                  <th className={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {allContracts.map((contract) => {
                  const soon = contract.status === "active" && isExpiringSoon(contract.end_date);
                  return (
                    <tr key={contract.id} className={`${tr} ${severityStripe(contract.status, soon)}`}>
                      <td className="px-4 py-3">
                        <Link href={`/contracts/${contract.id}`} className="font-medium text-slate-100 hover:text-teal-400">
                          {contract.title}
                        </Link>
                      </td>
                      <td className={`px-4 py-3 ${code}`}>{contract.vendors?.vendor_code ?? "—"}</td>
                      <td className="px-4 py-3">
                        {contract.vendors ? (
                          <Link href={`/vendors/${contract.vendors.id}`} className="text-slate-300 hover:text-teal-400">
                            {contract.vendors.name}
                          </Link>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className={td}>
                        <div className="flex items-center gap-2">
                          {formatDate(contract.end_date)}
                          {soon && <ExpiringBadge />}
                        </div>
                      </td>
                      <td className={td}>{formatCurrency(contract.value, contract.currency)}</td>
                      <td className="px-4 py-3">
                        <ContractStatusBadge status={contract.status} />
                      </td>
                    </tr>
                  );
                })}
                {allContracts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      No contracts yet.{" "}
                      <Link href="/contracts/new" className="text-teal-400 hover:underline">
                        Create one
                      </Link>
                      .
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

function KpiTile({
  label,
  value,
  href,
  warn,
}: {
  label: string;
  value: number;
  href?: string;
  warn?: boolean;
}) {
  const content = (
    <div
      className={`${panel} p-5 ${warn ? "border-amber-600/40 bg-gradient-to-b from-amber-500/10 to-slate-900" : ""}`}
    >
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold tabular-nums ${warn ? "text-amber-400" : "text-slate-100"}`}>
        {value}
      </p>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
