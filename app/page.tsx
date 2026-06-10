"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const TUTORIAL_STEPS = [
  {
    icon: "🍽️",
    title: "ジャンルをスワイプで選ぶ",
    description: "焼肉・寿司・中華など\n行きたいジャンルを右にスワイプ！",
  },
  {
    icon: "🏪",
    title: "近くの店をスワイプで投票",
    description: "候補店舗が表示されるので\nみんなでスワイプして投票しよう！",
  },
  {
    icon: "🎉",
    title: "一番人気の店が決定！",
    description: "全員の投票が集まったら\n自動で結果発表！",
  },
];

export default function TopPage() {
  const router = useRouter();
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  const openTutorial = () => {
    setTutorialStep(0);
    setShowTutorial(true);
  };

  const closeTutorial = () => setShowTutorial(false);

  const nextStep = () => {
    if (tutorialStep < TUTORIAL_STEPS.length - 1) {
      setTutorialStep((s) => s + 1);
    } else {
      closeTutorial();
    }
  };

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      {/* ロゴ・キャッチコピー */}
      <div className="flex flex-col items-center mb-12">
        <div className="w-24 h-24 rounded-3xl bg-primary flex items-center justify-center mb-6 shadow-lg">
          <span className="text-5xl">🍻</span>
        </div>
        <h1 className="text-4xl font-bold text-primary tracking-tight mb-2">
          PITAMESHI
        </h1>
        <p className="text-lg text-muted-foreground text-center leading-relaxed">
          2次会の店を
          <br />
          みんなで決めよう
        </p>
      </div>

      {/* ボタン */}
      <div className="w-full max-w-sm flex flex-col gap-4">
        <button
          onClick={() => router.push("/room/new")}
          className="w-full py-4 rounded-2xl bg-primary text-primary-foreground text-xl font-bold shadow-md active:scale-95 transition-transform"
        >
          部屋を作る
        </button>

        <button
          onClick={openTutorial}
          className="w-full py-3 text-primary text-base font-medium underline underline-offset-4"
        >
          使い方を見る
        </button>
      </div>

      {/* チュートリアルモーダル */}
      <AnimatePresence>
        {showTutorial && (
          <>
            {/* オーバーレイ */}
            <motion.div
              className="fixed inset-0 bg-black/50 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeTutorial}
            />

            {/* モーダル本体 */}
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl px-6 pt-6 pb-10 shadow-2xl"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              {/* 閉じるボタン */}
              <button
                onClick={closeTutorial}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-400 text-2xl"
              >
                ×
              </button>

              {/* ステップコンテンツ */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={tutorialStep}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col items-center text-center py-6"
                >
                  <span className="text-7xl mb-6">
                    {TUTORIAL_STEPS[tutorialStep].icon}
                  </span>
                  <h2 className="text-2xl font-bold text-foreground mb-3">
                    {TUTORIAL_STEPS[tutorialStep].title}
                  </h2>
                  <p className="text-base text-muted-foreground leading-relaxed whitespace-pre-line">
                    {TUTORIAL_STEPS[tutorialStep].description}
                  </p>
                </motion.div>
              </AnimatePresence>

              {/* ドットインジケーター */}
              <div className="flex justify-center gap-2 mb-6">
                {TUTORIAL_STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      i === tutorialStep
                        ? "w-6 bg-primary"
                        : "w-2 bg-gray-200"
                    }`}
                  />
                ))}
              </div>

              {/* アクションボタン */}
              <button
                onClick={nextStep}
                className="w-full py-4 rounded-2xl bg-primary text-primary-foreground text-lg font-bold active:scale-95 transition-transform"
              >
                {tutorialStep < TUTORIAL_STEPS.length - 1 ? "次へ" : "わかった！"}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  );
}
