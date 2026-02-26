import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("gold_articles").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ articles: data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();
  const { title_en, title_ar, content_en, content_ar, summary_en, summary_ar, image_url, tags, published } = body;
  if (!title_en) {
    return NextResponse.json({ error: "Title (English) is required" }, { status: 400 });
  }
  const row: Record<string, unknown> = {
    title_en: title_en,
    title_ar: title_ar ?? "",
    content_en: content_en ?? "",
    content_ar: content_ar ?? "",
    published: published ?? true,
  };
  if (summary_en) row.summary_en = summary_en;
  if (summary_ar) row.summary_ar = summary_ar;
  if (image_url) row.image_url = image_url;
  if (tags && Array.isArray(tags) && tags.length > 0) row.tags = tags;
  let result = await supabase.from("gold_articles").insert(row).select().single();
  if (result.error) {
    const msg = result.error.message;
    if (msg.includes("column") || msg.includes("schema")) {
      const baseRow = { title_en, title_ar: title_ar ?? "", content_en: content_en ?? "", content_ar: content_ar ?? "", published: published ?? true };
      result = await supabase.from("gold_articles").insert(baseRow).select().single();
    }
  }
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  return NextResponse.json({ article: result.data });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();
  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: "Article ID is required" }, { status: 400 });
  const allowed = ["title_en","title_ar","content_en","content_ar","summary_en","summary_ar","image_url","tags","published"];
  const updateData: Record<string, unknown> = {};
  for (const key of allowed) { if (fields[key] !== undefined) updateData[key] = fields[key]; }
  let result = await supabase.from("gold_articles").update(updateData).eq("id", id).select().single();
  if (result.error) {
    const msg = result.error.message;
    if (msg.includes("column") || msg.includes("schema")) {
      const baseAllowed = ["title_en","title_ar","content_en","content_ar","published"];
      const bu: Record<string, unknown> = {};
      for (const k of baseAllowed) { if (fields[k] !== undefined) bu[k] = fields[k]; }
      if (Object.keys(bu).length > 0) result = await supabase.from("gold_articles").update(bu).eq("id", id).select().single();
    }
  }
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  return NextResponse.json({ article: result.data });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Article ID is required" }, { status: 400 });
  const { error } = await supabase.from("gold_articles").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}