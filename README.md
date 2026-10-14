# Shikhar Lab Website

https://igc-lab-kut.github.io/shikharlab-hp/

## ファイル構成

```
data/           ← ここを編集するだけでサイトが更新される
  config.json   - ラボ名・連絡先・リンク・About文
  news.json     - ニュース一覧
  members.json  - メンバー一覧
  publications.json - 論文一覧
  projects.json - プロジェクト一覧
  awards.json   - 受賞一覧
```

サイトの共通デザインは `style.css`、共通ナビゲーション・安全なデータ読み込み処理は
`js/common.js` にまとめられています。

## 更新方法

### ニュースを追加する
`data/news.json` を編集:
```json
[
  { "date": "2026-04-01", "text": "新しいお知らせ" },
  ...
]
```

### メンバーを追加する
`data/members.json` の該当カテゴリ（`pi` / `researchCollaborators` / `phd` / `master` / `bachelor` / `alumni`）に追加:
```json
{
  "name": "山田 太郎",
  "role": "PhD Student (2026-)",
  "email": "yamada@example.edu",
  "photo": "data/imgs/yamada.jpg"
}
```
写真は `data/imgs/` フォルダに置いて `photo` にリポジトリルートからのパスを指定（空文字列でも可）。

### 論文を追加する
`data/publications.json` に追加（年の降順に並べる）:
```json
{
  "year": 2026,
  "title": "論文タイトル",
  "authors": "著者名",
  "venue": "会議・雑誌名",
  "url": "https://..."
}
```
`url` は論文ページへのリンク（なければ空文字列）。

### 受賞情報を追加する
`data/awards.json` に追加:
```json
{
  "year": 2026,
  "title": "Best Paper Award",
  "recipients": "受賞者名",
  "venue": "会議・学会名",
  "url": "https://..."
}
```

### プロジェクトを追加する
`data/projects.json` の `current` または `past` に追加:
```json
{
  "name": "プロジェクト名",
  "description": "説明文",
  "tags": ["キーワード1", "キーワード2"],
  "image": ""
}
```

### ラボ情報を変更する
`data/config.json` を編集（ラボ名・メールアドレス・住所・外部リンクなど）。

## デプロイ

GitHub Pages で自動公開（`main` ブランチにプッシュで反映）。

> **注意**: JSONファイルはHTTPサーバー経由でのみ動作します。
> ローカルで確認する場合は `python3 -m http.server` などで簡易サーバーを起動してください。

## ローカルプレビューと検証

```bash
python3 -m http.server 8000
```

ブラウザで `http://localhost:8000/`（英語）または
`http://localhost:8000/ja/`（日本語）を開いてください。

公開前に次の検証を実行してください。

```bash
node scripts/validate.mjs
```

検証内容は JSON 構文、HTML の重複 ID・基本メタデータ、ローカルアセット参照、
JavaScript 構文、危険な HTML 挿入 API の混入です。

Playwright がインストールされている環境では、ローカルサーバーを起動した状態で
デスクトップ・モバイルのブラウザテストも実行できます。

```bash
PREVIEW_URL=http://127.0.0.1:8000 node scripts/browser-smoke.mjs
```
