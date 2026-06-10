-- ============================================================
-- ENUM 型
-- ============================================================

CREATE TYPE room_status AS ENUM (
  'waiting',
  'genre_voting',
  'shop_voting',
  'finished'
);

CREATE TYPE vote_result AS ENUM (
  'yes',
  'maybe',
  'no'
);

-- ============================================================
-- テーブル作成（全テーブルを先に作成してからポリシーを定義）
-- ============================================================

CREATE TABLE rooms (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id     uuid NOT NULL,
  status           room_status NOT NULL DEFAULT 'waiting',
  location_lat     float NOT NULL,
  location_lng     float NOT NULL,
  location_name    text NOT NULL,
  budget           text NOT NULL,
  max_participants int NOT NULL DEFAULT 20,
  expires_at       timestamptz NOT NULL DEFAULT (now() + interval '2 hours'),
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE participants (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id   uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id   uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, user_id)
);

CREATE INDEX idx_participants_room_id ON participants(room_id);
CREATE INDEX idx_participants_user_id ON participants(user_id);

CREATE TABLE genre_votes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL,
  genre_code text NOT NULL,
  result     vote_result NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, user_id, genre_code)
);

CREATE INDEX idx_genre_votes_room_id ON genre_votes(room_id);

CREATE TABLE shops (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id         uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  hotpepper_id    text NOT NULL,
  name            text NOT NULL,
  genre           text,
  budget          text,
  address         text,
  access          text,
  catch           text,
  photo_url       text,
  capacity        int,
  has_reservation bool NOT NULL DEFAULT false,
  open_hours      text,
  is_open_late    bool NOT NULL DEFAULT false,
  hotpepper_url   text,
  display_order   int NOT NULL DEFAULT 0,
  UNIQUE (room_id, hotpepper_id)
);

CREATE INDEX idx_shops_room_id ON shops(room_id);

CREATE TABLE shop_votes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  shop_id    uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL,
  result     vote_result NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, shop_id, user_id)
);

CREATE INDEX idx_shop_votes_room_id ON shop_votes(room_id);
CREATE INDEX idx_shop_votes_shop_id ON shop_votes(shop_id);

-- ============================================================
-- RLS 有効化（全テーブル作成後に一括で行う）
-- ============================================================

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE genre_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_votes ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS ポリシー（全テーブル作成後に定義するため参照エラーが出ない）
-- ============================================================

-- rooms
CREATE POLICY "rooms_insert" ON rooms
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = host_user_id);

CREATE POLICY "rooms_select" ON rooms
  FOR SELECT TO authenticated
  USING (
    host_user_id = auth.uid()
    OR id IN (
      SELECT room_id FROM participants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "rooms_update" ON rooms
  FOR UPDATE TO authenticated
  USING (host_user_id = auth.uid())
  WITH CHECK (host_user_id = auth.uid());

-- participants
CREATE POLICY "participants_insert" ON participants
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "participants_select" ON participants
  FOR SELECT TO authenticated
  USING (
    room_id IN (
      SELECT room_id FROM participants WHERE user_id = auth.uid()
    )
  );

-- genre_votes
CREATE POLICY "genre_votes_insert" ON genre_votes
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND room_id IN (
      SELECT room_id FROM participants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "genre_votes_select" ON genre_votes
  FOR SELECT TO authenticated
  USING (
    room_id IN (
      SELECT room_id FROM participants WHERE user_id = auth.uid()
    )
  );

-- shops（挿入はサービスロールキー経由のAPI Routeのみ）
CREATE POLICY "shops_insert" ON shops
  FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "shops_select" ON shops
  FOR SELECT TO authenticated
  USING (
    room_id IN (
      SELECT room_id FROM participants WHERE user_id = auth.uid()
    )
  );

-- shop_votes
CREATE POLICY "shop_votes_insert" ON shop_votes
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND room_id IN (
      SELECT room_id FROM participants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "shop_votes_select" ON shop_votes
  FOR SELECT TO authenticated
  USING (
    room_id IN (
      SELECT room_id FROM participants WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- Realtime 有効化
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE participants;
ALTER PUBLICATION supabase_realtime ADD TABLE shop_votes;
