"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  Check,
  ChevronRight,
  CloudUpload,
  Download,
  FileQuestion,
  FileX,
  FolderOpen,
  HardDrive,
  Link2,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { FileIconBadge } from "@/components/file-icon";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  fileKind,
  formatDate,
  formatSize,
  kindLabel,
  type FileRecord,
  type FileStats,
  type UploadItem,
} from "@/lib/file-utils";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `up_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Upload a single file with progress via XHR, resolves with the created record. */
function uploadFile(
  file: globalThis.File,
  onProgress: (pct: number) => void
): Promise<FileRecord> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as FileRecord);
        } catch {
          reject(new Error("Respons server tidak valid."));
        }
      } else {
        try {
          const data = JSON.parse(xhr.responseText);
          reject(new Error(data.error ?? `Gagal mengunggah (kode ${xhr.status}).`));
        } catch {
          reject(new Error(`Gagal mengunggah (kode ${xhr.status}).`));
        }
      }
    };
    xhr.onerror = () => reject(new Error("Koneksi ke server gagal."));
    xhr.open("POST", "/api/upload");
    xhr.send(formData);
  });
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Layout chrome                                                       */
/* ------------------------------------------------------------------ */

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" aria-label="DropZone — kembali ke beranda">
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-500/30">
            <CloudUpload className="size-5" aria-hidden="true" />
          </span>
          <span className="leading-tight">
            <span className="block text-lg font-bold tracking-tight">DropZone</span>
            <span className="-mt-0.5 block text-[11px] text-muted-foreground">file hosting &amp; berbagi</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="hidden rounded-full px-3 py-1 sm:inline-flex">
            <ShieldCheck className="mr-1 size-3 text-emerald-600" aria-hidden="true" />
            Maks 100 MB / file
          </Badge>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-auto border-t bg-muted/30">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 text-center text-xs text-muted-foreground sm:px-6">
        <p>
          <span className="font-semibold text-foreground">DropZone</span> — unggah, bagikan, dan unduh
          file dengan tautan sederhana.
        </p>
        <p className="mt-1">File tersimpan di server demo. Jangan unggah data sensitif atau rahasia.</p>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/* Drop zone                                                           */
/* ------------------------------------------------------------------ */

function DropZone({ onFiles }: { onFiles: (files: globalThis.File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);
  const [dragging, setDragging] = useState(false);

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounter.current += 1;
    if (e.dataTransfer?.types?.includes("Files")) setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (dragCounter.current === 0) setDragging(false);
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      dragCounter.current = 0;
      setDragging(false);
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length > 0) onFiles(files);
    },
    [onFiles]
  );

  const handleKeyDown = useCallback((e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      inputRef.current?.click();
    }
  }, []);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Zona unggah file: tarik dan letakkan file, atau tekan Enter untuk memilih file"
      onClick={() => inputRef.current?.click()}
      onKeyDown={handleKeyDown}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:p-12 ${
        dragging
          ? "border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40"
          : "border-border hover:border-emerald-400 hover:bg-muted/40 dark:hover:border-emerald-700"
      }`}
    >
      <div
        aria-hidden="true"
        className={`mx-auto flex size-14 items-center justify-center rounded-2xl transition-transform duration-200 sm:size-16 ${
          dragging
            ? "scale-110 bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
            : "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-400"
        }`}
      >
        <CloudUpload className="size-7 sm:size-8" />
      </div>
      <p className="mt-4 text-base font-semibold sm:text-lg">
        {dragging ? "Lepaskan file untuk mengunggah" : "Tarik & letakkan file di sini"}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        atau{" "}
        <span className="font-medium text-emerald-600 underline decoration-emerald-300 underline-offset-2 dark:text-emerald-400">
          pilih file
        </span>{" "}
        dari perangkatmu
      </p>
      <p className="mt-3 text-xs text-muted-foreground">
        Maksimal 100 MB per file · boleh beberapa file sekaligus
      </p>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length > 0) onFiles(files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Upload queue                                                        */
/* ------------------------------------------------------------------ */

function UploadQueue({
  uploads,
  onDismiss,
  onCopy,
}: {
  uploads: UploadItem[];
  onDismiss: (id: string) => void;
  onCopy: (item: UploadItem) => void;
}) {
  if (uploads.length === 0) return null;

  return (
    <ScrollArea className="max-h-72">
      <div className="space-y-2 p-4 pt-0">
        {uploads.map((u) => (
          <div
            key={u.id}
            className="flex items-start gap-3 rounded-lg border bg-card p-3"
            role="status"
            aria-live="polite"
          >
            <FileIconBadge name={u.name} mimeType="" className="size-9" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-sm font-medium" title={u.name}>
                  {u.name}
                </p>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {u.status === "uploading" ? `${u.progress}%` : formatSize(u.size)}
                </span>
              </div>

              {u.status === "uploading" && (
                <Progress value={u.progress} className="mt-2 h-1.5" aria-label={`Progres unggah ${u.progress}%`} />
              )}

              {u.status === "done" && u.slug && (
                <div className="mt-1.5 flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 text-[11px] text-muted-foreground">
                    {u.link ?? `/?file=${u.slug}`}
                  </code>
                  <Button size="sm" variant="outline" className="h-8 px-2.5 text-xs" onClick={() => onCopy(u)}>
                    <Link2 className="size-3.5" aria-hidden="true" />
                    Salin
                  </Button>
                </div>
              )}

              {u.status === "error" && (
                <p className="mt-1 text-xs text-destructive">{u.error}</p>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
              {u.status === "uploading" && (
                <Loader2 className="size-4 animate-spin text-emerald-600" aria-hidden="true" />
              )}
              {u.status === "done" && (
                <span className="flex size-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                  <Check className="size-3.5" aria-hidden="true" />
                </span>
              )}
              {u.status === "error" && (
                <span className="flex size-5 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400">
                  <X className="size-3.5" aria-hidden="true" />
                </span>
              )}
              <button
                type="button"
                onClick={() => onDismiss(u.id)}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label={`Sembunyikan notifikasi unggahan ${u.name}`}
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

/* ------------------------------------------------------------------ */
/* Stats                                                               */
/* ------------------------------------------------------------------ */

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FolderOpen;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-400">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xl font-bold leading-tight">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* File row                                                            */
/* ------------------------------------------------------------------ */

function RowAction({
  label,
  onClick,
  href,
  destructive,
  children,
}: {
  label: string;
  onClick?: () => void;
  href?: string;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  const btn = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={`size-10 ${
        destructive
          ? "text-muted-foreground hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
          : "text-muted-foreground hover:text-foreground"
      }`}
      onClick={onClick}
      aria-label={label}
    >
      {children}
    </Button>
  );

  const linked = href ? (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-10 text-muted-foreground hover:text-foreground"
      asChild
    >
      <a href={href} aria-label={label} title={label}>
        {children}
      </a>
    </Button>
  ) : null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{href ? linked : btn}</TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function FileRow({
  file,
  onCopy,
  onDelete,
}: {
  file: FileRecord;
  onCopy: (file: FileRecord) => void;
  onDelete: (file: FileRecord) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-accent/40 sm:p-4">
      <FileIconBadge name={file.name} mimeType={file.mimeType} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" title={file.name}>
          {file.name}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
          <span>{formatSize(file.size)}</span>
          <span aria-hidden="true">·</span>
          <span>{formatDate(file.createdAt)}</span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1">
            <Download className="size-3" aria-hidden="true" />
            {file.downloads} unduhan
          </span>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <RowAction label="Salin tautan berbagi" onClick={() => onCopy(file)}>
          <Link2 className="size-4.5" aria-hidden="true" />
        </RowAction>
        <RowAction label="Unduh file" href={`/api/files/${file.slug}/download`}>
          <Download className="size-4.5" aria-hidden="true" />
        </RowAction>
        <RowAction label="Hapus file" destructive onClick={() => onDelete(file)}>
          <Trash2 className="size-4.5" aria-hidden="true" />
        </RowAction>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Manager view (beranda)                                              */
/* ------------------------------------------------------------------ */

function ManagerView() {
  const { toast } = useToast();
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [stats, setStats] = useState<FileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<FileRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadFiles = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch("/api/files", { cache: "no-store" });
      if (!res.ok) throw new Error("Gagal memuat daftar file.");
      const data = (await res.json()) as { files: FileRecord[]; stats: FileStats };
      setFiles(data.files);
      setStats(data.stats);
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Gagal memuat",
        description: (e as Error).message,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleFiles = useCallback(
    async (fileList: globalThis.File[]) => {
      const items: UploadItem[] = fileList.map((f) => ({
        id: uid(),
        name: f.name,
        size: f.size,
        progress: 0,
        status: "uploading" as const,
      }));
      setUploads((prev) => [...items, ...prev]);

      await Promise.all(
        items.map(async (item, idx) => {
          try {
            const record = await uploadFile(fileList[idx], (pct) => {
              setUploads((prev) =>
                prev.map((u) => (u.id === item.id ? { ...u, progress: pct } : u))
              );
            });
            const link =
              typeof window !== "undefined"
                ? `${window.location.origin}/?file=${record.slug}`
                : `/?file=${record.slug}`;
            setUploads((prev) =>
              prev.map((u) =>
                u.id === item.id ? { ...u, status: "done", progress: 100, slug: record.slug, link } : u
              )
            );
            toast({
              title: "Upload berhasil",
              description: `${record.name} siap dibagikan.`,
            });
          } catch (e) {
            setUploads((prev) =>
              prev.map((u) =>
                u.id === item.id ? { ...u, status: "error", error: (e as Error).message } : u
              )
            );
            toast({
              variant: "destructive",
              title: "Upload gagal",
              description: (e as Error).message,
            });
          }
        })
      );

      loadFiles(true);
    },
    [loadFiles, toast]
  );

  const copyLink = useCallback(
    async (file: FileRecord) => {
      const url =
        typeof window !== "undefined"
          ? `${window.location.origin}/?file=${file.slug}`
          : `/?file=${file.slug}`;
      const ok = await copyToClipboard(url);
      if (ok) {
        toast({ title: "Tautan disalin", description: url });
      } else {
        toast({
          variant: "destructive",
          title: "Gagal menyalin",
          description: "Salin manual dari kolom tautan.",
        });
      }
    },
    [toast]
  );

  const copyUploadLink = useCallback(
    async (item: UploadItem) => {
      const url = item.link ?? (item.slug ? `/?file=${item.slug}` : "");
      const ok = await copyToClipboard(url);
      toast(
        ok
          ? { title: "Tautan disalin", description: url }
          : { variant: "destructive", title: "Gagal menyalin", description: "Coba lagi." }
      );
    },
    [toast]
  );

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/files/${deleteTarget.slug}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Gagal menghapus file.");
      }
      toast({ title: "File dihapus", description: `${deleteTarget.name} sudah dihapus dari server.` });
      setDeleteTarget(null);
      loadFiles(true);
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal menghapus", description: (e as Error).message });
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, loadFiles, toast]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return files;
    return files.filter((f) => f.name.toLowerCase().includes(q));
  }, [files, search]);

  return (
    <main className="flex-1">
      <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
        {/* Hero */}
        <section className="animate-in fade-in slide-in-from-bottom-2 text-center duration-500">
          <Badge
            variant="outline"
            className="rounded-full border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-400"
          >
            <Sparkles className="mr-1 size-3" aria-hidden="true" />
            Gratis · Tanpa registrasi
          </Badge>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
            Bagikan file dalam{" "}
            <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
              hitungan detik
            </span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:mt-4 sm:text-base">
            Unggah file apa pun hingga 100 MB, dapatkan tautan berbagi, lalu bagikan ke siapa
            saja — seperti MediaFire, tapi lebih simpel.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-2 text-xs text-muted-foreground">
            {["Unggah file", "Salin tautan", "Bagikan!"].map((step, i) => (
              <span key={step} className="flex items-center gap-1.5">
                <span className="flex size-5 items-center justify-center rounded-full bg-emerald-100 font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                  {i + 1}
                </span>
                {step}
                {i < 2 && <ChevronRight className="size-3.5" aria-hidden="true" />}
              </span>
            ))}
          </div>
        </section>

        {/* Upload */}
        <section aria-label="Unggah file" className="animate-in fade-in duration-500">
          <Card className="overflow-hidden">
            <div className="p-3 sm:p-4">
              <DropZone onFiles={handleFiles} />
            </div>
            <div className="border-t">{uploads.length > 0 && (
              <UploadQueue
                uploads={uploads}
                onDismiss={(id) => setUploads((prev) => prev.filter((u) => u.id !== id))}
                onCopy={copyUploadLink}
              />
            )}</div>
          </Card>
        </section>

        {/* Stats */}
        <section aria-label="Statistik penyimpanan" className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <StatCard icon={FolderOpen} label="Total file" value={stats ? String(stats.count) : "…"} />
          <StatCard icon={HardDrive} label="Penyimpanan terpakai" value={stats ? formatSize(stats.totalSize) : "…"} />
          <StatCard icon={Download} label="Total unduhan" value={stats ? String(stats.totalDownloads) : "…"} />
        </section>

        {/* File list */}
        <section aria-label="Daftar file" className="space-y-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-semibold">File kamu</h2>
              <p className="text-sm text-muted-foreground">
                {loading ? "Memuat…" : `${files.length} file tersimpan di server`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  type="search"
                  placeholder="Cari file…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                  aria-label="Cari file berdasarkan nama"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-10 shrink-0"
                onClick={() => loadFiles(true)}
                disabled={refreshing}
                aria-label="Muat ulang daftar file"
              >
                <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border p-3 sm:p-4">
                  <Skeleton className="size-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : files.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center">
              <div
                aria-hidden="true"
                className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted"
              >
                <FileQuestion className="size-7 text-muted-foreground" />
              </div>
              <p className="mt-4 font-medium">Belum ada file</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Unggah file pertamamu lewat zona unggah di atas, lalu bagikan tautannya.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <p className="rounded-xl border p-6 text-center text-sm text-muted-foreground">
              Tidak ada file yang cocok dengan pencarian “{search}”.
            </p>
          ) : (
            <TooltipProvider delayDuration={250}>
              <div className="space-y-2">
                {filtered.map((file) => (
                  <FileRow key={file.slug} file={file} onCopy={copyLink} onDelete={setDeleteTarget} />
                ))}
              </div>
            </TooltipProvider>
          )}
        </section>
      </div>

      {/* Hapus */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus file ini?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">“{deleteTarget?.name}”</span> akan dihapus
              permanen dari server dan tautan berbaginya tidak akan bisa diakses lagi. Tindakan ini
              tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              Ya, hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Download view                                                       */
/* ------------------------------------------------------------------ */

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof HardDrive;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-3 py-2.5">
      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

function DownloadView({ slug }: { slug: string }) {
  const { toast } = useToast();
  const [file, setFile] = useState<FileRecord | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/files/${encodeURIComponent(slug)}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? "File tidak ditemukan.");
        }
        return res.json() as Promise<FileRecord>;
      })
      .then((f) => {
        if (active) {
          setFile(f);
          setState("ok");
        }
      })
      .catch((e: Error) => {
        if (active) {
          setErrorMsg(e.message);
          setState("error");
        }
      });
    return () => {
      active = false;
    };
  }, [slug]);

  const handleCopy = useCallback(async () => {
    const url = window.location.href;
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopied(true);
      toast({ title: "Tautan disalin", description: url });
      setTimeout(() => setCopied(false), 2500);
    } else {
      toast({ variant: "destructive", title: "Gagal menyalin", description: "Coba salin manual." });
    }
  }, [toast]);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10 sm:py-16">
      {state === "loading" && (
        <Card className="w-full max-w-md">
          <CardContent className="space-y-5 p-8">
            <Skeleton className="mx-auto size-16 rounded-2xl" />
            <Skeleton className="mx-auto h-6 w-2/3" />
            <div className="grid grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-12 w-full rounded-xl" />
          </CardContent>
        </Card>
      )}

      {state === "error" && (
        <Card className="animate-in fade-in zoom-in-95 w-full max-w-md duration-300">
          <CardContent className="space-y-4 p-8 text-center">
            <div
              aria-hidden="true"
              className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950/70 dark:text-red-400"
            >
              <FileX className="size-8" />
            </div>
            <h1 className="text-xl font-bold">File tidak ditemukan</h1>
            <p className="text-sm text-muted-foreground">
              {errorMsg} Mungkin file sudah dihapus atau tautannya salah.
            </p>
            <Button asChild variant="outline" className="h-11">
              <Link href="/">
                <ArrowLeft className="size-4" aria-hidden="true" />
                Kembali ke beranda
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {state === "ok" && file && (
        <Card className="animate-in fade-in slide-in-from-bottom-4 w-full max-w-md overflow-hidden duration-400">
          <div aria-hidden="true" className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-600" />
          <CardContent className="space-y-6 p-6 sm:p-8">
            <div className="space-y-4 text-center">
              <FileIconBadge
                name={file.name}
                mimeType={file.mimeType}
                className="mx-auto size-16 rounded-2xl"
                iconClassName="size-8"
              />
              <div className="space-y-1.5">
                <h1 className="break-words text-lg font-bold leading-snug sm:text-xl" title={file.name}>
                  {file.name}
                </h1>
                <Badge variant="secondary" className="rounded-full">
                  {kindLabel(fileKind(file.name, file.mimeType))}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <InfoRow icon={HardDrive} label="Ukuran file" value={formatSize(file.size)} />
              <InfoRow icon={CalendarClock} label="Diunggah" value={formatDate(file.createdAt)} />
              <InfoRow icon={Download} label="Total unduhan" value={String(file.downloads)} />
              <InfoRow icon={ShieldCheck} label="Status" value="Siap diunduh" />
            </div>

            <Button
              asChild
              size="lg"
              className="h-12 w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-base font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:from-emerald-600 hover:to-teal-700 hover:shadow-emerald-500/35"
            >
              <a
                href={`/api/files/${file.slug}/download`}
                onClick={() => setFile((f) => (f ? { ...f, downloads: f.downloads + 1 } : f))}
                aria-label={`Unduh ${file.name}, ukuran ${formatSize(file.size)}`}
              >
                <Download className="size-5" aria-hidden="true" />
                Unduh File ({formatSize(file.size)})
              </a>
            </Button>

            <div className="flex gap-2">
              <Button variant="outline" className="h-11 flex-1" onClick={handleCopy}>
                {copied ? (
                  <Check className="size-4 text-emerald-600" aria-hidden="true" />
                ) : (
                  <Link2 className="size-4" aria-hidden="true" />
                )}
                {copied ? "Tersalin!" : "Salin tautan"}
              </Button>
              <Button asChild variant="ghost" className="h-11 flex-1">
                <Link href="/">
                  <ArrowLeft className="size-4" aria-hidden="true" />
                  Beranda
                </Link>
              </Button>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Tautan aktif selama file masih tersimpan di server DropZone.
            </p>
          </CardContent>
        </Card>
      )}
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Root                                                                */
/* ------------------------------------------------------------------ */

function App() {
  const searchParams = useSearchParams();
  const fileParam = searchParams.get("file");

  if (fileParam) return <DownloadView slug={fileParam} />;
  return <ManagerView />;
}

function MainSkeleton() {
  return (
    <main className="flex flex-1 items-center justify-center p-10">
      <Loader2 className="size-8 animate-spin text-emerald-600" aria-label="Memuat" />
    </main>
  );
}

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <Suspense fallback={<MainSkeleton />}>
        <App />
      </Suspense>
      <Footer />
    </div>
  );
}
