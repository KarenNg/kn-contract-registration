import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { VendorStatusBadge } from "@/components/StatusBadge";
import type { Vendor } from "@/lib/types";
import { code, errorBanner, primaryButton, tableWrap, td, th, tr } from "@/components/theme";

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
          <h1 className="text-sm font-bold uppercase tracking-wider text-slate-500">Vendors</h1>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            All registered vendors and their contract counts.
          </p>
        </div>
        <Link href="/vendors/new" className={primaryButton}>
          + New vendor
        </Link>
      </div>

      {error && <p className={errorBanner}>{error.message}</p>}

      <div className={tableWrap}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className={th}>Vendor ID</th>
                <th className={th}>Name</th>
                <th className={th}>Contact</th>
                <th className={th}>Status</th>
                <th className={th}>Contracts</th>
              </tr>
            </thead>
            <tbody>
              {(vendors as Vendor[] | null)?.map((vendor) => (
                <tr key={vendor.id} className={tr}>
                  <td className={`px-4 py-3 ${code}`}>{vendor.vendor_code}</td>
                  <td className="px-4 py-3">
                    <Link href={`/vendors/${vendor.id}`} className="font-medium text-slate-900 hover:text-teal-700">
                      {vendor.name}
                    </Link>
                  </td>
                  <td className={td}>{vendor.contact_name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <VendorStatusBadge status={vendor.status} />
                  </td>
                  <td className={`${td} tabular-nums`}>{counts.get(vendor.id) ?? 0}</td>
                </tr>
              ))}
              {vendors?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No vendors yet. Create your first one.
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
