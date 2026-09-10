import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No video file provided." }, { status: 400 });
    }

    const name = file.name || "video.mp4";
    const ext = path.extname(name).toLowerCase();
    if (![".mp4", ".webm", ".mov", ".m4v"].includes(ext)) {
      return NextResponse.json(
        { error: "Only native video formats (.mp4, .webm, .mov) are allowed." },
        { status: 400 }
      );
    }

    // Limit video size (e.g. 250MB for native upload)
    if (file.size > 250 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Maximum video size is 250MB." },
        { status: 413 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const videosDir = path.join(process.cwd(), "public", "videos");
    await mkdir(videosDir, { recursive: true });

    const cleanBase = path.basename(name, ext).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
    const fileName = `${cleanBase || "video"}_${Date.now()}${ext}`;
    const targetPath = path.join(videosDir, fileName);

    await writeFile(targetPath, buffer);

    const publicUrl = `/videos/${fileName}`;
    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName,
      size: file.size,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Video upload failed." },
      { status: 500 }
    );
  }
}
