import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import path from "node:path";
import { writeFile, mkdir } from "node:fs/promises";

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

    const cleanBase = path.basename(name, ext).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
    const fileName = `${cleanBase || "video"}_${Date.now()}${ext}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Try uploading to Supabase Storage "videos" bucket
    try {
      const supabase = getServiceSupabase();
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("videos")
        .upload(fileName, buffer, {
          contentType: file.type || "video/mp4",
          upsert: true,
        });

      if (!uploadError && uploadData) {
        const { data: { publicUrl } } = supabase.storage.from("videos").getPublicUrl(fileName);
        return NextResponse.json({
          success: true,
          url: publicUrl,
          fileName,
          size: file.size,
          provider: "supabase",
        });
      }
    } catch (sbErr) {
      console.warn("Supabase upload skipped or failed, falling back to local storage:", sbErr);
    }

    // 2. Fallback to local /videos/ directory
    try {
      const videosDir = path.join(process.cwd(), "public", "videos");
      await mkdir(videosDir, { recursive: true });
      const targetPath = path.join(videosDir, fileName);
      await writeFile(targetPath, buffer);

      return NextResponse.json({
        success: true,
        url: `/videos/${fileName}`,
        fileName,
        size: file.size,
        provider: "local",
      });
    } catch (localErr) {
      console.error("Local file writing failed:", localErr);
      return NextResponse.json(
        { error: "Failed to upload video to both cloud and local storage." },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Video upload failed." },
      { status: 500 }
    );
  }
}
