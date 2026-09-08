import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const files = await db.storedFile.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        slug: true,
        name: true,
        size: true,
        mimeType: true,
        downloads: true,
        createdAt: true,
      },
    });

    const totalSize = files.reduce((acc, f) => acc + f.size, 0);
    const totalDownloads = files.reduce((acc, f) => acc + f.downloads, 0);

    return NextResponse.json({
      files,
      stats: { count: files.length, totalSize, totalDownloads },
    });
  } catch (err) {
    console.error("List files error:", err);
    return NextResponse.json({ error: "Gagal memuat daftar file." }, { status: 500 });
  }
}
