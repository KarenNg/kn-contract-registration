"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, type CurrentProfile } from "@/lib/auth";
import { logContractEvent } from "@/lib/contracts";
import { assertCanManageContract } from "@/lib/permissions";
import { formatCurrency, formatDate } from "@/lib/format";

async function requireContractAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profile: CurrentProfile,
  contractId: string,
) {
  const { data: contract, error } = await supabase
    .from("contracts")
    .select("owner_user_id")
    .eq("id", contractId)
    .single();

  if (error || !contract) {
    throw new Error(error?.message ?? "Contract not found");
  }
  assertCanManageContract(profile.role, profile.userId, contract.owner_user_id);
}

/** A deliverable or payment milestone due along the way — separate from the renewal/termination lifecycle. */
export async function addObligation(contractId: string, formData: FormData) {
  const profile = await requireProfile();
  const supabase = await createClient();
  await requireContractAccess(supabase, profile, contractId);

  const title = String(formData.get("title") ?? "").trim();
  const dueDate = String(formData.get("due_date") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!title) throw new Error("Describe the obligation");
  if (!dueDate) throw new Error("A due date is required");

  const { error } = await supabase.from("contract_obligations").insert({
    contract_id: contractId,
    title,
    due_date: dueDate,
    amount: amountRaw ? Number(amountRaw) : null,
    notes,
  });

  if (error) throw new Error(error.message);

  await logContractEvent(
    supabase,
    contractId,
    "obligation_added",
    `Obligation added: ${title}`,
    `Due ${formatDate(dueDate)}${amountRaw ? ` · ${formatCurrency(Number(amountRaw))}` : ""}`,
  );

  revalidatePath(`/contracts/${contractId}`);
  revalidatePath("/alerts");
  revalidatePath("/");
}

export async function completeObligation(contractId: string, obligationId: string) {
  const profile = await requireProfile();
  const supabase = await createClient();
  await requireContractAccess(supabase, profile, contractId);

  const { data: obligation, error } = await supabase
    .from("contract_obligations")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", obligationId)
    .select("title")
    .single();

  if (error) throw new Error(error.message);

  await logContractEvent(
    supabase,
    contractId,
    "obligation_completed",
    `Obligation completed: ${obligation?.title ?? ""}`,
  );

  revalidatePath(`/contracts/${contractId}`);
  revalidatePath("/alerts");
  revalidatePath("/");
}

export async function deleteObligation(contractId: string, obligationId: string) {
  const profile = await requireProfile();
  const supabase = await createClient();
  await requireContractAccess(supabase, profile, contractId);

  const { error } = await supabase.from("contract_obligations").delete().eq("id", obligationId);
  if (error) throw new Error(error.message);

  revalidatePath(`/contracts/${contractId}`);
  revalidatePath("/alerts");
  revalidatePath("/");
}
