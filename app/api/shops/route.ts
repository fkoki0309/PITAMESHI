import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { fetchShops } from "@/lib/hotpepper";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const roomId = searchParams.get("room_id");
  if (!roomId) return NextResponse.json({ error: "room_id is required" }, { status: 400 });

  // 既にDBにキャッシュがあればそれを返す
  const { data: cached } = await supabaseAdmin
    .from("shops")
    .select("*")
    .eq("room_id", roomId)
    .order("display_order");

  if (cached && cached.length > 0) {
    return NextResponse.json({ shops: cached });
  }

  // 部屋情報を取得
  const { data: room, error: roomError } = await supabaseAdmin
    .from("rooms")
    .select("location_lat, location_lng, budget, status")
    .eq("id", roomId)
    .single();

  if (roomError || !room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  // 上位ジャンルを集計（genre_votes から）
  const { data: genreVotes } = await supabaseAdmin
    .from("genre_votes")
    .select("genre_code, result")
    .eq("room_id", roomId);

  const scores: Record<string, number> = {};
  for (const v of genreVotes ?? []) {
    if (!scores[v.genre_code]) scores[v.genre_code] = 0;
    if (v.result === "yes") scores[v.genre_code] += 2;
    else if (v.result === "maybe") scores[v.genre_code] += 1;
  }
  const topGenres = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([code]) => code);

  // ホットペッパーAPI呼び出し
  let shops;
  try {
    shops = await fetchShops({
      lat: room.location_lat,
      lng: room.location_lng,
      genres: topGenres.length > 0 ? topGenres : [],
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Hotpepper API error" },
      { status: 502 }
    );
  }

  if (shops.length === 0) {
    return NextResponse.json({ shops: [] });
  }

  // DBに保存
  const rows = shops.map((s, i) => ({
    room_id: roomId,
    hotpepper_id: s.id,
    name: s.name,
    genre: s.genre,
    budget: s.budget,
    address: s.address,
    access: s.access,
    catch: s.catch,
    photo_url: s.photo_url,
    capacity: s.capacity,
    has_reservation: s.has_reservation,
    open_hours: s.open_hours,
    is_open_late: s.is_open_late,
    hotpepper_url: s.hotpepper_url,
    display_order: i,
  }));

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("shops")
    .insert(rows)
    .select("*");

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ shops: inserted ?? [] });
}
