"use client";

import { useState } from "react";
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

export function TutorialModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);

  const next = () => {
    if (step < TUTORIAL_STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      onClose();
    }
  };

  return (
    <motion.div
      key="tutorial-overlay"
      className="fixed inset-0 z-40 flex items-center justify-center px-6 bg-black/50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-sm bg-white rounded-3xl shadow-2xl px-6 pt-6 pb-8 relative"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-gray-400 text-2xl"
        >×</button>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center text-center pt-4 pb-6"
          >
            <span className="text-7xl mb-5">{TUTORIAL_STEPS[step].icon}</span>
            <h2 className="text-xl font-bold text-gray-900 mb-3">{TUTORIAL_STEPS[step].title}</h2>
            <p className="text-base text-gray-500 leading-relaxed whitespace-pre-line">
              {TUTORIAL_STEPS[step].description}
            </p>
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-center gap-2 mb-5">
          {TUTORIAL_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${i === step ? "w-6 bg-primary" : "w-2 bg-gray-200"}`}
            />
          ))}
        </div>

        <button
          onClick={next}
          className="w-full py-4 rounded-2xl bg-primary text-white text-lg font-bold active:scale-95 transition-transform mb-2"
        >
          {step < TUTORIAL_STEPS.length - 1 ? "次へ" : "わかった！"}
        </button>
      </motion.div>
    </motion.div>
  );
}
