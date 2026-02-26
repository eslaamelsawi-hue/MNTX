const fs = require("fs");

// ======= Helper to read/write with CRLF handling =======
function readF(p) { return fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n"); }
function writeF(p, c) { fs.writeFileSync(p, c.replace(/\n/g, "\r\n"), "utf8"); }

console.log("=== Upgrade Gold Articles ===\n");

// ============================================================
// 1. SQL Migration - 005_upgrade_gold_articles.sql
// ============================================================
console.log("[1/6] Creating SQL migration ...");
const sql = `-- Add image_url, summary, and tags to gold_articles
ALTER TABLE gold_articles ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
ALTER TABLE gold_articles ADD COLUMN IF NOT EXISTS summary_en TEXT DEFAULT '';
ALTER TABLE gold_articles ADD COLUMN IF NOT EXISTS summary_ar TEXT DEFAULT '';
ALTER TABLE gold_articles ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
`;
fs.writeFileSync("scripts/005_upgrade_gold_articles.sql", sql, "utf8");
console.log("  done");

// ============================================================
// 2. Admin API route - app/api/admin/articles/route.ts
// ============================================================
console.log("[2/6] Updating admin API route ...");
const adminRoute = `import { createClient } from "@/lib/supabase/server";
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
  const { title_en, title_ar, content_en, content_ar, summary_en, summary_ar, image_url, tags, published } = body;

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
      summary_en: summary_en || "",
      summary_ar: summary_ar || "",
      image_url: image_url || "",
      tags: tags || [],
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
  const { id, ...fields } = body;

  if (!id) {
    return NextResponse.json({ error: "Article ID is required" }, { status: 400 });
  }

  const allowed = ["title_en", "title_ar", "content_en", "content_ar", "summary_en", "summary_ar", "image_url", "tags", "published"];
  const updateData: Record<string, unknown> = {};
  for (const key of allowed) {
    if (fields[key] !== undefined) updateData[key] = fields[key];
  }

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
`;
fs.writeFileSync("app/api/admin/articles/route.ts", adminRoute, "utf8");
console.log("  done");

// ============================================================
// 3. Public API route stays the same (already returns *)
// ============================================================
console.log("[3/6] Public API route - no changes needed");

// ============================================================
// 4. gold-page.tsx
// ============================================================
console.log("[4/6] Patching components/gold-page.tsx ...");
let f1 = readF("components/gold-page.tsx");

// 4a. Update GoldArticle interface to include new fields
f1 = f1.replace(
`interface GoldArticle {
  id: string
  title_en: string
  title_ar: string
  content_en: string
  content_ar: string
  published: boolean
  created_at: string
  updated_at: string
}`,
`interface GoldArticle {
  id: string
  title_en: string
  title_ar: string
  content_en: string
  content_ar: string
  summary_en: string
  summary_ar: string
  image_url: string
  tags: string[]
  published: boolean
  created_at: string
  updated_at: string
}`
);
console.log("  4a. Updated GoldArticle interface");

// 4b. Add Image import from next/image
f1 = f1.replace(
`import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"`,
`import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"`
);
console.log("  4b. Added next/image import");

// 4c. Move articles section - remove from current location (before disclaimer)
const articlesOld = `          {/* ========== Gold Analysis Articles ========== */}
          {articles.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-500/10">
                  <FileText className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">{t("articlesTitle")}</h2>
                  <p className="text-sm text-muted-foreground">{t("articlesSubtitle")}</p>
                </div>
              </div>
              <div className="space-y-4">
                {articles.map((article) => {
                  const title = locale === "ar" ? (article.title_ar || article.title_en) : article.title_en
                  const content = locale === "ar" ? (article.content_ar || article.content_en) : article.content_en
                  const isExpanded = expandedArticle === article.id
                  return (
                    <Card
                      key={article.id}
                      className="border-yellow-500/20 bg-card transition-all duration-200 hover:border-yellow-500/40 cursor-pointer"
                      onClick={() => setExpandedArticle(isExpanded ? null : article.id)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base font-semibold text-foreground">{title}</CardTitle>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(article.created_at).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className={\`text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap \${
                          isExpanded ? "" : "line-clamp-3"
                        }\`}>
                          {content}
                        </div>
                        <button
                          className="mt-2 text-xs text-yellow-500 hover:text-yellow-400 font-medium"
                          onClick={(e) => {
                            e.stopPropagation()
                            setExpandedArticle(isExpanded ? null : article.id)
                          }}
                        >
                          {isExpanded ? t("readLess") : t("readMore")}
                        </button>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}`;
f1 = f1.replace(articlesOld, "");
console.log("  4c. Removed old articles section");

// 4d. Insert new upgraded articles section BEFORE the ingot calculator (right after the price bar)
const newArticlesSection = `          {/* ========== Gold Analysis Articles ========== */}
          {articles.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-500/10">
                  <FileText className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">{t("articlesTitle")}</h2>
                  <p className="text-sm text-muted-foreground">{t("articlesSubtitle")}</p>
                </div>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                {articles.map((article) => {
                  const title = locale === "ar" ? (article.title_ar || article.title_en) : article.title_en
                  const content = locale === "ar" ? (article.content_ar || article.content_en) : article.content_en
                  const summary = locale === "ar" ? (article.summary_ar || article.summary_en) : article.summary_en
                  const isExpanded = expandedArticle === article.id
                  return (
                    <Card
                      key={article.id}
                      className="border-yellow-500/20 bg-card overflow-hidden transition-all duration-200 hover:border-yellow-500/40 hover:shadow-lg hover:shadow-yellow-500/5 group"
                    >
                      {article.image_url && (
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
                      )}
                      <CardHeader className={article.image_url ? "pb-2 pt-4" : "pb-2"}>
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-lg font-bold text-foreground leading-tight">{title}</CardTitle>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap shrink-0">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(article.created_at).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </div>
                        </div>
                        {article.tags && article.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {article.tags.map((tag: string) => (
                              <Badge key={tag} variant="outline" className="text-[10px] px-2 py-0.5 border-yellow-500/30 text-yellow-500 bg-yellow-500/5">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardHeader>
                      <CardContent>
                        {!isExpanded && summary ? (
                          <p className="text-sm text-muted-foreground leading-relaxed">{summary}</p>
                        ) : (
                          <div className={\`text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap \${
                            isExpanded ? "" : "line-clamp-3"
                          }\`}>
                            {content}
                          </div>
                        )}
                        <button
                          className="mt-3 text-xs font-semibold text-yellow-500 hover:text-yellow-400 transition-colors"
                          onClick={() => setExpandedArticle(isExpanded ? null : article.id)}
                        >
                          {isExpanded ? t("readLess") : t("readMore")} →
                        </button>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}

`;
// Insert before the Ingot Calculator
f1 = f1.replace(
`          {/* ========== Ingot Calculator ========== */}`,
newArticlesSection + `          {/* ========== Ingot Calculator ========== */}`
);
console.log("  4d. Inserted new articles section at top (before calculator)");

writeF("components/gold-page.tsx", f1);
console.log("  gold-page.tsx done:", f1.split("\n").length, "lines");

// ============================================================
// 5. admin-dashboard.tsx
// ============================================================
console.log("[5/6] Patching components/admin-dashboard.tsx ...");
let f2 = readF("components/admin-dashboard.tsx");

// 5a. Add ImageIcon to lucide imports
f2 = f2.replace(
`  FileText,
  Edit,
  Eye,
  EyeOff,
} from "lucide-react"`,
`  FileText,
  Edit,
  Eye,
  EyeOff,
  ImageIcon,
  Tag,
} from "lucide-react"`
);
console.log("  5a. Added ImageIcon, Tag to lucide imports");

// 5b. Update GoldArticle type
f2 = f2.replace(
`type GoldArticle = {
  id: string
  title_en: string
  title_ar: string
  content_en: string
  content_ar: string
  published: boolean
  created_at: string
  updated_at: string
}`,
`type GoldArticle = {
  id: string
  title_en: string
  title_ar: string
  content_en: string
  content_ar: string
  summary_en: string
  summary_ar: string
  image_url: string
  tags: string[]
  published: boolean
  created_at: string
  updated_at: string
}`
);
console.log("  5b. Updated GoldArticle type");

// 5c. Update articleForm initial state
f2 = f2.replace(
`  const [articleForm, setArticleForm] = useState({
    title_en: "",
    title_ar: "",
    content_en: "",
    content_ar: "",
    published: true,
  })`,
`  const [articleForm, setArticleForm] = useState({
    title_en: "",
    title_ar: "",
    content_en: "",
    content_ar: "",
    summary_en: "",
    summary_ar: "",
    image_url: "",
    tags: "" as string,
    published: true,
  })`
);
console.log("  5c. Updated articleForm state");

// 5d. Update resetArticleForm
f2 = f2.replace(
`  const resetArticleForm = () => {
    setEditingArticle(null)
    setArticleForm({ title_en: "", title_ar: "", content_en: "", content_ar: "", published: true })
    setArticleDialogOpen(false)
  }`,
`  const resetArticleForm = () => {
    setEditingArticle(null)
    setArticleForm({ title_en: "", title_ar: "", content_en: "", content_ar: "", summary_en: "", summary_ar: "", image_url: "", tags: "", published: true })
    setArticleDialogOpen(false)
  }`
);
console.log("  5d. Updated resetArticleForm");

// 5e. Update handleEditArticle
f2 = f2.replace(
`  const handleEditArticle = (article: GoldArticle) => {
    setEditingArticle(article)
    setArticleForm({
      title_en: article.title_en,
      title_ar: article.title_ar,
      content_en: article.content_en,
      content_ar: article.content_ar,
      published: article.published,
    })
    setArticleDialogOpen(true)
  }`,
`  const handleEditArticle = (article: GoldArticle) => {
    setEditingArticle(article)
    setArticleForm({
      title_en: article.title_en,
      title_ar: article.title_ar,
      content_en: article.content_en,
      content_ar: article.content_ar,
      summary_en: article.summary_en || "",
      summary_ar: article.summary_ar || "",
      image_url: article.image_url || "",
      tags: (article.tags || []).join(", "),
      published: article.published,
    })
    setArticleDialogOpen(true)
  }`
);
console.log("  5e. Updated handleEditArticle");

// 5f. Update handleSaveArticle to send new fields
f2 = f2.replace(
`  const handleSaveArticle = async () => {
    try {
      if (editingArticle) {
        await fetch("/api/admin/articles", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingArticle.id, ...articleForm }),
        })
      } else {
        await fetch("/api/admin/articles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(articleForm),
        })
      }
      resetArticleForm()
      fetchArticles()
    } catch (e) {
      console.error("Failed to save article:", e)
    }
  }`,
`  const handleSaveArticle = async () => {
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
);
console.log("  5f. Updated handleSaveArticle with tags parsing");

// 5g. Replace the article dialog form with upgraded version
const oldDialog = `                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Title (English) *</Label>
                        <Input
                          value={articleForm.title_en}
                          onChange={(e) => setArticleForm(f => ({ ...f, title_en: e.target.value }))}
                          placeholder="Gold market analysis..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Title (Arabic)</Label>
                        <Input
                          value={articleForm.title_ar}
                          onChange={(e) => setArticleForm(f => ({ ...f, title_ar: e.target.value }))}
                          placeholder="تحليل سوق الذهب..."
                          dir="rtl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Content (English) *</Label>
                        <Textarea
                          value={articleForm.content_en}
                          onChange={(e) => setArticleForm(f => ({ ...f, content_en: e.target.value }))}
                          placeholder="Write your analysis here..."
                          rows={8}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Content (Arabic)</Label>
                        <Textarea
                          value={articleForm.content_ar}
                          onChange={(e) => setArticleForm(f => ({ ...f, content_ar: e.target.value }))}
                          placeholder="اكتب تحليلك هنا..."
                          rows={8}
                          dir="rtl"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="article-published"
                          checked={articleForm.published}
                          onChange={(e) => setArticleForm(f => ({ ...f, published: e.target.checked }))}
                          className="h-4 w-4 rounded border-border"
                        />
                        <Label htmlFor="article-published">Published</Label>
                      </div>
                      <Button
                        className="w-full"
                        disabled={!articleForm.title_en.trim() || !articleForm.content_en.trim()}
                        onClick={handleSaveArticle}
                      >
                        {editingArticle ? "Update Article" : "Publish Article"}
                      </Button>
                    </div>`;

const newDialog = `                    <div className="space-y-4 py-4">
                      {/* Image URL */}
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
                      </div>
                      {/* Titles */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Title (English) *</Label>
                          <Input
                            value={articleForm.title_en}
                            onChange={(e) => setArticleForm(f => ({ ...f, title_en: e.target.value }))}
                            placeholder="Gold market analysis..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Title (Arabic)</Label>
                          <Input
                            value={articleForm.title_ar}
                            onChange={(e) => setArticleForm(f => ({ ...f, title_ar: e.target.value }))}
                            placeholder="تحليل سوق الذهب..."
                            dir="rtl"
                          />
                        </div>
                      </div>
                      {/* Summaries */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Summary (English)</Label>
                          <Textarea
                            value={articleForm.summary_en}
                            onChange={(e) => setArticleForm(f => ({ ...f, summary_en: e.target.value }))}
                            placeholder="Brief summary shown on card..."
                            rows={2}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Summary (Arabic)</Label>
                          <Textarea
                            value={articleForm.summary_ar}
                            onChange={(e) => setArticleForm(f => ({ ...f, summary_ar: e.target.value }))}
                            placeholder="ملخص قصير يظهر على البطاقة..."
                            rows={2}
                            dir="rtl"
                          />
                        </div>
                      </div>
                      {/* Tags */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> Tags (comma separated)</Label>
                        <Input
                          value={articleForm.tags}
                          onChange={(e) => setArticleForm(f => ({ ...f, tags: e.target.value }))}
                          placeholder="Gold, Analysis, Market Update"
                        />
                        {articleForm.tags && (
                          <div className="flex flex-wrap gap-1">
                            {articleForm.tags.split(",").map((t: string) => t.trim()).filter(Boolean).map((tag: string) => (
                              <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* Content */}
                      <div className="space-y-2">
                        <Label>Content (English) *</Label>
                        <Textarea
                          value={articleForm.content_en}
                          onChange={(e) => setArticleForm(f => ({ ...f, content_en: e.target.value }))}
                          placeholder="Write your analysis here..."
                          rows={8}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Content (Arabic)</Label>
                        <Textarea
                          value={articleForm.content_ar}
                          onChange={(e) => setArticleForm(f => ({ ...f, content_ar: e.target.value }))}
                          placeholder="اكتب تحليلك هنا..."
                          rows={8}
                          dir="rtl"
                        />
                      </div>
                      {/* Published + Submit */}
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="article-published"
                          checked={articleForm.published}
                          onChange={(e) => setArticleForm(f => ({ ...f, published: e.target.checked }))}
                          className="h-4 w-4 rounded border-border"
                        />
                        <Label htmlFor="article-published">Published</Label>
                      </div>
                      <Button
                        className="w-full bg-yellow-500 hover:bg-yellow-600 text-black"
                        disabled={!articleForm.title_en.trim() || !articleForm.content_en.trim()}
                        onClick={handleSaveArticle}
                      >
                        {editingArticle ? "Update Article" : "Publish Article"}
                      </Button>
                    </div>`;
f2 = f2.replace(oldDialog, newDialog);
console.log("  5g. Upgraded article dialog form");

// 5h. Update article card in list to show image/tags
const oldArticleCard = `                  <Card key={article.id} className="border-border bg-card">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base">{article.title_en}</CardTitle>
                          {article.title_ar && (
                            <p className="text-sm text-muted-foreground mt-1" dir="rtl">{article.title_ar}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-4">
                          <Badge variant="outline" className={article.published
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
                          }>
                            {article.published ? "Published" : "Draft"}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{article.content_en}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {new Date(article.created_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>`;
const newArticleCard = `                  <Card key={article.id} className="border-border bg-card overflow-hidden">
                    {article.image_url && (
                      <div className="relative w-full h-32 overflow-hidden">
                        <img src={article.image_url} alt={article.title_en} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base">{article.title_en}</CardTitle>
                          {article.title_ar && (
                            <p className="text-sm text-muted-foreground mt-1" dir="rtl">{article.title_ar}</p>
                          )}
                          {article.tags && article.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {article.tags.map((tag: string) => (
                                <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">{tag}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-4">
                          <Badge variant="outline" className={article.published
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
                          }>
                            {article.published ? "Published" : "Draft"}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{article.summary_en || article.content_en}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {new Date(article.created_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>`;
f2 = f2.replace(oldArticleCard, newArticleCard);
console.log("  5h. Upgraded article card in admin list");

writeF("components/admin-dashboard.tsx", f2);
console.log("  admin-dashboard.tsx done:", f2.split("\n").length, "lines");

// ============================================================
// 6. i18n - add new keys
// ============================================================
console.log("[6/6] Updating i18n ...");
let enJson = readF("messages/en.json");
let arJson = readF("messages/ar.json");

// Add new i18n keys to en.json gold section
enJson = enJson.replace(
`    "readMore": "Read more",
    "readLess": "Show less",`,
`    "readMore": "Read more",
    "readLess": "Show less",
    "noArticlesYet": "No analysis articles published yet.",`
);

// Add new i18n keys to ar.json gold section
arJson = arJson.replace(
`    "readMore": "اقرأ المزيد",
    "readLess": "إظهار أقل",`,
`    "readMore": "اقرأ المزيد",
    "readLess": "إظهار أقل",
    "noArticlesYet": "لا توجد مقالات تحليل منشورة بعد.",`
);

writeF("messages/en.json", enJson);
writeF("messages/ar.json", arJson);
console.log("  i18n done");

// ============================================================
// Summary
// ============================================================
console.log("\n=== Line counts after patching ===");
const files = [
  "components/gold-page.tsx",
  "components/admin-dashboard.tsx",
  "messages/en.json",
  "messages/ar.json",
  "app/api/admin/articles/route.ts",
];
files.forEach((f) => {
  const lines = readF(f).split("\n").length;
  console.log(`  ${f}: ${lines} lines`);
});
console.log("\nAll patches applied.");
