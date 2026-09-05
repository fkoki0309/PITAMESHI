"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const BUDGET_OPTIONS = [
  { code: "B002", label: "1,000円以内" },
  { code: "B009", label: "3,000円以内" },
  { code: "B011", label: "5,000円以内" },
  { code: "B013", label: "指定なし" },
];

const MAX_PARTICIPANTS_MIN = 1;
const MAX_PARTICIPANTS_MAX = 20;
const MAX_PARTICIPANTS_ERROR =
  `人数は${MAX_PARTICIPANTS_MIN}〜${MAX_PARTICIPANTS_MAX}の範囲で入力してください`;

export default function NewRoomPage() {
  const router = useRouter();
  const [locationName, setLocationName] = useState("");
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [budget, setBudget] = useState("B009");
  const [maxParticipants, setMaxParticipants] = useState(10);
  const [maxParticipantsInput, setMaxParticipantsInput] = useState("10");
  const [maxParticipantsError, setMaxParticipantsError] = useState("");
  const [locating, setLocating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function handleGetLocation() {
    if (!navigator.geolocation) {
      setError("このブラウザは位置情報に対応していません");
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setLocationLat(lat);
        setLocationLng(lng);
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`,
            { headers: { "Accept-Language": "ja" } }
          );
          const data = await res.json();
          const addr = data.address ?? {};
          const name =
            addr.neighbourhood ||
            addr.suburb ||
            addr.city_district ||
            addr.town ||
            addr.city ||
            addr.county ||
            "現在地";
          setLocationName(name);
        } catch {
          setLocationName(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        } finally {
          setLocating(false);
        }
      },
      () => {
        setError("位置情報の取得に失敗しました。ブラウザの許可設定を確認してください");
        setLocating(false);
      },
      { timeout: 10000 }
    );
  }

  const updateMaxParticipants = (value: number) => {
    if (!Number.isFinite(value)) {
      setMaxParticipantsError(MAX_PARTICIPANTS_ERROR);
      return false;
    }

    if (value < MAX_PARTICIPANTS_MIN || value > MAX_PARTICIPANTS_MAX) {
      setMaxParticipantsError(MAX_PARTICIPANTS_ERROR);
      return false;
    }

    setMaxParticipantsError("");
    setMaxParticipants(value);
    setMaxParticipantsInput(String(value));
    return true;
  };

  async function handleCreate() {
    if (!locationLat || !locationLng || !locationName) return;
    if (maxParticipants < MAX_PARTICIPANTS_MIN || maxParticipants > MAX_PARTICIPANTS_MAX) {
      setError(MAX_PARTICIPANTS_ERROR);
      return;
    }
    setCreating(true);
    setError("");
    try {
      const { data: authData, error: authError } =
        await supabase.auth.signInAnonymously();
      if (authError || !authData.session) {
        throw new Error(authError?.message ?? "認証に失敗しました");
      }
      const token = authData.session.access_token;

      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          location_lat: locationLat,
          location_lng: locationLng,
          location_name: locationName,
          budget,
          max_participants: maxParticipants,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "部屋の作成に失敗しました");
      }
      const { room_id } = await res.json();
      router.push(`/room/${room_id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-md mx-auto min-h-screen flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center px-4 pt-12 pb-4">
          <button
            onClick={() => router.back()}
            className="w-11 h-11 flex items-center justify-center text-2xl text-foreground"
          >
            ←
          </button>
          <h1 className="text-xl font-bold text-foreground ml-2">部屋を作る</h1>
        </div>

        <div className="flex flex-col gap-8 px-5 pb-12 flex-1">
          {/* 現在地 */}
          <div className="flex flex-col gap-3">
            <label className="text-base font-bold text-foreground">
              集合場所
            </label>
            <button
              onClick={handleGetLocation}
              disabled={locating}
              className="w-full py-5 rounded-2xl border-2 border-dashed border-primary bg-secondary flex items-center justify-center gap-2 text-primary font-semibold text-base active:scale-95 transition-transform disabled:opacity-50"
            >
              <span className="text-xl">📍</span>
              {locating ? "取得中..." : "現在地を取得する"}
            </button>
            {locationName ? (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white border-2 border-primary">
                <span>📍</span>
                <span className="text-base font-medium text-foreground">{locationName}</span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground px-1">
                ボタンを押して現在地を取得してください
              </p>
            )}
          </div>

          {/* 予算 */}
          <div className="flex flex-col gap-3">
            <label className="text-base font-bold text-foreground">
              1人あたりの予算
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px",
              }}
            >
              {BUDGET_OPTIONS.map((opt) => {
                const isSelected = budget === opt.code;
                return (
                  <button
                    key={opt.code}
                    onClick={() => setBudget(opt.code)}
                    style={{
                      padding: "12px 8px",
                      borderRadius: "12px",
                      fontSize: "14px",
                      fontWeight: 600,
                      border: isSelected ? "2px solid #f97316" : "2px solid #fddbb4",
                      background: isSelected ? "#f97316" : "#ffffff",
                      color: isSelected ? "#ffffff" : "#1a1a1a",
                      cursor: "pointer",
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 最大参加人数 */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-base font-bold text-foreground">
                最大参加人数
              </label>
              <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-white px-3 py-2 shadow-sm">
                <input
                  type="number"
                  min={MAX_PARTICIPANTS_MIN}
                  max={MAX_PARTICIPANTS_MAX}
                  step={1}
                  value={maxParticipantsInput}
                  onChange={(e) => {
                    const rawValue = e.target.value;
                    if (rawValue === "") {
                      setMaxParticipantsInput("");
                      setMaxParticipantsError("");
                      return;
                    }

                    const nextValue = Number(rawValue);
                    if (!Number.isFinite(nextValue)) {
                      setMaxParticipantsError(MAX_PARTICIPANTS_ERROR);
                      return;
                    }

                    if (nextValue < MAX_PARTICIPANTS_MIN || nextValue > MAX_PARTICIPANTS_MAX) {
                      setMaxParticipantsError(MAX_PARTICIPANTS_ERROR);
                      setMaxParticipantsInput(rawValue);
                      return;
                    }

                    updateMaxParticipants(nextValue);
                  }}
                  onBlur={() => {
                    if (maxParticipantsInput === "") {
                      setMaxParticipantsInput(String(maxParticipants));
                      setMaxParticipantsError("");
                      return;
                    }

                    const value = Number(maxParticipantsInput);
                    if (!Number.isFinite(value)) {
                      setMaxParticipantsInput(String(maxParticipants));
                      setMaxParticipantsError("");
                      return;
                    }

                    if (value < MAX_PARTICIPANTS_MIN || value > MAX_PARTICIPANTS_MAX) {
                      setMaxParticipantsError(MAX_PARTICIPANTS_ERROR);
                      return;
                    }

                    updateMaxParticipants(value);
                  }}
                  className="w-16 border-none bg-transparent text-right text-xl font-bold text-primary outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-sm font-semibold text-foreground">人</span>
              </div>
            </div>
            <input
              type="range"
              min={MAX_PARTICIPANTS_MIN}
              max={MAX_PARTICIPANTS_MAX}
              value={maxParticipants}
              onChange={(e) => {
                const nextValue = Number(e.target.value);
                updateMaxParticipants(nextValue);
              }}
              style={{ accentColor: "#f97316" }}
              className="w-full h-2 cursor-pointer"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{MAX_PARTICIPANTS_MIN}人</span>
              <span>{MAX_PARTICIPANTS_MAX}人</span>
            </div>
            {maxParticipantsError && (
              <p className="text-sm text-red-600">{maxParticipantsError}</p>
            )}
          </div>

          {/* エラー表示 */}
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* 作成ボタン */}
          <div className="mt-auto flex flex-col gap-2">
            <button
              onClick={handleCreate}
              disabled={!locationName || creating}
              className="w-full py-5 rounded-2xl bg-primary text-primary-foreground text-xl font-bold shadow-md active:scale-95 transition-transform disabled:opacity-40"
            >
              {creating ? "作成中..." : "部屋を作る"}
            </button>
            {!locationName && (
              <p className="text-center text-sm text-muted-foreground">
                現在地を取得してから作成できます
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
