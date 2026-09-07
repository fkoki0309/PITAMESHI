"use client";

import { motion, useMotionValue, useTransform } from "framer-motion";
import { SwipeResult } from "./SwipeCard";

export type Shop = {
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

export function ShopCard({
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
        style={{ height: "100%", background: "#1a1a2e", transform: "scale(0.95) translateY(16px)", zIndex: 0 }}
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
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)" }} />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      <motion.div className="absolute inset-0 flex items-center justify-center" style={{ opacity: yesOpacity, background: "#22c55e22" }}>
        <span className="text-6xl font-black text-green-400 rotate-[-20deg] border-4 border-green-400 rounded-xl px-4 py-1 bg-black/30">YES</span>
      </motion.div>
      <motion.div className="absolute inset-0 flex items-center justify-center" style={{ opacity: noOpacity, background: "#ef444422" }}>
        <span className="text-6xl font-black text-red-400 rotate-[20deg] border-4 border-red-400 rounded-xl px-4 py-1 bg-black/30">NOPE</span>
      </motion.div>
      <motion.div className="absolute inset-0 flex items-center justify-center" style={{ opacity: maybeOpacity, background: "#f59e0b22" }}>
        <span className="text-5xl font-black text-yellow-400 border-4 border-yellow-400 rounded-xl px-4 py-1 bg-black/30">MAYBE</span>
      </motion.div>

      <div className="absolute bottom-0 left-0 right-0 px-5 pb-6 select-none">
        <div className="flex gap-2 mb-3 flex-wrap">
          {shop.is_open_late && <span className="px-2 py-1 rounded-full bg-purple-500/90 text-white text-xs font-bold">🌙 深夜営業</span>}
          {shop.has_reservation && <span className="px-2 py-1 rounded-full bg-green-500/90 text-white text-xs font-bold">📅 予約可</span>}
          {shop.capacity > 0 && <span className="px-2 py-1 rounded-full bg-black/60 text-white text-xs font-bold">👥 {shop.capacity}席</span>}
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

export function SkeletonCard() {
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
