import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import { db } from "@/lib/db";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { slug } = await params;
    const file = await db.storedFile.findUnique({ where: { slug } });

    if (!file) {
      return NextResponse.json({ error: "File tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({
      slug: file.slug,
      name: file.name,
      size: file.size,
      mimeType: file.mimeType,
      downloads: file.downloads,
      createdAt: file.createdAt,
    });
  } catch (err) {
    console.error("Get file error:", err);
    return NextResponse.json({ error: "Gagal memuat info file." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { slug } = await params;
    const file = await db.storedFile.findUnique({ where: { slug } });

    if (!file) {
      return NextResponse.json({ error: "File tidak ditemukan." }, { status: 404 });
    }

    await db.storedFile.delete({ where: { slug } });

    try {
      await unlink(file.storagePath);
    } catch (e) {
      console.warn("File fisik sudah tidak ada:", e);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete file error:", err);
    return NextResponse.json({ error: "Gagal menghapus file." }, { status: 500 });
  }
}
