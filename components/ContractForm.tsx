import { CONTRACT_STATUSES, type Contract, type Vendor } from "@/lib/types";
import { input, label, primaryButton } from "@/components/theme";

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
          <label className={label}>Vendor *</label>
          <select
            name="vendor_id"
            required
            defaultValue={contract?.vendor_id ?? defaultVendorId ?? ""}
            className={input}
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
          <label className={label}>Contract title *</label>
          <input name="title" required defaultValue={contract?.title} className={input} />
        </div>
        <div>
          <label className={label}>Contract type</label>
          <input
            name="contract_type"
            placeholder="Service, Supply, NDA…"
            defaultValue={contract?.contract_type ?? ""}
            className={input}
          />
        </div>
        <div>
          <label className={label}>Status</label>
          <select name="status" defaultValue={contract?.status ?? "draft"} className={input}>
            {CONTRACT_STATUSES.map((status) => (
              <option key={status} value={status} className="capitalize">
                {status}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Start date</label>
          <input type="date" name="start_date" defaultValue={contract?.start_date ?? ""} className={input} />
        </div>
        <div>
          <label className={label}>End date</label>
          <input type="date" name="end_date" defaultValue={contract?.end_date ?? ""} className={input} />
        </div>
        <div>
          <label className={label}>Value</label>
          <input
            type="number"
            step="0.01"
            name="value"
            defaultValue={contract?.value ?? ""}
            className={input}
          />
        </div>
        <div>
          <label className={label}>Currency</label>
          <input name="currency" defaultValue={contract?.currency ?? "USD"} className={input} />
        </div>
        <div>
          <label className={label}>Contract owner</label>
          <input name="owner_name" defaultValue={contract?.owner_name ?? ""} className={input} />
        </div>
        <div className="flex items-end pb-2">
          <label className={`flex items-center gap-2 ${label}`}>
            <input
              type="checkbox"
              name="auto_renew"
              defaultChecked={contract?.auto_renew ?? false}
              className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-teal-500 focus:ring-teal-500"
            />
            Auto-renews
          </label>
        </div>
      </div>

      <div>
        <label className={label}>Description</label>
        <textarea name="description" rows={2} defaultValue={contract?.description ?? ""} className={input} />
      </div>

      <div>
        <label className={label}>Renewal terms</label>
        <textarea name="renewal_terms" rows={2} defaultValue={contract?.renewal_terms ?? ""} className={input} />
      </div>

      <div>
        <label className={label}>Notes</label>
        <textarea name="notes" rows={2} defaultValue={contract?.notes ?? ""} className={input} />
      </div>

      <button type="submit" className={primaryButton}>
        {contract ? "Save changes" : "Create contract"}
      </button>
    </form>
  );
}
