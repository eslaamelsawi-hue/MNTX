const fs = require('fs')
const path = require('path')
const writeF = (f, c) => { const d = path.dirname(f); if (!fs.existsSync(d)) fs.mkdirSync(d, {recursive:true}); fs.writeFileSync(f, c.replace(/\n/g, '\r\n'), 'utf8') }

const uploadRoute = `import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const BUCKET = "article-images";

async function ensureBucket(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((b) => b.id === BUCKET);
  if (!exists) {
    const { error } = await supabase.storage.createBucket(BUCKET, {
      public: true,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"],
      fileSizeLimit: 5 * 1024 * 1024,
    });
    if (error && !error.message.includes("already exists")) {
      throw new Error("Could not create storage bucket: " + error.message);
    }
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Use JPG, PNG, WebP, GIF, or AVIF." }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Max 5MB." }, { status: 400 });
    }

    // Auto-create bucket if missing
    await ensureBucket(supabase);

    const ext = file.name.split(".").pop() ?? "jpg";
    const fileName = \\\`articles/\\\${Date.now()}-\\\${Math.random().toString(36).substring(2, 8)}.\\\${ext}\\\`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json({ error: "Upload failed: " + uploadError.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(fileName);

    return NextResponse.json({ url: urlData.publicUrl });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Upload failed";
    console.error("Upload error:", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
`
writeF('app/api/admin/upload/route.ts', uploadRoute)
console.log('Upload route updated:', fs.readFileSync('app/api/admin/upload/route.ts','utf8').length, 'bytes')
