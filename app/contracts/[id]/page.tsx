import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { deleteContract, updateContract } from "@/app/contracts/actions";
import { deleteContractDocument, uploadContractDocument } from "@/app/contracts/documents-actions";
import { formatBytes, formatDate, formatDateTime } from "@/lib/format";
import { getDocumentPublicUrl } from "@/lib/storage";
import {
  CONTRACT_STATUSES,
  DOCUMENT_TYPES,
  isExpiringSoon,
  type Contract,
  type ContractDocument,
  type Vendor,
} from "@/lib/types";

export const dynamic = "force-dynamic";

const darkInput =
  "w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none";
const darkLabel = "text-sm font-medium text-slate-300";
const darkRow = "grid grid-cols-1 items-start gap-2 sm:grid-cols-[160px_1fr] sm:items-center sm:gap-4";

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

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

  const typedContract = contract as Contract & { vendors: Vendor | null };
  const typedVendors = (vendors ?? []) as Pick<Vendor, "id" | "name" | "vendor_code">[];
  const typedDocuments = (documents as ContractDocument[] | null) ?? [];

  const updateContractWithId = updateContract.bind(null, id);
  const deleteContractWithId = deleteContract.bind(null, typedContract.vendor_id, id);
  const uploadDocumentWithId = uploadContractDocument.bind(null, id);

  const expiring = typedContract.status === "active" && isExpiringSoon(typedContract.end_date);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/contracts" className="text-sm text-neutral-500 hover:underline">
          ← All contracts
        </Link>
      </div>

      <div className="mx-auto overflow-hidden rounded-lg border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl">
        {/* Header bar */}
        <div className="flex items-center justify-between bg-blue-950 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-blue-300">Contract details</p>
            <h1 className="text-lg font-semibold text-white">{typedContract.title}</h1>
          </div>
          <Link
            href="/contracts"
            className="rounded-md px-2 py-1 text-slate-300 hover:bg-slate-800 hover:text-white"
            aria-label="Close"
          >
            ✕
          </Link>
        </div>

        {/* Info strip */}
        <div className="grid grid-cols-1 gap-3 border-b border-slate-700 bg-slate-800/50 px-6 py-4 sm:grid-cols-3">
          <InfoBox label="Contract #" value={typedContract.contract_code} />
          <InfoBox
            label="Vendor"
            value={
              typedContract.vendors ? (
                <Link
                  href={`/vendors/${typedContract.vendors.id}`}
                  className="hover:underline"
                >
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
                  <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-xs font-medium text-amber-300">
                    Expiring soon
                  </span>
                )}
              </span>
            }
          />
        </div>

        {/* Editable fields */}
        <form action={updateContractWithId} className="space-y-4 px-6 py-6">
          <div className={darkRow}>
            <label className={darkLabel}>Vendor</label>
            <select name="vendor_id" required defaultValue={typedContract.vendor_id} className={darkInput}>
              {typedVendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name} ({vendor.vendor_code})
                </option>
              ))}
            </select>
          </div>

          <div className={darkRow}>
            <label className={darkLabel}>Title</label>
            <input name="title" required defaultValue={typedContract.title} className={darkInput} />
          </div>

          <div className={darkRow}>
            <label className={darkLabel}>Status</label>
            <select name="status" defaultValue={typedContract.status} className={darkInput}>
              {CONTRACT_STATUSES.map((status) => (
                <option key={status} value={status} className="capitalize">
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div className={darkRow}>
            <label className={darkLabel}>Contract type</label>
            <input
              name="contract_type"
              placeholder="Service, Supply, NDA…"
              defaultValue={typedContract.contract_type ?? ""}
              className={darkInput}
            />
          </div>

          <div className={darkRow}>
            <label className={darkLabel}>Start date</label>
            <input
              type="date"
              name="start_date"
              defaultValue={typedContract.start_date ?? ""}
              className={darkInput}
            />
          </div>

          <div className={darkRow}>
            <label className={darkLabel}>End date</label>
            <input
              type="date"
              name="end_date"
              defaultValue={typedContract.end_date ?? ""}
              className={darkInput}
            />
          </div>

          <div className={darkRow}>
            <label className={darkLabel}>Value</label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                name="value"
                defaultValue={typedContract.value ?? ""}
                className={darkInput}
              />
              <input
                name="currency"
                defaultValue={typedContract.currency}
                className={`${darkInput} max-w-[90px]`}
              />
            </div>
          </div>

          <div className={darkRow}>
            <label className={darkLabel}>Contract owner</label>
            <input
              name="owner_name"
              defaultValue={typedContract.owner_name ?? ""}
              className={darkInput}
            />
          </div>

          <div className={darkRow}>
            <label className={darkLabel}>Auto-renews</label>
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                name="auto_renew"
                defaultChecked={typedContract.auto_renew}
                className="h-4 w-4 rounded border-slate-600 bg-slate-800"
              />
              Yes
            </label>
          </div>

          <div className={darkRow}>
            <label className={darkLabel}>Description</label>
            <textarea
              name="description"
              rows={2}
              defaultValue={typedContract.description ?? ""}
              className={darkInput}
            />
          </div>

          <div className={darkRow}>
            <label className={darkLabel}>Renewal terms</label>
            <textarea
              name="renewal_terms"
              rows={2}
              defaultValue={typedContract.renewal_terms ?? ""}
              className={darkInput}
            />
          </div>

          <div className={darkRow}>
            <label className={darkLabel}>Notes</label>
            <textarea
              name="notes"
              rows={2}
              defaultValue={typedContract.notes ?? ""}
              className={darkInput}
            />
          </div>

          {/* Action bar */}
          <div className="-mx-6 -mb-6 mt-6 flex items-center justify-end gap-3 border-t border-slate-700 bg-slate-800/60 px-6 py-4">
            <Link
              href="/contracts"
              className="rounded-md border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Save data and close window
            </button>
          </div>
        </form>
      </div>

      {/* Documents data grid */}
      <div className="mx-auto overflow-hidden rounded-lg border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl">
        <div className="border-b border-slate-700 bg-slate-800/50 px-6 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
            Supporting documents ({typedDocuments.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-700 text-sm">
            <thead className="bg-slate-800 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Step</th>
                <th className="px-4 py-3">File</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Uploaded</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {typedDocuments.map((doc, index) => {
                const deleteDoc = deleteContractDocument.bind(null, id, doc.id, doc.file_path);
                return (
                  <tr key={doc.id} className="even:bg-slate-800/30 hover:bg-slate-800/60">
                    <td className="px-4 py-3 text-slate-500">{index + 1}</td>
                    <td className="px-4 py-3">
                      <a
                        href={getDocumentPublicUrl(doc.file_path)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-blue-400 hover:underline"
                      >
                        {doc.file_name}
                      </a>
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-300">
                      {doc.document_type.replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{formatBytes(doc.file_size)}</td>
                    <td className="px-4 py-3 text-slate-400">{formatDateTime(doc.uploaded_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <form action={deleteDoc}>
                        <ConfirmSubmitButton
                          confirmMessage="Delete this document?"
                          className="text-xs font-medium text-red-400 hover:underline"
                        >
                          Delete
                        </ConfirmSubmitButton>
                      </form>
                    </td>
                  </tr>
                );
              })}
              {typedDocuments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No documents attached yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <form
          action={uploadDocumentWithId}
          className="flex flex-wrap items-end gap-3 border-t border-slate-700 bg-slate-800/40 px-6 py-4"
        >
          <div>
            <label className="block text-xs font-medium text-slate-400">File</label>
            <input type="file" name="file" required className="mt-1 text-sm text-slate-200" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400">Document type</label>
            <select name="document_type" className={`${darkInput} mt-1`}>
              {DOCUMENT_TYPES.map((type) => (
                <option key={type} value={type} className="capitalize">
                  {type.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[160px] flex-1">
            <label className="block text-xs font-medium text-slate-400">Notes</label>
            <input name="notes" className={`${darkInput} mt-1`} />
          </div>
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
          >
            Add row
          </button>
        </form>
      </div>

      <form action={deleteContractWithId}>
        <ConfirmSubmitButton
          confirmMessage="Delete this contract and all of its documents? This cannot be undone."
          className="text-sm font-medium text-red-600 hover:underline"
        >
          Delete contract
        </ConfirmSubmitButton>
      </form>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-slate-700 bg-slate-800 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-100">{value}</p>
    </div>
  );
}
