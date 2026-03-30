import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"

async function isAdmin() {
  const cookieStore = await cookies()
  return cookieStore.get("admin_session")?.value === "authenticated"
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const supabase = createAdminClient()
  const { data: coupons, error } = await supabase
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ coupons })
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const body = await req.json()
  const { code, discount_type, discount_value, max_uses, min_order_cents, applicable_plans, expires_at } = body

  if (!code || !discount_type || discount_value == null) {
    return NextResponse.json({ error: "code, discount_type, and discount_value are required" }, { status: 400 })
  }
  if (!["percent", "fixed"].includes(discount_type)) {
    return NextResponse.json({ error: "discount_type must be percent or fixed" }, { status: 400 })
  }
  if (discount_type === "percent" && (discount_value < 1 || discount_value > 100)) {
    return NextResponse.json({ error: "Percentage must be between 1 and 100" }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase.from("coupons").insert({
    code: code.toUpperCase(),
    discount_type,
    discount_value,
    max_uses: max_uses || null,
    min_order_cents: min_order_cents || 0,
    applicable_plans: applicable_plans || [],
    expires_at: expires_at || null,
  }).select().single()

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "A coupon with this code already exists" }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ coupon: data })
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const body = await req.json()
  const { id, ...updates } = body

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 })
  }

  const allowed = ["code", "discount_type", "discount_value", "max_uses", "min_order_cents", "applicable_plans", "expires_at", "is_active"]
  const filtered: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in updates) {
      filtered[key] = updates[key]
    }
  }
  if (filtered.code) {
    filtered.code = (filtered.code as string).toUpperCase()
  }
  filtered.updated_at = new Date().toISOString()

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("coupons")
    .update(filtered)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "A coupon with this code already exists" }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ coupon: data })
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from("coupons").delete().eq("id", id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
