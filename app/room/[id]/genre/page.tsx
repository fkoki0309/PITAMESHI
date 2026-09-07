"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/Toast";
import { SwipeCard, SwipeResult, Genre } from "@/components/SwipeCard";
import { SwipeButtons } from "@/components/SwipeButtons";
import { VoteCompletedScreen } from "@/components/VoteCompletedScreen";
import { useHeartbeat } from "@/hooks/useHeartbeat";

const GENRES: Genre[] = [
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

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setToken(session.access_token);
      supabase.realtime.setAuth(session.access_token);

      const res = await fetch(`/api/rooms/${id}`);
      if (!res.ok) return;
      const room = await res.json();
      setParticipantCount(room.participant_count);
      setIsHost(session.user.id === room.host_user_id);

      if (room.status === "shop_voting") router.replace(`/room/${id}/vote`);
      if (room.status === "finished") router.replace(`/room/${id}/result`);
    }
    init();
  }, [id, router]);

  useHeartbeat(token, id);

  useEffect(() => {
    const channel = supabase
      .channel(`room:${id}:genre_status`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${id}` },
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
  }, [id, router, showToast]);

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

    if (token) {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ room_id: id, target_id: genre.code, target_type: "genre", result }),
      });
      const body = await res.json();
      if (body.completed_count !== undefined) setCompletedCount(body.completed_count);
      if (body.participant_count !== undefined) setParticipantCount(body.participant_count);
      if (body.all_done && isHost) {
        router.replace(`/room/${id}/vote`);
      }
    }
  }

  if (done) {
    return (
      <>
        <ToastContainer />
        <VoteCompletedScreen completedCount={completedCount} participantCount={participantCount} />
      </>
    );
  }

  const remaining = GENRES.length - currentIndex;
  const current = GENRES[currentIndex];
  const next = GENRES[currentIndex + 1];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <ToastContainer />
      <main className="max-w-md mx-auto w-full min-h-screen flex flex-col px-5 pt-10 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold text-foreground">ジャンル投票</h1>
          <span className="text-sm font-bold text-primary bg-secondary px-3 py-1 rounded-full">
            {remaining} / {GENRES.length}
          </span>
        </div>

        <div className="w-full h-2 bg-secondary rounded-full mb-2">
          <div className="h-2 bg-primary rounded-full transition-all" style={{ width: `${(currentIndex / GENRES.length) * 100}%` }} />
        </div>

        {participantCount > 0 && (
          <p className="text-xs text-muted-foreground text-center mb-4">
            {participantCount}人中 {completedCount}人が投票完了
          </p>
        )}

        <div className="relative flex-1" style={{ minHeight: 360 }}>
          <AnimatePresence mode="wait">
            {next && <SwipeCard key={`next-${next.code}`} genre={next} onSwipe={() => {}} isTop={false} />}
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

        <SwipeButtons onSwipe={handleSwipe} />
      </main>
    </div>
  );
}
