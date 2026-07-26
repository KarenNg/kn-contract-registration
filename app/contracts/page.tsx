import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ContractStatusBadge, ExpiringBadge } from "@/components/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/format";
import { isExpiringSoon, type ContractWithVendor } from "@/lib/types";

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
          <h1 className="text-2xl font-semibold tracking-tight">Contracts</h1>
          <p className="text-sm text-neutral-500">
            All contracts across every vendor.
          </p>
        </div>
        <Link
          href="/contracts/new"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700"
        >
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

      {error && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {error.message}
        </p>
      )}

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="min-w-full divide-y divide-neutral-200 text-sm">
          <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3">Contract</th>
              <th className="px-4 py-3">Vendor</th>
              <th className="px-4 py-3">End date</th>
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {(contracts as ContractWithVendor[] | null)?.map((contract) => (
              <tr key={contract.id} className="hover:bg-neutral-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/contracts/${contract.id}`}
                    className="font-medium text-neutral-900 hover:underline"
                  >
                    {contract.title}
                  </Link>
                  <span className="ml-2 font-mono text-xs text-neutral-400">
                    {contract.contract_code}
                  </span>
                </td>
                <td className="px-4 py-3 text-neutral-600">
                  {contract.vendors ? (
                    <Link
                      href={`/vendors/${contract.vendors.id}`}
                      className="hover:underline"
                    >
                      {contract.vendors.name}{" "}
                      <span className="font-mono text-xs text-neutral-400">
                        ({contract.vendors.vendor_code})
                      </span>
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
            {contracts?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-400">
                  No contracts match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
          ? "bg-neutral-900 text-white"
          : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100"
      }`}
    >
      {label}
    </Link>
  );
}
