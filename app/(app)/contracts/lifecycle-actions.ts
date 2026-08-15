"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logContractEvent } from "@/lib/contracts";
import { formatCurrency, formatDate } from "@/lib/format";

function afterSave(contractId: string, vendorId?: string | null) {
  revalidatePath(`/contracts/${contractId}`);
  revalidatePath("/contracts");
  revalidatePath("/");
  revalidatePath("/alerts");
  if (vendorId) revalidatePath(`/vendors/${vendorId}`);
}

/** Extends the term and puts the contract back in force — the decision made when a renewal is approved. */
export async function renewContract(contractId: string, formData: FormData) {
  const newEndDate = String(formData.get("new_end_date") ?? "").trim();
  const newValueRaw = String(formData.get("new_value") ?? "").trim();
  const renewalTerms = String(formData.get("renewal_terms") ?? "").trim();

  if (!newEndDate) {
    throw new Error("A new end date is required to renew a contract");
  }

  const supabase = await createClient();

  const { data: current, error: fetchError } = await supabase
    .from("contracts")
    .select("end_date, value, vendor_id")
    .eq("id", contractId)
    .single();

  if (fetchError || !current) {
    throw new Error(fetchError?.message ?? "Contract not found");
  }

  const updates: Record<string, unknown> = {
    status: "renewed",
    end_date: newEndDate,
    alert_acknowledged_at: null,
  };
  if (newValueRaw) updates.value = Number(newValueRaw);
  if (renewalTerms) updates.renewal_terms = renewalTerms;

  const { error } = await supabase.from("contracts").update(updates).eq("id", contractId);
  if (error) throw new Error(error.message);

  await logContractEvent(
    supabase,
    contractId,
    "renewed",
    `Renewed through ${formatDate(newEndDate)}`,
    `Previous end date: ${formatDate(current.end_date)}.${
      newValueRaw ? ` New value: ${formatCurrency(Number(newValueRaw))}.` : ""
    }`,
  );

  afterSave(contractId, current.vendor_id);
}

/** Logs a change to contract terms without necessarily touching status — the audit trail for anything the base contract didn't originally say. */
export async function recordAmendment(contractId: string, formData: FormData) {
  const summary = String(formData.get("amendment_summary") ?? "").trim();
  const newValueRaw = String(formData.get("new_value") ?? "").trim();
  const newEndDate = String(formData.get("new_end_date") ?? "").trim();

  if (!summary) {
    throw new Error("Describe what changed in this amendment");
  }

  const supabase = await createClient();

  const { data: current, error: fetchError } = await supabase
    .from("contracts")
    .select("end_date, value, vendor_id")
    .eq("id", contractId)
    .single();

  if (fetchError || !current) {
    throw new Error(fetchError?.message ?? "Contract not found");
  }

  const updates: Record<string, unknown> = {};
  const detailParts: string[] = [];

  if (newValueRaw) {
    updates.value = Number(newValueRaw);
    detailParts.push(`Value: ${formatCurrency(current.value)} → ${formatCurrency(Number(newValueRaw))}`);
  }
  if (newEndDate) {
    updates.end_date = newEndDate;
    detailParts.push(`End date: ${formatDate(current.end_date)} → ${formatDate(newEndDate)}`);
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase.from("contracts").update(updates).eq("id", contractId);
    if (error) throw new Error(error.message);
  }

  await logContractEvent(supabase, contractId, "amended", summary, detailParts.join(" · ") || null);

  afterSave(contractId, current.vendor_id);
}

/** Closes a contract out for cause — requires a reason so the record explains itself later. */
export async function terminateContract(contractId: string, formData: FormData) {
  const reason = String(formData.get("termination_reason") ?? "").trim();
  const terminatedBy = String(formData.get("terminated_by") ?? "").trim() || null;
  const terminationDate = String(formData.get("termination_date") ?? "").trim() || new Date().toISOString().slice(0, 10);

  if (!reason) {
    throw new Error("A termination reason is required");
  }

  const supabase = await createClient();

  const { data: current, error: fetchError } = await supabase
    .from("contracts")
    .select("vendor_id")
    .eq("id", contractId)
    .single();

  if (fetchError || !current) {
    throw new Error(fetchError?.message ?? "Contract not found");
  }

  const { error } = await supabase
    .from("contracts")
    .update({
      status: "terminated",
      terminated_at: new Date(`${terminationDate}T00:00:00`).toISOString(),
      termination_reason: reason,
      terminated_by: terminatedBy,
    })
    .eq("id", contractId);

  if (error) throw new Error(error.message);

  await logContractEvent(supabase, contractId, "terminated", "Contract terminated", reason, terminatedBy);

  afterSave(contractId, current.vendor_id);
}
