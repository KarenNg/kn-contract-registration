"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { assertCanMutate } from "@/lib/permissions";

function fromFormData(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    contact_name: String(formData.get("contact_name") ?? "").trim() || null,
    contact_email: String(formData.get("contact_email") ?? "").trim() || null,
    contact_phone: String(formData.get("contact_phone") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
    status: String(formData.get("status") ?? "active"),
    notes: String(formData.get("notes") ?? "").trim() || null,
    risk_tier: String(formData.get("risk_tier") ?? "").trim() || null,
    last_risk_review_at: String(formData.get("last_risk_review_at") ?? "").trim() || null,
    compliance_doc_expires_on: String(formData.get("compliance_doc_expires_on") ?? "").trim() || null,
  };
}

export async function createVendor(formData: FormData) {
  const profile = await requireProfile();
  assertCanMutate(profile.role);

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
  const profile = await requireProfile();
  assertCanMutate(profile.role);

  const values = fromFormData(formData);
  if (!values.name) {
    throw new Error("Vendor name is required");
  }

  const supabase = await createClient();

  const { data: current } = await supabase
    .from("vendors")
    .select("compliance_doc_expires_on")
    .eq("id", vendorId)
    .single();

  // A changed expiry date is a new deadline — don't let a stale acknowledgement hide it.
  const payload =
    current && current.compliance_doc_expires_on !== values.compliance_doc_expires_on
      ? { ...values, compliance_doc_acknowledged_at: null }
      : values;

  const { error } = await supabase
    .from("vendors")
    .update(payload)
    .eq("id", vendorId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/vendors");
  revalidatePath(`/vendors/${vendorId}`);
  revalidatePath("/alerts");
  revalidatePath("/");
}

export async function deleteVendor(vendorId: string) {
  const profile = await requireProfile();
  assertCanMutate(profile.role);

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

/** Dismisses a vendor's compliance-document expiry alert until the situation changes. */
export async function acknowledgeVendorComplianceExpiry(vendorId: string) {
  const profile = await requireProfile();
  assertCanMutate(profile.role);

  const supabase = await createClient();
  const { error } = await supabase
    .from("vendors")
    .update({ compliance_doc_acknowledged_at: new Date().toISOString() })
    .eq("id", vendorId);

  if (error) throw new Error(error.message);

  revalidatePath("/vendors");
  revalidatePath(`/vendors/${vendorId}`);
  revalidatePath("/alerts");
  revalidatePath("/");
}
