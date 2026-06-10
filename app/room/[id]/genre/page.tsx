"use client";

import { useState, useEffect } from "react";
import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/Toast";

const GENRES = [
  { code: "G001", name: "居酒屋", emoji: "🍺", color: "#f97316", bg: "#fff7ed" },
  { code: "G002", name: "ダイニングバー", emoji: "🥂", color: "#8b5cf6", bg: "#f5f3ff" },
  { code: "G003", name: "焼肉・ホルモン", emoji: "🥩", color: "#ef4444", bg: "#fef2f2" },
  { code: "G004", name: "鍋", emoji: "🍲", color: "#f59e0b", bg: "#fffbeb" },
  { code: "G005", name: "寿司", emoji: "🍣", color: "#3b82f6", bg: "#eff6ff" },
  { code: "G006", name: "焼き鳥・串揚げ", emoji: "🍢", color: "#d97706", bg: "#fefce8" },
  { code: "G007", name: "中華", emoji: "🥟", color: "#dc2626", bg: "#fff1f2" },
  { code: "G008", name: "イタリアン・フレンチ", emoji: "🍝", color: "#16a34a", bg: "#f0fdf4" },
  { code: "G009", name: "アジア・エスニック", emoji: "🌶️", color: "#0d9488", bg: "#f0fdfa" },
  { code: "G010", name: "ラーメン", emoji: "🍜", color: "#ea580c", bg: "#fff7ed" },
];

type SwipeResult = "yes" | "maybe" | "no";


function SwipeCard({
  genre,
  onSwipe,
  isTop,
}: {
  genre: (typeof GENRES)[0];
  onSwipe: (result: SwipeResult) => void;
  isTop: boolean;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const yesOpacity = useTransform(x, [30, 100], [0, 1]);
  const noOpacity = useTransform(x, [-100, -30], [1, 0]);
  const maybeOpacity = useTransform(y, [-100, -30], [1, 0]);

  function handleDragEnd(_: unknown, info: { offset: { x: number; y: number }; velocity: { x: number; y: number } }) {
    const { offset, velocity } = info;
    if (offset.x > 100 || velocity.x > 500) onSwipe("yes");
    else if (offset.x < -100 || velocity.x < -500) onSwipe("no");
    else if (offset.y < -80 || velocity.y < -500) onSwipe("maybe");
  }

  if (!isTop) {
    return (
      <div
        className="absolute w-full rounded-3xl shadow-lg"
        style={{
          height: "100%",
          background: genre.bg,
          border: `3px solid ${genre.color}22`,
          transform: "scale(0.95) translateY(16px)",
          zIndex: 0,
        }}
      />
    );
  }

  return (
    <motion.div
      className="absolute w-full rounded-3xl shadow-xl cursor-grab active:cursor-grabbing"
      style={{
        height: "100%",
        background: genre.bg,
        border: `3px solid ${genre.color}44`,
        x, y, rotate, zIndex: 1,
      }}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      whileTap={{ scale: 1.02 }}
    >
      <motion.div className="absolute inset-0 rounded-3xl flex items-center justify-center" style={{ opacity: yesOpacity, background: "#22c55e22" }}>
        <span className="text-6xl font-black text-green-500 rotate-[-20deg] border-4 border-green-500 rounded-xl px-4 py-1">YES</span>
      </motion.div>
      <motion.div className="absolute inset-0 rounded-3xl flex items-center justify-center" style={{ opacity: noOpacity, background: "#ef444422" }}>
        <span className="text-6xl font-black text-red-500 rotate-[20deg] border-4 border-red-500 rounded-xl px-4 py-1">NOPE</span>
      </motion.div>
      <motion.div className="absolute inset-0 rounded-3xl flex items-center justify-center" style={{ opacity: maybeOpacity, background: "#f59e0b22" }}>
        <span className="text-5xl font-black text-yellow-500 border-4 border-yellow-500 rounded-xl px-4 py-1">MAYBE</span>
      </motion.div>
      <div className="flex flex-col items-center justify-center h-full gap-6 px-6 select-none">
        <span className="text-8xl">{genre.emoji}</span>
        <h2 className="text-3xl font-black text-center" style={{ color: genre.color }}>{genre.name}</h2>
        <p className="text-sm text-muted-foreground text-center">右スワイプ ❤️　上スワイプ 🤔　左スワイプ ✕</p>
      </div>
    </motion.div>
  );
}

export default function GenrePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lastResult, setLastResult] = useState<SwipeResult | null>(null);
  const [done, setDone] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [isHost, setIsHost] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const { showToast, ToastContainer } = useToast();

  // 認証・部屋情報取得
  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setToken(session.access_token);
      supabase.realtime.setAuth(session.access_token);

      // ホスト判定
      const res = await fetch(`/api/rooms/${id}`);
      if (!res.ok) return;
      const room = await res.json();
      setParticipantCount(room.participant_count);
      setIsHost(session.user.id === room.host_user_id);

      // ステータスが genre_voting でなければリダイレクト
      if (room.status === "shop_voting") router.replace(`/room/${id}/vote`);
      if (room.status === "finished") router.replace(`/room/${id}/result`);
    }
    init();
  }, [id, router]);

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

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`room:${id}:genre_status`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${id}` },
        (payload) => {
          const status = (payload.new as { status: string }).status;
          if (status === "shop_voting") router.replace(`/room/${id}/vote`);
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) supabase.realtime.setAuth(session.access_token);
          });
        }
      });

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
          if (data.status === "shop_voting") router.replace(`/room/${id}/vote`);
          else if (data.status === "finished") router.replace(`/room/${id}/result`);
        });
    }, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [id, router]);

  async function handleSwipe(result: SwipeResult) {
    const genre = GENRES[currentIndex];
    setLastResult(result);
    setTimeout(() => setLastResult(null), 600);

    const nextIndex = currentIndex + 1;
    const isLast = nextIndex >= GENRES.length;

    if (isLast) {
      setDone(true);
    } else {
      setCurrentIndex(nextIndex);
    }

    // DBに保存（APIレスポンスで完了チェック）
    if (token) {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ room_id: id, target_id: genre.code, target_type: "genre", result }),
      });
      const body = await res.json();
      if (body.completed_count !== undefined) setCompletedCount(body.completed_count);
      if (body.participant_count !== undefined) setParticipantCount(body.participant_count);
      // ホスト かつ 全員完了 → vote 画面へ
      if (body.all_done && isHost) {
        router.replace(`/room/${id}/vote`);
      }
    }
  }

  const remaining = GENRES.length - currentIndex;
  const current = GENRES[currentIndex];
  const next = GENRES[currentIndex + 1];

  if (done) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-5">
        <ToastContainer />
        <div className="text-center">
          <p className="text-5xl mb-4">✅</p>
          <h1 className="text-2xl font-bold text-foreground mb-2">投票完了！</h1>
          <p className="text-muted-foreground">
            {completedCount} / {participantCount}人が完了
          </p>
          <p className="text-sm text-muted-foreground mt-2">他の参加者を待っています…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <ToastContainer />
      <main className="max-w-md mx-auto w-full min-h-screen flex flex-col px-5 pt-10 pb-6">

        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold text-foreground">ジャンル投票</h1>
          <span className="text-sm font-bold text-primary bg-secondary px-3 py-1 rounded-full">
            {remaining} / {GENRES.length}
          </span>
        </div>

        {/* 進捗バー */}
        <div className="w-full h-2 bg-secondary rounded-full mb-2">
          <div
            className="h-2 bg-primary rounded-full transition-all"
            style={{ width: `${(currentIndex / GENRES.length) * 100}%` }}
          />
        </div>

        {/* 参加者進捗 */}
        {participantCount > 0 && (
          <p className="text-xs text-muted-foreground text-center mb-4">
            {participantCount}人中 {completedCount}人が投票完了
          </p>
        )}

        {/* カードエリア */}
        <div className="relative flex-1" style={{ minHeight: 360 }}>
          <AnimatePresence mode="wait">
            {next && (
              <SwipeCard key={`next-${next.code}`} genre={next} onSwipe={() => {}} isTop={false} />
            )}
            <motion.div
              key={current.code}
              className="absolute inset-0"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{
                x: lastResult === "yes" ? 300 : lastResult === "no" ? -300 : 0,
                y: lastResult === "maybe" ? -300 : 0,
                opacity: 0,
                transition: { duration: 0.25 },
              }}
            >
              <SwipeCard genre={current} onSwipe={handleSwipe} isTop={true} />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ボタン操作 */}
        <div className="flex items-center justify-center gap-6 mt-6">
          <button onClick={() => handleSwipe("no")} className="w-16 h-16 rounded-full bg-white border-2 border-red-300 text-3xl shadow flex items-center justify-center active:scale-90 transition-transform">✕</button>
          <button onClick={() => handleSwipe("maybe")} className="w-14 h-14 rounded-full bg-white border-2 border-yellow-300 text-2xl shadow flex items-center justify-center active:scale-90 transition-transform">🤔</button>
          <button onClick={() => handleSwipe("yes")} className="w-16 h-16 rounded-full bg-white border-2 border-green-300 text-3xl shadow flex items-center justify-center active:scale-90 transition-transform">❤️</button>
        </div>

        {/* 操作説明 */}
        <div className="flex justify-between text-xs text-muted-foreground mt-3 px-2">
          <span>← いらない</span>
          <span>↑ まあいい</span>
          <span>いきたい →</span>
        </div>
      </main>
    </div>
  );
}
