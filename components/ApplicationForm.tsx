import { input, label, primaryButton } from "@/components/theme";

export function ApplicationForm({ action }: { action: (formData: FormData) => void }) {
  return (
    <form action={action} className="space-y-5">
      <div>
        <label className={label}>Company name *</label>
        <input name="company_name" required className={input} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Contact name</label>
          <input name="contact_name" className={input} />
        </div>
        <div>
          <label className={label}>Contact email</label>
          <input type="email" name="contact_email" className={input} />
        </div>
        <div>
          <label className={label}>Contact phone</label>
          <input name="contact_phone" className={input} />
        </div>
        <div>
          <label className={label}>Address</label>
          <input name="address" className={input} />
        </div>
      </div>

      <div className="border-t border-slate-800 pt-5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          What contract are you requesting?
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <label className={label}>Contract title *</label>
            <input
              name="requested_contract_title"
              required
              placeholder="e.g. Facilities Maintenance Agreement"
              className={input}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className={label}>Contract type</label>
              <input name="requested_contract_type" placeholder="Service, Supply…" className={input} />
            </div>
            <div>
              <label className={label}>Estimated value (USD)</label>
              <input type="number" step="0.01" name="requested_value" className={input} />
            </div>
            <div>
              <label className={label}>Desired start date</label>
              <input type="date" name="requested_start_date" className={input} />
            </div>
          </div>

          <div>
            <label className={label}>Anything else we should know?</label>
            <textarea name="applicant_notes" rows={3} className={input} />
          </div>
        </div>
      </div>

      <button type="submit" className={primaryButton}>
        Submit application
      </button>
    </form>
  );
}
