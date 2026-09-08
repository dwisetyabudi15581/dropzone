import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export interface FileRecord {
  slug: string;
  name: string;
  size: number;
  mimeType: string;
  downloads: number;
  createdAt: string;
}

export interface FileStats {
  count: number;
  totalSize: number;
  totalDownloads: number;
}

export interface UploadItem {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: "uploading" | "done" | "error";
  slug?: string;
  link?: string;
  error?: string;
}

export type FileKind =
  | "image"
  | "video"
  | "audio"
  | "archive"
  | "pdf"
  | "doc"
  | "sheet"
  | "code"
  | "file";

/** Format bytes into a human readable Indonesian-friendly string */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const size = bytes / Math.pow(1024, i + 1);
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Format ISO date to Indonesian long format */
export function formatDate(iso: string): string {
  try {
    return format(new Date(iso), "d MMMM yyyy · HH.mm", { locale: idLocale });
  } catch {
    return iso;
  }
}

/** Detect file category from filename + mime type */
export function fileKind(name: string, mimeType: string): FileKind {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (mimeType.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico"].includes(ext))
    return "image";
  if (mimeType.startsWith("video/") || ["mp4", "mkv", "avi", "mov", "webm", "flv"].includes(ext))
    return "video";
  if (mimeType.startsWith("audio/") || ["mp3", "wav", "flac", "ogg", "m4a", "aac"].includes(ext))
    return "audio";
  if (["zip", "rar", "7z", "tar", "gz", "bz2", "iso"].includes(ext)) return "archive";
  if (ext === "pdf" || mimeType === "application/pdf") return "pdf";
  if (["doc", "docx", "odt", "rtf", "txt", "md"].includes(ext)) return "doc";
  if (["xls", "xlsx", "ods", "csv"].includes(ext)) return "sheet";
  if (
    ["js", "jsx", "ts", "tsx", "py", "json", "html", "css", "java", "c", "cpp", "go", "rs", "php", "rb", "sh", "yml", "yaml", "xml", "sql"].includes(ext)
  )
    return "code";
  return "file";
}

/** Human readable label for a file kind */
export function kindLabel(kind: FileKind): string {
  const labels: Record<FileKind, string> = {
    image: "Gambar",
    video: "Video",
    audio: "Audio",
    archive: "Arsip ZIP",
    pdf: "Dokumen PDF",
    doc: "Dokumen",
    sheet: "Spreadsheet",
    code: "Kode sumber",
    file: "File",
  };
  return labels[kind];
}
