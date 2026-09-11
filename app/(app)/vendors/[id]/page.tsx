import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { sweepExpiredContracts } from "@/lib/contracts";
import { canMutate } from "@/lib/permissions";
import { VendorForm } from "@/components/VendorForm";
import { ContractStatusBadge, ExpiringBadge, RiskTierBadge, VendorStatusBadge } from "@/components/StatusBadge";
import { acknowledgeVendorComplianceExpiry, deleteVendor, updateVendor } from "@/app/(app)/vendors/actions";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { formatCurrency, formatDate } from "@/lib/format";
import { isExpiringSoon, isInForce, isPastEndDate, type Contract, type Vendor } from "@/lib/types";
import {
  code,
  dangerLink,
  errorBanner,
  panel,
  primaryButton,
  severityStripe,
  tableWrap,
  td,
  th,
  tr,
} from "@/components/theme";

export const dynamic = "force-dynamic";

export default async function VendorDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error: errorMessage } = await searchParams;
  const profile = await requireProfile();
  const canEdit = canMutate(profile.role);
  const supabase = await createClient();
  await sweepExpiredContracts(supabase);

  const { data: vendor } = await supabase
    .from("vendors")
    .select("*")
    .eq("id", id)
    .single();

  if (!vendor) {
    notFound();
  }

  const { data: contracts } = await supabase
    .from("contracts")
    .select("*")
    .eq("vendor_id", id)
    .order("created_at", { ascending: false });

  const updateVendorWithId = updateVendor.bind(null, id);
  const deleteVendorWithId = deleteVendor.bind(null, id);
  const acknowledgeComplianceExpiry = acknowledgeVendorComplianceExpiry.bind(null, id);
  const typedContracts = (contracts as Contract[] | null) ?? [];
  const typedVendor = vendor as Vendor;
  const complianceExpired = isPastEndDate(typedVendor.compliance_doc_expires_on);
  const complianceExpiringSoon = !complianceExpired && isExpiringSoon(typedVendor.compliance_doc_expires_on);
  const complianceNeedsAttention =
    (complianceExpired || complianceExpiringSoon) && !typedVendor.compliance_doc_acknowledged_at;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/vendors" className="text-sm text-slate-500 hover:text-blue-700">
          ← All vendors
        </Link>
      </div>

      {errorMessage && <p className={errorBanner}>{errorMessage}</p>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className={code}>{(vendor as Vendor).vendor_code}</p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-900">
            {(vendor as Vendor).name}
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <VendorStatusBadge status={(vendor as Vendor).status} />
            <RiskTierBadge tier={typedVendor.risk_tier} />
          </div>
        </div>
        {canEdit && (
          <Link href={`/contracts/new?vendor_id=${id}`} className={`${primaryButton} self-start`}>
            + New contract
          </Link>
        )}
      </div>

      {complianceNeedsAttention && (
        <div className={`${panel} border-orange-200 bg-orange-50 p-4`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-orange-900">
              <span className="font-bold uppercase tracking-wide">
                {complianceExpired ? "⚠ Compliance document expired" : "⚠ Compliance document expiring soon"}
              </span>{" "}
              — {formatDate(typedVendor.compliance_doc_expires_on)}
            </p>
            {canEdit && (
              <form action={acknowledgeComplianceExpiry}>
                <ConfirmSubmitButton
                  confirmMessage="Acknowledge this compliance document alert? It'll drop off the alerts list until the situation changes."
                  className={`${primaryButton} text-xs`}
                >
                  Acknowledge
                </ConfirmSubmitButton>
              </form>
            )}
          </div>
        </div>
      )}

      <div className={`grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 ${panel}`}>
        <Field label="Contact name" value={(vendor as Vendor).contact_name} />
        <Field label="Contact email" value={(vendor as Vendor).contact_email} />
        <Field label="Contact phone" value={(vendor as Vendor).contact_phone} />
        <Field label="Address" value={(vendor as Vendor).address} />
        <Field label="Last risk review" value={formatDate(typedVendor.last_risk_review_at)} />
        <Field label="Compliance doc expires" value={formatDate(typedVendor.compliance_doc_expires_on)} />
        {(vendor as Vendor).notes && (
          <div className="sm:col-span-2">
            <Field label="Notes" value={(vendor as Vendor).notes} />
          </div>
        )}
      </div>

      <section className="space-y-3">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Contracts ({typedContracts.length})
        </h2>
        <div className={tableWrap}>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className={th}>Contract</th>
                  <th className={th}>End date</th>
                  <th className={th}>Value</th>
                  <th className={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {typedContracts.map((contract) => {
                  const soon = isInForce(contract.status) && isExpiringSoon(contract.end_date);
                  return (
                    <tr key={contract.id} className={`${tr} ${severityStripe(contract.status, soon)}`}>
                      <td className="px-4 py-3">
                        <Link href={`/contracts/${contract.id}`} className="font-medium text-slate-900 hover:text-blue-700">
                          {contract.title}
                        </Link>
                        <span className={`ml-2 ${code}`}>{contract.contract_code}</span>
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
                {typedContracts.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                      No contracts for this vendor yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {canEdit && (
        <>
          <details className={`p-6 ${panel}`}>
            <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Edit vendor
            </summary>
            <div className="mt-4 max-w-2xl">
              <VendorForm vendor={vendor as Vendor} action={updateVendorWithId} />
            </div>
          </details>

          <form action={deleteVendorWithId}>
            <ConfirmSubmitButton confirmMessage="Delete this vendor? This cannot be undone." className={dangerLink}>
              Delete vendor
            </ConfirmSubmitButton>
          </form>
        </>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm text-slate-800">{value ?? "—"}</p>
    </div>
  );
}
