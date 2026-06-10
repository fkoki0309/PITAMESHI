"use client";

import { useState } from "react";
import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";

// モックデータ
const MOCK_SHOPS = [
  {
    id: "1",
    name: "居酒屋 火凪 有楽町店",
    genre: "居酒屋",
    budget: "2,500円",
    access: "有楽町駅から徒歩3分",
    catch: "炭火焼きと厳選地酒が自慢の本格居酒屋",
    photo_url: "https://picsum.photos/seed/izakaya/600/800",
    capacity: 60,
    has_reservation: true,
    open_hours: "17:00〜翌2:00",
    is_open_late: true,
    hotpepper_url: "",
  },
  {
    id: "2",
    name: "焼肉 牛角 東京駅前店",
    genre: "焼肉・ホルモン",
    budget: "3,000円",
    access: "東京駅から徒歩5分",
    catch: "厳選黒毛和牛を堪能できる焼肉店",
    photo_url: "https://picsum.photos/seed/yakiniku/600/800",
    capacity: 80,
    has_reservation: true,
    open_hours: "11:30〜23:00",
    is_open_late: false,
    hotpepper_url: "",
  },
  {
    id: "3",
    name: "鮨処 青海",
    genre: "寿司",
    budget: "4,000円",
    access: "銀座駅から徒歩2分",
    catch: "職人が握る江戸前寿司の名店",
    photo_url: "https://picsum.photos/seed/sushi/600/800",
    capacity: 30,
    has_reservation: true,
    open_hours: "12:00〜22:00",
    is_open_late: false,
    hotpepper_url: "",
  },
];

type Shop = (typeof MOCK_SHOPS)[0];
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

  const bgColor = shop.photo_url ? "transparent" : "#1a1a2e";

  if (!isTop) {
    return (
      <div
        className="absolute w-full rounded-3xl shadow-lg overflow-hidden"
        style={{
          height: "100%",
          background: bgColor,
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
      {/* 背景写真 or グラデーション */}
      {shop.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={shop.photo_url} alt={shop.name} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)" }}
        />
      )}

      {/* 暗いオーバーレイ */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* YES オーバーレイ */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        style={{ opacity: yesOpacity, background: "#22c55e22" }}
      >
        <span className="text-6xl font-black text-green-400 rotate-[-20deg] border-4 border-green-400 rounded-xl px-4 py-1 bg-black/30">YES</span>
      </motion.div>

      {/* NO オーバーレイ */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        style={{ opacity: noOpacity, background: "#ef444422" }}
      >
        <span className="text-6xl font-black text-red-400 rotate-[20deg] border-4 border-red-400 rounded-xl px-4 py-1 bg-black/30">NOPE</span>
      </motion.div>

      {/* MAYBE オーバーレイ */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        style={{ opacity: maybeOpacity, background: "#f59e0b22" }}
      >
        <span className="text-5xl font-black text-yellow-400 border-4 border-yellow-400 rounded-xl px-4 py-1 bg-black/30">MAYBE</span>
      </motion.div>

      {/* 店舗情報オーバーレイ（下部） */}
      <div className="absolute bottom-0 left-0 right-0 px-5 pb-6 select-none">
        {/* バッジ */}
        <div className="flex gap-2 mb-3 flex-wrap">
          {shop.is_open_late && (
            <span className="px-2 py-1 rounded-full bg-purple-500/90 text-white text-xs font-bold">🌙 深夜営業</span>
          )}
          {shop.has_reservation && (
            <span className="px-2 py-1 rounded-full bg-green-500/90 text-white text-xs font-bold">📅 予約可</span>
          )}
          <span className="px-2 py-1 rounded-full bg-black/60 text-white text-xs font-bold">👥 {shop.capacity}席</span>
        </div>

        {/* 店名 */}
        <h2 className="text-2xl font-black text-white mb-1 leading-tight">{shop.name}</h2>

        {/* ジャンル・予算 */}
        <div className="flex gap-3 items-center mb-2">
          <span className="text-orange-300 text-sm font-semibold">{shop.genre}</span>
          <span className="text-white/60 text-sm">|</span>
          <span className="text-white text-sm font-semibold">¥{shop.budget}</span>
        </div>

        {/* アクセス */}
        <p className="text-white/80 text-sm mb-1">🚶 {shop.access}</p>

        {/* 営業時間 */}
        <p className="text-white/60 text-xs">🕐 {shop.open_hours}</p>

        {/* キャッチコピー */}
        <p className="text-white/70 text-sm mt-2 italic">「{shop.catch}」</p>
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lastResult, setLastResult] = useState<SwipeResult | null>(null);
  const [done, setDone] = useState(false);
  const [loading] = useState(false);

  const shops = MOCK_SHOPS;
  const participantCount = 3;
  const completedCount = 1;

  function handleSwipe(result: SwipeResult) {
    setLastResult(result);
    setTimeout(() => setLastResult(null), 600);

    if (currentIndex + 1 >= shops.length) {
      setDone(true);
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }

  const remaining = shops.length - currentIndex;
  const current = shops[currentIndex];
  const next = shops[currentIndex + 1];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
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

  if (done) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-5">
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
      <main className="max-w-md mx-auto w-full min-h-screen flex flex-col px-5 pt-10 pb-6">

        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold text-foreground">店舗投票</h1>
          <span className="text-sm font-bold text-primary bg-secondary px-3 py-1 rounded-full">
            {remaining} / {shops.length}
          </span>
        </div>

        {/* 進捗バー */}
        <div className="w-full h-2 bg-secondary rounded-full mb-2">
          <div
            className="h-2 bg-primary rounded-full transition-all"
            style={{ width: `${(currentIndex / shops.length) * 100}%` }}
          />
        </div>

        {/* 参加者進捗 */}
        <p className="text-xs text-muted-foreground text-center mb-4">
          {participantCount}人中 {completedCount}人が投票完了
        </p>

        {/* カードエリア */}
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

        {/* ボタン操作 */}
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
