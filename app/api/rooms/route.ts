import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const {
    data: { user },
    error: authError,
  } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { location_lat, location_lng, location_name, budget, max_participants } =
    await req.json();

  const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();

  const { data: room, error } = await supabaseAdmin
    .from("rooms")
    .insert({
      host_user_id: user.id,
      location_lat,
      location_lng,
      location_name,
      budget,
      max_participants,
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabaseAdmin
    .from("participants")
    .insert({ room_id: room.id, user_id: user.id });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return NextResponse.json({
    room_id: room.id,
    url: `${appUrl}/room/${room.id}`,
  });
}
