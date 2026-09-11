"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { logContractEvent } from "@/lib/contracts";
import { assertCanManageContract, assertCanMutate } from "@/lib/permissions";
import { isInForce, type ContractStatus } from "@/lib/types";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

function fromFormData(formData: FormData) {
  const rawValue = String(formData.get("value") ?? "").trim();
  return {
    vendor_id: String(formData.get("vendor_id") ?? ""),
    title: String(formData.get("title") ?? "").trim(),
    contract_type: String(formData.get("contract_type") ?? "").trim() || null,
    description: String(formData.get("description") ?? "").trim() || null,
    start_date: String(formData.get("start_date") ?? "").trim() || null,
    end_date: String(formData.get("end_date") ?? "").trim() || null,
    value: rawValue ? Number(rawValue) : null,
    currency: String(formData.get("currency") ?? "USD").trim() || "USD",
    status: String(formData.get("status") ?? "draft"),
    auto_renew: formData.get("auto_renew") === "on",
    renewal_terms: String(formData.get("renewal_terms") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  };
}

/**
 * Reads the OwnerField encoding: "" means "leave the existing owner alone"
 * (only offered when there's a legacy free-text name and nothing linked yet),
 * "__clear__" means unassign, and anything else is a profiles.id to resolve
 * into a display name kept in sync with the real account.
 */
async function resolveOwnerFields(
  supabase: SupabaseServerClient,
  formData: FormData,
): Promise<{ owner_user_id?: string | null; owner_name?: string | null }> {
  const raw = formData.get("owner_user_id");
  if (raw === null || raw === "") return {};
  if (raw === "__clear__") return { owner_user_id: null, owner_name: null };

  const { data: member } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", String(raw))
    .single();

  return { owner_user_id: String(raw), owner_name: member?.full_name || member?.email || null };
}

export async function createContract(formData: FormData) {
  const profile = await requireProfile();
  assertCanMutate(profile.role);

  const supabase = await createClient();
  const ownerFields = await resolveOwnerFields(supabase, formData);
  const values = { ...fromFormData(formData), ...ownerFields };

  if (!values.title || !values.vendor_id) {
    throw new Error("Contract title and vendor are required");
  }
  if (isInForce(values.status as ContractStatus) && !values.end_date) {
    throw new Error("An end date is required before a contract can go active");
  }
  assertCanManageContract(profile.role, profile.userId, values.owner_user_id ?? null);

  const { data, error } = await supabase
    .from("contracts")
    .insert(values)
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await logContractEvent(supabase, data.id, "created", "Contract created", `Status: ${values.status}`);

  revalidatePath("/contracts");
  revalidatePath(`/vendors/${values.vendor_id}`);
  revalidatePath("/");
  redirect(`/contracts/${data.id}`);
}

export async function updateContract(contractId: string, formData: FormData) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: previous } = await supabase
    .from("contracts")
    .select("status, owner_user_id")
    .eq("id", contractId)
    .single();

  if (!previous) {
    throw new Error("Contract not found");
  }
  assertCanManageContract(profile.role, profile.userId, previous.owner_user_id);

  const ownerFields = await resolveOwnerFields(supabase, formData);
  const values = { ...fromFormData(formData), ...ownerFields };

  if (!values.title || !values.vendor_id) {
    throw new Error("Contract title and vendor are required");
  }
  if (isInForce(values.status as ContractStatus) && !values.end_date) {
    throw new Error("An end date is required before a contract can go active");
  }
  if ("owner_user_id" in values) {
    assertCanManageContract(profile.role, profile.userId, values.owner_user_id ?? null);
  }

  const { error } = await supabase
    .from("contracts")
    .update(values)
    .eq("id", contractId);

  if (error) {
    throw new Error(error.message);
  }

  if (previous.status !== values.status) {
    await logContractEvent(
      supabase,
      contractId,
      "status_changed",
      `Status changed: ${previous.status} → ${values.status}`,
    );
  }

  revalidatePath("/contracts");
  revalidatePath(`/contracts/${contractId}`);
  revalidatePath(`/vendors/${values.vendor_id}`);
  revalidatePath("/");
}

export async function deleteContract(vendorId: string, contractId: string) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: contract } = await supabase
    .from("contracts")
    .select("owner_user_id")
    .eq("id", contractId)
    .single();

  if (contract) {
    assertCanManageContract(profile.role, profile.userId, contract.owner_user_id);
  }

  const { error } = await supabase.from("contracts").delete().eq("id", contractId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/contracts");
  revalidatePath(`/vendors/${vendorId}`);
  revalidatePath("/");
  redirect(`/vendors/${vendorId}`);
}
