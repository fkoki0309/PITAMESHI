"use client";

import { useParams } from "next/navigation";

export default function GenrePage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center px-5">
        <p className="text-5xl mb-4">🍽️</p>
        <h1 className="text-2xl font-bold text-foreground mb-2">ジャンルを選ぼう！</h1>
        <p className="text-muted-foreground text-sm">（STEP7で実装予定）</p>
        <p className="text-xs text-muted-foreground mt-4 font-mono break-all">{id}</p>
      </div>
    </div>
  );
}
