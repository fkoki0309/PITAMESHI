import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

function seededHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const roomId = searchParams.get("room_id");
  if (!roomId) return NextResponse.json({ error: "room_id is required" }, { status: 400 });

  // 店舗一覧を取得
  const { data: shops } = await supabaseAdmin
    .from("shops")
    .select("*")
    .eq("room_id", roomId)
    .order("display_order");

  if (!shops || shops.length === 0) {
    return NextResponse.json({ error: "No shops found" }, { status: 404 });
  }

  // 投票結果を取得
  const { data: votes } = await supabaseAdmin
    .from("shop_votes")
    .select("shop_id, result")
    .eq("room_id", roomId);

  // スコア集計（yes×2 + maybe×1）
  const scores: Record<string, { yes: number; maybe: number; no: number; total: number }> = {};
  for (const shop of shops) {
    scores[shop.id] = { yes: 0, maybe: 0, no: 0, total: 0 };
  }
  for (const vote of votes ?? []) {
    if (!scores[vote.shop_id]) continue;
    if (vote.result === "yes") {
      scores[vote.shop_id].yes += 1;
      scores[vote.shop_id].total += 2;
    } else if (vote.result === "maybe") {
      scores[vote.shop_id].maybe += 1;
      scores[vote.shop_id].total += 1;
    } else {
      scores[vote.shop_id].no += 1;
    }
  }

  // ランキング作成（同点は room_id + shop_id のハッシュで決定 → 全参加者で同じ結果）
  const ranked = shops
    .map((shop) => ({
      ...shop,
      score: scores[shop.id] ?? { yes: 0, maybe: 0, no: 0, total: 0 },
    }))
    .sort((a, b) => {
      if (b.score.total !== a.score.total) return b.score.total - a.score.total;
      return seededHash(roomId + a.id) - seededHash(roomId + b.id);
    });

  return NextResponse.json({ ranked });
}
