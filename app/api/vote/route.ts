import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const GENRE_COUNT = 10;

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

  const { room_id, target_id, target_type, result } = await req.json();

  if (target_type === "genre") {
    const { error } = await supabaseAdmin.from("genre_votes").upsert(
      { room_id, user_id: user.id, genre_code: target_id, result },
      { onConflict: "room_id,user_id,genre_code" }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // 全員完了チェック（サーバーサイドで行う）
    const { data: participants } = await supabaseAdmin
      .from("participants")
      .select("user_id")
      .eq("room_id", room_id);

    const { data: votes } = await supabaseAdmin
      .from("genre_votes")
      .select("user_id")
      .eq("room_id", room_id);

    const participantIds = participants?.map((p) => p.user_id) ?? [];
    const voteCounts: Record<string, number> = {};
    for (const v of votes ?? []) {
      voteCounts[v.user_id] = (voteCounts[v.user_id] ?? 0) + 1;
    }
    const completedIds = participantIds.filter((uid) => (voteCounts[uid] ?? 0) >= GENRE_COUNT);
    const allDone = completedIds.length >= participantIds.length && participantIds.length > 0;

    // 全員完了かつホストの場合、ジャンル集計して shop_voting へ
    const { data: room } = await supabaseAdmin
      .from("rooms")
      .select("host_user_id, status")
      .eq("id", room_id)
      .single();

    if (allDone && room?.status === "genre_voting" && room.host_user_id === user.id) {
      const { data: allVotes } = await supabaseAdmin
        .from("genre_votes")
        .select("genre_code, result")
        .eq("room_id", room_id);

      const scores: Record<string, number> = {};
      for (const v of allVotes ?? []) {
        if (!scores[v.genre_code]) scores[v.genre_code] = 0;
        if (v.result === "yes") scores[v.genre_code] += 2;
        else if (v.result === "maybe") scores[v.genre_code] += 1;
      }
      const topGenres = Object.entries(scores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([code]) => code);

      await supabaseAdmin
        .from("rooms")
        .update({ status: "shop_voting" })
        .eq("id", room_id);

      return NextResponse.json({ ok: true, all_done: true, top_genres: topGenres });
    }

    return NextResponse.json({
      ok: true,
      all_done: allDone,
      completed_count: completedIds.length,
      participant_count: participantIds.length,
    });

  } else if (target_type === "shop") {
    const { error } = await supabaseAdmin.from("shop_votes").upsert(
      { room_id, shop_id: target_id, user_id: user.id, result },
      { onConflict: "room_id,shop_id,user_id" }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid target_type" }, { status: 400 });
}
