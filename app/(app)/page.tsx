import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { sweepExpiredContracts } from "@/lib/contracts";
import { ApplicationStatusBadge, ContractStatusBadge, ExpiringBadge } from "@/components/StatusBadge";
import { ContractStatusChart, ExpiringHorizonChart } from "@/components/DashboardCharts";
import { VendorFilter } from "@/components/VendorFilter";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { isClosed, isExpiringSoon, isInForce, type ContractWithVendor, type VendorApplication } from "@/lib/types";
import { code, panel, panelHeader, severityStripe, tableWrap, td, th, tr } from "@/components/theme";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ vendor?: string }>;
}) {
  const { vendor: vendorId } = await searchParams;
  const profile = await requireProfile();
  const applyHref = `/apply/${profile.organizationSlug}`;
  const supabase = await createClient();
  await sweepExpiredContracts(supabase);

  let contractsQuery = supabase
    .from("contracts")
    .select("*, vendors(id, vendor_code, name)")
    .order("end_date", { ascending: true, nullsFirst: false });
  if (vendorId) contractsQuery = contractsQuery.eq("vendor_id", vendorId);

  const [
    { count: vendorCount },
    { data: vendorOptions },
    { data: contracts },
    { data: applications },
  ] = await Promise.all([
    supabase.from("vendors").select("*", { count: "exact", head: true }),
    supabase.from("vendors").select("id, vendor_code, name").order("name"),
    contractsQuery,
    supabase
      .from("vendor_applications")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  const allContracts = (contracts as ContractWithVendor[] | null) ?? [];
  const contractCount = allContracts.length;

  const { count: documentCount } = vendorId
    ? allContracts.length > 0
      ? await supabase
          .from("contract_documents")
          .select("*", { count: "exact", head: true })
          .in("contract_id", allContracts.map((c) => c.id))
      : { count: 0 }
    : await supabase.from("contract_documents").select("*", { count: "exact", head: true });
  const expiring = allContracts.filter(
    (c) => isInForce(c.status) && isExpiringSoon(c.end_date),
  );

  const allApplications = (applications as VendorApplication[] | null) ?? [];
  const pendingApplications = allApplications.filter(
    (a) => a.status === "submitted" || a.status === "under_review",
  );

  const total = contractCount;
  const activeContracts = allContracts.filter((c) => isInForce(c.status));
  const retiredCount = allContracts.filter((c) => isClosed(c.status)).length;
  const draftCount = allContracts.filter((c) => c.status === "draft").length;
  const expiredCount = allContracts.filter((c) => c.status === "expired").length;
  const terminatedCount = allContracts.filter((c) => c.status === "terminated").length;

  const daysUntil = (endDate: string | null) => {
    if (!endDate) return null;
    return (new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  };
  const within = (days: number) =>
    activeContracts.filter((c) => {
      const d = daysUntil(c.end_date);
      return d !== null && d <= days;
    }).length;
  const between = (minDays: number, maxDays: number) =>
    activeContracts.filter((c) => {
      const d = daysUntil(c.end_date);
      return d !== null && d > minDays && d <= maxDays;
    }).length;
  const beyond2Years = activeContracts.filter((c) => {
    const d = daysUntil(c.end_date);
    return d === null || d > 730;
  }).length;

  const selectedVendor = (vendorOptions ?? []).find((v) => v.id === vendorId);

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-sm font-bold uppercase tracking-wider text-slate-400">Dashboard</h1>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            {selectedVendor
              ? `Focused on ${selectedVendor.name}.`
              : "Vendors, contracts, and documents at a glance."}
          </p>
        </div>
        <VendorFilter vendors={vendorOptions ?? []} selectedVendorId={vendorId} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <KpiTile label="Vendors" value={vendorCount ?? 0} href="/vendors" />
        <KpiTile label="Contracts" value={contractCount} href="/contracts" />
        <KpiTile label="Documents on file" value={documentCount ?? 0} />
        <KpiTile
          label="Expiring within 60 days"
          value={expiring.length}
          href="/alerts"
          warn={expiring.length > 0}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ContractStatusChart
          total={total}
          segments={[
            { label: "Active", value: activeContracts.length, color: "bg-emerald-500" },
            { label: "Retired", value: retiredCount, color: "bg-red-500" },
            { label: "Draft", value: draftCount, color: "bg-slate-300" },
          ]}
        />
        <ExpiringHorizonChart
          segments={[
            { label: "Draft", value: draftCount, color: "bg-slate-300" },
            { label: "Expired", value: expiredCount, color: "bg-red-600 animate-flicker" },
            { label: "Terminated", value: terminatedCount, color: "bg-slate-400" },
            { label: "Next 6 months", value: within(182), color: "bg-red-600" },
            { label: "After 6-12 months", value: between(182, 365), color: "bg-orange-500" },
            { label: "After 12 months", value: between(365, 730), color: "bg-yellow-400" },
            { label: "After 2 years", value: beyond2Years, color: "bg-emerald-500" },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <KpiTile
          label="Requests pending review"
          value={pendingApplications.length}
          href="/requests"
          warn={pendingApplications.length > 0}
        />
        <Link
          href={applyHref}
          className={`${panel} flex items-center justify-between p-5 hover:border-blue-700`}
        >
          <span>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Customer journey</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">Open the public application form →</p>
          </span>
        </Link>
      </div>

      {pendingApplications.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-sky-600">
            New vendor requests
          </h2>
          <div className={tableWrap}>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th className={th}>Reference</th>
                    <th className={th}>Company</th>
                    <th className={th}>Requested contract</th>
                    <th className={th}>Submitted</th>
                    <th className={th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingApplications.map((application) => (
                    <tr key={application.id} className={tr}>
                      <td className={`px-4 py-3 ${code}`}>{application.application_code}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/requests/${application.id}`}
                          className="font-medium text-slate-900 hover:text-blue-600"
                        >
                          {application.company_name}
                        </Link>
                      </td>
                      <td className={td}>{application.requested_contract_title}</td>
                      <td className={td}>{formatDateTime(application.created_at)}</td>
                      <td className="px-4 py-3">
                        <ApplicationStatusBadge status={application.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {expiring.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-red-600">
              ⚠ Renewal decision needed
            </h2>
            <Link href="/alerts" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
              Open alerts →
            </Link>
          </div>
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
                        <Link href={`/contracts/${contract.id}`} className="font-medium text-slate-900 hover:text-blue-600">
                          {contract.title}
                        </Link>
                      </td>
                      <td className={`px-4 py-3 ${code}`}>{contract.vendors?.vendor_code ?? "—"}</td>
                      <td className="px-4 py-3">
                        {contract.vendors ? (
                          <Link href={`/vendors/${contract.vendors.id}`} className="text-slate-700 hover:text-blue-600">
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
          <Link href="/contracts/new" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
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
                  const soon = isInForce(contract.status) && isExpiringSoon(contract.end_date);
                  return (
                    <tr key={contract.id} className={`${tr} ${severityStripe(contract.status, soon)}`}>
                      <td className="px-4 py-3">
                        <Link href={`/contracts/${contract.id}`} className="font-medium text-slate-900 hover:text-blue-600">
                          {contract.title}
                        </Link>
                      </td>
                      <td className={`px-4 py-3 ${code}`}>{contract.vendors?.vendor_code ?? "—"}</td>
                      <td className="px-4 py-3">
                        {contract.vendors ? (
                          <Link href={`/vendors/${contract.vendors.id}`} className="text-slate-700 hover:text-blue-600">
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
                      <Link href="/contracts/new" className="text-blue-600 hover:underline">
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
      className={`${panel} p-5 ${warn ? "border-red-300 bg-red-50" : ""}`}
    >
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold tabular-nums ${warn ? "text-red-700" : "text-slate-900"}`}>
        {value}
      </p>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
