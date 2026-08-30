import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sweepExpiredContracts } from "@/lib/contracts";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { ContractStatusBadge } from "@/components/StatusBadge";
import { deleteContract, updateContract } from "@/app/(app)/contracts/actions";
import { renewContract, recordAmendment, terminateContract } from "@/app/(app)/contracts/lifecycle-actions";
import {
  deleteContractDocument,
  replaceContractDocument,
  uploadContractDocument,
} from "@/app/(app)/contracts/documents-actions";
import { formatBytes, formatDate, formatDateTime } from "@/lib/format";
import { getDocumentPublicUrl } from "@/lib/storage";
import {
  CONTRACT_STATUSES,
  DOCUMENT_TYPES,
  isExpiringSoon,
  isInForce,
  type Contract,
  type ContractDocument,
  type ContractEvent,
  type Vendor,
} from "@/lib/types";
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

const row = "grid grid-cols-1 items-start gap-2 sm:grid-cols-[160px_1fr] sm:items-center sm:gap-4";

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  await sweepExpiredContracts(supabase);

  const { data: contract } = await supabase
    .from("contracts")
    .select("*, vendors(*)")
    .eq("id", id)
    .single();

  if (!contract) {
    notFound();
  }

  const { data: vendors } = await supabase
    .from("vendors")
    .select("id, name, vendor_code")
    .order("name");

  const { data: documents } = await supabase
    .from("contract_documents")
    .select("*")
    .eq("contract_id", id)
    .order("uploaded_at", { ascending: false });

  const { data: events } = await supabase
    .from("contract_events")
    .select("*")
    .eq("contract_id", id)
    .order("created_at", { ascending: false });

  const typedContract = contract as Contract & { vendors: Vendor | null };
  const typedVendors = (vendors ?? []) as Pick<Vendor, "id" | "name" | "vendor_code">[];
  const allDocuments = (documents as ContractDocument[] | null) ?? [];
  const typedDocuments = allDocuments.filter((doc) => !doc.superseded_at);
  const supersededDocuments = allDocuments.filter((doc) => doc.superseded_at);
  const documentById = new Map(allDocuments.map((doc) => [doc.id, doc]));
  const typedEvents = (events as ContractEvent[] | null) ?? [];

  const updateContractWithId = updateContract.bind(null, id);
  const deleteContractWithId = deleteContract.bind(null, typedContract.vendor_id, id);
  const uploadDocumentWithId = uploadContractDocument.bind(null, id);
  const renewContractWithId = renewContract.bind(null, id);
  const recordAmendmentWithId = recordAmendment.bind(null, id);
  const terminateContractWithId = terminateContract.bind(null, id);

  const inForce = isInForce(typedContract.status);
  const expiring = inForce && isExpiringSoon(typedContract.end_date);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/contracts" className="text-sm text-slate-500 hover:text-blue-700">
          ← All contracts
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <p className={code}>{typedContract.contract_code}</p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-900">
            {typedContract.title}
          </h1>
          <div className="mt-2">
            <ContractStatusBadge status={typedContract.status} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <InfoBox label="Contract #" value={typedContract.contract_code} />
        <InfoBox
          label="Vendor"
          value={
            typedContract.vendors ? (
              <Link href={`/vendors/${typedContract.vendors.id}`} className="hover:text-blue-700">
                {typedContract.vendors.name} ({typedContract.vendors.vendor_code})
              </Link>
            ) : (
              "—"
            )
          }
        />
        <InfoBox
          label="End date"
          value={
            <span className="flex items-center gap-2">
              {formatDate(typedContract.end_date)}
              {expiring && (
                <span className="rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
                  ⚠ Expiring soon
                </span>
              )}
            </span>
          }
        />
      </div>

      {typedContract.status === "terminated" && (
        <div className={`${panel} border-red-200 bg-red-50 p-4`}>
          <p className="text-[11px] font-bold uppercase tracking-wider text-red-600">Terminated</p>
          <p className="mt-1 text-sm text-red-800">
            {formatDate(typedContract.terminated_at?.slice(0, 10) ?? null)}
            {typedContract.terminated_by ? ` · by ${typedContract.terminated_by}` : ""}
          </p>
          {typedContract.termination_reason && (
            <p className="mt-1 text-sm text-red-800">{typedContract.termination_reason}</p>
          )}
        </div>
      )}

      <div className={panel}>
        <div className={panelHeader}>
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Lifecycle actions</h2>
        </div>
        <div className="grid grid-cols-1 divide-y divide-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="p-5">
            <p className="text-sm font-semibold text-slate-900">Renew</p>
            <p className="mt-0.5 text-xs text-slate-500">Extend the term and put the contract back in force.</p>
            {inForce ? (
              <form action={renewContractWithId} className="mt-3 space-y-2">
                <input type="date" name="new_end_date" required className={`${input} mt-0`} />
                <input type="number" step="0.01" name="new_value" placeholder="New value (optional)" className={`${input} mt-0`} />
                <button type="submit" className={`${primaryButton} w-full`}>
                  Renew contract
                </button>
              </form>
            ) : (
              <p className="mt-3 text-xs text-slate-400">Not available — contract is {typedContract.status}.</p>
            )}
          </div>

          <div className="p-5">
            <p className="text-sm font-semibold text-slate-900">Record amendment</p>
            <p className="mt-0.5 text-xs text-slate-500">Log a change to terms, value, or end date.</p>
            <form action={recordAmendmentWithId} className="mt-3 space-y-2">
              <textarea name="amendment_summary" required rows={2} placeholder="What changed?" className={`${input} mt-0`} />
              <input type="number" step="0.01" name="new_value" placeholder="New value (optional)" className={`${input} mt-0`} />
              <input type="date" name="new_end_date" placeholder="New end date (optional)" className={`${input} mt-0`} />
              <button type="submit" className={`${secondaryButton} w-full`}>
                Save amendment
              </button>
            </form>
          </div>

          <div className="p-5">
            <p className="text-sm font-semibold text-slate-900">Terminate</p>
            <p className="mt-0.5 text-xs text-slate-500">Close the contract out for cause.</p>
            {typedContract.status !== "terminated" ? (
              <form action={terminateContractWithId} className="mt-3 space-y-2">
                <textarea name="termination_reason" required rows={2} placeholder="Reason (required)" className={`${input} mt-0`} />
                <input name="terminated_by" placeholder="Authorized by" className={`${input} mt-0`} />
                <ConfirmSubmitButton
                  confirmMessage="Terminate this contract? This cannot be undone."
                  className="w-full rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                >
                  Terminate contract
                </ConfirmSubmitButton>
              </form>
            ) : (
              <p className="mt-3 text-xs text-slate-400">Already terminated.</p>
            )}
          </div>
        </div>
      </div>

      <div className={panel}>
        <div className={panelHeader}>
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Contract details</h2>
        </div>

        <form action={updateContractWithId} className="space-y-4 px-6 py-6">
          <div className={row}>
            <label className={label}>Vendor</label>
            <select name="vendor_id" required defaultValue={typedContract.vendor_id} className={input}>
              {typedVendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name} ({vendor.vendor_code})
                </option>
              ))}
            </select>
          </div>

          <div className={row}>
            <label className={label}>Title</label>
            <input name="title" required defaultValue={typedContract.title} className={input} />
          </div>

          <div className={row}>
            <label className={label}>Status</label>
            <select name="status" defaultValue={typedContract.status} className={input}>
              {CONTRACT_STATUSES.map((status) => (
                <option key={status} value={status} className="capitalize">
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div className={row}>
            <label className={label}>Contract type</label>
            <input
              name="contract_type"
              placeholder="Service, Supply, NDA…"
              defaultValue={typedContract.contract_type ?? ""}
              className={input}
            />
          </div>

          <div className={row}>
            <label className={label}>Start date</label>
            <input type="date" name="start_date" defaultValue={typedContract.start_date ?? ""} className={input} />
          </div>

          <div className={row}>
            <label className={label}>End date</label>
            <input type="date" name="end_date" defaultValue={typedContract.end_date ?? ""} className={input} />
          </div>

          <div className={row}>
            <label className={label}>Value</label>
            <div className="flex gap-2">
              <input type="number" step="0.01" name="value" defaultValue={typedContract.value ?? ""} className={input} />
              <input name="currency" defaultValue={typedContract.currency} className={`${input} max-w-[90px]`} />
            </div>
          </div>

          <div className={row}>
            <label className={label}>Contract owner</label>
            <input name="owner_name" defaultValue={typedContract.owner_name ?? ""} className={input} />
          </div>

          <div className={row}>
            <label className={label}>Auto-renews</label>
            <label className="flex items-center gap-2 text-sm text-slate-800">
              <input
                type="checkbox"
                name="auto_renew"
                defaultChecked={typedContract.auto_renew}
                className="h-4 w-4 rounded border-slate-300 bg-white text-blue-500 focus:ring-blue-500"
              />
              Yes
            </label>
          </div>

          <div className={row}>
            <label className={label}>Description</label>
            <textarea name="description" rows={2} defaultValue={typedContract.description ?? ""} className={input} />
          </div>

          <div className={row}>
            <label className={label}>Renewal terms</label>
            <textarea name="renewal_terms" rows={2} defaultValue={typedContract.renewal_terms ?? ""} className={input} />
          </div>

          <div className={row}>
            <label className={label}>Notes</label>
            <textarea name="notes" rows={2} defaultValue={typedContract.notes ?? ""} className={input} />
          </div>

          <div className="-mx-6 -mb-6 mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
            <Link href="/contracts" className={secondaryButton}>
              Cancel
            </Link>
            <button type="submit" className={primaryButton}>
              Save changes
            </button>
          </div>
        </form>
      </div>

      <div className={panel}>
        <div className={panelHeader}>
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Supporting documents ({typedDocuments.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">File</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Type</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Size</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Uploaded</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {typedDocuments.map((doc) => {
                const deleteDoc = deleteContractDocument.bind(null, id, doc.id, doc.file_path);
                const replaceDoc = replaceContractDocument.bind(null, id, doc.id);
                return (
                  <tr key={doc.id} className="border-t border-slate-200 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <a
                        href={getDocumentPublicUrl(doc.file_path)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {doc.file_name}
                      </a>
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-700">
                      {doc.document_type.replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatBytes(doc.file_size)}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDateTime(doc.uploaded_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                        <details className="text-left">
                          <summary className="cursor-pointer px-1 py-1 text-xs font-medium text-blue-600 hover:underline">
                            Replace
                          </summary>
                          <form action={replaceDoc} className="mt-2 flex items-center gap-2">
                            <input type="file" name="file" required className="text-xs text-slate-700" />
                            <button type="submit" className="rounded-md bg-blue-600 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-700">
                              Upload
                            </button>
                          </form>
                        </details>
                        <form action={deleteDoc}>
                          <ConfirmSubmitButton confirmMessage="Delete this document?" className="px-1 py-1 text-xs font-medium text-red-600 hover:underline">
                            Delete
                          </ConfirmSubmitButton>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {typedDocuments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No documents attached yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <form
          action={uploadDocumentWithId}
          className="flex flex-wrap items-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4"
        >
          <div>
            <label className="block text-xs font-medium text-slate-500">File</label>
            <input type="file" name="file" required className="mt-1 text-sm text-slate-800" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">Document type</label>
            <select name="document_type" className={`${input} mt-1`}>
              {DOCUMENT_TYPES.map((type) => (
                <option key={type} value={type} className="capitalize">
                  {type.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[160px] flex-1">
            <label className="block text-xs font-medium text-slate-500">Notes</label>
            <input name="notes" className={`${input} mt-1`} />
          </div>
          <button type="submit" className={primaryButton}>
            Add document
          </button>
        </form>

        {supersededDocuments.length > 0 && (
          <details className="border-t border-slate-200 px-6 py-4">
            <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Document history ({supersededDocuments.length} superseded)
            </summary>
            <ul className="mt-3 space-y-2 text-sm">
              {supersededDocuments.map((doc) => {
                const replacement = doc.superseded_by_id ? documentById.get(doc.superseded_by_id) : null;
                return (
                  <li key={doc.id} className="flex flex-wrap items-center gap-2 text-slate-600">
                    <a
                      href={getDocumentPublicUrl(doc.file_path)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-500 line-through hover:underline"
                    >
                      {doc.file_name}
                    </a>
                    <span className="text-xs text-slate-400">
                      superseded {formatDateTime(doc.superseded_at)}
                      {replacement ? ` by ${replacement.file_name}` : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          </details>
        )}
      </div>

      <div className={panel}>
        <div className={panelHeader}>
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Activity log ({typedEvents.length})
          </h2>
        </div>
        <ul className="divide-y divide-slate-100">
          {typedEvents.map((event) => (
            <li key={event.id} className="px-6 py-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <p className="text-sm font-medium text-slate-900">{event.summary}</p>
                <p className="shrink-0 text-xs text-slate-400">{formatDateTime(event.created_at)}</p>
              </div>
              {event.detail && <p className="mt-0.5 text-xs text-slate-500">{event.detail}</p>}
              {event.actor_name && <p className="mt-0.5 text-xs text-slate-400">by {event.actor_name}</p>}
            </li>
          ))}
          {typedEvents.length === 0 && (
            <li className="px-6 py-8 text-center text-sm text-slate-500">No activity recorded yet.</li>
          )}
        </ul>
      </div>

      <form action={deleteContractWithId}>
        <ConfirmSubmitButton confirmMessage="Delete this contract and all of its documents? This cannot be undone." className={dangerLink}>
          Delete contract
        </ConfirmSubmitButton>
      </form>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className={`px-4 py-3 ${panel}`}>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
