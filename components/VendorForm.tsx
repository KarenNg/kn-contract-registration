import type { Vendor } from "@/lib/types";
import { input, label, primaryButton } from "@/components/theme";

export function VendorForm({
  vendor,
  action,
}: {
  vendor?: Vendor;
  action: (formData: FormData) => void;
}) {
  return (
    <form action={action} className="space-y-5">
      <div>
        <label className={label}>Vendor name *</label>
        <input name="name" required defaultValue={vendor?.name} className={input} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Contact name</label>
          <input name="contact_name" defaultValue={vendor?.contact_name ?? ""} className={input} />
        </div>
        <div>
          <label className={label}>Status</label>
          <select name="status" defaultValue={vendor?.status ?? "active"} className={input}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div>
          <label className={label}>Contact email</label>
          <input type="email" name="contact_email" defaultValue={vendor?.contact_email ?? ""} className={input} />
        </div>
        <div>
          <label className={label}>Contact phone</label>
          <input name="contact_phone" defaultValue={vendor?.contact_phone ?? ""} className={input} />
        </div>
      </div>

      <div>
        <label className={label}>Address</label>
        <input name="address" defaultValue={vendor?.address ?? ""} className={input} />
      </div>

      <div>
        <label className={label}>Notes</label>
        <textarea name="notes" rows={3} defaultValue={vendor?.notes ?? ""} className={input} />
      </div>

      <button type="submit" className={primaryButton}>
        {vendor ? "Save changes" : "Create vendor"}
      </button>
    </form>
  );
}
