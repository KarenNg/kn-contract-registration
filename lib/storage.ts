const BUCKET = "contract-documents";

export function getDocumentPublicUrl(filePath: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filePath}`;
}
