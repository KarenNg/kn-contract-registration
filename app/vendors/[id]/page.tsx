import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VendorForm } from "@/components/VendorForm";
import { ContractStatusBadge, ExpiringBadge, VendorStatusBadge } from "@/components/StatusBadge";
import { deleteVendor, updateVendor } from "@/app/vendors/actions";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { formatCurrency, formatDate } from "@/lib/format";
import { isExpiringSoon, type Contract, type Vendor } from "@/lib/types";

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
  const supabase = await createClient();

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

  return (
    <div className="space-y-8">
      <div>
        <Link href="/vendors" className="text-sm text-neutral-500 hover:underline">
          ← All vendors
        </Link>
      </div>

      {errorMessage && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      )}

      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-xs text-neutral-400">{(vendor as Vendor).vendor_code}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{(vendor as Vendor).name}</h1>
          <div className="mt-2">
            <VendorStatusBadge status={(vendor as Vendor).status} />
          </div>
        </div>
        <Link
          href={`/contracts/new?vendor_id=${id}`}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700"
        >
          + New contract
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-lg border border-neutral-200 bg-white p-6 sm:grid-cols-2">
        <Field label="Contact name" value={(vendor as Vendor).contact_name} />
        <Field label="Contact email" value={(vendor as Vendor).contact_email} />
        <Field label="Contact phone" value={(vendor as Vendor).contact_phone} />
        <Field label="Address" value={(vendor as Vendor).address} />
        {(vendor as Vendor).notes && (
          <div className="sm:col-span-2">
            <Field label="Notes" value={(vendor as Vendor).notes} />
          </div>
        )}
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">
          Contracts ({contracts?.length ?? 0})
        </h2>
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <table className="min-w-full divide-y divide-neutral-200 text-sm">
            <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3">Contract</th>
                <th className="px-4 py-3">End date</th>
                <th className="px-4 py-3">Value</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {(contracts as Contract[] | null)?.map((contract) => (
                <tr key={contract.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/contracts/${contract.id}`}
                      className="font-medium text-neutral-900 hover:underline"
                    >
                      {contract.title}
                    </Link>
                    <span className="ml-2 font-mono text-xs text-neutral-400">
                      {contract.contract_code}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    <div className="flex items-center gap-2">
                      {formatDate(contract.end_date)}
                      {contract.status === "active" && isExpiringSoon(contract.end_date) && (
                        <ExpiringBadge />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {formatCurrency(contract.value, contract.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <ContractStatusBadge status={contract.status} />
                  </td>
                </tr>
              ))}
              {contracts?.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-neutral-400">
                    No contracts for this vendor yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <details className="rounded-lg border border-neutral-200 bg-white p-6">
        <summary className="cursor-pointer text-lg font-semibold tracking-tight">
          Edit vendor
        </summary>
        <div className="mt-4 max-w-2xl">
          <VendorForm vendor={vendor as Vendor} action={updateVendorWithId} />
        </div>
      </details>

      <form action={deleteVendorWithId}>
        <ConfirmSubmitButton
          confirmMessage="Delete this vendor? This cannot be undone."
          className="text-sm font-medium text-red-600 hover:underline"
        >
          Delete vendor
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
