import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { sweepExpiredContracts } from "@/lib/contracts";
import { ApplicationStatusBadge, ContractStatusBadge, ExpiringBadge } from "@/components/StatusBadge";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { isExpiringSoon, isInForce, type ContractWithVendor, type VendorApplication } from "@/lib/types";
import { code, panel, panelHeader, severityStripe, tableWrap, td, th, tr } from "@/components/theme";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const profile = await requireProfile();
  const applyHref = `/apply/${profile.organizationSlug}`;
  const supabase = await createClient();
  await sweepExpiredContracts(supabase);

  const [
    { count: vendorCount },
    { count: contractCount },
    { count: documentCount },
    { data: contracts },
    { data: applications },
  ] = await Promise.all([
    supabase.from("vendors").select("*", { count: "exact", head: true }),
    supabase.from("contracts").select("*", { count: "exact", head: true }),
    supabase.from("contract_documents").select("*", { count: "exact", head: true }),
    supabase
      .from("contracts")
      .select("*, vendors(id, vendor_code, name)")
      .order("end_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("vendor_applications")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  const allContracts = (contracts as ContractWithVendor[] | null) ?? [];
  const expiring = allContracts.filter(
    (c) => isInForce(c.status) && isExpiringSoon(c.end_date),
  );

  const allApplications = (applications as VendorApplication[] | null) ?? [];
  const pendingApplications = allApplications.filter(
    (a) => a.status === "submitted" || a.status === "under_review",
  );

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-bold uppercase tracking-wider text-slate-400">Dashboard</h1>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
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
          href="/alerts"
          warn={expiring.length > 0}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <KpiTile
          label="Applications pending review"
          value={pendingApplications.length}
          href="/applications"
          warn={pendingApplications.length > 0}
        />
        <Link
          href={applyHref}
          className={`${panel} flex items-center justify-between p-5 hover:border-teal-700`}
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
            New vendor applications
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
                          href={`/applications/${application.id}`}
                          className="font-medium text-slate-900 hover:text-teal-600"
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
            <Link href="/alerts" className="text-sm font-semibold text-teal-600 hover:text-teal-700">
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
                        <Link href={`/contracts/${contract.id}`} className="font-medium text-slate-900 hover:text-teal-600">
                          {contract.title}
                        </Link>
                      </td>
                      <td className={`px-4 py-3 ${code}`}>{contract.vendors?.vendor_code ?? "—"}</td>
                      <td className="px-4 py-3">
                        {contract.vendors ? (
                          <Link href={`/vendors/${contract.vendors.id}`} className="text-slate-700 hover:text-teal-600">
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
          <Link href="/contracts/new" className="text-sm font-semibold text-teal-600 hover:text-teal-700">
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
                        <Link href={`/contracts/${contract.id}`} className="font-medium text-slate-900 hover:text-teal-600">
                          {contract.title}
                        </Link>
                      </td>
                      <td className={`px-4 py-3 ${code}`}>{contract.vendors?.vendor_code ?? "—"}</td>
                      <td className="px-4 py-3">
                        {contract.vendors ? (
                          <Link href={`/vendors/${contract.vendors.id}`} className="text-slate-700 hover:text-teal-600">
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
                      <Link href="/contracts/new" className="text-teal-600 hover:underline">
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
