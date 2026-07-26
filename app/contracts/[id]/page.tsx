import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ContractForm } from "@/components/ContractForm";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { ContractStatusBadge, ExpiringBadge } from "@/components/StatusBadge";
import { deleteContract, updateContract } from "@/app/contracts/actions";
import { deleteContractDocument, uploadContractDocument } from "@/app/contracts/documents-actions";
import { formatBytes, formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { getDocumentPublicUrl } from "@/lib/storage";
import {
  DOCUMENT_TYPES,
  isExpiringSoon,
  type Contract,
  type ContractDocument,
  type Vendor,
} from "@/lib/types";

export const dynamic = "force-dynamic";

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
  const updateContractWithId = updateContract.bind(null, id);
  const deleteContractWithId = deleteContract.bind(null, typedContract.vendor_id, id);
  const uploadDocumentWithId = uploadContractDocument.bind(null, id);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/contracts" className="text-sm text-neutral-500 hover:underline">
          ← All contracts
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-xs text-neutral-400">{typedContract.contract_code}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{typedContract.title}</h1>
          <div className="mt-2 flex items-center gap-2">
            <ContractStatusBadge status={typedContract.status} />
            {typedContract.status === "active" && isExpiringSoon(typedContract.end_date) && (
              <ExpiringBadge />
            )}
          </div>
        </div>
        {typedContract.vendors && (
          <Link
            href={`/vendors/${typedContract.vendors.id}`}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            {typedContract.vendors.name} ({typedContract.vendors.vendor_code})
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-lg border border-neutral-200 bg-white p-6 sm:grid-cols-3">
        <Field label="Type" value={typedContract.contract_type} />
        <Field label="Owner" value={typedContract.owner_name} />
        <Field label="Auto-renews" value={typedContract.auto_renew ? "Yes" : "No"} />
        <Field label="Start date" value={formatDate(typedContract.start_date)} />
        <Field label="End date" value={formatDate(typedContract.end_date)} />
        <Field label="Value" value={formatCurrency(typedContract.value, typedContract.currency)} />
        {typedContract.description && (
          <div className="sm:col-span-3">
            <Field label="Description" value={typedContract.description} />
          </div>
        )}
        {typedContract.renewal_terms && (
          <div className="sm:col-span-3">
            <Field label="Renewal terms" value={typedContract.renewal_terms} />
          </div>
        )}
        {typedContract.notes && (
          <div className="sm:col-span-3">
            <Field label="Notes" value={typedContract.notes} />
          </div>
        )}
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">
          Supporting documents ({documents?.length ?? 0})
        </h2>

        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <table className="min-w-full divide-y divide-neutral-200 text-sm">
            <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3">File</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Uploaded</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {(documents as ContractDocument[] | null)?.map((doc) => {
                const deleteDoc = deleteContractDocument.bind(null, id, doc.id, doc.file_path);
                return (
                  <tr key={doc.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <a
                        href={getDocumentPublicUrl(doc.file_path)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-neutral-900 hover:underline"
                      >
                        {doc.file_name}
                      </a>
                    </td>
                    <td className="px-4 py-3 capitalize text-neutral-600">
                      {doc.document_type.replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{formatBytes(doc.file_size)}</td>
                    <td className="px-4 py-3 text-neutral-600">{formatDateTime(doc.uploaded_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <form action={deleteDoc}>
                        <ConfirmSubmitButton
                          confirmMessage="Delete this document?"
                          className="text-xs font-medium text-red-600 hover:underline"
                        >
                          Delete
                        </ConfirmSubmitButton>
                      </form>
                    </td>
                  </tr>
                );
              })}
              {documents?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-neutral-400">
                    No documents attached yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <h3 className="mb-3 text-sm font-semibold text-neutral-700">Upload a document</h3>
          <form action={uploadDocumentWithId} className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-600">File</label>
              <input
                type="file"
                name="file"
                required
                className="mt-1 text-sm text-neutral-700"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600">Document type</label>
              <select
                name="document_type"
                className="mt-1 rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none"
              >
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type} value={type} className="capitalize">
                    {type.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-medium text-neutral-600">Notes</label>
              <input
                name="notes"
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700"
            >
              Upload
            </button>
          </form>
        </div>
      </section>

      <details className="rounded-lg border border-neutral-200 bg-white p-6">
        <summary className="cursor-pointer text-lg font-semibold tracking-tight">
          Edit contract
        </summary>
        <div className="mt-4 max-w-2xl">
          <ContractForm
            contract={typedContract}
            vendors={vendors ?? []}
            action={updateContractWithId}
          />
        </div>
      </details>

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

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
        {label}
      </p>
      <p className="mt-0.5 text-sm text-neutral-800">{value ?? "—"}</p>
    </div>
  );
}
