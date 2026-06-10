"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/Toast";

const BUDGET_LABELS: Record<string, string> = {
  B001: "〜500円",
  B002: "501〜1,000円",
  B003: "1,001〜1,500円",
  B008: "1,501〜2,000円",
  B009: "2,001〜3,000円",
  B010: "3,001〜4,000円",
  B011: "4,001〜5,000円",
  B013: "5,001〜7,000円",
};

type RoomData = {
  id: string;
  status: string;
  location_name: string;
  budget: string;
  max_participants: number;
  expires_at: string;
  host_user_id: string;
  participant_count: number;
};

function formatCountdown(expiresAt: string) {
  const ms = new Date(expiresAt).getTime() - Date.now();
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function WaitingRoomPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [room, setRoom] = useState<RoomData | null>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState("");
  const [starting, setStarting] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const { showToast, ToastContainer } = useToast();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const roomUrl = `${appUrl}/room/${id}`;

  // 部屋情報取得
  const fetchRoom = useCallback(async () => {
    const res = await fetch(`/api/rooms/${id}`);
    if (!res.ok) {
      setError(res.status === 410 ? "このセッションは期限切れです" : "部屋が見つかりません");
      return null;
    }
    const data: RoomData = await res.json();
    setRoom(data);
    setParticipantCount(data.participant_count);
    return data;
  }, [id]);

  // 匿名認証 + 参加処理
  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      let userId: string;

      if (session?.user) {
        userId = session.user.id;
        setToken(session.access_token);
        supabase.realtime.setAuth(session.access_token);
      } else {
        const { data, error: authError } = await supabase.auth.signInAnonymously();
        if (authError || !data.session) {
          setError("認証に失敗しました");
          return;
        }
        userId = data.session.user.id;
        setToken(data.session.access_token);
        supabase.realtime.setAuth(data.session.access_token);
      }
      setCurrentUserId(userId);

      const roomData = await fetchRoom();
      if (!roomData) return;

      if (roomData.participant_count >= roomData.max_participants) {
        setError("この部屋は満員です");
        return;
      }

      // insert して重複エラー（23505）は無視（既に参加済みの場合）
      const { error: insertError } = await supabase
        .from("participants")
        .insert({ room_id: id, user_id: userId });
      if (insertError && insertError.code !== "23505") {
        console.error("参加登録エラー:", insertError);
      }

      // API経由で正確なカウントを再取得
      await fetchRoom();

      if (roomData.status === "genre_voting") {
        router.replace(`/room/${id}/genre`);
      } else if (roomData.status === "shop_voting") {
        router.replace(`/room/${id}/vote`);
      } else if (roomData.status === "finished") {
        router.replace(`/room/${id}/result`);
      }
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Realtime
  useEffect(() => {
    const refreshCount = () => {
      fetch(`/api/rooms/${id}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.participant_count !== undefined) setParticipantCount(data.participant_count);
          if (data.status === "genre_voting") router.replace(`/room/${id}/genre`);
          else if (data.status === "shop_voting") router.replace(`/room/${id}/vote`);
          else if (data.status === "finished") router.replace(`/room/${id}/result`);
        });
    };

    const channel = supabase
      .channel(`room:${id}:participants`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "participants", filter: `room_id=eq.${id}` },
        refreshCount
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${id}` },
        (payload) => {
          const status = (payload.new as { status: string }).status;
          if (status === "genre_voting") router.replace(`/room/${id}/genre`);
          else if (status === "shop_voting") router.replace(`/room/${id}/vote`);
          else if (status === "finished") router.replace(`/room/${id}/result`);
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) supabase.realtime.setAuth(session.access_token);
          });
        }
      });

    const poll = setInterval(refreshCount, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
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

  // カウントダウン更新
  useEffect(() => {
    if (!room) return;
    setCountdown(formatCountdown(room.expires_at));
    const timer = setInterval(() => setCountdown(formatCountdown(room.expires_at)), 1000);
    return () => clearInterval(timer);
  }, [room]);

  async function handleCopy() {
    await navigator.clipboard.writeText(roomUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleStart() {
    if (!room || starting) return;
    setStarting(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setStarting(false); return; }

    const res = await fetch(`/api/rooms/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ status: "genre_voting" }),
    });
    if (res.ok) {
      router.replace(`/room/${id}/genre`);
    } else {
      showToast("投票開始に失敗しました。もう一度お試しください。");
      setStarting(false);
    }
  }

  const isHost = room && currentUserId === room.host_user_id;
  const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(
    `2次会の店を一緒に決めよう！\n${roomUrl}`
  )}`;

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-5">
        <div className="text-center">
          <p className="text-4xl mb-4">😢</p>
          <p className="text-lg font-bold text-foreground mb-2">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="mt-4 px-6 py-3 rounded-xl bg-primary text-white font-bold"
          >
            トップへ戻る
          </button>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ToastContainer />
      <main className="max-w-md mx-auto min-h-screen flex flex-col px-5 pt-12 pb-10 gap-6">

        {/* ヘッダー */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-1">参加者を待っています</p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-5xl font-bold text-primary">{participantCount}</span>
            <span className="text-xl text-foreground font-medium">
              / {room.max_participants}人
            </span>
          </div>
          <p className="text-base text-muted-foreground mt-1">が参加中</p>
        </div>

        {/* 参加者アイコン */}
        <div className="flex flex-wrap gap-3 justify-center">
          {Array.from({ length: participantCount }).map((_, i) => (
            <div
              key={i}
              className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg shadow"
            >
              {i + 1}
            </div>
          ))}
          {Array.from({ length: room.max_participants - participantCount }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="w-14 h-14 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-muted-foreground/30 text-lg"
            >
              ?
            </div>
          ))}
        </div>

        {/* 部屋情報（ホストのみ） */}
        {isHost && (
          <div className="rounded-2xl bg-secondary px-4 py-3 flex gap-4 text-sm">
            <div className="flex items-center gap-1 text-foreground">
              <span>📍</span>
              <span className="font-medium">{room.location_name}</span>
            </div>
            <div className="flex items-center gap-1 text-foreground">
              <span>💴</span>
              <span className="font-medium">{BUDGET_LABELS[room.budget] ?? room.budget}</span>
            </div>
          </div>
        )}

        {/* QRコード */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-muted-foreground">QRコードを見せて招待</p>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-border">
            <QRCode value={roomUrl} size={160} />
          </div>
        </div>

        {/* シェアボタン */}
        <div className="flex flex-col gap-3">
          <a
            href={lineUrl}
            className="w-full py-4 rounded-2xl bg-[#06C755] text-white text-base font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <span className="text-xl">💬</span>
            LINEでシェアする
          </a>
          <button
            onClick={handleCopy}
            className="w-full py-4 rounded-2xl border-2 border-primary text-primary text-base font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <span className="text-xl">{copied ? "✅" : "🔗"}</span>
            {copied ? "コピーしました！" : "URLをコピーする"}
          </button>
        </div>

        {/* 有効期限 */}
        <p className="text-center text-sm text-muted-foreground">
          セッション有効期限: <span className="font-mono font-bold text-foreground">{countdown}</span>
        </p>

        {/* 投票開始ボタン（ホストのみ） */}
        {isHost && (
          <div className="mt-auto flex flex-col gap-2">
            <button
              onClick={handleStart}
              disabled={participantCount < 2 || starting}
              className="w-full py-5 rounded-2xl bg-primary text-primary-foreground text-xl font-bold shadow-md active:scale-95 transition-transform disabled:opacity-40"
            >
              {starting ? "開始中..." : "投票を開始する 🗳️"}
            </button>
            {participantCount < 2 && (
              <p className="text-center text-sm text-muted-foreground">
                2人以上集まったら開始できます
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
