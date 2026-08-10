import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { ContractStatusBadge } from "@/components/StatusBadge";
import { deleteContract, updateContract } from "@/app/(app)/contracts/actions";
import { deleteContractDocument, uploadContractDocument } from "@/app/(app)/contracts/documents-actions";
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
    <div className="space-y-8">
      <div>
        <Link href="/contracts" className="text-sm text-slate-400 hover:text-teal-400">
          ← All contracts
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <p className={code}>{typedContract.contract_code}</p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-100">
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
              <Link href={`/vendors/${typedContract.vendors.id}`} className="hover:text-teal-400">
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
                <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-400">
                  ⚠ Expiring soon
                </span>
              )}
            </span>
          }
        />
      </div>

      <div className={panel}>
        <div className={panelHeader}>
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Contract details</h2>
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
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                name="auto_renew"
                defaultChecked={typedContract.auto_renew}
                className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-teal-500 focus:ring-teal-500"
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

          <div className="-mx-6 -mb-6 mt-6 flex items-center justify-end gap-3 border-t border-slate-800 bg-slate-800/40 px-6 py-4">
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
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
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
                return (
                  <tr key={doc.id} className="border-t border-slate-800 hover:bg-slate-800/50">
                    <td className="px-4 py-3">
                      <a
                        href={getDocumentPublicUrl(doc.file_path)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-teal-400 hover:underline"
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
                        <ConfirmSubmitButton confirmMessage="Delete this document?" className="text-xs font-medium text-red-400 hover:underline">
                          Delete
                        </ConfirmSubmitButton>
                      </form>
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
          className="flex flex-wrap items-end gap-3 border-t border-slate-800 bg-slate-800/40 px-6 py-4"
        >
          <div>
            <label className="block text-xs font-medium text-slate-400">File</label>
            <input type="file" name="file" required className="mt-1 text-sm text-slate-200" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400">Document type</label>
            <select name="document_type" className={`${input} mt-1`}>
              {DOCUMENT_TYPES.map((type) => (
                <option key={type} value={type} className="capitalize">
                  {type.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[160px] flex-1">
            <label className="block text-xs font-medium text-slate-400">Notes</label>
            <input name="notes" className={`${input} mt-1`} />
          </div>
          <button type="submit" className={primaryButton}>
            Add document
          </button>
        </form>
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
      <p className="mt-0.5 text-sm font-semibold text-slate-100">{value}</p>
    </div>
  );
}
