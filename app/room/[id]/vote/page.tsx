"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/Toast";
import { ShopCard, SkeletonCard, Shop } from "@/components/ShopCard";
import { SwipeButtons } from "@/components/SwipeButtons";
import { VoteCompletedScreen } from "@/components/VoteCompletedScreen";
import { useHeartbeat } from "@/hooks/useHeartbeat";
import { usePresence } from "@/hooks/usePresence";
import { SwipeResult } from "@/components/SwipeCard";

export default function VotePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [shops, setShops] = useState<Shop[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lastResult, setLastResult] = useState<SwipeResult | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [isHost, setIsHost] = useState(false);
  const navigatedRef = useRef(false);
  const { showToast, ToastContainer } = useToast();

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setToken(session.access_token);
      setUserId(session.user.id);
      supabase.realtime.setAuth(session.access_token);

      const [roomRes, shopsRes] = await Promise.all([
        fetch(`/api/rooms/${id}`),
        fetch(`/api/shops?room_id=${id}`),
      ]);

      if (roomRes.ok) {
        const room = await roomRes.json();
        setIsHost(session.user.id === room.host_user_id);
        if (room.status === "finished") { router.replace(`/room/${id}/result`); return; }
      }

      if (!shopsRes.ok) {
        setError("店舗情報の取得に失敗しました");
        setLoading(false);
        return;
      }
      const { shops: fetchedShops } = await shopsRes.json();
      if (!fetchedShops || fetchedShops.length === 0) {
        setError("対象店舗が見つかりませんでした");
        setLoading(false);
        return;
      }
      setShops(fetchedShops);
      setLoading(false);
    }
    init();
  }, [id, router]);

  useHeartbeat(token, id);
  const participantCount = usePresence(id, userId);

  useEffect(() => {
    const navigate = () => {
      if (navigatedRef.current) return;
      navigatedRef.current = true;
      router.replace(`/room/${id}/result`);
    };

    const channel = supabase
      .channel(`room:${id}:vote_status`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${id}` },
        (payload) => {
          if ((payload.new as { status: string }).status === "finished") navigate();
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
        .then((data) => { if (data?.status === "finished") navigate(); });
    }, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [id, router, showToast]);

  async function handleSwipe(result: SwipeResult) {
    const shop = shops[currentIndex];
    setLastResult(result);
    setTimeout(() => setLastResult(null), 600);

    const nextIndex = currentIndex + 1;
    if (nextIndex >= shops.length) {
      setDone(true);
    } else {
      setCurrentIndex(nextIndex);
    }

    if (token) {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ room_id: id, target_id: shop.id, target_type: "shop", result }),
      });
      const body = await res.json();
      if (body.completed_count !== undefined) setCompletedCount(body.completed_count);
      if (body.all_done && isHost && !navigatedRef.current) {
        navigatedRef.current = true;
        router.replace(`/room/${id}/result`);
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <ToastContainer />
        <main className="max-w-md mx-auto w-full min-h-screen flex flex-col px-5 pt-10 pb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-bold text-foreground">店舗投票</h1>
            <span className="text-sm font-bold text-primary bg-secondary px-3 py-1 rounded-full">読込中…</span>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full mb-6" />
          <div className="relative flex-1" style={{ minHeight: 420 }}>
            <SkeletonCard />
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-5">
        <ToastContainer />
        <div className="text-center">
          <p className="text-5xl mb-4">😢</p>
          <h1 className="text-xl font-bold text-foreground mb-2">{error}</h1>
          <p className="text-sm text-muted-foreground mb-6">もう一度お試しください</p>
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

  if (done) {
    return (
      <>
        <ToastContainer />
        <VoteCompletedScreen completedCount={completedCount} participantCount={participantCount} />
      </>
    );
  }

  const remaining = shops.length - currentIndex;
  const current = shops[currentIndex];
  const next = shops[currentIndex + 1];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <ToastContainer />
      <main className="max-w-md mx-auto w-full min-h-screen flex flex-col px-5 pt-10 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold text-foreground">店舗投票</h1>
          <span className="text-sm font-bold text-primary bg-secondary px-3 py-1 rounded-full">
            {remaining} / {shops.length}
          </span>
        </div>

        <div className="w-full h-2 bg-secondary rounded-full mb-2">
          <div className="h-2 bg-primary rounded-full transition-all" style={{ width: `${(currentIndex / shops.length) * 100}%` }} />
        </div>

        {participantCount > 0 && (
          <p className="text-xs text-muted-foreground text-center mb-4">
            {participantCount}人中 {completedCount}人が投票完了
          </p>
        )}

        <div className="relative flex-1" style={{ minHeight: 420 }}>
          <AnimatePresence mode="wait">
            {next && <ShopCard key={`next-${next.id}`} shop={next} onSwipe={() => {}} isTop={false} />}
            <motion.div
              key={current.id}
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
              <ShopCard shop={current} onSwipe={handleSwipe} isTop={true} />
            </motion.div>
          </AnimatePresence>
        </div>

        <SwipeButtons onSwipe={handleSwipe} />
      </main>
    </div>
  );
}
