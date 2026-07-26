import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { VendorStatusBadge } from "@/components/StatusBadge";
import type { Vendor } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function VendorsPage() {
  const supabase = await createClient();
  const { data: vendors, error } = await supabase
    .from("vendors")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: contractCounts } = await supabase
    .from("contracts")
    .select("vendor_id");

  const counts = new Map<string, number>();
  for (const row of contractCounts ?? []) {
    counts.set(row.vendor_id, (counts.get(row.vendor_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vendors</h1>
          <p className="text-sm text-neutral-500">
            All registered vendors and their contract counts.
          </p>
        </div>
        <Link
          href="/vendors/new"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700"
        >
          + New vendor
        </Link>
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
              <th className="px-4 py-3">Vendor ID</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Contracts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {(vendors as Vendor[] | null)?.map((vendor) => (
              <tr key={vendor.id} className="hover:bg-neutral-50">
                <td className="px-4 py-3 font-mono text-xs text-neutral-500">
                  {vendor.vendor_code}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/vendors/${vendor.id}`}
                    className="font-medium text-neutral-900 hover:underline"
                  >
                    {vendor.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-neutral-600">
                  {vendor.contact_name ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <VendorStatusBadge status={vendor.status} />
                </td>
                <td className="px-4 py-3 text-neutral-600">
                  {counts.get(vendor.id) ?? 0}
                </td>
              </tr>
            ))}
            {vendors?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-400">
                  No vendors yet. Create your first one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
