import { ContractForm } from "@/components/ContractForm";
import { createContract } from "@/app/contracts/actions";
import { createClient } from "@/lib/supabase/server";

export default async function NewContractPage({
  searchParams,
}: {
  searchParams: Promise<{ vendor_id?: string }>;
}) {
  const { vendor_id } = await searchParams;
  const supabase = await createClient();
  const { data: vendors } = await supabase
    .from("vendors")
    .select("id, name, vendor_code")
    .order("name");

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New contract</h1>
        <p className="text-sm text-neutral-500">
          Register a contract against one of your vendors.
        </p>
      </div>
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <ContractForm
          vendors={vendors ?? []}
          defaultVendorId={vendor_id}
          action={createContract}
        />
      </div>
    </div>
  );
}
