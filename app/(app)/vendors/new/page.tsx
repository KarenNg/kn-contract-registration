import { notFound } from "next/navigation";
import { VendorForm } from "@/components/VendorForm";
import { createVendor } from "@/app/(app)/vendors/actions";
import { requireProfile } from "@/lib/auth";
import { canMutate } from "@/lib/permissions";
import { panel } from "@/components/theme";

export default async function NewVendorPage() {
  const profile = await requireProfile();
  if (!canMutate(profile.role)) {
    notFound();
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-sm font-bold uppercase tracking-wider text-slate-500">New vendor</h1>
        <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
          Register a new vendor so you can attach contracts to them.
        </p>
      </div>
      <div className={`p-6 ${panel}`}>
        <VendorForm action={createVendor} />
      </div>
    </div>
  );
}
