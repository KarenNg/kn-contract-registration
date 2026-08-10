import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ApplicationStatusBadge } from "@/components/StatusBadge";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import {
  approveApplication,
  deleteApplication,
  markUnderReview,
  rejectApplication,
} from "@/app/applications/actions";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import type { VendorApplication } from "@/lib/types";
import {
  code,
  dangerLink,
  input,
  label,
  panel,
  panelHeader,
  primaryButton,
  secondaryButton,
} from "@/components/theme";

export const dynamic = "force-dynamic";

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: application } = await supabase
    .from("vendor_applications")
    .select("*, vendors(id, vendor_code, name), contracts(id, contract_code, title)")
    .eq("id", id)
    .single();

  if (!application) {
    notFound();
  }

  const typed = application as VendorApplication & {
    vendors: { id: string; vendor_code: string; name: string } | null;
    contracts: { id: string; contract_code: string; title: string } | null;
  };

  const markUnderReviewWithId = markUnderReview.bind(null, id);
  const approveApplicationWithId = approveApplication.bind(null, id);
  const rejectApplicationWithId = rejectApplication.bind(null, id);
  const deleteApplicationWithId = deleteApplication.bind(null, id);

  const isDecided = typed.status === "approved" || typed.status === "rejected";

  return (
    <div className="space-y-8">
      <div>
        <Link href="/applications" className="text-sm text-slate-400 hover:text-teal-400">
          ← All applications
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <p className={code}>{typed.application_code}</p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-100">
            {typed.company_name}
          </h1>
          <div className="mt-2">
            <ApplicationStatusBadge status={typed.status} />
          </div>
        </div>
      </div>

      <div className={`grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 ${panel}`}>
        <Field label="Contact name" value={typed.contact_name} />
        <Field label="Contact email" value={typed.contact_email} />
        <Field label="Contact phone" value={typed.contact_phone} />
        <Field label="Address" value={typed.address} />
        <Field label="Submitted" value={formatDateTime(typed.created_at)} />
      </div>

      <div className={panel}>
        <div className={panelHeader}>
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Requested contract
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
          <Field label="Title" value={typed.requested_contract_title} />
          <Field label="Type" value={typed.requested_contract_type} />
          <Field label="Estimated value" value={formatCurrency(typed.requested_value, "USD")} />
          <Field label="Desired start date" value={formatDate(typed.requested_start_date)} />
          {typed.applicant_notes && (
            <div className="sm:col-span-2">
              <Field label="Applicant notes" value={typed.applicant_notes} />
            </div>
          )}
        </div>
      </div>

      {isDecided ? (
        <div className={panel}>
          <div className={panelHeader}>
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Decision</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
            <Field label="Decided" value={formatDateTime(typed.decided_at)} />
            <Field label="Reviewer" value={typed.reviewer_name} />
            {typed.review_notes && (
              <div className="sm:col-span-2">
                <Field label="Review notes" value={typed.review_notes} />
              </div>
            )}
            {typed.status === "approved" && typed.vendors && typed.contracts && (
              <div className="sm:col-span-2 flex flex-wrap gap-3 pt-2">
                <Link href={`/vendors/${typed.vendors.id}`} className={secondaryButton}>
                  View vendor {typed.vendors.vendor_code} →
                </Link>
                <Link href={`/contracts/${typed.contracts.id}`} className={secondaryButton}>
                  View contract {typed.contracts.contract_code} →
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className={panel}>
          <div className={panelHeader}>
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Review</h2>
          </div>
          <div className="space-y-6 p-6">
            {typed.status === "submitted" && (
              <form action={markUnderReviewWithId}>
                <button type="submit" className={secondaryButton}>
                  Start review
                </button>
              </form>
            )}

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <form action={approveApplicationWithId} className="space-y-3 rounded-md border border-emerald-900/50 bg-emerald-950/20 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                  Approve → creates vendor + draft contract
                </p>
                <div>
                  <label className={label}>Reviewer name</label>
                  <input name="reviewer_name" className={input} />
                </div>
                <div>
                  <label className={label}>Notes</label>
                  <textarea name="review_notes" rows={2} className={input} />
                </div>
                <button type="submit" className={primaryButton}>
                  Approve application
                </button>
              </form>

              <form action={rejectApplicationWithId} className="space-y-3 rounded-md border border-red-900/50 bg-red-950/20 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-red-400">Reject</p>
                <div>
                  <label className={label}>Reviewer name</label>
                  <input name="reviewer_name" className={input} />
                </div>
                <div>
                  <label className={label}>Reason</label>
                  <textarea name="review_notes" rows={2} className={input} />
                </div>
                <button
                  type="submit"
                  className="rounded-md border border-red-700 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-900/40"
                >
                  Reject application
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <form action={deleteApplicationWithId}>
        <ConfirmSubmitButton confirmMessage="Delete this application? This cannot be undone." className={dangerLink}>
          Delete application
        </ConfirmSubmitButton>
      </form>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm text-slate-200">{value ?? "—"}</p>
    </div>
  );
}
