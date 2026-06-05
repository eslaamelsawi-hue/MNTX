import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function addSubscription(email) {
  console.log(`Adding subscription for ${email}...`)

  const { data, error } = await supabase.from("user_subscriptions").insert({
    client_email: email.toLowerCase().trim(),
    client_name: email.split("@")[0],
    plan: "premium",
    total_hours: 10,
    used_hours: 0,
    status: "active",
    expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  }).select().single()

  if (error) {
    console.error("❌ Error:", error.message)
    process.exit(1)
  }

  console.log("✅ Subscription added successfully!")
  console.log("ID:", data.id)
  console.log("Email:", data.client_email)
  console.log("Plan:", data.plan)
  console.log("Hours:", data.total_hours)
}

addSubscription("eslaamelsawi@gmail.com").catch(console.error)
