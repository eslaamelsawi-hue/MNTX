import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { password, mentorEmail, mentorPassword } = await request.json();

  // Admin login with password
  if (password) {
    // The password is checked inside the database: the hash lives in a table
    // no API key can read, and this only ever answers yes or no. The old
    // admin_settings row is still honoured as a fallback so an environment
    // that hasn't run scripts/122 yet can't lock its admin out.
    let ok: boolean | null = null;
    const { data: verified, error: rpcError } = await supabase.rpc("verify_admin_password", {
      p_password: password,
    });
    if (!rpcError) ok = verified === true;

    if (ok === null) {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("value")
        .eq("key", "admin_password")
        .single();
      if (error || !data) {
        return NextResponse.json({ error: "Server error" }, { status: 500 });
      }
      ok = password === data.value;
    }

    if (!ok) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    const cookieStore = await cookies();
    const token = Buffer.from(`admin:${Date.now()}`).toString("base64");
    cookieStore.set("admin_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return NextResponse.json({ success: true, type: "admin" });
  }

  // Mentor login with email and password
  if (mentorEmail && mentorPassword) {
    const normalizedEmail = mentorEmail.toLowerCase().trim();

    // Check if mentor exists in mentors table
    const { data: mentor, error: mentorError } = await supabase
      .from("mentors")
      .select("id, email, password, name")
      .eq("email", normalizedEmail)
      .single();

    if (mentorError || !mentor) {
      return NextResponse.json({ error: "Mentor not found" }, { status: 401 });
    }

    // Verify password
    if (mentorPassword !== mentor.password) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    const cookieStore = await cookies();
    const token = Buffer.from(`mentor:${mentor.id}:${Date.now()}`).toString("base64");
    cookieStore.set("admin_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return NextResponse.json({ success: true, type: "mentor", mentorId: mentor.id, mentorName: mentor.name, mentorEmail: mentor.email });
  }

  return NextResponse.json({ error: "Password or mentor email is required" }, { status: 400 });
}
