import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = authHeader.slice(7);
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { room_id } = await req.json();
  if (!room_id) return NextResponse.json({ error: "room_id is required" }, { status: 400 });

  await supabaseAdmin
    .from("participants")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("room_id", room_id)
    .eq("user_id", user.id);

  return NextResponse.json({ ok: true });
}
