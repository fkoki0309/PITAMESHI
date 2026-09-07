"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { TutorialModal } from "@/components/TutorialModal";

export default function TopPage() {
  const router = useRouter();
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("pitameshi_tutorial_shown")) {
      setShowTutorial(true);
    }
  }, []);

  const openTutorial = () => setShowTutorial(true);

  const closeTutorial = () => {
    localStorage.setItem("pitameshi_tutorial_shown", "1");
    setShowTutorial(false);
  };

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="flex flex-col items-center mb-12">
        <div className="w-24 h-24 rounded-3xl bg-primary flex items-center justify-center mb-6 shadow-lg">
          <span className="text-5xl">🍻</span>
        </div>
        <h1 className="text-4xl font-bold text-primary tracking-tight mb-2">PITAMESHI</h1>
        <p className="text-lg text-muted-foreground text-center leading-relaxed">
          2次会の店を<br />みんなで決めよう
        </p>
      </div>

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

      <AnimatePresence>
        {showTutorial && <TutorialModal onClose={closeTutorial} />}
      </AnimatePresence>
    </main>
  );
}
