const fs = require('fs')
const path = require('path')
const writeF = (f, c) => { const d = path.dirname(f); if (!fs.existsSync(d)) fs.mkdirSync(d, {recursive:true}); fs.writeFileSync(f, c.replace(/\n/g, '\r\n'), 'utf8') }

// 1. Create admin supabase client helper
const adminClient = [
  'import { createClient as createSupabaseClient } from "@supabase/supabase-js";',
  '',
  '// Admin client using service_role key for privileged operations (storage, etc)',
  '// Falls back to anon key if service_role is not set',
  'export function createAdminClient() {',
  '  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;',
  '  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;',
  '  return createSupabaseClient(url, key);',
  '}',
].join('\n')
writeF('lib/supabase/admin.ts', adminClient)
console.log('[1] Created lib/supabase/admin.ts')

// 2. Rewrite upload route
const uploadLines = [
  'import { createAdminClient } from "@/lib/supabase/admin";',
  'import { NextRequest, NextResponse } from "next/server";',
  '',
  'const BUCKET = "article-images";',
  '',
  'export async function POST(request: NextRequest) {',
  '  const supabase = createAdminClient();',
  '',
  '  try {',
  '    const formData = await request.formData();',
  '    const file = formData.get("file") as File | null;',
  '    if (!file) {',
  '      return NextResponse.json({ error: "No file provided" }, { status: 400 });',
  '    }',
  '',
  '    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];',
  '    if (!allowedTypes.includes(file.type)) {',
  '      return NextResponse.json({ error: "Invalid file type. Use JPG, PNG, WebP, GIF, or AVIF." }, { status: 400 });',
  '    }',
  '',
  '    if (file.size > 5 * 1024 * 1024) {',
  '      return NextResponse.json({ error: "File too large. Max 5MB." }, { status: 400 });',
  '    }',
  '',
  '    // Ensure bucket exists',
  '    const { data: buckets } = await supabase.storage.listBuckets();',
  '    if (!buckets?.some((b) => b.id === BUCKET)) {',
  '      const { error: bErr } = await supabase.storage.createBucket(BUCKET, {',
  '        public: true,',
  '        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"],',
  '        fileSizeLimit: 5 * 1024 * 1024,',
  '      });',
  '      if (bErr && !bErr.message.includes("already exists")) {',
  '        return NextResponse.json({ error: "Storage setup failed: " + bErr.message }, { status: 500 });',
  '      }',
  '    }',
  '',
  '    const ext = file.name.split(".").pop() ?? "jpg";',
  '    const fileName = `articles/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;',
  '',
  '    const arrayBuffer = await file.arrayBuffer();',
  '    const buffer = Buffer.from(arrayBuffer);',
  '',
  '    const { error: uploadError } = await supabase.storage',
  '      .from(BUCKET)',
  '      .upload(fileName, buffer, {',
  '        contentType: file.type,',
  '        upsert: false,',
  '      });',
  '',
  '    if (uploadError) {',
  '      console.error("Upload error:", uploadError);',
  '      return NextResponse.json({ error: "Upload failed: " + uploadError.message }, { status: 500 });',
  '    }',
  '',
  '    const { data: urlData } = supabase.storage',
  '      .from(BUCKET)',
  '      .getPublicUrl(fileName);',
  '',
  '    return NextResponse.json({ url: urlData.publicUrl });',
  '  } catch (e: unknown) {',
  '    const msg = e instanceof Error ? e.message : "Upload failed";',
  '    console.error("Upload error:", e);',
  '    return NextResponse.json({ error: msg }, { status: 500 });',
  '  }',
  '}',
]
writeF('app/api/admin/upload/route.ts', uploadLines.join('\n'))
console.log('[2] Upload route rewritten with admin client')

console.log('\nDone! The upload route now uses a service_role client that CAN create buckets.')
console.log('Add SUPABASE_SERVICE_ROLE_KEY to your Vercel env vars (find it in Supabase > Settings > API).')
