import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// sendBeacon はカスタムヘッダーを送れないため、token をボディで受け取る
export async function POST(req: NextRequest) {
  const { room_id, token } = await req.json();
  if (!room_id || !token) return NextResponse.json({ ok: false });

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return NextResponse.json({ ok: false });

  // last_seen_at を過去にセットして即座に非アクティブ扱いにする
  await supabaseAdmin
    .from("participants")
    .update({ last_seen_at: new Date(0).toISOString() })
    .eq("room_id", room_id)
    .eq("user_id", user.id);

  return NextResponse.json({ ok: true });
}
