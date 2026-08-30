"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function submitApplication(organizationSlug: string, formData: FormData) {
  const rawValue = String(formData.get("requested_value") ?? "").trim();

  const values = {
    company_name: String(formData.get("company_name") ?? "").trim(),
    contact_name: String(formData.get("contact_name") ?? "").trim() || null,
    contact_email: String(formData.get("contact_email") ?? "").trim() || null,
    contact_phone: String(formData.get("contact_phone") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
    requested_contract_title: String(formData.get("requested_contract_title") ?? "").trim(),
    requested_contract_type: String(formData.get("requested_contract_type") ?? "").trim() || null,
    requested_value: rawValue ? Number(rawValue) : null,
    requested_start_date: String(formData.get("requested_start_date") ?? "").trim() || null,
    applicant_notes: String(formData.get("applicant_notes") ?? "").trim() || null,
  };

  if (!values.company_name || !values.requested_contract_title) {
    throw new Error("Company name and requested contract title are required");
  }

  const supabase = await createClient();

  const { data: organization, error: orgError } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", organizationSlug)
    .single();

  if (orgError || !organization) {
    throw new Error("This application link is no longer valid.");
  }

  const { data, error } = await supabase
    .from("vendor_applications")
    .insert({ ...values, organization_id: organization.id })
    .select("application_code")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/requests");
  revalidatePath("/");
  redirect(`/apply/thank-you?code=${encodeURIComponent(data.application_code)}`);
}

export async function markUnderReview(applicationId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("vendor_applications")
    .update({ status: "under_review" })
    .eq("id", applicationId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/requests");
  revalidatePath(`/requests/${applicationId}`);
  revalidatePath("/");
}

export async function approveApplication(applicationId: string, formData: FormData) {
  const reviewerName = String(formData.get("reviewer_name") ?? "").trim() || null;
  const reviewNotes = String(formData.get("review_notes") ?? "").trim() || null;

  const supabase = await createClient();

  const { data: application, error: fetchError } = await supabase
    .from("vendor_applications")
    .select("*")
    .eq("id", applicationId)
    .single();

  if (fetchError || !application) {
    throw new Error(fetchError?.message ?? "Application not found");
  }

  const { data: vendor, error: vendorError } = await supabase
    .from("vendors")
    .insert({
      name: application.company_name,
      contact_name: application.contact_name,
      contact_email: application.contact_email,
      contact_phone: application.contact_phone,
      address: application.address,
      status: "active",
      notes: `Registered from application ${application.application_code}.`,
    })
    .select("id")
    .single();

  if (vendorError) {
    throw new Error(vendorError.message);
  }

  const { data: contract, error: contractError } = await supabase
    .from("contracts")
    .insert({
      vendor_id: vendor.id,
      title: application.requested_contract_title,
      contract_type: application.requested_contract_type,
      description: application.applicant_notes,
      start_date: application.requested_start_date,
      value: application.requested_value,
      status: "draft",
      owner_name: reviewerName,
    })
    .select("id")
    .single();

  if (contractError) {
    throw new Error(contractError.message);
  }

  const { error: updateError } = await supabase
    .from("vendor_applications")
    .update({
      status: "approved",
      reviewer_name: reviewerName,
      review_notes: reviewNotes,
      decided_at: new Date().toISOString(),
      vendor_id: vendor.id,
      contract_id: contract.id,
    })
    .eq("id", applicationId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  revalidatePath("/requests");
  revalidatePath(`/requests/${applicationId}`);
  revalidatePath("/vendors");
  revalidatePath("/contracts");
  revalidatePath("/");
  redirect(`/requests/${applicationId}`);
}

export async function rejectApplication(applicationId: string, formData: FormData) {
  const reviewerName = String(formData.get("reviewer_name") ?? "").trim() || null;
  const reviewNotes = String(formData.get("review_notes") ?? "").trim() || null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("vendor_applications")
    .update({
      status: "rejected",
      reviewer_name: reviewerName,
      review_notes: reviewNotes,
      decided_at: new Date().toISOString(),
    })
    .eq("id", applicationId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/requests");
  revalidatePath(`/requests/${applicationId}`);
  revalidatePath("/");
  redirect(`/requests/${applicationId}`);
}

export async function deleteApplication(applicationId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("vendor_applications").delete().eq("id", applicationId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/requests");
  revalidatePath("/");
  redirect("/requests");
}
