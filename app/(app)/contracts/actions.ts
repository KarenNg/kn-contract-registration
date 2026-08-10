"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
    owner_name: String(formData.get("owner_name") ?? "").trim() || null,
    auto_renew: formData.get("auto_renew") === "on",
    renewal_terms: String(formData.get("renewal_terms") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  };
}

export async function createContract(formData: FormData) {
  const values = fromFormData(formData);
  if (!values.title || !values.vendor_id) {
    throw new Error("Contract title and vendor are required");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contracts")
    .insert(values)
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/contracts");
  revalidatePath(`/vendors/${values.vendor_id}`);
  revalidatePath("/");
  redirect(`/contracts/${data.id}`);
}

export async function updateContract(contractId: string, formData: FormData) {
  const values = fromFormData(formData);
  if (!values.title || !values.vendor_id) {
    throw new Error("Contract title and vendor are required");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("contracts")
    .update(values)
    .eq("id", contractId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/contracts");
  revalidatePath(`/contracts/${contractId}`);
  revalidatePath(`/vendors/${values.vendor_id}`);
  revalidatePath("/");
}

export async function deleteContract(vendorId: string, contractId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("contracts").delete().eq("id", contractId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/contracts");
  revalidatePath(`/vendors/${vendorId}`);
  revalidatePath("/");
  redirect(`/vendors/${vendorId}`);
}
