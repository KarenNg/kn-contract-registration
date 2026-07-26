import { CONTRACT_STATUSES, type Contract, type Vendor } from "@/lib/types";

export function ContractForm({
  contract,
  vendors,
  defaultVendorId,
  action,
}: {
  contract?: Contract;
  vendors: Pick<Vendor, "id" | "name" | "vendor_code">[];
  defaultVendorId?: string;
  action: (formData: FormData) => void;
}) {
  return (
    <form action={action} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-neutral-700">
            Vendor *
          </label>
          <select
            name="vendor_id"
            required
            defaultValue={contract?.vendor_id ?? defaultVendorId ?? ""}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none"
          >
            <option value="" disabled>
              Select a vendor
            </option>
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.name} ({vendor.vendor_code})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">
            Contract title *
          </label>
          <input
            name="title"
            required
            defaultValue={contract?.title}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">
            Contract type
          </label>
          <input
            name="contract_type"
            placeholder="Service, Supply, NDA…"
            defaultValue={contract?.contract_type ?? ""}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">
            Status
          </label>
          <select
            name="status"
            defaultValue={contract?.status ?? "draft"}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none"
          >
            {CONTRACT_STATUSES.map((status) => (
              <option key={status} value={status} className="capitalize">
                {status}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">
            Start date
          </label>
          <input
            type="date"
            name="start_date"
            defaultValue={contract?.start_date ?? ""}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">
            End date
          </label>
          <input
            type="date"
            name="end_date"
            defaultValue={contract?.end_date ?? ""}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">
            Value
          </label>
          <input
            type="number"
            step="0.01"
            name="value"
            defaultValue={contract?.value ?? ""}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">
            Currency
          </label>
          <input
            name="currency"
            defaultValue={contract?.currency ?? "USD"}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">
            Contract owner
          </label>
          <input
            name="owner_name"
            defaultValue={contract?.owner_name ?? ""}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
            <input
              type="checkbox"
              name="auto_renew"
              defaultChecked={contract?.auto_renew ?? false}
              className="h-4 w-4 rounded border-neutral-300"
            />
            Auto-renews
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">
          Description
        </label>
        <textarea
          name="description"
          rows={2}
          defaultValue={contract?.description ?? ""}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">
          Renewal terms
        </label>
        <textarea
          name="renewal_terms"
          rows={2}
          defaultValue={contract?.renewal_terms ?? ""}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">
          Notes
        </label>
        <textarea
          name="notes"
          rows={2}
          defaultValue={contract?.notes ?? ""}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none"
        />
      </div>

      <button
        type="submit"
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700"
      >
        {contract ? "Save changes" : "Create contract"}
      </button>
    </form>
  );
}
