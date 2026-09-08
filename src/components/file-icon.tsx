"use client";

import {
  File,
  FileArchive,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  FileAudio,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fileKind, type FileKind } from "@/lib/file-utils";

const KIND_META: Record<FileKind, { icon: LucideIcon; classes: string; sizeClasses: string }> = {
  image: {
    icon: FileImage,
    classes: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-400",
    sizeClasses: "size-6",
  },
  video: {
    icon: FileVideo,
    classes: "bg-rose-100 text-rose-600 dark:bg-rose-950/70 dark:text-rose-400",
    sizeClasses: "size-6",
  },
  audio: {
    icon: FileAudio,
    classes: "bg-violet-100 text-violet-600 dark:bg-violet-950/70 dark:text-violet-400",
    sizeClasses: "size-6",
  },
  archive: {
    icon: FileArchive,
    classes: "bg-amber-100 text-amber-600 dark:bg-amber-950/70 dark:text-amber-400",
    sizeClasses: "size-6",
  },
  pdf: {
    icon: FileText,
    classes: "bg-red-100 text-red-600 dark:bg-red-950/70 dark:text-red-400",
    sizeClasses: "size-6",
  },
  doc: {
    icon: FileText,
    classes: "bg-teal-100 text-teal-700 dark:bg-teal-950/70 dark:text-teal-400",
    sizeClasses: "size-6",
  },
  sheet: {
    icon: FileSpreadsheet,
    classes: "bg-lime-100 text-lime-700 dark:bg-lime-950/70 dark:text-lime-400",
    sizeClasses: "size-6",
  },
  code: {
    icon: FileCode,
    classes: "bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-950/70 dark:text-fuchsia-400",
    sizeClasses: "size-6",
  },
  file: {
    icon: File,
    classes: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    sizeClasses: "size-6",
  },
};

export function FileIconBadge({
  name,
  mimeType,
  className,
  iconClassName,
}: {
  name: string;
  mimeType: string;
  className?: string;
  iconClassName?: string;
}) {
  const kind = fileKind(name, mimeType);
  const meta = KIND_META[kind];
  const Icon = meta.icon;

  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg",
        meta.classes,
        className ?? "size-10"
      )}
    >
      <Icon className={cn(meta.sizeClasses, iconClassName)} />
    </div>
  );
}
