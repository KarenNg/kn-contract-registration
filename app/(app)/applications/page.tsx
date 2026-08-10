import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { ApplicationStatusBadge } from "@/components/StatusBadge";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { VendorApplication } from "@/lib/types";
import { code, errorBanner, secondaryButton, tableWrap, td, th, tr } from "@/components/theme";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  const profile = await requireProfile();
  const applyHref = `/apply/${profile.organizationSlug}`;
  const supabase = await createClient();
  const { data: applications, error } = await supabase
    .from("vendor_applications")
    .select("*")
    .order("created_at", { ascending: false });

  const typed = (applications as VendorApplication[] | null) ?? [];
  const pending = typed.filter((a) => a.status === "submitted" || a.status === "under_review").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-bold uppercase tracking-wider text-slate-400">Applications</h1>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-100">
            Customer journey: intake, review, and approval into a registered vendor.
          </p>
          {pending > 0 && (
            <p className="mt-1 text-sm text-amber-400">{pending} awaiting your review</p>
          )}
        </div>
        <Link href={applyHref} className={secondaryButton}>
          View public application form ↗
        </Link>
      </div>

      {error && <p className={errorBanner}>{error.message}</p>}

      <div className={tableWrap}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className={th}>Reference</th>
                <th className={th}>Company</th>
                <th className={th}>Requested contract</th>
                <th className={th}>Est. value</th>
                <th className={th}>Submitted</th>
                <th className={th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {typed.map((application) => (
                <tr key={application.id} className={tr}>
                  <td className={`px-4 py-3 ${code}`}>{application.application_code}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/applications/${application.id}`}
                      className="font-medium text-slate-100 hover:text-teal-400"
                    >
                      {application.company_name}
                    </Link>
                  </td>
                  <td className={td}>{application.requested_contract_title}</td>
                  <td className={td}>{formatCurrency(application.requested_value, "USD")}</td>
                  <td className={td}>{formatDateTime(application.created_at)}</td>
                  <td className="px-4 py-3">
                    <ApplicationStatusBadge status={application.status} />
                  </td>
                </tr>
              ))}
              {typed.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No applications yet.{" "}
                    <Link href={applyHref} className="text-teal-400 hover:underline">
                      Submit one
                    </Link>
                    .
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
