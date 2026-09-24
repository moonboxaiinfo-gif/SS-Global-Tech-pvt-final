import { buildBrandedPdf, type PdfDocument } from "@/lib/pdf";
import { supabase, supabaseAnonKey, supabaseUrl } from "@/lib/supabase";

export type ShareStage = "idle" | "generating" | "uploading" | "opening";

export type LocalWhatsAppShareResult = {
  opened: boolean;
  downloaded: boolean;
  error?: string;
};

export type DocumentShareResult = {
  opened: boolean;
  uploaded: boolean;
  publicUrl?: string;
  error?: string;
};

/** Normalize common Sri Lankan mobile formats to the wa.me-compatible 94XXXXXXXXX form. */
export function normalizeSriLankanPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0094")) return digits.slice(2);
  if (digits.startsWith("94")) return digits;
  if (digits.startsWith("0")) return `94${digits.slice(1)}`;
  if (digits.startsWith("7") && digits.length === 9) return `94${digits}`;
  return digits;
}

export function buildWhatsAppUrl(phone: string, message: string) {
  const normalized = normalizeSriLankanPhone(phone);
  const base = normalized ? `https://wa.me/${normalized}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(message)}`;
}

function safeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
}

/** Upload the generated PDF to the public documents bucket when Supabase Storage is configured. */
export async function uploadPdfToDocuments(data: PdfDocument, fileName: string) {
  const blob = buildBrandedPdf(data).output("blob") as Blob;
  if (!supabaseUrl || !supabaseAnonKey) {
    return { blob, publicUrl: undefined, uploaded: false, error: "Supabase Storage is not configured." };
  }

  const path = `whatsapp/${new Date().toISOString().slice(0, 10)}/${Date.now()}-${safeFileName(fileName)}`;
  const { error } = await supabase.storage.from("documents").upload(path, blob, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (error) return { blob, publicUrl: undefined, uploaded: false, error: error.message };

  const { data: publicData } = supabase.storage.from("documents").getPublicUrl(path);
  return { blob, publicUrl: publicData.publicUrl, uploaded: Boolean(publicData.publicUrl) };
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function downloadAndRedirectViaWhatsApp({ data, fileName, phone, message, onStage }: { data: PdfDocument; fileName: string; phone: string; message: string; onStage?: (stage: ShareStage) => void }): Promise<LocalWhatsAppShareResult> {
  const normalized = normalizeSriLankanPhone(phone);
  if (!normalized) return { opened: false, downloaded: false, error: "Enter a valid Sri Lankan recipient phone number." };
  onStage?.("generating");
  const blob = buildBrandedPdf(data).output("blob") as Blob;
  downloadBlob(blob, fileName);
  await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
  onStage?.("opening");
  const opened = Boolean(window.open(buildWhatsAppUrl(normalized, message), "_blank", "noopener,noreferrer"));
  return { opened, downloaded: true, error: opened ? undefined : "WhatsApp could not be opened. Please open WhatsApp manually and attach the downloaded PDF." };
}

export async function sharePdfViaWhatsApp({ data, fileName, phone, message }: { data: PdfDocument; fileName: string; phone: string; message: (publicUrl?: string) => string }) : Promise<DocumentShareResult> {
  const normalized = normalizeSriLankanPhone(phone);
  if (!normalized) return { opened: false, uploaded: false, error: "Enter a valid Sri Lankan recipient phone number." };

  const uploaded = await uploadPdfToDocuments(data, fileName);
  if (!uploaded.uploaded || !uploaded.publicUrl) {
    downloadBlob(uploaded.blob, fileName);
    const fallbackMessage = `${message()}\n\nThe PDF was downloaded locally because public document storage is unavailable. Please attach it in WhatsApp.`;
    const opened = Boolean(window.open(buildWhatsAppUrl(normalized, fallbackMessage), "_blank", "noopener,noreferrer"));
    return { opened, uploaded: false, error: uploaded.error || "No public PDF URL was returned." };
  }

  const opened = Boolean(window.open(buildWhatsAppUrl(normalized, message(uploaded.publicUrl)), "_blank", "noopener,noreferrer"));
  return { opened, uploaded: true, publicUrl: uploaded.publicUrl };
}

export function shareResultMessage(result: DocumentShareResult) {
  if (result.uploaded) return "PDF uploaded to Supabase Storage and WhatsApp opened with the public link.";
  if (result.error) return `PDF downloaded locally. WhatsApp opened without a public link: ${result.error}`;
  return "PDF prepared for WhatsApp.";
}

export { downloadBlob };
