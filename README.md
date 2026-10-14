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
  pi.json       - 指導教員プロフィール・学歴・職歴・研究費・学会活動・プロフィールリンク
  research.json - 研究分野（英語・日本語）
  opportunities.json - 進学・共同研究・研究室紹介（英語・日本語）
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
  "roleEn": "PhD Student (2026–)",
  "roleJa": "博士課程（2026年–）",
  "email": "yamada@example.edu",
  "photo": "data/imgs/yamada.jpg"
}
```
写真は `data/imgs/` フォルダに置いて `photo` にリポジトリルートからのパスを指定（空文字列でも可）。
役職・学年は `roleEn` と `roleJa` に英語・日本語をそれぞれ記載します。
指導教員カードからプロフィールページへリンクする場合は、`profilePage` に `pi.html` を指定します。

### 指導教員プロフィールを更新する
`data/pi.json` の `en` / `ja` を編集します。

- `education`: 学歴・学位
- `appointments`: 過去の職歴
- `teaching`: 教育・研究指導（概要、学部・大学院の担当科目、大学公式情報へのリンク）
- `researchInterests`: 研究関心
- `funding`: 研究費・競争的資金（題目、役割、期間、機関、助成機関、金額）
- `professionalService`: 編集・学会活動
- `selectedPublicationUrls`: `data/publications.json` からプロフィールに掲載する論文URL
- `profileLinks`: 学術プロフィールへのリンク
- `photo`: `data/imgs/` に置いたプロフィール写真のパス

`profileLinks` は、本人確認済みのURLだけ `verified: true` にしてください。URLが未確認の項目は
`urlEn` / `urlJa` を空のままにし、`verified: false` としてください。未確認リンクはサイト上に表示されません。

現在、Google Scholar、ORCID、Scopus、IEEE Xplore、LinkedIn、大学教員プロフィール、
researchmap は確認済みURLを表示しています。ResearchGate は本人の希望により掲載していません。

### 研究分野を更新する
`data/research.json` の `areas` を編集します。各項目には英語・日本語のタイトルと説明を設定します。
`data/projects.json` は既存の研究プロジェクト情報として引き続き利用します。

### 進学・共同研究・研究室紹介を更新する
`data/opportunities.json` の `en` / `ja` を編集します。学生区分、研究テーマ、修士・博士課程に
望ましい背景、学術・産業共同研究、研究室の日常、設備情報をJSONから更新できます。進学・共同研究は
`opportunities.html`、研究室の日常・設備・写真は `lab-life.html` に表示されます。各カードの
`icon` には短い絵文字を指定できます。募集枠、奨学金、研究費など、時期により変わる情報は
確認できた場合にのみ追加してください。

`labGallery` で研究室内の写真、代替テキスト、キャプションを管理します。人物が識別できる写真は、
公開に必要な同意が確認できた場合のみ追加してください。

### ホームページのハイライトを更新する
`data/config.json` と `data/ja/config.json` の `homepage` を編集します。

- `researchAreaIds`: ホームに表示する `data/research.json` のID
- `selectedPublicationUrls`: ホームに表示する `data/publications.json` のURL
- `achievementCount`: `data/awards.json` の先頭から表示する件数

### 論文を追加する
`data/publications.json` に追加（年の降順に並べる）:
```json
{
  "year": 2026,
  "type": "journal",
  "title": "論文タイトル",
  "authors": "著者名",
  "venue": "会議・雑誌名",
  "url": "https://..."
}
```
`url` は論文ページへのリンク（なければ空文字列）。
`type` は `journal`（論文誌）、`conference`（国際会議）、`bookChapter`（書籍章）のいずれかを指定します。

### 受賞情報を追加する
`data/awards.json` に追加:
```json
{
  "year": 2026,
  "title": "Best Paper Award",
  "titleJa": "最優秀論文賞",
  "recipients": "受賞者名",
  "venue": "会議・学会名",
  "venueJa": "会議・学会名（日本語）",
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
