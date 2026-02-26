import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET all articles (including unpublished) for admin
export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("gold_articles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ articles: data });
}

// POST - create a new article
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();
  const { title_en, title_ar, content_en, content_ar, published } = body;

  if (!title_en || !content_en) {
    return NextResponse.json(
      { error: "Title and content (English) are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("gold_articles")
    .insert({
      title_en: title_en || "",
      title_ar: title_ar || "",
      content_en: content_en || "",
      content_ar: content_ar || "",
      published: published ?? true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ article: data });
}

// PATCH - update an article
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();
  const { id, title_en, title_ar, content_en, content_ar, published } = body;

  if (!id) {
    return NextResponse.json({ error: "Article ID is required" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (title_en !== undefined) updateData.title_en = title_en;
  if (title_ar !== undefined) updateData.title_ar = title_ar;
  if (content_en !== undefined) updateData.content_en = content_en;
  if (content_ar !== undefined) updateData.content_ar = content_ar;
  if (published !== undefined) updateData.published = published;

  const { data, error } = await supabase
    .from("gold_articles")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ article: data });
}

// DELETE - delete an article
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Article ID is required" }, { status: 400 });
  }

  const { error } = await supabase.from("gold_articles").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
