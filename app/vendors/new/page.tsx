import { VendorForm } from "@/components/VendorForm";
import { createVendor } from "@/app/vendors/actions";

export default function NewVendorPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New vendor</h1>
        <p className="text-sm text-neutral-500">
          Register a new vendor so you can attach contracts to them.
        </p>
      </div>
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <VendorForm action={createVendor} />
      </div>
    </div>
  );
}
