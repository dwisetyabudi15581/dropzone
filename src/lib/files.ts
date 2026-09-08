import { randomBytes } from "crypto";
import path from "path";

export const UPLOAD_DIR = path.join(process.cwd(), "uploads");

/** Max upload size: 100 MB */
export const MAX_FILE_SIZE = 100 * 1024 * 1024;

/** Generate a short URL-safe slug for share links, e.g. "k3x9f2ab" */
export function generateSlug(length = 8): string {
  const alphabet = "abcdefghijkmnopqrstuvwxyz23456789";
  const bytes = randomBytes(length);
  let slug = "";
  for (let i = 0; i < length; i++) {
    slug += alphabet[bytes[i] % alphabet.length];
  }
  return slug;
}

/** Format bytes into a human readable string */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i + 1);
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Sanitize a filename to prevent path traversal and weird characters */
export function sanitizeFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "file";
  return base.replace(/[\u0000-\u001f<>:"|?*]/g, "_").slice(0, 180) || "file";
}
