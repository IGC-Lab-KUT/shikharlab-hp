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
js/             ← 通常は触らない
style.css       ← 通常は触らない
*.html          ← 通常は触らない
```

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
`data/members.json` の該当カテゴリ（`pi` / `phd` / `master` / `alumni`）に追加:
```json
{
  "name": "山田 太郎",
  "role": "PhD Student (2026-)",
  "email": "yamada@example.edu",
  "photo": "images/yamada.jpg"
}
```
写真は `images/` フォルダに置いて `photo` にパスを指定（空文字列でも可）。

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
