"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function fromFormData(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    contact_name: String(formData.get("contact_name") ?? "").trim() || null,
    contact_email: String(formData.get("contact_email") ?? "").trim() || null,
    contact_phone: String(formData.get("contact_phone") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
    status: String(formData.get("status") ?? "active"),
    notes: String(formData.get("notes") ?? "").trim() || null,
  };
}

export async function createVendor(formData: FormData) {
  const values = fromFormData(formData);
  if (!values.name) {
    throw new Error("Vendor name is required");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendors")
    .insert(values)
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/vendors");
  revalidatePath("/");
  redirect(`/vendors/${data.id}`);
}

export async function updateVendor(vendorId: string, formData: FormData) {
  const values = fromFormData(formData);
  if (!values.name) {
    throw new Error("Vendor name is required");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("vendors")
    .update(values)
    .eq("id", vendorId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/vendors");
  revalidatePath(`/vendors/${vendorId}`);
  revalidatePath("/");
}

export async function deleteVendor(vendorId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("vendors").delete().eq("id", vendorId);

  if (error) {
    const message = error.code === "23503"
      ? "This vendor still has contracts on file. Delete or reassign those contracts first."
      : error.message;
    redirect(`/vendors/${vendorId}?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/vendors");
  revalidatePath("/");
  redirect("/vendors");
}
