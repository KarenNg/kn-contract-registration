import { ContractForm } from "@/components/ContractForm";
import { createContract } from "@/app/(app)/contracts/actions";
import { createClient } from "@/lib/supabase/server";
import { panel } from "@/components/theme";

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
        <h1 className="text-sm font-bold uppercase tracking-wider text-slate-400">New contract</h1>
        <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-100">
          Register a contract against one of your vendors.
        </p>
      </div>
      <div className={`p-6 ${panel}`}>
        <ContractForm vendors={vendors ?? []} defaultVendorId={vendor_id} action={createContract} />
      </div>
    </div>
  );
}
