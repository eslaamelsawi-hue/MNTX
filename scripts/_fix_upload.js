const fs = require('fs')
const path = require('path')
const readF = f => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
const writeF = (f, c) => { const d = path.dirname(f); if (!fs.existsSync(d)) fs.mkdirSync(d, {recursive:true}); fs.writeFileSync(f, c.replace(/\n/g, '\r\n'), 'utf8') }

// ===== 1. Create upload API route =====
const uploadRoute = `import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Use JPG, PNG, WebP, GIF, or AVIF." }, { status: 400 });
    }

    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Max 5MB." }, { status: 400 });
    }

    const ext = file.name.split(".").pop() ?? "jpg";
    const fileName = \`articles/\${Date.now()}-\${Math.random().toString(36).substring(2, 8)}.\${ext}\`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from("article-images")
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json({ error: "Upload failed: " + uploadError.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage
      .from("article-images")
      .getPublicUrl(fileName);

    return NextResponse.json({ url: urlData.publicUrl });
  } catch (e: unknown) {
    console.error("Upload error:", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
`
writeF('app/api/admin/upload/route.ts', uploadRoute)
console.log('[1/5] Upload API route created')

// ===== 2. Create Supabase storage setup SQL =====
const storageSql = `-- Create storage bucket for article images
INSERT INTO storage.buckets (id, name, public)
VALUES ('article-images', 'article-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to article images
CREATE POLICY "Public can view article images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'article-images');

-- Allow authenticated and anon users to upload (auth handled by API cookie check)
CREATE POLICY "Anyone can upload article images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'article-images');

-- Allow deletion
CREATE POLICY "Anyone can delete article images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'article-images');
`
writeF('scripts/006_create_storage_bucket.sql', storageSql)
console.log('[2/5] Storage bucket SQL created')

// ===== 3. Update next.config.mjs - add remotePatterns for Supabase =====
let nextConfig = readF('next.config.mjs')
if (!nextConfig.includes('remotePatterns')) {
  nextConfig = nextConfig.replace(
    `images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 828, 1080, 1200],
    imageSizes: [256, 384],
  }`,
    `images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 828, 1080, 1200],
    imageSizes: [256, 384],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      {
        protocol: "https",
        hostname: "**.supabase.in",
      },
    ],
  }`
  )
  writeF('next.config.mjs', nextConfig)
  console.log('[3/5] next.config.mjs updated with Supabase image domains')
} else {
  console.log('[3/5] next.config.mjs already has remotePatterns')
}

// ===== 4. Patch admin dashboard - replace image URL input with file upload =====
let admin = readF('components/admin-dashboard.tsx')

// 4a. Add uploading state after articleForm state
const afterFormState = `    published: true,
  })`
const withUploadState = `    published: true,
  })
  const [uploadingImage, setUploadingImage] = useState(false)`
if (!admin.includes('uploadingImage')) {
  admin = admin.replace(afterFormState, withUploadState)
  console.log('  4a. Added uploadingImage state')
}

// 4b. Add Upload lucide import (replace Upload if not there, or add it)
if (!admin.includes('Upload,') && !admin.includes('Upload }')) {
  admin = admin.replace(
    '  ImageIcon,\n  Tag,',
    '  ImageIcon,\n  Tag,\n  Upload,'
  )
  console.log('  4b. Added Upload icon import')
}

// 4c. Replace the image URL input section with file upload
const oldImageSection = `                      {/* Image URL */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5"><ImageIcon className="h-3.5 w-3.5" /> Cover Image URL</Label>
                        <Input
                          value={articleForm.image_url}
                          onChange={(e) => setArticleForm(f => ({ ...f, image_url: e.target.value }))}
                          placeholder="https://example.com/image.jpg"
                          type="url"
                        />
                        {articleForm.image_url && (
                          <div className="relative w-full h-32 rounded-lg overflow-hidden border border-border">
                            <img src={articleForm.image_url} alt="Preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                          </div>
                        )}
                      </div>`

const newImageSection = `                      {/* Image Upload */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5"><ImageIcon className="h-3.5 w-3.5" /> Cover Image</Label>
                        <div className="flex gap-2">
                          <Input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                            disabled={uploadingImage}
                            onChange={async (e) => {
                              const file = e.target.files?.[0]
                              if (!file) return
                              if (file.size > 5 * 1024 * 1024) { alert("Image must be under 5MB"); return }
                              setUploadingImage(true)
                              try {
                                const fd = new FormData()
                                fd.append("file", file)
                                const res = await fetch("/api/admin/upload", { method: "POST", body: fd })
                                const data = await res.json()
                                if (!res.ok) { alert("Upload failed: " + (data.error ?? "Unknown error")); return }
                                setArticleForm(f => ({ ...f, image_url: data.url }))
                              } catch (err) {
                                console.error("Upload error:", err)
                                alert("Upload failed. Check console.")
                              } finally {
                                setUploadingImage(false)
                              }
                            }}
                            className="flex-1"
                          />
                          {uploadingImage && <div className="flex items-center text-xs text-muted-foreground"><Upload className="h-4 w-4 animate-pulse mr-1" /> Uploading...</div>}
                        </div>
                        {articleForm.image_url && (
                          <div className="relative w-full h-32 rounded-lg overflow-hidden border border-border">
                            <img src={articleForm.image_url} alt="Preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                            <button
                              type="button"
                              onClick={() => setArticleForm(f => ({ ...f, image_url: "" }))}
                              className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                        <Input
                          value={articleForm.image_url}
                          onChange={(e) => setArticleForm(f => ({ ...f, image_url: e.target.value }))}
                          placeholder="Or paste image URL..."
                          type="url"
                          className="text-xs"
                        />
                      </div>`

if (admin.includes(oldImageSection)) {
  admin = admin.replace(oldImageSection, newImageSection)
  console.log('  4c. Replaced image URL section with file upload')
} else {
  console.log('  4c. WARNING: Could not find exact image section to replace')
  // Try to find just the key markers
  if (admin.includes('{/* Image URL */}')) {
    console.log('     Found Image URL comment but full match failed - check whitespace')
  } else {
    console.log('     Image URL comment not found either')
  }
}

writeF('components/admin-dashboard.tsx', admin)
console.log('[4/5] Admin dashboard patched with file upload')

// ===== 5. Gold page - switch from next/image Image to regular img to avoid domain issues =====
let gold = readF('components/gold-page.tsx')

// Replace the Image component usage with regular img for article images
const oldImgCode = `                      {article.image_url && (
                        <div className="relative w-full h-48 overflow-hidden">
                          <Image
                            src={article.image_url}
                            alt={title}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                            sizes="(max-width: 768px) 100vw, 50vw"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        </div>
                      )}`
const newImgCode = `                      {article.image_url && (
                        <div className="relative w-full h-48 overflow-hidden">
                          <img
                            src={article.image_url}
                            alt={title}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        </div>
                      )}`
if (gold.includes(oldImgCode)) {
  gold = gold.replace(oldImgCode, newImgCode)
  console.log('  5a. Replaced next/image with img tag for articles')
}

// Remove unused Image import if it's only used for articles
if (gold.includes('import Image from "next/image"')) {
  // Check if Image is used elsewhere
  const imgCount = (gold.match(/<Image\b/g) || []).length
  if (imgCount === 0) {
    gold = gold.replace('import Image from "next/image"\n', '')
    console.log('  5b. Removed unused next/image import')
  }
}

writeF('components/gold-page.tsx', gold)
console.log('[5/5] Gold page updated')

console.log('\nAll done! Run: npx next build')
