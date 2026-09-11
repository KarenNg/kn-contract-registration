import { PERFORMANCE_RATINGS, RISK_TIERS, STRATEGIC_TIERS, type Vendor } from "@/lib/types";
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

      <div className="grid grid-cols-1 gap-4 rounded-md border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
        <div>
          <label className={label}>Risk tier</label>
          <select name="risk_tier" defaultValue={vendor?.risk_tier ?? ""} className={input}>
            <option value="">Not rated</option>
            {RISK_TIERS.map((tier) => (
              <option key={tier} value={tier} className="capitalize">
                {tier}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Last risk review</label>
          <input
            type="date"
            name="last_risk_review_at"
            defaultValue={vendor?.last_risk_review_at ?? ""}
            className={input}
          />
        </div>
        <div>
          <label className={label}>Compliance doc expires</label>
          <input
            type="date"
            name="compliance_doc_expires_on"
            defaultValue={vendor?.compliance_doc_expires_on ?? ""}
            className={input}
          />
          <p className="mt-1 text-[11px] text-slate-400">
            E.g. certificate of insurance — tied to this vendor, not one contract.
          </p>
        </div>
        <div>
          <label className={label}>Strategic tier</label>
          <select name="strategic_tier" defaultValue={vendor?.strategic_tier ?? ""} className={input}>
            <option value="">Not segmented</option>
            {STRATEGIC_TIERS.map((tier) => (
              <option key={tier} value={tier} className="capitalize">
                {tier}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-slate-400">
            How replaceable this vendor is — pairs with risk tier for a full segmentation view.
          </p>
        </div>
        <div>
          <label className={label}>Performance rating</label>
          <select name="performance_rating" defaultValue={vendor?.performance_rating ?? ""} className={input}>
            <option value="">Not rated</option>
            {PERFORMANCE_RATINGS.map((rating) => (
              <option key={rating} value={rating} className="capitalize">
                {rating}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Last performance review</label>
          <input
            type="date"
            name="last_performance_review_at"
            defaultValue={vendor?.last_performance_review_at ?? ""}
            className={input}
          />
        </div>
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
