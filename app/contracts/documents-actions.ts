"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "contract-documents";

export async function uploadContractDocument(contractId: string, formData: FormData) {
  const file = formData.get("file") as File | null;
  const documentType = String(formData.get("document_type") ?? "other");
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!file || file.size === 0) {
    throw new Error("Choose a file to upload");
  }

  const supabase = await createClient();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${contractId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || undefined });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { error: insertError } = await supabase.from("contract_documents").insert({
    contract_id: contractId,
    file_name: file.name,
    file_path: path,
    file_size: file.size,
    mime_type: file.type || null,
    document_type: documentType,
    notes,
  });

  if (insertError) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw new Error(insertError.message);
  }

  revalidatePath(`/contracts/${contractId}`);
}

export async function deleteContractDocument(
  contractId: string,
  documentId: string,
  filePath: string,
) {
  const supabase = await createClient();

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
