import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ContractStatusBadge, ExpiringBadge } from "@/components/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/format";
import { isExpiringSoon, type ContractWithVendor } from "@/lib/types";
import { code, errorBanner, primaryButton, severityStripe, tableWrap, td, th, tr } from "@/components/theme";

export const dynamic = "force-dynamic";

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; vendor_id?: string }>;
}) {
  const { status, vendor_id } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("contracts")
    .select("*, vendors(id, vendor_code, name)")
    .order("end_date", { ascending: true, nullsFirst: false });

  if (status) query = query.eq("status", status);
  if (vendor_id) query = query.eq("vendor_id", vendor_id);

  const { data: contracts, error } = await query;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-bold uppercase tracking-wider text-slate-500">Contracts</h1>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            All contracts across every vendor.
          </p>
        </div>
        <Link href="/contracts/new" className={primaryButton}>
          + New contract
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <FilterLink label="All" active={!status} href="/contracts" />
        <FilterLink label="Draft" active={status === "draft"} href="/contracts?status=draft" />
        <FilterLink label="Active" active={status === "active"} href="/contracts?status=active" />
        <FilterLink label="Renewed" active={status === "renewed"} href="/contracts?status=renewed" />
        <FilterLink label="Terminated" active={status === "terminated"} href="/contracts?status=terminated" />
        <FilterLink label="Expired" active={status === "expired"} href="/contracts?status=expired" />
      </div>

      {error && <p className={errorBanner}>{error.message}</p>}

      <div className={tableWrap}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className={th}>Contract</th>
                <th className={th}>Vendor</th>
                <th className={th}>End date</th>
                <th className={th}>Value</th>
                <th className={th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {(contracts as ContractWithVendor[] | null)?.map((contract) => {
                const soon = contract.status === "active" && isExpiringSoon(contract.end_date);
                return (
                  <tr key={contract.id} className={`${tr} ${severityStripe(contract.status, soon)}`}>
                    <td className="px-4 py-3">
                      <Link href={`/contracts/${contract.id}`} className="font-medium text-slate-900 hover:text-teal-700">
                        {contract.title}
                      </Link>
                      <span className={`ml-2 ${code}`}>{contract.contract_code}</span>
                    </td>
                    <td className={td}>
                      {contract.vendors ? (
                        <Link href={`/vendors/${contract.vendors.id}`} className="hover:text-teal-700">
                          {contract.vendors.name}{" "}
                          <span className={code}>({contract.vendors.vendor_code})</span>
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
                    <td className={td}>{formatCurrency(contract.value, contract.currency)}</td>
                    <td className="px-4 py-3">
                      <ContractStatusBadge status={contract.status} />
                    </td>
                  </tr>
                );
              })}
              {contracts?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No contracts match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FilterLink({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1 ${
        active
          ? "bg-teal-600 text-white"
          : "border border-slate-300 bg-white text-slate-500 hover:text-slate-900"
      }`}
    >
      {label}
    </Link>
  );
}
