"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logContractEvent } from "@/lib/contracts";

export async function acknowledgeAlert(contractId: string) {
  const supabase = await createClient();

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
