"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { assertCanMutate } from "@/lib/permissions";

/** A logged risk event against a vendor — evidence for (or against) its risk tier, not tied to one contract. */
export async function addIncident(vendorId: string, formData: FormData) {
  const profile = await requireProfile();
  assertCanMutate(profile.role);
  const supabase = await createClient();

  const title = String(formData.get("title") ?? "").trim();
  const severity = String(formData.get("severity") ?? "").trim();
  const occurredOn = String(formData.get("occurred_on") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!title) throw new Error("Describe the incident");
  if (!severity) throw new Error("Select a severity");
  if (!occurredOn) throw new Error("An occurred-on date is required");

  const { error } = await supabase.from("vendor_incidents").insert({
    vendor_id: vendorId,
    title,
    severity,
    occurred_on: occurredOn,
    description,
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/vendors/${vendorId}`);
  revalidatePath("/alerts");
  revalidatePath("/");
}

export async function resolveIncident(vendorId: string, incidentId: string) {
  const profile = await requireProfile();
  assertCanMutate(profile.role);
  const supabase = await createClient();

  const { error } = await supabase
    .from("vendor_incidents")
    .update({ resolved_at: new Date().toISOString() })
    .eq("id", incidentId);

  if (error) throw new Error(error.message);

  revalidatePath(`/vendors/${vendorId}`);
  revalidatePath("/alerts");
  revalidatePath("/");
}

export async function deleteIncident(vendorId: string, incidentId: string) {
  const profile = await requireProfile();
  assertCanMutate(profile.role);
  const supabase = await createClient();

  const { error } = await supabase.from("vendor_incidents").delete().eq("id", incidentId);
  if (error) throw new Error(error.message);

  revalidatePath(`/vendors/${vendorId}`);
  revalidatePath("/alerts");
  revalidatePath("/");
}
