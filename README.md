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
  pi.json       - 指導教員プロフィール・学歴・職歴・学会活動・プロフィールリンク
  funding.json  - 研究助成・研究費（英語・日本語）
  research.json - 研究分野（英語・日本語）
  opportunities.json - 進学・共同研究・研究室紹介（英語・日本語）
```

サイトの共通デザインは `style.css`、共通ナビゲーション・安全なデータ読み込み処理は
`js/common.js` にまとめられています。

## 更新方法

### Codexで学生がニュースを更新する

初めて更新する場合は、[`NEWS_GUIDELINES.md`](NEWS_GUIDELINES.md) の手順と再利用可能な依頼文を使用してください。
Codex向けのリポジトリ固有ルールは [`AGENTS.md`](AGENTS.md) にあります。通常のニュース更新では
`data/news.json` と承認済みの `data/imgs/news-*` 写真だけを変更し、英語版・日本語版のプレビューと
自動検証を確認してからプルリクエストを作成します。

### ニュースを追加する
`data/news.json` の `items` に英語・日本語をまとめて追加します。`status` が `published` の記事だけが
ホームページとニュース一覧に表示されます。`content` がない記事は短いお知らせとして表示され、
`content`、画像、関連リンクなどがある記事は詳細ページにもリンクされます。

```json
{
  "id": "2026-04-example",
  "date": "2026-04-01",
  "category": { "id": "lab-event", "en": "Lab Event", "ja": "研究室イベント" },
  "title": { "en": "English title", "ja": "日本語タイトル" },
  "summary": { "en": "Short English summary", "ja": "日本語の短い概要" },
  "content": {
    "en": ["First paragraph.", "Second paragraph."],
    "ja": ["第1段落。", "第2段落。"]
  },
  "status": "published"
}
```

任意項目として `dateEnd`、英日併記の `dateLabel`、`thumbnail`、`featuredImage`、`images`、`links`、
`relatedPublications`、`relatedProjects`、`author`、`lastUpdated` を使用できます。画像は
`{ "src": "data/imgs/photo.jpg", "alt": { "en": "...", "ja": "..." }, "caption": { ... } }`
の形式で設定します。記事ページの写真はクリックすると原寸比で拡大表示されます。複数の写真は
矢印キーでも切り替えられ、Escapeキーで閉じられます。外部リンクには `https://` の確認済みURLだけを使用してください。

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
- `professionalService`: 編集・学会活動
- `selectedPublicationUrls`: `data/publications.json` からプロフィールに掲載する論文URL
- `profileLinks`: 学術プロフィールへのリンク
- `photo`: `data/imgs/` に置いたプロフィール写真のパス

`profileLinks` は、本人確認済みのURLだけ `verified: true` にしてください。URLが未確認の項目は
`urlEn` / `urlJa` を空のままにし、`verified: false` としてください。未確認リンクはサイト上に表示されません。

現在、Google Scholar、ORCID、Scopus、IEEE Xplore、LinkedIn、大学教員プロフィール、
researchmap は確認済みURLを表示しています。ResearchGate は本人の希望により掲載していません。

### 研究助成・研究費を更新する

`data/funding.json` の `grants` を編集します。各レコードには一意の `id`、`ongoing` または
`completed` の `status`、並び順に使う `sortYear`、種別を表す `type`、および英語・日本語の
表示情報を設定します。JSPS科研費には題目、制度、役割、所属機関、研究期間を、JST LOTUSには
研究者、所属機関、受入機関、採択年、参加予定を記載します。表示は「実施中」「終了」の順で、
各区分内は新しい年から並びます。

この公開リポジトリのデータには、採択額、直接経費、間接経費、支出額を記載しないでください。
金額情報は非公開の原資料で管理し、採択上限額を支出額として扱わないでください。

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

### OpenAlex 被引用数を更新する

公開ページの被引用数は `data/openalex-citations.json` から読み込まれます。このファイルは生成物であり、
`data/publications.json` の題目・著者・掲載先・年・既存リンクを上書きしません。一致が確認できない業績は
被引用数を `0` とせず、英語・日本語ページの両方で `—` と表示します。

自動更新には OpenAlex の API キーが必要です。

1. OpenAlex で API キーを取得します。
2. GitHub の **Settings → Secrets and variables → Actions → New repository secret** を開きます。
3. 名前を `OPENALEX_API_KEY` とし、値に API キーを保存します。
4. **Settings → Actions → General → Workflow permissions** で **Read and write permissions** と
   **Allow GitHub Actions to create and approve pull requests** を有効にします。このワークフローは承認を自動実行しませんが、
   更新用プルリクエストの作成権限にこの設定が必要です。
5. **Actions → Refresh OpenAlex citations → Run workflow** から初回更新を実行します。

ワークフローは毎月1日 02:23 UTC（日本時間 11:23）にも実行されます。正常終了すると
`automation/openalex-citations` ブランチのプルリクエストを作成または更新します。生成データも構造変更として
CODEOWNERS のレビュー対象になるため、内容を確認してからマージしてください。API キーは Actions の実行環境だけで
使用され、ブラウザー、ログ、JSONには保存されません。

ローカルで更新する場合:

```bash
OPENALEX_API_KEY='your-key' node scripts/update-openalex-citations.mjs
node scripts/test-openalex.mjs
node scripts/validate.mjs
```

照合方法は次のとおりです。

- DOI が既存の `url` に含まれる場合は DOI で取得し、題目・著者・DOIを検証します。
- DOI がない場合は題目を検索し、題目の完全一致、著者照合、発表年の一致をすべて満たす候補だけを採用します。
- 候補がない場合、複数候補が残る場合、または検証に失敗した場合は自動採用しません。

曖昧な業績を手動確認した場合は、`data/openalex-citations.json` に記録された `publicationKey` と、確認済みの
OpenAlex Work ID（例: `W1234567890`）を `data/openalex-overrides.json` に追加します。

```json
{
  "2024:normalized publication title": "W1234567890"
}
```

次回更新時にスクリプトがそのレコードを再取得し、題目と著者を検証します。生成JSONを直接編集しないでください。

APIが一時的に利用できない場合、レート制限（HTTP 429）と一時的なサーバーエラーは待機して再試行されます。
再試行後も失敗した場合は処理を終了し、既存の有効な `data/openalex-citations.json` を保持します。
`OPENALEX_API_KEY is not configured` の場合は Actions secret の名前と値を確認してください。

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

検証内容は JSON 構文、ニュースの日付・ID・カテゴリ・英日コンテンツ・画像・リンク、HTML の重複 ID・
基本メタデータ、ローカルアセット参照、JavaScript 構文、危険な HTML 挿入 API の混入です。

Playwright がインストールされている環境では、ローカルサーバーを起動した状態で
デスクトップ・モバイルのブラウザテストも実行できます。

```bash
PREVIEW_URL=http://127.0.0.1:8000 node scripts/browser-smoke.mjs
```
