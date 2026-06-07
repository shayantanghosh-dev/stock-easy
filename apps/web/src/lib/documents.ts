import type { DocumentKind } from "@/types/models";

/** Mirror of the API's server-side limits/allowlist (the API re-validates). */
export const DOC_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
export const ACCEPTED_DOC_MIME = ["application/pdf", "image/png", "image/jpeg"] as const;
export const ACCEPTED_DOC_EXT = [".pdf", ".png", ".jpg", ".jpeg"] as const;
/** `accept` attribute value for the file <input>. */
export const DOC_ACCEPT_ATTR = [...ACCEPTED_DOC_MIME, ...ACCEPTED_DOC_EXT].join(",");

export const DOCUMENT_KIND_LABEL: Record<DocumentKind, string> = {
  aadhaar: "Aadhaar",
  pan: "PAN card",
  license: "Drug license",
  gst: "GST certificate",
  other: "Other",
};

/** The KYC documents collected during verification, in display order. */
export const KYC_DOCUMENT_KINDS: DocumentKind[] = ["aadhaar", "pan", "license"];

export interface EncodedFile {
  fileName: string;
  mimeType: string;
  /** Base64 without the data: prefix. */
  data: string;
  byteSize: number;
}

/** Read a File into base64 (data-URL prefix stripped) for JSON upload. */
export function fileToBase64(file: File): Promise<EncodedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the file"));
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const comma = result.indexOf(",");
      const data = comma >= 0 ? result.slice(comma + 1) : result;
      resolve({ fileName: file.name, mimeType: file.type, data, byteSize: file.size });
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Sniff the true MIME type from a file's leading bytes (defence-in-depth UX —
 * the server re-checks). Returns the detected allowed type or null.
 */
export async function sniffFileMime(file: File): Promise<(typeof ACCEPTED_DOC_MIME)[number] | null> {
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  if (head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46) return "application/pdf";
  if (
    head[0] === 0x89 &&
    head[1] === 0x50 &&
    head[2] === 0x4e &&
    head[3] === 0x47 &&
    head[4] === 0x0d &&
    head[5] === 0x0a &&
    head[6] === 0x1a &&
    head[7] === 0x0a
  ) {
    return "image/png";
  }
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return "image/jpeg";
  return null;
}

/** Human-readable byte size, e.g. "1.4 MB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
