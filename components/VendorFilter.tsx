"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { input, label as labelClass } from "@/components/theme";

interface VendorOption {
  id: string;
  vendor_code: string;
  name: string;
}

export function VendorFilter({
  vendors,
  selectedVendorId,
}: {
  vendors: VendorOption[];
  selectedVendorId?: string;
}) {
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label htmlFor="vendor-filter" className={`${labelClass} mb-0`}>
        Focus on vendor
      </label>
      <select
        id="vendor-filter"
        defaultValue={selectedVendorId ?? ""}
        onChange={(e) => router.push(e.target.value ? `/?vendor=${e.target.value}` : "/")}
        className={`${input} mt-0 max-w-xs`}
      >
        <option value="">All vendors</option>
        {vendors.map((vendor) => (
          <option key={vendor.id} value={vendor.id}>
            {vendor.vendor_code} — {vendor.name}
          </option>
        ))}
      </select>
      {selectedVendorId && (
        <Link href="/" className="text-sm text-slate-500 hover:text-blue-700">
          Clear
        </Link>
      )}
    </div>
  );
}
