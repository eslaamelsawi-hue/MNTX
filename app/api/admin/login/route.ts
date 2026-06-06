import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { password, mentorEmail, mentorPassword } = await request.json();

  // Admin login with password
  if (password) {
    const { data, error } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", "admin_password")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }

    if (password !== data.value) {
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

    return NextResponse.json({ success: true, type: "mentor", mentorId: mentor.id, mentorName: mentor.name });
  }

  return NextResponse.json({ error: "Password or mentor email is required" }, { status: 400 });
}
