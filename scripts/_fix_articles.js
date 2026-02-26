const fs = require('fs')

// ===== Step 1: Write the API route =====
const apiContent = [
  'import { createClient } from "@/lib/supabase/server";',
  'import { NextRequest, NextResponse } from "next/server";',
  '',
  'export async function GET() {',
  '  const supabase = await createClient();',
  '  const { data, error } = await supabase.from("gold_articles").select("*").order("created_at", { ascending: false });',
  '  if (error) return NextResponse.json({ error: error.message }, { status: 500 });',
  '  return NextResponse.json({ articles: data });',
  '}',
  '',
  'export async function POST(request: NextRequest) {',
  '  const supabase = await createClient();',
  '  const body = await request.json();',
  '  const { title_en, title_ar, content_en, content_ar, summary_en, summary_ar, image_url, tags, published } = body;',
  '  if (!title_en) {',
  '    return NextResponse.json({ error: "Title (English) is required" }, { status: 400 });',
  '  }',
  '  const row: Record<string, unknown> = {',
  '    title_en: title_en,',
  '    title_ar: title_ar ?? "",',
  '    content_en: content_en ?? "",',
  '    content_ar: content_ar ?? "",',
  '    published: published ?? true,',
  '  };',
  '  if (summary_en) row.summary_en = summary_en;',
  '  if (summary_ar) row.summary_ar = summary_ar;',
  '  if (image_url) row.image_url = image_url;',
  '  if (tags && Array.isArray(tags) && tags.length > 0) row.tags = tags;',
  '  let result = await supabase.from("gold_articles").insert(row).select().single();',
  '  if (result.error) {',
  '    const msg = result.error.message;',
  '    if (msg.includes("column") || msg.includes("schema")) {',
  '      const baseRow = { title_en, title_ar: title_ar ?? "", content_en: content_en ?? "", content_ar: content_ar ?? "", published: published ?? true };',
  '      result = await supabase.from("gold_articles").insert(baseRow).select().single();',
  '    }',
  '  }',
  '  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });',
  '  return NextResponse.json({ article: result.data });',
  '}',
  '',
  'export async function PATCH(request: NextRequest) {',
  '  const supabase = await createClient();',
  '  const body = await request.json();',
  '  const { id, ...fields } = body;',
  '  if (!id) return NextResponse.json({ error: "Article ID is required" }, { status: 400 });',
  '  const allowed = ["title_en","title_ar","content_en","content_ar","summary_en","summary_ar","image_url","tags","published"];',
  '  const updateData: Record<string, unknown> = {};',
  '  for (const key of allowed) { if (fields[key] !== undefined) updateData[key] = fields[key]; }',
  '  let result = await supabase.from("gold_articles").update(updateData).eq("id", id).select().single();',
  '  if (result.error) {',
  '    const msg = result.error.message;',
  '    if (msg.includes("column") || msg.includes("schema")) {',
  '      const baseAllowed = ["title_en","title_ar","content_en","content_ar","published"];',
  '      const bu: Record<string, unknown> = {};',
  '      for (const k of baseAllowed) { if (fields[k] !== undefined) bu[k] = fields[k]; }',
  '      if (Object.keys(bu).length > 0) result = await supabase.from("gold_articles").update(bu).eq("id", id).select().single();',
  '    }',
  '  }',
  '  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });',
  '  return NextResponse.json({ article: result.data });',
  '}',
  '',
  'export async function DELETE(request: NextRequest) {',
  '  const supabase = await createClient();',
  '  const { searchParams } = new URL(request.url);',
  '  const id = searchParams.get("id");',
  '  if (!id) return NextResponse.json({ error: "Article ID is required" }, { status: 400 });',
  '  const { error } = await supabase.from("gold_articles").delete().eq("id", id);',
  '  if (error) return NextResponse.json({ error: error.message }, { status: 500 });',
  '  return NextResponse.json({ success: true });',
  '}',
]
fs.writeFileSync('app/api/admin/articles/route.ts', apiContent.join('\r\n'), 'utf8')
console.log('Step 1 done: API route -', fs.readFileSync('app/api/admin/articles/route.ts','utf8').length, 'bytes')

// ===== Step 2: Patch admin dashboard - add error feedback =====
let admin = fs.readFileSync('components/admin-dashboard.tsx', 'utf8').replace(/\r\n/g, '\n')
const oldFn = `const handleSaveArticle = async () => {
    const payload = {
      ...articleForm,
      tags: articleForm.tags.split(",").map((t: string) => t.trim()).filter(Boolean),
    }
    try {
      if (editingArticle) {
        await fetch("/api/admin/articles", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingArticle.id, ...payload }),
        })
      } else {
        await fetch("/api/admin/articles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      }
      resetArticleForm()
      fetchArticles()
    } catch (e) {
      console.error("Failed to save article:", e)
    }
  }`

const newFn = `const handleSaveArticle = async () => {
    const payload = {
      ...articleForm,
      tags: articleForm.tags.split(",").map((t: string) => t.trim()).filter(Boolean),
    }
    try {
      const url = "/api/admin/articles"
      const method = editingArticle ? "PATCH" : "POST"
      const reqBody = editingArticle ? { id: editingArticle.id, ...payload } : payload
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(reqBody) })
      const data = await res.json()
      if (!res.ok) {
        alert("Failed to save article: " + (data.error ?? "Unknown error"))
        return
      }
      resetArticleForm()
      fetchArticles()
    } catch (e) {
      console.error("Failed to save article:", e)
      alert("Failed to save article. Check console for details.")
    }
  }`

if (admin.includes(oldFn)) {
  admin = admin.replace(oldFn, newFn)
  fs.writeFileSync('components/admin-dashboard.tsx', admin.replace(/\n/g, '\r\n'), 'utf8')
  console.log('Step 2 done: Admin dashboard patched with error feedback')
} else {
  console.log('Step 2: Exact match not found, trying relaxed approach...')
  const si = admin.indexOf('const handleSaveArticle = async () => {')
  if (si === -1) {
    console.log('FATAL: handleSaveArticle not found!')
  } else {
    const chunk = admin.substring(si)
    const cLines = chunk.split('\n')
    let endL = -1, bc = 0, started = false
    for (let i = 0; i < cLines.length; i++) {
      for (const ch of cLines[i]) {
        if (ch === '{') { bc++; started = true }
        if (ch === '}') bc--
      }
      if (started && bc === 0) { endL = i; break }
    }
    if (endL > 0) {
      const extracted = cLines.slice(0, endL + 1).join('\n')
      admin = admin.replace(extracted, newFn)
      fs.writeFileSync('components/admin-dashboard.tsx', admin.replace(/\n/g, '\r\n'), 'utf8')
      console.log('Step 2 done: Admin dashboard patched (relaxed match)')
    } else {
      console.log('FATAL: Could not find end of handleSaveArticle')
    }
  }
}
