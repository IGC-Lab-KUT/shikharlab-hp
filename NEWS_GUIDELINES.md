# Adding laboratory news with Codex

This guide lets authorized laboratory members prepare bilingual website news without editing code or JSON by hand. The website is published from GitHub, so use only the laboratory repository and your authorized GitHub account.

## Before you begin

1. Open Codex and select the `IGC-Lab-KUT/shikharlab-hp` repository.
2. Start from the latest `main` branch.
3. Create a branch named `news/<short-event-name>`, for example `news/icc-2026-presentations`.
4. Attach original photographs only when they are approved for public display. Confirm that identifiable people may be shown, or explain which faces must be blurred.

Do not include private contact details, unpublished research results, student records, travel documents, or other sensitive information.

## Information to provide

Give Codex as much of the following as applies:

- exact event or announcement date, including an end date when relevant;
- category;
- factual event title and description;
- official spelling of every person's name and their role;
- exact paper title, presenter, award, host, or institution;
- official HTTPS links;
- original photographs, a factual caption for each, and publication-consent status;
- whether the item should be a short announcement or a detailed article.

Supported categories are conference presentations, journal publications, student awards and achievements, laboratory events, seminars, research visits and exchanges, research presentations, and other laboratory announcements.

## Reusable request

> Please add a laboratory news announcement using the existing website structure. Ask me for missing information, prepare English and Japanese content, add approved photographs if available, check for duplicates, validate the changes, and show me a preview before committing. Do not modify unrelated files.

You can place the facts and attach photographs below that request. Codex should ask only for information that is genuinely missing and must not invent details.

## Review and preview

Before approving the update, check:

- English and Japanese titles, summaries, dates, names, and technical terminology;
- the presenter, recipient, host, conference, or journal details;
- photograph selection, cropping, order, captions, and consent;
- every external link;
- that the announcement does not duplicate an existing item.

Ask Codex to run the repository validator and preview both languages. For a local preview, serve the repository over HTTP and open:

- English: `http://127.0.0.1:8000/` and `http://127.0.0.1:8000/news.html`
- Japanese: `http://127.0.0.1:8000/ja/` and `http://127.0.0.1:8000/ja/news.html`

Do not approve a commit until both language versions look correct at desktop and mobile widths.

## Confirm and publish

After reviewing the preview, explicitly tell Codex to commit and push the news branch. Codex should create a pull request when the account permits it. The automated checks must pass before the pull request is merged.

Routine news branches should change only:

- `data/news.json`
- approved photographs named `data/imgs/news-*`

An automated scope check rejects other files on branches beginning with `news/`. If another file is truly required, stop and ask the repository owner to handle the update as a structural change.

The site is published when a change reaches `main`. Repository permissions determine who can merge or push; the instructions in `AGENTS.md` do not grant or enforce GitHub access.

## Correct an announcement

Tell Codex which existing title or URL is wrong and provide the corrected facts. Codex should edit that record, keep its existing `id`, update `lastUpdated`, validate both languages, and show another preview. For a photograph removal request, identify the photograph and whether a user-approved blurred replacement will be supplied.

## If something goes wrong

- Copy the full error message into Codex and ask it to explain the issue in plain language.
- Do not bypass a failed validation check or edit unfamiliar website files.
- If Codex proposes HTML, CSS, JavaScript, workflow, schema, or unrelated content changes, stop and ask the repository owner.
- If a photograph's consent is uncertain, omit it until consent is confirmed.
- If the preview is unavailable, ask Codex for local-preview commands and screenshots before publishing.

