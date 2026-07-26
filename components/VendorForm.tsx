import type { Vendor } from "@/lib/types";

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
        <label className="block text-sm font-medium text-neutral-700">
          Vendor name *
        </label>
        <input
          name="name"
          required
          defaultValue={vendor?.name}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-neutral-700">
            Contact name
          </label>
          <input
            name="contact_name"
            defaultValue={vendor?.contact_name ?? ""}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">
            Status
          </label>
          <select
            name="status"
            defaultValue={vendor?.status ?? "active"}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">
            Contact email
          </label>
          <input
            type="email"
            name="contact_email"
            defaultValue={vendor?.contact_email ?? ""}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">
            Contact phone
          </label>
          <input
            name="contact_phone"
            defaultValue={vendor?.contact_phone ?? ""}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">
          Address
        </label>
        <input
          name="address"
          defaultValue={vendor?.address ?? ""}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">
          Notes
        </label>
        <textarea
          name="notes"
          rows={3}
          defaultValue={vendor?.notes ?? ""}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none"
        />
      </div>

      <button
        type="submit"
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700"
      >
        {vendor ? "Save changes" : "Create vendor"}
      </button>
    </form>
  );
}
