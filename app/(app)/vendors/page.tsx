import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { canMutate } from "@/lib/permissions";
import { RiskTierBadge, VendorStatusBadge } from "@/components/StatusBadge";
import { RISK_TIERS, type Vendor } from "@/lib/types";
import { code, errorBanner, input, primaryButton, tableWrap, td, th, tr } from "@/components/theme";

export const dynamic = "force-dynamic";

function buildHref(params: { q?: string; status?: string; risk?: string }): string {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.status) search.set("status", params.status);
  if (params.risk) search.set("risk", params.risk);
  const qs = search.toString();
  return qs ? `/vendors?${qs}` : "/vendors";
}

export default async function VendorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; risk?: string }>;
}) {
  const { q, status, risk } = await searchParams;
  const profile = await requireProfile();
  const canEdit = canMutate(profile.role);
  const supabase = await createClient();

  let query = supabase.from("vendors").select("*").order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  if (risk) query = query.eq("risk_tier", risk);
  if (q) query = query.or(`name.ilike.%${q}%,vendor_code.ilike.%${q}%,contact_name.ilike.%${q}%,contact_email.ilike.%${q}%`);

  const { data: vendors, error } = await query;

  const { data: contractCounts } = await supabase
    .from("contracts")
    .select("vendor_id");

  const counts = new Map<string, number>();
  for (const row of contractCounts ?? []) {
    counts.set(row.vendor_id, (counts.get(row.vendor_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-sm font-bold uppercase tracking-wider text-slate-500">Vendors</h1>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            All registered vendors and their contract counts.
          </p>
        </div>
        {canEdit && (
          <Link href="/vendors/new" className={`${primaryButton} self-start`}>
            + New vendor
          </Link>
        )}
      </div>

      <form className="flex flex-wrap items-center gap-3" action="/vendors">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search name, vendor ID, contact…"
          className={`${input} mt-0 max-w-xs`}
        />
        {status && <input type="hidden" name="status" value={status} />}
        {risk && <input type="hidden" name="risk" value={risk} />}
        <button type="submit" className={primaryButton}>
          Search
        </button>
        {(q || status || risk) && (
          <Link href="/vendors" className="text-sm text-slate-500 hover:text-blue-700">
            Clear
          </Link>
        )}
      </form>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <FilterLink label="All" active={!status} href={buildHref({ q, risk })} />
        <FilterLink label="Active" active={status === "active"} href={buildHref({ q, risk, status: "active" })} />
        <FilterLink label="Inactive" active={status === "inactive"} href={buildHref({ q, risk, status: "inactive" })} />
        <span className="mx-1 text-slate-300">|</span>
        <FilterLink label="Any risk" active={!risk} href={buildHref({ q, status })} />
        {RISK_TIERS.map((tier) => (
          <FilterLink
            key={tier}
            label={tier}
            active={risk === tier}
            href={buildHref({ q, status, risk: tier })}
            className="capitalize"
          />
        ))}
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
                <th className={th}>Risk</th>
                <th className={th}>Contracts</th>
              </tr>
            </thead>
            <tbody>
              {(vendors as Vendor[] | null)?.map((vendor) => (
                <tr key={vendor.id} className={tr}>
                  <td className={`px-4 py-3 ${code}`}>{vendor.vendor_code}</td>
                  <td className="px-4 py-3">
                    <Link href={`/vendors/${vendor.id}`} className="font-medium text-slate-900 hover:text-blue-700">
                      {vendor.name}
                    </Link>
                  </td>
                  <td className={td}>{vendor.contact_name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <VendorStatusBadge status={vendor.status} />
                  </td>
                  <td className="px-4 py-3">
                    <RiskTierBadge tier={vendor.risk_tier} />
                  </td>
                  <td className={`${td} tabular-nums`}>{counts.get(vendor.id) ?? 0}</td>
                </tr>
              ))}
              {vendors?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    {q || status ? (
                      "No vendors match this search."
                    ) : canEdit ? (
                      <>
                        No vendors yet.{" "}
                        <Link href="/vendors/new" className="text-blue-600 hover:underline">
                          Create your first one
                        </Link>
                        .
                      </>
                    ) : (
                      "No vendors yet."
                    )}
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
  className,
}: {
  label: string;
  href: string;
  active: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 ${className ?? ""} ${
        active
          ? "bg-blue-600 text-white"
          : "border border-slate-300 bg-white text-slate-500 hover:text-slate-900"
      }`}
    >
      {label}
    </Link>
  );
}
