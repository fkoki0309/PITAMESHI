"use client";

import { useState, useEffect } from "react";
import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/Toast";

type Shop = {
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
};

type SwipeResult = "yes" | "maybe" | "no";

function ShopCard({
  shop,
  onSwipe,
  isTop,
}: {
  shop: Shop;
  onSwipe: (result: SwipeResult) => void;
  isTop: boolean;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const yesOpacity = useTransform(x, [40, 120], [0, 1]);
  const noOpacity = useTransform(x, [-120, -40], [1, 0]);
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
        className="absolute w-full rounded-3xl shadow-lg overflow-hidden"
        style={{
          height: "100%",
          background: "#1a1a2e",
          transform: "scale(0.95) translateY(16px)",
          zIndex: 0,
        }}
      />
    );
  }

  return (
    <motion.div
      className="absolute w-full rounded-3xl shadow-xl overflow-hidden cursor-grab active:cursor-grabbing"
      style={{ height: "100%", x, y, rotate, zIndex: 1 }}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      whileTap={{ scale: 1.02 }}
    >
      {shop.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={shop.photo_url} alt={shop.name} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)" }}
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        style={{ opacity: yesOpacity, background: "#22c55e22" }}
      >
        <span className="text-6xl font-black text-green-400 rotate-[-20deg] border-4 border-green-400 rounded-xl px-4 py-1 bg-black/30">YES</span>
      </motion.div>

      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        style={{ opacity: noOpacity, background: "#ef444422" }}
      >
        <span className="text-6xl font-black text-red-400 rotate-[20deg] border-4 border-red-400 rounded-xl px-4 py-1 bg-black/30">NOPE</span>
      </motion.div>

      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        style={{ opacity: maybeOpacity, background: "#f59e0b22" }}
      >
        <span className="text-5xl font-black text-yellow-400 border-4 border-yellow-400 rounded-xl px-4 py-1 bg-black/30">MAYBE</span>
      </motion.div>

      <div className="absolute bottom-0 left-0 right-0 px-5 pb-6 select-none">
        <div className="flex gap-2 mb-3 flex-wrap">
          {shop.is_open_late && (
            <span className="px-2 py-1 rounded-full bg-purple-500/90 text-white text-xs font-bold">🌙 深夜営業</span>
          )}
          {shop.has_reservation && (
            <span className="px-2 py-1 rounded-full bg-green-500/90 text-white text-xs font-bold">📅 予約可</span>
          )}
          {shop.capacity > 0 && (
            <span className="px-2 py-1 rounded-full bg-black/60 text-white text-xs font-bold">👥 {shop.capacity}席</span>
          )}
        </div>

        <h2 className="text-2xl font-black text-white mb-1 leading-tight">{shop.name}</h2>

        <div className="flex gap-3 items-center mb-2">
          <span className="text-orange-300 text-sm font-semibold">{shop.genre}</span>
          {shop.budget && (
            <>
              <span className="text-white/60 text-sm">|</span>
              <span className="text-white text-sm font-semibold">¥{shop.budget}</span>
            </>
          )}
        </div>

        {shop.access && <p className="text-white/80 text-sm mb-1">🚶 {shop.access}</p>}
        {shop.open_hours && <p className="text-white/60 text-xs">🕐 {shop.open_hours}</p>}
        {shop.catch && <p className="text-white/70 text-sm mt-2 italic">「{shop.catch}」</p>}
      </div>
    </motion.div>
  );
}

function SkeletonCard() {
  return (
    <div className="absolute inset-0 rounded-3xl overflow-hidden bg-muted animate-pulse">
      <div className="absolute bottom-0 left-0 right-0 px-5 pb-6">
        <div className="h-4 bg-white/20 rounded mb-3 w-1/3" />
        <div className="h-7 bg-white/20 rounded mb-2 w-3/4" />
        <div className="h-4 bg-white/20 rounded mb-1 w-1/2" />
        <div className="h-4 bg-white/20 rounded w-2/3" />
      </div>
    </div>
  );
}

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
  const [participantCount, setParticipantCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [isHost, setIsHost] = useState(false);
  const { showToast, ToastContainer } = useToast();

  // 認証・店舗データ取得
  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setToken(session.access_token);
      supabase.realtime.setAuth(session.access_token);

      const [roomRes, shopsRes] = await Promise.all([
        fetch(`/api/rooms/${id}`),
        fetch(`/api/shops?room_id=${id}`),
      ]);

      if (roomRes.ok) {
        const room = await roomRes.json();
        setParticipantCount(room.participant_count ?? 0);
        setIsHost(session.user.id === room.host_user_id);
        if (room.status === "finished") {
          router.replace(`/room/${id}/result`);
          return;
        }
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
      .channel(`room:${id}:vote_status`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${id}` },
        (payload) => {
          const status = (payload.new as { status: string }).status;
          if (status === "finished") router.replace(`/room/${id}/result`);
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
          if (data.status === "finished") router.replace(`/room/${id}/result`);
        });
    }, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [id, router]);

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
      if (body.participant_count !== undefined) setParticipantCount(body.participant_count);
      if (body.all_done && isHost) {
        router.replace(`/room/${id}/result`);
      }
    }
  }

  const remaining = shops.length - currentIndex;
  const current = shops[currentIndex];
  const next = shops[currentIndex + 1];

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
          <p className="text-sm text-muted-foreground">もう一度お試しください</p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-5">
        <ToastContainer />
        <div className="text-center">
          <p className="text-5xl mb-4">✅</p>
          <h1 className="text-2xl font-bold text-foreground mb-2">投票完了！</h1>
          <p className="text-muted-foreground">{participantCount}人中 {completedCount}人が完了</p>
          <p className="text-sm text-muted-foreground mt-2">他の参加者を待っています…</p>
        </div>
      </div>
    );
  }

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
          <div
            className="h-2 bg-primary rounded-full transition-all"
            style={{ width: `${(currentIndex / shops.length) * 100}%` }}
          />
        </div>

        {participantCount > 0 && (
          <p className="text-xs text-muted-foreground text-center mb-4">
            {participantCount}人中 {completedCount}人が投票完了
          </p>
        )}

        <div className="relative flex-1" style={{ minHeight: 420 }}>
          <AnimatePresence mode="wait">
            {next && (
              <ShopCard key={`next-${next.id}`} shop={next} onSwipe={() => {}} isTop={false} />
            )}
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

        <div className="flex items-center justify-center gap-6 mt-6">
          <button
            onClick={() => handleSwipe("no")}
            className="w-16 h-16 rounded-full bg-white border-2 border-red-300 text-3xl shadow-lg flex items-center justify-center active:scale-90 transition-transform"
          >✕</button>
          <button
            onClick={() => handleSwipe("maybe")}
            className="w-14 h-14 rounded-full bg-white border-2 border-yellow-300 text-2xl shadow-lg flex items-center justify-center active:scale-90 transition-transform"
          >🤔</button>
          <button
            onClick={() => handleSwipe("yes")}
            className="w-16 h-16 rounded-full bg-white border-2 border-green-300 text-3xl shadow-lg flex items-center justify-center active:scale-90 transition-transform"
          >❤️</button>
        </div>

        <div className="flex justify-between text-xs text-muted-foreground mt-3 px-2">
          <span>← いらない</span>
          <span>↑ まあいい</span>
          <span>いきたい →</span>
        </div>
      </main>
    </div>
  );
}
