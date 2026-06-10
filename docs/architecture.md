# アーキテクチャ設計

## システム構成図

```
スマホブラウザ（Next.js）
     │
     ├─── Supabase Realtime（WebSocket）← リアルタイム投票同期
     │
     ├─── Next.js API Routes
     │         ├── /api/rooms        ← セッション管理
     │         ├── /api/shops        ← ホットペッパーAPI呼び出し
     │         └── /api/vote         ← 投票記録
     │
     └─── Supabase PostgreSQL（DB）
```

---

## DB設計

### rooms（セッション）
| カラム | 型 | 説明 |
|--------|----|------|
| id | uuid (PK) | セッションID（URLに使用） |
| host_user_id | uuid | 幹事のユーザーID |
| status | enum | `waiting` / `genre_voting` / `shop_voting` / `finished` |
| location_lat | float | 検索基準緯度 |
| location_lng | float | 検索基準経度 |
| location_name | text | 場所名（表示用） |
| budget | text | 予算コード（ホットペッパー準拠） |
| max_participants | int | 最大参加人数（デフォルト20） |
| expires_at | timestamptz | 有効期限（作成から2時間） |
| created_at | timestamptz | 作成日時 |

### participants（参加者）
| カラム | 型 | 説明 |
|--------|----|------|
| id | uuid (PK) | |
| room_id | uuid (FK) | |
| user_id | uuid | Supabase匿名認証のUID |
| joined_at | timestamptz | 参加日時 |

### genre_votes（ジャンル投票）
| カラム | 型 | 説明 |
|--------|----|------|
| id | uuid (PK) | |
| room_id | uuid (FK) | |
| user_id | uuid | |
| genre_code | text | ホットペッパージャンルコード |
| result | enum | `yes` / `maybe` / `no` |
| created_at | timestamptz | |

### shops（投票対象店舗）
| カラム | 型 | 説明 |
|--------|----|------|
| id | uuid (PK) | |
| room_id | uuid (FK) | |
| hotpepper_id | text | ホットペッパー店舗ID |
| name | text | 店名 |
| genre | text | ジャンル名 |
| budget | text | 予算帯 |
| address | text | 住所 |
| access | text | アクセス（徒歩〇分など） |
| catch | text | キャッチコピー |
| photo_url | text | 写真URL |
| capacity | int | 席数 |
| has_reservation | bool | 予約可否 |
| open_hours | text | 営業時間 |
| is_open_late | bool | 深夜営業フラグ |
| hotpepper_url | text | ホットペッパー予約URL |
| display_order | int | 表示順 |

### shop_votes（店舗投票）
| カラム | 型 | 説明 |
|--------|----|------|
| id | uuid (PK) | |
| room_id | uuid (FK) | |
| shop_id | uuid (FK) | |
| user_id | uuid | |
| result | enum | `yes` / `maybe` / `no` |
| created_at | timestamptz | |

**制約:** `(room_id, shop_id, user_id)` にユニーク制約（1人1票）

---

## API設計

### POST /api/rooms
セッション新規作成

**Request:**
```json
{
  "location_lat": 35.6812,
  "location_lng": 139.7671,
  "location_name": "渋谷駅",
  "budget": "B002",
  "max_participants": 10
}
```
**Response:** `{ "room_id": "uuid", "url": "https://..." }`

---

### GET /api/rooms/[id]
セッション情報・参加者数・ステータス取得

**Response:**
```json
{
  "id": "uuid",
  "status": "shop_voting",
  "location_name": "渋谷駅",
  "participant_count": 5,
  "expires_at": "2025-01-01T22:00:00Z",
  "host_user_id": "uuid"
}
```

---

### GET /api/shops?room_id=&lat=&lng=&budget=&genres=
ホットペッパーAPIを叩いて店舗一覧取得・DBに保存

**Response:** `{ "shops": [...] }`

---

### POST /api/vote
投票記録

**Request:**
```json
{
  "room_id": "uuid",
  "target_id": "uuid",
  "target_type": "genre" | "shop",
  "result": "yes" | "maybe" | "no"
}
```

---

## Supabase Realtime 設計

以下のテーブル変更をリッスン：

| イベント | チャンネル | 用途 |
|---------|-----------|------|
| `shop_votes` INSERT | `room:{id}:votes` | 投票進捗の更新 |
| `rooms` UPDATE | `room:{id}:status` | ステータス変化（全員投票完了など） |
| `participants` INSERT | `room:{id}:join` | 参加者入室通知 |

---

## ホットペッパーAPI連携

### 使用エンドポイント
`https://webservice.recruit.co.jp/hotpepper/gourmet/v1/`

### 主要パラメータ
| パラメータ | 値 |
|----------|----|
| lat / lng | 現在地座標 |
| range | 3（1km圏内） |
| genre | ジャンル投票結果の上位コード |
| budget | ユーザー指定 |
| order | 4（おすすめ順） |
| count | 20（最大） |
| format | json |

### 予算コード対応表
| コード | 表示 |
|--------|------|
| B001 | ～500円 |
| B002 | 501～1000円 |
| B003 | 1001～1500円 |
| B008 | 1501～2000円 |
| B009 | 2001～3000円 |
| B010 | 3001～4000円 |
| B011 | 4001～5000円 |
| B013 | 5001～7000円 |

### レート制限対策
- APIキーはサーバーサイド（API Routes）のみで使用（クライアント露出禁止）
- 1セッションあたり最大1回のAPI呼び出し（結果をDBにキャッシュ）

---

## セキュリティ

- Supabase RLS（Row Level Security）を全テーブルに有効化
- ユーザーは自分のroom_idに紐づくデータのみ読み書き可能
- ホットペッパーAPIキーは環境変数（`HOTPEPPER_API_KEY`）で管理
- セッションは2時間で自動失効（`expires_at`チェック）
