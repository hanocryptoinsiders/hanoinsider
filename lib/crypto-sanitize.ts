import DOMPurify from "isomorphic-dompurify";

/** Alphanumeric + common crypto address/hash characters (hex, base58, etc.). */
const TX_HASH_RE = /^[a-zA-Z0-9:_\-./+]{8,200}$/;
const WALLET_RE = /^[a-zA-Z0-9:_\-./+]{8,128}$/;

export function sanitizeText(input: string, maxLen: number): string {
  return DOMPurify.sanitize(input.trim(), { ALLOWED_TAGS: [] }).slice(0, maxLen);
}

export function sanitizeFullName(input: string): string {
  return sanitizeText(input, 120);
}

export function sanitizeUserNotes(input: string | null | undefined): string | null {
  if (!input) return null;
  const cleaned = sanitizeText(input, 2000);
  return cleaned || null;
}

export function sanitizeAdminNotes(input: string | null | undefined): string | null {
  if (!input) return null;
  const cleaned = sanitizeText(input, 2000);
  return cleaned || null;
}

export function normalizeTransactionHash(input: string): string {
  return input.trim();
}

export function isValidTransactionHash(input: string): boolean {
  const hash = normalizeTransactionHash(input);
  return TX_HASH_RE.test(hash);
}

export function normalizeWalletAddress(input: string): string {
  return input.trim();
}

export function isValidWalletAddress(input: string): boolean {
  const addr = normalizeWalletAddress(input);
  return WALLET_RE.test(addr);
}

export function parseAmountPaid(input: unknown): number | null {
  if (typeof input === "number" && Number.isFinite(input) && input > 0) {
    return Math.round(input * 100) / 100;
  }
  if (typeof input === "string") {
    const parsed = Number(input.replace(/,/g, "").trim());
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.round(parsed * 100) / 100;
    }
  }
  return null;
}

export function resolveProofImageMime(file: File): string | null {
  const allowed = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/pjpeg"]);
  if (file.type && allowed.has(file.type)) return file.type === "image/jpg" ? "image/jpeg" : file.type;

  const name = file.name.toLowerCase();
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  return null;
}
