const fs = require("fs");
const path = require("path");

const dir = path.join("app", "api", "check-hours");
fs.mkdirSync(dir, { recursive: true });

const content = [
  'import { NextRequest, NextResponse } from "next/server"',
  'import { createAdminClient } from "@/lib/supabase/admin"',
  '',
  'export async function POST(req: NextRequest) {',
  '  const { email } = await req.json()',
  '  if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 })',
  '',
  '  const supabase = createAdminClient()',
  '  const { data: sub } = await supabase',
  '    .from("user_subscriptions")',
  '    .select("id, remaining_hours, total_hours, used_hours, plan, status")',
  '    .eq("client_email", email.toLowerCase().trim())',
  '    .eq("status", "active")',
  '    .order("created_at", { ascending: false })',
  '    .limit(1)',
  '    .single()',
  '',
  '  if (!sub || sub.remaining_hours <= 0) {',
  '    return NextResponse.json({ allowed: false, remaining_hours: 0 })',
  '  }',
  '',
  '  return NextResponse.json({ allowed: true, remaining_hours: sub.remaining_hours, plan: sub.plan })',
  '}',
].join("\n");

fs.writeFileSync(path.join(dir, "route.ts"), content);
console.log("Created check-hours API, size:", fs.statSync(path.join(dir, "route.ts")).size);
