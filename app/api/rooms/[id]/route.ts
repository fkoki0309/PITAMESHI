import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = authHeader.slice(7);
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { status } = await req.json();

  const { data: room } = await supabaseAdmin
    .from("rooms")
    .select("host_user_id")
    .eq("id", params.id)
    .single();

  if (!room || room.host_user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await supabaseAdmin
    .from("rooms")
    .update({ status })
    .eq("id", params.id);

  // 再投票時（waiting に戻す）は前回の投票データをリセット
  if (status === "waiting") {
    await Promise.all([
      supabaseAdmin.from("genre_votes").delete().eq("room_id", params.id),
      supabaseAdmin.from("shop_votes").delete().eq("room_id", params.id),
      supabaseAdmin.from("shops").delete().eq("room_id", params.id),
    ]);
  }

  return NextResponse.json({ ok: true });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  const { data: room, error } = await supabaseAdmin
    .from("rooms")
    .select("id, status, location_name, budget, max_participants, expires_at, host_user_id")
    .eq("id", id)
    .single();

  if (error || !room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  if (new Date(room.expires_at) < new Date()) {
    return NextResponse.json({ error: "Room expired" }, { status: 410 });
  }

  const activeThreshold = new Date(Date.now() - 25 * 1000).toISOString();
  const { count } = await supabaseAdmin
    .from("participants")
    .select("*", { count: "exact", head: true })
    .eq("room_id", id)
    .gte("last_seen_at", activeThreshold);

  return NextResponse.json({
    id: room.id,
    status: room.status,
    location_name: room.location_name,
    budget: room.budget,
    max_participants: room.max_participants,
    expires_at: room.expires_at,
    host_user_id: room.host_user_id,
    participant_count: count ?? 0,
  });
}
