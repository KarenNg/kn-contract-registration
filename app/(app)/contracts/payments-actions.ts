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
    .select("owner_user_id, currency")
    .eq("id", contractId)
    .single();

  if (error || !contract) {
    throw new Error(error?.message ?? "Contract not found");
  }
  assertCanManageContract(profile.role, profile.userId, contract.owner_user_id);
  return contract;
}

/** Actual spend recorded against a contract — separate from the budgeted contract value. */
export async function addPayment(contractId: string, formData: FormData) {
  const profile = await requireProfile();
  const supabase = await createClient();
  const contract = await requireContractAccess(supabase, profile, contractId);

  const amountRaw = String(formData.get("amount") ?? "").trim();
  const paymentDate = String(formData.get("payment_date") ?? "").trim();
  const reference = String(formData.get("reference") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const obligationId = String(formData.get("obligation_id") ?? "").trim() || null;

  const amount = Number(amountRaw);
  if (!amountRaw || Number.isNaN(amount) || amount <= 0) throw new Error("Enter a payment amount greater than zero");
  if (!paymentDate) throw new Error("A payment date is required");

  const { error } = await supabase.from("contract_payments").insert({
    contract_id: contractId,
    obligation_id: obligationId,
    amount,
    payment_date: paymentDate,
    reference,
    notes,
  });

  if (error) throw new Error(error.message);

  await logContractEvent(
    supabase,
    contractId,
    "payment_recorded",
    `Payment recorded: ${formatCurrency(amount, contract.currency)}`,
    `Paid ${formatDate(paymentDate)}${reference ? ` · ref ${reference}` : ""}`,
  );

  revalidatePath(`/contracts/${contractId}`);
  revalidatePath("/alerts");
  revalidatePath("/");
}

export async function deletePayment(contractId: string, paymentId: string) {
  const profile = await requireProfile();
  const supabase = await createClient();
  await requireContractAccess(supabase, profile, contractId);

  const { error } = await supabase.from("contract_payments").delete().eq("id", paymentId);
  if (error) throw new Error(error.message);

  revalidatePath(`/contracts/${contractId}`);
  revalidatePath("/alerts");
  revalidatePath("/");
}
