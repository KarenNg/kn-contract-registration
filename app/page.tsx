import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ContractStatusBadge, ExpiringBadge } from "@/components/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/format";
import { isExpiringSoon, type ContractWithVendor } from "@/lib/types";

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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-neutral-500">
          Vendors, contracts, and documents at a glance.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatCard label="Vendors" value={vendorCount ?? 0} href="/vendors" />
        <StatCard label="Contracts" value={contractCount ?? 0} href="/contracts" />
        <StatCard label="Documents on file" value={documentCount ?? 0} />
        <StatCard
          label="Expiring within 60 days"
          value={expiring.length}
          accent={expiring.length > 0}
        />
      </div>

      {expiring.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight text-amber-800">
            Expiring soon — needs a renewal decision
          </h2>
          <div className="overflow-hidden rounded-lg border border-amber-200 bg-amber-50">
            <table className="min-w-full divide-y divide-amber-200 text-sm">
              <thead className="text-left text-xs font-semibold uppercase tracking-wide text-amber-700">
                <tr>
                  <th className="px-4 py-3">Contract</th>
                  <th className="px-4 py-3">Vendor ID</th>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">End date</th>
                  <th className="px-4 py-3">Owner</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100">
                {expiring.map((contract) => (
                  <tr key={contract.id}>
                    <td className="px-4 py-3">
                      <Link href={`/contracts/${contract.id}`} className="font-medium hover:underline">
                        {contract.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-neutral-500">
                      {contract.vendors?.vendor_code ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {contract.vendors ? (
                        <Link href={`/vendors/${contract.vendors.id}`} className="hover:underline">
                          {contract.vendors.name}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">{formatDate(contract.end_date)}</td>
                    <td className="px-4 py-3">{contract.owner_name ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">All contracts</h2>
          <Link href="/contracts/new" className="text-sm font-medium text-neutral-900 hover:underline">
            + New contract
          </Link>
        </div>
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <table className="min-w-full divide-y divide-neutral-200 text-sm">
            <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3">Contract</th>
                <th className="px-4 py-3">Vendor ID</th>
                <th className="px-4 py-3">Vendor name</th>
                <th className="px-4 py-3">End date</th>
                <th className="px-4 py-3">Value</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {allContracts.map((contract) => (
                <tr key={contract.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/contracts/${contract.id}`}
                      className="font-medium text-neutral-900 hover:underline"
                    >
                      {contract.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-neutral-500">
                    {contract.vendors?.vendor_code ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {contract.vendors ? (
                      <Link href={`/vendors/${contract.vendors.id}`} className="hover:underline">
                        {contract.vendors.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    <div className="flex items-center gap-2">
                      {formatDate(contract.end_date)}
                      {contract.status === "active" && isExpiringSoon(contract.end_date) && (
                        <ExpiringBadge />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {formatCurrency(contract.value, contract.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <ContractStatusBadge status={contract.status} />
                  </td>
                </tr>
              ))}
              {allContracts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
                    No contracts yet.{" "}
                    <Link href="/contracts/new" className="underline">
                      Create one
                    </Link>
                    .
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
  accent,
}: {
  label: string;
  value: number;
  href?: string;
  accent?: boolean;
}) {
  const content = (
    <div
      className={`rounded-lg border p-5 ${
        accent ? "border-amber-200 bg-amber-50" : "border-neutral-200 bg-white"
      }`}
    >
      <p className="text-sm text-neutral-500">{label}</p>
      <p className={`mt-1 text-3xl font-semibold ${accent ? "text-amber-800" : "text-neutral-900"}`}>
        {value}
      </p>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
