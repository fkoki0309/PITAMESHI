# 2次会投票アプリ - CLAUDE.md

## プロジェクト概要
友人グループが2次会の飲食店をリアルタイム匿名投票で決めるスマホWebアプリ。

## 技術スタック
| レイヤー | 技術 |
|----------|------|
| フロントエンド | Next.js 14 (App Router) + TypeScript |
| スタイリング | Tailwind CSS + shadcn/ui |
| アニメーション | Framer Motion（スワイプUI） |
| DB・リアルタイム | Supabase（PostgreSQL + Realtime + 匿名認証） |
| 店舗情報 | ホットペッパーAPI（完全無料） |
| ホスティング | Vercel |
| LINE共有 | URLスキーム |

## ドキュメント
- `docs/architecture.md` - DB設計・API設計・Realtime設計
- `docs/screens.md` - 画面一覧・画面遷移・UI仕様
- `docs/features.md` - 機能仕様・集計ロジック・エラー処理
- `docs/implementation-steps.md` - STEP1〜14の実装順序

## ディレクトリ構成
```
app/
├── page.tsx                  # トップ
├── room/new/page.tsx         # 部屋作成
├── room/[id]/page.tsx        # 待機
├── room/[id]/genre/page.tsx  # ジャンルスワイプ
├── room/[id]/vote/page.tsx   # 店舗投票
├── room/[id]/result/page.tsx # 結果発表
└── api/rooms/ shops/ vote/ ping/
components/
├── SwipeCard.tsx / ShopCard.tsx / VoteProgress.tsx / ShareButton.tsx
lib/
└── supabase.ts / hotpepper.ts / utils.ts
supabase/schema.sql
```

## 実装ルール
- 1ステップ実装したら必ず止まって動作確認を求めること
- UIは機能より先にレイアウト・見た目だけ作って確認を取ること
- 自己判断で複数ステップを一気に進めないこと
- 不明点があれば実装前に必ず確認すること
- 作業は必ずfeatureブランチで行うこと
- ブランチ名は `feature/step{番号}-{内容}` の形式にすること
