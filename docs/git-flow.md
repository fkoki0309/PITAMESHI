# Git運用フロー

## 基本方針
- ブランチ作成・コミット・push・プルリク作成はClaude Codeが自動で行う
- マージだけ人間がGitHubのGUI上で確認して行う
- mainブランチには直接コミットしない

---

## 1ステップの流れ

```
① Claude Codeがfeatureブランチを作成
      ↓
② 実装・コミット・push
      ↓
③ Claude CodeがGitHubにプルリクエストを作成
      ↓
④ 人間がGitHub上でコードを確認
      ↓
⑤ 人間がGitHub上で「Merge pull request」をクリック
      ↓
⑥ 次のステップへ
```

---

## ブランチ命名規則

```
feature/step{番号}-{内容}

例）
feature/step1-init
feature/step2-room-create
feature/step3-waiting-room
feature/step4-swipe-ui
feature/step5-genre-vote
feature/step6-restaurant-api
feature/step7-restaurant-vote
feature/step8-result
```

---

## Claude Codeが自動で行うこと

各ステップ開始時に以下を自動で実行する。

```bash
# 初回のみ：mainブランチを作成してpush
git checkout -b main
git push -u origin main

# 1. mainを最新にする
git checkout main
git pull origin main

# 2. featureブランチを作成
git checkout -b feature/step{番号}-{内容}

# --- 実装 ---

# 3. コミット
git add .
git commit -m "{コミットメッセージ}"

# 4. push
git push origin feature/step{番号}-{内容}

# 5. プルリクエストを作成（GitHub CLI使用）
gh pr create \
  --title "feat: {ステップ内容}" \
  --body "## 実装内容\n{実装した内容の説明}\n\n## 確認事項\n{動作確認してほしい内容}" \
  --base main
```

---

## コミットメッセージの規則

```
feat:  新機能を実装
fix:   バグを修正
style: UIを調整
docs:  ドキュメントを更新
```

---

## 人間がやること（GitHub GUI）

1. GitHub上でプルリクエストを開く
2. 「Files changed」タブで変更内容を確認
3. 問題なければ「Merge pull request」をクリック
4. 「Confirm merge」をクリック
5. Claude Codeに「マージしました。次のステップへ進んでください」と伝える

---

## やり直したいとき

Claude Codeに以下を伝える。

```
このステップはやり直したいです。
現在のブランチを削除してmainから作り直してください。
```

Claude Codeが以下を自動で実行する。

```bash
git checkout main
git branch -D feature/step{番号}-{内容}
git push origin --delete feature/step{番号}-{内容}
git checkout -b feature/step{番号}-{内容}
```

---

## 事前準備（GitHub CLI）

プルリクエストの自動作成にはGitHub CLIが必要。
環境セットアップ時にClaude Codeに以下を依頼する。

```
GitHub CLIをインストールして認証してください。
```

