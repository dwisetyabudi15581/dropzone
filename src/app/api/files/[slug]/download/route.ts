import { NextRequest, NextResponse } from "next/server";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { Readable } from "stream";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { slug } = await params;
    const file = await db.storedFile.findUnique({ where: { slug } });

    if (!file) {
      return NextResponse.json({ error: "File tidak ditemukan." }, { status: 404 });
    }

    let fileSize: number;
    try {
      const fileStat = await stat(file.storagePath);
      fileSize = fileStat.size;
    } catch {
      return NextResponse.json({ error: "File fisik tidak ditemukan." }, { status: 410 });
    }

    // Increment download counter (fire and forget)
    db.storedFile
      .update({ where: { slug }, data: { downloads: { increment: 1 } } })
      .catch((e) => console.error("Gagal update counter download:", e));

    const nodeStream = createReadStream(file.storagePath);
    const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;

    const encodedName = encodeURIComponent(file.name);

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Length": String(fileSize),
        "Content-Disposition": `attachment; filename="${encodedName}"; filename*=UTF-8''${encodedName}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Download error:", err);
    return NextResponse.json({ error: "Gagal mengunduh file." }, { status: 500 });
  }
}
