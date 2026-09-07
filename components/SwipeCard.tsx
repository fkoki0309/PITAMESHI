"use client";

import { motion, useMotionValue, useTransform } from "framer-motion";

export type SwipeResult = "yes" | "maybe" | "no";

export type Genre = {
  code: string;
  name: string;
  emoji: string;
  color: string;
  bg: string;
};

export function SwipeCard({
  genre,
  onSwipe,
  isTop,
}: {
  genre: Genre;
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
      style={{ height: "100%", background: genre.bg, border: `3px solid ${genre.color}44`, x, y, rotate, zIndex: 1 }}
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
