const HOTPEPPER_BASE = "https://webservice.recruit.co.jp/hotpepper/gourmet/v1/";

// ホットペッパージャンルコード → APIジャンルコードのマッピング
const GENRE_MAP: Record<string, string> = {
  G001: "G001", // 居酒屋
  G002: "G002", // ダイニングバー・バル
  G003: "G003", // 焼肉・ホルモン
  G004: "G004", // 鍋
  G005: "G008", // 寿司
  G006: "G006", // 焼き鳥・串揚げ
  G007: "G007", // 中華
  G008: "G009", // イタリアン・フレンチ
  G009: "G010", // アジア・エスニック料理
  G010: "G013", // ラーメン
};

function getPhotoUrl(photo: unknown): string {
  if (!photo || typeof photo !== "object") return "";
  const p = photo as Record<string, unknown>;
  const pc = p.pc as Record<string, unknown> | undefined;
  const mobile = p.mobile as Record<string, unknown> | undefined;
  return String(pc?.l ?? mobile?.l ?? "");
}

export type HotpepperShop = {
  id: string;
  name: string;
  genre: string;
  budget: string;
  address: string;
  access: string;
  catch: string;
  photo_url: string;
  capacity: number;
  has_reservation: boolean;
  open_hours: string;
  is_open_late: boolean;
  hotpepper_url: string;
};

export async function fetchShops(params: {
  lat: number;
  lng: number;
  genres: string[];
  count?: number;
}): Promise<HotpepperShop[]> {
  const apiKey = process.env.HOTPEPPER_API_KEY;
  if (!apiKey) throw new Error("HOTPEPPER_API_KEY is not set");

  const genreCodes = params.genres
    .map((g) => GENRE_MAP[g])
    .filter(Boolean)
    .join(",");

  const query = new URLSearchParams({
    key: apiKey,
    lat: String(params.lat),
    lng: String(params.lng),
    range: "5", // 3km圏内
    order: "4",
    count: String(params.count ?? 20),
    format: "json",
    ...(genreCodes ? { genre: genreCodes } : {}),
  });

  const res = await fetch(`${HOTPEPPER_BASE}?${query}`);
  if (!res.ok) throw new Error(`Hotpepper API error: ${res.status}`);

  const json = await res.json();
  const shops = json?.results?.shop ?? [];

  return shops.map((s: Record<string, unknown>) => {
    const openHours = String(s.open ?? "");
    return {
      id: String(s.id),
      name: String(s.name),
      genre: String((s.genre as Record<string, unknown>)?.name ?? ""),
      budget: String((s.budget as Record<string, unknown>)?.average ?? ""),
      address: String(s.address ?? ""),
      access: String(s.mobile_access ?? s.access ?? ""),
      catch: String(s.catch ?? ""),
      photo_url: getPhotoUrl(s.photo),
      capacity: Number(s.capacity ?? 0),
      has_reservation: String(s.free_drink ?? s.course ?? "なし") !== "なし",
      open_hours: openHours,
      is_open_late: openHours.includes("翌") || openHours.includes("深夜"),
      hotpepper_url: String((s.urls as Record<string, unknown>)?.pc ?? ""),
    };
  });
}
