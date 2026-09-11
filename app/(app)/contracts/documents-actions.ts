"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, type CurrentProfile } from "@/lib/auth";
import { logContractEvent } from "@/lib/contracts";
import { assertCanManageContract } from "@/lib/permissions";

const BUCKET = "contract-documents";

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

async function storeFile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  contractId: string,
  file: File,
  documentType: string,
  notes: string | null,
  expiresOn: string | null,
) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${contractId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || undefined });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data, error: insertError } = await supabase
    .from("contract_documents")
    .insert({
      contract_id: contractId,
      file_name: file.name,
      file_path: path,
      file_size: file.size,
      mime_type: file.type || null,
      document_type: documentType,
      notes,
      expires_on: expiresOn,
    })
    .select("id")
    .single();

  if (insertError) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw new Error(insertError.message);
  }

  return data.id as string;
}

export async function uploadContractDocument(contractId: string, formData: FormData) {
  const file = formData.get("file") as File | null;
  const documentType = String(formData.get("document_type") ?? "other");
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const expiresOn = String(formData.get("expires_on") ?? "").trim() || null;

  if (!file || file.size === 0) {
    throw new Error("Choose a file to upload");
  }

  const profile = await requireProfile();
  const supabase = await createClient();
  await requireContractAccess(supabase, profile, contractId);
  await storeFile(supabase, contractId, file, documentType, notes, expiresOn);
  await logContractEvent(
    supabase,
    contractId,
    "document_uploaded",
    `Uploaded ${file.name}`,
    `Document type: ${documentType.replace(/_/g, " ")}${expiresOn ? ` · Expires ${expiresOn}` : ""}`,
  );

  revalidatePath(`/contracts/${contractId}`);
}

/**
 * Replaces a document in place: the new file becomes current, the old one is
 * kept on file (not deleted) and marked superseded so there's a paper trail
 * of what a contract's supporting documents looked like at any point.
 */
export async function replaceContractDocument(
  contractId: string,
  oldDocumentId: string,
  formData: FormData,
) {
  const file = formData.get("file") as File | null;

  if (!file || file.size === 0) {
    throw new Error("Choose a replacement file to upload");
  }

  const profile = await requireProfile();
  const supabase = await createClient();
  await requireContractAccess(supabase, profile, contractId);

  const { data: oldDoc, error: fetchError } = await supabase
    .from("contract_documents")
    .select("document_type, file_name, expires_on")
    .eq("id", oldDocumentId)
    .single();

  if (fetchError || !oldDoc) {
    throw new Error(fetchError?.message ?? "Original document not found");
  }

  const expiresOnOverride = String(formData.get("expires_on") ?? "").trim() || null;
  const newDocId = await storeFile(
    supabase,
    contractId,
    file,
    oldDoc.document_type,
    null,
    expiresOnOverride ?? oldDoc.expires_on,
  );

  const { error: supersedeError } = await supabase
    .from("contract_documents")
    .update({ superseded_at: new Date().toISOString(), superseded_by_id: newDocId })
    .eq("id", oldDocumentId);

  if (supersedeError) {
    throw new Error(supersedeError.message);
  }

  await logContractEvent(
    supabase,
    contractId,
    "document_superseded",
    `Replaced ${oldDoc.file_name} with ${file.name}`,
  );

  revalidatePath(`/contracts/${contractId}`);
}

export async function deleteContractDocument(
  contractId: string,
  documentId: string,
  filePath: string,
) {
  const profile = await requireProfile();
  const supabase = await createClient();
  await requireContractAccess(supabase, profile, contractId);

  await supabase.storage.from(BUCKET).remove([filePath]);

  const { error } = await supabase
    .from("contract_documents")
    .delete()
    .eq("id", documentId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/contracts/${contractId}`);
}

/** Dismisses a document-expiry alert (e.g. an insurance certificate) until the situation changes. */
export async function acknowledgeDocumentExpiry(contractId: string, documentId: string) {
  const profile = await requireProfile();
  const supabase = await createClient();
  await requireContractAccess(supabase, profile, contractId);

  const { data: doc, error } = await supabase
    .from("contract_documents")
    .update({ expiry_acknowledged_at: new Date().toISOString() })
    .eq("id", documentId)
    .select("file_name")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await logContractEvent(
    supabase,
    contractId,
    "document_expiry_acknowledged",
    `Expiry alert acknowledged for ${doc?.file_name ?? "document"}`,
  );

  revalidatePath("/alerts");
  revalidatePath("/");
  revalidatePath(`/contracts/${contractId}`);
}
