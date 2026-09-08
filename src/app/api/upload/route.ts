import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import { db } from "@/lib/db";
import { UPLOAD_DIR, MAX_FILE_SIZE, generateSlug, sanitizeFileName } from "@/lib/files";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Tidak ada file yang dikirim." }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "File kosong tidak dapat diunggah." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Ukuran file melebihi batas maksimal 100 MB." },
        { status: 413 }
      );
    }

    const safeName = sanitizeFileName(file.name);
    const slug = generateSlug();
    const storedName = `${slug}_${safeName}`;
    const storagePath = `${UPLOAD_DIR}/${storedName}`;

    await mkdir(UPLOAD_DIR, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(storagePath, buffer);

    const record = await db.storedFile.create({
      data: {
        slug,
        name: safeName,
        size: file.size,
        mimeType: file.type || "application/octet-stream",
        storagePath,
      },
    });

    return NextResponse.json(
      {
        slug: record.slug,
        name: record.name,
        size: record.size,
        mimeType: record.mimeType,
        downloads: record.downloads,
        createdAt: record.createdAt,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Gagal mengunggah file." }, { status: 500 });
  }
}
