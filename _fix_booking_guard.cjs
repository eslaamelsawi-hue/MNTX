const fs = require("fs");
let c = fs.readFileSync("app/api/bookings/route.ts", "utf8");

const needle = "  // Create Zoom meeting";
const guard = [
  "  // Check if user has remaining mentorship hours",
  "  const adminDb = createAdminClient();",
  "  const { data: activeSub } = await adminDb",
  '    .from("user_subscriptions")',
  '    .select("id, remaining_hours")',
  '    .eq("client_email", client_email.toLowerCase().trim())',
  '    .eq("status", "active")',
  '    .order("created_at", { ascending: false })',
  "    .limit(1)",
  "    .single();",
  "",
  "  const hoursNeeded = duration / 60;",
  "  if (!activeSub || activeSub.remaining_hours < hoursNeeded) {",
  "    return NextResponse.json(",
  '      { error: "noHoursRemaining" },',
  "      { status: 403 }",
  "    );",
  "  }",
  "",
  "  // Create Zoom meeting",
].join("\n");

if (!c.includes(needle)) {
  console.log("ERROR: Could not find insertion point");
  process.exit(1);
}
if (c.includes("noHoursRemaining")) {
  console.log("Guard already exists, skipping");
  process.exit(0);
}

c = c.replace(needle, guard);
fs.writeFileSync("app/api/bookings/route.ts", c);
console.log("Patched bookings route, size:", fs.statSync("app/api/bookings/route.ts").size);
