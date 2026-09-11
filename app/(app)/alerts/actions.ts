"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { logContractEvent } from "@/lib/contracts";
import { assertCanManageContract } from "@/lib/permissions";

export async function acknowledgeAlert(contractId: string) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: contract, error: fetchError } = await supabase
    .from("contracts")
    .select("owner_user_id")
    .eq("id", contractId)
    .single();

  if (fetchError || !contract) {
    throw new Error(fetchError?.message ?? "Contract not found");
  }
  assertCanManageContract(profile.role, profile.userId, contract.owner_user_id);

  const { error } = await supabase
    .from("contracts")
    .update({ alert_acknowledged_at: new Date().toISOString() })
    .eq("id", contractId);

  if (error) {
    throw new Error(error.message);
  }

  await logContractEvent(supabase, contractId, "alert_acknowledged", "Expiring-contract alert acknowledged");

  revalidatePath("/alerts");
  revalidatePath("/");
  revalidatePath(`/contracts/${contractId}`);
}
