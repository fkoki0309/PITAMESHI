"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/Toast";

type ShopScore = {
  id: string;
  name: string;
  genre: string;
  budget: string;
  access: string;
  catch: string;
  photo_url: string;
  capacity: number;
  has_reservation: boolean;
  open_hours: string;
  is_open_late: boolean;
  hotpepper_url: string;
  score: { yes: number; maybe: number; no: number; total: number };
};

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [ranked, setRanked] = useState<ShopScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [isHost, setIsHost] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const { showToast, ToastContainer } = useToast();

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();

      const [resultRes, roomRes] = await Promise.all([
        fetch(`/api/result?room_id=${id}`),
        fetch(`/api/rooms/${id}`),
      ]);

      if (resultRes.ok) {
        const { ranked: data } = await resultRes.json();
        setRanked(data ?? []);
      }

      if (roomRes.ok && session) {
        const room = await roomRes.json();
        setIsHost(session.user.id === room.host_user_id);
      }

      if (session) setToken(session.access_token);
      setLoading(false);
    }
    init();
  }, [id]);

  // ハートビート + タブ離脱時の即時通知
  useEffect(() => {
    if (!token) return;
    const sendPing = () => fetch("/api/ping", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ room_id: id }),
    });
    sendPing();
    const interval = setInterval(sendPing, 10000);

    const handleUnload = () => {
      navigator.sendBeacon("/api/ping/leave", JSON.stringify({ room_id: id, token }));
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [token, id]);

  // 再投票検知・期限切れ検知
  useEffect(() => {
    const poll = setInterval(() => {
      fetch(`/api/rooms/${id}`)
        .then((r) => {
          if (r.status === 410) {
            showToast("セッションが期限切れです");
            setTimeout(() => router.replace("/"), 1500);
            return null;
          }
          return r.json();
        })
        .then((data) => {
          if (!data) return;
          if (data.status === "waiting") router.replace(`/room/${id}`);
        });
    }, 3000);
    return () => clearInterval(poll);
  }, [id, router, showToast]);

  async function handleReset() {
    if (resetting) return;
    setResetting(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setResetting(false); return; }

    await fetch(`/api/rooms/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ status: "waiting" }),
    });
    router.replace(`/room/${id}`);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <ToastContainer />
        <p className="text-muted-foreground">集計中...</p>
      </div>
    );
  }

  if (ranked.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-5">
        <ToastContainer />
        <div className="text-center">
          <p className="text-4xl mb-4">😢</p>
          <p className="text-lg font-bold text-foreground mb-6">結果が取得できませんでした</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-2xl bg-primary text-white font-bold active:scale-95 transition-transform"
          >
            画面を更新する
          </button>
        </div>
      </div>
    );
  }

  const winner = ranked[0];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const lineText = `2次会は「${winner.name}」に決まりました！🎉\n${winner.access}\n${appUrl}/room/${id}/result`;
  const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(lineText)}`;

  return (
    <div className="min-h-screen bg-background">
      <ToastContainer />
      <main className="max-w-md mx-auto min-h-screen flex flex-col px-5 pt-10 pb-10 gap-6">

        {/* ヘッダー */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-1">投票結果</p>
          <h1 className="text-2xl font-black text-foreground">🎉 お店が決まった！</h1>
        </div>

        {/* 決定店舗カード */}
        <div className="relative rounded-3xl overflow-hidden shadow-xl" style={{ minHeight: 280 }}>
          {winner.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={winner.photo_url} alt={winner.name} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)" }} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

          {/* 1位バッジ */}
          <div className="absolute top-4 left-4">
            <span className="text-3xl">🥇</span>
          </div>

          <div className="absolute bottom-0 left-0 right-0 px-5 pb-5">
            <div className="flex gap-2 mb-2 flex-wrap">
              {winner.is_open_late && (
                <span className="px-2 py-0.5 rounded-full bg-purple-500/90 text-white text-xs font-bold">🌙 深夜営業</span>
              )}
              {winner.has_reservation && (
                <span className="px-2 py-0.5 rounded-full bg-green-500/90 text-white text-xs font-bold">📅 予約可</span>
              )}
            </div>
            <h2 className="text-2xl font-black text-white leading-tight mb-1">{winner.name}</h2>
            <div className="flex gap-3 items-center mb-1">
              <span className="text-orange-300 text-sm font-semibold">{winner.genre}</span>
              {winner.budget && (
                <>
                  <span className="text-white/50 text-sm">|</span>
                  <span className="text-white text-sm">¥{winner.budget}</span>
                </>
              )}
            </div>
            {winner.access && <p className="text-white/80 text-sm">🚶 {winner.access}</p>}

            {/* スコア内訳 */}
            <div className="flex gap-3 mt-3">
              <span className="text-sm font-bold text-green-400">❤️ {winner.score.yes}</span>
              <span className="text-sm font-bold text-yellow-400">🤔 {winner.score.maybe}</span>
              <span className="text-sm font-bold text-red-400">✕ {winner.score.no}</span>
            </div>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="flex flex-col gap-3">
          {winner.hotpepper_url && (
            <a
              href={winner.hotpepper_url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 rounded-2xl bg-primary text-primary-foreground text-base font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              🍽️ ホットペッパーで予約する
            </a>
          )}
          <a
            href={lineUrl}
            className="w-full py-4 rounded-2xl bg-[#06C755] text-white text-base font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            💬 LINEでシェアする
          </a>
        </div>

        {/* ランキング */}
        {ranked.length > 1 && (
          <div>
            <h3 className="text-base font-bold text-foreground mb-3">📊 ランキング</h3>
            <div className="flex flex-col gap-3">
              {ranked.slice(1).map((shop, i) => (
                <div key={shop.id} className="flex items-center gap-3 bg-secondary rounded-2xl px-4 py-3">
                  <span className="text-xl">{i === 0 ? "🥈" : i === 1 ? "🥉" : `${i + 2}.`}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground text-sm truncate">{shop.name}</p>
                    <p className="text-xs text-muted-foreground">{shop.genre}</p>
                  </div>
                  <div className="flex gap-2 text-xs shrink-0">
                    <span className="text-green-500 font-bold">❤️{shop.score.yes}</span>
                    <span className="text-yellow-500 font-bold">🤔{shop.score.maybe}</span>
                    <span className="text-red-400 font-bold">✕{shop.score.no}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* もう一度（ホストのみ） */}
        {isHost && (
          <button
            onClick={handleReset}
            disabled={resetting}
            className="w-full py-4 rounded-2xl border-2 border-muted-foreground/30 text-muted-foreground text-base font-bold active:scale-95 transition-transform disabled:opacity-40"
          >
            {resetting ? "リセット中..." : "🔄 もう一度投票する"}
          </button>
        )}

      </main>
    </div>
  );
}
